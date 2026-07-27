-- Final active learning model: School -> Student Drive folder -> Videos.
-- Legacy hierarchy remains dormant for rollback safety; the app no longer queries it.

alter table public.students
  add column if not exists drive_folder_id text,
  add column if not exists drive_folder_name text,
  add column if not exists last_drive_sync_at timestamptz,
  add column if not exists last_drive_sync_error text;

alter table public.content
  add column if not exists drive_folder_id text;

create index if not exists idx_students_drive_folder
  on public.students (school_id, drive_folder_id)
  where drive_folder_id is not null;

create index if not exists idx_content_drive_folder
  on public.content (school_id, drive_folder_id, status, sync_state);

drop policy if exists "Students read published content from their class" on public.content;
create policy "Students read published content from their Drive folder"
  on public.content for select to authenticated
  using (
    public.is_student()
    and status = 'published'
    and sync_state = 'active'
    and exists (
      select 1 from public.students student
      where student.user_id = (select auth.uid())
        and student.school_id = content.school_id
        and student.drive_folder_id = content.drive_folder_id
    )
  );

create or replace function public.approve_access_request(
  p_profile_id uuid,
  p_school_id uuid,
  p_class_id uuid default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_profile public.profiles;
  school_company_id uuid;
  approved_role text;
  result public.profiles;
begin
  if not public.is_super_admin() then
    raise exception 'Only Super Admin can approve access requests';
  end if;
  select * into request_profile from public.profiles
  where id = p_profile_id and role = 'pending' for update;
  if request_profile.id is null then raise exception 'Pending access request not found'; end if;
  if request_profile.requested_role not in ('school', 'student') then raise exception 'Unsupported access request role'; end if;
  select company_id into school_company_id from public.schools where id = p_school_id;
  if school_company_id is null then raise exception 'A valid school is required'; end if;
  approved_role := case when request_profile.requested_role = 'school' then 'school_admin' else 'student' end;

  if approved_role = 'student' then
    update public.students
      set name = coalesce(request_profile.full_name, request_profile.name),
          email = request_profile.email,
          school_id = p_school_id,
          status = 'active',
          updated_at = now()
      where user_id = request_profile.id;
    if not found then
      insert into public.students (name, email, school_id, user_id, status)
      values (coalesce(request_profile.full_name, request_profile.name),
              request_profile.email, p_school_id, request_profile.id, 'active');
    end if;
  end if;

  update public.profiles
    set role = approved_role, school_id = p_school_id, company_id = school_company_id,
        status = 'active', updated_at = now()
    where id = p_profile_id
    returning * into result;
  return result;
end;
$$;

revoke all on function public.approve_access_request(uuid, uuid, uuid) from public;
revoke all on function public.approve_access_request(uuid, uuid, uuid) from anon;
grant execute on function public.approve_access_request(uuid, uuid, uuid) to authenticated;

create or replace function public.complete_my_onboarding(
  p_full_name text, p_phone text, p_requested_role text,
  p_school_name text default null, p_school_code text default null, p_class text default null
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
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if clean_name is null or char_length(clean_name) > 120 then raise exception 'A valid full name is required'; end if;
  if clean_phone is null or clean_phone !~ '^[0-9+() -]{7,20}$' then raise exception 'A valid phone number is required'; end if;
  if p_requested_role not in ('school', 'student') then raise exception 'Only School and Student self-registration is available'; end if;
  if p_requested_role = 'school' and clean_school_name is null then raise exception 'School name is required'; end if;
  if p_requested_role = 'student' and clean_school_code is null then raise exception 'School code is required'; end if;

  update public.profiles set
    name = clean_name, full_name = clean_name, phone = clean_phone,
    requested_role = p_requested_role, requested_school_name = clean_school_name,
    requested_school_code = clean_school_code, requested_class = null,
    onboarding_completed = true,
    status = case when role = 'pending' then 'pending' else status end,
    updated_at = now()
  where id = caller_id and onboarding_completed = false
  returning * into result;
  if result.id is null then raise exception 'Onboarding is already complete or the profile is unavailable'; end if;
  return result;
end;
$$;

revoke all on function public.complete_my_onboarding(text, text, text, text, text, text) from public;
revoke all on function public.complete_my_onboarding(text, text, text, text, text, text) from anon;
grant execute on function public.complete_my_onboarding(text, text, text, text, text, text) to authenticated;
