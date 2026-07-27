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

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);

    const callerClient = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Invalid or expired session' }, 401);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: caller } = await admin.from('profiles').select('id, role, school_id, company_id').eq('id', authData.user.id).single();
    if (!caller || !['super_admin', 'company_admin', 'school_admin', 'counselor'].includes(caller.role)) {
      return json({ error: 'You do not have permission to send notifications' }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim() || null;
    const schoolId = body.school_id ? String(body.school_id) : caller.school_id;
    const requestedIds = Array.isArray(body.user_ids) ? body.user_ids.map(String) : [];
    if (!title) return json({ error: 'Title is required' }, 400);
    if (title.length > 160 || (message?.length || 0) > 4000) return json({ error: 'Notification is too long' }, 400);
    if (!schoolId && caller.role !== 'super_admin') return json({ error: 'School is required' }, 400);
    if (caller.role === 'school_admin' || caller.role === 'counselor') {
      if (schoolId !== caller.school_id) return json({ error: 'School is outside your scope' }, 403);
    }

    let query = admin.from('profiles').select('id, school_id, company_id, role').eq('status', 'active');
    if (requestedIds.length) query = query.in('id', requestedIds);
    else query = query.eq('school_id', schoolId).in('role', ['school_admin', 'counselor']);
    const { data: recipients, error: recipientError } = await query;
    if (recipientError) throw recipientError;

    const allowed = (recipients || []).filter(recipient => {
      if (caller.role === 'super_admin') return true;
      if (caller.role === 'company_admin') return recipient.company_id === caller.company_id;
      return recipient.school_id === caller.school_id;
    });
    if (!allowed.length) return json({ error: 'No active login accounts matched the selected recipients' }, 400);

    const rows = allowed.map(recipient => ({ user_id: recipient.id, title, message }));
    const { error: insertError } = await admin.from('notifications').insert(rows);
    if (insertError) throw insertError;
    return json({ ok: true, sent: rows.length });
  } catch (error) {
    console.error('Notification send failed', { message: error instanceof Error ? error.message : String(error) });
    return json({ error: error instanceof Error ? error.message : 'Notification failed' }, 400);
  }
});
