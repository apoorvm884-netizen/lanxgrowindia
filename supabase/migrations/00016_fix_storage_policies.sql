-- ==============================================================
-- LANXGROW COS — Fix Storage Bucket RLS Policies
-- Migration 00016: Require authentication for uploads
-- ==============================================================
-- Run this in Supabase Dashboard SQL Editor
-- Fixes: Previously "Anyone can upload" allowed anon uploads
-- ==============================================================

-- Fix upload policy: require authentication
drop policy if exists "Anyone can upload files" on storage.objects;
create policy "Authenticated users can upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'content-uploads'
    and auth.role() = 'authenticated'
  );

-- Fix read policy: require authentication for API access
-- (Public bucket URL access is still controlled by bucket public setting)
drop policy if exists "Anyone can read files" on storage.objects;
create policy "Authenticated users can read files"
  on storage.objects for select
  using (
    bucket_id = 'content-uploads'
    and auth.role() = 'authenticated'
  );

-- Add path ownership: users can only manage files in their own folder
-- Folder path format: {school_id}/{user_id}/
drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'content-uploads'
    and owner = auth.uid()
  );
