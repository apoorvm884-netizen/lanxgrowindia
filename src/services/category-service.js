import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const CategoryService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(category) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        school_id: category.schoolId
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Category', data.name, `Category "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: updates.name })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Category', data.name, `Category "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: cat, error: fetchError } = await supabase
      .from('categories')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Category', cat?.name || 'Unknown', `Category deleted`);
  }
};
