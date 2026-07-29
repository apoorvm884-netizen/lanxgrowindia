-- Unify manual and automatic messages in one real-time notification inbox.
-- Client applications can read/update/delete only their own rows. All inserts
-- are performed by trusted server-side flows such as send-notification.

drop policy if exists "Users can insert own notifications" on public.notifications;

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
