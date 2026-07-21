import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const AssignmentService = {

  async getByCourse(courseId) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('assignments')
      .insert({
        course_id: item.courseId,
        title: item.title,
        description: item.description || null,
        due_date: item.dueDate || null,
        max_marks: item.maxMarks || item.max_marks || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Assignment', data.title, `Assignment "${data.title}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.due_date !== undefined) payload.due_date = updates.due_date;
    if (updates.max_marks !== undefined) payload.max_marks = updates.max_marks;

    const { data, error } = await supabase
      .from('assignments')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Assignment', data.title, `Assignment "${data.title}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('assignments')
      .select('title')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Assignment', item?.title || 'Unknown', 'Assignment deleted');
  },

  async getSubmissions(assignmentId) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, student:students(*)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getStudentSubmission(assignmentId, studentId) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async submitAssignment(assignmentId, studentId, data) {
    const { data: result, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        file_url: data.fileUrl || data.file_url || null,
        file_type: data.fileType || data.file_type || null,
        submission_text: data.submissionText || data.submission_text || null,
        status: 'submitted'
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Submission', `Student ${studentId} → Assignment ${assignmentId}`, 'Assignment submitted');
    return result;
  },

  async reviewSubmission(id, marks, remarks, reviewedBy) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        marks,
        remarks: remarks || null,
        status: 'reviewed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy || null
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Submission', `Submission ${id}`, 'Assignment submission reviewed');
    return data;
  }
};
