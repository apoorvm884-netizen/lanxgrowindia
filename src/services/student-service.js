import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';
import { AdminAccessService } from './admin-access-service.js';

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

  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
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
        drive_folder_id: item.driveFolderId,
        drive_folder_name: item.driveFolderName || null,
        dob: item.dob || null,
        gender: item.gender || null,
        admission_no: item.admissionNo || null,
        parent_name: item.parentName || null,
        parent_contact: item.parentContact || null,
        academic_year: item.academicYear || null,
        notes: item.notes || null,
        last_drive_sync_error: null
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
    if (updates.driveFolderId !== undefined) payload.drive_folder_id = updates.driveFolderId;
    if (updates.driveFolderName !== undefined) payload.drive_folder_name = updates.driveFolderName;
    if (updates.dob !== undefined) payload.dob = updates.dob;
    if (updates.gender !== undefined) payload.gender = updates.gender;
    if (updates.admissionNo !== undefined) payload.admission_no = updates.admissionNo;
    if (updates.parentName !== undefined) payload.parent_name = updates.parentName;
    if (updates.parentContact !== undefined) payload.parent_contact = updates.parentContact;
    if (updates.academicYear !== undefined) payload.academic_year = updates.academicYear;
    if (updates.notes !== undefined) payload.notes = updates.notes;

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

  async resetDevices(id) {
    const { data, error } = await supabase.rpc('revoke_student_devices', {
      p_student_id: id
    });
    if (error) throw error;
    return Number(data) || 0;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('students')
      .select('name, user_id')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    // Permanent student deletion must revoke the linked Auth login as well.
    // Otherwise the email remains reserved in auth.users and cannot be reused.
    await AdminAccessService.deleteStudent(id);

    await AuditLogService.log('deleted', 'Student', item?.name || 'Unknown', `Student deleted`);
  }
};
