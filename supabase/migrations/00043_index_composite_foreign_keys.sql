-- Cover the remaining single and composite foreign keys reported by the
-- Supabase performance advisor.

create index if not exists idx_content_subject_school
  on public.content (subject_id, school_id);
create index if not exists idx_drive_folders_section_school
  on public.drive_folders (section_id, school_id);
create index if not exists idx_drive_folders_subject_school
  on public.drive_folders (subject_id, school_id);
create index if not exists idx_playback_tokens_content_id
  on public.playback_tokens (content_id);
create index if not exists idx_students_class_id
  on public.students (class_id);
create index if not exists idx_video_orbit_usage_content_id
  on public.video_orbit_usage_daily (content_id);
