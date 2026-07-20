-- ==============================================================
-- LANXGROW COS — Fix Profiles Role Constraint
-- Migration 00007: Add counselor and student roles
-- ==============================================================
-- Run after: 00001, 00002, 00003, 00004, 00005, 00006
-- ==============================================================

-- Drop existing CHECK constraint and recreate with all roles
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'school_admin', 'counselor', 'student'));

-- Update trigger to handle new roles (first user still becomes super_admin)
-- No change needed to handle_new_user() as it only assigns super_admin/school_admin-- ==============================================================
-- LANXGROW COS — Add Missing School Columns
-- Migration 00008: Add principal_name, ensure drive_folder_id
-- ==============================================================
-- Run after: 00007
-- ==============================================================

-- principal_name: Used in Company Portal school cards
alter table public.schools
  add column if not exists principal_name text;

-- drive_folder_id: Added in 00005, but ensure exists
alter table public.schools
  add column if not exists drive_folder_id text;

-- Index for drive folder lookups
create index if not exists idx_schools_drive_folder on public.schools(drive_folder_id);-- ==============================================================
-- LANXGROW COS — Company Settings Table
-- Migration 00009: Global platform settings
-- ==============================================================
-- Run after: 00008
-- ==============================================================

create table if not exists public.settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.settings enable row level security;

-- Super admins can read all settings
create policy "Super admins can read all settings"
  on public.settings for select
  using (public.is_super_admin());

-- Super admins can insert settings
create policy "Super admins can insert settings"
  on public.settings for insert
  with check (public.is_super_admin());

-- Super admins can update settings
create policy "Super admins can update settings"
  on public.settings for update
  using (public.is_super_admin());

-- Trigger for updated_at
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.update_updated_at();

-- Insert default settings
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
on conflict (key) do nothing;-- ==============================================================
-- LANXGROW COS — Roles & Permissions Table
-- Migration 00010: Permission management for RBAC
-- ==============================================================
-- Run after: 00009
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

-- Enable RLS
alter table public.permissions enable row level security;

-- Super admins can read all permissions
create policy "Super admins can read all permissions"
  on public.permissions for select
  using (public.is_super_admin());

-- School admins can read their own role permissions (when not super_admin)
create policy "School admins can read school_admin permissions"
  on public.permissions for select
  using (role = 'school_admin' and public.is_super_admin() = false);

-- Super admins can insert permissions
create policy "Super admins can insert permissions"
  on public.permissions for insert
  with check (public.is_super_admin());

-- Super admins can update permissions
create policy "Super admins can update permissions"
  on public.permissions for update
  using (public.is_super_admin());

-- Trigger for updated_at
create trigger trg_permissions_updated_at
  before update on public.permissions
  for each row execute function public.update_updated_at();

-- Seed default permissions
insert into public.permissions (role, permission, enabled) values
  -- Super Admin: all enabled
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

  -- School Admin: restricted to own school
  ('school_admin', 'manage_school_settings', true),
  ('school_admin', 'manage_categories', true),
  ('school_admin', 'manage_subjects', true),
  ('school_admin', 'manage_sections', true),
  ('school_admin', 'manage_content', true),
  ('school_admin', 'view_analytics', false),
  ('school_admin', 'manage_own_profile', true),
  ('school_admin', 'manage_drive_upload', false),

  -- Counselor: student-facing
  ('counselor', 'view_assigned_students', true),
  ('counselor', 'manage_student_progress', true),
  ('counselor', 'view_analytics', true),
  ('counselor', 'send_notifications', true),
  ('counselor', 'manage_own_profile', true),

  -- Student: self-service only
  ('student', 'view_own_courses', true),
  ('student', 'track_own_progress', true),
  ('student', 'view_own_notifications', true),
  ('student', 'manage_own_profile', true)
on conflict (role, permission) do nothing;