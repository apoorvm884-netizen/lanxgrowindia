-- ==============================================================
-- LANXGROW COS — Company Settings Table
-- Migration 00009: Global platform settings
-- ==============================================================
-- Idempotent: safe to re-run
-- Ensures update_updated_at() function exists for the trigger
-- ==============================================================

-- Ensure trigger function exists (defined in 00003, re-create if missing)
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Settings table
create table if not exists public.settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  value       jsonb not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.settings enable row level security;

-- Policies
drop policy if exists "Super admins can read all settings" on public.settings;
create policy "Super admins can read all settings"
  on public.settings for select
  using (public.is_super_admin());

drop policy if exists "Super admins can insert settings" on public.settings;
create policy "Super admins can insert settings"
  on public.settings for insert
  with check (public.is_super_admin());

drop policy if exists "Super admins can update settings" on public.settings;
create policy "Super admins can update settings"
  on public.settings for update
  using (public.is_super_admin());

-- Trigger
drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.update_updated_at();

-- Default settings
insert into public.settings (key, value, description) values
  ('companyName', '"LanxGrow Learning"', 'Company display name'),
  ('language', '"en"', 'Default platform language'),
  ('timezone', '"UTC"', 'Default platform timezone'),
  ('maxUploadSize', '100', 'Maximum upload size in MB'),
  ('primaryColor', '"#1A56DB"', 'Primary brand color'),
  ('smtpHost', '"smtp.sendgrid.net"', 'SMTP server host'),
  ('smtpPort', '587', 'SMTP server port'),
  ('fromEmail', '"noreply@lanxgrow.com"', 'From email address'),
  ('fromName', '"LanxGrow Learning"', 'From name for emails')
on conflict (key) do nothing;
