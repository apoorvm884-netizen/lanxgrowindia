-- ==============================================================
-- LANXGROW COS — Google Drive Folder ID columns
-- Migration 00005: Drive Integration
-- ==============================================================
-- Run after 00001, 00002, 00003, 00004
-- ==============================================================

alter table public.schools
  add column drive_folder_id text;

alter table public.categories
  add column drive_folder_id text;

alter table public.subjects
  add column drive_folder_id text;

alter table public.sections
  add column drive_folder_id text;

-- Optional index for lookups
create index idx_schools_drive_folder on public.schools(drive_folder_id);
create index idx_categories_drive_folder on public.categories(drive_folder_id);
create index idx_subjects_drive_folder on public.subjects(drive_folder_id);
create index idx_sections_drive_folder on public.sections(drive_folder_id);
