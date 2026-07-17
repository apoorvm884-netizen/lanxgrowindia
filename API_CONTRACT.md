# LANXGROW COS — API Contract Specification

## 1. Overview

| Property | Value |
|----------|-------|
| **Backend** | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| **Client SDK** | `@supabase/supabase-js` (browser) |
| **Auth Provider** | Supabase Auth (Google OAuth + Email/Password) |
| **Auth Strategy** | Row Level Security (no server-side middleware for CRUD) |
| **Privileged Ops** | Supabase Edge Functions (Deno, service-role key) |
| **Real-time** | Supabase Realtime (future) |
| **File Storage** | Supabase Storage (migration phase 2) |

### Security Principle

**The frontend NEVER has the service-role key.** All CRUD on business tables is authorized by Supabase Row Level Security (RLS), which checks `auth.uid()` against the `profiles` table. Operations that require elevated privileges (creating auth users, assigning roles) run in Edge Functions using the service-role key.

---

## 2. Authentication

### 2.1 Super Admin — Google OAuth

```
POST /auth/v1/authorize?provider=google
```

**Client call:**
```js
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
});
```

**Flow:**
1. User clicks "Sign in with Google"
2. Supabase redirects to Google consent screen
3. On callback, Supabase creates a new `auth.users` row
4. Trigger `handle_new_user()` creates a `public.profiles` row
5. **First user ever** gets `role = 'super_admin'`
6. Subsequent users get `role = 'school_admin'`

### 2.2 School Admin — Email/Password Invite

**Invite (Edge Function):**
```
POST /functions/v1/invite-admin
Authorization: Bearer <anon-key>
Body: { "email": "...", "name": "...", "school_id": "..." }
```

**Flow:**
1. Super admin submits invite form → calls Edge Function
2. Edge Function uses service-role key to call `supabase.auth.admin.inviteUserByEmail()`
3. Supabase sends invitation email with magic link
4. On first login, `handle_new_user()` trigger creates profile with `role = 'school_admin'` and `school_id` set (see Edge Function implementation for setting school_id on invite)

### 2.3 Session Management

```js
// Check session
const { data: { session } } = await supabase.auth.getSession();

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  // event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED'
});
```

### 2.4 Auth Error Codes

| Error | Meaning |
|-------|---------|
| `invalid_credentials` | Wrong email/password |
| `user_not_found` | No account for this email |
| `email_not_confirmed` | User has not verified email |
| `provider_disabled` | Google OAuth not enabled in Supabase dashboard |
| `otp_expired` | Magic link or one-time code expired |

---

## 3. Resources

### 3.1 Schools

**Table:** `public.schools`

| Operation | Client | Auth | RLS |
|-----------|--------|------|-----|
| List all | `supabase.from('schools').select('*')` | `super_admin` | `is_super_admin()` |
| List own | `supabase.from('schools').select('*').eq('id', schoolId)` | `school_admin` | `id = get_user_school_id()` |
| Get one | `supabase.from('schools').select('*').eq('id', id).single()` | Both | Mixed |
| Create | `supabase.from('schools').insert({...})` | `super_admin` | `is_super_admin()` |
| Update | `supabase.from('schools').update({...}).eq('id', id)` | `super_admin` | `is_super_admin()` |
| Delete | `supabase.from('schools').delete().eq('id', id)` | `super_admin` | `is_super_admin()` |

**Schema:**

```typescript
interface School {
  id: string;           // uuid
  name: string;         // required
  code: string;         // required, unique
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;   // ISO 8601
  updated_at: string;   // ISO 8601
}
```

### 3.2 Categories

**Table:** `public.categories`

| Operation | RLS Check |
|-----------|-----------|
| List all | `is_super_admin()` OR `school_id = get_user_school_id()` |
| Create | `is_super_admin()` OR `school_id = get_user_school_id()` |
| Update | Same as above |
| Delete | Same as above |

```typescript
interface Category {
  id: string;
  name: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}
```

### 3.3 Subjects

**Table:** `public.subjects`

Same RLS pattern as Categories. Subjects always scoped to a school via `school_id`.

```typescript
interface Subject {
  id: string;
  name: string;
  school_id: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}
```

### 3.4 Sections

**Table:** `public.sections`

Same RLS pattern.

```typescript
interface Section {
  id: string;
  name: string;
  school_id: string;
  subject_id: string;
  created_at: string;
  updated_at: string;
}
```

### 3.5 Content

**Table:** `public.content`

Same RLS pattern.

```typescript
interface Content {
  id: string;
  name: string;
  type: 'Video' | 'PDF' | 'Image' | 'Document' | 'Other';
  url: string | null;
  size: string | null;
  school_id: string;
  section_id: string | null;
  description: string | null;
  tags: string[] | null;
  status: 'draft' | 'published' | 'archived' | 'review';
  created_at: string;
  updated_at: string;
}
```

### 3.6 Profiles

**Table:** `public.profiles`

| Operation | RLS |
|-----------|-----|
| Select own | `id = auth.uid()` |
| Select any | `is_super_admin()` |
| Insert | **Disabled** (RLS `with check (false)`) — only trigger/service-role |
| Update own name | `id = auth.uid()` (cannot change `role` or `school_id`) |
| Update any | `is_super_admin()` |
| Delete | **Disabled** — only service-role |

```typescript
interface Profile {
  id: string;           // references auth.users.id
  name: string;
  role: 'super_admin' | 'school_admin';
  school_id: string | null;
  created_at: string;
  updated_at: string;
}
```

### 3.7 Audit Logs

**Table:** `public.audit_logs`

| Operation | RLS |
|-----------|-----|
| Insert | `auth.role() = 'authenticated'` (any logged-in user) |
| Select | `is_super_admin()` OR any authenticated user |
| Update/Delete | **Disabled** (immutable log) |

```typescript
interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string;
  action: 'created' | 'edited' | 'uploaded' | 'deleted' | 'suspended' | 'approved' | 'rejected';
  entity: string;       // e.g. 'School', 'Category', 'Content'
  entity_name: string;
  detail: string | null;
  created_at: string;
}
```

---

## 4. Edge Functions

### 4.1 `invite-admin`

**Endpoint:** `POST /functions/v1/invite-admin`

**Purpose:** Create an auth user and assign them as school_admin for a specific school.

**Auth:** Super admin only (checks JWT → profile.role === 'super_admin').

**Request:**
```json
{
  "email": "teacher@school.com",
  "name": "Jane Smith",
  "school_id": "a0000000-0000-0000-0000-000000000001"
}
```

**Response (200):**
```json
{
  "success": true,
  "user_id": "uuid-of-new-user"
}
```

**Response (403):**
```json
{
  "success": false,
  "error": "Only super admins can invite users."
}
```

**Implementation notes (Deno):**
```ts
// Uses service-role key to:
const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
// Then updates the auto-created profile:
await supabaseAdmin.from('profiles').update({
  role: 'school_admin',
  school_id: schoolId,
  name: name
}).eq('id', data.user.id);
```

### 4.2 `create-school-with-admin`

**Endpoint:** `POST /functions/v1/create-school-with-admin`

**Purpose:** Create a school and its admin user atomically.

**Auth:** Super admin only.

**Request:**
```json
{
  "school": { "name": "New School", "code": "NEW001" },
  "admin": { "email": "admin@newschool.com", "name": "Admin Name" }
}
```

---

## 5. Error Response Format

All errors follow this shape:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Invalid input |
| `CONFLICT` | 409 | Duplicate (e.g. school code) |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 6. File Storage (Phase 2)

Content files (videos, PDFs, images) will be stored in **Supabase Storage** buckets:

| Bucket | Visibility | Access |
|--------|-----------|--------|
| `content-videos` | Private | RLS via Storage policies |
| `content-documents` | Private | RLS via Storage policies |

Storage policies will mirror the table RLS: school admins can only access files belonging to their school.

**Signed URLs** (short-lived, 1 hour) will be generated for playback/preview:
```js
const { data } = await supabase.storage
  .from('content-videos')
  .createSignedUrl(filePath, 3600);
```

---

## 7. Real-time Subscriptions (Phase 2)

```js
// Subscribe to changes on a school's content
const channel = supabase
  .channel('content-changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'content',
      filter: `school_id=eq.${schoolId}` },
    (payload) => { /* update UI */ }
  )
  .subscribe();
```

---

## 8. Rate Limiting & Security

| Layer | Mechanism |
|-------|-----------|
| Auth | Supabase Auth rate limiting (configurable in dashboard) |
| Database | RLS on every table |
| Edge Functions | JWT verification on every request |
| Storage | RLS policies mirror table access |
| Client | Input validation before sending to server (defence in depth) |
