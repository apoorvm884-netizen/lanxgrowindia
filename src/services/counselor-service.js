import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const CounselorService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('counselors')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('counselors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    await AuditLogService.log('created', 'Counselor', data.name, `Counselor "${data.name}" created`, {
      schoolId: data.school_id,
      metadata: { counselor_id: data.id }
    });
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('counselors')
      .insert({
        name: item.name,
        email: item.email || null,
        school_id: item.schoolId,
        employee_id: item.employeeId || null,
        phone: item.phone || null,
        gender: item.gender || null,
        date_of_birth: item.dateOfBirth || null,
        qualification: item.qualification || null,
        experience: item.experience || 0,
        department: item.department || null,
        status: item.status || 'active',
        assigned_categories: item.assignedCategories || [],
        assigned_subjects: item.assignedSubjects || [],
      })
      .select()
      .single();
    if (error) throw error;
    await AuditLogService.log('edited', 'Counselor', data.name, `Counselor "${data.name}" updated`, {
      schoolId: data.school_id,
      metadata: { counselor_id: data.id, changed_fields: Object.keys(payload) }
    });
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.employeeId !== undefined) payload.employee_id = updates.employeeId;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.dateOfBirth !== undefined) payload.date_of_birth = updates.dateOfBirth;
    if (updates.qualification !== undefined) payload.qualification = updates.qualification;
    if (updates.experience !== undefined) payload.experience = updates.experience;
    if (updates.department !== undefined) payload.department = updates.department;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.assignedCategories !== undefined) payload.assigned_categories = updates.assignedCategories;
    if (updates.assignedSubjects !== undefined) payload.assigned_subjects = updates.assignedSubjects;

    const { data, error } = await supabase
      .from('counselors')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { data: counselor, error: fetchError } = await supabase
      .from('counselors')
      .select('id, school_id, name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    const { error } = await supabase
      .from('counselors')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await AuditLogService.log('deleted', 'Counselor', counselor.name, `Counselor "${counselor.name}" deleted`, {
      schoolId: counselor.school_id,
      metadata: { counselor_id: counselor.id }
    });
  }
};
