-- ==============================================================
-- LANXGROW COS — Performance Optimization Indexes
-- Ticket #015: Batch query support, N+1 elimination
-- ==============================================================

-- student_progress: batch course progress queries
CREATE INDEX IF NOT EXISTS idx_student_progress_student_lesson
  ON student_progress (student_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_completed
  ON student_progress (student_id, completed)
  WHERE completed = true;

-- course_modules: batch getByCourses queries
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id
  ON course_modules (course_id);

-- lessons: batch getByModules, getByModule queries
CREATE INDEX IF NOT EXISTS idx_lessons_module_id
  ON lessons (module_id);

-- lessons: batch getByIds queries
CREATE INDEX IF NOT EXISTS idx_lessons_id
  ON lessons (id);

-- enrollments: batch course enrollment lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_course_status
  ON enrollments (course_id, status);

-- enrollments: student enrollment lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_student
  ON enrollments (student_id);
