import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const SubjectService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getByCategory(categoryId) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async search(query) {
    const q = query.toLowerCase();
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .ilike('name', `%${q}%`)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async create(subject) {
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name: subject.name,
        school_id: subject.schoolId,
        category_id: subject.categoryId,
        status: subject.status || 'active'
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Subject', data.name, `Subject "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
    if (updates.status !== undefined) payload.status = updates.status;

    const { data, error } = await supabase
      .from('subjects')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Subject', data.name, `Subject "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: subj, error: fetchError } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Subject', subj?.name || 'Unknown', `Subject deleted`);
  }
};
