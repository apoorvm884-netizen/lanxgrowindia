-- Create all LMS tables: course_modules, lessons, student_progress,
-- assignments, assignment_submissions, quizzes, quiz_questions,
-- quiz_attempts, quiz_answers, certificates
-- Fully idempotent: safe to run multiple times
-- Run this AFTER 00013_courses_enrollments_notifications.sql

-- ==============================================================
-- 1. COURSE MODULES
-- ==============================================================
create table if not exists public.course_modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_course_modules_course on public.course_modules(course_id);
create index if not exists idx_course_modules_sort on public.course_modules(course_id, sort_order);

alter table public.course_modules enable row level security;

drop policy if exists "Super admins can read course_modules" on public.course_modules;
create policy "Super admins can read course_modules"
  on public.course_modules for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own course_modules" on public.course_modules;
create policy "School admins can read own course_modules"
  on public.course_modules for select
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert course_modules" on public.course_modules;
create policy "Super admins can insert course_modules"
  on public.course_modules for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own course_modules" on public.course_modules;
create policy "School admins can insert own course_modules"
  on public.course_modules for insert
  with check (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update course_modules" on public.course_modules;
create policy "Super admins can update course_modules"
  on public.course_modules for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own course_modules" on public.course_modules;
create policy "School admins can update own course_modules"
  on public.course_modules for update
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete course_modules" on public.course_modules;
create policy "Super admins can delete course_modules"
  on public.course_modules for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own course_modules" on public.course_modules;
create policy "School admins can delete own course_modules"
  on public.course_modules for delete
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 2. LESSONS
-- ==============================================================
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.course_modules(id) on delete cascade,
  title        text not null,
  content_type text not null check (content_type in ('video','pdf','document','image','drive_link','assignment','quiz')),
  content_url  text,
  content_id   uuid,
  sort_order   integer not null default 0,
  duration     integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_lessons_module on public.lessons(module_id);
create index if not exists idx_lessons_sort on public.lessons(module_id, sort_order);

alter table public.lessons enable row level security;

drop policy if exists "Super admins can read lessons" on public.lessons;
create policy "Super admins can read lessons"
  on public.lessons for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own lessons" on public.lessons;
create policy "School admins can read own lessons"
  on public.lessons for select
  using (exists (
    select 1 from public.course_modules cm
    join public.courses c on c.id = cm.course_id
    where cm.id = module_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert lessons" on public.lessons;
create policy "Super admins can insert lessons"
  on public.lessons for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own lessons" on public.lessons;
create policy "School admins can insert own lessons"
  on public.lessons for insert
  with check (exists (
    select 1 from public.course_modules cm
    join public.courses c on c.id = cm.course_id
    where cm.id = module_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update lessons" on public.lessons;
create policy "Super admins can update lessons"
  on public.lessons for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own lessons" on public.lessons;
create policy "School admins can update own lessons"
  on public.lessons for update
  using (exists (
    select 1 from public.course_modules cm
    join public.courses c on c.id = cm.course_id
    where cm.id = module_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete lessons" on public.lessons;
create policy "Super admins can delete lessons"
  on public.lessons for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own lessons" on public.lessons;
create policy "School admins can delete own lessons"
  on public.lessons for delete
  using (exists (
    select 1 from public.course_modules cm
    join public.courses c on c.id = cm.course_id
    where cm.id = module_id and c.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 3. STUDENT PROGRESS
-- ==============================================================
create table if not exists public.student_progress (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  completed       boolean not null default false,
  completed_at    timestamptz,
  time_spent      integer not null default 0,
  resume_position integer not null default 0,
  last_activity   timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(student_id, lesson_id)
);

create index if not exists idx_student_progress_student on public.student_progress(student_id);
create index if not exists idx_student_progress_lesson on public.student_progress(lesson_id);

alter table public.student_progress enable row level security;

drop policy if exists "Super admins can read progress" on public.student_progress;
create policy "Super admins can read progress"
  on public.student_progress for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own progress" on public.student_progress;
create policy "School admins can read own progress"
  on public.student_progress for select
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert progress" on public.student_progress;
create policy "Super admins can insert progress"
  on public.student_progress for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own progress" on public.student_progress;
create policy "School admins can insert own progress"
  on public.student_progress for insert
  with check (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update progress" on public.student_progress;
create policy "Super admins can update progress"
  on public.student_progress for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own progress" on public.student_progress;
create policy "School admins can update own progress"
  on public.student_progress for update
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete progress" on public.student_progress;
create policy "Super admins can delete progress"
  on public.student_progress for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own progress" on public.student_progress;
create policy "School admins can delete own progress"
  on public.student_progress for delete
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 4. ASSIGNMENTS
-- ==============================================================
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text,
  due_date    timestamptz,
  max_marks   integer,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_assignments_course on public.assignments(course_id);

alter table public.assignments enable row level security;

drop policy if exists "Super admins can read assignments" on public.assignments;
create policy "Super admins can read assignments"
  on public.assignments for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own assignments" on public.assignments;
create policy "School admins can read own assignments"
  on public.assignments for select
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert assignments" on public.assignments;
create policy "Super admins can insert assignments"
  on public.assignments for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own assignments" on public.assignments;
create policy "School admins can insert own assignments"
  on public.assignments for insert
  with check (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update assignments" on public.assignments;
create policy "Super admins can update assignments"
  on public.assignments for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own assignments" on public.assignments;
create policy "School admins can update own assignments"
  on public.assignments for update
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete assignments" on public.assignments;
create policy "Super admins can delete assignments"
  on public.assignments for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own assignments" on public.assignments;
create policy "School admins can delete own assignments"
  on public.assignments for delete
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 5. ASSIGNMENT SUBMISSIONS
-- ==============================================================
create table if not exists public.assignment_submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  file_url        text,
  file_type       text,
  submission_text text,
  marks           integer,
  remarks         text,
  status          text not null default 'submitted' check (status in ('submitted','reviewed','returned')),
  submitted_at    timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique(assignment_id, student_id)
);

create index if not exists idx_assignment_submissions_assign on public.assignment_submissions(assignment_id);
create index if not exists idx_assignment_submissions_student on public.assignment_submissions(student_id);

alter table public.assignment_submissions enable row level security;

drop policy if exists "Super admins can read submissions" on public.assignment_submissions;
create policy "Super admins can read submissions"
  on public.assignment_submissions for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own submissions" on public.assignment_submissions;
create policy "School admins can read own submissions"
  on public.assignment_submissions for select
  using (exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert submissions" on public.assignment_submissions;
create policy "Super admins can insert submissions"
  on public.assignment_submissions for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own submissions" on public.assignment_submissions;
create policy "School admins can insert own submissions"
  on public.assignment_submissions for insert
  with check (exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update submissions" on public.assignment_submissions;
create policy "Super admins can update submissions"
  on public.assignment_submissions for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own submissions" on public.assignment_submissions;
create policy "School admins can update own submissions"
  on public.assignment_submissions for update
  using (exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete submissions" on public.assignment_submissions;
create policy "Super admins can delete submissions"
  on public.assignment_submissions for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own submissions" on public.assignment_submissions;
create policy "School admins can delete own submissions"
  on public.assignment_submissions for delete
  using (exists (
    select 1 from public.assignments a
    join public.courses c on c.id = a.course_id
    where a.id = assignment_id and c.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 6. QUIZZES
-- ==============================================================
create table if not exists public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  title         text not null,
  description   text,
  time_limit    integer,
  passing_score integer not null default 50,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_quizzes_course on public.quizzes(course_id);

alter table public.quizzes enable row level security;

drop policy if exists "Super admins can read quizzes" on public.quizzes;
create policy "Super admins can read quizzes"
  on public.quizzes for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own quizzes" on public.quizzes;
create policy "School admins can read own quizzes"
  on public.quizzes for select
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert quizzes" on public.quizzes;
create policy "Super admins can insert quizzes"
  on public.quizzes for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own quizzes" on public.quizzes;
create policy "School admins can insert own quizzes"
  on public.quizzes for insert
  with check (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update quizzes" on public.quizzes;
create policy "Super admins can update quizzes"
  on public.quizzes for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own quizzes" on public.quizzes;
create policy "School admins can update own quizzes"
  on public.quizzes for update
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete quizzes" on public.quizzes;
create policy "Super admins can delete quizzes"
  on public.quizzes for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own quizzes" on public.quizzes;
create policy "School admins can delete own quizzes"
  on public.quizzes for delete
  using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 7. QUIZ QUESTIONS
-- ==============================================================
create table if not exists public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  question_type  text not null check (question_type in ('mcq','multiple_select','true_false','short_answer','essay')),
  question_text  text not null,
  options        jsonb,
  correct_answer jsonb,
  marks          integer not null default 1,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists idx_quiz_questions_quiz on public.quiz_questions(quiz_id);

alter table public.quiz_questions enable row level security;

drop policy if exists "Super admins can read questions" on public.quiz_questions;
create policy "Super admins can read questions"
  on public.quiz_questions for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own questions" on public.quiz_questions;
create policy "School admins can read own questions"
  on public.quiz_questions for select
  using (exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert questions" on public.quiz_questions;
create policy "Super admins can insert questions"
  on public.quiz_questions for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own questions" on public.quiz_questions;
create policy "School admins can insert own questions"
  on public.quiz_questions for insert
  with check (exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update questions" on public.quiz_questions;
create policy "Super admins can update questions"
  on public.quiz_questions for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own questions" on public.quiz_questions;
create policy "School admins can update own questions"
  on public.quiz_questions for update
  using (exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete questions" on public.quiz_questions;
create policy "Super admins can delete questions"
  on public.quiz_questions for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own questions" on public.quiz_questions;
create policy "School admins can delete own questions"
  on public.quiz_questions for delete
  using (exists (
    select 1 from public.quizzes q
    join public.courses c on c.id = q.course_id
    where q.id = quiz_id and c.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 8. QUIZ ATTEMPTS
-- ==============================================================
create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  score        integer,
  total_marks  integer not null default 0,
  percentage   numeric(5,2),
  passed       boolean not null default false,
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  status       text not null default 'in_progress' check (status in ('in_progress','completed'))
);

create index if not exists idx_quiz_attempts_quiz on public.quiz_attempts(quiz_id);
create index if not exists idx_quiz_attempts_student on public.quiz_attempts(student_id);

alter table public.quiz_attempts enable row level security;

drop policy if exists "Super admins can read attempts" on public.quiz_attempts;
create policy "Super admins can read attempts"
  on public.quiz_attempts for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own attempts" on public.quiz_attempts;
create policy "School admins can read own attempts"
  on public.quiz_attempts for select
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert attempts" on public.quiz_attempts;
create policy "Super admins can insert attempts"
  on public.quiz_attempts for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own attempts" on public.quiz_attempts;
create policy "School admins can insert own attempts"
  on public.quiz_attempts for insert
  with check (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update attempts" on public.quiz_attempts;
create policy "Super admins can update attempts"
  on public.quiz_attempts for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own attempts" on public.quiz_attempts;
create policy "School admins can update own attempts"
  on public.quiz_attempts for update
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete attempts" on public.quiz_attempts;
create policy "Super admins can delete attempts"
  on public.quiz_attempts for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own attempts" on public.quiz_attempts;
create policy "School admins can delete own attempts"
  on public.quiz_attempts for delete
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 9. QUIZ ANSWERS
-- ==============================================================
create table if not exists public.quiz_answers (
  id             uuid primary key default gen_random_uuid(),
  attempt_id     uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id    uuid not null references public.quiz_questions(id) on delete cascade,
  answer         jsonb,
  is_correct     boolean,
  marks_obtained numeric(5,2),
  created_at     timestamptz not null default now(),
  unique(attempt_id, question_id)
);

create index if not exists idx_quiz_answers_attempt on public.quiz_answers(attempt_id);

alter table public.quiz_answers enable row level security;

drop policy if exists "Super admins can read answers" on public.quiz_answers;
create policy "Super admins can read answers"
  on public.quiz_answers for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own answers" on public.quiz_answers;
create policy "School admins can read own answers"
  on public.quiz_answers for select
  using (exists (
    select 1 from public.quiz_attempts qa
    join public.students s on s.id = qa.student_id
    where qa.id = attempt_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert answers" on public.quiz_answers;
create policy "Super admins can insert answers"
  on public.quiz_answers for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own answers" on public.quiz_answers;
create policy "School admins can insert own answers"
  on public.quiz_answers for insert
  with check (exists (
    select 1 from public.quiz_attempts qa
    join public.students s on s.id = qa.student_id
    where qa.id = attempt_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update answers" on public.quiz_answers;
create policy "Super admins can update answers"
  on public.quiz_answers for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own answers" on public.quiz_answers;
create policy "School admins can update own answers"
  on public.quiz_answers for update
  using (exists (
    select 1 from public.quiz_attempts qa
    join public.students s on s.id = qa.student_id
    where qa.id = attempt_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete answers" on public.quiz_answers;
create policy "Super admins can delete answers"
  on public.quiz_answers for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own answers" on public.quiz_answers;
create policy "School admins can delete own answers"
  on public.quiz_answers for delete
  using (exists (
    select 1 from public.quiz_attempts qa
    join public.students s on s.id = qa.student_id
    where qa.id = attempt_id and s.school_id = public.get_user_school_id()
  ));

-- ==============================================================
-- 10. CERTIFICATES
-- ==============================================================
create table if not exists public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.students(id) on delete cascade,
  course_id          uuid not null references public.courses(id) on delete cascade,
  certificate_number text not null unique,
  issued_at          timestamptz not null default now(),
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  unique(student_id, course_id)
);

create index if not exists idx_certificates_student on public.certificates(student_id);
create index if not exists idx_certificates_course on public.certificates(course_id);

alter table public.certificates enable row level security;

drop policy if exists "Super admins can read certificates" on public.certificates;
create policy "Super admins can read certificates"
  on public.certificates for select
  using (public.is_super_admin());

drop policy if exists "School admins can read own certificates" on public.certificates;
create policy "School admins can read own certificates"
  on public.certificates for select
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can insert certificates" on public.certificates;
create policy "Super admins can insert certificates"
  on public.certificates for insert
  with check (public.is_super_admin());

drop policy if exists "School admins can insert own certificates" on public.certificates;
create policy "School admins can insert own certificates"
  on public.certificates for insert
  with check (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can update certificates" on public.certificates;
create policy "Super admins can update certificates"
  on public.certificates for update
  using (public.is_super_admin());

drop policy if exists "School admins can update own certificates" on public.certificates;
create policy "School admins can update own certificates"
  on public.certificates for update
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));

drop policy if exists "Super admins can delete certificates" on public.certificates;
create policy "Super admins can delete certificates"
  on public.certificates for delete
  using (public.is_super_admin());

drop policy if exists "School admins can delete own certificates" on public.certificates;
create policy "School admins can delete own certificates"
  on public.certificates for delete
  using (exists (
    select 1 from public.students s
    where s.id = student_id and s.school_id = public.get_user_school_id()
  ));
