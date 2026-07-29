-- School login credentials belong exclusively in Supabase Auth.
-- This legacy column is unused by the current provisioning flow and must not
-- expose plaintext passwords through school records.

alter table public.schools
  drop column if exists admin_password;
