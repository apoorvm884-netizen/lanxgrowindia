// ==============================================================
// LANXGROW COS — Student Portal & Course Player
// ==============================================================

window.StudentPortal = {

  async dashboard(studentId) {
    const student = await window.StudentService?.getById(studentId);
    if (!student) { AppToast.show('Student not found.', 'error'); return; }
    const data = await AppStorage.load();
    const enrollments = (data.enrollments || []).filter(e => e.student_id === studentId && e.status === 'active');
    const courses = enrollments.map(e => (data.courses || []).find(c => c.id === e.course_id)).filter(Boolean);
    const progressMap = {};
    for (const c of courses) {
      try { progressMap[c.id] = await window.ProgressService?.getCourseProgress(studentId, c.id) || { completed_lessons: 0, total_lessons: 0, percentage: 0 }; }
      catch { progressMap[c.id] = { completed_lessons: 0, total_lessons: 0, percentage: 0 }; }
    }
    const modules = {};
    for (const c of courses) {
      try {
        const ms = await window.ModuleService?.getByCourse(c.id) || [];
        modules[c.id] = ms;
      } catch (e) { console.error('Failed to fetch modules:', e); modules[c.id] = []; }
    }
    const recentLessons = [];
    try {
      const allProgress = await window.ProgressService?.getByStudent(studentId) || [];
      const progressWithLessons = await Promise.all(allProgress.slice(-10).map(async p => {
        try {
          const lesson = await window.LessonService?.getById(p.lesson_id);
          if (lesson) return { ...p, lesson };
        } catch (e) { console.error('Failed to fetch lesson:', e); }
        return null;
      }));
      recentLessons.push(...progressWithLessons.filter(Boolean).reverse());
    } catch (e) { console.error('Failed to load recent lessons:', e); }

    const existing = document.getElementById('modal-student-portal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-student-portal';
    overlay.innerHTML = `<div class="modal" style="max-width:800px;">
      <div class="modal-header">
        <h3 class="modal-title">${student.name} — Learning Portal</h3>
        <button class="modal-close" data-close-modal="modal-student-portal"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="modal-body" style="max-height:80vh;overflow-y:auto;padding:20px;">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          <div style="padding:14px;background:#f0fdf4;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#10b981;">${courses.length}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Courses</div>
          </div>
          <div style="padding:14px;background:#eff6ff;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#3b82f6;">${Object.values(progressMap).reduce((s, p) => s + (p.completed_lessons || 0), 0)}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Lessons Done</div>
          </div>
          <div style="padding:14px;background:#f5f3ff;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#8b5cf6;">${Math.round(Object.values(progressMap).reduce((s, p) => s + (p.percentage || 0), 0) / Math.max(courses.length, 1))}%</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Avg Progress</div>
          </div>
          <div style="padding:14px;background:#fffbeb;border-radius:8px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#f59e0b;">${recentLessons.length}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Recent Activity</div>
          </div>
        </div>

        <div style="margin-bottom:20px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Enrolled Courses</div>
          ${courses.length === 0 ? '<div style="font-size:13px;color:var(--text-muted);padding:20px;text-align:center;border:1px dashed var(--border);border-radius:8px;">No courses assigned yet.</div>'
          : courses.map(c => {
            const p = progressMap[c.id] || { completed_lessons: 0, total_lessons: 0, percentage: 0 };
            const mods = modules[c.id] || [];
            return `<div style="border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;cursor:pointer;" data-action="sp-open-course-player" data-student-id="${studentId}" data-course-id="${c.id}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:14px;font-weight:600;">${c.name}</span>
                <span style="font-size:11px;color:var(--text-muted);">${mods.length} module${mods.length !== 1 ? 's' : ''}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
                  <div style="width:${p.percentage}%;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:3px;transition:width 0.3s;"></div>
                </div>
                <span style="font-size:12px;font-weight:600;color:${p.percentage >= 80 ? '#10b981' : p.percentage >= 40 ? '#f59e0b' : '#6b7280'};">${Math.round(p.percentage)}%</span>
              </div>
            </div>`;
          }).join('')}
        </div>

        ${recentLessons.length > 0 ? `<div style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Continue Learning</div>
          <div style="display:flex;flex-direction:column;gap:4px;">${recentLessons.slice(0, 4).map(r => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border-light);border-radius:6px;cursor:pointer;" data-action="sp-open-lesson" data-student-id="${studentId}" data-lesson-id="${r.lesson_id}">
              <span class="material-symbols-outlined" style="font-size:16px;color:${r.completed ? '#10b981' : '#3b82f6'};">${r.completed ? 'check_circle' : 'play_circle'}</span>
              <div style="flex:1;font-size:13px;">${r.lesson?.title || 'Unknown lesson'}</div>
              <div style="font-size:10px;color:var(--text-muted);">${r.completed ? 'Completed' : 'In progress'}</div>
            </div>`).join('')}
          </div>
        </div>` : ''}

        ${courses.some(c => progressMap[c.id]?.percentage >= 100) ? `<div style="margin-bottom:16px;">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;">Certificates</div>
          ${courses.filter(c => progressMap[c.id]?.percentage >= 100).map(c => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border-light);border-radius:6px;cursor:pointer;" data-action="sp-view-certificate" data-student-id="${studentId}" data-course-id="${c.id}">
              <span class="material-symbols-outlined" style="font-size:16px;color:#f59e0b;">workspace_premium</span>
              <span style="flex:1;font-size:13px;">${c.name} — Certificate Available</span>
              <span style="font-size:11px;color:var(--text-secondary);">View</span>
            </div>`).join('')}
        </div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-student-portal">Close</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.classList.add('active');
    document.addEventListener('keydown', AppModal._keyHandler);
    initIcons();
  },

  async openCoursePlayer(studentId, courseId) {
    try {
      const student = await window.StudentService?.getById(studentId);
      const course = await window.CourseService?.getById(courseId);
      if (!course || !student) return;
      const modules = await window.ModuleService?.getByCourse(courseId) || [];
      const allLessons = {};
      for (const m of modules) {
        allLessons[m.id] = await window.LessonService?.getByModule(m.id) || [];
      }
      const flatLessons = modules.flatMap(m => (allLessons[m.id] || []).map(l => ({ ...l, moduleTitle: m.title, moduleId: m.id })));
      const progressMap = {};
      for (const l of flatLessons) {
        try {
          const p = await window.ProgressService?.getByLesson(studentId, l.id);
          if (p) progressMap[l.id] = p;
        } catch (e) { console.error('Failed to fetch lesson progress:', e); }
      }
      const completedCount = flatLessons.filter(l => progressMap[l.id]?.completed).length;
      const totalCount = flatLessons.length;
      const percentage = totalCount ? Math.round(completedCount / totalCount * 100) : 0;

      const existing = document.getElementById('modal-course-player');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-course-player';
      overlay.innerHTML = `<div class="modal" style="max-width:900px;">
        <div class="modal-header">
          <h3 class="modal-title">${course.name}</h3>
          <button class="modal-close" data-close-modal="modal-course-player"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="modal-body" style="max-height:80vh;overflow-y:auto;padding:0;display:flex;flex-direction:column;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:13px;color:var(--text-secondary);">${student.name}</span>
              <span style="font-size:12px;font-weight:600;color:${percentage >= 80 ? '#10b981' : percentage >= 40 ? '#f59e0b' : '#6b7280'};">${completedCount}/${totalCount} lessons (${percentage}%)</span>
            </div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
              <div style="width:${percentage}%;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:3px;"></div>
            </div>
          </div>
          <div style="display:flex;flex:1;min-height:400px;">
            <div style="width:280px;border-right:1px solid var(--border);overflow-y:auto;flex-shrink:0;">
              ${modules.length === 0 ? '<div style="padding:20px;font-size:13px;color:var(--text-muted);text-align:center;">No modules yet.</div>'
              : modules.map((m, mi) => `
                <div style="border-bottom:1px solid var(--border-light);">
                  <div style="padding:10px 14px;font-size:12px;font-weight:600;color:var(--text-secondary);">${m.title}</div>
                  ${(allLessons[m.id] || []).map((l, li) => {
                    const p = progressMap[l.id];
                    const isDone = p?.completed;
                    const iconMap = { video: 'play_circle', pdf: 'picture_as_pdf', document: 'description', image: 'image', drive_link: 'folder_open', assignment: 'assignment', quiz: 'quiz' };
                    return `<div style="display:flex;align-items:center;gap:8px;padding:8px 14px 8px 20px;cursor:pointer;${isDone ? 'opacity:0.7;' : ''}background:${p && !isDone ? 'var(--primary)08' : 'transparent'};" data-action="sp-player-select-lesson" data-student-id="${studentId}" data-lesson-id="${l.id}">
                      <span class="material-symbols-outlined" style="font-size:14px;color:${isDone ? '#10b981' : '#6b7280'};">${isDone ? 'check_circle' : iconMap[l.content_type] || 'radio_button_unchecked'}</span>
                      <span style="font-size:12px;flex:1;">${l.title}</span>
                    </div>`;
                  }).join('')}
                </div>`).join('')}
            </div>
            <div id="course-player-content" style="flex:1;padding:20px;overflow-y:auto;display:flex;align-items:center;justify-content:center;">
              <div style="text-align:center;padding:40px;color:var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size:48px;margin-bottom:12px;">play_circle</span>
                <div style="font-size:14px;">Select a lesson to begin</div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.classList.add('active');
      document.addEventListener('keydown', AppModal._keyHandler);
      initIcons();
    } catch (err) { AppToast.show(err.message || 'Failed to open course player.', 'error'); }
  },

  async loadLesson(studentId, lessonId) {
    try {
      const lesson = await window.LessonService?.getById(lessonId);
      if (!lesson) { AppToast.show('Lesson not found.', 'error'); return; }
      let progress = await window.ProgressService?.getByLesson(studentId, lesson.id);
      if (!progress) {
        await window.ProgressService?.upsertProgress(studentId, lesson.id, { completed: false, last_activity: new Date().toISOString() });
        progress = await window.ProgressService?.getByLesson(studentId, lesson.id);
      }
      const container = document.getElementById('course-player-content');
      if (!container) return;

      const resumePos = progress?.resume_position || 0;
      const iconMap = { video: 'play_circle', pdf: 'picture_as_pdf', document: 'description', image: 'image', drive_link: 'folder_open', assignment: 'assignment', quiz: 'quiz' };
      const typeLabels = { video: 'Video Lesson', pdf: 'PDF Document', document: 'Document', image: 'Image', drive_link: 'Google Drive Link', assignment: 'Assignment', quiz: 'Quiz' };

      let contentHtml = '';
      if (lesson.content_type === 'video' && lesson.content_url) {
        if (lesson.content_url.includes('youtube.com') || lesson.content_url.includes('youtu.be')) {
          let videoId = '';
          const ytMatch = lesson.content_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
          if (ytMatch) videoId = ytMatch[1];
          if (videoId) {
            contentHtml = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}?start=${resumePos}" frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`;
          } else {
            contentHtml = `<video controls style="width:100%;max-height:400px;border-radius:8px;" src="${lesson.content_url}"></video>`;
          }
        } else {
          contentHtml = `<video controls style="width:100%;max-height:400px;border-radius:8px;" src="${lesson.content_url}"></video>`;
        }
      } else if (lesson.content_type === 'pdf' && lesson.content_url) {
        contentHtml = `<iframe src="${lesson.content_url}" style="width:100%;height:500px;border:1px solid var(--border);border-radius:8px;"></iframe>`;
      } else if (lesson.content_type === 'image' && lesson.content_url) {
        contentHtml = `<img src="${lesson.content_url}" style="max-width:100%;max-height:450px;border-radius:8px;object-fit:contain;" alt="${lesson.title}">`;
      } else if (lesson.content_type === 'drive_link' && lesson.content_url) {
        contentHtml = `<div style="padding:30px;text-align:center;border:2px dashed var(--border);border-radius:8px;">
          <span class="material-symbols-outlined" style="font-size:48px;color:#4285f4;margin-bottom:12px;">folder_open</span>
          <div style="font-size:14px;margin-bottom:10px;">Google Drive File</div>
          <a href="${lesson.content_url}" target="_blank" class="btn btn-primary" style="display:inline-flex;gap:6px;"><span class="material-symbols-outlined" style="font-size:16px;">open_in_new</span> Open in Drive</a>
        </div>`;
      } else if (lesson.content_type === 'document' && lesson.content_url) {
        contentHtml = `<iframe src="https://docs.google.com/gview?url=${encodeURIComponent(lesson.content_url)}&embedded=true" style="width:100%;height:500px;border:1px solid var(--border);border-radius:8px;"></iframe>`;
      } else if (lesson.content_type === 'assignment') {
        contentHtml = `<div style="padding:20px;text-align:center;">
          <span class="material-symbols-outlined" style="font-size:48px;color:#8b5cf6;margin-bottom:12px;">assignment</span>
          <div style="font-size:16px;font-weight:600;margin-bottom:4px;">${lesson.title}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Complete this assignment</div>
          <button class="btn btn-primary" data-action="sp-open-assignment" data-student-id="${studentId}" data-lesson-id="${lesson.id}"><span class="material-symbols-outlined" style="font-size:16px;">edit_note</span> Open Assignment</button>
        </div>`;
      } else if (lesson.content_type === 'quiz') {
        contentHtml = `<div style="padding:20px;text-align:center;">
          <span class="material-symbols-outlined" style="font-size:48px;color:#f59e0b;margin-bottom:12px;">quiz</span>
          <div style="font-size:16px;font-weight:600;margin-bottom:4px;">${lesson.title}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Test your knowledge</div>
          <button class="btn btn-primary" data-action="sp-start-quiz" data-student-id="${studentId}" data-lesson-id="${lesson.id}"><span class="material-symbols-outlined" style="font-size:16px;">play_arrow</span> Start Quiz</button>
        </div>`;
      } else {
        contentHtml = `<div style="padding:40px;text-align:center;color:var(--text-muted);">
          <span class="material-symbols-outlined" style="font-size:48px;margin-bottom:12px;">${iconMap[lesson.content_type] || 'help'}</span>
          <div style="font-size:14px;">${typeLabels[lesson.content_type] || 'Lesson'}: ${lesson.title}</div>
          ${lesson.content_url ? `<div style="margin-top:12px;"><a href="${lesson.content_url}" target="_blank" class="btn btn-secondary btn-sm">Open Content</a></div>` : ''}
        </div>`;
      }

      container.innerHTML = `<div style="display:flex;flex-direction:column;width:100%;">
        <div style="margin-bottom:16px;">
          <div style="font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;">
            <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary);">${iconMap[lesson.content_type] || 'menu_book'}</span>
            ${lesson.title}
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${typeLabels[lesson.content_type] || 'Lesson'} ${lesson.duration ? '· ' + lesson.duration + ' min' : ''}</div>
        </div>
        <div style="margin-bottom:16px;">${contentHtml}</div>
        <div style="display:flex;gap:8px;margin-top:8px;padding-top:16px;border-top:1px solid var(--border);">
          <button class="btn btn-secondary btn-sm" data-action="sp-player-prev" data-student-id="${studentId}" data-lesson-id="${lesson.id}" style="font-size:12px;"><span class="material-symbols-outlined" style="font-size:14px;">chevron_left</span> Previous</button>
          <button class="btn btn-secondary btn-sm" data-action="sp-player-next" data-student-id="${studentId}" data-lesson-id="${lesson.id}" style="font-size:12px;margin-left:auto;">Next <span class="material-symbols-outlined" style="font-size:14px;">chevron_right</span></button>
          <button class="btn btn-primary btn-sm" data-action="sp-player-mark-complete" data-student-id="${studentId}" data-lesson-id="${lesson.id}" style="font-size:12px;${progress?.completed ? 'opacity:0.6;' : ''}">${progress?.completed ? '<span class="material-symbols-outlined" style="font-size:14px;">check</span> Completed' : '<span class="material-symbols-outlined" style="font-size:14px;">done</span> Mark Complete'}</button>
        </div>
      </div>`;
      initIcons();
    } catch (err) { AppToast.show(err.message || 'Failed to load lesson.', 'error'); }
  },

  async markComplete(studentId, lessonId) {
    try {
      await window.ProgressService?.markComplete(studentId, lessonId);
      AppToast.show('Lesson completed!', 'success');
      this.loadLesson(studentId, lessonId);
    } catch (err) { AppToast.show(err.message || 'Failed to update progress.', 'error'); }
  },

  async navigateLesson(studentId, lessonId, direction) {
    try {
      const lesson = await window.LessonService?.getById(lessonId);
      if (!lesson) return;
      const modules = await window.ModuleService?.getByCourse(
        (await window.ModuleService?.getById(lesson.module_id))?.course_id
      ) || [];
      const allLessons = [];
      for (const m of modules) {
        const ls = await window.LessonService?.getByModule(m.id) || [];
        allLessons.push(...ls);
      }
      const idx = allLessons.findIndex(l => l.id === lessonId);
      const targetIdx = direction === 'next' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= allLessons.length) {
        AppToast.show(direction === 'next' ? 'You have completed all lessons!' : 'This is the first lesson.', 'info');
        return;
      }
      this.loadLesson(studentId, allLessons[targetIdx].id);
    } catch (err) { AppToast.show(err.message, 'error'); }
  },

  async viewCertificate(studentId, courseId) {
    try {
      let cert;
      try { cert = await window.CertificateService?.getByCourse(studentId, courseId); } catch (e) { console.error('Failed to fetch certificate:', e); }
      if (!cert) {
        const progress = await window.ProgressService?.getCourseProgress(studentId, courseId);
        if (!progress || progress.percentage < 100) {
          AppToast.show('Complete all lessons to earn a certificate.', 'warn');
          return;
        }
        cert = await window.CertificateService?.generate(studentId, courseId, new Date().toISOString());
        AppToast.show('Certificate generated!', 'success');
      }
      const student = await window.StudentService?.getById(studentId);
      const course = await window.CourseService?.getById(courseId);
      if (!cert || !student || !course) return;

      const existing = document.getElementById('modal-certificate');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-certificate';
      overlay.innerHTML = `<div class="modal" style="max-width:700px;">
        <div class="modal-header"><h3 class="modal-title">Certificate of Completion</h3><button class="modal-close" data-close-modal="modal-certificate"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body" style="padding:30px;">
          <div style="border:3px double var(--primary);border-radius:12px;padding:40px 30px;text-align:center;background:linear-gradient(135deg,#faf5ff,#eff6ff);">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:var(--text-secondary);margin-bottom:16px;">Certificate of Completion</div>
            <div style="font-size:32px;font-weight:700;color:var(--primary);margin-bottom:8px;">${course.name}</div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:24px;">This is to certify that</div>
            <div style="font-size:24px;font-weight:600;margin-bottom:24px;border-bottom:2px solid var(--primary);display:inline-block;padding-bottom:4px;">${student.name}</div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:24px;">has successfully completed the course requirements on ${AppUtils.formatDate(cert.completed_at || cert.issued_at)}</div>
            <div style="display:flex;justify-content:center;gap:40px;margin-bottom:20px;">
              <div style="text-align:center;">
                <div style="width:80px;height:80px;margin:0 auto 8px;background:#f5f3ff;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                  <span class="material-symbols-outlined" style="font-size:40px;color:#8b5cf6;">verified</span>
                </div>
                <div style="font-size:10px;color:var(--text-muted);">Certificate ID</div>
                <div style="font-size:11px;font-weight:600;font-family:monospace;">${cert.certificate_number}</div>
              </div>
              <div style="text-align:center;">
                <div style="width:80px;height:80px;margin:0 auto 8px;background:#f5f3ff;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                  <span class="material-symbols-outlined" style="font-size:40px;color:#8b5cf6;">qr_code_scanner</span>
                </div>
                <div style="font-size:10px;color:var(--text-muted);">Verify at</div>
                <div style="font-size:11px;font-weight:600;font-family:monospace;">lanxgrow.com/verify</div>
              </div>
            </div>
            <div style="font-size:9px;color:var(--text-muted);">LANXGROW INDIA — Learning Management System</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-certificate">Close</button>
          <button class="btn btn-primary" data-action="sp-download-certificate" data-cert-id="${cert.id}" style="font-size:12px;"><span class="material-symbols-outlined" style="font-size:14px;">download</span> Download</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.classList.add('active');
      document.addEventListener('keydown', AppModal._keyHandler);
      initIcons();
    } catch (err) { AppToast.show(err.message || 'Failed to load certificate.', 'error'); }
  }
};
