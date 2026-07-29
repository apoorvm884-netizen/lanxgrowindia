-- Evaluate auth helpers once per statement instead of once per row.
-- Policy behavior and role scope remain unchanged.

alter policy "Service role manages attendance" on public.attendance
  using ((select auth.role()) = 'service_role'::text);

alter policy "Super admins manage api keys" on public.api_keys
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'super_admin'::text
  ));
alter policy "Service role manages api keys" on public.api_keys
  using ((select auth.role()) = 'service_role'::text);

alter policy "Authenticated users can read chunks" on public.transcript_chunks
  using ((select auth.role()) = 'authenticated'::text);
alter policy "Service role can manage chunks" on public.transcript_chunks
  using ((select auth.role()) = 'service_role'::text);

alter policy "Users can read own progress" on public.content_progress
  using (user_id = (select auth.uid()));

alter policy "Users can read own conversations" on public.ai_conversations
  using (user_id = (select auth.uid()));
alter policy "Users can start own conversations" on public.ai_conversations
  with check (
    user_id = (select auth.uid())
    and school_id = public.get_user_school_id()
  );
alter policy "Users can rename own conversations" on public.ai_conversations
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy "Users can delete own conversations" on public.ai_conversations
  using (user_id = (select auth.uid()));

alter policy "Users can read own messages" on public.ai_messages
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id
      and c.user_id = (select auth.uid())
  ));

alter policy "Users can read own usage" on public.ai_usage_daily
  using (user_id = (select auth.uid()));

alter policy "Students can read own escalations" on public.ai_escalations
  using (student_id = (select auth.uid()));
alter policy "Students can raise own escalations" on public.ai_escalations
  with check (
    student_id = (select auth.uid())
    and school_id = public.get_user_school_id()
  );

alter policy "Users can read own playback tokens" on public.playback_tokens
  using (user_id = (select auth.uid()));
