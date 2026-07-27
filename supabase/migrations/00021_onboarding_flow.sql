-- ==============================================================
-- LANXGROW COS — Secure Google OAuth Onboarding
-- Migration 00021
-- ==============================================================

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists requested_role text,
  add column if not exists requested_school_name text,
  add column if not exists requested_school_code text,
  add column if not exists requested_class text;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'pending',
      'super_admin',
      'company_admin',
      'school_admin',
      'teacher',
      'counselor',
      'student'
    )
  );

alter table public.profiles
  drop constraint if exists profiles_requested_role_check;

alter table public.profiles
  add constraint profiles_requested_role_check
  check (
    requested_role is null
    or requested_role in ('school', 'teacher_counselor', 'student', 'other')
  );

create index if not exists idx_profiles_pending_onboarding
  on public.profiles (onboarding_completed, status)
  where role = 'pending';

-- Backfill identity fields without overwriting existing profile names.
update public.profiles p
set
  email = coalesce(p.email, u.email),
  full_name = coalesce(p.full_name, p.name),
  onboarding_completed = case
    when p.role <> 'pending' then true
    else p.onboarding_completed
  end
from auth.users u
where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitations;
  user_name text;
  is_bootstrap boolean;
  resolved_company uuid;
begin
  user_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );

  select not exists (select 1 from public.profiles) into is_bootstrap;

  if is_bootstrap then
    insert into public.profiles (
      id, email, name, full_name, role, onboarding_completed, status
    )
    values (
      new.id, new.email, user_name, user_name, 'super_admin', true, 'active'
    )
    on conflict (id) do nothing;
    return new;
  end if;

  select *
    into inv
    from public.invitations
   where lower(email) = lower(coalesce(new.email, ''))
     and status = 'pending'
     and expires_at > now()
   order by created_at desc
   limit 1;

  if inv.id is not null then
    resolved_company := coalesce(
      inv.company_id,
      (select s.company_id from public.schools s where s.id = inv.school_id)
    );

    insert into public.profiles (
      id, email, name, full_name, role, school_id, company_id,
      onboarding_completed, status
    )
    values (
      new.id, new.email, user_name, user_name, inv.role, inv.school_id,
      resolved_company, true, 'active'
    )
    on conflict (id) do nothing;

    update public.invitations
       set status = 'accepted',
           accepted_at = now(),
           accepted_by = new.id
     where id = inv.id;

    if inv.role = 'student' and inv.student_id is not null then
      update public.students
         set user_id = new.id
       where id = inv.student_id;
    end if;

    return new;
  end if;

  -- Role selection is a request, not an authorization decision.
  insert into public.profiles (
    id, email, name, full_name, role, onboarding_completed, status
  )
  values (
    new.id, new.email, user_name, user_name, 'pending', false, 'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

create or replace function public.complete_my_onboarding(
  p_full_name text,
  p_phone text,
  p_requested_role text,
  p_school_name text default null,
  p_school_code text default null,
  p_class text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  result public.profiles;
  clean_name text := nullif(btrim(p_full_name), '');
  clean_phone text := nullif(btrim(p_phone), '');
  clean_school_name text := nullif(btrim(p_school_name), '');
  clean_school_code text := nullif(upper(btrim(p_school_code)), '');
  clean_class text := nullif(btrim(p_class), '');
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  if clean_name is null or char_length(clean_name) > 120 then
    raise exception 'A valid full name is required';
  end if;

  if clean_phone is null or clean_phone !~ '^[0-9+() -]{7,20}$' then
    raise exception 'A valid phone number is required';
  end if;

  if p_requested_role not in ('school', 'teacher_counselor', 'student', 'other') then
    raise exception 'Invalid role selection';
  end if;

  if p_requested_role = 'school' and clean_school_name is null then
    raise exception 'School name is required';
  end if;

  if p_requested_role in ('teacher_counselor', 'student')
     and clean_school_code is null then
    raise exception 'School code is required';
  end if;

  if p_requested_role = 'student' and clean_class is null then
    raise exception 'Class is required';
  end if;

  update public.profiles
     set name = clean_name,
         full_name = clean_name,
         phone = clean_phone,
         requested_role = p_requested_role,
         requested_school_name = clean_school_name,
         requested_school_code = clean_school_code,
         requested_class = clean_class,
         onboarding_completed = true,
         status = case when role = 'pending' then 'pending' else status end,
         updated_at = now()
   where id = caller_id
     and onboarding_completed = false
  returning * into result;

  if result.id is null then
    raise exception 'Onboarding is already complete or the profile is unavailable';
  end if;

  return result;
end;
$$;

revoke all on function public.complete_my_onboarding(
  text, text, text, text, text, text
) from public;
revoke all on function public.complete_my_onboarding(
  text, text, text, text, text, text
) from anon;
grant execute on function public.complete_my_onboarding(
  text, text, text, text, text, text
) to authenticated;

-- Keep direct profile updates limited to non-authorization identity fields.
drop policy if exists "Users can update own profile name" on public.profiles;
create policy "Users can update own profile identity"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = public.get_user_role()
    and school_id is not distinct from public.get_user_school_id()
    and company_id is not distinct from public.get_user_company_id()
  );
