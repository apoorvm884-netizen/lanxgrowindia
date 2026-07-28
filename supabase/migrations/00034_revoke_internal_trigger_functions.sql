-- Trigger/helper functions are invoked internally and must not be exposed as
-- anonymous or authenticated Data API RPC endpoints.

revoke execute on function public.sync_student_profile_status() from public, anon, authenticated;
revoke execute on function public.notify_video_completed() from public, anon, authenticated;
revoke execute on function public.school_local_date(uuid) from public, anon, authenticated;

grant execute on function public.sync_student_profile_status() to service_role;
grant execute on function public.notify_video_completed() to service_role;
grant execute on function public.school_local_date(uuid) to service_role;
