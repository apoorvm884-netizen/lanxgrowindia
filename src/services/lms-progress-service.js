import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const ProgressService = {

  async getByStudent(studentId) {
    const { data, error } = await supabase
      .from('student_progress')
      .select('*, lesson:lessons(*)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data || [];
  },

  async getByLesson(studentId, lessonId) {
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsertProgress(studentId, lessonId, data) {
    const payload = {
      student_id: studentId,
      lesson_id: lessonId,
      completed: data.completed ?? false,
      time_spent: data.timeSpent ?? data.time_spent ?? null,
      resume_position: data.resumePosition ?? data.resume_position ?? null,
      last_activity: new Date().toISOString()
    };
    if (data.completed_at !== undefined) payload.completed_at = data.completed_at;
    if (data.completed) payload.completed_at = data.completed_at || new Date().toISOString();

    const { data: result, error } = await supabase
      .from('student_progress')
      .upsert(payload, { onConflict: 'student_id, lesson_id' })
      .select()
      .single();
    if (error) throw error;

    return result;
  },

  async markComplete(studentId, lessonId) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('student_progress')
      .upsert({
        student_id: studentId,
        lesson_id: lessonId,
        completed: true,
        completed_at: now,
        last_activity: now
      }, { onConflict: 'student_id, lesson_id' })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Progress', `Student ${studentId} → Lesson ${lessonId}`, 'Lesson marked complete');
    return data;
  },

  async getCourseProgress(studentId, courseId) {
    const { count: totalLessons, error: totalError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId);
    if (totalError) throw totalError;

    const { count: completedLessons, error: completedError } = await supabase
      .from('student_progress')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('lesson_id', (await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId)
      ).data?.map(l => l.id) || []);
    if (completedError) throw completedError;

    return {
      total_lessons: totalLessons || 0,
      completed_lessons: completedLessons || 0,
      percentage: totalLessons ? Math.round(((completedLessons || 0) / totalLessons) * 100) : 0
    };
  }
};
