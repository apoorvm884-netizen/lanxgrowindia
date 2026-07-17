-- ==============================================================
-- LANXGROW COS — Database Schema
-- Migration 00001: Core Tables
-- ==============================================================
-- Applied via: Supabase CLI or Dashboard SQL Editor
-- Order: Run this before 00002 (RLS) and 00003 (Seed)
-- ==============================================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. Schools
create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  status      text not null default 'active'
              check (status in ('active', 'inactive', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Categories
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  school_id   uuid not null references public.schools(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_categories_school_id on public.categories(school_id);

-- 3. Subjects
create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  school_id   uuid not null references public.schools(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_subjects_school_id on public.subjects(school_id);
create index idx_subjects_category_id on public.subjects(category_id);

-- 4. Sections
create table public.sections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  school_id   uuid not null references public.schools(id) on delete cascade,
  subject_id  uuid not null references public.subjects(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_sections_school_id on public.sections(school_id);
create index idx_sections_subject_id on public.sections(subject_id);

-- 5. Content
create table public.content (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null
              check (type in ('Video', 'PDF', 'Image', 'Document', 'Other')),
  url         text,
  size        text,
  school_id   uuid not null references public.schools(id) on delete cascade,
  section_id  uuid references public.sections(id) on delete set null,
  description text,
  tags        text[],
  status      text not null default 'draft'
              check (status in ('draft', 'published', 'archived', 'review')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_content_school_id on public.content(school_id);
create index idx_content_section_id on public.content(section_id);

-- 6. Profiles (extends auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null default 'school_admin'
              check (role in ('super_admin', 'school_admin')),
  school_id   uuid references public.schools(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 7. Audit Logs
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  user_name   text not null,
  action      text not null
              check (action in ('created', 'edited', 'uploaded', 'deleted',
                                 'suspended', 'approved', 'rejected')),
  entity      text not null,
  entity_name text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_entity on public.audit_logs(entity);
