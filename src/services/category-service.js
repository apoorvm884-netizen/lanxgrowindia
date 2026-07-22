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

  async getChildren(parentId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getTree(schoolId) {
    const all = await this.getBySchool(schoolId);
    return all.filter(c => !c.parent_id);
  },

  async create(category) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: category.name,
        school_id: category.schoolId,
        parent_id: category.parentId || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Category', data.name, `Category "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = { name: updates.name };
    if (updates.parentId !== undefined) payload.parent_id = updates.parentId;
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
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
