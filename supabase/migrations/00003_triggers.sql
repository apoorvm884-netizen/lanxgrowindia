-- ==============================================================
-- LANXGROW COS — Triggers & Auto-functions
-- Migration 00003: Automated Behaviours
-- ==============================================================

-- 1. Auto-create profile when a new user signs up
-- The first user to sign up becomes super_admin.
-- Subsequent users default to school_admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  user_name text;
begin
  -- Prefer raw_user_meta_data -> full_name, fall back to email
  user_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'User'
  );

  -- Check if this is the first profile ever created
  select not exists (select 1 from public.profiles) into is_first;

  insert into public.profiles (id, name, role)
  values (
    new.id,
    user_name,
    case when is_first then 'super_admin' else 'school_admin' end
  );

  return new;
end;
$$;

-- Attach trigger to auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 2. Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_schools_updated_at
  before update on public.schools
  for each row execute function public.update_updated_at();

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at();

create trigger trg_subjects_updated_at
  before update on public.subjects
  for each row execute function public.update_updated_at();

create trigger trg_sections_updated_at
  before update on public.sections
  for each row execute function public.update_updated_at();

create trigger trg_content_updated_at
  before update on public.content
  for each row execute function public.update_updated_at();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

-- 3. Log profile changes to audit_logs
create or replace function public.log_profile_change()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (user_id, user_name, action, entity, entity_name, detail)
  values (
    new.id,
    new.name,
    case
      when tg_op = 'INSERT' then 'created'
      when tg_op = 'UPDATE' then 'edited'
      else 'deleted'
    end,
    'Profile',
    new.name,
    format('Role: %s, School: %s', new.role, new.school_id)
  );
  return new;
end;
$$;

create trigger trg_audit_profile_insert
  after insert on public.profiles
  for each row execute function public.log_profile_change();

create trigger trg_audit_profile_update
  after update on public.profiles
  for each row execute function public.log_profile_change();
