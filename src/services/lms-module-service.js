import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const ModuleService = {

  async getByCourse(courseId) {
    const { data, error } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('course_modules')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('course_modules')
      .insert({
        course_id: item.courseId,
        title: item.title,
        description: item.description || null,
        sort_order: item.sortOrder
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Module', data.title, `Module "${data.title}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

    const { data, error } = await supabase
      .from('course_modules')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Module', data.title, `Module "${data.title}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('course_modules')
      .select('title')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('course_modules')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Module', item?.title || 'Unknown', 'Module deleted');
  },

  async reorder(items) {
    const { error } = await supabase
      .from('course_modules')
      .upsert(
        items.map((item, index) => ({
          id: item.id,
          sort_order: item.sort_order ?? index
        }))
      );
    if (error) throw error;

    await AuditLogService.log('edited', 'Module', '', 'Modules reordered');
  }
};
