import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, range',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type'
};

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    const token = new URL(request.url).searchParams.get('t');
    if (!token) return json({ error: 'Missing playback token' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: redeemed, error } = await admin.rpc('redeem_playback_token', {
      p_token: token,
      p_client_fingerprint: null
    });
    const file = Array.isArray(redeemed) ? redeemed[0] : redeemed;
    if (error || !file?.drive_file_id) return json({ error: 'Invalid or expired playback session' }, 403);

    const { data: keys } = await admin.from('api_keys')
      .select('key_value').eq('key_type', 'drive_api').eq('is_active', true)
      .order('created_at');
    if (!keys?.length) return json({ error: 'Google Drive API key is not configured' }, 503);

    let driveResponse: Response | null = null;
    for (const key of keys) {
      const headers: Record<string, string> = {};
      const range = request.headers.get('Range');
      if (range) headers.Range = range;
      driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.drive_file_id)}?alt=media&key=${encodeURIComponent(key.key_value)}`,
        { headers }
      );
      if (driveResponse.ok) break;
    }
    if (!driveResponse?.ok) return json({ error: 'Google Drive could not stream this video' }, 502);

    const headers: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': file.mime_type || driveResponse.headers.get('Content-Type') || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'inline'
    };
    for (const name of ['Content-Length', 'Content-Range']) {
      const value = driveResponse.headers.get(name);
      if (value) headers[name] = value;
    }
    return new Response(driveResponse.body, { status: driveResponse.status, headers });
  } catch (error) {
    console.error('drive-stream failed', error);
    return json({ error: 'Unable to stream this video' }, 500);
  }
});
