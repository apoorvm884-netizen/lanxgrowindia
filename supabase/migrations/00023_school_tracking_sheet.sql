alter table public.schools
  add column if not exists tracking_sheet_id text;

alter table public.schools
  drop constraint if exists schools_tracking_sheet_id_check;
alter table public.schools
  add constraint schools_tracking_sheet_id_check
  check (
    tracking_sheet_id is null
    or tracking_sheet_id ~ '^[A-Za-z0-9_-]{20,200}$'
  );

comment on column public.schools.tracking_sheet_id is
  'Google Spreadsheet ID used by the isolated vehicle tracking connector.';

create or replace function public.protect_school_tracking_sheet_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.tracking_sheet_id is not null
       and current_user not in ('postgres', 'service_role', 'supabase_admin')
       and not public.is_super_admin() then
      raise exception 'Only Super Admin can set the tracking Sheet ID';
    end if;
  elsif new.tracking_sheet_id is distinct from old.tracking_sheet_id
        and current_user not in ('postgres', 'service_role', 'supabase_admin')
        and not public.is_super_admin() then
      raise exception 'Only Super Admin can change the tracking Sheet ID';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_school_tracking_sheet_id on public.schools;
create trigger protect_school_tracking_sheet_id
before insert or update on public.schools
for each row execute function public.protect_school_tracking_sheet_id();
