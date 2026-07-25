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
    const { data, error } = await supabase
      .from('invitations')
      .insert({
        email: invitation.email.toLowerCase().trim(),
        role: invitation.role,
        school_id: invitation.school_id || null,
        company_id: invitation.company_id || null,
        student_id: invitation.student_id || null,
        invited_by: invitation.invited_by || null,
        status: 'pending'
      })
      .select('*, schools(name)')
      .single();
    if (error) throw error;

    await AuditLogService.log(
      'created', 'Invitation',
      invitation.email,
      `Invited ${invitation.email} as ${invitation.role}`
    );
    return data;
  },

  async resend(id) {
    const { data, error } = await supabase
      .from('invitations')
      .update({ status: 'pending', expires_at: new Date(Date.now() + 14 * 86400000).toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
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
