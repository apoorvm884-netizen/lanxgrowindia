-- Keep public account records aligned after a confirmed Supabase Auth email change.
create or replace function public.sync_confirmed_auth_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.profiles
       set email = new.email,
           updated_at = now()
     where id = new.id;

    update public.students
       set email = new.email,
           updated_at = now()
     where user_id = new.id;

    update public.counselors
       set email = new.email,
           updated_at = now()
     where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_confirmed_auth_email on auth.users;
create trigger sync_confirmed_auth_email
after update of email on auth.users
for each row execute function public.sync_confirmed_auth_email();

-- Product rule: a restricted school can allow at most 100 general Orbit
-- questions per student per local calendar day.
update public.school_ai_settings
   set daily_question_limit = least(daily_question_limit, 100)
 where daily_question_limit > 100;

update public.students
   set general_orbit_daily_limit = least(general_orbit_daily_limit, 100)
 where general_orbit_daily_limit > 100;

update public.students as student
   set general_orbit_daily_limit = settings.daily_question_limit,
       updated_at = now()
  from public.school_ai_settings as settings
 where settings.school_id = student.school_id
   and settings.access_mode = 'restricted'
   and student.general_orbit_daily_limit > settings.daily_question_limit;

alter table public.school_ai_settings
  drop constraint if exists school_ai_settings_daily_question_limit_check;
alter table public.school_ai_settings
  add constraint school_ai_settings_daily_question_limit_check
  check (daily_question_limit between 0 and 100);

alter table public.students
  drop constraint if exists students_general_orbit_daily_limit_check;
alter table public.students
  add constraint students_general_orbit_daily_limit_check
  check (
    general_orbit_daily_limit is null
    or general_orbit_daily_limit between 0 and 100
  );

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
declare
  v_result public.school_ai_settings;
begin
  if p_access_mode not in ('disabled', 'restricted', 'unlimited') then
    raise exception 'Invalid Orbit access mode';
  end if;
  if p_access_mode = 'restricted'
     and (p_daily_limit is null or p_daily_limit not between 0 and 100) then
    raise exception 'Restricted Orbit limit must be between 0 and 100';
  end if;
  if not (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(p_school_id))
    or (
      public.is_school_admin()
      and p_school_id = public.get_user_school_id()
    )
  ) then
    raise exception 'Only Super, Company, or the respective School Admin can change this Orbit policy'
      using errcode = '42501';
  end if;

  insert into public.school_ai_settings(
    school_id, enabled, student_access, access_mode,
    daily_question_limit, video_daily_question_limit
  )
  values (
    p_school_id,
    p_access_mode <> 'disabled',
    p_access_mode <> 'disabled',
    p_access_mode,
    coalesce(p_daily_limit, 10),
    10
  )
  on conflict (school_id) do update set
    enabled = excluded.enabled,
    student_access = excluded.student_access,
    access_mode = excluded.access_mode,
    daily_question_limit = case
      when excluded.access_mode = 'restricted'
        then excluded.daily_question_limit
      else public.school_ai_settings.daily_question_limit
    end,
    video_daily_question_limit = 10,
    updated_at = now()
  returning * into v_result;

  if p_access_mode = 'restricted' then
    update public.students
       set general_orbit_daily_limit = least(general_orbit_daily_limit, p_daily_limit),
           updated_at = now()
     where school_id = p_school_id
       and general_orbit_daily_limit > p_daily_limit;
  end if;

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
  select * into v_student
    from public.students
   where id = p_student_id
   for update;
  if not found then raise exception 'Student not found'; end if;

  if not (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(v_student.school_id))
    or (
      public.get_user_role() in ('school_admin', 'counselor')
      and v_student.school_id = public.get_user_school_id()
    )
  ) then
    raise exception 'Not authorized to change this learner''s Orbit access'
      using errcode = '42501';
  end if;

  select * into v_settings
    from public.school_ai_settings
   where school_id = v_student.school_id;

  if p_daily_limit is not null and p_daily_limit not between 0 and 100 then
    raise exception 'Student Orbit limit must be between 0 and 100';
  end if;
  if coalesce(v_settings.access_mode, 'restricted') = 'restricted'
     and p_daily_limit is not null
     and p_daily_limit > coalesce(v_settings.daily_question_limit, 10) then
    raise exception 'Student base limit cannot exceed the school daily maximum';
  end if;

  update public.students
     set general_orbit_enabled = p_enabled,
         general_orbit_daily_limit = p_daily_limit,
         updated_at = now()
   where id = p_student_id
  returning * into v_student;

  return v_student;
end;
$$;

create or replace function public.managed_student_orbit_status(p_student_id uuid)
returns table(
  student_id uuid,
  access_mode text,
  enabled boolean,
  unlimited boolean,
  school_daily_limit integer,
  base_daily_limit integer,
  used_today integer,
  bonus_granted_today integer,
  effective_daily_limit integer,
  available_today integer,
  grantable_today integer,
  reset_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_student public.students;
  v_settings public.school_ai_settings;
  v_date date;
  v_timezone text;
  v_used integer := 0;
  v_bonus integer := 0;
  v_school_limit integer;
  v_base_limit integer;
  v_effective integer;
  v_mode text;
begin
  select * into v_student
    from public.students
   where id = p_student_id;
  if not found or v_student.user_id is null then
    raise exception 'Student account not found';
  end if;

  if not (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(v_student.school_id))
    or (
      public.get_user_role() in ('school_admin', 'counselor')
      and v_student.school_id = public.get_user_school_id()
    )
  ) then
    raise exception 'Not authorized to view this learner''s Orbit allowance'
      using errcode = '42501';
  end if;

  select * into v_settings
    from public.school_ai_settings
   where school_id = v_student.school_id;
  select coalesce(timezone, 'Asia/Kolkata') into v_timezone
    from public.schools
   where id = v_student.school_id;

  v_date := public.school_local_date(v_student.school_id);
  v_mode := coalesce(v_settings.access_mode, 'restricted');
  v_school_limit := least(coalesce(v_settings.daily_question_limit, 10), 100);
  v_base_limit := least(
    coalesce(v_student.general_orbit_daily_limit, v_school_limit),
    v_school_limit
  );

  select coalesce(question_count, 0), coalesce(bonus_granted, 0)
    into v_used, v_bonus
    from public.ai_usage_daily
   where user_id = v_student.user_id
     and usage_date = v_date;

  v_used := coalesce(v_used, 0);
  v_bonus := coalesce(v_bonus, 0);
  v_effective := least(v_school_limit, v_base_limit + v_bonus);

  return query select
    v_student.id,
    v_mode,
    coalesce(v_student.general_orbit_enabled, true),
    v_mode = 'unlimited',
    v_school_limit,
    v_base_limit,
    v_used,
    v_bonus,
    case when v_mode = 'unlimited' then -1 else v_effective end,
    case
      when v_mode = 'unlimited' then -1
      when v_mode = 'disabled' or not coalesce(v_student.general_orbit_enabled, true) then 0
      else greatest(0, v_effective - v_used)
    end,
    case
      when v_mode <> 'restricted' or not coalesce(v_student.general_orbit_enabled, true) then 0
      else greatest(0, v_school_limit - greatest(v_effective, v_used))
    end,
    ((v_date + 1)::timestamp at time zone v_timezone);
end;
$$;

create or replace function public.grant_student_orbit_questions(
  p_student_id uuid,
  p_questions integer
)
returns table(
  student_id uuid,
  access_mode text,
  enabled boolean,
  unlimited boolean,
  school_daily_limit integer,
  base_daily_limit integer,
  used_today integer,
  bonus_granted_today integer,
  effective_daily_limit integer,
  available_today integer,
  grantable_today integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student public.students;
  v_settings public.school_ai_settings;
  v_date date;
  v_status record;
  v_bonus_increment integer;
begin
  if p_questions is null or p_questions < 1 then
    raise exception 'Grant at least 1 question';
  end if;

  select * into v_student
    from public.students
   where id = p_student_id
   for update;
  if not found or v_student.user_id is null then
    raise exception 'Student account not found';
  end if;

  if not (
    public.is_super_admin()
    or (public.is_company_admin() and public.user_in_same_company(v_student.school_id))
    or (
      public.get_user_role() in ('school_admin', 'counselor')
      and v_student.school_id = public.get_user_school_id()
    )
  ) then
    raise exception 'Not authorized to grant this learner more Orbit questions'
      using errcode = '42501';
  end if;

  select * into v_settings
    from public.school_ai_settings
   where school_id = v_student.school_id;
  if coalesce(v_settings.access_mode, 'restricted') <> 'restricted' then
    raise exception 'Daily grants are only used while the school policy is Restricted';
  end if;
  if not coalesce(v_student.general_orbit_enabled, true) then
    raise exception 'Enable General Orbit access before granting questions';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_student.user_id::text || ':general'));
  select * into v_status
    from public.managed_student_orbit_status(p_student_id);
  if p_questions > coalesce(v_status.grantable_today, 0) then
    raise exception 'Only % more question(s) can be granted today', coalesce(v_status.grantable_today, 0);
  end if;

  -- A grant represents newly usable questions. If usage is already above the
  -- current allocation (for example after a cap was lowered), first bridge
  -- that gap so granting 10 always produces 10 questions available now.
  v_bonus_increment := p_questions
    + greatest(0, v_status.used_today - v_status.effective_daily_limit);
  v_date := public.school_local_date(v_student.school_id);
  insert into public.ai_usage_daily(
    user_id, usage_date, school_id, question_count,
    bonus_granted, granted_by, granted_at
  )
  values (
    v_student.user_id, v_date, v_student.school_id, 0,
    v_bonus_increment, auth.uid(), now()
  )
  on conflict (user_id, usage_date) do update set
    bonus_granted = public.ai_usage_daily.bonus_granted + excluded.bonus_granted,
    granted_by = excluded.granted_by,
    granted_at = excluded.granted_at,
    updated_at = now();

  return query
    select * from public.managed_student_orbit_status(p_student_id);
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
  v_bonus integer := 0;
  v_limit integer;
  v_school_limit integer;
  v_unlimited boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

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
  select coalesce(timezone, 'Asia/Kolkata') into v_timezone
    from public.schools where id = v_profile.school_id;
  v_date := public.school_local_date(v_profile.school_id);

  if p_content_id is not null then
    if not exists (
      select 1 from public.content c
       where c.id = p_content_id
         and c.school_id = v_profile.school_id
         and c.drive_folder_id = v_student.drive_folder_id
         and c.status = 'published'
         and c.sync_state = 'active'
    ) then
      return query select false, 0, 10, 0, false, null::timestamptz,
        'This video is not assigned to you.';
      return;
    end if;
    v_limit := coalesce(v_settings.video_daily_question_limit, 10);
    select coalesce(question_count, 0) into v_used
      from public.video_orbit_usage_daily
     where user_id = auth.uid()
       and content_id = p_content_id
       and usage_date = v_date;
  else
    if coalesce(v_settings.access_mode, 'restricted') = 'disabled'
       or not coalesce(v_student.general_orbit_enabled, true) then
      return query select false, 0, 0, 0, false, null::timestamptz,
        'Orbit is disabled for this account.';
      return;
    end if;

    v_unlimited := coalesce(v_settings.access_mode, 'restricted') = 'unlimited';
    v_school_limit := least(coalesce(v_settings.daily_question_limit, 10), 100);
    select coalesce(question_count, 0), coalesce(bonus_granted, 0)
      into v_used, v_bonus
      from public.ai_usage_daily
     where user_id = auth.uid()
       and usage_date = v_date;
    v_limit := least(
      coalesce(v_student.general_orbit_daily_limit, v_school_limit) + coalesce(v_bonus, 0),
      v_school_limit
    );
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

revoke all on function public.sync_confirmed_auth_email() from public, anon, authenticated;
revoke all on function public.managed_student_orbit_status(uuid) from public, anon;
revoke all on function public.grant_student_orbit_questions(uuid, integer) from public, anon;
grant execute on function public.managed_student_orbit_status(uuid) to authenticated;
grant execute on function public.grant_student_orbit_questions(uuid, integer) to authenticated;
