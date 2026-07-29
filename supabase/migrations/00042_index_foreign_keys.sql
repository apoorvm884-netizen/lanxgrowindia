-- Supporting indexes for foreign keys used by tenant, AI, Drive, and playback flows.
-- These do not change application behavior; they prevent avoidable scans as data grows.

create index if not exists idx_ai_escalations_assigned_to
  on public.ai_escalations (assigned_to);
create index if not exists idx_ai_escalations_content_id
  on public.ai_escalations (content_id);
create index if not exists idx_ai_escalations_conversation_id
  on public.ai_escalations (conversation_id);
create index if not exists idx_ai_escalations_replied_by
  on public.ai_escalations (replied_by);

create index if not exists idx_ai_messages_provider_id
  on public.ai_messages (provider_id);
create index if not exists idx_ai_messages_school_id
  on public.ai_messages (school_id);
create index if not exists idx_ai_provider_secrets_rotated_by
  on public.ai_provider_secrets (rotated_by);
create index if not exists idx_ai_providers_created_by
  on public.ai_providers (created_by);
create index if not exists idx_ai_providers_school_id
  on public.ai_providers (school_id);
create index if not exists idx_ai_usage_daily_granted_by
  on public.ai_usage_daily (granted_by);

create index if not exists idx_api_keys_created_by
  on public.api_keys (created_by);
create index if not exists idx_content_reviewed_by
  on public.content (reviewed_by);
create index if not exists idx_content_progress_school_id
  on public.content_progress (school_id);
create index if not exists idx_content_reviews_reviewer_id
  on public.content_reviews (reviewer_id);
create index if not exists idx_content_reviews_school_id
  on public.content_reviews (school_id);
create index if not exists idx_content_transcript_segments_school_id
  on public.content_transcript_segments (school_id);
create index if not exists idx_counselors_user_id
  on public.counselors (user_id);
create index if not exists idx_courses_created_by
  on public.courses (created_by);

create index if not exists idx_drive_folders_created_by
  on public.drive_folders (created_by);
create index if not exists idx_drive_folders_section_id
  on public.drive_folders (section_id);
create index if not exists idx_drive_sync_runs_drive_folder_ref
  on public.drive_sync_runs (drive_folder_ref);
create index if not exists idx_drive_sync_runs_requested_by
  on public.drive_sync_runs (requested_by);

create index if not exists idx_platform_ai_settings_updated_by
  on public.platform_ai_settings (updated_by);
create index if not exists idx_playback_tokens_school_id
  on public.playback_tokens (school_id);
create index if not exists idx_school_drive_secrets_rotated_by
  on public.school_drive_secrets (rotated_by);
create index if not exists idx_tracking_system_settings_updated_by
  on public.tracking_system_settings (updated_by);
create index if not exists idx_transcript_chunks_transcript_id
  on public.transcript_chunks (transcript_id);
create index if not exists idx_user_devices_revoked_by
  on public.user_devices (revoked_by);
