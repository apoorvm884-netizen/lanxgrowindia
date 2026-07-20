import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const StudentService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getByCounselor(counselorId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('counselor_id', counselorId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name: item.name,
        email: item.email || null,
        school_id: item.schoolId,
        counselor_id: item.counselorId || null,
        status: item.status || 'active',
        class: item.class || null,
        section: item.section || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Student', data.name, `Student "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.counselorId !== undefined) payload.counselor_id = updates.counselorId;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.class !== undefined) payload.class = updates.class;
    if (updates.section !== undefined) payload.section = updates.section;

    const { data, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Student', data.name, `Student "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('students')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Student', item?.name || 'Unknown', `Student deleted`);
  }
};
