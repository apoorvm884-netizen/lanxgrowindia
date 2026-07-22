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

    const { data: allLessons, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .in('module_id', moduleIds);
    if (lessonError) throw lessonError;
    const lessonIds = allLessons?.map(l => l.id) || [];

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
      total_lessons: lessonIds.length,
      completed_lessons: completedLessons || 0,
      percentage: lessonIds.length ? Math.round(((completedLessons || 0) / lessonIds.length) * 100) : 0
    };
  },

  async getCourseProgressBatch(studentId, courseIds) {
    if (!courseIds.length) return {};
    const { data: modules, error: modError } = await supabase
      .from('course_modules')
      .select('id, course_id')
      .in('course_id', courseIds);
    if (modError) throw modError;
    if (!modules?.length) return Object.fromEntries(courseIds.map(c => [c, { total_lessons: 0, completed_lessons: 0, percentage: 0 }]));

    const courseModuleMap = {};
    for (const m of modules) {
      if (!courseModuleMap[m.course_id]) courseModuleMap[m.course_id] = [];
      courseModuleMap[m.course_id].push(m.id);
    }
    const allModuleIds = modules.map(m => m.id);

    const { data: allLessons, error: lessonError } = await supabase
      .from('lessons')
      .select('id, module_id')
      .in('module_id', allModuleIds);
    if (lessonError) throw lessonError;

    const moduleLessonMap = {};
    const allLessonIds = [];
    for (const l of allLessons || []) {
      if (!moduleLessonMap[l.module_id]) moduleLessonMap[l.module_id] = [];
      moduleLessonMap[l.module_id].push(l.id);
      allLessonIds.push(l.id);
    }

    const courseLessonCount = {};
    for (const [courseId, mids] of Object.entries(courseModuleMap)) {
      courseLessonCount[courseId] = 0;
      for (const mid of mids) {
        courseLessonCount[courseId] += (moduleLessonMap[mid] || []).length;
      }
    }

    const result = {};
    if (allLessonIds.length === 0) {
      for (const cid of courseIds) {
        result[cid] = { total_lessons: 0, completed_lessons: 0, percentage: 0 };
      }
      return result;
    }

    const { data: completedData, error: completedError } = await supabase
      .from('student_progress')
      .select('lesson_id')
      .eq('student_id', studentId)
      .eq('completed', true)
      .in('lesson_id', allLessonIds);
    if (completedError) throw completedError;

    const completedLessonIds = new Set((completedData || []).map(p => p.lesson_id));
    for (const cid of courseIds) {
      const total = courseLessonCount[cid] || 0;
      const completed = (courseModuleMap[cid] || []).reduce((sum, mid) => {
        return sum + (moduleLessonMap[mid] || []).filter(lid => completedLessonIds.has(lid)).length;
      }, 0);
      result[cid] = {
        total_lessons: total,
        completed_lessons: completed,
        percentage: total ? Math.round((completed / total) * 100) : 0
      };
    }
    return result;
  },

  async getByLessons(studentId, lessonIds) {
    if (!lessonIds.length) return {};
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
      .in('lesson_id', lessonIds);
    if (error) throw error;
    const map = {};
    for (const p of data || []) {
      map[p.lesson_id] = p;
    }
    return map;
  }
};
