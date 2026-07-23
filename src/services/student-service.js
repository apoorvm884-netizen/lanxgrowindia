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
        section: item.section || null,
        dob: item.dob || null,
        gender: item.gender || null,
        admission_no: item.admissionNo || null,
        parent_name: item.parentName || null,
        parent_contact: item.parentContact || null,
        academic_year: item.academicYear || null,
        notes: item.notes || null,
        assigned_categories: item.assignedCategories || [],
        assigned_subjects: item.assignedSubjects || []
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
    if (updates.dob !== undefined) payload.dob = updates.dob;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.admissionNo !== undefined) payload.admission_no = updates.admissionNo;
    if (updates.parentName !== undefined) payload.parent_name = updates.parentName;
    if (updates.parentContact !== undefined) payload.parent_contact = updates.parentContact;
    if (updates.academicYear !== undefined) payload.academic_year = updates.academicYear;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.assignedCategories !== undefined) payload.assigned_categories = updates.assignedCategories;
    if (updates.assignedSubjects !== undefined) payload.assigned_subjects = updates.assignedSubjects;

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
