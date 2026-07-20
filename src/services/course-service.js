import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const CourseService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        name: item.name,
        description: item.description || null,
        school_id: item.schoolId
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Course', data.name, `Course "${data.name}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;

    const { data, error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Course', data.name, `Course "${data.name}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('courses')
      .select('name')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Course', item?.name || 'Unknown', `Course deleted`);
  },

  // Course Sections
  async getSections(courseId) {
    const { data, error } = await supabase
      .from('course_sections')
      .select('*, section:sections(*)')
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  async addSection(courseId, sectionId) {
    const { data, error } = await supabase
      .from('course_sections')
      .insert({ course_id: courseId, section_id: sectionId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeSection(courseId, sectionId) {
    const { error } = await supabase
      .from('course_sections')
      .delete()
      .eq('course_id', courseId)
      .eq('section_id', sectionId);
    if (error) throw error;
  },

  // Enrollments
  async getEnrollments(courseId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, student:students(*)')
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  async getStudentCourses(studentId) {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, course:courses(*)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data || [];
  }
};
