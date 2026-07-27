-- Restrict internal AI helpers to signed-in users only.
-- These functions expose transcript data or mutate retry counters and must
-- never be callable with the public anonymous API key.
revoke execute on function public.orbit_bump_transcript_attempts(uuid) from public, anon;
revoke execute on function public.orbit_retrieve_segments(uuid, text, integer) from public, anon;
revoke execute on function public.match_transcript_chunks(vector, double precision, integer, uuid) from public, anon;

grant execute on function public.orbit_bump_transcript_attempts(uuid) to authenticated, service_role;
grant execute on function public.orbit_retrieve_segments(uuid, text, integer) to authenticated, service_role;
grant execute on function public.match_transcript_chunks(vector, double precision, integer, uuid) to authenticated, service_role;

-- Pin object resolution for the vector search function.
alter function public.match_transcript_chunks(vector, double precision, integer, uuid)
  set search_path = public, extensions, pg_temp;
