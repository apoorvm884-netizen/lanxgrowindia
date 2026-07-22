import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const CourseService = {

  async getBySchool(schoolId) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
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

  async getByCategory(categoryId) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getBySubject(subjectId) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('subject_id', subjectId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getByStatus(schoolId, status) {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('school_id', schoolId)
      .eq('publish_status', status)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async getPublished(schoolId) {
    return this.getByStatus(schoolId, 'published');
  },

  async create(item) {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        name: item.name,
        description: item.description || null,
        school_id: item.schoolId,
        category_id: item.categoryId || null,
        subject_id: item.subjectId || null,
        thumbnail: item.thumbnail || null,
        difficulty: item.difficulty || 'intermediate',
        estimated_duration: item.estimatedDuration || null,
        publish_status: item.publishStatus || 'draft',
        version: item.version || 1,
        created_by: item.createdBy || null
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
    if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
    if (updates.subjectId !== undefined) payload.subject_id = updates.subjectId;
    if (updates.thumbnail !== undefined) payload.thumbnail = updates.thumbnail;
    if (updates.difficulty !== undefined) payload.difficulty = updates.difficulty;
    if (updates.estimatedDuration !== undefined) payload.estimated_duration = updates.estimatedDuration;
    if (updates.publishStatus !== undefined) payload.publish_status = updates.publishStatus;
    if (updates.version !== undefined) payload.version = updates.version;

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

  async archive(id) {
    return this.update(id, { publishStatus: 'archived' });
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

  async search(query) {
    const q = query.toLowerCase();
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .ilike('name', `%${q}%`)
      .order('name');
    if (error) throw error;
    return data || [];
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
