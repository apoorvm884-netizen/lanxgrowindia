-- Create the students table with base columns + extended columns + RLS
-- Fully idempotent: safe to run multiple times
-- Each ALTER TABLE ADD COLUMN is a separate statement to avoid batch
-- rollback issues in Supabase SQL Editor

-- Base table (includes all columns needed by the UI)
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text,
  school_id      uuid not null references public.schools(id) on delete cascade,
  counselor_id   uuid references public.profiles(id) on delete set null,
  status         text not null default 'active'
                  check (status in ('active', 'inactive', 'suspended')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Extended columns (each in its own ALTER TABLE to prevent batch rollback)
alter table public.students add column if not exists class          text;
alter table public.students add column if not exists section        text;
alter table public.students add column if not exists roll_number    text;
alter table public.students add column if not exists admission_no   text;
alter table public.students add column if not exists dob            date;
alter table public.students add column if not exists parent_name    text;
alter table public.students add column if not exists parent_contact text;
alter table public.students add column if not exists academic_year  text;
alter table public.students add column if not exists attendance     integer not null default 0;
alter table public.students add column if not exists progress       integer not null default 0;
alter table public.students add column if not exists notes          text;

-- Indexes
create index if not exists idx_students_school_id on public.students(school_id);
create index if not exists idx_students_counselor_id on public.students(counselor_id);

-- Enable RLS
alter table public.students enable row level security;

-- RLS policies (drop + create for idempotency)
drop policy if exists "Super admins can read all students" on public.students;
create policy "Super admins can read all students"
  on public.students for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own students" on public.students;
create policy "School admins can read own students"
  on public.students for select
  using (school_id = public.get_user_school_id());

drop policy if exists "Super admins can insert students" on public.students;
create policy "Super admins can insert students"
  on public.students for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own students" on public.students;
create policy "School admins can insert own students"
  on public.students for insert
  with check (school_id = public.get_user_school_id());

drop policy if exists "Super admins can update students" on public.students;
create policy "Super admins can update students"
  on public.students for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own students" on public.students;
create policy "School admins can update own students"
  on public.students for update
  using (school_id = public.get_user_school_id());

drop policy if exists "Super admins can delete students" on public.students;
create policy "Super admins can delete students"
  on public.students for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own students" on public.students;
create policy "School admins can delete own students"
  on public.students for delete
  using (school_id = public.get_user_school_id());
