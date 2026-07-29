-- Supabase grants new public-schema functions to API roles by default. Keep
-- the auth-email trigger private and expose manager RPCs only after login.
revoke all on function public.sync_confirmed_auth_email()
  from public, anon, authenticated;
revoke all on function public.managed_student_orbit_status(uuid)
  from public, anon;
revoke all on function public.grant_student_orbit_questions(uuid, integer)
  from public, anon;

grant execute on function public.managed_student_orbit_status(uuid)
  to authenticated;
grant execute on function public.grant_student_orbit_questions(uuid, integer)
  to authenticated;
