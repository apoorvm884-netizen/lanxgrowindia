-- Non-breaking learning hierarchy and content upload repair.
-- Existing categories remain in place and are treated as Classes by the UI.

alter table public.students
  add column if not exists class_id uuid references public.categories(id) on delete set null;

create index if not exists idx_students_school_class
  on public.students (school_id, class_id);

update public.students student
set class_id = category.id
from public.categories category
where student.class_id is null
  and student.school_id = category.school_id
  and lower(trim(student.class)) = lower(trim(category.name));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-uploads',
  'content-uploads',
  true,
  104857600,
  array[
    'image/*',
    'video/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ]
)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload files" on storage.objects;
create policy "Authenticated users can upload files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content-uploads'
    and (storage.foldername(name))[1] = public.get_user_school_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Authenticated users can read files" on storage.objects;
create policy "Authenticated users can read files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'content-uploads'
    and (
      public.is_super_admin()
      or (storage.foldername(name))[1] = public.get_user_school_id()::text
    )
  );

drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content-uploads'
    and (
      owner_id = auth.uid()::text
      or public.is_super_admin()
    )
  );
