Warning: truncated output (original token count: 97643)
Total output lines: 6441

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
  ContentService as SupabaseContentService,
  AuthService,
  AuditLogService,
  DriveService,
  StudentService,
  NotificationService,
  AccountService,
  AdminAccessService,
  SettingsService,
  PermissionsService,
  ModuleService,
  LessonService,
  ProgressService,
  AssignmentService,
  QuizService,
  CertificateService,
  CounselorService,
  GpsService,
  InvitationService,
  AiService,
  TrackingConfigService
} from './services/index.js';

// Attach services to window — these override the old localStorage stubs
window.SchoolService = SupabaseSchoolService;
window.ContentService = SupabaseContentService;
window.AuthService = AuthService;
window.AuditLogService = AuditLogService;
window.DriveService = DriveService;
window.StudentService = StudentService;
window.NotificationService = NotificationService;
window.AccountService = AccountService;
window.AdminAccessService = AdminAccessService;
window.CounselorService = CounselorService;
window.SettingsService = SettingsService;
window.PermissionsService = PermissionsService;
window.ModuleService = ModuleService;
window.LessonService = LessonService;
window.ProgressService = ProgressService;
window.AssignmentService = AssignmentService;
window.QuizService = QuizService;
window.CertificateService = CertificateService;
window.GpsService = GpsService;
window.InvitationService = InvitationService;
window.AiService = AiService;
window.TrackingConfigService = TrackingConfigService;
window.supabase = supabase;

// ==============================================================
// DATA LAYER — Supabase-backed with lazy loading & caching
// ==============================================================
window.AppStorage = {
  KEY: 'lanxgrow_cos',
  _cache: null,
  _cacheTime: 0,
  _cacheTTL: 60000,          // 60s before re-fetch
  _partialCache: {},          // Per-table cache with independent TTLs
  _partialTTL: 120000,        // 2 minutes for individual tables

  async init() {
    // Schema is managed by Supabase migrations — no-op
  },

  // Fetch a single table with its own cache
  async _fetchTable(table, query) {
    const key = table;
    const cached = this._partialCache[key];
    if (cached && (Date.now() - cached.time) < this._partialTTL) return cached.data;

    const { data, error } = await query;
    if (error) { console.error(`Fetch ${table} error:`, error.message); return cached?.data || []; }
    const result = data || [];
    this._partialCache[key] = { data: result, time: Date.now() };
    return result;
  },

  // Core data needed by almost every page.
  async loadCore() {
    const schools = await this._fetchTable('schools', supabase.from('schools').select('*').order('name'));
    return { schools, categories: [], subjects: [], sections: [] };
  },

  // Full load — kept for backward compatibility but with smarter caching
  async load(forceRefresh) {
    if (!forceRefresh && this._cache && (Date.now() - this._cacheTime) < this._cacheTTL) return this._cache;

    // Fetch core + secondary tables in parallel batches
    const [core, contentRes, profilesRes, counselorsRes, notificationsRes] = await Promise.all([
      this.loadCore(),
      this._fetchTable('content', supabase.from('content').select('*').order('created_at', { ascending: false }).limit(500)),
      this._fetchTable('profiles', supabase.from('profiles').select('*')),
      this._fetchTable('counselors', supabase.from('counselors').select('*').order('name')),
      this._fetchTable('notifications', supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)),
    ]);

    const profiles = profilesRes || [];
    const users = profiles.map(p => ({
      id: p.id,
      name: p.full_name || p.name,
      email: p.email || '',
      phone: p.phone || '',
      password: '',
      role: p.role,
      schoolId: p.school_id,
      companyId: p.company_id,
      status: p.status,
      requestedRole: p.requested_role,
      requestedSchoolName: p.requested_school_name,
      requestedSchoolCode: p.requested_school_code,
      requestedClass: p.requested_class,
      onboardingCompleted: p.onboarding_completed
    }));

    this._cache = {
      ...core,
      content: contentRes || [],
      users,
      counselors: counselorsRes || [],
      notifications: notificationsRes || [],
      courses: [],
      enrollments: [],
      courseSections: [],
      // Lazy-loaded tables — will be populated on demand
      auditLog: this._partialCache.auditLog?.data || [],
      students: this._partialCache.students?.data || [],
    };
    this._cacheTime = Date.now();
    return this._cache;
  },

  // On-demand loaders for heavy tables (called only when the page needs them)
  async loadAuditLog(limit = 100) {
    const data = await this._fetchTable('auditLog',
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit));
    if (this._cache) this._cache.auditLog = data;
    return data;
  },

  async loadStudents(schoolId, page = 1, pageSize = 50) {
    let query = supabase.from('students').select('*', { count: 'exact' }).order('name');
    if (schoolId) query = query.eq('school_id', schoolId);
    query = query.range((page - 1) * pageSize, page * pageSize - 1);
    const { data, error, count } = await query;
    if (error) { console.error('Students fetch error:', error.message); return { data: [], count: 0 }; }
    const result = data || [];
    if (this._cache) this._cache.students = result;
    return { data: result, count: count || 0 };
  },

  async loadCourses(schoolId) {
    let query = supabase.from('courses').select('*').order('name');
    if (schoolId) query = query.eq('school_id', schoolId);
    const data = await this._fetchTable('courses', query);
    if (this._cache) this._cache.courses = data;
    return data;
  },

  async loadEnrollments(courseId) {
    let query = supabase.from('enrollments').select('*').limit(1000);
    if (courseId) query = query.eq('course_id', courseId);
    const data = await this._fetchTable('enrollments', query);
    if (this._cache) this._cache.enrollments = data;
    return data;
  },

  async loadCourseSections(courseId) {
    let query = supabase.from('course_sections').select('*');
    if (courseId) query = query.eq('course_id', courseId);
    const data = await this._fetchTable('courseSections', query);
    if (this._cache) this._cache.courseSections = data;
    return data;
  },

  invalidate() {
    this._cache = null;
    this._cacheTime = 0;
    // Keep partial cache but mark it stale
    for (const key in this._partialCache) {
      this._partialCache[key].time = 0;
    }
  },

  // Invalidate only a specific table's cache
  invalidateTable(table) {
    if (this._partialCache[table]) this._partialCache[table].time = 0;
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
    { id: 'media-library', label: 'Media Library', icon: 'image', route: 'media-library' },
    { id: 'sep2', separator: true },
    { id: 'school-admins', label: 'School Admins', icon: 'user-cog', route: 'school-admins' },
    { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'shield', route: 'roles-permissions' },
    { id: 'company-settings', label: 'Settings', icon: 'settings', route: 'company-settings' },
    { id: 'api-keys', label: 'API Keys', icon: 'key', route: 'api-keys' },
    { id: 'sep3', separator: true },
    { id: 'invitations', label: 'Invitations', icon: 'mail', route: 'invitations' },
    { id: 'audit-log', label: 'Activity Logs', icon: 'history', route: 'audit-log' },
  ],

  COMPANY_ADMIN_ITEMS: [
    { id: 'company-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'company-dashboard' },
    { id: 'schools', label: 'Schools', icon: 'building-2', route: 'schools' },
    { id: 'sep1', separator: true },
    { id: 'media-library', label: 'Media Library', icon: 'image', route: 'media-library' },
    { id: 'sep2', separator: true },
    { id: 'school-admins', label: 'School Admins', icon: 'user-cog', route: 'school-admins' },
    { id: 'company-settings', label: 'Settings', icon: 'settings', route: 'company-settings' },
    { id: 'sep3', separator: true },
    { id: 'audit-log', label: 'Activity Logs', icon: 'history', route: 'audit-log' },
  ],

  SCHOOL_ITEMS: [
    { id: 'school-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-students', label: 'Students', icon: 'groups', route: 'school-students' },
    { id: 'school-counselors', label: 'Counselors', icon: 'badge', route: 'school-counselors' },
    { id: 'sep-s2', separator: true },
    { id: 'school-videos', label: 'Video Library', icon: 'video-library', route: 'school-videos' },
    { id: 'sep-s4', separator: true },
    { id: 'school-attendance', label: 'Attendance', icon: 'how_to_reg', route: 'school-attendance' },
    { id: 'school-gps', label: 'GPS Tracking', icon: 'location_on', route: 'school-gps' },
    { id: 'school-orbit', label: 'Orbit', icon: 'smart_toy', route: 'school-orbit' },
    { id: 'sep-s5-extra', separator: true },
    { id: 'school-reports', label: 'Reports', icon: 'bar-chart-3', route: 'school-reports' },
    { id: 'school-notifications', label: 'Notifications', icon: 'notifications', route: 'school-notifications' },
    { id: 'sep-s5', separator: true },
    { id: 'school-settings', label: 'Settings', icon: 'settings', route: 'school-settings' },
    { id: 'sep-s6', separator: true },
    { id: 'school-activity-logs', label: 'Activity Logs', icon: 'history', route: 'school-activity-logs' },
  ],

  TEACHER_ITEMS: [
    { id: 'school-dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-students', label: 'Students', icon: 'groups', route: 'school-students' },
    { id: 'sep-s2', separator: true },
    { id: 'school-videos', label: 'Class Videos', icon: 'video-library', route: 'school-videos' },
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
    { id: 'school-videos', label: 'Video Review', icon: 'video-library', route: 'school-videos' },
    { id: 'school-orbit', label: 'Orbit Usage', icon: 'smart_toy', route: 'school-orbit' },
    { id: 'school-attendance', label: 'My Attendance', icon: 'how_to_reg', route: 'school-attendance' },
    { id: 'sep-s2b', separator: true },
    { id: 'school-reports', label: 'Reports & Analytics', icon: 'bar-chart-3', route: 'school-reports' },
    { id: 'school-notifications', label: 'Notifications', icon: 'notifications', route: 'school-notifications' },
    { id: 'sep-s3', separator: true },
    { id: 'school-profile', label: 'Profile', icon: 'person', route: 'school-profile' },
  ],

  STUDENT_ITEMS: [
    { id: 'school-dashboard', label: 'My Dashboard', icon: 'layout-dashboard', route: 'school-dashboard' },
    { id: 'sep-s1', separator: true },
    { id: 'school-videos', label: 'My Class Videos', icon: 'video-library', route: 'school-videos' },
    { id: 'school-orbit', label: 'Orbit', icon: 'smart_toy', route: 'school-orbit' },
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
    'location_on': '<span class="material-symbols-outlined" style="font-size:20px;">location_on</span>',
    'smart_toy': '<span class="material-symbols-outlined" style="font-size:20px;">smart_toy</span>',
    'mail': '<span class="material-symbols-outlined" style="font-size:20px;">mail</span>',
    'gps_fixed': '<span class="material-symbols-outlined" style="font-size:20px;">gps_fixed</span>',
    'key': '<span class="material-symbols-outlined" style="font-size:20px;">key</span>',
    'how_to_reg': '<span class="material-symbols-outlined" style="font-size:20px;">how_to_reg</span>',
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
  SCHOOL_ROUTES: ['school-dashboard',
    'school-students','school-counselors','school-videos',
    'school-reports','school-notifications',
    'school-settings','school-profile','school-gps','school-orbit','school-attendance','school-activity-logs'],
  COMPANY_ROUTES: ['company-dashboard','schools',
    'media-library','school-admins','roles-permissions','company-settings','api-keys','audit-log','invitations'],

  COMPANY_ADMIN_ROUTES: ['company-dashboard','schools',
    'media-library','school-admins','roles-permissions','company-settings','audit-log','invitations'],

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
    if (this.currentRoute === 'audit-log' || this.currentRoute === 'school-activity-logs') {
      AppAuditLog.destroy();
    }
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
        try { await this.renderContentManager(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'drive-manager':
        try { await this.renderDriveManager(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'media-library':
        try { await this.renderMediaLibrary(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'school-admins':
        try { await this.renderSchoolAdmins(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'roles-permissions':
        try { await this.renderRolesPermissions(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'company-settings':
        try { await this.renderCompanySettings(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'api-keys':
        try { await this.renderApiKeys(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'audit-log':
        try { await AppAuditLog.render(main); } catch (err) { this._renderError(main, err); }
        break;
      case 'invitations':
        try { await this.renderInvitations(main); } catch (err) { this._renderError(main, err); }
        break;
      default:
        try { await this.renderCompanyDashboard(main); } catch (err) { this._renderError(main, err); }
        break;
    }
  },

  _renderError(main, err) {
    main.innerHTML = `<div class="empty-state" style="padding:60px;"><span class="material-symbols-outlined" style="font-size:48px;color:#ef4444;">error</span><h3>Something went wrong</h3><p>${AppUtils.escapeHtml(err.message)}</p><button class="btn btn-primary" onclick="AppRouter.render()">Retry</button></div>`;
  },

  // --- SCHOOL WORKSPACE (dispatcher) ---
  async renderSchoolWorkspace(main, user, school, data) {
    if (['school-categories', 'school-subjects', 'school-sections', 'school-courses', 'school-assignments', 'school-drive'].includes(this.currentRoute)) {
      this.currentRoute = 'school-videos';
    }
    const profile = await AuthService.getProfile();
    const isSuperAdmin = profile && profile.role === 'super_admin';
    const schoolName = AppUtils.escapeHtml(school?.name || 'School');
    const schoolId = this.currentSchoolId;

    if (this.currentRoute === 'school-dashboard') {
      if (profile?.role === 'student') {
        await window.StudentLearningDashboard.render(main, data, school, profile);
        return;
      }
      if (profile?.role === 'counselor') {
        await window.CounselorLearningDashboard.render(main, data, school, profile);
        return;
      }
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
          <div class="metric-card" style="padding:16px;"><div class="metric-icon" style="width:38px;height:38px;background:#ecfdf5;color:#059669;"><span class="material-symbols-outlined" style="font-size:20px;">how_to_reg</span></div><div class="metric-info"><h2 style="font-size:22px;">${teachersCount || 0}</h2><p>Attendance Teacher</p></div></div>
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
            <button class="btn btn-secondary" style="height:38px;font-size:12px;justify-content:flex-start;gap:6px;padding:0 12px;" data-action="navigate" data-route="school-reports"><span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);">bar_chart</span> Reports</button>
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
              ${school?.latitude ? `<div style="padding:6px 0;border-bottom:1px solid var(--border);"><span style="color:var(--text-secondary);">GPS Location</span><br><span style="font-weight:500;font-size:12px;">${school.latitude.toFixed(4)}, ${school.longitude?.toFixed(4) || '—'}</span></div>` : ''}
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
            <h1 class="page-title">${parentCat ? AppUtils.escapeHtml(parentCat.name) : 'Classes'}</h1>
            <p class="page-subtitle">${parentCat ? 'Sub-classes under ' + AppUtils.escapeHtml(parentCat.name) : 'Manage classes (e.g. 7th, 8th, 9th…12th) for ' + schoolName}.</p>
          </div>
          <button class="btn btn-primary" data-action="add-category"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add ${parentCat ? 'Sub-class' : 'Class'}</button>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          ${cats.length === 0 ? `<div class="empty-state" style="padding:40px;"><span class="material-symbols-outlined" style="font-size:40px;">folder</span><h3>No ${parentCat ? 'sub-classes' : 'classes'} yet</h3><p>${parentCat ? 'Add sub-classes to organize content under ' + AppUtils.escapeHtml(parentCat.name) + '.' : 'Create your first class (e.g. 7th, 8th) to organize your curriculum.'}</p></div>`
          : `<div style="padding:8px 0;">${cats.map(c => {
            const subCount = data.subjects.filter(s => s.category_id === c.id).length;
            const childCount = allCats.filter(ch => ch.parent_id === c.id).length;
            return `<div style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid var(--border);transition:background var(--transition);" class="tree-root-item">
              <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary);margin-right:10px;">${childCount > 0 ? 'folder' : 'folder_open'}</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:600;">${AppUtils.escapeHtml(c.name)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${subCount} subjects · ${childCount} sub-classes</div>
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
            <option value="">All Classes</option>
            ${cats.map(c => `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${AppUtils.escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <div class="table-container"><table><thead><tr><th>Name</th><th>Category</th><th>Sections</th><th>Created</th><th style="width:120px;"></th></tr></thead><tbody>
            ${subjects.length === 0 ? `<tr><td colspan="5"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">auto_stories</span><h3>No subjects yet</h3><p>Create your first subject.</p></div></td></tr>`
            : subjects.map(s => {
              const cat = cats.find(c => c.id === s.category_id);
              const secCount = data.sections.filter(sec => sec.subject_id === s.id).length;
              return `<tr><td><div class="font-semibold">${AppUtils.escapeHtml(s.name)}</div></td><td style="font-size:13px;">${AppUtils.escapeHtml(cat?.name || '—')}</td><td>${data.content.filter(item => item.subject_id === s.id).length}</td><td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(s.created_at)}</td>
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
      this.navigate('school-dashboard');
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
    if (this.currentRoute === 'school-gps') {
      await window.AppGpsTracking.render(main, school, schoolId);
      return;
    }
    if (this.currentRoute === 'school-orbit') {
      await window.AppAiOrbit.render(main, school, schoolId);
      return;
    }
    if (this.currentRoute === 'school-attendance') {
      await this.renderAttendance(main, school, schoolId);
      return;
    }
    if (this.currentRoute === 'school-activity-logs') {
      await AppAuditLog.render(main, {
        schoolId,
        scopeLabel: school.name
      });
      return;
    }

    main.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">school</span><h3>School Workspace</h3><p>Navigate using the sidebar.</p></div>`;
    initIcons();
  },

  // --- ATTENDANCE PAGE ---
  async renderAttendance(main, school, schoolId) {
    const today = new Date().toISOString().split('T')[0];
    const dateFilter = document.getElementById('attendance-date-filter')?.value || today;

    const { data: records } = await supabase
      .from('attendance')
      .select('*, profiles:user_id(name, role)')
      .eq('school_id', schoolId)
      .eq('date', dateFilter)
      .order('check_in_time', { ascending: false });

    const attendanceList = records || [];
    const present = attendanceList.filter(a => a.status === 'present').length;
    const unattended = attendanceList.filter(a => a.status === 'unattended').length;
    const absent = attendanceList.filter(a => a.status === 'absent').length;

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Attendance</h1>
          <p class="page-subtitle">Location-verified attendance for teachers and counselors.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="date" class="form-input" id="attendance-date-filter" value="${dateFilter}" style="width:160px;height:36px;font-size:13px;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
        <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-blue" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">groups</span></div><div class="metric-info"><h2 style="font-size:20px;">${attendanceList.length}</h2><p>Total</p></div></div>
        <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-green" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">check_circle</span></div><div class="metric-info"><h2 style="font-size:20px;">${present}</h2><p>Present</p></div></div>
        <div class="metric-card" style="padding:14px;"><div class="metric-icon metric-icon-orange" style="width:36px;height:36px;"><span class="material-symbols-outlined" style="font-size:18px;">warning</span></div><div class="metric-info"><h2 style="font-size:20px;">${unattended}</h2><p>Unattended</p></div></div>
        <div class="metric-card" style="padding:14px;"><div class="metric-icon" style="width:36px;height:36px;background:#fef2f2;color:#ef4444;"><span class="material-symbols-outlined" style="font-size:18px;">cancel</span></div><div class="metric-info"><h2 style="font-size:20px;">${absent}</h2><p>Absent</p></div></div>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${attendanceList.length === 0
          ? `<div class="empty-state" style="padding:40px;"><span class="material-symbols-outlined" style="font-size:40px;">how_to_reg</span><h3>No attendance records</h3><p>Attendance is recorded automatically when teachers/counselors log in.</p></div>`
          : `<div class="table-container"><table><thead><tr><th>Name</th><th>Role</th><th>Check In</th><th>Status</th><th>Location Verified</th></tr></thead><tbody>
            ${attendanceList.map(a => {
              const name = a.profiles?.name || 'Unknown';
              const role = a.profiles?.role || '—';
              const checkIn = a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : '—';
              const statusColor = a.status === 'present' ? 'status-active' : a.status === 'unattended' ? 'status-pending' : 'status-suspended';
              return `<tr>
                <td class="font-semibold">${AppUtils.escapeHtml(name)}</td>
                <td style="font-size:13px;color:var(--text-secondary);">${AppUtils.escapeHtml(role)}</td>
                <td style="font-size:13px;">${checkIn}</td>
                <td><span class="status-badge ${statusColor}">${AppUtils.escapeHtml(a.status)}</span></td>
                <td>${a.location_verified ? '<span style="color:#10b981;">Yes</span>' : '<span style="color:#f59e0b;">No</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody></table></div>`}
      </div>
      <div style="margin-top:12px;padding:10px;background:var(--surface-low);border-radius:var(--radius-md);font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:8px;">
        <span class="material-symbols-outlined" style="font-size:16px;">info</span>
        "Present" = logged in within ${school.attendance_radius_m || 200}m of school. "Unattended" = logged in from outside or location unavailable.
      </div>
    </div>`;
    initIcons();

    document.getElementById('attendance-date-filter')?.addEventListener('change', () => {
      this.renderAttendance(main, school, schoolId);
    });
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
          { label: 'Manage Classes', key: 'manage_categories', checked: true },
          { label: 'Manage Videos', key: 'manage_content', checked: true },
          { label: 'Manage Users', key: 'manage_users', checked: true },
          { label: 'View Analytics', key: 'view_analytics', checked: true },
          { label: 'Access Settings', key: 'access_settings', checked: true },
          { label: 'Manage Own Profile', key: 'manage_own_profile', checked: true }
        ]},
      { role: 'school_admin', title: 'School Admin', icon: 'manage_accounts', description: 'Restricted to own school', disabled: false,
        perms: [
          { label: 'Manage School Settings', key: 'manage_school_settings', checked: true },
          { label: 'Manage Classes', key: 'manage_categories', checked: true },
          { label: 'Manage Videos', key: 'manage_content', checked: true },
          { label: 'View Analytics', key: 'view_analytics', checked: false },
          { label: 'Manage Own Profile', key: 'manage_own_profile', checked: true },
          { label: 'Upload Drive Files', key: 'manage_drive_upload', checked: false }
        ]},
      { role: 'teacher', title: 'Teacher', icon: 'school', description: 'Manage assigned courses and students', disabled: false,
        perms: [
          { label: 'View Class Videos', key: 'view_assigned_courses', checked: true },
          { label: 'View Assigned Students', key: 'view_assigned_students', checked: true },
          { label: 'Grade Assignments', key: 'grade_assignments', checked: true },
          { label: 'Grade Quizzes', key: 'grade_quizzes', checked: true },
          { label: 'View Reports', key: 'view_analytics', checked: true },
          { label: 'View Own Profile', key: 'manage_own_profile', checked: true }
        ]},
      { role: 'counselor', title: 'Counselor', icon: 'badge', description: 'Manage assigned students and counseling records', disabled: false,
        perms: [
          { label: 'View Assigned Students', key: 'view_assigned_students', checked: true },
          { label: 'Manage Student Progress', key: 'manage_student_progress', checked: true },
          { label: 'View Analytics', key: 'view_analytics', checked: true },
          { label: 'Send Notifications', key: 'send_notifications', checked: true },
          { label: 'Manage Own Profile', key: 'manage_own_profile', checked: true }
        ]},
      { role: 'student', title: 'Student', icon: 'person', description: 'View own courses, progress, and certificates', disabled: false,
        perms: [
          { label: 'View Class Videos', key: 'view_own_courses', checked: true },
          { label: 'Track Own Progress', key: 'track_own_progress', checked: true },
          { label: 'View Own Notifications', key: 'view_own_notifications', checked: true },
          { label: 'Manage Own Profile', key: 'manage_own_profile', checked: true }
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
      for (const s of all) {
        if (!s.is_system_default) settings[s.key] = s.value;
      }
    } catch (_) {}
    this._companySettingsDraft = settings;
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
    const v = (key, fallback = '') => settings[key] !== undefined ? AppUtils.escapeHtml(settings[key]) : fallback;
    if (tab === 'general') {
      return `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">General Settings</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">Company Name</label><input type="text" class="form-input" value="${v('companyName')}" placeholder="Enter company name" data-action="save-setting" data-key="companyName"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Default Platform Language</label>
            <select class="form-select" data-action="save-setting" data-key="language">
              <option value="" ${v('language') === '' ? 'selected' : ''}>Not configured</option>
              <option value="en" ${v('language') === 'en' ? 'selected' : ''}>English</option>
              <option value="es" ${v('language') === 'es' ? 'selected' : ''}>Spanish</option>
              <option value="fr" ${v('language') === 'fr' ? 'selected' : ''}>French</option>
            </select>
          </div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Timezone</label>
            <select class="form-select" data-action="save-setting" data-key="timezone">
              <option value="" ${v('timezone') === '' ? 'selected' : ''}>Not configured</option>
              <option value="UTC" ${v('timezone') === 'UTC' ? 'selected' : ''}>UTC</option>
              <option value="Asia/Kolkata" ${v('timezone') === 'Asia/Kolkata' ? 'selected' : ''}>Asia/Kolkata</option>
              <option value="US/Eastern" ${v('timezone') === 'US/Eastern' ? 'selected' : ''}>US/Eastern</option>
              <option value="US/Pacific" ${v('timezone') === 'US/Pacific' ? 'selected' : ''}>US/Pacific</option>
            </select>
          </div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Max Upload Size (MB)</label><input type="number" class="form-input" min="1" max="100" value="${v('maxUploadSize')}" placeholder="100" data-action="save-setting" data-key="maxUploadSize"></div>
          <div style="margin-top:20px;display:flex;gap:12px;">
            <button class="btn btn-primary" data-action="save-settings" style="height:40px;font-size:13px;">Save Changes</button>
            <button class="btn btn-secondary" data-action="reset-settings" style="height:40px;font-size:13px;">Reset</button>
          </div>
        </div>
      </div>`;
    } else if (tab === 'branding') {
      const logoUrl = v('companyLogo');
      return `<div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">Branding</h3></div>
        <div style="padding:20px;">
          <div class="form-group">
            <label class="form-label">Company Logo</label>
            <label for="company-logo-input" style="width:120px;height:120px;border:2px dashed var(--border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:var(--surface-low);">
              ${logoUrl ? `<img src="${logoUrl}" alt="Company logo" style="width:100%;height:100%;object-fit:contain;padding:8px;">` : '<span class="material-symbols-outlined" style="font-size:30px;color:var(--text-muted);">upload</span>'}
            </label>
            <input id="company-logo-input" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="display:none;">
            <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">PNG, JPG, WebP or SVG. Maximum 2 MB.</div>
          </div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Primary Color</label><div style="display:flex;align-items:center;gap:12px;"><input type="color" class="form-input" value="${v('primaryColor', '#1A56DB')}" style="width:48px;height:40px;padding:4px;" data-action="save-setting" data-key="primaryColor"><input type="text" class="form-input" value="${v('primaryColor', '#1A56DB')}" style="flex:1;"></div></div>
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
          <div class="form-group"><label class="form-label">SMTP Host</label><input type="text" class="form-input" value="${v('smtpHost')}" placeholder="smtp.example.com" data-action="save-setting" data-key="smtpHost"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">SMTP Port</label><input type="number" class="form-input" value="${v('smtpPort')}" placeholder="587" data-action="save-setting" data-key="smtpPort"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">From Address</label><input type="email" class="form-input" value="${v('fromEmail')}" placeholder="noreply@example.com" data-action="save-setting" data-key="fromEmail"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">From Name</label><input type="text" class="form-input" value="${v('fromName')}" placeholder="Company name" data-action="save-setting" data-key="fromName"></div>
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
    const active = document.qu…47643 tokens truncated…move(); this._map = null; }
      this._markers = {};

      // Default center: India
      let center = [20.5937, 78.9629];
      let zoom = 5;

      if (locations.length > 0) {
        const lats = locations.map(l => l.latitude);
        const lngs = locations.map(l => l.longitude);
        center = [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2];
        zoom = 12;
      }

      this._map = window.L.map('gps-map').setView(center, zoom);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(this._map);

      // Add markers for each vehicle with a current location
      const vehiclesById = {};
      vehicles.forEach(v => { vehiclesById[v.id] = v; });

      locations.forEach(loc => {
        const v = vehiclesById[loc.vehicle_id];
        if (!v) return;
        const isMoving = loc.motion_state === 'moving';
        const color = isMoving ? '#22c55e' : '#f59e0b';
        const icon = window.L.divIcon({
          className: 'gps-marker',
          html: `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <span class="material-symbols-outlined" style="font-size:16px;color:white;">directions_bus</span>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        const marker = window.L.marker([loc.latitude, loc.longitude], { icon }).addTo(this._map);
        marker.bindPopup(`<div style="min-width:160px;">
          <strong>${AppUtils.escapeHtml(v.label)}</strong><br>
          <span style="font-size:12px;color:#666;">${AppUtils.escapeHtml(v.registration_number || 'No registration')}</span><br>
          <span style="font-size:12px;">${isMoving ? 'Moving' : 'Stopped'} · ${Math.round(loc.speed_kmph || 0)} km/h</span><br>
          ${v.driver_name ? `<span style="font-size:12px;">Driver: ${AppUtils.escapeHtml(v.driver_name)}</span><br>` : ''}
          ${v.driver_phone ? `<span style="font-size:12px;">Phone: ${AppUtils.escapeHtml(v.driver_phone)}</span>` : ''}
        </div>`);
        this._markers[loc.vehicle_id] = marker;
      });

      // Fit bounds if we have markers
      if (locations.length > 0) {
        const bounds = window.L.latLngBounds(locations.map(l => [l.latitude, l.longitude]));
        this._map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    // Subscribe to realtime updates
    if (this._channel) GpsService.unsubscribe(this._channel);
    this._channel = GpsService.subscribeToLocations(this._currentSchoolId, (payload) => {
      const loc = payload.new;
      if (!loc || !this._map) return;
      if (this._markers[loc.vehicle_id]) {
        this._markers[loc.vehicle_id].setLatLng([loc.latitude, loc.longitude]);
      }
    });
  },

  _bindEvents(schoolId, vehicles) {
    document.getElementById('btn-manage-vehicles')?.addEventListener('click', () => {
      this._showVehicleModal(schoolId, vehicles);
    });
    document.getElementById('btn-manage-devices')?.addEventListener('click', async () => {
      const devices = await GpsService.getDevices(schoolId);
      this._showDeviceModal(schoolId, devices, vehicles);
    });
    document.getElementById('btn-gps-refresh')?.addEventListener('click', async () => {
      const school = await window.SchoolService.getById(schoolId);
      await this.render(document.getElementById('main-content'), school, schoolId);
      AppToast.show('Map refreshed');
    });
  },

  _showVehicleModal(schoolId, vehicles) {
    let overlay = document.getElementById('modal-gps-vehicles');
    if (overlay) overlay.remove();

    const html = `<div class="modal-overlay active" id="modal-gps-vehicles" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:700px;">
        <div class="modal-header"><h2 class="modal-title">Manage Vehicles</h2><button class="modal-close" onclick="document.getElementById('modal-gps-vehicles').classList.remove('active');">&times;</button></div>
        <div class="modal-body">
          <div style="margin-bottom:16px;display:flex;gap:8px;">
            <input type="text" class="form-input" id="gps-v-label" placeholder="Vehicle name (e.g. Bus 1)" style="flex:1;">
            <input type="text" class="form-input" id="gps-v-reg" placeholder="Reg. number" style="width:140px;">
            <input type="number" class="form-input" id="gps-v-capacity" placeholder="Seats" style="width:80px;">
            <input type="text" class="form-input" id="gps-v-driver" placeholder="Driver name" style="width:140px;">
            <input type="text" class="form-input" id="gps-v-phone" placeholder="Phone" style="width:120px;">
            <button class="btn btn-primary btn-sm" id="btn-add-vehicle" style="height:44px;white-space:nowrap;">Add</button>
          </div>
          <div class="table-container"><table><thead><tr><th>Label</th><th>Reg.</th><th>Capacity</th><th>Driver</th><th>Phone</th><th>Status</th><th></th></tr></thead>
          <tbody id="gps-vehicles-tbody">
            ${vehicles.map(v => `<tr>
              <td class="font-semibold">${AppUtils.escapeHtml(v.label)}</td>
              <td>${AppUtils.escapeHtml(v.registration_number || '—')}</td>
              <td>${v.capacity || '—'}</td>
              <td>${AppUtils.escapeHtml(v.driver_name || '—')}</td>
              <td>${AppUtils.escapeHtml(v.driver_phone || '—')}</td>
              <td><span class="status-badge status-${v.status === 'active' ? 'active' : 'inactive'}">${v.status}</span></td>
              <td><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-vehicle" data-id="${v.id}"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button></td>
            </tr>`).join('')}
          </tbody></table></div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    initIcons();

    document.getElementById('btn-add-vehicle')?.addEventListener('click', async () => {
      const label = document.getElementById('gps-v-label').value.trim();
      if (!label) { AppToast.show('Vehicle name is required', 'error'); return; }
      try {
        await GpsService.createVehicle({
          school_id: schoolId, label,
          registration_number: document.getElementById('gps-v-reg').value.trim() || null,
          capacity: parseInt(document.getElementById('gps-v-capacity').value) || null,
          driver_name: document.getElementById('gps-v-driver').value.trim() || null,
          driver_phone: document.getElementById('gps-v-phone').value.trim() || null
        });
        AppToast.show('Vehicle added');
        document.getElementById('modal-gps-vehicles').classList.remove('active');
        const school = await window.SchoolService.getById(schoolId);
        await this.render(document.getElementById('main-content'), school, schoolId);
      } catch (e) { AppToast.show(e.message, 'error'); }
    });

    document.getElementById('gps-vehicles-tbody')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action="delete-vehicle"]');
      if (!btn) return;
      if (!confirm('Delete this vehicle?')) return;
      try {
        await GpsService.deleteVehicle(btn.dataset.id);
        AppToast.show('Vehicle deleted');
        document.getElementById('modal-gps-vehicles').classList.remove('active');
        const school = await window.SchoolService.getById(schoolId);
        await this.render(document.getElementById('main-content'), school, schoolId);
      } catch (e) { AppToast.show(e.message, 'error'); }
    });
  },

  _showDeviceModal(schoolId, devices, vehicles) {
    let overlay = document.getElementById('modal-gps-devices');
    if (overlay) overlay.remove();

    const html = `<div class="modal-overlay active" id="modal-gps-devices" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:650px;">
        <div class="modal-header"><h2 class="modal-title">Manage GPS Devices</h2><button class="modal-close" onclick="document.getElementById('modal-gps-devices').classList.remove('active');">&times;</button></div>
        <div class="modal-body">
          <div style="margin-bottom:16px;display:flex;gap:8px;">
            <input type="text" class="form-input" id="gps-d-uid" placeholder="Device UID / IMEI" style="flex:1;">
            <input type="text" class="form-input" id="gps-d-sim" placeholder="SIM number" style="width:140px;">
            <select class="form-select" id="gps-d-vehicle" style="width:160px;">
              <option value="">No vehicle</option>
              ${vehicles.map(v => `<option value="${v.id}">${AppUtils.escapeHtml(v.label)}</option>`).join('')}
            </select>
            <button class="btn btn-primary btn-sm" id="btn-add-device" style="height:44px;">Add</button>
          </div>
          <div class="table-container"><table><thead><tr><th>Device UID</th><th>SIM</th><th>Vehicle</th><th>Status</th><th>Last Seen</th><th></th></tr></thead>
          <tbody id="gps-devices-tbody">
            ${devices.map(d => `<tr>
              <td class="font-semibold">${AppUtils.escapeHtml(d.device_uid)}</td>
              <td>${AppUtils.escapeHtml(d.sim_number || '—')}</td>
              <td>${AppUtils.escapeHtml(d.vehicles?.label || '—')}</td>
              <td><span class="status-badge status-${d.status === 'active' ? 'active' : 'inactive'}">${d.status}</span></td>
              <td style="font-size:12px;color:var(--text-muted);">${d.last_seen_at ? AppUtils.formatDate(d.last_seen_at) : 'Never'}</td>
              <td><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-device" data-id="${d.id}"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button></td>
            </tr>`).join('')}
          </tbody></table></div>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    initIcons();

    document.getElementById('btn-add-device')?.addEventListener('click', async () => {
      const uid = document.getElementById('gps-d-uid').value.trim();
      if (!uid) { AppToast.show('Device UID is required', 'error'); return; }
      try {
        await GpsService.createDevice({
          school_id: schoolId, device_uid: uid,
          sim_number: document.getElementById('gps-d-sim').value.trim() || null,
          vehicle_id: document.getElementById('gps-d-vehicle').value || null
        });
        AppToast.show('Device added');
        document.getElementById('modal-gps-devices').classList.remove('active');
      } catch (e) { AppToast.show(e.message, 'error'); }
    });

    document.getElementById('gps-devices-tbody')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action="delete-device"]');
      if (!btn) return;
      if (!confirm('Delete this GPS device?')) return;
      try {
        await GpsService.deleteDevice(btn.dataset.id);
        AppToast.show('Device deleted');
        document.getElementById('modal-gps-devices').classList.remove('active');
      } catch (e) { AppToast.show(e.message, 'error'); }
    });
  }
};

// ==============================================================
// AI ORBIT Q&A MODULE
// ==============================================================
window.AppAiOrbit = {
  async render(main, school, schoolId) {
    const profile = await AuthService.getProfile();
    if (profile?.role === 'student') {
      await this._renderStudentChat(main, school);
      return;
    }
    const canConfigure = ['super_admin', 'company_admin'].includes(profile?.role);
    const [escalations, settings, conversations] = await Promise.all([
      AiService.getEscalations(schoolId).catch(() => []),
      AiService.getSchoolSettings(schoolId).catch(() => null),
      AiService.getConversations(schoolId, 20).catch(() => [])
    ]);
    const openCount = escalations.filter(e => e.status === 'open').length;

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;margin-bottom:4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
          <h1 class="page-title">Orbit</h1>
          <p class="page-subtitle">${AppUtils.escapeHtml(school.name)} — Student Q&A powered by AI</p>
        </div>
        ${canConfigure ? '<button class="btn btn-secondary" id="btn-orbit-settings"><span class="material-symbols-outlined" style="font-size:18px;">settings</span> Settings</button>' : ''}
      </div>

      <!-- Stats -->
      <div class="metrics-grid" style="margin-bottom:24px;">
        <div class="metric-card">
          <div class="metric-icon" style="background:#E5F2FF;color:#1A56DB;"><span class="material-symbols-outlined">smart_toy</span></div>
          <div><div class="metric-label">Status</div><div class="metric-value" style="font-size:18px;">${settings?.enabled !== false ? '<span style="color:#22c55e;">Active</span>' : '<span style="color:#ef4444;">Disabled</span>'}</div></div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#FEF3C7;color:#D97706;"><span class="material-symbols-outlined">help</span></div>
          <div><div class="metric-label">Daily Limit</div><div class="metric-value" style="font-size:18px;">${settings?.daily_question_limit || 10} / student</div></div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#FEE2E2;color:#DC2626;"><span class="material-symbols-outlined">priority_high</span></div>
          <div><div class="metric-label">Open Escalations</div><div class="metric-value" style="font-size:18px;">${openCount}</div></div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#F0FDF4;color:#16A34A;"><span class="material-symbols-outlined">chat</span></div>
          <div><div class="metric-label">Conversations</div><div class="metric-value" style="font-size:18px;">${conversations.length}</div></div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom:20px;">
        <button class="tab active" data-orbit-tab="escalations">Escalation Queue (${openCount})</button>
        <button class="tab" data-orbit-tab="conversations">Recent Conversations</button>
        ${canConfigure ? '<button class="tab" data-orbit-tab="providers">AI Providers</button>' : ''}
      </div>

      <!-- Escalation Queue -->
      <div id="orbit-tab-escalations" class="card" style="padding:0;">
        ${escalations.length === 0
          ? '<div class="empty-state" style="padding:40px;"><span class="material-symbols-outlined" style="font-size:40px;">check_circle</span><h3>No escalations</h3><p>When students need more help, their questions will appear here.</p></div>'
          : `<div class="table-container"><table><thead><tr><th>Student</th><th>Question</th><th>AI Answer</th><th>Reason</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>${escalations.map(e => `<tr>
            <td class="font-semibold">${AppUtils.escapeHtml(e.profiles?.full_name || 'Student')}</td>
            <td style="max-width:200px;"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${AppUtils.escapeHtml(e.question)}</div></td>
            <td style="max-width:200px;font-size:12px;color:var(--text-secondary);"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${AppUtils.escapeHtml(e.ai_answer || '—')}</div></td>
            <td><span class="status-badge">${AppUtils.escapeHtml(e.reason)}</span></td>
            <td><span class="status-badge status-${e.status === 'open' ? 'pending' : 'active'}">${e.status}</span></td>
            <td style="font-size:12px;color:var(--text-muted);">${AppUtils.formatDate(e.created_at)}</td>
            <td>${e.status === 'open' ? `<button class="btn btn-primary btn-sm" data-action="reply-escalation" data-id="${e.id}" style="height:28px;font-size:11px;">Reply</button>` : `<span style="font-size:12px;color:var(--success);">Resolved</span>`}</td>
          </tr>`).join('')}</tbody></table></div>`}
      </div>

      <!-- Conversations -->
      <div id="orbit-tab-conversations" class="card" style="padding:0;display:none;">
        ${conversations.length === 0
          ? '<div class="empty-state" style="padding:40px;"><span class="material-symbols-outlined" style="font-size:40px;">chat</span><h3>No conversations yet</h3><p>Student AI conversations will show up here.</p></div>'
          : `<div class="table-container"><table><thead><tr><th>Student</th><th>Title</th><th>Messages</th><th>Flagged</th><th>Last Active</th></tr></thead>
          <tbody>${conversations.map(c => `<tr>
            <td class="font-semibold">${AppUtils.escapeHtml(c.profiles?.full_name || 'Student')}</td>
            <td>${AppUtils.escapeHtml(c.title || 'Untitled')}</td>
            <td>${c.message_count}</td>
            <td>${c.flagged ? '<span class="status-badge status-pending">Flagged</span>' : '—'}</td>
            <td style="font-size:12px;color:var(--text-muted);">${AppUtils.formatDate(c.last_message_at)}</td>
          </tr>`).join('')}</tbody></table></div>`}
      </div>

      <!-- Providers -->
      ${canConfigure ? `<div id="orbit-tab-providers" class="card" style="padding:0;display:none;">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:13px;font-weight:600;">AI Provider Chain</div>
          <button class="btn btn-primary btn-sm" id="btn-add-provider"><span class="material-symbols-outlined" style="font-size:16px;">add</span> Add Provider</button>
        </div>
        <div id="orbit-providers-list" style="padding:16px;">
          <div style="color:var(--text-muted);font-size:13px;">Loading providers...</div>
        </div>
      </div>` : ''}
    </div>`;
    initIcons();
    this._bindEvents(schoolId, school);
    if (canConfigure) this._loadProviders(schoolId);
  },

  async _renderStudentChat(main, school) {
    const quota = await AiService.getQuota().catch(() => null);
    main.innerHTML = `<div class="fade-in" style="max-width:900px;margin:0 auto;">
      <div class="page-header"><div><h1 class="page-title">Orbit</h1><p class="page-subtitle">Your education-only learning assistant</p></div>
        <span id="orbit-general-quota" class="status-badge ${quota?.allowed ? 'status-active' : 'status-suspended'}">${quota?.unlimited ? 'Unlimited' : `${Math.max(0, quota?.remaining ?? 0)} questions left today`}</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div id="orbit-general-messages" style="height:min(58vh,560px);overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px;">
          <div style="margin:auto;text-align:center;max-width:460px;color:var(--text-secondary);">
            <span class="material-symbols-outlined" style="font-size:48px;color:var(--primary);">smart_toy</span>
            <h2 style="font-size:18px;color:var(--on-surface);">How can Orbit help you learn?</h2>
            <p style="font-size:13px;">Ask an education-related question. Video questions should be asked from that video's Orbit panel.</p>
          </div>
        </div>
        <div style="padding:14px;border-top:1px solid var(--border);display:flex;gap:8px;">
          <textarea id="orbit-general-input" class="form-input" rows="2" maxlength="2000" placeholder="Ask an education question..." ${quota?.allowed ? '' : 'disabled'} style="resize:none;"></textarea>
          <button class="btn btn-primary" id="orbit-general-send" ${quota?.allowed ? '' : 'disabled'}><span class="material-symbols-outlined">send</span></button>
        </div>
      </div>
      <p style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:10px;">Orbit can make mistakes. Verify important information with your counselor or teacher.</p>
    </div>`;
    initIcons();

    const input = document.getElementById('orbit-general-input');
    const send = document.getElementById('orbit-general-send');
    const messages = document.getElementById('orbit-general-messages');
    const submit = async () => {
      const question = input.value.trim();
      if (!question || send.disabled) return;
      messages.querySelector('[style*="margin:auto"]')?.remove();
      messages.insertAdjacentHTML('beforeend', `<div style="align-self:flex-end;max-width:80%;background:var(--primary);color:white;padding:10px 13px;border-radius:14px 14px 3px 14px;">${AppUtils.escapeHtml(question)}</div>`);
      input.value = '';
      send.disabled = true;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/orbit-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token || ''}`
          },
          body: JSON.stringify({
            message: question,
            school_id: school?.id || undefined
          })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Orbit request failed');
        messages.insertAdjacentHTML('beforeend', `<div style="align-self:flex-start;max-width:80%;background:var(--surface-low);padding:10px 13px;border-radius:14px 14px 14px 3px;line-height:1.55;">${AppUtils.escapeHtml(result.reply).replace(/\n/g, '<br>')}</div>`);
        const quotaLabel = document.getElementById('orbit-general-quota');
        if (quotaLabel && result.quota) quotaLabel.textContent = result.quota.unlimited ? 'Unlimited' : `${Math.max(0, result.quota.remaining)} questions left today`;
        send.disabled = !result.quota?.allowed;
      } catch (error) {
        messages.insertAdjacentHTML('beforeend', `<div style="align-self:flex-start;color:var(--danger);font-size:13px;">${AppUtils.escapeHtml(error.message)}</div>`);
        send.disabled = false;
      }
      messages.scrollTop = messages.scrollHeight;
    };
    send?.addEventListener('click', submit);
    input?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    });
  },

  _bindEvents(schoolId, school) {
    // Tab switching
    document.querySelectorAll('[data-orbit-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-orbit-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('[id^="orbit-tab-"]').forEach(p => p.style.display = 'none');
        document.getElementById(`orbit-tab-${tab.dataset.orbitTab}`).style.display = '';
      });
    });

    // Reply to escalation
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action="reply-escalation"]');
      if (!btn) return;
      const reply = prompt('Type your reply to the student:');
      if (!reply) return;
      try {
        const profile = await AuthService.getProfile();
        await AiService.replyToEscalation(btn.dataset.id, reply, profile?.id);
        AppToast.show('Reply sent');
        await this.render(document.getElementById('main-content'), school, schoolId);
      } catch (err) { AppToast.show(err.message, 'error'); }
    });

    // Settings button
    document.getElementById('btn-orbit-settings')?.addEventListener('click', async () => {
      const settings = await AiService.getSchoolSettings(schoolId).catch(() => null);
      this._showSettingsModal(schoolId, settings, school);
    });

    // Add provider button
    document.getElementById('btn-add-provider')?.addEventListener('click', () => {
      this._showProviderModal(null, schoolId);
    });
  },

  async _loadProviders(schoolId) {
    try {
      const providers = await AiService.getProviders(schoolId);
      const container = document.getElementById('orbit-providers-list');
      if (!container) return;
      if (providers.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding:24px;"><span class="material-symbols-outlined" style="font-size:32px;">smart_toy</span><h3>No providers configured</h3><p>Add Gemini, OpenAI, OpenRouter, or NVIDIA NIM to prepare Orbit.</p></div>';
        return;
      }
      container.innerHTML = providers.map(p => {
        const isHealthy = !p.needs_attention && p.consecutive_failures === 0;
        const statusColor = isHealthy ? '#22c55e' : p.needs_attention ? '#ef4444' : '#f59e0b';
        return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);margin-bottom:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;">${AppUtils.escapeHtml(p.label)}</div>
            <div style="font-size:12px;color:var(--text-muted);">${AppUtils.escapeHtml(p.provider)} · ${AppUtils.escapeHtml(p.model)} · Priority: ${p.priority}</div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;">
            <span class="status-badge status-${p.enabled ? 'active' : 'inactive'}">${p.enabled ? 'Enabled' : 'Disabled'}</span>
            <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">Key: ${AppUtils.escapeHtml(p.key_fingerprint || 'Not set')}</span>
          </div>
          <button class="btn btn-ghost btn-sm" data-action="edit-provider" data-id="${p.id}" style="height:28px;"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
          <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-provider" data-id="${p.id}" style="height:28px;"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
        </div>`;
      }).join('');
      initIcons();
      container.onclick = async event => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const provider = providers.find(item => item.id === button.dataset.id);
        if (!provider) return;
        if (button.dataset.action === 'edit-provider') {
          this._showProviderModal(provider, schoolId);
          return;
        }
        if (button.dataset.action === 'delete-provider') {
          if (!confirm(`Delete AI provider "${provider.label}"?`)) return;
          try {
            await AiService.deleteProvider(provider.id);
            AppToast.show('Provider deleted');
            await this._loadProviders(schoolId);
          } catch (error) {
            AppToast.show(error.message, 'error');
          }
        }
      };
    } catch (err) {
      const container = document.getElementById('orbit-providers-list');
      if (container) container.innerHTML = `<div style="color:var(--error);font-size:13px;">Error loading providers: ${AppUtils.escapeHtml(err.message)}</div>`;
    }
  },

  _showSettingsModal(schoolId, settings, school) {
    let overlay = document.getElementById('modal-orbit-settings');
    if (overlay) overlay.remove();
    const s = settings || {};
    const html = `<div class="modal-overlay active" id="modal-orbit-settings" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:500px;">
        <div class="modal-header"><h2 class="modal-title">Orbit Settings</h2><button class="modal-close" onclick="document.getElementById('modal-orbit-settings').classList.remove('active');">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Student Orbit Policy</label>
            <select class="form-select" id="orbit-s-mode">
              <option value="disabled" ${s.access_mode === 'disabled' ? 'selected' : ''}>Disabled</option>
              <option value="restricted" ${!s.access_mode || s.access_mode === 'restricted' ? 'selected' : ''}>Restricted</option>
              <option value="unlimited" ${s.access_mode === 'unlimited' ? 'selected' : ''}>Unlimited</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">School Daily Maximum (Restricted mode)</label>
            <input type="number" class="form-input" id="orbit-s-limit" value="${s.daily_question_limit || 10}" min="0" max="200">
          </div>
          <div style="padding:12px;background:var(--surface-low);border-radius:8px;font-size:12px;color:var(--text-secondary);">Video Orbit remains a separate limit of ${s.video_daily_question_limit || 10} questions per video per day and cannot be changed here.</div>
          <button class="btn btn-primary" id="btn-save-orbit-settings" style="width:100%;margin-top:16px;">Save Settings</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-save-orbit-settings')?.addEventListener('click', async () => {
      try {
        const mode = document.getElementById('orbit-s-mode').value;
        const limit = Number(document.getElementById('orbit-s-limit').value);
        await AiService.setSchoolPolicy(schoolId, mode, mode === 'restricted' ? limit : null);
        AppToast.show('Settings saved');
        document.getElementById('modal-orbit-settings').classList.remove('active');
        await this.render(document.getElementById('main-content'), school, schoolId);
      } catch (err) { AppToast.show(err.message, 'error'); }
    });
  },

  _showProviderModal(provider, schoolId) {
    let overlay = document.getElementById('modal-orbit-provider');
    if (overlay) overlay.remove();
    const p = provider || {};
    const isEdit = !!p.id;
    const html = `<div class="modal-overlay active" id="modal-orbit-provider" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:500px;">
        <div class="modal-header"><h2 class="modal-title">${isEdit ? 'Edit' : 'Add'} AI Provider</h2><button class="modal-close" onclick="document.getElementById('modal-orbit-provider').classList.remove('active');">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Label</label><input type="text" class="form-input" id="prov-label" value="${AppUtils.escapeHtml(p.label || '')}" placeholder="e.g. OpenRouter GPT-4"></div>
          <div class="form-group"><label class="form-label">Provider</label>
            <select class="form-select" id="prov-provider">
              <option value="gemini" ${p.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
              <option value="openai" ${p.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="openrouter" ${p.provider === 'openrouter' ? 'selected' : ''}>OpenRouter</option>
              <option value="nvidia" ${p.provider === 'nvidia' ? 'selected' : ''}>NVIDIA NIM</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Model</label><input type="text" class="form-input" id="prov-model" value="${AppUtils.escapeHtml(p.model || '')}" placeholder="e.g. google/gemini-2.0-flash"></div>
          <div class="form-group"><label class="form-label">API Endpoint</label><input type="url" class="form-input" id="prov-base-url" value="${AppUtils.escapeHtml(p.base_url || '')}" readonly></div>
          <div class="form-group"><label class="form-label">API Key</label><input type="password" class="form-input" id="prov-key" placeholder="${isEdit ? 'Leave blank to keep existing' : 'Enter API key'}"></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:-8px;">Provider-specific key is stored server-side in Supabase. If left blank, an active central key of the same provider type can be used.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label class="form-label">Priority (lower = first)</label><input type="number" class="form-input" id="prov-priority" value="${p.priority || 100}" min="1"></div>
            <div class="form-group"><label class="form-label">Temperature</label><input type="number" class="form-input" id="prov-temp" value="${p.temperature || 0.3}" min="0" max="2" step="0.1"></div>
          </div>
          <button class="btn btn-primary" id="btn-save-provider" style="width:100%;margin-top:16px;">${isEdit ? 'Update' : 'Add'} Provider</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    const providerSelect = document.getElementById('prov-provider');
    const applyPreset = (force = false) => {
      const preset = AiService.getProviderPreset(providerSelect.value);
      if (!preset) return;
      const modelInput = document.getElementById('prov-model');
      const baseUrlInput = document.getElementById('prov-base-url');
      if (force || !modelInput.value.trim()) modelInput.value = preset.model;
      if (force || !baseUrlInput.value.trim()) baseUrlInput.value = preset.baseUrl;
    };
    providerSelect.addEventListener('change', () => applyPreset(true));
    applyPreset(false);

    document.getElementById('btn-save-provider')?.addEventListener('click', async () => {
      const label = document.getElementById('prov-label').value.trim();
      const model = document.getElementById('prov-model').value.trim();
      if (!label || !model) { AppToast.show('Label and model are required', 'error'); return; }
      try {
        const payload = {
          label, model,
          provider: document.getElementById('prov-provider').value,
          base_url: AiService.getProviderPreset(document.getElementById('prov-provider').value)?.baseUrl,
          priority: parseInt(document.getElementById('prov-priority').value) || 100,
          temperature: Number.isFinite(parseFloat(document.getElementById('prov-temp').value))
            ? parseFloat(document.getElementById('prov-temp').value)
            : 0.3,
          school_id: p.school_id || schoolId || null,
          enabled: p.enabled !== false,
          max_output_tokens: p.max_output_tokens || 1500
        };
        let savedProvider;
        if (isEdit) {
          savedProvider = await AiService.updateProvider(p.id, payload);
        } else {
          savedProvider = await AiService.createProvider(payload);
        }
        const apiKey = document.getElementById('prov-key').value.trim();
        if (apiKey) {
          await AiService.setProviderKey(savedProvider.id, apiKey);
        }
        AppToast.show(isEdit ? 'Provider updated' : 'Provider added');
        document.getElementById('modal-orbit-provider').classList.remove('active');
        this._loadProviders(schoolId);
      } catch (err) { AppToast.show(err.message, 'error'); }
    });
  }
};

// ==============================================================
// INVITATION MODULE
// ==============================================================
window.AppInvitations = {
  async render(main) {
    const profile = await AuthService.getProfile();
    const invitations = await InvitationService.getAll();
    const data = await AppStorage.load();
    const pendingRequests = profile?.role === 'super_admin'
      ? data.users.filter(user => user.role === 'pending' && user.onboardingCompleted && user.status === 'pending')
      : [];
    const { data: companies = [] } = profile?.role === 'super_admin'
      ? await supabase.from('companies').select('id, name').order('name')
      : { data: [] };

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left"><h1 class="page-title">Invitations & Access Requests</h1><p class="page-subtitle">Invite users and review Google sign-up requests.</p></div>
        <button class="btn btn-primary" id="btn-new-invitation"><span class="material-symbols-outlined" style="font-size:18px;">person_add</span> New Invitation</button>
      </div>

      ${profile?.role === 'super_admin' ? `<div class="card" style="padding:0;margin-bottom:20px;overflow:hidden;">
        <div style="padding:18px 20px;border-bottom:1px solid var(--border);">
          <h2 style="font-size:16px;margin:0;">Google Sign-up Requests</h2>
          <p style="font-size:12px;color:var(--text-secondary);margin:4px 0 0;">Name, phone, requested role, school and class submitted during onboarding.</p>
        </div>
        ${pendingRequests.length === 0
          ? '<div class="empty-state" style="padding:32px;"><span class="material-symbols-outlined">task_alt</span><h3>No pending requests</h3></div>'
          : `<div class="table-container"><table><thead><tr><th>Name</th><th>Phone</th><th>Requested Role</th><th>School / Code</th><th>Class</th><th></th></tr></thead><tbody>
            ${pendingRequests.map(request => `<tr>
              <td><div class="font-semibold">${AppUtils.escapeHtml(request.name || '—')}</div><div style="font-size:11px;color:var(--text-muted);">${AppUtils.escapeHtml(request.email || '—')}</div></td>
              <td>${AppUtils.escapeHtml(request.phone || '—')}</td>
              <td><span class="status-badge">${request.requestedRole === 'school' ? 'School' : 'Student'}</span></td>
              <td>${AppUtils.escapeHtml(request.requestedSchoolName || request.requestedSchoolCode || '—')}</td>
              <td>${AppUtils.escapeHtml(request.requestedClass || '—')}</td>
              <td style="white-space:nowrap;">
                <button class="btn btn-primary btn-sm" data-action="approve-access-request" data-id="${request.id}">Review</button>
                <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="reject-access-request" data-id="${request.id}">Reject</button>
              </td>
            </tr>`).join('')}
          </tbody></table></div>`}
      </div>` : ''}

      <div class="management-bar" style="margin-bottom:16px;">
        <div class="search-bar" style="max-width:300px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="inv-search" placeholder="Search by email..."></div>
        <select class="form-select" id="inv-status-filter" style="width:140px;height:44px;font-size:13px;">
          <option value="">All Status</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="revoked">Revoked</option><option value="expired">Expired</option>
        </select>
      </div>

      <div class="card" style="padding:0;">
        ${invitations.length === 0
          ? '<div class="empty-state" style="padding:48px;"><span class="material-symbols-outlined" style="font-size:40px;">mail</span><h3>No invitations yet</h3><p>Click "New Invitation" to invite people to the platform.</p></div>'
          : `<div class="table-container"><table><thead><tr><th>Email</th><th>Role</th><th>School</th><th>Status</th><th>Sent</th><th>Expires</th><th></th></tr></thead>
          <tbody>${invitations.map(inv => {
            const schoolName = inv.schools?.name || '—';
            const isExpired = inv.status === 'pending' && new Date(inv.expires_at) < new Date();
            const displayStatus = isExpired ? 'expired' : inv.status;
            const statusClass = { pending: 'pending', accepted: 'active', revoked: 'inactive', expired: 'inactive' };
            return `<tr>
              <td class="font-semibold">${AppUtils.escapeHtml(inv.email)}</td>
              <td><span class="status-badge">${AppUtils.escapeHtml(inv.role)}</span></td>
              <td>${AppUtils.escapeHtml(schoolName)}</td>
              <td><span class="status-badge status-${statusClass[displayStatus] || ''}">${displayStatus}</span></td>
              <td style="font-size:12px;color:var(--text-muted);">${AppUtils.formatDate(inv.created_at)}</td>
              <td style="font-size:12px;color:var(--text-muted);">${AppUtils.formatDate(inv.expires_at)}</td>
              <td style="white-space:nowrap;">
                ${inv.status === 'pending' ? `<button class="btn btn-ghost btn-sm" data-action="resend-invite" data-id="${inv.id}" title="Resend"><span class="material-symbols-outlined" style="font-size:16px;">refresh</span></button>` : ''}
                ${['super_admin', 'company_admin'].includes(profile?.role) ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="delete-invite-access" data-id="${inv.id}" title="Delete invitation and revoke access"><span class="material-symbols-outlined" style="font-size:16px;">delete_forever</span></button>` : ''}
              </td>
            </tr>`;
          }).join('')}</tbody></table></div>`}
      </div>
    </div>`;
    initIcons();
    this._bindEvents(data, profile, companies, pendingRequests);
  },

  _bindEvents(data, profile, companies, pendingRequests) {
    document.getElementById('btn-new-invitation')?.addEventListener('click', () => {
      this._showInviteModal(data.schools, companies, profile);
    });

    document.addEventListener('click', async (e) => {
      const approveBtn = e.target.closest('[data-action="approve-access-request"]');
      if (approveBtn) {
        const request = pendingRequests.find(item => item.id === approveBtn.dataset.id);
        if (request) this._showApprovalModal(request, data.schools);
        return;
      }
      const rejectBtn = e.target.closest('[data-action="reject-access-request"]');
      if (rejectBtn) {
        if (!confirm('Reject this access request?')) return;
        try {
          const { error } = await supabase.rpc('reject_access_request', { p_profile_id: rejectBtn.dataset.id });
          if (error) throw error;
          AppStorage.invalidate();
          AppToast.show('Access request rejected');
          await this.render(document.getElementById('main-content'));
        } catch (err) { AppToast.show(err.message, 'error'); }
        return;
      }
      const resendBtn = e.target.closest('[data-action="resend-invite"]');
      if (resendBtn) {
        try {
          await InvitationService.resend(resendBtn.dataset.id);
          AppToast.show('Invitation resent');
          await this.render(document.getElementById('main-content'));
        } catch (err) { AppToast.show(err.message, 'error'); }
        return;
      }
      const revokeBtn = e.target.closest('[data-action="revoke-invite"]');
      if (revokeBtn) {
        if (!confirm('Revoke this invitation?')) return;
        try {
          await InvitationService.revoke(revokeBtn.dataset.id);
          AppToast.show('Invitation revoked');
          await this.render(document.getElementById('main-content'));
        } catch (err) { AppToast.show(err.message, 'error'); }
      }
      const deleteBtn = e.target.closest('[data-action="delete-invite-access"]');
      if (deleteBtn) {
        if (!confirm('Delete this invitation? If it was accepted, the invited user login access will also be revoked.')) return;
        try {
          const result = await InvitationService.delete(deleteBtn.dataset.id);
          AppToast.show(result?.access_revoked ? 'Invitation deleted and user access revoked.' : 'Invitation deleted.', 'success');
          AppStorage.invalidate();
          await this.render(document.getElementById('main-content'));
        } catch (err) { AppToast.show(err.message || 'Delete failed.', 'error'); }
        return;
      }
    });
  },

  _showInviteModal(schools, companies, profile) {
    let overlay = document.getElementById('modal-invitation');
    if (overlay) overlay.remove();

    const html = `<div class="modal-overlay active" id="modal-invitation" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:480px;">
        <div class="modal-header"><h2 class="modal-title">Send Invitation</h2><button class="modal-close" onclick="document.getElementById('modal-invitation').classList.remove('active');">&times;</button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" id="inv-email" placeholder="person@example.com" required></div>
          <div class="form-group"><label class="form-label">Role</label>
            <select class="form-select" id="inv-role">
              ${profile?.role === 'super_admin' ? '<option value="company_admin">Company Admin</option>' : ''}
              ${['super_admin', 'company_admin'].includes(profile?.role) ? '<option value="school_admin">School Admin</option>' : ''}
              ${profile?.role !== 'counselor' ? '<option value="counselor">Counselor</option><option value="teacher">Teacher</option>' : ''}
              <option value="student">Student</option>
            </select>
          </div>
          <div class="form-group" id="inv-company-group" style="display:none;"><label class="form-label">Company</label>
            <select class="form-select" id="inv-company">
              <option value="">Select a company...</option>
              ${companies.map(company => `<option value="${company.id}">${AppUtils.escapeHtml(company.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" id="inv-school-group"><label class="form-label">School</label>
            <select class="form-select" id="inv-school">
              <option value="">Select a school...</option>
              ${schools
                .filter(s => profile?.role === 'super_admin' || profile?.role === 'company_admin' || s.id === profile?.school_id)
                .map(s => `<option value="${s.id}">${AppUtils.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary" id="btn-send-invite" style="width:100%;margin-top:16px;"><span class="material-symbols-outlined" style="font-size:18px;">send</span> Send Invitation</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    initIcons();

    const syncScopeFields = () => {
      const isCompanyAdmin = document.getElementById('inv-role').value === 'company_admin';
      document.getElementById('inv-company-group').style.display = isCompanyAdmin ? '' : 'none';
      document.getElementById('inv-school-group').style.display = isCompanyAdmin ? 'none' : '';
    };
    document.getElementById('inv-role')?.addEventListener('change', syncScopeFields);
    syncScopeFields();

    document.getElementById('btn-send-invite')?.addEventListener('click', async () => {
      const email = document.getElementById('inv-email').value.trim();
      const role = document.getElementById('inv-role').value;
      const schoolId = document.getElementById('inv-school').value;
      const companyId = document.getElementById('inv-company').value;
      if (!email) { AppToast.show('Email is required', 'error'); return; }
      if (role !== 'company_admin' && !schoolId) { AppToast.show('Please select a school', 'error'); return; }
      if (role === 'company_admin' && !companyId) { AppToast.show('Please select a company', 'error'); return; }
      try {
        await InvitationService.create({
          email, role,
          school_id: role !== 'company_admin' ? schoolId : null,
          company_id: role === 'company_admin' ? companyId : null,
          invited_by: profile?.id
        });
        AppToast.show(`Invitation sent to ${email}`);
        document.getElementById('modal-invitation').classList.remove('active');
        await this.render(document.getElementById('main-content'));
      } catch (err) { AppToast.show(err.message, 'error'); }
    });
  },

  _showApprovalModal(request, schools) {
    document.getElementById('modal-access-approval')?.remove();
    const html = `<div class="modal-overlay active" id="modal-access-approval" role="dialog" aria-modal="true">
      <div class="modal" style="max-width:520px;">
        <div class="modal-header"><h2 class="modal-title">Approve ${request.requestedRole === 'school' ? 'School' : 'Student'} Request</h2><button class="modal-close" data-close-modal="modal-access-approval">&times;</button></div>
        <div class="modal-body">
          <div style="padding:12px;background:var(--surface-low);border-radius:var(--radius-md);margin-bottom:16px;font-size:13px;">
            <strong>${AppUtils.escapeHtml(request.name || '')}</strong><br>
            ${AppUtils.escapeHtml(request.email || '')} · ${AppUtils.escapeHtml(request.phone || 'No phone')}
          </div>
          <div class="form-group"><label class="form-label">Assign School</label>
            <select class="form-select" id="approval-school"><option value="">Select a school...</option>
              ${schools.map(s => `<option value="${s.id}">${AppUtils.escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
          <p style="font-size:11px;color:var(--text-muted);">Requested: ${AppUtils.escapeHtml(request.requestedSchoolName || request.requestedSchoolCode || '—')}</p>
          ${request.requestedRole === 'student' ? '<p style="font-size:11px;color:var(--text-muted);">After approval, edit the student and add their Google Drive class folder ID.</p>' : ''}
          <button class="btn btn-primary" id="btn-confirm-access-approval" style="width:100%;margin-top:12px;">Approve Access</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const schoolSelect = document.getElementById('approval-school');
    document.getElementById('btn-confirm-access-approval').addEventListener('click', async () => {
      const schoolId = schoolSelect.value;
      if (!schoolId) { AppToast.show('Please select a school', 'error'); return; }
      try {
        const { error } = await supabase.rpc('approve_access_request', {
          p_profile_id: request.id,
          p_school_id: schoolId,
          p_class_id: null
        });
        if (error) throw error;
        AppStorage.invalidate();
        document.getElementById('modal-access-approval').remove();
        AppToast.show('Access request approved');
        await this.render(document.getElementById('main-content'));
      } catch (err) { AppToast.show(err.message, 'error'); }
    });
  }
};

// Add renderInvitations to AppRouter
AppRouter.renderInvitations = async function(main) {
  await window.AppInvitations.render(main);
};

// ==============================================================
// ROLE-FOCUSED LEARNING DASHBOARDS
// ==============================================================
window.StudentLearningDashboard = {
  async render(main, data, school, profile) {
    const student = await StudentService.getByUserId(profile.id);
    const [progress, quota] = await Promise.all([
      ContentService.getMyProgress(),
      AiService.getQuota()
    ]);
    const videos = (data.content || []).filter(item =>
      item.school_id === school.id &&
      item.type === 'Video' &&
      item.status === 'published' &&
      item.sync_state === 'active' &&
      student?.drive_folder_id &&
      item.drive_folder_id === student.drive_folder_id
    );
    const progressByContent = new Map(progress.map(item => [item.content_id, item]));
    const completed = progress.filter(item => item.completed).length;
    const totalWatchSeconds = progress.reduce((sum, item) => sum + Number(item.watched_seconds || 0), 0);
    const percent = videos.length ? Math.round(completed / videos.length * 100) : 0;
    const recentCutoff = Date.now() - 7 * 86400000;
    const recent = progress.filter(item => new Date(item.last_viewed_at).getTime() >= recentCutoff);
    const continuing = videos.filter(item => {
      const itemProgress = progressByContent.get(item.id);
      return itemProgress && !itemProgress.completed && Number(itemProgress.position_seconds) > 0;
    }).slice(0, 4);
    const counselor = (data.users || []).find(user => user.id === student?.counselor_id);
    const card = item => {
      const itemProgress = progressByContent.get(item.id);
      const itemPercent = itemProgress?.duration_seconds
        ? Math.min(100, Math.round(Number(itemProgress.position_seconds) / Number(itemProgress.duration_seconds) * 100))
        : 0;
      return `<button class="card" data-action="play-video" data-id="${item.id}" style="padding:0;text-align:left;overflow:hidden;border:1px solid var(--border);cursor:pointer;">
        <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#1A56DB,#111827);display:flex;align-items:center;justify-content:center;color:#fff;">
          <span class="material-symbols-outlined" style="font-size:42px;">play_circle</span>
        </div>
        <div style="padding:12px;"><div style="font-size:13px;font-weight:700;">${AppUtils.escapeHtml(item.name)}</div>
          <div style="height:4px;background:var(--border);border-radius:4px;margin-top:10px;"><div style="height:100%;width:${itemPercent}%;background:var(--primary);border-radius:4px;"></div></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:5px;">${itemProgress?.completed ? 'Completed' : itemPercent ? `${itemPercent}% watched` : 'Not started'}</div>
        </div>
      </button>`;
    };

    main.innerHTML = `<div class="fade-in">
      <div class="page-header"><div><h1 class="page-title">My Learning</h1><p class="page-subtitle">${AppUtils.escapeHtml(school.name)} · ${AppUtils.escapeHtml(student?.drive_folder_name || 'Assigned class folder')}</p></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
        <div class="metric-card"><div class="metric-info"><h2>${percent}%</h2><p>Overall Completion</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${completed}/${videos.length}</h2><p>Videos Completed</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${Math.round(totalWatchSeconds / 60)}</h2><p>Watch Minutes</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${recent.length}</h2><p>Watched in 7 Days</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${quota?.unlimited ? '∞' : Math.max(0, quota?.remaining ?? 0)}</h2><p>Orbit Questions Left</p></div></div>
      </div>
      <div class="card" style="margin-bottom:20px;padding:16px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;font-size:13px;">
          <div><span style="color:var(--text-muted);">Admission:</span> ${AppUtils.escapeHtml(student?.admission_no || '—')}</div>
          <div><span style="color:var(--text-muted);">Academic Year:</span> ${AppUtils.escapeHtml(student?.academic_year || '—')}</div>
          <div><span style="color:var(--text-muted);">Counselor:</span> ${AppUtils.escapeHtml(counselor?.name || 'Not assigned')}</div>
          <div><span style="color:var(--text-muted);">Status:</span> ${AppUtils.escapeHtml(student?.status || 'inactive')}</div>
        </div>
      </div>
      <section style="margin-bottom:24px;"><h2 style="font-size:16px;margin-bottom:12px;">Continue Watching</h2>
        ${continuing.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;">${continuing.map(card).join('')}</div>` : '<div class="card" style="padding:20px;color:var(--text-muted);font-size:13px;">Start a video and it will appear here.</div>'}
      </section>
      <section style="margin-bottom:24px;"><h2 style="font-size:16px;margin-bottom:12px;">All Assigned Videos</h2>
        ${videos.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;">${videos.map(card).join('')}</div>` : '<div class="card"><div class="empty-state"><h3>No approved videos yet</h3><p>Your counselor will see new videos after they are reviewed.</p></div></div>'}
      </section>
      <section><h2 style="font-size:16px;margin-bottom:12px;">More Learning Tools</h2>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
          ${['Certificates','Assignments','Quizzes'].map(label => `<div class="card" style="padding:18px;"><strong>${label}</strong><div style="font-size:12px;color:var(--text-muted);margin-top:6px;">Coming Soon</div></div>`).join('')}
        </div>
      </section>
    </div>`;
    initIcons();
  }
};

window.CounselorLearningDashboard = {
  async render(main, data, school) {
    const students = (data.students || []).filter(student => student.school_id === school.id);
    const { data: progress } = await supabase.from('content_progress').select('*')
      .eq('school_id', school.id).order('last_viewed_at', { ascending: false });
    const today = new Date().toISOString().slice(0, 10);
    const activeToday = new Set((progress || []).filter(item => item.last_viewed_at?.startsWith(today)).map(item => item.user_id)).size;
    const watchSeconds = (progress || []).reduce((sum, item) => sum + Number(item.watched_seconds || 0), 0);
    const completed = (progress || []).filter(item => item.completed).length;
    const pendingVideos = (data.content || []).filter(item => item.school_id === school.id && item.status === 'review');
    const { data: usage } = await supabase.from('ai_usage_daily').select('question_count').eq('school_id', school.id).eq('usage_date', today);
    const aiQuestions = (usage || []).reduce((sum, item) => sum + Number(item.question_count || 0), 0);

    main.innerHTML = `<div class="fade-in">
      <div class="page-header"><div><h1 class="page-title">Counselor Dashboard</h1><p class="page-subtitle">${AppUtils.escapeHtml(school.name)} learning overview</p></div>
        <button class="btn btn-secondary" data-action="navigate" data-route="school-reports"><span class="material-symbols-outlined">download</span> Export Reports</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px;">
        <div class="metric-card"><div class="metric-info"><h2>${students.length}</h2><p>Total Students</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${activeToday}</h2><p>Active Today</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${Math.round(watchSeconds / 60)}</h2><p>Total Watch Minutes</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${completed}</h2><p>Video Completions</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${students.filter(student => student.status === 'inactive').length}</h2><p>Inactive Learners</p></div></div>
        <div class="metric-card"><div class="metric-info"><h2>${aiQuestions}</h2><p>Orbit Questions Today</p></div></div>
      </div>
      ${pendingVideos.length ? `<div class="card" style="padding:18px;margin-bottom:20px;border-left:4px solid var(--warning);display:flex;align-items:center;gap:12px;">
        <span class="material-symbols-outlined" style="color:var(--warning);">rate_review</span>
        <div style="flex:1;"><strong>${pendingVideos.length} video(s) need review</strong><div style="font-size:12px;color:var(--text-muted);">Students cannot watch these until one reviewer approves them.</div></div>
        <button class="btn btn-primary" data-action="navigate" data-route="school-videos">Review Videos</button>
      </div>` : ''}
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;">
        <div class="card"><div class="card-header"><h3 class="card-title">Recent Learning Activity</h3></div>
          ${(progress || []).slice(0, 8).length ? `<div class="table-container"><table><thead><tr><th>Student</th><th>Progress</th><th>Last Viewed</th></tr></thead><tbody>${(progress || []).slice(0, 8).map(item => {
            const student = students.find(row => row.user_id === item.user_id);
            const percentage = item.duration_seconds ? Math.round(Number(item.position_seconds) / Number(item.duration_seconds) * 100) : 0;
            return `<tr><td>${AppUtils.escapeHtml(student?.name || 'Student')}</td><td>${item.completed ? 'Completed' : `${percentage}%`}</td><td>${AppUtils.formatDate(item.last_viewed_at)}</td></tr>`;
          }).join('')}</tbody></table></div>` : '<div class="empty-state"><p>No learning activity yet.</p></div>'}
        </div>
        <div class="card"><div class="card-header"><h3 class="card-title">Quick Actions</h3></div>
          <div style="display:grid;gap:8px;">
            <button class="btn btn-secondary" data-action="navigate" data-route="school-students">Manage Students</button>
            <button class="btn btn-secondary" data-action="navigate" data-route="school-videos">Review Videos</button>
            <button class="btn btn-secondary" data-action="navigate" data-route="school-notifications">Send Notification</button>
            <button class="btn btn-secondary" data-action="navigate" data-route="school-attendance">My Attendance</button>
          </div>
        </div>
      </div>
    </div>`;
    initIcons();
  }
};

// ==============================================================
// VIDEO PLAYER MODULE (with AI Ask Panel)
// ==============================================================
window.AppVideoPlayer = {
  _resumePositions: {},
  _conversationId: null,
  _askPanelOpen: false,

  async open(contentItem, school) {
    const projectUrl = window.supabase?.supabaseUrl || 'https://rbldzenddjrxxzkaofby.supabase.co';
    this._conversationId = null;

    let playback;
    let savedProgress;
    let quota;
    try {
      [playback, savedProgress, quota] = await Promise.all([
        ContentService.issuePlaybackToken(contentItem.id),
        ContentService.getProgress(contentItem.id),
        AiService.getQuota(contentItem.id)
      ]);
    } catch (error) {
      AppToast.show(error.message || 'Unable to start secure playback.', 'error');
      return;
    }
    const streamUrl = `${projectUrl}${playback.stream_path}`;

    let overlay = document.getElementById('modal-video-player');
    if (overlay) overlay.remove();

    const savedPos = Number(savedProgress?.position_seconds) || this._resumePositions[contentItem.id] || 0;

    const html = `<div class="modal-overlay active" id="modal-video-player" role="dialog" aria-modal="true" style="z-index:2000;">
      <div style="display:flex;max-width:1280px;width:95vw;max-height:90vh;margin:auto;gap:0;border-radius:12px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,0.4);">
        <!-- Video section -->
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;background:#000;">
          <div style="position:relative;flex:1;min-height:0;">
            <!-- Close button -->
            <button id="vp-close" style="position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,0.6);border:none;color:white;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
              <span class="material-symbols-outlined" style="font-size:20px;">close</span>
            </button>

            <!-- Video element -->
            <video id="vp-video" style="width:100%;height:100%;max-height:540px;background:#000;object-fit:contain;" preload="metadata">
              <source src="${streamUrl}" type="${AppUtils.escapeHtml(contentItem.mime_type || 'video/mp4')}">
              Your browser does not support video playback.
            </video>

            <!-- Custom controls -->
            <div id="vp-controls" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));padding:12px 16px;">
              <div id="vp-progress-wrap" style="width:100%;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;cursor:pointer;margin-bottom:10px;position:relative;">
                <div id="vp-progress-bar" style="height:100%;background:#1A56DB;border-radius:2px;width:0%;transition:width 0.1s;"></div>
              </div>
              <div style="display:flex;align-items:center;gap:12px;color:white;">
                <button id="vp-play" style="background:none;border:none;color:white;cursor:pointer;padding:0;">
                  <span class="material-symbols-outlined" style="font-size:28px;">play_arrow</span>
                </button>
                <button id="vp-volume" style="background:none;border:none;color:white;cursor:pointer;padding:0;" title="Mute or unmute">
                  <span class="material-symbols-outlined" style="font-size:24px;">volume_up</span>
                </button>
                <input id="vp-volume-range" type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" style="width:72px;">
                <span id="vp-time" style="font-size:12px;font-family:monospace;min-width:90px;">0:00 / 0:00</span>
                <div style="flex:1;"></div>
                <select id="vp-speed" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);color:white;font-size:12px;padding:2px 6px;border-radius:4px;cursor:pointer;">
                  <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.03">1.03x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
                </select>
                <button id="vp-pip" style="background:none;border:none;color:white;cursor:pointer;padding:0;" title="Picture-in-Picture">
                  <span class="material-symbols-outlined" style="font-size:22px;">picture_in_picture_alt</span>
                </button>
                <button id="vp-fullscreen" style="background:none;border:none;color:white;cursor:pointer;padding:0;">
                  <span class="material-symbols-outlined" style="font-size:22px;">fullscreen</span>
                </button>
                <button id="vp-toggle-ask" style="background:none;border:none;color:white;cursor:pointer;padding:0;" title="Open Orbit">
                  <span class="material-symbols-outlined" style="font-size:22px;">smart_toy</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Video info bar -->
          <div style="background:var(--surface, #f8f9fa);padding:12px 20px;border-top:1px solid var(--border, #e5e7eb);">
            <div style="font-size:15px;font-weight:600;color:var(--text-primary, #111);">${AppUtils.escapeHtml(contentItem.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary, #6b7280);margin-top:2px;">${AppUtils.escapeHtml(school?.name || '')} · ${AppUtils.escapeHtml(contentItem.type || 'Video')}</div>
          </div>
        </div>

        <!-- Ask AI Panel (sidebar) -->
        <div id="vp-ask-panel" style="width:340px;background:var(--surface, #fff);display:flex;flex-direction:column;border-left:1px solid var(--border, #e5e7eb);transition:width 0.3s,opacity 0.3s;">
          <!-- Panel header -->
          <div style="padding:14px 16px;border-bottom:1px solid var(--border, #e5e7eb);display:flex;align-items:center;gap:10px;">
            <span class="material-symbols-outlined" style="font-size:22px;color:var(--primary, #1A56DB);">smart_toy</span>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;color:var(--text-primary, #111);">Orbit</div>
              <div id="vp-orbit-quota" style="font-size:11px;color:var(--text-secondary, #6b7280);">${quota?.unlimited ? 'Unlimited' : `${Math.max(0, quota?.remaining ?? 0)} of ${quota?.daily_limit ?? 10} questions left today`}</div>
            </div>
            <button id="vp-ask-close" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-muted, #9ca3af);">
              <span class="material-symbols-outlined" style="font-size:18px;">close</span>
            </button>
          </div>

          <!-- Chat messages -->
          <div id="vp-ask-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;min-height:0;">
            <div style="text-align:center;padding:24px 12px;">
              <span class="material-symbols-outlined" style="font-size:40px;color:var(--primary, #1A56DB);opacity:0.5;">school</span>
              <p style="font-size:13px;color:var(--text-secondary, #6b7280);margin-top:8px;">Ask Orbit about this video. Answers use the available video transcript and show source timestamps when available.</p>
              <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:12px;">
                <button class="vp-ask-suggestion" style="background:var(--card-bg, #f3f4f6);border:1px solid var(--border, #e5e7eb);border-radius:16px;padding:6px 12px;font-size:11px;cursor:pointer;color:var(--text-primary, #111);transition:background 0.15s;" data-suggestion="Explain the main concept">Explain the main concept</button>
                <button class="vp-ask-suggestion" style="background:var(--card-bg, #f3f4f6);border:1px solid var(--border, #e5e7eb);border-radius:16px;padding:6px 12px;font-size:11px;cursor:pointer;color:var(--text-primary, #111);transition:background 0.15s;" data-suggestion="Give me a summary">Give me a summary</button>
                <button class="vp-ask-suggestion" style="background:var(--card-bg, #f3f4f6);border:1px solid var(--border, #e5e7eb);border-radius:16px;padding:6px 12px;font-size:11px;cursor:pointer;color:var(--text-primary, #111);transition:background 0.15s;" data-suggestion="What are the key points?">What are the key points?</button>
              </div>
            </div>
          </div>

          <!-- Chat input -->
          <div style="padding:12px 16px;border-top:1px solid var(--border, #e5e7eb);display:flex;gap:8px;align-items:flex-end;">
            <textarea id="vp-ask-input" placeholder="Type your question..." rows="1" style="flex:1;border:1px solid var(--border, #e5e7eb);border-radius:8px;padding:8px 12px;font-size:13px;resize:none;font-family:inherit;min-height:38px;max-height:100px;outline:none;background:var(--card-bg, #fff);color:var(--text-primary, #111);"></textarea>
            <button id="vp-ask-send" style="background:var(--primary, #1A56DB);border:none;color:white;width:38px;height:38px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.15s;" title="Send">
              <span class="material-symbols-outlined" style="font-size:20px;">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    initIcons();

    const video = document.getElementById('vp-video');
    const playBtn = document.getElementById('vp-play');
    const timeEl = document.getElementById('vp-time');
    const progressBar = document.getElementById('vp-progress-bar');
    const progressWrap = document.getElementById('vp-progress-wrap');
    let lastSavedAt = 0;
    let watchedSeconds = Number(savedProgress?.watched_seconds) || 0;
    let lastPlaybackTick = 0;

    if (savedPos > 0) video.currentTime = savedPos;

    const formatTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    video.addEventListener('timeupdate', () => {
      const pct = video.duration ? (video.currentTime / video.duration * 100) : 0;
      progressBar.style.width = pct + '%';
      timeEl.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration || 0)}`;
      this._resumePositions[contentItem.id] = video.currentTime;
      if (!video.paused && lastPlaybackTick) {
        watchedSeconds += Math.min(2, Math.max(0, video.currentTime - lastPlaybackTick));
      }
      lastPlaybackTick = video.currentTime;
      if (Date.now() - lastSavedAt > 10000) {
        lastSavedAt = Date.now();
        ContentService.saveProgress(contentItem.id, contentItem.school_id, {
          positionSeconds: video.currentTime,
          durationSeconds: video.duration,
          playbackRate: video.playbackRate,
          watchedSeconds
        }).catch(() => {});
      }
    });

    video.addEventListener('play', () => { playBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:28px;">pause</span>'; });
    video.addEventListener('pause', () => { playBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:28px;">play_arrow</span>'; });

    playBtn.addEventListener('click', () => { video.paused ? video.play() : video.pause(); });

    const volumeButton = document.getElementById('vp-volume');
    const volumeRange = document.getElementById('vp-volume-range');
    volumeButton.addEventListener('click', () => {
      video.muted = !video.muted;
      volumeButton.innerHTML = `<span class="material-symbols-outlined" style="font-size:24px;">${video.muted ? 'volume_off' : 'volume_up'}</span>`;
    });
    volumeRange.addEventListener('input', (event) => {
      video.volume = Number(event.target.value);
      video.muted = video.volume === 0;
    });

    progressWrap.addEventListener('click', (e) => {
      const rect = progressWrap.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (video.duration) video.currentTime = pct * video.duration;
    });

    const speedSelect = document.getElementById('vp-speed');
    const savedRate = Number(savedProgress?.playback_rate) || 1;
    if ([0.5, 0.75, 1, 1.03, 1.25, 1.5, 2].includes(savedRate)) speedSelect.value = String(savedRate);
    video.playbackRate = savedRate;
    speedSelect.addEventListener('change', (e) => { video.playbackRate = parseFloat(e.target.value); });

    document.getElementById('vp-fullscreen')?.addEventListener('click', () => {
      const container = document.getElementById('modal-video-player')?.querySelector('.modal') || document.getElementById('modal-video-player')?.firstElementChild;
      if (container?.requestFullscreen) container.requestFullscreen();
    });

    document.getElementById('vp-pip')?.addEventListener('click', () => {
      if (document.pictureInPictureElement) document.exitPictureInPicture();
      else if (video.requestPictureInPicture) video.requestPictureInPicture();
    });

    document.getElementById('vp-close').addEventListener('click', async () => {
      video.pause();
      await ContentService.saveProgress(contentItem.id, contentItem.school_id, {
        positionSeconds: video.currentTime,
        durationSeconds: video.duration,
        playbackRate: video.playbackRate,
        watchedSeconds
      }).catch(() => {});
      document.getElementById('modal-video-player').classList.remove('active');
      setTimeout(() => document.getElementById('modal-video-player')?.remove(), 300);
    });

    // ── Ask Panel toggle ────────────────────────────────────
    const askPanel = document.getElementById('vp-ask-panel');
    const toggleAsk = document.getElementById('vp-toggle-ask');
    const askClose = document.getElementById('vp-ask-close');

    toggleAsk?.addEventListener('click', () => {
      this._askPanelOpen = !this._askPanelOpen;
      askPanel.style.width = this._askPanelOpen ? '340px' : '0px';
      askPanel.style.opacity = this._askPanelOpen ? '1' : '0';
      askPanel.style.overflow = this._askPanelOpen ? '' : 'hidden';
    });

    askClose?.addEventListener('click', () => {
      this._askPanelOpen = false;
      askPanel.style.width = '0px';
      askPanel.style.opacity = '0';
      askPanel.style.overflow = 'hidden';
    });

    // ── Ask Panel chat logic ────────────────────────────────
    const askInput = document.getElementById('vp-ask-input');
    const askSend = document.getElementById('vp-ask-send');
    const askMessages = document.getElementById('vp-ask-messages');

    const sendMessage = async () => {
      const text = askInput.value.trim();
      if (!text) return;

      // Clear suggestions on first message
      const suggestions = askMessages.querySelector('[style*="text-align:center"]');
      if (suggestions) suggestions.remove();

      // Show user message
      askMessages.insertAdjacentHTML('beforeend', `
        <div style="align-self:flex-end;max-width:85%;background:var(--primary, #1A56DB);color:white;padding:8px 12px;border-radius:12px 12px 2px 12px;font-size:13px;line-height:1.5;word-break:break-word;">${AppUtils.escapeHtml(text)}</div>
      `);

      askInput.value = '';
      askInput.style.height = '38px';

      // Show typing indicator
      const typingId = 'vp-typing-' + Date.now();
      askMessages.insertAdjacentHTML('beforeend', `
        <div id="${typingId}" style="align-self:flex-start;max-width:85%;background:var(--card-bg, #f3f4f6);padding:10px 14px;border-radius:12px 12px 12px 2px;font-size:13px;color:var(--text-secondary, #6b7280);">
          <div style="display:flex;gap:4px;align-items:center;">
            <div style="width:6px;height:6px;border-radius:50%;background:var(--text-muted, #9ca3af);animation:vp-dot-pulse 1.4s infinite;"></div>
            <div style="width:6px;height:6px;border-radius:50%;background:var(--text-muted, #9ca3af);animation:vp-dot-pulse 1.4s 0.2s infinite;"></div>
            <div style="width:6px;height:6px;border-radius:50%;background:var(--text-muted, #9ca3af);animation:vp-dot-pulse 1.4s 0.4s infinite;"></div>
          </div>
        </div>
      `);
      askMessages.scrollTop = askMessages.scrollHeight;

      try {
        const session = await window.supabase?.auth?.getSession?.();
        const token = session?.data?.session?.access_token || '';

        const res = await fetch(`${projectUrl}/functions/v1/orbit-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text,
            conversation_id: AppVideoPlayer._conversationId || undefined,
            school_id: school?.id || contentItem.school_id,
            content_id: contentItem.id,
          }),
        });

        const data = await res.json();
        document.getElementById(typingId)?.remove();

        if (data.error && !data.reply) {
          askMessages.insertAdjacentHTML('beforeend', `
            <div style="align-self:flex-start;max-width:85%;background:#fef2f2;color:#dc2626;padding:8px 12px;border-radius:12px 12px 12px 2px;font-size:13px;line-height:1.5;">
              ${AppUtils.escapeHtml(data.error)}
            </div>
          `);
        } else {
          AppVideoPlayer._conversationId = data.conversation_id;
          const quotaElement = document.getElementById('vp-orbit-quota');
          if (quotaElement && data.quota) {
            quotaElement.textContent = data.quota.unlimited
              ? 'Unlimited'
              : `${Math.max(0, data.quota.remaining)} of ${data.quota.daily_limit} questions left today`;
          }
          // Simple markdown-like rendering for the AI reply
          const formatted = AppUtils.escapeHtml(data.reply || 'No response')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

          askMessages.insertAdjacentHTML('beforeend', `
            <div style="align-self:flex-start;max-width:85%;background:var(--card-bg, #f3f4f6);padding:10px 14px;border-radius:12px 12px 12px 2px;font-size:13px;line-height:1.6;color:var(--text-primary, #111);word-break:break-word;">
              ${formatted}
              ${data.escalated ? '<div style="margin-top:6px;font-size:11px;color:#f59e0b;display:flex;align-items:center;gap:4px;"><span class="material-symbols-outlined" style="font-size:14px;">info</span> Your question has been forwarded to a teacher.</div>' : ''}
            </div>
          `);
        }
      } catch (err) {
        document.getElementById(typingId)?.remove();
        askMessages.insertAdjacentHTML('beforeend', `
          <div style="align-self:flex-start;max-width:85%;background:#fef2f2;color:#dc2626;padding:8px 12px;border-radius:12px 12px 12px 2px;font-size:13px;line-height:1.5;">
            Unable to reach the AI service. Please try again later.
          </div>
        `);
      }

      askMessages.scrollTop = askMessages.scrollHeight;
      initIcons();
    };

    askSend?.addEventListener('click', sendMessage);
    askInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });

    // Auto-resize textarea
    askInput?.addEventListener('input', () => {
      askInput.style.height = '38px';
      askInput.style.height = Math.min(askInput.scrollHeight, 100) + 'px';
    });

    // Suggestion chips
    document.querySelectorAll('.vp-ask-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        askInput.value = btn.dataset.suggestion;
        sendMessage();
      });
    });

    // Inject animation keyframes if not already present
    if (!document.getElementById('vp-ask-styles')) {
      const style = document.createElement('style');
      style.id = 'vp-ask-styles';
      style.textContent = `
        @keyframes vp-dot-pulse { 0%,80%,100% { opacity:0.3;transform:scale(0.8); } 40% { opacity:1;transform:scale(1); } }
        @media (max-width: 768px) {
          #modal-video-player > div { flex-direction:column !important; max-height:95vh !important; }
          #vp-ask-panel { width:100% !important; max-height:45vh; }
        }
      `;
      document.head.appendChild(style);
    }

    // Keyboard shortcuts
    const keyHandler = (e) => {
      // Don't capture keys when typing in the ask panel
      if (e.target.id === 'vp-ask-input') return;
      if (e.key === 'Escape') { document.getElementById('vp-close')?.click(); document.removeEventListener('keydown', keyHandler); }
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); video.paused ? video.play() : video.pause(); }
      if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 10); }
      if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 10); }
      if (e.key === 'f') { document.getElementById('vp-fullscreen')?.click(); }
      if (e.key === 'a') { toggleAsk?.click(); } // Toggle Ask panel with 'a' key
    };
    document.addEventListener('keydown', keyHandler);
  }
};

// ==============================================================
// INIT APP
// ==============================================================
let selectedOnboardingRole = null;

function setAuthScreen(screen) {
  const login = document.getElementById('app-login');
  const onboarding = document.getElementById('app-onboarding');
  const layout = document.getElementById('app-layout');
  login.style.display = screen === 'login' ? '' : 'none';
  onboarding.style.display = screen === 'onboarding' ? 'flex' : 'none';
  layout.classList.toggle('hidden', screen !== 'app');
}

function configureOnboardingForm(profile) {
  selectedOnboardingRole = null;
  document.getElementById('onboarding-role-step').style.display = '';
  document.getElementById('onboarding-details-step').style.display = 'none';
  document.getElementById('onboarding-progress').style.width = '0';
  document.getElementById('onboarding-step-two-dot').style.background = 'var(--surface-container)';
  document.getElementById('onboarding-step-two-dot').style.color = 'var(--text-secondary)';
  document.getElementById('onboarding-full-name').value = profile?.full_name || profile?.name || '';
  document.querySelectorAll('.onboarding-role-option').forEach(option => {
    option.style.borderColor = 'var(--border)';
    option.style.boxShadow = 'var(--shadow-sm)';
  });
}

function renderPendingAccess(profile) {
  setAuthScreen('app');
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('sidebar-toggle').style.display = 'none';
  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="fade-in" style="max-width:680px;margin:auto;text-align:center;">
    <div class="card" style="padding:42px 32px;">
      <div style="width:64px;height:64px;border-radius:50%;margin:0 auto 18px;background:var(--warning-light);color:var(--warning);display:flex;align-items:center;justify-content:center;">
        <span class="material-symbols-outlined" style="font-size:32px;">hourglass_top</span>
      </div>
      <h1 style="font-size:22px;color:var(--on-surface);">Your access request is under review</h1>
      <p style="font-size:13px;color:var(--text-secondary);margin:10px auto 20px;max-width:500px;">
        Thanks, ${AppUtils.escapeHtml(profile.full_name || profile.name)}. Your profile is complete.
        An administrator will verify your ${AppUtils.escapeHtml((profile.requested_role || 'platform').replace('_', ' '))} request before workspace access is enabled.
      </p>
      <div style="padding:12px;border-radius:var(--radius-md);background:var(--surface-low);font-size:12px;color:var(--text-secondary);">
        Signed in as ${AppUtils.escapeHtml(profile.email || '')}
      </div>
    </div>
  </div>`;
}

async function handleAuthenticatedSession() {
  const profile = await AuthService.getProfile(true);
  if (!profile) {
    await AuthService.signOut();
    setAuthScreen('login');
    document.getElementById('login-error').textContent = 'Your profile could not be created. Please try signing in again.';
    return;
  }

  if (!profile.onboarding_completed) {
    configureOnboardingForm(profile);
    setAuthScreen('onboarding');
    return;
  }

  if (profile.role === 'pending') {
    renderPendingAccess(profile);
    return;
  }

  const access = await AuthService.verifySessionAccess();
  if (!access.allowed) {
    await AuthService.signOut();
    setAuthScreen('login');
    document.getElementById('login-error').textContent = access.error;
    return;
  }

  document.getElementById('sidebar').style.display = '';
  document.getElementById('sidebar-toggle').style.display = '';
  setAuthScreen('app');
  AppRouter._clearProfile();
  await AppRouter.init();
  initIcons();
  recordAttendance();
}

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
    await handleAuthenticatedSession();
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

  document.querySelectorAll('.onboarding-role-option').forEach(option => {
    option.addEventListener('click', () => {
      selectedOnboardingRole = option.dataset.onboardingRole;
      document.querySelectorAll('.onboarding-role-option').forEach(item => {
        const active = item === option;
        item.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
        item.style.boxShadow = active ? '0 0 0 2px var(--primary-subtle)' : 'var(--shadow-sm)';
      });
      document.getElementById('onboarding-role-error').textContent = '';
    });
  });

  document.getElementById('btn-onboarding-next').addEventListener('click', () => {
    if (!selectedOnboardingRole) {
      document.getElementById('onboarding-role-error').textContent = 'Please select a role to continue.';
      return;
    }
    const needsSchoolName = selectedOnboardingRole === 'school';
    const needsSchoolCode = selectedOnboardingRole === 'student';
    document.getElementById('onboarding-school-name-group').style.display = needsSchoolName ? '' : 'none';
    document.getElementById('onboarding-school-code-group').style.display = needsSchoolCode ? '' : 'none';
    document.getElementById('onboarding-school-name').required = needsSchoolName;
    document.getElementById('onboarding-school-code').required = needsSchoolCode;
    document.getElementById('onboarding-role-step').style.display = 'none';
    document.getElementById('onboarding-details-step').style.display = '';
    document.getElementById('onboarding-progress').style.width = '100%';
    document.getElementById('onboarding-step-two-dot').style.background = 'var(--primary)';
    document.getElementById('onboarding-step-two-dot').style.color = 'white';
  });

  document.getElementById('btn-onboarding-back').addEventListener('click', () => {
    document.getElementById('onboarding-details-step').style.display = 'none';
    document.getElementById('onboarding-role-step').style.display = '';
    document.getElementById('onboarding-progress').style.width = '0';
    document.getElementById('onboarding-step-two-dot').style.background = 'var(--surface-container)';
    document.getElementById('onboarding-step-two-dot').style.color = 'var(--text-secondary)';
  });

  document.getElementById('btn-onboarding-signout').addEventListener('click', async () => {
    await AuthService.signOut();
    setAuthScreen('login');
  });

  document.getElementById('onboarding-form').addEventListener('submit', async event => {
    event.preventDefault();
    const submit = document.getElementById('btn-onboarding-submit');
    const errorEl = document.getElementById('onboarding-submit-error');
    errorEl.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Saving...';

    const result = await AuthService.completeOnboarding({
      fullName: document.getElementById('onboarding-full-name').value.trim(),
      phone: document.getElementById('onboarding-phone').value.trim(),
      role: selectedOnboardingRole,
      schoolName: document.getElementById('onboarding-school-name').value.trim(),
      schoolCode: document.getElementById('onboarding-school-code').value.trim(),
      studentClass: null
    });

    submit.disabled = false;
    submit.textContent = 'Finish Setup';
    if (!result.success) {
      errorEl.textContent = result.error;
      return;
    }
    await handleAuthenticatedSession();
  });

  // Development Access Mode
  const devAccessContainer = document.getElementById('dev-access-container');
  const devBtn = document.getElementById('btn-dev-access');
  if (devAccessContainer && import.meta.env.VITE_DEV_ACCESS === 'true') {
    console.warn('VITE_DEV_ACCESS is ignored because automatic credential login is disabled.');
  }
  if (devBtn) {
    devBtn.remove();
  }

  // Top nav
  document.getElementById('btn-topnav-search').addEventListener('click', () => { AppGlobalSearch.open(); });
  document.getElementById('btn-notifications').addEventListener('click', () => { AppRouter.navigate('school-notifications'); });
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('light', !isDark);
    try { localStorage.setItem('lanxgrow-theme', isDark ? 'dark' : 'light'); } catch {}
    const icon = document.querySelector('#btn-theme-toggle .material-symbols-outlined');
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    AppToast.show(isDark ? 'Dark mode enabled.' : 'Light mode enabled.');
  });

  // Restore saved theme
  try {
    const saved = localStorage.getItem('lanxgrow-theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      const icon = document.querySelector('#btn-theme-toggle .material-symbols-outlined');
      if (icon) icon.textContent = 'light_mode';
    }
  } catch {}

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await AuthService.signOut();
    document.getElementById('sidebar').style.display = '';
    setAuthScreen('login');
    document.getElementById('login-form').reset();
    document.getElementById('login-error').textContent = '';
  });

  // Entity form save
  document.getElementById('btn-save-entity').addEventListener('click', handleEntitySubmit);
  document.getElementById('form-entity').addEventListener('submit', (e) => { e.preventDefault(); handleEntitySubmit(); });

  // School form save
  document.getElementById('btn-save-school').addEventListener('click', handleSchoolSubmit);
  document.getElementById('btn-save-tracking-config')?.addEventListener('click', handleTrackingConfigSave);
  document.getElementById('btn-generate-tracking-secret')?.addEventListener('click', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    document.getElementById('tracking-webhook-secret').value =
      Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    AppToast.show('A new webhook secret was generated. Save to activate it.', 'info');
  });
  document.getElementById('btn-remove-tracking-private-key')?.addEventListener('click', () => {
    removeTrackingSecret('private_key');
  });
  document.getElementById('btn-remove-tracking-webhook-secret')?.addEventListener('click', () => {
    removeTrackingSecret('webhook_secret');
  });

  // Auto-detect GPS location for school
  document.getElementById('btn-get-location')?.addEventListener('click', () => {
    if (!navigator.geolocation) { AppToast.show('Geolocation not supported by browser.', 'error'); return; }
    AppToast.show('Detecting location...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById('school-input-latitude').value = pos.coords.latitude.toFixed(6);
        document.getElementById('school-input-longitude').value = pos.coords.longitude.toFixed(6);
        AppToast.show('Location detected!', 'success');
      },
      (err) => AppToast.show('Location error: ' + err.message, 'error'),
      { enableHighAccuracy: true }
    );
  });

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
    await handleAuthenticatedSession();
  }
}

document.addEventListener('DOMContentLoaded', initApp);
