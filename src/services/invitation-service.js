import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const InvitationService = {

  async getAll(filters = {}) {
    let query = supabase
      .from('invitations')
      .select('*, schools(name)')
      .order('created_at', { ascending: false });

    if (filters.school_id) query = query.eq('school_id', filters.school_id);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.role) query = query.eq('role', filters.role);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create(invitation) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        action: 'create',
        email: invitation.email,
        role: invitation.role,
        school_id: invitation.school_id || null,
        company_id: invitation.company_id || null,
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    await AuditLogService.log(
      'created', 'Invitation',
      invitation.email,
      `Invited ${invitation.email} as ${invitation.role}`
    );
    return data.invitation;
  },

  async resend(id) {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { action: 'resend', id, redirectTo: window.location.origin }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.invitation;
  },

  async revoke(id) {
    const { data, error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('deleted', 'Invitation', data.email, `Invitation revoked for ${data.email}`);
    return data;
  },

  async delete(id) {
    const { error } = await supabase.from('invitations').delete().eq('id', id);
    if (error) throw error;
  },

  async getByEmail(email) {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};
