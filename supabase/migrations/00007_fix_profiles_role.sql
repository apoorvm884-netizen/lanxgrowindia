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
-- No change needed to handle_new_user() as it only assigns super_admin/school_admin