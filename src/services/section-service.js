import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const SectionService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getBySubject(subjectId) {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('subject_id', subjectId)
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
        subject_id: section.subjectId
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Section', data.name, `Section "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('sections')
      .update({ name: updates.name })
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
