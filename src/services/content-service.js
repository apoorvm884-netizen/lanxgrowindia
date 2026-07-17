import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const ContentService = {

  async getAll() {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getBySection(sectionId) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('content')
      .insert({
        name: item.name,
        type: item.type,
        url: item.url || null,
        size: item.size || null,
        school_id: item.schoolId,
        section_id: item.sectionId || null,
        description: item.description || null,
        tags: item.tags || [],
        status: item.status || 'draft'
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('uploaded', 'Content', data.name, `Content "${data.name}" uploaded`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.url !== undefined) payload.url = updates.url;
    if (updates.size !== undefined) payload.size = updates.size;
    if (updates.sectionId !== undefined) payload.section_id = updates.sectionId;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.status !== undefined) payload.status = updates.status;

    const { data, error } = await supabase
      .from('content')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Content', data.name, `Content "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('content')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Content', item?.name || 'Unknown', `Content deleted`);
  }
};
