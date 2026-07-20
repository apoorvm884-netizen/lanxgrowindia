-- ==============================================================
-- LANXGROW COS — School Portal Tables
-- Migration 00006: New tables for school portal features
-- ==============================================================

-- 1. Students
create table public.students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  school_id   uuid not null references public.schools(id) on delete cascade,
  counselor_id uuid references public.profiles(id) on delete set null,
  status      text not null default 'active'
              check (status in ('active', 'inactive', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_students_school_id on public.students(school_id);
create index idx_students_counselor_id on public.students(counselor_id);

-- 2. Courses
create table public.courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  school_id   uuid not null references public.schools(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_courses_school_id on public.courses(school_id);

-- 3. Course Sections (M2M linking courses to sections)
create table public.course_sections (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  section_id  uuid not null references public.sections(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(course_id, section_id)
);

create index idx_course_sections_course_id on public.course_sections(course_id);
create index idx_course_sections_section_id on public.course_sections(section_id);

-- 4. Enrollments (student-course assignments)
create table public.enrollments (
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

create index idx_enrollments_student_id on public.enrollments(student_id);
create index idx_enrollments_course_id on public.enrollments(course_id);

-- 5. Notifications
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read on public.notifications(user_id, is_read);
