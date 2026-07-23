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
  PermissionsService,
  ModuleService,
  LessonService,
  ProgressService,
  AssignmentService,
  QuizService,
  CertificateService,
  CounselorService
} from './services/index.js';

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
window.CounselorService = CounselorService;
window.SettingsService = SettingsService;
window.PermissionsService = PermissionsService;
window.ModuleService = ModuleService;
window.LessonService = LessonService;
window.ProgressService = ProgressService;
window.AssignmentService = AssignmentService;
window.QuizService = QuizService;
window.CertificateService = CertificateService;
window.supabase = supabase;

// ==============================================================
// DATA LAYER — Supabase-backed (replaces localStorage AppStorage)
// ==============================================================
window.AppStorage = {
  KEY: 'lanxgrow_cos',
  _cache: null,
  _cacheTime: 0,
  _cacheTTL: 30000,

  async init() {
    // Schema is managed by Supabase migrations — no-op
  },

  async load(forceRefresh) {
    if (!forceRefresh && this._cache && (Date.now() - this._cacheTime) < this._cacheTTL) return this._cache;
    const [schoolsRes, categoriesRes, subjectsRes, sectionsRes, contentRes, profilesRes, logsRes,
           studentsRes, coursesRes, enrollmentsRes, courseSectionsRes, notificationsRes] =
      await Promise.all([
        supabase.from('schools').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('sections').select('*').order('name'),
        supabase.from('content').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('students').select('*').order('name'),
        supabase.from('courses').select('*').order('name'),
        supabase.from('enrollments').select('*'),
        supabase.from('course_sections').select('*'),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

    const schools = schoolsRes.data || [];
    const categories = categoriesRes.data || [];
    const subjects = subjectsRes.data || [];
    const sections = sectionsRes.data || [];
    const content = contentRes.data || [];
    const profiles = profilesRes.data || [];
    const auditLog = logsRes.data || [];
    const students = studentsRes.data || [];
    const courses = coursesRes.data || [];
    const enrollments = enrollmentsRes.data || [];
    const courseSections = courseSectionsRes.data || [];
    const notifications = notificationsRes.data || [];

    const users = profiles.map(p => ({
      id: p.id,
      name: p.name,
      email: '',
      password: '',
      role: p.role,
      schoolId: p.school_id
    }));

    this._cache = { schools, categories, subjects, sections, content, users, auditLog, students, courses, enrollments, courseSections, notifications };
    this._cacheTime = Date.now();
    return this._cache;
  },

  invalidate() {
    this._cache = null;
    this._cacheTime = 0;
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
    } catch (e) {
      console.error('Failed to fetch counts:', e);
      return { schools: 0, categories: 0, subjects: 0, sections: 0, content: 0 };
    }
  },

  escapeHtml: function (str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
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
// RBAC constants
// ==============================================================
window.ROLE_LABELS = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  school_admin: 'School Admin',
  teacher: 'Teacher',
  counselor: 'Counselor',
  student: 'Student'
};
window.ROLE_COLORS = {
  super_admin: { bg: 'var(--primary-subtle)', fg: 'var(--primary)' },
  company_admin: { bg: '#eef2ff', fg: '#4338ca' },
  school_admin: { bg: 'var(--warning-light)', fg: '#92400e' },
  teacher: { bg: '#f0fdf4', fg: '#166534' },
  counselor: { bg: '#faf5ff', fg: '#7c3aed' },
  student: { bg: '#f0f9ff', fg: '#0369a1' }
};
window.ROLE_HIERARCHY = ['super_admin', 'company_admin', 'school_admin', 'teacher', 'counselor', 'student'];

// ==============================================================
// CONFIRM DIALOG — replaces native confirm()
// ==============================================================
window.AppConfirm = {
  show(message, title = 'Are you sure?') {
    return new Promise((resolve) => {
      const existing = document.getElementById('modal-app-confirm');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-app-confirm';
      overlay.innerHTML = `<div class="modal confirm-modal">
        <div class="modal-body" style="text-align:center;">
          <span class="material-symbols-outlined" style="font-size:40px;color:var(--danger);margin-bottom:12px;">warning</span>
          <h3 style="font-size:17px;font-weight:600;margin-bottom:6px;color:var(--on-surface);">${AppUtils.escapeHtml(title)}</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">${AppUtils.escapeHtml(message)}</p>
          <div class="confirm-actions" style="display:flex;justify-content:center;gap:10px;">
            <button class="btn btn-secondary" id="btn-app-confirm-cancel">Cancel</button>
            <button class="btn btn-danger" id="btn-app-confirm-ok">Confirm</button>
          </div>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.classList.add('active');
      document.addEventListener('keydown', AppModal._keyHandler);
      const cleanup = () => {
        overlay.classList.remove('active');
        document.removeEventListener('keydown', AppModal._keyHandler);
        setTimeout(() => overlay.remove(), 300);
      };
      document.getElementById('btn-app-confirm-cancel').onclick = () => { cleanup(); resolve(false); };
      document.getElementById('btn-app-confirm-ok').onclick = () => { cleanup(); resolve(true); };
    });
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
    toast.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;">${icons[type] || 'info'}</span><span>${AppUtils.escapeHtml(message)}</span>`;
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
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = 'hidden';
    }
    el.classList.add('active');
    document.addEventListener('keydown', this._keyHandler);
    const firstInput = el.querySelector('input, select, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  },
  close(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
    document.removeEventListener('keydown', this._keyHandler);
    if (id === 'modal-entity') document.getElementById('form-entity')?.reset();
    setTimeout(() => { const overlay = document.getElementById(id); if (overlay && !overlay.classList.contains('active')) overlay.remove(); }, 300);
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

  COMPANY_ADMIN_ITEMS: [
    { id: 'company-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'company-dashboard' },
    { id: 'schools', label: 'Schools', icon: 'building-2', route: 'schools' },
    { id: 'sep1', separator: true },
    { id: 'content-manager', label: 'Content Manager', icon: 'folder-kanban', route: 'content-manager' },
    { id: 'drive-manager', label: 'Drive Manager', icon: 'hard-drive', route: 'drive-manager' },
    { id: 'media-library', label: 'Media Library', icon: 'image', route: 'media-library' },
    { id: 'sep2', separator: true },
    { id: 'school-admins', label: 'School Admins', icon: 'user-cog', route: 'school-admins' },
    { id: 'company-settings', label: 'Settings', icon: 'settings', route: 'company-settings' },
    { id: 'sep3', separator: true },
    { id: 'audit-log', label: 'Audit Log', icon: 'history', route: 'audit-log' },
  ],

  SCHOOL_ITEMS: [
    { id: 'school-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-students', label: 'Students', icon: 'groups', route: 'school-students' },
    { id: 'school-counselors', label: 'Counselors', icon: 'badge', route: 'school-counselors' },
    { id: 'school-teachers', label: 'Teachers', icon: 'school', route: 'school-teachers' },
    { id: 'sep-s2', separator: true },
    { id: 'school-courses', label: 'Courses', icon: 'book-open', route: 'school-courses' },
    { id: 'school-categories', label: 'Categories', icon: 'folder-tree', route: 'school-categories' },
    { id: 'school-subjects', label: 'Subjects', icon: 'auto_stories', route: 'school-subjects' },
    { id: 'sep-s3', separator: true },
    { id: 'school-drive', label: 'Drive', icon: 'cloud', route: 'school-drive' },
    { id: 'school-videos', label: 'Video Library', icon: 'video-library', route: 'school-videos' },
    { id: 'school-assignments', label: 'Assignments', icon: 'assignment', route: 'school-assignments' },
    { id: 'sep-s4', separator: true },
    { id: 'school-reports', label: 'Reports', icon: 'bar-chart-3', route: 'school-reports' },
    { id: 'school-notifications', label: 'Notifications', icon: 'notifications', route: 'school-notifications' },
    { id: 'sep-s5', separator: true },
    { id: 'school-settings', label: 'Settings', icon: 'settings', route: 'school-settings' },
  ],

  TEACHER_ITEMS: [
    { id: 'school-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-students', label: 'Students', icon: 'groups', route: 'school-students' },
    { id: 'sep-s2', separator: true },
    { id: 'school-courses', label: 'Courses', icon: 'school', route: 'school-courses' },
    { id: 'school-assignments', label: 'Assignments', icon: 'assignment', route: 'school-assignments' },
    { id: 'sep-s3', separator: true },
    { id: 'school-reports', label: 'Reports', icon: 'bar-chart-3', route: 'school-reports' },
    { id: 'school-notifications', label: 'Notifications', icon: 'notifications', route: 'school-notifications' },
    { id: 'sep-s4', separator: true },
    { id: 'school-profile', label: 'Profile', icon: 'person', route: 'school-profile' },
  ],

  COUNSELOR_ITEMS: [
    { id: 'school-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-students', label: 'Students', icon: 'groups', route: 'school-students' },
    { id: 'sep-s2', separator: true },
    { id: 'school-reports', label: 'Reports & Analytics', icon: 'bar-chart-3', route: 'school-reports' },
    { id: 'school-notifications', label: 'Notifications', icon: 'notifications', route: 'school-notifications' },
    { id: 'sep-s3', separator: true },
    { id: 'school-profile', label: 'Profile', icon: 'person', route: 'school-profile' },
  ],

  STUDENT_ITEMS: [
    { id: 'school-dashboard', label: 'My Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-courses', label: 'My Courses', icon: 'school', route: 'school-courses' },
    { id: 'school-assignments', label: 'Assignments', icon: 'assignment', route: 'school-assignments' },
    { id: 'school-videos', label: 'Video Library', icon: 'video-library', route: 'school-videos' },
    { id: 'sep-s2', separator: true },
    { id: 'school-reports', label: 'My Progress', icon: 'bar-chart-3', route: 'school-reports' },
    { id: 'school-notifications', label: 'Notifications', icon: 'notifications', route: 'school-notifications' },
    { id: 'sep-s3', separator: true },
    { id: 'school-profile', label: 'My Profile', icon: 'person', route: 'school-profile' },
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
    'auto_stories': '<span class="material-symbols-outlined" style="font-size:20px;">auto_stories</span>',
    'cloud': '<span class="material-symbols-outlined" style="font-size:20px;">cloud</span>',
    'people': '<span class="material-symbols-outlined" style="font-size:20px;">people</span>',
    'trending_up': '<span class="material-symbols-outlined" style="font-size:20px;">trending_up</span>',
    'download': '<span class="material-symbols-outlined" style="font-size:20px;">download</span>',
    'support_agent': '<span class="material-symbols-outlined" style="font-size:20px;">support_agent</span>',
    'storage': '<span class="material-symbols-outlined" style="font-size:20px;">storage</span>',
    'celebration': '<span class="material-symbols-outlined" style="font-size:20px;">celebration</span>',
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
  _currentProfile: null,
  SCHOOL_ROUTES: ['school-dashboard','school-categories','school-subjects','school-sections',
    'school-students','school-counselors','school-courses','school-videos',
    'school-drive','school-assignments','school-reports','school-notifications',
    'school-settings','school-profile'],
  COMPANY_ROUTES: ['company-dashboard','schools','content-manager','drive-manager',
    'media-library','school-admins','roles-permissions','company-settings','audit-log'],

  COMPANY_ADMIN_ROUTES: ['company-dashboard','schools','content-manager','drive-manager',
    'media-library','school-admins','roles-permissions','company-settings','audit-log'],

  async _getProfile() {
    if (!this._currentProfile) this._currentProfile = await AuthService.getProfile();
    return this._currentProfile;
  },

  _clearProfile() {
    this._currentProfile = null;
  },

  async init() {
    this._currentProfile = await AuthService.getProfile();
    const role = this._currentProfile?.role;
    if (!role) { this.navigate('company-dashboard'); return; }
    const defaultRoute = role === 'school_admin' || role === 'teacher' || role === 'counselor'
      ? 'school-dashboard'
      : role === 'student'
        ? 'school-dashboard'
        : 'company-dashboard';
    const params = (role === 'school_admin' || role === 'teacher' || role === 'counselor' || role === 'student')
      && this._currentProfile?.school_id
      ? { schoolId: this._currentProfile.school_id }
      : {};
    if (!this.currentRoute || this.currentRoute === 'company-dashboard' && role !== 'super_admin' && role !== 'company_admin') {
      this.navigate(defaultRoute, params);
    } else {
      this.navigate(this.currentRoute, params);
    }
  },

  navigate(route, params) {
    this.currentRoute = route;
    if (params && params.schoolId) this.currentSchoolId = params.schoolId;
    this._selectedCategoryId = (params && params.categoryId) || null;
    this._selectedSubjectId = (params && params.subjectId) || null;
    if (!this.SCHOOL_ROUTES.includes(route)) {
      this.currentSchoolId = null;
    }
    this.render();
  },

  async _loadPageModule(route) {
    const pages = {
      'company-dashboard': () => import('./pages/company-dashboard.js'),
      'schools': () => import('./pages/schools.js'),
    };
    return pages[route] ? pages[route]() : null;
  },

  async render() {
    const main = document.getElementById('main-content');
    if (!main) return;
    const profile = await this._getProfile();
    if (!profile) { main.innerHTML = '<div class="empty-state"><h3>Not authenticated</h3><p>Please sign in again.</p></div>'; return; }
    this._currentProfile = profile;

    const isSchoolRoute = this.currentRoute && this.currentRoute.startsWith('school-');

    // Role-based redirect: non-admin users must always be in their school context
    if (!isSchoolRoute && this.currentRoute !== 'company-dashboard') {
      const schoolOnlyRoles = ['school_admin', 'teacher', 'counselor', 'student'];
      if (schoolOnlyRoles.includes(profile.role)) {
        this.navigate('school-dashboard', { schoolId: profile.school_id });
        return;
      }
    }

    // Redirect school-level users away from company routes
    if (!isSchoolRoute && !this.COMPANY_ROUTES.includes(this.currentRoute)) {
      const schoolOnlyRoles = ['school_admin', 'teacher', 'counselor', 'student'];
      if (schoolOnlyRoles.includes(profile.role)) {
        this.navigate('school-dashboard', { schoolId: profile.school_id });
        return;
      }
    }

    // Student auto-routed to their own student portal
    if (profile.role === 'student' && isSchoolRoute && this.currentSchoolId) {
      const data = await AppStorage.load();
      const studentRecord = (data.students || []).find(s => s.user_id === profile.id);
      if (studentRecord) {
      }
    }

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
          const schoolSidebar = profile?.role === 'teacher' ? AppSidebar.TEACHER_ITEMS
            : profile?.role === 'counselor' ? AppSidebar.COUNSELOR_ITEMS
            : profile?.role === 'student' ? AppSidebar.STUDENT_ITEMS
            : AppSidebar.SCHOOL_ITEMS;
          const canAccessCompany = profile?.role === 'super_admin' || profile?.role === 'company_admin';
          AppSidebar.render(schoolSidebar, this.currentRoute,
            canAccessCompany ? `<div class="nav-item" data-action="navigate" data-route="schools">
              <span class="material-symbols-outlined" style="font-size:20px;">chevron_left</span><span class="nav-label">Back to Schools</span>
            </div>` : ''
          );
          initIcons();
          await import('./school-portal.js');
          await this.renderSchoolWorkspace(main, profile, school, data);
          return;
        }
      }
      this.navigate('company-dashboard');
      return;
    }

    document.getElementById('sidebar').classList.add('sidebar-hq');
    const companySidebar = profile?.role === 'company_admin' ? AppSidebar.COMPANY_ADMIN_ITEMS : AppSidebar.COMPANY_ITEMS;
    AppSidebar.render(companySidebar, this.currentRoute);
    initIcons();

    if (this.currentRoute === 'company-dashboard') {
      main.innerHTML = AppSkeleton.dashboard();
    } else if (this.currentRoute === 'schools') {
      main.innerHTML = AppSkeleton.cards();
    }

    switch (this.currentRoute) {
      case 'company-dashboard':
      case 'schools': {
        const pageModule = await this._loadPageModule(this.currentRoute);
        if (pageModule) {
          const data = await AppStorage.load();
          await pageModule.render(main, data, this);
        }
        break;
      }
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
    const schoolName = AppUtils.escapeHtml(school?.name || 'School');
    const schoolId = this.currentSchoolId;

    if (this.currentRoute === 'school-dashboard') {
      const cats = data.categories.filter(c => c.school_id === schoolId);
      const subjects = data.subjects.filter(s => s.school_id === schoolId);
      const sections = data.sections.filter(sec => sec.school_id === schoolId);
      const content = data.content.filter(c => c.school_id === schoolId);
      const schoolStudents = (data.students || []).filter(s => s.school_id === schoolId);
      const schoolCourses = (data.courses || []).filter(c => c.school_id === schoolId);
      const schoolCounselors = (data.users || []).filter(c => c.schoolId === schoolId && (c.role === 'counselor' || c.role === 'school_admin'));
      const schoolEnrollments = (data.enrollments || []).filter(e => schoolStudents.some(s => s.id === e.student_id));
      const schoolNotifications = (data.notifications || []).filter(n => n.user_id === (profile ? profile.id : ''));
      const avgAttendance = schoolStudents.length ? Math.round(schoolStudents.reduce((s, st) => s + (st.attendance || 0), 0) / schoolStudents.length) : 0;
      const completionRate = schoolEnrollments.length ? Math.round(schoolEnrollments.filter(e => e.status === 'completed').length / schoolEnrollments.length * 100) : 0;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';
      const recentContent = content.slice(0, 4);
      const recentEnrollments = schoolEnrollments.slice(-4).reverse();
      const studentsStarted = schoolStudents.filter(s => (s.progress || 0) > 0 || (s.attendance || 0) > 0).length;
      const atRiskStudents = schoolStudents.filter(s => s.status === 'active' && ((s.attendance || 0) > 0 && s.attendance < 80 || (s.progress || 0) > 0 && s.progress < 50));

      const teachersCount = (data.users || []).filter(u => u.schoolId === schoolId && u.role === 'teacher').length;
      const schoolDrive = data.drive?.filter(d => d.school_id === schoolId) || [];
      const storageUsed = schoolDrive.reduce((acc, d) => acc + (parseInt(d.size) || 0), 0);
      const storageLabel = storageUsed > 1073741824 ? (storageUsed / 1073741824).toFixed(1) + 'GB' : storageUsed > 1048576 ? (storageUsed / 1048576).toFixed(1) + 'MB' : storageUsed > 1024 ? (storageUsed / 1024).toFixed(1) + 'KB' : storageUsed + 'B';

      main.innerHTML = `<div class="fade-in">
        ${isSuperAdmin ? `<div style="background:#111827;color:#d1d5db;padding:10px 16px;border-radius:var(--radius-md);margin-bottom:16px;display:flex;align-items:center;gap:12px;font-size:12px;">
          <span class="material-symbols-outlined" style="font-size:16px;">admin_panel_settings</span>
          <span style="flex:1;">SUPER ADMIN MODE — You are viewing the isolated workspace for <strong>${schoolName}</strong></span>
          <button class="btn btn-sm" style="background:#374151;color:#fff;border:none;height:28px;font-size:11px;" data-action="navigate" data-route="schools">Exit Workspace</button>
        </div>` : ''}
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;">
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
              <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#1e3a8a,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;flex-shrink:0;">${AppUtils.getInitials(schoolName)}</div>
              <div>
                <h1 style="font-size:24px;font-weight:700;margin:0;color:var(--on-surface);">${schoolName}</h1>
                <p style="margin:2px 0 0;font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
                  <span>${AppUtils.escapeHtml(school?.code || '')}</span>
                  <span style="color:var(--border);">·</span>
                  <span class="status-badge ${school?.status === 'active' ? 'status-active' : 'status-suspended'}" style="font-size:10px;">${AppUtils.escapeHtml(school?.status || 'active')}</span>
                  <span style="color:var(--border);">·</span>
                  <span>${AppUtils.escapeHtml(school?.board || '')} ${AppUtils.escapeHtml(school?.medium || '')}</span>
                </p>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:flex-start;">
            <button class="btn btn-secondary btn-sm" style="height:32px;font-size:11px;" data-action="edit-school" data-id="${schoolId}"><span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:24px;">
          <div class="metric-card" style="padding:16px;"><div class="metric-icon metric-icon-blue" style="width:38px;height:38px;"><span class="material-symbols-outlined" style="font-size:20px;">groups</span></div><div class="metric-info"><h2 style="font-size:22px;">${schoolStudents.length}</h2><p>Total Students</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon metric-icon-green" style="width:38px;height:38px;"><span class="material-symbols-outlined" style="font-size:20px;">trending_up</span></div><div class="metric-info"><h2 style="font-size:22px;">${studentsStarted}</h2><p>Active Students</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon metric-icon-purple" style="width:38px;height:38px;"><span class="material-symbols-outlined" style="font-size:20px;">people</span></div><div class="metric-info"><h2 style="font-size:22px;">${teachersCount || 0}</h2><p>Teachers</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon" style="width:38px;height:38px;background:#fef2f2;color:#ef4444;"><span class="material-symbols-outlined" style="font-size:20px;">badge</span></div><div class="metric-info"><h2 style="font-size:22px;">${schoolCounselors.length}</h2><p>Counselors</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon metric-icon-orange" style="width:38px;height:38px;"><span class="material-symbols-outlined" style="font-size:20px;">school</span></div><div class="metric-info"><h2 style="font-size:22px;">${schoolCourses.length}</h2><p>Courses</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon" style="width:38px;height:38px;background:#f0fdf4;color:#10b981;"><span class="material-symbols-outlined" style="font-size:20px;">folder</span></div><div class="metric-info"><h2 style="font-size:22px;">${cats.length}</h2><p>Categories</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon" style="width:38px;height:38px;background:#f5f3ff;color:#8b5cf6;"><span class="material-symbols-outlined" style="font-size:20px;">auto_stories</span></div><div class="metric-info"><h2 style="font-size:22px;">${subjects.length}</h2><p>Subjects</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon metric-icon-blue" style="width:38px;height:38px;"><span class="material-symbols-outlined" style="font-size:20px;">video_library</span></div><div class="metric-info"><h2 style="font-size:22px;">${content.length}</h2><p>Videos</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon" style="width:38px;height:38px;background:#fffbeb;color:#f59e0b;"><span class="material-symbols-outlined" style="font-size:20px;">storage</span></div><div class="metric-info"><h2 style="font-size:22px;">${storageLabel}</h2><p>Storage Used</p></div></div>
          <div class="metric-card" style="padding:16px;"><div class="metric-icon" style="width:38px;height:38px;background:#fee2e2;color:#ef4444;"><span class="material-symbols-outlined" style="font-size:20px;">notifications</span></div><div class="metric-info"><h2 style="font-size:22px;">${schoolNotifications.filter(n => !n.is_read).length}</h2><p>Notifications</p></div></div>
        </div>

        <div class="card" style="padding:20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h3 style="margin:0;font-size:15px;font-weight:600;">Quick Actions</h3>
            <span style="font-size:12px;color:var(--text-muted);">${dateStr}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-students"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">person_add</span> Add Student</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-counselors"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">support_agent</span> Add Counselor</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="disabled-nav"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">school</span> Add Teacher</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-courses"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">playlist_add</span> Create Course</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-assignments"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">assignment</span> Assign Course</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-categories"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">folder</span> Categories</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-reports"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">bar_chart</span> Reports</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="disabled-nav"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">cloud</span> Drive</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-videos"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">video_library</span> Videos</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-notifications"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">notifications</span> Notifications${schoolNotifications.filter(n => !n.is_read).length ? `<span style="background:var(--danger);color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px;">${schoolNotifications.filter(n => !n.is_read).length}</span>` : ''}</button>
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-settings"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">settings</span> Settings</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="card" style="padding:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">School Information</h3>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
              <div style="padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-secondary);">Principal</span><br><span style="font-weight:500;">${AppUtils.escapeHtml(school?.principal_name || '—')}</span></div>
              <div style="padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-secondary);">Contact</span><br><span style="font-weight:500;">${AppUtils.escapeHtml(school?.contact_person || school?.principal_name || '—')}</span></div>
              <div style="padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-secondary);">Phone</span><br><span style="font-weight:500;">${AppUtils.escapeHtml(school?.phone || '—')}</span></div>
              <div style="padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-secondary);">Email</span><br><span style="font-weight:500;">${AppUtils.escapeHtml(school?.email || '—')}</span></div>
              <div style="padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-secondary);">Address</span><br><span style="font-weight:500;">${[school?.address_line1, school?.city, school?.state].filter(Boolean).join(', ') || '—'}</span></div>
              <div style="padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-secondary);">Plan</span><br><span class="status-badge status-active" style="font-size:10px;text-transform:capitalize;">${AppUtils.escapeHtml(school?.plan || 'basic')}</span></div>
            </div>
          </div>

          <div class="card" style="padding:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h3 style="margin:0;font-size:14px;font-weight:600;">Today's Summary</h3>
              <span style="font-size:11px;color:var(--text-muted);">${schoolStudents.length} active students</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="padding:10px;background:#f0fdf4;border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:700;color:#10b981;">${avgAttendance}%</div>
                <div style="font-size:11px;color:var(--text-secondary);">Attendance</div>
              </div>
              <div style="padding:10px;background:#eff6ff;border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:700;color:#3b82f6;">${completionRate}%</div>
                <div style="font-size:11px;color:var(--text-secondary);">Completion Rate</div>
              </div>
              <div style="padding:10px;background:#f5f3ff;border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:700;color:#8b5cf6;">${atRiskStudents.length}</div>
                <div style="font-size:11px;color:var(--text-secondary);">Need Attention</div>
              </div>
              <div style="padding:10px;background:#fffbeb;border-radius:8px;text-align:center;">
                <div style="font-size:20px;font-weight:700;color:#f59e0b;">${schoolEnrollments.filter(e => e.status === 'completed').length}</div>
                <div style="font-size:11px;color:var(--text-secondary);">Completed</div>
              </div>
            </div>
          </div>
        </div>

        ${recentContent.length > 0 ? `<div class="card" style="padding:20px;margin-top:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h3 style="margin:0;font-size:14px;font-weight:600;">Recently Uploaded Content</h3>
            <button class="btn btn-ghost btn-sm" style="font-size:11px;" data-action="navigate" data-route="school-videos">View All</button>
          </div>
          <div class="subjects-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;">${recentContent.map(c => {
            const isVideo = c.type === 'Video';
            return `<div class="subject-card" style="padding:0;overflow:hidden;cursor:pointer;" data-action="${isVideo ? 'play-video' : 'preview-image'}" data-id="${c.id}">
              <div style="aspect-ratio:16/9;background:${isVideo ? 'linear-gradient(135deg,#1A56DB 0%,#0A0D14 100%)' : '#F5F6F8'};display:flex;align-items:center;justify-content:center;">
                <i data-icon="${isVideo ? 'play_circle' : 'image'}" style="width:32px;height:32px;color:${isVideo ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};"></i>
              </div>
              <div style="padding:10px;">
                <div style="font-size:13px;font-weight:600;">${AppUtils.escapeHtml(c.name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">${AppUtils.escapeHtml(c.type)} · ${AppUtils.escapeHtml(c.size || '—')}</div>
              </div>
            </div>`;
          }).join('')}</div>
        </div>` : ''}

        ${schoolCourses.slice(0, 5).length > 0 ? `<div class="card" style="padding:20px;margin-top:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h3 style="margin:0;font-size:14px;font-weight:600;">Recent Courses</h3>
            <button class="btn btn-ghost btn-sm" style="font-size:11px;" data-action="navigate" data-route="school-courses">View All</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">${schoolCourses.slice(0, 5).map(c => {
            const cat = data.categories.find(cat => cat.id === c.category_id);
            const sub = data.subjects.find(sub => sub.id === c.subject_id);
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
              <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--primary),#6366f1);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${AppUtils.getInitials(c.name)}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:500;">${AppUtils.escapeHtml(c.name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);">${cat ? AppUtils.escapeHtml(cat.name) : ''}${sub ? ' · ' + AppUtils.escapeHtml(sub.name) : ''}</div>
              </div>
              <span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${c.difficulty === 'beginner' ? '#f0fdf4' : c.difficulty === 'advanced' ? '#fef2f2' : '#fffbeb'};color:${c.difficulty === 'beginner' ? '#16a34a' : c.difficulty === 'advanced' ? '#dc2626' : '#d97706'};">${AppUtils.escapeHtml(c.difficulty || 'intermediate')}</span>
              <span class="status-badge ${c.publish_status === 'published' ? 'status-active' : 'status-pending'}">${AppUtils.escapeHtml(c.publish_status || 'draft')}</span>
            </div>`;
          }).join('')}</div>
        </div>` : ''}
      </div>`;
      initIcons();
      return;
    }

    if (this.currentRoute === 'school-categories') {
      const allCats = data.categories.filter(c => c.school_id === schoolId);
      const parentId = this._selectedCategoryId || null;
      const cats = parentId ? allCats.filter(c => c.parent_id === parentId) : allCats.filter(c => !c.parent_id);
      const parentCat = parentId ? allCats.find(c => c.id === parentId) : null;

      function renderCategoryTree(catId, depth) {
        const children = allCats.filter(c => c.parent_id === catId);
        if (children.length === 0) return '';
        return children.map(child => {
          const subCount = data.subjects.filter(s => s.category_id === child.id).length;
          const grandChildren = allCats.filter(c => c.parent_id === child.id);
          const hasChildren = grandChildren.length > 0;
          return `<div style="padding-left:${depth * 20}px;">
            <div style="display:flex;align-items:center;padding:8px 12px;border-left:2px solid var(--border);margin-bottom:2px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;transition:background var(--transition);" class="tree-item">
              <span class="material-symbols-outlined" style="font-size:16px;color:${hasChildren ? 'var(--warning)' : 'var(--text-muted)'};margin-right:8px;">${hasChildren ? 'folder' : 'description'}</span>
              <span style="flex:1;font-size:13px;font-weight:500;">${AppUtils.escapeHtml(child.name)}</span>
              <span style="font-size:11px;color:var(--text-muted);margin-right:12px;">${subCount} subjects</span>
              ${hasChildren ? `<button class="btn btn-ghost btn-sm" data-action="open-category" data-id="${child.id}" title="Open" style="height:26px;width:26px;padding:0;"><span class="material-symbols-outlined" style="font-size:14px;">open_in_new</span></button>` : ''}
              <button class="btn btn-ghost btn-sm" data-action="edit-category" data-id="${child.id}" title="Edit" style="height:26px;width:26px;padding:0;"><span class="material-symbols-outlined" style="font-size:14px;">edit</span></button>
              <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-category" data-id="${child.id}" title="Delete" style="height:26px;width:26px;padding:0;"><span class="material-symbols-outlined" style="font-size:14px;">delete</span></button>
            </div>
            ${renderCategoryTree(child.id, depth + 1)}
          </div>`;
        }).join('');
      }

      main.innerHTML = `<div class="fade-in">
        <div class="page-header">
          <div class="page-header-left">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              ${parentId ? `<button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-categories" data-id="">` : `<button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard">`}<span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
              <span style="font-size:12px;color:var(--text-secondary);">${schoolName}${parentCat ? ' / ' + AppUtils.escapeHtml(parentCat.name) : ''}</span>
            </div>
            <h1 class="page-title">${parentCat ? AppUtils.escapeHtml(parentCat.name) : 'Categories'}</h1>
            <p class="page-subtitle">${parentCat ? 'Sub-categories under ' + AppUtils.escapeHtml(parentCat.name) : 'Manage the category hierarchy for ' + schoolName}.</p>
          </div>
          <button class="btn btn-primary" data-action="add-category"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add ${parentCat ? 'Sub-category' : 'Category'}</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          ${cats.length === 0 ? `<div class="empty-state" style="padding:40px;"><span class="material-symbols-outlined" style="font-size:40px;">folder</span><h3>No ${parentCat ? 'sub-categories' : 'categories'} yet</h3><p>${parentCat ? 'Add sub-categories to organize content under ' + AppUtils.escapeHtml(parentCat.name) + '.' : 'Create your first category to organize your curriculum.'}</p></div>`
          : `<div style="padding:8px 0;">${cats.map(c => {
            const subCount = data.subjects.filter(s => s.category_id === c.id).length;
            const childCount = allCats.filter(ch => ch.parent_id === c.id).length;
            return `<div style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border);transition:background var(--transition);" class="tree-root-item">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary);margin-right:10px;">${childCount > 0 ? 'folder' : 'folder_open'}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:600;">${AppUtils.escapeHtml(c.name)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${subCount} subjects · ${childCount} sub-categories</div>
              </div>
              <div style="display:flex;gap:4px;">
                ${childCount > 0 || subCount > 0 ? `<button class="btn btn-ghost btn-sm" data-action="open-category" data-id="${c.id}" title="Open" style="height:30px;font-size:11px;"><span class="material-symbols-outlined" style="font-size:14px;">open_in_new</span> Open</button>` : ''}
                <button class="btn btn-ghost btn-sm" data-action="edit-category" data-id="${c.id}" title="Edit" style="height:30px;width:30px;padding:0;"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-category" data-id="${c.id}" title="Delete" style="height:30px;width:30px;padding:0;"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
              </div>
            </div>`;
          }).join('')}</div>`}
        </div>
        ${parentId ? `<div style="margin-top:16px;">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Subjects under ${AppUtils.escapeHtml(parentCat?.name || '')}</div>
          <div class="card" style="padding:0;overflow:hidden;">
            <div class="table-container"><table><thead><tr><th>Name</th><th>Sub-category</th><th>Sections</th><th style="width:80px;"></th></tr></thead><tbody>
              ${(() => {
                const parentSubjectIds = allCats.filter(c => c.parent_id === parentId || c.id === parentId).map(c => c.id);
                const subs = data.subjects.filter(s => parentSubjectIds.includes(s.category_id));
                return subs.length === 0 ? `<tr><td colspan="4"><div class="empty-state" style="padding:20px;"><span class="material-symbols-outlined" style="font-size:24px;">auto_stories</span><h3 style="font-size:13px;">No subjects in this category</h3></div></td></tr>`
                : subs.map(sub => {
                  const secCount = data.sections.filter(sec => sec.subject_id === sub.id).length;
                  const subCat = allCats.find(c => c.id === sub.category_id);
                  return `<tr><td><span class="font-semibold">${AppUtils.escapeHtml(sub.name)}</span></td><td style="font-size:13px;color:var(--text-secondary);">${subCat ? AppUtils.escapeHtml(subCat.name) : '—'}</td><td>${secCount}</td>
                    <td class="td-actions"><button class="btn btn-ghost btn-sm" data-action="open-subject" data-id="${sub.id}" title="Open"><span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span></button></td></tr>`;
                }).join('');
              })()}
            </tbody></table></div>
          </div>
        </div>` : ''}
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
              <span style="font-size:12px;color:var(--text-secondary);">${schoolName} / ${catId ? AppUtils.escapeHtml(cats.find(c => c.id === catId)?.name || '') : 'Subjects'}</span>
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
            ${cats.map(c => `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${AppUtils.escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-container"><table><thead><tr><th>Name</th><th>Category</th><th>Sections</th><th>Created</th><th style="width:120px;"></th></tr></thead><tbody>
            ${subjects.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">auto_stories</span><h3>No subjects yet</h3><p>Create your first subject.</p></div></td></tr>`
            : subjects.map(s => {
              const cat = cats.find(c => c.id === s.category_id);
              const secCount = data.sections.filter(sec => sec.subject_id === s.id).length;
              return `<tr><td><div class="font-semibold">${AppUtils.escapeHtml(s.name)}</div></td><td style="font-size:13px;">${AppUtils.escapeHtml(cat?.name || '—')}</td><td>${secCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(s.created_at)}</td>
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
              <span style="font-size:12px;color:var(--text-secondary);">${schoolName} / ${subjId ? AppUtils.escapeHtml(subjects.find(s => s.id === subjId)?.name || '') : 'Sections'}</span>
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
            ${subjects.map(s => `<option value="${s.id}" ${s.id === subjId ? 'selected' : ''}>${AppUtils.escapeHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-container"><table><thead><tr><th>Name</th><th>Subject</th><th>Category</th><th>Content</th><th>Created</th><th style="width:80px;"></th></tr></thead><tbody>
            ${sections.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">folder</span><h3>No sections yet</h3><p>Create your first section.</p></div></td></tr>`
            : sections.map(sec => {
              const subj = subjects.find(s => s.id === sec.subject_id);
              const cat = cats.find(c => c.id === subj?.category_id);
              const conCount = data.content.filter(c => c.section_id === sec.id).length;
              return `<tr><td><div class="font-semibold">${AppUtils.escapeHtml(sec.name)}</div></td><td style="font-size:13px;">${AppUtils.escapeHtml(subj?.name || '—')}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.escapeHtml(cat?.name || '—')}</td><td>${conCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(sec.created_at)}</td>
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
    if (this.currentRoute === 'school-teachers') {
      main.innerHTML = `<div class="fade-in">
        <div class="page-header">
          <div class="page-header-left">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
              <span style="font-size:12px;color:var(--text-secondary);">${schoolName}</span>
            </div>
            <h1 class="page-title">Teachers</h1><p class="page-subtitle">Manage teachers for ${schoolName}.</p>
          </div>
        </div>
        <div class="card">
          <div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">school</span><h3>Teacher Management</h3><p>Teacher management will be available in a future update.</p></div>
        </div>
      </div>`;
      initIcons();
      return;
    }
    if (this.currentRoute === 'school-courses') {
      window.SchoolCourses.render(main, data, school);
      return;
    }
    if (this.currentRoute === 'school-drive') {
      await this.renderSchoolDrive(main, data, school, schoolId);
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

  // --- SCHOOL DRIVE MANAGER ---
  async renderSchoolDrive(main, data, school, schoolId) {
    const cats = data.categories.filter(c => c.school_id === schoolId);
    const subjects = data.subjects.filter(s => s.school_id === schoolId);
    const content = data.content.filter(c => c.school_id === schoolId);
    const sections = data.sections.filter(s => s.school_id === schoolId);
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;margin-bottom:4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
          <h1 class="page-title">Drive</h1><p class="page-subtitle">Google Drive folders linked to ${AppUtils.escapeHtml(school.name)}.</p>
        </div>
      </div>
      <div class="explorer-layout" style="min-height:400px;">
        <div class="explorer-panel" style="width:240px;">
          <div class="explorer-header"><span class="material-symbols-outlined" style="font-size:18px;">folder</span> Structure</div>
          <div class="explorer-tree" id="school-drive-tree">${['school','category','subject','section'].map(type => {
            const items = type === 'school' ? [school] : type === 'category' ? cats : type === 'subject' ? subjects : sections;
            return items.map(item => {
              const label = item.name || item.code || item.id;
              const hasDrive = item.drive_folder_id ? '<span style="margin-left:auto;font-size:10px;color:var(--primary);">🔗</span>' : '';
              return `<div class="explorer-item" data-action="school-drive-select" data-type="${type}" data-id="${item.id}" style="${type !== 'school' ? `padding-left:${type === 'category' ? 16 : type === 'subject' ? 32 : 48}px` : ''}">
                <i data-icon="${type === 'school' ? 'building-2' : type === 'category' ? 'folder' : type === 'subject' ? 'book-open' : 'folder-kanban'}" style="width:16px;height:16px;"></i>
                <span>${AppUtils.escapeHtml(label)}</span>${hasDrive}
              </div>`;
            }).join('');
          }).join('')}</div>
        </div>
        <div class="explorer-content" id="school-drive-content">
          <div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">cloud</span><h3>Select an item</h3><p>Choose a category, subject, or section from the tree to view or link a Google Drive folder.</p></div>
        </div>
      </div>
    </div>`;
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
        <div class="page-header-left"><h1 class="page-title">Content Library</h1><p class="page-subtitle">Manage all content across the platform — videos, PDFs, images, documents, and more.</p></div>
        <button class="btn btn-primary" data-action="add-content"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Content</button>
      </div>
      <div class="management-bar">
        <div class="search-bar" style="max-width:300px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="content-search" placeholder="Search content..." data-action="content-search-input"></div>
        <select class="form-select" id="content-type-filter" style="width:140px;height:44px;font-size:13px;"><option value="">All Types</option><option value="Video">Video</option><option value="PDF">PDF</option><option value="Image">Image</option><option value="Document">Document</option><option value="Other">Other</option></select>
        <select class="form-select" id="content-school-filter" style="width:160px;height:44px;font-size:13px;"><option value="">All Schools</option>${schools.map(s => `<option value="${s.id}">${AppUtils.escapeHtml(s.name)}</option>`).join('')}</select>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${items.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">folder</span><h3>No content yet</h3><p>Create your first content item.</p></div>`
        : `<div class="table-container" id="content-table-wrapper"><table><thead><tr><th>Name</th><th>Type</th><th>School</th><th>Category</th><th>Subject</th><th>Status</th><th>Updated</th><th style="width:120px;"></th></tr></thead><tbody>${items.map(c => {
          const school = schoolsById[c.school_id] || {};
          const cat = data.categories.find(cat => cat.id === c.category_id);
          const sub = data.subjects.find(sub => sub.id === c.subject_id);
          const typeIcons = { Video: 'videocam', PDF: 'description', Image: 'image', Document: 'description' };
          return `<tr>
            <td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${typeIcons[c.type] || 'insert_drive_file'}" style="width:16px;height:16px;color:var(--primary);"></i><span class="font-semibold">${AppUtils.escapeHtml(c.name)}</span></div></td>
            <td style="font-size:13px;">${AppUtils.escapeHtml(c.type)}</td>
            <td style="font-size:13px;">${AppUtils.escapeHtml(school.name || '—')}</td>
            <td style="font-size:13px;color:var(--text-secondary);">${cat ? AppUtils.escapeHtml(cat.name) : '—'}</td>
            <td style="font-size:13px;color:var(--text-secondary);">${sub ? AppUtils.escapeHtml(sub.name) : '—'}</td>
            <td><span class="status-badge ${c.status === 'published' ? 'status-active' : c.status === 'draft' ? 'status-suspended' : 'status-pending'}">${AppUtils.escapeHtml(c.status)}</span></td>
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
                  <div style="font-size:14px;font-weight:600;">${AppUtils.escapeHtml(m.name)}</div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${AppUtils.escapeHtml(m.type)} · ${AppUtils.escapeHtml(m.size || '—')} · ${AppUtils.escapeHtml(school?.name || '—')}</div>
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
    let perms = [];
    try { perms = await window.PermissionsService?.getAll() || []; } catch (_) {}
    const permMap = {};
    for (const p of perms) {
      if (!permMap[p.role]) permMap[p.role] = {};
      permMap[p.role][p.permission] = p.enabled;
    }

    function permissionSection(role, title, icon, description, perms, disabled, gridClass) {
      return `<div style="padding:20px 0;${title !== 'Super Admin' ? 'border-top:1px solid var(--border);' : ''}">
        <div style="padding:0 20px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
          <div class="metric-icon" style="width:40px;height:40px;background:${ROLE_COLORS[role]?.bg || 'var(--surface-low)'};color:${ROLE_COLORS[role]?.fg || 'var(--on-surface-variant)'}"><span class="material-symbols-outlined" style="font-size:20px;">${icon}</span></div>
          <div><div style="font-weight:600;">${title}</div><div style="font-size:12px;color:var(--text-secondary);">${description}</div></div>
          <div style="margin-left:auto;"><span class="status-badge status-active">Active</span></div>
        </div>
        <div style="padding:16px 20px 0;">
          <div class="${gridClass || 'perm-grid'}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;">
            ${perms.map(p => `
              <label class="checkbox-row" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;">
                <input type="checkbox" ${(permMap[role]?.[p.key] ?? (!disabled && p.checked !== undefined ? p.checked : true)) ? 'checked' : ''} ${disabled ? 'disabled' : `data-action="toggle-permission" data-key="${p.key}" data-role="${role}"`} style="width:16px;height:16px;">
                <span style="font-size:13px;">${p.label}</span>
              </label>`).join('')}
          </div>
        </div>
      </div>`;
    }

    const sections = [
      { role: 'super_admin', title: 'Super Admin', icon: 'admin_panel_settings', description: 'Full system access - all permissions enabled by default', disabled: true,
        perms: [
          { label: 'Manage Schools', key: 'manage_schools' },
          { label: 'Manage Categories', key: 'manage_categories' },
          { label: 'Manage Subjects', key: 'manage_subjects' },
          { label: 'Manage Sections', key: 'manage_sections' },
          { label: 'Manage Content', key: 'manage_content' },
          { label: 'Manage Users', key: 'manage_users' },
          { label: 'Manage Roles', key: 'manage_roles' },
          { label: 'View Analytics', key: 'view_analytics' },
          { label: 'Access Settings', key: 'access_settings' },
          { label: 'Manage Drive', key: 'manage_drive' },
          { label: 'Manage Media Library', key: 'manage_media' },
          { label: 'View Audit Log', key: 'view_audit_log' }
        ]},
      { role: 'company_admin', title: 'Company Admin', icon: 'business', description: 'Manages their own company and schools', disabled: false,
        perms: [
          { label: 'Manage Schools', key: 'manage_schools', checked: true },
          { label: 'Manage Categories', key: 'manage_categories', checked: true },
          { label: 'Manage Subjects', key: 'manage_subjects', checked: true },
          { label: 'Manage Sections', key: 'manage_sections', checked: true },
          { label: 'Manage Content', key: 'manage_content', checked: true },
          { label: 'Manage Users', key: 'manage_users', checked: true },
          { label: 'View Analytics', key: 'view_analytics', checked: true },
          { label: 'Access Settings', key: 'access_settings', checked: true },
          { label: 'Manage Own Profile', key: 'company_profile', checked: true }
        ]},
      { role: 'school_admin', title: 'School Admin', icon: 'manage_accounts', description: 'Restricted to own school', disabled: false,
        perms: [
          { label: 'Manage School Settings', key: 'school_settings', checked: true },
          { label: 'Manage Categories', key: 'school_categories', checked: true },
          { label: 'Manage Subjects', key: 'school_subjects', checked: true },
          { label: 'Manage Sections', key: 'school_sections', checked: true },
          { label: 'Manage Content', key: 'school_content', checked: true },
          { label: 'View Analytics', key: 'school_analytics', checked: false },
          { label: 'Manage Own Profile', key: 'school_profile', checked: true },
          { label: 'Upload Drive Files', key: 'school_drive_upload', checked: false }
        ]},
      { role: 'teacher', title: 'Teacher', icon: 'school', description: 'Manage assigned courses and students', disabled: false,
        perms: [
          { label: 'View Assigned Courses', key: 'teacher_courses', checked: true },
          { label: 'View Assigned Students', key: 'teacher_students', checked: true },
          { label: 'Grade Assignments', key: 'teacher_grade_assignments', checked: true },
          { label: 'Grade Quizzes', key: 'teacher_grade_quizzes', checked: true },
          { label: 'View Reports', key: 'teacher_reports', checked: true },
          { label: 'View Own Profile', key: 'teacher_profile', checked: true }
        ]},
      { role: 'counselor', title: 'Counselor', icon: 'badge', description: 'Manage assigned students and counseling records', disabled: false,
        perms: [
          { label: 'View Assigned Students', key: 'counselor_students', checked: true },
          { label: 'Manage Student Progress', key: 'counselor_progress', checked: true },
          { label: 'View Analytics', key: 'counselor_analytics', checked: true },
          { label: 'Send Notifications', key: 'counselor_notifications', checked: true },
          { label: 'Manage Own Profile', key: 'counselor_profile', checked: true }
        ]},
      { role: 'student', title: 'Student', icon: 'person', description: 'View own courses, progress, and certificates', disabled: false,
        perms: [
          { label: 'View Own Courses', key: 'student_courses', checked: true },
          { label: 'Track Own Progress', key: 'student_progress', checked: true },
          { label: 'View Own Notifications', key: 'student_notifications', checked: true },
          { label: 'Manage Own Profile', key: 'student_profile', checked: true }
        ]}
    ];

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Roles & Permissions</h1><p class="page-subtitle">Define access control for each role in the hierarchy.</p></div>
      </div>
      <div class="card" style="padding:0;">
        ${sections.map(s => permissionSection(s.role, s.title, s.icon, s.description, s.perms, s.disabled)).join('')}
      </div>
    </div>`;
    initIcons();
  },

  // --- COMPANY SETTINGS ---
  async renderCompanySettings(main) {
    let settings = {};
    try {
      const all = await window.SettingsService?.getAll() || [];
      for (const s of all) settings[s.key] = s.value;
    } catch (_) {}
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Company Settings</h1><p class="page-subtitle">Configure global platform preferences.</p></div>
      </div>
      <div class="tab-bar" style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border);padding:0 0 0;background:transparent;border-radius:0;">
        <button class="tab-item active" data-action="settings-tab" data-tab="general" style="padding:12px 20px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid var(--primary);color:var(--text);">General</button>
        <button class="tab-item" data-action="settings-tab" data-tab="branding" style="padding:12px 20px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;color:var(--text-secondary);">Branding</button>
        <button class="tab-item" data-action="settings-tab" data-tab="email" style="padding:12px 20px;font-size:13px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;color:var(--text-secondary);">Email</button>
      </div>
      <div id="settings-content">${this._settingsTabContent('general', settings)}</div>
    </div>`;
    initIcons();
  },

  _settingsTabContent(tab, settings) {
    const v = (key, fallback) => settings[key] !== undefined ? AppUtils.escapeHtml(settings[key]) : fallback;
    if (tab === 'general') {
      return `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">General Settings</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">Company Name</label><input type="text" class="form-input" value="${v('companyName', 'LanxGrow Learning')}" data-action="save-setting" data-key="companyName"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Default Platform Language</label>
            <select class="form-select" data-action="save-setting" data-key="language">
              <option value="en" ${v('language', 'en') === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${v('language', 'en') === 'es' ? 'selected' : ''}>Spanish</option>
              <option value="fr" ${v('language', 'en') === 'fr' ? 'selected' : ''}>French</option>
            </select>
          </div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Timezone</label>
            <select class="form-select" data-action="save-setting" data-key="timezone">
              <option value="UTC" ${v('timezone', 'UTC') === 'UTC' ? 'selected' : ''}>UTC</option>
              <option value="US/Eastern" ${v('timezone', 'UTC') === 'US/Eastern' ? 'selected' : ''}>US/Eastern</option>
              <option value="US/Pacific" ${v('timezone', 'UTC') === 'US/Pacific' ? 'selected' : ''}>US/Pacific</option>
            </select>
          </div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Max Upload Size (MB)</label><input type="number" class="form-input" value="${v('maxUploadSize', 100)}" data-action="save-setting" data-key="maxUploadSize"></div>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
            <button class="btn btn-secondary" data-action="reset-settings" style="height:40px;font-size:13px;">Reset</button>
          </div>
        </div>
      </div>`;
    } else if (tab === 'branding') {
      return `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">Branding</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">Company Logo</label><div style="width:120px;height:120px;border:2px dashed var(--border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;cursor:pointer;"><i data-icon="upload" class="icon-26" style="color:var(--text-muted);"></i></div></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Primary Color</label><div style="display:flex;align-items:center;gap:12px;"><input type="color" class="form-input" value="${v('primaryColor', '#1A56DB')}" style="width:48px;height:40px;padding:4px;" data-action="save-setting" data-key="primaryColor"><input type="text" class="form-input" value="${v('primaryColor', '#1A56DB')}" style="flex:1;"></div></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Favicon</label><input type="file" class="form-input" accept="image/*"></div>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
            <button class="btn btn-secondary" data-action="reset-settings" style="height:40px;font-size:13px;">Reset</button>
          </div>
        </div>
      </div>`;
    } else if (tab === 'email') {
      return `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">Email Configuration</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">SMTP Host</label><input type="text" class="form-input" value="${v('smtpHost', 'smtp.sendgrid.net')}" data-action="save-setting" data-key="smtpHost"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">SMTP Port</label><input type="number" class="form-input" value="${v('smtpPort', 587)}" data-action="save-setting" data-key="smtpPort"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">From Address</label><input type="email" class="form-input" value="${v('fromEmail', 'noreply@lanxgrow.com')}" data-action="save-setting" data-key="fromEmail"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">From Name</label><input type="text" class="form-input" value="${v('fromName', 'LanxGrow Learning')}" data-action="save-setting" data-key="fromName"></div>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
            <button class="btn btn-secondary" data-action="test-email" style="height:40px;font-size:13px;">Send Test</button>
          </div>
        </div>
      </div>`;
    }
    return '';
  },

  renderSettingsTab(tab) {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(t => { t.style.borderBottomColor = 'transparent'; t.style.color = 'var(--text-secondary)'; });
    const active = document.querySelector(`.tab-item[data-tab="${tab}"]`);
    if (active) { active.style.borderBottomColor = 'var(--primary)'; active.style.color = 'var(--text)'; }
    const container = document.getElementById('settings-content');
    if (!container) return;
    const allInputs = document.querySelectorAll('#settings-content [data-action="save-setting"]');
    const settings = {};
    allInputs.forEach(input => {
      const key = input.dataset.key;
      if (!key) return;
      settings[key] = input.type === 'checkbox' ? input.checked : input.type === 'number' ? parseFloat(input.value) || 0 : input.value;
    });
    container.innerHTML = this._settingsTabContent(tab, settings);
    initIcons();
  },

  // --- COMPANY DASHBOARD ---
  async renderCompanyDashboard(main) {
    try {
      const data = await AppStorage.load();
      const counts = {
        schools: data.schools.length,
        categories: data.categories.length,
        subjects: data.subjects.length,
        sections: data.sections.length,
        content: data.content.length
      };
      const recentContent = data.content.slice(0, 8);
      const recentLogs = (data.auditLog || []).slice(0, 5);
      const profileMap = {};
      for (const p of data.users) { profileMap[p.id] = p; }

      main.innerHTML = `<div class="fade-in">
        <div class="page-header">
          <div class="page-header-left"><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Platform overview at a glance.</p></div>
        </div>
        <div class="metrics-grid">
          <div class="metric-card" data-action="navigate" data-route="schools" style="cursor:pointer;">
            <div class="metric-icon metric-icon-blue"><span class="material-symbols-outlined">business</span></div>
            <div class="metric-info"><h2>${counts.schools}</h2><p>Schools</p></div>
          </div>
          <div class="metric-card" data-action="navigate" data-route="schools" style="cursor:pointer;">
            <div class="metric-icon metric-icon-green"><span class="material-symbols-outlined">category</span></div>
            <div class="metric-info"><h2>${counts.categories}</h2><p>Categories</p></div>
          </div>
          <div class="metric-card" data-action="navigate" data-route="schools" style="cursor:pointer;">
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
              return `<tr style="cursor:pointer;" data-action="navigate" data-route="content-manager">
                <td><div style="display:flex;align-items:center;gap:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted);">${typeIcon[c.type] || 'insert_drive_file'}</span><span class="font-semibold">${AppUtils.escapeHtml(c.name)}</span></div></td>
                <td><span class="status-badge" style="background:var(--primary-subtle);color:var(--primary);">${AppUtils.escapeHtml(c.type)}</span></td>
                <td><span class="status-badge ${c.status === 'published' ? 'status-active' : c.status === 'draft' ? 'status-suspended' : 'status-pending'}">${AppUtils.escapeHtml(c.status)}</span></td>
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
              const userName = AppUtils.escapeHtml(profileMap[l.created_by]?.name || 'System');
              return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
                <div style="width:8px;height:8px;border-radius:50%;background:${actionColors[l.action] || '#94a3b8'};margin-top:6px;flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:500;color:var(--on-surface);">${userName}</div>
                  <div style="font-size:12px;color:var(--text-secondary);">${AppUtils.escapeHtml(l.action)} ${AppUtils.escapeHtml(l.entity)} — ${AppUtils.escapeHtml(l.entity_name)}</div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${AppUtils.formatDate(l.created_at)}</div>
              </div>`;
            }).join('')}</div>`}
          </div>
        </div>
      </div>`;
      initIcons();
    } catch (err) {
      main.innerHTML = `<div class="empty-state" style="padding:60px;"><span class="material-symbols-outlined" style="font-size:48px;color:#ef4444;">error</span><h3>Failed to load dashboard</h3><p>${AppUtils.escapeHtml(err.message)}</p><button class="btn btn-primary" onclick="AppRouter.render()">Retry</button></div>`;
    }
  },

  // --- SCHOOLS (Company level) ---
  async renderSchools(main) {
    try {
      const data = await AppStorage.load();
      const q = (this._schoolSearchQuery || '').toLowerCase();
      let schools = data.schools;
      if (q) schools = schools.filter(s => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));

      const perPage = 12;
      const totalPages = Math.max(1, Math.ceil(schools.length / perPage));
      const page = Math.min(Math.max(1, this._schoolsPage || 1), totalPages);
      const start = (page - 1) * perPage;
      const pageSchools = schools.slice(start, start + perPage);

      const adminCountBySchool = {};
      for (const p of data.users) {
        if (p.role === 'school_admin' && p.schoolId) {
          adminCountBySchool[p.schoolId] = (adminCountBySchool[p.schoolId] || 0) + 1;
        }
      }

      main.innerHTML = `<div class="fade-in">
        <div class="page-header">
          <div class="page-header-left"><h1 class="page-title">Schools</h1><p class="page-subtitle">Manage all schools in the platform.</p></div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary" data-action="refresh-schools"><span class="material-symbols-outlined" style="font-size:18px;">refresh</span></button>
            <button class="btn btn-primary" data-action="add-school"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add School</button>
          </div>
        </div>
        <div class="management-bar">
          <div class="search-bar" style="max-width:300px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="school-search" placeholder="Search schools..." data-action="school-search-input" value="${AppUtils.escapeHtml(q)}"></div>
        </div>
        ${schools.length === 0 ? `<div class="card"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">business</span><h3>No schools yet</h3><p>Create your first school to get started.</p></div></div>`
        : `<div class="schools-grid">${pageSchools.map(s => {
          const stats = { categories: data.categories.filter(c => c.school_id === s.id).length, subjects: data.subjects.filter(sub => sub.school_id === s.id).length, sections: data.sections.filter(sec => sec.school_id === s.id).length };
          const logoClass = s.status === 'suspended' ? 'school-logo-suspended' : 'school-logo-default';
          const adminCount = adminCountBySchool[s.id] || 0;
          return `<div class="school-card" style="cursor:pointer;" data-action="open-school" data-id="${s.id}">
            <div class="school-card-top">
              <div class="school-logo ${logoClass}">${AppUtils.getInitials(s.name)}</div>
              <div class="school-info">
                <div class="school-name">${AppUtils.escapeHtml(s.name)}</div>
                <div class="school-code">Code: ${AppUtils.escapeHtml(s.code)}</div>
                <div class="school-admin"><span class="material-symbols-outlined" style="font-size:14px;">person</span> ${AppUtils.escapeHtml(s.principal_name || 'No principal')}</div>
              </div>
              <span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-suspended'}">${AppUtils.escapeHtml(s.status)}</span>
            </div>
            <div class="school-stats">
              <div class="school-stat"><div class="school-stat-value">${stats.categories}</div><div class="school-stat-label">Categories</div></div>
              <div class="school-stat"><div class="school-stat-value">${stats.subjects}</div><div class="school-stat-label">Subjects</div></div>
              <div class="school-stat"><div class="school-stat-value">${stats.sections}</div><div class="school-stat-label">Sections</div></div>
              <div class="school-stat"><div class="school-stat-value">${adminCount}</div><div class="school-stat-label">Admins</div></div>
            </div>
          </div>`;
        }).join('')}</div>
        ${totalPages > 1 ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;">
          <button class="btn btn-sm btn-secondary" data-action="schools-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
          <span style="font-size:13px;color:var(--text-secondary);">Page ${page} of ${totalPages}</span>
          <button class="btn btn-sm btn-secondary" data-action="schools-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>` : ''}`}
      </div>`;
      initIcons();
    } catch (err) {
      main.innerHTML = `<div class="empty-state" style="padding:60px;"><span class="material-symbols-outlined" style="font-size:48px;color:#ef4444;">error</span><h3>Failed to load schools</h3><p>${AppUtils.escapeHtml(err.message)}</p><button class="btn btn-primary" onclick="AppRouter.render()">Retry</button></div>`;
    }
  }
}; // End AppRouter

// ==============================================================
// SCHOOLS CRUD MODULE
// ==============================================================
window.AppSchools = {
  async edit(id) {
    const school = await SchoolService.getById(id);
    if (!school) { AppToast.show('School not found.', 'error'); return; }
    openSchoolForm(school);
  },
  async confirmDelete(id) {
    const data = await AppStorage.load();
    const school = data.schools.find(s => s.id === id);
    if (!school) { AppToast.show('School not found.', 'error'); return; }
    const cats = data.categories.filter(c => c.school_id === id).length;
    const subs = data.subjects.filter(s => s.school_id === id).length;
    const secs = data.sections.filter(s => s.school_id === id).length;
    const cnt = data.content.filter(c => c.school_id === id).length;
    const students = data.students.filter(s => s.school_id === id).length;
    const deps = [];
    if (cats) deps.push(`${cats} categories`);
    if (subs) deps.push(`${subs} subjects`);
    if (secs) deps.push(`${secs} sections`);
    if (cnt) deps.push(`${cnt} content items`);
    if (students) deps.push(`${students} students`);
    const depText = deps.length ? ` This will also delete: ${deps.join(', ')}.` : '';
    document.getElementById('confirm-text').textContent = `Delete "${school.name}"?${depText} This action cannot be undone.`;
    AppModal.open('modal-confirm');
    document.getElementById('btn-confirm-action').setAttribute('data-action', 'confirm-delete-entity');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-type', 'school');
    document.getElementById('btn-confirm-action').setAttribute('data-entity-id', id);
  },

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

    if (this.currentTab !== 'all') users = users.filter(u => u.role === this.currentTab);

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
        ${['all', 'super_admin', 'company_admin', 'school_admin', 'teacher', 'counselor', 'student'].map(t => {
          const labels = { all: 'All Users', super_admin: 'Super Admin', company_admin: 'Company Admin', school_admin: 'School Admin', teacher: 'Teacher', counselor: 'Counselor', student: 'Student' };
          return `<button class="tab-item ${this.currentTab === t ? 'active' : ''}" data-action="um-tab" data-tab="${t}" style="padding:10px 16px;font-size:12px;font-weight:500;border:none;background:none;cursor:pointer;border-bottom:2px solid ${this.currentTab === t ? 'var(--primary)' : 'transparent'};color:${this.currentTab === t ? 'var(--text)' : 'var(--text-secondary)'};white-space:nowrap;">
            ${labels[t] || t}
            <span style="margin-left:4px;font-size:11px;color:var(--text-muted);">(${t === 'all' ? users.length : users.filter(u => u.role === t).length})</span>
          </button>`;
        }).join('')}
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <div class="search-bar" style="max-width:280px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="um-search" placeholder="Search users..." value="${AppUtils.escapeHtml(this.searchQuery)}" data-action="um-search-input"></div>
        <select class="form-select" id="um-role-filter" style="width:160px;height:40px;font-size:13px;" data-action="um-filter-role">
          <option value="">All Roles</option>
          <option value="super_admin" ${this.currentTab === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          <option value="company_admin" ${this.currentTab === 'company_admin' ? 'selected' : ''}>Company Admin</option>
          <option value="school_admin" ${this.currentTab === 'school_admin' ? 'selected' : ''}>School Admin</option>
          <option value="teacher" ${this.currentTab === 'teacher' ? 'selected' : ''}>Teacher</option>
          <option value="counselor" ${this.currentTab === 'counselor' ? 'selected' : ''}>Counselor</option>
          <option value="student" ${this.currentTab === 'student' ? 'selected' : ''}>Student</option>
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
              const eh = AppUtils.escapeHtml;
              const isActive = u.schoolStatus === 'active';
              const roleLabel = ROLE_LABELS[u.role] || u.role;
              return `<tr>
                <td><input type="checkbox" class="um-row-check" data-id="${u.id}" style="width:16px;height:16px;cursor:pointer;"></td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="user-avatar" style="width:32px;height:32px;font-size:11px;">${AppUtils.getInitials(u.name)}</div>
                    <div>
                      <div class="font-semibold" style="font-size:13px;">${eh(u.name)}</div>
                      <div style="font-size:12px;color:var(--text-secondary);">${eh(u.email || '—')}</div>
                    </div>
                  </div>
                </td>
                <td><span class="status-badge" style="background:${ROLE_COLORS[u.role]?.bg || 'var(--surface-low)'};color:${ROLE_COLORS[u.role]?.fg || 'var(--on-surface-variant)'};">${eh(roleLabel)}</span></td>
                <td style="font-size:13px;">${eh(u.schoolName)}</td>
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
          <input type="text" class="form-input" id="edit-user-name" value="${AppUtils.escapeHtml(user.name)}" placeholder="Enter user name">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" value="${AppUtils.escapeHtml(user.email || '')}" disabled style="color:var(--text-muted);">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Email cannot be changed.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Role</label>
          <input type="text" class="form-input" value="${AppUtils.escapeHtml(ROLE_LABELS[user.role] || user.role)}" disabled style="color:var(--text-muted);">
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
  async openCreate(parentCategoryId) {
    document.getElementById('entity-type').value = 'category';
    document.getElementById('entity-id').value = '';
    document.getElementById('entity-parent-id').value = parentCategoryId || '';
    document.querySelectorAll('.entity-fields').forEach(el => el.style.display = 'none');
    document.getElementById('entity-fields-category').style.display = 'block';
    document.getElementById('input-name-cat').value = '';
    document.getElementById('modal-title').textContent = parentCategoryId ? 'Add Sub-category' : 'Add Category';
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
        return `<tr><td><div class="font-semibold">${AppUtils.escapeHtml(c.name)}</div></td><td>${count}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(c.created_at)}</td>
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
    catSelect.innerHTML = `<option value="">Choose...</option>${cats.map(c => `<option value="${c.id}" ${c.id === categoryId ? 'selected' : ''}>${AppUtils.escapeHtml(c.name)}</option>`).join('')}`;
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
    catSelect.innerHTML = `<option value="">Choose...</option>${cats.map(c => `<option value="${c.id}" ${c.id === subj.category_id ? 'selected' : ''}>${AppUtils.escapeHtml(c.name)}</option>`).join('')}`;
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
        return `<tr><td><div class="font-semibold">${AppUtils.escapeHtml(s.name)}</div></td><td style="font-size:13px;">${AppUtils.escapeHtml(cat?.name || '—')}</td><td>${secCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(s.created_at)}</td>
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
    subjSelect.innerHTML = `<option value="">Choose...</option>${subjects.map(s => `<option value="${s.id}" ${s.id === subjectId ? 'selected' : ''}>${AppUtils.escapeHtml(s.name)}</option>`).join('')}`;
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
    subjSelect.innerHTML = `<option value="">Choose...</option>${subjects.map(s => `<option value="${s.id}" ${s.id === sec.subject_id ? 'selected' : ''}>${AppUtils.escapeHtml(s.name)}</option>`).join('')}`;
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
        return `<tr><td><div class="font-semibold">${AppUtils.escapeHtml(s.name)}</div></td><td style="font-size:13px;">${AppUtils.escapeHtml(subj?.name || '—')}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.escapeHtml(cat?.name || '—')}</td><td>${conCount}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(s.created_at)}</td>
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
    schoolSelect.innerHTML = `<option value="">Choose...</option>${data.schools.map(s => `<option value="${s.id}">${AppUtils.escapeHtml(s.name)}</option>`).join('')}`;
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
    schoolSelect.innerHTML = `<option value="">Choose...</option>${data.schools.map(s => `<option value="${s.id}">${AppUtils.escapeHtml(s.name)}</option>`).join('')}`;
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
    select.innerHTML = `<option value="">Choose...</option>${sections.map(s => `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${AppUtils.escapeHtml(s.name)}</option>`).join('')}`;
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
        return `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${typeIcons[c.type] || 'insert_drive_file'}" style="width:16px;height:16px;color:var(--primary);"></i><span class="font-semibold">${AppUtils.escapeHtml(c.name)}</span></div></td>
          <td style="font-size:13px;">${AppUtils.escapeHtml(c.type)}</td><td style="font-size:13px;">${AppUtils.escapeHtml(school.name || '—')}</td>
          <td><span class="status-badge ${c.status === 'published' ? 'status-active' : c.status === 'draft' ? 'status-suspended' : 'status-pending'}">${AppUtils.escapeHtml(c.status)}</span></td>
          <td style="font-size:13px;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${AppUtils.escapeHtml(c.description || '')}</td>
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
      html += `<div class="explorer-item" data-id="${s.id}" data-action="drive-select"><i data-icon="building-2" style="width:16px;height:16px;"></i> ${AppUtils.escapeHtml(s.name)}${hasDrive ? '<span style="margin-left:auto;font-size:10px;color:var(--primary);">Drive</span>' : ''}</div>`;
      const cats = data.categories.filter(c => c.school_id === s.id);
      cats.forEach(c => {
        const hasCatDrive = c.drive_folder_id ? ' 🔗' : '';
        html += `<div class="explorer-item" style="padding-left:28px;" data-school-id="${s.id}" data-action="drive-select-folder" data-id="${c.id}"><i data-icon="folder" style="width:16px;height:16px;"></i> ${AppUtils.escapeHtml(c.name)}${hasCatDrive ? '<span style="margin-left:auto;font-size:10px;color:var(--primary);">Drive</span>' : ''}</div>`;
        const subs = data.subjects.filter(sub => sub.category_id === c.id);
        subs.forEach(sub => {
          const hasSubDrive = sub.drive_folder_id ? ' 🔗' : '';
          html += `<div class="explorer-item" style="padding-left:44px;" data-school-id="${s.id}" data-action="drive-select-folder" data-id="${sub.id}"><i data-icon="book-open" style="width:14px;height:14px;"></i> ${AppUtils.escapeHtml(sub.name)}${hasSubDrive ? '<span style="margin-left:auto;font-size:10px;color:var(--primary);">Drive</span>' : ''}</div>`;
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
      <div style="font-size:16px;font-weight:600;">${AppUtils.escapeHtml(school ? school.name : 'School')}</div>
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
            <div><div style="font-size:13px;font-weight:500;">${AppUtils.escapeHtml(c.name)}</div><div style="font-size:11px;color:var(--text-muted);">${data.subjects.filter(s => s.category_id === c.id).length} subjects</div></div>
          </div>`).join('')}</div>`;
      }
      if (files.length > 0) {
        html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Files</div>
        <div class="table-container"><table><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Updated</th></tr></thead><tbody>${files.map(f => `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${f.type === 'Video' ? 'videocam' : f.type === 'PDF' ? 'description' : 'insert_drive_file'}" style="width:16px;height:16px;color:var(--text-muted);"></i><span class="font-semibold">${AppUtils.escapeHtml(f.name)}</span></div></td><td style="font-size:13px;">${AppUtils.escapeHtml(f.type)}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.escapeHtml(f.size || '—')}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(f.updated_at)}</td></tr>`).join('')}</tbody></table></div>`;
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
      <div style="font-size:13px;color:var(--text-secondary);">${AppUtils.escapeHtml(school ? school.name : '')} /</div>
      <div style="font-size:16px;font-weight:600;">${AppUtils.escapeHtml(folder ? folder.name : 'Folder')}</div>
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
          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);"><i data-icon="book-open" style="width:16px;height:16px;color:var(--success);flex-shrink:0;"></i><div><div style="font-size:13px;font-weight:500;">${AppUtils.escapeHtml(sub.name)}</div><div style="font-size:11px;color:var(--text-muted);">${data.sections.filter(sec => sec.subject_id === sub.id).length} sections</div></div></div>`).join('')}</div>`;
      }
      if (folderFiles.length > 0) {
        html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Files</div>
        <div class="table-container"><table><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Updated</th></tr></thead><tbody>${folderFiles.map(f => `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><i data-icon="${f.type === 'Video' ? 'videocam' : f.type === 'PDF' ? 'description' : 'insert_drive_file'}" style="width:16px;height:16px;color:var(--text-muted);"></i><span class="font-semibold">${AppUtils.escapeHtml(f.name)}</span></div></td><td style="font-size:13px;">${AppUtils.escapeHtml(f.type)}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.escapeHtml(f.size || '—')}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(f.updated_at)}</td></tr>`).join('')}</tbody></table></div>`;
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
    (data.courses || []).forEach(c => {
      if (c.name.toLowerCase().includes(ql)) { const school = data.schools.find(s => s.id === c.school_id); matches.push({ type: 'Course', label: c.name, sub: school ? `in ${school.name}` : `${c.difficulty || ''}`, route: 'school-courses', schoolId: c.school_id }); }
    });
    data.content.forEach(c => {
      if (c.name.toLowerCase().includes(ql) || (c.tags && c.tags.some(t => t.toLowerCase().includes(ql)))) { const school = data.schools.find(s => s.id === c.school_id); matches.push({ type: `Content (${c.type})`, label: c.name, sub: school ? `in ${school.name}` : '', action: c.type === 'Video' ? 'play-video' : null, id: c.id }); }
    });
    if (matches.length === 0) {
      results.innerHTML = '<div class="empty-state" style="padding:32px 24px;"><i data-icon="search-x" style="width:32px;height:32px;color:var(--text-muted);"></i><h3 style="font-size:14px;">No results</h3><p style="font-size:13px;">Try a different search term.</p></div>';
    } else {
      const typeIcons = { School: 'building-2', Category: 'folder-tree', Subject: 'book-open', Section: 'folder-kanban', Course: 'auto_stories' };
      const eh = AppUtils.escapeHtml;
      results.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;padding:8px 20px 4px;">${matches.length} result${matches.length > 1 ? 's' : ''}</div>
      ${matches.slice(0, 15).map(m => { const icon = typeIcons[m.type.split(' ')[0]] || 'file'; const action = m.action || 'global-search-nav'; return `<div class="explorer-item" style="padding:10px 20px;border-radius:0;" data-action="${action}" data-route="${m.route || ''}" data-id="${m.id || ''}" data-school-id="${m.schoolId || ''}" data-cat-id="${m.catId || ''}"><i data-icon="${icon}" style="width:16px;height:16px;color:var(--primary);"></i><div style="flex:1;"><div style="font-size:13px;font-weight:500;">${eh(m.label)}</div><div style="font-size:11px;color:var(--text-muted);">${eh(m.type)} ${eh(m.sub)}</div></div></div>`; }).join('')}`;
    }
    initIcons();
  }
};

// ==============================================================
// AUDIT LOG MODULE
// ==============================================================
window.AppAuditLog = {
  _page: 1,
  _perPage: 50,

  async render(main) {
    const data = await AppStorage.load();
    const logs = (data.auditLog || []).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    this._logs = logs;
    this._page = 1;
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
      <div class="card" style="padding:0;overflow:hidden;" id="audit-log-card">
        ${logs.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">history</span><h3>No activity yet</h3></div>`
        : this._renderTable(logs)}
      </div>
    </div>`;
    initIcons();
  },

  _renderTable(logs) {
    const totalPages = Math.max(1, Math.ceil(logs.length / this._perPage));
    const page = Math.min(this._page, totalPages);
    const start = (page - 1) * this._perPage;
    const pageLogs = logs.slice(start, start + this._perPage);
    const eh = AppUtils.escapeHtml;
    const actionColors = { created: 'var(--success)', edited: 'var(--info)', uploaded: 'var(--primary)', deleted: 'var(--danger)', suspended: 'var(--warning)' };
    return `<div class="table-container"><table><thead><tr><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>Date</th></tr></thead><tbody>${pageLogs.map(l => {
      const ac = actionColors[l.action] || 'var(--text-secondary)';
      return `<tr><td><div class="flex-center gap-10" style="justify-content:flex-start;"><div class="user-avatar" style="width:28px;height:28px;font-size:10px;">${eh(l.user_name ? AppUtils.getInitials(l.user_name) : '?')}</div><div><div style="font-size:13px;font-weight:500;">${eh(l.user_name)}</div></div></div></td>
        <td><span style="font-size:12px;font-weight:600;color:${ac};">${eh(l.action.charAt(0).toUpperCase() + l.action.slice(1))}</span></td>
        <td><span style="font-size:13px;">${eh(l.entity)}</span><div style="font-size:11px;color:var(--text-muted);">${eh(l.entity_name)}</div></td>
        <td style="font-size:13px;color:var(--text-secondary);max-width:300px;">${eh(l.detail)}</td>
        <td style="font-size:13px;color:var(--text-secondary);white-space:nowrap;">${AppUtils.formatDate(l.created_at)}</td></tr>`;
    }).join('')}</tbody></table></div>
    ${totalPages > 1 ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-top:1px solid var(--border);">
      <button class="btn btn-sm btn-secondary" data-action="audit-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <span style="font-size:12px;color:var(--text-secondary);">Page ${page} of ${totalPages} (${logs.length} total)</span>
      <button class="btn btn-sm btn-secondary" data-action="audit-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>` : ''}`;
  },

  filter() {
    const q = (document.getElementById('audit-search')?.value || '').toLowerCase();
    const actionFilter = document.getElementById('audit-action-filter')?.value || '';
    const entityFilter = document.getElementById('audit-entity-filter')?.value || '';
    AppStorage.load().then(data => {
      const logs = (data.auditLog || []).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
      let filtered = logs;
      if (q) filtered = filtered.filter(l => l.user_name?.toLowerCase().includes(q) || l.entity_name?.toLowerCase().includes(q) || (l.detail || '').toLowerCase().includes(q));
      if (actionFilter) filtered = filtered.filter(l => l.action === actionFilter);
      if (entityFilter) filtered = filtered.filter(l => l.entity === entityFilter);
      const card = document.getElementById('audit-log-card');
      if (!card) return;
      if (filtered.length === 0) {
        card.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">history</span><h3>No matching activity</h3></div>`;
      } else {
        this._logs = filtered;
        this._page = 1;
        card.innerHTML = this._renderTable(filtered);
      }
      initIcons();
    });
  },

  goToPage(page) {
    if (!this._logs) return;
    this._page = page;
    const card = document.getElementById('audit-log-card');
    if (card) {
      card.innerHTML = this._renderTable(this._logs);
      initIcons();
    }
  }
};

// ==============================================================
// ENTITY FORM HANDLER
// ==============================================================
function openSchoolForm(schoolData) {
  const isEdit = !!schoolData;
  document.getElementById('school-entity-id').value = schoolData?.id || '';
  document.getElementById('modal-school-title').textContent = isEdit ? 'Edit School' : 'Add School';

  document.getElementById('school-input-name').value = schoolData?.name || '';
  document.getElementById('school-input-code').value = schoolData?.code || '';
  document.getElementById('school-input-type').value = schoolData?.school_type || '';
  document.getElementById('school-input-principal').value = schoolData?.principal_name || '';
  document.getElementById('school-input-contact').value = schoolData?.contact_person || '';
  document.getElementById('school-input-phone').value = schoolData?.phone || '';
  document.getElementById('school-input-email').value = schoolData?.email || '';
  document.getElementById('school-input-website').value = schoolData?.website || '';

  document.getElementById('school-input-addr1').value = schoolData?.address_line1 || '';
  document.getElementById('school-input-addr2').value = schoolData?.address_line2 || '';
  document.getElementById('school-input-city').value = schoolData?.city || '';
  document.getElementById('school-input-state').value = schoolData?.state || '';
  document.getElementById('school-input-country').value = schoolData?.country || 'India';
  document.getElementById('school-input-postal').value = schoolData?.postal_code || '';

  document.getElementById('school-input-academic-year').value = schoolData?.academic_year || '';
  document.getElementById('school-input-board').value = schoolData?.board || '';
  document.getElementById('school-input-medium').value = schoolData?.medium || '';
  document.getElementById('school-input-timezone').value = schoolData?.timezone || 'Asia/Kolkata';

  document.getElementById('school-input-plan').value = schoolData?.plan || 'basic';
  document.getElementById('school-input-student-limit').value = schoolData?.student_limit || '';
  document.getElementById('school-input-teacher-limit').value = schoolData?.teacher_limit || '';
  document.getElementById('school-input-counselor-limit').value = schoolData?.counselor_limit || '';
  document.getElementById('school-input-storage-limit').value = schoolData?.storage_limit || '';

  document.getElementById('school-input-status').value = schoolData?.status || 'active';
  document.getElementById('school-display-id').textContent = schoolData?.id || 'Auto-generated';
  document.getElementById('school-display-created').textContent = schoolData?.created_at ? AppUtils.formatDate(schoolData.created_at) : '—';

  document.querySelectorAll('.school-tab-btn').forEach(b => {
    b.classList.remove('active');
    b.style.color = 'var(--text-muted)';
    b.style.borderBottomColor = 'transparent';
  });
  document.querySelectorAll('.school-tab-panel').forEach(p => p.style.display = 'none');
  document.querySelector('.school-tab-btn[data-tab="general"]').classList.add('active');
  document.querySelector('.school-tab-btn[data-tab="general"]').style.color = 'var(--primary)';
  document.querySelector('.school-tab-btn[data-tab="general"]').style.borderBottomColor = 'var(--primary)';
  document.getElementById('school-tab-general').style.display = 'block';

  document.getElementById('btn-save-school').textContent = isEdit ? 'Save Changes' : 'Save School';
  AppModal.open('modal-school');
}

document.addEventListener('click', function(e) {
  const btn = e.target.closest('.school-tab-btn');
  if (btn) {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.school-tab-btn').forEach(b => {
      b.style.color = 'var(--text-muted)';
      b.style.borderBottomColor = 'transparent';
    });
    btn.style.color = 'var(--primary)';
    btn.style.borderBottomColor = 'var(--primary)';
    document.querySelectorAll('.school-tab-panel').forEach(p => p.style.display = 'none');
    document.getElementById('school-tab-' + tab).style.display = 'block';
  }
});

async function handleSchoolSubmit() {
  const btn = document.getElementById('btn-save-school');
  const id = document.getElementById('school-entity-id').value;
  const isEdit = !!id;
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    const name = document.getElementById('school-input-name').value.trim();
    const code = document.getElementById('school-input-code').value.trim();
    if (!name || !code) { AppToast.show('School name and code are required.', 'error'); btn.disabled = false; btn.textContent = isEdit ? 'Save Changes' : 'Save School'; return; }

    if (!isEdit) {
      const existing = await SchoolService.getByCode(code);
      if (existing) { AppToast.show(`School with code "${code}" already exists.`, 'error'); btn.disabled = false; btn.textContent = 'Save School'; return; }
    }

    const payload = {
      name,
      code,
      school_type: document.getElementById('school-input-type').value || null,
      principal_name: document.getElementById('school-input-principal').value.trim() || null,
      contact_person: document.getElementById('school-input-contact').value.trim() || null,
      phone: document.getElementById('school-input-phone').value.trim() || null,
      email: document.getElementById('school-input-email').value.trim() || null,
      website: document.getElementById('school-input-website').value.trim() || null,
      address_line1: document.getElementById('school-input-addr1').value.trim() || null,
      address_line2: document.getElementById('school-input-addr2').value.trim() || null,
      city: document.getElementById('school-input-city').value.trim() || null,
      state: document.getElementById('school-input-state').value.trim() || null,
      country: document.getElementById('school-input-country').value.trim() || 'India',
      postal_code: document.getElementById('school-input-postal').value.trim() || null,
      academic_year: document.getElementById('school-input-academic-year').value.trim() || null,
      board: document.getElementById('school-input-board').value || null,
      medium: document.getElementById('school-input-medium').value || null,
      timezone: document.getElementById('school-input-timezone').value || 'Asia/Kolkata',
      plan: document.getElementById('school-input-plan').value || 'basic',
      student_limit: parseInt(document.getElementById('school-input-student-limit').value) || null,
      teacher_limit: parseInt(document.getElementById('school-input-teacher-limit').value) || null,
      counselor_limit: parseInt(document.getElementById('school-input-counselor-limit').value) || null,
      storage_limit: document.getElementById('school-input-storage-limit').value.trim() || null,
      status: document.getElementById('school-input-status').value || 'active'
    };

    if (isEdit) {
      await SchoolService.update(id, payload);
      AppToast.show('School updated.', 'success');
    } else {
      await SchoolService.create(payload);
      AppToast.show('School created.', 'success');
    }
    AppModal.close('modal-school');
    AppStorage.invalidate();
    AppRouter.render();
  } catch (err) {
    AppToast.show(err.message || 'Failed to save school.', 'error');
  }
  btn.disabled = false;
  btn.textContent = isEdit ? 'Save Changes' : 'Save School';
}

async function handleEntitySubmit() {
  const btn = document.getElementById('btn-save-entity');
  const type = document.getElementById('entity-type').value;
  const id = document.getElementById('entity-id').value;
  const isEdit = !!id;
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    if (type === 'school') {
      const name = document.getElementById('input-name').value.trim();
      const code = document.getElementById('input-code').value.trim();
      if (!name || !code) { AppToast.show('Name and code are required.', 'error'); return; }
      if (!isEdit) {
        const existing = await SchoolService.getByCode(code);
        if (existing) { AppToast.show(`School with code "${code}" already exists.`, 'error'); return; }
      }
      const status = document.getElementById('input-status')?.value || 'active';
      const principal_name = document.getElementById('input-principal-name').value.trim();
      if (isEdit) {
        await SchoolService.update(id, { name, code, status, principal_name });
        AppToast.show('School updated.', 'success');
      } else {
        await SchoolService.create({ name, code, status, principal_name });
        AppToast.show('School created.', 'success');
      }
    } else if (type === 'category') {
      const name = document.getElementById('input-name-cat').value.trim();
      if (!name) { AppToast.show('Name is required.', 'error'); return; }
      const parentId = document.getElementById('entity-parent-id')?.value || null;
      if (isEdit) {
        await CategoryService.update(id, { name, parentId });
        AppToast.show('Category updated.', 'success');
      } else {
        await CategoryService.create({ name, schoolId: AppRouter.currentSchoolId, parentId });
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
      const rawType = document.getElementById('input-content-type').value;
      const allowedTypes = ['Video', 'PDF', 'Image', 'Document', 'Other'];
      if (!allowedTypes.includes(rawType)) { AppToast.show('Valid type is required.', 'error'); return; }
      const rawUrl = document.getElementById('input-content-url').value.trim() || null;
      const rawStatus = document.getElementById('input-content-status').value || 'draft';
      const allowedStatuses = ['draft', 'published', 'archived', 'review'];
      if (!allowedStatuses.includes(rawStatus)) { AppToast.show('Invalid status.', 'error'); return; }
      if (rawStatus === 'published' && !rawUrl) { AppToast.show('URL is required for published content.', 'error'); return; }
      if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://') && !rawUrl.startsWith('blob:') && !rawUrl.startsWith('data:')) {
        AppToast.show('URL must start with http:// or https://', 'error'); return;
      }
      const item = {
        name,
        type: rawType,
        url: rawUrl,
        size: document.getElementById('input-content-size').value.trim() || null,
        schoolId: document.getElementById('input-content-school').value,
        sectionId: document.getElementById('input-content-section').value || null,
        description: document.getElementById('input-content-description').value.trim() || null,
        tags: (document.getElementById('input-content-tags').value || '').split(',').map(t => t.trim()).filter(Boolean),
        status: rawStatus
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
    AppStorage.invalidate();
    AppRouter.render();
  } catch (err) {
    AppToast.show(err.message || 'An error occurred.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = isEdit ? 'Save Changes' : 'Save';
  }
}

// ==============================================================
// EVENT DELEGATION — CLICK
// ==============================================================
document.addEventListener('click', async function (e) {
  const el = e.target.closest('[data-action], [data-close-modal]');
  if (!el) {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay && e.target === overlay) { AppModal.close(overlay.id); }
    return;
  }

  // Handle data-close-modal (works with or without data-action)
  if (el.hasAttribute('data-close-modal')) {
    AppModal.close(el.getAttribute('data-close-modal') || el.closest('.modal-overlay')?.id);
    return;
  }

  const action = el.dataset.action;
  const id = el.dataset.id;
  const route = el.dataset.route;

  if (action === 'navigate') {
    const companyRoutes = ['content-manager','drive-manager','media-library','school-admins','roles-permissions','company-settings','audit-log'];
    if (AppRouter.SCHOOL_ROUTES.includes(route)) {
      const params = { schoolId: AppRouter.currentSchoolId };
      if (el.dataset.id) params.categoryId = el.dataset.id || null;
      AppRouter.navigate(route, params);
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
  if (action === 'add-school') { openSchoolForm(); return; }
  if (action === 'edit-school') { AppSchools.edit(id); return; }
  if (action === 'delete-school') { AppSchools.confirmDelete(id); return; }
  if (action === 'open-school') { AppRouter.navigate('school-dashboard', { schoolId: id }); return; }
  if (action === 'refresh-schools') { AppRouter._schoolSearchQuery = ''; AppRouter._schoolsPage = 1; AppRouter.render(); return; }
  if (action === 'schools-page') { AppRouter._schoolsPage = parseInt(el.dataset.page); AppRouter.render(); return; }
  if (action === 'school-search-input') { return; }

  // Categories
  if (action === 'add-category') { AppCategories.openCreate(AppRouter._selectedCategoryId); return; }
  if (action === 'edit-category') { AppCategories.edit(id); return; }
  if (action === 'delete-category') { AppCategories.confirmDelete(id); return; }
  if (action === 'open-category') {
    const data = await AppStorage.load();
    const cat = data.categories.find(c => c.id === id);
    if (cat && data.categories.some(c => c.parent_id === id)) {
      AppRouter.navigate('school-categories', { schoolId: AppRouter.currentSchoolId, categoryId: id });
    } else {
      AppRouter.navigate('school-subjects', { schoolId: AppRouter.currentSchoolId, categoryId: id });
    }
    return;
  }

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
  if (action === 'content-upload-file') {
    const fileInput = document.getElementById('input-content-file');
    if (fileInput) fileInput.click();
    return;
  }

  // Admin
  // User Management
  if (action === 'add-user') { AppToast.show('User invitation — coming in a future update.', 'info'); return; }
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
        const { error } = await supabase.from('profiles').delete().eq('id', eid);
        if (error) throw error;
        AppToast.show('School admin removed.', 'success');
      }
      AppStorage.invalidate();
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
  if (action === 'school-drive-select') {
    const data = await AppStorage.load();
    const type = el.dataset.type;
    const container = document.getElementById('school-drive-content');
    if (!container) return;
    const entity = type === 'school' ? data.schools.find(s => s.id === id) : type === 'category' ? data.categories.find(c => c.id === id) : type === 'subject' ? data.subjects.find(s => s.id === id) : data.sections.find(s => s.id === id);
    if (!entity) return;
    const driveId = entity.drive_folder_id || '';
    const entityType = type;
    const contentFiles = type === 'section' ? data.content.filter(c => c.section_id === id) : [];
    container.innerHTML = `<div style="padding:20px 24px;border-bottom:1px solid var(--border);">
      <div style="font-size:12px;color:var(--text-secondary);">${AppUtils.escapeHtml(school.name)} / ${type}</div>
      <div style="font-size:16px;font-weight:600;margin-top:2px;">${AppUtils.escapeHtml(entity.name || '')}</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${contentFiles.length} files</div>
    </div>
    <div style="padding:16px 24px;border-bottom:1px solid var(--border);">
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Google Drive Folder</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" class="form-input" id="drive-link-input" placeholder="Paste Google Drive folder link..." value="${driveId ? `https://drive.google.com/drive/folders/${driveId}` : ''}" style="flex:1;height:40px;font-size:13px;">
        <button class="btn btn-primary btn-sm" data-action="drive-link-save" data-entity-type="${entityType}" data-entity-id="${id}" style="height:40px;">${driveId ? 'Update' : 'Link'}</button>
        ${driveId ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="drive-link-remove" data-entity-type="${entityType}" data-entity-id="${id}" style="height:40px;"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>` : ''}
      </div>
      <div id="drive-link-status" style="font-size:12px;margin-top:6px;color:${driveId ? 'var(--success)' : 'var(--text-muted)'};">${driveId ? `Linked folder: <code style="background:var(--border-light);padding:2px 6px;border-radius:4px;">${driveId}</code>` : 'No Drive folder linked yet.'}</div>
    </div>
    <div style="padding:16px 24px;">
      ${contentFiles.length === 0 ? `<div class="empty-state" style="padding:24px;"><span class="material-symbols-outlined" style="font-size:36px;">folder_open</span><h3>No files</h3><p>Content uploaded to this ${type} will appear here.</p></div>`
      : `<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Files</div>
        <div class="table-container"><table><thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Updated</th></tr></thead><tbody>${contentFiles.map(f => `<tr><td><span class="font-semibold">${AppUtils.escapeHtml(f.name)}</span></td><td style="font-size:13px;">${AppUtils.escapeHtml(f.type)}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.escapeHtml(f.size || '—')}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(f.updated_at)}</td></tr>`).join('')}</tbody></table></div>`}
    </div>`;
    initIcons();
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
      statusEl.innerHTML = `Linked folder: <code style="background:var(--border-light);padding:2px 6px;border-radius:4px;">${AppUtils.escapeHtml(folderId)}</code>`;
      statusEl.style.color = 'var(--success)';
      AppStorage.invalidate();
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
      AppStorage.invalidate();
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

  // Media — image preview
  if (action === 'preview-image' && id) {
    const data = await AppStorage.load();
    const item = data.content.find(c => c.id === id);
    if (item && item.url) {
      const existing = document.getElementById('modal-image-preview');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-image-preview';
      overlay.innerHTML = `<div class="modal" style="max-width:90vw;max-height:90vh;">
        <div class="modal-header">
          <h3 class="modal-title">${AppUtils.escapeHtml(item.name)}</h3>
          <button class="modal-close" data-close-modal="modal-image-preview"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="modal-body" style="display:flex;align-items:center;justify-content:center;padding:16px;">
          <img src="${AppUtils.escapeHtml(item.url)}" alt="${AppUtils.escapeHtml(item.name)}" style="max-width:100%;max-height:70vh;border-radius:6px;object-fit:contain;">
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
    } else {
      AppToast.show('No image URL available.', 'warn');
    }
    return;
  }

  // Review
  if (action === 'add-timestamp') {
    const list = document.getElementById('timestamp-list');
    const notes = document.getElementById('review-notes');
    if (list) {
      const time = new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' });
      const note = notes ? notes.value.trim() : '';
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:13px;';
      item.innerHTML = `<span style="color:var(--primary);font-weight:600;cursor:pointer;">${AppUtils.escapeHtml(time)}</span><span style="color:var(--text-secondary);">${AppUtils.escapeHtml(note || 'Review note')}</span>`;
      list.appendChild(item);
      if (notes) notes.value = '';
    }
    AppToast.show('Timestamp marker added.', 'success');
    return;
  }
  if (action === 'review-approve') {
    const contentId = document.getElementById('video-content-id')?.textContent;
    if (contentId) {
      try {
        await window.ContentService?.update(contentId, { status: 'published' });
        await AppStorage.load(true);
        AppToast.show('Content approved and published.', 'success');
      } catch (err) { AppToast.show(err.message || 'Failed to approve content.', 'error'); }
    }
    return;
  }
  if (action === 'review-request') {
    const contentId = document.getElementById('video-content-id')?.textContent;
    if (contentId) {
      try {
        await window.ContentService?.update(contentId, { status: 'review' });
        await AppStorage.load(true);
        AppToast.show('Revision requested.', 'info');
      } catch (err) { AppToast.show(err.message || 'Failed to update content.', 'error'); }
    }
    return;
  }
  if (action === 'review-reject') {
    const contentId = document.getElementById('video-content-id')?.textContent;
    if (contentId) {
      try {
        await window.ContentService?.update(contentId, { status: 'draft' });
        await AppStorage.load(true);
        AppToast.show('Content rejected.', 'error');
      } catch (err) { AppToast.show(err.message || 'Failed to reject content.', 'error'); }
    }
    return;
  }

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
    const confirmed = await AppConfirm.show('Reset all settings to defaults?', 'Reset Settings');
    if (!confirmed) return;
    try {
      await window.SettingsService.reset();
      AppToast.show('Settings reset to defaults.', 'success');
      AppStorage.invalidate();
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to reset settings.', 'error');
    }
    return;
  }

  // Toggle permissions
  if (action === 'toggle-permission') {
    const key = el.dataset.key;
    const role = el.dataset.role;
    if (!role) { AppToast.show('Role not specified.', 'error'); return; }
    try {
      await window.PermissionsService.set(role, key, el.checked);
      AppToast.show(`${el.checked ? 'Enabled' : 'Disabled'} ${key.replace(/_/g, ' ')} for ${ROLE_LABELS[role] || role}`, 'success');
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
    try { await window.StudentService?.delete(id); AppToast.show('Student deleted.', 'success'); AppStorage.invalidate(); AppModal.close('modal-confirm-student'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    return;
  }
  if (action === 'sp-student-page') { window.SchoolStudents.currentPage = parseInt(el.dataset.page); AppRouter.render(); return; }
  if (action === 'sp-view-student') { window.SchoolStudents.viewStudent(id); return; }
  if (action === 'sp-download-profile') {
    try {
      const data = await AppStorage.load();
      const student = (data.students || []).find(s => s.id === id);
      if (!student) { AppToast.show('Student not found.', 'error'); return; }
      const profileText = JSON.stringify(student, null, 2);
      const blob = new Blob([profileText], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `profile-${student.name || id}.json`; link.click();
      URL.revokeObjectURL(link.href);
      AppToast.show('Profile downloaded.', 'success');
    } catch (e) { AppToast.show('Download failed.', 'error'); }
    return;
  }
  if (action === 'sp-print-profile') { window.print(); return; }
  if (action === 'sp-student-courses') {
    window.SchoolStudents.assignCourses(id);
    return;
  }
  if (action === 'sp-generate-creds') {
    const nameVal = document.getElementById('sp-input-student-name')?.value?.trim() || 'student';
    const username = nameVal.toLowerCase().replace(/\s+/g, '.') + '.' + Math.random().toString(36).slice(2, 6);
    const credsEl = document.getElementById('sp-input-student-username');
    if (credsEl) credsEl.value = username + ' / pass@123';
    AppToast.show('Login credentials generated.', 'success');
    return;
  }

  // Counselors
  if (action === 'sp-view-counselor') { window.SchoolCounselors.viewCounselor(id); return; }
  if (action === 'sp-add-counselor') { window.SchoolCounselors.openAdd(AppRouter.currentSchoolId); return; }
  if (action === 'sp-save-counselor') { window.SchoolCounselors.save(false, id); return; }
  if (action === 'sp-update-counselor') { window.SchoolCounselors.save(true, id); return; }
  if (action === 'sp-edit-counselor') { window.SchoolCounselors.openEdit(id); return; }
  if (action === 'sp-toggle-counselor-status') { window.SchoolCounselors.toggleStatus(id); return; }
  if (action === 'sp-delete-counselor') { window.SchoolCounselors.confirmDelete(id); return; }
  if (action === 'sp-confirm-delete-counselor') {
    try { await window.CounselorService?.delete(id); AppToast.show('Counselor deleted.', 'success'); AppStorage.invalidate(); AppModal.close('modal-confirm-counselor'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    return;
  }
  if (action === 'sp-counselor-page') { window.SchoolCounselors.currentPage = parseInt(el.dataset.page); AppRouter.render(); return; }

  // Courses
  if (action === 'sp-add-course') { window.SchoolCourses.openAdd(AppRouter.currentSchoolId); return; }
  if (action === 'sp-save-course') { window.SchoolCourses.save(false, id); return; }
  if (action === 'sp-update-course') { window.SchoolCourses.save(true, id); return; }
  if (action === 'sp-edit-course') { window.SchoolCourses.openEdit(id); return; }
  if (action === 'sp-manage-course') { window.SchoolCourses.manage(id); return; }
  if (action === 'sp-manage-structure') { window.SchoolCourses.manageStructure(id); return; }
  if (action === 'sp-view-course') { window.SchoolCourses.viewCourse(id); return; }
  if (action === 'sp-delete-course') { window.SchoolCourses.confirmDelete(id); return; }
  if (action === 'sp-confirm-delete-course') {
    try { await window.CourseService?.delete(id); AppToast.show('Course deleted.', 'success'); AppStorage.invalidate(); AppModal.close('modal-confirm-course'); AppRouter.render(); }
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

  // LMS — Course Structure
  if (action === 'sp-manage-structure') {
    window.SchoolCourses.manageStructure(id);
    return;
  }
  if (action === 'sp-add-module') {
    window.SchoolCourses.showModuleForm(null);
    return;
  }
  if (action === 'sp-save-module') {
    const title = document.getElementById('sp-input-module-title')?.value?.trim();
    if (!title) { AppToast.show('Module title is required.', 'error'); return; }
    const description = document.getElementById('sp-input-module-desc')?.value?.trim() || null;
    const moduleId = document.getElementById('sp-input-module-id')?.value;
    const courseId = el.dataset.courseId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        if (moduleId) {
          await window.ModuleService?.update(moduleId, { title, description });
          AppToast.show('Module updated.', 'success');
        } else {
          const modules = await window.ModuleService?.getByCourse(courseId) || [];
          await window.ModuleService?.create({ course_id: courseId, title, description, sort_order: modules.length });
          AppToast.show('Module added.', 'success');
        }
        AppModal.close('modal-module-form');
        AppStorage.invalidate();
        window.SchoolCourses.manageStructure(courseId);
      } catch (err) { AppToast.show(err.message || 'Failed to save module.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-edit-module') {
    window.SchoolCourses.showModuleForm(id);
    return;
  }
  if (action === 'sp-delete-module') {
    const confirmed = await AppConfirm.show('Delete this module and all its lessons? This action cannot be undone.', 'Delete Module');
    if (!confirmed) return;
    const courseId = el.dataset.courseId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        await window.ModuleService?.delete(id);
        AppToast.show('Module deleted.', 'success');
        AppStorage.invalidate();
        if (courseId) window.SchoolCourses.manageStructure(courseId);
      } catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-add-lesson') {
    const moduleId = el.dataset.moduleId;
    window.SchoolCourses.showLessonForm(moduleId, null);
    return;
  }
  if (action === 'sp-save-lesson') {
    const title = document.getElementById('sp-input-lesson-title')?.value?.trim();
    if (!title) { AppToast.show('Lesson title is required.', 'error'); return; }
    const contentType = document.getElementById('sp-input-lesson-type')?.value || 'video';
    const contentUrl = document.getElementById('sp-input-lesson-url')?.value?.trim() || null;
    const duration = parseInt(document.getElementById('sp-input-lesson-duration')?.value) || null;
    const moduleId = document.getElementById('sp-input-lesson-module')?.value;
    const lessonId = document.getElementById('sp-input-lesson-id')?.value;
    const courseId = el.dataset.courseId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        let contentId = null;
        if (lessonId) {
          const existing = await window.LessonService?.getById(lessonId);
          contentId = existing?.content_id || null;
          await window.LessonService?.update(lessonId, { title, content_type: contentType, content_url: contentUrl, duration });
          AppToast.show('Lesson updated.', 'success');
        } else {
          const lessons = await window.LessonService?.getByModule(moduleId) || [];
          const created = await window.LessonService?.create({ module_id: moduleId, title, content_type: contentType, content_url: contentUrl, sort_order: lessons.length, duration });
          if (created) contentId = created.id;
          AppToast.show('Lesson added.', 'success');
        }
        if (contentType === 'assignment' && courseId) {
          const existing = await window.AssignmentService?.getByCourse(courseId) || [];
          if (!existing.find(a => a.title === title)) {
            await window.AssignmentService?.create({ courseId, title, description: null, dueDate: null, maxMarks: null });
          }
        }
        if (contentType === 'quiz' && courseId) {
          const existing = await window.QuizService?.getByCourse(courseId) || [];
          if (!existing.find(q => q.title === title)) {
            await window.QuizService?.create({ courseId, title, description: null, timeLimit: null, passingScore: null });
          }
        }
        AppModal.close('modal-lesson-form');
        AppStorage.invalidate();
        const parentModule = await window.ModuleService?.getById(moduleId);
        if (parentModule) window.SchoolCourses.manageStructure(parentModule.course_id);
      } catch (err) { AppToast.show(err.message || 'Failed to save lesson.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-edit-lesson') {
    const lesson = await window.LessonService?.getById(id);
    if (lesson) window.SchoolCourses.showLessonForm(lesson.module_id, id);
    return;
  }
  if (action === 'sp-delete-lesson') {
    const confirmed = await AppConfirm.show('Delete this lesson? This action cannot be undone.', 'Delete Lesson');
    if (!confirmed) return;
    const courseId = el.dataset.courseId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const lesson = await window.LessonService?.getById(id);
        await window.LessonService?.delete(id);
        AppToast.show('Lesson deleted.', 'success');
        AppStorage.invalidate();
        if (lesson) {
          const parentModule = await window.ModuleService?.getById(lesson.module_id);
          if (parentModule) window.SchoolCourses.manageStructure(parentModule.course_id);
        }
      } catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-move-module') {
    const dir = el.dataset.direction;
    const courseId = el.dataset.courseId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const modules = await window.ModuleService?.getByCourse(courseId) || [];
        const idx = modules.findIndex(m => m.id === id);
        if (idx < 0) return;
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= modules.length) return;
        const items = modules.map((m, i) => ({ id: m.id, sort_order: i === idx ? modules[swapIdx].sort_order : i === swapIdx ? modules[idx].sort_order : m.sort_order }));
        for (const item of items) {
          await window.ModuleService?.update(item.id, { sort_order: item.sort_order });
        }
        window.SchoolCourses.manageStructure(courseId);
      } catch (err) { AppToast.show(err.message, 'error'); }
    })();
    return;
  }
  if (action === 'sp-move-lesson') {
    const dir = el.dataset.direction;
    const lesson = await window.LessonService?.getById(id);
    if (!lesson) return;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const lessons = await window.LessonService?.getByModule(lesson.module_id) || [];
        const idx = lessons.findIndex(l => l.id === id);
        if (idx < 0) return;
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= lessons.length) return;
        const items = lessons.map((l, i) => ({ id: l.id, sort_order: i === idx ? lessons[swapIdx].sort_order : i === swapIdx ? lessons[idx].sort_order : l.sort_order }));
        for (const item of items) {
          await window.LessonService?.update(item.id, { sort_order: item.sort_order });
        }
        const parentModule = await window.ModuleService?.getById(lesson.module_id);
        if (parentModule) window.SchoolCourses.manageStructure(parentModule.course_id);
      } catch (err) { AppToast.show(err.message, 'error'); }
    })();
    return;
  }

  // LMS — Student Portal (lazy-load lms-student.js)
  async function _ensureStudentPortal() {
    if (!window.StudentPortal) await import('./lms-student.js');
  }
  if (action === 'sp-open-student-portal') {
    const studentId = el.dataset.studentId || id;
    await _ensureStudentPortal();
    window.StudentPortal.dashboard(studentId);
    return;
  }
  if (action === 'sp-open-course-player') {
    const studentId = el.dataset.studentId;
    const courseId = el.dataset.courseId || id;
    await _ensureStudentPortal();
    window.StudentPortal.openCoursePlayer(studentId, courseId);
    return;
  }
  if (action === 'sp-player-select-lesson') {
    const studentId = el.dataset.studentId;
    const lessonId = el.dataset.lessonId || id;
    await _ensureStudentPortal();
    window.StudentPortal.loadLesson(studentId, lessonId);
    return;
  }
  if (action === 'sp-player-mark-complete') {
    const studentId = el.dataset.studentId;
    const lessonId = el.dataset.lessonId || id;
    await _ensureStudentPortal();
    window.StudentPortal.markComplete(studentId, lessonId);
    return;
  }
  if (action === 'sp-player-prev') {
    const studentId = el.dataset.studentId;
    const lessonId = el.dataset.lessonId || id;
    await _ensureStudentPortal();
    window.StudentPortal.navigateLesson(studentId, lessonId, 'prev');
    return;
  }
  if (action === 'sp-player-next') {
    const studentId = el.dataset.studentId;
    const lessonId = el.dataset.lessonId || id;
    await _ensureStudentPortal();
    window.StudentPortal.navigateLesson(studentId, lessonId, 'next');
    return;
  }
  if (action === 'sp-open-assignment') {
    const lessonId = el.dataset.lessonId;
    const studentId = el.dataset.studentId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const lesson = await window.LessonService?.getById(lessonId);
        if (!lesson) { AppToast.show('Lesson not found.', 'error'); return; }
        const mod = await window.ModuleService?.getById(lesson.module_id);
        if (!mod) { AppToast.show('Module not found.', 'error'); return; }
        const assignments = await window.AssignmentService?.getByCourse(mod.course_id) || [];
        const assignment = assignments.find(a => a.title === lesson.title) || assignments[0];
        const submission = studentId && assignment ? await window.AssignmentService?.getStudentSubmission(assignment.id, studentId) : null;
        const existing = document.getElementById('modal-assignment');
        if (existing) existing.remove();
        const eh = AppUtils.escapeHtml;
        const safeUrl = u => u && u.startsWith('http') ? eh(u) : '';
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modal-assignment';
        overlay.innerHTML = `<div class="modal" style="max-width:600px;">
          <div class="modal-header"><h3 class="modal-title">${eh(lesson.title)}</h3><button class="modal-close" data-close-modal="modal-assignment"><span class="material-symbols-outlined">close</span></button></div>
          <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
            ${assignment ? `<div style="margin-bottom:16px;">
              ${assignment.description ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">${eh(assignment.description)}</div>` : ''}
              <div style="display:flex;gap:12px;">
                ${assignment.max_marks ? `<div style="padding:8px 12px;background:#f5f3ff;border-radius:6px;font-size:12px;"><strong>Max Marks:</strong> ${assignment.max_marks}</div>` : ''}
                ${assignment.due_date ? `<div style="padding:8px 12px;background:#fffbeb;border-radius:6px;font-size:12px;"><strong>Due:</strong> ${AppUtils.formatDate(assignment.due_date)}</div>` : ''}
              </div>
            </div>` : '<div style="padding:12px;background:#fef2f2;border-radius:8px;font-size:13px;">No assignment configuration found. Contact your teacher.</div>'}
            ${studentId && assignment ? (submission ? `<div style="border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">
              <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Your Submission</div>
              <div style="display:flex;gap:8px;margin-bottom:8px;">
                <span class="status-badge ${submission.status === 'reviewed' ? 'status-active' : 'status-suspended'}" style="font-size:11px;">${eh(submission.status)}</span>
                ${submission.marks !== null && submission.marks !== undefined ? `<span style="font-size:13px;font-weight:600;">Score: ${submission.marks}${assignment.max_marks ? '/' + assignment.max_marks : ''}</span>` : ''}
              </div>
              ${submission.submission_text ? `<div style="font-size:12px;background:var(--card-bg);padding:8px;border-radius:6px;margin-bottom:6px;">${eh(submission.submission_text)}</div>` : ''}
              ${submission.file_url ? `<div style="font-size:12px;"><a href="${safeUrl(submission.file_url)}" target="_blank" rel="noopener noreferrer">View attachment</a></div>` : ''}
              ${submission.remarks ? `<div style="margin-top:8px;padding:8px;background:#f0fdf4;border-radius:6px;font-size:12px;"><strong>Feedback:</strong> ${eh(submission.remarks)}</div>` : ''}
            </div>` : `<div style="margin-bottom:12px;">
              <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Submit Assignment</div>
              <div class="form-group"><textarea class="form-input" id="sp-assignment-text" placeholder="Write your answer here..." style="height:100px;resize:vertical;"></textarea></div>
              <div class="form-group" style="margin-top:8px;"><input type="text" class="form-input" id="sp-assignment-url" placeholder="Attachment URL (optional)"></div>
              <button class="btn btn-primary" data-action="sp-submit-assignment" data-assignment-id="${assignment.id}" data-student-id="${studentId}" data-lesson-id="${lessonId}" style="margin-top:8px;">Submit</button>
            </div>`) : ''}
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-close-modal="modal-assignment">Close</button></div>
        </div>`;
        document.body.appendChild(overlay);
        AppModal.open(overlay.id);
        initIcons();
      } catch (err) { AppToast.show(err.message || 'Failed to open assignment.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-start-quiz') {
    const lessonId = el.dataset.lessonId;
    const studentId = el.dataset.studentId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const lesson = await window.LessonService?.getById(lessonId);
        if (!lesson) { AppToast.show('Lesson not found.', 'error'); return; }
        const mod = await window.ModuleService?.getById(lesson.module_id);
        if (!mod) { AppToast.show('Module not found.', 'error'); return; }
        const quizzes = await window.QuizService?.getByCourse(mod.course_id) || [];
        const quiz = quizzes.find(q => q.title === lesson.title) || quizzes[0];
        if (!quiz) { AppToast.show('Quiz not configured. Contact your teacher.', 'warn'); return; }
        const questions = await window.QuizService?.getQuestions(quiz.id) || [];
        if (questions.length === 0) { AppToast.show('No questions in this quiz yet.', 'info'); return; }
        const existing = document.getElementById('modal-quiz');
        if (existing) existing.remove();
        const eh = AppUtils.escapeHtml;
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modal-quiz';
        overlay.innerHTML = `<div class="modal" style="max-width:650px;">
          <div class="modal-header"><h3 class="modal-title">${eh(lesson.title)}</h3><button class="modal-close" data-close-modal="modal-quiz"><span class="material-symbols-outlined">close</span></button></div>
          <div class="modal-body" style="max-height:70vh;overflow-y:auto;" id="quiz-body">
            <div style="text-align:center;padding:30px;">
              <span class="material-symbols-outlined" style="font-size:48px;color:#f59e0b;margin-bottom:12px;">quiz</span>
              <div style="font-size:16px;font-weight:600;margin-bottom:4px;">${eh(quiz.title)}</div>
              ${quiz.description ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">${eh(quiz.description)}</div>` : ''}
              <div style="display:flex;gap:12px;justify-content:center;margin-bottom:16px;">
                <span style="font-size:12px;padding:4px 10px;background:#f5f3ff;border-radius:6px;">${questions.length} questions</span>
                ${quiz.passing_score ? `<span style="font-size:12px;padding:4px 10px;background:#fffbeb;border-radius:6px;">Pass: ${quiz.passing_score}%</span>` : ''}
                ${quiz.time_limit ? `<span style="font-size:12px;padding:4px 10px;background:#eff6ff;border-radius:6px;">${quiz.time_limit} min</span>` : ''}
              </div>
              <button class="btn btn-primary" data-action="sp-quiz-begin" data-quiz-id="${quiz.id}" data-student-id="${studentId}" data-lesson-id="${lessonId}">Start Quiz</button>
            </div>
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-close-modal="modal-quiz">Close</button></div>
        </div>`;
        document.body.appendChild(overlay);
        AppModal.open(overlay.id);
        initIcons();
      } catch (err) { AppToast.show(err.message || 'Failed to load quiz.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-quiz-begin') {
    const quizId = el.dataset.quizId;
    const studentId = el.dataset.studentId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const attempt = await window.QuizService?.startAttempt(quizId, studentId);
        if (!attempt) { AppToast.show('Failed to start quiz attempt.', 'error'); return; }
        const eh = AppUtils.escapeHtml;
        const questions = await window.QuizService?.getQuestions(quizId) || [];
        const body = document.getElementById('quiz-body');
        if (!body) return;
        const quiz = await window.QuizService?.getById(quizId);
        body.innerHTML = `<div style="padding:8px 0;">
          <form id="quiz-form">
          ${questions.map((q, i) => {
            const opts = q.options || [];
            const optsParsed = typeof opts === 'string' ? (() => { try { return JSON.parse(opts); } catch { return []; } })() : opts;
            let inputHtml = '';
            if (q.question_type === 'mcq' && optsParsed.length > 0) {
              inputHtml = optsParsed.map(o => `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;margin:4px 0;cursor:pointer;"><input type="radio" name="q_${q.id}" value="${eh(o)}" style="width:16px;height:16px;"><span style="font-size:13px;">${eh(o)}</span></label>`).join('');
            } else if (q.question_type === 'true_false') {
              inputHtml = ['True','False'].map(o => `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border-light);border-radius:6px;margin:4px 0;cursor:pointer;"><input type="radio" name="q_${q.id}" value="${eh(o)}" style="width:16px;height:16px;"><span style="font-size:13px;">${eh(o)}</span></label>`).join('');
            } else {
              inputHtml = `<textarea class="form-input" name="q_${q.id}" placeholder="Type your answer..." style="height:60px;resize:vertical;"></textarea>`;
            }
            return `<div style="border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:12px;">
              <div style="font-size:13px;font-weight:600;margin-bottom:8px;">Q${i + 1}. ${eh(q.question_text)} <span style="font-weight:400;color:var(--text-muted);font-size:11px;">(${q.marks || 1} mark${q.marks !== 1 ? 's' : ''})</span></div>
              ${inputHtml}
            </div>`;
          }).join('')}
          </form>
          <button class="btn btn-primary" data-action="sp-submit-quiz" data-attempt-id="${attempt.id}" data-quiz-id="${quizId}" data-student-id="${studentId}" style="margin-top:8px;">Submit Answers</button>
        </div>`;
        initIcons();
      } catch (err) { AppToast.show(err.message || 'Failed to start quiz.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-submit-assignment') {
    const assignmentId = el.dataset.assignmentId;
    const studentId = el.dataset.studentId;
    const lessonId = el.dataset.lessonId;
    const text = document.getElementById('sp-assignment-text')?.value?.trim();
    const url = document.getElementById('sp-assignment-url')?.value?.trim() || null;
    if (!text && !url) { AppToast.show('Please provide an answer or attachment.', 'warn'); return; }
    try {
      await window.AssignmentService?.submitAssignment(assignmentId, studentId, { submissionText: text, fileUrl: url });
      AppToast.show('Assignment submitted!', 'success');
      AppModal.close('modal-assignment');
      setTimeout(() => {
        const btn = document.querySelector(`[data-action="sp-open-assignment"][data-lesson-id="${lessonId}"]`);
        if (btn) btn.click();
      }, 300);
    } catch (err) { AppToast.show(err.message || 'Failed to submit.', 'error'); }
    return;
  }
  if (action === 'sp-submit-quiz') {
    const attemptId = el.dataset.attemptId;
    const quizId = el.dataset.quizId;
    const studentId = el.dataset.studentId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const questions = await window.QuizService?.getQuestions(quizId) || [];
        for (const q of questions) {
          const input = document.querySelector(`[name="q_${q.id}"]`);
          if (input) {
            const answer = input.type === 'radio' ? input.value : input.value.trim();
            if (answer) {
              await window.QuizService?.submitAnswer(attemptId, q.id, answer);
            }
          }
        }
        const result = await window.QuizService?.completeAttempt(attemptId);
        if (!result) { AppToast.show('Failed to complete quiz.', 'error'); return; }
        const body = document.getElementById('quiz-body');
        if (body) {
          body.innerHTML = `<div style="text-align:center;padding:20px;">
            <span class="material-symbols-outlined" style="font-size:48px;color:${result.passed ? '#10b981' : '#ef4444'};margin-bottom:12px;">${result.passed ? 'check_circle' : 'cancel'}</span>
            <div style="font-size:20px;font-weight:700;margin-bottom:4px;">${result.passed ? 'Passed!' : 'Not Passed'}</div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;">Your score: ${result.score} / ${result.total_marks} (${result.percentage}%)</div>
            ${result.passed ? '' : '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Review the material and try again.</div>'}
          </div>`;
        }
        AppToast.show(result.passed ? 'Quiz passed!' : 'Quiz completed.', result.passed ? 'success' : 'info');
        initIcons();
      } catch (err) { AppToast.show(err.message || 'Failed to submit quiz.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-open-lesson') {
    const studentId = el.dataset.studentId;
    const lessonId = el.dataset.lessonId || id;
    const lesson = await window.LessonService?.getById(lessonId);
    if (lesson) {
      const parentModule = await window.ModuleService?.getById(lesson.module_id);
      if (parentModule) { await _ensureStudentPortal(); window.StudentPortal.openCoursePlayer(studentId, parentModule.course_id); }
      setTimeout(() => window.StudentPortal.loadLesson(studentId, lessonId), 300);
    }
    return;
  }
  if (action === 'sp-view-certificate') {
    const studentId = el.dataset.studentId;
    const courseId = el.dataset.courseId || id;
    await _ensureStudentPortal();
    window.StudentPortal.viewCertificate(studentId, courseId);
    return;
  }
  if (action === 'sp-download-certificate') {
    const certId = el.dataset.certId;
    try {
      const cert = await window.CertificateService?.getById(certId);
      const student = cert ? await window.StudentService?.getById(cert.student_id) : null;
      const course = cert ? await window.CourseService?.getById(cert.course_id) : null;
      if (cert && student && course) {
        const win = window.open('', '_blank');
        if (win) {
          const eh = AppUtils.escapeHtml;
          win.document.write(`<!DOCTYPE html><html><head><title>${eh(course.name)} - Certificate</title><style>
            body { font-family: Georgia, serif; display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5; }
            .cert { border:3px double #1A56DB; border-radius:12px; padding:60px 40px; max-width:700px; text-align:center; background:linear-gradient(135deg,#faf5ff,#eff6ff); margin:20px; }
            h1 { font-size:12px; text-transform:uppercase; letter-spacing:2px; color:#666; }
            h2 { font-size:32px; color:#1A56DB; margin:8px 0; }
            .sub { font-size:14px; color:#666; }
            .name { font-size:24px; font-weight:600; border-bottom:2px solid #1A56DB; display:inline-block; padding-bottom:4px; margin:24px 0; }
            .footer { font-size:9px; color:#999; margin-top:24px; }
            .meta { font-size:11px; font-family:monospace; color:#666; margin-top:8px; }
          </style></head><body>
            <div class="cert">
              <h1>Certificate of Completion</h1>
              <h2>${eh(course.name)}</h2>
              <div class="sub">This is to certify that</div>
              <div class="name">${eh(student.name)}</div>
              <div class="sub">has successfully completed the course requirements on ${AppUtils.formatDate(cert.completed_at || cert.issued_at)}</div>
              <div class="meta">Certificate ID: ${eh(cert.certificate_number || certId)}</div>
              <div class="footer">LANXGROW INDIA — Learning Management System</div>
            </div>
            <script>window.print();<\/script>
          </body></html>`);
          win.document.close();
        }
      } else {
        AppToast.show('Certificate data not found.', 'warn');
      }
    } catch (err) { AppToast.show(err.message || 'Download failed.', 'error'); }
    return;
  }

  // ==============================================================
  // TEACHER LMS MANAGEMENT — Assignments, Quiz Questions, Progress
  // ==============================================================
  if (action === 'sp-manage-questions') {
    const lessonId = el.dataset.lessonId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const lesson = await window.LessonService?.getById(lessonId);
        if (!lesson) { AppToast.show('Lesson not found.', 'error'); return; }
        const eh = AppUtils.escapeHtml;
        const mod = await window.ModuleService?.getById(lesson.module_id);
        const quizzes = mod ? await window.QuizService?.getByCourse(mod.course_id) || [] : [];
        const quiz = quizzes.find(q => q.title === lesson.title) || quizzes[0];
        if (!quiz) { AppToast.show('Create the quiz lesson first.', 'warn'); return; }
        const questions = await window.QuizService?.getQuestions(quiz.id) || [];
        const existing = document.getElementById('modal-manage-questions');
        if (existing) existing.remove();
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modal-manage-questions';
        const typeLabels = { mcq: 'Multiple Choice', true_false: 'True/False', short_answer: 'Short Answer' };
        overlay.innerHTML = `<div class="modal" style="max-width:600px;">
          <div class="modal-header"><h3 class="modal-title">Questions: ${eh(lesson.title)}</h3><button class="modal-close" data-close-modal="modal-manage-questions"><span class="material-symbols-outlined">close</span></button></div>
          <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
            <button class="btn btn-primary btn-sm" data-action="sp-add-question" data-quiz-id="${quiz.id}" data-lesson-id="${lessonId}" style="margin-bottom:12px;"><span class="material-symbols-outlined" style="font-size:14px;">add</span> Add Question</button>
            ${questions.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No questions yet.</div>'
            : questions.map((q, i) => `
              <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span style="font-size:13px;font-weight:600;">Q${i + 1}. ${eh(q.question_text)}</span>
                  <div style="display:flex;gap:4px;">
                    <button class="btn btn-ghost btn-sm" style="width:26px;height:26px;padding:0;" data-action="sp-add-question" data-quiz-id="${quiz.id}" data-question-id="${q.id}" data-lesson-id="${lessonId}"><span class="material-symbols-outlined" style="font-size:13px;">edit</span></button>
                    <button class="btn btn-ghost btn-sm btn-danger-ghost" style="width:26px;height:26px;padding:0;" data-action="sp-delete-question" data-question-id="${q.id}"><span class="material-symbols-outlined" style="font-size:13px;">delete</span></button>
                  </div>
                </div>
                <div style="display:flex;gap:8px;font-size:11px;color:var(--text-secondary);">
                  <span>${typeLabels[q.question_type] || eh(q.question_type)}</span>
                  <span>${q.marks || 1} mark${q.marks !== 1 ? 's' : ''}</span>
                  <span>Answer: ${q.correct_answer != null ? eh(typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : String(q.correct_answer)) : '—'}</span>
                </div>
              </div>`).join('')}
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-close-modal="modal-manage-questions">Done</button></div>
        </div>`;
        document.body.appendChild(overlay);
        AppModal.open(overlay.id);
        initIcons();
      } catch (err) { AppToast.show(err.message || 'Failed to load questions.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-add-question') {
    const quizId = el.dataset.quizId;
    const questionId = el.dataset.questionId || '';
    const lessonId = el.dataset.lessonId || document.getElementById('sp-q-lesson-id')?.value || '';
    (async () => {
      const eh = AppUtils.escapeHtml;
      let qData = null;
      if (questionId) { try { const qs = await window.QuizService?.getQuestions(quizId) || []; qData = qs.find(q => q.id === questionId); } catch {} }
      const existing = document.getElementById('modal-question-form');
      if (existing) existing.remove();
      const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modal-question-form';
      overlay.innerHTML = `<div class="modal" style="max-width:500px;">
        <div class="modal-header"><h3 class="modal-title">${qData ? 'Edit Question' : 'Add Question'}</h3><button class="modal-close" data-close-modal="modal-question-form"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Question Text</label><textarea class="form-input" id="sp-q-text" style="height:60px;resize:vertical;">${eh(qData?.question_text || '')}</textarea></div>
          <div class="form-group" style="margin-top:10px;"><label class="form-label">Type</label>
            <select class="form-select" id="sp-q-type">
              <option value="mcq" ${qData?.question_type === 'mcq' ? 'selected' : ''}>Multiple Choice</option>
              <option value="true_false" ${qData?.question_type === 'true_false' ? 'selected' : ''}>True/False</option>
              <option value="short_answer" ${qData?.question_type === 'short_answer' ? 'selected' : ''}>Short Answer</option>
            </select>
          </div>
          <div class="form-group" style="margin-top:10px;" id="sp-q-options-group">
            <label class="form-label">Options (comma-separated)</label>
            <input type="text" class="form-input" id="sp-q-options" value="${eh(Array.isArray(qData?.options) ? qData.options.join(', ') : (typeof qData?.options === 'string' ? qData.options : ''))}" placeholder="e.g. Option A, Option B, Option C">
          </div>
          <div class="form-group" style="margin-top:10px;"><label class="form-label">Correct Answer</label><input type="text" class="form-input" id="sp-q-answer" value="${eh(qData?.correct_answer || '')}"></div>
          <div class="form-group" style="margin-top:10px;"><label class="form-label">Marks</label><input type="number" class="form-input" id="sp-q-marks" value="${qData?.marks || 1}" min="1" style="width:80px;"></div>
          <input type="hidden" id="sp-q-quiz-id" value="${quizId}">
          <input type="hidden" id="sp-q-id" value="${questionId}">
          <input type="hidden" id="sp-q-lesson-id" value="${lessonId}">
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-question-form">Cancel</button>
          <button class="btn btn-primary" data-action="sp-save-question">${qData ? 'Save Changes' : 'Add Question'}</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      const typeSel = document.getElementById('sp-q-type');
      const optsGroup = document.getElementById('sp-q-options-group');
      const toggleOpts = () => { optsGroup.style.display = typeSel.value === 'short_answer' ? 'none' : ''; };
      typeSel.addEventListener('change', toggleOpts);
      toggleOpts();
      initIcons();
    })();
    return;
  }
  if (action === 'sp-save-question') {
    const quizId = document.getElementById('sp-q-quiz-id')?.value;
    const questionId = document.getElementById('sp-q-id')?.value;
    const questionText = document.getElementById('sp-q-text')?.value?.trim();
    const questionType = document.getElementById('sp-q-type')?.value;
    const optionsRaw = document.getElementById('sp-q-options')?.value?.trim();
    const correctAnswer = document.getElementById('sp-q-answer')?.value?.trim();
    const marks = parseInt(document.getElementById('sp-q-marks')?.value) || 1;
    if (!questionText) { AppToast.show('Question text is required.', 'error'); return; }
    if (!correctAnswer) { AppToast.show('Correct answer is required.', 'error'); return; }
    const options = questionType !== 'short_answer' && optionsRaw ? optionsRaw.split(',').map(o => o.trim()).filter(Boolean) : null;
    if (questionType === 'mcq' && (!options || options.length < 2)) { AppToast.show('MCQ requires at least 2 options.', 'error'); return; }
    const questions = await window.QuizService?.getQuestions(quizId) || [];
    const sortOrder = questionId ? null : questions.length;
    try {
      if (questionId) {
        await window.QuizService?.updateQuestion(questionId, { question_text: questionText, question_type: questionType, options, correct_answer: correctAnswer, marks });
        AppToast.show('Question updated.', 'success');
      } else {
        await window.QuizService?.createQuestion({ quizId, questionText, questionType, options, correctAnswer, marks, sortOrder });
        AppToast.show('Question added.', 'success');
      }
      AppModal.close('modal-question-form');
      const qLessonId = document.getElementById('sp-q-lesson-id')?.value;
      if (qLessonId) { setTimeout(() => { const btn = document.querySelector(`[data-action="sp-manage-questions"][data-lesson-id="${qLessonId}"]`); if (btn) btn.click(); }, 200); }
    } catch (err) { AppToast.show(err.message || 'Failed to save question.', 'error'); }
    return;
  }
  if (action === 'sp-delete-question') {
    const questionId = el.dataset.questionId;
    const confirmed = await AppConfirm.show('Delete this question? This action cannot be undone.', 'Delete Question');
    if (!confirmed) return;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        await window.QuizService?.deleteQuestion(questionId);
        AppToast.show('Question deleted.', 'success');
        AppModal.close('modal-manage-questions');
      } catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-manage-assignment-submissions') {
    const lessonId = el.dataset.lessonId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const lesson = await window.LessonService?.getById(lessonId);
        if (!lesson) { AppToast.show('Lesson not found.', 'error'); return; }
        const eh = AppUtils.escapeHtml;
        const safeUrl = u => u && u.startsWith('http') ? eh(u) : '';
        const mod = await window.ModuleService?.getById(lesson.module_id);
        const assignments = mod ? await window.AssignmentService?.getByCourse(mod.course_id) || [] : [];
        const assignment = assignments.find(a => a.title === lesson.title) || assignments[0];
        if (!assignment) { AppToast.show('Assignment not configured.', 'warn'); return; }
        const submissions = await window.AssignmentService?.getSubmissions(assignment.id) || [];
        const existing = document.getElementById('modal-assignment-submissions');
        if (existing) existing.remove();
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modal-assignment-submissions';
        overlay.innerHTML = `<div class="modal" style="max-width:700px;">
          <div class="modal-header"><h3 class="modal-title">Submissions: ${eh(lesson.title)}</h3><button class="modal-close" data-close-modal="modal-assignment-submissions"><span class="material-symbols-outlined">close</span></button></div>
          <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
            ${submissions.length === 0 ? '<div style="padding:30px;text-align:center;color:var(--text-muted);">No submissions yet.</div>'
            : submissions.map(s => `
              <div style="border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <span style="font-size:14px;font-weight:600;">${eh(s.student?.name) || 'Unknown Student'}</span>
                  <span class="status-badge ${s.status === 'reviewed' ? 'status-active' : 'status-suspended'}" style="font-size:11px;">${eh(s.status)}</span>
                </div>
                ${s.submission_text ? `<div style="font-size:12px;background:var(--card-bg);padding:8px;border-radius:6px;margin-bottom:6px;">${eh(s.submission_text)}</div>` : ''}
                ${s.file_url ? `<div style="font-size:12px;margin-bottom:6px;"><a href="${safeUrl(s.file_url)}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : ''}
                ${s.status === 'reviewed' ? `
                <div style="display:flex;gap:12px;font-size:12px;padding:6px 0;border-top:1px solid var(--border-light);margin-top:6px;">
                  <span><strong>Marks:</strong> ${eh(s.marks)}${assignment.max_marks ? '/' + assignment.max_marks : ''}</span>
                  ${s.remarks ? `<span><strong>Feedback:</strong> ${eh(s.remarks)}</span>` : ''}
                </div>` : `
                <div style="border-top:1px solid var(--border-light);padding-top:8px;margin-top:6px;">
                  <div style="display:flex;gap:8px;align-items:center;">
                    <input type="number" class="form-input" id="grade-marks-${s.id}" placeholder="Marks" min="0" ${assignment.max_marks ? `max="${assignment.max_marks}"` : ''} style="width:80px;height:32px;font-size:12px;">
                    <input type="text" class="form-input" id="grade-remarks-${s.id}" placeholder="Feedback" style="flex:1;height:32px;font-size:12px;">
                    <button class="btn btn-primary btn-sm" data-action="sp-grade-submission" data-submission-id="${s.id}" data-assignment-id="${assignment.id}">Grade</button>
                  </div>
                </div>`}
              </div>`).join('')}
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-close-modal="modal-assignment-submissions">Close</button></div>
        </div>`;
        document.body.appendChild(overlay);
        AppModal.open(overlay.id);
        initIcons();
      } catch (err) { AppToast.show(err.message || 'Failed to load submissions.', 'error'); }
    })();
    return;
  }
  if (action === 'sp-grade-submission') {
    const submissionId = el.dataset.submissionId;
    const marks = parseInt(document.getElementById(`grade-marks-${submissionId}`)?.value);
    const remarks = document.getElementById(`grade-remarks-${submissionId}`)?.value?.trim() || null;
    if (marks === undefined || isNaN(marks)) { AppToast.show('Please enter marks.', 'warn'); return; }
    try {
      const profile = await AuthService.getProfile();
      await window.AssignmentService?.reviewSubmission(submissionId, marks, remarks, profile?.id || null);
      AppToast.show('Submission graded.', 'success');
      AppModal.close('modal-assignment-submissions');
    } catch (err) { AppToast.show(err.message || 'Failed to grade.', 'error'); }
    return;
  }
  if (action === 'sp-course-progress') {
    const courseId = el.dataset.courseId;
    (async () => {
      const eh = AppUtils.escapeHtml;
      try {
        const course = await window.CourseService?.getById(courseId);
        if (!course) { AppToast.show('Course not found.', 'error'); return; }
        const eh = AppUtils.escapeHtml;
        const enrollments = await window.EnrollmentService?.getByCourse(courseId) || [];
        const validStudents = enrollments.filter(e => e.status === 'active').map(e => e.student).filter(Boolean);
        const progressData = await Promise.all(validStudents.map(async s => {
          try {
            const p = await window.ProgressService?.getCourseProgress(s.id, courseId) || { total_lessons: 0, completed_lessons: 0, percentage: 0 };
            return { student: s, progress: p };
          } catch { return { student: s, progress: { total_lessons: 0, completed_lessons: 0, percentage: 0 } }; }
        }));
        const existing = document.getElementById('modal-course-progress');
        if (existing) existing.remove();
        const overlay = document.createElement('div'); overlay.className = 'modal-overlay'; overlay.id = 'modal-course-progress';
        overlay.innerHTML = `<div class="modal" style="max-width:600px;">
          <div class="modal-header"><h3 class="modal-title">Progress: ${eh(course.name)}</h3><button class="modal-close" data-close-modal="modal-course-progress"><span class="material-symbols-outlined">close</span></button></div>
          <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
            ${progressData.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted);">No active students enrolled.</div>'
            : progressData.map(({ student, progress }) => `
              <div style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span style="font-size:13px;font-weight:600;">${eh(student.name)}</span>
                  <span style="font-size:12px;color:${progress.percentage >= 100 ? '#10b981' : progress.percentage > 0 ? '#3b82f6' : '#9ca3af'};font-weight:600;">${progress.completed_lessons}/${progress.total_lessons} (${progress.percentage}%)</span>
                </div>
                <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
                  <div style="height:100%;width:${progress.percentage}%;background:${progress.percentage >= 100 ? '#10b981' : progress.percentage > 0 ? '#3b82f6' : '#e5e7eb'};border-radius:3px;"></div>
                </div>
              </div>`).join('')}
          </div>
          <div class="modal-footer"><button class="btn btn-secondary" data-close-modal="modal-course-progress">Close</button></div>
        </div>`;
        document.body.appendChild(overlay);
        AppModal.open(overlay.id);
        initIcons();
      } catch (err) { AppToast.show(err.message || 'Failed to load progress.', 'error'); }
    })();
    return;
  }

  // Enrollments
  if (action === 'sp-remove-enrollment') { window.SchoolAssignments.confirmRemoveEnrollment(id); return; }
  if (action === 'sp-confirm-remove-enrollment') {
    try { await window.EnrollmentService?.delete(id); AppToast.show('Enrollment removed.', 'success'); AppStorage.invalidate(); AppModal.close('modal-confirm-enrollment'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Failed to remove enrollment.', 'error'); }
    return;
  }

  if (action === 'sp-toggle-enrollment') {
    const studentId = el.dataset.studentId;
    const courseId = el.dataset.courseId;
    try {
      if (el.checked) {
        const p = await AuthService.getProfile();
        await window.EnrollmentService?.create(studentId, courseId, p?.id || null);
        try {
          const student = await window.StudentService?.getById(studentId);
          const course = await window.CourseService?.getById(courseId);
          const name = student?.name || 'Student';
          const courseName = course?.name || 'Course';
          if (student?.counselor_id) {
            await window.NotificationService?.create('Course Assigned', `${name} has been assigned "${courseName}".`, student.counselor_id);
          }
          if (student?.user_id) {
            await window.NotificationService?.create('Course Assigned', `You have been assigned "${courseName}".`, student.user_id);
          }
        } catch (e) { /* notification is best-effort */ }
        AppToast.show('Student enrolled.', 'success');
      } else {
        const enrollments = await window.EnrollmentService?.getByStudent(studentId) || [];
        const enrollment = enrollments.find(e => e.course_id === courseId);
        if (enrollment) await window.EnrollmentService?.delete(enrollment.id);
        AppToast.show('Enrollment removed.', 'success');
      }
    } catch (err) { AppToast.show(err.message || 'Failed to update enrollment.', 'error'); el.checked = !el.checked; }
    AppStorage.invalidate();
    AppRouter.render();
    return;
  }

  // Audit log pagination
  if (action === 'audit-page') {
    AppAuditLog.goToPage(parseInt(id));
    return;
  }
  // Notifications
  if (action === 'sp-send-notification') {
    const data = await AppStorage.load();
    const school = data.schools.find(s => s.id === AppRouter.currentSchoolId);
    if (school) window.SchoolNotifications.openSend(school.id);
    return;
  }
  if (action === 'sp-send-notification-now') { window.SchoolNotifications.send(); return; }
  if (action === 'sp-mark-all-read') {
    try { const p = await AuthService.getProfile(); if (p) { await window.NotificationService?.markAllAsRead(p.id); AppToast.show('All marked as read.', 'success'); AppStorage.invalidate(); AppRouter.render(); } }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  if (action === 'sp-mark-notification-read') {
    try { await window.NotificationService?.markAsRead(id); AppStorage.invalidate(); AppRouter.render(); }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  if (action === 'sp-delete-notification') {
    try { await window.NotificationService?.delete(id); AppStorage.invalidate(); AppRouter.render(); }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  if (action === 'sp-delete-all-notifications') {
    try { const p = await AuthService.getProfile(); if (p) { await window.NotificationService?.deleteAll(p.id); AppToast.show('All notifications cleared.', 'success'); AppStorage.invalidate(); AppRouter.render(); } }
    catch (err) { AppToast.show(err.message, 'error'); }
    return;
  }
  // Notification filter change
  if (action === 'sp-notif-filter') { AppRouter.render(); return; }
  // Video actions
  if (action === 'sp-view-video') { window.SchoolVideos.viewVideo(id); return; }
  if (action === 'sp-delete-content') { window.SchoolVideos.confirmDelete(id); return; }
  if (action === 'sp-confirm-delete-content') {
    try { await window.ContentService?.delete(id); AppToast.show('Content deleted.', 'success'); AppStorage.invalidate(); AppModal.close('modal-confirm-video'); AppRouter.render(); }
    catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
    return;
  }

  // Export (Demo)
  if (action === 'sp-export-csv') {
    const entity = el.dataset.entity;
    const exportId = el.dataset.id;
    try {
      const data = await AppStorage.load();
      const schoolId = AppRouter.currentSchoolId;
      const school = data.schools.find(s => s.id === schoolId);
      let rows = [], headers = [];
      if (entity === 'students') {
        const schoolStudents = (data.students || []).filter(s => s.school_id === schoolId);
        headers = ['Name', 'Email', 'Admission No', 'Class', 'Section', 'Status', 'Counselor'];
        rows = schoolStudents.map(s => {
          const counselor = (data.users || []).find(u => u.id === s.counselor_id);
          return [s.name || '', s.email || '', s.admission_no || '', s.class || '', s.section || '', s.status || '', counselor?.name || ''];
        });
      } else if (entity === 'courses') {
        const schoolCourses = (data.courses || []).filter(c => c.school_id === schoolId);
        headers = ['Name', 'Code', 'Category', 'Subject', 'Difficulty', 'Status'];
        rows = schoolCourses.map(c => [c.name || '', c.code || '', c.category_name || '', c.subject_name || '', c.difficulty || '', c.status || '']);
      } else if (entity === 'course' && exportId) {
        const enrollments = (data.enrollments || []).filter(e => e.course_id === exportId);
        const course = (data.courses || []).find(c => c.id === exportId);
        headers = ['Student Name', 'Status', 'Progress', 'Enrolled At'];
        rows = enrollments.map(e => {
          const student = (data.students || []).find(s => s.id === e.student_id);
          return [student?.name || 'Unknown', e.status || '', e.progress ? `${e.progress}%` : '0%', e.created_at ? new Date(e.created_at).toLocaleDateString() : ''];
        });
      } else if (entity === 'student-profile' && exportId) {
        const student = (data.students || []).find(s => s.id === exportId);
        if (student) {
          headers = ['Field', 'Value'];
          rows = [['Name', student.name || ''], ['Email', student.email || ''], ['Admission No', student.admission_no || ''], ['Class', student.class || ''], ['Section', student.section || ''], ['Status', student.status || ''], ['DOB', student.date_of_birth || ''], ['Gender', student.gender || ''], ['Guardian', student.parent_name || ''], ['Guardian Contact', student.parent_contact || ''], ['Progress', student.progress ? `${student.progress}%` : '0%']];
        }
      }
      if (headers.length && rows.length) {
        const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${entity}-${school?.name || 'export'}.csv`; link.click();
        URL.revokeObjectURL(link.href);
        AppToast.show('CSV exported.', 'success');
      } else { AppToast.show('No data to export.', 'info'); }
    } catch (e) { AppToast.show('Export failed.', 'error'); }
    return;
  }
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

  // Logout
  if (action === 'logout') {
    try {
      await AuthService.signOut();
      window.location.reload();
    } catch (err) { AppToast.show(err.message || 'Logout failed.', 'error'); }
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
            <div style="font-size:14px;font-weight:600;">${AppUtils.escapeHtml(m.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${AppUtils.escapeHtml(m.type)} · ${AppUtils.escapeHtml(m.size || '—')} · ${AppUtils.escapeHtml(school?.name || '—')}</div>
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
  if (['sp-counselor-status','sp-counselor-dept'].includes(e.target.id)) {
    window.SchoolCounselors?.filter?.();
    return;
  }
  if (e.target.id === 'sp-video-type') { window.SchoolVideos?.filter?.(); return; }
  if (e.target.id === 'subject-category-filter') {
    AppRouter._selectedCategoryId = e.target.value || null;
    AppRouter.render();
    return;
  }
  if (e.target.id === 'section-subject-filter') {
    AppRouter._selectedSubjectId = e.target.value || null;
    AppRouter.render();
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
  if (e.target.id === 'input-content-file') { handleContentFileUpload(e.target); }
});

// Content file upload via change delegation
async function handleContentFileUpload(fileInput) {
  const file = fileInput.files?.[0];
  if (!file) return;
  const urlInput = document.getElementById('input-content-url');
  const sizeInput = document.getElementById('input-content-size');
  try {
    const bucketName = 'content-uploads';
    const filePath = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file);
    if (error) {
      const bucketErr = error.message?.includes('bucket') || error.message?.includes('not found');
      if (bucketErr) {
        AppToast.show('Storage bucket not configured. Paste a URL instead.', 'warn');
      } else {
        AppToast.show('Upload failed: ' + error.message, 'error');
      }
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    if (urlInput) urlInput.value = publicUrl;
    if (sizeInput) sizeInput.value = file.size > 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : (file.size / 1024).toFixed(1) + ' KB';
    AppToast.show('File uploaded successfully.', 'success');
  } catch (err) {
    AppToast.show('Upload failed: ' + err.message, 'error');
  }
  fileInput.value = '';
}

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
// SCHOOL SEARCH — debounced keyup handler
// ==============================================================
let schoolSearchTimer;
document.addEventListener('keyup', function (e) {
  const input = e.target.closest('#school-search');
  if (input) {
    clearTimeout(schoolSearchTimer);
    schoolSearchTimer = setTimeout(() => {
      AppRouter._schoolSearchQuery = input.value;
      AppRouter._schoolsPage = 1;
      AppRouter.render();
    }, 300);
  }
});

// ==============================================================
// INIT APP
// ==============================================================
async function initApp() {
  AppStorage.init();
  AppModal.init();

  // Password recovery detection — must be set before login check
  const lc = document.getElementById('login-form-container');
  const fc = document.getElementById('forgot-password-container');
  const rc = document.getElementById('reset-password-container');
  const loginTitle = document.querySelector('#app-login .card h2');

  AuthService.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      lc.style.display = 'none';
      fc.style.display = 'none';
      rc.style.display = 'block';
      if (loginTitle) loginTitle.textContent = 'Reset Your Password';
    }
  });

  // Forgot Password
  document.getElementById('btn-forgot-password').addEventListener('click', () => {
    lc.style.display = 'none';
    rc.style.display = 'none';
    fc.style.display = 'block';
    document.getElementById('forgot-success').style.display = 'none';
    document.getElementById('forgot-error').style.display = 'none';
    document.getElementById('forgot-email').value = '';
    if (loginTitle) loginTitle.textContent = 'Reset Password';
  });

  document.getElementById('btn-back-to-login').addEventListener('click', () => {
    fc.style.display = 'none';
    rc.style.display = 'none';
    lc.style.display = 'block';
    document.getElementById('login-error').textContent = '';
    if (loginTitle) loginTitle.textContent = 'Sign in to your account';
  });

  document.getElementById('btn-send-reset-link').addEventListener('click', async () => {
    const email = document.getElementById('forgot-email').value.trim();
    const successEl = document.getElementById('forgot-success');
    const errorEl = document.getElementById('forgot-error');
    successEl.style.display = 'none';
    errorEl.style.display = 'none';
    if (!email) { errorEl.textContent = 'Please enter your email.'; errorEl.style.display = 'block'; return; }
    const result = await AuthService.sendPasswordResetEmail(email);
    if (!result.success) {
      errorEl.textContent = result.error;
      errorEl.style.display = 'block';
      return;
    }
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
  });

  document.getElementById('btn-update-password').addEventListener('click', async () => {
    const password = document.getElementById('reset-new-password').value;
    const confirm = document.getElementById('reset-confirm-password').value;
    const successEl = document.getElementById('reset-success');
    const errorEl = document.getElementById('reset-error');
    successEl.style.display = 'none';
    errorEl.style.display = 'none';
    if (!password || password.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; errorEl.style.display = 'block'; return; }
    if (password !== confirm) { errorEl.textContent = 'Passwords do not match.'; errorEl.style.display = 'block'; return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.message?.toLowerCase().includes('expired')) {
        errorEl.textContent = 'Reset link has expired. Please request a new one.';
      } else if (error.message?.toLowerCase().includes('invalid')) {
        errorEl.textContent = 'Invalid reset link. Please request a new one.';
      } else {
        errorEl.textContent = error.message || 'Failed to update password.';
      }
      errorEl.style.display = 'block';
      return;
    }
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
    document.getElementById('reset-new-password').value = '';
    document.getElementById('reset-confirm-password').value = '';
    setTimeout(() => {
      rc.style.display = 'none';
      lc.style.display = 'block';
      document.getElementById('login-error').textContent = '';
      if (loginTitle) loginTitle.textContent = 'Sign in to your account';
    }, 3000);
  });

  // Login form
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

  // Development Access Mode
  const devAccessContainer = document.getElementById('dev-access-container');
  const devBtn = document.getElementById('btn-dev-access');
  if (devAccessContainer && import.meta.env.VITE_DEV_ACCESS === 'true') {
    devAccessContainer.style.display = '';
  }
  if (devBtn) {
    devBtn.addEventListener('click', async () => {
      const email = 'dev@lanxgro.com';
      const password = 'DevAccess2026!';
      const result = await AuthService.signInWithEmail(email, password);
      if (!result.success) {
        document.getElementById('login-error').textContent = result.error;
        return;
      }
      document.getElementById('login-error').textContent = '';
      document.getElementById('app-login').style.display = 'none';
      document.getElementById('app-layout').classList.remove('hidden');
      AppRouter.init();
      initIcons();
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

  // School form save
  document.getElementById('btn-save-school').addEventListener('click', handleSchoolSubmit);

  // Sidebar
  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('active');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
  });

  // Fallback: detect password recovery from URL hash
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery')) {
    lc.style.display = 'none';
    fc.style.display = 'none';
    rc.style.display = 'block';
    if (loginTitle) loginTitle.textContent = 'Reset Your Password';
    history.replaceState(null, '', window.location.pathname);
  }

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
