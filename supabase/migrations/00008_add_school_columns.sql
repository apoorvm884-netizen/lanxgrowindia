-- ==============================================================
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
create index if not exists idx_schools_drive_folder on public.schools(drive_folder_id);