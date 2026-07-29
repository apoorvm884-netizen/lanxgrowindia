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
  status: string;
};

type ContentRow = {
  id: string;
  name: string;
  drive_file_id: string | null;
  school_id: string;
  mime_type: string | null;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type TranscriptChunk = {
  text: string;
  index: number;
};

type AiProvider = {
  id: string;
  provider: string;
  model: string;
  school_id: string | null;
  priority: number;
};

const MAX_VOICE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_VOICE_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav'
]);

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

  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, role, school_id, company_id, status')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (!profile || profile.status !== 'active' || !profile.school_id) {
      return json({ error: 'An active school profile is required' }, 403);
    }

    if ((request.headers.get('content-type') || '').toLowerCase().includes('multipart/form-data')) {
      return await handleVoiceTranscription(request, admin, profile as Profile);
    }

    const body = await request.json().catch(() => ({}));
    const contentId = String(body.content_id || '').trim();
    if (!contentId) return json({ error: 'content_id is required' }, 400);

    const { data: content, error: contentError } = await admin
      .from('content')
      .select('id, name, drive_file_id, school_id, mime_type')
      .eq('id', contentId)
      .maybeSingle();

    if (contentError || !content) return json({ error: 'Content not found' }, 404);
    if (!content.drive_file_id) return json({ error: 'No Drive file linked' }, 400);
    if (!await canTranscribe(admin, profile as Profile, content as ContentRow)) {
      return json({ error: 'You cannot transcribe content outside your assigned scope' }, 403);
    }

    const { data: existing } = await admin
      .from('content_transcripts')
      .select('content_id, status')
      .eq('content_id', contentId)
      .maybeSingle();
    if (existing?.status === 'complete') {
      return json({ message: 'Already transcribed', content_id: contentId });
    }

    const processingRow = {
      content_id: contentId,
      school_id: content.school_id,
      full_text: '',
      status: 'processing',
      error: null
    };
    const { error: processingError } = await admin
      .from('content_transcripts')
      .upsert(processingRow, { onConflict: 'content_id' });
    if (processingError) throw processingError;

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || '';
    if (!serviceAccountJson) throw new Error('Google service account is not configured');
    const serviceAccount = JSON.parse(serviceAccountJson) as ServiceAccount;
    const driveToken = await getGoogleAccessToken(serviceAccount);
    const videoUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(content.drive_file_id)}?alt=media`;

    const { data: providers, error: providerError } = await admin
      .from('ai_providers')
      .select('id, provider, base_url, model, school_id, priority')
      .eq('enabled', true)
      .or(`school_id.is.null,school_id.eq.${content.school_id}`)
      .order('priority', { ascending: true });
    if (providerError) throw providerError;

    const providerIds = (providers || []).map(provider => provider.id);
    const { data: secrets, error: secretError } = providerIds.length
      ? await admin.from('ai_provider_secrets').select('provider_id, api_key').in('provider_id', providerIds)
      : { data: [], error: null };
    if (secretError) throw secretError;
    const keys = new Map((secrets || []).map(secret => [secret.provider_id, secret.api_key]));

    let transcript = '';
    let source = '';
    const gemini = (providers || []).find(provider => provider.provider === 'gemini' && keys.has(provider.id));
    if (gemini) {
      try {
        transcript = await transcribeWithGemini(videoUrl, driveToken, keys.get(gemini.id)!);
        source = 'gemini';
      } catch (error) {
        console.error('Gemini transcription failed', safeError(error));
      }
    }

    const openai = (providers || []).find(provider => provider.provider === 'openai' && keys.has(provider.id));
    if (!transcript && openai) {
      try {
        transcript = await transcribeWithWhisper(videoUrl, driveToken, keys.get(openai.id)!);
        source = 'whisper';
      } catch (error) {
        console.error('Whisper transcription failed', safeError(error));
      }
    }

    if (!transcript) {
      await admin.from('content_transcripts').update({
        status: 'failed',
        error: 'No compatible transcription provider succeeded'
      }).eq('content_id', contentId);
      return json({ error: 'Transcription failed or no compatible provider is configured' }, 502);
    }

    const chunks = chunkTranscript(transcript);
    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    const { error: transcriptError } = await admin.from('content_transcripts').upsert({
      content_id: contentId,
      school_id: content.school_id,
      full_text: transcript,
      language: 'en',
      provider: source,
      word_count: wordCount,
      status: 'complete',
      error: null,
      completed_at: new Date().toISOString()
    }, { onConflict: 'content_id' });
    if (transcriptError) throw transcriptError;

    const { error: deleteError } = await admin
      .from('transcript_chunks')
      .delete()
      .eq('content_id', contentId);
    if (deleteError) throw deleteError;

    if (chunks.length) {
      const { error: chunkError } = await admin.from('transcript_chunks').insert(
        chunks.map(chunk => ({
          content_id: contentId,
          transcript_id: contentId,
          school_id: content.school_id,
          chunk_index: chunk.index,
          chunk_text: chunk.text,
          start_time_sec: null,
          end_time_sec: null
        }))
      );
      if (chunkError) throw chunkError;
    }

    return json({
      success: true,
      content_id: contentId,
      source,
      word_count: wordCount,
      chunks: chunks.length
    });
  } catch (error) {
    console.error('Transcription failed', safeError(error));
    return json({ error: error instanceof Error ? error.message : 'Transcription failed' }, 500);
  }
});

async function handleVoiceTranscription(
  request: Request,
  admin: ReturnType<typeof createClient>,
  profile: Profile
) {
  const form = await request.formData();
  if (String(form.get('mode') || '') !== 'voice') {
    return json({ error: 'Unsupported transcription mode' }, 400);
  }
  const audio = form.get('audio');
  if (!(audio instanceof File) || audio.size === 0) {
    return json({ error: 'A voice recording is required' }, 400);
  }
  if (audio.size > MAX_VOICE_BYTES) {
    return json({ error: 'Voice recording is too large. Record up to 60 seconds.' }, 413);
  }
  const mimeType = String(audio.type || '').split(';')[0].toLowerCase();
  if (!ACCEPTED_VOICE_TYPES.has(mimeType)) {
    return json({ error: 'This audio format is not supported by your browser.' }, 415);
  }

  const { providers, keys } = await loadProviderCredentials(admin, profile.school_id);
  let transcript = '';
  let source = '';
  let language = 'auto';
  let lastError = '';

  const gemini = providers.find(provider => provider.provider === 'gemini' && keys.has(provider.id));
  if (gemini) {
    try {
      transcript = await transcribeVoiceWithGemini(audio, mimeType, gemini.model, keys.get(gemini.id)!);
      source = 'gemini';
    } catch (error) {
      lastError = safeError(error);
      console.error('Gemini voice transcription failed', lastError);
    }
  }

  const openai = providers.find(provider => provider.provider === 'openai' && keys.has(provider.id));
  if (!transcript && openai) {
    try {
      const result = await transcribeVoiceWithWhisper(audio, keys.get(openai.id)!);
      transcript = result.text;
      language = result.language || 'auto';
      source = 'whisper';
    } catch (error) {
      lastError = safeError(error);
      console.error('OpenAI voice transcription failed', lastError);
    }
  }

  const openrouter = providers.find(provider => provider.provider === 'openrouter' && keys.has(provider.id));
  if (!transcript && openrouter) {
    try {
      const result = await transcribeVoiceWithOpenRouter(audio, keys.get(openrouter.id)!);
      transcript = result.text;
      language = result.language || 'auto';
      source = 'openrouter';
    } catch (error) {
      lastError = safeError(error);
      console.error('OpenRouter voice transcription failed', lastError);
    }
  }

  if (!transcript) {
    return json({
      error: providers.length
        ? 'Orbit could not understand the recording. Please try again closer to the microphone.'
        : 'Voice input needs an enabled Gemini, OpenAI, or OpenRouter provider.',
      detail: lastError || undefined
    }, 503);
  }

  return json({
    transcript: transcript.slice(0, 2000),
    language,
    provider: source
  });
}

async function loadProviderCredentials(
  admin: ReturnType<typeof createClient>,
  schoolId: string | null
) {
  let query = admin
    .from('ai_providers')
    .select('id, provider, model, school_id, priority')
    .eq('enabled', true)
    .order('priority', { ascending: true });
  if (schoolId) query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
  const { data: providers, error: providerError } = await query;
  if (providerError) throw providerError;

  const typedProviders = (providers || []) as AiProvider[];
  const providerIds = typedProviders.map(provider => provider.id);
  const { data: secrets, error: secretError } = providerIds.length
    ? await admin.from('ai_provider_secrets').select('provider_id, api_key').in('provider_id', providerIds)
    : { data: [], error: null };
  if (secretError) throw secretError;
  const keys = new Map((secrets || []).map(secret => [secret.provider_id, secret.api_key]));

  const providerTypes = [...new Set(typedProviders.map(provider => provider.provider))];
  const { data: centralRows, error: centralError } = providerTypes.length
    ? await admin
      .from('api_keys')
      .select('key_type, key_value, created_at')
      .eq('is_active', true)
      .in('key_type', providerTypes)
      .order('created_at', { ascending: false })
    : { data: [], error: null };
  if (centralError) throw centralError;
  const centralKeys = new Map<string, string>();
  for (const row of centralRows || []) {
    if (!centralKeys.has(row.key_type)) centralKeys.set(row.key_type, row.key_value);
  }
  for (const provider of typedProviders) {
    if (!keys.has(provider.id) && centralKeys.has(provider.provider)) {
      keys.set(provider.id, centralKeys.get(provider.provider)!);
    }
  }
  return { providers: typedProviders, keys };
}

async function transcribeVoiceWithGemini(
  audio: File,
  mimeType: string,
  configuredModel: string,
  apiKey: string
) {
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const model = configuredModel || 'gemini-2.0-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: 'Transcribe the learner exactly in the original language and script. Support English and Indian languages. Return only the spoken words, with no translation, labels, notes, or quotation marks. Return NO_SPEECH_DETECTED if there is no intelligible speech.'
            },
            { inlineData: { mimeType, data: bytesToBase64(bytes) } }
          ]
        }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0 }
      })
    }
  );
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Gemini transcription failed (${response.status})`);
  }
  const text = String(data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  return text === 'NO_SPEECH_DETECTED' ? '' : text;
}

async function transcribeVoiceWithWhisper(audio: File, apiKey: string) {
  const form = new FormData();
  form.append('file', audio, `orbit-recording.${voiceExtension(audio.type)}`);
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('prompt', 'Transcribe in the original spoken language and script. The speaker may use English or an Indian language.');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `OpenAI transcription failed (${response.status})`);
  }
  return {
    text: String(data.text || '').trim(),
    language: String(data.language || '')
  };
}

async function transcribeVoiceWithOpenRouter(audio: File, apiKey: string) {
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lanxgrowindia.vercel.app',
      'X-Title': 'LanxGrow Orbit Voice'
    },
    body: JSON.stringify({
      model: 'openai/whisper-1',
      input_audio: {
        data: bytesToBase64(bytes),
        format: voiceExtension(audio.type)
      }
    })
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `OpenRouter transcription failed (${response.status})`);
  }
  return {
    text: String(data.text || '').trim(),
    language: String(data.language || '')
  };
}

function voiceExtension(mimeType: string) {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

async function canTranscribe(admin: ReturnType<typeof createClient>, profile: Profile, content: ContentRow) {
  if (profile.role === 'super_admin') return true;
  if (profile.role === 'company_admin') {
    const { data: school } = await admin
      .from('schools')
      .select('company_id')
      .eq('id', content.school_id)
      .maybeSingle();
    return Boolean(profile.company_id && school?.company_id === profile.company_id);
  }
  return ['school_admin', 'counselor'].includes(profile.role)
    && Boolean(profile.school_id)
    && profile.school_id === content.school_id;
}

async function getGoogleAccessToken(serviceAccount: ServiceAccount) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Google service account credentials are incomplete');
  }
  const tokenUri = serviceAccount.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: tokenUri,
    iat: now,
    exp: now + 3600
  }));
  const signingInput = `${header}.${claim}`;
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemBody), value => value.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  const assertion = `${signingInput}.${base64UrlBytes(new Uint8Array(signature))}`;
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error('Google authentication failed');
  return String(data.access_token);
}

async function transcribeWithGemini(videoUrl: string, driveToken: string, apiKey: string) {
  const video = await fetch(videoUrl, {
    headers: { Authorization: `Bearer ${driveToken}`, Range: 'bytes=0-26214399' }
  });
  if (!video.ok) throw new Error(`Drive download failed (${video.status})`);
  const bytes = new Uint8Array(await video.arrayBuffer());
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: video.headers.get('content-type') || 'video/mp4', data: bytesToBase64(bytes) } },
            { text: 'Transcribe all spoken words accurately. Return only the transcript text. Return NO_SPEECH_DETECTED when there is no speech.' }
          ]
        }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1 }
      })
    }
  );
  const data = await response.json();
  if (!response.ok || data.error) throw new Error('Gemini transcription request failed');
  const text = String(data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  return text === 'NO_SPEECH_DETECTED' ? '' : text;
}

async function transcribeWithWhisper(videoUrl: string, driveToken: string, apiKey: string) {
  const video = await fetch(videoUrl, {
    headers: { Authorization: `Bearer ${driveToken}`, Range: 'bytes=0-26214399' }
  });
  if (!video.ok) throw new Error(`Drive download failed (${video.status})`);
  const form = new FormData();
  form.append('file', await video.blob(), 'video.mp4');
  form.append('model', 'whisper-1');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error('Whisper transcription request failed');
  return String(data.text || '').trim();
}

function chunkTranscript(text: string, maxLength = 1000): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  let current = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (current && current.length + sentence.length + 1 > maxLength) {
      chunks.push({ text: current.trim(), index: chunks.length });
      current = sentence;
    } else {
      current += `${current ? ' ' : ''}${sentence}`;
    }
  }
  if (current.trim()) chunks.push({ text: current.trim(), index: chunks.length });
  return chunks;
}

function base64Url(value: string) {
  return base64UrlBytes(new TextEncoder().encode(value));
}

function base64UrlBytes(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesToBase64(bytes: Uint8Array) {
  let output = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(output);
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
