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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    const { data: inviter, error: profileError } = await admin
      .from('profiles')
      .select('id, role, school_id, company_id')
      .eq('id', userData.user.id)
      .single();
    if (profileError || !inviter) return json({ error: 'Inviter profile not found' }, 403);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'create');

    if (action === 'resend') {
      const { data: invitation, error } = await admin
        .from('invitations')
        .select('*')
        .eq('id', String(body.id || ''))
        .single();
      if (error || !invitation) return json({ error: 'Invitation not found' }, 404);
      if (!canManage(inviter, invitation.role, invitation.school_id, invitation.company_id)) {
        return json({ error: 'You cannot resend this invitation' }, 403);
      }
      const redirectTo = String(body.redirectTo || '').trim() || undefined;
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        invitation.email,
        { redirectTo }
      );
      if (inviteError && !inviteError.message.toLowerCase().includes('already')) throw inviteError;
      const { data, error: updateError } = await admin
        .from('invitations')
        .update({
          status: 'pending',
          expires_at: new Date(Date.now() + 14 * 86400000).toISOString()
        })
        .eq('id', invitation.id)
        .select('*, schools(name)')
        .single();
      if (updateError) throw updateError;
      return json({ invitation: data });
    }

    const email = String(body.email || '').trim().toLowerCase();
    const role = String(body.role || '');
    const schoolId = body.school_id ? String(body.school_id) : null;
    const companyId = body.company_id ? String(body.company_id) : null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'A valid email address is required' }, 400);
    }
    if (!['company_admin', 'school_admin', 'counselor', 'teacher', 'student'].includes(role)) {
      return json({ error: 'Invalid invitation role' }, 400);
    }
    if (!canManage(inviter, role, schoolId, companyId)) {
      return json({ error: 'You cannot invite this role or scope' }, 403);
    }

    let resolvedCompanyId = companyId;
    if (role !== 'company_admin') {
      if (!schoolId) return json({ error: 'School is required for this role' }, 400);
      const { data: school, error: schoolError } = await admin
        .from('schools')
        .select('company_id')
        .eq('id', schoolId)
        .single();
      if (schoolError || !school) return json({ error: 'Selected school was not found' }, 400);
      resolvedCompanyId = null;
      if (inviter.role === 'company_admin' && school.company_id !== inviter.company_id) {
        return json({ error: 'Selected school is outside your company' }, 403);
      }
    } else if (!resolvedCompanyId) {
      return json({ error: 'Company is required for Company Admin' }, 400);
    }

    const { data: invitation, error: insertError } = await admin
      .from('invitations')
      .insert({
        email,
        role,
        school_id: role === 'company_admin' ? null : schoolId,
        company_id: role === 'company_admin' ? resolvedCompanyId : null,
        invited_by: inviter.id,
        status: 'pending'
      })
      .select('*, schools(name)')
      .single();
    if (insertError) throw insertError;

    const redirectTo = String(body.redirectTo || '').trim() || undefined;
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteError) {
      await admin.from('invitations').delete().eq('id', invitation.id);
      throw inviteError;
    }
    return json({ invitation }, 201);
  } catch (error) {
    console.error('Invitation request failed', {
      message: error instanceof Error ? error.message : String(error)
    });
    return json({ error: error instanceof Error ? error.message : 'Invitation failed' }, 400);
  }
});

function canManage(
  inviter: { role: string; school_id: string | null; company_id: string | null },
  role: string,
  schoolId: string | null,
  companyId: string | null
) {
  if (inviter.role === 'super_admin') return true;
  if (inviter.role === 'company_admin') {
    return role !== 'company_admin' && Boolean(schoolId);
  }
  if (inviter.role === 'school_admin') {
    return ['counselor', 'teacher', 'student'].includes(role) && schoolId === inviter.school_id;
  }
  return inviter.role === 'counselor' && role === 'student' && schoolId === inviter.school_id;
}
