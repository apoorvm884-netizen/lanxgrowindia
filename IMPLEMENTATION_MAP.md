# LANXGROW COS — Master Implementation Map

> **Target:** OpenCode / DeepSeek V4 Flash AI coding agent
> **Objective:** Implement the Stitch frontend UI connected to existing backend
> **Architecture:** Vanilla JS + Vite + Supabase + Service Layer
> **Design:** Stitch UI (Tailwind CSS + Font Awesome + Inter font)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Screen-by-Screen Implementation Map](#screen-by-screen-implementation-map)
3. [Global Data Flow](#global-data-flow)
4. [Global Service Map](#global-service-map)
5. [Global Database Map](#global-database-map)
6. [Dependency Graph](#dependency-graph)
7. [Implementation Order](#implementation-order)

---

## Architecture Overview

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 6 |
| Language | Vanilla JS (ES Modules) |
| UI Framework | None — direct DOM manipulation |
| CSS Framework | Tailwind CSS (via CDN) |
| Icons | Font Awesome 6 (via CDN) |
| Font | Inter (via Google Fonts) |
| Backend | Supabase (PostgreSQL + Auth) |
| Auth | Supabase Auth (Email/Password + Google OAuth) |
| Session | Supabase session (auto-refresh, persistSession: true) |
| Client SDK | `@supabase/supabase-js` |
| Styling approach | Tailwind utility classes in `index.html` + minimal `<style>` in `<head>` |

### Project Structure

```
/
├── index.html                 # Single HTML file — entire UI lives here
├── src/
│   ├── main.js                # All JS logic: routing, rendering, events
│   └── services/
│       ├── index.js            # Re-exports all services
│       ├── auth-service.js     # AuthService
│       ├── school-service.js   # SchoolService
│       ├── category-service.js # CategoryService
│       ├── subject-service.js  # SubjectService
│       ├── section-service.js  # SectionService
│       ├── content-service.js  # ContentService
│       ├── audit-log-service.js# AuditLogService
│       └── drive-service.js    # DriveService
├── supabase/migrations/       # SQL migrations (00001–00005)
├── package.json
└── vite.config.js
```

### Key Architectural Rules

1. **Services are the ONLY bridge** between UI and backend. UI never calls `supabase.from(...)` directly — always through a service.
2. **All services are attached to `window`** for global access: `window.SchoolService`, `window.CategoryService`, etc.
3. **Routing is hash-less** — `AppRouter.navigate(routeName)` manages `window.AppRouter.currentRoute`.
4. **Rendering is imperative** — each route has a `renderX(main)` method that sets `main.innerHTML`.
5. **Event delegation** — a single `document.addEventListener('click', async function (e) { ... })` handles all clicks via `data-action` attributes.
6. **Services throw errors** on failure — UI catches them in event handlers and shows toasts.
7. **All services auto-log audit entries** — UI does NOT call `AuditLogService.log()` directly.

### Available Services (API Surface)

| Service | Methods |
|---------|---------|
| `AuthService` | `signInWithEmail(email, password)`, `signInWithGoogle()`, `signOut()`, `getSession()`, `getUser()`, `onAuthStateChange(callback)`, `getProfile()` |
| `SchoolService` | `getAll()`, `getById(id)`, `create({name, code, status})`, `update(id, {name, code, status})`, `delete(id)` |
| `CategoryService` | `getBySchool(schoolId)`, `getById(id)`, `create({name, schoolId})`, `update(id, {name})`, `delete(id)` |
| `SubjectService` | `getBySchool(schoolId)`, `getByCategory(categoryId)`, `getById(id)`, `create({name, schoolId, categoryId})`, `update(id, {name, categoryId})`, `delete(id)` |
| `SectionService` | `getBySchool(schoolId)`, `getBySubject(subjectId)`, `getById(id)`, `create({name, schoolId, subjectId})`, `update(id, {name})`, `delete(id)` |
| `ContentService` | `getAll()`, `getBySchool(schoolId)`, `getBySection(sectionId)`, `getById(id)`, `create({name, type, url, size, schoolId, sectionId, description, tags, status})`, `update(id, {...})`, `delete(id)` |
| `AuditLogService` | `log(action, entity, entityName, detail)`, `getAll()` |
| `DriveService` | `parseDriveLink(link)`, `validateFolderId(folderId)`, `setFolderId(entityType, entityId, driveFolderId)`, `getFolderId(entityType, entityId)`, `removeFolderId(entityType, entityId)`, `getEntityName(entityType, entityId)` |
| `AppUtils` | `getTotalCounts()`, `formatDate(ts)`, `getInitials(name)` |
| `AppStorage` | `load()` (returns full data), `init()`, `save()` (no-op) |

### Profile Object Shape (from `AuthService.getProfile()`)

```js
{
  id: string,        // uuid, references auth.users
  name: string,
  role: 'super_admin' | 'school_admin',
  school_id: string | null,  // null for super_admins
  created_at: string,
  updated_at: string
}
```

### AppStorage.load() Return Shape

```js
{
  schools: School[],
  categories: Category[],
  subjects: Subject[],
  sections: Section[],
  content: Content[],
  users: Profile[],
  auditLog: AuditLog[]
}
```

### Constants

```
ROLE:         'super_admin' | 'school_admin'
CONTENT_TYPE: 'Video' | 'PDF' | 'Image' | 'Document' | 'Other'
CONTENT_STATUS: 'draft' | 'published' | 'archived' | 'review'
SCHOOL_STATUS:  'active' | 'inactive' | 'suspended'
ENTITY_TYPES_FOR_DRIVE: 'school' | 'category' | 'subject' | 'section'
```

---

## Screen-by-Screen Implementation Map

---

# Login

### Purpose
Authentication entry point for all users. Supports email/password and Google OAuth. On success, redirects to the appropriate dashboard based on role.

### Existing Route
Not a route — login is the default state. `#app-login` is visible, `#app-layout` is hidden. After successful auth, `#app-layout` is shown and `AppRouter.init()` is called, which navigates to `'company-dashboard'`.

### Layout
- **Desktop (lg+)**: Split screen — left 50% branded panel, right 50% form panel
- **Mobile/tablet**: Full-width form panel, branded panel hidden
- Left panel: `bg-primary-50`, gradient overlay, graduation cap icon, "LANXGROW INDIA" heading, "Central Operating System" subtitle, pagination dots
- Right panel: `bg-white`, centered form container (`max-w-md`)
- Mobile logo shown only on small screens: icon + "LANXGROW" heading

### UI Components
- Branded hero panel (left side, desktop only)
- Logo + app name header (mobile only)
- "Welcome back" heading + subtitle
- Google Workspace SSO button (full-width, outlined, Google icon)
- "Or continue with email" divider
- Email input with envelope icon
- Password input with lock icon + visibility toggle button
- "Forgot password?" link
- "Remember me for 30 days" checkbox
- Sign In button (full-width, primary blue)
- Terms of Service + Privacy Policy footer links

### User Actions

**Action: Sign In with Email/Password**
- Frontend: Validate email + password not empty. Call `AuthService.signInWithEmail(email, password)`. On success, hide `#app-login` (`style.display = 'none'`), show `#app-layout` (`classList.remove('hidden')`), call `AppRouter.init()`. On failure, show error message in `#login-error`.
- Backend Service: `AuthService.signInWithEmail(email, password)`
- Returns: `{ success: true, user, session }` or `{ success: false, error: string }`
- Database Tables: `auth.users`, `public.profiles` (read by trigger)
- Audit Log: No (auth event, not business action)

**Action: Sign In with Google**
- Frontend: Call `AuthService.signInWithGoogle()`. Supabase handles OAuth redirect.
- Backend Service: `AuthService.signInWithGoogle()`
- Returns: `{ success: true, url }` (redirect URL)
- On callback: Supabase trigger `handle_new_user()` creates profile row in `public.profiles`.

**Action: Toggle Password Visibility**
- Frontend: Toggle `input[type=password]` ↔ `input[type=text]`. Toggle eye icon.

### Loading State
- Sign In button: disabled, show spinner, change text to "Signing in..."

### Error State
- Show inline error text below password field in `#login-error` (red text, `text-primary-600` equivalent).
- Invalid credentials: "Invalid login credentials"

### Permissions
- Public — no authentication required

### Related Screens
- All screens (gateway to everything)

---

# Company Dashboard

### Purpose
Super Admin's landing page. Shows platform-wide metrics (school count, content count, etc.) and recent activity.

### Existing Route
`company-dashboard` (default route after login for super_admins)

### Layout
- **Sidebar**: HQ dark sidebar (`bg-gray-900`). Active item: "Overview" / "Dashboard" equivalent.
- **Header**: Standard header with search and notification bell.
- **Content**: Metrics grid (4 stat cards) + Recent activity table.

### UI Components
- HQ Dark Sidebar
- Top Header (search + notification + user avatar)
- Stat Cards × 4 (Schools, Categories, Subjects, Content Items)
- Recent Activity Table
- Breadcrumbs

### User Actions

**Action: Navigate via sidebar**
- Frontend: `AppRouter.navigate(routeName)`. Route dispatch renders the target screen.

**Action: Click stat card**
- Frontend: (Optional) Navigate to the corresponding management screen. E.g., clicking Schools stat navigates to `schools` route.

### Backend Service
- `SchoolService.getAll()` — for total count
- `ContentService.getAll()` — for recent content list
- `AppUtils.getTotalCounts()` — returns `{ schools, categories, subjects, content }` counts

### Database Tables
- `schools` (count)
- `categories` (count)
- `subjects` (count)
- `content` (count + recent items)

### Loading State
- Spinner while data loads. Replace with metrics and table on completion.

### Permissions
- `super_admin` only

### Related Screens
- Schools Management (Schools stat)
- Content Manager (Content stat)
- Audit Log (activity)

---

# Schools Management

### Purpose
Super Admin manages all tenant school workspaces. View, filter, search, create, edit, delete schools.

### Existing Route
`schools`

### Layout
- **Sidebar**: HQ dark sidebar. Active item: "Schools Network" (`bg-blue-600`).
- **Header**: Global search bar, notification bell, user avatar.
- **Content**:
  - Page header: "Schools Network" + "Onboard New School" button
  - Stats row: 4 stat cards (Total Active Schools, Total Students, Pending Renewals, System Health)
  - Filter bar: 3 dropdown filters + result count
  - Data table with pagination
- **Modal**: Entity modal for create/edit school form

### UI Components
- HQ Dark Sidebar
- Top Header (search + notifications)
- Page Header (title + subtitle + action buttons)
- Stat Cards × 4
- Filter Dropdowns (Status, Region, Tier) — implemented as click-toggled dropdowns
- Schools Data Table
  - Columns: Checkbox, School Name (initials avatar + name + subdomain), Code (badge), Students (count), Primary Admin (name + email), Status (colored badge), Renewal Date, Actions (Manage button + ellipsis)
  - Sortable column headers (indicated by arrow-up/down icon)
  - Row hover: `hover:bg-blue-50`
  - Suspended rows: `opacity-75`
- Pagination (Previous/Next + page numbers + ellipsis)
- Empty state (when no schools)
- Entity Modal (shared create/edit form)
  - School Name field
  - School Code field (uppercase, 3-6 chars unique)
  - Admin Name field
  - Admin Email field
  - Status select (active/suspended)
  - Cancel + Save buttons
- Confirm Dialog (shared delete confirmation)
  - "Are you sure?" + entity name + Delete/Cancel buttons
- Toast notifications (success/error)

### User Actions

**Action: Create School**
- Frontend: Open entity modal with empty fields. Set `entity-type` to `school`, `entity-id` to empty. Show school fields. Set modal title "Add School". User fills Name, Code, Admin Name, Admin Email, selects Status. Clicks Save.
- Validation: Name required, Code required (3-6 chars, unique), Admin Name required, Admin Email required.
- Backend Service: `SchoolService.create({ name, code, status })`
- Database Tables: `schools` (insert), `audit_logs` (auto-logged by service)
- Audit Log: Auto-logged as `created` / `School`.
- Success: Close modal, show toast "School created.", refresh table via `AppRouter.render()`.
- Error: Show toast with error message. Keep modal open.
- Loading: Disable Save button, show spinner.

**Action: Edit School**
- Frontend: Click Edit button in table row. Open entity modal pre-filled with school data. Set `entity-id` to school's UUID. Modal title "Edit School".
- Validation: Name required, Code required.
- Backend Service: `SchoolService.update(id, { name, code, status })`
- Database Tables: `schools` (update), `audit_logs` (auto-logged)
- Audit Log: Auto-logged as `edited` / `School`.
- Success: Close modal, show toast "School updated.", refresh.
- Error: Show toast error.

**Action: Delete School**
- Frontend: Click Delete button. Open confirm dialog showing "Delete [school name]? This will also remove all associated categories, subjects, sections, and content." User clicks Delete to confirm.
- Backend Service: `SchoolService.delete(id)` — cascade deletes categories, subjects, sections, content.
- Database Tables: `schools` (delete — cascade), `audit_logs` (auto-logged)
- Audit Log: Auto-logged as `deleted` / `School`.
- Success: Close dialog, show toast "School deleted.", refresh.
- Error: Show toast error.

**Action: Click School Name / "Manage"**
- Frontend: `AppRouter.navigate('school-dashboard', { schoolId: school.id })`

**Action: Search schools**
- Frontend: Debounced input (250ms) filters the school list by name or code. Re-render schools grid/table.

**Action: Filter schools**
- Frontend: Dropdown filters (Status, Region, Tier) — re-filter the table. (Note: Region and Tier are display-only concepts not in current schema — can be mapped to school location or omitted.)

**Action: Paginate**
- Frontend: Click page number / Previous / Next. Re-render table with correct slice of data.

### Loading State
- Stats row: Skeleton cards while loading.
- Table: Skeleton rows while loading.
- Buttons: Disabled + spinner during API calls.

### Error State
- Toast with error message.
- Table shows empty state on fetch failure.

### Empty State
- "No schools yet. Create your first school to get started." + icon + CTA button.

### Permissions
- `super_admin` only

### Related Screens
- School Dashboard (drill-down)
- Create School Step 1 (wizard entry)
- Audit Log (activity tracking)

---

# School Dashboard

### Purpose
Isolated school workspace dashboard for School Admin (or Super Admin impersonating). Shows school-level metrics, quick actions, integration status, and recent activity.

### Existing Route
`school-dashboard` (with `currentSchoolId` param)

### Layout
- **Super Admin Banner** (`bg-gray-900`): "SUPER ADMIN MODE — You are viewing the isolated workspace for [School Name]." + "Exit Workspace" button. Only shown when Super Admin is impersonating.
- **School Sidebar** (`bg-white`): School context area (initials + name + code), nav links (Dashboard, Students, Staff, Classes, Curriculum, Reports, Settings).
- **Header**: Breadcrumb context, quick search, notification bell.
- **Content**:
  - Welcome Hero: Blue gradient header (`linear-gradient(135deg, #1e3a8a, #3b82f6)`), school name, status badge
  - Metrics row: 3 stat cards (Total Students, Active Teachers, Active Curricula)
  - 2-column grid below: Quick Actions panel + Recent Activity timeline

### UI Components
- Super Admin Banner (conditional — only when `profile.role === 'super_admin'`)
- School White Sidebar
- Top Header (breadcrumbs + search + notifications)
- Welcome Hero (gradient, school name, status)
- Metric Cards × 3 (Students, Teachers, Curricula)
- Quick Actions Panel (2×2 grid of action buttons)
  - Add New Student
  - Import Roster
  - Manage Staff
  - Assign Curriculum
- Integration Status Panel (Google Drive, Email)
- Recent Activity Timeline (vertical timeline with colored dots)
- Breadcrumbs

### User Actions

**Action: Navigate sidebar links**
- Frontend: `AppRouter.navigate(routeName, { schoolId })`
- Existing routes: `school-categories`, `school-subjects`, `school-sections`

**Action: Exit Workspace (Super Admin only)**
- Frontend: `AppRouter.navigate('schools')` — back to schools list
- Clears `currentSchoolId`

**Action: Quick Action buttons**
- Frontend: Currently placeholder — show toast "Coming in a future update." (Students, Staff, Classes, Curriculum Assignments, Reports are not yet implemented as routes.)

### Backend Service
- `SchoolService.getById(schoolId)` — school details
- `AppStorage.load()` — for counts filtered by `school_id`
- `ContentService.getBySchool(schoolId)` — content count
- `AuditLogService.getAll()` — filtered to school context for activity

### Database Tables
- `schools` (read)
- `categories` (count by school_id)
- `subjects` (count by school_id)
- `sections` (count by school_id)
- `content` (count by school_id)
- `audit_logs` (filtered)

### Loading State
- Hero + metrics: Spinner while data loads.
- Quick actions: Shows immediately (static).
- Activity: Spinner while fetching.

### Permissions
- `school_admin` (own school only)
- `super_admin` (any school, via impersonation)

### Related Screens
- Schools Management (parent)
- Categories Management (`school-categories`)
- Subjects Management (`school-subjects`)
- Sections Management (`school-sections`)

---

# Categories Management

### Purpose
Manage categories (grade levels / classes) within a school workspace. CRUD operations scoped to the current school.

### Existing Route
`school-categories` (with `currentSchoolId`)

### Layout
- **Super Admin Banner** (conditional)
- **School Sidebar** (white)
- **Header**
- **Content**:
  - Page header: "Categories" + "Add Category" button
  - Search bar
  - Data table: Name, Subjects count, Created date, Actions (Open, Edit, Delete)

### UI Components
- Super Admin Banner (conditional)
- School White Sidebar
- Top Header
- Page Header (title + buttons)
- Search Bar
- Categories Data Table
- Entity Modal (shared — shows Name-only fields for categories)
- Confirm Dialog (shared delete confirmation)
- Toast notifications

### User Actions

**Action: Add Category**
- Frontend: Open entity modal. Set `entity-type` to `category`, `entity-id` empty. Show name-only fields. "Add Category" title. User enters name, clicks Save.
- Validation: Name required.
- Backend Service: `CategoryService.create({ name, schoolId: AppRouter.currentSchoolId })`
- Database Tables: `categories` (insert), `audit_logs` (auto-logged)
- Audit Log: Auto-logged as `created` / `Category`.
- Success: Close modal, toast "Category created.", refresh table.
- Error: Toast error.

**Action: Edit Category**
- Frontend: Open entity modal pre-filled. `entity-id` set. Show name-only fields. "Edit Category" title.
- Backend Service: `CategoryService.update(id, { name })`
- Audit Log: Auto-logged as `edited` / `Category`.
- Success: Close modal, toast "Category updated.", refresh.

**Action: Delete Category**
- Frontend: Confirm dialog: "Delete [name]? Subjects in this category will also be deleted."
- Backend Service: `CategoryService.delete(id)` — cascade deletes subjects, sections, content.
- Audit Log: Auto-logged as `deleted` / `Category`.
- Success: Close dialog, toast "Category deleted.", refresh.

**Action: Open Category (drill-down)**
- Frontend: `AppRouter.navigate('school-subjects', { schoolId, categoryId })` — navigates to subjects filtered by this category.

**Action: Search categories**
- Frontend: Debounced input filters by name, re-renders table.

### Backend Service
- `CategoryService.getBySchool(schoolId)` — list
- `CategoryService.create({ name, schoolId })`
- `CategoryService.update(id, { name })`
- `CategoryService.delete(id)`

### Database Tables
- `categories` (CRUD)
- `subjects` (cascade delete)
- `sections` (cascade delete)
- `content` (cascade delete)
- `audit_logs` (auto-logged)

### Empty State
- "No categories yet. Create your first category."

### Loading State
- Skeleton rows in table while loading.

### Permissions
- `school_admin` (own school)
- `super_admin` (any school)

### Related Screens
- School Dashboard (parent)
- Subjects Management (child)

---

# Subjects Management

### Purpose
Manage subjects within a school workspace. Subjects are scoped to a category (grade level). Drill-down from Categories.

### Existing Route
`school-subjects` (with `currentSchoolId` and optional `categoryId`)

### Layout
- Same as Categories layout
- Content: Subjects table with columns: Name, Category, Sections count, Created date, Actions (Open, Edit, Delete)
- Back button: "Back to Categories" when drilled down from a category

### UI Components
- Super Admin Banner (conditional)
- School White Sidebar
- Top Header
- Back button (when categoryId is set)
- Page Header (title + "Add Subject" button)
- Search Bar
- Subjects Data Table
- Entity Modal (name-only fields)
- Confirm Dialog

### User Actions

**Action: Add Subject**
- Frontend: Open entity modal. `entity-type` = `subject`. Name-only fields.
- Backend Service: `SubjectService.create({ name, schoolId: AppRouter.currentSchoolId, categoryId: AppRouter._selectedCategoryId })`
- Validation: Name required.
- Audit Log: Auto-logged as `created` / `Subject`.

**Action: Edit Subject**
- Backend Service: `SubjectService.update(id, { name })`
- Audit Log: Auto-logged as `edited` / `Subject`.

**Action: Delete Subject**
- Confirm dialog mentions sections and content will be deleted.
- Backend Service: `SubjectService.delete(id)` — cascade.

**Action: Open Subject (drill-down)**
- Frontend: `AppRouter._selectedSubjectId = id; AppRouter.navigate('school-sections', { schoolId })` — navigates to sections filtered by this subject.

### Backend Service
- `SubjectService.getBySchool(schoolId)` — all subjects in school
- `SubjectService.getByCategory(categoryId)` — filtered by category
- `SubjectService.create({ name, schoolId, categoryId })`
- `SubjectService.update(id, { name })`
- `SubjectService.delete(id)`

### Database Tables
- `subjects` (CRUD)
- `sections` (cascade delete)
- `content` (cascade delete)
- `audit_logs` (auto-logged)

### Permissions
- `school_admin` (own school)
- `super_admin` (any school)

### Related Screens
- Categories Management (parent)
- Sections Management (child)

---

# Sections Management

### Purpose
Manage sections (topics/units) within a subject. Sections hold content items.

### Existing Route
`school-sections` (with `currentSchoolId` and optional `subjectId`)

### Layout
- Same as Categories/Subjects layout
- Content: Sections table with columns: Name, Subject, Category, Content count, Created date, Actions (Edit, Delete)
- Back button: "Back to Subjects" when drilled down from a subject

### UI Components
- Super Admin Banner (conditional)
- School White Sidebar
- Top Header
- Back button (when subjectId is set)
- Page Header + "Add Section" button
- Search Bar
- Sections Data Table
- Entity Modal (name-only fields)
- Confirm Dialog

### User Actions

**Action: Add Section**
- Backend Service: `SectionService.create({ name, schoolId: AppRouter.currentSchoolId, subjectId: AppRouter._selectedSubjectId })`
- Audit Log: Auto-logged as `created` / `Section`.

**Action: Edit Section**
- Backend Service: `SectionService.update(id, { name })`

**Action: Delete Section**
- Confirm: "Delete [name]? Content in this section will be unlinked."
- Backend Service: `SectionService.delete(id)`

### Backend Service
- `SectionService.getBySchool(schoolId)`
- `SectionService.getBySubject(subjectId)`
- `SectionService.create({ name, schoolId, subjectId })`
- `SectionService.update(id, { name })`
- `SectionService.delete(id)`

### Database Tables
- `sections` (CRUD)
- `content` (section_id set to null on delete)
- `audit_logs` (auto-logged)

### Permissions
- `school_admin` (own school)
- `super_admin` (any school)

### Related Screens
- Subjects Management (parent)
- Content Manager (child — sections hold content)

---

# Content Manager

### Purpose
Manage all content items across the platform. View, filter, search, create, edit, delete, and play content (video/PDF/image).

### Existing Route
`content-manager`

### Layout
- **Sidebar**: HQ dark sidebar. Active item: "Content Manager" equivalent.
- **Header**: Standard header.
- **Content**:
  - Page header: "Content Manager" + "Add Content" button
  - Filter bar: Search input + Type filter dropdown + School filter dropdown
  - Data table: Name, Type, School, Status (badge), Description, Updated date, Actions (View/Play, Edit, Delete)

### UI Components
- HQ Dark Sidebar
- Top Header
- Page Header (title + subtitle + action button)
- Filter Bar (search + type dropdown + school dropdown)
- Content Data Table
- Entity Modal (content-specific fields)
- Video Player Modal (plays video, shows metadata + review panel)
- Confirm Dialog
- Toast notifications

### User Actions

**Action: Add Content**
- Frontend: Open entity modal with content fields. `entity-type` = `content`.
- Fields: Name (required), Type (select: Video/PDF/Image/Document/Other), School (select), Section (select, populated based on school), Duration (text), Size (text), Description (textarea), Tags (comma-separated), Status (select: draft/published/archived/review).
- School dropdown triggers section population via `ContentService.getBySchool()` equivalent.
- Backend Service: `ContentService.create({ name, type, url, size, schoolId, sectionId, description, tags, status })`
- Audit Log: Auto-logged as `uploaded` / `Content`.
- Success: Close modal, toast "Content created.", refresh.
- Error: Toast error.

**Action: Edit Content**
- Backend Service: `ContentService.update(id, updates)`
- Audit Log: Auto-logged as `edited` / `Content`.

**Action: Delete Content**
- Backend Service: `ContentService.delete(id)`
- Audit Log: Auto-logged as `deleted` / `Content`.

**Action: Play/View Content (Video)**
- Frontend: Open video player modal. Set video metadata (name, type, size, status, description). Show placeholder if no URL. Display video metadata bar.
- Backend: `ContentService.getById(id)` — fetch content details.
- Note: Video playback from Drive URL requires Edge Function proxy (not yet implemented). Show placeholder.

**Action: Filter content**
- Frontend: Debounced search by name/description. Type filter. School filter. Re-render filtered table.

### Backend Service
- `ContentService.getAll()` — all content
- `ContentService.getBySchool(schoolId)` — filtered
- `ContentService.create({...})`
- `ContentService.update(id, {...})`
- `ContentService.delete(id)`

### Database Tables
- `content` (CRUD)
- `schools` (for school dropdown)
- `sections` (for section dropdown)
- `audit_logs` (auto-logged)

### Empty State
- "No content yet. Create your first content item."

### Permissions
- `super_admin` (all schools)
- `school_admin` (own school's content)

### Related Screens
- School Workspace (content section)
- Media Library (filtered view of content)
- Drive Manager (linked content)

---

# Drive Manager

### Purpose
Link Google Drive folders to schools, categories, and subjects. Manage Drive integration per entity.

### Existing Route
`drive-manager`

### Layout
- **Sidebar**: HQ dark sidebar.
- **Content**:
  - Page header: "Drive Manager"
  - Explorer layout: Left panel (tree view of schools > categories > subjects) + Right panel (entity detail with Drive link input)

### UI Components
- HQ Dark Sidebar
- Top Header
- Page Header
- Explorer Tree Panel (school hierarchy with Drive-linked indicators)
- Explorer Content Panel (entity details)
- Drive Link Input (paste Google Drive folder URL)
- Link/Unlink buttons
- Link status display
- Confirm Dialog (for unlink)

### User Actions

**Action: Select school/category/subject from tree**
- Frontend: Render entity detail in right panel. Show entity name, Drive link input (pre-filled if linked), Link/Update button, Unlink button (if linked), status display.

**Action: Link Drive Folder**
- Frontend: User pastes Google Drive folder URL into input. Clicks Link.
- Validation: `DriveService.parseDriveLink(link)` — returns folder ID or null.
- Backend Service: `DriveService.setFolderId(entityType, entityId, folderId)`
- Database Tables: `schools` | `categories` | `subjects` | `sections` (update `drive_folder_id`)
- Audit Log: Auto-logged as `edited` / `[Entity]` with detail "Google Drive folder linked: [folderId]".
- Success: Update status display, toast "Drive folder linked.", refresh tree.

**Action: Unlink Drive Folder**
- Frontend: Confirm dialog "Unlink this Google Drive folder? The folder in Drive will not be affected."
- Backend Service: `DriveService.removeFolderId(entityType, entityId)`
- Audit Log: Auto-logged as `edited` / `[Entity]` with detail "Google Drive folder unlinked".
- Success: Toast "Drive folder unlinked.", refresh.

### Backend Service
- `DriveService.parseDriveLink(link)`
- `DriveService.setFolderId(entityType, entityId, folderId)`
- `DriveService.removeFolderId(entityType, entityId)`
- `DriveService.getFolderId(entityType, entityId)`

### Database Tables
- `schools` (read `drive_folder_id`, update)
- `categories` (read `drive_folder_id`, update)
- `subjects` (read `drive_folder_id`, update)
- `sections` (read `drive_folder_id`, update)
- `audit_logs` (auto-logged)

### Empty State
- Tree: "No schools available."
- Content panel: "Select a school to view its folder structure."

### Permissions
- `super_admin` only (currently)

### Related Screens
- Content Manager (Drive-linked content)
- Media Library (Drive-linked media)

---

# Media Library

### Purpose
View all video and image content across the platform in a grid layout. Filter by type and search.

### Existing Route
`media-library`

### Layout
- **Sidebar**: HQ dark sidebar.
- **Content**:
  - Page header: "Media Library" + search bar
  - Grid of media cards (auto-fill, min 200px)

### UI Components
- HQ Dark Sidebar
- Top Header
- Page Header
- Search Bar
- Media Grid (responsive, card-based)
  - Video: gradient background, play icon overlay, Play button
  - Image: light background, preview icon, Preview button
  - Bottom: name, type, size, school, Details button

### User Actions

**Action: Search media**
- Frontend: Debounced search filters by name and type. Re-renders grid.

**Action: Play video**
- Frontend: Calls `AppContent.play(id)` — opens video player modal.

**Action: Preview image**
- Frontend: Shows toast "Preview mode." (Future: open image lightbox.)

**Action: View details**
- Frontend: Calls `AppContent.play(id)` — opens video modal with details.

### Backend Service
- `ContentService.getAll()` — filtered to `type === 'Video' || type === 'Image'`

### Database Tables
- `content` (read, filtered)

### Empty State
- "No media files yet. Upload videos and images to your content sections to see them here."

### Permissions
- `super_admin` (HQ view)
- `school_admin` (own school's media)

### Related Screens
- Content Manager (source content)
- Video Player (playback)

---

# School Admins Management

### Purpose
View and manage school administrators across all schools. Super Admin only.

### Existing Route
`school-admins`

### Layout
- **Sidebar**: HQ dark sidebar.
- **Content**:
  - Page header: "School Admins" + search bar
  - Data table: Name (avatar), Email, School, Code, Status, Actions (Edit, Delete)

### UI Components
- HQ Dark Sidebar
- Top Header
- Page Header
- Search Bar
- Admins Data Table
- Confirm Dialog (for delete)

### User Actions

**Action: Edit Admin**
- Frontend: Prompt dialog to edit admin name.
- Backend: Updates profile name via Supabase (currently uses direct prompt; could be improved with a modal).
- Note: Current implementation uses `prompt()` for name edit. Stitch should use a proper modal.

**Action: Delete Admin**
- Frontend: Confirm dialog "Remove this school admin? The school itself will not be deleted."
- Backend: Deletes the associated school (`SchoolService.delete(schoolId)`). Note: This is the current behavior.
- Audit Log: Auto-logged by SchoolService.

### Backend Service
- `SchoolService.getAll()` — for school data
- `SchoolService.delete(schoolId)` — for admin deletion (current behavior)
- `AuthService.getProfile()` — for user role context

### Database Tables
- `profiles` (read — filtered by `role === 'school_admin'`)
- `schools` (read, delete)
- `audit_logs` (auto-logged)

### Empty State
- "No school admins yet. Admins are created automatically when you add a new school."

### Permissions
- `super_admin` only

### Related Screens
- Schools Management (source of admin creation)
- Roles & Permissions

---

# Roles & Permissions

### Purpose
View and toggle role-based permissions. Currently a display-only screen with permission checkboxes.

### Existing Route
`roles-permissions`

### Layout
- **Sidebar**: HQ dark sidebar.
- **Content**:
  - Page header
  - Card with two sections: Super Admin (all permissions, disabled) and School Admin (togglable permissions)

### UI Components
- HQ Dark Sidebar
- Top Header
- Page Header
- Roles Card (Super Admin section — all checked, disabled)
- Roles Card (School Admin section — togglable checkboxes)

### User Actions

**Action: Toggle permission checkbox**
- Frontend: Show toast "Enabled/disabled [permission name]" — currently display-only. No backend persistence.

### Backend Service
- None currently — display-only. Future: permissions table with CRUD.

### Database Tables
- None currently.

### Permissions
- `super_admin` only

### Related Screens
- School Admins
- Settings

---

# Company Settings

### Purpose
Configure global platform preferences (company name, branding, email settings).

### Existing Route
`company-settings`

### Layout
- **Sidebar**: HQ dark sidebar.
- **Content**:
  - Page header
  - Tab bar: General | Branding | Email
  - Settings card with form fields per tab

### UI Components
- HQ Dark Sidebar
- Top Header
- Page Header
- Tab Bar (3 tabs)
- General Settings Form (Company Name, Language, Timezone, Max Upload Size)
- Branding Settings Form (Logo upload, Primary Color, Favicon)
- Email Settings Form (SMTP Host, Port, From Address, From Name)
- Save/Reset buttons

### User Actions

**Action: Switch tab**
- Frontend: Render the corresponding settings form. Highlight active tab.

**Action: Save settings**
- Frontend: Toast "Settings saved." — currently no backend persistence.
- Future: Store in `app_settings` table or `profiles` metadata.

**Action: Send test email**
- Frontend: Toast "Test email sent." — placeholder.

### Backend Service
- None currently (display-only forms).

### Database Tables
- None currently.

### Permissions
- `super_admin` only

---

# Audit Log

### Purpose
View all platform activity. Filter by action type, entity type, and search by user/entity name.

### Existing Route
`audit-log`

### Layout
- **Sidebar**: HQ dark sidebar.
- **Content**:
  - Page header
  - Filter bar: Search input + Action filter dropdown + Entity filter dropdown
  - Data table: User (avatar + name), Action (colored badge), Entity, Entity name, Details, Date

### UI Components
- HQ Dark Sidebar
- Top Header
- Page Header
- Filter Bar (search + action dropdown + entity dropdown)
- Audit Log Data Table (with colored action badges)
- Empty state

### User Actions

**Action: Search**
- Frontend: Debounced filter by user_name, entity_name, or detail text.

**Action: Filter by action**
- Frontend: Dropdown filters by action type (created, edited, uploaded, deleted, suspended).

**Action: Filter by entity**
- Frontend: Dropdown filters by entity type (School, Category, Subject, Section, Content).

### Backend Service
- `AuditLogService.getAll()` — returns all audit logs (limited to 200)

### Database Tables
- `audit_logs` (read)

### Empty State
- "No activity yet."

### Permissions
- `super_admin` only
- `school_admin` can view own school's logs (future)

### Related Screens
- All screens (they generate audit logs)

---

## Global Data Flow

```
LOGIN
  │
  ├── AuthService.signInWithEmail() / signInWithGoogle()
  │
  ▼
AppRouter.init() → navigate('company-dashboard')
  │
  ├── super_admin → HQ Dark Sidebar + Company Routes
  │     │
  │     ├── company-dashboard
  │     │     ├── AppUtils.getTotalCounts()
  │     │     ├── SchoolService.getAll()
  │     │     └── ContentService.getAll()
  │     │
  │     ├── schools
  │     │     ├── SchoolService.getAll()
  │     │     ├── SchoolService.create()
  │     │     ├── SchoolService.update()
  │     │     └── SchoolService.delete() → cascade
  │     │
  │     ├── content-manager
  │     │     ├── ContentService.getAll()
  │     │     ├── ContentService.create()
  │     │     ├── ContentService.update()
  │     │     └── ContentService.delete()
  │     │
  │     ├── drive-manager
  │     │     ├── DriveService.setFolderId()
  │     │     ├── DriveService.removeFolderId()
  │     │     └── AppStorage.load() for tree
  │     │
  │     ├── media-library
  │     │     └── ContentService.getAll() (filtered Video/Image)
  │     │
  │     ├── school-admins
  │     │     └── SchoolService.getAll() + AppStorage.load()
  │     │
  │     ├── roles-permissions (display only)
  │     │
  │     ├── company-settings (display only)
  │     │
  │     └── audit-log
  │           └── AuditLogService.getAll()
  │
  └── Click school → navigate('school-dashboard', { schoolId })
        │
        ├── school_dashboard
        │     ├── SchoolService.getById()
        │     ├── CategoryService.getBySchool()
        │     ├── SubjectService.getBySchool()
        │     ├── SectionService.getBySchool()
        │     └── ContentService.getBySchool()
        │
        ├── school-categories
        │     ├── CategoryService.getBySchool()
        │     ├── CategoryService.create()
        │     ├── CategoryService.update()
        │     └── CategoryService.delete()
        │
        ├── school-subjects
        │     ├── SubjectService.getBySchool() / getByCategory()
        │     ├── SubjectService.create()
        │     ├── SubjectService.update()
        │     └── SubjectService.delete()
        │
        └── school-sections
              ├── SectionService.getBySchool() / getBySubject()
              ├── SectionService.create()
              ├── SectionService.update()
              └── SectionService.delete()
```

---

## Global Service Map

| Screen | Services Used |
|--------|---------------|
| Login | `AuthService.signInWithEmail()`, `AuthService.signInWithGoogle()`, `AuthService.getSession()`, `AuthService.getProfile()` |
| Company Dashboard | `AppUtils.getTotalCounts()`, `SchoolService.getAll()`, `ContentService.getAll()`, `AppStorage.load()` |
| Schools Management | `SchoolService.getAll()`, `SchoolService.create()`, `SchoolService.update()`, `SchoolService.delete()` |
| School Dashboard | `SchoolService.getById()`, `CategoryService.getBySchool()`, `SubjectService.getBySchool()`, `SectionService.getBySchool()`, `ContentService.getBySchool()`, `AuditLogService.getAll()` |
| Categories Management | `CategoryService.getBySchool()`, `CategoryService.create()`, `CategoryService.update()`, `CategoryService.delete()` |
| Subjects Management | `SubjectService.getBySchool()`, `SubjectService.getByCategory()`, `SubjectService.create()`, `SubjectService.update()`, `SubjectService.delete()` |
| Sections Management | `SectionService.getBySchool()`, `SectionService.getBySubject()`, `SectionService.create()`, `SectionService.update()`, `SectionService.delete()` |
| Content Manager | `ContentService.getAll()`, `ContentService.getBySchool()`, `ContentService.create()`, `ContentService.update()`, `ContentService.delete()`, `ContentService.getById()` |
| Drive Manager | `DriveService.setFolderId()`, `DriveService.removeFolderId()`, `DriveService.parseDriveLink()`, `AppStorage.load()` |
| Media Library | `ContentService.getAll()` (filtered), `ContentService.getById()` |
| School Admins | `SchoolService.getAll()`, `SchoolService.delete()`, `AppStorage.load()` |
| Roles & Permissions | None (display only) |
| Company Settings | None (display only) |
| Audit Log | `AuditLogService.getAll()` |

---

## Global Database Map

| Table | CRUD | Screens |
|-------|------|---------|
| `schools` | CRUD | Schools Management, School Dashboard, Drive Manager, Company Dashboard, School Admins |
| `categories` | CRUD | Categories Management, Subjects Management, Drive Manager, Company Dashboard |
| `subjects` | CRUD | Subjects Management, Sections Management, Drive Manager, Company Dashboard |
| `sections` | CRUD | Sections Management, Content Manager, Drive Manager |
| `content` | CRUD | Content Manager, Media Library, Video Player, Company Dashboard, School Dashboard |
| `profiles` | R | Login, School Admins, School Dashboard (role checks) |
| `audit_logs` | R (insert via services) | Audit Log, School Dashboard (activity), Company Dashboard |

---

## Dependency Graph

```
auth.users
  └── profiles (trigger-created)
        │
        ├── role check → HQ or School layout
        │
        schools
        │   ├── categories
        │   │     └── subjects
        │   │           └── sections
        │   │                 └── content
        │   │
        │   ├── school_admins (profiles where school_id = school.id)
        │   │
        │   └── drive_folder_id (schools + categories + subjects + sections)
        │
        audit_logs (written by all services, read by audit screens)
```

### Direction of Dependencies

```
schools (top-level, independent)
  │
  ├── categories (depends on school)
  │     └── subjects (depends on school + category)
  │           └── sections (depends on school + subject)
  │                 └── content (depends on school + section)
  │
  profiles (depends on auth.users, optionally on schools)
  │
  audit_logs (depends on profiles, writes reference schools/content etc.)
```

---

## Implementation Order

Lowest risk = display-only / read-heavy first. Highest risk = write operations with cascading deletes.

### Phase 1: Application Shell (Risk: Low)
1. Login screen (Stitch redesign)
2. HQ Dark Sidebar layout
3. School White Sidebar layout
4. Super Admin Banner component
5. Top Header component
6. Breadcrumb component
7. Toast system (Stitch restyle)
8. Modal system (Stitch restyle)
9. Confirm dialog (Stitch restyle)

### Phase 2: Read Screens (Risk: Low)
10. Company Dashboard (metrics + recent content)
11. Audit Log (read-only table with filters)
12. Media Library (read-only grid)
13. Roles & Permissions (display only)
14. Company Settings (display only, tabs + forms)

### Phase 3: CRUD — Curriculum Hierarchy (Risk: Medium)
15. Schools Management (full CRUD + table + stats)
16. School Dashboard (school workspace home)
17. Categories Management (CRUD + table)
18. Subjects Management (CRUD + table)
19. Sections Management (CRUD + table)

### Phase 4: CRUD — Content (Risk: Medium)
20. Content Manager (CRUD + table + filters + video player)
21. School Admins Management (read + delete)

### Phase 5: Integrations (Risk: Medium)
22. Drive Manager (link/unlink Drive folders)

### Phase 6: Polish (Risk: Low)
23. Empty states for all tables
24. Loading states (spinners/skeletons)
25. Error states for all service calls
26. Responsive behavior verification
27. Console error cleanup
28. Build verification

---

## Appendix: Shared Modal System Specification

### Entity Modal (`modal-entity`)
- Used by: Schools, Categories, Subjects, Sections, Content
- Fields shown/hidden based on `entity-type` hidden input
- School fields: Name, Code, Admin Name, Admin Email, Status
- Name-only fields: Name input (used by category, subject, section)
- Content fields: Name, Type, School (dropdown), Section (dropdown), Duration, Size, Description, Tags, Status
- Cancel button: closes modal
- Save button: calls `handleEntitySubmit()`, validates, shows loading

### Confirm Dialog (`modal-confirm`)
- Used by: All delete operations
- Warning icon, "Are you sure?" title, dynamic text, Cancel + Delete buttons
- Delete button triggers `confirm-delete-entity` action

### Video Player Modal (`modal-video`)
- Used by: Content Manager, Media Library
- Video placeholder or `<video>` element
- Metadata bar: type badge, duration, size, status
- Review panel: Approve/Revise/Reject buttons, review notes textarea, timestamps

---

## Appendix: Event Action Registry

All clickable elements use `data-action` attribute. The single click handler at document level dispatches based on this value.

| data-action | Handler | Screen |
|-------------|---------|--------|
| `navigate` | `AppRouter.navigate(route)` | All |
| `add-school` | `openSchoolModal()` | Schools |
| `edit-school` | `AppSchools.edit(id)` | Schools |
| `delete-school` | `AppSchools.confirmDelete(id)` | Schools |
| `open-school` | `AppRouter.navigate('school-dashboard', {schoolId})` | Schools |
| `add-category` | `AppCategories.openCreate()` | Categories |
| `edit-category` | `AppCategories.edit(id)` | Categories |
| `delete-category` | `AppCategories.confirmDelete(id)` | Categories |
| `open-category` | `AppRouter.navigate('school-subjects', {schoolId, categoryId})` | Categories |
| `add-subject` | `AppSubjects.openCreate()` | Subjects |
| `edit-subject` | `AppSubjects.edit(id)` | Subjects |
| `delete-subject` | `AppSubjects.confirmDelete(id)` | Subjects |
| `open-subject` | `AppRouter.navigate('school-sections', ...)` | Subjects |
| `add-section` | `AppSections.openCreate()` | Sections |
| `edit-section` | `AppSections.edit(id)` | Sections |
| `delete-section` | `AppSections.confirmDelete(id)` | Sections |
| `add-content` | `AppContent.openCreate()` | Content Manager |
| `edit-content` | `AppContent.edit(id)` | Content Manager |
| `delete-content` | `AppContent.confirmDelete(id)` | Content Manager |
| `play-video` | `AppContent.play(id)` | Content Manager, Media Library |
| `view-content-file` | `AppContent.play(id)` | Media Library |
| `confirm-delete-entity` | Delete handler | All CRUD |
| `drive-select` | `AppDriveManager.showSchool(data, id)` | Drive Manager |
| `drive-select-folder` | `AppDriveManager.showFolder(...)` | Drive Manager |
| `drive-link-save` | `DriveService.setFolderId(...)` | Drive Manager |
| `drive-link-remove` | Confirm unlink | Drive Manager |
| `confirm-drive-unlink` | `DriveService.removeFolderId(...)` | Drive Manager |
| `settings-tab` | `AppRouter.renderSettingsTab(tab)` | Settings |
| `save-settings` | Toast only | Settings |
| `test-email` | Toast only | Settings |
| `toggle-permission` | Toast only | Roles |
| `global-search-nav` | Navigate to search result | Search |
| `logout` | `AuthService.signOut()` | All |
| `disabled-nav` | Toast "Coming soon" | All |

---

## Appendix: State Management Patterns

### No global state library
- `AppStorage.load()` fetches all data from Supabase each time it's called
- Route renders call `AppStorage.load()` at the start and work with the returned data
- After any CRUD operation, `AppRouter.render()` is called to refresh the current view
- This ensures data is always fresh but means no optimistic updates

### Pattern for route rendering
```
async renderRouteName(main) {
  const data = await AppStorage.load();  // Fetch all data
  // Filter/build view from data
  main.innerHTML = `...template...`;       // Render HTML
  initIcons();                             // Re-init Material Symbols / Font Awesome
}
```

### Pattern for CRUD handling
```
async function handleEntitySubmit() {
  const type = document.getElementById('entity-type').value;
  const id = document.getElementById('entity-id').value;
  const isEdit = !!id;
  try {
    if (type === 'school') { /* validate, call service */ }
    // ... other types
    AppModal.close('modal-entity');
    AppRouter.render();  // Full re-render
  } catch (err) {
    AppToast.show(err.message, 'error');
  }
}
```

---

## Appendix: CSS Architecture (Stitch → Current Mapping)

The Stitch design uses Tailwind utility classes. The current app uses custom CSS variables. The mapping:

| Stitch (Tailwind) | Current (CSS Var) | Notes |
|-------------------|-------------------|-------|
| `bg-gray-50` | `var(--background)` | Page background |
| `bg-white` | `var(--surface)` | Card/surface background |
| `text-gray-900` | `var(--on-surface)` | Primary text |
| `text-gray-500` | `var(--text-secondary)` | Secondary text |
| `text-gray-400` | `var(--text-muted)` | Muted text |
| `border-gray-200` | `var(--border)` | Borders |
| `bg-blue-600` | `var(--primary)` | Primary button |
| `hover:bg-blue-700` | `var(--primary-hover)` | Primary hover |
| `text-blue-600` | `var(--primary)` | Link/accent text |
| `bg-gray-900` | new | Sidebar dark bg |
| `bg-gray-950` | new | Sidebar brand area |

The implementation should either:
1. Add Tailwind CDN to `index.html` and use inline classes (matching Stitch HTML), OR
2. Convert the Stitch classes to equivalent CSS variables in `<style>`.

**Recommendation:** Add Tailwind CDN (`<script src="https://cdn.tailwindcss.com"></script>`) to match the Stitch HTML exactly, and keep the existing CSS variables for custom component overrides.

---

## Appendix: Tailwind Design Tokens (Stitch)

### Colors
- Primary: `#2563eb` (blue-600)
- Primary hover: `#1d4ed8` (blue-700)
- Primary light: `#eff6ff` (blue-50)
- Success: `#10b981` (emerald-500)
- Warning: `#f59e0b` (amber-500)
- Danger: `#ef4444` (red-500)
- Sidebar bg: `#111827` (gray-900)
- Sidebar brand: `#030712` (gray-950)
- Sidebar text: `#d1d5db` (gray-300)
- Sidebar hover: `#1f2937` (gray-800)
- Surface: `#ffffff` (white)
- Background: `#f9fafb` (gray-50)
- Border: `#e5e7eb` (gray-200)

### Typography
- Font family: `'Inter', sans-serif`
- Headings: `font-bold`, sizes `text-xl` (1.25rem) to `text-3xl` (1.875rem)
- Body: `text-sm` (0.875rem)
- Labels: `text-xs` (0.75rem), `font-medium`, `text-gray-500`
- Table headers: `text-xs`, `font-medium`, `uppercase`, `tracking-wider`

### Spacing
- Sidebar width: `w-64` (16rem)
- Header height: `h-16` (4rem) or `h-14` (3.5rem)
- Content padding: `p-4 sm:p-6 lg:p-8`
- Card padding: `p-5`

### Border Radius
- Cards: `rounded-lg` (0.5rem)
- Buttons: `rounded-md` (0.375rem)
- Badges: `rounded-full` (9999px)
- Modals: `rounded-xl` (0.75rem)

### Shadows
- Cards: `shadow-sm`
- Modals: `shadow-xl`
- Dropdowns: `shadow-lg`

---

*End of Implementation Map*
