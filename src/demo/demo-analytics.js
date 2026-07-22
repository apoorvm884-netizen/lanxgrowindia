// TEMP DEMO MODE
// REMOVE BEFORE PRODUCTION
// ============================================================
// School Intelligence Analytics Dashboard
// ============================================================
// All analytics data is generated in-memory from demo data.
// No Supabase queries. No production backend.
// ============================================================

const eh = window.AppUtils.escapeHtml;

// ------------------------------------------------------------------
// ANALYTICS DATA GENERATION
// ------------------------------------------------------------------
// Video analytics (views, completions, likes, watch time)
const VIDEO_VIEWS = {
  'vid-1':  { views: 145, completions: 98,  likes: 32, avgWatch: '8:45' },
  'vid-2':  { views: 120, completions: 85,  likes: 28, avgWatch: '10:20' },
  'vid-3':  { views: 72,  completions: 50,  likes: 15, avgWatch: '12:10' },
  'vid-4':  { views: 104, completions: 78,  likes: 24, avgWatch: '6:30' },
  'vid-5':  { views: 88,  completions: 62,  likes: 20, avgWatch: '14:45' },
  'vid-6':  { views: 108, completions: 82,  likes: 30, avgWatch: '18:20' },
  'vid-7':  { views: 64,  completions: 48,  likes: 14, avgWatch: '7:15' },
  'vid-8':  { views: 85,  completions: 60,  likes: 18, avgWatch: '9:50' },
  'vid-9':  { views: 56,  completions: 38,  likes: 10, avgWatch: '11:25' },
  'vid-10': { views: 98,  completions: 72,  likes: 22, avgWatch: '13:40' },
  'vid-11': { views: 78,  completions: 55,  likes: 16, avgWatch: '16:10' },
  'vid-12': { views: 58,  completions: 40,  likes: 12, avgWatch: '20:30' },
  'vid-13': { views: 65,  completions: 45,  likes: 13, avgWatch: '15:50' },
  'vid-14': { views: 42,  completions: 30,  likes: 8,  avgWatch: '8:20' },
  'vid-15': { views: 38,  completions: 25,  likes: 7,  avgWatch: '10:45' },
  'vid-16': { views: 28,  completions: 20,  likes: 5,  avgWatch: '6:50' },
};

// Student learning analytics
const STUDENT_ANALYTICS = {
  'demo-student-1': { score: 78, rank: 4, streak: 12, lastLogin: '2h ago', videosWatched: 8, coursesCompleted: 2, engagement: 'high' },
  'demo-student-2': { score: 80, rank: 3, streak: 15, lastLogin: '1h ago', videosWatched: 7, coursesCompleted: 1, engagement: 'high' },
  'demo-student-3': { score: 88, rank: 2, streak: 22, lastLogin: '30m ago', videosWatched: 10, coursesCompleted: 3, engagement: 'high' },
  'demo-student-4': { score: 66, rank: 7, streak: 5, lastLogin: '3d ago', videosWatched: 4, coursesCompleted: 0, engagement: 'low' },
  'demo-student-5': { score: 76, rank: 5, streak: 8, lastLogin: '1d ago', videosWatched: 6, coursesCompleted: 1, engagement: 'medium' },
  'demo-student-6': { score: 72, rank: 6, streak: 6, lastLogin: '2d ago', videosWatched: 5, coursesCompleted: 0, engagement: 'medium' },
  'demo-student-7': { score: 92, rank: 1, streak: 30, lastLogin: '10m ago', videosWatched: 12, coursesCompleted: 3, engagement: 'high' },
  'demo-student-8': { score: 62, rank: 8, streak: 3, lastLogin: '5d ago', videosWatched: 3, coursesCompleted: 0, engagement: 'low' },
};

// Counselor performance
const COUNSELOR_PERF = {
  'demo-counselor-1': { satisfaction: 92, completionRate: 78, topStudent: 'Vikram Joshi', pendingFollowups: 3 },
  'demo-counselor-2': { satisfaction: 85, completionRate: 65, topStudent: 'Rohan Gupta', pendingFollowups: 5 },
  'demo-counselor-3': { satisfaction: 88, completionRate: 70, topStudent: 'Arjun Reddy', pendingFollowups: 2 },
};

// Weekly activity for heatmap
const WEEKLY_ACTIVITY = {
  Monday:    85,
  Tuesday:   92,
  Wednesday: 78,
  Thursday:  95,
  Friday:    88,
  Saturday:  45,
  Sunday:    30,
};

// Trending data
const TRENDING_TOPICS = [
  { name: 'Communication Skills', count: 120 },
  { name: 'Leadership', count: 104 },
  { name: 'Career Planning', count: 98 },
  { name: 'Financial Literacy', count: 85 },
  { name: 'Entrepreneurship', count: 78 },
];

const TRENDING_CATEGORIES = [
  { name: 'Life Skills', count: 210 },
  { name: 'Career Development', count: 165 },
  { name: 'Academic Support', count: 95 },
];

const TRENDING_SUBJECTS = [
  { name: 'Soft Skills', count: 145 },
  { name: 'Leadership', count: 104 },
  { name: 'Communication', count: 108 },
  { name: 'Career Planning', count: 98 },
  { name: 'Financial Literacy', count: 85 },
];

// Recommended insights
const RECOMMENDATIONS = [
  { icon: 'warning', text: '12 students have not watched Leadership videos.', type: 'alert' },
  { icon: 'trending_down', text: 'Class 9 engagement dropped by 15% this week.', type: 'warning' },
  { icon: 'trending_up', text: 'Communication Skills is currently the most popular topic.', type: 'positive' },
  { icon: 'stars', text: 'Counselor Anita Sharma has the highest student completion rate (78%).', type: 'positive' },
  { icon: 'schedule', text: '5 students have not logged in for over 3 days.', type: 'alert' },
  { icon: 'school', text: 'New course "Financial Literacy" has 85 total views this month.', type: 'info' },
  { icon: 'group', text: 'Class 10 average attendance improved by 5% this week.', type: 'positive' },
  { icon: 'analytics', text: 'Video completion rate across all courses is at 72%.', type: 'info' },
];

// At-risk students
function getAtRiskStudents(students) {
  return students.filter(s => {
    const a = STUDENT_ANALYTICS[s.id];
    return a && (s.attendance < 80 || s.progress < 50 || a.streak < 5);
  });
}

function getTopStudents(students) {
  return students
    .map(s => ({ ...s, analytics: STUDENT_ANALYTICS[s.id] || { score: 0, rank: 999, streak: 0 } }))
    .sort((a, b) => b.analytics.score - a.analytics.score);
}

function getEngagementData() {
  return {
    activeToday: 5,
    activeThisWeek: 7,
    avgDailyWatchTime: '45m',
    avgWeeklyWatchTime: '5h 20m',
    videosCompletedThisWeek: 12,
    coursesCompletedThisWeek: 3,
  };
}

function getClassAnalytics(students) {
  const class9 = students.filter(s => s.class === 'Class 9');
  const class10 = students.filter(s => s.class === 'Class 10');
  const avg = (arr, fn) => arr.length ? Math.round(arr.reduce((s, st) => s + fn(st), 0) / arr.length) : 0;
  return {
    class9: {
      label: 'Class 9',
      students: class9.length,
      avgProgress: avg(class9, s => s.progress),
      attendance: avg(class9, s => s.attendance),
      completion: class9.length ? Math.round(class9.filter(s => (STUDENT_ANALYTICS[s.id]?.coursesCompleted || 0) > 0).length / class9.length * 100) : 0,
      popularSubject: 'Soft Skills',
      popularVideo: 'Introduction to Soft Skills',
    },
    class10: {
      label: 'Class 10',
      students: class10.length,
      avgProgress: avg(class10, s => s.progress),
      attendance: avg(class10, s => s.attendance),
      completion: class10.length ? Math.round(class10.filter(s => (STUDENT_ANALYTICS[s.id]?.coursesCompleted || 0) > 0).length / class10.length * 100) : 0,
      popularSubject: 'Career Planning',
      popularVideo: 'Exploring Career Options',
    },
  };
}

// ------------------------------------------------------------------
// STITCH COMPONENT HELPERS
// ------------------------------------------------------------------
function section(title, subtitle, content) {
  return `
    <div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin:0 0 4px;">${title}</h2>
          ${subtitle ? `<p style="margin:0;font-size:13px;color:var(--text-secondary);">${subtitle}</p>` : ''}
        </div>
      </div>
      ${content}
    </div>`;
}

function card(title, body, extra) {
  return `
    <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
      ${title ? `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3 style="margin:0;font-size:15px;font-weight:600;">${title}</h3>
        ${extra || ''}
      </div>` : ''}
      ${body}
    </div>`;
}

function kpi(icon, label, value, color) {
  return `
    <div class="metric-card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;display:flex;align-items:center;gap:14px;">
      <div style="width:44px;height:44px;border-radius:10px;background:${color || 'var(--primary)'}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span class="material-symbols-outlined" style="font-size:22px;color:${color || 'var(--primary)'};">${icon}</span>
      </div>
      <div>
        <div style="font-size:24px;font-weight:700;line-height:1.2;">${value}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${label}</div>
      </div>
    </div>`;
}

function progressBar(value, color, height) {
  return `
    <div style="height:${height || '8px'};background:var(--border);border-radius:${height || '8px'};overflow:hidden;width:100%;">
      <div style="width:${Math.min(value, 100)}%;height:100%;background:${color || 'var(--primary)'};border-radius:${height || '8px'};transition:width 0.3s;"></div>
    </div>`;
}

function donutChart(percentage, size, color, label) {
  const pct = Math.min(percentage, 100);
  const conic = `conic-gradient(${color || 'var(--primary)'} ${pct * 3.6}deg, var(--border) ${pct * 3.6}deg)`;
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div style="width:${size || 80}px;height:${size || 80}px;border-radius:50%;background:${conic};display:flex;align-items:center;justify-content:center;">
        <div style="width:${(size || 80) - 16}px;height:${(size || 80) - 16}px;border-radius:50%;background:var(--card-bg);display:flex;align-items:center;justify-content:center;font-size:${(size || 80) * 0.22}px;font-weight:700;">${pct}%</div>
      </div>
      ${label ? `<span style="font-size:11px;color:var(--text-secondary);">${label}</span>` : ''}
    </div>`;
}

function barChart(items, maxValue, height) {
  const max = maxValue || Math.max(...items.map(i => i.value));
  const bars = items.map(i => {
    const pct = (i.value / max) * 100;
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
        <div style="flex:1;width:100%;display:flex;flex-direction:column;justify-content:end;">
          <div style="height:${pct}%;background:${i.color || 'var(--primary)'};border-radius:4px 4px 0 0;min-height:4px;transition:height 0.3s;"></div>
        </div>
        <span style="font-size:10px;color:var(--text-secondary);text-align:center;white-space:nowrap;">${i.label}</span>
      </div>`;
  }).join('');
  return `<div style="display:flex;align-items:flex-end;height:${height || 180}px;gap:6px;padding:0 4px;">${bars}</div>`;
}

function badge(text, color) {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${color}18;color:${color};">${text}</span>`;
}

const MEDAL_HTML = ['<span style="font-size:16px;">🥇</span>', '<span style="font-size:16px;">🥈</span>', '<span style="font-size:16px;">🥉</span>'];

// ------------------------------------------------------------------
// SECTION RENDERERS
// ------------------------------------------------------------------
function renderOverview(container, students, courses, counselors, content, schoolName) {
  const activeStudents = students.filter(s => s.status === 'active').length;
  const avgAttendance = students.length ? Math.round(students.reduce((s, st) => s + st.attendance, 0) / students.length) : 0;
  const avgProgress = students.length ? Math.round(students.reduce((s, st) => s + st.progress, 0) / students.length) : 0;
  const engagement = getEngagementData();

  container.innerHTML += `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px;">
      ${kpi('groups', 'Total Students', students.length, '#3b82f6')}
      ${kpi('person_play', 'Active Today', engagement.activeToday, '#10b981')}
      ${kpi('badge', 'Total Counselors', counselors.length, '#8b5cf6')}
      ${kpi('video_library', 'Total Videos', content.length, '#f59e0b')}
      ${kpi('school', 'Total Courses', courses.length, '#ef4444')}
      ${kpi('check_circle', 'Completion Rate', `${Math.round(avgProgress)}%`, '#10b981')}
      ${kpi('fact_check', 'Attendance Rate', `${avgAttendance}%`, '#3b82f6')}
      ${kpi('monitoring', 'Weekly Engagement', `${engagement.activeThisWeek} days`, '#8b5cf6')}
      ${kpi('stars', 'Avg Learning Score', `${Math.round(students.reduce((s, st) => s + (STUDENT_ANALYTICS[st.id]?.score || 0), 0) / students.length)}`, '#f59e0b')}
    </div>`;
}

function renderVideoAnalytics(container, content) {
  const schoolContent = content;
  const withViews = schoolContent
    .map(c => ({ ...c, stats: VIDEO_VIEWS[c.id] || { views: 0, completions: 0, likes: 0, avgWatch: '0:00' } }))
    .sort((a, b) => b.stats.views - a.stats.views);

  const mostWatched = withViews.slice(0, 5);
  const leastWatched = withViews.slice(-5).reverse();

  container.innerHTML += section('Video Analytics', 'Track video performance and trending content', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      ${card('Most Watched Videos', `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${mostWatched.map((v, i) => `
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:13px;font-weight:600;width:20px;color:var(--text-muted);">${i + 1}</span>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:500;">${eh(v.name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);">${v.stats.views} views · ${v.stats.completions} completed</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:14px;font-weight:700;">${v.stats.views}</div>
                <div style="font-size:10px;color:var(--text-secondary);">views</div>
              </div>
              ${i < 3 ? MEDAL_HTML[i] : ''}
            </div>
          `).join('')}
        </div>
      `)}
      ${card('Least Watched Videos', `
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${leastWatched.map((v, i) => `
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:13px;font-weight:600;width:20px;color:var(--text-muted);">${i + 1}</span>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:500;">${eh(v.name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);">${v.stats.views} views · ${v.stats.likes} likes</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:14px;font-weight:700;color:var(--warning);">${v.stats.views}</div>
                <div style="font-size:10px;color:var(--text-secondary);">views</div>
              </div>
            </div>
          `).join('')}
        </div>
      `)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
      ${card('Trending Topics', `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${TRENDING_TOPICS.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light);">
              <span style="font-size:13px;">${t.name}</span>
              <span style="font-size:13px;font-weight:600;color:var(--primary);">${t.count}</span>
            </div>
          `).join('')}
        </div>
      `)}
      ${card('Trending Categories', `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${TRENDING_CATEGORIES.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light);">
              <span style="font-size:13px;">${t.name}</span>
              <span style="font-size:13px;font-weight:600;color:var(--primary);">${t.count}</span>
            </div>
          `).join('')}
        </div>
      `)}
      ${card('Trending Subjects', `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${TRENDING_SUBJECTS.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light);">
              <span style="font-size:13px;">${t.name}</span>
              <span style="font-size:13px;font-weight:600;color:var(--primary);">${t.count}</span>
            </div>
          `).join('')}
        </div>
      `)}
    </div>
  `);
}

function renderStudentAnalytics(container, students) {
  const topStudents = getTopStudents(students).slice(0, 10);

  container.innerHTML += section('Student Analytics', 'Top learners and performance leaderboard', `
    ${card('Top 10 Students Leaderboard', `
      <div style="display:flex;flex-direction:column;">
        <div style="display:grid;grid-template-columns:40px 1fr 80px 100px 100px 80px;gap:8px;padding:8px 12px;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border);">
          <span>Rank</span><span>Student</span><span>Class</span><span>Attendance</span><span>Score</span><span>Progress</span>
        </div>
        ${topStudents.map((s, i) => {
          const a = s.analytics;
          const medal = i < 3 ? MEDAL_HTML[i] : `<span style="font-size:12px;font-weight:700;color:var(--text-muted);width:20px;text-align:center;">#${i + 1}</span>`;
          const scoreColor = a.score >= 85 ? 'var(--success)' : a.score >= 70 ? 'var(--primary)' : a.score >= 60 ? 'var(--warning)' : 'var(--danger)';
          return `
            <div style="display:grid;grid-template-columns:40px 1fr 80px 100px 100px 80px;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border-light);background:${i === 0 ? 'linear-gradient(135deg,rgba(255,215,0,0.05),transparent)' : ''};">
              <div style="display:flex;align-items:center;justify-content:center;">${medal}</div>
              <div>
                <div style="font-size:13px;font-weight:600;">${eh(s.name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);">${a.videosWatched} videos · ${a.coursesCompleted} courses</div>
              </div>
              <div style="font-size:13px;color:var(--text-secondary);">${eh(s.class)}</div>
              <div style="font-size:13px;">${s.attendance}% ${s.attendance >= 90 ? badge('Excellent', '#10b981') : s.attendance < 80 ? badge('Low', '#ef4444') : ''}</div>
              <div style="font-size:15px;font-weight:700;color:${scoreColor};">${a.score}</div>
              <div style="display:flex;align-items:center;gap:6px;">
                <div style="flex:1;max-width:60px;">${progressBar(s.progress, scoreColor, 6)}</div>
                <span style="font-size:12px;color:var(--text-secondary);">${s.progress}%</span>
              </div>
            </div>`;
        }).join('')}
      </div>
    `)}
  `);
}

function renderEngagement(container) {
  const e = getEngagementData();
  container.innerHTML += section('Engagement Analytics', 'Student activity and platform engagement', `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:16px;">
      ${kpi('login', 'Active Today', e.activeToday, '#3b82f6')}
      ${kpi('calendar_view_week', 'Active This Week', e.activeThisWeek, '#10b981')}
      ${kpi('timer', 'Avg Daily Watch Time', e.avgDailyWatchTime, '#8b5cf6')}
      ${kpi('schedule', 'Avg Weekly Watch Time', e.avgWeeklyWatchTime, '#f59e0b')}
      ${kpi('check_circle', 'Videos Completed', e.videosCompletedThisWeek, '#10b981')}
      ${kpi('school', 'Courses Completed', e.coursesCompletedThisWeek, '#ef4444')}
    </div>
  `);
}

function renderClassAnalytics(container, students) {
  const ca = getClassAnalytics(students);

  const renderClass = (cls) => `
    <div class="card" style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3 style="margin:0;font-size:15px;font-weight:600;">${cls.label}</h3>
        <span style="font-size:12px;padding:2px 10px;border-radius:12px;background:var(--primary)12;color:var(--primary);font-weight:600;">${cls.students} Students</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Average Progress</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;">${progressBar(cls.avgProgress, '#3b82f6')}</div>
            <span style="font-size:14px;font-weight:600;">${cls.avgProgress}%</span>
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Attendance</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="flex:1;">${progressBar(cls.attendance, '#10b981')}</div>
            <span style="font-size:14px;font-weight:600;">${cls.attendance}%</span>
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Course Completion</div>
          <div style="display:flex;align-items:center;gap:10px;">${donutChart(cls.completion, 64, '#8b5cf6', '')}
            <span style="font-size:14px;font-weight:600;">${cls.completion}%</span>
          </div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Completion Rate</div>
          ${donutChart(cls.completion, 72, '#f59e0b', `${cls.completion}%`)}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-light);">
        <div style="font-size:12px;"><span style="color:var(--text-secondary);">Most Popular Subject:</span> <strong>${cls.popularSubject}</strong></div>
        <div style="font-size:12px;"><span style="color:var(--text-secondary);">Most Popular Video:</span> <strong>${cls.popularVideo}</strong></div>
      </div>
    </div>`;

  container.innerHTML += section('Class Analytics', 'Performance breakdown by class', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      ${renderClass(ca.class9)}
      ${renderClass(ca.class10)}
    </div>
  `);
}

function renderCounselorAnalytics(container, counselors, students) {
  const counselorData = counselors.map(c => {
    const perf = COUNSELOR_PERF[c.id] || { satisfaction: 80, completionRate: 60, topStudent: '—', pendingFollowups: 0 };
    const assignedStudents = students.filter(s => s.counselor_id === c.id);
    const avgProgress = assignedStudents.length ? Math.round(assignedStudents.reduce((sum, s) => sum + s.progress, 0) / assignedStudents.length) : 0;
    return { ...c, perf, assignedStudents: assignedStudents.length, avgProgress };
  }).sort((a, b) => b.perf.completionRate - a.perf.completionRate);

  container.innerHTML += section('Counselor Analytics', 'Performance metrics and leaderboard', `
    ${card('', `
      <div style="display:flex;flex-direction:column;">
        <div style="display:grid;grid-template-columns:1fr 100px 100px 100px 100px 80px;gap:8px;padding:8px 12px;font-size:11px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border);">
          <span>Counselor</span><span>Students</span><span>Progress</span><span>Completion</span><span>Satisfaction</span><span></span>
        </div>
        ${counselorData.map((c, i) => {
          const rankColor = i === 0 ? 'var(--success)' : i === 1 ? 'var(--primary)' : i === 2 ? 'var(--warning)' : 'var(--text-muted)';
          return `
            <div style="display:grid;grid-template-columns:1fr 100px 100px 100px 100px 80px;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border-light);background:${i === 0 ? 'linear-gradient(135deg,rgba(16,185,129,0.05),transparent)' : ''};">
              <div>
                <div style="font-size:13px;font-weight:600;">${eh(c.name)}</div>
                <div style="font-size:11px;color:var(--text-secondary);">${eh(c.department)} · Top: ${eh(c.perf.topStudent)}</div>
              </div>
              <div style="font-size:14px;font-weight:600;">${c.assignedStudents}</div>
              <div style="font-size:13px;">${c.avgProgress}%</div>
              <div style="font-size:13px;font-weight:600;color:${c.perf.completionRate >= 70 ? 'var(--success)' : 'var(--warning)'};">${c.perf.completionRate}%</div>
              <div style="font-size:13px;">${c.perf.satisfaction}%</div>
              <div style="font-size:20px;">${i < 3 ? MEDAL_HTML[i] : ''}</div>
            </div>`;
        }).join('')}
      </div>
    `)}
  `);
}

function renderAttendanceInsights(container, students) {
  const avgAttendance = students.length ? Math.round(students.reduce((s, st) => s + st.attendance, 0) / students.length) : 0;
  const lowAttendance = students.filter(s => s.attendance < 75);
  const highAttendance = students.filter(s => s.attendance >= 95);

  container.innerHTML += section('Attendance Insights', 'Daily, weekly, and monthly attendance patterns', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      ${card('Attendance Distribution', `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
              <span>Daily Attendance</span><span style="font-weight:600;">${avgAttendance}%</span>
            </div>
            ${progressBar(avgAttendance, '#3b82f6', 10)}
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
              <span>Weekly Attendance</span><span style="font-weight:600;">${Math.min(avgAttendance + 3, 100)}%</span>
            </div>
            ${progressBar(Math.min(avgAttendance + 3, 100), '#10b981', 10)}
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
              <span>Monthly Attendance</span><span style="font-weight:600;">${Math.max(avgAttendance - 2, 0)}%</span>
            </div>
            ${progressBar(Math.max(avgAttendance - 2, 0), '#8b5cf6', 10)}
          </div>
        </div>
      `)}
      <div style="display:grid;grid-template-columns:1fr;gap:12px;">
        ${card(`Students Below 75% (${lowAttendance.length})`, lowAttendance.length === 0
          ? '<div style="font-size:13px;color:var(--text-secondary);">No students with critically low attendance.</div>'
          : `<div style="display:flex;flex-direction:column;gap:8px;">${lowAttendance.map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#fef2f2;border-radius:8px;">
              <span style="font-size:13px;font-weight:500;">${eh(s.name)}</span>
              <span style="font-size:13px;font-weight:600;color:#ef4444;">${s.attendance}%</span>
            </div>`).join('')}</div>`, '')
        }
        ${card(`Students Above 95% (${highAttendance.length})`, highAttendance.length === 0
          ? '<div style="font-size:13px;color:var(--text-secondary);">No students with exceptional attendance.</div>'
          : `<div style="display:flex;flex-direction:column;gap:8px;">${highAttendance.map(s => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#f0fdf4;border-radius:8px;">
              <span style="font-size:13px;font-weight:500;">${eh(s.name)}</span>
              <span style="font-size:13px;font-weight:600;color:#10b981;">${s.attendance}%</span>
            </div>`).join('')}</div>`, '')
        }
      </div>
    </div>
  `);
}

function renderLearningInsights(container, students) {
  const levels = [
    { label: 'Excellent (85+)', min: 85, color: '#10b981', count: 0 },
    { label: 'Good (70-84)', min: 70, max: 84, color: '#3b82f6', count: 0 },
    { label: 'Average (60-69)', min: 60, max: 69, color: '#f59e0b', count: 0 },
    { label: 'Needs Improvement (<60)', min: 0, max: 59, color: '#ef4444', count: 0 },
  ];

  students.forEach(s => {
    const score = STUDENT_ANALYTICS[s.id]?.score || 0;
    const level = levels.find(l => score >= l.min && (!l.max || score <= l.max));
    if (level) level.count++;
  });

  const total = students.length || 1;
  container.innerHTML += section('Learning Insights', 'Student performance distribution and learning scores', `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      ${card('Learning Score Distribution', `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${levels.map(l => `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span>${l.label}</span><span style="font-weight:600;color:${l.color};">${l.count} students (${Math.round(l.count / total * 100)}%)</span>
              </div>
              ${progressBar(l.count / total * 100, l.color, 10)}
            </div>
          `).join('')}
        </div>
      `)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start;">
        ${donutChart(Math.round(levels[0].count / total * 100), 100, '#10b981', 'Excellent')}
        ${donutChart(Math.round(levels[1].count / total * 100), 100, '#3b82f6', 'Good')}
        ${donutChart(Math.round(levels[2].count / total * 100), 100, '#f59e0b', 'Average')}
        ${donutChart(Math.round(levels[3].count / total * 100), 100, '#ef4444', 'Needs Improvement')}
      </div>
    </div>
  `);
}

function renderAtRiskStudents(container, students) {
  const atRisk = getAtRiskStudents(students);

  container.innerHTML += section('At-Risk Students', 'Students who need immediate attention', `
    ${atRisk.length === 0
      ? card('', '<div style="font-size:13px;color:var(--text-secondary);text-align:center;padding:20px;">No at-risk students at this time.</div>')
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
          ${atRisk.map(s => {
            const a = STUDENT_ANALYTICS[s.id] || {};
            const riskReasons = [];
            if (s.attendance < 80) riskReasons.push(`Low attendance (${s.attendance}%)`);
            if (s.progress < 50) riskReasons.push(`Low progress (${s.progress}%)`);
            if (a.streak < 5) riskReasons.push(`Inactive for ${a.streak || 0} days`);
            return `
              <div style="background:linear-gradient(135deg,#fef2f2,#fff);border:1px solid #fecaca;border-radius:12px;padding:16px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                  <div style="width:36px;height:36px;border-radius:50%;background:#fecaca;display:flex;align-items:center;justify-content:center;">
                    <span class="material-symbols-outlined" style="font-size:18px;color:#ef4444;">warning</span>
                  </div>
                  <div>
                    <div style="font-size:14px;font-weight:600;">${eh(s.name)}</div>
                    <div style="font-size:11px;color:var(--text-secondary);">${eh(s.class)} · ${eh(s.section)}</div>
                  </div>
                  <span style="margin-left:auto;font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;background:#fef2f2;color:#ef4444;">At Risk</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
                  ${riskReasons.map(r => `<div style="display:flex;align-items:center;gap:6px;color:#ef4444;"><span class="material-symbols-outlined" style="font-size:14px;">error_outline</span>${r}</div>`).join('')}
                </div>
                <div style="display:flex;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid #fecaca;font-size:11px;">
                  <div><span style="color:var(--text-secondary);">Attendance:</span> <strong style="color:#ef4444;">${s.attendance}%</strong></div>
                  <div><span style="color:var(--text-secondary);">Progress:</span> <strong>${s.progress}%</strong></div>
                  <div><span style="color:var(--text-secondary);">Score:</span> <strong>${a.score || '—'}</strong></div>
                </div>
              </div>`;
          }).join('')}
        </div>`}
  `);
}

function renderRecommendations(container) {
  container.innerHTML += section('AI-Powered Recommendations', 'Automated insights generated from school activity data', `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">
      ${RECOMMENDATIONS.map(r => {
        const colorMap = { alert: '#ef4444', warning: '#f59e0b', positive: '#10b981', info: '#3b82f6' };
        const bgMap = { alert: '#fef2f2', warning: '#fffbeb', positive: '#f0fdf4', info: '#eff6ff' };
        const borderMap = { alert: '#fecaca', warning: '#fde68a', positive: '#bbf7d0', info: '#bfdbfe' };
        const c = colorMap[r.type] || '#3b82f6';
        const bg = bgMap[r.type] || '#f8fafc';
        const border = borderMap[r.type] || '#e2e8f0';
        return `
          <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:16px;display:flex;align-items:flex-start;gap:12px;">
            <div style="width:36px;height:36px;border-radius:8px;background:${c}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span class="material-symbols-outlined" style="font-size:18px;color:${c};">${r.icon}</span>
            </div>
            <div style="font-size:13px;line-height:1.5;color:var(--text-primary);">${eh(r.text)}</div>
          </div>`;
      }).join('')}
    </div>
  `);
}

function renderActivityHeatmap(container) {
  const days = Object.entries(WEEKLY_ACTIVITY);
  const maxVal = Math.max(...days.map(d => d[1]));

  container.innerHTML += section('Activity Heatmap', 'Weekly platform activity distribution', `
    ${card('', `
      <div style="display:flex;gap:8px;justify-content:center;">
        ${days.map(([day, val]) => {
          const intensity = val / maxVal;
          const r = Math.round(59 + (255 - 59) * (1 - intensity));
          const g = Math.round(130 + (255 - 130) * (1 - intensity));
          const b = Math.round(246 + (255 - 246) * (1 - intensity));
          const bg = `rgb(${r},${g},${b})`;
          return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;">
              <div style="width:100%;aspect-ratio:1;max-width:64px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:${intensity > 0.5 ? '#fff' : 'var(--text-primary)'};">${val}%</div>
              <span style="font-size:11px;color:var(--text-secondary);">${day.slice(0, 3)}</span>
            </div>`;
        }).join('')}
      </div>
    `)}
  `);
}

function renderLeaderboards(container, students, content, courses, counselors) {
  const topStudents = getTopStudents(students).slice(0, 5);

  const topCourses = courses
    .map(c => ({
      ...c,
      enrollCount: ENROLLMENTS ? ENROLLMENTS.filter(e => e.course_id === c.id).length : 0,
    }))
    .sort((a, b) => b.enrollCount - a.enrollCount)
    .slice(0, 5);

  const topContent = content
    .map(c => ({ ...c, views: VIDEO_VIEWS[c.id]?.views || 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const renderLeaderboard = (items, nameKey, valueKey, valueLabel, color) => `
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${items.map((item, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:${i === 0 ? `linear-gradient(135deg,${color}08,transparent)` : 'transparent'};border-radius:8px;">
          ${i < 3 ? MEDAL_HTML[i] : `<span style="font-size:12px;font-weight:700;color:var(--text-muted);width:20px;text-align:center;">#${i + 1}</span>`}
          <div style="flex:1;font-size:13px;font-weight:500;">${eh(item[nameKey])}</div>
          <div style="font-size:13px;font-weight:600;color:${color};">${item[valueKey]}${valueLabel ? ` ${valueLabel}` : ''}</div>
        </div>
      `).join('')}
    </div>`;

  container.innerHTML += section('Leaderboards', 'Top performers across all categories', `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
      ${card('Top Students', renderLeaderboard(topStudents.map(s => ({ ...s, score: s.analytics.score })), 'name', 'score', '', '#3b82f6'), '<span style="font-size:11px;color:var(--text-secondary);">By Learning Score</span>')}
      ${card('Top Courses', renderLeaderboard(topCourses, 'name', 'enrollCount', 'enrolled', '#8b5cf6'), '<span style="font-size:11px;color:var(--text-secondary);">By Enrollments</span>')}
      ${card('Top Videos', renderLeaderboard(topContent, 'name', 'views', 'views', '#f59e0b'), '<span style="font-size:11px;color:var(--text-secondary);">By Views</span>')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
      ${card('Top Counselors', renderLeaderboard(counselors.map(c => ({ ...c, completionRate: COUNSELOR_PERF[c.id]?.completionRate || 0 })).sort((a, b) => b.completionRate - a.completionRate).slice(0, 5), 'name', 'completionRate', '%', '#10b981'), '<span style="font-size:11px;color:var(--text-secondary);">By Completion Rate</span>')}
      ${card('Top Categories', renderLeaderboard(TRENDING_CATEGORIES, 'name', 'count', 'activities', '#ef4444'), '<span style="font-size:11px;color:var(--text-secondary);">By Activity</span>')}
    </div>
  `);
}

// Quick filter bar
function renderFilters() {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;padding:12px 16px;background:var(--card-bg);border:1px solid var(--border);border-radius:10px;">
      <span class="material-symbols-outlined" style="font-size:18px;color:var(--text-muted);">filter_alt</span>
      <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Quick Filters:</span>
      ${['Today', 'Last 7 Days', 'Last 30 Days', 'Overall'].map(p => `
        <button class="btn btn-sm" style="height:30px;font-size:12px;${p === 'Overall' ? 'background:var(--primary);color:#fff;border:none;' : 'background:transparent;border:1px solid var(--border);'}" data-action="sp-analytics-filter" data-period="${p.toLowerCase().replace(/\s+/g, '-')}">${p}</button>
      `).join('')}
      <span style="margin-left:auto;font-size:11px;color:var(--text-muted);">Showing data for <strong>Overall</strong> · Updated just now</span>
    </div>`;
}

// Need reference to enrollments for leaderboard
let ENROLLMENTS = [];

// ------------------------------------------------------------------
// MAIN RENDER FUNCTION
// ------------------------------------------------------------------
export function renderSchoolIntelligence(container, school, data) {
  if (!container) return;

  const students = data.students || [];
  const courses = data.courses || [];
  const counselors = data.counselors || [];
  const content = data.content || [];

  // Cache enrollments for leaderboard
  ENROLLMENTS = data.enrollments || [];

  container.innerHTML = `
    <div class="fade-in" style="padding:0 24px 80px;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:24px 0 8px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard">
              <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span>
            </button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school?.name || 'School')}</span>
          </div>
          <h1 style="font-size:22px;font-weight:700;margin:0;">School Intelligence</h1>
          <p style="margin:4px 0 0;font-size:13px;color:var(--text-secondary);">AI-powered analytics and insights for ${eh(school?.name || 'your school')}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;padding:4px 10px;border-radius:20px;background:#f0fdf4;color:#10b981;font-weight:600;display:flex;align-items:center;gap:4px;">
            <span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>Live Demo
          </span>
        </div>
      </div>

      ${renderFilters()}
      <div id="analytics-content"></div>
    </div>`;

  const contentArea = container.querySelector('#analytics-content') || container;

  // Render all analytics sections
  renderOverview(contentArea, students, courses, counselors, content, school?.name);
  renderVideoAnalytics(contentArea, content);
  renderStudentAnalytics(contentArea, students);
  renderEngagement(contentArea);
  renderClassAnalytics(contentArea, students);
  renderCounselorAnalytics(contentArea, counselors, students);
  renderAttendanceInsights(contentArea, students);
  renderLearningInsights(contentArea, students);
  renderAtRiskStudents(contentArea, students);
  renderRecommendations(contentArea);
  renderActivityHeatmap(contentArea);
  renderLeaderboards(contentArea, students, content, courses, counselors);

  window.initIcons?.();
}
