import { supabase } from '../lib/supabase.js';

export const AiService = {

  // ── Providers ─────────────────────────────────────────────
  async getProviders() {
    const { data, error } = await supabase
      .from('ai_providers')
      .select('*')
      .order('priority');
    if (error) throw error;
    return data || [];
  },

  async createProvider(provider) {
    const { data, error } = await supabase
      .from('ai_providers')
      .insert({
        label: provider.label,
        provider: provider.provider,
        base_url: provider.base_url || null,
        model: provider.model,
        priority: provider.priority || 100,
        enabled: provider.enabled !== false,
        max_output_tokens: provider.max_output_tokens || 1500,
        temperature: provider.temperature || 0.3,
        school_id: provider.school_id || null,
        created_by: provider.created_by || null
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProvider(id, updates) {
    const { data, error } = await supabase
      .from('ai_providers')
      .update(updates)
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
    const fingerprint = apiKey.slice(0, 4) + '...' + apiKey.slice(-4);
    const { error } = await supabase
      .from('ai_provider_secrets')
      .upsert({
        provider_id: providerId,
        api_key: apiKey,
        key_fingerprint: fingerprint
      }, { onConflict: 'provider_id' });
    if (error) throw error;
    await supabase.from('ai_providers').update({ key_fingerprint: fingerprint }).eq('id', providerId);
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
