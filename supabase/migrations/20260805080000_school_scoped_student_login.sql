-- Student login IDs are scoped to a school. A contact email is not a login key.
alter table public.students add column if not exists login_id text;

update public.students
set login_id = coalesce(nullif(trim(admission_no), ''), 'student-' || left(replace(id::text, '-', ''), 12))
where login_id is null;

create unique index if not exists students_school_login_id_unique
  on public.students (school_id, lower(login_id))
  where login_id is not null;

create index if not exists idx_students_login_id
  on public.students (school_id, login_id)
  where login_id is not null;
