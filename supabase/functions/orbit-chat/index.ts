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

type Provider = {
  id: string;
  label: string;
  provider: string;
  base_url: string | null;
  model: string;
  max_output_tokens: number;
  temperature: number;
  consecutive_failures: number;
};

const PROVIDER_BASE_URLS: Record<string, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1'
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

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);

    const body = await request.json().catch(() => ({}));
    const message = String(body.message || '').trim();
    const contentId = body.content_id ? String(body.content_id) : null;
    const requestedConversationId = body.conversation_id ? String(body.conversation_id) : null;
    if (!message || message.length > 2000) {
      return json({ error: 'A question between 1 and 2000 characters is required.' }, 400);
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: profile } = await admin.from('profiles')
      .select('id, role, school_id, status').eq('id', userData.user.id).single();
    if (!profile || profile.status !== 'active' || !profile.school_id) {
      return json({ error: 'This account is not active.' }, 403);
    }
    const { data: school } = await admin.from('schools')
      .select('id, status').eq('id', profile.school_id).single();
    if (!school || school.status !== 'active') return json({ error: 'This school is not active.' }, 403);

    const { data: platformSettings } = await admin.from('platform_ai_settings')
      .select('external_processing_enabled').eq('id', true).maybeSingle();
    if (platformSettings?.external_processing_enabled !== true) {
      return json({
        error: 'Orbit AI processing is prepared but awaiting administrator approval.',
        code: 'ORBIT_APPROVAL_REQUIRED'
      }, 503);
    }

    let content: { id: string; name: string; description: string | null } | null = null;
    if (contentId) {
      const { data } = await userClient.from('content')
        .select('id, name, description').eq('id', contentId).maybeSingle();
      if (!data) return json({ error: 'This video is not assigned or approved for you.' }, 403);
      content = data;
    }

    const { data: quotaRows, error: quotaError } = await userClient.rpc('orbit_quota_status', {
      p_content_id: contentId
    });
    if (quotaError) return json({ error: quotaError.message }, 400);
    const quota = Array.isArray(quotaRows) ? quotaRows[0] : quotaRows;
    if (!quota?.allowed) return json({ error: quota?.message || 'Orbit is unavailable.', quota }, 429);

    const { data: providerRows } = await admin.from('ai_providers')
      .select('id,label,provider,base_url,model,max_output_tokens,temperature,priority,school_id,consecutive_failures')
      .eq('enabled', true)
      .or(`school_id.is.null,school_id.eq.${profile.school_id}`)
      .order('priority');
    const providers = (providerRows || []) as Provider[];
    if (!providers.length) return json({ error: 'Orbit is not configured. Contact an administrator.' }, 503);

    const providerIds = providers.map(provider => provider.id);
    const { data: secretRows } = await admin.from('ai_provider_secrets')
      .select('provider_id,api_key').in('provider_id', providerIds);
    const keys = new Map((secretRows || []).map(row => [row.provider_id, row.api_key]));
    const providerTypes = [...new Set(providers.map(provider => provider.provider))];
    const { data: centralKeyRows } = await admin.from('api_keys')
      .select('key_type,key_value,created_at')
      .eq('is_active', true)
      .in('key_type', providerTypes)
      .order('created_at', { ascending: false });
    const centralKeys = new Map<string, string>();
    for (const row of centralKeyRows || []) {
      if (!centralKeys.has(row.key_type)) centralKeys.set(row.key_type, row.key_value);
    }
    if (!providers.some(provider => keys.has(provider.id) || centralKeys.has(provider.provider))) {
      return json({ error: 'Orbit provider credentials are unavailable.' }, 503);
    }

    let conversationId = requestedConversationId;
    if (conversationId) {
      const { data: existing } = await admin.from('ai_conversations')
        .select('id').eq('id', conversationId).eq('user_id', userData.user.id)
        .eq('school_id', profile.school_id).maybeSingle();
      if (!existing) return json({ error: 'Conversation not found.' }, 404);
    } else {
      const { data: created, error } = await admin.from('ai_conversations').insert({
        school_id: profile.school_id,
        user_id: userData.user.id,
        content_id: contentId,
        title: message.slice(0, 100)
      }).select('id').single();
      if (error) throw error;
      conversationId = created.id;
    }

    const context = contentId
      ? await getVideoContext(admin, contentId, message)
      : [];
    const unsafe = detectsUnsafeContent(message);
    const prompt = buildSystemPrompt(content, context);
    const { data: history } = await admin.from('ai_messages')
      .select('role,body').eq('conversation_id', conversationId)
      .order('created_at').limit(10);
    const messages = [
      { role: 'system', content: prompt },
      ...(history || []).map(item => ({ role: item.role, content: item.body })),
      { role: 'user', content: message }
    ];

    let reply = '';
    let usedProvider: Provider | null = null;
    let lastError = '';
    for (const provider of providers) {
      const key = keys.get(provider.id) || centralKeys.get(provider.provider);
      if (!key) continue;
      try {
        reply = await callProvider(provider, key, messages);
        usedProvider = provider;
        await admin.from('ai_providers').update({
          consecutive_failures: 0,
          needs_attention: false,
          last_ok_at: new Date().toISOString(),
          last_error: null,
          last_status_code: 200
        }).eq('id', provider.id);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Provider failed';
        console.error(`Orbit provider ${provider.label} failed`, lastError);
        await admin.from('ai_providers').update({
          consecutive_failures: (provider.consecutive_failures || 0) + 1,
          needs_attention: true,
          last_error: lastError.slice(0, 500)
        }).eq('id', provider.id);
      }
    }
    if (!reply || !usedProvider) {
      return json({ error: 'Orbit is temporarily unavailable. Please try again later.', detail: lastError }, 503);
    }

    const { data: consumedRows, error: consumeError } = await userClient.rpc('orbit_consume_question', {
      p_content_id: contentId
    });
    if (consumeError) return json({ error: consumeError.message }, 400);
    const consumed = Array.isArray(consumedRows) ? consumedRows[0] : consumedRows;
    if (!consumed?.allowed) return json({ error: consumed?.message || 'Daily Orbit limit reached.', quota: consumed }, 429);

    const citations = context.map(segment => ({
      seq: segment.seq,
      start_seconds: segment.start_seconds,
      end_seconds: segment.end_seconds
    }));
    const now = new Date().toISOString();
    const { error: messageError } = await admin.from('ai_messages').insert([
      {
        conversation_id: conversationId,
        school_id: profile.school_id,
        role: 'user',
        body: message,
        flagged: unsafe,
        flag_reason: unsafe ? 'Possible unsafe or crisis-related student message' : null
      },
      {
        conversation_id: conversationId,
        school_id: profile.school_id,
        role: 'assistant',
        body: reply,
        provider_id: usedProvider.id,
        model: usedProvider.model,
        cited_segments: citations,
        flagged: unsafe,
        flag_reason: unsafe ? 'Response to flagged student message' : null
      }
    ]);
    if (messageError) throw messageError;
    await admin.from('ai_conversations').update({
      message_count: (history?.length || 0) + 2,
      last_message_at: now,
      flagged: unsafe,
      flag_reason: unsafe ? 'Possible unsafe or crisis-related student message' : null
    }).eq('id', conversationId);

    return json({
      reply,
      conversation_id: conversationId,
      quota: consumed,
      citations,
      flagged: unsafe
    });
  } catch (error) {
    console.error('orbit-chat failed', error);
    return json({ error: error instanceof Error ? error.message : 'Orbit request failed' }, 500);
  }
});

async function getVideoContext(admin: any, contentId: string, query: string) {
  const { data, error } = await admin.rpc('orbit_retrieve_segments', {
    p_content_id: contentId,
    p_query: query,
    p_limit: 12
  });
  if (error) {
    console.error('Transcript retrieval failed', error.message);
    return [];
  }
  return data || [];
}

function buildSystemPrompt(
  content: { name: string; description: string | null } | null,
  segments: Array<{ start_seconds: number; end_seconds: number; text: string }>
) {
  const context = segments.map(segment =>
    `[${formatTime(segment.start_seconds)}-${formatTime(segment.end_seconds)}] ${segment.text}`
  ).join('\n');
  const videoRule = content
    ? `Answer only from the current video "${content.name}" and its transcript below. If the answer is not supported by that material, say you do not know and suggest asking a counselor. Cite timestamps like [02:15].`
    : 'Answer education and learning questions only. Politely refuse unrelated requests.';
  return `You are Orbit, a child-safe learning assistant.\n${videoRule}
Reply in the same language and script used in the learner's latest question unless the learner explicitly asks for another language. Understand natural code-switching between English and Indian languages. Never claim certainty when the source is unclear. Do not provide sexual, violent, self-harm, illegal, hateful, or dangerous instructions. For safety concerns, encourage the learner to contact a trusted adult or counselor. Keep the response concise and age-appropriate.
${content?.description ? `Video description: ${content.description}` : ''}
${context ? `Transcript excerpts:\n${context}` : content ? 'No transcript is available. Say that you cannot answer from this video.' : ''}`;
}

function detectsUnsafeContent(message: string) {
  return /\b(suicide|self[- ]?harm|kill myself|abuse|weapon|bomb|sexual|nude|drugs?)\b/i.test(message);
}

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

async function callProvider(provider: Provider, apiKey: string, messages: Array<{ role: string; content: string }>) {
  if (!PROVIDER_BASE_URLS[provider.provider]) {
    throw new Error(`Unsupported AI provider: ${provider.provider}`);
  }

  if (provider.provider === 'gemini') {
    const base = PROVIDER_BASE_URLS.gemini;
    const system = messages.find(message => message.role === 'system')?.content || '';
    const conversation = messages.filter(message => message.role !== 'system').map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }]
    }));
    const response = await fetch(`${base}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: conversation,
        generationConfig: {
          maxOutputTokens: provider.max_output_tokens,
          temperature: provider.temperature
        }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || `Gemini failed (${response.status})`);
    return String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  }

  const base = PROVIDER_BASE_URLS[provider.provider];
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (provider.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://lanxgrowindia.vercel.app';
    headers['X-Title'] = 'LanxGrow Orbit';
  }
  const response = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: provider.max_output_tokens,
      temperature: provider.temperature
    })
  });
  const data = await response.json();
  if (!response.ok) {
    const providerName = provider.provider === 'nvidia' ? 'NVIDIA NIM' : provider.label;
    throw new Error(data?.error?.message || `${providerName} failed (${response.status})`);
  }
  return String(data?.choices?.[0]?.message?.content || '').trim();
}
