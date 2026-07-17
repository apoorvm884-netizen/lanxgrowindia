# LANXGROW COS — Technical Architecture Specification
**Version 1.0**
**Date:** July 17, 2026

---

## 1. Current Frontend Status

### Implemented Screens

| Screen | Route | Role Access |
|--------|-------|-------------|
| Login | `(pre-auth)` | All |
| Company Dashboard | `company-dashboard` | Super Admin |
| Schools List | `schools` | Super Admin |
| School Dashboard | `school-dashboard` | Super Admin, School Admin |
| Categories (Explorer) | `school-categories` | Super Admin, School Admin |
| Subjects (Explorer) | `school-subjects` | Super Admin, School Admin |
| Sections (Explorer) | `school-sections` | Super Admin, School Admin |
| Content | `school-content` | Disabled (Coming Soon) |
| Analytics | `school-analytics` | Disabled (Coming Soon) |
| School Settings | `school-settings` | Disabled (Coming Soon) |

### Completed Modules

| Module | Namespace | Lines | Purpose |
|--------|-----------|-------|---------|
| Storage | `AppStorage` | 1065-1074 | Async localStorage wrapper with single key persistence |
| Auth | `AppAuth` | 1077-1105 | Session management via sessionStorage, role-based login |
| Utilities | `AppUtils` | 1108-1146 | ID generation, date formatting, initials, pluralization, counts |
| Toast | `AppToast` | 1354-1383 | Bottom-right toast stack with success/error types and undo |
| Modal | `AppModal` | 1386-1417 | Generic overlay modal with ESC close, backdrop close, auto-focus |
| Sidebar | `AppSidebar` | 1420-1484 | Dual-mode sidebar (Company items / School items) |
| Router | `AppRouter` | 1487-1909 | Client-side routing, skeleton loading, workspace rendering |
| Schools CRUD | `AppSchools` | 1912-2000 | List, search, filter, sort, paginate, create, edit, delete |
| Categories CRUD | `AppCategories` | 2003-2057 | Explorer-tree navigation, filter, CRUD |
| Subjects CRUD | `AppSubjects` | 2060-2125 | Explorer-tree filter-by-category, search, CRUD |
| Sections CRUD | `AppSections` | 2128-2190 | Explorer-tree filter-by-subject, search, CRUD |
| Event Delegation | `(click handler)` | 2280-2364 | Centralized click routing for all data-action attributes |
| Debounced Search | `(input handler)` | 2367-2372 | 250ms debounced search on all entity views |
| State Wrapper | `renderView()` | 1158-1175 | Loading/error/empty/data render pattern |
| Design System | `:root` + CSS | 10-760 | 100+ CSS custom properties, 34 component classes |

### Data Services

| Service | Namespace | Operations |
|---------|-----------|------------|
| **SchoolService** | 1178-1235 | `getAll()`, `getById()`, `save()`, `delete()`, `getEntityCounts()` |
| **CategoryService** | 1237-1272 | `getBySchool()`, `getById()`, `save()`, `delete()` |
| **SubjectService** | 1274-1312 | `getBySchool()`, `getByCategory()`, `getById()`, `save()`, `delete()` |
| **SectionService** | 1314-1351 | `getBySchool()`, `getBySubject()`, `getById()`, `save()`, `delete()` |

### Data Models

| Model | Fields | Line |
|-------|--------|------|
| **User** | id, email, password, name, role, schoolId (optional) | 1013-1017 |
| **School** | id, name, code, adminName, adminEmail, status, createdAt, updatedAt | 1020-1023 |
| **Category** | id, schoolId, name, updatedAt | 1026-1031 |
| **Subject** | id, schoolId, categoryId, name, updatedAt | 1034-1041 |
| **Section** | id, schoolId, subjectId, name, updatedAt | 1044-1049 |
| **Content** | id, schoolId, sectionId, name, type, duration, size, updatedAt | 1052-1059 |

### Navigation Flows

```
Login → Company Dashboard (super_admin) or School Dashboard (school_admin)

Company Dashboard → Schools List → School Dashboard → Categories / Subjects / Sections

School Dashboard → Categories (Explorer) → Subjects (Explorer per category)
School Dashboard → Subjects (Explorer)
School Dashboard → Sections (Explorer per subject)

Every screen supports: Breadcrumb navigation, Sidebar navigation, Search + Filter
```

---

## 2. Backend Readiness

| Frontend Module | Backend Required | Current State | Backend Priority |
|----------------|-----------------|---------------|------------------|
| Authentication | Yes | Mock Data (localStorage) | **High** |
| Company Dashboard | Yes | Mock Data | **High** |
| Schools Management | Yes | Mock Data | **High** |
| Categories Management | Yes | Mock Data | **High** |
| Subjects Management | Yes | Mock Data | **High** |
| Sections Management | Yes | Mock Data | **High** |
| Content Management | Yes | Mock Data | **Medium** |
| Video Player | Yes | Not Implemented | **Medium** |
| Analytics | Yes | Not Implemented | **Low** |
| Google Drive Integration | Yes | Not Implemented | **Medium** |
| School Settings | Yes | Not Implemented | **Low** |
| Company Settings | No | Not Implemented | **Low** |
| School Admins Management | Yes | Not Implemented | **Low** |
| Roles & Permissions | Yes | Not Implemented | **Low** |
| Notifications | Yes | Placeholder Only | **Low** |
| Dark Mode | No | Placeholder Only | **Low** |
| Global Search | Yes | Placeholder Only | **Low** |

---

## 3. Database Design

All tables use **UUID** primary keys (text format `usr_1`, `sch_1` etc. in mock data, migrating to `uuid` in production).

### `users`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK, default `gen_random_uuid()` |
| email | text | UNIQUE, NOT NULL |
| password_hash | text | NOT NULL |
| name | text | NOT NULL |
| role | text | NOT NULL, CHECK IN ('super_admin', 'school_admin') |
| school_id | uuid | FK → schools.id, NULLABLE (NULL = super_admin) |
| created_at | timestamptz | NOT NULL, default `now()` |
| updated_at | timestamptz | NOT NULL, default `now()` |

**Indexes:** `idx_users_email` UNIQUE on email, `idx_users_role` on role, `idx_users_school` on school_id  
**RLS:** Users can read own record. Super admins can read all. School admins can read users in their school only.

### `schools`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| name | text | NOT NULL |
| code | text | UNIQUE, NOT NULL |
| admin_name | text | NOT NULL |
| admin_email | text | NOT NULL |
| status | text | NOT NULL, CHECK IN ('active', 'suspended'), default 'active' |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** `idx_schools_code` UNIQUE on code, `idx_schools_status` on status  
**RLS:** Super admins: full access. School admins: read/update own school only.

### `categories`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| school_id | uuid | FK → schools.id, NOT NULL, ON DELETE CASCADE |
| name | text | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** `idx_categories_school` on school_id, UNIQUE(school_id, name)  
**RLS:** Users can only access categories belonging to their school.

### `subjects`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| school_id | uuid | FK → schools.id, NOT NULL, ON DELETE CASCADE |
| category_id | uuid | FK → categories.id, NOT NULL, ON DELETE CASCADE |
| name | text | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** `idx_subjects_school` on school_id, `idx_subjects_category` on category_id, UNIQUE(category_id, name)  
**RLS:** Users can only access subjects in their school.

### `sections`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| school_id | uuid | FK → schools.id, NOT NULL, ON DELETE CASCADE |
| subject_id | uuid | FK → subjects.id, NOT NULL, ON DELETE CASCADE |
| name | text | NOT NULL |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** `idx_sections_school` on school_id, `idx_sections_subject` on subject_id, UNIQUE(subject_id, name)  
**RLS:** Users can only access sections in their school.

### `content`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| school_id | uuid | FK → schools.id, NOT NULL, ON DELETE CASCADE |
| section_id | uuid | FK → sections.id, NOT NULL, ON DELETE CASCADE |
| name | text | NOT NULL |
| type | text | NOT NULL, CHECK IN ('Video', 'PDF', 'Notes', 'PPT', 'Image') |
| drive_file_id | text | NULLABLE (Google Drive file ID) |
| drive_folder_id | text | NULLABLE (Google Drive parent folder ID) |
| duration | text | NULLABLE (for video/audio: "12:34" format) |
| size | text | NULLABLE (human-readable: "145 MB") |
| size_bytes | bigint | NULLABLE (for sorting/filtering) |
| mime_type | text | NULLABLE |
| thumbnail_url | text | NULLABLE |
| metadata | jsonb | NULLABLE (extensible: resolution, page count, etc.) |
| created_at | timestamptz | NOT NULL |
| updated_at | timestamptz | NOT NULL |

**Indexes:** `idx_content_school` on school_id, `idx_content_section` on section_id, `idx_content_type` on type, `idx_content_section_type` on (section_id, type)  
**RLS:** Users can only access content in their school.

### `drive_folders`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| school_id | uuid | FK → schools.id, NOT NULL, ON DELETE CASCADE |
| category_id | uuid | FK → categories.id, NULLABLE |
| subject_id | uuid | FK → subjects.id, NULLABLE |
| section_id | uuid | FK → sections.id, NULLABLE |
| drive_folder_id | text | NOT NULL UNIQUE (Google Drive folder ID) |
| path | text | NOT NULL (human-readable path) |
| created_at | timestamptz | NOT NULL |

**Indexes:** `idx_drive_folders_school` on school_id, UNIQUE on drive_folder_id  
**RLS:** Users can only access folders in their school.

### `sessions`

| Field | Type | Constraints |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → users.id, NOT NULL, ON DELETE CASCADE |
| token | text | UNIQUE, NOT NULL |
| expires_at | timestamptz | NOT NULL |
| created_at | timestamptz | NOT NULL |

**Indexes:** `idx_sessions_token` UNIQUE on token, `idx_sessions_user` on user_id, `idx_sessions_expires` on expires_at  
**RLS:** Users can only read/delete own sessions.

---

## 4. API Design

### Authentication API

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| Login | POST | `/auth/login` | None |
| Logout | POST | `/auth/logout` | Bearer |
| Get Session | GET | `/auth/session` | Bearer |
| Verify Email | POST | `/auth/verify-email` | None (token) |
| Reset Password | POST | `/auth/reset-password` | None |
| Change Password | POST | `/auth/change-password` | Bearer |

### Schools API

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| List Schools | GET | `/schools` | Super Admin |
| Get School | GET | `/schools/:id` | Super Admin, School Admin |
| Create School | POST | `/schools` | Super Admin |
| Update School | PUT | `/schools/:id` | Super Admin, School Admin |
| Delete School | DELETE | `/schools/:id` | Super Admin |
| Search Schools | GET | `/schools?q=term` | Super Admin |
| Get School Stats | GET | `/schools/:id/stats` | Super Admin, School Admin |

### Categories API

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| List Categories | GET | `/schools/:schoolId/categories` | School-scoped |
| Get Category | GET | `/categories/:id` | School-scoped |
| Create Category | POST | `/categories` | School-scoped |
| Update Category | PUT | `/categories/:id` | School-scoped |
| Delete Category | DELETE | `/categories/:id` | School-scoped (cascades) |
| Search Categories | GET | `/categories?q=term` | School-scoped |

### Subjects API

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| List Subjects | GET | `/categories/:categoryId/subjects` | School-scoped |
| Get Subject | GET | `/subjects/:id` | School-scoped |
| Create Subject | POST | `/subjects` | School-scoped |
| Update Subject | PUT | `/subjects/:id` | School-scoped |
| Delete Subject | DELETE | `/subjects/:id` | School-scoped (cascades) |
| Search Subjects | GET | `/subjects?q=term` | School-scoped |

### Sections API

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| List Sections | GET | `/subjects/:subjectId/sections` | School-scoped |
| Get Section | GET | `/sections/:id` | School-scoped |
| Create Section | POST | `/sections` | School-scoped |
| Update Section | PUT | `/sections/:id` | School-scoped |
| Delete Section | DELETE | `/sections/:id` | School-scoped (cascades) |
| Search Sections | GET | `/sections?q=term` | School-scoped |

### Content API

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| List Content | GET | `/sections/:sectionId/content` | School-scoped |
| Get Content | GET | `/content/:id` | School-scoped |
| Upload Content | POST | `/content` | School-scoped |
| Update Content | PUT | `/content/:id` | School-scoped |
| Delete Content | DELETE | `/content/:id` | School-scoped |
| Search Content | GET | `/content?q=term` | School-scoped |
| Stream Video | GET | `/content/:id/stream` | School-scoped |
| Get Upload URL | POST | `/content/upload-url` | School-scoped |

### Google Drive API (Server-side)

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| Create Folder Structure | POST | `/drive/setup-school/:schoolId` | Super Admin |
| Sync Metadata | POST | `/drive/sync/:contentId` | School-scoped |
| Get Streaming URL | GET | `/drive/stream/:fileId` | School-scoped |
| Delete File | DELETE | `/drive/files/:fileId` | School-scoped |

### Common Behaviors

| Concern | Implementation |
|---------|---------------|
| **Pagination** | Query params: `?page=1&per_page=20`. Response includes `{ data, total, page, per_page, total_pages }` |
| **Sorting** | Query params: `?sort=name&order=asc` |
| **Filtering** | Query params: `?status=active&type=Video` |
| **Search** | Query param: `?q=term` (searches name field) |
| **Validation** | 422 with `{ error: string, fields: { field: [messages] } }` |
| **Authorization** | RLS at database level + middleware at API level. Duplicate enforcement. |
| **Response Format** | Success: `{ data }`, List: `{ data, meta: { total, page, per_page } }` |

---

## 5. Authentication

### Primary Provider

**Supabase Auth** — sole identity provider. No Firebase Authentication layer is used.

### Supported Login Methods

| Method | Users | Details |
|--------|-------|---------|
| Google Sign-In (OAuth) | Super Admin, School Admin (optional) | Supabase built-in OAuth provider. Redirect-based flow. |
| Email + Password | School Admin | Used by invited admins who set their own password. |
| Password Reset | All | Supabase built-in email-based reset flow. |
| Email Verification | All | Supabase built-in. Required before first login. |
| Invite School Admin | Super Admin only | Creates user with unverified email, sends password-set email. |
| Session Management | All | Supabase JS client handles token storage, refresh, expiry. |

### User Flows

```
Super Admin:
  → Clicks "Continue with Google"
  → Supabase Google OAuth redirect flow
  → On first login: Supabase Auth trigger sets app_metadata.role = 'super_admin'
  → On return: session restored, routed to Company Dashboard

School Admin (Invited):
  → Super Admin creates school → triggers invite email to adminEmail
  → Email contains magic link to set password
  → Click link → set password → email auto-verified
  → Login with email + password
  → Future: Google Sign-In can be enabled per school
```

### Architecture

```
Login Flow (Email/Password):
  User → Login Form → supabase.auth.signInWithPassword({ email, password })
    → On success: Supabase returns session + JWT
    → JWT contains app_metadata including role and school_id
    → Session stored in localStorage (Supabase client handles this)
    → Frontend reads user from supabase.auth.getUser()

Login Flow (Google OAuth):
  User → "Continue with Google" → supabase.auth.signInWithOAuth({ provider: 'google' })
    → Redirect to Google consent screen
    → On success: redirect back to LANXGROW with session
    → Supabase Auth trigger sets app_metadata.role based on email domain/whitelist
    → Same session handling from here

Session Lifecycle:
  supabase.auth.getSession() on page load
    → If session exists: restore, fetch user, navigate to dashboard
    → If no session: show login screen
  Token refresh: handled automatically by Supabase JS client
    → Access token: 1 hour
    → Refresh token: auto-refreshed before expiry
  On logout: supabase.auth.signOut(), clear local state, redirect to login

Role Assignment:
  Super Admin: assigned via Supabase Auth trigger on sign-up
    → Trigger checks if email is in super_admin_whitelist table
    → Sets app_metadata.role = 'super_admin'
    → No app_metadata.school_id (NULL = global access)

  School Admin: assigned when Super Admin creates school
    → Backend calls supabase.auth.admin.createUser() with email
    → Sets app_metadata.role = 'school_admin'
    → Sets app_metadata.school_id = school.id
    → Sends invite email via Supabase built-in email template
    → Recipient sets password, email is auto-verified

Role Enforcement:
  JWT custom claims: app_metadata.role, app_metadata.school_id
  RLS policies use these claims to scope all queries at database level
  API middleware validates claims on every authenticated request
  Frontend reads role from session user for UI routing decisions
```

### Roles

| Role | Permissions | Scope | Login Method |
|------|-------------|-------|-------------|
| `super_admin` | Full CRUD on all schools, all entities, manage users | Global | Google OAuth only |
| `school_admin` | CRUD on own school's categories, subjects, sections, content | Single school | Invite + email/password (Google OAuth optional) |

**Future Roles (not in MVP):**
- `content_manager` — upload/manage content only, no school settings
- `viewer` — read-only access to assigned school
- `teacher` — view sections/content, no management

### Route Protection

Protected at three layers:

1. **Frontend Router** — `AppRouter` checks `AppAuth.getUser()` before rendering any screen. Unauthenticated users see login screen only.
2. **API Middleware** — Every API endpoint validates the JWT and checks role/school_id from claims.
3. **Supabase RLS** — Row-level security policies enforce access at the database level as the final gate.

### Database Tables for Auth

| Table | Purpose |
|-------|---------|
| `super_admin_whitelist` | Email addresses allowed to sign up as super_admin via Google OAuth. Populated manually during setup. |
| `auth.users` | Managed entirely by Supabase Auth. Never written to directly. |
| `public.users` (synced) | Database trigger on `auth.users` insert copies id, email, name, role, school_id to public.users for RLS-friendly joins. |

---

## 6. Google Drive Integration

### Folder Architecture

```
School Name/
├── Categories/
│   ├── Class 11/
│   │   ├── Physics/
│   │   │   ├── Electromagnetic Induction/
│   │   │   │   ├── video_1.mp4
│   │   │   │   └── notes_1.pdf
│   │   │   └── Thermodynamics/
│   │   └── Chemistry/
│   │       └── Organic Chemistry/
│   └── Class 12/
└── _archive/ (deleted/replaced files moved here)
```

### Video Organization

Each school gets a root folder named `[School Name] - [School Code]`. Within it:
- `Categories/` — mirrors the School's category/subject/section tree
- `_archive/` — holds replaced/deleted files for 30 days before permanent deletion

Folder creation happens automatically when a Category, Subject, or Section is created via the API.

### Metadata Synchronization

- On content upload, the following metadata is extracted and stored in the `content` table:
  - `drive_file_id` (Google Drive file ID)
  - `drive_folder_id` (parent folder ID)
  - `size_bytes`
  - `mime_type`
  - `thumbnail_url` (auto-generated thumbnail for videos)
- Metadata is synced on upload and on explicit "Sync" action (for detecting external changes)

### Streaming Workflow

```
Frontend requests /content/:id/stream
  → Backend validates access (RLS)
  → Backend generates a signed URL from Google Drive API (1 hour expiry)
  → Frontend uses signed URL as video source (<video> element)
  → No video data is stored on application servers
```

### Upload Workflow

```
User clicks "Upload" in Content section
  → Frontend requests upload URL from /drive/upload-url
  → Backend creates/resolves folder path, returns signed upload URL
  → Frontend uploads directly to Google Drive (no server intermediary)
  → On success, frontend calls POST /content with drive_file_id, metadata
  → Backend inserts content record, creates thumbnail if video
```

### Replacement Workflow

```
User replaces a video file
  → New file uploaded to same folder as original
  → Old file moved to _archive/ folder (not deleted immediately)
  → Content record updated with new drive_file_id
  → Previous version metadata preserved in content.history (jsonb)
```

### Deletion Workflow

```
User deletes content
  → Content record soft-deleted (deleted_at set)
  → File moved to _archive/ immediate
  → After 30 days: permanent deletion from Drive + hard delete from DB
  → Undo available within the soft-delete window (30 days)
```

### Caching Strategy

| Layer | Strategy | TTL |
|-------|----------|-----|
| Drive signed URLs | Generated on-demand, cached in memory | 55 min (regenerated before 1h expiry) |
| Thumbnails | CDN (Cloudinary or similar) | Permanent until replaced |
| File metadata | Cached in application DB (content table) | Updated on upload/sync |
| Folder tree | Cached in drive_folders table | Created on entity creation, invalidated on rename/delete |

---

## 7. Supabase Responsibilities

| Service | What Supabase Manages |
|---------|----------------------|
| **Database** | All 7 tables (users, schools, categories, subjects, sections, content, drive_folders). Postgres with all constraints, indexes, and relationships. |
| **Authentication** | Email/password login, session management, JWT generation, email verification, password reset. Supabase Auth replaces the need for Firebase Auth entirely. |
| **Storage** | NOT used for file storage. Google Drive is the file system. Supabase Storage may be used for application assets (logos, thumbnails) in post-MVP. |
| **Realtime** | NOT used in MVP. Post-MVP: push notifications, live collaboration on content metadata. |
| **Row-Level Security** | All 7 tables have RLS policies that enforce school-scoped access using `auth.jwt() -> app_metadata`. Super admin policy bypasses RLS via `auth.role() = 'super_admin'`. |
| **Database Functions** | `generate_folder_path(entity_type, entity_id)` — computes Google Drive folder path from entity hierarchy. `cleanup_archived_content()` — cron job that permanently deletes content older than 30 days. |
| **Database Triggers** | `after_insert_category` → calls edge function to create Drive folder. `after_insert_subject` → calls edge function to create Drive folder. `after_insert_section` → calls edge function to create Drive folder. `after_delete_entity` → moves Drive files to _archive. |

### Supabase Project Configuration

- Project: `lanxgrow-cos-prod` (production), `lanxgrow-cos-staging` (staging)
- Region: `us-east-1` (or closest to primary user base)
- PgBouncer: Enabled (serverless connection pooling)
- SSL: Enforced
- Backups: Daily with 7-day retention (PITR for production)
- Branching: Enabled for staging/preview deploys

---

## 8. Firebase Responsibilities

**Not used.** The architecture has been consolidated to use **Supabase Auth** for all authentication needs. This eliminates the operational complexity of managing two backend services for identity.

If a future requirement arises (e.g., push notifications via Firebase Cloud Messaging), Firebase can be introduced as a single-purpose addition. This decision is deferred until post-MVP.

---

## 9. Service Layer Mapping

| Frontend Service | Current Backend | Future Backend | UI Changes Required |
|-----------------|----------------|----------------|-------------------|
| `SchoolService` | Mock Data (localStorage) | Supabase REST API | None |
| `CategoryService` | Mock Data (localStorage) | Supabase REST API | None |
| `SubjectService` | Mock Data (localStorage) | Supabase REST API | None |
| `SectionService` | Mock Data (localStorage) | Supabase REST API | None |
| Content Service | Not implemented | Supabase REST API + Google Drive | New service to write |
| `AppAuth.login()` | Mock (localStorage lookup) | Supabase Auth `signInWithPassword()` | Replace implementation only |
| `AppAuth.logout()` | Clear sessionStorage | Supabase Auth `signOut()` | Replace implementation only |
| `AppAuth.isAuthenticated()` | Check sessionStorage | `supabase.auth.getSession()` | Replace implementation only |

### Service Migration Pattern

Each service migrates independently. The pattern is:

```javascript
// Current: localStorage
SchoolService = {
  async getAll() {
    const data = await AppStorage.load();
    return data.schools;
  },
};

// Future: Supabase
SchoolService = {
  async getAll() {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },
};
```

No UI module (`AppSchools`, `AppCategories`, etc.) changes when a service migrates — the async interface is identical.

---

## 10. Feature Synchronization Matrix

| Feature | Frontend Status | Backend Status | Database Ready | API Ready | Auth Ready | Drive Ready | Production Ready |
|---------|----------------|----------------|---------------|-----------|-----------|-------------|-----------------|
| Login/Auth | ✅ Complete | ❌ Mock | Table designed | Endpoints designed | Supabase Auth configured | N/A | ❌ |
| Company Dashboard | ✅ Complete | ❌ Mock | Data exists | Endpoints designed | Via Supabase | N/A | ❌ |
| Schools CRUD | ✅ Complete | ❌ Mock | Table designed | Endpoints designed | Via RLS | N/A | ❌ |
| Categories CRUD | ✅ Complete | ❌ Mock | Table designed | Endpoints designed | Via RLS | Auto-folder creation | ❌ |
| Subjects CRUD | ✅ Complete | ❌ Mock | Table designed | Endpoints designed | Via RLS | Auto-folder creation | ❌ |
| Sections CRUD | ✅ Complete | ❌ Mock | Table designed | Endpoints designed | Via RLS | Auto-folder creation | ❌ |
| Content CRUD | ⚠️ Not implemented | ❌ Mock data only | Table designed | Endpoints designed | Via RLS | Full integration needed | ❌ |
| Video Upload | ❌ Not implemented | ❌ Not implemented | N/A | Endpoints designed | Via RLS | Upload workflow | ❌ |
| Video Streaming | ❌ Not implemented | ❌ Not implemented | N/A | Endpoints designed | Via signed URLs | Streaming workflow | ❌ |
| Google Drive Sync | ❌ Not implemented | ❌ Not implemented | Table designed | Endpoints designed | Service account | Core feature | ❌ |
| Analytics | ❌ Not implemented | ❌ Not implemented | No table | Not designed | Via RLS | N/A | ❌ |
| Search (entity) | ✅ Complete | ❌ Mock | Indexed | Endpoints designed | Via RLS | N/A | ❌ |
| Global Search | ❌ Placeholder | ❌ Not implemented | No table | Not designed | Via RLS | N/A | ❌ |
| Notifications | ❌ Placeholder | ❌ Not implemented | No table | Not designed | Via Supabase Realtime | N/A | ❌ |
| Dark Mode | ❌ Placeholder | N/A | N/A | N/A | N/A | N/A | ❌ |
| School Admins | ❌ Not implemented | ❌ Not implemented | Via users table | Endpoints designed | Via RLS | N/A | ❌ |
| Roles & Permissions | ❌ Not implemented | ❌ Not implemented | Via users.role | Not designed | Via RLS + app_metadata | N/A | ❌ |
| Design System | ✅ Complete | N/A | N/A | N/A | N/A | N/A | ✅ |

---

## 11. Missing Engineering Work

### Priority: High (Blocking MVP)

| # | Missing Item | Effort | Depends On |
|---|-------------|--------|-----------|
| H1 | Supabase project setup (DB, Auth, RLS, OAuth providers) | 2 days | Nothing |
| H2 | Google OAuth config (Supabase + Google Cloud Console) | 1 day | H1 |
| H3 | Auth migration — replace mock AppAuth with Supabase Auth client | 2 days | H1 |
| H4 | Super Admin whitelist + Auth trigger (role assignment on sign-up) | 1 day | H1 |
| H5 | School admin invite flow (admin.createUser + email template) | 2 days | H3 |
| H6 | SchoolService migration — Mock → Supabase queries | 1 day | H1 |
| H7 | CategoryService migration — Mock → Supabase queries | 1 day | H1 |
| H8 | SubjectService migration — Mock → Supabase queries | 1 day | H1 |
| H9 | SectionService migration — Mock → Supabase queries | 1 day | H1 |
| H10 | Google Drive service account setup + API enablement | 2 days | Nothing |
| H11 | Folder auto-creation on entity create (edge functions) | 3 days | H1, H10 |
| H12 | Content CRUD module (frontend) | 3 days | Nothing |
| H13 | ContentService (Supabase + Drive integration) | 3 days | H1, H10 |

### Priority: Medium

| # | Missing Item | Effort | Depends On |
|---|-------------|--------|-----------|
| M1 | Video upload workflow (frontend → signed URL → Drive) | 3 days | H10, H12 |
| M2 | Video streaming workflow (signed URL generation) | 2 days | H10 |
| M3 | Content metadata extraction (thumbnails, size, duration) | 2 days | H10 |
| M4 | Soft-delete + archive workflow | 2 days | H1 |
| M5 | Admin user creation on school creation (edge function) | 1 day | H1 |
| M6 | Pagination/sorting/filtering API (backend) | 2 days | H1 |
| M7 | RLS policy creation for all tables | 2 days | H1 |
| M8 | Seed data migration for testing | 1 day | H1 |

### Priority: Low

| # | Missing Item | Effort | Depends On |
|---|-------------|--------|-----------|
| L1 | Analytics backend (materialized views or aggregations) | 3 days | H1 |
| L2 | Global search (Postgres full-text search) | 3 days | H1 |
| L3 | Notifications (Supabase Realtime) | 3 days | H1 |
| L4 | Dark mode CSS | 1 day | Nothing |
| L5 | School Admin management screen | 2 days | H1 |
| L6 | Roles & Permissions system | 3 days | H5 |
| L7 | Company Settings screen | 2 days | Nothing |
| L8 | 30-day cleanup cron job | 1 day | H1 |

---

## 12. Recommended Build Order

### Phase 1: Foundation (Week 1)

**Order:** H1 → H2 → H3 → H4 → H5 → H6 → H7 → H8 → H9

**Parallel:** H10 (Google Drive setup) runs independently alongside H3-H9.

**Rationale:**
- Supabase project (H1) is the foundation — nothing works without it
- Google OAuth config (H2) and Auth migration (H3) are the first auth priorities — Super Admin login via Google must work before anything else can be tested
- Super Admin whitelist + trigger (H4) ensures role is assigned correctly on first Google login
- School admin invite flow (H5) is needed before school admins can log in
- Service migrations (H6-H9) are the simplest coding tasks: replace `AppStorage.load()` with `supabase.from().select()` — pure data access layer, no UI changes, no business logic changes
- Google Drive setup (H10) has no dependencies and runs in parallel with the service migrations

**Verification at end of Phase 1:**
- Super Admin can sign in with Google OAuth
- Super Admin can create a school, which triggers invite to school admin
- School Admin receives email, sets password, logs in with email + password
- Both roles can see their correct dashboard and data from Supabase DB
- All CRUD operations persist to Supabase

### Phase 2: Content + Drive (Week 2)

**Order:** H12 → H11 → H13

**Rationale:**
- Content CRUD frontend (H12) can be built without any backend — use mock data as the current architecture does
- Folder auto-creation (H11) is needed before uploads work — create Drive folders when entities are created
- ContentService (H13) ties everything together: upload file → save metadata → return to UI

**Verification at end of Phase 2:**
- User can upload a file to a section
- File appears in Google Drive in the correct folder
- File metadata is stored in Supabase
- Content can be listed, searched, and deleted

### Phase 3: Video + Polish (Week 3)

**Order:** M1 → M2 → M3 → M6 → M7

**Rationale:**
- Video upload (M1) is the most important content type — educational platform without video is incomplete
- Streaming (M2) enables playback
- Metadata extraction (M3) improves the content list view
- Pagination/filtering (M6) is needed for production-scale data
- RLS (M7) is deferred to Phase 3 because it needs all tables and all operations defined — but must be in place before any production data is stored

**Verification at end of Phase 3:**
- User can upload and play videos
- Content lists paginate correctly
- School admin cannot access another school's data
- Super admin can access all data

### Phase 4: MVP Launch (Week 4)

**Order:** M4 → M5 → M8

**Rationale:**
- Soft-delete (M4) must be in place before real users start deleting content
- Admin creation (M5) is needed for the school creation flow
- Seed data (M8) is the final step before inviting real users

---

## 13. Risks

### Migration Risk: localStorage → Supabase

**Risk:** `AppStorage.load()` reads ALL data at once. Supabase queries read individual entities. Any UI code that assumes all data is available in a single object will break.

**Mitigation:**
- Audit every `AppStorage.load()` call. There are exactly 6 services that call it. Each one already filters by type (`data.schools`, `data.categories`, etc.).
- The migration replaces `AppStorage.load()` → `supabase.from().select()` at the service layer only.
- Test each service independently before moving to the next.
- The `renderView()` state wrapper already handles loading/error states — no additional error handling needed at the UI level.

### Scalability Risk: Single-File Frontend

**Risk:** The current single `index.html` is 2448 lines. As Content module, Analytics, and admin screens are added, it could grow to 5000+ lines, becoming unmaintainable.

**Mitigation:**
- Do NOT split the file preemptively. The single-file architecture is an intentional choice for deployability (upload one file).
- Extract CSS to a separate file when the CSS exceeds 1000 lines (currently ~760).
- Extract JS modules to separate files using ES modules when the JS exceeds 2000 lines (currently ~1400).
- Use a build step (esbuild or similar) to bundle into single file for deployment.
- This is a post-MVP concern.

### Security Risk: Google Drive Direct Upload

**Risk:** Frontend uploads directly to Google Drive via signed URLs. If a signed URL is leaked, anyone can upload files to the school's Drive folder.

**Mitigation:**
- Signed URLs expire in 15 minutes (upload window only).
- Signed URLs are scoped to a specific folder path — cannot upload outside it.
- File type validation happens on the backend before the signed URL is issued.
- Size limits enforced at signed URL generation time.
- All Drive operations are logged with user_id, timestamp, and file_id.

### Performance Risk: N+1 Queries

**Risk:** The Schools list page currently calls `getEntityCounts()` for each school in a loop. If migrated naively, this becomes N+1 Supabase queries.

**Mitigation:**
- Replace per-school count queries with aggregated queries:
  ```sql
  SELECT school_id, COUNT(*) as count
  FROM categories
  WHERE school_id = ANY($1)
  GROUP BY school_id;
  ```
- The same pattern applies to subjects, sections, and content counts.
- Frontend already handles the pattern in `AppSchools.renderPage()` which calls `getEntityCounts()` per school — the service migration can batch these without UI changes.

### Security Risk: RLS Bypass

**Risk:** RLS policies on the `schools`, `categories`, `subjects`, and `sections` tables rely on `auth.jwt() -> app_metadata.school_id`. If the JWT claim is missing or incorrectly set, a user could access another school's data.

**Mitigation:**
- Set `app_metadata` during sign-up via a Supabase Database Function (triggered on user insert) — never from the client.
- Add a CHECK constraint on every table: `school_id = auth.jwt() -> app_metadata.school_id`.
- Super admin bypass uses `auth.role() = 'service_role'` in RLS policy — only callable from server-side, never from the client.
- Test RLS policies with explicit positive and negative test cases before any production deployment.

### Performance Risk: Video Streaming Latency

**Risk:** Streaming video through Google Drive signed URLs may have higher latency than a purpose-built video CDN.

**Mitigation:**
- For MVP, signed URLs are acceptable (Google Drive serves files efficiently).
- If latency becomes an issue in user testing, introduce a CDN layer (Cloudflare Stream, Mux, or Cloudinary) between Drive and the user.
- The architecture supports this swap without frontend changes because the streaming endpoint returns a URL — swap Drive URL for CDN URL at the backend.

---

## 14. Definition of MVP Complete

LANXGROW COS is considered **production-ready** when ALL of the following are true:

### Authentication
- [ ] Super Admin can sign in with Google OAuth
- [ ] Super Admin is automatically assigned `super_admin` role on first Google sign-in (via Auth trigger + whitelist)
- [ ] Super Admin can create a school, which triggers an invite email to the school admin
- [ ] School Admin receives invite email, clicks link, sets password
- [ ] School Admin can log in with email + password
- [ ] Email verification is enforced before first login
- [ ] Any user can reset their password via email
- [ ] Sessions persist across page refreshes (Supabase auto-restore)
- [ ] Session expires and redirects to login
- [ ] Role-based access enforced: school admin cannot access other schools
- [ ] Route protection at frontend, API middleware, and database RLS layers

### Schools
- [ ] Super Admin can create a school (which auto-creates a school admin user)
- [ ] Super Admin can view all schools with search, filter, sort, pagination
- [ ] Super Admin can edit school details
- [ ] Super Admin can delete a school (cascades to all data)
- [ ] School Admin can view and edit their own school

### Categories
- [ ] School Admin can create, edit, delete categories
- [ ] Categories are scoped to the school
- [ ] Deleting a category cascades to its subjects, sections, and content
- [ ] Google Drive folder is auto-created when a category is created

### Subjects
- [ ] School Admin can create, edit, delete subjects within a category
- [ ] Subjects are scoped to the school
- [ ] Deleting a subject cascades to its sections and content
- [ ] Google Drive subfolder is auto-created when a subject is created

### Sections
- [ ] School Admin can create, edit, delete sections within a subject
- [ ] Sections are scoped to the school
- [ ] Deleting a section cascades to its content
- [ ] Google Drive subfolder is auto-created when a section is created

### Content
- [ ] School Admin can upload files (video, PDF, notes, PPT, image) to a section
- [ ] Files are stored in Google Drive in the correct folder path
- [ ] Files are streamable (for video) or downloadable (for other types)
- [ ] Content metadata (name, type, size, duration) is displayed correctly
- [ ] School Admin can delete content (soft-delete with 30-day undo window)
- [ ] Content list supports search and pagination

### Google Drive
- [ ] Folder hierarchy auto-creates and mirrors the Category → Subject → Section tree
- [ ] Deleted/archived files move to `_archive/` within the school's Drive folder
- [ ] 30-day cleanup cron permanently deletes archived content
- [ ] File replacement preserves previous version in archive

### Infrastructure
- [ ] Supabase project is configured with all tables, indexes, and RLS policies
- [ ] Database migrations are automated (not manually applied)
- [ ] Backups are configured and verified
- [ ] SSL is enforced on all connections
- [ ] Error monitoring is in place (Supabase logs + optional Sentry)
- [ ] Performance: all list pages load in under 2 seconds with 1000+ records

### Non-Goals for MVP (explicitly out of scope)
- Analytics dashboard
- Global search
- Notifications
- Dark mode
- School Admin management screen (beyond creation)
- Roles & permissions management
- Company settings
- Real-time collaboration
- Multi-language support

---

*End of Technical Architecture Specification*
