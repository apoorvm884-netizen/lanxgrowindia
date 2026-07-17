# LANXGROW COS — Authentication Architecture

## 1. Overview

Supabase Auth is the **sole** authentication provider. No Firebase, no custom auth.

| Role | Login Method | Created By |
|------|-------------|-----------|
| Super Admin | Google OAuth | First signup (auto-promoted) |
| School Admin | Email/Password Invite | Super Admin via Edge Function |

---

## 2. Auth Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER (Frontend)                       │
│                                                             │
│  supabase.auth.signInWithOAuth({ provider: 'google' })      │
│  supabase.auth.signInWithPassword({ email, password })      │
│  supabase.auth.signOut()                                    │
└──────────┬──────────────────────────────────┬──────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐          ┌──────────────────────────┐
│   Supabase Auth     │          │  Supabase Auth           │
│   (Google OAuth)    │          │  (Email/Password)        │
└──────────┬──────────┘          └───────────┬──────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                         │
│                                                             │
│  auth.users table (managed by Supabase)                     │
│       │                                                     │
│       ▼                                                     │
│  TRIGGER: handle_new_user()                                 │
│       │                                                     │
│       ├── First user? → public.profiles.role = 'super_admin'│
│       └── Not first  → public.profiles.role = 'school_admin'│
│                                                             │
│  public.profiles table                                      │
│       │                                                     │
│       ▼                                                     │
│  RLS policies check auth.uid() against profiles             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Profile Creation Trigger

**File:** `supabase/migrations/00003_triggers.sql`

```sql
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles) into is_first;

  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             split_part(new.email, '@', 1)),
    case when is_first then 'super_admin' else 'school_admin' end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**First-user logic:** The very first `auth.users` insert triggers profile creation with `role = 'super_admin'`. All subsequent signups (Google or email invite) get `role = 'school_admin'`.

---

## 4. Invite Flow (School Admin)

```
Super Admin                    Edge Function                 Supabase
    │                              │                           │
    │  POST /invite-admin          │                           │
    │  { email, name, school_id }  │                           │
    ├─────────────────────────────►│                           │
    │                              │  Verify JWT → super_admin │
    │                              │                           │
    │                              │  supabaseAdmin.auth       │
    │                              │    .admin.inviteUserBy... │
    │                              ├──────────────────────────►│
    │                              │                           │
    │                              │  Update profile:          │
    │                              │  role='school_admin'      │
    │                              │  school_id=...            │
    │                              ├──────────────────────────►│
    │                              │                           │
    │  { success: true }           │                           │
    │◄─────────────────────────────┤                           │
    │                              │                           │
    │  Supabase sends invite email │                           │
    │  (user clicks magic link)    │                           │
    │                              │                           │
```

**Note:** The trigger creates the profile first (with `school_admin` role by default, since it's not the first user). The Edge Function then **updates** the profile to set the `school_id` immediately after the user is created.

---

## 5. Google OAuth Configuration

**Required (Supabase Dashboard):**
1. Navigate to Authentication → Providers → Google
2. Enable Google provider
3. Enter Client ID and Client Secret from Google Cloud Console

**Google Cloud Console Setup:**
1. Go to APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI:
   `https://<project>.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase dashboard

---

## 6. Session & Token Handling

**Automatic (handled by Supabase SDK):**
- Access token (JWT) — short-lived (1 hour by default)
- Refresh token — long-lived, used to rotate access tokens
- `supabase.auth.onAuthStateChange` fires on sign-in, sign-out, token refresh
- Supabase SDK automatically refreshes tokens before expiry

**How frontend gets the JWT:**

```js
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token; // used for Edge Function calls
```

**How Edge Function verifies JWT:**

```ts
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Verify user exists and is super_admin
const { data: { user } } = await supabaseAdmin.auth.getUser(
  req.headers.get('Authorization')?.replace('Bearer ', '') || ''
);

if (!user) return new Response('Unauthorized', { status: 401 });

const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'super_admin') {
  return new Response('Forbidden', { status: 403 });
}
```

---

## 7. Environment Variables

```bash
# Frontend (browser-safe)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>

# Backend / Edge Functions (NEVER in client bundle)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

---

## 8. Security Rules

| Rule | Reason |
|------|--------|
| Never expose `SUPABASE_SERVICE_ROLE_KEY` to client | Full database access |
| Never allow direct `INSERT` on `profiles` | Role escalation attack |
| Never allow `UPDATE` on `auth.users` | `auth.users` is managed by Supabase Auth |
| Never store passwords in `public` schema | Use Supabase Auth only |
| Always check `profile.role` in Edge Functions | Defence in depth against direct function calls |
| Always use RLS as primary authorization | Even if client code is compromised, RLS blocks |

---

## 9. Testing Auth Locally

```bash
# 1. Install Supabase CLI
brew install supabase/tap/supabase

# 2. Start local Supabase
supabase start

# 3. Apply migrations
supabase migration up

# 4. Access local dashboard
open http://localhost:54323

# 5. Get local credentials
supabase status
```

Local Supabase includes a full auth system. Test flows:
- Sign up with email/password → verify profile created with correct role
- Sign in with Google → disabled locally, test with email instead
- RLS policies → run `supabase db test`
