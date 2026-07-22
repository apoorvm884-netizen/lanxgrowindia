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

    const myStudents = STUDENTS.filter((s) => s.counselor_id === counselorId);
    const myEnrollments = ENROLLMENTS.filter((e) =>
      myStudents.some((s) => s.id === e.student_id)
    );
    const completedCount = myEnrollments.filter((e) => e.status === 'completed').length;
    const inProgressCount = myEnrollments.filter((e) => e.status === 'in_progress').length;
    const activeStudents = myStudents.filter((s) => s.status === 'active').length;
    const totalCourses = [...new Set(myEnrollments.map((e) => e.course_id))].length;

    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">Counselor Dashboard</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${eh(profile?.name || 'Counselor')} · ${eh(school?.name || 'School')}</p>

        <div class="metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Assigned Students</div>
            <div style="font-size:32px;font-weight:700;">${activeStudents}</div>
          </div>
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Active Courses</div>
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
        </div>

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
                      <th style="text-align:left;padding:8px 12px;font-weight:600;">Progress</th>
                      <th style="text-align:left;padding:8px 12px;font-weight:600;">Status</th>
                    </tr></thead>
                    <tbody>${myStudents.map((s) => `
                      <tr style="border-bottom:1px solid var(--border-light);">
                        <td style="padding:8px 12px;">${eh(s.name)}</td>
                        <td style="padding:8px 12px;color:var(--text-secondary);">${eh(s.class)}</td>
                        <td style="padding:8px 12px;">
                          <div style="display:flex;align-items:center;gap:8px;">
                            <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
                              <div style="width:${s.progress}%;height:100%;background:var(--primary);border-radius:3px;"></div>
                            </div>
                            <span style="font-size:12px;color:var(--text-secondary);">${s.progress}%</span>
                          </div>
                        </td>
                        <td style="padding:8px 12px;"><span class="badge badge-${s.status === 'active' ? 'success' : 'warning'}" style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${s.status === 'active' ? 'var(--success-bg, #e6f7e6)' : 'var(--warning-bg, #fff3e0)'};color:${s.status === 'active' ? 'var(--success, #2e7d32)' : 'var(--warning, #f57c00)'};">${eh(s.status)}</span></td>
                      </tr>`).join('')}</tbody>
                  </table>
                </div>`}
          </div>

          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">Today's Tasks</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
                  <input type="checkbox" style="accent-color:var(--primary);">
                  <span style="font-size:13px;">Review Aarav Patel's progress</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
                  <input type="checkbox" style="accent-color:var(--primary);">
                  <span style="font-size:13px;">Prepare weekly counseling report</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
                  <input type="checkbox" style="accent-color:var(--primary);">
                  <span style="font-size:13px;">Schedule parent-teacher meeting</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
                  <input type="checkbox" style="accent-color:var(--primary);">
                  <span style="font-size:13px;">Review new course assignments</span>
                </div>
              </div>
            </div>

            <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">Recent Activity</h3>
              <div style="font-size:13px;color:var(--text-secondary);display:flex;flex-direction:column;gap:8px;">
                <div style="padding:6px 0;border-bottom:1px solid var(--border-light);">Priya Singh completed "Communication" course</div>
                <div style="padding:6px 0;border-bottom:1px solid var(--border-light);">New video "Public Speaking Mastery" available</div>
                <div style="padding:6px 0;">Rohan Gupta reached 80% in Career Planning</div>
              </div>
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
    const inProgressCount = myEnrollments.filter((e) => e.status === 'in_progress').length;

    container.innerHTML = `
      <div style="padding:24px;">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 4px;">Student Dashboard</h1>
        <p style="color:var(--text-secondary);margin:0 0 24px;">${eh(student?.name || profile?.name || 'Student')} · ${eh(school?.name || 'School')} · ${eh(student?.class || '')}</p>

        <div class="metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
          <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Enrolled Courses</div>
            <div style="font-size:32px;font-weight:700;">${myEnrollments.length}</div>
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
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Attendance</div>
            <div style="font-size:32px;font-weight:700;">${student?.attendance || 0}%</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
            <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;">My Courses</h3>
            ${myEnrollments.length === 0
              ? '<p style="color:var(--text-secondary);">No courses assigned yet.</p>'
              : `<div style="display:flex;flex-direction:column;gap:12px;">${myEnrollments.map((e) => {
                  const course = COURSES.find((c) => c.id === e.course_id);
                  const statusColors = {
                    completed: 'var(--success)',
                    in_progress: 'var(--primary)',
                    not_started: 'var(--text-muted)',
                  };
                  return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid var(--border);border-radius:8px;">
                      <div>
                        <div style="font-weight:600;font-size:14px;">${eh(course?.name || 'Unknown Course')}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${eh(course?.description || '')}</div>
                      </div>
                      <span style="font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px;background:${e.status === 'completed' ? 'var(--success-bg, #e6f7e6)' : e.status === 'in_progress' ? 'var(--primary-bg, #e3f2fd)' : 'var(--border-light)'};color:${statusColors[e.status] || 'var(--text-secondary)'};">${eh(e.status.replace('_', ' '))}</span>
                    </div>`;
                }).join('')}</div>`}
          </div>

          <div style="display:flex;flex-direction:column;gap:16px;">
            <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">My Progress</h3>
              <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                    <span>Overall Progress</span>
                    <span>${student?.progress || 0}%</span>
                  </div>
                  <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                    <div style="width:${student?.progress || 0}%;height:100%;background:linear-gradient(90deg,var(--primary),#4f8cff);border-radius:4px;"></div>
                  </div>
                </div>
                <div>
                  <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                    <span>Attendance</span>
                    <span>${student?.attendance || 0}%</span>
                  </div>
                  <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                    <div style="width:${student?.attendance || 0}%;height:100%;background:linear-gradient(90deg,var(--success),#66bb6a);border-radius:4px;"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">My Videos</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${CONTENT.filter(c => c.school_id === schoolId).slice(0, 3).map(v => `
                  <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-light);cursor:pointer;" data-action="play-video" data-id="${v.id}">
                    <span class="material-symbols-outlined" style="font-size:20px;color:var(--primary);">play_circle</span>
                    <div style="flex:1;">
                      <div style="font-size:13px;font-weight:500;">${eh(v.name)}</div>
                      <div style="font-size:11px;color:var(--text-secondary);">${eh(v.duration)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
              <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">Certificates</h3>
              <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px dashed var(--border);border-radius:8px;">
                <span class="material-symbols-outlined" style="font-size:24px;color:var(--text-muted);">workspace_premium</span>
                <div style="font-size:13px;color:var(--text-secondary);">Complete your courses to earn certificates.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;margin-top:24px;">
          <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">Notifications</h3>
          ${NOTIFICATIONS.filter(n => n.user_id.startsWith('demo-student')).slice(0, 4).map(n => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);${!n.is_read ? 'font-weight:600;' : ''}">
              <span class="material-symbols-outlined" style="font-size:18px;color:${!n.is_read ? 'var(--primary)' : 'var(--text-muted)'};">${!n.is_read ? 'notifications_active' : 'notifications'}</span>
              <div style="flex:1;">
                <div style="font-size:13px;">${eh(n.title)}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${eh(n.message)}</div>
              </div>
            </div>
          `).join('')}
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
        const s = { id: newDemoId('school'), ...data, status: data.status || 'active', created_at: new Date().toISOString(), drive_folder_id: null };
        SCHOOLS.push(s);
        return s;
      };
      w.SchoolService.update = async (id, updates) => {
        const idx = SCHOOLS.findIndex((s) => s.id === id);
        if (idx >= 0) { Object.assign(SCHOOLS[idx], updates); return SCHOOLS[idx]; }
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
        const s = { id: newDemoId('student'), ...data, status: data.status || 'active', attendance: 100, progress: 0, created_at: new Date().toISOString(), avatar_url: null };
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

    // --- Patch CourseService ---
    if (w.CourseService) {
      w.CourseService.getBySchool = async (schoolId) => COURSES.filter((c) => c.school_id === schoolId);
      w.CourseService.getById = async (id) => COURSES.find((c) => c.id === id);
      w.CourseService.create = async (data) => {
        const c = { id: newDemoId('course'), ...data, status: data.status || 'active', created_at: new Date().toISOString() };
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
              renderStudentDashboard(mainContent, profile);
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


