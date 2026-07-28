import { supabase } from '../lib/supabase.js';

export const AuditLogService = {

  async log(action, entity, entityName, detail, context = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, full_name, email, role, school_id, company_id')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const school_id = context.schoolId || profile?.school_id || null;
      let company_id = context.companyId || profile?.company_id || null;
      if (!company_id && school_id) {
        const { data: school } = await supabase
          .from('schools')
          .select('company_id')
          .eq('id', school_id)
          .maybeSingle();
        company_id = school?.company_id || null;
      }

      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: profile?.name || profile?.full_name || profile?.email ||
          user.email?.split('@')[0] || 'Administrator',
        actor_role: profile?.role || null,
        school_id,
        company_id,
        action,
        entity,
        entity_name: entityName,
        detail: detail || null,
        status: context.status || 'successful',
        source: context.source || 'dashboard',
        metadata: context.metadata || {}
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Audit log insert failed (non-blocking):', err.message);
    }
  },

  async getAll(limit = 500) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, schools(name)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  subscribe(callback, options = {}) {
    const config = {
      event: 'INSERT',
      schema: 'public',
      table: 'audit_logs'
    };
    if (options.schoolId) config.filter = `school_id=eq.${options.schoolId}`;

    return supabase
      .channel(`activity-logs-${options.schoolId || 'admin'}-${Date.now()}`)
      .on('postgres_changes', config, payload => callback(payload.new))
      .subscribe();
  },

  unsubscribe(channel) {
    if (channel) supabase.removeChannel(channel);
  }
};
