import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const PermissionsService = {

  async getByRole(role) {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .eq('role', role)
      .order('permission');
    if (error) throw error;
    return data || [];
  },

  async getAll() {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('role, permission');
    if (error) throw error;
    return data || [];
  },

  async set(role, permission, enabled) {
    const { data, error } = await supabase
      .from('permissions')
      .upsert({
        role,
        permission,
        enabled
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log(
      'edited',
      'Permission',
      `${role}:${permission}`,
      `Permission ${enabled ? 'enabled' : 'disabled'} for ${role}`
    );
    return data;
  },

  async delete(role, permission) {
    const { error } = await supabase
      .from('permissions')
      .delete()
      .eq('role', role)
      .eq('permission', permission);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Permission', `${role}:${permission}`, 'Permission removed');
  }
};