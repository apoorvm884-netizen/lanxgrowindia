# LANXGROW COS — Security Checklist

## Principle

**Never trust the frontend.** Every request is treated as potentially malicious. Authorization is enforced server-side (RLS) and in Edge Functions.

---

## ✅ Database

| # | Check | Status |
|---|-------|--------|
| 1 | RLS enabled on ALL public tables | `00002_rls.sql` |
| 2 | No table allows unrestricted SELECT | Verified per table |
| 3 | No table allows anonymous INSERT | All `with check` references `auth.uid()` |
| 4 | Audit logs are append-only | UPDATE/DELETE policies return false |
| 5 | Profile role changes require super_admin | `with check` in profile update policy locks role |
| 6 | Passwords never stored in `public` schema | Supabase Auth handles all credentials |
| 7 | Service role key never used in client code | Only in Edge Functions |
| 8 | Functions use `security definer` where needed | RLS helpers use `security definer` |

## ✅ Authentication

| # | Check | Status |
|---|-------|--------|
| 9 | Google OAuth configured via Supabase dashboard | Requires setup |
| 10 | Email/password auth disabled for public signup | Only invite-based |
| 11 | First user auto-promoted to super_admin | `00003_triggers.sql` |
| 12 | Session refresh handled by Supabase SDK | Automatic |
| 13 | Auth state changes subscribed on every page load | `onAuthStateChange` |

## ✅ Edge Functions

| # | Check | Status |
|---|-------|--------|
| 14 | JWT verified before any operation | `supabaseAdmin.auth.getUser()` or custom check |
| 15 | Service role key stored as environment variable | `SUPABASE_SERVICE_ROLE_KEY` |
| 16 | No sensitive data in function logs | Audit before logging |
| 17 | Input validation on every parameter | `zod` or manual checks |

## ✅ Frontend

| # | Check | Status |
|---|-------|--------|
| 18 | Anon key only (public, safe for client) | Never expose service role key |
| 19 | API keys from environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| 20 | No secrets in browser storage | Session managed by Supabase |
| 21 | Input sanitised before display | Escape HTML (defence in depth) |
| 22 | Error messages do not leak schema details | Generic user-facing messages |
| 23 | All mutations go through Supabase client | No raw fetch() to API |

## ✅ File Storage (Phase 2)

| # | Check | Status |
|---|-------|--------|
| 24 | Storage bucket is private by default | `if-match` header enforced |
| 25 | Signed URLs have short expiry (1 hour) | `createSignedUrl` with TTL |
| 26 | Storage RLS mirrors table RLS | Same school_id checks |
| 27 | File type validation on upload | Server-side MIME check |

## ✅ Operations

| # | Check | Status |
|---|-------|--------|
| 28 | All CRUD operations audited | Trigger on profiles; manual for others |
| 29 | School admin can only access own school data | RLS `school_id = get_user_school_id()` |
| 30 | Deletion of school cascades to all child data | `on delete cascade` on FK constraints |
| 31 | No hardcoded credentials in codebase | All via `.env` |
| 32 | `.env.local` in `.gitignore` | Must be verified |

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| User modifies `school_id` in request | RLS ignores client `school_id`; it checks `get_user_school_id()` |
| User directly calls Supabase API from console | RLS blocks unauthorized access |
| User tampers with JWT | Supabase verifies JWT signature |
| User deletes audit log | UPDATE/DELETE policies return false |
| User creates a profile with `role = 'super_admin'` | Profile INSERT disabled; trigger only sets role |
| User reads another school's data | RLS filters by `school_id` |
| XSS via content name/title | Supabase SDK escapes; defence in depth with DOMPurify |
| CSRF | Supabase uses `Set-Cookie` with `SameSite=Lax` for session |

---

## Audit Logging

All state-changing operations should trigger an audit log entry:

| Operation | Audit Action |
|-----------|-------------|
| Create school | `created` |
| Update school | `edited` |
| Delete school | `deleted` |
| Upload content | `uploaded` |
| Approve content review | `approved` |
| Reject content review | `rejected` |
| Suspend school | `suspended` |
| Profile created | `created` (trigger) |
| Profile updated | `edited` (trigger) |

---

## Verification Steps Before Production

- [ ] Run `supabase db test` to verify RLS policies
- [ ] Attempt unauthenticated queries against every table
- [ ] Attempt cross-school data access as school_admin
- [ ] Verify service role key is NOT in any client bundle
- [ ] Verify Google OAuth works end-to-end
- [ ] Verify invite flow creates correct profile role
- [ ] Confirm `.env.local` is in `.gitignore`
- [ ] Run security scan on Edge Function code
