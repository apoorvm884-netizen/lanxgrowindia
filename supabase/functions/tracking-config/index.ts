import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

const requiredEnvironment = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = requiredEnvironment('SUPABASE_URL');
    const anonKey = requiredEnvironment('SUPABASE_ANON_KEY');
    const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid or expired session' }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
    if (profileError || profile?.role !== 'super_admin') {
      return json({ error: 'Only Super Admin can manage tracking credentials' }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'status');

    if (action === 'status') {
      const { data, error } = await admin.rpc('tracking_admin_config_status');
      if (error) throw error;
      return json({ config: data });
    }

    if (action === 'save') {
      const { error } = await admin.rpc('tracking_admin_save_config', {
        p_service_account_email: String(body.serviceAccountEmail || '').trim(),
        p_private_key: String(body.privateKey || '').trim() || null,
        p_webhook_secret: String(body.webhookSecret || '').trim() || null,
        p_input_speed_unit: String(body.inputSpeedUnit || 'knots'),
        p_stop_speed_kmh: Number(body.stopSpeedKmh ?? 2),
        p_stop_radius_meters: Number(body.stopRadiusMeters ?? 20),
        p_stop_minutes: Number(body.stopMinutes ?? 3),
        p_journey_end_minutes: Number(body.journeyEndMinutes ?? 10),
        p_updated_by: userData.user.id
      });
      if (error) throw error;
      const { data, error: statusError } = await admin.rpc('tracking_admin_config_status');
      if (statusError) throw statusError;
      return json({ saved: true, config: data });
    }

    if (action === 'remove-secret') {
      const secretType = String(body.secretType || '');
      if (!['private_key', 'webhook_secret'].includes(secretType)) {
        return json({ error: 'Invalid secret type' }, 400);
      }
      const { error } = await admin.rpc('tracking_admin_remove_secret', {
        p_secret_type: secretType
      });
      if (error) throw error;
      const { data, error: statusError } = await admin.rpc('tracking_admin_config_status');
      if (statusError) throw statusError;
      return json({ removed: true, config: data });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('Tracking configuration request failed', {
      message: error instanceof Error ? error.message : String(error)
    });
    return json({
      error: error instanceof Error ? error.message : 'Tracking configuration request failed'
    }, 400);
  }
});
