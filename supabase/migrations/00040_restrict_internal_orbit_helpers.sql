-- Transcript retrieval and retry counters are internal implementation details.
-- Only trusted Edge Functions, which use the service role after authorizing the
-- caller and content scope, may execute them directly.

revoke all on function public.orbit_bump_transcript_attempts(uuid)
  from public, anon, authenticated;
revoke all on function public.orbit_retrieve_segments(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.match_transcript_chunks(vector, double precision, integer, uuid)
  from public, anon, authenticated;

grant execute on function public.orbit_bump_transcript_attempts(uuid)
  to service_role;
grant execute on function public.orbit_retrieve_segments(uuid, text, integer)
  to service_role;
grant execute on function public.match_transcript_chunks(vector, double precision, integer, uuid)
  to service_role;
