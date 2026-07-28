import { supabase } from '../lib/supabase.js';

const PROVIDER_PRESETS = Object.freeze({
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash'
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini'
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4.1-mini'
  },
  nvidia: {
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'nvidia/nemotron-3-super-120b-a12b'
  }
});

function normalizeProvider(provider) {
  const preset = PROVIDER_PRESETS[provider.provider];
  if (!preset) throw new Error('Unsupported AI provider.');
  return {
    label: provider.label || preset.label,
    provider: provider.provider,
    base_url: preset.baseUrl,
    model: provider.model || preset.model,
    priority: provider.priority || 100,
    enabled: provider.enabled !== false,
    max_output_tokens: provider.max_output_tokens || 1500,
    temperature: provider.temperature ?? 0.3,
    school_id: provider.school_id || null
  };
}

export const AiService = {
  PROVIDER_PRESETS,

  getProviderPreset(provider) {
    return PROVIDER_PRESETS[provider] || null;
  },

  // ── Providers ─────────────────────────────────────────────
  async getProviders(schoolId = null) {
    let query = supabase
      .from('ai_providers')
      .select('*')
      .order('priority');
    if (schoolId) query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createProvider(provider) {
    const payload = normalizeProvider(provider);
    const { data, error } = await supabase
      .from('ai_providers')
      .insert({
        ...payload,
        created_by: provider.created_by || null
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProvider(id, updates) {
    const payload = normalizeProvider(updates);
    const { data, error } = await supabase
      .from('ai_providers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProvider(id) {
    const { error } = await supabase.from('ai_providers').delete().eq('id', id);
    if (error) throw error;
  },

  async setProviderKey(providerId, apiKey) {
    if (!apiKey || apiKey.length < 12) throw new Error('Enter a valid API key.');
    const { error } = await supabase.rpc('set_ai_provider_secret', {
      p_provider_id: providerId,
      p_api_key: apiKey
    });
    if (error) throw error;
  },

  // ── School AI Settings ────────────────────────────────────
  async getSchoolSettings(schoolId) {
    const { data, error } = await supabase
      .from('school_ai_settings')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertSchoolSettings(schoolId, settings) {
    const { data, error } = await supabase
      .from('school_ai_settings')
      .upsert({ school_id: schoolId, ...settings }, { onConflict: 'school_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setSchoolPolicy(schoolId, accessMode, dailyLimit) {
    const { data, error } = await supabase.rpc('set_school_orbit_policy', {
      p_school_id: schoolId,
      p_access_mode: accessMode,
      p_daily_limit: dailyLimit ?? null
    });
    if (error) throw error;
    return data;
  },

  async getQuota(contentId = null) {
    const { data, error } = await supabase.rpc('orbit_quota_status', {
      p_content_id: contentId
    });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  },

  async setStudentAccess(studentId, enabled, dailyLimit) {
    const { data, error } = await supabase.rpc('set_student_orbit_access', {
      p_student_id: studentId,
      p_enabled: enabled,
      p_daily_limit: dailyLimit ?? null
    });
    if (error) throw error;
    return data;
  },

  // ── Conversations / Messages ──────────────────────────────
  async getConversations(schoolId, limit = 50) {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*, profiles!ai_conversations_user_id_fkey(full_name, avatar_url)')
      .eq('school_id', schoolId)
      .order('last_message_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async getMessages(conversationId) {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at');
    if (error) throw error;
    return data || [];
  },

  // ── Escalations ───────────────────────────────────────────
  async getEscalations(schoolId, status) {
    let query = supabase
      .from('ai_escalations')
      .select('*, profiles!ai_escalations_student_id_fkey(full_name, avatar_url)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query.limit(100);
    if (error) throw error;
    return data || [];
  },

  async replyToEscalation(id, reply, repliedBy) {
    const { data, error } = await supabase
      .from('ai_escalations')
      .update({
        staff_reply: reply,
        replied_by: repliedBy,
        replied_at: new Date().toISOString(),
        status: 'resolved'
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Usage Stats ───────────────────────────────────────────
  async getUsageStats(schoolId, days = 30) {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('ai_usage_daily')
      .select('*')
      .eq('school_id', schoolId)
      .gte('usage_date', since)
      .order('usage_date');
    if (error) throw error;
    return data || [];
  }
};
