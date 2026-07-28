-- Explicitly approved by the platform administrator.
-- Enables Orbit to send the minimum required prompt context to the configured
-- AI provider chain. Provider keys remain server-side in Supabase.

update public.platform_ai_settings
set external_processing_enabled = true,
    updated_at = now(),
    updated_by = null
where id = true;
