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
      time_spent: data.timeSpent ?? data.time_spent ?? 0,
      resume_position: data.resumePosition ?? data.resume_position ?? 0,
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
    const { data: modules, error: modError } = await supabase
      .from('course_modules')
      .select('id')
      .eq('course_id', courseId);
    if (modError) throw modError;
    const moduleIds = modules?.map(m => m.id) || [];
    if (moduleIds.length === 0) {
      return { total_lessons: 0, completed_lessons: 0, percentage: 0 };
    }

    const { count: totalLessons, error: totalError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .in('module_id', moduleIds);
    if (totalError) throw totalError;

    const { data: allLessonIds, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);
    if (lessonError) throw lessonError;
    const lessonIds = allLessonIds?.map(l => l.id) || [];

    if (lessonIds.length === 0) {
      return { total_lessons: 0, completed_lessons: 0, percentage: 0 };
    }

    const { count: completedLessons, error: completedError } = await supabase
      .from('student_progress')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('lesson_id', lessonIds);
    if (completedError) throw completedError;

    return {
      total_lessons: totalLessons || 0,
      completed_lessons: completedLessons || 0,
      percentage: totalLessons ? Math.round(((completedLessons || 0) / totalLessons) * 100) : 0
    };
  }
};
