-- Make company settings tenant-aware and enable secure brand image uploads.

alter table public.settings
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists is_system_default boolean not null default false;

update public.settings
set is_system_default = true
where company_id is null
  and created_at = updated_at
  and (
    (key = 'companyName' and value = '"LanxGrow Learning"'::jsonb)
    or (key = 'language' and value = '"en"'::jsonb)
    or (key = 'timezone' and value = '"UTC"'::jsonb)
    or (key = 'maxUploadSize' and value = '100'::jsonb)
    or (key = 'primaryColor' and value = '"#1A56DB"'::jsonb)
    or (key = 'smtpHost' and value = '"smtp.sendgrid.net"'::jsonb)
    or (key = 'smtpPort' and value = '587'::jsonb)
    or (key = 'fromEmail' and value = '"noreply@lanxgrow.com"'::jsonb)
    or (key = 'fromName' and value = '"LanxGrow Learning"'::jsonb)
  );

alter table public.settings drop constraint if exists settings_key_key;

create unique index if not exists settings_global_key_uidx
  on public.settings (key)
  where company_id is null;

create unique index if not exists settings_company_key_uidx
  on public.settings (company_id, key)
  where company_id is not null;

create index if not exists settings_company_id_idx
  on public.settings (company_id);

drop policy if exists "Company admins can read own company settings" on public.settings;
create policy "Company admins can read own company settings"
  on public.settings for select to authenticated
  using (
    public.is_company_admin()
    and company_id = public.get_user_company_id()
  );

drop policy if exists "Company admins can insert own company settings" on public.settings;
create policy "Company admins can insert own company settings"
  on public.settings for insert to authenticated
  with check (
    public.is_company_admin()
    and company_id = public.get_user_company_id()
  );

drop policy if exists "Company admins can update own company settings" on public.settings;
create policy "Company admins can update own company settings"
  on public.settings for update to authenticated
  using (
    public.is_company_admin()
    and company_id = public.get_user_company_id()
  )
  with check (
    public.is_company_admin()
    and company_id = public.get_user_company_id()
  );

drop policy if exists "Company admins can delete own company settings" on public.settings;
create policy "Company admins can delete own company settings"
  on public.settings for delete to authenticated
  using (
    public.is_company_admin()
    and company_id = public.get_user_company_id()
  );

drop policy if exists "Super admins can update settings" on public.settings;
create policy "Super admins can update settings"
  on public.settings for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super admins can delete settings" on public.settings;
create policy "Super admins can delete settings"
  on public.settings for delete to authenticated
  using (public.is_super_admin());

grant select, insert, update, delete on table public.settings to authenticated;

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
    'smtpHost', 'smtpPort', 'fromEmail', 'fromName', 'companyLogo'
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

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'branding-assets',
  'branding-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authorized admins upload branding assets" on storage.objects;
create policy "Authorized admins upload branding assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'branding-assets'
    and (
      (public.is_super_admin() and (storage.foldername(name))[1] = 'global')
      or (
        public.is_company_admin()
        and (storage.foldername(name))[1] = public.get_user_company_id()::text
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
        and (storage.foldername(name))[1] = public.get_user_company_id()::text
      )
    )
  );
