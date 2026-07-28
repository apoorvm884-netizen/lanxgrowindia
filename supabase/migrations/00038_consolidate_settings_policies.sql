-- Consolidate settings policies so each action evaluates one tenant-aware
-- predicate instead of multiple permissive policies.

drop policy if exists "Super admins can read all settings" on public.settings;
drop policy if exists "Super admins can insert settings" on public.settings;
drop policy if exists "Super admins can update settings" on public.settings;
drop policy if exists "Super admins can delete settings" on public.settings;
drop policy if exists "Company admins can read own company settings" on public.settings;
drop policy if exists "Company admins can insert own company settings" on public.settings;
drop policy if exists "Company admins can update own company settings" on public.settings;
drop policy if exists "Company admins can delete own company settings" on public.settings;

create policy "Authorized admins read scoped settings"
  on public.settings for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_company_admin()
      and company_id = public.get_user_company_id()
    )
  );

create policy "Authorized admins insert scoped settings"
  on public.settings for insert to authenticated
  with check (
    (public.is_super_admin() and company_id is null)
    or (
      public.is_company_admin()
      and company_id = public.get_user_company_id()
    )
  );

create policy "Authorized admins update scoped settings"
  on public.settings for update to authenticated
  using (
    (public.is_super_admin() and company_id is null)
    or (
      public.is_company_admin()
      and company_id = public.get_user_company_id()
    )
  )
  with check (
    (public.is_super_admin() and company_id is null)
    or (
      public.is_company_admin()
      and company_id = public.get_user_company_id()
    )
  );

create policy "Authorized admins delete scoped settings"
  on public.settings for delete to authenticated
  using (
    (public.is_super_admin() and company_id is null)
    or (
      public.is_company_admin()
      and company_id = public.get_user_company_id()
    )
  );
