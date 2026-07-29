-- Allow a previously revoked browser to register again without violating the
-- unique (user_id, device_id) constraint. Device resets retain their audit
-- history, while the next successful student login reactivates the same row.

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
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(btrim(p_device_id), '') is null or char_length(p_device_id) > 128 then
    raise exception 'A valid device ID is required';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found or coalesce(v_profile.status, 'inactive') <> 'active' then
    return query select false, 0, 'This account is inactive.';
    return;
  end if;

  if v_profile.school_id is not null then
    select status into v_school_status
    from public.schools
    where id = v_profile.school_id;

    if coalesce(v_school_status, 'inactive') <> 'active' then
      return query select false, 0, 'This school is inactive.';
      return;
    end if;
  end if;

  if v_profile.role <> 'student' then
    return query select true, 0, 'Access granted.';
    return;
  end if;

  select status into v_student_status
  from public.students
  where user_id = auth.uid();

  if coalesce(v_student_status, 'inactive') <> 'active' then
    return query select false, 0, 'This student account is inactive.';
    return;
  end if;

  update public.user_devices
  set last_seen_at = now(),
      device_label = coalesce(nullif(btrim(p_device_label), ''), device_label)
  where user_id = auth.uid()
    and device_id = p_device_id
    and revoked_at is null;

  if not found then
    select count(*)::integer into v_count
    from public.user_devices
    where user_id = auth.uid()
      and revoked_at is null;

    if v_count >= 2 then
      return query
      select false, v_count,
             'Maximum 2 devices are allowed. Ask your school admin to reset a device.';
      return;
    end if;

    insert into public.user_devices (
      user_id,
      device_id,
      device_label,
      last_seen_at,
      revoked_at,
      revoked_by
    )
    values (
      auth.uid(),
      p_device_id,
      nullif(btrim(p_device_label), ''),
      now(),
      null,
      null
    )
    on conflict (user_id, device_id) do update
    set device_label = coalesce(excluded.device_label, public.user_devices.device_label),
        last_seen_at = now(),
        revoked_at = null,
        revoked_by = null;
  end if;

  select count(*)::integer into v_count
  from public.user_devices
  where user_id = auth.uid()
    and revoked_at is null;

  return query select true, v_count, 'Access granted.';
end;
$$;

revoke all on function public.register_my_device(text, text) from public, anon;
grant execute on function public.register_my_device(text, text) to authenticated;
