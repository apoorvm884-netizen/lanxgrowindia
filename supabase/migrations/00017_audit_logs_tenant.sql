-- ==============================================================
-- LANXGROW COS — Audit Log Tenant Isolation
-- Migration 00017: Add school_id column and scope RLS
-- ==============================================================
-- Run in Supabase Dashboard SQL Editor after 00016
-- Fixes: School admins could read logs from all tenants
-- ==============================================================

-- Add school_id column (nullable for backward compat with existing rows)
alter table public.audit_logs
  add column if not exists school_id uuid references public.schools(id) on delete set null;

create index if not exists idx_audit_logs_school_id on public.audit_logs(school_id);

-- Drop the overly-permissive school admin policy
drop policy if exists "School admins can read audit logs" on public.audit_logs;

-- Replace with school-scoped read policy
create policy "School admins can read own school audit logs"
  on public.audit_logs for select
  using (school_id = public.get_user_school_id());

-- Update the profile change trigger to also store school_id
create or replace function public.log_profile_change()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (user_id, user_name, action, entity, entity_name, detail, school_id)
  values (
    new.id,
    new.name,
    case
      when tg_op = 'INSERT' then 'created'
      when tg_op = 'UPDATE' then 'edited'
      else 'deleted'
    end,
    'Profile',
    new.name,
    format('Role: %s, School: %s', new.role, new.school_id),
    new.school_id
  );
  return new;
end;
$$;
