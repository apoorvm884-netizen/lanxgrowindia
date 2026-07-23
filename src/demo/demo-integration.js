// TEMP DEMO MODE
// REMOVE BEFORE PRODUCTION
// ============================================================
// Demo Mode Integration
// ============================================================
// This is the ONLY file that touches window globals.
// It patches AuthService, AppStorage, and all data services
// to return demo data instead of calling Supabase.
//
// When DEMO_MODE is false, this file is a no-op.
// Delete this file + the import from main.js to remove demo.
// ============================================================

import { DEMO_MODE } from './demo-config.js';
import { DemoAuth } from './demo-auth.js';
import { buildDemoData } from './demo-data.js';
import {
  SCHOOLS, CATEGORIES, SUBJECTS, SECTIONS, CONTENT,
  STUDENTS, COURSES, COURSE_SECTIONS, ENROLLMENTS,
  NOTIFICATIONS, COUNSELORS, USERS, AUDIT_LOG, newDemoId,
  ACTIVITY_LOG, COURSE_MODULES, LESSONS, ASSIGNMENTS, QUIZZES,
  QUIZ_QUESTIONS, PROGRESS, CERTIFICATES,
} from './demo-data.js';
import { renderSchoolIntelligence } from './demo-analytics.js';

const demoIntegration = { DEMO_MODE: false };

if (DEMO_MODE) {
  const w = window;
  const eh = w.AppUtils.escapeHtml;
  // ==============================================================
  // DEMO-DASHBOARD RENDERERS
  // ==============================================================
  function renderCounselorDashboard(container, profile) {
    if (!container) return;
    profile = profile || null;
    const counselorId = profile ? profile.id : 'demo-counselor-1';
    const schoolId = profile ? profile.school_id : 'school-1';
    const school = SCHOOLS.find((s) => s.id === schoolId);
    const counselor = COUNSELORS.find((c) => c.id === counselorId);

    const myStudents = STUDENTS.filter((s) => s.counselor_id === counselorId);
    const myEnrollments = ENROLLMENTS.filter((e) =>
      myStudents.some((s) => s.id === e.student_id)
    );
    const completedCount = myEnrollments.filter((e) => e.status === 'completed').length;
    const inProgressCount = myEnrollments.filter((e) => e.status === 'in_progress' || e.status === 'active').length;
    const activeStudents = myStudents.filter((s) => s.status === 'active').length;
    const totalCourses = [...new Set(myEnrollments.map((e) => e.course_id))].length;
    const assignedCatNames = (counselor?.assigned_categories || []).map(id => { const c = CATEGORIES.find(cat => cat.id === id); return c ? c.name : id; });
    const assignedSubjNames = (counselor?.assigned_subjects || []).map(id => { const s = SUBJECTS.find(sub => sub.id === id); return s ? s.name : id; });
    const myActivities = ACTIVITY_LOG.filter(a => a.counselor_id === counselorId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);
    const myNotifs = NOTIFICATIONS.filter(n => n.user_id === counselorId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
    const pendingAssignments = myEnrollments.filter(e => e.status === 'not_started').length;
    const avgProgress = myStudents.length ? Math.round(myStudents.reduce((sum, s) => sum + (s.progress || 0), 0) / myStudents.length) : 0;

    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">Counselor Dashboard</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${eh(profile?.name || 'Counselor')} · ${eh(school?.name || 'School')} · ${eh(counselor?.department || '')}</p>

        <div class="metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px;">
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Assigned Students</div>
            <div style="font-size:32px;font-weight:700;">${activeStudents}</div>
          </div>
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Assigned Courses</div>
            <div style="font-size:32px;font-weight:700;">${totalCourses}</div>
          </div>
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Completed</div>
            <div style="font-size:32px;font-weight:700;color:var(--success);">${completedCount}</div>
          </div>
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">In Progress</div>
            <div style="font-size:32px;font-weight:700;color:var(--primary);">${inProgressCount}</div>
          </div>
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Pending</div>
            <div style="font-size:32px;font-weight:700;color:var(--warning);">${pendingAssignments}</div>
          </div>
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Avg Progress</div>
            <div style="font-size:32px;font-weight:700;color:var(--info);">${avgProgress}%</div>
          </div>
        </div>

        ${assignedCatNames.length > 0 || assignedSubjNames.length > 0 ? `
        <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
          <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:200px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Assigned Categories</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${assignedCatNames.map(n => `<span style="padding:3px 10px;background:var(--primary)12;color:var(--primary);border-radius:12px;font-size:12px;">${eh(n)}</span>`).join('')}</div>
          </div>
          <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px 20px;flex:1;min-width:200px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Assigned Subjects</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">${assignedSubjNames.map(n => `<span style="padding:3px 10px;background:#f0fdf4;color:#16a34a;border-radius:12px;font-size:12px;">${eh(n)}</span>`).join('')}</div>
          </div>
        </div>` : ''}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">Assigned Students</h3>
            ${myStudents.length === 0
              ? '<p style="color:var(--text-secondary);">No students assigned yet.</p>'
              : `<div class="table-container" style="overflow-x:auto;">
                  <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead><tr style="border-bottom:1px solid var(--border);">
                      <th style="text-align:left;padding:8px 12px;font-weight:600;">Name</th>
                      <th style="text-align:left;padding:8px 12px;font-weight:600;">Class</th>
                      <th style="text-align:left;padding:8px 12px;font-weight:600;">Section</th>
                      <th style="text-align:left;padding:8px 12px;font-weight:600;">Progress</th>
                      <th style="text-align:left;padding:8px 12px;font-weight:600;">Status</th>
                    </tr></thead>
                    <tbody>${myStudents.map((s) => `
                      <tr style="border-bottom:1px solid var(--border-light);">
                        <td style="padding:8px 12px;"><div style="display:flex;align-items:center;gap:6px;"><div style="width:24px;height:24px;border-radius:50%;background:var(--primary)12;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:var(--primary);">${(s.name || '?').charAt(0).toUpperCase()}</div>${eh(s.name)}</div></td>
                        <td style="padding:8px 12px;color:var(--text-secondary);">${eh(s.class)}</td>
                        <td style="padding:8px 12px;color:var(--text-secondary);">${eh(s.section || '—')}</td>
                        <td style="padding:8px 12px;">
                          <div style="display:flex;align-items:center;gap:8px;">
                            <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
                              <div style="width:${s.progress}%;height:100%;background:${s.progress > 70 ? 'var(--success)' : s.progress > 40 ? 'var(--warning)' : 'var(--danger)'};border-radius:3px;"></div>
                            </div>
                            <span style="font-size:12px;color:var(--text-secondary);">${s.progress}%</span>
                          </div>
                        </td>
                        <td style="padding:8px 12px;"><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${s.status === 'active' ? '#e6f7e6' : '#fff3e0'};color:${s.status === 'active' ? '#2e7d32' : '#f57c00'};">${eh(s.status)}</span></td>
                      </tr>`).join('')}</tbody>
                  </table>
                </div>`}
          </div>

          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">Notifications</h3>
              ${myNotifs.length === 0 ? '<div style="font-size:13px;color:var(--text-secondary);">No notifications.</div>'
              : `<div style="display:flex;flex-direction:column;gap:8px;">${myNotifs.map(n => `
                <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);${!n.is_read ? 'font-weight:500;' : ''}">
                  <span class="material-symbols-outlined" style="font-size:16px;color:${!n.is_read ? 'var(--primary)' : 'var(--text-muted)'};">${!n.is_read ? 'notifications_active' : 'notifications'}</span>
                  <div style="flex:1;font-size:12px;">${eh(n.title)}<br><span style="color:var(--text-muted);font-size:11px;">${eh(n.message || '')}</span></div>
                </div>`).join('')}</div>`}
            </div>

            <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">Recent Activity</h3>
              ${myActivities.length === 0 ? '<div style="font-size:13px;color:var(--text-secondary);">No recent activity.</div>'
              : `<div style="display:flex;flex-direction:column;gap:6px;">${myActivities.map(a => `
                <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-light);font-size:12px;">
                  <span class="material-symbols-outlined" style="font-size:14px;color:var(--primary);">${a.action === 'counseling_session' ? 'support' : a.action === 'progress_review' ? 'trending_up' : a.action === 'course_recommendation' ? 'school' : 'circle'}</span>
                  <span style="flex:1;color:var(--text-secondary);">${eh(a.description)}</span>
                  <span style="font-size:10px;color:var(--text-muted);">${new Date(a.timestamp).toLocaleDateString()}</span>
                </div>`).join('')}</div>`}
            </div>
          </div>
        </div>
      </div>`;
    window.initIcons?.();
  }

  function renderStudentDashboard(container, profile) {
    if (!container) return;
    profile = profile || null;
    const studentId = profile ? profile.id : 'demo-student-1';
    const schoolId = (profile && profile.school_id) || 'school-1';
    const school = SCHOOLS.find((s) => s.id === schoolId);
    const student = STUDENTS.find((s) => s.id === studentId);
    const myEnrollments = ENROLLMENTS.filter((e) => e.student_id === studentId);
    const completedCount = myEnrollments.filter((e) => e.status === 'completed').length;
    const inProgressCount = myEnrollments.filter((e) => e.status === 'in_progress' || e.status === 'active' || e.status === 'not_started').length;
    const myCertificates = CERTIFICATES.filter(c => c.student_id === studentId);
    const myProgress = PROGRESS.filter(p => p.student_id === studentId);
    const completedLessons = myProgress.filter(p => p.completed).length;
    const continueLearningLessons = myProgress.filter(p => !p.completed && p.resume_position > 0).slice(0, 3);
    const upcomingAssignments = ASSIGNMENTS.filter(a => {
      const mod = COURSE_MODULES.find(m => m.id === LESSONS.find(l => l.id === a.id)?.module_id);
      return mod && myEnrollments.some(e => e.course_id === mod.course_id);
    }).slice(0, 3);
    const mySchoolNotifs = NOTIFICATIONS.filter(n => n.user_id === studentId).slice(0, 4);

    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">Student Dashboard</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${eh(student?.name || profile?.name || 'Student')} · ${eh(school?.name || 'School')} · ${eh(student?.class || '')}</p>

        <div class="metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
          <div class="metric-card" style="padding:14px;"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">Enrolled</div><div style="font-size:24px;font-weight:700;">${myEnrollments.length}</div></div>
          <div class="metric-card" style="padding:14px;"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">Completed</div><div style="font-size:24px;font-weight:700;color:var(--success);">${completedCount}</div></div>
          <div class="metric-card" style="padding:14px;"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">Lessons Done</div><div style="font-size:24px;font-weight:700;color:var(--primary);">${completedLessons}</div></div>
          <div class="metric-card" style="padding:14px;"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">Certificates</div><div style="font-size:24px;font-weight:700;color:#f59e0b;">${myCertificates.length}</div></div>
          <div class="metric-card" style="padding:14px;"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">Progress</div><div style="font-size:24px;font-weight:700;">${student?.progress || 0}%</div></div>
          <div class="metric-card" style="padding:14px;"><div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">Attendance</div><div style="font-size:24px;font-weight:700;">${student?.attendance || 0}%</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="card" style="padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">Continue Learning</h3>
              <button class="btn btn-ghost btn-sm" style="font-size:10px;height:24px;" data-action="navigate" data-route="student-courses">View All</button>
            </div>
            ${continueLearningLessons.length === 0 ? '<div style="font-size:12px;color:var(--text-secondary);padding:8px 0;">No lessons in progress. Start a course!</div>'
            : continueLearningLessons.map(p => {
              const lesson = LESSONS.find(l => l.id === p.lesson_id);
              const module = lesson ? COURSE_MODULES.find(m => m.id === lesson.module_id) : null;
              const course = module ? COURSES.find(c => c.id === module.course_id) : null;
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);cursor:pointer;" data-action="sp-open-lesson" data-student-id="${studentId}" data-lesson-id="${p.lesson_id}">
                <span class="material-symbols-outlined" style="font-size:16px;color:#3b82f6;">play_circle</span>
                <div style="flex:1;font-size:12px;"><span style="font-weight:500;">${eh(lesson?.title || 'Lesson')}</span>${course ? `<br><span style="color:var(--text-muted);font-size:10px;">${eh(course.name)}</span>` : ''}</div>
                <span style="font-size:10px;color:var(--text-muted);">${Math.floor(p.resume_position / 60)}m in</span>
              </div>`;
            }).join('')}
          </div>

          <div class="card" style="padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">Courses</h3>
            </div>
            ${myEnrollments.length === 0 ? '<div style="font-size:12px;color:var(--text-secondary);padding:8px 0;">No courses assigned yet.</div>'
            : myEnrollments.slice(0, 4).map(e => {
              const course = COURSES.find(c => c.id === e.course_id);
              const mods = COURSE_MODULES.filter(m => m.course_id === e.course_id);
              const modIds = mods.map(m => m.id);
              const courseLessons = LESSONS.filter(l => modIds.includes(l.module_id));
              const done = myProgress.filter(p => p.completed && courseLessons.some(l => l.id === p.lesson_id)).length;
              const pct = courseLessons.length ? Math.round(done / courseLessons.length * 100) : 0;
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);cursor:pointer;" data-action="sp-open-course-player" data-student-id="${studentId}" data-course-id="${course?.id}">
                <div style="width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;">${course ? AppUtils.getInitials(course.name) : '?'}</div>
                <div style="flex:1;font-size:12px;"><span style="font-weight:500;">${eh(course?.name || '')}</span><br><span style="color:var(--text-muted);font-size:10px;">${done}/${courseLessons.length} lessons</span></div>
                <span style="font-size:11px;font-weight:600;color:${pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#6b7280'};">${pct}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="card" style="padding:16px;">
            <h3 style="margin:0 0 10px;font-size:14px;font-weight:600;">Upcoming Deadlines</h3>
            ${upcomingAssignments.length === 0 ? '<div style="font-size:12px;color:var(--text-secondary);padding:8px 0;">No upcoming deadlines.</div>'
            : upcomingAssignments.map(a => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:12px;">
              <span class="material-symbols-outlined" style="font-size:16px;color:#f59e0b;">schedule</span>
              <span style="flex:1;">${eh(a.title)}</span>
              <span style="color:var(--text-muted);font-size:10px;">Due ${new Date(a.due_date).toLocaleDateString()}</span>
            </div>`).join('')}
          </div>

          <div class="card" style="padding:16px;">
            <h3 style="margin:0 0 10px;font-size:14px;font-weight:600;">Certificates</h3>
            ${myCertificates.length === 0 ? '<div style="font-size:12px;color:var(--text-secondary);padding:8px 0;">Complete a course to earn your first certificate!</div>'
            : myCertificates.map(cert => {
              const course = COURSES.find(c => c.id === cert.course_id);
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);cursor:pointer;font-size:12px;" data-action="sp-view-certificate" data-student-id="${studentId}" data-course-id="${cert.course_id}">
                <span class="material-symbols-outlined" style="font-size:16px;color:#f59e0b;">workspace_premium</span>
                <span style="flex:1;font-weight:500;">${eh(course?.name || '')} — <span style="font-weight:400;color:var(--text-secondary);">${eh(cert.certificate_number)}</span></span>
                <span style="color:var(--text-muted);font-size:10px;">View</span>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="card" style="padding:16px;">
          <h3 style="margin:0 0 10px;font-size:14px;font-weight:600;">Notifications</h3>
          ${mySchoolNotifs.length === 0 ? '<div style="font-size:12px;color:var(--text-secondary);">No notifications.</div>'
          : mySchoolNotifs.map(n => `
            <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:12px;${!n.is_read ? 'font-weight:600;' : ''}">
              <span class="material-symbols-outlined" style="font-size:16px;color:${!n.is_read ? 'var(--primary)' : 'var(--text-muted)'};">${!n.is_read ? 'notifications_active' : 'notifications'}</span>
              <div style="flex:1;">${eh(n.title)}<br><span style="color:var(--text-muted);font-size:10px;">${eh(n.message)}</span></div>
            </div>`).join('')}
        </div>
      </div>`;
    window.initIcons?.();
  }

  function renderStudentCourses(container, profile) {
    if (!container) return;
    profile = profile || null;
    const studentId = profile ? profile.id : 'demo-student-1';
    const schoolId = (profile && profile.school_id) || 'school-1';
    const school = SCHOOLS.find(s => s.id === schoolId);
    const student = STUDENTS.find(s => s.id === studentId);
    const myEnrollments = ENROLLMENTS.filter(e => e.student_id === studentId);
    const completedCount = myEnrollments.filter(e => e.status === 'completed').length;
    const inProgressCount = myEnrollments.filter(e => e.status === 'in_progress' || e.status === 'active').length;

    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">My Courses</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${eh(student?.name || 'Student')} · ${eh(school?.name || '')}</p>
        <div class="metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
          <div class="metric-card" style="padding:20px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Total Enrolled</div><div style="font-size:32px;font-weight:700;">${myEnrollments.length}</div></div>
          <div class="metric-card" style="padding:20px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Completed</div><div style="font-size:32px;font-weight:700;color:var(--success);">${completedCount}</div></div>
          <div class="metric-card" style="padding:20px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">In Progress</div><div style="font-size:32px;font-weight:700;color:var(--primary);">${inProgressCount}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">${myEnrollments.map(e => {
          const course = COURSES.find(c => c.id === e.course_id);
          if (!course) return '';
          const category = CATEGORIES.find(c => c.id === course.category_id);
          const subject = SUBJECTS.find(s => s.id === course.subject_id);
          const progress = student?.progress || 0;
          const statusColors = { completed: '#10b981', active: '#3b82f6', not_started: '#9ca3af' };
          const bgColors = { completed: '#f0fdf4', active: '#eff6ff', not_started: '#f5f5f5' };
          return `<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;" data-action="sp-open-course-player" data-student-id="${studentId}" data-course-id="${course.id}">
            <div style="height:100px;background:linear-gradient(135deg,${course.difficulty === 'beginner' ? '#059669,#34d399' : course.difficulty === 'advanced' ? '#dc2626,#f87171' : '#d97706,#fbbf24'});display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px;color:#fff;font-weight:700;">${AppUtils.getInitials(course.name)}</span>
            </div>
            <div style="padding:14px;">
              <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${eh(course.name)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">${eh(course.description || '').slice(0, 60)}${(course.description || '').length > 60 ? '...' : ''}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${bgColors[e.status]};color:${statusColors[e.status] || '#6b7280'};font-weight:500;">${e.status.replace('_', ' ')}</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#f5f3ff;color:#7c3aed;">${eh(course.difficulty || 'intermediate')}</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:10px;background:#f0fdf4;color:#059669;">${eh(course.estimated_duration || '')}</span>
              </div>
              <div><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;"><span>Progress</span><span>${progress}%</span></div>
              <div style="height:5px;background:var(--border);border-radius:3px;overflow:hidden;"><div style="width:${progress}%;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:3px;"></div></div></div>
              ${category || subject ? `<div style="font-size:10px;color:var(--text-muted);margin-top:6px;">${category ? eh(category.name) : ''}${subject ? ' > ' + eh(subject.name) : ''}</div>` : ''}
            </div>
          </div>`;
        }).join('')}</div>
      </div>`;
    window.initIcons?.();
  }

  function renderStudentVideos(container, profile) {
    if (!container) return;
    const schoolId = (profile && profile.school_id) || 'school-1';
    const schoolVideos = CONTENT.filter(c => c.school_id === schoolId);
    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">Video Library</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${schoolVideos.length} video(s) available</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;">${schoolVideos.map(v => `
          <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:pointer;" data-action="play-video" data-id="${v.id}">
            <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#1e3a8a,#3b82f6);display:flex;align-items:center;justify-content:center;">
              <span class="material-symbols-outlined" style="font-size:40px;color:rgba(255,255,255,0.8);">play_circle</span>
            </div>
            <div style="padding:12px;">
              <div style="font-size:13px;font-weight:600;">${eh(v.name)}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${eh(v.duration)}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
    window.initIcons?.();
  }

  function renderStudentProgress(container, profile) {
    if (!container) return;
    const studentId = profile ? profile.id : 'demo-student-1';
    const student = STUDENTS.find(s => s.id === studentId);
    const myEnrollments = ENROLLMENTS.filter(e => e.student_id === studentId);
    const completedCount = myEnrollments.filter(e => e.status === 'completed').length;
    const overallProgress = student?.progress || 0;
    const completedLessons = PROGRESS.filter(p => p.student_id === studentId && p.completed).length;
    const totalLessons = LESSONS.length;

    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">My Progress</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${eh(student?.name || 'Student')}</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
          <div class="metric-card" style="padding:20px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Overall Progress</div><div style="font-size:28px;font-weight:700;color:var(--primary);">${overallProgress}%</div></div>
          <div class="metric-card" style="padding:20px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Lessons Completed</div><div style="font-size:28px;font-weight:700;color:var(--success);">${completedLessons}/${totalLessons}</div></div>
          <div class="metric-card" style="padding:20px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Courses Completed</div><div style="font-size:28px;font-weight:700;color:var(--success);">${completedCount}/${myEnrollments.length}</div></div>
          <div class="metric-card" style="padding:20px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Attendance</div><div style="font-size:28px;font-weight:700;">${student?.attendance || 0}%</div></div>
        </div>
        <div style="height:12px;background:var(--border);border-radius:6px;overflow:hidden;margin-bottom:24px;">
          <div style="width:${overallProgress}%;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:6px;transition:width 0.5s;"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="card" style="padding:20px;">
            <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;">Course Progress</h3>
            ${myEnrollments.length === 0 ? '<p style="color:var(--text-secondary);font-size:13px;">No courses enrolled.</p>'
            : myEnrollments.map(e => {
              const course = COURSES.find(c => c.id === e.course_id);
              const mods = COURSE_MODULES.filter(m => m.course_id === e.course_id);
              const modIds = mods.map(m => m.id);
              const courseLessons = LESSONS.filter(l => modIds.includes(l.module_id));
              const done = PROGRESS.filter(p => p.student_id === studentId && courseLessons.some(l => l.id === p.lesson_id) && p.completed).length;
              const pct = courseLessons.length ? Math.round(done / courseLessons.length * 100) : 0;
              return `<div style="margin-bottom:12px;padding:10px;border:1px solid var(--border-light);border-radius:8px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;"><span style="font-weight:500;">${eh(course?.name || '')}</span><span>${done}/${courseLessons.length} (${pct}%)</span></div>
                <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#3b82f6'};border-radius:3px;"></div></div>
              </div>`;
            }).join('')}
          </div>
          <div class="card" style="padding:20px;">
            <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;">Recent Activity</h3>
            ${PROGRESS.filter(p => p.student_id === studentId).slice(0, 10).map(p => {
              const lesson = LESSONS.find(l => l.id === p.lesson_id);
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:12px;">
                <span class="material-symbols-outlined" style="font-size:14px;color:${p.completed ? '#10b981' : '#3b82f6'};">${p.completed ? 'check_circle' : 'radio_button_unchecked'}</span>
                <span style="flex:1;">${eh(lesson?.title || 'Unknown lesson')}</span>
                <span style="color:var(--text-muted);font-size:10px;">${AppUtils.timeAgo(p.last_activity)}</span>
              </div>`;
            }).join('') || '<div style="font-size:13px;color:var(--text-secondary);">No activity yet.</div>'}
          </div>
        </div>
      </div>`;
    window.initIcons?.();
  }

  function renderStudentNotificationsPage(container, profile) {
    if (!container) return;
    const allNotifs = NOTIFICATIONS.filter(n => n.user_id === (profile?.id || 'demo-student-1')).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">Notifications</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${allNotifs.filter(n => !n.is_read).length} unread</p>
        ${allNotifs.length === 0 ? '<div class="card" style="padding:30px;text-align:center;color:var(--text-secondary);">No notifications.</div>'
        : `<div style="display:flex;flex-direction:column;gap:8px;">${allNotifs.map(n => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--border);border-radius:8px;${!n.is_read ? 'background:var(--primary)06;border-color:var(--primary)20;' : ''}">
            <span class="material-symbols-outlined" style="font-size:20px;color:${!n.is_read ? 'var(--primary)' : 'var(--text-muted)'};">${!n.is_read ? 'notifications_active' : 'notifications'}</span>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:${!n.is_read ? '600' : '400'};">${eh(n.title)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${eh(n.message)}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${AppUtils.timeAgo(n.created_at)}</div>
            </div>
          </div>`).join('')}</div>`}
      </div>`;
    window.initIcons?.();
  }

  function renderStudentProfile(container, profile) {
    if (!container) return;
    const student = STUDENTS.find(s => s.id === (profile?.id || 'demo-student-1'));
    const school = SCHOOLS.find(s => s.id === (student?.school_id || 'school-1'));
    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">My Profile</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">Manage your personal information</p>
        <div class="card" style="padding:24px;max-width:600px;">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;">${AppUtils.getInitials(student?.name || '')}</div>
            <div><div style="font-size:18px;font-weight:600;">${eh(student?.name || '')}</div><div style="font-size:13px;color:var(--text-secondary);">${eh(student?.email || '')}</div></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);"><span style="color:var(--text-secondary);">Class</span><br><span style="font-weight:500;">${eh(student?.class || '—')}</span></div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);"><span style="color:var(--text-secondary);">Section</span><br><span style="font-weight:500;">${eh(student?.section || '—')}</span></div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);"><span style="color:var(--text-secondary);">Admission No</span><br><span style="font-weight:500;">${eh(student?.admission_no || '—')}</span></div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);"><span style="color:var(--text-secondary);">School</span><br><span style="font-weight:500;">${eh(school?.name || '—')}</span></div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);"><span style="color:var(--text-secondary);">DOB</span><br><span style="font-weight:500;">${eh(student?.dob || '—')}</span></div>
            <div style="padding:8px 0;border-bottom:1px solid var(--border-light);"><span style="color:var(--text-secondary);">Guardian</span><br><span style="font-weight:500;">${eh(student?.parent_name || '—')}</span></div>
          </div>
        </div>
      </div>`;
    window.initIcons?.();
  }

  // ==============================================================
  // SERVICE PATCHING
  // ==============================================================
  function patchServices() {
    const w = window;

    // --- Patch AuthService ---
    if (w.AuthService) {
      // Store a reference to get current profile for dashboards
      DemoAuth._getProfile = () => {
        // Async getProfile but we need sync for demo dashboards
        let p = null;
        DemoAuth.getProfile().then((r) => { p = r; });
        // Try to get it synchronously from the internal variable
        return p;
      };
      // Monkey-patch: we need getProfile to work synchronously for dashboards
      let _lastProfile = null;
      const origGetProfile = DemoAuth.getProfile;
      DemoAuth.getProfile = async () => {
        const p = await origGetProfile.call(DemoAuth);
        _lastProfile = p;
        return p;
      };
      DemoAuth._getProfile = () => _lastProfile;

      // After patching, also listen for sign-in to update _lastProfile
      DemoAuth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          DemoAuth.getProfile().then((p) => { _lastProfile = p; });
        }
      });

      Object.assign(w.AuthService, DemoAuth);
      // Override the prototype methods if any
      w.AuthService.signInWithEmail = DemoAuth.signInWithEmail.bind(DemoAuth);
      w.AuthService.signInWithGoogle = DemoAuth.signInWithGoogle.bind(DemoAuth);
      w.AuthService.signOut = DemoAuth.signOut.bind(DemoAuth);
      w.AuthService.getSession = DemoAuth.getSession.bind(DemoAuth);
      w.AuthService.getUser = DemoAuth.getUser.bind(DemoAuth);
      w.AuthService.getProfile = DemoAuth.getProfile.bind(DemoAuth);
      w.AuthService.onAuthStateChange = DemoAuth.onAuthStateChange.bind(DemoAuth);
      w.DemoAuth = DemoAuth;
    }

    // --- Patch AppStorage.load() to return demo data ---
    if (w.AppStorage) {
      const origLoad = w.AppStorage.load;
      w.AppStorage.load = async () => {
        return buildDemoData();
      };
    }

    // --- Patch SchoolService ---
    if (w.SchoolService) {
      w.SchoolService.getAll = async () => [...SCHOOLS];
      w.SchoolService.getById = async (id) => SCHOOLS.find((s) => s.id === id);
      w.SchoolService.create = async (data) => {
        const now = new Date().toISOString();
        const s = { id: newDemoId('school'), ...data, status: data.status || 'active', created_at: now, updated_at: now, drive_folder_id: null };
        SCHOOLS.push(s);
        return s;
      };
      w.SchoolService.update = async (id, updates) => {
        const idx = SCHOOLS.findIndex((s) => s.id === id);
        if (idx >= 0) { Object.assign(SCHOOLS[idx], updates, { updated_at: new Date().toISOString() }); return SCHOOLS[idx]; }
        throw new Error('School not found');
      };
      w.SchoolService.delete = async (id) => {
        const idx = SCHOOLS.findIndex((s) => s.id === id);
        if (idx >= 0) SCHOOLS.splice(idx, 1);
      };
    }

    // --- Patch CategoryService ---
    if (w.CategoryService) {
      w.CategoryService.getBySchool = async (schoolId) => CATEGORIES.filter((c) => c.school_id === schoolId);
      w.CategoryService.getById = async (id) => CATEGORIES.find((c) => c.id === id);
      w.CategoryService.create = async (data) => {
        const c = { id: newDemoId('cat'), ...data, created_at: new Date().toISOString(), drive_folder_id: null };
        CATEGORIES.push(c);
        return c;
      };
      w.CategoryService.update = async (id, updates) => {
        const idx = CATEGORIES.findIndex((c) => c.id === id);
        if (idx >= 0) { Object.assign(CATEGORIES[idx], updates); return CATEGORIES[idx]; }
        throw new Error('Category not found');
      };
      w.CategoryService.delete = async (id) => {
        const idx = CATEGORIES.findIndex((c) => c.id === id);
        if (idx >= 0) CATEGORIES.splice(idx, 1);
      };
    }

    // --- Patch SubjectService ---
    if (w.SubjectService) {
      w.SubjectService.getBySchool = async (schoolId) => SUBJECTS.filter((s) => s.school_id === schoolId);
      w.SubjectService.getByCategory = async (categoryId) => SUBJECTS.filter((s) => s.category_id === categoryId);
      w.SubjectService.getById = async (id) => SUBJECTS.find((s) => s.id === id);
      w.SubjectService.create = async (data) => {
        const s = { id: newDemoId('sub'), ...data, created_at: new Date().toISOString(), drive_folder_id: null };
        SUBJECTS.push(s);
        return s;
      };
      w.SubjectService.update = async (id, updates) => {
        const idx = SUBJECTS.findIndex((s) => s.id === id);
        if (idx >= 0) { Object.assign(SUBJECTS[idx], updates); return SUBJECTS[idx]; }
        throw new Error('Subject not found');
      };
      w.SubjectService.delete = async (id) => {
        const idx = SUBJECTS.findIndex((s) => s.id === id);
        if (idx >= 0) SUBJECTS.splice(idx, 1);
      };
    }

    // --- Patch SectionService ---
    if (w.SectionService) {
      w.SectionService.getBySchool = async (schoolId) => SECTIONS.filter((s) => s.school_id === schoolId);
      w.SectionService.getBySubject = async (subjectId) => SECTIONS.filter((s) => s.subject_id === subjectId);
      w.SectionService.getById = async (id) => SECTIONS.find((s) => s.id === id);
      w.SectionService.create = async (data) => {
        const s = { id: newDemoId('sec'), ...data, created_at: new Date().toISOString(), drive_folder_id: null };
        SECTIONS.push(s);
        return s;
      };
      w.SectionService.update = async (id, updates) => {
        const idx = SECTIONS.findIndex((s) => s.id === id);
        if (idx >= 0) { Object.assign(SECTIONS[idx], updates); return SECTIONS[idx]; }
        throw new Error('Section not found');
      };
      w.SectionService.delete = async (id) => {
        const idx = SECTIONS.findIndex((s) => s.id === id);
        if (idx >= 0) SECTIONS.splice(idx, 1);
      };
    }

    // --- Patch ContentService ---
    if (w.ContentService) {
      w.ContentService.getAll = async () => [...CONTENT];
      w.ContentService.getBySchool = async (schoolId) => CONTENT.filter((c) => c.school_id === schoolId);
      w.ContentService.getBySection = async (sectionId) => CONTENT.filter((c) => c.section_id === sectionId);
      w.ContentService.getById = async (id) => CONTENT.find((c) => c.id === id);
      w.ContentService.create = async (data) => {
        const c = { id: newDemoId('vid'), ...data, status: data.status || 'active', created_at: new Date().toISOString(), thumbnail: null, type: data.type || 'Video' };
        CONTENT.push(c);
        return c;
      };
      w.ContentService.update = async (id, updates) => {
        const idx = CONTENT.findIndex((c) => c.id === id);
        if (idx >= 0) { Object.assign(CONTENT[idx], updates); return CONTENT[idx]; }
        throw new Error('Content not found');
      };
      w.ContentService.delete = async (id) => {
        const idx = CONTENT.findIndex((c) => c.id === id);
        if (idx >= 0) CONTENT.splice(idx, 1);
      };
    }

    // --- Patch StudentService ---
    if (w.StudentService) {
      w.StudentService.getBySchool = async (schoolId) => STUDENTS.filter((s) => s.school_id === schoolId);
      w.StudentService.getByCounselor = async (counselorId) => STUDENTS.filter((s) => s.counselor_id === counselorId);
      w.StudentService.getById = async (id) => STUDENTS.find((s) => s.id === id);
      w.StudentService.create = async (data) => {
        const s = { id: newDemoId('student'), name: data.name, email: data.email || null, school_id: data.schoolId, counselor_id: data.counselorId || null, status: data.status || 'active', class: data.class || null, section: data.section || null, dob: data.dob || null, gender: data.gender || null, admission_no: data.admissionNo || null, parent_name: data.parentName || null, parent_contact: data.parentContact || null, academic_year: data.academicYear || null, notes: data.notes || null, assigned_categories: data.assignedCategories || [], assigned_subjects: data.assignedSubjects || [], attendance: 100, progress: 0, created_at: new Date().toISOString(), avatar_url: null };
        STUDENTS.push(s);
        return s;
      };
      w.StudentService.update = async (id, updates) => {
        const idx = STUDENTS.findIndex((s) => s.id === id);
        if (idx >= 0) { Object.assign(STUDENTS[idx], updates); return STUDENTS[idx]; }
        throw new Error('Student not found');
      };
      w.StudentService.delete = async (id) => {
        const idx = STUDENTS.findIndex((s) => s.id === id);
        if (idx >= 0) STUDENTS.splice(idx, 1);
      };
    }

    // --- Patch CounselorService ---
    if (w.CounselorService) {
      w.CounselorService.getBySchool = async (schoolId) => COUNSELORS.filter((c) => c.school_id === schoolId);
      w.CounselorService.getById = async (id) => COUNSELORS.find((c) => c.id === id);
      w.CounselorService.create = async (data) => {
        const c = { id: newDemoId('counselor'), ...data, status: data.status || 'active', created_at: new Date().toISOString() };
        COUNSELORS.push(c);
        return c;
      };
      w.CounselorService.update = async (id, updates) => {
        const idx = COUNSELORS.findIndex((c) => c.id === id);
        if (idx >= 0) { Object.assign(COUNSELORS[idx], updates); return COUNSELORS[idx]; }
        throw new Error('Counselor not found');
      };
      w.CounselorService.delete = async (id) => {
        const idx = COUNSELORS.findIndex((c) => c.id === id);
        if (idx >= 0) COUNSELORS.splice(idx, 1);
      };
    }

    // --- Patch CourseService ---
    if (w.CourseService) {
      w.CourseService.getBySchool = async (schoolId) => COURSES.filter((c) => c.school_id === schoolId);
      w.CourseService.getById = async (id) => COURSES.find((c) => c.id === id);
      w.CourseService.create = async (data) => {
        const c = { id: newDemoId('course'), ...data, status: data.status || 'active', publish_status: data.publishStatus || 'draft', version: data.version || 1, difficulty: data.difficulty || 'intermediate', created_at: new Date().toISOString() };
        COURSES.push(c);
        return c;
      };
      w.CourseService.update = async (id, updates) => {
        const idx = COURSES.findIndex((c) => c.id === id);
        if (idx >= 0) { Object.assign(COURSES[idx], updates); return COURSES[idx]; }
        throw new Error('Course not found');
      };
      w.CourseService.delete = async (id) => {
        const idx = COURSES.findIndex((c) => c.id === id);
        if (idx >= 0) COURSES.splice(idx, 1);
      };
      w.CourseService.getByCategory = async (categoryId) => COURSES.filter((c) => c.category_id === categoryId);
      w.CourseService.getBySubject = async (subjectId) => COURSES.filter((c) => c.subject_id === subjectId);
      w.CourseService.getByStatus = async (schoolId, status) => COURSES.filter((c) => c.school_id === schoolId && c.publish_status === status);
      w.CourseService.getPublished = async (schoolId) => COURSES.filter((c) => c.school_id === schoolId && c.publish_status === 'published');
      w.CourseService.archive = async (id) => {
        const idx = COURSES.findIndex((c) => c.id === id);
        if (idx >= 0) { COURSES[idx].publish_status = 'archived'; return COURSES[idx]; }
        throw new Error('Course not found');
      };
      w.CourseService.search = async (query) => COURSES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
      w.CourseService.getSections = async (courseId) => {
        return COURSE_SECTIONS.filter((cs) => cs.course_id === courseId).map((cs) => {
          const section = SECTIONS.find((s) => s.id === cs.section_id);
          return { ...cs, section: section || null };
        });
      };
      w.CourseService.addSection = async (courseId, sectionId) => {
        const cs = { id: newDemoId('cs'), course_id: courseId, section_id: sectionId };
        COURSE_SECTIONS.push(cs);
        const section = SECTIONS.find((s) => s.id === sectionId);
        return { ...cs, section: section || null };
      };
      w.CourseService.removeSection = async (courseId, sectionId) => {
        const idx = COURSE_SECTIONS.findIndex((cs) => cs.course_id === courseId && cs.section_id === sectionId);
        if (idx >= 0) COURSE_SECTIONS.splice(idx, 1);
      };
      w.CourseService.getEnrollments = async (courseId) => {
        return ENROLLMENTS.filter((e) => e.course_id === courseId).map((e) => {
          const student = STUDENTS.find((s) => s.id === e.student_id);
          return { ...e, student: student || null };
        });
      };
      w.CourseService.getStudentCourses = async (studentId) => {
        return ENROLLMENTS.filter((e) => e.student_id === studentId).map((e) => {
          const course = COURSES.find((c) => c.id === e.course_id);
          return { ...e, course: course || null };
        });
      };
    }

    // --- Patch EnrollmentService ---
    if (w.EnrollmentService) {
      w.EnrollmentService.getBySchool = async (schoolId) => {
        return ENROLLMENTS.filter((e) => {
          const student = STUDENTS.find((s) => s.id === e.student_id);
          return student && student.school_id === schoolId;
        }).map((e) => {
          const student = STUDENTS.find((s) => s.id === e.student_id);
          const course = COURSES.find((c) => c.id === e.course_id);
          return { ...e, student: student || null, course: course || null };
        });
      };
      w.EnrollmentService.getByStudent = async (studentId) => {
        return ENROLLMENTS.filter((e) => e.student_id === studentId).map((e) => {
          const course = COURSES.find((c) => c.id === e.course_id);
          return { ...e, course: course || null };
        });
      };
      w.EnrollmentService.getByCourse = async (courseId) => {
        return ENROLLMENTS.filter((e) => e.course_id === courseId).map((e) => {
          const student = STUDENTS.find((s) => s.id === e.student_id);
          return { ...e, student: student || null };
        });
      };
      w.EnrollmentService.create = async (studentId, courseId, assignedBy) => {
        const e = { id: newDemoId('enr'), student_id: studentId, course_id: courseId, status: 'not_started', assigned_by: assignedBy || null, created_at: new Date().toISOString() };
        ENROLLMENTS.push(e);
        const student = STUDENTS.find((s) => s.id === studentId);
        const course = COURSES.find((c) => c.id === courseId);
        return { ...e, student: student || null, course: course || null };
      };
      w.EnrollmentService.updateStatus = async (id, status) => {
        const idx = ENROLLMENTS.findIndex((e) => e.id === id);
        if (idx >= 0) { ENROLLMENTS[idx].status = status; return ENROLLMENTS[idx]; }
        throw new Error('Enrollment not found');
      };
      w.EnrollmentService.delete = async (id) => {
        const idx = ENROLLMENTS.findIndex((e) => e.id === id);
        if (idx >= 0) ENROLLMENTS.splice(idx, 1);
      };
    }

    // --- Patch NotificationService ---
    if (w.NotificationService) {
      w.NotificationService.getByUser = async (userId) => {
        return NOTIFICATIONS.filter((n) => n.user_id === userId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      };
      w.NotificationService.getUnreadCount = async (userId) => {
        return NOTIFICATIONS.filter((n) => n.user_id === userId && !n.is_read).length;
      };
      w.NotificationService.create = async (title, message, userId) => {
        const n = { id: newDemoId('notif'), user_id: userId, title, message: message || null, is_read: false, created_at: new Date().toISOString() };
        NOTIFICATIONS.unshift(n);
        return n;
      };
      w.NotificationService.markAsRead = async (id) => {
        const n = NOTIFICATIONS.find((n) => n.id === id);
        if (n) n.is_read = true;
      };
      w.NotificationService.markAllAsRead = async (userId) => {
        NOTIFICATIONS.forEach((n) => { if (n.user_id === userId) n.is_read = true; });
      };
      w.NotificationService.delete = async (id) => {
        const idx = NOTIFICATIONS.findIndex((n) => n.id === id);
        if (idx >= 0) NOTIFICATIONS.splice(idx, 1);
      };
      w.NotificationService.deleteAll = async (userId) => {
        for (let i = NOTIFICATIONS.length - 1; i >= 0; i--) {
          if (NOTIFICATIONS[i].user_id === userId) NOTIFICATIONS.splice(i, 1);
        }
      };
    }

    // --- Patch DriveService ---
    if (w.DriveService) {
      w.DriveService.parseDriveLink = (link) => {
        if (!link || typeof link !== 'string') return null;
        const m = link.match(/[-\w]{25,}/);
        return m ? m[0] : null;
      };
      w.DriveService.validateFolderId = () => true;
      w.DriveService.setFolderId = async (entityType, entityId, driveFolderId) => {
        const collections = { school: SCHOOLS, category: CATEGORIES, subject: SUBJECTS, section: SECTIONS };
        const col = collections[entityType];
        if (col) {
          const entity = col.find((e) => e.id === entityId);
          if (entity) { entity.drive_folder_id = driveFolderId; return entity; }
        }
        throw new Error('Entity not found');
      };
      w.DriveService.getFolderId = async (entityType, entityId) => {
        const collections = { school: SCHOOLS, category: CATEGORIES, subject: SUBJECTS, section: SECTIONS };
        const col = collections[entityType];
        if (col) {
          const entity = col.find((e) => e.id === entityId);
          return entity ? entity.drive_folder_id : null;
        }
        return null;
      };
      w.DriveService.removeFolderId = async (entityType, entityId) => {
        const collections = { school: SCHOOLS, category: CATEGORIES, subject: SUBJECTS, section: SECTIONS };
        const col = collections[entityType];
        if (col) {
          const entity = col.find((e) => e.id === entityId);
          if (entity) { entity.drive_folder_id = null; return entity; }
        }
        throw new Error('Entity not found');
      };
      w.DriveService.getEntityName = async (entityType, entityId) => {
        const collections = { school: SCHOOLS, category: CATEGORIES, subject: SUBJECTS, section: SECTIONS };
        const col = collections[entityType];
        if (col) {
          const entity = col.find((e) => e.id === entityId);
          return entity ? entity.name : entityId;
        }
        return entityId;
      };
    }

    // --- Patch AuditLogService ---
    if (w.AuditLogService) {
      w.AuditLogService.log = async (action, entity, entityName, detail) => {
        AUDIT_LOG.unshift({
          id: newDemoId('audit'),
          user_id: 'demo-user',
          user_name: 'Demo User',
          school_id: null,
          action,
          entity,
          entity_name: entityName,
          detail: detail || '',
          created_at: new Date().toISOString(),
        });
      };
      w.AuditLogService.getAll = async () => [...AUDIT_LOG];
    }

    // --- Inject Intelligence sidebar item into school portal ---
    if (w.AppSidebar && w.AppSidebar.SCHOOL_ITEMS) {
      const hasIntelligence = w.AppSidebar.SCHOOL_ITEMS.some(i => i.id === 'school-intelligence');
      if (!hasIntelligence) {
        const dashIdx = w.AppSidebar.SCHOOL_ITEMS.findIndex(i => i.id === 'school-dashboard');
        if (dashIdx >= 0) {
          w.AppSidebar.SCHOOL_ITEMS.splice(dashIdx + 1, 0,
            { id: 'school-intelligence', label: 'Intelligence', icon: 'bar-chart-3', route: 'school-intelligence' },
          );
          if (!w.AppSidebar.ITEM_ICONS['bar-chart-3']) {
            w.AppSidebar.ITEM_ICONS['bar-chart-3'] = '<span class="material-symbols-outlined" style="font-size:20px;">analytics</span>';
          }
        }
      }
    }

    // --- Patch ModuleService (real demo data) ---
    if (w.ModuleService) {
      const _origModuleGetByCourse = w.ModuleService.getByCourse;
      w.ModuleService.getByCourse = async (courseId) => COURSE_MODULES.filter(m => m.course_id === courseId).sort((a, b) => a.sort_order - b.sort_order);
      w.ModuleService.getById = async (id) => COURSE_MODULES.find(m => m.id === id) || null;
      w.ModuleService.getByCourses = async (courseIds) => {
        const result = {};
        for (const cid of courseIds) result[cid] = COURSE_MODULES.filter(m => m.course_id === cid).sort((a, b) => a.sort_order - b.sort_order);
        return result;
      };
      w.ModuleService.create = async (data) => { const m = { id: newDemoId('mod'), ...data, created_at: new Date().toISOString() }; COURSE_MODULES.push(m); return m; };
      w.ModuleService.update = async (id, updates) => { const idx = COURSE_MODULES.findIndex(m => m.id === id); if (idx >= 0) { Object.assign(COURSE_MODULES[idx], updates); return COURSE_MODULES[idx]; } return null; };
      w.ModuleService.delete = async (id) => { const idx = COURSE_MODULES.findIndex(m => m.id === id); if (idx >= 0) COURSE_MODULES.splice(idx, 1); };
    }

    // --- Patch LessonService (real demo data) ---
    if (w.LessonService) {
      w.LessonService.getByModules = async (moduleIds) => {
        const result = {};
        for (const mid of moduleIds) result[mid] = LESSONS.filter(l => l.module_id === mid).sort((a, b) => a.sort_order - b.sort_order);
        return result;
      };
      w.LessonService.getById = async (id) => LESSONS.find(l => l.id === id) || null;
      w.LessonService.getByIds = async (ids) => {
        const result = {};
        for (const id of ids) { const l = LESSONS.find(le => le.id === id); if (l) result[id] = l; }
        return result;
      };
      w.LessonService.create = async (data) => { const l = { id: newDemoId('les'), ...data, created_at: new Date().toISOString() }; LESSONS.push(l); return l; };
      w.LessonService.update = async (id, updates) => { const idx = LESSONS.findIndex(l => l.id === id); if (idx >= 0) { Object.assign(LESSONS[idx], updates); return LESSONS[idx]; } return null; };
      w.LessonService.delete = async (id) => { const idx = LESSONS.findIndex(l => l.id === id); if (idx >= 0) LESSONS.splice(idx, 1); };
      w.LessonService.moveLesson = async (id, direction) => {};
      w.LessonService.moveModule = async (id, direction) => {};
    }

    // --- Patch ProgressService (real demo data) ---
    if (w.ProgressService) {
      w.ProgressService.getByStudent = async (studentId) => PROGRESS.filter(p => p.student_id === studentId).sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));
      w.ProgressService.getByLesson = async (studentId, lessonId) => PROGRESS.find(p => p.student_id === studentId && p.lesson_id === lessonId) || null;
      w.ProgressService.getByLessons = async (studentId, lessonIds) => {
        const result = {};
        for (const lid of lessonIds) { const p = PROGRESS.find(pr => pr.student_id === studentId && pr.lesson_id === lid); if (p) result[lid] = p; }
        return result;
      };
      w.ProgressService.upsertProgress = async (studentId, lessonId, data) => {
        const existing = PROGRESS.find(p => p.student_id === studentId && p.lesson_id === lessonId);
        if (existing) { Object.assign(existing, data, { last_activity: new Date().toISOString() }); return existing; }
        const p = { id: newDemoId('prog'), student_id: studentId, lesson_id: lessonId, completed: false, resume_position: 0, time_spent: 0, ...data, last_activity: new Date().toISOString(), created_at: new Date().toISOString() };
        PROGRESS.push(p); return p;
      };
      w.ProgressService.markComplete = async (studentId, lessonId) => {
        const existing = PROGRESS.find(p => p.student_id === studentId && p.lesson_id === lessonId);
        if (existing) { existing.completed = true; existing.last_activity = new Date().toISOString(); return existing; }
        const p = { id: newDemoId('prog'), student_id: studentId, lesson_id: lessonId, completed: true, resume_position: 0, time_spent: 0, last_activity: new Date().toISOString(), created_at: new Date().toISOString() };
        PROGRESS.push(p); return p;
      };
      w.ProgressService.getCourseProgress = async (studentId, courseId) => {
        const mods = COURSE_MODULES.filter(m => m.course_id === courseId);
        const modIds = mods.map(m => m.id);
        const courseLessons = LESSONS.filter(l => modIds.includes(l.module_id));
        const total = courseLessons.length;
        const completed = PROGRESS.filter(p => p.student_id === studentId && courseLessons.some(l => l.id === p.lesson_id) && p.completed).length;
        return { total_lessons: total, completed_lessons: completed, percentage: total ? Math.round(completed / total * 100) : 0 };
      };
      w.ProgressService.getCourseProgressBatch = async (studentId, courseIds) => {
        const result = {};
        for (const cid of courseIds) result[cid] = await w.ProgressService.getCourseProgress(studentId, cid);
        return result;
      };
      w.ProgressService.update = async (id, updates) => { const idx = PROGRESS.findIndex(p => p.id === id); if (idx >= 0) { Object.assign(PROGRESS[idx], updates); return PROGRESS[idx]; } return null; };
    }

    // --- Patch AssignmentService (real demo data) ---
    if (w.AssignmentService) {
      w.AssignmentService.getByCourse = async (courseId) => ASSIGNMENTS.filter(a => a.course_id === courseId);
      w.AssignmentService.getById = async (id) => ASSIGNMENTS.find(a => a.id === id) || null;
      w.AssignmentService.create = async (data) => { const a = { id: newDemoId('assign'), ...data, created_at: new Date().toISOString() }; ASSIGNMENTS.push(a); return a; };
      w.AssignmentService.update = async (id, updates) => { const idx = ASSIGNMENTS.findIndex(a => a.id === id); if (idx >= 0) { Object.assign(ASSIGNMENTS[idx], updates); return ASSIGNMENTS[idx]; } return null; };
      w.AssignmentService.delete = async (id) => { const idx = ASSIGNMENTS.findIndex(a => a.id === id); if (idx >= 0) ASSIGNMENTS.splice(idx, 1); };
      w.AssignmentService.getSubmissions = async (assignmentId) => [];
      w.AssignmentService.getStudentSubmission = async (assignmentId, studentId) => null;
      w.AssignmentService.submitAssignment = async (assignmentId, studentId, data) => ({ id: newDemoId('sub'), assignment_id: assignmentId, student_id: studentId, ...data, submitted_at: new Date().toISOString() });
      w.AssignmentService.reviewSubmission = async (id, marks, remarks, reviewedBy) => ({ id, marks, remarks, reviewed_by: reviewedBy });
    }

    // --- Patch QuizService (real demo data) ---
    if (w.QuizService) {
      w.QuizService.getByCourse = async (courseId) => QUIZZES.filter(q => q.course_id === courseId);
      w.QuizService.getById = async (id) => QUIZZES.find(q => q.id === id) || null;
      w.QuizService.create = async (data) => { const q = { id: newDemoId('quiz'), ...data, created_at: new Date().toISOString() }; QUIZZES.push(q); return q; };
      w.QuizService.update = async (id, updates) => { const idx = QUIZZES.findIndex(q => q.id === id); if (idx >= 0) { Object.assign(QUIZZES[idx], updates); return QUIZZES[idx]; } return null; };
      w.QuizService.delete = async (id) => { const idx = QUIZZES.findIndex(q => q.id === id); if (idx >= 0) QUIZZES.splice(idx, 1); };
      w.QuizService.getQuestions = async (quizId) => QUIZ_QUESTIONS.filter(q => q.quiz_id === quizId).sort((a, b) => a.sort_order - b.sort_order);
      w.QuizService.createQuestion = async (data) => { const q = { id: newDemoId('qq'), ...data }; QUIZ_QUESTIONS.push(q); return q; };
      w.QuizService.updateQuestion = async (id, updates) => { const idx = QUIZ_QUESTIONS.findIndex(q => q.id === id); if (idx >= 0) { Object.assign(QUIZ_QUESTIONS[idx], updates); return QUIZ_QUESTIONS[idx]; } return null; };
      w.QuizService.deleteQuestion = async (id) => { const idx = QUIZ_QUESTIONS.findIndex(q => q.id === id); if (idx >= 0) QUIZ_QUESTIONS.splice(idx, 1); };
      w.QuizService.startAttempt = async (quizId, studentId) => ({ id: newDemoId('qa'), quiz_id: quizId, student_id: studentId, status: 'in_progress', started_at: new Date().toISOString() });
      w.QuizService.getAttempt = async (id) => null;
      w.QuizService.getStudentAttempts = async (quizId, studentId) => [];
      w.QuizService.submitAnswer = async (attemptId, questionId, answer) => ({ attempt_id: attemptId, question_id: questionId, answer });
      w.QuizService.completeAttempt = async (attemptId) => ({ id: attemptId, status: 'completed', score: 80, percentage: 80, passed: true, completed_at: new Date().toISOString() });
      w.QuizService.getAnswers = async (attemptId) => [];
    }

    // --- Patch CertificateService (real demo data) ---
    if (w.CertificateService) {
      w.CertificateService.getByStudent = async (studentId) => CERTIFICATES.filter(c => c.student_id === studentId).map(c => { const course = COURSES.find(co => co.id === c.course_id); return { ...c, course_title: course?.name || '' }; });
      w.CertificateService.getByCourse = async (studentId, courseId) => CERTIFICATES.find(c => c.student_id === studentId && c.course_id === courseId) || null;
      w.CertificateService.generate = async (studentId, courseId, completedAt) => {
        const count = CERTIFICATES.length + 1;
        const c = { id: newDemoId('cert'), student_id: studentId, course_id: courseId, certificate_number: `CERT-2025-${String(count).padStart(4, '0')}`, completed_at: completedAt || new Date().toISOString(), issued_at: new Date().toISOString(), created_at: new Date().toISOString() };
        CERTIFICATES.push(c); return c;
      };
      w.CertificateService.getById = async (id) => CERTIFICATES.find(c => c.id === id) || null;
    }
    if (w.SettingsService) {
      w.SettingsService.get = async (key) => null;
      w.SettingsService.set = async (key, value) => {};
    }
    if (w.PermissionsService) {
      w.PermissionsService.getUserRole = async (userId) => 'school_admin';
      w.PermissionsService.hasPermission = async (userId, permission) => true;
    }

    // --- Add demo sidebar items for counselor and student ---
    if (w.AppSidebar) {
      w.AppSidebar.COUNSELOR_ITEMS = [
        { id: 'counselor-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'counselor-dashboard' },
        { id: 'sep-c1', separator: true },
        { id: 'counselor-students', label: 'My Students', icon: 'groups', route: 'counselor-students' },
        { id: 'counselor-videos', label: 'Video Library', icon: 'video-library', route: 'counselor-videos' },
        { id: 'sep-c2', separator: true },
        { id: 'counselor-notifications', label: 'Notifications', icon: 'notifications', route: 'counselor-notifications' },
        { id: 'counselor-profile', label: 'Profile', icon: 'person', route: 'counselor-profile' },
      ];
      w.AppSidebar.STUDENT_ITEMS = [
        { id: 'student-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'student-dashboard' },
        { id: 'sep-st1', separator: true },
        { id: 'student-courses', label: 'My Courses', icon: 'school', route: 'student-courses' },
        { id: 'student-videos', label: 'My Videos', icon: 'video-library', route: 'student-videos' },
        { id: 'student-progress', label: 'Progress', icon: 'bar-chart-3', route: 'student-progress' },
        { id: 'sep-st2', separator: true },
        { id: 'student-notifications', label: 'Notifications', icon: 'notifications', route: 'student-notifications' },
        { id: 'student-profile', label: 'Profile', icon: 'person', route: 'student-profile' },
      ];
    }

    // --- Patch remaining direct supabase calls in main.js ---
    // AppUserManagement.saveEditUser uses supabase.from('profiles').update()
    if (w.AppUserManagement) {
      const origSaveEdit = w.AppUserManagement.saveEditUser;
      w.AppUserManagement.saveEditUser = async function (userId) {
        const nameInput = document.getElementById('edit-user-name');
        if (!nameInput) return;
        const name = nameInput.value.trim();
        if (!name) { w.AppToast?.show('Name is required.', 'error'); return; }
        // Update in-memory USERS array instead of calling supabase
        const user = USERS.find((u) => u.id === userId);
        if (user) user.name = name;
        // Also update profiles if needed for getProfile
        w.AppToast?.show('User name updated.', 'success');
        w.AppModal?.close('modal-edit-user');
        w.AppRouter?.render();
      };
    }
    // Trap supabase.from('profiles').update() to succeed in demo mode
    if (w.supabase) {
      const origFrom = w.supabase.from.bind(w.supabase);
      w.supabase.from = function (table) {
        const builder = origFrom(table);
        if (table === 'profiles') {
          const origUpdate = builder.update.bind(builder);
          builder.update = function (updates) {
            // Return a mock query builder whose .eq().then() resolves successfully
            const mockPromise = Promise.resolve({ error: null, data: null });
            return {
              eq: function () { return mockPromise; },
              then: mockPromise.then.bind(mockPromise),
              catch: mockPromise.catch.bind(mockPromise),
            };
          };
        }
        return builder;
      };
    }

    // --- Patch AppUtils.getTotalCounts to use demo data ---
    if (w.AppUtils) {
      w.AppUtils.getTotalCounts = async function () {
        return {
          schools: SCHOOLS.length,
          categories: CATEGORIES.length,
          subjects: SUBJECTS.length,
          sections: SECTIONS.length,
          content: CONTENT.length,
        };
      };
    }

    // --- Patch AppRouter for counselor/student demo dashboards ---
    if (w.AppRouter) {
      const origRender = w.AppRouter.render;
      w.AppRouter.render = async function () {
        // Handle school-intelligence dashboard
        if (w.AppRouter.currentRoute === 'school-intelligence' && w.AppRouter.currentSchoolId) {
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.style.display = 'flex';
            const data = buildDemoData();
            const school = data.schools.find(s => s.id === w.AppRouter.currentSchoolId);
            // Render sidebar with school items + intelligence active
            if (w.AppSidebar && w.AppSidebar.SCHOOL_ITEMS) {
              document.getElementById('sidebar').classList.remove('sidebar-hq');
              w.AppSidebar.render(w.AppSidebar.SCHOOL_ITEMS, 'school-intelligence',
                `<div class="nav-item" data-action="navigate" data-route="schools">
                  <span class="material-symbols-outlined" style="font-size:20px;">chevron_left</span><span class="nav-label">Back to Schools</span>
                </div>`
              );
              window.initIcons?.();
            }
            renderSchoolIntelligence(mainContent, school, data);
            return;
          }
        }

        const { user } = await DemoAuth.getUser();
        if (user) {
          const profile = await DemoAuth.getProfile();
          if (profile && (profile.role === 'counselor' || profile.role === 'student')) {
            const route = w.AppRouter.currentRoute || 'counselor-dashboard';
            const mainContent = document.getElementById('main-content');
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.style.display = 'flex';

            if (profile.role === 'counselor') {
              w.AppRouter.currentRoute = route.startsWith('counselor-') ? route : 'counselor-dashboard';
              w.AppRouter.currentSchoolId = profile.school_id || null;
              if (w.AppSidebar && w.AppSidebar.COUNSELOR_ITEMS) {
                document.getElementById('sidebar').classList.remove('sidebar-hq');
                w.AppSidebar.render(w.AppSidebar.COUNSELOR_ITEMS, w.AppRouter.currentRoute, '');
                window.initIcons?.();
              }
              renderCounselorDashboard(mainContent, profile);
              return;
            } else if (profile.role === 'student') {
              w.AppRouter.currentRoute = route.startsWith('student-') ? route : 'student-dashboard';
              w.AppRouter.currentSchoolId = profile.school_id || null;
              if (w.AppSidebar && w.AppSidebar.STUDENT_ITEMS) {
                document.getElementById('sidebar').classList.remove('sidebar-hq');
                w.AppSidebar.render(w.AppSidebar.STUDENT_ITEMS, w.AppRouter.currentRoute, '');
                window.initIcons?.();
              }
              const routeMap = {
                'student-dashboard': renderStudentDashboard,
                'student-courses': renderStudentCourses,
                'student-videos': renderStudentVideos,
                'student-progress': renderStudentProgress,
                'student-notifications': renderStudentNotificationsPage,
                'student-profile': renderStudentProfile,
              };
              const renderFn = routeMap[w.AppRouter.currentRoute] || renderStudentDashboard;
              renderFn(mainContent, profile);
              return;
            }
          }
        }
        return origRender.call(this);
      };

      // Also patch navigate to handle demo role routing and school-intelligence
      const origNavigate = w.AppRouter.navigate;
      w.AppRouter.navigate = async function (route, params) {
        // Handle school-intelligence specially — preserve school context
        if (route === 'school-intelligence') {
          this.currentRoute = 'school-intelligence';
          if (params && params.schoolId) this.currentSchoolId = params.schoolId;
          return this.render();
        }
        const { user } = await DemoAuth.getUser();
        if (user) {
          const profile = await DemoAuth.getProfile();
          if (profile) {
            if (profile.role === 'counselor') {
              w.AppRouter.currentRoute = route || 'counselor-dashboard';
              w.AppRouter.currentSchoolId = profile.school_id || null;
              return w.AppRouter.render();
            }
            if (profile.role === 'student') {
              w.AppRouter.currentRoute = route || 'student-dashboard';
              w.AppRouter.currentSchoolId = profile.school_id || null;
              return w.AppRouter.render();
            }
            if (profile.role === 'school_admin' && profile.school_id) {
              const targetRoute = route && !route.startsWith('school-') ? route : 'school-dashboard';
              if (targetRoute === 'company-dashboard') {
                w.AppRouter.currentRoute = 'school-dashboard';
                w.AppRouter.currentSchoolId = profile.school_id;
                return w.AppRouter.render();
              }
            }
          }
        }
        return origNavigate.call(this, route, params);
      };
    }
  }

  // ==============================================================
  // PATCH AFTER MAIN.JS INITIALIZES
  // ==============================================================
  // main.js sets up all window globals during its top-level execution.
  // We defer patching to the next microtask to ensure those globals exist.
  // ==============================================================
  // Add analytics filter click handler
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    if (action === 'sp-analytics-filter') {
      const period = el.getAttribute('data-period') || 'overall';
      document.querySelectorAll('[data-action="sp-analytics-filter"]').forEach(b => {
        b.style.background = 'transparent';
        b.style.border = '1px solid var(--border)';
        b.style.color = '';
      });
      el.style.background = 'var(--primary)';
      el.style.border = 'none';
      el.style.color = '#fff';
      const filterLabel = document.querySelector('[data-action="sp-analytics-filter"] ~ span');
      const labelEl = e.target.closest('[style*="display:flex"]')?.querySelector('span:last-child');
      if (labelEl) labelEl.innerHTML = `Showing data for <strong>${eh(period.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}</strong> · Updated just now`;
      window.AppToast?.show(`Filtered by ${period.replace(/-/g, ' ')}`, 'info');
      return;
    }
  });

  setTimeout(patchServices, 0);

  demoIntegration.DEMO_MODE = true;
  demoIntegration.patchServices = patchServices;
}


