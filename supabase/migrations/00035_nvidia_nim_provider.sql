-- Add NVIDIA NIM to Orbit's supported provider chain while keeping external
-- AI processing disabled until the administrator gives explicit approval.

alter table public.ai_providers
  drop constraint if exists ai_providers_provider_check;

alter table public.ai_providers
  add constraint ai_providers_provider_check
  check (provider in ('gemini', 'openai', 'openrouter', 'nvidia'));

alter table public.ai_providers
  drop constraint if exists ai_providers_base_url_check;

alter table public.ai_providers
  add constraint ai_providers_base_url_check
  check (
    (provider = 'gemini' and base_url = 'https://generativelanguage.googleapis.com/v1beta')
    or (provider = 'openai' and base_url = 'https://api.openai.com/v1')
    or (provider = 'openrouter' and base_url = 'https://openrouter.ai/api/v1')
    or (provider = 'nvidia' and base_url = 'https://integrate.api.nvidia.com/v1')
  );

drop policy if exists "Company admins can read company ai providers" on public.ai_providers;
create policy "Company admins can read company ai providers"
  on public.ai_providers for select to authenticated
  using (
    public.is_company_admin()
    and (
      school_id is null
      or public.user_in_same_company(school_id)
    )
  );

drop policy if exists "Company admins can insert company ai providers" on public.ai_providers;
create policy "Company admins can insert company ai providers"
  on public.ai_providers for insert to authenticated
  with check (
    public.is_company_admin()
    and school_id is not null
    and public.user_in_same_company(school_id)
  );

drop policy if exists "Company admins can update company ai providers" on public.ai_providers;
create policy "Company admins can update company ai providers"
  on public.ai_providers for update to authenticated
  using (
    public.is_company_admin()
    and school_id is not null
    and public.user_in_same_company(school_id)
  )
  with check (
    public.is_company_admin()
    and school_id is not null
    and public.user_in_same_company(school_id)
  );

drop policy if exists "Company admins can delete company ai providers" on public.ai_providers;
create policy "Company admins can delete company ai providers"
  on public.ai_providers for delete to authenticated
  using (
    public.is_company_admin()
    and school_id is not null
    and public.user_in_same_company(school_id)
  );

create table if not exists public.platform_ai_settings (
  id boolean primary key default true check (id),
  external_processing_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.platform_ai_settings (id, external_processing_enabled)
values (true, false)
on conflict (id) do nothing;

alter table public.platform_ai_settings enable row level security;
revoke all on table public.platform_ai_settings from public, anon, authenticated;

create or replace function public.set_ai_provider_secret(
  p_provider_id uuid,
  p_api_key text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider public.ai_providers%rowtype;
  v_fingerprint text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
    into v_provider
  from public.ai_providers
  where id = p_provider_id;

  if not found then
    raise exception 'AI provider not found' using errcode = 'P0002';
  end if;

  if not (
    public.is_super_admin()
    or (
      public.is_company_admin()
      and v_provider.school_id is not null
      and public.user_in_same_company(v_provider.school_id)
    )
  ) then
    raise exception 'Not authorized to manage this provider' using errcode = '42501';
  end if;

  if p_api_key is null or length(trim(p_api_key)) < 12 then
    raise exception 'Enter a valid API key' using errcode = '22023';
  end if;

  v_fingerprint :=
    left(trim(p_api_key), 4) || '...' || right(trim(p_api_key), 4);

  insert into public.ai_provider_secrets (
    provider_id,
    api_key,
    key_fingerprint,
    rotated_by,
    updated_at
  )
  values (
    p_provider_id,
    trim(p_api_key),
    v_fingerprint,
    auth.uid(),
    now()
  )
  on conflict (provider_id) do update
    set api_key = excluded.api_key,
        key_fingerprint = excluded.key_fingerprint,
        rotated_by = excluded.rotated_by,
        updated_at = excluded.updated_at;

  update public.ai_providers
  set key_fingerprint = v_fingerprint,
      needs_attention = false,
      consecutive_failures = 0,
      last_error = null,
      updated_at = now()
  where id = p_provider_id;
end;
$$;

revoke all on function public.set_ai_provider_secret(uuid, text)
  from public, anon;
grant execute on function public.set_ai_provider_secret(uuid, text)
  to authenticated;
