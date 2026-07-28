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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401);

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: profile } = await admin.from('profiles')
      .select('role, school_id, company_id').eq('id', userData.user.id).single();
    if (!profile || !['super_admin', 'company_admin', 'school_admin', 'counselor'].includes(profile.role)) {
      return json({ error: 'School staff access required' }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const studentId = String(body.student_id || '');
    if (!studentId) return json({ error: 'student_id is required' }, 400);

    const { data: student, error: studentError } = await admin.from('students')
      .select('id, name, school_id, drive_folder_id').eq('id', studentId).single();
    if (studentError || !student) return json({ error: 'Student not found' }, 404);
    if (['school_admin', 'counselor'].includes(profile.role) && profile.school_id !== student.school_id) {
      return json({ error: 'Student is outside your school' }, 403);
    }
    if (profile.role === 'company_admin') {
      const { data: school } = await admin.from('schools')
        .select('company_id').eq('id', student.school_id).single();
      if (!school || school.company_id !== profile.company_id) return json({ error: 'Student is outside your company' }, 403);
    }
    if (!student.drive_folder_id) return json({ error: 'Student has no Drive folder ID' }, 400);

    const { data: keyRow } = await admin.from('api_keys').select('key_value')
      .eq('key_type', 'drive_api').eq('is_active', true)
      .order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (!keyRow?.key_value) return json({ error: 'Google Drive API key is not configured' }, 400);

    const apiKey = keyRow.key_value;
    const folder = await driveGet(student.drive_folder_id, apiKey, 'id,name,mimeType');
    if (folder.mimeType !== 'application/vnd.google-apps.folder') {
      return json({ error: 'The supplied Drive ID is not a folder' }, 400);
    }

    const files = await driveList(student.drive_folder_id, apiKey);
    let videos = 0;
    let awaitingReview = 0;
    const activeIds: string[] = [];
    for (const file of files) {
      if (!String(file.mimeType || '').startsWith('video/')) continue;
      activeIds.push(file.id);
      const { data: existing } = await admin.from('content')
        .select('id,status').eq('drive_file_id', file.id).maybeSingle();
      const { error } = await admin.from('content').upsert({
        name: String(file.name || 'Video').replace(/\.[^.]+$/, ''),
        type: 'Video',
        school_id: student.school_id,
        drive_folder_id: student.drive_folder_id,
        drive_file_id: file.id,
        mime_type: file.mimeType,
        size_bytes: file.size ? Number(file.size) : null,
        duration_seconds: file.videoMediaMetadata?.durationMillis
          ? Math.round(Number(file.videoMediaMetadata.durationMillis) / 1000) : null,
        thumbnail_url: file.thumbnailLink || null,
        web_view_link: file.webViewLink || null,
        drive_modified_time: file.modifiedTime || null,
        source: 'drive',
        sync_state: 'active',
        status: existing?.status || 'review',
        description_source: 'drive',
        last_synced_at: new Date().toISOString()
      }, { onConflict: 'drive_file_id' });
      if (error) throw error;
      videos++;
      if (!existing) awaitingReview++;
    }

    let stale = admin.from('content').update({ sync_state: 'removed' })
      .eq('drive_folder_id', student.drive_folder_id).eq('source', 'drive');
    if (activeIds.length) stale = stale.not('drive_file_id', 'in', `(${activeIds.join(',')})`);
    await stale;

    await admin.from('students').update({
      drive_folder_name: folder.name,
      last_drive_sync_at: new Date().toISOString(),
      last_drive_sync_error: null
    }).eq('id', student.id);

    if (awaitingReview > 0) {
      const { data: reviewers } = await admin.from('profiles')
        .select('id').eq('school_id', student.school_id)
        .in('role', ['school_admin', 'counselor']).eq('status', 'active');
      if (reviewers?.length) {
        await admin.from('notifications').insert(reviewers.map(reviewer => ({
          user_id: reviewer.id,
          title: 'New videos need review',
          message: `${awaitingReview} new video(s) from ${folder.name} are waiting for approval.`,
          action_url: 'school-videos',
          metadata: {
            kind: 'content_review',
            student_id: student.id,
            drive_folder_id: student.drive_folder_id
          }
        })));
      }
    }

    return json({
      success: true,
      folder_name: folder.name,
      videos,
      awaiting_review: awaitingReview
    });
  } catch (error) {
    console.error('drive-sync failed', error);
    return json({ error: error instanceof Error ? error.message : 'Drive sync failed' }, 400);
  }
});

async function driveGet(id: string, key: string, fields: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}&key=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error(`Google Drive rejected the folder (${response.status}). Ensure it is shared for link access and the API key is valid.`);
  return await response.json();
}

async function driveList(folderId: string, key: string) {
  const q = `'${folderId}' in parents and trashed=false`;
  const fields = 'nextPageToken,files(id,name,mimeType,size,webViewLink,thumbnailLink,modifiedTime,videoMediaMetadata)';
  const files: any[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ q, fields, key, pageSize: '1000', orderBy: 'name' });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!response.ok) throw new Error(`Google Drive list failed (${response.status}).`);
    const data = await response.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return files;
}
