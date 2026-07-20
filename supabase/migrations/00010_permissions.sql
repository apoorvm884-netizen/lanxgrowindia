-- ==============================================================
-- LANXGROW COS — Roles & Permissions Table
-- Migration 00010: Permission management for RBAC
-- ==============================================================
-- Idempotent: safe to re-run
-- ==============================================================

-- Permissions table
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

-- Policies
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

-- Trigger
drop trigger if exists trg_permissions_updated_at on public.permissions;
create trigger trg_permissions_updated_at
  before update on public.permissions
  for each row execute function public.update_updated_at();

-- Seed default permissions
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
