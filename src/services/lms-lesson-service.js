import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const LessonService = {

  async getByModule(moduleId) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('lessons')
      .insert({
        module_id: item.moduleId,
        title: item.title,
        content_type: item.contentType || 'video',
        content_url: item.contentUrl || null,
        content_id: item.contentId || null,
        sort_order: item.sortOrder,
        duration: item.duration || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Lesson', data.title, `Lesson "${data.title}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content_type !== undefined) payload.content_type = updates.content_type;
    if (updates.content_url !== undefined) payload.content_url = updates.content_url;
    if (updates.content_id !== undefined) payload.content_id = updates.content_id;
    if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;
    if (updates.duration !== undefined) payload.duration = updates.duration;

    const { data, error } = await supabase
      .from('lessons')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Lesson', data.title, `Lesson "${data.title}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('lessons')
      .select('title')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Lesson', item?.title || 'Unknown', 'Lesson deleted');
  },

  async getByModules(moduleIds) {
    if (!moduleIds.length) return {};
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('sort_order');
    if (error) throw error;
    const map = {};
    for (const l of data || []) {
      if (!map[l.module_id]) map[l.module_id] = [];
      map[l.module_id].push(l);
    }
    return map;
  },

  async getByIds(ids) {
    if (!ids.length) return {};
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .in('id', ids);
    if (error) throw error;
    const map = {};
    for (const l of data || []) {
      map[l.id] = l;
    }
    return map;
  },

  async reorder(items) {
    const { error } = await supabase
      .from('lessons')
      .upsert(
        items.map((item, index) => ({
          id: item.id,
          sort_order: item.sort_order ?? index
        }))
      );
    if (error) throw error;

    await AuditLogService.log('edited', 'Lesson', '', 'Lessons reordered');
  }
};
