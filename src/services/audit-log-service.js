import { supabase } from '../lib/supabase.js';

export const AuditLogService = {

  async log(action, entity, entityName, detail) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const user_name = user?.user_metadata?.full_name ||
                        user?.email?.split('@')[0] || 'System';

      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        user_name,
        action,
        entity,
        entity_name: entityName,
        detail: detail || null
      });
    } catch (err) {
      console.warn('Audit log insert failed (non-blocking):', err.message);
    }
  },

  async getAll() {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return data || [];
  }
};
