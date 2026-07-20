import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const EnrollmentService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, student:students!inner(*), course:courses!inner(*)')
      .eq('student.school_id', schoolId);
    if (error) throw error;
    return data || [];
  },

  async getByStudent(studentId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, course:courses(*)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data || [];
  },

  async getByCourse(courseId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, student:students(*)')
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  async create(studentId, courseId, assignedBy) {
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        status: 'active',
        assigned_by: assignedBy || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Enrollment', `Student ${studentId} → Course ${courseId}`, `Student enrolled in course`);
    return data;
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('enrollments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Enrollment', '', 'Enrollment removed');
  }
};
