import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const SectionService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('school_id', schoolId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getBySubject(subjectId) {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('subject_id', subjectId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(section) {
    const { data, error } = await supabase
      .from('sections')
      .insert({
        name: section.name,
        school_id: section.schoolId,
        subject_id: section.subjectId,
        description: section.description || null,
        sort_order: section.sortOrder || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Section', data.name, `Section "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

    const { data, error } = await supabase
      .from('sections')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Section', data.name, `Section "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: sec, error: fetchError } = await supabase
      .from('sections')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Section', sec?.name || 'Unknown', `Section deleted`);
  }
};
