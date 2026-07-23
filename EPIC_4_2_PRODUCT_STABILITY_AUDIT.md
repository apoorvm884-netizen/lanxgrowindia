# EPIC 4.2 — Product Stability Audit

**Date:** 2026-07-23
**Scope:** Full code-level static audit of every screen, button, modal, action, empty state, and workflow.
**Method:** All auditing performed via static code analysis. Live runtime is impossible without real Supabase credentials (`.env.local` contains placeholders).

---

## Classification Legend

| Severity | Meaning |
|---|---|
| 🔴 **Launch Blocker** | Must be fixed before any demo or pilot; app crashes or cannot function. |
| 🟠 **Critical Bug** | Data loss or silent corruption; feature is broken in a meaningful way. |
| 🟡 **Major Bug** | Feature visibly broken or significantly degraded. |
| 🔵 **Minor Bug** | Works but has a clear bug. |
| 🟣 **UX Issue** | Works but confusing, unhelpful, or inconsistent. |
| ⚪ **Missing Workflow** | A necessary user flow does not exist. |
| 🟢 **Performance Issue** | Will be slow at scale. |
| 🔘 **Future Enhancement** | Nice-to-have; not blocking launch. |

---

## 🔴 Launch Blockers

### LB-1: Missing real Supabase credentials — app cannot authenticate

- **File:** `.env.local`
- **Problem:** Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are placeholder values (`https://placeholder-project.supabase.co`, `placeholder-key`). `src/lib/supabase.js` calls `createClient()` with these values, which will throw a runtime error on first Supabase call. The entire app is dead-on-arrival.
- **Fix:** Supply real Supabase credentials before any demo or deployment.

### LB-2: Duplicate SchoolStudents.openEdit — second copy strips half the form, silently nullifies data on save

- **File:** `src/school-portal.js:274`
- **Problem:** `SchoolStudents.openEdit` is defined twice (lines 196 and 274). JavaScript prototype assignment means the second definition silently wins. The second version at line 274 is a **stripped-down** modal: it omits Date of Birth, Gender, Admission No., Guardian Name, Guardian Contact, Academic Year, Category checkboxes, Subject checkboxes, and Notes. The `save()` method (line 313) **still reads all those fields** (`document.getElementById('sp-input-student-dob')`, etc.). Since the stripped modal lacks those DOM elements, save sets them all to `null` — silently **erasing** DOB, gender, parent info, categories, subjects, and notes on every edit.
- **Fix:** Remove the first definition (lines 196-272) or the second (lines 274-311). Ensure the surviving version includes the full form. The template between the two also uses different data sources (first reads `data.counselors || data.users`, second reads only `data.users`).

### LB-3: `delete-school` handler calls `AppSchools.confirmDelete()` — method does not exist

- **File:** `src/main.js:2617` → `AppSchools.confirmDelete(id)`
- **Problem:** The click dispatcher routes `delete-school` action to `AppSchools.confirmDelete(id)`, but that method is **not defined** in `src/pages/schools.js`. If any button triggers this action, the handler will crash with a TypeError. Additionally, no UI button exists that triggers `delete-school` (no `data-action="delete-school"` in any template), so the handler is currently dead code — but if anyone adds a delete-school button, it will crash.
- **Fix:** Either implement `AppSchools.confirmDelete()` in `schools.js` or remove the handler.

---

## 🟠 Critical Bugs

### CR-1: Empty toast catches in modal helpers suppress all errors

- **File:** `src/main.js` — various `AppModal.show()` and timeline modal handlers
- **Problem:** Multiple modal-related async handlers use `catch(e) { AppToast.show(e.message || ...) }` but `e.message` is undefined for certain error types (e.g., network errors that throw strings, or Supabase errors that have a different shape). Also, several places in `school-portal.js` use bare `catch(e) { /* best-effort */ }` (line 343) or `catch(e) { console.error(...) }` (line 348), silently swallowing failures like enrollment or notification errors.

---

## 🟡 Major Bugs

### MJ-1: SchoolCourses `confirmDelete` triggers modal but handler at `sp-confirm-delete-course` is missing data wiring

- **File:** `src/school-portal.js:1253`
- **Problem:** The delete confirmation modal sets `data-action="sp-confirm-delete-course"` but the click dispatcher in `main.js` may parse `id` (the data-id attribute) differently for courses. Cross-reference is fragile.

### MJ-2: Orphaned action handlers — dead code that will never execute

- **Files:** `src/main.js`
- **Problem:** These `if (action === '...')` handlers exist but no button or element anywhere in the codebase sets `data-action` to these values:

| Handler | Line | Notes |
|---|---|---|
| `add-timestamp` | 2849 | Video timestamp feature — no UI trigger |
| `close-modal` | (orphan) | All modals use `data-close-modal` attribute; this handler is dead |
| `content-upload-file` | 2655 | No upload button triggers it |
| `delete-admin` | 2672 | No admin management UI exists |
| `edit-admin` | 2682 | No admin management UI exists |
| `delete-school` | 2617 | `AppSchools.confirmDelete()` doesn't exist anyway (see LB-3) |
| `review-approve` | 2864 | Video review system — no UI trigger |
| `review-reject` | 2886 | Video review system — no UI trigger |
| `review-request` | 2875 | Video review system — no UI trigger |
| `sp-notif-filter` | 3824 | Handled by input event listener instead (line 4015) — duplicate |
| `sp-open-student-portal` | 3215 | No student portal button triggers it |

These handlers inflate the codebase and create maintenance debt. If the features they support are intended to exist, the UI buttons are missing.

### MJ-3: Search debounce at 1000ms — sluggish, no loading indicator

- **File:** `src/main.js:3925`
- **Problem:** Input event debounce for search is 1000ms, but there is no visual feedback (spinner or "Searching..." text) during the delay. Users may type, wait, and think the search is broken.

### MJ-4: Dashboard stats use hardcoded `_count` — breaks if Supabase query shape changes

- **File:** `src/pages/company-dashboard.js`
- **Problem:** Aggregate queries assume `_count: { schools: N }` shape from Supabase. If the query response structure changes or is null (e.g., no data yet), the render crashes because it accesses `_count` on undefined.

---

## 🔵 Minor Bugs

### MN-1: `sp-notif-filter` select change fires BOTH input event AND click handler

- **File:** `src/main.js:3824` and `src/main.js:4015`
- **Problem:** The notifications filter `<select>` has `id="sp-notif-filter"`. The global click dispatcher (line 3824) catches clicks on it and calls `AppRouter.render()`, AND the input event listener (line 4015) catches changes. The click handler is redundant and causes a double render.

### MN-2: Media library `data-action="media-search"` fires click handler — text inputs should use input handler only

- **File:** `src/main.js:3932`
- **Problem:** Media search is an `<input>` with `data-action="media-search"`. The global click dispatcher fires on every click inside the input (including cursor placement), but the actual search logic is in the input event handler. The click handler creates unnecessary renders.

### MN-3: `sp-save-student` and `sp-update-student` read `sp-input-student-dob` / gender / parent / notes / categories / subjects — but stripped modal doesn't have them

- **File:** `src/school-portal.js:274` (second `openEdit`) vs `src/school-portal.js:313` (`save`)
- **Problem:** After the stripped modal (LB-2 fix applies), the save method tries to read `document.getElementById('sp-input-student-dob')` etc., all of which are `null`. Update will silently set DOB, gender, parent fields, notes, categories, and subjects to null.

### MN-4: Pagination page buttons parse `el.dataset.page` without validation

- **File:** `src/main.js` — multiple `*-page` handlers (e.g., `sp-counselor-page`, `sp-course-page`)
- **Problem:** `parseInt(el.dataset.page)` can produce `NaN` if dataset is malformed, setting `currentPage` to `NaN` and breaking the list render.

---

## 🟣 UX Issues

### UX-1: No empty states on school portal screens

- **Files:** `src/school-portal.js`
- **Problem:** Students, Counselors, Courses, Content, and other school portal screens show an empty table/list with no rows when there is no data, but no icon + explanation + CTA (e.g., "No students yet. Click 'Add Student' to get started."). Only the error view (catch block) has meaningful messaging. Contrast with `schools.js` which DOES have a proper empty state (line 41).

### UX-2: Modal overlays have no ESC key handler

- **File:** `src/main.js` — `AppModal` helpers
- **Problem:** The modal system does not bind a `keydown Escape` listener on open. Users cannot press ESC to close a modal; they must click the X or Cancel button.

### UX-3: Load/error states are inconsistent — spinner, skeleton, or blank

- **File:** Entire app
- **Problem:** Some screens show a spinner during load (e.g., school portal pages), others show nothing (blank page until data arrives), and error states are handled inconsistently (some show a toast, others overwrite the DOM with an error view). No consistent pattern.

### UX-4: Create Student modal (`openAdd`) has no standard modal chrome

- **File:** `src/school-portal.js:106`
- **Problem:** The `openAdd` method uses a full-form inline layout, but the Create Student flow may not include a header title matching the Edit modal, or use the same `modal-overlay` pattern. Inconsistency between Add and Edit students.

### UX-5: Confirmation modals for delete do not show the entity name — ambiguous

- **File:** `src/school-portal.js` — `confirmDelete` methods
- **Problem:** Delete confirmation modals say "Are you sure you want to delete this student?" but do not include the student's name. Users could accidentally delete the wrong record if the list has scrolled.

---

## ⚪ Missing Workflows

### MW-1: No bulk import of students (CSV upload)

- **Problem:** There is no mechanism to upload students in bulk. A school administrator with hundreds of students would have to click "Add Student" manually for each one.

### MW-2: No student enrollment import/export

- **Problem:** The EnrollmentService exists (referenced in save method), but there is no UI for enrolling a student in bulk courses, or viewing/editing all of a student's enrollments in one place.

### MW-3: No "Delete School" button in UI (handler is orphaned)

- **File:** `src/main.js:2617` / `src/pages/schools.js`
- **Problem:** The main.js dispatcher has `if (action === 'delete-school')`, but no button renders with `data-action="delete-school"` anywhere. There is no way to delete a school through the UI.

### MW-4: No admin management UI (`edit-admin`, `delete-admin`)

- **File:** `src/main.js:2672` & `2682`
- **Problem:** Handlers exist, but no UI renders admin edit/delete buttons. There is no way to manage school admins through the Settings UI.

### MW-5: Video review workflow has handlers but no UI to trigger them

- **File:** `src/main.js:2849-2886`
- **Problem:** `review-approve`, `review-reject`, `review-request`, `add-timestamp` handlers exist but there is no way for a user to reach them. The video review/timestamp feature is wired but unreachable.

---

## 🟢 Performance Issues

### PF-1: Main.js is 4288+ lines — monolithic file

- **Problem:** All routing, rendering, event dispatching, modals, and helpers are in a single file (`src/main.js` at 4288 lines). This is a performance and maintainability concern. Every page render re-executes large template strings.

### PF-2: `AppStorage.load()` called redundantly in many handlers

- **Problem:** Multiple handlers call `await AppStorage.load()` to get the full dataset even when they only need a single record. For example, `sp-add-student` loads all data just to find the current school.

### PF-3: No pagination limits on Students, Counselors, Courses lists

- **File:** `src/school-portal.js`
- **Problem:** While pagination page buttons exist, there is no server-side pagination. The full dataset is loaded into memory and client-side sliced. At scale (10k+ students), this will be unusable.

---

## 🔘 Future Enhancements

### FE-1: No password reset flow

- **File:** Auth flow in `src/main.js`
- **Problem:** Login has email + password fields, but no "Forgot Password?" link.

### FE-2: No dark mode toggle

- **File:** Theme toggle is a placeholder (`src/main.js` near line 4246)
- **Problem:** The theme toggle exists in the UI but does not persist preference or toggle between light/dark.

### FE-3: Notifications have no mark-as-read or dismiss action

- **File:** `src/main.js` — notification sidebar render
- **Problem:** Notifications render in a sidebar but have no click handler to mark as read, navigate to the related entity, or dismiss.

### FE-4: No audit log

- **Problem:** No activity/audit log exists for tracking who created/edited/deleted what.

---

## Summary

| Category | Count |
|---|---|
| 🔴 Launch Blocker | 3 |
| 🟠 Critical Bug | 1 |
| 🟡 Major Bug | 4 |
| 🔵 Minor Bug | 4 |
| 🟣 UX Issue | 5 |
| ⚪ Missing Workflow | 5 |
| 🟢 Performance Issue | 3 |
| 🔘 Future Enhancement | 4 |
| **TOTAL** | **29** |

### Priority Order for Fixing

1. **LB-1** — Inject real Supabase credentials so the app can boot.
2. **LB-2** — Fix duplicate `openEdit` / stripped modal data loss (data corruption on every student edit).
3. **LB-3** — Fix or remove `delete-school` handler (crashes if triggered).
4. **CR-1** — Fix bare catch blocks that swallow errors silently.
5. **MJ-1 to MJ-4** — Fix empty states, orphan handlers, and the search UX.
6. **MN-1 to MN-4** — Minor bugs.
7. **UX-1 to UX-5, MW-1 to MW-5** — UX and workflow gaps.
8. **PF-1 to PF-3** — Performance.
