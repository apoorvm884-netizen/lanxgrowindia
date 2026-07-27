-- Repair users created before the onboarding trigger was corrected.
insert into public.profiles (
  id, email, name, full_name, role, onboarding_completed, status
)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ),
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ),
  'pending',
  false,
  'pending'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Authenticated users can safely repair only their own missing profile.
create or replace function public.ensure_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid := auth.uid();
  result public.profiles;
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (
    id, email, name, full_name, role, onboarding_completed, status
  )
  select
    u.id,
    u.email,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'User'
    ),
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'User'
    ),
    'pending',
    false,
    'pending'
  from auth.users u
  where u.id = current_uid
  on conflict (id) do nothing;

  select p.* into result
  from public.profiles p
  where p.id = current_uid;

  if result.id is null then
    raise exception 'Profile could not be created';
  end if;

  return result;
end;
$$;

revoke all on function public.ensure_my_profile() from public;
revoke all on function public.ensure_my_profile() from anon;
grant execute on function public.ensure_my_profile() to authenticated;
