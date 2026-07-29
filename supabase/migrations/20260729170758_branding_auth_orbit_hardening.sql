-- Complete the branding, Orbit provider bootstrap, and safe asset access
-- required by the production dashboards.

alter table public.schools
  add column if not exists logo_url text;

alter table public.schools
  drop constraint if exists schools_logo_url_check;
alter table public.schools
  add constraint schools_logo_url_check
  check (logo_url is null or logo_url ~ '^https://[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=%-]+$');

create or replace function public.set_company_setting(
  p_key text,
  p_value jsonb,
  p_description text default null
)
returns public.settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_company_id uuid;
  v_result public.settings;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.role = 'super_admin' then
    v_company_id := null;
  elsif v_profile.role = 'company_admin' and v_profile.company_id is not null then
    v_company_id := v_profile.company_id;
  else
    raise exception 'Not authorized to manage company settings' using errcode = '42501';
  end if;

  if p_key not in (
    'companyName', 'language', 'timezone', 'maxUploadSize', 'primaryColor',
    'smtpHost', 'smtpPort', 'fromEmail', 'fromName', 'companyLogo',
    'faviconUrl', 'orbitLogo'
  ) then
    raise exception 'Unsupported setting key' using errcode = '22023';
  end if;

  update public.settings
  set value = p_value,
      description = coalesce(p_description, description),
      is_system_default = false,
      updated_at = now()
  where key = p_key
    and company_id is not distinct from v_company_id
  returning * into v_result;

  if not found then
    insert into public.settings (key, value, description, company_id, is_system_default)
    values (p_key, p_value, p_description, v_company_id, false)
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

revoke all on function public.set_company_setting(text, jsonb, text)
  from public, anon;
grant execute on function public.set_company_setting(text, jsonb, text)
  to authenticated;

create or replace function public.get_effective_branding()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_result jsonb;
begin
  if auth.uid() is not null then
    select company_id into v_company_id
    from public.profiles
    where id = auth.uid();
  end if;

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    into v_result
  from (
    select distinct on (s.key) s.key, s.value
    from public.settings s
    where s.key in ('companyName', 'companyLogo', 'faviconUrl', 'orbitLogo', 'primaryColor')
      and (s.company_id is null or s.company_id = v_company_id)
    order by s.key, (s.company_id is not null) desc, s.updated_at desc
  ) e;

  return v_result;
end;
$$;

revoke all on function public.get_effective_branding() from public;
grant execute on function public.get_effective_branding() to anon, authenticated;

update storage.buckets
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'branding-assets';

drop policy if exists "Authorized admins upload branding assets" on storage.objects;
create policy "Authorized admins upload branding assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'branding-assets'
    and (
      (public.is_super_admin() and (
        (storage.foldername(name))[1] = 'global'
        or (storage.foldername(name))[1] = 'schools'
      ))
      or (
        public.is_company_admin()
        and (
          (storage.foldername(name))[1] = public.get_user_company_id()::text
          or (
            (storage.foldername(name))[1] = 'schools'
            and public.user_in_same_company(
              case
                when (storage.foldername(name))[2] ~
                  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
                then ((storage.foldername(name))[2])::uuid
              end
            )
          )
        )
      )
      or (
        public.is_school_admin()
        and (storage.foldername(name))[1] = 'schools'
        and (storage.foldername(name))[2] = public.get_user_school_id()::text
      )
    )
  );

drop policy if exists "Authorized admins delete branding assets" on storage.objects;
create policy "Authorized admins delete branding assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'branding-assets'
    and (
      public.is_super_admin()
      or (
        public.is_company_admin()
        and (
          (storage.foldername(name))[1] = public.get_user_company_id()::text
          or (
            (storage.foldername(name))[1] = 'schools'
            and public.user_in_same_company(
              case
                when (storage.foldername(name))[2] ~
                  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
                then ((storage.foldername(name))[2])::uuid
              end
            )
          )
        )
      )
      or (
        public.is_school_admin()
        and (storage.foldername(name))[1] = 'schools'
        and (storage.foldername(name))[2] = public.get_user_school_id()::text
      )
    )
  );

create or replace function public.bootstrap_orbit_provider_from_api_key()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text;
  v_base_url text;
  v_model text;
begin
  if new.is_active is not true
     or new.key_type not in ('gemini', 'openai', 'openrouter', 'nvidia') then
    return new;
  end if;

  select p.label, p.base_url, p.model
    into v_label, v_base_url, v_model
  from (
    values
      ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', 'gemini-2.0-flash'),
      ('openai', 'OpenAI', 'https://api.openai.com/v1', 'gpt-4.1-mini'),
      ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'openai/gpt-4.1-mini'),
      ('nvidia', 'NVIDIA NIM', 'https://integrate.api.nvidia.com/v1', 'nvidia/nemotron-3-super-120b-a12b')
  ) as p(provider, label, base_url, model)
  where p.provider = new.key_type;

  if not exists (
    select 1 from public.ai_providers
    where provider = new.key_type and school_id is null
  ) then
    insert into public.ai_providers (
      label, provider, base_url, model, priority, enabled,
      max_output_tokens, temperature
    )
    values (
      v_label, new.key_type, v_base_url, v_model, 100, true, 1500, 0.3
    );
  else
    update public.ai_providers
    set enabled = true, updated_at = now()
    where provider = new.key_type and school_id is null;
  end if;

  return new;
end;
$$;

revoke all on function public.bootstrap_orbit_provider_from_api_key()
  from public, anon, authenticated;

drop trigger if exists api_keys_bootstrap_orbit_provider on public.api_keys;
create trigger api_keys_bootstrap_orbit_provider
after insert or update of key_type, is_active on public.api_keys
for each row execute function public.bootstrap_orbit_provider_from_api_key();

insert into public.ai_providers (
  label, provider, base_url, model, priority, enabled,
  max_output_tokens, temperature
)
select
  p.label, p.provider, p.base_url, p.model, 100, true, 1500, 0.3
from (
  values
    ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', 'gemini-2.0-flash'),
    ('openai', 'OpenAI', 'https://api.openai.com/v1', 'gpt-4.1-mini'),
    ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1', 'openai/gpt-4.1-mini'),
    ('nvidia', 'NVIDIA NIM', 'https://integrate.api.nvidia.com/v1', 'nvidia/nemotron-3-super-120b-a12b')
) as p(provider, label, base_url, model)
where exists (
  select 1 from public.api_keys k
  where k.key_type = p.provider and k.is_active and length(k.key_value) > 0
)
and not exists (
  select 1 from public.ai_providers a
  where a.provider = p.provider and a.school_id is null
);
