import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

function syntheticStudentEmail(schoolId: string, loginId: string) {
  const schoolPart = schoolId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
  const loginPart = loginId.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'student';
  return `student-${schoolPart}-${loginPart}@accounts.lanxgrow.internal`;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const body = await request.json().catch(() => ({}));
  const schoolCode = String(body.school_code || '').trim();
  const loginId = String(body.login_id || '').trim();
  const password = String(body.password || '');
  if (!schoolCode || !loginId || password.length < 8) return json({ error: 'School code, Student Login ID and password are required.' }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: school, error: schoolError } = await admin.from('schools').select('id').ilike('code', schoolCode).maybeSingle();
  if (schoolError || !school) return json({ error: 'School code or Student Login ID is incorrect.' }, 401);
  const { data: student } = await admin.from('students').select('id, user_id, status, login_id').eq('school_id', school.id).ilike('login_id', loginId).maybeSingle();
  if (!student || !student.user_id || student.status !== 'active') return json({ error: 'School code or Student Login ID is incorrect, or this account is inactive.' }, 401);

  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: syntheticStudentEmail(school.id, student.login_id), password });
  if (error || !data.session) return json({ error: 'Student ID or password is incorrect.' }, 401);
  return json({ ok: true, session: data.session });
});
