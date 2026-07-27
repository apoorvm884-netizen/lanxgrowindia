create extension if not exists supabase_vault with schema vault;

create table if not exists public.tracking_system_settings (
  id boolean primary key default true check (id),
  service_account_email text,
  private_key_secret_id uuid,
  webhook_secret_id uuid,
  input_speed_unit text not null default 'knots'
    check (input_speed_unit in ('kmh', 'knots', 'mph', 'mps')),
  stop_speed_kmh double precision not null default 2
    check (stop_speed_kmh > 0),
  stop_radius_meters double precision not null default 20
    check (stop_radius_meters > 0),
  stop_minutes double precision not null default 3
    check (stop_minutes > 0),
  journey_end_minutes double precision not null default 10
    check (journey_end_minutes > stop_minutes),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.tracking_system_settings enable row level security;
revoke all on table public.tracking_system_settings from anon, authenticated;
grant all on table public.tracking_system_settings to service_role;

insert into public.tracking_system_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.tracking_device_state (
  device_id uuid primary key references public.gps_devices(id) on delete cascade,
  journey_started_at timestamptz,
  stationary_since timestamptz,
  stationary_latitude double precision,
  stationary_longitude double precision,
  journey_ended_for_stop boolean not null default false,
  last_ping_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.tracking_device_state enable row level security;
revoke all on table public.tracking_device_state from anon, authenticated;
grant all on table public.tracking_device_state to service_role;

create or replace function public.tracking_admin_config_status()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'serviceAccountEmail', s.service_account_email,
    'privateKeyConfigured', s.private_key_secret_id is not null,
    'webhookSecretConfigured', s.webhook_secret_id is not null,
    'inputSpeedUnit', s.input_speed_unit,
    'stopSpeedKmh', s.stop_speed_kmh,
    'stopRadiusMeters', s.stop_radius_meters,
    'stopMinutes', s.stop_minutes,
    'journeyEndMinutes', s.journey_end_minutes,
    'updatedAt', s.updated_at
  )
  from public.tracking_system_settings s
  where s.id = true;
$$;

create or replace function public.tracking_admin_save_config(
  p_service_account_email text,
  p_private_key text default null,
  p_webhook_secret text default null,
  p_input_speed_unit text default 'knots',
  p_stop_speed_kmh double precision default 2,
  p_stop_radius_meters double precision default 20,
  p_stop_minutes double precision default 3,
  p_journey_end_minutes double precision default 10,
  p_updated_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_private_key_id uuid;
  v_webhook_secret_id uuid;
begin
  if p_service_account_email is null
     or p_service_account_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'A valid Google service account email is required';
  end if;
  if p_input_speed_unit not in ('kmh', 'knots', 'mph', 'mps') then
    raise exception 'Invalid input speed unit';
  end if;
  if p_stop_speed_kmh <= 0 or p_stop_radius_meters <= 0 or p_stop_minutes <= 0 then
    raise exception 'Tracking thresholds must be positive';
  end if;
  if p_journey_end_minutes <= p_stop_minutes then
    raise exception 'Journey end minutes must be greater than stop minutes';
  end if;

  select private_key_secret_id, webhook_secret_id
    into v_private_key_id, v_webhook_secret_id
  from public.tracking_system_settings
  where id = true
  for update;

  if nullif(btrim(p_private_key), '') is not null then
    if p_private_key not like '%BEGIN PRIVATE KEY%'
       or p_private_key not like '%END PRIVATE KEY%' then
      raise exception 'Google private key is not in PEM format';
    end if;
    if v_private_key_id is null then
      v_private_key_id := vault.create_secret(
        p_private_key,
        'lanxgrow_google_service_account_private_key',
        'Google Sheets tracking service account private key'
      );
    else
      perform vault.update_secret(v_private_key_id, p_private_key);
    end if;
  end if;

  if nullif(btrim(p_webhook_secret), '') is not null then
    if length(p_webhook_secret) < 24 then
      raise exception 'Webhook secret must be at least 24 characters';
    end if;
    if v_webhook_secret_id is null then
      v_webhook_secret_id := vault.create_secret(
        p_webhook_secret,
        'lanxgrow_telemetry_webhook_secret',
        'Secret used to authenticate incoming telemetry'
      );
    else
      perform vault.update_secret(v_webhook_secret_id, p_webhook_secret);
    end if;
  end if;

  update public.tracking_system_settings
  set service_account_email = btrim(p_service_account_email),
      private_key_secret_id = v_private_key_id,
      webhook_secret_id = v_webhook_secret_id,
      input_speed_unit = p_input_speed_unit,
      stop_speed_kmh = p_stop_speed_kmh,
      stop_radius_meters = p_stop_radius_meters,
      stop_minutes = p_stop_minutes,
      journey_end_minutes = p_journey_end_minutes,
      updated_at = now(),
      updated_by = p_updated_by
  where id = true;
end;
$$;

create or replace function public.tracking_admin_remove_secret(p_secret_type text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  if p_secret_type = 'private_key' then
    select private_key_secret_id into v_secret_id
    from public.tracking_system_settings where id = true for update;
    update public.tracking_system_settings
    set private_key_secret_id = null, updated_at = now()
    where id = true;
  elsif p_secret_type = 'webhook_secret' then
    select webhook_secret_id into v_secret_id
    from public.tracking_system_settings where id = true for update;
    update public.tracking_system_settings
    set webhook_secret_id = null, updated_at = now()
    where id = true;
  else
    raise exception 'Unknown secret type';
  end if;

  if v_secret_id is not null then
    delete from vault.secrets where id = v_secret_id;
  end if;
end;
$$;

create or replace function public.tracking_runtime_config()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'serviceAccountEmail', s.service_account_email,
    'privateKey', pk.decrypted_secret,
    'webhookSecret', wh.decrypted_secret,
    'inputSpeedUnit', s.input_speed_unit,
    'stopSpeedKmh', s.stop_speed_kmh,
    'stopRadiusMeters', s.stop_radius_meters,
    'stopMinutes', s.stop_minutes,
    'journeyEndMinutes', s.journey_end_minutes
  )
  from public.tracking_system_settings s
  left join vault.decrypted_secrets pk on pk.id = s.private_key_secret_id
  left join vault.decrypted_secrets wh on wh.id = s.webhook_secret_id
  where s.id = true;
$$;

revoke all on function public.tracking_admin_config_status() from public, anon, authenticated;
revoke all on function public.tracking_admin_save_config(text, text, text, text, double precision, double precision, double precision, double precision, uuid) from public, anon, authenticated;
revoke all on function public.tracking_admin_remove_secret(text) from public, anon, authenticated;
revoke all on function public.tracking_runtime_config() from public, anon, authenticated;

grant execute on function public.tracking_admin_config_status() to service_role;
grant execute on function public.tracking_admin_save_config(text, text, text, text, double precision, double precision, double precision, double precision, uuid) to service_role;
grant execute on function public.tracking_admin_remove_secret(text) to service_role;
grant execute on function public.tracking_runtime_config() to service_role;

comment on table public.tracking_system_settings is
  'Non-secret tracking settings plus references to encrypted Supabase Vault secrets.';
comment on function public.tracking_runtime_config() is
  'Service-role-only runtime access to decrypted tracking credentials.';
