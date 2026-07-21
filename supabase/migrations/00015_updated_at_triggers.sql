-- Add updated_at triggers for all LMS tables that have the column.
-- Safe to run multiple times. Requires public.update_updated_at() to exist.

-- Add updated_at to tables that shipped without it in 00014
alter table if exists public.quiz_attempts
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.certificates
  add column if not exists updated_at timestamptz not null default now();

-- course_modules
drop trigger if exists trg_course_modules_updated_at on public.course_modules;
create trigger trg_course_modules_updated_at
  before update on public.course_modules
  for each row execute function public.update_updated_at();

-- lessons
drop trigger if exists trg_lessons_updated_at on public.lessons;
create trigger trg_lessons_updated_at
  before update on public.lessons
  for each row execute function public.update_updated_at();

-- student_progress
drop trigger if exists trg_student_progress_updated_at on public.student_progress;
create trigger trg_student_progress_updated_at
  before update on public.student_progress
  for each row execute function public.update_updated_at();

-- assignments
drop trigger if exists trg_assignments_updated_at on public.assignments;
create trigger trg_assignments_updated_at
  before update on public.assignments
  for each row execute function public.update_updated_at();

-- quizzes
drop trigger if exists trg_quizzes_updated_at on public.quizzes;
create trigger trg_quizzes_updated_at
  before update on public.quizzes
  for each row execute function public.update_updated_at();

-- quiz_attempts
drop trigger if exists trg_quiz_attempts_updated_at on public.quiz_attempts;
create trigger trg_quiz_attempts_updated_at
  before update on public.quiz_attempts
  for each row execute function public.update_updated_at();

-- certificates
drop trigger if exists trg_certificates_updated_at on public.certificates;
create trigger trg_certificates_updated_at
  before update on public.certificates
  for each row execute function public.update_updated_at();
