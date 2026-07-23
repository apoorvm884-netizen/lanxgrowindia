# LANXGROW INDIA — Version 1.1
# Product Architecture & Engineering Specification

**Document Type:** Product Requirements Document + Technical Architecture Blueprint  
**Version:** 1.1  
**Date:** July 23, 2026  
**Prepared by:** Lead Product Architect / CTO / Principal Software Engineer  
**Status:** DRAFT — Awaiting Review  

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Current System Audit](#2-current-system-audit)
3. [Strengths](#3-strengths)
4. [Weaknesses](#4-weaknesses)
5. [UX Problems](#5-ux-problems)
6. [Missing Features](#6-missing-features)
7. [Information Architecture](#7-information-architecture)
8. [Navigation Architecture](#8-navigation-architecture)
9. [Entity Relationship Design](#9-entity-relationship-design)
10. [Database Recommendations](#10-database-recommendations)
11. [API Strategy](#11-api-strategy)
12. [Drive Architecture](#12-drive-architecture)
13. [Content Architecture](#13-content-architecture)
14. [School Architecture](#14-school-architecture)
15. [Counselor Architecture](#15-counselor-architecture)
16. [Student Architecture](#16-student-architecture)
17. [Authentication Strategy](#17-authentication-strategy)
18. [Google Account Linking Strategy](#18-google-account-linking-strategy)
19. [RBAC Matrix](#19-rbac-matrix)
20. [Dashboard Strategy](#20-dashboard-strategy)
21. [Search Strategy](#21-search-strategy)
22. [Notification Strategy](#22-notification-strategy)
23. [Analytics Strategy](#23-analytics-strategy)
24. [Security Considerations](#24-security-considerations)
25. [Scalability Considerations](#25-scalability-considerations)
26. [Development Roadmap](#26-development-roadmap)

---

---

## 1. EXECUTIVE SUMMARY

LANXGROW INDIA (v1.0) is a multi-tenant educational content management platform built on a Vanilla JS + Vite + Supabase stack. It currently operates in **demo/mock-data mode** and has been deployed with full UI scaffolding, 6-role RBAC, 20 database migrations, an LMS engine, and 20+ service modules. The codebase is architecturally sound, the database schema is well-designed, and the security model is production-grade.

However, there is a critical gap between the frontend UI and a real production backend. The platform renders polished screens using demo data from `src/demo/`. No real Supabase queries are connected end-to-end for all user roles. Most workflows — content creation, student enrollment, course delivery, counselor management — show the right UI but touch no real data for the full user lifecycle.

**The goal of Version 1.1 is to close this gap and make every screen, every workflow, and every user role fully operational on real data.**

The architectural vision is that the platform becomes **completely school-centric**. Every entity — student, course, content, subject, section — belongs to a School. The hierarchy flows downward from Company through School, then through the curriculum tree into student access. This document provides the complete blueprint for achieving that vision without requiring a database rewrite or architectural overhaul.

The platform's existing foundation is a strength. The recommended path is evolution, not revolution.

---

## 2. CURRENT SYSTEM AUDIT

### 2.1 Technology Stack

| Layer | Technology | Status |
|---|---|---|
| Build | Vite 6 | Production |
| Language | Vanilla JS (ES Modules) | Production |
| UI Framework | None — direct DOM manipulation | Production |
| CSS Framework | Tailwind CSS (CDN) | Dev only — requires PostCSS for production |
| Icons | Font Awesome + Material Symbols | Production |
| Backend | Supabase (PostgreSQL + Auth + Storage) | Configured, partial connection |
| Auth | Supabase Auth (Email/Password + Google OAuth) | Wired, running in demo mode |
| File Storage | Supabase Storage (bucket created) | Schema ready, no upload UI wired |
| Drive Integration | Google Drive (folder linking only) | UI exists, no real API calls |
| Deployment | Vercel + GitHub | Production |

### 2.2 Database Schema Status (20 Migrations Applied)

| Table | Migration | RLS | Status |
|---|---|---|---|
| companies | 00019 | Full 6-role | Ready |
| schools | 00001 + 00008 + 00019 | Full 6-role | Ready |
| profiles | 00001 + 00019 | Full 6-role | Ready |
| categories | 00001 + 00019 | Full 6-role | Ready |
| subjects | 00001 + 00019 | Full 6-role | Ready |
| sections | 00001 + 00019 | Full 6-role | Ready |
| content | 00001 + 00019 | Full 6-role | Ready |
| courses | 00013 + 00019 | Full 6-role | Ready |
| course_sections | 00013 + 00020 | Full 6-role | Ready |
| enrollments | 00013 + 00020 | Full 6-role | Ready |
| students | 00012 + 00019 | Full 6-role | Ready |
| course_modules | 00014 + 00020 | Full 6-role | Ready |
| lessons | 00014 + 00020 | Full 6-role | Ready |
| student_progress | 00014 + 00020 | Full 6-role | Ready |
| assignments | 00014 + 00020 | Full 6-role | Ready |
| assignment_submissions | 00014 + 00020 | Full 6-role | Ready |
| quizzes | 00014 + 00020 | Full 6-role | Ready |
| quiz_questions | 00014 | Partial | Needs write policies |
| quiz_attempts | 00014 | Partial | Needs write policies |
| quiz_answers | 00014 | Partial | Needs student write |
| certificates | 00014 + 00020 | Full 6-role | Ready |
| notifications | 00013 + 00020 | Full 6-role | Ready |
| audit_logs | 00001 + 00020 | Full 6-role | Ready |
| settings | 00009 | Basic | Needs school-scoped |
| permissions | 00010 + 00019 | Full 6-role | Ready |
| drive_folders | (not in schema yet) | Missing | Needs migration |

### 2.3 Service Layer Status

| Service | Backend Wired | Complete |
|---|---|---|
| AuthService | Supabase Auth | Yes |
| SchoolService | Supabase CRUD | Yes |
| CategoryService | Supabase CRUD + hierarchy | Yes |
| SubjectService | Supabase CRUD | Yes |
| SectionService | Supabase CRUD | Yes |
| ContentService | Supabase CRUD | Yes (upload UI missing) |
| CourseService | Supabase CRUD | Yes |
| StudentService | Supabase CRUD | Yes |
| EnrollmentService | Supabase CRUD | Yes |
| DriveService | folder ID only (no Drive API) | Partial |
| NotificationService | Supabase CRUD | Yes |
| SettingsService | Supabase CRUD | Yes |
| PermissionsService | Supabase CRUD | Yes |
| ModuleService | Supabase CRUD | Yes |
| LessonService | Supabase CRUD | Yes |
| ProgressService | Supabase CRUD | Yes |
| AssignmentService | Supabase CRUD | Yes |
| QuizService | Supabase CRUD | Yes |
| CertificateService | Supabase CRUD | Yes |
| AuditLogService | Supabase INSERT | Yes |

### 2.4 Role Coverage

| Role | Login | Dashboard | Core Workflows |
|---|---|---|---|
| super_admin | Demo mode | Renders (demo data) | Schools, Content Manager |
| company_admin | Demo mode | Renders (demo data) | Schools, Settings |
| school_admin | Demo mode | Renders (demo data) | Students, Courses, Categories |
| counselor | Demo mode | Single view (demo) | None wired |
| teacher | Not in demo config | Not implemented | None |
| student | Demo mode | Single view (demo) | LMS portal partial |


---

## 3. STRENGTHS

**3.1 Database Architecture is Production-Grade**
The schema across 20 migrations is well-structured, normalized, and secure. RLS policies cover 22+ tables with 6 roles. The decision to use Supabase RLS as the primary authorization layer — not middleware — is correct and scales well. No database redesign is needed for v1.1.

**3.2 Service Layer is Complete and Clean**
Every entity has a corresponding service with clean CRUD operations, error handling, and automatic audit logging. The service interface pattern (e.g., `SchoolService.create()`, `CourseService.getBySchool()`) is consistent and correct. No service rewrites needed.

**3.3 RBAC Is Already Defined**
Six roles are fully modeled: `super_admin`, `company_admin`, `school_admin`, `teacher`, `counselor`, `student`. RLS policies exist for every role on every table. The `permissions` table supports runtime permission management. This is solid.

**3.4 Company → School Hierarchy Exists in the Database**
Migration 00019 added a `companies` table and `company_id` to schools and profiles. The multi-company SaaS architecture is already in the database even though the UI doesn't expose it yet.

**3.5 LMS Engine Is Fully Modeled**
The full LMS stack — courses, modules, lessons, student progress, quizzes, assignments, certificates — is in the database and has services. The `lms-student.js` portal and related services exist. The engine needs UI wiring, not redesign.

**3.6 Hierarchical Category System Exists**
Epic 1 introduced `parent_id` on categories, `getChildren()`, `getTree()`, and drill-down navigation. This is the right architecture for the school-centric content hierarchy described in the product vision.

**3.7 Audit Logging Is Systemic**
Every service call that mutates data auto-logs to `audit_logs`. This means audit trails will be complete once real data flows through the services. No additional instrumentation needed.

**3.8 Tailwind Design System Is Consistent**
The UI uses a well-defined Tailwind token set (colors, typography, spacing, shadows). Component patterns are consistent across screens. Epic 1 added production-grade polish.

---

## 4. WEAKNESSES

**4.1 No Real Data Flowing End-to-End**
The most critical weakness. The application runs entirely on demo data from `src/demo/`. The Supabase client is configured but no user journey from login through school admin to student works on real Supabase data. This is the primary blocker for production.

**4.2 `AppStorage.load()` Global Data Load Pattern**
The pattern of loading ALL data at once from the demo layer, then filtering in the UI, will not work at scale. As the app migrates to Supabase, each service call should fetch exactly what is needed. Many screens currently rely on this global data object. This is a medium migration risk.

**4.3 Single `index.html` Monolith with Demo Code Entangled**
`src/main.js` is 3,893 lines. `school-portal.js` is 1,481 lines. `demo-integration.js` is 853 lines. The demo code (`src/demo/`) is dynamically injected via `VITE_DEMO_MODE`. This is technically correct but means removing demo mode is a significant cut across multiple files.

**4.4 Content Upload Is Not Implemented**
The `ContentService.create()` exists but there is no UI for uploading files. No integration with Supabase Storage exists beyond the bucket definition in migration 00011. This is the largest missing production workflow.

**4.5 Teacher and Counselor Portals Are Single-View Demo Shells**
The Production Launch Report confirms "Counselor/Student demo router shows same dashboard for all routes." These roles have no real routes or workflows. Teachers are missing from demo config entirely.

**4.6 Student Portal Is Partially Implemented**
`lms-student.js` exists but the student portal is not fully wired to Supabase data. Course enrollment, lesson access, and progress tracking are defined at the service level but the student UI doesn't use them through real data.

**4.7 Tailwind CDN in Production**
Using `cdn.tailwindcss.com` generates all Tailwind classes at runtime in the browser. This is slow, increases bundle size concerns, and is explicitly flagged in the Production Report as Medium priority fix. For production, Tailwind must be built at compile time via PostCSS.

**4.8 No Real File Streaming**
Videos are not playable. The content table has `url` and `drive_folder_id` fields but there is no signed URL generation, no Supabase Storage streaming, and no Google Drive API integration for actual file access.

**4.9 School Intelligence Analytics Is Demo-Only**
The `School Intelligence` screen renders 23,962 characters of demo content. No real analytics queries exist. Analytics tables are not in the schema. This is a significant gap.

**4.10 Search Is Local/Demo Only**
Global search is a placeholder. Entity search (within schools, categories, etc.) uses local array filtering on demo data. No full-text search query is written against Supabase.

**4.11 `drive_folders` Table Missing from Schema**
The `TECHNICAL_ARCHITECTURE.md` specifies a `drive_folders` table for mapping entity hierarchy to Drive folder IDs. This table was never created in any migration. Currently `drive_folder_id` is stored directly on `schools`, `categories`, `subjects`, and `sections` as a single column, which limits multi-folder relationships.


---

## 5. UX PROBLEMS

**5.1 Demo Buttons That Do Nothing Real**
The Production Launch Report notes "No placeholder implementations" but that refers to no `TODO` comments — not that all buttons work on real data. Quick action buttons like "Import Roster", "Assign Curriculum", "Manage Staff" show "Coming Soon" toasts. These must be real actions in v1.1.

**5.2 Counselor and Student Portals Are Single Screens**
When a counselor logs in, every sidebar item renders the same dashboard screen. Students get the same treatment. This is a broken experience that will frustrate real users immediately.

**5.3 Teacher Role Is Missing**
There is no demo login for teachers. Teachers are defined in the DB schema and RBAC but have no UI, no routes, and no portal. This is a missing user persona.

**5.4 School Intelligence Screen is 100% Hardcoded**
23,962 characters of analytics rendered with zero real queries. This screen needs to be either genuinely implemented or removed. Showing fake data to real users destroys trust.

**5.5 Content Cannot Be Uploaded**
A school admin looking at the Video Library has no way to actually add a video. The "Add Content" modal collects metadata but does not initiate a file upload. This is the most critical workflow gap.

**5.6 Student Access Is Not Gated by Enrollments**
The vision says "students should only see content from assigned courses." The data model supports this (enrollments table, course_sections table) but the student portal does not enforce it. A student portal that shows all content is a security and pedagogical failure.

**5.7 Breadcrumb Navigation Breaks Context**
When navigating deep (Company → School → Category → Subject → Section), the breadcrumb works, but navigating backward via browser back button or sidebar does not restore context (selected school ID, selected category ID, etc.). This causes "white screen" states.

**5.8 No Feedback on Long Operations**
Creating a school, enrolling a student, uploading content — none of these show meaningful progress feedback. The toast system exists but is only used for instant success/error. Operations that take >500ms need better loading states.

**5.9 Password-First vs. Google-First Login Confusion**
The login screen shows Google OAuth and Email/Password side by side. For a school admin who was invited by email, there's no obvious cue that they should use email/password. The login UX needs role-aware prompting.

**5.10 Empty States Are Not Actionable**
Most empty states say "No [entity] yet. Create your first [entity]." They should link directly to the creation flow, optionally with onboarding guidance for first-time school admins.

---

## 6. MISSING FEATURES

The following features are required for a production SaaS but are not yet implemented:

**6.1 High Priority (Blocking Production Use)**

| Feature | Why Critical |
|---|---|
| Real Supabase authentication (remove demo mode) | Cannot onboard real users |
| File upload to Supabase Storage | Core content management feature |
| Content streaming (signed URLs for video/PDF) | Core student experience |
| Teacher portal with real routes | Teacher is a key user persona |
| Counselor portal with real routes | Counselor is a key user persona |
| Student portal wired to real enrollments | Core student experience |
| Course assignment to students (enrollment UI) | Core operational workflow |
| Tailwind PostCSS build for production | Performance requirement |

**6.2 Medium Priority (Required for Daily Use)**

| Feature | Why Important |
|---|---|
| Google Drive folder auto-creation on entity create | Drive architecture core |
| Real analytics queries (not demo data) | Operational decision-making |
| Notification delivery (not just storage) | User engagement |
| Full-text search (Supabase `tsvector`) | Usability at scale |
| Counselor student assignment workflow | Counselor usefulness |
| Assignment submission workflow (student side) | LMS completeness |
| Quiz taking UI (student side) | LMS completeness |
| Certificate generation and download | Student motivation |
| Soft-delete with undo for content | Data safety |
| School-level settings (not just global) | Multi-tenancy requirement |

**6.3 Lower Priority (Polish and Scale)**

| Feature | Why Valuable |
|---|---|
| Google account linking for school admins | Convenience |
| Dark mode | UX preference |
| Bulk import (students via CSV) | Operational efficiency |
| Bulk enrollment (assign course to many students) | Operational efficiency |
| Content tagging and filtering | Content discovery |
| Parent/guardian portal (future) | Business expansion |
| Mobile-responsive student portal | Accessibility |
| Real-time notifications (Supabase Realtime) | Engagement |
| Course progress certificates auto-issued | Automation |
| Global search with Postgres FTS | Power user feature |


---

## 7. INFORMATION ARCHITECTURE

### 7.1 Entity Ownership Hierarchy

Every entity in the platform traces ownership up to a School and a Company. This is the canonical hierarchy for v1.1:

```
Company
  └── School (owns all data below)
        ├── Profiles (school_admin, teacher, counselor)
        ├── Students
        │     └── Enrollments → Courses
        │           └── Progress, Assignments, Certificates
        ├── Categories (hierarchical tree)
        │     └── Subjects
        │           └── Sections
        │                 └── Content (videos, PDFs, docs, links)
        ├── Courses
        │     ├── Modules → Lessons → Content
        │     ├── Assignments
        │     ├── Quizzes
        │     └── Enrollments → Students
        ├── Drive
        │     └── Folder mappings (Category → Subject → Section)
        └── Settings, Notifications, Audit Logs
```

### 7.2 Content Ownership Rule

Every content item must carry ALL of these foreign keys:
- `school_id` — non-nullable, primary ownership
- `category_id` — nullable (may not be categorized yet)
- `subject_id` — nullable
- `section_id` — nullable
- `course_id` — nullable (content can exist outside a course)

This enables filtering content by any level of the hierarchy without JOINs.

> **Current State:** The `content` table has `school_id`, `section_id`, `category_id`, `subject_id` — this is already correct per the current `ContentService`. ✅

### 7.3 Student Access Rule

Students access content ONLY through the Course → Enrollment chain:
1. School Admin or Teacher creates a Course
2. Course contains Modules → Lessons → Content
3. School Admin or Counselor enrolls a Student in the Course
4. Student can access only lessons in enrolled courses

Content outside a course is invisible to students regardless of its school_id. This is a critical security and pedagogical boundary.

### 7.4 Drive Organization Rule

Drive folder structure mirrors the content hierarchy:
```
[School Name]/
  [Category Name]/
    [Subject Name]/
      [Section Name]/
        content files
```

Folder creation is triggered automatically when a Category/Subject/Section is created.

### 7.5 Settings Scope Rule

Settings exist at two levels:
- **Global settings** — managed by super_admin, apply platform-wide (SMTP, branding)
- **School settings** — managed by school_admin, apply per-school (notifications, drive folder root, academic year preferences)

Currently the `settings` table has no `school_id`. This must be added in v1.1.


---

## 8. NAVIGATION ARCHITECTURE

### 8.1 Portal Separation

The application has three distinct portal contexts. Each has its own sidebar, routes, and service scope:

| Portal | Roles | Entry Point | Sidebar Style |
|---|---|---|---|
| HQ Portal | super_admin, company_admin | company-dashboard | Dark (bg-gray-900) |
| School Portal | school_admin, teacher, counselor | school-dashboard | White (bg-white) |
| Student Portal | student | student-dashboard | Light with course nav |

### 8.2 HQ Portal Navigation (Super Admin / Company Admin)

```
HQ Navigation:
├── Overview (company-dashboard)
├── Schools Network (schools)
├── Content Manager (content-manager)
├── Drive Manager (drive-manager)
├── Media Library (media-library)
├── School Admins (school-admins)
├── Roles & Permissions (roles-permissions)
├── Audit Log (audit-log)
└── Company Settings (company-settings)
```

### 8.3 School Portal Navigation (School Admin / Teacher / Counselor)

```
School Portal Navigation:
├── Dashboard (school-dashboard)
├── Students (school-students)
├── Counselors (school-counselors)          [school_admin only]
├── Teachers (school-teachers)              [school_admin only]
├── Courses (school-courses)
├── Categories (school-categories)
├── Subjects (school-subjects)
├── Sections (school-sections)
├── Content Library (school-content)        [replaces "Video Library"]
├── Assignments (school-assignments)
├── Reports (school-reports)
├── Notifications (school-notifications)
└── Settings (school-settings)
```

Role-based sidebar filtering:
- `teacher` sees: Dashboard, Courses, Assignments, Students (own courses only), Reports
- `counselor` sees: Dashboard, Students (assigned), Reports, Notifications

### 8.4 Student Portal Navigation

```
Student Portal Navigation:
├── Dashboard (my-courses overview)
├── My Courses (enrolled courses list)
│     └── Course Detail → Module → Lesson → Content player
├── Assignments (pending and submitted)
├── Quizzes (available and results)
├── Certificates (earned)
└── Profile
```

### 8.5 Context Preservation Rules

When navigating within the School Portal, context must be preserved:

- `currentSchoolId` — always set for school portal routes
- `currentCategoryId` — set when drilling into subjects
- `currentSubjectId` — set when drilling into sections
- `currentCourseId` — set when viewing course detail

Navigation to a sibling route (e.g., from Categories to Courses) must preserve `currentSchoolId` but clear child context.

> **Engineering Note:** The current implementation stores context in `AppRouter._selectedCategoryId`, `AppRouter._selectedSubjectId`. These need to be formalized into a `AppRouter.context` object with defined lifecycle rules (e.g., cleared when navigating to a parent route).

### 8.6 Breadcrumb Rules

Every school portal screen must show a breadcrumb path:
```
LANXGROW > [School Name] > [Screen] > [Sub-screen if applicable]
```

The breadcrumb must be clickable at every level and must restore appropriate context when clicked.


---

## 9. ENTITY RELATIONSHIP DESIGN

### 9.1 Current Schema — What's Correct

The following relationships are correctly modeled and should NOT be changed:

```
companies → schools (company_id)
schools → profiles (school_id, role)
schools → categories (school_id) — with parent_id for hierarchy
schools → subjects (school_id, category_id)
schools → sections (school_id, subject_id)
schools → content (school_id, section_id, category_id, subject_id)
schools → courses (school_id, category_id, subject_id)
schools → students (school_id, counselor_id)
students → enrollments → courses
courses → course_sections → sections
courses → course_modules → lessons → content
students → student_progress → lessons
courses → assignments → assignment_submissions
courses → quizzes → quiz_questions, quiz_attempts, quiz_answers
students → certificates
profiles → notifications
```

### 9.2 Missing Relationships and Corrections

**9.2.1 `courses` table needs additional fields**

Current schema has `name`, `description`, `school_id`, `created_at`, `updated_at`.

Required additions:
```sql
category_id     uuid references categories(id) on delete set null
subject_id      uuid references subjects(id) on delete set null
thumbnail       text
difficulty      text check (difficulty in ('beginner','intermediate','advanced'))
estimated_duration integer  -- minutes
publish_status  text not null default 'draft'
                check (publish_status in ('draft','published','archived'))
version         integer not null default 1
created_by      uuid references profiles(id) on delete set null
```

> **Note:** `CourseService` already handles all these fields. They just need to exist in the migration. `00013_courses_enrollments_notifications.sql` only created the base schema. This is an additive migration needed.

**9.2.2 `settings` table needs school scoping**

Current schema: `key`, `value`, `description` — flat, global-only.

Required addition:
```sql
school_id uuid references schools(id) on delete cascade  -- null = global
```

With a composite unique constraint: `UNIQUE(key, school_id)` (nullable school_id treated as global).

**9.2.3 `drive_folders` table should be created as specified**

The current implementation stores `drive_folder_id` as a single text column on `schools`, `categories`, `subjects`, and `sections`. This is adequate for a single Drive folder per entity but doesn't support multiple Drive integrations or folder versioning.

The `TECHNICAL_ARCHITECTURE.md` specifies a `drive_folders` junction table for v1.1+:
```sql
create table drive_folders (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references schools(id) on delete cascade,
  entity_type     text not null check (entity_type in ('school','category','subject','section')),
  entity_id       uuid not null,
  drive_folder_id text not null,
  path            text not null,
  created_at      timestamptz not null default now(),
  unique(entity_type, entity_id)
);
```

> **Recommendation for v1.1:** Keep the current `drive_folder_id` column approach for now (it works, the `DriveService` uses it). Create the `drive_folders` table in v1.2 when Google Drive API integration is implemented.

**9.2.4 `students` table needs profile linkage**

Migration 00020 added `user_id uuid references profiles(id)`. This is correct and enables students to authenticate. However, the `StudentService.create()` doesn't yet set `user_id`. This must be fixed during the Supabase migration phase.

**9.2.5 `content` table needs a `course_id` foreign key**

Currently content is linked to courses only indirectly through `course_sections → sections → content`. For direct content assignment to a course (bypassing sections), a `course_id` nullable FK should be added.

**9.2.6 `lessons.content_id` needs a foreign key constraint**

Currently `lessons.content_id` is `uuid` with no FK constraint. It should reference `content(id) on delete set null`.


---

## 10. DATABASE RECOMMENDATIONS

### 10.1 New Migration Required: `00021_v1.1_schema_fixes.sql`

The following changes should be applied as a single idempotent migration:

```sql
-- 1. Add missing columns to courses
alter table public.courses
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists subject_id uuid references public.subjects(id) on delete set null,
  add column if not exists thumbnail text,
  add column if not exists difficulty text default 'intermediate'
    check (difficulty in ('beginner','intermediate','advanced')),
  add column if not exists estimated_duration integer,
  add column if not exists publish_status text not null default 'draft'
    check (publish_status in ('draft','published','archived')),
  add column if not exists version integer not null default 1,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_courses_category on public.courses(category_id);
create index if not exists idx_courses_subject on public.courses(subject_id);
create index if not exists idx_courses_status on public.courses(publish_status);

-- 2. School-scoped settings
alter table public.settings
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

drop index if exists idx_settings_key;
create unique index if not exists idx_settings_key_school
  on public.settings(key, school_id) nulls not distinct;

-- 3. Fix lessons.content_id FK
alter table public.lessons
  add constraint if not exists fk_lessons_content
  foreign key (content_id) references public.content(id) on delete set null
  not valid;  -- not valid allows applying without table scan; validate separately

-- 4. Add course_id to content (optional direct course link)
alter table public.content
  add column if not exists course_id uuid references public.courses(id) on delete set null;

create index if not exists idx_content_course on public.content(course_id);

-- 5. Full-text search vector columns (for search feature)
alter table public.schools
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(code,''))
  ) stored;

alter table public.content
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
  ) stored;

alter table public.courses
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,''))
  ) stored;

create index if not exists idx_schools_search on public.schools using gin(search_vector);
create index if not exists idx_content_search on public.content using gin(search_vector);
create index if not exists idx_courses_search on public.courses using gin(search_vector);

-- 6. Analytics materialized view (read-only, refreshed hourly by cron)
create materialized view if not exists public.school_stats as
select
  s.id as school_id,
  count(distinct st.id) as student_count,
  count(distinct p.id) filter (where p.role = 'teacher') as teacher_count,
  count(distinct p.id) filter (where p.role = 'counselor') as counselor_count,
  count(distinct c.id) as course_count,
  count(distinct cat.id) as category_count,
  count(distinct sub.id) as subject_count,
  count(distinct sec.id) as section_count,
  count(distinct con.id) as content_count,
  count(distinct e.id) as enrollment_count
from public.schools s
left join public.students st on st.school_id = s.id
left join public.profiles p on p.school_id = s.id
left join public.courses c on c.school_id = s.id
left join public.categories cat on cat.school_id = s.id
left join public.subjects sub on sub.school_id = s.id
left join public.sections sec on sec.school_id = s.id
left join public.content con on con.school_id = s.id
left join public.enrollments e on e.course_id = c.id
group by s.id
with no data;

create unique index if not exists idx_school_stats_school_id on public.school_stats(school_id);
```

### 10.2 Performance Indexes Already in Place (Migration 00018 + 00020)

The following performance-critical indexes already exist and should not be modified:
- `idx_student_progress_student_lesson` (student_id, lesson_id)
- `idx_student_progress_completed` (student_id, completed) WHERE completed = true
- `idx_course_modules_course_id`
- `idx_lessons_module_id`
- `idx_enrollments_course_status`
- `idx_profiles_role_company`, `idx_profiles_role_school`

### 10.3 Index Gaps to Fill

```sql
-- These are missing from current migrations
create index if not exists idx_content_type on public.content(type);
create index if not exists idx_content_status on public.content(status);
create index if not exists idx_students_counselor on public.students(counselor_id);
create index if not exists idx_courses_school_status on public.courses(school_id, publish_status);
```

### 10.4 Postgres Functions for Analytics

```sql
-- Refresh school_stats (called by cron or on-demand)
create or replace function public.refresh_school_stats()
returns void language plpgsql security definer as $$
begin
  refresh materialized view concurrently public.school_stats;
end;
$$;
```

> **Supabase Cron Job:** Schedule `select refresh_school_stats()` every 30 minutes using Supabase's `pg_cron` extension.


---

## 11. API STRATEGY

### 11.1 Core Principle (Unchanged)

The frontend calls Supabase client directly via RLS-enforced queries. No custom API middleware layer. Edge Functions handle privileged operations only (user creation, file URL generation, email dispatch).

### 11.2 Existing API Surface (Keep As-Is)

All service methods described in `IMPLEMENTATION_MAP.md` and implemented in `src/services/` are the correct API surface. The naming, parameter shapes, and return types are production-ready.

### 11.3 Edge Functions Required for v1.1

| Function | Trigger | Why Edge Function |
|---|---|---|
| `invite-admin` | Super Admin creates school | Needs service-role key to create auth user |
| `create-school-with-admin` | School creation wizard | Atomic school + admin user creation |
| `invite-teacher` | School Admin adds teacher | Needs service-role key |
| `invite-counselor` | School Admin adds counselor | Needs service-role key |
| `get-upload-url` | Content upload initiated | Generates signed Supabase Storage URL |
| `get-content-url` | Student/teacher opens content | Generates signed read URL |
| `send-notification` | System events | Email delivery via SMTP |
| `generate-certificate` | Course completion | PDF generation, certificate numbering |
| `refresh-analytics` | Cron / on-demand | Calls `refresh_school_stats()` |

### 11.4 Supabase Storage Strategy

Replace the planned Google Drive upload path with Supabase Storage for v1.1. This eliminates the need for Google Drive API credentials, OAuth scopes, and folder management for the content upload workflow.

**Why Supabase Storage over Google Drive for v1.1:**
- No additional OAuth setup required
- Signed URLs generated directly from Supabase client
- RLS applies to Storage buckets (same school_id scoping)
- Simpler implementation — unblock content upload faster
- Google Drive remains as a *linking* feature (admins can link external Drive folders), not primary storage

**Bucket Architecture:**
```
content-uploads/
  {school_id}/
    videos/
      {content_id}.mp4
    documents/
      {content_id}.pdf
    images/
      {content_id}.jpg
    thumbnails/
      {content_id}_thumb.jpg
```

**Upload Flow:**
```
1. User selects file → frontend calls get-upload-url Edge Function
2. Edge Function validates file type, size, user's school_id
3. Edge Function returns signed upload URL (15-min expiry)
4. Frontend uploads directly to Supabase Storage (no server intermediary)
5. On success, frontend calls ContentService.create() with storage path
6. ContentService inserts content record + AuditLogService.log()
```

**Read/Stream Flow:**
```
1. User opens content → frontend calls get-content-url Edge Function
2. Edge Function verifies enrollment (for students) or school membership
3. Edge Function returns signed URL (1-hour expiry)
4. Frontend opens URL in video player / PDF viewer / download link
```

### 11.5 Pagination Strategy

All list endpoints must support pagination. Current services return all rows. For production:

```javascript
// Service pattern for paginated lists
async getBySchool(schoolId, { page = 1, limit = 20, sortBy = 'name', order = 'asc' } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
    .eq('school_id', schoolId)
    .order(sortBy, { ascending: order === 'asc' })
    .range(from, to);
  
  if (error) throw error;
  return { data: data || [], total: count || 0, page, limit };
}
```

Every list screen must handle `{ data, total, page, limit }` and render a pagination component.

### 11.6 Real-time Strategy (Phase 2)

Supabase Realtime for:
- Notification badge updates (unread count changes)
- Assignment submission notifications to teachers
- Course enrollment confirmations to students

Implementation deferred to v1.2. Use polling (30-second intervals) as an interim solution for v1.1.


---

## 12. DRIVE ARCHITECTURE

### 12.1 v1.1 Scope: Drive Folder Linking (Existing)

The current `DriveService` with `parseDriveLink()`, `setFolderId()`, `removeFolderId()` covers the v1.1 scope for Google Drive: administrators can manually link Google Drive folder URLs to Schools, Categories, Subjects, and Sections. This is working and correct. No changes required.

### 12.2 v1.2 Scope: Google Drive API Integration

Auto-creation of Drive folders when entities are created. This requires:
- A Google Cloud Service Account with Drive API access
- A `GOOGLE_SERVICE_ACCOUNT_JSON` secret in Supabase Edge Function environment
- Three Edge Functions: `create-drive-folder`, `move-to-archive`, `sync-drive-metadata`

This should NOT be implemented in v1.1. Reason: it requires Google OAuth app review (if sharing Drive across users), service account setup, and testing. The current manual linking approach unblocks Drive organization without this complexity.

### 12.3 v1.2 Drive Architecture Design

When Drive API integration is built, use this pattern:

```
School Creation
  → call create-drive-folder({name: school.name, parent: 'My Drive root'})
  → store returned folder_id in schools.drive_folder_id

Category Creation  
  → call create-drive-folder({name: category.name, parent: school.drive_folder_id})
  → store in categories.drive_folder_id

Subject Creation
  → call create-drive-folder({name: subject.name, parent: category.drive_folder_id})
  → store in subjects.drive_folder_id

Section Creation
  → call create-drive-folder({name: section.name, parent: subject.drive_folder_id})
  → store in sections.drive_folder_id
```

### 12.4 Drive Sync Strategy

For content that exists in Google Drive (linked via `drive_folder_id` on sections), a sync operation should:
1. List files in the Drive folder using the Drive API
2. Compare with content records in the database
3. Create content records for new files
4. Update metadata for changed files
5. Soft-delete records for removed files

This requires the `drive_folders` table described in Section 9.2.3 and should be a v1.2 feature.

### 12.5 What Should NOT Change in v1.1

The current `drive_folder_id` column approach on `schools`, `categories`, `subjects`, `sections` is the production pattern for v1.1. Do not refactor this to the `drive_folders` junction table until v1.2 when the full Drive API integration is ready. Premature normalization here would break the working `DriveService` without delivering value.


---

## 13. CONTENT ARCHITECTURE

### 13.1 Content Types

The `content` table supports these types: `Video`, `PDF`, `Image`, `Document`, `Other`. For v1.1, add:
- `Link` — External URL (YouTube, Google Slides, external resource)
- `Drive` — Google Drive file (referenced by drive_file_id, not uploaded to Storage)

The CHECK constraint on `content.type` must be updated accordingly.

### 13.2 Content Lifecycle

```
DRAFT → (review optional) → PUBLISHED → (archive) → ARCHIVED

Draft:    Visible only to school admins and teachers
Published: Visible to enrolled students
Archived: Not visible to students, preserved for audit
```

### 13.3 Content Library Screen (Replaces "Video Library")

The current "Video Library" screen shows only videos and images. Replace with a full "Content Library" that:
- Filters by type (All, Video, PDF, Document, Image, Link, Drive)
- Filters by category, subject, section
- Filters by status (Draft, Published, Archived)
- Shows thumbnail previews for video and image
- Shows file size and duration where applicable
- Has "Upload" button that opens a real file upload workflow

### 13.4 Content Upload Workflow (v1.1 Implementation)

```
User Flow:
1. School Admin clicks "Upload Content"
2. Modal opens with:
   - File picker (drag-and-drop or browse)
   - Content Name field (auto-filled from filename)
   - Type selector (auto-detected from MIME type)
   - Category → Subject → Section cascade selectors
   - Optional: Description, Tags, Status (draft/published)
3. User clicks Upload
4. Frontend calls get-upload-url Edge Function
5. Edge Function validates: user's school_id matches selected school_id
6. Edge Function returns signed URL for Supabase Storage
7. Frontend uploads file directly to Storage
8. On upload success, frontend calls ContentService.create()
9. Content record created, audit logged, toast shown
10. Content Library refreshes
```

### 13.5 Content Access Control (Student)

Students access content through this chain only:
```
student.id
  → enrollments WHERE student_id = student.id AND status = 'active'
    → courses (school_id must match student.school_id)
      → course_modules
        → lessons (WHERE lesson.content_id = content.id)
          → content (accessible)
```

The RLS policy "Students can read enrolled lessons" in migration 00020 already enforces this correctly. The student portal UI must respect this chain and not attempt to render content outside enrolled courses.

### 13.6 Video Player Requirements

For v1.1, the video player must:
- Use a signed URL from Supabase Storage (not a Drive URL)
- Support standard HTML5 `<video>` element
- Track progress via `ProgressService.upsertProgress()` on `timeupdate` events (throttled to every 30 seconds)
- Mark lesson complete when 90% of video is watched OR user clicks "Mark Complete"
- Show resume position when re-opening a partially-watched video

### 13.7 Content Not in v1.1

Defer to v1.2:
- Google Drive direct content (Drive API required)
- External link content type (simple but low priority)
- Content versioning / replacement workflow
- Content comments / annotation


---

## 14. SCHOOL ARCHITECTURE

### 14.1 School as the Unit of Tenancy

A School is the primary unit of data ownership. Every entity created within a school belongs to that school and cannot cross school boundaries. This is enforced at three levels:
1. RLS policies (database layer)
2. Service methods (application layer)
3. UI context (routing layer — `currentSchoolId`)

### 14.2 School Dashboard (Operational, Not Statistical)

The current School Dashboard shows metrics. In v1.1, it should provide operational insights:

**Top Section:** Key metrics from `school_stats` materialized view
- Student count (active vs. total)
- Teacher count
- Counselor count
- Course count (published)
- Enrollment rate (enrolled students / total students)
- Avg course completion percentage

**Middle Section:** Action items requiring attention
- Students with no enrollments
- Courses with no students enrolled
- Assignments with no submissions (past due date)
- Pending content (status = 'review')
- Students with no progress in 7 days

**Bottom Section:** Recent activity timeline (from audit_logs WHERE school_id = ?)

> **Why this matters:** A school admin needs to know what needs attention today, not just how many items exist. Operational dashboards drive daily engagement. Metric dashboards are glanced at and ignored.

### 14.3 School Creation Flow (v1.1)

When a Super Admin creates a school, the following must happen atomically via `create-school-with-admin` Edge Function:
1. Insert school record
2. Create school admin auth user (via `supabase.auth.admin.inviteUserByEmail()`)
3. Set profile: `role = 'school_admin'`, `school_id = new school.id`
4. Log audit entry
5. Return success with school.id and admin user.id

If any step fails, the entire operation must roll back. Use a Postgres transaction in the Edge Function.

### 14.4 School Settings Screen (v1.1)

School Admins need per-school settings:

| Setting | Type | Default |
|---|---|---|
| School Display Name | text | school.name |
| Academic Year | text | current year |
| Board / Curriculum | select (CBSE, ICSE, State, International, Other) | — |
| Medium of Instruction | text | — |
| Timezone | select | Asia/Kolkata |
| Notification Email | email | admin.email |
| Drive Folder Root URL | url | linked via DriveService |
| Default Course Status | select (draft, published) | draft |
| Max Students per Course | number | unlimited |

Settings stored in `settings` table with `school_id` scoping (as per Section 10.1 migration).

### 14.5 Multi-School Super Admin Workflow

Super Admins manage schools from the HQ portal. When entering a school workspace:
1. Click "Manage" from schools list → navigates to school-dashboard
2. Super Admin banner appears: "SUPER ADMIN MODE — viewing [School Name]"
3. All school portal features available
4. "Exit Workspace" button returns to HQ portal

No impersonation of school admin user is needed. Super Admin accesses school data directly via RLS (`is_super_admin()` bypasses school_id check).

### 14.6 School Status Management

Schools can be: `active`, `inactive`, `suspended`

- `active` — normal operation
- `inactive` — school created but not yet operational (admin not yet onboarded)
- `suspended` — payment lapse or policy violation. All logins for that school's users should fail with a clear message. RLS should block all queries for suspended schools.

> **Engineering Note:** RLS should be updated to add a check: `select 1 from schools where id = school_id and status = 'active'` in school-scoped policies. This ensures suspended school data is inaccessible.


---

## 15. COUNSELOR ARCHITECTURE

### 15.1 Counselor Role Definition

Counselors are school-level staff who manage student welfare and progress. They are NOT course instructors. Their responsibilities:
- Monitor student progress across all enrolled courses
- Assign/reassign students to their caseload
- Communicate with students and parents
- Generate progress reports for assigned students
- Trigger notifications to students

### 15.2 Counselor Dashboard

```
Counselor Dashboard Layout:
├── Top Stats:
│     ├── Total Assigned Students
│     ├── Students with Recent Activity (last 7 days)
│     ├── Students with No Activity (last 7 days) — attention needed
│     └── Assignments Overdue (across assigned students)
│
├── Student Caseload Table:
│     ├── Student Name, Class, Email
│     ├── Courses Enrolled (count)
│     ├── Avg Progress % (across all courses)
│     ├── Last Activity Date
│     └── Actions: View Profile, Send Notification
│
└── Recent Activity Feed:
      (progress updates, assignment submissions from assigned students)
```

### 15.3 Counselor Routes (v1.1)

| Route | Screen | Description |
|---|---|---|
| `counselor-dashboard` | Counselor Home | Stats + student caseload overview |
| `counselor-students` | My Students | Full list with progress summary |
| `counselor-student-detail` | Student Profile | Full student profile + course progress |
| `counselor-reports` | Reports | Progress reports exportable as PDF |
| `counselor-notifications` | Notifications | System + manual notifications |
| `counselor-profile` | Profile | Personal profile management |

### 15.4 Counselor Data Access Rules

Counselors access ONLY students where `students.counselor_id = auth.uid()`.

> **Current RLS state:** Migration 00020 has `"Counselors can read assigned students"` on `students`, `profiles`, `student_progress`. This is correct and complete.

**What Counselors CANNOT do:**
- Create or delete courses
- Modify content
- Access school settings
- View other counselors' students
- See school-wide analytics (only their caseload)

### 15.5 Student Assignment to Counselors

School Admins assign students to counselors via `StudentService.update(studentId, { counselorId })`. This should be accessible from:
1. School Admin's Student Management screen — bulk assign via checkbox + dropdown
2. Individual student profile — "Assign to Counselor" dropdown

### 15.6 Counselor Creation

School Admins create counselors via the `invite-counselor` Edge Function (same pattern as `invite-teacher`). The created profile gets `role = 'counselor'` and `school_id` set.

Counselors appear in the School Admin's "Counselors" screen with:
- Name, Email, Status
- Assigned student count
- "Edit", "Reassign Students", "Remove" actions


---

## 16. STUDENT ARCHITECTURE

### 16.1 Student as a First-Class User

In v1.1, students must be able to log into a dedicated portal and access their courses. This requires:
1. A student record in the `students` table (created by school admin)
2. A profile in `auth.users` / `profiles` (created via invite, linked via `students.user_id`)
3. Active enrollments in `enrollments` table
4. Access to lessons via enrolled courses

### 16.2 Student Onboarding Flow

```
School Admin creates student:
  1. "Add Student" → enter name, email, class/section, assign counselor
  2. System calls invite-student Edge Function
  3. Edge Function creates auth user, sets profile.role = 'student'
  4. Sets student.user_id = new profile.id
  5. Sends invitation email with magic link to set password
  
Student receives email:
  1. Clicks link → sets password
  2. Logs in → lands on Student Dashboard
  3. Student sees assigned courses
```

### 16.3 Student Portal — Required Routes

| Route | Screen | Key Content |
|---|---|---|
| `student-dashboard` | My Dashboard | Active courses, recent progress, upcoming deadlines |
| `student-courses` | My Courses | All enrolled courses with progress % |
| `student-course-detail` | Course View | Module/lesson list, progress tracker |
| `student-lesson` | Lesson View | Video player / PDF viewer / content |
| `student-assignments` | Assignments | Pending, submitted, graded |
| `student-quizzes` | Quizzes | Available, in-progress, completed |
| `student-certificates` | Certificates | Earned certificates with download |
| `student-profile` | Profile | Personal info, change password |

### 16.4 Student Dashboard Design

```
Student Dashboard:
├── Welcome banner: "Hello [Name], keep up the great work!"
├── Progress Summary:
│     ├── Active Courses: N
│     ├── Lessons Completed this week: N
│     └── Overall Progress: XX%
│
├── My Active Courses (cards):
│     Each card shows:
│     - Course name, thumbnail
│     - Progress bar (% complete)
│     - "Continue" button → opens last incomplete lesson
│     - Next deadline (if assignment due)
│
└── Upcoming Deadlines (list):
      - Assignment name, course, due date
      - Quiz name, course, available until
```

### 16.5 Lesson Access Control

When a student opens a course:
1. Verify enrollment: `enrollments WHERE student_id = ? AND course_id = ? AND status = 'active'`
2. If not enrolled: show "You are not enrolled in this course" — do NOT show content
3. If enrolled: show modules and lessons
4. Lessons are unlocked sequentially by default (configurable per course in v1.2)

### 16.6 Progress Tracking Implementation

```javascript
// On video timeupdate (throttled to every 30s)
async function onVideoProgress(studentId, lessonId, currentTime, duration) {
  const percentage = (currentTime / duration) * 100;
  await ProgressService.upsertProgress(studentId, lessonId, {
    timeSpent: Math.floor(currentTime),
    resumePosition: Math.floor(currentTime),
    completed: percentage >= 90
  });
}
```

### 16.7 Assignment Submission Workflow

```
Student Flow:
1. Student sees assignment in course view
2. Clicks "Submit Assignment"
3. Uploads file OR writes text submission
4. Calls AssignmentService equivalent (create submission record in assignment_submissions)
5. Submission status = 'submitted'

Teacher/Counselor Flow:
1. Sees pending submissions in their view
2. Reviews, enters marks and remarks
3. Updates status to 'reviewed' or 'returned'
4. Student sees grade + remarks in their assignment view
```

### 16.8 Students Table Extended Fields (v1.1)

The `students` table currently has: `name`, `email`, `school_id`, `counselor_id`, `status`, `class`, `section`, `user_id`.

Add for v1.1:
```sql
alter table public.students
  add column if not exists phone text,
  add column if not exists parent_name text,
  add column if not exists parent_phone text,
  add column if not exists date_of_birth date,
  add column if not exists roll_number text,
  add column if not exists admission_date date;
```

These fields support operational school management without over-engineering a full SIS.


---

## 17. AUTHENTICATION STRATEGY

### 17.1 Current State

- `AuthService` is correctly wired to Supabase Auth
- `getProfile()` has a 30-second cache (correct)
- `signInWithEmail()`, `signInWithGoogle()`, `signOut()` are production-ready
- Demo mode bypasses Supabase entirely via `demo-integration.js` mock
- The `handle_new_user()` trigger auto-creates profiles on signup

### 17.2 Demo Mode Removal (Critical for Production)

The `VITE_DEMO_MODE` environment variable toggles between demo data and real Supabase. Removing demo mode for production is documented as `PI-04` in the Production Report. The strategy:

1. Set `VITE_DEMO_MODE=false` in Vercel production environment variables
2. Remove `src/demo/` directory from the production bundle (already tree-shaken when false)
3. Verify every screen that previously used `AppStorage.load()` for demo data now calls real Supabase services
4. Seed a real Super Admin account in Supabase

### 17.3 Login Screen Improvements

The current login screen shows Google OAuth and email/password equally. For v1.1:

**For Super Admin / Company Admin:** Google OAuth is the primary method. Email/password is hidden by default with a "Use email instead" toggle.

**For School Admin / Teacher / Counselor:** Email/password is the primary method (they received an invite). Google OAuth as an optional secondary (once they link their Google account — see Section 18).

**For Students:** Email/password only. Google OAuth is a future enhancement.

Implementation: The login screen should detect no active session and render the appropriate login form based on a URL parameter or subdomain pattern.

### 17.4 Session Restoration

On every page load:
```javascript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Show login screen
} else {
  const profile = await AuthService.getProfile();
  // Route to appropriate dashboard based on profile.role
}
```

This is already the pattern in `src/main.js`. It is correct.

### 17.5 Role-Based Routing After Login

| Role | Login Method | Redirects To |
|---|---|---|
| super_admin | Google OAuth | company-dashboard |
| company_admin | Google OAuth or Email | company-dashboard |
| school_admin | Email/Password | school-dashboard |
| teacher | Email/Password | school-dashboard (teacher view) |
| counselor | Email/Password | counselor-dashboard |
| student | Email/Password | student-dashboard |

### 17.6 Password Reset Flow

All roles can reset password via email:
1. "Forgot password?" link → calls `AuthService.sendPasswordResetEmail(email)`
2. Supabase sends reset email with magic link
3. User clicks link → redirect to app with `type=recovery` in URL hash
4. App detects recovery session → shows "Set New Password" form
5. Calls `supabase.auth.updateUser({ password: newPassword })`

This is already implemented at the service level (`sendPasswordResetEmail`). The UI needs a "recovery mode" form.

### 17.7 Email Verification

All invited users (school_admin, teacher, counselor, student) receive invite emails from Supabase. The invite flow auto-verifies the email. No separate email verification step needed.

### 17.8 First-User Super Admin Bootstrap

The `handle_new_user()` trigger sets `role = 'super_admin'` for the first user who signs up. This should be protected by a `super_admin_whitelist` table as described in `TECHNICAL_ARCHITECTURE.md`.

**Recommended addition:**
```sql
create table if not exists public.super_admin_whitelist (
  email text primary key
);

-- Insert your super admin email before first login
insert into public.super_admin_whitelist (email) values ('your-email@gmail.com');
```

Update `handle_new_user()` trigger to check this whitelist instead of "first user" logic, which is fragile.


---

## 18. GOOGLE ACCOUNT LINKING STRATEGY

### 18.1 The Business Requirement

Users (primarily school admins and teachers) are initially onboarded with email/password. After their first login, they should be able to connect their Google account so future logins can use Google OAuth ("Sign in with Google" instead of typing email/password).

### 18.2 How Supabase Handles Identity Linking

Supabase Auth supports linking multiple identity providers to a single user. The client call is:

```javascript
const { data, error } = await supabase.auth.linkIdentity({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/auth/callback?linking=true` }
});
```

This redirects the user to Google, they authenticate, and on return, the Google identity is linked to their existing Supabase account. Future logins with that Google account will resolve to the same profile.

### 18.3 UI Location

Place Google account linking in the user's Profile screen:

```
Profile Settings:
├── Personal Information (name, email)
├── Change Password
└── Connected Accounts:
      [Google] [Not Connected] [Connect Google Account →]
```

After linking:
```
      [Google] [Connected: user@gmail.com] [Disconnect]
```

### 18.4 Implementation Notes

- The user must be logged in before linking
- Linking requires a redirect flow (same as initial OAuth sign-in)
- After the redirect returns, detect `?linking=true` in the URL and show a success toast
- Disconnecting a Google identity requires the user to have a password set first (prevent account lockout)

### 18.5 Phase 2: Google as Primary Login

Once a user has linked Google, they should see "Continue with Google" prominently on the login screen. The system should detect this based on the email — if the email's identity has a Google provider linked, promote Google login.

This can be implemented in v1.2 after the linking flow is stable.

### 18.6 What This Does NOT Do

Linking a Google account does NOT:
- Grant Drive access on behalf of the user
- Enable Drive API calls using the user's personal Drive
- Change any school or content permissions

Drive integration uses a Service Account (server-side), not user OAuth tokens.

---

## 19. RBAC MATRIX

### 19.1 Current Roles (All Defined and Active)

| Role | Scope | Created By |
|---|---|---|
| `super_admin` | Platform-wide | Whitelist-based first signup |
| `company_admin` | Company-wide | Super Admin |
| `school_admin` | Single school | Super Admin or Company Admin |
| `teacher` | Single school | School Admin |
| `counselor` | Single school | School Admin |
| `student` | Single school (own records) | School Admin |

### 19.2 Feature Access Matrix

| Feature | super_admin | company_admin | school_admin | teacher | counselor | student |
|---|---|---|---|---|---|---|
| View all schools | ✅ | ✅ (own co.) | — | — | — | — |
| Create/edit school | ✅ | ✅ (own co.) | — | — | — | — |
| Delete school | ✅ | — | — | — | — | — |
| View school dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Manage categories | ✅ | ✅ | ✅ | — | — | — |
| Manage subjects | ✅ | ✅ | ✅ | — | — | — |
| Manage sections | ✅ | ✅ | ✅ | — | — | — |
| Upload content | ✅ | ✅ | ✅ | — | — | — |
| View content | ✅ | ✅ | ✅ | ✅ | — | enrolled |
| Create courses | ✅ | ✅ | ✅ | — | — | — |
| Publish courses | ✅ | ✅ | ✅ | — | — | — |
| Create modules/lessons | ✅ | ✅ | ✅ | ✅ | — | — |
| Enroll students | ✅ | ✅ | ✅ | — | ✅ (own) | — |
| View students | ✅ | ✅ | ✅ | ✅ (school) | ✅ (own) | own |
| Create/edit students | ✅ | ✅ | ✅ | — | ✅ (own) | — |
| Delete students | ✅ | ✅ | ✅ | — | — | — |
| Create teachers | ✅ | ✅ | ✅ | — | — | — |
| Create counselors | ✅ | ✅ | ✅ | — | — | — |
| View assignments | ✅ | ✅ | ✅ | ✅ | ✅ (own) | own |
| Grade assignments | ✅ | ✅ | ✅ | ✅ | — | — |
| Take quizzes | — | — | — | — | — | ✅ |
| View quiz results | ✅ | ✅ | ✅ | ✅ | ✅ (own) | own |
| View analytics | ✅ | ✅ | ✅ | ✅ (limited) | ✅ (own) | own |
| View audit log | ✅ | ✅ (own co.) | ✅ (own school) | — | — | — |
| Manage settings | ✅ (global) | ✅ (co.) | ✅ (school) | — | — | — |
| Manage permissions | ✅ | — | — | — | — | — |
| Manage Drive links | ✅ | ✅ | ✅ | — | — | — |
| View notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send notifications | ✅ | ✅ | ✅ | ✅ (own courses) | ✅ (own students) | — |
| View certificates | ✅ | ✅ | ✅ | ✅ | ✅ (own) | own |

### 19.3 RBAC Enforcement Points

1. **Database Layer (RLS):** Primary enforcement. Cannot be bypassed by client code.
2. **Service Layer:** Services operate under the authenticated user's JWT. They do not bypass RLS.
3. **UI Layer:** Sidebar items, buttons, and screens are conditionally rendered based on `profile.role`. UI enforcement is defense-in-depth only — never the only check.

### 19.4 UI Role Guards Pattern

```javascript
// Check role before rendering any admin action
function canManageContent(profile) {
  return ['super_admin', 'company_admin', 'school_admin'].includes(profile.role);
}

function canGradeAssignment(profile) {
  return ['super_admin', 'company_admin', 'school_admin', 'teacher'].includes(profile.role);
}
```

These helper functions should live in `AppUtils` and be used consistently across all screens.


---

## 20. DASHBOARD STRATEGY

### 20.1 Dashboard Design Principle

Every dashboard must answer three questions for its user:
1. **What is the current state?** (metrics)
2. **What needs attention?** (action items)
3. **What happened recently?** (activity)

Static metric cards without action items are glanceable but not useful for daily work.

### 20.2 Company / HQ Dashboard

**Audience:** super_admin, company_admin

**Data source:** Aggregate queries across all schools (for super_admin) or company's schools (for company_admin). Use `school_stats` materialized view for performance.

```
Sections:
1. Platform Overview (4 stat cards from school_stats)
   - Total Schools | Total Students | Total Courses | Total Content Items

2. School Health Table
   - School Name | Students | Active Courses | Last Activity
   - Status badge (active/suspended/inactive)
   - "Manage" button

3. Recent Platform Activity (audit_log last 20 entries, all schools)
```

### 20.3 School Admin Dashboard

**Audience:** school_admin

**Data source:** `school_stats` materialized view + recent audit_logs for that school.

```
Sections:
1. School Header (name, plan, status badge)

2. Key Metrics (6 cards):
   - Active Students | Teachers | Counselors
   - Published Courses | Content Items | Enrolled Students

3. Needs Attention Panel:
   - Students with no enrollments (count + link to fix)
   - Courses with no students (count + link to fix)
   - Assignments past due with no submissions (count)
   - Content in 'review' status (count + link)

4. Quick Actions Grid:
   - Add Student | Add Course | Upload Content
   - Assign Course | View Reports | Manage Drive

5. Recent Activity Timeline (last 15 events for this school)
```

### 20.4 Teacher Dashboard

**Audience:** teacher

**Data source:** Only courses where `courses.created_by = teacher.id` or explicitly assigned.

> **Note:** The data model doesn't currently have a `teacher_id` or `course_teachers` junction table. Add `created_by uuid references profiles(id)` to courses (already in CourseService). For explicit assignment, add a `course_teachers` table in v1.2.

```
Sections:
1. My Courses (cards): Course name, enrolled students, avg progress, pending submissions

2. Pending Grading:
   - Assignment submissions awaiting review
   - Quiz attempts awaiting manual grading (essay type)

3. Student Activity (for own courses):
   - Students with no recent activity
   - Recently completed lessons
```

### 20.5 Counselor Dashboard

**Audience:** counselor (see Section 15.2 for full design)

### 20.6 Student Dashboard

**Audience:** student (see Section 16.4 for full design)

### 20.7 Dashboard Data Performance

All dashboards must load in under 2 seconds. Strategy:
- School-level stats come from `school_stats` materialized view (instant read)
- "Needs Attention" queries are lightweight: `count()` queries with simple WHERE clauses
- Activity feeds are limited to 15-20 rows with index-backed queries
- No N+1 queries: batch-fetch related data in single queries


---

## 21. SEARCH STRATEGY

### 21.1 Search Types

| Type | Scope | Implementation |
|---|---|---|
| Entity search (within screen) | Current list only | Client-side filter on loaded data |
| School-scoped search | All entities in a school | Supabase `ilike` query |
| Global search (HQ) | All schools | Postgres full-text search (`tsvector`) |

### 21.2 Entity Search (Existing, Keep As-Is)

The current 250ms debounced search on each screen filters the current page's data. This works correctly for small lists. When pagination is added, entity search must shift to a server-side `ilike` query.

### 21.3 School-Scoped Search (v1.1)

The global search input in the school portal header should search across all school entities:

```javascript
async function searchSchool(schoolId, query) {
  const q = `%${query}%`;
  const [categories, subjects, sections, courses, content, students] = await Promise.all([
    supabase.from('categories').select('id, name').eq('school_id', schoolId).ilike('name', q).limit(5),
    supabase.from('subjects').select('id, name').eq('school_id', schoolId).ilike('name', q).limit(5),
    supabase.from('sections').select('id, name').eq('school_id', schoolId).ilike('name', q).limit(5),
    supabase.from('courses').select('id, name').eq('school_id', schoolId).ilike('name', q).limit(5),
    supabase.from('content').select('id, name, type').eq('school_id', schoolId).ilike('name', q).limit(5),
    supabase.from('students').select('id, name, email').eq('school_id', schoolId).ilike('name', q).limit(5),
  ]);
  
  return { categories, subjects, sections, courses, content, students };
}
```

Results shown in a dropdown below the search input, grouped by entity type.

### 21.4 Global Search (v1.1 via Full-Text Search)

For HQ-level search, use the `search_vector` columns added in migration 00021:

```javascript
async function globalSearch(query) {
  const tsQuery = query.split(' ').join(' & ');
  
  const [schools, courses, content] = await Promise.all([
    supabase.from('schools').select('id, name, code')
      .textSearch('search_vector', tsQuery).limit(5),
    supabase.from('courses').select('id, name, school_id')
      .textSearch('search_vector', tsQuery).limit(5),
    supabase.from('content').select('id, name, type, school_id')
      .textSearch('search_vector', tsQuery).limit(5),
  ]);
  
  return { schools, courses, content };
}
```

### 21.5 Search UX Requirements

- Search input responds after 300ms debounce
- Show spinner while results load
- Show "No results for '[query]'" when empty
- Results are clickable and navigate to the entity
- Keyboard navigation (arrow keys + enter) through results
- ESC closes the results dropdown

---

## 22. NOTIFICATION STRATEGY

### 22.1 Notification Data Model (Existing, Minor Extension Needed)

Current `notifications` table: `id`, `user_id`, `title`, `message`, `is_read`, `created_at`

Add for v1.1:
```sql
alter table public.notifications
  add column if not exists type text default 'info'
    check (type in ('info', 'success', 'warning', 'alert')),
  add column if not exists entity_type text,  -- 'course', 'assignment', 'student', etc.
  add column if not exists entity_id uuid,
  add column if not exists action_url text;   -- deep link to relevant screen
```

### 22.2 Notification Triggers (v1.1)

| Event | Recipient | Message |
|---|---|---|
| Student enrolled in course | Student | "You have been enrolled in [Course]" |
| Assignment due in 24h | Student | "[Assignment] is due tomorrow" |
| Assignment submitted | Teacher | "[Student] submitted [Assignment]" |
| Assignment graded | Student | "Your [Assignment] has been graded: [X/Y marks]" |
| Course published | Enrolled Students | "[Course] is now available" |
| Low progress alert | Counselor | "[Student] has no activity in [Course] for 7 days" |
| School created | School Admin | "Your school workspace is ready" |

### 22.3 Notification Delivery

For v1.1: in-app notifications only (bell icon with badge count).

Implementation:
- `NotificationService.getUnreadCount(userId)` — called on every route render (or polled every 30 seconds)
- Bell icon badge shows count
- Click bell → dropdown showing last 10 notifications
- "Mark all read" button
- Each notification links to relevant screen via `action_url`

For v1.2: Email notifications via Supabase Edge Function + SMTP (settings already exist in `SettingsService`).

### 22.4 Notification Bell Component

```javascript
// Minimal implementation for header
async function renderNotificationBell(userId) {
  const count = await NotificationService.getUnreadCount(userId);
  return `
    <button data-action="toggle-notifications" class="relative">
      <i class="fas fa-bell"></i>
      ${count > 0 ? `<span class="badge">${count > 99 ? '99+' : count}</span>` : ''}
    </button>
  `;
}
```

