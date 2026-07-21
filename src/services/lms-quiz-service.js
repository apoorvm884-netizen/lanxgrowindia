import { supabase } from '../lib/supabase.js';
import { AuditLogService } from './audit-log-service.js';

export const QuizService = {

  async getByCourse(courseId) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId);
    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(item) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        course_id: item.courseId,
        title: item.title,
        description: item.description || null,
        time_limit: item.timeLimit || item.time_limit || null,
        passing_score: item.passingScore || item.passing_score || null
      })
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('created', 'Quiz', data.title, `Quiz "${data.title}" created`);
    return data;
  },

  async update(id, updates) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.time_limit !== undefined) payload.time_limit = updates.time_limit;
    if (updates.passing_score !== undefined) payload.passing_score = updates.passing_score;

    const { data, error } = await supabase
      .from('quizzes')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await AuditLogService.log('edited', 'Quiz', data.title, `Quiz "${data.title}" updated`);
    return data;
  },

  async delete(id) {
    const { data: item, error: fetchError } = await supabase
      .from('quizzes')
      .select('title')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);
    if (error) throw error;

    await AuditLogService.log('deleted', 'Quiz', item?.title || 'Unknown', 'Quiz deleted');
  },

  async getQuestions(quizId) {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  async createQuestion(data) {
    const { data: result, error } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: data.quizId || data.quiz_id,
        question_text: data.questionText || data.question_text,
        question_type: data.questionType || data.question_type || 'mcq',
        options: data.options || null,
        correct_answer: data.correctAnswer || data.correct_answer || null,
        marks: data.marks ?? 1,
        sort_order: data.sortOrder ?? data.sort_order ?? null
      })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async updateQuestion(id, updates) {
    const payload = {};
    if (updates.question_text !== undefined) payload.question_text = updates.question_text;
    if (updates.question_type !== undefined) payload.question_type = updates.question_type;
    if (updates.options !== undefined) payload.options = updates.options;
    if (updates.correct_answer !== undefined) payload.correct_answer = updates.correct_answer;
    if (updates.marks !== undefined) payload.marks = updates.marks;
    if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

    const { data, error } = await supabase
      .from('quiz_questions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteQuestion(id) {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async startAttempt(quizId, studentId) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAttempt(attemptId) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();
    if (error) throw error;
    return data;
  },

  async getStudentAttempts(quizId, studentId) {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async submitAnswer(attemptId, questionId, answer) {
    const { data, error } = await supabase
      .from('quiz_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        answer: typeof answer === 'string' ? answer : JSON.stringify(answer)
      }, { onConflict: 'attempt_id, question_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async completeAttempt(attemptId) {
    const attempt = await supabase
      .from('quiz_attempts')
      .select('quiz_id')
      .eq('id', attemptId)
      .single();
    if (attempt.error) throw attempt.error;

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('passing_score')
      .eq('id', attempt.data.quiz_id)
      .single();
    if (quizError) throw quizError;
    const passingScore = quiz?.passing_score ?? 50;

    const { data: questions, error: qError } = await supabase
      .from('quiz_questions')
      .select('id, marks, correct_answer')
      .eq('quiz_id', attempt.data.quiz_id);
    if (qError) throw qError;

    const { data: answers, error: aError } = await supabase
      .from('quiz_answers')
      .select('question_id, answer')
      .eq('attempt_id', attemptId);
    if (aError) throw aError;

    const answerMap = new Map(answers.map(a => [a.question_id, a.answer]));
    let totalMarks = 0;
    let obtainedMarks = 0;

    for (const q of questions || []) {
      totalMarks += q.marks || 1;
      const studentAnswer = answerMap.get(q.id);
      if (studentAnswer && q.correct_answer && String(studentAnswer).trim() === String(q.correct_answer).trim()) {
        obtainedMarks += q.marks || 1;
      }
    }

    const score = obtainedMarks;
    const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

    const { data: result, error } = await supabase
      .from('quiz_attempts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        score,
        total_marks: totalMarks,
        percentage,
        passed: percentage >= passingScore
      })
      .eq('id', attemptId)
      .select()
      .single();
    if (error) throw error;

    return result;
  },

  async getAnswers(attemptId) {
    const { data, error } = await supabase
      .from('quiz_answers')
      .select('*, question:quiz_questions(*)')
      .eq('attempt_id', attemptId);
    if (error) throw error;
    return data || [];
  }
};
