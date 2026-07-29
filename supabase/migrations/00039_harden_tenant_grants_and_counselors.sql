-- Remove table-owner privileges from browser roles and make counselor access
-- follow the approved company/school tenant hierarchy.

do $$
declare
  table_record record;
begin
  for table_record in
    select format('%I.%I', schemaname, tablename) as qualified_name
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, references, trigger on table %s from anon, authenticated',
      table_record.qualified_name
    );
    execute format(
      'revoke all privileges on table %s from anon',
      table_record.qualified_name
    );
  end loop;
end;
$$;

revoke all privileges on table public.counselors from anon;
revoke truncate, references, trigger on table public.counselors from authenticated;
grant select, insert, update, delete on table public.counselors to authenticated;
grant all privileges on table public.counselors to service_role;

drop policy if exists "Authenticated users can read counselors" on public.counselors;
drop policy if exists "School admins can manage their counselors" on public.counselors;
drop policy if exists "Service role can manage counselors" on public.counselors;

create policy "Scoped users read counselors"
  on public.counselors
  for select
  to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_company_admin()
      and public.user_in_same_company(school_id)
    )
    or (
      public.get_user_role() in ('school_admin', 'counselor', 'teacher')
      and school_id = public.get_user_school_id()
    )
    or (
      public.is_student()
      and exists (
        select 1
        from public.students student
        where student.user_id = (select auth.uid())
          and student.counselor_id = counselors.id
          and student.school_id = counselors.school_id
      )
    )
  );

create policy "Scoped admins insert counselors"
  on public.counselors
  for insert
  to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_company_admin()
      and public.user_in_same_company(school_id)
    )
    or (
      public.is_school_admin()
      and school_id = public.get_user_school_id()
    )
  );

create policy "Scoped admins update counselors"
  on public.counselors
  for update
  to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_company_admin()
      and public.user_in_same_company(school_id)
    )
    or (
      public.is_school_admin()
      and school_id = public.get_user_school_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_company_admin()
      and public.user_in_same_company(school_id)
    )
    or (
      public.is_school_admin()
      and school_id = public.get_user_school_id()
    )
  );

create policy "Scoped admins delete counselors"
  on public.counselors
  for delete
  to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_company_admin()
      and public.user_in_same_company(school_id)
    )
    or (
      public.is_school_admin()
      and school_id = public.get_user_school_id()
    )
  );
