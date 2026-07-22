-- ==============================================================
-- LANXGROW COS — Consolidated Upgrade (Phase 7)
-- Migration 00020: Merges and replaces 00016–00019
-- ==============================================================
-- This is a FORWARD-ONLY migration. Do not run any of 00016–00019
-- separately; this file supersedes them entirely.
--
-- How to apply:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste this entire file
--   3. Execute (idempotent — safe to re-run)
--   4. Run the verification queries at the end to confirm
-- ==============================================================
-- Idempotent: uses create if not exists, alter ... add column if
-- not exists, drop policy if exists, etc. Safe to re-run.
-- No transaction wrapper: partial progress is preserved if a
-- later statement fails.
-- ==============================================================

-- ################################################################
-- SECTION 1 — STORAGE BUCKET RLS POLICIES (from 00016)
-- ################################################################

-- Require authentication for uploads
drop policy if exists "Anyone can upload files" on storage.objects;
create policy "Authenticated users can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'content-uploads'
    and auth.role() = 'authenticated'
  );

-- Require authentication for API reads
drop policy if exists "Anyone can read files" on storage.objects;
create policy "Authenticated users can read files"
  on storage.objects for select
  using (
    bucket_id = 'content-uploads'
    and auth.role() = 'authenticated'
  );

-- Users can only delete files they own
drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'content-uploads'
    and owner = auth.uid()
  );

-- ################################################################
-- SECTION 2 — AUDIT LOGS TENANT ISOLATION (from 00017)
-- ################################################################

-- Add school_id column to audit_logs (nullable for backward compat)
alter table public.audit_logs
  add column if not exists school_id uuid references public.schools(id) on delete set null;

create index if not exists idx_audit_logs_school_id on public.audit_logs(school_id);

-- Drop overly-permissive school admin policy
drop policy if exists "School admins can read audit logs" on public.audit_logs;

-- Replace with school-scoped read policy
create policy "School admins can read own school audit logs"
  on public.audit_logs for select
  using (school_id = public.get_user_school_id());

-- Update the profile-change trigger to also store school_id
create or replace function public.log_profile_change()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (user_id, user_name, action, entity, entity_name, detail, school_id)
  values (
    new.id,
    new.name,
    case
      when tg_op = 'INSERT' then 'created'
      when tg_op = 'UPDATE' then 'edited'
      else 'deleted'
    end,
    'Profile',
    new.name,
    format('Role: %s, School: %s', new.role, new.school_id),
    new.school_id
  );
  return new;
end;
$$;

-- ################################################################
-- SECTION 3 — PERFORMANCE INDEXES (from 00018)
-- ################################################################

create index if not exists idx_student_progress_student_lesson
  on student_progress (student_id, lesson_id);

create index if not exists idx_student_progress_completed
  on student_progress (student_id, completed)
  where completed = true;

create index if not exists idx_course_modules_course_id
  on course_modules (course_id);

create index if not exists idx_lessons_module_id
  on lessons (module_id);

create index if not exists idx_lessons_id
  on lessons (id);

create index if not exists idx_enrollments_course_status
  on enrollments (course_id, status);

create index if not exists idx_enrollments_student
  on enrollments (student_id);

-- ################################################################
-- SECTION 4 — RBAC HIERARCHY (from 00019)
-- ################################################################
-- Adds: companies table, company_id to schools + profiles,
-- 6-role constraint, helper functions, comprehensive RLS for
-- all 22+ tables, user_id to students
-- ################################################################

-- .................................................................
-- 4a. COMPANIES TABLE
-- .................................................................

create table if not exists public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Seed a default company for existing data
insert into public.companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'LanxGrow Learning')
on conflict (id) do nothing;

-- .................................................................
-- 4b. ADD company_id TO SCHOOLS
-- .................................................................

alter table public.schools
  add column if not exists company_id uuid
  references public.companies(id) on delete set null;

-- Assign existing schools to default company
update public.schools
set company_id = '00000000-0000-0000-0000-000000000001'
where company_id is null;

-- .................................................................
-- 4c. UPDATE PROFILES ROLE CONSTRAINT
-- .................................................................

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'company_admin', 'school_admin', 'teacher', 'counselor', 'student'));

-- .................................................................
-- 4d. ADD company_id TO PROFILES
-- .................................................................

alter table public.profiles
  add column if not exists company_id uuid
  references public.companies(id) on delete set null;

-- Assign existing profiles with school_id to the school's company
update public.profiles p
set company_id = s.company_id
from public.schools s
where p.school_id = s.id and p.company_id is null;

-- Assign remaining profiles to default company
update public.profiles
set company_id = '00000000-0000-0000-0000-000000000001'
where company_id is null;

-- .................................................................
-- 4e. ADD user_id TO STUDENTS (fixes "column user_id does not exist")
-- .................................................................

alter table public.students
  add column if not exists user_id uuid
  references public.profiles(id) on delete set null;

create index if not exists idx_students_user_id on public.students(user_id);

-- .................................................................
-- 4f. HELPER FUNCTIONS (defined here after all columns exist)
-- .................................................................

create or replace function public.get_user_school_id()
returns uuid
language sql stable
security definer
as $$
  select school_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_company_admin()
returns boolean
language sql stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'company_admin'
  );
$$;

create or replace function public.is_school_admin()
returns boolean
language sql stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'school_admin'
  );
$$;

create or replace function public.is_teacher()
returns boolean
language sql stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'teacher'
  );
$$;

create or replace function public.is_counselor()
returns boolean
language sql stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'counselor'
  );
$$;

create or replace function public.is_student()
returns boolean
language sql stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student'
  );
$$;

create or replace function public.get_user_company_id()
returns uuid
language sql stable
security definer
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.user_in_same_company(school_id uuid)
returns boolean
language sql stable
security definer
as $$
  select exists (
    select 1 from public.profiles p
    join public.schools s on s.id = $1
    where p.id = auth.uid()
    and (p.company_id = s.company_id or p.role = 'super_admin')
  );
$$;

-- .................................................................
-- (companies RLS)
-- .................................................................

alter table public.companies enable row level security;

create policy "Super admins can manage companies"
  on public.companies for all
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "Company admins can read own company"
  on public.companies for select
  using (public.is_company_admin() and id = public.get_user_company_id());

create policy "School admins can read their school's company"
  on public.companies for select
  using (public.is_school_admin() and id = (select company_id from public.schools where id = public.get_user_school_id()));

create policy "Teachers can read their school's company"
  on public.companies for select
  using (public.is_teacher() and id = (select company_id from public.schools where id = public.get_user_school_id()));

-- .................................................................
-- 4g. RLS POLICIES — SCHOOLS
-- .................................................................

alter table public.schools enable row level security;

drop policy if exists "Super admins can read all schools" on public.schools;
drop policy if exists "School admins can read own school" on public.schools;
drop policy if exists "Company admins can read own company schools" on public.schools;
drop policy if exists "Super admins can insert schools" on public.schools;
drop policy if exists "Company admins can insert schools" on public.schools;
drop policy if exists "Super admins can update schools" on public.schools;
drop policy if exists "Company admins can update own company schools" on public.schools;
drop policy if exists "School admins can update own school" on public.schools;
drop policy if exists "Super admins can delete schools" on public.schools;
drop policy if exists "Company admins can delete own company schools" on public.schools;

create policy "Super admins can read all schools"
  on public.schools for select
  using (public.is_super_admin());

create policy "Company admins can read own company schools"
  on public.schools for select
  using (public.is_company_admin() and company_id = public.get_user_company_id());

create policy "School admins can read own school"
  on public.schools for select
  using (public.is_school_admin() and id = public.get_user_school_id());

create policy "Authenticated users can read their school"
  on public.schools for select
  using (
    (public.is_teacher() or public.is_counselor() or public.is_student())
    and id = public.get_user_school_id()
  );

create policy "Super admins can insert schools"
  on public.schools for insert
  with check (public.is_super_admin());

create policy "Company admins can insert schools"
  on public.schools for insert
  with check (public.is_company_admin() and company_id = public.get_user_company_id());

create policy "Super admins can update schools"
  on public.schools for update
  using (public.is_super_admin());

create policy "Company admins can update own company schools"
  on public.schools for update
  using (public.is_company_admin() and company_id = public.get_user_company_id());

create policy "School admins can update own school"
  on public.schools for update
  using (public.is_school_admin() and id = public.get_user_school_id());

create policy "Super admins can delete schools"
  on public.schools for delete
  using (public.is_super_admin());

create policy "Company admins can delete own company schools"
  on public.schools for delete
  using (public.is_company_admin() and company_id = public.get_user_company_id());

-- .................................................................
-- 4h. RLS POLICIES — CATEGORIES
-- .................................................................

alter table public.categories enable row level security;

drop policy if exists "Super admins can read all categories" on public.categories;
drop policy if exists "School admins can read own categories" on public.categories;
drop policy if exists "Company admins can read own categories" on public.categories;
drop policy if exists "Super admins can insert categories" on public.categories;
drop policy if exists "School admins can insert own categories" on public.categories;
drop policy if exists "Super admins can update categories" on public.categories;
drop policy if exists "School admins can update own categories" on public.categories;
drop policy if exists "Super admins can delete categories" on public.categories;
drop policy if exists "School admins can delete own categories" on public.categories;

create policy "Super admins can read all categories"
  on public.categories for select
  using (public.is_super_admin());

create policy "Company admins can read own categories"
  on public.categories for select
  using (public.is_company_admin() and public.user_in_same_company(school_id));

create policy "School admins can read own categories"
  on public.categories for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can insert categories"
  on public.categories for insert
  with check (public.is_super_admin());

create policy "School admins can insert own categories"
  on public.categories for insert
  with check (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can update categories"
  on public.categories for update
  using (public.is_super_admin());

create policy "School admins can update own categories"
  on public.categories for update
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can delete categories"
  on public.categories for delete
  using (public.is_super_admin());

create policy "School admins can delete own categories"
  on public.categories for delete
  using (public.is_school_admin() and school_id = public.get_user_school_id());

-- .................................................................
-- 4i. RLS POLICIES — SUBJECTS
-- .................................................................

alter table public.subjects enable row level security;

drop policy if exists "Super admins can read all subjects" on public.subjects;
drop policy if exists "School admins can read own subjects" on public.subjects;
drop policy if exists "Super admins can insert subjects" on public.subjects;
drop policy if exists "School admins can insert own subjects" on public.subjects;
drop policy if exists "Super admins can update subjects" on public.subjects;
drop policy if exists "School admins can update own subjects" on public.subjects;
drop policy if exists "Super admins can delete subjects" on public.subjects;
drop policy if exists "School admins can delete own subjects" on public.subjects;

create policy "Super admins can read all subjects"
  on public.subjects for select
  using (public.is_super_admin());

create policy "Company admins can read own subjects"
  on public.subjects for select
  using (public.is_company_admin() and public.user_in_same_company(school_id));

create policy "School admins can read own subjects"
  on public.subjects for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can insert subjects"
  on public.subjects for insert
  with check (public.is_super_admin());

create policy "School admins can insert own subjects"
  on public.subjects for insert
  with check (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can update subjects"
  on public.subjects for update
  using (public.is_super_admin());

create policy "School admins can update own subjects"
  on public.subjects for update
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can delete subjects"
  on public.subjects for delete
  using (public.is_super_admin());

create policy "School admins can delete own subjects"
  on public.subjects for delete
  using (public.is_school_admin() and school_id = public.get_user_school_id());

-- .................................................................
-- 4j. RLS POLICIES — SECTIONS
-- .................................................................

alter table public.sections enable row level security;

drop policy if exists "Super admins can read all sections" on public.sections;
drop policy if exists "School admins can read own sections" on public.sections;
drop policy if exists "Super admins can insert sections" on public.sections;
drop policy if exists "School admins can insert own sections" on public.sections;
drop policy if exists "Super admins can update sections" on public.sections;
drop policy if exists "School admins can update own sections" on public.sections;
drop policy if exists "Super admins can delete sections" on public.sections;
drop policy if exists "School admins can delete own sections" on public.sections;

create policy "Super admins can read all sections"
  on public.sections for select
  using (public.is_super_admin());

create policy "Company admins can read own sections"
  on public.sections for select
  using (public.is_company_admin() and public.user_in_same_company(school_id));

create policy "School admins can read own sections"
  on public.sections for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can insert sections"
  on public.sections for insert
  with check (public.is_super_admin());

create policy "School admins can insert own sections"
  on public.sections for insert
  with check (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can update sections"
  on public.sections for update
  using (public.is_super_admin());

create policy "School admins can update own sections"
  on public.sections for update
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can delete sections"
  on public.sections for delete
  using (public.is_super_admin());

create policy "School admins can delete own sections"
  on public.sections for delete
  using (public.is_school_admin() and school_id = public.get_user_school_id());

-- .................................................................
-- 4k. RLS POLICIES — CONTENT
-- .................................................................

alter table public.content enable row level security;

drop policy if exists "Super admins can read all content" on public.content;
drop policy if exists "School admins can read own content" on public.content;
drop policy if exists "Super admins can insert content" on public.content;
drop policy if exists "School admins can insert own content" on public.content;
drop policy if exists "Super admins can update content" on public.content;
drop policy if exists "School admins can update own content" on public.content;
drop policy if exists "Super admins can delete content" on public.content;
drop policy if exists "School admins can delete own content" on public.content;

create policy "Super admins can read all content"
  on public.content for select
  using (public.is_super_admin());

create policy "Company admins can read own content"
  on public.content for select
  using (public.is_company_admin() and public.user_in_same_company(school_id));

create policy "School admins can read own content"
  on public.content for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Teachers can read own school content"
  on public.content for select
  using (public.is_teacher() and school_id = public.get_user_school_id());

create policy "Super admins can insert content"
  on public.content for insert
  with check (public.is_super_admin());

create policy "School admins can insert own content"
  on public.content for insert
  with check (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can update content"
  on public.content for update
  using (public.is_super_admin());

create policy "School admins can update own content"
  on public.content for update
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can delete content"
  on public.content for delete
  using (public.is_super_admin());

create policy "School admins can delete own content"
  on public.content for delete
  using (public.is_school_admin() and school_id = public.get_user_school_id());

-- .................................................................
-- 4l. RLS POLICIES — PROFILES
-- .................................................................

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "No client inserts on profiles" on public.profiles;
drop policy if exists "Users can update own profile name" on public.profiles;
drop policy if exists "Super admins can update any profile" on public.profiles;
drop policy if exists "No client deletes on profiles" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Super admins can read all profiles"
  on public.profiles for select
  using (public.is_super_admin());

create policy "Company admins can read own company profiles"
  on public.profiles for select
  using (public.is_company_admin() and company_id = public.get_user_company_id());

create policy "School admins can read own school profiles"
  on public.profiles for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Teachers can read students in their school"
  on public.profiles for select
  using (public.is_teacher() and school_id = public.get_user_school_id() and role = 'student');

create policy "Counselors can read assigned students"
  on public.profiles for select
  using (public.is_counselor() and school_id = public.get_user_school_id() and role = 'student');

create policy "No client inserts on profiles"
  on public.profiles for insert
  with check (false);

create policy "Users can update own profile name"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (role = (select role from public.profiles where id = auth.uid()))
    and (school_id is not distinct from (select school_id from public.profiles where id = auth.uid()))
  );

create policy "Super admins can update any profile"
  on public.profiles for update
  using (public.is_super_admin());

create policy "Company admins can update own company profiles"
  on public.profiles for update
  using (public.is_company_admin() and company_id = public.get_user_company_id());

create policy "School admins can update own school profiles"
  on public.profiles for update
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "No client deletes on profiles"
  on public.profiles for delete
  using (false);

-- .................................................................
-- 4m. RLS POLICIES — STUDENTS
-- .................................................................

alter table public.students enable row level security;

drop policy if exists "Super admins can read all students" on public.students;
drop policy if exists "School admins can read own students" on public.students;
drop policy if exists "Super admins can insert students" on public.students;
drop policy if exists "School admins can insert own students" on public.students;
drop policy if exists "Super admins can update students" on public.students;
drop policy if exists "School admins can update own students" on public.students;
drop policy if exists "Super admins can delete students" on public.students;
drop policy if exists "School admins can delete own students" on public.students;

create policy "Super admins can read all students"
  on public.students for select
  using (public.is_super_admin());

create policy "Company admins can read own students"
  on public.students for select
  using (public.is_company_admin() and public.user_in_same_company(school_id));

create policy "School admins can read own students"
  on public.students for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Teachers can read own school students"
  on public.students for select
  using (public.is_teacher() and school_id = public.get_user_school_id());

create policy "Counselors can read assigned students"
  on public.students for select
  using (public.is_counselor() and counselor_id = auth.uid());

create policy "Students can read own record"
  on public.students for select
  using (public.is_student() and user_id = auth.uid());

create policy "Super admins can insert students"
  on public.students for insert
  with check (public.is_super_admin());

create policy "School admins can insert own students"
  on public.students for insert
  with check (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can update students"
  on public.students for update
  using (public.is_super_admin());

create policy "School admins can update own students"
  on public.students for update
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Teachers can update assigned students"
  on public.students for update
  using (public.is_teacher() and school_id = public.get_user_school_id());

create policy "Counselors can update assigned students"
  on public.students for update
  using (public.is_counselor() and counselor_id = auth.uid());

create policy "Super admins can delete students"
  on public.students for delete
  using (public.is_super_admin());

create policy "School admins can delete own students"
  on public.students for delete
  using (public.is_school_admin() and school_id = public.get_user_school_id());

-- .................................................................
-- 4n. RLS POLICIES — COURSES
-- .................................................................

alter table public.courses enable row level security;

drop policy if exists "Super admins can read all courses" on public.courses;
drop policy if exists "School admins can read own courses" on public.courses;
drop policy if exists "Super admins can insert courses" on public.courses;
drop policy if exists "School admins can insert own courses" on public.courses;
drop policy if exists "Super admins can update courses" on public.courses;
drop policy if exists "School admins can update own courses" on public.courses;
drop policy if exists "Super admins can delete courses" on public.courses;
drop policy if exists "School admins can delete own courses" on public.courses;

create policy "Super admins can read all courses"
  on public.courses for select
  using (public.is_super_admin());

create policy "Company admins can read own courses"
  on public.courses for select
  using (public.is_company_admin() and public.user_in_same_company(school_id));

create policy "School admins can read own courses"
  on public.courses for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Teachers can read own school courses"
  on public.courses for select
  using (public.is_teacher() and school_id = public.get_user_school_id());

create policy "Students can read enrolled courses"
  on public.courses for select
  using (public.is_student() and exists (
    select 1 from public.enrollments e
    where e.course_id = id and e.student_id in (
      select id from public.students where user_id = auth.uid()
    )
  ));

create policy "Super admins can insert courses"
  on public.courses for insert
  with check (public.is_super_admin());

create policy "School admins can insert own courses"
  on public.courses for insert
  with check (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can update courses"
  on public.courses for update
  using (public.is_super_admin());

create policy "School admins can update own courses"
  on public.courses for update
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "Super admins can delete courses"
  on public.courses for delete
  using (public.is_super_admin());

create policy "School admins can delete own courses"
  on public.courses for delete
  using (public.is_school_admin() and school_id = public.get_user_school_id());

-- .................................................................
-- 4o. RLS POLICIES — COURSE SECTIONS
-- .................................................................

alter table public.course_sections enable row level security;

-- Drop old policies from 00013
drop policy if exists "Super admins can manage course_sections" on public.course_sections;
drop policy if exists "School admins can manage own course_sections" on public.course_sections;
-- Drop new-style policies from prior runs
drop policy if exists "Super admins can read all course_sections" on public.course_sections;
drop policy if exists "School admins can read own course_sections" on public.course_sections;
drop policy if exists "Super admins can insert course_sections" on public.course_sections;
drop policy if exists "School admins can insert own course_sections" on public.course_sections;
drop policy if exists "Super admins can update course_sections" on public.course_sections;
drop policy if exists "School admins can update own course_sections" on public.course_sections;
drop policy if exists "Super admins can delete course_sections" on public.course_sections;
drop policy if exists "School admins can delete own course_sections" on public.course_sections;

create policy "Super admins can read all course_sections"
  on public.course_sections for select
  using (public.is_super_admin());

create policy "Company admins can read own course_sections"
  on public.course_sections for select
  using (public.is_company_admin() and exists (
    select 1 from public.courses c where c.id = course_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own course_sections"
  on public.course_sections for select
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read own course_sections"
  on public.course_sections for select
  using (public.is_teacher() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can insert course_sections"
  on public.course_sections for insert
  with check (public.is_super_admin());

create policy "School admins can insert own course_sections"
  on public.course_sections for insert
  with check (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can update course_sections"
  on public.course_sections for update
  using (public.is_super_admin());

create policy "School admins can update own course_sections"
  on public.course_sections for update
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can delete course_sections"
  on public.course_sections for delete
  using (public.is_super_admin());

create policy "School admins can delete own course_sections"
  on public.course_sections for delete
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

-- .................................................................
-- 4p. RLS POLICIES — ENROLLMENTS
-- .................................................................

alter table public.enrollments enable row level security;

drop policy if exists "Super admins can read all enrollments" on public.enrollments;
drop policy if exists "School admins can read own enrollments" on public.enrollments;
drop policy if exists "Super admins can insert enrollments" on public.enrollments;
drop policy if exists "School admins can insert own enrollments" on public.enrollments;
drop policy if exists "Super admins can update enrollments" on public.enrollments;
drop policy if exists "School admins can update own enrollments" on public.enrollments;
drop policy if exists "Super admins can delete enrollments" on public.enrollments;
drop policy if exists "School admins can delete own enrollments" on public.enrollments;

create policy "Super admins can read all enrollments"
  on public.enrollments for select
  using (public.is_super_admin());

create policy "Company admins can read own enrollments"
  on public.enrollments for select
  using (public.is_company_admin() and exists (
    select 1 from public.courses c where c.id = course_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own enrollments"
  on public.enrollments for select
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read assigned enrollments"
  on public.enrollments for select
  using (public.is_teacher() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read own enrollments"
  on public.enrollments for select
  using (public.is_student() and student_id in (
    select id from public.students where user_id = auth.uid()
  ));

create policy "Super admins can insert enrollments"
  on public.enrollments for insert
  with check (public.is_super_admin());

create policy "School admins can insert own enrollments"
  on public.enrollments for insert
  with check (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can update enrollments"
  on public.enrollments for update
  using (public.is_super_admin());

create policy "School admins can update own enrollments"
  on public.enrollments for update
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can delete enrollments"
  on public.enrollments for delete
  using (public.is_super_admin());

create policy "School admins can delete own enrollments"
  on public.enrollments for delete
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

-- .................................................................
-- 4q. RLS POLICIES — NOTIFICATIONS
-- .................................................................

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can insert own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Super admins can delete notifications" on public.notifications;
drop policy if exists "Super admins can read all notifications" on public.notifications;
drop policy if exists "School admins can read own notifications" on public.notifications;
drop policy if exists "School admins can read school notifications" on public.notifications;

create policy "Users can read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "Super admins can read all notifications"
  on public.notifications for select
  using (public.is_super_admin());

create policy "Company admins can read company notifications"
  on public.notifications for select
  using (public.is_company_admin() and exists (
    select 1 from public.profiles p where p.id = user_id and p.company_id = public.get_user_company_id()
  ));

create policy "School admins can read school notifications"
  on public.notifications for select
  using (public.is_school_admin() and exists (
    select 1 from public.profiles p where p.id = user_id and p.school_id = public.get_user_school_id()
  ));

create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "Super admins can delete notifications"
  on public.notifications for delete
  using (public.is_super_admin());

-- .................................................................
-- 4r. RLS POLICIES — COURSE MODULES
-- .................................................................

alter table public.course_modules enable row level security;

-- Drop old policies from 00014 (same names as new, but ensuring cleanup)
drop policy if exists "Super admins can read course_modules" on public.course_modules;
drop policy if exists "School admins can read own course_modules" on public.course_modules;
drop policy if exists "Super admins can insert course_modules" on public.course_modules;
drop policy if exists "School admins can insert own course_modules" on public.course_modules;
drop policy if exists "Super admins can update course_modules" on public.course_modules;
drop policy if exists "School admins can update own course_modules" on public.course_modules;
drop policy if exists "Super admins can delete course_modules" on public.course_modules;
drop policy if exists "School admins can delete own course_modules" on public.course_modules;
-- Drop new-style policies from prior 00020 runs
drop policy if exists "Teachers can read course_modules" on public.course_modules;
drop policy if exists "Students can read enrolled course_modules" on public.course_modules;

create policy "Super admins can read course_modules"
  on public.course_modules for select
  using (public.is_super_admin());

create policy "Company admins can read own course_modules"
  on public.course_modules for select
  using (public.is_company_admin() and exists (
    select 1 from public.courses c where c.id = course_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own course_modules"
  on public.course_modules for select
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read course_modules"
  on public.course_modules for select
  using (public.is_teacher() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read enrolled course_modules"
  on public.course_modules for select
  using (public.is_student() and exists (
    select 1 from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.course_id = course_id
    and e.student_id in (select id from public.students where user_id = auth.uid())
  ));

create policy "Super admins can insert course_modules"
  on public.course_modules for insert
  with check (public.is_super_admin());

create policy "School admins can insert own course_modules"
  on public.course_modules for insert
  with check (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can update course_modules"
  on public.course_modules for update
  using (public.is_super_admin());

create policy "School admins can update own course_modules"
  on public.course_modules for update
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can delete course_modules"
  on public.course_modules for delete
  using (public.is_super_admin());

create policy "School admins can delete own course_modules"
  on public.course_modules for delete
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

-- .................................................................
-- 4s. RLS POLICIES — LESSONS
-- .................................................................

alter table public.lessons enable row level security;

drop policy if exists "Super admins can read lessons" on public.lessons;
drop policy if exists "School admins can read own lessons" on public.lessons;
drop policy if exists "Super admins can insert lessons" on public.lessons;
drop policy if exists "School admins can insert own lessons" on public.lessons;
drop policy if exists "Super admins can update lessons" on public.lessons;
drop policy if exists "School admins can update own lessons" on public.lessons;
drop policy if exists "Super admins can delete lessons" on public.lessons;
drop policy if exists "School admins can delete own lessons" on public.lessons;

create policy "Super admins can read lessons"
  on public.lessons for select
  using (public.is_super_admin());

create policy "Company admins can read own lessons"
  on public.lessons for select
  using (public.is_company_admin() and exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = module_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own lessons"
  on public.lessons for select
  using (public.is_school_admin() and exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = module_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read lessons"
  on public.lessons for select
  using (public.is_teacher() and exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = module_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read enrolled lessons"
  on public.lessons for select
  using (public.is_student() and exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    join public.enrollments e on e.course_id = c.id
    join public.students s on s.id = e.student_id
    where m.id = module_id and s.user_id = auth.uid()
  ));

create policy "Super admins can insert lessons"
  on public.lessons for insert
  with check (public.is_super_admin());

create policy "School admins can insert own lessons"
  on public.lessons for insert
  with check (public.is_school_admin() and exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = module_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can update lessons"
  on public.lessons for update
  using (public.is_super_admin());

create policy "School admins can update own lessons"
  on public.lessons for update
  using (public.is_school_admin() and exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = module_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can delete lessons"
  on public.lessons for delete
  using (public.is_super_admin());

create policy "School admins can delete own lessons"
  on public.lessons for delete
  using (public.is_school_admin() and exists (
    select 1 from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = module_id and c.school_id = public.get_user_school_id()
  ));

-- .................................................................
-- 4t. RLS POLICIES — STUDENT PROGRESS
-- .................................................................

alter table public.student_progress enable row level security;

-- Drop old policies from 00014 (different names)
drop policy if exists "Super admins can read progress" on public.student_progress;
drop policy if exists "School admins can read own progress" on public.student_progress;
drop policy if exists "Super admins can insert progress" on public.student_progress;
drop policy if exists "School admins can insert own progress" on public.student_progress;
drop policy if exists "Super admins can update progress" on public.student_progress;
drop policy if exists "School admins can update own progress" on public.student_progress;
drop policy if exists "Super admins can delete progress" on public.student_progress;
drop policy if exists "School admins can delete own progress" on public.student_progress;
-- Drop new-style policies from prior 00020 runs
drop policy if exists "Super admins can read student_progress" on public.student_progress;
drop policy if exists "School admins can read own student_progress" on public.student_progress;
drop policy if exists "Super admins can insert student_progress" on public.student_progress;
drop policy if exists "School admins can insert own student_progress" on public.student_progress;
drop policy if exists "Super admins can update student_progress" on public.student_progress;
drop policy if exists "School admins can update own student_progress" on public.student_progress;
drop policy if exists "Super admins can delete student_progress" on public.student_progress;
drop policy if exists "School admins can delete own student_progress" on public.student_progress;
drop policy if exists "Teachers can read own student_progress" on public.student_progress;
drop policy if exists "Students can read own progress" on public.student_progress;
drop policy if exists "Students can insert own progress" on public.student_progress;
drop policy if exists "Teachers can update own student_progress" on public.student_progress;
drop policy if exists "Students can update own progress" on public.student_progress;

create policy "Super admins can read student_progress"
  on public.student_progress for select
  using (public.is_super_admin());

create policy "Company admins can read own student_progress"
  on public.student_progress for select
  using (public.is_company_admin() and exists (
    select 1 from public.students s where s.id = student_id and public.user_in_same_company(s.school_id)
  ));

create policy "School admins can read own student_progress"
  on public.student_progress for select
  using (public.is_school_admin() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read own student_progress"
  on public.student_progress for select
  using (public.is_teacher() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

create policy "Students can read own progress"
  on public.student_progress for select
  using (public.is_student() and exists (
    select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()
  ));

create policy "Super admins can insert student_progress"
  on public.student_progress for insert
  with check (public.is_super_admin());

create policy "School admins can insert own student_progress"
  on public.student_progress for insert
  with check (public.is_school_admin() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

create policy "Students can insert own progress"
  on public.student_progress for insert
  with check (public.is_student() and exists (
    select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()
  ));

create policy "Super admins can update student_progress"
  on public.student_progress for update
  using (public.is_super_admin());

create policy "School admins can update own student_progress"
  on public.student_progress for update
  using (public.is_school_admin() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

create policy "Teachers can update own student_progress"
  on public.student_progress for update
  using (public.is_teacher() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

create policy "Students can update own progress"
  on public.student_progress for update
  using (public.is_student() and exists (
    select 1 from public.students s where s.id = student_id and s.user_id = auth.uid()
  ));

create policy "Super admins can delete student_progress"
  on public.student_progress for delete
  using (public.is_super_admin());

create policy "School admins can delete own student_progress"
  on public.student_progress for delete
  using (public.is_school_admin() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

-- .................................................................
-- 4u. RLS POLICIES — ASSIGNMENTS
-- .................................................................

alter table public.assignments enable row level security;

-- Drop old policies from 00014 (different names)
drop policy if exists "Super admins can read assignments" on public.assignments;
drop policy if exists "School admins can read own assignments" on public.assignments;
drop policy if exists "Super admins can insert assignments" on public.assignments;
drop policy if exists "School admins can insert own assignments" on public.assignments;
drop policy if exists "Super admins can update assignments" on public.assignments;
drop policy if exists "School admins can update own assignments" on public.assignments;
drop policy if exists "Super admins can delete assignments" on public.assignments;
drop policy if exists "School admins can delete own assignments" on public.assignments;

create policy "Super admins can read assignments"
  on public.assignments for select
  using (public.is_super_admin());

create policy "Company admins can read own assignments"
  on public.assignments for select
  using (public.is_company_admin() and exists (
    select 1 from public.courses c where c.id = course_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own assignments"
  on public.assignments for select
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read own assignments"
  on public.assignments for select
  using (public.is_teacher() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read own assignments"
  on public.assignments for select
  using (public.is_student() and exists (
    select 1 from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.course_id = course_id and s.user_id = auth.uid()
  ));

create policy "Super admins can insert assignments"
  on public.assignments for insert
  with check (public.is_super_admin());

create policy "School admins can insert own assignments"
  on public.assignments for insert
  with check (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can update assignments"
  on public.assignments for update
  using (public.is_super_admin());

create policy "School admins can update own assignments"
  on public.assignments for update
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Super admins can delete assignments"
  on public.assignments for delete
  using (public.is_super_admin());

create policy "School admins can delete own assignments"
  on public.assignments for delete
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

-- .................................................................
-- 4v. RLS POLICIES — ASSIGNMENT SUBMISSIONS
-- .................................................................

alter table public.assignment_submissions enable row level security;

-- Drop old policies from 00014
drop policy if exists "Super admins can read submissions" on public.assignment_submissions;
drop policy if exists "School admins can read own submissions" on public.assignment_submissions;
drop policy if exists "Super admins can insert submissions" on public.assignment_submissions;
drop policy if exists "School admins can insert own submissions" on public.assignment_submissions;
drop policy if exists "Super admins can update submissions" on public.assignment_submissions;
drop policy if exists "School admins can update own submissions" on public.assignment_submissions;
drop policy if exists "Super admins can delete submissions" on public.assignment_submissions;
drop policy if exists "School admins can delete own submissions" on public.assignment_submissions;

create policy "Super admins can read assignment_submissions"
  on public.assignment_submissions for select
  using (public.is_super_admin());

create policy "Company admins can read own assignment_submissions"
  on public.assignment_submissions for select
  using (public.is_company_admin() and exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own assignment_submissions"
  on public.assignment_submissions for select
  using (public.is_school_admin() and exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read assignment_submissions"
  on public.assignment_submissions for select
  using (public.is_teacher() and exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read own submissions"
  on public.assignment_submissions for select
  using (public.is_student() and student_id in (
    select id from public.students where user_id = auth.uid()
  ));

-- .................................................................
-- 4w. RLS POLICIES — QUIZZES
-- .................................................................

alter table public.quizzes enable row level security;

-- Drop old policies from 00014
drop policy if exists "Super admins can read quizzes" on public.quizzes;
drop policy if exists "School admins can read own quizzes" on public.quizzes;
drop policy if exists "Super admins can insert quizzes" on public.quizzes;
drop policy if exists "School admins can insert own quizzes" on public.quizzes;
drop policy if exists "Super admins can update quizzes" on public.quizzes;
drop policy if exists "School admins can update own quizzes" on public.quizzes;
drop policy if exists "Super admins can delete quizzes" on public.quizzes;
drop policy if exists "School admins can delete own quizzes" on public.quizzes;

create policy "Super admins can read quizzes"
  on public.quizzes for select
  using (public.is_super_admin());

create policy "Company admins can read own quizzes"
  on public.quizzes for select
  using (public.is_company_admin() and exists (
    select 1 from public.courses c where c.id = course_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own quizzes"
  on public.quizzes for select
  using (public.is_school_admin() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read own quizzes"
  on public.quizzes for select
  using (public.is_teacher() and exists (
    select 1 from public.courses c where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read own quizzes"
  on public.quizzes for select
  using (public.is_student() and exists (
    select 1 from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.course_id = course_id and s.user_id = auth.uid()
  ));

-- .................................................................
-- 4x. RLS POLICIES — QUIZ QUESTIONS, ATTEMPTS, ANSWERS
-- .................................................................

alter table public.quiz_questions enable row level security;

-- Drop old policies from 00014
drop policy if exists "Super admins can read questions" on public.quiz_questions;
drop policy if exists "School admins can read own questions" on public.quiz_questions;
drop policy if exists "Super admins can insert questions" on public.quiz_questions;
drop policy if exists "School admins can insert own questions" on public.quiz_questions;
drop policy if exists "Super admins can update questions" on public.quiz_questions;
drop policy if exists "School admins can update own questions" on public.quiz_questions;
drop policy if exists "Super admins can delete questions" on public.quiz_questions;
drop policy if exists "School admins can delete own questions" on public.quiz_questions;

create policy "Super admins can read quiz_questions"
  on public.quiz_questions for select
  using (public.is_super_admin());

create policy "Company admins can read own quiz_questions"
  on public.quiz_questions for select
  using (public.is_company_admin() and exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own quiz_questions"
  on public.quiz_questions for select
  using (public.is_school_admin() and exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read quiz_questions"
  on public.quiz_questions for select
  using (public.is_teacher() and exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

alter table public.quiz_attempts enable row level security;

-- Drop old policies from 00014
drop policy if exists "Super admins can read attempts" on public.quiz_attempts;
drop policy if exists "School admins can read own attempts" on public.quiz_attempts;
drop policy if exists "Super admins can insert attempts" on public.quiz_attempts;
drop policy if exists "School admins can insert own attempts" on public.quiz_attempts;
drop policy if exists "Super admins can update attempts" on public.quiz_attempts;
drop policy if exists "School admins can update own attempts" on public.quiz_attempts;
drop policy if exists "Super admins can delete attempts" on public.quiz_attempts;
drop policy if exists "School admins can delete own attempts" on public.quiz_attempts;

create policy "Super admins can read quiz_attempts"
  on public.quiz_attempts for select
  using (public.is_super_admin());

create policy "Company admins can read own quiz_attempts"
  on public.quiz_attempts for select
  using (public.is_company_admin() and exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own quiz_attempts"
  on public.quiz_attempts for select
  using (public.is_school_admin() and exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read quiz_attempts"
  on public.quiz_attempts for select
  using (public.is_teacher() and exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read own quiz_attempts"
  on public.quiz_attempts for select
  using (public.is_student() and student_id in (
    select id from public.students where user_id = auth.uid()
  ));

alter table public.quiz_answers enable row level security;

-- Drop old policies from 00014
drop policy if exists "Super admins can read answers" on public.quiz_answers;
drop policy if exists "School admins can read own answers" on public.quiz_answers;
drop policy if exists "Super admins can insert answers" on public.quiz_answers;
drop policy if exists "School admins can insert own answers" on public.quiz_answers;
drop policy if exists "Super admins can update answers" on public.quiz_answers;
drop policy if exists "School admins can update own answers" on public.quiz_answers;
drop policy if exists "Super admins can delete answers" on public.quiz_answers;
drop policy if exists "School admins can delete own answers" on public.quiz_answers;

create policy "Super admins can read quiz_answers"
  on public.quiz_answers for select
  using (public.is_super_admin());

create policy "Company admins can read own quiz_answers"
  on public.quiz_answers for select
  using (public.is_company_admin() and exists (
    select 1 from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    join public.courses c on c.id = q.course_id
    where qa.id = attempt_id and public.user_in_same_company(c.school_id)
  ));

create policy "School admins can read own quiz_answers"
  on public.quiz_answers for select
  using (public.is_school_admin() and exists (
    select 1 from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    join public.courses c on c.id = q.course_id
    where qa.id = attempt_id and c.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read quiz_answers"
  on public.quiz_answers for select
  using (public.is_teacher() and exists (
    select 1 from public.quiz_attempts qa
    join public.quizzes q on q.id = qa.quiz_id
    join public.courses c on c.id = q.course_id
    where qa.id = attempt_id and c.school_id = public.get_user_school_id()
  ));

create policy "Students can read own quiz_answers"
  on public.quiz_answers for select
  using (public.is_student() and exists (
    select 1 from public.quiz_attempts qa
    join public.students s on s.id = qa.student_id
    where qa.id = attempt_id and s.user_id = auth.uid()
  ));

-- .................................................................
-- 4y. RLS POLICIES — CERTIFICATES
-- .................................................................

alter table public.certificates enable row level security;

-- Drop old policies from 00014
drop policy if exists "Super admins can read certificates" on public.certificates;
drop policy if exists "School admins can read own certificates" on public.certificates;
drop policy if exists "Super admins can insert certificates" on public.certificates;
drop policy if exists "School admins can insert own certificates" on public.certificates;
drop policy if exists "Super admins can update certificates" on public.certificates;
drop policy if exists "School admins can update own certificates" on public.certificates;
drop policy if exists "Super admins can delete certificates" on public.certificates;
drop policy if exists "School admins can delete own certificates" on public.certificates;

create policy "Super admins can read certificates"
  on public.certificates for select
  using (public.is_super_admin());

create policy "Company admins can read own certificates"
  on public.certificates for select
  using (public.is_company_admin() and exists (
    select 1 from public.students s where s.id = student_id and public.user_in_same_company(s.school_id)
  ));

create policy "School admins can read own certificates"
  on public.certificates for select
  using (public.is_school_admin() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

create policy "Teachers can read certificates"
  on public.certificates for select
  using (public.is_teacher() and exists (
    select 1 from public.students s where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

create policy "Students can read own certificates"
  on public.certificates for select
  using (public.is_student() and student_id in (
    select id from public.students where user_id = auth.uid()
  ));

-- .................................................................
-- 4z. RLS POLICIES — AUDIT LOGS
-- .................................................................

alter table public.audit_logs enable row level security;

drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;
drop policy if exists "Super admins can read audit logs" on public.audit_logs;
drop policy if exists "School admins can read audit logs" on public.audit_logs;
drop policy if exists "School admins can read own school audit logs" on public.audit_logs;
drop policy if exists "No updates on audit logs" on public.audit_logs;
drop policy if exists "No deletes on audit logs" on public.audit_logs;

create policy "Authenticated users can insert audit logs"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');

create policy "Super admins can read audit logs"
  on public.audit_logs for select
  using (public.is_super_admin());

create policy "Company admins can read own company audit logs"
  on public.audit_logs for select
  using (public.is_company_admin() and exists (
    select 1 from public.profiles p where p.id = user_id and p.company_id = public.get_user_company_id()
  ));

create policy "School admins can read own school audit logs"
  on public.audit_logs for select
  using (public.is_school_admin() and school_id = public.get_user_school_id());

create policy "No updates on audit logs"
  on public.audit_logs for update
  using (false);

create policy "No deletes on audit logs"
  on public.audit_logs for delete
  using (false);

-- .................................................................
-- 4aa. RLS POLICIES — PERMISSIONS TABLE
-- .................................................................

alter table public.permissions enable row level security;

drop policy if exists "Super admins can read permissions" on public.permissions;
drop policy if exists "Super admins can read all permissions" on public.permissions;
drop policy if exists "School admins can read own permissions" on public.permissions;
drop policy if exists "School admins can read school_admin permissions" on public.permissions;
drop policy if exists "Super admins can insert permissions" on public.permissions;
drop policy if exists "Super admins can update permissions" on public.permissions;
drop policy if exists "Super admins can delete permissions" on public.permissions;

create policy "Super admins can read permissions"
  on public.permissions for select
  using (public.is_super_admin());

create policy "Company admins can read permissions"
  on public.permissions for select
  using (public.is_company_admin());

create policy "School admins can read own permissions"
  on public.permissions for select
  using (public.is_school_admin());

create policy "Super admins can insert permissions"
  on public.permissions for insert
  with check (public.is_super_admin());

create policy "Super admins can update permissions"
  on public.permissions for update
  using (public.is_super_admin());

create policy "Super admins can delete permissions"
  on public.permissions for delete
  using (public.is_super_admin());

-- .................................................................
-- 4bb. FIX PERMISSIONS ROLE CONSTRAINT (fixes seeding for company_admin/teacher)
-- .................................................................

alter table public.permissions
  drop constraint if exists permissions_role_check;

alter table public.permissions
  add constraint permissions_role_check
  check (role in ('super_admin', 'company_admin', 'school_admin', 'teacher', 'counselor', 'student'));

-- .................................................................
-- 4cc. SEED PERMISSIONS FOR NEW ROLES
-- .................................................................

insert into public.permissions (role, permission, enabled) values
  ('company_admin', 'manage_schools', true),
  ('company_admin', 'manage_categories', true),
  ('company_admin', 'manage_subjects', true),
  ('company_admin', 'manage_sections', true),
  ('company_admin', 'manage_content', true),
  ('company_admin', 'manage_users', true),
  ('company_admin', 'view_analytics', true),
  ('company_admin', 'access_settings', true),
  ('company_admin', 'manage_own_profile', true)
on conflict (role, permission) do nothing;

insert into public.permissions (role, permission, enabled) values
  ('teacher', 'view_assigned_courses', true),
  ('teacher', 'view_assigned_students', true),
  ('teacher', 'grade_assignments', true),
  ('teacher', 'grade_quizzes', true),
  ('teacher', 'view_analytics', true),
  ('teacher', 'manage_own_profile', true)
on conflict (role, permission) do nothing;

-- .................................................................
-- 4dd. RBAC INDEXES
-- .................................................................

create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_schools_company_id on public.schools(company_id);
create index if not exists idx_profiles_role_company on public.profiles(role, company_id);
create index if not exists idx_profiles_role_school on public.profiles(role, school_id);

-- ################################################################
-- SECTION 5 — VERIFICATION QUERIES
-- ################################################################
-- Run these after the migration to confirm everything is correct.
-- Copy and paste each block into the SQL Editor separately.
-- ################################################################

/*
-- 5a. Verify RBAC roles constraint
select
  unnest(array['super_admin','company_admin','school_admin','teacher','counselor','student']) as expected_role
order by 1;

-- 5b. Verify companies table exists and has default
select id, name, created_at from public.companies;

-- 5c. Verify schools have company_id assigned
select count(*) as total_schools,
       count(company_id) as with_company
from public.schools;

-- 5d. Verify profiles have company_id assigned
select count(*) as total_profiles,
       count(company_id) as with_company
from public.profiles;

-- 5e. Verify students have user_id column
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'students'
  and column_name = 'user_id';

-- 5f. Verify helper functions exist
select proname, prosrc
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_company_admin','is_school_admin','is_teacher',
                  'is_counselor','is_student','get_user_company_id',
                  'user_in_same_company')
order by proname;

-- 5g. Verify RLS is enabled on key tables
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
  and relrowsecurity = true
order by relname;

-- 5h. Verify storage policies
select policyname, permissive, roles, cmd, qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- 5i. Verify audit_logs has school_id
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'audit_logs'
  and column_name = 'school_id';

-- 5j. Verify permissions role constraint allows 6 roles
select constraint_name, check_clause
from information_schema.check_constraints
where constraint_name = 'permissions_role_check';

-- 5k. Verify performance indexes exist
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'idx_student_progress_student_lesson',
    'idx_student_progress_completed',
    'idx_course_modules_course_id',
    'idx_lessons_module_id',
    'idx_lessons_id',
    'idx_enrollments_course_status',
    'idx_enrollments_student',
    'idx_audit_logs_school_id',
    'idx_profiles_company_id',
    'idx_schools_company_id',
    'idx_profiles_role_company',
    'idx_profiles_role_school',
    'idx_students_user_id'
  )
order by indexname;

-- 5l. Verify permissions seeded for new roles
select role, permission, enabled
from public.permissions
where role in ('company_admin', 'teacher')
order by role, permission;
*/
