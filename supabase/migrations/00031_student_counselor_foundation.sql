-- Student/counselor foundation.
-- Keeps the legacy hierarchy available for rollback while making the active
-- learning model Student -> assigned Drive folder -> reviewed videos.

alter table public.students
  add column if not exists general_orbit_enabled boolean not null default true,
  add column if not exists general_orbit_daily_limit integer;

update public.students set status = 'inactive' where status = 'suspended';
alter table public.students drop constraint if exists students_status_check;
alter table public.students
  add constraint students_status_check check (status in ('active', 'inactive'));
alter table public.students drop constraint if exists students_general_orbit_daily_limit_check;
alter table public.students
  add constraint students_general_orbit_daily_limit_check
  check (general_orbit_daily_limit is null or general_orbit_daily_limit between 0 and 200);

alter table public.school_ai_settings
  add column if not exists access_mode text not null default 'restricted',
  add column if not exists video_daily_question_limit integer not null default 10;

alter table public.school_ai_settings drop constraint if exists school_ai_settings_access_mode_check;
alter table public.school_ai_settings
  add constraint school_ai_settings_access_mode_check
  check (access_mode in ('disabled', 'restricted', 'unlimited'));
alter table public.school_ai_settings drop constraint if exists school_ai_settings_video_limit_check;
alter table public.school_ai_settings
  add constraint school_ai_settings_video_limit_check
  check (video_daily_question_limit between 1 and 50);

-- The product requirement is ten questions per video/day. It is stored here
-- (not hardcoded in the UI or Edge Function) and is intentionally not editable
-- by school staff.
update public.school_ai_settings set video_daily_question_limit = 10;

alter table public.content
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text;

alter table public.notifications
  add column if not exists action_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.schools
  add column if not exists attendance_work_start time not null default '09:00',
  add column if not exists attendance_work_end time not null default '17:00',
  add column if not exists attendance_late_after_minutes integer not null default 15;

alter table public.schools drop constraint if exists schools_attendance_radius_check;
alter table public.schools
  add constraint schools_attendance_radius_check
  check (attendance_radius_m between 20 and 5000);
alter table public.schools drop constraint if exists schools_attendance_late_check;
alter table public.schools
  add constraint schools_attendance_late_check
  check (attendance_late_after_minutes between 0 and 240);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_label text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  unique (user_id, device_id)
);

create index if not exists idx_user_devices_active
  on public.user_devices(user_id, last_seen_at desc)
  where revoked_at is null;

create table if not exists public.video_orbit_usage_daily (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  usage_date date not null,
  question_count integer not null default 0 check (question_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id, usage_date)
);

create index if not exists idx_video_orbit_usage_school_date
  on public.video_orbit_usage_daily(school_id, usage_date);

create table if not exists public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  check (decision = 'approved' or nullif(btrim(reason), '') is not null)
);

create index if not exists idx_content_reviews_content_created
  on public.content_reviews(content_id, created_at desc);

alter table public.user_devices enable row level security;
alter table public.video_orbit_usage_daily enable row level security;
alter table public.content_reviews enable row level security;

drop policy if exists "Users read own devices" on public.user_devices;
create policy "Users read own devices"
  on public.user_devices for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "School admins read school devices" on public.user_devices;
create policy "School admins read school devices"
  on public.user_devices for select to authenticated
  using (
    (public.is_school_admin() and exists (
      select 1 from public.profiles p
      where p.id = user_devices.user_id
        and p.school_id = public.get_user_school_id()
    ))
    or public.is_super_admin()
    or (public.is_company_admin() and exists (
      select 1 from public.profiles p
      where p.id = user_devices.user_id
        and p.company_id = public.get_user_company_id()
    ))
  );

drop policy if exists "Users read own video Orbit usage" on public.video_orbit_usage_daily;
create policy "Users read own video Orbit usage"
  on public.video_orbit_usage_daily for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "School staff read school video Orbit usage" on public.video_orbit_usage_daily;
create policy "School staff read school video Orbit usage"
  on public.video_orbit_usage_daily for select to authenticated
  using (
    (public.get_user_role() in ('school_admin', 'counselor')
      and school_id = public.get_user_school_id())
    or public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(school_id))
  );

drop policy if exists "School reviewers read reviews" on public.content_reviews;
create policy "School reviewers read reviews"
  on public.content_reviews for select to authenticated
  using (
    (public.get_user_role() in ('school_admin', 'counselor')
      and school_id = public.get_user_school_id())
    or public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(school_id))
  );

-- Counselors manage every learner in their school, not only learners assigned
-- to them. They still cannot permanently delete a learner.
drop policy if exists "Counselors can read assigned students" on public.students;
drop policy if exists "Counselors can update assigned students" on public.students;
drop policy if exists "Counselors insert own students" on public.students;

create policy "Counselors can read school students"
  on public.students for select to authenticated
  using (public.is_counselor() and school_id = public.get_user_school_id());

create policy "Counselors can update school students"
  on public.students for update to authenticated
  using (public.is_counselor() and school_id = public.get_user_school_id())
  with check (public.is_counselor() and school_id = public.get_user_school_id());

create policy "Counselors can insert school students"
  on public.students for insert to authenticated
  with check (public.is_counselor() and school_id = public.get_user_school_id());

drop policy if exists "Company admins can insert own students" on public.students;
create policy "Company admins can insert own students"
  on public.students for insert to authenticated
  with check (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can update own students" on public.students;
create policy "Company admins can update own students"
  on public.students for update to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id))
  with check (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can delete own students" on public.students;
create policy "Company admins can delete own students"
  on public.students for delete to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id));

-- Remove the obsolete class/category route. Drive-folder access is the only
-- student content policy.
drop policy if exists "Students can read own class published content" on public.content;

drop policy if exists "Counselors can read own school published content" on public.content;
create policy "Counselors can read own school content"
  on public.content for select to authenticated
  using (public.is_counselor() and school_id = public.get_user_school_id());

drop policy if exists "Company admins can insert own ai settings" on public.school_ai_settings;
create policy "Company admins can insert own ai settings"
  on public.school_ai_settings for insert to authenticated
  with check (public.is_company_admin() and public.user_in_same_company(school_id));

drop policy if exists "Company admins can update own ai settings" on public.school_ai_settings;
create policy "Company admins can update own ai settings"
  on public.school_ai_settings for update to authenticated
  using (public.is_company_admin() and public.user_in_same_company(school_id))
  with check (public.is_company_admin() and public.user_in_same_company(school_id));

-- School admins may assign learner limits within the company policy, but only
-- Super/Company admins can change the school-wide mode and cap. This is
-- enforced by this RPC instead of direct client updates.
drop policy if exists "School admins can update own ai settings" on public.school_ai_settings;

create or replace function public.school_local_date(p_school_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select timezone from public.schools where id = p_school_id),
    'Asia/Kolkata'
  ))::date;
$$;

create or replace function public.register_my_device(
  p_device_id text,
  p_device_label text default null
)
returns table(allowed boolean, active_devices integer, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_school_status text;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_device_id), '') is null or char_length(p_device_id) > 128 then
    raise exception 'A valid device ID is required';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or coalesce(v_profile.status, 'inactive') <> 'active' then
    return query select false, 0, 'This account is inactive.';
    return;
  end if;

  if v_profile.school_id is not null then
    select status into v_school_status from public.schools where id = v_profile.school_id;
    if coalesce(v_school_status, 'inactive') <> 'active' then
      return query select false, 0, 'This school is inactive.';
      return;
    end if;
  end if;

  if v_profile.role <> 'student' then
    return query select true, 0, 'Access granted.';
    return;
  end if;

  update public.user_devices
     set last_seen_at = now(), device_label = coalesce(nullif(btrim(p_device_label), ''), device_label)
   where user_id = auth.uid() and device_id = p_device_id and revoked_at is null;

  if not found then
    select count(*)::integer into v_count
      from public.user_devices where user_id = auth.uid() and revoked_at is null;
    if v_count >= 2 then
      return query select false, v_count, 'Maximum 2 devices are allowed. Ask your school admin to reset a device.';
      return;
    end if;
    insert into public.user_devices(user_id, device_id, device_label)
    values (auth.uid(), p_device_id, nullif(btrim(p_device_label), ''));
  end if;

  select count(*)::integer into v_count
    from public.user_devices where user_id = auth.uid() and revoked_at is null;
  return query select true, v_count, 'Access granted.';
end;
$$;

create or replace function public.revoke_student_devices(p_student_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student public.students;
  v_count integer;
begin
  select * into v_student from public.students where id = p_student_id;
  if not found or v_student.user_id is null then return 0; end if;

  if not (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(v_student.school_id))
    or (public.is_school_admin() and v_student.school_id = public.get_user_school_id())
  ) then
    raise exception 'Not authorized to reset these devices' using errcode = '42501';
  end if;

  update public.user_devices
     set revoked_at = now(), revoked_by = auth.uid()
   where user_id = v_student.user_id and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.set_school_orbit_policy(
  p_school_id uuid,
  p_access_mode text,
  p_daily_limit integer default null
)
returns public.school_ai_settings
language plpgsql
security definer
set search_path = ''
as $$
declare v_result public.school_ai_settings;
begin
  if p_access_mode not in ('disabled', 'restricted', 'unlimited') then
    raise exception 'Invalid Orbit access mode';
  end if;
  if p_access_mode = 'restricted' and (p_daily_limit is null or p_daily_limit not between 0 and 200) then
    raise exception 'Restricted Orbit limit must be between 0 and 200';
  end if;
  if not (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(p_school_id))
  ) then
    raise exception 'Only Super or Company Admin can change the school Orbit policy' using errcode = '42501';
  end if;

  insert into public.school_ai_settings(
    school_id, enabled, student_access, access_mode, daily_question_limit,
    video_daily_question_limit
  ) values (
    p_school_id, p_access_mode <> 'disabled', p_access_mode <> 'disabled',
    p_access_mode, coalesce(p_daily_limit, 10), 10
  )
  on conflict (school_id) do update set
    enabled = excluded.enabled,
    student_access = excluded.student_access,
    access_mode = excluded.access_mode,
    daily_question_limit = case
      when excluded.access_mode = 'restricted' then excluded.daily_question_limit
      else public.school_ai_settings.daily_question_limit
    end,
    video_daily_question_limit = 10,
    updated_at = now()
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.set_student_orbit_access(
  p_student_id uuid,
  p_enabled boolean,
  p_daily_limit integer default null
)
returns public.students
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student public.students;
  v_settings public.school_ai_settings;
begin
  select * into v_student from public.students where id = p_student_id for update;
  if not found then raise exception 'Student not found'; end if;
  if not (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(v_student.school_id))
    or (public.get_user_role() in ('school_admin', 'counselor')
      and v_student.school_id = public.get_user_school_id())
  ) then
    raise exception 'Not authorized to change this learner''s Orbit access' using errcode = '42501';
  end if;

  select * into v_settings from public.school_ai_settings where school_id = v_student.school_id;
  if coalesce(v_settings.access_mode, 'restricted') = 'restricted'
     and p_daily_limit is not null
     and p_daily_limit > coalesce(v_settings.daily_question_limit, 10) then
    raise exception 'Student limit cannot exceed the school limit';
  end if;
  if p_daily_limit is not null and p_daily_limit not between 0 and 200 then
    raise exception 'Student Orbit limit must be between 0 and 200';
  end if;

  update public.students set
    general_orbit_enabled = p_enabled,
    general_orbit_daily_limit = p_daily_limit,
    updated_at = now()
  where id = p_student_id
  returning * into v_student;
  return v_student;
end;
$$;

create or replace function public.orbit_quota_status(p_content_id uuid default null)
returns table(
  allowed boolean,
  used integer,
  daily_limit integer,
  remaining integer,
  unlimited boolean,
  reset_at timestamptz,
  message text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_student public.students;
  v_settings public.school_ai_settings;
  v_date date;
  v_timezone text;
  v_used integer := 0;
  v_limit integer;
  v_unlimited boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.status <> 'active' then
    return query select false, 0, 0, 0, false, null::timestamptz, 'This account is inactive.';
    return;
  end if;
  if v_profile.role <> 'student' then
    return query select true, 0, 0, 0, true, null::timestamptz, 'Staff access is unlimited.';
    return;
  end if;

  select * into v_student from public.students where user_id = auth.uid();
  select * into v_settings from public.school_ai_settings where school_id = v_profile.school_id;
  select coalesce(timezone, 'Asia/Kolkata') into v_timezone from public.schools where id = v_profile.school_id;
  v_date := public.school_local_date(v_profile.school_id);

  if p_content_id is not null then
    if not exists (
      select 1 from public.content c
      where c.id = p_content_id and c.school_id = v_profile.school_id
        and c.drive_folder_id = v_student.drive_folder_id
        and c.status = 'published' and c.sync_state = 'active'
    ) then
      return query select false, 0, 10, 0, false, null::timestamptz, 'This video is not assigned to you.';
      return;
    end if;
    v_limit := coalesce(v_settings.video_daily_question_limit, 10);
    select coalesce(question_count, 0) into v_used
      from public.video_orbit_usage_daily
      where user_id = auth.uid() and content_id = p_content_id and usage_date = v_date;
  else
    if coalesce(v_settings.access_mode, 'restricted') = 'disabled'
       or not coalesce(v_student.general_orbit_enabled, true) then
      return query select false, 0, 0, 0, false, null::timestamptz, 'Orbit is disabled for this account.';
      return;
    end if;
    v_unlimited := coalesce(v_settings.access_mode, 'restricted') = 'unlimited';
    v_limit := least(
      coalesce(v_student.general_orbit_daily_limit, v_settings.daily_question_limit, 10),
      coalesce(v_settings.daily_question_limit, 10)
    );
    select coalesce(question_count, 0) into v_used
      from public.ai_usage_daily
      where user_id = auth.uid() and usage_date = v_date;
  end if;

  v_used := coalesce(v_used, 0);
  return query select
    (v_unlimited or v_used < v_limit),
    v_used,
    v_limit,
    case when v_unlimited then -1 else greatest(0, v_limit - v_used) end,
    v_unlimited,
    ((v_date + 1)::timestamp at time zone v_timezone),
    case
      when v_unlimited then 'Unlimited Orbit access.'
      when v_used < v_limit then 'Orbit is available.'
      else 'Daily Orbit limit reached. It resets at midnight.'
    end;
end;
$$;

create or replace function public.orbit_consume_question(p_content_id uuid default null)
returns table(
  allowed boolean,
  used integer,
  daily_limit integer,
  remaining integer,
  unlimited boolean,
  reset_at timestamptz,
  message text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status record;
  v_profile public.profiles;
  v_date date;
begin
  select * into v_status from public.orbit_quota_status(p_content_id);
  if not coalesce(v_status.allowed, false) then
    return query select v_status.allowed, v_status.used, v_status.daily_limit,
      v_status.remaining, v_status.unlimited, v_status.reset_at, v_status.message;
    return;
  end if;
  if coalesce(v_status.unlimited, false) then
    return query select v_status.allowed, v_status.used, v_status.daily_limit,
      v_status.remaining, v_status.unlimited, v_status.reset_at, v_status.message;
    return;
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  v_date := public.school_local_date(v_profile.school_id);
  if p_content_id is null then
    insert into public.ai_usage_daily(user_id, usage_date, school_id, question_count)
    values (auth.uid(), v_date, v_profile.school_id, 1)
    on conflict (user_id, usage_date) do update
      set question_count = public.ai_usage_daily.question_count + 1, updated_at = now();
  else
    insert into public.video_orbit_usage_daily(user_id, content_id, school_id, usage_date, question_count)
    values (auth.uid(), p_content_id, v_profile.school_id, v_date, 1)
    on conflict (user_id, content_id, usage_date) do update
      set question_count = public.video_orbit_usage_daily.question_count + 1, updated_at = now();
  end if;

  return query select * from public.orbit_quota_status(p_content_id);
end;
$$;

create or replace function public.review_content(
  p_content_id uuid,
  p_decision text,
  p_reason text default null
)
returns public.content
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content public.content;
  v_result public.content;
begin
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid review decision'; end if;
  if p_decision = 'rejected' and nullif(btrim(p_reason), '') is null then
    raise exception 'A rejection reason is required';
  end if;
  select * into v_content from public.content where id = p_content_id for update;
  if not found then raise exception 'Content not found'; end if;
  if not (
    public.get_user_role() in ('school_admin', 'counselor')
    and v_content.school_id = public.get_user_school_id()
  ) then
    raise exception 'Only this school''s admin or counselor can review content' using errcode = '42501';
  end if;

  insert into public.content_reviews(content_id, school_id, reviewer_id, decision, reason)
  values (v_content.id, v_content.school_id, auth.uid(), p_decision, nullif(btrim(p_reason), ''));

  update public.content set
    status = case when p_decision = 'approved' then 'published' else 'draft' end,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    rejection_reason = case when p_decision = 'rejected' then btrim(p_reason) else null end,
    updated_at = now()
  where id = p_content_id
  returning * into v_result;
  return v_result;
end;
$$;

-- Explicit API privileges are required for new objects.
revoke all on public.user_devices, public.video_orbit_usage_daily, public.content_reviews from anon;
grant select on public.user_devices, public.video_orbit_usage_daily, public.content_reviews to authenticated;
grant all on public.user_devices, public.video_orbit_usage_daily, public.content_reviews to service_role;

revoke all on function public.register_my_device(text, text) from public, anon;
revoke all on function public.revoke_student_devices(uuid) from public, anon;
revoke all on function public.set_school_orbit_policy(uuid, text, integer) from public, anon;
revoke all on function public.set_student_orbit_access(uuid, boolean, integer) from public, anon;
revoke all on function public.orbit_quota_status(uuid) from public, anon;
revoke all on function public.orbit_consume_question(uuid) from public, anon;
revoke all on function public.review_content(uuid, text, text) from public, anon;

grant execute on function public.register_my_device(text, text) to authenticated;
grant execute on function public.revoke_student_devices(uuid) to authenticated;
grant execute on function public.set_school_orbit_policy(uuid, text, integer) to authenticated;
grant execute on function public.set_student_orbit_access(uuid, boolean, integer) to authenticated;
grant execute on function public.orbit_quota_status(uuid) to authenticated;
grant execute on function public.orbit_consume_question(uuid) to authenticated;
grant execute on function public.review_content(uuid, text, text) to authenticated;
