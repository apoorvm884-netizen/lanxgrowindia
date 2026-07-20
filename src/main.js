// ==============================================================
// LANXGROW COS — Main Entry Point
// ==============================================================
// This file is the application entry point for Vite.
// It imports Supabase-backed services and contains all view
// rendering, routing, and event handling logic.
// ==============================================================

import { supabase } from './lib/supabase.js';
import {
  SchoolService as SupabaseSchoolService,
  CategoryService as SupabaseCategoryService,
  SubjectService as SupabaseSubjectService,
  SectionService as SupabaseSectionService,
  ContentService as SupabaseContentService,
  AuthService,
  AuditLogService,
  DriveService,
  StudentService,
  CourseService,
  EnrollmentService,
  NotificationService,
  SettingsService,
  PermissionsService
} from './services/index.js';

// Import School Portal rendering module
import './school-portal.js';

// Conditional Demo Mode — only loads when VITE_DEMO_MODE=true
import { DEMO_MODE } from './demo/demo-config.js';
if (DEMO_MODE) {
  import('./demo/demo-integration.js');
}

// Attach services to window — these override the old localStorage stubs
window.SchoolService = SupabaseSchoolService;
window.CategoryService = SupabaseCategoryService;
window.SubjectService = SupabaseSubjectService;
window.SectionService = SupabaseSectionService;
window.ContentService = SupabaseContentService;
window.AuthService = AuthService;
window.AuditLogService = AuditLogService;
window.DriveService = DriveService;
window.StudentService = StudentService;
window.CourseService = CourseService;
window.EnrollmentService = EnrollmentService;
window.NotificationService = NotificationService;
window.SettingsService = SettingsService;
window.PermissionsService = PermissionsService;
window.supabase = supabase;

// ==============================================================
// DATA LAYER — Supabase-backed (replaces localStorage AppStorage)
// ==============================================================
window.AppStorage = {
  KEY: 'lanxgrow_cos',

  async init() {
    // Schema is managed by Supabase migrations — no-op
  },

  async load() {
    const [schoolsRes, categoriesRes, subjectsRes, sectionsRes, contentRes, profilesRes, logsRes] =
      await Promise.all([
        supabase.from('schools').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('sections').select('*').order('name'),
        supabase.from('content').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
      ]);

    const schools = schoolsRes.data || [];
    const categories = categoriesRes.data || [];
    const subjects = subjectsRes.data || [];
    const sections = sectionsRes.data || [];
    const content = contentRes.data || [];
    const profiles = profilesRes.data || [];
    const auditLog = logsRes.data || [];

    // Map profiles to old 'users' shape for backward compat
    const users = profiles.map(p => ({
      id: p.id,
      name: p.name,
      email: '',
      password: '',
      role: p.role,
      schoolId: p.school_id
    }));

    return { schools, categories, subjects, sections, content, users, auditLog };
  },

  async save() {
    // No-op — Supabase persists via individual service calls
  }
};

// ==============================================================
// SKELETON LOADING
// ==============================================================
const SKELETON_STYLE = 'background:linear-gradient(90deg,var(--border) 25%,var(--border-light) 50%,var(--border) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:6px;';
const styleSheet = document.createElement('style');
styleSheet.textContent = `@keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }`;
document.head.appendChild(styleSheet);

window.AppSkeleton = {
  dashboard: function() {
    return `<div class="fade-in" style="padding:24px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
        <div style="width:48px;height:48px;border-radius:12px;${SKELETON_STYLE}"></div>
        <div><div style="width:200px;height:22px;${SKELETON_STYLE}"></div><div style="width:140px;height:14px;margin-top:6px;${SKELETON_STYLE}"></div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;">
        ${Array.from({length:4}, () => `<div style="height:80px;${SKELETON_STYLE}"></div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        ${Array.from({length:2}, () => `<div style="height:200px;${SKELETON_STYLE}"></div>`).join('')}
      </div>
    </div>`;
  },
  table: function(rows = 5) {
    return `<div style="padding:24px;">
      <div style="width:200px;height:28px;margin-bottom:16px;${SKELETON_STYLE}"></div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${Array.from({length:rows}, () => `<div style="height:48px;${SKELETON_STYLE}"></div>`).join('')}
      </div>
    </div>`;
  },
  cards: function(count = 6) {
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:24px;">
      ${Array.from({length:count}, () => `<div style="height:180px;${SKELETON_STYLE}"></div>`).join('')}
    </div>`;
  }
};

// ==============================================================
// UTILITY FUNCTIONS
// ==============================================================
window.AppUtils = {
  getTotalCounts: async function () {
    try {
      const [schools, categories, subjects, sections, content] = await Promise.all([
        supabase.from('schools').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('subjects').select('id', { count: 'exact', head: true }),
        supabase.from('sections').select('id', { count: 'exact', head: true }),
        supabase.from('content').select('id', { count: 'exact', head: true })
      ]);
      return {
        schools: schools.count || 0,
        categories: categories.count || 0,
        subjects: subjects.count || 0,
        sections: sections.count || 0,
        content: content.count || 0
      };
    } catch {
      return { schools: 0, categories: 0, subjects: 0, sections: 0, content: 0 };
    }
  },

  formatDate: function (ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  },

  getInitials: function (name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  timeAgo: function (ts) {
    if (!ts) return '';
    const now = Date.now();
    const diff = now - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return AppUtils.formatDate(ts);
  }
};

// ==============================================================
// TOAST MODULE
// ==============================================================
window.AppToast = {
  show: function (message, type) {
    type = type || 'success';
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">${icons[type] || 'info'}</span><span>${message}</span>`;
    container.appendChild(toast);
    initIcons();
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 3000);
  }
};

// ==============================================================
// MODAL MODULE
// ==============================================================
window.AppModal = {
  open(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('active');
    document.addEventListener('keydown', this._keyHandler);
    const firstInput = el.querySelector('input, select, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  },
  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');
    document.removeEventListener('keydown', this._keyHandler);
    if (id === 'modal-entity') document.getElementById('form-entity').reset();
  },
  _keyHandler(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => AppModal.close(m.id));
    }
  },
  init() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => AppModal.close(btn.dataset.closeModal));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) AppModal.close(overlay.id);
      });
    });
  }
};

// ==============================================================
// SIDEBAR MODULE
// ==============================================================
window.AppSidebar = {
  COMPANY_ITEMS: [
    { id: 'company-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'company-dashboard' },
    { id: 'schools', label: 'Schools', icon: 'building-2', route: 'schools' },
    { id: 'sep1', separator: true },
    { id: 'content-manager', label: 'Content Manager', icon: 'folder-kanban', route: 'content-manager' },
    { id: 'drive-manager', label: 'Drive Manager', icon: 'hard-drive', route: 'drive-manager' },
    { id: 'media-library', label: 'Media Library', icon: 'image', route: 'media-library' },
    { id: 'sep2', separator: true },
    { id: 'school-admins', label: 'School Admins', icon: 'user-cog', route: 'school-admins' },
    { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'shield', route: 'roles-permissions' },
    { id: 'company-settings', label: 'Settings', icon: 'settings', route: 'company-settings' },
    { id: 'sep3', separator: true },
    { id: 'audit-log', label: 'Audit Log', icon: 'history', route: 'audit-log' },
  ],

  SCHOOL_ITEMS: [
    { id: 'school-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-students', label: 'Students', icon: 'groups', route: 'school-students' },
    { id: 'school-counselors', label: 'Counselors', icon: 'badge', route: 'school-counselors' },
    { id: 'sep-s2', separator: true },
    { id: 'school-categories', label: 'Categories', icon: 'folder-tree', route: 'school-categories' },
    { id: 'school-subjects', label: 'Subjects', icon: 'book-open', route: 'school-subjects' },
    { id: 'school-sections', label: 'Sections', icon: 'folder-kanban', route: 'school-sections' },
    { id: 'sep-s3', separator: true },
    { id: 'school-courses', label: 'Courses', icon: 'school', route: 'school-courses' },
    { id: 'school-videos', label: 'Video Library', icon: 'video-library', route: 'school-videos' },
    { id: 'school-assignments', label: 'Assignments', icon: 'assignment', route: 'school-assignments' },
    { id: 'sep-s4', separator: true },
    { id: 'school-reports', label: 'Reports', icon: 'bar-chart-3', route: 'school-reports' },
    { id: 'school-notifications', label: 'Notifications', icon: 'notifications', route: 'school-notifications' },
    { id: 'sep-s5', separator: true },
    { id: 'school-settings', label: 'Settings', icon: 'settings', route: 'school-settings' },
    { id: 'school-profile', label: 'Profile', icon: 'person', route: 'school-profile' },
  ],

  ITEM_ICONS: {
    'layout-dashboard': '<span class="material-symbols-outlined" style="font-size:20px;">dashboard</span>',
    'building-2': '<span class="material-symbols-outlined" style="font-size:20px;">business</span>',
    'folder-kanban': '<span class="material-symbols-outlined" style="font-size:20px;">folder</span>',
    'hard-drive': '<span class="material-symbols-outlined" style="font-size:20px;">cloud</span>',
    'image': '<span class="material-symbols-outlined" style="font-size:20px;">image</span>',
    'user-cog': '<span class="material-symbols-outlined" style="font-size:20px;">manage_accounts</span>',
    'shield': '<span class="material-symbols-outlined" style="font-size:20px;">shield</span>',
    'settings': '<span class="material-symbols-outlined" style="font-size:20px;">settings</span>',
    'folder-tree': '<span class="material-symbols-outlined" style="font-size:20px;">folder</span>',
    'book-open': '<span class="material-symbols-outlined" style="font-size:20px;">auto_stories</span>',
    'video': '<span class="material-symbols-outlined" style="font-size:20px;">videocam</span>',
    'bar-chart-3': '<span class="material-symbols-outlined" style="font-size:20px;">bar_chart</span>',
    'history': '<span class="material-symbols-outlined" style="font-size:20px;">history</span>',
    'groups': '<span class="material-symbols-outlined" style="font-size:20px;">groups</span>',
    'badge': '<span class="material-symbols-outlined" style="font-size:20px;">badge</span>',
    'school': '<span class="material-symbols-outlined" style="font-size:20px;">school</span>',
    'video-library': '<span class="material-symbols-outlined" style="font-size:20px;">video_library</span>',
    'assignment': '<span class="material-symbols-outlined" style="font-size:20px;">assignment</span>',
    'notifications': '<span class="material-symbols-outlined" style="font-size:20px;">notifications</span>',
    'person': '<span class="material-symbols-outlined" style="font-size:20px;">person</span>',
  },

  render(items, activeId, backLink) {
    const nav = document.getElementById('sidebar-nav');
    let html = '';
    if (backLink) html += backLink;
    items.forEach(item => {
      if (item.separator) { html += '<div class="sidebar-sep"></div>'; return; }
      const isActive = item.route === activeId;
      const isDisabled = item.disabled;
      const iconHtml = this.ITEM_ICONS[item.icon] || '';
      const action = isDisabled ? 'disabled-nav' : 'navigate';
      html += `<div class="nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" data-route="${item.route || ''}" data-action="${action}">
        ${iconHtml}
        <span class="nav-label">${item.label}</span>
        ${isDisabled ? '<span class="nav-badge">Soon</span>' : ''}
      </div>`;
    });
    nav.innerHTML = html;
    initIcons();
  }
};

// ==============================================================
// ROUTER MODULE
// ==============================================================
window.AppRouter = {
  currentRoute: null,
  currentSchoolId: null,
  _selectedCategoryId: null,
  _selectedSubjectId: null,

  init() {
    this.navigate(this.currentRoute || 'company-dashboard');
  },

  navigate(route, params) {
    this.currentRoute = route;
    if (params && params.schoolId) this.currentSchoolId = params.schoolId;
    this._selectedCategoryId = (params && params.categoryId) || null;
    this._selectedSubjectId = (params && params.subjectId) || null;
    const schoolRoutes = ['school-dashboard','school-categories','school-subjects','school-sections',
      'school-students','school-counselors','school-courses','school-videos',
      'school-assignments','school-reports','school-notifications','school-settings','school-profile'];
    if (!schoolRoutes.includes(route)) {
      this.currentSchoolId = null;
    }
    this.render();
  },

  async render() {
    const main = document.getElementById('main-content');
    if (!main) return;
    const user = await AuthService.getUser();
    if (this.currentRoute === 'school-dashboard') {
      main.innerHTML = AppSkeleton.dashboard();
    } else if (['school-students','school-counselors','school-courses','school-assignments'].includes(this.currentRoute)) {
      main.innerHTML = AppSkeleton.table();
    } else if (['school-videos'].includes(this.currentRoute)) {
      main.innerHTML = AppSkeleton.cards();
    }

    if (this.currentRoute && this.currentRoute.startsWith('school-')) {
      if (this.currentSchoolId) {
        const data = await AppStorage.load();
        const school = data.schools.find(s => s.id === this.currentSchoolId);
        if (school) {
          document.getElementById('sidebar').classList.remove('sidebar-hq');
          AppSidebar.render(AppSidebar.SCHOOL_ITEMS, this.currentRoute,
            `<div class="nav-item" data-action="navigate" data-route="schools">
              <span class="material-symbols-outlined" style="font-size:20px;">chevron_left</span><span class="nav-label">Back to Schools</span>
            </div>`
          );
          initIcons();
          await this.renderSchoolWorkspace(main, user, school, data);
          return;
        }
      }
      this.navigate('company-dashboard');
      return;
    }

    document.getElementById('sidebar').classList.add('sidebar-hq');
    AppSidebar.render(AppSidebar.COMPANY_ITEMS, this.currentRoute);
    initIcons();

    switch (this.currentRoute) {
      case 'company-dashboard':
        await this.renderCompanyDashboard(main);
        break;
      case 'schools':
        await this.renderSchools(main);
        break;
      case 'content-manager':
        await this.renderContentManager(main);
        break;
      case 'drive-manager':
        await this.renderDriveManager(main);
        break;
      case 'media-library':
        await this.renderMediaLibrary(main);
        break;
      case 'school-admins':
        await this.renderSchoolAdmins(main);
        break;
      case 'roles-permissions':
        await this.renderRolesPermissions(main);
        break;
      case 'company-settings':
        await this.renderCompanySettings(main);
        break;
      case 'audit-log':
        await AppAuditLog.render(main);
        break;
      default:
        await this.renderCompanyDashboard(main);
        break;
    }
  },

  // --- SCHOOL WORKSPACE (dispatcher) ---
  async renderSchoolWorkspace(main, user, school, data) {
    const profile = await AuthService.getProfile();
    const isSuperAdmin = profile && profile.role === 'super_admin';
    const schoolName = school?.name || 'School';
    const schoolId = this.currentSchoolId;

    if (this.currentRoute === 'school-dashboard') {
      const cats = data.categories.filter(c => c.school_id === schoolId);
      const subjects = data.subjects.filter(s => s.school_id === schoolId);
      const sections = data.sections.filter(sec => sec.school_id === schoolId);
      const content = data.content.filter(c => c.school_id === schoolId);
      const schoolStudents = (data.students || []).filter(s => s.school_id === schoolId);
      const schoolCourses = (data.courses || []).filter(c => c.school_id === schoolId);
      const schoolCounselors = (data.counselors || []).filter(c => c.school_id === schoolId);
      const schoolEnrollments = (data.enrollments || []).filter(e => schoolStudents.some(s => s.id === e.student_id));
      const schoolNotifications = (data.notifications || []).filter(n => n.user_id === (profile ? profile.id : ''));
      const avgAttendance = schoolStudents.length ? Math.round(schoolStudents.reduce((s, st) => s + st.attendance, 0) / schoolStudents.length) : 0;
      const completionRate = schoolEnrollments.length ? Math.round(schoolEnrollments.filter(e => e.status === 'completed').length / schoolEnrollments.length * 100) : 0;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';
      const recentContent = content.slice(0, 4);
      const recentEnrollments = schoolEnrollments.slice(-4).reverse();
      const atRiskStudents = schoolStudents.filter(s => s.attendance < 80 || s.progress < 50);

      main.innerHTML = `<div class="fade-in">
        ${isSuperAdmin ? `<div style="background:#111827;color:#d1d5db;padding:10px 16px;border-radius:var(--radius-md);margin-bottom:16px;display:flex;align-items:center;gap:12px;font-size:12px;">
          <span class="material-symbols-outlined" style="font-size:16px;">admin_panel_settings</span>
          <span style="flex:1;">SUPER ADMIN MODE — You are viewing the isolated workspace for <strong>${schoolName}</strong></span>
          <button class="btn btn-sm" style="background:#374151;color:#fff;border:none;height:28px;font-size:11px;" data-action="navigate" data-route="schools">Exit Workspace</button>
        </div>` : ''}
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;">${AppUtils.getInitials(schoolName)}</div>
              <div>
                <h1 style="font-size:22px;font-weight:700;margin:0;">${greeting}, ${profile?.name || 'Admin'}!</h1>
                <p style="margin:2px 0 0;font-size:13px;color:var(--text-secondary);">${schoolName} · ${dateStr}</p>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span style="font-size:11px;padding:4px 12px;border-radius:20px;background:${avgAttendance >= 85 ? '#f0fdf4' : '#fffbeb'};color:${avgAttendance >= 85 ? '#10b981' : '#f59e0b'};font-weight:600;display:flex;align-items:center;gap:4px;">
              <span style="width:6px;height:6px;border-radius:50%;background:${avgAttendance >= 85 ? '#10b981' : '#f59e0b'};"></span>${avgAttendance}% Attendance Today
            </span>
            <button class="btn btn-sm" style="background:var(--primary);color:#fff;border:none;height:32px;font-size:12px;" data-action="navigate" data-route="school-intelligence"><span class="material-symbols-outlined" style="font-size:16px;">analytics</span> Insights</button>
          </div>
        </div>

        <div class="metrics-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:20px;">
          <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-green" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">groups</span></div><div class="metric-info"><h2 style="font-size:20px;">${schoolStudents.length}</h2><p>Total Students</p></div></div>
          <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-blue" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">person_play</span></div><div class="metric-info"><h2 style="font-size:20px;">${Math.min(schoolStudents.length, 5)}</h2><p>Active Today</p></div></div>
          <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-red" style="width:36px;height:36px;background:#fef2f2;"><span class="material-symbols-outlined" style="font-size:18px;color:#ef4444;">warning</span></div><div class="metric-info"><h2 style="font-size:20px;color:#ef4444;">${atRiskStudents.length}</h2><p>Need Attention</p></div></div>
          <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-purple" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">badge</span></div><div class="metric-info"><h2 style="font-size:20px;">${schoolCounselors.length}</h2><p>Counselors</p></div></div>
          <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-orange" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">school</span></div><div class="metric-info"><h2 style="font-size:20px;">${schoolCourses.length}</h2><p>Courses</p></div></div>
          <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-blue" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">video_library</span></div><div class="metric-info"><h2 style="font-size:20px;">${content.length}</h2><p>Videos</p></div></div>
          <div class="metric-card" style="padding:14px;"><div class="metric-icon" style="width:36px;height:36px;background:#f0fdf4;"><span class="material-symbols-outlined" style="font-size:18px;color:#10b981;">check_circle</span></div><div class="metric-info"><h2 style="font-size:20px;">${completionRate}%</h2><p>Completion</p></div></div>
          <div class="metric-card" style="padding:14px;"><div class="metric-icon" style="width:36px;height:36px;background:#eff6ff;"><span class="material-symbols-outlined" style="font-size:18px;color:#3b82f6;">assignment</span></div><div class="metric-info"><h2 style="font-size:20px;">${schoolEnrollments.length}</h2><p>Enrollments</p></div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
          <div class="card" style="padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">Quick Actions</h3>
              <span style="font-size:11px;color:var(--text-muted);">What would you like to do?</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-students"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">person_add</span> Add Student</button>
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-courses"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">playlist_add</span> New Course</button>
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-assignments"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">assignment</span> Assign Course</button>
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-reports"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">bar_chart</span> View Reports</button>
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-categories"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">category</span> Categories</button>
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-videos"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">video_library</span> Videos</button>
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-notifications"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">notifications</span> Notifications${schoolNotifications.filter(n => !n.is_read).length ? `<span style="background:var(--danger);color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px;">${schoolNotifications.filter(n => !n.is_read).length}</span>` : ''}</button>
              <button class="btn btn-secondary" style="height:38px;font-size:11px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-intelligence"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">analytics</span> Intelligence</button>
            </div>
          </div>

          <div class="card" style="padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">Today's Summary</h3>
              <span style="font-size:11px;color:var(--text-muted);">${schoolStudents.length} students</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="padding:10px;background:#f0fdf4;border-radius:8px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#10b981;">${avgAttendance}%</div>
                <div style="font-size:11px;color:var(--text-secondary);">Attendance</div>
              </div>
              <div style="padding:10px;background:#eff6ff;border-radius:8px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#3b82f6;">${schoolEnrollments.filter(e => e.status === 'completed').length}</div>
                <div style="font-size:11px;color:var(--text-secondary);">Completed</div>
              </div>
              <div style="padding:10px;background:#f5f3ff;border-radius:8px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#8b5cf6;">${recentContent.length}</div>
                <div style="font-size:11px;color:var(--text-secondary);">New Videos</div>
              </div>
              <div style="padding:10px;background:#fffbeb;border-radius:8px;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#f59e0b;">${schoolNotifications.filter(n => !n.is_read).length}</div>
                <div style="font-size:11px;color:var(--text-secondary);">Notifications</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
          <div class="card" style="padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">Latest Enrollments</h3>
              <button class="btn btn-ghost btn-sm" style="font-size:11px;height:28px;" data-action="navigate" data-route="school-assignments">View All</button>
            </div>
            ${recentEnrollments.length === 0 ? `<div class="empty-state" style="padding:24px;"><span class="material-symbols-outlined" style="font-size:32px;">assignment</span><h3 style="font-size:14px;">No enrollments yet</h3></div>`
            : `<div style="display:flex;flex-direction:column;">${recentEnrollments.map(e => {
              const student = schoolStudents.find(s => s.id === e.student_id);
              const course = schoolCourses.find(c => c.id === e.course_id);
              return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
                <div style="width:28px;height:28px;border-radius:50%;background:var(--primary)12;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--primary);flex-shrink:0;">${AppUtils.getInitials(student?.name || '')}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:500;">${student?.name || 'Unknown'} → ${course?.name || 'Unknown'}</div>
                  <div style="font-size:11px;color:var(--text-secondary);">${e.status}</div>
                </div>
                <span class="status-badge ${e.status === 'active' ? 'status-active' : e.status === 'completed' ? 'status-active' : 'status-suspended'}" style="font-size:10px;">${e.status}</span>
              </div>`;
            }).join('')}</div>`}
          </div>

          <div class="card" style="padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">Recent Notifications</h3>
              <button class="btn btn-ghost btn-sm" style="font-size:11px;height:28px;" data-action="navigate" data-route="school-notifications">View All</button>
            </div>
            ${schoolNotifications.length === 0 ? `<div class="empty-state" style="padding:24px;"><span class="material-symbols-outlined" style="font-size:32px;">notifications</span><h3 style="font-size:14px;">No notifications</h3></div>`
            : `<div style="display:flex;flex-direction:column;">${schoolNotifications.slice(0, 5).map(n => `
              <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-light);${!n.is_read ? '' : 'opacity:0.6;'}">
                <span class="material-symbols-outlined" style="font-size:16px;color:${!n.is_read ? 'var(--primary)' : 'var(--text-muted)'};">${!n.is_read ? 'notifications_active' : 'notifications'}</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;font-weight:${!n.is_read ? '600' : '400'};">${n.title}</div>
                  <div style="font-size:11px;color:var(--text-secondary);">${n.message || ''}</div>
                </div>
              </div>`).join('')}</div>`}
          </div>
        </div>
      </div>`;
      initIcons();
      return;
    }

    if (this.currentRoute === 'school-categories') {
      const cats = data.categories.filter(c => c.school_id === schoolId);
      main.innerHTML = `<div class="fade-in">
        <div class="page-header">
          <div class="page-header-left">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
              <span style="font-size:12px;color:var(--text-secondary);">${schoolName}</span>
            </div>
            <h1 class="page-title">Categories</h1>
            <p class="page-subtitle">Manage grade levels and classes for ${schoolName}.</p>
          </div>
          <button class="btn btn-primary" data-action="add-category"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Category</button>
        </div>
        <div class="management-bar" style="margin-bottom:16px;">
          <div class="search-bar" style="max-width:280px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="cat-search" placeholder="Search categories..." data-action="cat-search-input"></div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-container"><table><thead><tr><th>Name</th><th>Subjects</th><th>Created</th><th style="width:120px;"></th></tr></thead><tbody>
            ${cats.length === 0 ? `<tr><td colspan="4"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">folder</span><h3>No categories yet</h3><p>Create your first category.</p></div></td></tr>`
            : cats.map(c => {
              const count = data.subjects.filter(s => s.category_id === c.id).length;
              return `<tr><td><div class="font-semibold">${c.name}</div></td><td>${count}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(c.created_at)}</td>
                <td class="td-actions" style="display:flex;gap:4px;padding-top:8px;">
                  <button class="btn btn-ghost btn-sm" data-action="open-category" data-id="${c.id}" title="Open"><span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span></button>
                  <button class="btn btn-ghost btn-sm" data-action="edit-category" data-id="${c.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                  <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-category" data-id="${c.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
                </td></tr>`;
            }).join('')}
          </tbody></table></div>
        </div>
      </div>`;
      initIcons();
      return;
    }

    if (this.currentRoute === 'school-subjects') {
      const catId = this._selectedCategoryId;
      const subjects = catId ? data.subjects.filter(s => s.category_id === catId) : data.subjects.filter(s => s.school_id === schoolId);
      const cats = data.categories.filter(c => c.school_id === schoolId);
      main.innerHTML = `<div class="fade-in">
        <div class="page-header">
          <div class="page-header-left">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-categories"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
              <span style="font-size:12px;color:var(--text-secondary);">${schoolName} / ${catId ? (cats.find(c => c.id === catId)?.name || '') : 'Subjects'}</span>
            </div>
            <h1 class="page-title">Subjects</h1>
            <p class="page-subtitle">Manage subjects within ${schoolName}.</p>
          </div>
          <button class="btn btn-primary" data-action="add-subject"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Subject</button>
        </div>
        <div class="management-bar" style="margin-bottom:16px;">
          <div class="search-bar" style="max-width:280px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="subject-search" placeholder="Search subjects..." data-action="subject-search-input"></div>
          <select class="form-select" id="subject-category-filter" style="width:160px;height:40px;font-size:13px;">
            <option value="">All Categories</option>
            ${cats.map(c => `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-container"><table><thead><tr><th>Name</th><th>Category</th><th>Sections</th><th>Created</th><th style="width:120px;"></th></tr></thead><tbody>
            ${subjects.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">auto_stories</span><h3>No subjects yet</h3><p>Create your first subject.</p></div></td></tr>`
            : subjects.map(s => {
              const cat = cats.find(c => c.id === s.category_id);
              const secCount = data.sections.filter(sec => sec.subject_id === s.id).length;
              return `<tr><td><div class="font-semibold">${s.name}</div></td><td style="font-size:13px;">${cat?.name || '—'}</td><td>${secCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(s.created_at)}</td>
                <td class="td-actions" style="display:flex;gap:4px;padding-top:8px;">
                  <button class="btn btn-ghost btn-sm" data-action="open-subject" data-id="${s.id}" title="Open"><span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span></button>
                  <button class="btn btn-ghost btn-sm" data-action="edit-subject" data-id="${s.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                  <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-subject" data-id="${s.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
                </td></tr>`;
            }).join('')}
          </tbody></table></div>
        </div>
      </div>`;
      initIcons();
      return;
    }

    if (this.currentRoute === 'school-sections') {
      const subjId = this._selectedSubjectId;
      const sections = subjId ? data.sections.filter(s => s.subject_id === subjId) : data.sections.filter(s => s.school_id === schoolId);
      const subjects = data.subjects.filter(s => s.school_id === schoolId);
      const cats = data.categories.filter(c => c.school_id === schoolId);
      main.innerHTML = `<div class="fade-in">
        <div class="page-header">
          <div class="page-header-left">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-subjects"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
              <span style="font-size:12px;color:var(--text-secondary);">${schoolName} / ${subjId ? (subjects.find(s => s.id === subjId)?.name || '') : 'Sections'}</span>
            </div>
            <h1 class="page-title">Sections</h1>
            <p class="page-subtitle">Manage sections within ${schoolName}.</p>
          </div>
          <button class="btn btn-primary" data-action="add-section"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Section</button>
        </div>
        <div class="management-bar" style="margin-bottom:16px;">
          <div class="search-bar" style="max-width:280px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="section-search" placeholder="Search sections..." data-action="section-search-input"></div>
          <select class="form-select" id="section-subject-filter" style="width:160px;height:40px;font-size:13px;">
            <option value="">All Subjects</option>
            ${subjects.map(s => `<option value="${s.id}" ${s.id === subjId ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-container"><table><thead><tr><th>Name</th><th>Subject</th><th>Category</th><th>Content</th><th>Created</th><th style="width:80px;"></th></tr></thead><tbody>
            ${sections.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">folder</span><h3>No sections yet</h3><p>Create your first section.</p></div></td></tr>`
            : sections.map(sec => {
              const subj = subjects.find(s => s.id === sec.subject_id);
              const cat = cats.find(c => c.id === subj?.category_id);
              const conCount = data.content.filter(c => c.section_id === sec.id).length;
              return `<tr><td><div class="font-semibold">${sec.name}</div></td><td style="font-size:13px;">${subj?.name || '—'}</td><td style="font-size:13px;color:var(--text-secondary);">${cat?.name || '—'}</td><td>${conCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(sec.created_at)}</td>
                <td class="td-actions" style="display:flex;gap:4px;padding-top:8px;">
                  <button class="btn btn-ghost btn-sm" data-action="edit-section" data-id="${sec.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                  <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-section" data-id="${sec.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
                </td></tr>`;
            }).join('')}
          </tbody></table></div>
        </div>
      </div>`;
      initIcons();
      return;
    }

    // School Portal routes (delegated to school-portal.js modules)
    if (this.currentRoute === 'school-students') {
      window.SchoolStudents.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-counselors') {
      window.SchoolCounselors.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-courses') {
      window.SchoolCourses.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-videos') {
      window.SchoolVideos.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-assignments') {
      window.SchoolAssignments.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-reports') {
      window.SchoolReports.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-notifications') {
      window.SchoolNotifications.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-settings') {
      window.SchoolSettings.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-profile') {
      window.SchoolProfile.render(main, data, school);
      return;
    }

    main.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">school</span><h3>School Workspace</h3><p>Navigate using the sidebar.</p></div>`;
    initIcons();
  },

  // --- CONTENT MANAGER ---
  async renderContentManager(main) {
    const data = await AppStorage.load();
    const schools = data.schools;
    const items = data.content;
    const schoolsById = {};
    schools.forEach(s => { schoolsById[s.id] = s; });
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Content Manager</h1><p class="page-subtitle">Manage all content across the platform.</p></div>
        <button class="btn btn-primary" data-action="add-content"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Content</button>
      </div>
      <div class="management-bar">
        <div class="search-bar" style="max-width:300px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="content-search" placeholder="Search content..." data-action="content-search-input"></div>
        <select class="form-select" id="content-type-filter" style="width:140px;height:44px;font-size:13px;"><option value="">All Types</option><option value="Video">Video</option><option value="PDF">PDF</option><option value="Image">Image</option><option value="Document">Document</option></select>
        <select class="form-select" id="content-school-filter" style="width:160px;height:44px;font-size:13px;"><option value="">All Schools</option>${schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${items.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">folder</span><h3>No content yet</h3><p>Create your first content item.</p></div>`
        : `<div class="table-container" id="content-table-wrapper"><table><thead><tr><th>Name</th><th>Type</th><th>School</th><th>Status</th><th>Description</th><th>Updated</th><th style="width:120px;"></th></tr></thead><tbody>${items.map(c => {
          const school = schoolsById[c.school_id] || {};
          const typeIcons = { Video: 'videocam', PDF: 'description', Image: 'image', Document: 'description' };
          return `<tr>
            <td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${typeIcons[c.type] || 'insert_drive_file'}" style="width:16px;height:16px;color:var(--primary);"></i><span class="font-semibold">${c.name}</span></div></td>
            <td style="font-size:13px;">${c.type}</td>
            <td style="font-size:13px;">${school.name || '—'}</td>
            <td><span class="status-badge ${c.status === 'published' ? 'status-active' : c.status === 'draft' ? 'status-suspended' : 'status-pending'}">${c.status}</span></td>
            <td style="font-size:13px;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.description || ''}</td>
            <td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(c.updated_at)}</td>
            <td class="td-actions"><button class="btn btn-ghost btn-sm" data-action="play-video" data-id="${c.id}" title="View"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button><button class="btn btn-ghost btn-sm" data-action="edit-content" data-id="${c.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-content" data-id="${c.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button></td></tr>`;
        }).join('')}</tbody></table></div>`}
      </div>
    </div>`;
    initIcons();
  },

  // --- DRIVE MANAGER ---
  async renderDriveManager(main) {
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Drive Manager</h1><p class="page-subtitle">Link Google Drive folders to schools, categories, and subjects. Paste a Drive folder link to connect it.</p></div>
      </div>
      <div class="explorer-layout" style="min-height:500px;">
        <div class="explorer-panel" style="width:260px;">
          <div class="explorer-header"><span class="material-symbols-outlined" style="font-size:18px;">cloud</span> All Schools</div>
          <div class="explorer-tree" id="drive-tree"></div>
        </div>
        <div class="explorer-content" id="drive-content">
          <div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">cloud</span><h3>Select a school</h3><p>Choose a school from the tree to view its folder structure and files.</p></div>
        </div>
      </div>
    </div>`;
    initIcons();
    AppDriveManager.renderTree();
  },

  // --- MEDIA LIBRARY ---
  async renderMediaLibrary(main) {
    const data = await AppStorage.load();
    const mediaItems = data.content.filter(c => c.type === 'Video' || c.type === 'Image');
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Media Library</h1><p class="page-subtitle">All video and image files across the platform.</p></div>
        <div class="search-bar" style="max-width:260px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="media-search" placeholder="Search media..." data-action="media-search"></div>
      </div>
      <div class="subjects-grid" id="media-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));">
        ${mediaItems.length === 0
          ? `<div class="empty-state" style="padding:80px 24px;grid-column:1/-1;"><span class="material-symbols-outlined" style="font-size:40px;">image</span><h3>No media files yet</h3><p>Upload videos and images to your content sections to see them here.</p></div>`
          : mediaItems.map(m => {
              const school = data.schools.find(s => s.id === m.school_id);
              const isVideo = m.type === 'Video';
              return `<div class="subject-card" style="padding:0;overflow:hidden;">
                <div style="aspect-ratio:16/9;background:${isVideo ? 'linear-gradient(135deg,#1A56DB 0%,#0A0D14 100%)' : '#F5F6F8'};display:flex;align-items:center;justify-content:center;cursor:pointer;" data-action="${isVideo ? 'play-video' : 'preview-image'}" data-id="${m.id}">
                  <i data-icon="${isVideo ? 'play_circle' : 'image'}" style="width:36px;height:36px;color:${isVideo ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};"></i>
                </div>
                <div style="padding:12px;">
                  <div style="font-size:14px;font-weight:600;">${m.name}</div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${m.type} · ${m.size || '—'} · ${school?.name || '—'}</div>
                  <div style="display:flex;gap:8px;margin-top:8px;">
                    ${isVideo ? `<button class="btn btn-primary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="play-video" data-id="${m.id}"><span class="material-symbols-outlined" style="font-size:18px;">play_arrow</span> Play</button>` : `<button class="btn btn-primary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="preview-image" data-id="${m.id}"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span> Preview</button>`}
                    <button class="btn btn-secondary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="view-content-file" data-id="${m.id}">Details</button>
                  </div>
                </div>
              </div>`;
            }).join('')
        }
      </div>
    </div>`;
    initIcons();
  },

  // --- USER MANAGEMENT ---
  async renderSchoolAdmins(main) {
    await AppUserManagement.render(main);
  },

  // --- ROLES & PERMISSIONS ---
  async renderRolesPermissions(main) {
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Roles & Permissions</h1><p class="page-subtitle">Define access control for each role.</p></div>
      </div>
      <div class="card">
        <div style="padding:20px 0;">
          <div style="padding:0 20px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
            <div class="metric-icon metric-icon-blue" style="width:40px;height:40px;"><span class="material-symbols-outlined" style="font-size:20px;">admin_panel_settings</span></div>
            <div><div style="font-weight:600;">Super Admin</div><div style="font-size:12px;color:var(--text-secondary);">Full system access - all permissions enabled by default</div></div>
            <div style="margin-left:auto;"><span class="status-badge status-active">Active</span></div>
          </div>
          <div style="padding:16px 20px 0;">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;">
              ${['Manage Schools','Manage Categories','Manage Subjects','Manage Sections','Manage Content','Manage Users','Manage Roles','View Analytics','Access Settings','Manage Drive','Manage Media Library','View Audit Log'].map(p => `
                <label class="checkbox-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;">
                  <input type="checkbox" checked disabled style="width:16px;height:16px;">
                  <span style="font-size:13px;">${p}</span>
                </label>`).join('')}
            </div>
          </div>
        </div>
        <div style="padding:20px 0;border-top:1px solid var(--border);">
          <div style="padding:0 20px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
            <div class="metric-icon metric-icon-green" style="width:40px;height:40px;"><span class="material-symbols-outlined" style="font-size:20px;">manage_accounts</span></div>
            <div><div style="font-weight:600;">School Admin</div><div style="font-size:12px;color:var(--text-secondary);">Restricted to own school</div></div>
            <div style="margin-left:auto;"><span class="status-badge status-active">Active</span></div>
          </div>
          <div style="padding:16px 20px 0;">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;">
              ${[
                { label: 'Manage School Settings', key: 'school_settings', checked: true },
                { label: 'Manage Categories', key: 'school_categories', checked: true },
                { label: 'Manage Subjects', key: 'school_subjects', checked: true },
                { label: 'Manage Sections', key: 'school_sections', checked: true },
                { label: 'Manage Content', key: 'school_content', checked: true },
                { label: 'View Analytics', key: 'school_analytics', checked: false },
                { label: 'Manage Own Profile', key: 'school_profile', checked: true },
                { label: 'Upload Drive Files', key: 'school_drive_upload', checked: false },
              ].map(p => `
                <label class="checkbox-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;">
                  <input type="checkbox" ${p.checked ? 'checked' : ''} data-action="toggle-permission" data-key="${p.key}" style="width:16px;height:16px;">
                  <span style="font-size:13px;">${p.label}</span>
                </label>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
    initIcons();
  },

  // --- COMPANY SETTINGS ---
  async renderCompanySettings(main) {
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Company Settings</h1><p class="page-subtitle">Configure global platform preferences.</p></div>
      </div>
      <div class="tab-bar" style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border);padding:0 0 0;background:transparent;border-radius:0;">
        <button class="tab-item active" data-action="settings-tab" data-tab="general" style="padding:12px 20px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--primary);color:var(--text);">General</button>
        <button class="tab-item" data-action="settings-tab" data-tab="branding" style="padding:12px 20px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;color:var(--text-secondary);">Branding</button>
        <button class="tab-item" data-action="settings-tab" data-tab="email" style="padding:12px 20px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;color:var(--text-secondary);">Email</button>
      </div>
      <div id="settings-content">
        <div class="card" style="max-width:600px;">
          <div class="card-header"><h3 class="card-title">General Settings</h3></div>
          <div style="padding:20px;">
            <div class="form-group"><label class="form-label">Company Name</label><input type="text" class="form-input" value="LanxGrow Learning" data-action="save-setting" data-key="companyName"></div>
            <div class="form-group" style="margin-top:16px;"><label class="form-label">Default Platform Language</label>
              <select class="form-select" data-action="save-setting" data-key="language"><option value="en" selected>English</option><option value="es">Spanish</option><option value="fr">French</option></select>
            </div>
            <div class="form-group" style="margin-top:16px;"><label class="form-label">Timezone</label>
              <select class="form-select" data-action="save-setting" data-key="timezone"><option value="UTC" selected>UTC (Coordinated Universal Time)</option><option value="US/Eastern">US/Eastern</option><option value="US/Pacific">US/Pacific</option></select>
            </div>
            <div class="form-group" style="margin-top:16px;"><label class="form-label">Max Upload Size (MB)</label><input type="number" class="form-input" value="100" data-action="save-setting" data-key="maxUploadSize"></div>
            <div style="margin-top:20px;display:flex;gap:12px;">
              <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
              <button class="btn btn-secondary" data-action="reset-settings" style="height:40px;font-size:13px;">Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    initIcons();
  },

  renderSettingsTab(tab) {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(t => { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--text-secondary)'; });
    const active = document.querySelector(`.tab-item[data-tab="${tab}"]`);
    if (active) { active.style.borderBottomColor = 'var(--primary)'; active.style.color = 'var(--text)'; }
    const container = document.getElementById('settings-content');
    if (!container) return;
    if (tab === 'general') {
      container.innerHTML = `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">General Settings</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">Company Name</label><input type="text" class="form-input" value="LanxGrow Learning" data-action="save-setting" data-key="companyName"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Default Platform Language</label>
            <select class="form-select" data-action="save-setting" data-key="language"><option value="en" selected>English</option><option value="es">Spanish</option><option value="fr">French</option></select>
          </div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Timezone</label>
            <select class="form-select" data-action="save-setting" data-key="timezone"><option value="UTC" selected>UTC</option><option value="US/Eastern">US/Eastern</option><option value="US/Pacific">US/Pacific</option></select>
          </div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Max Upload Size (MB)</label><input type="number" class="form-input" value="100" data-action="save-setting" data-key="maxUploadSize"></div>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
            <button class="btn btn-secondary" data-action="reset-settings" style="height:40px;font-size:13px;">Reset</button>
          </div>
        </div>
      </div>`;
    } else if (tab === 'branding') {
      container.innerHTML = `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">Branding</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">Company Logo</label><div style="width:120px;height:120px;border:2px dashed var(--border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;cursor:pointer;"><i data-icon="upload" class="icon-26" style="color:var(--text-muted);"></i></div></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Primary Color</label><div style="display:flex;align-items:center;gap:12px;"><input type="color" class="form-input" value="#1A56DB" style="width:48px;height:40px;padding:4px;"><input type="text" class="form-input" value="#1A56DB" style="flex:1;"></div></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Favicon</label><input type="file" class="form-input" accept="image/*"></div>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
            <button class="btn btn-secondary" data-action="reset-settings" style="height:40px;font-size:13px;">Reset</button>
          </div>
        </div>
      </div>`;
    } else if (tab === 'email') {
      container.innerHTML = `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">Email Configuration</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">SMTP Host</label><input type="text" class="form-input" value="smtp.sendgrid.net" data-action="save-setting" data-key="smtpHost"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">SMTP Port</label><input type="number" class="form-input" value="587" data-action="save-setting" data-key="smtpPort"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">From Address</label><input type="email" class="form-input" value="noreply@lanxgrow.com" data-action="save-setting" data-key="fromEmail"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">From Name</label><input type="text" class="form-input" value="LanxGrow Learning" data-action="save-setting" data-key="fromName"></div>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
            <button class="btn btn-secondary" data-action="test-email" style="height:40px;font-size:13px;">Send Test</button>
          </div>
        </div>
      </div>`;
    }
    initIcons();
  },

  // --- COMPANY DASHBOARD ---
  async renderCompanyDashboard(main) {
    const data = await AppStorage.load();
    const counts = await AppUtils.getTotalCounts();
    const recentContent = data.content.slice(0, 8);
    const recentLogs = (data.auditLog || []).sort((a, b) => (new Date(b.created_at) - new Date(a.created_at))).slice(0, 5);
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Platform overview at a glance.</p></div>
      </div>
      <div class="metrics-grid">
        <div class="metric-card" data-action="navigate" data-route="schools" style="cursor:pointer;">
          <div class="metric-icon metric-icon-blue"><span class="material-symbols-outlined">business</span></div>
          <div class="metric-info"><h2>${counts.schools}</h2><p>Schools</p></div>
        </div>
        <div class="metric-card" data-action="navigate" data-route="content-manager" style="cursor:pointer;">
          <div class="metric-icon metric-icon-green"><span class="material-symbols-outlined">category</span></div>
          <div class="metric-info"><h2>${counts.categories}</h2><p>Categories</p></div>
        </div>
        <div class="metric-card" data-action="navigate" data-route="content-manager" style="cursor:pointer;">
          <div class="metric-icon metric-icon-purple"><span class="material-symbols-outlined">auto_stories</span></div>
          <div class="metric-info"><h2>${counts.subjects}</h2><p>Subjects</p></div>
        </div>
        <div class="metric-card" data-action="navigate" data-route="media-library" style="cursor:pointer;">
          <div class="metric-icon metric-icon-orange"><span class="material-symbols-outlined">videocam</span></div>
          <div class="metric-info"><h2>${counts.content}</h2><p>Content Items</p></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Recent Content</h3></div>
          ${recentContent.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">video_library</span><h3>No content yet</h3><p>Content will appear here once added.</p></div>`
          : `<div class="table-container"><table><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead><tbody>${recentContent.map(c => {
            const typeIcon = { Video: 'videocam', PDF: 'description', Image: 'image', Document: 'description' };
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted);">${typeIcon[c.type] || 'insert_drive_file'}</span><span class="font-semibold">${c.name}</span></div></td>
              <td><span class="status-badge" style="background:var(--primary-subtle);color:var(--primary);">${c.type}</span></td>
              <td><span class="status-badge ${c.status === 'published' ? 'status-active' : c.status === 'draft' ? 'status-suspended' : 'status-pending'}">${c.status}</span></td>
              <td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(c.updated_at)}</td>
            </tr>`;
          }).join('')}</tbody></table></div>`}
          <div style="padding:12px 0 0;text-align:right;">
            <button class="btn btn-secondary btn-sm" data-action="navigate" data-route="content-manager">View All</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Recent Activity</h3></div>
          ${recentLogs.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">history</span><h3>No activity yet</h3></div>`
          : `<div style="display:flex;flex-direction:column;gap:0;">${recentLogs.map(l => {
            const actionColors = { created: '#10b981', edited: '#3b82f6', uploaded: '#8b5cf6', deleted: '#ef4444', suspended: '#f59e0b' };
            return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
              <div style="width:8px;height:8px;border-radius:50%;background:${actionColors[l.action] || '#94a3b8'};margin-top:6px;flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:500;color:var(--on-surface);">${l.user_name}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${l.action} ${l.entity} — ${l.entity_name}</div>
              </div>
              <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${AppUtils.formatDate(l.created_at)}</div>
            </div>`;
          }).join('')}</div>`}
        </div>
      </div>
    </div>`;
    initIcons();
  },

  // --- SCHOOLS (Company level) ---
  async renderSchools(main) {
    const data = await AppStorage.load();
    const q = (document.getElementById('school-search')?.value || '').toLowerCase();
    let schools = data.schools;
    if (q) schools = schools.filter(s => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Schools</h1><p class="page-subtitle">Manage all schools in the platform.</p></div>
        <button class="btn btn-primary" data-action="add-school"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add School</button>
      </div>
      <div class="management-bar">
        <div class="search-bar" style="max-width:300px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="school-search" placeholder="Search schools..." data-action="school-search-input"></div>
      </div>
      ${schools.length === 0 ? `<div class="card"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">business</span><h3>No schools yet</h3><p>Create your first school to get started.</p></div></div>`
      : `<div class="schools-grid">${schools.map(s => {
        const stats = { categories: data.categories.filter(c => c.school_id === s.id).length, subjects: data.subjects.filter(sub => sub.school_id === s.id).length, sections: data.sections.filter(sec => sec.school_id === s.id).length };
        const logoClass = s.status === 'suspended' ? 'school-logo-suspended' : 'school-logo-default';
        return `<div class="school-card" style="cursor:pointer;" data-action="open-school" data-id="${s.id}">
          <div class="school-card-top">
            <div class="school-logo ${logoClass}">${AppUtils.getInitials(s.name)}</div>
            <div class="school-info">
              <div class="school-name">${s.name}</div>
              <div class="school-code">Code: ${s.code}</div>
              <div class="school-admin"><span class="material-symbols-outlined" style="font-size:14px;">person</span> ${s.admin_name || 'No admin'} (${s.admin_email || '—'})</div>
            </div>
            <span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-suspended'}">${s.status}</span>
          </div>
          <div class="school-stats">
            <div class="school-stat"><div class="school-stat-value">${stats.categories}</div><div class="school-stat-label">Categories</div></div>
            <div class="school-stat"><div class="school-stat-value">${stats.subjects}</div><div class="school-stat-label">Subjects</div></div>
            <div class="school-stat"><div class="school-stat-value">${stats.sections}</div><div class="school-stat-label">Sections</div></div>
          </div>
        </div>`;
      }).join('')}</div>`}
    </div>`;
    initIcons();
  }
}; // End AppRouter

// ==============================================================
// SCHOOLS CRUD MODULE
// ==============================================================
window.AppSchools = {
  async edit(id) {
    const data = await AppStorage.load();
    const school = data.schools.find(s => s.id === id);
    if (!school) return;
    document.getElementById('entity-type').value = 'school';
    document.getElementById('entity-id').value = id;
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-school').style.display = 'block';
    document.getElementById('input-name').value = school.name;
    document.getElementById('input-code').value = school.code;
    document.getElementById('input-status').value = school.status;
    document.getElementById('modal-title').textContent = 'Edit School';
    AppModal.open('modal-entity');
  },
  async confirmDelete(id) {
    const data = await AppStorage.load();
    const school = data.schools.find(s => s.id === id);
    document.getElementById('confirm-text').textContent = school ? `Delete "${school.name}"? This will also remove all associated categories, subjects, sections, and content.` : 'Delete this school?';
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-delete-entity');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', 'school');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', id);
  },
  filter() {}, sort() {}, toggleFilter() {}, toggleSort() {},
  currentPage: 1, perPage: 50, allData: [],
  renderPage() {}
};

// ==============================================================
// USER MANAGEMENT MODULE (Sprint 2.3)
// ==============================================================
window.AppUserManagement = {
  currentTab: 'all',
  currentPage: 1,
  perPage: 20,
  searchQuery: '',

  async render(main) {
    const data = await AppStorage.load();
    const q = this.searchQuery.toLowerCase();

    let users = data.users.map(u => {
      const school = data.schools.find(s => s.id === u.schoolId);
      return { ...u, schoolName: school?.name || '—', schoolStatus: school?.status || 'inactive' };
    });

    if (this.currentTab === 'super_admin') users = users.filter(u => u.role === 'super_admin');
    else if (this.currentTab === 'school_admin') users = users.filter(u => u.role === 'school_admin');

    if (q) users = users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

    const startIdx = (this.currentPage - 1) * this.perPage;
    const pageUsers = users.slice(startIdx, startIdx + this.perPage);
    const totalPages = Math.max(1, Math.ceil(users.length / this.perPage));

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">User Management</h1><p class="page-subtitle">Manage all platform users and their roles.</p></div>
        <button class="btn btn-primary" data-action="add-user"><span class="material-symbols-outlined" style="font-size:18px;">person_add</span> Add User</button>
      </div>
      <div class="tab-bar" style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border);background:transparent;">
        ${['all', 'super_admin', 'school_admin'].map(t => `
          <button class="tab-item ${this.currentTab === t ? 'active' : ''}" data-action="um-tab" data-tab="${t}" style="padding:10px 20px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid ${this.currentTab === t ? 'var(--primary)' : 'transparent'};color:${this.currentTab === t ? 'var(--text)' : 'var(--text-secondary)'};">
            ${t === 'all' ? 'All Users' : t === 'super_admin' ? 'Super Admins' : 'School Admins'}
            <span style="margin-left:6px;font-size:11px;color:var(--text-muted);">(${users.length})</span>
          </button>
        `).join('')}
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <div class="search-bar" style="max-width:280px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="um-search" placeholder="Search users..." value="${this.searchQuery}" data-action="um-search-input"></div>
        <select class="form-select" id="um-role-filter" style="width:160px;height:40px;font-size:13px;" data-action="um-filter-role">
          <option value="">All Roles</option>
          <option value="super_admin" ${this.currentTab === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          <option value="school_admin" ${this.currentTab === 'school_admin' ? 'selected' : ''}>School Admin</option>
        </select>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${users.length === 0
          ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">manage_accounts</span><h3>No users found</h3><p>${q ? 'Try a different search term.' : 'No users match this filter.'}</p></div>`
          : `<div class="table-container"><table><thead><tr>
              <th style="width:32px;"><input type="checkbox" id="um-select-all" style="width:16px;height:16px;cursor:pointer;"></th>
              <th>User</th>
              <th>Role</th>
              <th>School</th>
              <th>Status</th>
              <th style="width:140px;"></th>
            </tr></thead><tbody>${pageUsers.map(u => {
              const isActive = u.schoolStatus === 'active';
              return `<tr>
                <td><input type="checkbox" class="um-row-check" data-id="${u.id}" style="width:16px;height:16px;cursor:pointer;"></td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="user-avatar" style="width:32px;height:32px;font-size:11px;">${AppUtils.getInitials(u.name)}</div>
                    <div>
                      <div class="font-semibold" style="font-size:13px;">${u.name}</div>
                      <div style="font-size:12px;color:var(--text-secondary);">${u.email || '—'}</div>
                    </div>
                  </div>
                </td>
                <td><span class="status-badge" style="background:${u.role === 'super_admin' ? 'var(--primary-subtle)' : 'var(--warning-light)'};color:${u.role === 'super_admin' ? 'var(--primary)' : '#92400e'};">${u.role === 'super_admin' ? 'Super Admin' : 'School Admin'}</span></td>
                <td style="font-size:13px;">${u.schoolName}</td>
                <td><span class="status-badge ${isActive ? 'status-active' : 'status-suspended'}">${isActive ? 'Active' : 'Suspended'}</span></td>
                <td class="td-actions" style="display:flex;gap:4px;padding-top:8px;">
                  <button class="btn btn-ghost btn-sm" data-action="edit-user" data-id="${u.id}" title="Edit user"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                  <button class="btn btn-ghost btn-sm ${isActive ? 'btn-danger-ghost' : ''}" data-action="${isActive ? 'deactivate-user' : 'activate-user'}" data-id="${u.id}" title="${isActive ? 'Deactivate' : 'Activate'}"><span class="material-symbols-outlined" style="font-size:16px;">${isActive ? 'block' : 'check_circle'}</span></button>
                  <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-user" data-id="${u.id}" title="Delete user"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
                </td>
              </tr>`;
            }).join('')}</tbody></table></div>`
        }
      </div>
      ${totalPages > 1 ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;">
        <button class="btn btn-secondary btn-sm" data-action="um-page" data-page="${this.currentPage - 1}" ${this.currentPage <= 1 ? 'disabled' : ''} style="height:34px;font-size:12px;">Previous</button>
        ${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `
          <button class="btn ${p === this.currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" data-action="um-page" data-page="${p}" style="height:34px;min-width:34px;font-size:12px;">${p}</button>
        `).join('')}
        <button class="btn btn-secondary btn-sm" data-action="um-page" data-page="${this.currentPage + 1}" ${this.currentPage >= totalPages ? 'disabled' : ''} style="height:34px;font-size:12px;">Next</button>
      </div>` : ''}
    </div>`;
    initIcons();
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.currentPage = 1;
    this.searchQuery = '';
    AppRouter.render();
  },

  async filter() {
    const q = (document.getElementById('um-search')?.value || '').trim();
    this.searchQuery = q;
    this.currentPage = 1;
    AppRouter.render();
  },

  async openEditModal(userId) {
    const data = await AppStorage.load();
    const user = data.users.find(u => u.id === userId);
    if (!user) return;
    const existing = document.getElementById('modal-edit-user');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-edit-user';
    overlay.innerHTML = `<div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Edit User</h3>
        <button class="modal-close" data-close-modal="modal-edit-user"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">User Name</label>
          <input type="text" class="form-input" id="edit-user-name" value="${user.name}" placeholder="Enter user name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" value="${user.email || ''}" disabled style="color:var(--text-muted);">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Email cannot be changed.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <input type="text" class="form-input" value="${user.role === 'super_admin' ? 'Super Admin' : 'School Admin'}" disabled style="color:var(--text-muted);">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-edit-user">Cancel</button>
        <button class="btn btn-primary" data-action="save-edit-user" data-id="${user.id}" id="btn-save-edit-user">Save Changes</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.classList.add('active');
    document.addEventListener('keydown', AppModal._keyHandler);
    setTimeout(() => document.getElementById('edit-user-name')?.focus(), 100);
  },

  async saveEditUser(userId) {
    const nameInput = document.getElementById('edit-user-name');
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) { AppToast.show('Name is required.', 'error'); return; }
    const btn = document.getElementById('btn-save-edit-user');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Saving...'; }
    try {
      const { error } = await supabase.from('profiles').update({ name }).eq('id', userId);
      if (error) throw error;
      AppToast.show('User name updated.', 'success');
      AppModal.close('modal-edit-user');
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to update user.', 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  },

  async confirmDeactivate(userId) {
    AppToast.show('User deactivation requires a profile status field (planned migration).', 'info');
  },

  async confirmActivate(userId) {
    AppToast.show('User activation requires a profile status field (planned migration).', 'info');
  },

  async confirmDelete(userId) {
    AppToast.show('User account deletion requires the invite-admin Edge Function (planned).', 'info');
  }
};

// ==============================================================
// CATEGORIES CRUD MODULE
// ==============================================================
window.AppCategories = {
  async openCreate() {
    document.getElementById('entity-type').value = 'category';
    document.getElementById('entity-id').value = '';
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-category').style.display = 'block';
    document.getElementById('input-name-cat').value = '';
    document.getElementById('modal-title').textContent = 'Add Category';
    AppModal.open('modal-entity');
  },
  async edit(id) {
    const data = await AppStorage.load();
    const cat = data.categories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('entity-type').value = 'category';
    document.getElementById('entity-id').value = id;
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-category').style.display = 'block';
    document.getElementById('input-name-cat').value = cat.name;
    document.getElementById('modal-title').textContent = 'Edit Category';
    AppModal.open('modal-entity');
  },
  async confirmDelete(id) {
    const data = await AppStorage.load();
    const cat = data.categories.find(c => c.id === id);
    document.getElementById('confirm-text').textContent = cat ? `Delete category "${cat.name}"? Subjects in this category will also be deleted.` : 'Delete this category?';
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-delete-entity');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', 'category');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', id);
  },
  async filter() {
    const q = (document.getElementById('cat-search')?.value || '').toLowerCase();
    const data = await AppStorage.load();
    const schoolId = AppRouter.currentSchoolId;
    const items = data.categories.filter(c => c.school_id === schoolId);
    const filtered = q ? items.filter(c => c.name.toLowerCase().includes(q)) : items;
    const tbody = document.querySelector('#main-content tbody');
    if (!tbody) return;
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">search_off</span><h3>No results</h3></div></td></tr>';
    } else {
      tbody.innerHTML = filtered.map(c => {
        const count = data.subjects.filter(s => s.category_id === c.id).length;
        return `<tr><td><div class="font-semibold">${c.name}</div></td><td>${count}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(c.created_at)}</td>
          <td class="td-actions"><button class="btn btn-ghost btn-sm" data-action="open-category" data-id="${c.id}"><span class="material-symbols-outlined" style="font-size:18px;">open_in_new</span></button><button class="btn btn-ghost btn-sm" data-action="edit-category" data-id="${c.id}"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-category" data-id="${c.id}"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button></td></tr>`;
      }).join('');
    }
    initIcons();
  }
};

// ==============================================================
// SUBJECTS CRUD MODULE
// ==============================================================
window.AppSubjects = {
  async openCreate(categoryId) {
    document.getElementById('entity-type').value = 'subject';
    document.getElementById('entity-id').value = '';
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-subject').style.display = 'block';
    document.getElementById('input-subject-name').value = '';
    const data = await AppStorage.load();
    const catSelect = document.getElementById('input-subject-category');
    const schoolId = AppRouter.currentSchoolId;
    const cats = data.categories.filter(c => c.school_id === schoolId);
    catSelect.innerHTML = `<option value="">Choose...</option>${cats.map(c => `<option value="${c.id}" ${c.id === categoryId ? 'selected' : ''}>${c.name}</option>`).join('')}`;
    document.getElementById('modal-title').textContent = 'Add Subject';
    AppModal.open('modal-entity');
  },
  async edit(id) {
    const data = await AppStorage.load();
    const subj = data.subjects.find(s => s.id === id);
    if (!subj) return;
    document.getElementById('entity-type').value = 'subject';
    document.getElementById('entity-id').value = id;
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-subject').style.display = 'block';
    document.getElementById('input-subject-name').value = subj.name;
    const catSelect = document.getElementById('input-subject-category');
    const schoolId = AppRouter.currentSchoolId;
    const cats = data.categories.filter(c => c.school_id === schoolId);
    catSelect.innerHTML = `<option value="">Choose...</option>${cats.map(c => `<option value="${c.id}" ${c.id === subj.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}`;
    document.getElementById('modal-title').textContent = 'Edit Subject';
    AppModal.open('modal-entity');
  },
  async confirmDelete(id) {
    const data = await AppStorage.load();
    const subj = data.subjects.find(s => s.id === id);
    document.getElementById('confirm-text').textContent = subj ? `Delete subject "${subj.name}"? Sections and content in this subject will also be deleted.` : 'Delete this subject?';
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-delete-entity');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', 'subject');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', id);
  },
  async filter() {
    const q = (document.getElementById('subject-search')?.value || '').toLowerCase();
    const data = await AppStorage.load();
    const schoolId = AppRouter.currentSchoolId;
    const catId = AppRouter._selectedCategoryId;
    const items = catId ? data.subjects.filter(s => s.category_id === catId) : data.subjects.filter(s => s.school_id === schoolId);
    const filtered = q ? items.filter(s => s.name.toLowerCase().includes(q)) : items;
    const tbody = document.querySelector('#main-content tbody');
    if (!tbody) return;
    const cats = data.categories.filter(c => c.school_id === schoolId);
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">search_off</span><h3>No results</h3></div></td></tr>';
    } else {
      tbody.innerHTML = filtered.map(s => {
        const cat = cats.find(c => c.id === s.category_id);
        const secCount = data.sections.filter(sec => sec.subject_id === s.id).length;
        return `<tr><td><div class="font-semibold">${s.name}</div></td><td style="font-size:13px;">${cat?.name || '—'}</td><td>${secCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(s.created_at)}</td>
          <td class="td-actions"><button class="btn btn-ghost btn-sm" data-action="open-subject" data-id="${s.id}"><span class="material-symbols-outlined" style="font-size:18px;">open_in_new</span></button><button class="btn btn-ghost btn-sm" data-action="edit-subject" data-id="${s.id}"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-subject" data-id="${s.id}"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button></td></tr>`;
      }).join('');
    }
    initIcons();
  }
};

// ==============================================================
// SECTIONS CRUD MODULE
// ==============================================================
window.AppSections = {
  async openCreate(subjectId) {
    document.getElementById('entity-type').value = 'section';
    document.getElementById('entity-id').value = '';
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-section').style.display = 'block';
    document.getElementById('input-section-name').value = '';
    const data = await AppStorage.load();
    const subjSelect = document.getElementById('input-section-subject');
    const schoolId = AppRouter.currentSchoolId;
    const subjects = data.subjects.filter(s => s.school_id === schoolId);
    subjSelect.innerHTML = `<option value="">Choose...</option>${subjects.map(s => `<option value="${s.id}" ${s.id === subjectId ? 'selected' : ''}>${s.name}</option>`).join('')}`;
    document.getElementById('modal-title').textContent = 'Add Section';
    AppModal.open('modal-entity');
  },
  async edit(id) {
    const data = await AppStorage.load();
    const sec = data.sections.find(s => s.id === id);
    if (!sec) return;
    document.getElementById('entity-type').value = 'section';
    document.getElementById('entity-id').value = id;
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-section').style.display = 'block';
    document.getElementById('input-section-name').value = sec.name;
    const subjSelect = document.getElementById('input-section-subject');
    const schoolId = AppRouter.currentSchoolId;
    const subjects = data.subjects.filter(s => s.school_id === schoolId);
    subjSelect.innerHTML = `<option value="">Choose...</option>${subjects.map(s => `<option value="${s.id}" ${s.id === sec.subject_id ? 'selected' : ''}>${s.name}</option>`).join('')}`;
    document.getElementById('modal-title').textContent = 'Edit Section';
    AppModal.open('modal-entity');
  },
  async confirmDelete(id) {
    const data = await AppStorage.load();
    const sec = data.sections.find(s => s.id === id);
    document.getElementById('confirm-text').textContent = sec ? `Delete section "${sec.name}"? Content in this section will be unlinked.` : 'Delete this section?';
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-delete-entity');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', 'section');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', id);
  },
  async filter() {
    const q = (document.getElementById('section-search')?.value || '').toLowerCase();
    const data = await AppStorage.load();
    const schoolId = AppRouter.currentSchoolId;
    const subjId = AppRouter._selectedSubjectId;
    const items = subjId ? data.sections.filter(s => s.subject_id === subjId) : data.sections.filter(s => s.school_id === schoolId);
    const filtered = q ? items.filter(s => s.name.toLowerCase().includes(q)) : items;
    const tbody = document.querySelector('#main-content tbody');
    if (!tbody) return;
    const subjects = data.subjects.filter(s => s.school_id === schoolId);
    const cats = data.categories.filter(c => c.school_id === schoolId);
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">search_off</span><h3>No results</h3></div></td></tr>';
    } else {
      tbody.innerHTML = filtered.map(s => {
        const subj = subjects.find(sub => sub.id === s.subject_id);
        const cat = cats.find(c => c.id === subj?.category_id);
        const conCount = data.content.filter(c => c.section_id === s.id).length;
        return `<tr><td><div class="font-semibold">${s.name}</div></td><td style="font-size:13px;">${subj?.name || '—'}</td><td style="font-size:13px;color:var(--text-secondary);">${cat?.name || '—'}</td><td>${conCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(s.created_at)}</td>
          <td class="td-actions"><button class="btn btn-ghost btn-sm" data-action="edit-section" data-id="${s.id}"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-section" data-id="${s.id}"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button></td></tr>`;
      }).join('');
    }
    initIcons();
  }
};

// ==============================================================
// CONTENT CRUD MODULE
// ==============================================================
window.AppContent = {
  async openCreate(sectionId) {
    const data = await AppStorage.load();
    document.getElementById('entity-type').value = 'content';
    document.getElementById('entity-id').value = '';
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-content').style.display = 'block';
    document.getElementById('input-content-name').value = '';
    document.getElementById('input-content-type').value = 'Video';
    document.getElementById('input-content-url').value = '';
    document.getElementById('input-content-size').value = '';
    document.getElementById('input-content-description').value = '';
    document.getElementById('input-content-tags').value = '';
    document.getElementById('input-content-status').value = 'draft';
    const schoolSelect = document.getElementById('input-content-school');
    schoolSelect.innerHTML = `<option value="">Choose...</option>${data.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;
    document.getElementById('input-content-section').innerHTML = '<option value="">Choose a school first</option>';
    if (sectionId) {
      const sec = data.sections.find(s => s.id === sectionId);
      if (sec) { schoolSelect.value = sec.school_id; this.populateSections(sec.school_id, sectionId); }
    }
    document.getElementById('modal-title').textContent = 'Add Content';
    AppModal.open('modal-entity');
  },
  async edit(id) {
    const data = await AppStorage.load();
    const item = data.content.find(c => c.id === id);
    if (!item) return;
    document.getElementById('entity-type').value = 'content';
    document.getElementById('entity-id').value = id;
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-content').style.display = 'block';
    document.getElementById('input-content-name').value = item.name;
    document.getElementById('input-content-type').value = item.type;
    document.getElementById('input-content-url').value = item.url || '';
    document.getElementById('input-content-size').value = item.size || '';
    document.getElementById('input-content-description').value = item.description || '';
    document.getElementById('input-content-tags').value = (item.tags || []).join(', ');
    document.getElementById('input-content-status').value = item.status;
    const schoolSelect = document.getElementById('input-content-school');
    schoolSelect.innerHTML = `<option value="">Choose...</option>${data.schools.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}`;
    schoolSelect.value = item.school_id;
    this.populateSections(item.school_id, item.section_id);
    document.getElementById('modal-title').textContent = 'Edit Content';
    AppModal.open('modal-entity');
  },
  async confirmDelete(id) {
    const data = await AppStorage.load();
    const item = data.content.find(c => c.id === id);
    document.getElementById('confirm-text').textContent = item ? `Delete content "${item.name}"?` : 'Delete this content?';
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-delete-entity');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', 'content');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', id);
  },
  async play(id) {
    const data = await AppStorage.load();
    const item = data.content.find(c => c.id === id);
    if (!item) return;
    document.getElementById('video-content-id').textContent = id;
    document.getElementById('video-player-title').textContent = item.name;
    document.getElementById('video-player-type').textContent = item.type;
    document.getElementById('video-player-size').textContent = item.size || '—';
    const metaStatus = document.getElementById('video-meta-status');
    if (metaStatus) {
      metaStatus.textContent = item.status || 'draft';
      metaStatus.style.background = item.status === 'published' ? 'rgba(16,185,129,0.1)' : item.status === 'review' ? 'rgba(245,158,11,0.1)' : 'rgba(156,163,175,0.1)';
      metaStatus.style.color = item.status === 'published' ? 'var(--success)' : item.status === 'review' ? 'var(--warning)' : 'var(--text-muted)';
    }
    const desc = document.getElementById('video-description');
    if (desc) { desc.textContent = item.description || ''; desc.style.display = item.description ? 'block' : 'none'; }
    AppModal.open('modal-video');
  },
  async populateSections(schoolId, selectedId) {
    const data = await AppStorage.load();
    const sections = data.sections.filter(s => s.school_id === schoolId);
    const select = document.getElementById('input-content-section');
    select.innerHTML = `<option value="">Choose...</option>${sections.map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${s.name}</option>`).join('')}`;
  },
  async render() {
    const q = (document.getElementById('content-search')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('content-type-filter')?.value || '';
    const schoolFilter = document.getElementById('content-school-filter')?.value || '';
    const data = await AppStorage.load();
    let items = data.content;
    if (q) items = items.filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    if (typeFilter) items = items.filter(c => c.type === typeFilter);
    if (schoolFilter) items = items.filter(c => c.school_id === schoolFilter);
    const wrapper = document.getElementById('content-table-wrapper');
    if (!wrapper) return;
    const schoolsById = {}; data.schools.forEach(s => { schoolsById[s.id] = s; });
    if (items.length === 0) {
      wrapper.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">search_off</span><h3>No matching content</h3><p>Try different filters.</p></div>';
    } else {
      const typeIcons = { Video: 'video', PDF: 'file-text', Image: 'image', Document: 'file' };
      wrapper.innerHTML = `<table><thead><tr><th>Name</th><th>Type</th><th>School</th><th>Status</th><th>Description</th><th>Updated</th><th style="width:120px;"></th></tr></thead><tbody>${items.map(c => {
        const school = schoolsById[c.school_id] || {};
        return `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${typeIcons[c.type] || 'insert_drive_file'}" style="width:16px;height:16px;color:var(--primary);"></i><span class="font-semibold">${c.name}</span></div></td>
          <td style="font-size:13px;">${c.type}</td><td style="font-size:13px;">${school.name || '—'}</td>
          <td><span class="status-badge ${c.status === 'published' ? 'status-active' : c.status === 'draft' ? 'status-suspended' : 'status-pending'}">${c.status}</span></td>
          <td style="font-size:13px;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.description || ''}</td>
          <td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(c.updated_at)}</td>
          <td class="td-actions"><button class="btn btn-ghost btn-sm" data-action="play-video" data-id="${c.id}"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span></button><button class="btn btn-ghost btn-sm" data-action="edit-content" data-id="${c.id}"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-content" data-id="${c.id}"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button></td></tr>`;
      }).join('')}</tbody></table>`;
    }
    initIcons();
  }
};

// ==============================================================
// DRIVE MANAGER MODULE
// ==============================================================
window.AppDriveManager = {
  async renderTree() {
    const data = await AppStorage.load();
    const tree = document.getElementById('drive-tree');
    if (!tree) return;
    let html = '';
    data.schools.forEach(s => {
      const hasDrive = s.drive_folder_id ? ' 🔗' : '';
      html += `<div class="explorer-item" data-id="${s.id}" data-action="drive-select"><i data-icon="building-2" style="width:16px;height:16px;"></i> ${s.name}${hasDrive ? '<span style="margin-left:auto;font-size:10px;color:var(--primary);">Drive</span>' : ''}</div>`;
      const cats = data.categories.filter(c => c.school_id === s.id);
      cats.forEach(c => {
        const hasCatDrive = c.drive_folder_id ? ' 🔗' : '';
        html += `<div class="explorer-item" style="padding-left:28px;" data-school-id="${s.id}" data-action="drive-select-folder" data-id="${c.id}"><i data-icon="folder" style="width:16px;height:16px;"></i> ${c.name}${hasCatDrive ? '<span style="margin-left:auto;font-size:10px;color:var(--primary);">Drive</span>' : ''}</div>`;
        const subs = data.subjects.filter(sub => sub.category_id === c.id);
        subs.forEach(sub => {
          const hasSubDrive = sub.drive_folder_id ? ' 🔗' : '';
          html += `<div class="explorer-item" style="padding-left:44px;" data-school-id="${s.id}" data-action="drive-select-folder" data-id="${sub.id}"><i data-icon="book-open" style="width:14px;height:14px;"></i> ${sub.name}${hasSubDrive ? '<span style="margin-left:auto;font-size:10px;color:var(--primary);">Drive</span>' : ''}</div>`;
        });
      });
    });
    tree.innerHTML = html;
    initIcons();
  },
  async showSchool(data, schoolId) {
    const school = data.schools.find(s => s.id === schoolId);
    const cats = data.categories.filter(c => c.school_id === schoolId);
    const files = data.content.filter(c => c.school_id === schoolId);
    const container = document.getElementById('drive-content');
    const driveId = school?.drive_folder_id || '';
    let html = `<div style="padding:20px 24px;border-bottom:1px solid var(--border);">
      <div style="font-size:16px;font-weight:600;">${school ? school.name : 'School'}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${cats.length} folders · ${files.length} files</div>
    </div>
    <div style="padding:16px 24px;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Google Drive Folder</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" class="form-input" id="drive-link-input" placeholder="Paste Google Drive folder link..." value="${driveId ? `https://drive.google.com/drive/folders/${driveId}` : ''}" style="flex:1;height:40px;font-size:13px;">
        <button class="btn btn-primary btn-sm" data-action="drive-link-save" data-entity-type="school" data-entity-id="${schoolId}" style="height:40px;">${driveId ? 'Update' : 'Link'}</button>
        ${driveId ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="drive-link-remove" data-entity-type="school" data-entity-id="${schoolId}" style="height:40px;"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>` : ''}
      </div>
      <div id="drive-link-status" style="font-size:12px;margin-top:6px;color:${driveId ? 'var(--success)' : 'var(--text-muted)'};">${driveId ? `Linked folder: <code style="background:var(--border-light);padding:2px 6px;border-radius:4px;">${driveId}</code>` : 'No Drive folder linked yet.'}</div>
    </div>
    <div style="padding:16px 24px;">`;
    if (cats.length === 0 && files.length === 0) {
      html += `<div class="empty-state" style="padding:32px 24px;"><span class="material-symbols-outlined" style="font-size:40px;">folder_open</span><h3>Empty folder</h3><p>This school has no content yet.</p></div>`;
    } else {
      if (cats.length > 0) {
        html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Categories</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:20px;">${cats.map(c => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);cursor:pointer;" data-action="drive-select-folder" data-id="${c.id}" data-school-id="${schoolId}">
            <i data-icon="folder" style="width:18px;height:18px;color:var(--primary);flex-shrink:0;"></i>
            <div><div style="font-size:13px;font-weight:500;">${c.name}</div><div style="font-size:11px;color:var(--text-muted);">${data.subjects.filter(s => s.category_id === c.id).length} subjects</div></div>
          </div>`).join('')}</div>`;
      }
      if (files.length > 0) {
        html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Files</div>
        <div class="table-container"><table><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Updated</th></tr></thead><tbody>${files.map(f => `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${f.type === 'Video' ? 'videocam' : f.type === 'PDF' ? 'description' : 'insert_drive_file'}" style="width:16px;height:16px;color:var(--text-muted);"></i><span class="font-semibold">${f.name}</span></div></td><td style="font-size:13px;">${f.type}</td><td style="font-size:13px;color:var(--text-secondary);">${f.size || '—'}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(f.updated_at)}</td></tr>`).join('')}</tbody></table></div>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
    initIcons();
  },
  async showFolder(data, schoolId, folderId, type) {
    const container = document.getElementById('drive-content');
    const files = data.content.filter(c => c.school_id === schoolId);
    const isCategory = type === 'category';
    const folder = isCategory ? data.categories.find(c => c.id === folderId) : data.subjects.find(s => s.id === folderId);
    const folderFiles = isCategory ? [] : files.filter(f => { const s = data.sections.find(sec => sec.id === f.section_id); return s && s.subject_id === folderId; });
    const school = data.schools.find(s => s.id === schoolId);
    const subs = isCategory ? data.subjects.filter(s => s.category_id === folderId) : [];
    const driveId = folder?.drive_folder_id || '';
    const entityType = isCategory ? 'category' : 'subject';
    let html = `<div style="padding:20px 24px;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;color:var(--text-secondary);">${school ? school.name : ''} /</div>
      <div style="font-size:16px;font-weight:600;">${folder ? folder.name : 'Folder'}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${subs.length + folderFiles.length} items</div>
    </div>
    <div style="padding:16px 24px;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Google Drive Folder</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" class="form-input" id="drive-link-input" placeholder="Paste Google Drive folder link..." value="${driveId ? `https://drive.google.com/drive/folders/${driveId}` : ''}" style="flex:1;height:40px;font-size:13px;">
        <button class="btn btn-primary btn-sm" data-action="drive-link-save" data-entity-type="${entityType}" data-entity-id="${folderId}" style="height:40px;">${driveId ? 'Update' : 'Link'}</button>
        ${driveId ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="drive-link-remove" data-entity-type="${entityType}" data-entity-id="${folderId}" style="height:40px;"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>` : ''}
      </div>
      <div id="drive-link-status" style="font-size:12px;margin-top:6px;color:${driveId ? 'var(--success)' : 'var(--text-muted)'};">${driveId ? `Linked folder: <code style="background:var(--border-light);padding:2px 6px;border-radius:4px;">${driveId}</code>` : 'No Drive folder linked yet.'}</div>
    </div>
    <div style="padding:16px 24px;">`;
    if (subs.length === 0 && folderFiles.length === 0) {
      html += `<div class="empty-state" style="padding:32px 24px;"><span class="material-symbols-outlined" style="font-size:40px;">folder_open</span><h3>Empty folder</h3><p>No content in this folder yet.</p></div>`;
    } else {
      if (subs.length > 0) {
        html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Subjects</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-bottom:20px;">${subs.map(sub => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);"><i data-icon="book-open" style="width:16px;height:16px;color:var(--success);flex-shrink:0;"></i><div><div style="font-size:13px;font-weight:500;">${sub.name}</div><div style="font-size:11px;color:var(--text-muted);">${data.sections.filter(sec => sec.subject_id === sub.id).length} sections</div></div></div>`).join('')}</div>`;
      }
      if (folderFiles.length > 0) {
        html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Files</div>
        <div class="table-container"><table><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Updated</th></tr></thead><tbody>${folderFiles.map(f => `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${f.type === 'Video' ? 'videocam' : f.type === 'PDF' ? 'description' : 'insert_drive_file'}" style="width:16px;height:16px;color:var(--text-muted);"></i><span class="font-semibold">${f.name}</span></div></td><td style="font-size:13px;">${f.type}</td><td style="font-size:13px;color:var(--text-secondary);">${f.size || '—'}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(f.updated_at)}</td></tr>`).join('')}</tbody></table></div>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
    initIcons();
  }
};

// ==============================================================
// GLOBAL SEARCH MODULE
// ==============================================================
window.AppGlobalSearch = {
  open() {
    const overlay = document.getElementById('modal-global-search');
    if (overlay) { overlay.classList.add('active'); return; }
    const html = `<div class="modal-overlay" id="modal-global-search" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:600px;margin-top:80px;align-self:flex-start;">
        <div class="modal-body" style="padding:0;">
          <div class="search-bar" style="max-width:100%;border:none;border-bottom:1px solid var(--border);border-radius:0;height:56px;padding:0 20px;">
            <i data-icon="search" style="width:20px;height:20px;"></i>
            <input type="text" id="global-search-input" placeholder="Search..." style="font-size:15px;" autofocus>
          </div>
          <div id="global-search-results" style="max-height:400px;overflow-y:auto;padding:8px 0;"><div class="empty-state" style="padding:32px 24px;"><p style="font-size:13px;color:var(--text-muted);">Type at least 2 characters to search.</p></div></div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    initIcons();
    setTimeout(() => document.getElementById('global-search-input')?.focus(), 100);
    document.getElementById('modal-global-search')?.classList.add('active');
  },
  async search(q) {
    const results = document.getElementById('global-search-results');
    if (!results) return;
    if (q.length < 2) { results.innerHTML = '<div class="empty-state" style="padding:32px 24px;"><p style="font-size:13px;color:var(--text-muted);">Type at least 2 characters to search.</p></div>'; return; }
    const data = await AppStorage.load();
    const ql = q.toLowerCase();
    const matches = [];
    data.schools.forEach(s => { if (s.name.toLowerCase().includes(ql) || s.code.toLowerCase().includes(ql)) matches.push({ type: 'School', label: s.name, sub: s.code, route: 'school-dashboard', id: s.id }); });
    data.categories.forEach(c => {
      if (c.name.toLowerCase().includes(ql)) { const school = data.schools.find(s => s.id === c.school_id); matches.push({ type: 'Category', label: c.name, sub: school ? `in ${school.name}` : '', route: 'school-categories', schoolId: c.school_id }); }
    });
    data.subjects.forEach(sub => {
      if (sub.name.toLowerCase().includes(ql)) { const school = data.schools.find(s => s.id === sub.school_id); matches.push({ type: 'Subject', label: sub.name, sub: school ? `in ${school.name}` : '', route: 'school-subjects', schoolId: sub.school_id, catId: sub.category_id }); }
    });
    data.sections.forEach(sec => {
      if (sec.name.toLowerCase().includes(ql)) { const school = data.schools.find(s => s.id === sec.school_id); matches.push({ type: 'Section', label: sec.name, sub: school ? `in ${school.name}` : '', route: 'school-sections', schoolId: sec.school_id }); }
    });
    data.content.forEach(c => {
      if (c.name.toLowerCase().includes(ql) || (c.tags && c.tags.some(t => t.toLowerCase().includes(ql)))) { const school = data.schools.find(s => s.id === c.school_id); matches.push({ type: `Content (${c.type})`, label: c.name, sub: school ? `in ${school.name}` : '', action: c.type === 'Video' ? 'play-video' : null, id: c.id }); }
    });
    if (matches.length === 0) {
      results.innerHTML = '<div class="empty-state" style="padding:32px 24px;"><i data-icon="search-x" style="width:32px;height:32px;color:var(--text-muted);"></i><h3 style="font-size:14px;">No results</h3><p style="font-size:13px;">Try a different search term.</p></div>';
    } else {
      const typeIcons = { School: 'building-2', Category: 'folder-tree', Subject: 'book-open', Section: 'folder-kanban' };
      results.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;padding:8px 20px 4px;">${matches.length} result${matches.length > 1 ? 's' : ''}</div>
      ${matches.slice(0, 15).map(m => { const icon = typeIcons[m.type.split(' ')[0]] || 'file'; const action = m.action || 'global-search-nav'; return `<div class="explorer-item" style="padding:10px 20px;border-radius:0;" data-action="${action}" data-route="${m.route || ''}" data-id="${m.id || ''}" data-school-id="${m.schoolId || ''}" data-cat-id="${m.catId || ''}"><i data-icon="${icon}" style="width:16px;height:16px;color:var(--primary);"></i><div style="flex:1;"><div style="font-size:13px;font-weight:500;">${m.label}</div><div style="font-size:11px;color:var(--text-muted);">${m.type} ${m.sub}</div></div></div>`; }).join('')}`;
    }
    initIcons();
  }
};

// ==============================================================
// AUDIT LOG MODULE
// ==============================================================
window.AppAuditLog = {
  async render(main) {
    const data = await AppStorage.load();
    const logs = (data.auditLog || []).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    main.innerHTML = `<div class="fade-in">
      <div class="page-header"><div class="page-header-left"><h1 class="page-title">Audit Log</h1><p class="page-subtitle">Track all activities across the platform.</p></div></div>
      <div class="management-bar">
        <div class="search-bar" style="max-width:300px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="audit-search" placeholder="Search activity..."></div>
        <select class="form-select" id="audit-action-filter" style="width:140px;height:44px;font-size:13px;">
          <option value="">All Actions</option><option value="created">Created</option><option value="edited">Edited</option><option value="uploaded">Uploaded</option><option value="deleted">Deleted</option><option value="suspended">Suspended</option>
        </select>
        <select class="form-select" id="audit-entity-filter" style="width:140px;height:44px;font-size:13px;">
          <option value="">All Types</option><option value="School">School</option><option value="Category">Category</option><option value="Subject">Subject</option><option value="Section">Section</option><option value="Content">Content</option>
        </select>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${logs.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">history</span><h3>No activity yet</h3></div>`
        : `<div class="table-container"><table><thead><tr><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>Date</th></tr></thead><tbody>${logs.map(l => {
          const actionColors = { created: 'var(--success)', edited: 'var(--info)', uploaded: 'var(--primary)', deleted: 'var(--danger)', suspended: 'var(--warning)' };
          return `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><div class="user-avatar" style="width:28px;height:28px;font-size:10px;">${AppUtils.getInitials(l.user_name)}</div><div><div style="font-size:13px;font-weight:500;">${l.user_name}</div></div></div></td>
            <td><span style="font-size:12px;font-weight:600;color:${actionColors[l.action] || 'var(--text-secondary)'};">${l.action.charAt(0).toUpperCase() + l.action.slice(1)}</span></td>
            <td><span style="font-size:13px;">${l.entity}</span><div style="font-size:11px;color:var(--text-muted);">${l.entity_name}</div></td>
            <td style="font-size:13px;color:var(--text-secondary);max-width:300px;">${l.detail}</td>
            <td style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">${AppUtils.formatDate(l.created_at)}</td></tr>`;
        }).join('')}</tbody></table></div>`}
      </div>
    </div>`;
    initIcons();
  },
  filter() {
    const q = (document.getElementById('audit-search')?.value || '').toLowerCase();
    const actionFilter = document.getElementById('audit-action-filter')?.value || '';
    const entityFilter = document.getElementById('audit-entity-filter')?.value || '';
    AppStorage.load().then(data => {
      const logs = (data.auditLog || []).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      let filtered = logs;
      if (q) filtered = filtered.filter(l => l.user_name.toLowerCase().includes(q) || l.entity_name.toLowerCase().includes(q) || (l.detail || '').toLowerCase().includes(q));
      if (actionFilter) filtered = filtered.filter(l => l.action === actionFilter);
      if (entityFilter) filtered = filtered.filter(l => l.entity === entityFilter);
      const container = document.querySelector('#main-content .card');
      if (!container) return;
      if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">history</span><h3>No matching activity</h3></div>`;
      } else {
        container.innerHTML = `<div class="table-container"><table><thead><tr><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>Date</th></tr></thead><tbody>${filtered.map(l => {
          const actionColors = { created: 'var(--success)', edited: 'var(--info)', uploaded: 'var(--primary)', deleted: 'var(--danger)', suspended: 'var(--warning)' };
          return `<tr><td>...</td>
            <td><span style="font-size:12px;font-weight:600;color:${actionColors[l.action] || 'var(--text-secondary)'};">${l.action.charAt(0).toUpperCase() + l.action.slice(1)}</span></td>
            <td><span style="font-size:13px;">${l.entity}</span><div style="font-size:11px;color:var(--text-muted);">${l.entity_name}</div></td>
            <td style="font-size:13px;color:var(--text-secondary);max-width:300px;">${l.detail}</td>
            <td style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">${AppUtils.formatDate(l.created_at)}</td></tr>`;
        }).join('')}</tbody></table></div>`;
      }
      initIcons();
    });
  }
};

// ==============================================================
// ENTITY FORM HANDLER
// ==============================================================
function openSchoolModal(schoolId) {
  document.getElementById('entity-type').value = 'school';
  document.getElementById('entity-id').value = '';
  document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
  document.getElementById('entity-fields-school').style.display = 'block';
  document.getElementById('input-name').value = '';
  document.getElementById('input-code').value = '';
  document.getElementById('input-admin-name').value = '';
  document.getElementById('input-admin-email').value = '';
  document.getElementById('input-admin-password').value = '';
  document.getElementById('input-status').value = 'active';
  document.getElementById('modal-title').textContent = 'Add School';
  AppModal.open('modal-entity');
}

async function handleEntitySubmit() {
  const type = document.getElementById('entity-type').value;
  const id = document.getElementById('entity-id').value;
  const isEdit = !!id;
  try {
    if (type === 'school') {
      const name = document.getElementById('input-name').value.trim();
      const code = document.getElementById('input-code').value.trim();
      if (!name || !code) { AppToast.show('Name and code are required.', 'error'); return; }
      const status = document.getElementById('input-status')?.value || 'active';
      if (isEdit) {
        await SchoolService.update(id, { name, code, status });
        AppToast.show('School updated.', 'success');
      } else {
        await SchoolService.create({ name, code, status });
        AppToast.show('School created.', 'success');
      }
    } else if (type === 'category') {
      const name = document.getElementById('input-name-cat').value.trim();
      if (!name) { AppToast.show('Name is required.', 'error'); return; }
      if (isEdit) {
        await CategoryService.update(id, { name });
        AppToast.show('Category updated.', 'success');
      } else {
        await CategoryService.create({ name, schoolId: AppRouter.currentSchoolId });
        AppToast.show('Category created.', 'success');
      }
    } else if (type === 'subject') {
      const name = document.getElementById('input-subject-name').value.trim();
      if (!name) { AppToast.show('Name is required.', 'error'); return; }
      const catId = document.getElementById('input-subject-category').value || AppRouter._selectedCategoryId;
      if (isEdit) {
        await SubjectService.update(id, { name, categoryId: catId });
        AppToast.show('Subject updated.', 'success');
      } else {
        await SubjectService.create({ name, schoolId: AppRouter.currentSchoolId, categoryId: catId });
        AppToast.show('Subject created.', 'success');
      }
    } else if (type === 'section') {
      const name = document.getElementById('input-section-name').value.trim();
      if (!name) { AppToast.show('Name is required.', 'error'); return; }
      const subjectId = document.getElementById('input-section-subject').value || AppRouter._selectedSubjectId;
      if (isEdit) {
        await SectionService.update(id, { name });
        AppToast.show('Section updated.', 'success');
      } else {
        await SectionService.create({ name, schoolId: AppRouter.currentSchoolId, subjectId });
        AppToast.show('Section created.', 'success');
      }
    } else if (type === 'content') {
      const name = document.getElementById('input-content-name').value.trim();
      if (!name) { AppToast.show('Content name is required.', 'error'); return; }
      const item = {
        name,
        type: document.getElementById('input-content-type').value,
        url: document.getElementById('input-content-url').value.trim() || null,
        size: document.getElementById('input-content-size').value.trim() || null,
        schoolId: document.getElementById('input-content-school').value,
        sectionId: document.getElementById('input-content-section').value || null,
        description: document.getElementById('input-content-description').value.trim() || null,
        tags: (document.getElementById('input-content-tags').value || '').split(',').map(t => t.trim()).filter(Boolean),
        status: document.getElementById('input-content-status').value
      };
      if (!item.schoolId) { AppToast.show('School is required.', 'error'); return; }
      if (isEdit) {
        await ContentService.update(id, item);
        AppToast.show('Content updated.', 'success');
      } else {
        await ContentService.create(item);
        AppToast.show('Content created.', 'success');
      }
    }
    AppModal.close('modal-entity');
    AppRouter.render();
  } catch (err) {
    AppToast.show(err.message || 'An error occurred.', 'error');
  }
}

// ==============================================================
// EVENT DELEGATION — CLICK
// ==============================================================
document.addEventListener('click', async function (e) {
  const el = e.target.closest('[data-action]');
  if (!el) {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay && e.target === overlay) { AppModal.close(overlay.id); }
    return;
  }
  const action = el.dataset.action;
  const id = el.dataset.id;
  const route = el.dataset.route;

  if (action === 'navigate') {
    const companyRoutes = ['content-manager','drive-manager','media-library','school-admins','roles-permissions','company-settings','audit-log'];
    const schoolRoutes = ['school-dashboard','school-categories','school-subjects','school-sections',
      'school-students','school-counselors','school-courses','school-videos',
      'school-assignments','school-reports','school-notifications','school-settings','school-profile'];
    if (schoolRoutes.includes(route)) {
      AppRouter.navigate(route, { schoolId: AppRouter.currentSchoolId });
    } else if (companyRoutes.includes(route)) {
      AppRouter.currentSchoolId = null;
      AppRouter.navigate(route);
    } else {
      AppRouter.navigate(route);
    }
    return;
  }
  if (action === 'disabled-nav') { AppToast.show('Coming in a future update.', 'success'); return; }

  // Schools
  if (action === 'add-school') { openSchoolModal(); return; }
  if (action === 'edit-school') { AppSchools.edit(id); return; }
  if (action === 'delete-school') { AppSchools.confirmDelete(id); return; }
  if (action === 'open-school') { AppRouter.navigate('school-dashboard', { schoolId: id }); return; }

  // Categories
  if (action === 'add-category') { AppCategories.openCreate(); return; }
  if (action === 'edit-category') { AppCategories.edit(id); return; }
  if (action === 'delete-category') { AppCategories.confirmDelete(id); return; }
  if (action === 'open-category') { AppRouter.navigate('school-subjects', { schoolId: AppRouter.currentSchoolId, categoryId: id }); return; }

  // Subjects
  if (action === 'add-subject') { AppSubjects.openCreate(AppRouter._selectedCategoryId); return; }
  if (action === 'edit-subject') { AppSubjects.edit(id); return; }
  if (action === 'delete-subject') { AppSubjects.confirmDelete(id); return; }
  if (action === 'open-subject') { AppRouter.navigate('school-sections', { schoolId: AppRouter.currentSchoolId, subjectId: id }); return; }

  // Sections
  if (action === 'add-section') { AppSections.openCreate(); return; }
  if (action === 'edit-section') { AppSections.edit(id); return; }
  if (action === 'delete-section') { AppSections.confirmDelete(id); return; }

  // Content
  if (action === 'add-content') { AppContent.openCreate(id); return; }
  if (action === 'edit-content') { AppContent.edit(id); return; }
  if (action === 'delete-content') { AppContent.confirmDelete(id); return; }
  if (action === 'play-video' || action === 'view-content') { AppContent.play(id); return; }
  if (action === 'view-content-file') { AppContent.play(id); return; }

  // Admin
  // User Management
  if (action === 'add-user') { AppToast.show('User invitation requires the invite-admin Edge Function (planned).', 'info'); return; }
  if (action === 'edit-user') { AppUserManagement.openEditModal(id); return; }
  if (action === 'save-edit-user') { AppUserManagement.saveEditUser(id); return; }
  if (action === 'deactivate-user') { AppUserManagement.confirmDeactivate(id); return; }
  if (action === 'activate-user') { AppUserManagement.confirmActivate(id); return; }
  if (action === 'delete-user') { AppUserManagement.confirmDelete(id); return; }
  if (action === 'um-tab') { AppUserManagement.switchTab(el.dataset.tab); return; }
  if (action === 'um-page') { AppUserManagement.currentPage = parseInt(el.dataset.page); AppUserManagement.render(document.getElementById('main-content')); return; }
  // Legacy admin handlers (kept for backward compat)
  if (action === 'delete-admin') {
    const schoolId = el.dataset.schoolId;
    document.getElementById('confirm-text').textContent = 'Remove this school admin? The school itself will not be deleted.';
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-delete-entity');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', 'admin');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', id);
    document.getElementById('btn-confirm-action').setAttribute('data-school-id', schoolId);
    return;
  }
  if (action === 'edit-admin') {
    AppUserManagement.openEditModal(id);
    return;
  }

  // Confirm delete
  if (action === 'confirm-delete-entity') {
    const etype = el.getAttribute('data-entity-type');
    const eid = el.getAttribute('data-entity-id');
    try {
      if (etype === 'school') { await SchoolService.delete(eid); AppToast.show('School deleted.', 'success'); }
      else if (etype === 'category') { await CategoryService.delete(eid); AppToast.show('Category deleted.', 'success'); }
      else if (etype === 'subject') { await SubjectService.delete(eid); AppToast.show('Subject deleted.', 'success'); }
      else if (etype === 'section') { await SectionService.delete(eid); AppToast.show('Section deleted.', 'success'); }
      else if (etype === 'content') { await ContentService.delete(eid); AppToast.show('Content deleted.', 'success'); }
      else if (etype === 'admin') {
        // Admin deletion removes the school (original behavior preserved)
        const schoolId = el.getAttribute('data-school-id');
        await SchoolService.delete(schoolId);
        AppToast.show('School admin removed.', 'success');
      }
      AppModal.close('modal-confirm');
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Delete failed.', 'error');
    }
    return;
  }

  // Drive
  if (action === 'drive-select') {
    const data = await AppStorage.load();
    AppDriveManager.showSchool(data, id);
    return;
  }
  if (action === 'drive-select-folder') {
    const data = await AppStorage.load();
    const schoolId = el.dataset.schoolId;
    const isCategory = data.categories.some(c => c.id === id);
    AppDriveManager.showFolder(data, schoolId, id, isCategory ? 'category' : 'subject');
    return;
  }

  // Drive link save
  if (action === 'drive-link-save') {
    const entityType = el.dataset.entityType;
    const entityId = el.dataset.entityId;
    const linkInput = document.getElementById('drive-link-input');
    const statusEl = document.getElementById('drive-link-status');
    if (!linkInput || !statusEl) return;
    const link = linkInput.value.trim();
    if (!link) { AppToast.show('Paste a Google Drive link first.', 'error'); return; }
    const folderId = DriveService.parseDriveLink(link);
    if (!folderId) { AppToast.show('Invalid Google Drive link. Paste a full folder URL.', 'error'); return; }
    try {
      await DriveService.setFolderId(entityType, entityId, folderId);
      AppToast.show('Drive folder linked successfully.', 'success');
      statusEl.innerHTML = `Linked folder: <code style="background:var(--border-light);padding:2px 6px;border-radius:4px;">${folderId}</code>`;
      statusEl.style.color = 'var(--success)';
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to link Drive folder.', 'error');
    }
    return;
  }

  // Drive link remove
  if (action === 'drive-link-remove') {
    const entityType = el.dataset.entityType;
    const entityId = el.dataset.entityId;
    document.getElementById('confirm-text').textContent = 'Unlink this Google Drive folder? The folder in Drive will not be affected.';
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-drive-unlink');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', entityType);
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', entityId);
    return;
  }

  // Confirm drive unlink
  if (action === 'confirm-drive-unlink') {
    const etype = el.getAttribute('data-entity-type');
    const eid = el.getAttribute('data-entity-id');
    try {
      await DriveService.removeFolderId(etype, eid);
      AppToast.show('Drive folder unlinked.', 'success');
      AppModal.close('modal-confirm');
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to unlink.', 'error');
    }
    return;
  }

  // Global Search
  if (action === 'global-search-nav') {
    const route = el.dataset.route;
    const schoolId = el.dataset.schoolId;
    const contentId = el.dataset.id;
    AppModal.close('modal-global-search');
    if (route === 'school-dashboard' && schoolId) { AppRouter.navigate('school-dashboard', { schoolId }); }
    else if (contentId) { AppContent.play(contentId); }
    else { AppRouter.navigate(route); }
    return;
  }

  // Media
  if (action === 'preview-image') { AppToast.show('Preview mode.', 'info'); return; }

  // Review
  if (action === 'add-timestamp') {
    const list = document.getElementById('timestamp-list');
    const notes = document.getElementById('review-notes');
    if (list) {
      const time = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
      const note = notes ? notes.value.trim() : '';
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:13px;';
      item.innerHTML = `<span style="color:var(--primary);font-weight:600;cursor:pointer;">${time}</span><span style="color:var(--text-secondary);">${note || 'Review note'}</span>`;
      list.appendChild(item);
      if (notes) notes.value = '';
    }
    AppToast.show('Timestamp marker added.', 'success');
    return;
  }
  if (action === 'review-approve') { AppToast.show('Content approved.', 'success'); return; }
  if (action === 'review-request') { AppToast.show('Revision requested.', 'info'); return; }
  if (action === 'review-reject') { AppToast.show('Content rejected.', 'error'); return; }

  // Settings
  if (action === 'settings-tab') { AppRouter.renderSettingsTab(el.dataset.tab); return; }
  if (action === 'save-settings') {
    const container = document.getElementById('settings-content');
    if (!container) return;
    const inputs = container.querySelectorAll('[data-action="save-setting"]');
    const settings = {};
    inputs.forEach(input => {
      const key = input.dataset.key;
      if (!key) return;
      if (input.type === 'checkbox') settings[key] = input.checked;
      else if (input.type === 'number') settings[key] = parseFloat(input.value) || 0;
      else settings[key] = input.value;
    });
    try {
      for (const [key, value] of Object.entries(settings)) {
        await window.SettingsService.set(key, value);
      }
      AppToast.show('Settings saved.', 'success');
    } catch (err) {
      AppToast.show(err.message || 'Failed to save settings.', 'error');
    }
    return;
  }
  if (action === 'test-email') {
    AppToast.show('Test email feature requires Edge Function (not implemented).', 'info');
    return;
  }
  if (action === 'reset-settings') {
    if (!confirm('Reset all settings to defaults?')) return;
    try {
      await window.SettingsService.reset();
      AppToast.show('Settings reset to defaults.', 'success');
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to reset settings.', 'error');
    }
    return;
  }

  // Toggle permissions
  if (action === 'toggle-permission') {
    const key = el.dataset.key;
    const role = 'school_admin'; // Default role being edited in Company Portal
    try {
      await window.PermissionsService.set(role, key, el.checked);
      AppToast.show(`${el.checked ? 'Enabled' : 'Disabled'} ${key.replace(/_/g, ' ')}`, 'success');
    } catch (err) {
      AppToast.show(err.message || 'Failed to update permission.', 'error');
      el.checked = !el.checked; // Revert on failure
    }
    return;
  }

  // ==============================================================
  // SCHOOL PORTAL ACTIONS
  // ==============================================================
  // Students
  if (action === 'sp-add-student') {
    const data = await AppStorage.load();
    const school = data.schools.find(s => s.id === AppRouter.currentSchoolId);
    if (school) window.SchoolStudents.openAdd(data, school);
    return;
  }
  if (action === 'sp-save-student') { window.SchoolStudents.save(false, id); return; }
  if (action === 'sp-update-student') { window.SchoolStudents.save(true, id); return; }
  if (action === 'sp-edit-student') { window.SchoolStudents.openEdit(id); return; }
  if (action === 'sp-delete-student') { window.SchoolStudents.confirmDelete(id); return; }
  if (action === 'sp-confirm-delete-student') {
    try { await window.StudentService?.delete(id); AppToast.show('Student deleted.', 'success'); AppModal.close('modal-confirm-student'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    return;
  }
  if (action === 'sp-student-page') { window.SchoolStudents.currentPage = parseInt(el.dataset.page); AppRouter.render(); return; }
  if (action === 'sp-view-student') { window.SchoolStudents.viewStudent(id); return; }
  if (action === 'sp-download-profile') { AppToast.show('Download Profile — Available in Production Version', 'info'); return; }
  if (action === 'sp-print-profile') { AppToast.show('Print — Available in Production Version', 'info'); return; }
  if (action === 'sp-student-courses') {
    AppToast.show('Course assignment management will be available in the next update.', 'info');
    return;
  }

  // Counselors
  if (action === 'sp-view-counselor') { window.SchoolCounselors.viewCounselor(id); return; }

  // Courses
  if (action === 'sp-add-course') { window.SchoolCourses.openAdd(AppRouter.currentSchoolId); return; }
  if (action === 'sp-save-course') { window.SchoolCourses.save(false, id); return; }
  if (action === 'sp-update-course') { window.SchoolCourses.save(true, id); return; }
  if (action === 'sp-edit-course') { window.SchoolCourses.openEdit(id); return; }
  if (action === 'sp-manage-course') { window.SchoolCourses.manage(id); return; }
  if (action === 'sp-view-course') { window.SchoolCourses.viewCourse(id); return; }
  if (action === 'sp-delete-course') { window.SchoolCourses.confirmDelete(id); return; }
  if (action === 'sp-confirm-delete-course') {
    try { await window.CourseService?.delete(id); AppToast.show('Course deleted.', 'success'); AppModal.close('modal-confirm-course'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    return;
  }
  if (action === 'sp-course-page') { window.SchoolCourses.currentPage = parseInt(el.dataset.page); AppRouter.render(); return; }
  if (action === 'sp-toggle-section') {
    const courseId = el.dataset.courseId;
    const sectionId = el.dataset.sectionId;
    try {
      if (el.checked) { await window.CourseService?.addSection(courseId, sectionId); AppToast.show('Section added to course.', 'success'); }
      else { await window.CourseService?.removeSection(courseId, sectionId); AppToast.show('Section removed from course.', 'success'); }
    } catch (err) { AppToast.show(err.message || 'Failed to update section.', 'error'); el.checked = !el.checked; }
    return;
  }

  // Enrollments
  if (action === 'sp-remove-enrollment') { window.SchoolAssignments.confirmRemoveEnrollment(id); return; }
  if (action === 'sp-confirm-remove-enrollment') {
    try { await window.EnrollmentService?.delete(id); AppToast.show('Enrollment removed.', 'success'); AppModal.close('modal-confirm-enrollment'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Failed to remove enrollment.', 'error'); }
    return;
  }

  // Notifications
  if (action === 'sp-mark-all-read') {
    try { const p = await AuthService.getProfile(); if (p) { await window.NotificationService?.markAllAsRead(p.id); AppToast.show('All marked as read.', 'success'); AppRouter.render(); } }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  if (action === 'sp-mark-notification-read') {
    try { await window.NotificationService?.markAsRead(id); AppRouter.render(); }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  if (action === 'sp-delete-notification') {
    try { await window.NotificationService?.delete(id); AppRouter.render(); }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  if (action === 'sp-delete-all-notifications') {
    try { const p = await AuthService.getProfile(); if (p) { await window.NotificationService?.deleteAll(p.id); AppToast.show('All notifications cleared.', 'success'); AppRouter.render(); } }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  // Notification filter change
  if (action === 'sp-notif-filter') { AppRouter.render(); return; }
  // Video actions
  if (action === 'sp-view-video') { window.SchoolVideos.viewVideo(id); return; }
  if (action === 'sp-delete-content') { window.SchoolVideos.confirmDelete(id); return; }
  if (action === 'sp-confirm-delete-content') {
    try { await window.ContentService?.delete(id); AppToast.show('Content deleted.', 'success'); AppModal.close('modal-confirm-video'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    return;
  }

  // Export (Demo)
  if (action === 'sp-export-csv') { AppToast.show('Export CSV — Available in Production Version', 'info'); return; }
  // Settings
  if (action === 'sp-save-settings') { window.SchoolSettings.save(AppRouter.currentSchoolId); return; }

  // Profile
  if (action === 'sp-edit-profile') {
    const newName = prompt('Enter your name:');
    if (newName && newName.trim()) {
      try {
        const profile = await AuthService.getProfile();
        if (profile) {
          const { error } = await supabase.from('profiles').update({ name: newName.trim() }).eq('id', profile.id);
          if (error) throw error;
          AppToast.show('Name updated.', 'success');
          AppRouter.render();
        }
      } catch (err) { AppToast.show(err.message, 'error'); }
    }
    return;
  }

  // Close modal
  if (action === 'close-modal') {
    AppModal.close(el.dataset.closeModal || el.closest('.modal-overlay')?.id);
    return;
  }
});

// ==============================================================
// SEARCH DEBOUNCE
// ==============================================================
function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

document.addEventListener('input', debounce(async function (e) {
  if (e.target.id === 'school-search') { AppRouter.renderSchools(document.getElementById('main-content')); return; }
  if (e.target.id === 'cat-search') { AppCategories.filter(); return; }
  if (e.target.id === 'subject-search') { AppSubjects.filter(); return; }
  if (e.target.id === 'section-search') { AppSections.filter(); return; }
  if (e.target.id === 'content-search') { AppContent.render(); return; }
  if (e.target.id === 'media-search') {
    const q = e.target.value.toLowerCase();
    const data = await AppStorage.load();
    const items = data.content.filter(c => c.type === 'Video' || c.type === 'Image');
    const grid = document.getElementById('media-grid');
    if (!grid) return;
    const filtered = q ? items.filter(m => m.name.toLowerCase().includes(q) || m.type.toLowerCase().includes(q)) : items;
    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="padding:80px 24px;grid-column:1/-1;"><span class="material-symbols-outlined" style="font-size:40px;">search_off</span><h3>No results</h3></div>`;
    } else {
      grid.innerHTML = filtered.map(m => {
        const school = data.schools.find(s => s.id === m.school_id);
        const isVideo = m.type === 'Video';
        return `<div class="subject-card" style="padding:0;overflow:hidden;">
          <div style="aspect-ratio:16/9;background:${isVideo ? 'linear-gradient(135deg,#1A56DB 0%,#0A0D14 100%)' : '#F5F6F8'};display:flex;align-items:center;justify-content:center;cursor:pointer;" data-action="${isVideo ? 'play-video' : 'preview-image'}" data-id="${m.id}">
            <i data-icon="${isVideo ? 'play_circle' : 'image'}" style="width:36px;height:36px;color:${isVideo ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};"></i>
          </div>
          <div style="padding:12px;">
            <div style="font-size:14px;font-weight:600;">${m.name}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${m.type} · ${m.size || '—'} · ${school?.name || '—'}</div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              ${isVideo ? `<button class="btn btn-primary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="play-video" data-id="${m.id}"><span class="material-symbols-outlined" style="font-size:18px;">play_arrow</span> Play</button>` : `<button class="btn btn-primary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="preview-image" data-id="${m.id}"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span> Preview</button>`}
              <button class="btn btn-secondary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="view-content-file" data-id="${m.id}">Details</button>
            </div>
          </div>
        </div>`;
      }).join('');
    }
    initIcons();
    return;
  }
  if (e.target.id === 'um-search') { AppUserManagement.filter(); return; }
  if (e.target.id === 'admin-search') {
    AppUserManagement.searchQuery = e.target.value;
    AppUserManagement.render(document.getElementById('main-content'));
    return;
  }
  if (e.target.id === 'global-search-input') { AppGlobalSearch.search(e.target.value); return; }
  if (e.target.id === 'audit-search') { AppAuditLog.filter(); return; }
  // School Portal input searches
  if (e.target.id === 'sp-student-search') { window.SchoolStudents?.filter(); return; }
  if (e.target.id === 'sp-course-search') { window.SchoolCourses?.filter(); return; }
  if (e.target.id === 'sp-counselor-search') { window.SchoolCounselors?.filter(); return; }
  if (e.target.id === 'sp-video-search') { window.SchoolVideos?.filter(); return; }
}, 250));

// Filter change events
document.addEventListener('change', function (e) {
  if (e.target.id === 'content-type-filter' || e.target.id === 'content-school-filter') { AppContent.render(); }
  if (e.target.id === 'audit-action-filter' || e.target.id === 'audit-entity-filter') { AppAuditLog.filter(); }
  if (e.target.id === 'um-select-all') {
    const checked = e.target.checked;
    document.querySelectorAll('.um-row-check').forEach(cb => cb.checked = checked);
  }
  if (e.target.id === 'um-role-filter') {
    const val = e.target.value;
    AppUserManagement.currentTab = val || 'all';
    AppUserManagement.currentPage = 1;
    AppUserManagement.searchQuery = '';
    const searchInput = document.getElementById('um-search');
    if (searchInput) searchInput.value = '';
    AppRouter.render();
  }
  // School Portal filter changes
  if (['sp-student-counselor','sp-student-status','sp-student-class'].includes(e.target.id)) {
    window.SchoolStudents?.filter?.();
    return;
  }
  if (e.target.id === 'sp-notif-filter') {
    AppRouter.render();
    return;
  }
});

// Content school dropdown populates sections
document.addEventListener('change', function (e) {
  if (e.target.id === 'input-content-school') { AppContent.populateSections(e.target.value); }
});

// ==============================================================
// GLOBAL SEARCH KEYBOARD SHORTCUT
// ==============================================================
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const searchModal = document.getElementById('modal-global-search');
    if (searchModal && searchModal.classList.contains('active')) { AppModal.close('modal-global-search'); }
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const searchModal = document.getElementById('modal-global-search');
    if (searchModal && searchModal.classList.contains('active')) { AppModal.close('modal-global-search'); }
    else { AppGlobalSearch.open(); }
  }
});

// ==============================================================
// INIT APP
// ==============================================================
async function initApp() {
  AppStorage.init();
  AppModal.init();

  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!email || !password) { errorEl.textContent = 'Please enter email and password.'; return; }

    const result = await AuthService.signInWithEmail(email, password);
    if (!result.success) {
      errorEl.textContent = result.error;
      return;
    }

    errorEl.textContent = '';
    document.getElementById('app-login').style.display = 'none';
    document.getElementById('app-layout').classList.remove('hidden');
    AppRouter.init();
    initIcons();
  });

  // Google OAuth
  const googleBtn = document.getElementById('btn-google-login');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      const result = await AuthService.signInWithGoogle();
      if (!result.success) {
        document.getElementById('login-error').textContent = result.error;
      }
      // Redirect handled by Supabase OAuth
    });
  }

  // Top nav
  document.getElementById('btn-topnav-search').addEventListener('click', () => { AppGlobalSearch.open(); });
  document.getElementById('btn-notifications').addEventListener('click', () => { AppToast.show('No new notifications.'); });
  document.getElementById('btn-theme-toggle').addEventListener('click', () => { AppToast.show('Dark mode coming soon.'); });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await AuthService.signOut();
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('app-login').style.display = '';
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
  });

  // Entity form save
  document.getElementById('btn-save-entity').addEventListener('click', handleEntitySubmit);
  document.getElementById('form-entity').addEventListener('submit', (e) => { e.preventDefault(); handleEntitySubmit(); });

  // Sidebar
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  });

  // Auto-login if session exists
  const session = await AuthService.getSession();
  if (session.authenticated) {
    document.getElementById('app-login').style.display = 'none';
    document.getElementById('app-layout').classList.remove('hidden');
    AppRouter.init();
    initIcons();
  }
}

document.addEventListener('DOMContentLoaded', initApp);
