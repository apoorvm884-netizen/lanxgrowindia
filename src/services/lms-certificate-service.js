import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const CertificateService = {

  async getByStudent(studentId) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, course:courses(title)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data || [];
  },

  async getByCourse(studentId, courseId) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async generate(studentId, courseId, completedAt) {
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = now.getTime().toString().slice(-6);
    const certificateNumber = `CERT-${year}-${timestamp}`;

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        student_id: studentId,
        course_id: courseId,
        certificate_number: certificateNumber,
        completed_at: completedAt || now.toISOString(),
        issued_at: now.toISOString()
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Certificate', certificateNumber, `Certificate "${certificateNumber}" generated`);
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, student:students(*), course:courses(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async verify(certificateNumber) {
    const { data, error } = await supabase
      .from('certificates')
      .select('*, student:students(full_name, email), course:courses(title, description)')
      .eq('certificate_number', certificateNumber)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
};
