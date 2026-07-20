-- Run this in Supabase Dashboard SQL Editor to create the storage bucket for Content file uploads
-- This cannot be done programmatically without the service_role key

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-uploads',
  'content-uploads',
  true,
  104857600,
  array['image/*', 'video/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain']
)
on conflict (id) do nothing;

-- Allow authenticated users to see the bucket
create policy "Users can see content bucket"
  on storage.buckets for select
  using (id = 'content-uploads');

-- Allow public (anon) uploads to the bucket
create policy "Anyone can upload files"
  on storage.objects for insert
  with check (bucket_id = 'content-uploads');

-- Allow public reads
create policy "Anyone can read files"
  on storage.objects for select
  using (bucket_id = 'content-uploads');

-- Allow owners to delete their own files
create policy "Users can delete own files"
  on storage.objects for delete
  using (bucket_id = 'content-uploads' and owner = auth.uid());
