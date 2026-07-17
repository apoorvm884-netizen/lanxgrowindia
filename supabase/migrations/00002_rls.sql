-- ==============================================================
-- LANXGROW COS — Row Level Security
-- Migration 00002: RLS Policies
-- ==============================================================
-- Run after 00001_schema.sql
-- ==============================================================
-- Helper: get the authenticated user's role
-- Returns NULL for unauthenticated requests (denies access).
-- ==============================================================
create or replace function public.get_user_role()
returns text
language sql stable
security definer
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

-- ==============================================================
-- Helper: get the authenticated user's school_id
-- Returns NULL for super_admins (they have no school_id restriction).
-- ==============================================================
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

-- ==============================================================
-- Helper: check if user is super_admin
-- ==============================================================
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

-- ==============================================================
-- 1. SCHOOLS
-- ==============================================================
alter table public.schools enable row level security;

create policy "Super admins can read all schools"
  on public.schools for select
  using (public.is_super_admin());

create policy "School admins can read own school"
  on public.schools for select
  using (id = public.get_user_school_id());

create policy "Super admins can insert schools"
  on public.schools for insert
  with check (public.is_super_admin());

create policy "Super admins can update schools"
  on public.schools for update
  using (public.is_super_admin());

create policy "Super admins can delete schools"
  on public.schools for delete
  using (public.is_super_admin());

-- ==============================================================
-- 2. CATEGORIES
-- ==============================================================
alter table public.categories enable row level security;

create policy "Super admins can read all categories"
  on public.categories for select
  using (public.is_super_admin());

create policy "School admins can read own categories"
  on public.categories for select
  using (school_id = public.get_user_school_id());

create policy "Super admins can insert categories"
  on public.categories for insert
  with check (public.is_super_admin());

create policy "School admins can insert own categories"
  on public.categories for insert
  with check (school_id = public.get_user_school_id());

create policy "Super admins can update categories"
  on public.categories for update
  using (public.is_super_admin());

create policy "School admins can update own categories"
  on public.categories for update
  using (school_id = public.get_user_school_id());

create policy "Super admins can delete categories"
  on public.categories for delete
  using (public.is_super_admin());

create policy "School admins can delete own categories"
  on public.categories for delete
  using (school_id = public.get_user_school_id());

-- ==============================================================
-- 3. SUBJECTS
-- ==============================================================
alter table public.subjects enable row level security;

create policy "Super admins can read all subjects"
  on public.subjects for select
  using (public.is_super_admin());

create policy "School admins can read own subjects"
  on public.subjects for select
  using (school_id = public.get_user_school_id());

create policy "Super admins can insert subjects"
  on public.subjects for insert
  with check (public.is_super_admin());

create policy "School admins can insert own subjects"
  on public.subjects for insert
  with check (school_id = public.get_user_school_id());

create policy "Super admins can update subjects"
  on public.subjects for update
  using (public.is_super_admin());

create policy "School admins can update own subjects"
  on public.subjects for update
  using (school_id = public.get_user_school_id());

create policy "Super admins can delete subjects"
  on public.subjects for delete
  using (public.is_super_admin());

create policy "School admins can delete own subjects"
  on public.subjects for delete
  using (school_id = public.get_user_school_id());

-- ==============================================================
-- 4. SECTIONS
-- ==============================================================
alter table public.sections enable row level security;

create policy "Super admins can read all sections"
  on public.sections for select
  using (public.is_super_admin());

create policy "School admins can read own sections"
  on public.sections for select
  using (school_id = public.get_user_school_id());

create policy "Super admins can insert sections"
  on public.sections for insert
  with check (public.is_super_admin());

create policy "School admins can insert own sections"
  on public.sections for insert
  with check (school_id = public.get_user_school_id());

create policy "Super admins can update sections"
  on public.sections for update
  using (public.is_super_admin());

create policy "School admins can update own sections"
  on public.sections for update
  using (school_id = public.get_user_school_id());

create policy "Super admins can delete sections"
  on public.sections for delete
  using (public.is_super_admin());

create policy "School admins can delete own sections"
  on public.sections for delete
  using (school_id = public.get_user_school_id());

-- ==============================================================
-- 5. CONTENT
-- ==============================================================
alter table public.content enable row level security;

create policy "Super admins can read all content"
  on public.content for select
  using (public.is_super_admin());

create policy "School admins can read own content"
  on public.content for select
  using (school_id = public.get_user_school_id());

create policy "Super admins can insert content"
  on public.content for insert
  with check (public.is_super_admin());

create policy "School admins can insert own content"
  on public.content for insert
  with check (school_id = public.get_user_school_id());

create policy "Super admins can update content"
  on public.content for update
  using (public.is_super_admin());

create policy "School admins can update own content"
  on public.content for update
  using (school_id = public.get_user_school_id());

create policy "Super admins can delete content"
  on public.content for delete
  using (public.is_super_admin());

create policy "School admins can delete own content"
  on public.content for delete
  using (school_id = public.get_user_school_id());

-- ==============================================================
-- 6. PROFILES
-- ==============================================================
alter table public.profiles enable row level security;

-- Users can read their own profile; super admins can read all
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_super_admin());

-- Only the trigger (or service-role backend) inserts profiles;
-- clients cannot insert directly.
create policy "No client inserts on profiles"
  on public.profiles for insert
  with check (false);

-- Users can update their own name; role+school_id are admin-only
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

-- Only service-role functions can delete profiles
create policy "No client deletes on profiles"
  on public.profiles for delete
  using (false);

-- ==============================================================
-- 7. AUDIT LOGS
-- ==============================================================
alter table public.audit_logs enable row level security;

-- Anyone authenticated can INSERT (append-only log)
create policy "Authenticated users can insert audit logs"
  on public.audit_logs for insert
  with check (auth.role() = 'authenticated');

-- Super admins can read all audit logs
create policy "Super admins can read audit logs"
  on public.audit_logs for select
  using (public.is_super_admin());

-- School admins can read audit logs for their school
-- (via a join - simplified: all logs visible to school admins for now)
-- In production, link audit_logs to school_id for finer control
create policy "School admins can read audit logs"
  on public.audit_logs for select
  using (auth.role() = 'authenticated' and not public.is_super_admin());

-- No updates or deletes on audit logs
create policy "No updates on audit logs"
  on public.audit_logs for update
  using (false);

create policy "No deletes on audit logs"
  on public.audit_logs for delete
  using (false);

-- ==============================================================
-- Note about first-user super_admin promotion:
-- The trigger in 00003_triggers.sql handles promoting the first
-- user who signs up to super_admin.
-- ==============================================================
