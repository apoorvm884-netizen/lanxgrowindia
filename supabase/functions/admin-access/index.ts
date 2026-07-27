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

type Actor = {
  id: string;
  role: string;
  company_id: string | null;
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Invalid or expired session' }, 401);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: actor } = await admin
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', authData.user.id)
      .single();
    if (!actor || !['super_admin', 'company_admin'].includes(actor.role)) {
      return json({ error: 'Only Super Admin or Company Admin can perform this action' }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'delete_school_admin') {
      return await deleteSchoolAdmin(admin, actor as Actor, String(body.user_id || ''));
    }
    if (action === 'delete_school') {
      return await deleteSchool(admin, actor as Actor, String(body.school_id || ''));
    }
    if (action === 'delete_invitation') {
      return await deleteInvitation(admin, actor as Actor, String(body.invitation_id || ''));
    }
    return json({ error: 'Unsupported administrative action' }, 400);
  } catch (error) {
    console.error('Administrative action failed', {
      message: error instanceof Error ? error.message : String(error)
    });
    return json({ error: error instanceof Error ? error.message : 'Administrative action failed' }, 400);
  }
});

async function deleteSchoolAdmin(admin: any, actor: Actor, userId: string) {
  if (!userId || userId === actor.id) return json({ error: 'You cannot delete your own account' }, 400);
  const { data: target } = await admin
    .from('profiles')
    .select('id, role, company_id, school_id')
    .eq('id', userId)
    .single();
  if (!target || target.role !== 'school_admin') return json({ error: 'School Admin account was not found' }, 404);
  if (actor.role === 'company_admin' && target.company_id !== actor.company_id) {
    return json({ error: 'School Admin is outside your company' }, 403);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
  return json({ ok: true, deleted: 'school_admin' });
}

async function deleteSchool(admin: any, actor: Actor, schoolId: string) {
  const { data: school } = await admin.from('schools').select('id, company_id').eq('id', schoolId).single();
  if (!school) return json({ error: 'School was not found' }, 404);
  if (actor.role === 'company_admin' && school.company_id !== actor.company_id) {
    return json({ error: 'School is outside your company' }, 403);
  }

  const { data: schoolProfiles, error: profileError } = await admin
    .from('profiles')
    .select('id, role')
    .eq('school_id', schoolId);
  if (profileError) throw profileError;
  if ((schoolProfiles || []).some((profile: any) => profile.id === actor.id)) {
    return json({ error: 'You cannot delete the school containing your own active account' }, 400);
  }

  const { error: schoolError } = await admin.from('schools').delete().eq('id', schoolId);
  if (schoolError) throw schoolError;

  const failed: string[] = [];
  for (const profile of schoolProfiles || []) {
    if (profile.role === 'super_admin') continue;
    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) failed.push(profile.id);
  }
  if (failed.length) {
    return json({
      ok: true,
      deleted: 'school',
      warning: `${failed.length} associated login account(s) could not be removed automatically`
    });
  }
  return json({ ok: true, deleted: 'school', revoked_accounts: (schoolProfiles || []).length });
}

async function deleteInvitation(admin: any, actor: Actor, invitationId: string) {
  const { data: invitation } = await admin
    .from('invitations')
    .select('id, role, school_id, company_id, accepted_by, schools(company_id)')
    .eq('id', invitationId)
    .single();
  if (!invitation) return json({ error: 'Invitation was not found' }, 404);

  const scopedCompanyId = invitation.company_id || invitation.schools?.company_id || null;
  if (actor.role === 'company_admin') {
    if (scopedCompanyId !== actor.company_id || invitation.role === 'company_admin') {
      return json({ error: 'Invitation is outside your company access' }, 403);
    }
  }
  if (invitation.accepted_by === actor.id) return json({ error: 'You cannot revoke your own account' }, 400);

  const acceptedUserId = invitation.accepted_by;
  let acceptedProfile: { role: string } | null = null;
  if (acceptedUserId) {
    const { data } = await admin.from('profiles').select('role').eq('id', acceptedUserId).maybeSingle();
    acceptedProfile = data;
    if (acceptedProfile?.role === 'super_admin') {
      return json({ error: 'Super Admin access cannot be revoked through invitations' }, 403);
    }
  }
  if (acceptedUserId) {
    const { error } = await admin.auth.admin.deleteUser(acceptedUserId);
    if (error) throw error;
  }
  const { error: deleteError } = await admin.from('invitations').delete().eq('id', invitationId);
  if (deleteError) throw deleteError;
  return json({ ok: true, deleted: 'invitation', access_revoked: Boolean(acceptedUserId) });
}
