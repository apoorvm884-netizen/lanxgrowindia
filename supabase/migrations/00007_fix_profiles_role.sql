-- ==============================================================
-- LANXGROW COS — Fix Profiles Role Constraint
-- Migration 00007: Add counselor and student roles
-- ==============================================================
-- Idempotent: safe to re-run
-- No transaction: partial progress preserved if later migrations fail
-- ==============================================================

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'school_admin', 'counselor', 'student'));
