# PROJECT_RULES.md

## Project Overview

**Project Name:**  
LANXGROW INDIA / LANXGROW COS

**Purpose:**  
Educational Content Management Platform

**Current Stack:**  
*   **Frontend:** Existing application using the approved Google Stitch HTML design
*   **Backend:** Existing production backend
*   **Database:** Supabase
*   **Authentication:** Existing
*   **Routing:** Existing
*   **Deployment:** GitHub + Vercel
*   **Future Integrations:** Google Drive API, Firebase (if required)

**Objective:**  
To replace the frontend with the approved Stitch UI while preserving and extending the existing backend.

---

## RULE 1 — STITCH IS THE SINGLE SOURCE OF TRUTH

The provided Stitch HTML is the ONLY approved UI.
*   **Never** redesign.
*   **Never** simplify.
*   **Never** modernize.
*   **Never** replace layouts.
*   **Never** invent new pages.
*   **Never** rename approved screens.

Every screen must visually match the approved Stitch HTML.

---

## RULE 2 — PRESERVE BACKEND

Do not replace or alter the foundational systems:
*   Authentication
*   Supabase
*   Database schema
*   Services
*   Business logic
*   API contracts
*   Routing
*   Environment variables
*   Role system
*   Permission system
*   Google Drive architecture
*   Firebase architecture

**Only** extend existing functionality when strictly necessary.

---

## RULE 3 — NO HARDCODED DATA

**Never** hardcode information. Everything must come from the backend, including but not limited to:
*   Dashboard statistics
*   Users
*   Schools
*   Categories
*   Subjects
*   Sections
*   Videos
*   Reports
*   Audit logs
*   Settings
*   Permissions

---

## RULE 4 — EVERY BUTTON MUST WORK

Every visible action must perform a real backend operation.
*   **No** placeholder buttons.
*   **No** fake dialogs.
*   **No** dummy actions.

Every UI action must connect to an existing service or an explicitly approved new service.

---

## RULE 5 — IMPLEMENT FEATURE BY FEATURE

**Never** implement multiple unrelated modules together.
Follow the approved sprint order strictly:
1.  Complete one sprint.
2.  Test.
3.  Commit.
4.  Push.
5.  Deploy.
6.  Verify.
7.  **Only then** continue to the next feature.

---

## RULE 6 — NEVER DUPLICATE

**Never** create duplicate:
*   Components
*   Services
*   Routes
*   Utilities
*   Database logic
*   Business logic

Reuse existing code whenever possible.

---

## RULE 7 — READ DOCUMENTATION FIRST

Before implementing anything, you **must** consult the foundational documents in this order:
1.  `PROJECT_RULES.md`
2.  `IMPLEMENTATION_MAP.md`
3.  `STITCH_UI_REFERENCE.md`
4.  `SCREEN_ANALYSIS_REPORT.md`

**Never** guess if the answer already exists in these documents.

---

## RULE 8 — UI/BACKEND CONTRACT

Every frontend action must account for a complete lifecycle:
*   Frontend validation
*   Loading state
*   Backend service integration
*   Database update
*   Success state
*   Error handling
*   Audit logging (when applicable)
*   UI refresh

---

## RULE 9 — CODE QUALITY

Every implementation must:
*   Build successfully.
*   Have no console errors.
*   Have no broken imports.
*   Have no unused files.
*   Have no duplicate code.
*   Maintain accessibility standards.
*   Support desktop, tablet, and mobile viewports seamlessly.

---

## RULE 10 — GIT WORKFLOW

Every sprint ends with a strict pipeline:
1.  Build
2.  Manual verification
3.  Git commit
4.  Git push
5.  Vercel deployment
6.  Deployment verification

**Never** leave the repository in a broken state.

---

## RULE 11 — ERROR HANDLING

*   **Do not** silently ignore errors.
*   **Display** user-friendly messages.
*   **Log** meaningful debugging information.
*   **Never** swallow exceptions.

---

## RULE 12 — SECURITY

**Never** expose sensitive data in the codebase:
*   Secrets
*   API keys
*   Service keys
*   Database credentials

Use environment variables **only**.

---

## RULE 13 — GOOGLE DRIVE & FIREBASE

Do not implement Google Drive or Firebase backend logic until the designated integration phase. 
*   **Prepare the UI only.**
*   Integration mapping will be executed later.

---

## RULE 14 — AI BEHAVIOR

If a requirement is unclear or ambiguous:
*   **Do not guess.**
*   Search the project documentation first.
*   If it remains unclear, explicitly state what information is missing instead of inventing functionality.

---

## RULE 15 — DEFINITION OF DONE

A sprint is considered complete **ONLY** when:
*   The feature works end-to-end.
*   Backend communication is fully functional.
*   The database updates correctly.
*   The UI updates correctly to reflect changes.
*   Role and permission matrices are respected.
*   No regressions exist in previous features.
*   The build passes without warnings or errors.
*   Deployment succeeds on Vercel.
*   Manual verification passes.

---

## AI Implementation Checklist

*To be reviewed by every AI agent prior to executing any code modifications.*

- [ ] **Documentation Check:** Have I reviewed `PROJECT_RULES.md`, `IMPLEMENTATION_MAP.md`, `STITCH_UI_REFERENCE.md`, and `SCREEN_ANALYSIS_REPORT.md` for this specific task?
- [ ] **UI Fidelity:** Does my planned implementation 100% visually match the provided Stitch HTML without redesigning or simplifying?
- [ ] **Data Source:** Have I ensured absolutely zero hardcoded data will be used, and all data is piped from the backend/Supabase?
- [ ] **Backend Preservation:** Am I utilizing existing authentication, routing, and services without overwriting core business logic?
- [ ] **Scope Containment:** Am I staying strictly within the current feature/sprint without bleeding into unrelated modules?
- [ ] **End-to-End Contract:** Have I planned for frontend validation, loading states, API connections, error handling, and UI refreshes for every action?
- [ ] **Security Protocol:** Are all keys and credentials safely abstracted to environment variables?
- [ ] **D.O.D Verification:** Will this commit leave the repository in a buildable, deployable, and regression-free state?
