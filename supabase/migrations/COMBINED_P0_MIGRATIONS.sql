-- ==============================================================
-- LANXGROW COS — P0 Migrations 00007–00010 (Idempotent)
-- ==============================================================
-- Each section is idempotent and safe to re-run individually.
-- Run in order: 00007 → 00008 → 00009 → 00010
-- If any section fails, fix the issue and re-run that section only.
-- ==============================================================

-- ==============================================================
-- Migration 00007: Fix Profiles Role Constraint
-- ==============================================================

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'school_admin', 'counselor', 'student'));

-- ==============================================================
-- Migration 00008: Add Missing School Columns
-- ==============================================================

alter table public.schools
  add column if not exists principal_name text;

alter table public.schools
  add column if not exists drive_folder_id text;

create index if not exists idx_schools_drive_folder
  on public.schools(drive_folder_id);

-- ==============================================================
-- Migration 00009: Company Settings Table
-- ==============================================================

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "Super admins can read all settings" on public.settings;
create policy "Super admins can read all settings"
  on public.settings for select
  using (public.is_super_admin());

drop policy if exists "Super admins can insert settings" on public.settings;
create policy "Super admins can insert settings"
  on public.settings for insert
  with check (public.is_super_admin());

drop policy if exists "Super admins can update settings" on public.settings;
create policy "Super admins can update settings"
  on public.settings for update
  using (public.is_super_admin());

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.update_updated_at();

insert into public.settings (key, value, description) values
  ('companyName', '"LanxGrow Learning"', 'Company display name'),
  ('language', '"en"', 'Default platform language'),
  ('timezone', '"UTC"', 'Default platform timezone'),
  ('maxUploadSize', '100', 'Maximum upload size in MB'),
  ('primaryColor', '"#1A56DB"', 'Primary brand color'),
  ('smtpHost', '"smtp.sendgrid.net"', 'SMTP server host'),
  ('smtpPort', '587', 'SMTP server port'),
  ('fromEmail', '"noreply@lanxgrow.com"', 'From email address'),
  ('fromName', '"LanxGrow Learning"', 'From name for emails')
on conflict (key) do nothing;

-- ==============================================================
-- Migration 00010: Roles & Permissions Table
-- ==============================================================

create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  role        text not null
              check (role in ('super_admin', 'school_admin', 'counselor', 'student')),
  permission  text not null,
  enabled     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(role, permission)
);

alter table public.permissions enable row level security;

drop policy if exists "Super admins can read all permissions" on public.permissions;
create policy "Super admins can read all permissions"
  on public.permissions for select
  using (public.is_super_admin());

drop policy if exists "School admins can read school_admin permissions" on public.permissions;
create policy "School admins can read school_admin permissions"
  on public.permissions for select
  using (role = 'school_admin' and public.is_super_admin() = false);

drop policy if exists "Super admins can insert permissions" on public.permissions;
create policy "Super admins can insert permissions"
  on public.permissions for insert
  with check (public.is_super_admin());

drop policy if exists "Super admins can update permissions" on public.permissions;
create policy "Super admins can update permissions"
  on public.permissions for update
  using (public.is_super_admin());

drop trigger if exists trg_permissions_updated_at on public.permissions;
create trigger trg_permissions_updated_at
  before update on public.permissions
  for each row execute function public.update_updated_at();

insert into public.permissions (role, permission, enabled) values
  ('super_admin', 'manage_schools', true),
  ('super_admin', 'manage_categories', true),
  ('super_admin', 'manage_subjects', true),
  ('super_admin', 'manage_sections', true),
  ('super_admin', 'manage_content', true),
  ('super_admin', 'manage_users', true),
  ('super_admin', 'manage_roles', true),
  ('super_admin', 'view_analytics', true),
  ('super_admin', 'access_settings', true),
  ('super_admin', 'manage_drive', true),
  ('super_admin', 'manage_media_library', true),
  ('super_admin', 'view_audit_log', true),
  ('school_admin', 'manage_school_settings', true),
  ('school_admin', 'manage_categories', true),
  ('school_admin', 'manage_subjects', true),
  ('school_admin', 'manage_sections', true),
  ('school_admin', 'manage_content', true),
  ('school_admin', 'view_analytics', false),
  ('school_admin', 'manage_own_profile', true),
  ('school_admin', 'manage_drive_upload', false),
  ('counselor', 'view_assigned_students', true),
  ('counselor', 'manage_student_progress', true),
  ('counselor', 'view_analytics', true),
  ('counselor', 'send_notifications', true),
  ('counselor', 'manage_own_profile', true),
  ('student', 'view_own_courses', true),
  ('student', 'track_own_progress', true),
  ('student', 'view_own_notifications', true),
  ('student', 'manage_own_profile', true)
on conflict (role, permission) do nothing;
