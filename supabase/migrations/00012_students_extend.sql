-- Extend the students table with additional fields used by the UI
-- and add Row Level Security
-- NOTE: This creates the students table if it does not exist (from 00006)

-- Create students table if it does not already exist
create table if not exists public.students (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  school_id    uuid not null references public.schools(id) on delete cascade,
  counselor_id uuid references public.profiles(id) on delete set null,
  status       text not null default 'active'
                check (status in ('active', 'inactive', 'suspended')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_students_school_id on public.students(school_id);
create index if not exists idx_students_counselor_id on public.students(counselor_id);

-- Add extended columns (no-op if already exist)
alter table public.students
  add column if not exists class          text,
  add column if not exists section        text,
  add column if not exists roll_number    text,
  add column if not exists admission_no   text,
  add column if not exists dob            date,
  add column if not exists parent_name    text,
  add column if not exists parent_contact text,
  add column if not exists academic_year  text,
  add column if not exists attendance     integer not null default 0,
  add column if not exists progress       integer not null default 0,
  add column if not exists notes          text;

-- Enable RLS
alter table public.students enable row level security;

-- Super admins can read all students
create policy "Super admins can read all students"
  on public.students for select
  using (public.is_super_admin());

-- School admins can read own school's students
create policy "School admins can read own students"
  on public.students for select
  using (school_id = public.get_user_school_id());

-- Super admins can insert students
create policy "Super admins can insert students"
  on public.students for insert
  with check (public.is_super_admin());

-- School admins can insert students in their own school
create policy "School admins can insert own students"
  on public.students for insert
  with check (school_id = public.get_user_school_id());

-- Super admins can update any student
create policy "Super admins can update students"
  on public.students for update
  using (public.is_super_admin());

-- School admins can update own students
create policy "School admins can update own students"
  on public.students for update
  using (school_id = public.get_user_school_id());

-- Super admins can delete any student
create policy "Super admins can delete students"
  on public.students for delete
  using (public.is_super_admin());

-- School admins can delete own students
create policy "School admins can delete own students"
  on public.students for delete
  using (school_id = public.get_user_school_id());
