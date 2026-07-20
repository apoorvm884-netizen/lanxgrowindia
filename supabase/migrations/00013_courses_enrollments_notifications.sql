-- Create courses, course_sections, enrollments, and notifications tables
-- with Row Level Security policies
-- Run this AFTER 00012_students_extend.sql

-- ==============================================================
-- 1. COURSES
-- ==============================================================
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  school_id   uuid not null references public.schools(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_courses_school_id on public.courses(school_id);

alter table public.courses enable row level security;

create policy "Super admins can read all courses"
  on public.courses for select
  using (public.is_super_admin());

create policy "School admins can read own courses"
  on public.courses for select
  using (school_id = public.get_user_school_id());

create policy "Super admins can insert courses"
  on public.courses for insert
  with check (public.is_super_admin());

create policy "School admins can insert own courses"
  on public.courses for insert
  with check (school_id = public.get_user_school_id());

create policy "Super admins can update courses"
  on public.courses for update
  using (public.is_super_admin());

create policy "School admins can update own courses"
  on public.courses for update
  using (school_id = public.get_user_school_id());

create policy "Super admins can delete courses"
  on public.courses for delete
  using (public.is_super_admin());

create policy "School admins can delete own courses"
  on public.courses for delete
  using (school_id = public.get_user_school_id());

-- ==============================================================
-- 2. COURSE SECTIONS (M2M)
-- ==============================================================
create table if not exists public.course_sections (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  section_id  uuid not null references public.sections(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(course_id, section_id)
);

create index if not exists idx_course_sections_course_id on public.course_sections(course_id);
create index if not exists idx_course_sections_section_id on public.course_sections(section_id);

alter table public.course_sections enable row level security;

create policy "Super admins can manage course_sections"
  on public.course_sections for all
  using (public.is_super_admin());

create policy "School admins can manage own course_sections"
  on public.course_sections for all
  using (exists (
    select 1 from public.courses c
    where c.id = course_sections.course_id
    and c.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 3. ENROLLMENTS
-- ==============================================================
create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  status      text not null default 'active'
              check (status in ('active', 'completed', 'dropped')),
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(student_id, course_id)
);

create index if not exists idx_enrollments_student_id on public.enrollments(student_id);
create index if not exists idx_enrollments_course_id on public.enrollments(course_id);

alter table public.enrollments enable row level security;

create policy "Super admins can read all enrollments"
  on public.enrollments for select
  using (public.is_super_admin());

create policy "School admins can read own enrollments"
  on public.enrollments for select
  using (exists (
    select 1 from public.students s
    where s.id = enrollments.student_id
    and s.school_id = public.get_user_school_id()
  ));

create policy "Super admins can insert enrollments"
  on public.enrollments for insert
  with check (public.is_super_admin());

create policy "School admins can insert own enrollments"
  on public.enrollments for insert
  with check (exists (
    select 1 from public.students s
    where s.id = enrollments.student_id
    and s.school_id = public.get_user_school_id()
  ));

create policy "Super admins can update enrollments"
  on public.enrollments for update
  using (public.is_super_admin());

create policy "School admins can update own enrollments"
  on public.enrollments for update
  using (exists (
    select 1 from public.students s
    where s.id = enrollments.student_id
    and s.school_id = public.get_user_school_id()
  ));

create policy "Super admins can delete enrollments"
  on public.enrollments for delete
  using (public.is_super_admin());

create policy "School admins can delete own enrollments"
  on public.enrollments for delete
  using (exists (
    select 1 from public.students s
    where s.id = enrollments.student_id
    and s.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 4. NOTIFICATIONS
-- ==============================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "Super admins can delete notifications"
  on public.notifications for delete
  using (public.is_super_admin());
