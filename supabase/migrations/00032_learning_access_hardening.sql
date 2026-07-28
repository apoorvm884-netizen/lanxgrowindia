-- Enforce active membership, assigned-folder playback, atomic quotas, progress
-- ownership, and server-calculated staff attendance.

create or replace function public.sync_student_profile_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and new.status is distinct from old.status then
    update public.profiles
       set status = new.status, updated_at = now()
     where id = new.user_id and role = 'student';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_student_profile_status on public.students;
create trigger sync_student_profile_status
after update of status on public.students
for each row execute function public.sync_student_profile_status();

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
  v_student_status text;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
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
  select status into v_student_status from public.students where user_id = auth.uid();
  if coalesce(v_student_status, 'inactive') <> 'active' then
    return query select false, 0, 'This student account is inactive.';
    return;
  end if;
  update public.user_devices
     set last_seen_at = now(),
         device_label = coalesce(nullif(btrim(p_device_label), ''), device_label)
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

create or replace function public.issue_playback_token(
  p_content_id uuid,
  p_client_fingerprint text default null
)
returns table(token text, expires_at timestamptz, stream_path text)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_c public.content;
  v_profile public.profiles;
  v_student public.students;
  v_school_status text;
  v_allowed boolean := false;
  v_token text;
  v_ttl interval;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.status <> 'active' then raise exception 'Account is inactive' using errcode = '42501'; end if;
  if v_profile.school_id is not null then
    select status into v_school_status from public.schools where id = v_profile.school_id;
    if v_school_status <> 'active' then raise exception 'School is inactive' using errcode = '42501'; end if;
  end if;
  select * into v_c from public.content where id = p_content_id;
  if not found then raise exception 'No such content' using errcode = 'P0002'; end if;

  if public.is_super_admin() then
    v_allowed := true;
  elsif public.is_company_admin() and public.user_in_same_company(v_c.school_id) then
    v_allowed := true;
  elsif v_profile.role in ('school_admin', 'counselor') and v_c.school_id = v_profile.school_id then
    v_allowed := true;
  elsif v_profile.role = 'student' and v_c.school_id = v_profile.school_id
        and v_c.status = 'published' and v_c.sync_state = 'active' then
    select * into v_student from public.students where user_id = auth.uid();
    v_allowed := v_student.status = 'active'
      and v_student.drive_folder_id is not null
      and v_student.drive_folder_id = v_c.drive_folder_id;
  end if;
  if not v_allowed then raise exception 'Not authorised to play this item' using errcode = '42501'; end if;

  v_ttl := least(
    greatest(interval '30 minutes', make_interval(secs => coalesce(v_c.duration_seconds, 0) * 2)),
    interval '6 hours'
  );
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.playback_tokens(token, content_id, user_id, school_id, client_fingerprint, expires_at)
  values (v_token, p_content_id, auth.uid(), v_c.school_id, p_client_fingerprint, now() + v_ttl);
  return query select v_token, now() + v_ttl, ('/functions/v1/drive-stream?t=' || v_token)::text;
end;
$$;

drop policy if exists "Users can insert own progress" on public.content_progress;
create policy "Users can insert assigned progress"
  on public.content_progress for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and school_id = public.get_user_school_id()
    and (
      public.get_user_role() <> 'student'
      or exists (
        select 1
        from public.students student
        join public.content item on item.id = content_progress.content_id
        where student.user_id = (select auth.uid())
          and student.status = 'active'
          and item.school_id = student.school_id
          and item.drive_folder_id = student.drive_folder_id
          and item.status = 'published'
          and item.sync_state = 'active'
      )
    )
  );

drop policy if exists "Users can update own progress" on public.content_progress;
create policy "Users can update assigned progress"
  on public.content_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      public.get_user_role() <> 'student'
      or exists (
        select 1
        from public.students student
        join public.content item on item.id = content_progress.content_id
        where student.user_id = (select auth.uid())
          and student.status = 'active'
          and item.drive_folder_id = student.drive_folder_id
          and item.status = 'published'
          and item.sync_state = 'active'
      )
    )
  );

create or replace function public.notify_video_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student public.students;
  v_content_name text;
begin
  if new.completed and not coalesce(old.completed, false) then
    select * into v_student from public.students where user_id = new.user_id;
    select name into v_content_name from public.content where id = new.content_id;
    insert into public.notifications(user_id, title, message, action_url, metadata)
    select p.id,
           'Video completed',
           coalesce(v_student.name, 'A student') || ' completed ' || coalesce(v_content_name, 'a video') || '.',
           'school-reports',
           jsonb_build_object('kind', 'video_completed', 'student_id', v_student.id, 'content_id', new.content_id)
      from public.profiles p
     where p.school_id = new.school_id
       and p.status = 'active'
       and p.role in ('school_admin', 'counselor');
  end if;
  return new;
end;
$$;

drop trigger if exists notify_video_completed on public.content_progress;
create trigger notify_video_completed
after update on public.content_progress
for each row execute function public.notify_video_completed();

create or replace function public.orbit_consume_question(p_content_id uuid default null)
returns table(
  allowed boolean, used integer, daily_limit integer, remaining integer,
  unlimited boolean, reset_at timestamptz, message text
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
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text || ':' || coalesce(p_content_id::text, 'general')));
  select * into v_status from public.orbit_quota_status(p_content_id);
  if not coalesce(v_status.allowed, false) or coalesce(v_status.unlimited, false) then
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

create or replace function public.mark_my_attendance(
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_device_info text default null
)
returns public.attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_school public.schools;
  v_date date;
  v_distance double precision;
  v_verified boolean := false;
  v_local_time time;
  v_status text := 'unattended';
  v_result public.attendance;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.role not in ('teacher', 'counselor', 'school_admin') then
    raise exception 'Attendance is only available for school staff' using errcode = '42501';
  end if;
  select * into v_school from public.schools where id = v_profile.school_id;
  if not found then raise exception 'School not found'; end if;
  v_date := public.school_local_date(v_school.id);
  v_local_time := (now() at time zone coalesce(v_school.timezone, 'Asia/Kolkata'))::time;

  if p_latitude is not null and p_longitude is not null
     and v_school.latitude is not null and v_school.longitude is not null then
    v_distance := 6371000 * 2 * asin(sqrt(
      power(sin(radians(p_latitude - v_school.latitude) / 2), 2)
      + cos(radians(v_school.latitude)) * cos(radians(p_latitude))
      * power(sin(radians(p_longitude - v_school.longitude) / 2), 2)
    ));
    v_verified := v_distance <= coalesce(v_school.attendance_radius_m, 50);
  end if;
  if v_verified then
    v_status := case
      when v_local_time > v_school.attendance_work_start
        + make_interval(mins => v_school.attendance_late_after_minutes)
      then 'late' else 'present' end;
  end if;

  insert into public.attendance(
    user_id, school_id, date, check_in_time, latitude, longitude,
    status, location_verified, device_info, notes
  ) values (
    auth.uid(), v_school.id, v_date, now(), p_latitude, p_longitude,
    v_status, v_verified, left(p_device_info, 500),
    case when v_distance is null then 'Location unavailable' else round(v_distance)::text || 'm from school' end
  )
  on conflict (user_id, date) do update set
    latitude = coalesce(public.attendance.latitude, excluded.latitude),
    longitude = coalesce(public.attendance.longitude, excluded.longitude),
    device_info = coalesce(public.attendance.device_info, excluded.device_info)
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.mark_my_attendance(double precision, double precision, text) from public, anon;
grant execute on function public.mark_my_attendance(double precision, double precision, text) to authenticated;
