-- ==============================================================
-- LANXGROW COS — RBAC Hierarchy Implementation
-- Migration 00019: Add company model, company_admin + teacher roles,
-- comprehensive RLS policies for all 6 roles across all tables
-- ==============================================================
-- Idempotent: safe to re-run
-- No transaction: partial progress preserved if later migrations fail
-- ==============================================================

-- ==============================================================
-- 1. COMPANIES TABLE
-- ==============================================================
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

-- RLS for companies: super_admin full access; company_admin can read own; others read their school's
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

-- ==============================================================
-- 2. ADD company_id TO SCHOOLS
-- ==============================================================
alter table public.schools
  add column if not exists company_id uuid
  references public.companies(id) on delete set null;

-- Assign existing schools to default company
update public.schools
set company_id = '00000000-0000-0000-0000-000000000001'
where company_id is null;

-- ==============================================================
-- 3. UPDATE PROFILES ROLE CONSTRAINT
-- ==============================================================
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'company_admin', 'school_admin', 'teacher', 'counselor', 'student'));

-- ==============================================================
-- 4. ADD company_id TO PROFILES
-- ==============================================================
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

-- ==============================================================
-- 5. HELPER FUNCTIONS
-- ==============================================================

-- Check if user is company_admin
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

-- Check if user is school_admin
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

-- Check if user is teacher
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

-- Check if user is counselor
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

-- Check if user is student
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

-- Helper: get the authenticated user's company_id
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

-- Helper: check if user is in the same company as a given school_id
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

-- ==============================================================
-- 6. UPDATE RLS POLICIES — SCHOOLS
-- ==============================================================
alter table public.schools enable row level security;

drop policy if exists "Super admins can read all schools" on public.schools;
drop policy if exists "School admins can read own school" on public.schools;
drop policy if exists "Company admins can read own company schools" on public.schools;
drop policy if exists "Super admins can insert schools" on public.schools;
drop policy if exists "Super admins can update schools" on public.schools;
drop policy if exists "School admins can update own school" on public.schools;
drop policy if exists "Super admins can delete schools" on public.schools;

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

-- ==============================================================
-- 7. UPDATE RLS POLICIES — CATEGORIES
-- ==============================================================
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

-- ==============================================================
-- 8. UPDATE RLS POLICIES — SUBJECTS
-- ==============================================================
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

-- ==============================================================
-- 9. UPDATE RLS POLICIES — SECTIONS
-- ==============================================================
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

-- ==============================================================
-- 10. UPDATE RLS POLICIES — CONTENT
-- ==============================================================
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

-- ==============================================================
-- 11. UPDATE RLS POLICIES — PROFILES
-- ==============================================================
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "No client inserts on profiles" on public.profiles;
drop policy if exists "Users can update own profile name" on public.profiles;
drop policy if exists "Super admins can update any profile" on public.profiles;
drop policy if exists "No client deletes on profiles" on public.profiles;

-- Read: users can read own profile; super/company/school admins can read profiles in their domain
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

-- Insert: Only super/company/school admins can create profiles
create policy "No client inserts on profiles"
  on public.profiles for insert
  with check (false);

-- Update: users can update own name; admins can update within scope
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

-- Delete: only service-role functions can delete profiles
create policy "No client deletes on profiles"
  on public.profiles for delete
  using (false);

-- ==============================================================
-- 12. UPDATE RLS POLICIES — STUDENTS
-- ==============================================================
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

-- ==============================================================
-- 13. UPDATE RLS POLICIES — COURSES
-- ==============================================================
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

-- ==============================================================
-- 14. UPDATE RLS POLICIES — COURSE SECTIONS
-- ==============================================================
alter table public.course_sections enable row level security;

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

-- ==============================================================
-- 15. UPDATE RLS POLICIES — ENROLLMENTS
-- ==============================================================
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

-- ==============================================================
-- 16. UPDATE RLS POLICIES — NOTIFICATIONS
-- ==============================================================
alter table public.notifications enable row level security;

-- Existing policy "Users can read own notifications" on user_id = auth.uid() already works for all roles
-- Add explicit policies for role clarity
drop policy if exists "Super admins can read all notifications" on public.notifications;
drop policy if exists "School admins can read own notifications" on public.notifications;

create policy "Super admins can read all notifications"
  on public.notifications for select
  using (public.is_super_admin());

create policy "School admins can read school notifications"
  on public.notifications for select
  using (public.is_school_admin() and exists (
    select 1 from public.profiles p where p.id = user_id and p.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 17. UPDATE RLS POLICIES — COURSE MODULES
-- ==============================================================
alter table public.course_modules enable row level security;

drop policy if exists "Super admins can read course_modules" on public.course_modules;
drop policy if exists "School admins can read own course_modules" on public.course_modules;
drop policy if exists "Super admins can insert course_modules" on public.course_modules;
drop policy if exists "School admins can insert own course_modules" on public.course_modules;
drop policy if exists "Super admins can update course_modules" on public.course_modules;
drop policy if exists "School admins can update own course_modules" on public.course_modules;
drop policy if exists "Super admins can delete course_modules" on public.course_modules;
drop policy if exists "School admins can delete own course_modules" on public.course_modules;

create policy "Super admins can read course_modules"
  on public.course_modules for select
  using (public.is_super_admin());

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

-- ==============================================================
-- 18. UPDATE RLS POLICIES — LESSONS
-- ==============================================================
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

-- ==============================================================
-- 19. UPDATE RLS POLICIES — STUDENT PROGRESS
-- ==============================================================
alter table public.student_progress enable row level security;

drop policy if exists "Super admins can read student_progress" on public.student_progress;
drop policy if exists "School admins can read own student_progress" on public.student_progress;
drop policy if exists "Super admins can insert student_progress" on public.student_progress;
drop policy if exists "School admins can insert own student_progress" on public.student_progress;
drop policy if exists "Super admins can update student_progress" on public.student_progress;
drop policy if exists "School admins can update own student_progress" on public.student_progress;
drop policy if exists "Super admins can delete student_progress" on public.student_progress;
drop policy if exists "School admins can delete own student_progress" on public.student_progress;

create policy "Super admins can read student_progress"
  on public.student_progress for select
  using (public.is_super_admin());

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

-- ==============================================================
-- 20. UPDATE RLS POLICIES — ASSIGNMENTS
-- ==============================================================
alter table public.assignments enable row level security;

-- Assignments follow the course's school_id for scoping
create policy "Super admins can read assignments"
  on public.assignments for select
  using (public.is_super_admin());

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

-- ==============================================================
-- 21. UPDATE RLS POLICIES — ASSIGNMENT SUBMISSIONS
-- ==============================================================
alter table public.assignment_submissions enable row level security;

create policy "Super admins can read assignment_submissions"
  on public.assignment_submissions for select
  using (public.is_super_admin());

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

-- ==============================================================
-- 22. UPDATE RLS POLICIES — QUIZZES
-- ==============================================================
alter table public.quizzes enable row level security;

create policy "Super admins can read quizzes"
  on public.quizzes for select
  using (public.is_super_admin());

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

-- ==============================================================
-- 23. UPDATE RLS POLICIES — QUIZ QUESTIONS, ATTEMPTS, ANSWERS
-- ==============================================================
alter table public.quiz_questions enable row level security;

create policy "Super admins can read quiz_questions"
  on public.quiz_questions for select
  using (public.is_super_admin());

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

create policy "Super admins can read quiz_attempts"
  on public.quiz_attempts for select
  using (public.is_super_admin());

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

create policy "Super admins can read quiz_answers"
  on public.quiz_answers for select
  using (public.is_super_admin());

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

-- ==============================================================
-- 24. UPDATE RLS POLICIES — CERTIFICATES
-- ==============================================================
alter table public.certificates enable row level security;

create policy "Super admins can read certificates"
  on public.certificates for select
  using (public.is_super_admin());

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

-- ==============================================================
-- 25. UPDATE RLS POLICIES — AUDIT LOGS
-- ==============================================================
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

-- ==============================================================
-- 26. UPDATE RLS POLICIES — PERMISSIONS TABLE
-- ==============================================================
alter table public.permissions enable row level security;

drop policy if exists "Super admins can read permissions" on public.permissions;
drop policy if exists "School admins can read own permissions" on public.permissions;
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

-- ==============================================================
-- 27. SEED PERMISSIONS FOR NEW ROLES
-- ==============================================================
-- Company Admin permissions
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

-- Teacher permissions
insert into public.permissions (role, permission, enabled) values
  ('teacher', 'view_assigned_courses', true),
  ('teacher', 'view_assigned_students', true),
  ('teacher', 'grade_assignments', true),
  ('teacher', 'grade_quizzes', true),
  ('teacher', 'view_analytics', true),
  ('teacher', 'manage_own_profile', true)
on conflict (role, permission) do nothing;

-- ==============================================================
-- 28. INDEXES FOR RBAC QUERIES
-- ==============================================================
create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_schools_company_id on public.schools(company_id);
create index if not exists idx_profiles_role_company on public.profiles(role, company_id);
create index if not exists idx_profiles_role_school on public.profiles(role, school_id);
