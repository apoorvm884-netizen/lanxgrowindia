-- Email/password is now the only login method for every role.
-- Keep admission_no as school data, but remove the obsolete student login key.
drop index if exists public.students_school_login_id_unique;
drop index if exists public.idx_students_login_id;
alter table public.students drop column if exists login_id;
