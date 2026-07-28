-- Align remaining legacy policies with the approved role matrix.

alter table public.schools alter column attendance_radius_m set default 50;

drop policy if exists "School admins can insert own content" on public.content;
drop policy if exists "School admins can update own content" on public.content;
drop policy if exists "School admins can delete own content" on public.content;

drop policy if exists "Company admins can insert own content" on public.content;
create policy "Company admins can insert own content"
  on public.content for insert to authenticated
  with check (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can update own content" on public.content;
create policy "Company admins can update own content"
  on public.content for update to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id))
  with check (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can delete own content" on public.content;
create policy "Company admins can delete own content"
  on public.content for delete to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can read company conversations" on public.ai_conversations;
create policy "Company admins can read company conversations"
  on public.ai_conversations for select to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can read company messages" on public.ai_messages;
create policy "Company admins can read company messages"
  on public.ai_messages for select to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can read company usage" on public.ai_usage_daily;
create policy "Company admins can read company usage"
  on public.ai_usage_daily for select to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can read company progress" on public.content_progress;
create policy "Company admins can read company progress"
  on public.content_progress for select to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "School admins manage attendance" on public.attendance;
create policy "Authorized admins manage attendance"
  on public.attendance for all to authenticated
  using (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(school_id))
    or (public.is_school_admin() and school_id = public.get_user_school_id())
  )
  with check (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(school_id))
    or (public.is_school_admin() and school_id = public.get_user_school_id())
  );

drop policy if exists "Users can read own attendance" on public.attendance;
create policy "Users read own or scoped attendance"
  on public.attendance for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(school_id))
    or (public.is_school_admin() and school_id = public.get_user_school_id())
  );

drop policy if exists "Users can insert own attendance" on public.attendance;

-- Keep the legacy function signature safe for older clients. Callers can no
-- longer consume another user's quota.
create or replace function public.ai_consume_question(p_user_id uuid)
returns table(remaining integer, daily_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare v_status record;
begin
  if auth.uid() is null or p_user_id <> auth.uid() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select * into v_status from public.orbit_consume_question(null);
  if not v_status.allowed then
    raise exception '%', v_status.message using errcode = 'P0001';
  end if;
  return query select v_status.remaining, v_status.daily_limit;
end;
$$;

revoke all on function public.ai_consume_question(uuid) from public, anon;
grant execute on function public.ai_consume_question(uuid) to authenticated;
