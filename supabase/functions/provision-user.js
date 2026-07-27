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

type Profile = {
  id: string;
  role: string;
  school_id: string | null;
  company_id: string | null;
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Invalid or expired session' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let createdUserId: string | null = null;
  try {
    const { data: caller, error: callerError } = await admin
      .from('profiles')
      .select('id, role, school_id, company_id')
      .eq('id', authData.user.id)
      .single();
    if (callerError || !caller) return json({ error: 'Your account profile was not found' }, 403);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'create');
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.full_name || '').trim();
    const role = String(body.role || '');
    const schoolId = body.school_id ? String(body.school_id) : null;
    const studentId = body.student_id ? String(body.student_id) : null;
    const counselorId = body.counselor_id ? String(body.counselor_id) : null;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'A valid login email is required' }, 400);
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters' }, 400);
    }
    if (!['school_admin', 'counselor', 'student'].includes(role)) {
      return json({ error: 'Unsupported account role' }, 400);
    }
    if (!schoolId) return json({ error: 'School is required for this account' }, 400);
    if (!canManage(caller as Profile, role, schoolId)) {
      return json({ error: 'You cannot create or reset this account' }, 403);
    }

    const { data: school, error: schoolError } = await admin
      .from('schools')
      .select('id, company_id')
      .eq('id', schoolId)
      .single();
    if (schoolError || !school) return json({ error: 'School was not found' }, 404);
    if (caller.role === 'company_admin' && school.company_id !== caller.company_id) {
      return json({ error: 'School is outside your company' }, 403);
    }

    if (role === 'student') {
      if (!studentId) return json({ error: 'Student record is required' }, 400);
      const { data: student } = await admin.from('students').select('id, school_id, user_id').eq('id', studentId).single();
      if (!student || student.school_id !== schoolId) return json({ error: 'Student does not belong to this school' }, 400);
    }
    if (role === 'counselor') {
      if (!counselorId) return json({ error: 'Counselor record is required' }, 400);
      const { data: counselor } = await admin.from('counselors').select('id, school_id, user_id').eq('id', counselorId).single();
      if (!counselor || counselor.school_id !== schoolId) return json({ error: 'Counselor does not belong to this school' }, 400);
    }

    let userId = body.user_id ? String(body.user_id) : null;
    if (!userId) {
      const { data: existingProfile } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
      userId = existingProfile?.id || null;
    }

    if (action === 'reset_password' || (action === 'set_login' && userId)) {
      if (!userId) return json({ error: 'No login account exists for this email yet' }, 404);
      const { data: currentProfile } = await admin
        .from('profiles')
        .select('id, role, school_id')
        .eq('id', userId)
        .single();
      if (!currentProfile || currentProfile.role !== role || currentProfile.school_id !== schoolId) {
        return json({ error: 'This login email belongs to a different role or school. Use a unique email.' }, 409);
      }
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password,
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName || undefined }
      });
      if (error) throw error;
    } else {
      if (userId) {
        return json({ error: 'This email already has a login account. Use Reset Password instead.' }, 409);
      }
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || email.split('@')[0] }
      });
      if (error || !created.user) throw error || new Error('Auth user was not created');
      userId = created.user.id;
      createdUserId = userId;
    }

    const safeName = fullName || email.split('@')[0];
    const { error: profileError } = await admin.from('profiles').upsert({
      id: userId,
      email,
      name: safeName,
      full_name: safeName,
      role,
      school_id: schoolId,
      company_id: school.company_id,
      onboarding_completed: true,
      status: 'active',
      requested_role: null
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    if (studentId) {
      const { error } = await admin.from('students').update({ user_id: userId, email }).eq('id', studentId);
      if (error) throw error;
    }
    if (counselorId) {
      const { error } = await admin.from('counselors').update({ user_id: userId, email }).eq('id', counselorId);
      if (error) throw error;
    }

    return json({ ok: true, user_id: userId, email, role }, createdUserId ? 201 : 200);
  } catch (error) {
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId).catch(() => undefined);
    console.error('Provisioning failed', { message: error instanceof Error ? error.message : String(error) });
    return json({ error: error instanceof Error ? error.message : 'Account provisioning failed' }, 400);
  }
});

function canManage(caller: Profile, role: string, schoolId: string) {
  if (caller.role === 'super_admin') return true;
  if (caller.role === 'company_admin') return true;
  if (caller.role === 'school_admin') {
    return caller.school_id === schoolId && ['counselor', 'student'].includes(role);
  }
  return caller.role === 'counselor' && caller.school_id === schoolId && role === 'student';
}
