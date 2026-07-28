-- ==============================================================
-- LANXGROW COS — Realtime, tenant-scoped activity logs
-- Migration 00030
-- ==============================================================

alter table public.audit_logs
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  add column if not exists actor_role text,
  add column if not exists status text not null default 'successful',
  add column if not exists source text not null default 'dashboard',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_logs_status_check'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_status_check
      check (status in ('successful', 'failed'));
  end if;
end;
$$;

update public.audit_logs a
set company_id = coalesce(
  a.company_id,
  (select s.company_id from public.schools s where s.id = a.school_id),
  (select p.company_id from public.profiles p where p.id = a.user_id)
)
where a.company_id is null;

update public.audit_logs a
set actor_role = p.role
from public.profiles p
where a.actor_role is null
  and p.id = a.user_id;

create index if not exists idx_audit_logs_created_at
  on public.audit_logs(created_at desc);

create index if not exists idx_audit_logs_company_created_at
  on public.audit_logs(company_id, created_at desc);

create index if not exists idx_audit_logs_school_created_at
  on public.audit_logs(school_id, created_at desc);

alter table public.audit_logs enable row level security;

revoke all on table public.audit_logs from anon;
revoke update, delete, truncate on table public.audit_logs from authenticated;
grant select, insert on table public.audit_logs to authenticated;

drop policy if exists "Authenticated users can insert audit logs" on public.audit_logs;
drop policy if exists "Authenticated users can insert own audit logs" on public.audit_logs;
drop policy if exists "Super admins can read audit logs" on public.audit_logs;
drop policy if exists "Company admins can read own company audit logs" on public.audit_logs;
drop policy if exists "School admins can read own school audit logs" on public.audit_logs;
drop policy if exists "No updates on audit logs" on public.audit_logs;
drop policy if exists "No deletes on audit logs" on public.audit_logs;

create policy "Admins can insert scoped activity logs"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      public.is_super_admin()
      or (
        public.is_company_admin()
        and company_id = public.get_user_company_id()
        and (
          school_id is null
          or exists (
            select 1
            from public.schools s
            where s.id = school_id
              and s.company_id = public.get_user_company_id()
          )
        )
      )
      or (
        public.is_school_admin()
        and school_id = public.get_user_school_id()
        and (
          company_id is null
          or company_id = (
            select s.company_id
            from public.schools s
            where s.id = public.get_user_school_id()
          )
        )
      )
    )
  );

create policy "Super admins can read all activity logs"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_super_admin());

create policy "Company admins can read company activity logs"
  on public.audit_logs
  for select
  to authenticated
  using (
    public.is_company_admin()
    and company_id = public.get_user_company_id()
  );

create policy "School admins can read school activity logs"
  on public.audit_logs
  for select
  to authenticated
  using (
    public.is_school_admin()
    and school_id = public.get_user_school_id()
  );

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.log_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  previous_data jsonb;
  actor public.profiles%rowtype;
  changed_fields jsonb := '[]'::jsonb;
  target_name text;
  target_school_id uuid;
  target_company_id uuid;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  previous_data := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb)
      into changed_fields
    from jsonb_each(row_data) n
    where previous_data -> n.key is distinct from n.value;
  end if;

  select *
    into actor
  from public.profiles
  where id = auth.uid();

  target_name := coalesce(
    row_data ->> 'name',
    row_data ->> 'full_name',
    row_data ->> 'email',
    row_data ->> 'id',
    'Unknown profile'
  );
  target_school_id := nullif(row_data ->> 'school_id', '')::uuid;
  target_company_id := nullif(row_data ->> 'company_id', '')::uuid;

  insert into public.audit_logs (
    user_id,
    user_name,
    actor_role,
    action,
    entity,
    entity_name,
    detail,
    school_id,
    company_id,
    source,
    metadata
  )
  values (
    auth.uid(),
    coalesce(actor.name, actor.full_name, actor.email, 'System'),
    coalesce(actor.role, 'system'),
    case
      when tg_op = 'INSERT' then 'created'
      when tg_op = 'UPDATE' then 'edited'
      else 'deleted'
    end,
    'Profile',
    target_name,
    case
      when tg_op = 'INSERT' then format('Profile "%s" created', target_name)
      when tg_op = 'UPDATE' then format('Profile "%s" updated', target_name)
      else format('Profile "%s" deleted', target_name)
    end,
    target_school_id,
    coalesce(
      target_company_id,
      (select s.company_id from public.schools s where s.id = target_school_id),
      actor.company_id
    ),
    case when auth.uid() is null then 'system' else 'database' end,
    jsonb_build_object(
      'operation', lower(tg_op),
      'changed_fields', changed_fields
    )
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_audit_profile_insert on public.profiles;
drop trigger if exists trg_audit_profile_update on public.profiles;
drop trigger if exists trg_audit_profile_delete on public.profiles;

create trigger trg_audit_profile_insert
  after insert on public.profiles
  for each row execute function private.log_profile_change();

create trigger trg_audit_profile_update
  after update on public.profiles
  for each row execute function private.log_profile_change();

create trigger trg_audit_profile_delete
  after delete on public.profiles
  for each row execute function private.log_profile_change();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'audit_logs'
  ) then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
end;
$$;

