import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const SchoolService = {

  async getAll() {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getByCode(code) {
    const { data, error } = await supabase
      .from('schools')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(school) {
    const { data, error } = await supabase
      .from('schools')
      .insert({
        name: school.name,
        code: school.code,
        status: school.status || 'active',
        principal_name: school.principal_name || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'School', data.name, `School "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('schools')
      .update({
        name: updates.name,
        code: updates.code,
        status: updates.status,
        principal_name: updates.principal_name || null
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'School', data.name, `School "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: school, error: fetchError } = await supabase
      .from('schools')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'School', school?.name || 'Unknown', `School deleted`);
  }
};
