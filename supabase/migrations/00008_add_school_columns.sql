ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS principal_name text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS drive_folder_id text;
CREATE INDEX IF NOT EXISTS idx_schools_drive_folder ON public.schools(drive_folder_id);
