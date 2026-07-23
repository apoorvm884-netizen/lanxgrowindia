// ==============================================================
// LANXGROW COS — School Portal Module
// All School-level rendering and CRUD operations
// ==============================================================



const eh = AppUtils.escapeHtml;

// ==============================================================
// STUDENTS MANAGEMENT
// ==============================================================
window.SchoolStudents = {
  currentPage: 1,
  perPage: 20,

  async render(main, data, school) {
    const schoolId = school.id;
    const q = (document.getElementById('sp-student-search')?.value || '').toLowerCase();
    const counselorFilter = document.getElementById('sp-student-counselor')?.value || '';
    const statusFilter = document.getElementById('sp-student-status')?.value || '';
    const classFilter = document.getElementById('sp-student-class')?.value || '';

    let students = [];
    try { students = await window.StudentService?.getBySchool(schoolId) || []; } catch { students = []; }
    const counselors = data.users.filter(u => u.schoolId === schoolId && u.role === 'counselor');

    if (q) students = students.filter(s => s.name.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
    if (counselorFilter) students = students.filter(s => s.counselor_id === counselorFilter);
    if (statusFilter) students = students.filter(s => s.status === statusFilter);
    if (classFilter) students = students.filter(s => s.class === classFilter);

    const startIdx = (this.currentPage - 1) * this.perPage;
    const pageItems = students.slice(startIdx, startIdx + this.perPage);
    const totalPages = Math.max(1, Math.ceil(students.length / this.perPage));
    const classes = [...new Set(students.map(s => s.class).filter(Boolean))];

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">Students</h1><p class="page-subtitle">Manage all students enrolled in ${eh(school.name)}.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm" style="height:34px;font-size:11px;" data-action="sp-export-csv" data-entity="students"><span class="material-symbols-outlined" style="font-size:14px;">download</span> Export</button>
          <button class="btn btn-primary" data-action="sp-add-student"><span class="material-symbols-outlined" style="font-size:18px;">person_add</span> Add Student</button>
        </div>
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <div class="search-bar" style="max-width:250px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="sp-student-search" placeholder="Search students..." value="${eh(q)}"></div>
        <select class="form-select" id="sp-student-class" style="width:130px;height:40px;font-size:13px;">
          <option value="">All Classes</option>
          ${classes.map(c => `<option value="${eh(c)}" ${classFilter === c ? 'selected' : ''}>${eh(c)}</option>`).join('')}
        </select>
        <select class="form-select" id="sp-student-counselor" style="width:160px;height:40px;font-size:13px;">
          <option value="">All Counselors</option>
          ${counselors.map(c => `<option value="${c.id}" ${counselorFilter === c.id ? 'selected' : ''}>${eh(c.name)}</option>`).join('')}
        </select>
        <select class="form-select" id="sp-student-status" style="width:130px;height:40px;font-size:13px;">
          <option value="">All Status</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
          <option value="suspended" ${statusFilter === 'suspended' ? 'selected' : ''}>Suspended</option>
        </select>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">Showing ${pageItems.length} of ${students.length} students</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${students.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">groups</span><h3>No students match your search</h3><p>Try adjusting your filters or add a new student.</p></div>`
        : `<div class="table-container"><table><thead><tr><th>Name</th><th>Email</th><th>Class</th><th>Counselor</th><th>Status</th><th>Courses</th><th style="width:140px;"></th></tr></thead><tbody>
          ${pageItems.map(s => {
            const counselor = counselors.find(c => c.id === s.counselor_id);
            const courses = data.enrollments?.filter(e => e.student_id === s.id) || [];
            const safeName = eh(s.name);
            const nameHtml = q ? safeName.replace(new RegExp(eh(q), 'gi'), m => `<mark style="background:#fef08a;padding:0 2px;border-radius:2px;">${m}</mark>`) : safeName;
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:8px;"><div class="user-avatar" style="width:28px;height:28px;font-size:10px;">${AppUtils.getInitials(safeName)}</div><span class="font-semibold">${nameHtml}</span></div></td>
              <td style="font-size:13px;">${eh(s.email || '—')}</td>
              <td style="font-size:13px;">${eh(s.class || '—')}</td>
              <td style="font-size:13px;">${eh(counselor?.name || '—')}</td>
              <td><span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-suspended'}">${eh(s.status)}</span></td>
              <td style="font-size:13px;">${courses.length}</td>
              <td class="td-actions" style="display:flex;gap:4px;padding-top:8px;">
                <button class="btn btn-ghost btn-sm" data-action="sp-view-student" data-id="${s.id}" title="View Profile"><span class="material-symbols-outlined" style="font-size:16px;">person</span></button>
                <button class="btn btn-ghost btn-sm" data-action="sp-edit-student" data-id="${s.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="sp-delete-student" data-id="${s.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
                <button class="btn btn-ghost btn-sm" data-action="sp-student-courses" data-id="${s.id}" title="Assign Courses"><span class="material-symbols-outlined" style="font-size:16px;">assignment</span></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody></table></div>`}
      </div>
      ${totalPages > 1 ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;">
        <button class="btn btn-secondary btn-sm" data-action="sp-student-page" data-page="${this.currentPage - 1}" ${this.currentPage <= 1 ? 'disabled' : ''} style="height:34px;font-size:12px;">Previous</button>
        ${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `
          <button class="btn ${p === this.currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" data-action="sp-student-page" data-page="${p}" style="height:34px;min-width:34px;font-size:12px;">${p}</button>
        `).join('')}
        <button class="btn btn-secondary btn-sm" data-action="sp-student-page" data-page="${this.currentPage + 1}" ${this.currentPage >= totalPages ? 'disabled' : ''} style="height:34px;font-size:12px;">Next</button>
      </div>` : ''}
    </div>`;
    initIcons();
  },

  async openAdd(data, school) {
    const counselors = (data.counselors || data.users || []).filter(u => u.schoolId === school.id && u.role === 'counselor');
    const cats = (data.categories || []).filter(c => c.school_id === school.id);
    const subjects = (data.subjects || []).filter(s => s.school_id === school.id);
    const courses = (data.courses || []).filter(c => c.school_id === school.id);
    const classes = [...new Set((data.students || []).filter(s => s.school_id === school.id).map(s => s.class).filter(Boolean))];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-student';
    overlay.innerHTML = `<div class="modal" style="max-width:640px;">
      <div class="modal-header"><h3 class="modal-title">Add Student</h3><button class="modal-close" data-close-modal="modal-student"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Basic Information</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="sp-input-student-name" placeholder="Enter student name"></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="sp-input-student-email" placeholder="student@example.com"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px;">
          <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" class="form-input" id="sp-input-student-dob"></div>
          <div class="form-group"><label class="form-label">Gender</label>
            <select class="form-select" id="sp-input-student-gender"><option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>
          </div>
          <div class="form-group"><label class="form-label">Admission No.</label><input type="text" class="form-input" id="sp-input-student-admission" placeholder="e.g. ADM-001"></div>
        </div>

        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin:16px 0 8px;">Guardian Information</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">Parent/Guardian Name</label><input type="text" class="form-input" id="sp-input-student-parent" placeholder="Parent's full name"></div>
          <div class="form-group"><label class="form-label">Parent Contact</label><input type="text" class="form-input" id="sp-input-student-parent-contact" placeholder="+91-98765-43210"></div>
        </div>

        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin:16px 0 8px;">School Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">Class</label>
            <select class="form-select" id="sp-input-student-class"><option value="">Select...</option>${classes.map(c => `<option value="${c}">${eh(c)}</option>`).join('')}<option value="Class 11">Class 11</option><option value="Class 12">Class 12</option></select>
          </div>
          <div class="form-group"><label class="form-label">Section</label><input type="text" class="form-input" id="sp-input-student-section" placeholder="e.g. A"></div>
          <div class="form-group"><label class="form-label">Academic Year</label>
            <select class="form-select" id="sp-input-student-academic-year"><option value="2025-2026">2025-2026</option><option value="2026-2027">2026-2027</option></select>
          </div>
        </div>

        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin:16px 0 8px;">Assignments</div>
        <div class="form-group"><label class="form-label">Assigned Counselor</label>
          <select class="form-select" id="sp-input-student-counselor"><option value="">None</option>${counselors.map(c => `<option value="${c.id}">${eh(c.name)}</option>`).join('')}</select>
        </div>
        <div style="margin-top:8px;">
          <div style="display:flex;gap:20px;">
            <div style="flex:1;">
              <label class="form-label">Assigned Categories</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;max-height:100px;overflow-y:auto;">${cats.map(c => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-student-cat" value="${c.id}"> ${eh(c.name)}</label>`).join('')}</div>
            </div>
            <div style="flex:1;">
              <label class="form-label">Assigned Subjects</label>
              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;max-height:100px;overflow-y:auto;">${subjects.map(s => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-student-sub" value="${s.id}"> ${eh(s.name)}</label>`).join('')}</div>
            </div>
          </div>
        </div>
        <div style="margin-top:8px;">
          <label class="form-label">Assigned Courses (enroll on create)</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;max-height:100px;overflow-y:auto;">${courses.map(c => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-student-course" value="${c.id}"> ${eh(c.name)}</label>`).join('')}</div>
        </div>

        <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin:16px 0 8px;">Status & Credentials</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">Enrollment Status</label>
            <select class="form-select" id="sp-input-student-status"><option value="active">Active</option><option value="inactive">Inactive</option></select>
          </div>
          <div class="form-group" style="display:flex;align-items:flex-end;gap:8px;">
            <div style="flex:1;">
              <label class="form-label">Login Credentials</label>
              <div style="display:flex;gap:4px;align-items:center;">
                <input type="text" class="form-input" id="sp-input-student-username" placeholder="Auto-generated" readonly style="flex:1;font-size:12px;background:var(--border-light);">
                <button class="btn btn-secondary btn-sm" data-action="sp-generate-creds" style="white-space:nowrap;font-size:11px;"><span class="material-symbols-outlined" style="font-size:14px;">autorenew</span> Generate</button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-top:4px;"><label class="form-label">Notes</label><textarea class="form-input" id="sp-input-student-notes" placeholder="Optional notes..." style="height:50px;resize:vertical;"></textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-student">Cancel</button>
        <button class="btn btn-primary" data-action="sp-save-student" id="sp-btn-save-student">Add Student</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    setTimeout(() => document.getElementById('sp-input-student-name')?.focus(), 100);
  },

  async openEdit(studentId) {
    try {
      const student = await window.StudentService?.getById(studentId);
      if (!student) return;
      const data = await AppStorage.load();
      const school = data.schools.find(s => s.id === student.school_id);
      const counselors = (data.counselors || data.users || []).filter(u => u.schoolId === student.school_id && u.role === 'counselor');
      const cats = (data.categories || []).filter(c => c.school_id === student.school_id);
      const subjects = (data.subjects || []).filter(s => s.school_id === student.school_id);
      const existing = document.getElementById('modal-student');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-student';
      overlay.innerHTML = `<div class="modal" style="max-width:640px;">
        <div class="modal-header"><h3 class="modal-title">Edit Student</h3><button class="modal-close" data-close-modal="modal-student"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Basic Information</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="sp-input-student-name" value="${eh(student.name)}"></div>
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="sp-input-student-email" value="${eh(student.email || '')}"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:8px;">
            <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" class="form-input" id="sp-input-student-dob" value="${eh(student.dob || '')}"></div>
            <div class="form-group"><label class="form-label">Gender</label>
              <select class="form-select" id="sp-input-student-gender"><option value="">Select...</option><option value="Male" ${student.gender === 'Male' ? 'selected' : ''}>Male</option><option value="Female" ${student.gender === 'Female' ? 'selected' : ''}>Female</option><option value="Other" ${student.gender === 'Other' ? 'selected' : ''}>Other</option></select>
            </div>
            <div class="form-group"><label class="form-label">Admission No.</label><input type="text" class="form-input" id="sp-input-student-admission" value="${eh(student.admission_no || '')}"></div>
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin:16px 0 8px;">Guardian Information</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label class="form-label">Parent/Guardian Name</label><input type="text" class="form-input" id="sp-input-student-parent" value="${eh(student.parent_name || '')}"></div>
            <div class="form-group"><label class="form-label">Parent Contact</label><input type="text" class="form-input" id="sp-input-student-parent-contact" value="${eh(student.parent_contact || '')}"></div>
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin:16px 0 8px;">School Details</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
            <div class="form-group"><label class="form-label">Class</label>
              <select class="form-select" id="sp-input-student-class"><option value="">Select...</option>${[...new Set((data.students || []).filter(s => s.school_id === student.school_id).map(s => s.class).filter(Boolean)), 'Class 11', 'Class 12'].map(c => `<option value="${c}" ${student.class === c ? 'selected' : ''}>${eh(c)}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label class="form-label">Section</label><input type="text" class="form-input" id="sp-input-student-section" value="${eh(student.section || '')}"></div>
            <div class="form-group"><label class="form-label">Academic Year</label>
              <select class="form-select" id="sp-input-student-academic-year"><option value="2025-2026" ${student.academic_year === '2025-2026' ? 'selected' : ''}>2025-2026</option><option value="2026-2027" ${student.academic_year === '2026-2027' ? 'selected' : ''}>2026-2027</option></select>
            </div>
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin:16px 0 8px;">Assignment</div>
          <div class="form-group"><label class="form-label">Assigned Counselor</label>
            <select class="form-select" id="sp-input-student-counselor"><option value="">None</option>${counselors.map(c => `<option value="${c.id}" ${c.id === student.counselor_id ? 'selected' : ''}>${eh(c.name)}</option>`).join('')}</select>
          </div>
          <div style="margin-top:8px;">
            <div style="display:flex;gap:20px;">
              <div style="flex:1;">
                <label class="form-label">Assigned Categories</label>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;max-height:100px;overflow-y:auto;">${cats.map(c => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-student-cat" value="${c.id}" ${(student.assigned_categories || []).includes(c.id) ? 'checked' : ''}> ${eh(c.name)}</label>`).join('')}</div>
              </div>
              <div style="flex:1;">
                <label class="form-label">Assigned Subjects</label>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;max-height:100px;overflow-y:auto;">${subjects.map(s => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-student-sub" value="${s.id}" ${(student.assigned_subjects || []).includes(s.id) ? 'checked' : ''}> ${eh(s.name)}</label>`).join('')}</div>
              </div>
            </div>
          </div>
          <div class="form-group" style="margin-top:12px;"><label class="form-label">Status</label>
            <select class="form-select" id="sp-input-student-status"><option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${student.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="suspended" ${student.status === 'suspended' ? 'selected' : ''}>Suspended</option></select>
          </div>
          <div class="form-group" style="margin-top:8px;"><label class="form-label">Notes</label><textarea class="form-input" id="sp-input-student-notes" style="height:50px;resize:vertical;">${eh(student.notes || '')}</textarea></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-student">Cancel</button>
          <button class="btn btn-primary" data-action="sp-update-student" data-id="${student.id}" id="sp-btn-save-student">Save Changes</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      setTimeout(() => document.getElementById('sp-input-student-name')?.focus(), 100);
    } catch (err) {
      AppToast.show(err.message || 'Failed to load student.', 'error');
    }
  },

  async openEdit(studentId) {
    try {
      const student = await window.StudentService?.getById(studentId);
      if (!student) return;
      const data = await AppStorage.load();
      const school = data.schools.find(s => s.id === student.school_id);
      const counselors = data.users.filter(u => u.schoolId === student.school_id && u.role === 'counselor');
      const existing = document.getElementById('modal-student');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-student';
      overlay.innerHTML = `<div class="modal">
        <div class="modal-header"><h3 class="modal-title">Edit Student</h3><button class="modal-close" data-close-modal="modal-student"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="sp-input-student-name" value="${eh(student.name)}"></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="sp-input-student-email" value="${eh(student.email || '')}"></div>
          <div class="form-group"><label class="form-label">Class</label><input type="text" class="form-input" id="sp-input-student-class" value="${eh(student.class || '')}"></div>
          <div class="form-group"><label class="form-label">Section</label><input type="text" class="form-input" id="sp-input-student-section" value="${eh(student.section || '')}"></div>
          <div class="form-group"><label class="form-label">Assign Counselor</label>
            <select class="form-select" id="sp-input-student-counselor"><option value="">None</option>${counselors.map(c => `<option value="${c.id}" ${c.id === student.counselor_id ? 'selected' : ''}>${eh(c.name)}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-select" id="sp-input-student-status"><option value="active" ${student.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${student.status === 'inactive' ? 'selected' : ''}>Inactive</option><option value="suspended" ${student.status === 'suspended' ? 'selected' : ''}>Suspended</option></select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-student">Cancel</button>
          <button class="btn btn-primary" data-action="sp-update-student" data-id="${student.id}" id="sp-btn-save-student">Save Changes</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      setTimeout(() => document.getElementById('sp-input-student-name')?.focus(), 100);
    } catch (err) {
      AppToast.show(err.message || 'Failed to load student.', 'error');
    }
  },

  async save(isUpdate, studentId) {
    const name = document.getElementById('sp-input-student-name')?.value?.trim();
    if (!name) { AppToast.show('Name is required.', 'error'); return; }
    const email = document.getElementById('sp-input-student-email')?.value?.trim() || null;
    const dob = document.getElementById('sp-input-student-dob')?.value || null;
    const gender = document.getElementById('sp-input-student-gender')?.value || null;
    const admissionNo = document.getElementById('sp-input-student-admission')?.value?.trim() || null;
    const parentName = document.getElementById('sp-input-student-parent')?.value?.trim() || null;
    const parentContact = document.getElementById('sp-input-student-parent-contact')?.value?.trim() || null;
    const studentClass = document.getElementById('sp-input-student-class')?.value || null;
    const section = document.getElementById('sp-input-student-section')?.value?.trim() || null;
    const academicYear = document.getElementById('sp-input-student-academic-year')?.value || null;
    const counselorId = document.getElementById('sp-input-student-counselor')?.value || null;
    const notes = document.getElementById('sp-input-student-notes')?.value?.trim() || null;
    const status = document.getElementById('sp-input-student-status')?.value || 'active';
    const assignedCategories = [...document.querySelectorAll('.sp-student-cat:checked')].map(el => el.value);
    const assignedSubjects = [...document.querySelectorAll('.sp-student-sub:checked')].map(el => el.value);
    const assignedCourses = [...document.querySelectorAll('.sp-student-course:checked')].map(el => el.value);
    const btn = document.getElementById('sp-btn-save-student');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Saving...'; }
    try {
      const schoolId = AppRouter.currentSchoolId;
      const updates = { name, email, dob, gender, admissionNo, parentName, parentContact, class: studentClass, section, academicYear, counselorId, notes, status, assignedCategories, assignedSubjects };
      if (isUpdate) {
        await window.StudentService?.update(studentId, updates);
        AppToast.show('Student updated.', 'success');
      } else {
        const student = await window.StudentService?.create({ ...updates, schoolId });
        if (student) {
          if (counselorId) {
            try { await window.NotificationService?.create('Student Created', `New student "${name}" has been assigned to you.`, counselorId); } catch (e) { /* best-effort */ }
          }
          if (assignedCourses.length > 0) {
            const profile = await AuthService.getProfile();
            for (const courseId of assignedCourses) {
              try { await window.EnrollmentService?.create(student.id, courseId, profile?.id || null); } catch (e) { console.error('Failed to enroll:', e); }
            }
            AppToast.show(`${assignedCourses.length} course(s) assigned.`, 'success');
          }
        }
        AppToast.show(`Student "${name}" created.`, 'success');
      }
      AppModal.close('modal-student');
      AppStorage.invalidate();
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to save student.', 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = isUpdate ? 'Save Changes' : 'Add Student'; }
  },

  async confirmDelete(studentId) {
    try {
      const student = await window.StudentService?.getById(studentId);
      const existing = document.getElementById('modal-confirm');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-confirm-student';
      overlay.innerHTML = `<div class="modal" style="max-width:400px;">
        <div class="modal-header"><h3 class="modal-title">Confirm Delete</h3><button class="modal-close" data-close-modal="modal-confirm-student"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body">
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fef2f2;border-radius:8px;margin-bottom:12px;">
            <span class="material-symbols-outlined" style="font-size:24px;color:#ef4444;">warning</span>
            <span style="font-size:13px;">Delete <strong>"${eh(student?.name || 'this student')}"</strong>? This will also remove all course enrollments.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-confirm-student">Cancel</button>
          <button class="btn btn-danger" data-action="sp-confirm-delete-student" data-id="${studentId}" style="background:#ef4444;color:#fff;border:none;">Delete Student</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch { AppToast.show('Failed to load student.', 'error'); }
  },

  async viewStudent(studentId) {
    try {
      const student = await window.StudentService?.getById(studentId);
      if (!student) return;
      const data = await AppStorage.load();
      const enrollments = (data.enrollments || []).filter(e => e.student_id === studentId);
      const courses = enrollments.map(e => (data.courses || []).find(c => c.id === e.course_id)).filter(Boolean);
      const counselor = (data.users || []).find(u => u.id === student.counselor_id);
      const a = window.STUDENT_ANALYTICS?.[studentId] || { score: student.progress || 50, rank: '—', streak: 0, lastLogin: '—', videosWatched: enrollments.length, coursesCompleted: enrollments.filter(e => e.status === 'completed').length };
      const activities = (data.activities || []).filter(act => act.student_id === studentId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
      const actIconMap = { course_completed: 'check_circle', video_watched: 'play_circle', attendance_marked: 'fact_check', assignment_submitted: 'assignment', course_assigned: 'playlist_add', certificate_earned: 'workspace_premium', counseling_session: 'support', progress_review: 'trending_up', course_recommendation: 'school' };

      const existing = document.getElementById('modal-student-profile');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-student-profile';
      overlay.innerHTML = `<div class="modal" style="max-width:680px;">
        <div class="modal-header"><h3 class="modal-title">Student Profile</h3><button class="modal-close" data-close-modal="modal-student-profile"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body" style="max-height:75vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border);">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#1e3a8a,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;flex-shrink:0;">${AppUtils.getInitials(student.name)}</div>
            <div style="flex:1;">
              <div style="font-size:18px;font-weight:700;">${eh(student.name)}</div>
              <div style="display:flex;gap:12px;margin-top:4px;font-size:12px;color:var(--text-secondary);flex-wrap:wrap;">
                <span>${eh(student.class || '—')} · ${eh(student.section || '—')}</span>
                <span>Roll: ${eh(student.roll_number || '—')}</span>
                <span>Admission: ${eh(student.admission_no || '—')}</span>
                <span class="status-badge ${student.status === 'active' ? 'status-active' : 'status-suspended'}">${eh(student.status)}</span>
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" style="height:32px;font-size:12px;" data-action="sp-edit-student" data-id="${student.id}"><span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit</button>
              <button class="btn btn-ghost btn-sm" style="height:32px;font-size:12px;" data-action="sp-download-profile" data-id="${studentId}"><span class="material-symbols-outlined" style="font-size:16px;">download</span></button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Personal Info</div>
              <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Date of Birth</span><span style="font-weight:500;">${student.dob ? AppUtils.formatDate(student.dob) : '—'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Parent Name</span><span style="font-weight:500;">${eh(student.parent_name || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Parent Contact</span><span style="font-weight:500;">${eh(student.parent_contact || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Academic Year</span><span style="font-weight:500;">${eh(student.academic_year || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Email</span><span style="font-weight:500;">${eh(student.email || '—')}</span></div>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Performance</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="padding:10px;background:#f0fdf4;border-radius:8px;text-align:center;">
                  <div style="font-size:18px;font-weight:700;color:#10b981;">${eh(student.attendance || '—')}%</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Attendance</div>
                </div>
                <div style="padding:10px;background:#eff6ff;border-radius:8px;text-align:center;">
                  <div style="font-size:18px;font-weight:700;color:#3b82f6;">${eh(a.score)}</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Learning Score</div>
                </div>
                <div style="padding:10px;background:#f5f3ff;border-radius:8px;text-align:center;">
                  <div style="font-size:18px;font-weight:700;color:#8b5cf6;">#${eh(a.rank)}</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Rank</div>
                </div>
                <div style="padding:10px;background:#fffbeb;border-radius:8px;text-align:center;">
                  <div style="font-size:18px;font-weight:700;color:#f59e0b;">${eh(a.streak)}d</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Streak</div>
                </div>
              </div>
              <div style="margin-top:10px;">
                <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px;">Progress</div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;">
                    <div style="width:${Number(student.progress) || 0}%;height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:4px;"></div>
                  </div>
                  <span style="font-size:13px;font-weight:700;">${eh(student.progress || 0)}%</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Last login: ${eh(a.lastLogin)}</div>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Assigned Counselor</div>
              <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--card-bg);border:1px solid var(--border);border-radius:8px;">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--primary)12;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;color:var(--primary);">${AppUtils.getInitials(counselor?.name || '—')}</div>
                <div><div style="font-size:13px;font-weight:500;">${eh(counselor?.name || 'Not assigned')}</div><div style="font-size:11px;color:var(--text-secondary);">${eh(counselor?.email || '')}</div></div>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Activity Summary</div>
              <div style="display:flex;flex-direction:column;gap:4px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Videos Watched</span><span style="font-weight:600;">${eh(a.videosWatched)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Courses Completed</span><span style="font-weight:600;">${eh(a.coursesCompleted)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Enrolled Courses</span><span style="font-weight:600;">${enrollments.length}</span></div>
              </div>
            </div>
          </div>

          ${student.notes ? `<div style="margin-bottom:16px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;display:flex;align-items:flex-start;gap:8px;">
            <span class="material-symbols-outlined" style="font-size:18px;color:#f59e0b;flex-shrink:0;">edit_note</span>
            <div><div style="font-size:12px;font-weight:600;color:#92400e;">Notes</div><div style="font-size:12px;color:#78350f;margin-top:2px;">${eh(student.notes)}</div></div>
          </div>` : ''}

          <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Enrolled Courses</div>
            ${courses.length === 0 ? '<div style="font-size:13px;color:var(--text-secondary);">No courses enrolled.</div>'
            : `<div style="display:flex;flex-direction:column;gap:6px;">${courses.map(c => {
              const enr = enrollments.find(e => e.course_id === c.id);
              return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--border-light);border-radius:6px;">
                <span style="font-size:13px;font-weight:500;">${eh(c.name)}</span>
                <span class="status-badge ${enr?.status === 'active' ? 'status-active' : enr?.status === 'completed' ? 'status-active' : 'status-suspended'}" style="font-size:10px;">${eh(enr?.status || '—')}</span>
              </div>`;
            }).join('')}</div>`}
          </div>

          ${activities.length > 0 ? `<div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Recent Activity</div>
            <div style="display:flex;flex-direction:column;gap:0;">${activities.map(act => `
              <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-light);">
                <span class="material-symbols-outlined" style="font-size:16px;color:var(--primary);flex-shrink:0;">${actIconMap[act.action] || 'circle'}</span>
                <div style="flex:1;font-size:12px;">${eh(act.description)}</div>
                <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;">${AppUtils.timeAgo(act.timestamp)}</div>
              </div>`).join('')}</div>
          </div>` : ''}

          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Certificates & Achievements</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${activities.filter(a => a.action === 'certificate_earned').length > 0
                ? activities.filter(a => a.action === 'certificate_earned').map(a => `
                  <div style="padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;display:flex;align-items:center;gap:6px;font-size:12px;">
                    <span class="material-symbols-outlined" style="font-size:16px;color:#10b981;">workspace_premium</span> ${eh(a.description.replace('Earned certificate for ', ''))}
                  </div>`).join('')
                : `<div style="padding:8px 12px;border:1px dashed var(--border);border-radius:8px;display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);">
                    <span class="material-symbols-outlined" style="font-size:16px;">workspace_premium</span> No certificates yet
                  </div>`
              }
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-student-profile">Close</button>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;" data-action="sp-export-csv" data-entity="student-profile" data-id="${studentId}"><span class="material-symbols-outlined" style="font-size:16px;">download</span> Download Profile</button>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;" data-action="sp-print-profile" data-id="${studentId}"><span class="material-symbols-outlined" style="font-size:16px;">print</span> Print</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch (err) {
      AppToast.show(err.message || 'Failed to load student.', 'error');
    }
  },

  async filter() {
    this.currentPage = 1;
    AppRouter.render();
  }
};

// ==============================================================
// COUNSELORS MANAGEMENT
// ==============================================================
window.SchoolCounselors = {
  currentPage: 1,
  perPage: 20,

  async render(main, data, school) {
    const schoolId = school.id;
    const q = (document.getElementById('sp-counselor-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('sp-counselor-status')?.value || '';
    const deptFilter = document.getElementById('sp-counselor-dept')?.value || '';

    let counselors = (data.counselors || []).filter(c => c.school_id === schoolId);
    if (q) counselors = counselors.filter(c => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.employee_id || '').toLowerCase().includes(q));
    if (statusFilter) counselors = counselors.filter(c => c.status === statusFilter);
    if (deptFilter) counselors = counselors.filter(c => c.department === deptFilter);

    let students = [];
    try { students = await window.StudentService?.getBySchool(schoolId) || []; } catch (e) { console.error('Failed in school-portal:', e); }

    const startIdx = (this.currentPage - 1) * this.perPage;
    const pageItems = counselors.slice(startIdx, startIdx + this.perPage);
    const totalPages = Math.max(1, Math.ceil(counselors.length / this.perPage));
    const departments = [...new Set((data.counselors || []).filter(c => c.school_id === schoolId).map(c => c.department).filter(Boolean))];

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">Counselors</h1><p class="page-subtitle">Manage counselors for ${eh(school.name)}.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary" data-action="sp-add-counselor"><span class="material-symbols-outlined" style="font-size:18px;">person_add</span> Add Counselor</button>
        </div>
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <div class="search-bar" style="max-width:250px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="sp-counselor-search" placeholder="Search counselors..." value="${eh(q)}"></div>
        <select class="form-select" id="sp-counselor-status" style="width:140px;height:40px;font-size:13px;">
          <option value="">All Status</option>
          <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
          <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
        <select class="form-select" id="sp-counselor-dept" style="width:180px;height:40px;font-size:13px;">
          <option value="">All Departments</option>
          ${departments.map(d => `<option value="${d}" ${deptFilter === d ? 'selected' : ''}>${eh(d)}</option>`).join('')}
        </select>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">Showing ${pageItems.length} of ${counselors.length} counselors</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${counselors.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">badge</span><h3>No counselors match your search</h3><p>Try adjusting your filters or add a new counselor.</p></div>`
        : `<div class="table-container"><table><thead><tr><th>Name</th><th>Employee ID</th><th>Department</th><th>Students</th><th>Qualification</th><th>Experience</th><th>Status</th><th style="width:140px;"></th></tr></thead><tbody>
          ${pageItems.map(c => {
            const studentCount = students.filter(s => s.counselor_id === c.id).length;
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:8px;"><div class="user-avatar" style="width:28px;height:28px;font-size:10px;">${AppUtils.getInitials(c.name)}</div><span class="font-semibold">${eh(c.name)}</span></div></td>
              <td style="font-size:13px;">${eh(c.employee_id || '—')}</td>
              <td style="font-size:13px;">${eh(c.department || '—')}</td>
              <td style="font-size:13px;">${studentCount}</td>
              <td style="font-size:13px;">${eh(c.qualification || '—')}</td>
              <td style="font-size:13px;">${c.experience != null ? c.experience + ' yrs' : '—'}</td>
              <td><span class="status-badge ${c.status === 'active' ? 'status-active' : 'status-suspended'}">${eh(c.status)}</span></td>
              <td class="td-actions" style="display:flex;gap:4px;padding-top:8px;">
                <button class="btn btn-ghost btn-sm" data-action="sp-view-counselor" data-id="${c.id}" title="View Profile"><span class="material-symbols-outlined" style="font-size:16px;">person</span></button>
                <button class="btn btn-ghost btn-sm" data-action="sp-edit-counselor" data-id="${c.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                <button class="btn btn-ghost btn-sm" data-action="sp-toggle-counselor-status" data-id="${c.id}" title="${c.status === 'active' ? 'Deactivate' : 'Activate'}"><span class="material-symbols-outlined" style="font-size:16px;">${c.status === 'active' ? 'toggle_off' : 'toggle_on'}</span></button>
                <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="sp-delete-counselor" data-id="${c.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody></table></div>`}
      </div>
      ${totalPages > 1 ? pagination(totalPages, this.currentPage, 'sp-counselor-page') : ''}
    </div>`;
    initIcons();
  },

  async openAdd(schoolId) {
    const data = await AppStorage.load();
    const cats = (data.categories || []).filter(c => c.school_id === schoolId);
    const subjects = (data.subjects || []).filter(s => s.school_id === schoolId);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-counselor';
    overlay.innerHTML = `<div class="modal" style="max-width:600px;">
      <div class="modal-header"><h3 class="modal-title">Add Counselor</h3><button class="modal-close" data-close-modal="modal-counselor"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="sp-input-counselor-name" placeholder="Enter full name"></div>
          <div class="form-group"><label class="form-label">Employee ID</label><input type="text" class="form-input" id="sp-input-counselor-empid" placeholder="e.g. EMP-004"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="sp-input-counselor-email" placeholder="counselor@school.com"></div>
          <div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" id="sp-input-counselor-phone" placeholder="+91-98765-43210"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div class="form-group"><label class="form-label">Gender</label>
            <select class="form-select" id="sp-input-counselor-gender"><option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select>
          </div>
          <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" class="form-input" id="sp-input-counselor-dob"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div class="form-group"><label class="form-label">Qualification</label><input type="text" class="form-input" id="sp-input-counselor-qual" placeholder="e.g. M.A. Psychology"></div>
          <div class="form-group"><label class="form-label">Experience (years)</label><input type="number" class="form-input" id="sp-input-counselor-exp" placeholder="e.g. 5" min="0" style="width:100px;"></div>
        </div>
        <div class="form-group" style="margin-top:12px;"><label class="form-label">Department</label>
          <select class="form-select" id="sp-input-counselor-dept"><option value="">Select...</option><option value="Career Counseling">Career Counseling</option><option value="Academic Guidance">Academic Guidance</option><option value="Student Wellness">Student Wellness</option><option value="College Prep">College Prep</option></select>
        </div>
        <div style="margin-top:12px;">
          <label class="form-label">Assigned Categories</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${cats.map(c => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-counselor-cat" value="${c.id}"> ${eh(c.name)}</label>`).join('')}</div>
        </div>
        <div style="margin-top:12px;">
          <label class="form-label">Assigned Subjects</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${subjects.map(s => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-counselor-sub" value="${s.id}"> ${eh(s.name)}</label>`).join('')}</div>
        </div>
        <div class="form-group" style="margin-top:12px;"><label class="form-label">Status</label>
          <select class="form-select" id="sp-input-counselor-status"><option value="active" selected>Active</option><option value="inactive">Inactive</option></select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-counselor">Cancel</button>
        <button class="btn btn-primary" data-action="sp-save-counselor" id="sp-btn-save-counselor">Add Counselor</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    setTimeout(() => document.getElementById('sp-input-counselor-name')?.focus(), 100);
  },

  async openEdit(counselorId) {
    try {
      const data = await AppStorage.load();
      const counselor = (data.counselors || []).find(c => c.id === counselorId);
      if (!counselor) { AppToast.show('Counselor not found.', 'error'); return; }
      const schoolId = counselor.school_id;
      const cats = (data.categories || []).filter(c => c.school_id === schoolId);
      const subjects = (data.subjects || []).filter(s => s.school_id === schoolId);
      const assignedCats = counselor.assigned_categories || [];
      const assignedSubs = counselor.assigned_subjects || [];
      const existing = document.getElementById('modal-counselor');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-counselor';
      overlay.innerHTML = `<div class="modal" style="max-width:600px;">
        <div class="modal-header"><h3 class="modal-title">Edit Counselor</h3><button class="modal-close" data-close-modal="modal-counselor"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="sp-input-counselor-name" value="${eh(counselor.name)}"></div>
            <div class="form-group"><label class="form-label">Employee ID</label><input type="text" class="form-input" id="sp-input-counselor-empid" value="${eh(counselor.employee_id || '')}"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="sp-input-counselor-email" value="${eh(counselor.email || '')}"></div>
            <div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" id="sp-input-counselor-phone" value="${eh(counselor.phone || '')}"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="form-group"><label class="form-label">Gender</label>
              <select class="form-select" id="sp-input-counselor-gender"><option value="">Select...</option><option value="Male" ${counselor.gender === 'Male' ? 'selected' : ''}>Male</option><option value="Female" ${counselor.gender === 'Female' ? 'selected' : ''}>Female</option><option value="Other" ${counselor.gender === 'Other' ? 'selected' : ''}>Other</option></select>
            </div>
            <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" class="form-input" id="sp-input-counselor-dob" value="${eh(counselor.date_of_birth || '')}"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="form-group"><label class="form-label">Qualification</label><input type="text" class="form-input" id="sp-input-counselor-qual" value="${eh(counselor.qualification || '')}"></div>
            <div class="form-group"><label class="form-label">Experience (years)</label><input type="number" class="form-input" id="sp-input-counselor-exp" value="${counselor.experience || 0}" min="0" style="width:100px;"></div>
          </div>
          <div class="form-group" style="margin-top:12px;"><label class="form-label">Department</label>
            <select class="form-select" id="sp-input-counselor-dept"><option value="">Select...</option><option value="Career Counseling" ${counselor.department === 'Career Counseling' ? 'selected' : ''}>Career Counseling</option><option value="Academic Guidance" ${counselor.department === 'Academic Guidance' ? 'selected' : ''}>Academic Guidance</option><option value="Student Wellness" ${counselor.department === 'Student Wellness' ? 'selected' : ''}>Student Wellness</option><option value="College Prep" ${counselor.department === 'College Prep' ? 'selected' : ''}>College Prep</option></select>
          </div>
          <div style="margin-top:12px;">
            <label class="form-label">Assigned Categories</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${cats.map(c => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-counselor-cat" value="${c.id}" ${assignedCats.includes(c.id) ? 'checked' : ''}> ${eh(c.name)}</label>`).join('')}</div>
          </div>
          <div style="margin-top:12px;">
            <label class="form-label">Assigned Subjects</label>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">${subjects.map(s => `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;"><input type="checkbox" class="sp-counselor-sub" value="${s.id}" ${assignedSubs.includes(s.id) ? 'checked' : ''}> ${eh(s.name)}</label>`).join('')}</div>
          </div>
          <div class="form-group" style="margin-top:12px;"><label class="form-label">Status</label>
            <select class="form-select" id="sp-input-counselor-status"><option value="active" ${counselor.status === 'active' ? 'selected' : ''}>Active</option><option value="inactive" ${counselor.status === 'inactive' ? 'selected' : ''}>Inactive</option></select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-counselor">Cancel</button>
          <button class="btn btn-primary" data-action="sp-update-counselor" data-id="${counselor.id}" id="sp-btn-save-counselor">Save Changes</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      setTimeout(() => document.getElementById('sp-input-counselor-name')?.focus(), 100);
    } catch (err) {
      AppToast.show(err.message || 'Failed to load counselor.', 'error');
    }
  },

  async save(isUpdate, counselorId) {
    const name = document.getElementById('sp-input-counselor-name')?.value?.trim();
    if (!name) { AppToast.show('Name is required.', 'error'); return; }
    const email = document.getElementById('sp-input-counselor-email')?.value?.trim() || null;
    const employeeId = document.getElementById('sp-input-counselor-empid')?.value?.trim() || null;
    const phone = document.getElementById('sp-input-counselor-phone')?.value?.trim() || null;
    const gender = document.getElementById('sp-input-counselor-gender')?.value || null;
    const dateOfBirth = document.getElementById('sp-input-counselor-dob')?.value || null;
    const qualification = document.getElementById('sp-input-counselor-qual')?.value?.trim() || null;
    const experience = parseInt(document.getElementById('sp-input-counselor-exp')?.value) || 0;
    const department = document.getElementById('sp-input-counselor-dept')?.value || null;
    const status = document.getElementById('sp-input-counselor-status')?.value || 'active';
    const assignedCategories = [...document.querySelectorAll('.sp-counselor-cat:checked')].map(el => el.value);
    const assignedSubjects = [...document.querySelectorAll('.sp-counselor-sub:checked')].map(el => el.value);
    const btn = document.getElementById('sp-btn-save-counselor');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Saving...'; }
    try {
      const schoolId = AppRouter.currentSchoolId;
      const updates = { name, email, employeeId, phone, gender, dateOfBirth, qualification, experience, department, status, assignedCategories, assignedSubjects };
      if (isUpdate) {
        await window.CounselorService?.update(counselorId, updates);
        AppToast.show('Counselor updated.', 'success');
      } else {
        await window.CounselorService?.create({ ...updates, schoolId });
        AppToast.show('Counselor created.', 'success');
      }
      AppModal.close('modal-counselor');
      AppStorage.invalidate();
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to save counselor.', 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = isUpdate ? 'Save Changes' : 'Add Counselor'; }
  },

  async toggleStatus(counselorId) {
    try {
      const counselor = (await AppStorage.load()).counselors?.find(c => c.id === counselorId);
      if (!counselor) { AppToast.show('Counselor not found.', 'error'); return; }
      const newStatus = counselor.status === 'active' ? 'inactive' : 'active';
      await window.CounselorService?.update(counselorId, { status: newStatus });
      AppToast.show(`Counselor ${newStatus === 'active' ? 'activated' : 'deactivated'}.`, 'success');
      AppStorage.invalidate();
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to toggle status.', 'error');
    }
  },

  async confirmDelete(counselorId) {
    try {
      const data = await AppStorage.load();
      const counselor = (data.counselors || []).find(c => c.id === counselorId);
      const existing = document.getElementById('modal-confirm');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-confirm-counselor';
      overlay.innerHTML = `<div class="modal" style="max-width:400px;">
        <div class="modal-header"><h3 class="modal-title">Confirm Delete</h3><button class="modal-close" data-close-modal="modal-confirm-counselor"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body">
          <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fef2f2;border-radius:8px;margin-bottom:12px;">
            <span class="material-symbols-outlined" style="font-size:24px;color:#ef4444;">warning</span>
            <span style="font-size:13px;">Delete <strong>"${eh(counselor?.name || 'this counselor')}"</strong>? Students assigned to them will become unassigned.</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-confirm-counselor">Cancel</button>
          <button class="btn btn-danger" data-action="sp-confirm-delete-counselor" data-id="${counselorId}" style="background:#ef4444;color:#fff;border:none;">Delete Counselor</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch { AppToast.show('Failed to load counselor.', 'error'); }
  },

  async viewCounselor(counselorId) {
    try {
      const data = await AppStorage.load();
      const counselor = (data.counselors || []).find(c => c.id === counselorId);
      if (!counselor) { AppToast.show('Counselor not found.', 'error'); return; }
      const school = (data.schools || []).find(s => s.id === counselor.school_id);
      const students = (data.students || []).filter(s => s.counselor_id === counselorId);
      const enrollments = (data.enrollments || []).filter(e => students.some(s => s.id === e.student_id));
      const completedEnrollments = enrollments.filter(e => e.status === 'completed');
      const completionRate = enrollments.length ? Math.round(completedEnrollments.length / enrollments.length * 100) : 0;
      const assignedCats = (counselor.assigned_categories || []).map(id => { const c = (data.categories || []).find(cat => cat.id === id); return c ? c.name : id; });
      const assignedSubs = (counselor.assigned_subjects || []).map(id => { const s = (data.subjects || []).find(sub => sub.id === id); return s ? s.name : id; });

      const existing = document.getElementById('modal-counselor-profile');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-counselor-profile';
      overlay.innerHTML = `<div class="modal" style="max-width:680px;">
        <div class="modal-header"><h3 class="modal-title">Counselor Profile</h3><button class="modal-close" data-close-modal="modal-counselor-profile"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body" style="max-height:75vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border);">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;flex-shrink:0;">${AppUtils.getInitials(counselor.name)}</div>
            <div style="flex:1;">
              <div style="font-size:18px;font-weight:700;">${eh(counselor.name)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${eh(counselor.email || '—')} · ${eh(counselor.employee_id || '')} · ${eh(school?.name || '')}</div>
              <div style="margin-top:4px;"><span class="status-badge ${counselor.status === 'active' ? 'status-active' : 'status-suspended'}">${eh(counselor.status)}</span></div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-secondary btn-sm" style="height:32px;font-size:12px;" data-action="sp-edit-counselor" data-id="${counselor.id}"><span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit</button>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:20px;">
            <div style="padding:12px;background:#f0fdf4;border-radius:8px;text-align:center;">
              <div style="font-size:20px;font-weight:700;color:#10b981;">${students.length}</div>
              <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Students</div>
            </div>
            <div style="padding:12px;background:#eff6ff;border-radius:8px;text-align:center;">
              <div style="font-size:20px;font-weight:700;color:#3b82f6;">${completionRate}%</div>
              <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Completion</div>
            </div>
            <div style="padding:12px;background:#f5f3ff;border-radius:8px;text-align:center;">
              <div style="font-size:20px;font-weight:700;color:#8b5cf6;">${students.filter(s => s.status === 'active').length}</div>
              <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Active</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Personal Info</div>
              <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Department</span><span style="font-weight:500;">${eh(counselor.department || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Qualification</span><span style="font-weight:500;">${eh(counselor.qualification || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Experience</span><span style="font-weight:500;">${counselor.experience != null ? counselor.experience + ' years' : '—'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Gender</span><span style="font-weight:500;">${eh(counselor.gender || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>DOB</span><span style="font-weight:500;">${counselor.date_of_birth ? AppUtils.formatDate(counselor.date_of_birth) : '—'}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Phone</span><span style="font-weight:500;">${eh(counselor.phone || '—')}</span></div>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Enrollment Stats</div>
              <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Total Enrollments</span><span style="font-weight:600;">${enrollments.length}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Completed</span><span style="font-weight:600;">${completedEnrollments.length}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Active</span><span style="font-weight:600;">${enrollments.filter(e => e.status === 'active').length}</span></div>
              </div>
              ${assignedCats.length > 0 ? `<div style="margin-top:12px;"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px;">Categories</div><div style="display:flex;gap:4px;flex-wrap:wrap;">${assignedCats.map(n => `<span style="padding:2px 8px;background:var(--primary)12;color:var(--primary);border-radius:8px;font-size:11px;">${eh(n)}</span>`).join('')}</div></div>` : ''}
              ${assignedSubs.length > 0 ? `<div style="margin-top:8px;"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px;">Subjects</div><div style="display:flex;gap:4px;flex-wrap:wrap;">${assignedSubs.map(n => `<span style="padding:2px 8px;background:#f0fdf4;color:#16a34a;border-radius:8px;font-size:11px;">${eh(n)}</span>`).join('')}</div></div>` : ''}
            </div>
          </div>

          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Assigned Students</div>
            ${students.length === 0 ? '<div style="font-size:13px;color:var(--text-secondary);">No students assigned.</div>'
            : `<div style="display:flex;flex-direction:column;gap:4px;">${students.slice(0, 8).map(s => {
              const enr = enrollments.filter(e => e.student_id === s.id);
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:13px;">
                <div style="width:26px;height:26px;border-radius:50%;background:var(--primary)12;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--primary);">${AppUtils.getInitials(s.name)}</div>
                <span>${eh(s.name)}</span>
                <span style="font-size:11px;color:var(--text-muted);">${eh(s.class || '')}</span>
                <span style="margin-left:auto;font-size:11px;">${enr.length} course${enr.length !== 1 ? 's' : ''}</span>
              </div>`;
            }).join('')}</div>`}
            ${students.length > 8 ? `<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px;">+${students.length - 8} more students</div>` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-counselor-profile">Close</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch (err) {
      AppToast.show(err.message || 'Failed to load counselor profile.', 'error');
    }
  },

  filter() {
    this.currentPage = 1;
    AppRouter.render();
  }
};

// ==============================================================
// COURSES MANAGEMENT
// ==============================================================
window.SchoolCourses = {
  currentPage: 1,
  perPage: 20,

  async render(main, data, school) {
    const schoolId = school.id;
    const q = (document.getElementById('sp-course-search')?.value || '').toLowerCase();
    let courses = [];
    try { courses = await window.CourseService?.getBySchool(schoolId) || []; } catch { courses = []; }

    if (q) courses = courses.filter(c => c.name.toLowerCase().includes(q));
    const startIdx = (this.currentPage - 1) * this.perPage;
    const pageItems = courses.slice(startIdx, startIdx + this.perPage);
    const totalPages = Math.max(1, Math.ceil(courses.length / this.perPage));

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">Courses</h1><p class="page-subtitle">Create and manage courses for ${eh(school.name)}.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm" style="height:34px;font-size:11px;" data-action="sp-export-csv" data-entity="courses"><span class="material-symbols-outlined" style="font-size:14px;">download</span> Export</button>
          <button class="btn btn-primary" data-action="sp-add-course"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Course</button>
        </div>
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <div class="search-bar" style="max-width:280px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="sp-course-search" placeholder="Search courses..."></div>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">Showing ${pageItems.length} of ${courses.length} courses</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${courses.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">school</span><h3>No courses match your search</h3><p>Create your first course or try a different search.</p></div>`
        : `<div class="table-container"><table><thead><tr><th>Name</th><th>Difficulty</th><th>Status</th><th>Sections</th><th>Students</th><th>Created</th><th style="width:140px;"></th></tr></thead><tbody>
          ${pageItems.map(c => {
            const sections = data.courseSections?.filter(cs => cs.course_id === c.id) || [];
            const enrollments = data.enrollments?.filter(e => e.course_id === c.id) || [];
            return `<tr>
              <td><span class="font-semibold">${eh(c.name)}</span></td>
              <td><span style="font-size:11px;padding:2px 6px;border-radius:4px;background:${c.difficulty === 'beginner' ? '#f0fdf4' : c.difficulty === 'advanced' ? '#fef2f2' : '#fffbeb'};color:${c.difficulty === 'beginner' ? '#16a34a' : c.difficulty === 'advanced' ? '#dc2626' : '#d97706'};">${eh(c.difficulty || 'intermediate')}</span></td>
              <td><span class="status-badge ${c.publish_status === 'published' ? 'status-active' : c.publish_status === 'archived' ? 'status-suspended' : 'status-pending'}">${eh(c.publish_status || 'draft')}</span></td>
              <td style="font-size:13px;">${sections.length}</td>
              <td style="font-size:13px;">${enrollments.length}</td>
              <td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(c.created_at)}</td>
              <td class="td-actions" style="display:flex;gap:4px;padding-top:8px;">
                <button class="btn btn-ghost btn-sm" data-action="sp-view-course" data-id="${c.id}" title="View"><span class="material-symbols-outlined" style="font-size:16px;">visibility</span></button>
                <button class="btn btn-ghost btn-sm" data-action="sp-edit-course" data-id="${c.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
                <button class="btn btn-ghost btn-sm" data-action="sp-manage-course" data-id="${c.id}" title="Manage"><span class="material-symbols-outlined" style="font-size:16px;">settings</span></button>
                <button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="sp-delete-course" data-id="${c.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
              </td>
            </tr>`;
          }).join('')}
        </tbody></table></div>`}
      </div>
      ${totalPages > 1 ? pagination(totalPages, this.currentPage, 'sp-course-page') : ''}
    </div>`;
    initIcons();
  },

  async viewCourse(courseId) {
    try {
      const data = await AppStorage.load();
      const course = (await window.CourseService?.getById(courseId).catch(() => null));
      if (!course) { AppToast.show('Course not found.', 'error'); return; }
      const school = data.schools.find(s => s.id === course.school_id);
      const sections = data.courseSections?.filter(cs => cs.course_id === courseId) || [];
      const enrollments = data.enrollments?.filter(e => e.course_id === courseId) || [];
      const students = data.students?.filter(s => enrollments.some(e => e.student_id === s.id)) || [];
      const completedCount = enrollments.filter(e => e.status === 'completed').length;
      const completionRate = enrollments.length ? Math.round(completedCount / enrollments.length * 100) : 0;
      const category = data.categories?.find(c => c.id === course.category_id);
      const subject = data.subjects?.find(s => s.id === course.subject_id);
      const content = data.content?.filter(c => c.subject_id === course.subject_id) || [];
      const sectionDetails = sections.map(cs => data.sections?.find(s => s.id === cs.section_id)).filter(Boolean);

      const existing = document.getElementById('modal-course-detail');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-course-detail';
      overlay.innerHTML = `<div class="modal" style="max-width:640px;">
        <div class="modal-header"><h3 class="modal-title">Course Details</h3><button class="modal-close" data-close-modal="modal-course-detail"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border);">
            <div style="width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;flex-shrink:0;">${AppUtils.getInitials(course.name)}</div>
            <div style="flex:1;">
              <div style="font-size:18px;font-weight:700;">${eh(course.name)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${eh(school?.name || '—')} · ${eh(course.status || 'active')}</div>
            </div>
            <button class="btn btn-secondary btn-sm" style="height:32px;font-size:12px;" data-action="sp-edit-course" data-id="${course.id}"><span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit</button>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Course Info</div>
              <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Category</span><span style="font-weight:500;">${eh(category?.name || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Subject</span><span style="font-weight:500;">${eh(subject?.name || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Instructor</span><span style="font-weight:500;">${eh(course.instructor || school?.principal_name || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Difficulty</span><span style="font-weight:500;">${eh(course.difficulty || 'Intermediate')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Duration</span><span style="font-weight:500;">${eh(course.duration || '8 weeks')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Status</span><span class="status-badge ${course.status === 'active' ? 'status-active' : 'status-suspended'}" style="font-size:10px;">${eh(course.status || 'active')}</span></div>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Enrollment Stats</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="padding:12px;background:#eff6ff;border-radius:8px;text-align:center;">
                  <div style="font-size:20px;font-weight:700;color:#3b82f6;">${enrollments.length}</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Enrolled</div>
                </div>
                <div style="padding:12px;background:#f0fdf4;border-radius:8px;text-align:center;">
                  <div style="font-size:20px;font-weight:700;color:#10b981;">${completedCount}</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Completed</div>
                </div>
                <div style="padding:12px;background:#f5f3ff;border-radius:8px;text-align:center;">
                  <div style="font-size:20px;font-weight:700;color:#8b5cf6;">${content.length}</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Videos</div>
                </div>
                <div style="padding:12px;background:#fffbeb;border-radius:8px;text-align:center;">
                  <div style="font-size:20px;font-weight:700;color:#f59e0b;">${completionRate}%</div>
                  <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Rate</div>
                </div>
              </div>
            </div>
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Description</div>
            <div style="font-size:13px;color:var(--text-primary);line-height:1.6;">${eh(course.description || 'No description available.')}</div>
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Sections (${sectionDetails.length})</div>
            ${sectionDetails.length === 0 ? '<div style="font-size:13px;color:var(--text-secondary);">No sections assigned.</div>'
            : `<div style="display:flex;flex-wrap:wrap;gap:6px;">${sectionDetails.map(s => `
              <span style="padding:4px 10px;background:var(--primary)12;color:var(--primary);border-radius:6px;font-size:11px;font-weight:500;">${eh(s.name)}</span>
            `).join('')}</div>`}
          </div>

          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Enrolled Students (${students.length})</div>
            ${students.length === 0 ? '<div style="font-size:13px;color:var(--text-secondary);">No students enrolled.</div>'
            : `<div style="display:flex;flex-direction:column;gap:4px;">${students.slice(0, 8).map(s => {
              const enr = enrollments.find(e => e.student_id === s.id);
              return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border-light);font-size:13px;">
                <div style="width:26px;height:26px;border-radius:50%;background:var(--primary)12;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:var(--primary);">${AppUtils.getInitials(s.name)}</div>
                <span>${eh(s.name)}</span>
                <span style="margin-left:auto;font-size:11px;" class="status-badge ${enr?.status === 'active' ? 'status-active' : 'status-suspended'}">${eh(enr?.status || '—')}</span>
              </div>`;
            }).join('')}</div>`}
            ${students.length > 8 ? `<div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:6px;">+${students.length - 8} more students</div>` : ''}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-course-detail">Close</button>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;" data-action="sp-manage-structure" data-id="${courseId}"><span class="material-symbols-outlined" style="font-size:16px;">layers</span> Manage Structure</button>
          <button class="btn btn-ghost btn-sm" style="font-size:11px;" data-action="sp-export-csv" data-entity="course" data-id="${courseId}"><span class="material-symbols-outlined" style="font-size:16px;">download</span> Export</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch (err) { AppToast.show(err.message || 'Failed to load course.', 'error'); }
  },

  async openAdd(schoolId) {
    const data = await AppStorage.load();
    const cats = data.categories.filter(c => c.school_id === schoolId);
    const subjects = data.subjects.filter(s => s.school_id === schoolId);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-course';
    overlay.innerHTML = `<div class="modal" style="max-width:560px;">
      <div class="modal-header"><h3 class="modal-title">Add Course</h3><button class="modal-close" data-close-modal="modal-course"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Course Name</label><input type="text" class="form-input" id="sp-input-course-name" placeholder="e.g. Mathematics 101"></div>
        <div class="form-group" style="margin-top:12px;"><label class="form-label">Description</label><textarea class="form-input" id="sp-input-course-desc" placeholder="Course description..." style="height:60px;resize:vertical;"></textarea></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
          <div class="form-group"><label class="form-label">Category</label>
            <select class="form-select" id="sp-input-course-category"><option value="">Choose...</option>${cats.map(c => `<option value="${c.id}">${eh(c.name)}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Subject</label>
            <select class="form-select" id="sp-input-course-subject"><option value="">Choose...</option>${subjects.map(s => `<option value="${s.id}">${eh(s.name)}</option>`).join('')}</select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;">
          <div class="form-group"><label class="form-label">Difficulty</label>
            <select class="form-select" id="sp-input-course-difficulty"><option value="beginner">Beginner</option><option value="intermediate" selected>Intermediate</option><option value="advanced">Advanced</option></select>
          </div>
          <div class="form-group"><label class="form-label">Duration</label><input type="text" class="form-input" id="sp-input-course-duration" placeholder="e.g. 4 weeks"></div>
          <div class="form-group"><label class="form-label">Status</label>
            <select class="form-select" id="sp-input-course-publish"><option value="draft">Draft</option><option value="published" selected>Published</option></select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-course">Cancel</button>
        <button class="btn btn-primary" data-action="sp-save-course" id="sp-btn-save-course">Add Course</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    setTimeout(() => document.getElementById('sp-input-course-name')?.focus(), 100);
  },

  async openEdit(courseId) {
    try {
      const course = await window.CourseService?.getById(courseId);
      if (!course) return;
      const data = await AppStorage.load();
      const schoolId = course.school_id;
      const cats = data.categories.filter(c => c.school_id === schoolId);
      const subjects = data.subjects.filter(s => s.school_id === schoolId);
      const existing = document.getElementById('modal-course');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-course';
      overlay.innerHTML = `<div class="modal" style="max-width:560px;">
        <div class="modal-header"><h3 class="modal-title">Edit Course</h3><button class="modal-close" data-close-modal="modal-course"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">Course Name</label><input type="text" class="form-input" id="sp-input-course-name" value="${eh(course.name)}"></div>
          <div class="form-group" style="margin-top:12px;"><label class="form-label">Description</label><textarea class="form-input" id="sp-input-course-desc" style="height:60px;resize:vertical;">${eh(course.description || '')}</textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="form-group"><label class="form-label">Category</label>
              <select class="form-select" id="sp-input-course-category"><option value="">Choose...</option>${cats.map(c => `<option value="${c.id}" ${c.id === course.category_id ? 'selected' : ''}>${eh(c.name)}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label class="form-label">Subject</label>
              <select class="form-select" id="sp-input-course-subject"><option value="">Choose...</option>${subjects.map(s => `<option value="${s.id}" ${s.id === course.subject_id ? 'selected' : ''}>${eh(s.name)}</option>`).join('')}</select>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;">
            <div class="form-group"><label class="form-label">Difficulty</label>
              <select class="form-select" id="sp-input-course-difficulty"><option value="beginner" ${course.difficulty === 'beginner' ? 'selected' : ''}>Beginner</option><option value="intermediate" ${course.difficulty === 'intermediate' ? 'selected' : ''}>Intermediate</option><option value="advanced" ${course.difficulty === 'advanced' ? 'selected' : ''}>Advanced</option></select>
            </div>
            <div class="form-group"><label class="form-label">Duration</label><input type="text" class="form-input" id="sp-input-course-duration" value="${eh(course.estimated_duration || '')}" placeholder="e.g. 4 weeks"></div>
            <div class="form-group"><label class="form-label">Status</label>
              <select class="form-select" id="sp-input-course-publish"><option value="draft" ${course.publish_status === 'draft' ? 'selected' : ''}>Draft</option><option value="published" ${course.publish_status === 'published' ? 'selected' : ''}>Published</option><option value="archived" ${course.publish_status === 'archived' ? 'selected' : ''}>Archived</option></select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-course">Cancel</button>
          <button class="btn btn-primary" data-action="sp-update-course" data-id="${course.id}" id="sp-btn-save-course">Save Changes</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      setTimeout(() => document.getElementById('sp-input-course-name')?.focus(), 100);
    } catch (err) { AppToast.show(err.message, 'error'); }
  },

  async save(isUpdate, courseId) {
    const name = document.getElementById('sp-input-course-name')?.value?.trim();
    if (!name) { AppToast.show('Course name is required.', 'error'); return; }
    const description = document.getElementById('sp-input-course-desc')?.value?.trim() || null;
    const categoryId = document.getElementById('sp-input-course-category')?.value || null;
    const subjectId = document.getElementById('sp-input-course-subject')?.value || null;
    const difficulty = document.getElementById('sp-input-course-difficulty')?.value || 'intermediate';
    const estimatedDuration = document.getElementById('sp-input-course-duration')?.value?.trim() || null;
    const publishStatus = document.getElementById('sp-input-course-publish')?.value || 'draft';
    const btn = document.getElementById('sp-btn-save-course');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Saving...'; }
    try {
      if (isUpdate) {
        await window.CourseService?.update(courseId, { name, description, categoryId, subjectId, difficulty, estimatedDuration, publishStatus });
        AppToast.show('Course updated.', 'success');
      } else {
        await window.CourseService?.create({ name, description, schoolId: AppRouter.currentSchoolId, categoryId, subjectId, difficulty, estimatedDuration, publishStatus });
        AppToast.show('Course created.', 'success');
      }
      AppModal.close('modal-course');
      AppStorage.invalidate();
      AppRouter.render();
    } catch (err) { AppToast.show(err.message || 'Failed to save course.', 'error'); }
    if (btn) { btn.disabled = false; btn.textContent = isUpdate ? 'Save Changes' : 'Add Course'; }
  },

  async manage(courseId) {
    const data = await AppStorage.load();
    const course = (await window.CourseService?.getById(courseId).catch(() => null));
    if (!course) { AppToast.show('Course not found.', 'error'); return; }
    const school = data.schools.find(s => s.id === AppRouter.currentSchoolId);
    const sections = data.sections.filter(s => s.school_id === school?.id);
    const enrolledSections = (await window.CourseService?.getSections(courseId).catch(() => [])) || [];
    const enrolledSectionIds = enrolledSections.map(es => es.section_id);
    const existing = document.getElementById('modal-course-manage');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-course-manage';
    overlay.innerHTML = `<div class="modal" style="max-width:600px;">
      <div class="modal-header"><h3 class="modal-title">Manage Course: ${eh(course.name)}</h3><button class="modal-close" data-close-modal="modal-course-manage"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div style="margin-bottom:16px;"><strong>Sections</strong> — Add sections to this course</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">
          ${sections.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">No sections available. Create sections first.</p>'
          : sections.map(sec => {
            const isEnrolled = enrolledSectionIds.includes(sec.id);
            return `<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;cursor:pointer;">
              <input type="checkbox" data-action="sp-toggle-section" data-course-id="${courseId}" data-section-id="${sec.id}" ${isEnrolled ? 'checked' : ''} style="width:16px;height:16px;">
              <span>${eh(sec.name)}</span>
              <span style="margin-left:auto;font-size:11px;color:var(--text-muted);">${isEnrolled ? '✓ Added' : 'Not added'}</span>
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-course-manage">Done</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    initIcons();
  },

  confirmDelete(courseId) {
    const existing = document.getElementById('modal-confirm');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-confirm-course';
    overlay.innerHTML = `<div class="modal" style="max-width:400px;">
      <div class="modal-header"><h3 class="modal-title">Confirm Delete</h3><button class="modal-close" data-close-modal="modal-confirm-course"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fef2f2;border-radius:8px;">
          <span class="material-symbols-outlined" style="font-size:24px;color:#ef4444;">warning</span>
          <span style="font-size:13px;">Delete this course? Students enrolled will be unlinked.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-confirm-course">Cancel</button>
        <button class="btn btn-danger" style="background:#ef4444;color:#fff;border:none;" data-action="sp-confirm-delete-course" data-id="${courseId}">Delete Course</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    initIcons();
  },

  async assignCourses(studentId) {
    try {
      const student = await window.StudentService?.getById(studentId);
      if (!student) { AppToast.show('Student not found.', 'error'); return; }
      const courses = await window.CourseService?.getBySchool(AppRouter.currentSchoolId) || [];
      const enrollments = await window.EnrollmentService?.getByStudent(studentId) || [];
      const enrolledIds = enrollments.map(e => e.course_id);

      const existing = document.getElementById('modal-assign-courses');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-assign-courses';
      overlay.innerHTML = `<div class="modal" style="max-width:600px;">
        <div class="modal-header"><h3 class="modal-title">Assign Courses</h3><button class="modal-close" data-close-modal="modal-assign-courses"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body">
          <div style="margin-bottom:16px;font-size:14px;font-weight:600;">${eh(student.name)} <span style="font-weight:400;color:var(--text-secondary);">— ${eh(student.class ? student.class + (student.section ? ' · ' + student.section : '') : '')}</span></div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Toggle courses to enroll or unenroll this student.</div>
          <div style="display:flex;flex-direction:column;gap:2px;max-height:350px;overflow-y:auto;">
            ${courses.length === 0 ? '<p style="color:var(--text-muted);font-size:13px;">No courses available. Create courses first.</p>'
            : courses.map(c => {
              const isEnrolled = enrolledIds.includes(c.id);
              return `<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;background:${isEnrolled ? 'var(--primary)08' : 'transparent'};border:1px solid ${isEnrolled ? 'var(--primary)20' : 'var(--border-light)'};font-size:13px;cursor:pointer;">
                <input type="checkbox" data-action="sp-toggle-enrollment" data-student-id="${studentId}" data-course-id="${c.id}" ${isEnrolled ? 'checked' : ''} style="width:16px;height:16px;">
                <span style="font-weight:500;">${eh(c.name)}</span>
                <span style="margin-left:auto;font-size:11px;color:${isEnrolled ? 'var(--primary)' : 'var(--text-muted)'};">${isEnrolled ? 'Enrolled' : 'Not enrolled'}</span>
              </label>`;
            }).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-assign-courses">Done</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch (err) { AppToast.show(err.message || 'Failed to load courses.', 'error'); }
  },

  async manageStructure(courseId) {
    try {
      const course = await window.CourseService?.getById(courseId);
      if (!course) { AppToast.show('Course not found.', 'error'); return; }
      const modules = await window.ModuleService?.getByCourse(courseId) || [];
      const moduleIds = modules.map(m => m.id);
      const allLessons = {};
      if (moduleIds.length > 0) {
        try {
          const batchLessons = await window.LessonService?.getByModules(moduleIds) || {};
          for (const m of modules) {
            allLessons[m.id] = batchLessons[m.id] || [];
          }
        } catch (e) { console.error('Failed to fetch lessons batch:', e); }
      }

      const existing = document.getElementById('modal-course-structure');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-course-structure';
      const eh = AppUtils.escapeHtml;
      overlay.innerHTML = `<div class="modal" style="max-width:700px;">
        <div class="modal-header">
          <h3 class="modal-title">Course Structure: ${eh(course.name)}</h3>
          <button class="modal-close" data-close-modal="modal-course-structure"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
          <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;font-weight:600;">Modules & Lessons</span>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-ghost btn-sm" data-action="sp-course-progress" data-course-id="${courseId}" style="font-size:11px;height:30px;" title="Student Progress"><span class="material-symbols-outlined" style="font-size:14px;">monitoring</span> Progress</button>
              <button class="btn btn-primary btn-sm" data-action="sp-add-module" data-course-id="${courseId}" style="font-size:11px;height:30px;"><span class="material-symbols-outlined" style="font-size:14px;">add</span> Add Module</button>
            </div>
          </div>
          ${modules.length === 0 ? '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;border:1px dashed var(--border);border-radius:8px;">No modules yet. Add your first module to start building the course.</div>'
          : modules.map((m, mi) => `
            <div style="border:1px solid var(--border);border-radius:8px;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--card-bg);border-bottom:1px solid var(--border-light);border-radius:8px 8px 0 0;">
                <span style="font-size:12px;color:var(--text-muted);font-weight:600;">Module ${mi + 1}</span>
                <span style="flex:1;font-size:13px;font-weight:500;">${eh(m.title)}</span>
                <button class="btn btn-ghost btn-sm" style="width:28px;height:28px;padding:0;" data-action="sp-edit-module" data-module-id="${m.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:14px;">edit</span></button>
                <button class="btn btn-ghost btn-sm btn-danger-ghost" style="width:28px;height:28px;padding:0;" data-action="sp-delete-module" data-module-id="${m.id}" data-course-id="${courseId}" title="Delete"><span class="material-symbols-outlined" style="font-size:14px;">delete</span></button>
                ${mi > 0 ? `<button class="btn btn-ghost btn-sm" style="width:28px;height:28px;padding:0;" data-action="sp-move-module" data-module-id="${m.id}" data-direction="up" title="Move Up"><span class="material-symbols-outlined" style="font-size:14px;">arrow_upward</span></button>` : ''}
                ${mi < modules.length - 1 ? `<button class="btn btn-ghost btn-sm" style="width:28px;height:28px;padding:0;" data-action="sp-move-module" data-module-id="${m.id}" data-direction="down" title="Move Down"><span class="material-symbols-outlined" style="font-size:14px;">arrow_downward</span></button>` : ''}
              </div>
              <div style="padding:6px 12px 10px;">
                ${(allLessons[m.id] || []).length === 0 ? '<div style="font-size:12px;color:var(--text-muted);padding:4px 0;">No lessons yet.</div>'
                : (allLessons[m.id] || []).map((l, li) => {
                  const icons = { video: 'play_circle', pdf: 'picture_as_pdf', document: 'description', image: 'image', drive_link: 'folder_open', assignment: 'assignment', quiz: 'quiz' };
                  const extraBtn = l.content_type === 'quiz' ? `<button class="btn btn-ghost btn-sm" style="width:24px;height:24px;padding:0;" data-action="sp-manage-questions" data-lesson-id="${l.id}" title="Questions"><span class="material-symbols-outlined" style="font-size:12px;">quiz</span></button>`
                    : l.content_type === 'assignment' ? `<button class="btn btn-ghost btn-sm" style="width:24px;height:24px;padding:0;" data-action="sp-manage-assignment-submissions" data-lesson-id="${l.id}" title="Submissions"><span class="material-symbols-outlined" style="font-size:12px;">assignment</span></button>` : '';
                  return `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:4px;margin:2px 0;">
                    <span class="material-symbols-outlined" style="font-size:14px;color:var(--text-muted);">${icons[l.content_type] || 'radio_button_unchecked'}</span>
                    <span style="font-size:12px;flex:1;">${eh(l.title)}</span>
                    <span style="font-size:10px;color:var(--text-muted);padding:1px 6px;background:var(--border-light);border-radius:4px;">${eh(l.content_type)}</span>
                    ${extraBtn}
                    <button class="btn btn-ghost btn-sm" style="width:24px;height:24px;padding:0;" data-action="sp-edit-lesson" data-lesson-id="${l.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:12px;">edit</span></button>
                    <button class="btn btn-ghost btn-sm btn-danger-ghost" style="width:24px;height:24px;padding:0;" data-action="sp-delete-lesson" data-lesson-id="${l.id}" data-course-id="${courseId}" title="Delete"><span class="material-symbols-outlined" style="font-size:12px;">delete</span></button>
                    ${li > 0 ? `<button class="btn btn-ghost btn-sm" style="width:24px;height:24px;padding:0;" data-action="sp-move-lesson" data-lesson-id="${l.id}" data-direction="up" title="Up"><span class="material-symbols-outlined" style="font-size:12px;">arrow_upward</span></button>` : ''}
                    ${li < (allLessons[m.id] || []).length - 1 ? `<button class="btn btn-ghost btn-sm" style="width:24px;height:24px;padding:0;" data-action="sp-move-lesson" data-lesson-id="${l.id}" data-direction="down" title="Down"><span class="material-symbols-outlined" style="font-size:12px;">arrow_downward</span></button>` : ''}
                  </div>`;
                }).join('')}
                <button class="btn btn-ghost btn-sm" style="margin-top:4px;font-size:11px;color:var(--primary);" data-action="sp-add-lesson" data-module-id="${m.id}"><span class="material-symbols-outlined" style="font-size:12px;">add</span> Add Lesson</button>
              </div>
            </div>`).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-course-structure">Done</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch (err) { AppToast.show(err.message || 'Failed to load course structure.', 'error'); }
  },

  async showModuleForm(moduleId) {
    let moduleData = null;
    if (moduleId) {
      try { moduleData = await window.ModuleService?.getById(moduleId); } catch (e) { console.error('Failed in school-portal:', e); }
    }
    const existing = document.getElementById('modal-module-form');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-module-form';
    overlay.innerHTML = `<div class="modal" style="max-width:450px;">
      <div class="modal-header"><h3 class="modal-title">${moduleId ? 'Edit Module' : 'Add Module'}</h3><button class="modal-close" data-close-modal="modal-module-form"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Module Title</label><input type="text" class="form-input" id="sp-input-module-title" value="${eh(moduleData?.title || '')}" placeholder="e.g. Introduction"></div>
        <div class="form-group" style="margin-top:12px;"><label class="form-label">Description</label><textarea class="form-input" id="sp-input-module-desc" placeholder="Optional description..." style="height:60px;resize:vertical;">${eh(moduleData?.description || '')}</textarea></div>
        <input type="hidden" id="sp-input-module-id" value="${moduleId || ''}">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-module-form">Cancel</button>
        <button class="btn btn-primary" data-action="sp-save-module">${moduleId ? 'Save Changes' : 'Add Module'}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    setTimeout(() => document.getElementById('sp-input-module-title')?.focus(), 100);
  },

  async showLessonForm(moduleId, lessonId) {
    let lessonData = null;
    if (lessonId) {
      try { lessonData = await window.LessonService?.getById(lessonId); } catch (e) { console.error('Failed in school-portal:', e); }
    }
    const existing = document.getElementById('modal-lesson-form');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-lesson-form';
    const types = ['video','pdf','document','image','drive_link','assignment','quiz'];
    overlay.innerHTML = `<div class="modal" style="max-width:500px;">
      <div class="modal-header"><h3 class="modal-title">${lessonId ? 'Edit Lesson' : 'Add Lesson'}</h3><button class="modal-close" data-close-modal="modal-lesson-form"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Lesson Title</label><input type="text" class="form-input" id="sp-input-lesson-title" value="${eh(lessonData?.title || '')}" placeholder="e.g. Introduction to Algebra"></div>
        <div class="form-group" style="margin-top:10px;"><label class="form-label">Content Type</label>
          <select class="form-select" id="sp-input-lesson-type">${types.map(t => `<option value="${t}" ${lessonData?.content_type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="margin-top:10px;"><label class="form-label">Content URL</label><input type="text" class="form-input" id="sp-input-lesson-url" value="${eh(lessonData?.content_url || '')}" placeholder="https://..."></div>
        <div class="form-group" style="margin-top:10px;"><label class="form-label">Duration (minutes)</label><input type="number" class="form-input" id="sp-input-lesson-duration" value="${eh(lessonData?.duration || '')}" placeholder="e.g. 15" min="0" style="width:120px;"></div>
        <input type="hidden" id="sp-input-lesson-module" value="${moduleId}">
        <input type="hidden" id="sp-input-lesson-id" value="${lessonId || ''}">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-lesson-form">Cancel</button>
        <button class="btn btn-primary" data-action="sp-save-lesson">${lessonId ? 'Save Changes' : 'Add Lesson'}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    setTimeout(() => document.getElementById('sp-input-lesson-title')?.focus(), 100);
  },

  filter() { this.currentPage = 1; AppRouter.render(); }
};

// ==============================================================
// ENROLLMENTS / ASSIGNMENTS
// ==============================================================
window.SchoolAssignments = {
  async render(main, data, school) {
    const schoolId = school.id;
    let courses = [], students = [], enrollments = [];
    try { courses = await window.CourseService?.getBySchool(schoolId) || []; } catch (e) { console.error('Failed in school-portal:', e); }
    try { students = await window.StudentService?.getBySchool(schoolId) || []; } catch (e) { console.error('Failed in school-portal:', e); }
    try { enrollments = await window.EnrollmentService?.getBySchool(schoolId) || []; } catch (e) { console.error('Failed in school-portal:', e); }

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">Assignments</h1><p class="page-subtitle">Enroll students in courses.</p>
        </div>
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <span style="font-size:11px;color:var(--text-muted);">${enrollments.length} total enrollments</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${enrollments.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">assignment</span><h3>No assignments yet</h3><p>Enroll students in courses to see them here.</p></div>`
        : `<div class="table-container"><table><thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Assigned</th><th style="width:80px;"></th></tr></thead><tbody>
          ${enrollments.map(e => {
            const student = students.find(s => s.id === e.student_id);
            const course = courses.find(c => c.id === e.course_id);
            return `<tr>
              <td><div style="display:flex;align-items:center;gap:8px;"><div class="user-avatar" style="width:28px;height:28px;font-size:10px;">${AppUtils.getInitials(student?.name || '')}</div><span class="font-semibold">${eh(student?.name || 'Unknown')}</span></div></td>
              <td style="font-size:13px;">${eh(course?.name || 'Unknown')}</td>
              <td><span class="status-badge ${e.status === 'active' ? 'status-active' : e.status === 'completed' ? 'status-active' : 'status-suspended'}">${eh(e.status)}</span></td>
              <td style="font-size:13px;color:var(--text-secondary);">${AppUtils.formatDate(e.created_at)}</td>
              <td class="td-actions"><button class="btn btn-ghost btn-sm btn-danger-ghost" data-action="sp-remove-enrollment" data-id="${e.id}" title="Remove"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button></td>
            </tr>`;
          }).join('')}
        </tbody></table></div>`}
      </div>
    </div>`;
    initIcons();
  },

  confirmRemoveEnrollment(enrollmentId) {
    const existing = document.getElementById('modal-confirm');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-confirm-enrollment';
    overlay.innerHTML = `<div class="modal" style="max-width:400px;">
      <div class="modal-header"><h3 class="modal-title">Remove Enrollment</h3><button class="modal-close" data-close-modal="modal-confirm-enrollment"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fef2f2;border-radius:8px;">
          <span class="material-symbols-outlined" style="font-size:24px;color:#ef4444;">warning</span>
          <span style="font-size:13px;">Remove this enrollment? The student will be unlinked from this course.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-confirm-enrollment">Cancel</button>
        <button class="btn btn-danger" style="background:#ef4444;color:#fff;border:none;" data-action="sp-confirm-remove-enrollment" data-id="${enrollmentId}">Remove</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    initIcons();
  }
};

// ==============================================================
// REPORTS
// ==============================================================
window.SchoolReports = {
  async render(main, data, school) {
    const schoolId = school.id;
    let students = [], courses = [], enrollments = [];
    try { students = await window.StudentService?.getBySchool(schoolId) || []; } catch (e) { console.error('Failed in school-portal:', e); }
    try { courses = await window.CourseService?.getBySchool(schoolId) || []; } catch (e) { console.error('Failed in school-portal:', e); }
    try { enrollments = await window.EnrollmentService?.getBySchool(schoolId) || []; } catch (e) { console.error('Failed in school-portal:', e); }
    const categories = (data.categories || []).filter(c => c.school_id === schoolId);
    const subjects = (data.subjects || []).filter(s => s.school_id === schoolId);
    const counselors = (data.counselors || []).filter(c => c.school_id === schoolId);
    const content = data.content.filter(c => c.school_id === schoolId);
    const activities = (data.activities || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
    const activeStudents = students.filter(s => s.status === 'active');
    const activeEnrollments = enrollments.filter(e => e.status === 'active');
    const recentEnrollments = [...enrollments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">Reports</h1><p class="page-subtitle">Platform analytics and insights for ${eh(school.name)}.</p>
        </div>
      </div>

      <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr);">
        <div class="metric-card"><div class="metric-icon metric-icon-green"><span class="material-symbols-outlined">groups</span></div><div class="metric-info"><h2>${activeStudents.length}/${students.length}</h2><p>Active Students</p></div></div>
        <div class="metric-card"><div class="metric-icon metric-icon-blue"><span class="material-symbols-outlined">school</span></div><div class="metric-info"><h2>${courses.length}</h2><p>Total Courses</p></div></div>
        <div class="metric-card"><div class="metric-icon metric-icon-purple"><span class="material-symbols-outlined">assignment</span></div><div class="metric-info"><h2>${activeEnrollments.length}</h2><p>Active Enrollments</p></div></div>
        <div class="metric-card"><div class="metric-icon metric-icon-orange"><span class="material-symbols-outlined">videocam</span></div><div class="metric-info"><h2>${content.length}</h2><p>Content Items</p></div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Students by Status</h3></div>
          <div style="display:flex;gap:16px;padding:16px 0;">
            ${[
              { label: 'Active', value: students.filter(s => s.status === 'active').length, color: 'var(--success)' },
              { label: 'Inactive', value: students.filter(s => s.status === 'inactive').length, color: 'var(--warning)' },
              { label: 'Suspended', value: students.filter(s => s.status === 'suspended').length, color: 'var(--danger)' }
            ].map(s => `<div style="flex:1;text-align:center;padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);"><div style="font-size:24px;font-weight:700;color:${s.color};">${s.value}</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${s.label}</div></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Enrollment Summary</h3></div>
          <div style="display:flex;gap:16px;padding:16px 0;">
            ${[
              { label: 'Active', value: enrollments.filter(e => e.status === 'active').length, color: 'var(--success)' },
              { label: 'Completed', value: enrollments.filter(e => e.status === 'completed').length, color: 'var(--info)' },
              { label: 'Dropped', value: enrollments.filter(e => e.status === 'dropped').length, color: 'var(--danger)' }
            ].map(s => `<div style="flex:1;text-align:center;padding:12px;border:1px solid var(--border);border-radius:var(--radius-md);"><div style="font-size:24px;font-weight:700;color:${s.color};">${s.value}</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${s.label}</div></div>`).join('')}
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Counselor Performance</h3></div>
          ${counselors.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No counselors found.</div>'
          : `<div class="table-container"><table><thead><tr><th>Counselor</th><th>Students</th><th>Enrollments</th><th>Completed</th><th>Rate</th></tr></thead><tbody>${counselors.map(co => {
            const coStudents = students.filter(s => s.counselor_id === co.id);
            const coEnrollments = enrollments.filter(e => coStudents.some(s => s.id === e.student_id));
            const coCompleted = coEnrollments.filter(e => e.status === 'completed').length;
            const coRate = coEnrollments.length > 0 ? Math.round((coCompleted / coEnrollments.length) * 100) : 0;
            return `<tr><td><span class="font-semibold">${eh(co.name)}</span></td><td>${coStudents.length}</td><td>${coEnrollments.length}</td><td>${coCompleted}</td><td><div style="display:flex;align-items:center;gap:6px;"><div style="width:40px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${coRate}%;background:${coRate > 50 ? 'var(--success)' : 'var(--warning)'};border-radius:3px;"></div></div><span style="font-size:11px;">${coRate}%</span></div></td></tr>`;
          }).join('')}</tbody></table></div>`}
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Category & Subject Stats</h3></div>
          ${categories.length === 0 ? '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No categories found.</div>'
          : `<div class="table-container"><table><thead><tr><th>Category</th><th>Subjects</th><th>Courses</th></tr></thead><tbody>${categories.map(cat => {
            const subCount = subjects.filter(s => s.category_id === cat.id).length;
            const courseCount = courses.filter(co => co.category_id === cat.id).length;
            return `<tr><td><span class="font-semibold">${eh(cat.name)}</span></td><td>${subCount}</td><td>${courseCount}</td></tr>`;
          }).join('')}</tbody></table></div>`}
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><h3 class="card-title">Course Completion Rates</h3></div>
        ${courses.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">bar_chart</span><h3>No course data</h3><p>Enroll students in courses to see completion data.</p></div>`
        : `<div class="table-container"><table><thead><tr><th>Course</th><th>Category</th><th>Enrolled</th><th>Active</th><th>Completed</th><th>Rate</th></tr></thead><tbody>${courses.map(c => {
          const cEnrollments = enrollments.filter(e => e.course_id === c.id);
          const completed = cEnrollments.filter(e => e.status === 'completed').length;
          const rate = cEnrollments.length > 0 ? Math.round((completed / cEnrollments.length) * 100) : 0;
          const cat = categories.find(ca => ca.id === c.category_id);
          return `<tr><td><span class="font-semibold">${eh(c.name)}</span></td><td style="font-size:12px;color:var(--text-secondary);">${eh(cat?.name || '—')}</td><td>${cEnrollments.length}</td><td>${cEnrollments.filter(e => e.status === 'active').length}</td><td>${completed}</td><td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${rate}%;background:${rate > 50 ? 'var(--success)' : rate > 20 ? 'var(--warning)' : 'var(--danger)'};border-radius:3px;"></div></div><span style="font-size:12px;font-weight:600;">${rate}%</span></div></td></tr>`;
        }).join('')}</tbody></table></div>`}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Recent Enrollments</h3></div>
          ${recentEnrollments.length === 0 ? '<div class="empty-state" style="padding:20px;"><span class="material-symbols-outlined" style="font-size:32px;">assignment</span><h3 style="font-size:13px;">No enrollments yet</h3></div>'
          : `<div style="display:flex;flex-direction:column;">${recentEnrollments.map(e => {
            const student = students.find(s => s.id === e.student_id);
            const course = courses.find(c => c.id === e.course_id);
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border-light);font-size:12px;">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--primary)12;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:var(--primary);">${AppUtils.getInitials(student?.name || '?')}</div>
              <div style="flex:1;"><span class="font-semibold">${eh(student?.name || 'Unknown')}</span> → ${eh(course?.name || 'Unknown')}</div>
              <span class="status-badge ${e.status === 'active' ? 'status-active' : e.status === 'completed' ? 'status-active' : 'status-suspended'}" style="font-size:9px;">${eh(e.status)}</span>
            </div>`;
          }).join('')}</div>`}
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Activity Timeline</h3></div>
          ${activities.length === 0 ? '<div class="empty-state" style="padding:20px;"><span class="material-symbols-outlined" style="font-size:32px;">timeline</span><h3 style="font-size:13px;">No activity yet</h3></div>'
          : `<div style="display:flex;flex-direction:column;">${activities.map(a => {
            const icons = { course_completed: 'check_circle', video_watched: 'play_circle', attendance_marked: 'fact_check', assignment_submitted: 'assignment', course_assigned: 'playlist_add', certificate_earned: 'workspace_premium', counseling_session: 'support', progress_review: 'trending_up' };
            const student = students.find(s => s.id === a.student_id);
            return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 16px;border-bottom:1px solid var(--border-light);font-size:12px;">
              <span class="material-symbols-outlined" style="font-size:14px;color:var(--primary);flex-shrink:0;margin-top:1px;">${icons[a.action] || 'circle'}</span>
              <div style="flex:1;"><span>${eh(a.description)}</span>${student ? `<span style="color:var(--text-secondary);"> — ${eh(student.name)}</span>` : ''}</div>
              <span style="font-size:10px;color:var(--text-muted);white-space:nowrap;">${AppUtils.timeAgo(a.timestamp)}</span>
            </div>`;
          }).join('')}</div>`}
        </div>
      </div>
    </div>`;
    initIcons();
  }
};

// ==============================================================
// NOTIFICATIONS
// ==============================================================
window.SchoolNotifications = {
  async render(main, data, school) {
    let notifications = [];
    try {
      const profile = await AuthService.getProfile();
      if (profile) notifications = await window.NotificationService?.getByUser(profile.id) || [];
    } catch (e) { console.error('Failed in school-portal:', e); }
    const filter = document.getElementById('sp-notif-filter')?.value || '';
    if (filter === 'unread') notifications = notifications.filter(n => !n.is_read);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">Notifications</h1><p class="page-subtitle">Stay updated with platform activity.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" style="height:34px;font-size:11px;" data-action="sp-send-notification"><span class="material-symbols-outlined" style="font-size:14px;">send</span> Send Notification</button>
          ${unreadCount > 0 ? `<button class="btn btn-secondary btn-sm" style="height:34px;font-size:11px;" data-action="sp-mark-all-read"><span class="material-symbols-outlined" style="font-size:14px;">done_all</span> Mark All Read</button>` : ''}
          ${notifications.length > 0 ? `<button class="btn btn-ghost btn-sm btn-danger-ghost" style="height:34px;font-size:11px;" data-action="sp-delete-all-notifications"><span class="material-symbols-outlined" style="font-size:14px;">delete_sweep</span> Clear All</button>` : ''}
        </div>
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <select class="form-select" id="sp-notif-filter" style="width:160px;height:40px;font-size:13px;">
          <option value="">All Notifications</option>
          <option value="unread" ${filter === 'unread' ? 'selected' : ''}>Unread (${unreadCount})</option>
        </select>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">${notifications.length} notification${notifications.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="card" style="padding:0;overflow:hidden;">
        ${notifications.length === 0 ? `<div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">notifications_off</span><h3>All caught up!</h3><p>${filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p></div>`
        : `<div style="display:flex;flex-direction:column;">${notifications.map(n => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border);${!n.is_read ? 'background:var(--primary-subtle);' : ''}">
            <div style="width:8px;height:8px;border-radius:50%;background:${n.is_read ? 'var(--border)' : 'var(--primary)'};margin-top:6px;flex-shrink:0;cursor:pointer;" data-action="sp-mark-notification-read" data-id="${n.id}" title="${n.is_read ? 'Read' : 'Mark as read'}"></div>
            <div style="flex:1;">
              <div style="font-size:13px;font-weight:600;">${eh(n.title)}</div>
              ${n.message ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${eh(n.message)}</div>` : ''}
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${AppUtils.formatDate(n.created_at)}</div>
            </div>
            <div style="display:flex;gap:4px;">
              ${n.is_read ? '' : `<button class="btn btn-ghost btn-sm" data-action="sp-mark-notification-read" data-id="${n.id}" title="Mark Read" style="width:28px;height:28px;padding:0;"><span class="material-symbols-outlined" style="font-size:14px;">mark_email_read</span></button>`}
              <button class="btn btn-ghost btn-sm" data-action="sp-delete-notification" data-id="${n.id}" title="Dismiss" style="width:28px;height:28px;padding:0;"><span class="material-symbols-outlined" style="font-size:14px;">close</span></button>
            </div>
          </div>`).join('')}</div>`}
      </div>
    </div>`;
    initIcons();
  },

  async openSend(schoolId) {
    const data = await AppStorage.load();
    const recipients = [
      ...(data.counselors || []).filter(c => c.school_id === schoolId).map(c => ({ id: c.id, name: c.name, role: 'counselor' })),
      ...(data.users || []).filter(u => u.schoolId === schoolId && u.role === 'school_admin').map(u => ({ id: u.id, name: u.name, role: 'admin' })),
    ];
    const existing = document.getElementById('modal-send-notification');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-send-notification';
    overlay.innerHTML = `<div class="modal" style="max-width:500px;">
      <div class="modal-header"><h3 class="modal-title">Send Notification</h3><button class="modal-close" data-close-modal="modal-send-notification"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Recipient</label>
          <select class="form-select" id="sp-notif-recipient"><option value="">All School Admins & Counselors</option>${recipients.map(r => `<option value="${r.id}">${eh(r.name)} (${r.role})</option>`).join('')}</select>
        </div>
        <div class="form-group" style="margin-top:12px;"><label class="form-label">Title</label><input type="text" class="form-input" id="sp-notif-title" placeholder="Notification title"></div>
        <div class="form-group" style="margin-top:12px;"><label class="form-label">Message</label><textarea class="form-input" id="sp-notif-message" placeholder="Write your message..." style="height:100px;resize:vertical;"></textarea></div>
        <div class="form-group" style="margin-top:12px;"><label class="form-label">Type</label>
          <select class="form-select" id="sp-notif-type"><option value="System Message">System Message</option><option value="Course Published">Course Published</option><option value="Assignment">Assignment</option></select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-send-notification">Cancel</button>
        <button class="btn btn-primary" data-action="sp-send-notification-now" id="sp-btn-send-notification">Send</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    setTimeout(() => document.getElementById('sp-notif-title')?.focus(), 100);
  },

  async send(data) {
    const title = document.getElementById('sp-notif-title')?.value?.trim();
    if (!title) { AppToast.show('Title is required.', 'error'); return; }
    const message = document.getElementById('sp-notif-message')?.value?.trim() || null;
    const recipientId = document.getElementById('sp-notif-recipient')?.value || null;
    const btn = document.getElementById('sp-btn-send-notification');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
    try {
      if (recipientId) {
        await window.NotificationService?.create(title, message, recipientId);
      } else {
        const data = await AppStorage.load();
        const schoolId = AppRouter.currentSchoolId;
        const schoolUsers = (data.counselors || []).filter(c => c.school_id === schoolId).map(c => c.id);
        const adminUsers = (data.users || []).filter(u => u.schoolId === schoolId && u.role === 'school_admin').map(u => u.id);
        const allRecipients = [...new Set([...schoolUsers, ...adminUsers])];
        for (const uid of allRecipients) {
          await window.NotificationService?.create(title, `${message || ''} [System broadcast]`, uid);
        }
      }
      AppToast.show('Notification sent.', 'success');
      AppModal.close('modal-send-notification');
      AppStorage.invalidate();
      AppRouter.render();
    } catch (err) {
      AppToast.show(err.message || 'Failed to send notification.', 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Send'; }
  }
};

// ==============================================================
// SCHOOL SETTINGS
// ==============================================================
window.SchoolSettings = {
  async render(main, data, school) {
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">School Settings</h1><p class="page-subtitle">Manage school configuration.</p>
        </div>
      </div>
      <div class="card" style="max-width:600px;">
        <div class="card-header"><h3 class="card-title">General</h3></div>
        <div style="padding:20px;">
          <div class="form-group"><label class="form-label">School Name</label><input type="text" class="form-input" id="sp-setting-name" value="${eh(school.name)}"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">School Code</label><input type="text" class="form-input" id="sp-setting-code" value="${eh(school.code || '')}"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Principal Name</label><input type="text" class="form-input" id="sp-setting-principal" value="${eh(school.principal_name || '')}"></div>
          <div class="form-group" style="margin-top:16px;"><label class="form-label">Status</label>
            <select class="form-select" id="sp-setting-status">
              <option value="active" ${school.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${school.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="suspended" ${school.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>
          <div style="margin-top:20px;">
            <button class="btn btn-primary" data-action="sp-save-settings" style="height:40px;font-size:13px;">Save Changes</button>
          </div>
        </div>
      </div>
    </div>`;
    initIcons();
  },

  async save(schoolId) {
    const name = document.getElementById('sp-setting-name')?.value?.trim();
    const code = document.getElementById('sp-setting-code')?.value?.trim();
    const principal = document.getElementById('sp-setting-principal')?.value?.trim();
    const status = document.getElementById('sp-setting-status')?.value;
    if (!name) { AppToast.show('School name is required.', 'error'); return; }
    try {
      await SchoolService.update(schoolId, { name, code, principal_name: principal, status });
      AppToast.show('School settings updated.', 'success');
      AppStorage.invalidate();
      AppRouter.render();
    } catch (err) { AppToast.show(err.message || 'Failed to save settings.', 'error'); }
  }
};

// ==============================================================
// SCHOOL PROFILE
// ==============================================================
window.SchoolProfile = {
  async render(main, data, school) {
    const profile = await AuthService.getProfile();
    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">My Profile</h1></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:20px;">
        <div class="card" style="text-align:center;">
          <div class="user-avatar" style="width:64px;height:64px;font-size:24px;margin:0 auto 12px;">${AppUtils.getInitials(profile?.name || '')}</div>
          <div style="font-size:16px;font-weight:600;">${eh(profile?.name || 'User')}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${eh(profile?.role || '')}</div>
          <div style="margin-top:12px;"><span class="status-badge status-active">Active</span></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">Account Details</h3></div>
          <div style="padding:12px 0;">
            <div style="display:grid;grid-template-columns:120px 1fr;gap:12px;font-size:13px;">
              <span style="color:var(--text-secondary);">Name:</span><span>${eh(profile?.name || '—')}</span>
              <span style="color:var(--text-secondary);">Role:</span><span><span class="status-badge" style="background:var(--primary-subtle);color:var(--primary);">${AppUtils.escapeHtml(window.ROLE_LABELS?.[profile?.role] || profile?.role || 'School Admin')}</span></span>
              <span style="color:var(--text-secondary);">School:</span><span>${eh(school.name)}</span>
              <span style="color:var(--text-secondary);">Principal:</span><span>${eh(school.principal_name || '—')}</span>
              <span style="color:var(--text-secondary);">Joined:</span><span>${AppUtils.formatDate(profile?.created_at)}</span>
            </div>
          </div>
          <div style="padding-top:16px;border-top:1px solid var(--border);">
            <button class="btn btn-secondary btn-sm" data-action="sp-edit-profile">Edit Name</button>
            <button class="btn btn-secondary btn-sm" style="margin-left:8px;" data-action="logout">Sign Out</button>
          </div>
        </div>
      </div>
    </div>`;
    initIcons();
  }
};

// ==============================================================
// VIDEO LIBRARY (School-scoped content)
// ==============================================================
window.SchoolVideos = {
  async render(main, data, school) {
    const schoolId = school.id;
    const content = data.content.filter(c => c.school_id === schoolId);
    const q = (document.getElementById('sp-video-search')?.value || '').toLowerCase();
    const typeFilter = document.getElementById('sp-video-type')?.value || '';
    let items = content;
    if (q) items = items.filter(c => c.name.toLowerCase().includes(q));
    if (typeFilter) items = items.filter(c => c.type === typeFilter);

    main.innerHTML = `<div class="fade-in">
      <div class="page-header">
        <div class="page-header-left">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <button class="btn btn-ghost btn-sm" style="height:28px;padding:0 4px;" data-action="navigate" data-route="school-dashboard"><span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span></button>
            <span style="font-size:12px;color:var(--text-secondary);">${eh(school.name)}</span>
          </div>
          <h1 class="page-title">Video Library</h1><p class="page-subtitle">Manage videos and media for ${eh(school.name)}.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <span style="font-size:11px;color:var(--text-muted);align-self:center;">${items.length} items</span>
          <button class="btn btn-primary" data-action="add-content"><span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Content</button>
        </div>
      </div>
      <div class="management-bar" style="margin-bottom:16px;">
        <div class="search-bar" style="max-width:250px;"><span class="material-symbols-outlined" style="font-size:18px;">search</span><input type="text" id="sp-video-search" placeholder="Search media..."></div>
        <select class="form-select" id="sp-video-type" style="width:130px;height:40px;font-size:13px;">
          <option value="">All Types</option>
          <option value="Video">Video</option><option value="PDF">PDF</option><option value="Image">Image</option><option value="Document">Document</option><option value="Other">Other</option>
        </select>
      </div>
      ${items.length === 0 ? `<div class="card"><div class="empty-state"><span class="material-symbols-outlined" style="font-size:40px;">video_library</span><h3>No media available</h3><p>${content.length === 0 ? 'Upload videos and documents to your courses.' : 'No media matches your search criteria.'}</p></div></div>`
      : `<div class="subjects-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));">${items.map(m => {
        const isVideo = m.type === 'Video';
        const stats = window.VIDEO_VIEWS?.[m.id] || {};
        return `<div class="subject-card" style="padding:0;overflow:hidden;">
          <div style="aspect-ratio:16/9;background:${isVideo ? 'linear-gradient(135deg,#1A56DB 0%,#0A0D14 100%)' : '#F5F6F8'};display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;" data-action="${isVideo ? 'sp-view-video' : 'preview-image'}" data-id="${m.id}">
            <i data-icon="${isVideo ? 'play_circle' : 'image'}" style="width:36px;height:36px;color:${isVideo ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};"></i>
            ${isVideo && m.duration ? `<span style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;">${eh(m.duration)}</span>` : ''}
          </div>
          <div style="padding:12px;">
            <div style="font-size:14px;font-weight:600;">${eh(m.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${eh(m.type)} · ${eh(m.size || '—')}</div>
            ${isVideo && stats.views ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${eh(stats.views)} views · ${eh(stats.likes || 0)} likes</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:8px;">
              ${isVideo ? `<button class="btn btn-primary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="sp-view-video" data-id="${m.id}"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span> Details</button>` : `<button class="btn btn-primary btn-sm" style="flex:1;height:32px;font-size:12px;" data-action="preview-image" data-id="${m.id}"><span class="material-symbols-outlined" style="font-size:18px;">visibility</span> View</button>`}
              <button class="btn btn-ghost btn-sm" style="width:32px;height:32px;padding:0;" data-action="edit-content" data-id="${m.id}" title="Edit"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
              <button class="btn btn-ghost btn-sm btn-danger-ghost" style="width:32px;height:32px;padding:0;" data-action="sp-delete-content" data-id="${m.id}" title="Delete"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>
            </div>
          </div>
        </div>`;
      }).join('')}</div>`}
    </div>`;
    initIcons();
  },

  async viewVideo(videoId) {
    try {
      const data = await AppStorage.load();
      const video = data.content?.find(c => c.id === videoId);
      if (!video) { AppToast.show('Video not found.', 'error'); return; }
      const stats = window.VIDEO_VIEWS?.[videoId] || { views: 0, completions: 0, likes: 0, avgWatch: '0:00' };
      const related = data.content?.filter(c => c.subject_id === video.subject_id && c.id !== videoId && c.type === 'Video').slice(0, 4) || [];
      const subject = data.subjects?.find(s => s.id === video.subject_id);
      const section = data.sections?.find(s => s.id === video.section_id);
      const category = data.categories?.find(c => c.id === video.category_id);
      const completionPct = stats.views ? Math.round(stats.completions / stats.views * 100) : 0;

      const existing = document.getElementById('modal-video-detail');
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'modal-video-detail';
      overlay.innerHTML = `<div class="modal" style="max-width:640px;">
        <div class="modal-header"><h3 class="modal-title">Video Details</h3><button class="modal-close" data-close-modal="modal-video-detail"><span class="material-symbols-outlined">close</span></button></div>
        <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
          <div style="aspect-ratio:16/9;background:linear-gradient(135deg,#1A56DB 0%,#0A0D14 100%);border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <i data-icon="play_circle" style="width:48px;height:48px;color:rgba(255,255,255,0.8);"></i>
          </div>

          <h2 style="font-size:18px;font-weight:700;margin:0 0 4px;">${eh(video.name)}</h2>
          <p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px;">${eh(video.description || 'No description available.')}</p>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
            <div style="padding:10px;background:#eff6ff;border-radius:8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#3b82f6;">${eh(stats.views)}</div>
              <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Views</div>
            </div>
            <div style="padding:10px;background:#f0fdf4;border-radius:8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#10b981;">${eh(stats.likes)}</div>
              <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Likes</div>
            </div>
            <div style="padding:10px;background:#fffbeb;border-radius:8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#f59e0b;">${completionPct}%</div>
              <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Completion</div>
            </div>
            <div style="padding:10px;background:#f5f3ff;border-radius:8px;text-align:center;">
              <div style="font-size:18px;font-weight:700;color:#8b5cf6;">${eh(stats.avgWatch)}</div>
              <div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Avg Watch</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Details</div>
              <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Duration</span><span style="font-weight:500;">${eh(video.duration || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Category</span><span style="font-weight:500;">${eh(category?.name || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Subject</span><span style="font-weight:500;">${eh(subject?.name || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-light);"><span>Section</span><span style="font-weight:500;">${eh(section?.name || '—')}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Uploaded By</span><span style="font-weight:500;">${eh(video.uploaded_by || '—')}</span></div>
              </div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Completion Rate</div>
              <div style="display:flex;align-items:center;gap:16px;padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:8px;">
                <div style="width:72px;height:72px;border-radius:50%;background:conic-gradient(#10b981 ${completionPct * 3.6}deg, var(--border) ${completionPct * 3.6}deg);display:flex;align-items:center;justify-content:center;">
                  <div style="width:56px;height:56px;border-radius:50%;background:var(--card-bg);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#10b981;">${completionPct}%</div>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);">${eh(stats.completions)} of ${eh(stats.views)} viewers completed this video</div>
              </div>
            </div>
          </div>

          ${related.length > 0 ? `<div>
            <div style="font-size:12px;font-weight:600;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Related Videos</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">${related.map(r => {
              const rStats = window.VIDEO_VIEWS?.[r.id] || {};
              return `<div style="display:flex;gap:10px;padding:8px;border:1px solid var(--border-light);border-radius:8px;cursor:pointer;" data-action="sp-view-video" data-id="${r.id}">
                <div style="width:60px;height:40px;border-radius:6px;background:linear-gradient(135deg,#1A56DB 0%,#0A0D14 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:16px;color:rgba(255,255,255,0.6);">play_circle</span></div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${eh(r.name)}</div>
                  <div style="font-size:10px;color:var(--text-muted);">${eh(rStats.views || 0)} views</div>
                </div>
              </div>`;
            }).join('')}</div>
          </div>` : ''}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-close-modal="modal-video-detail">Close</button>
          <button class="btn btn-primary" data-action="play-video" data-id="${videoId}" style="font-size:12px;"><span class="material-symbols-outlined" style="font-size:16px;">play_arrow</span> Play Video</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      AppModal.open(overlay.id);
      initIcons();
    } catch (err) { AppToast.show(err.message || 'Failed to load video details.', 'error'); }
  },

  confirmDelete(videoId) {
    const existing = document.getElementById('modal-confirm');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-confirm-video';
    overlay.innerHTML = `<div class="modal" style="max-width:400px;">
      <div class="modal-header"><h3 class="modal-title">Delete Video</h3><button class="modal-close" data-close-modal="modal-confirm-video"><span class="material-symbols-outlined">close</span></button></div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fef2f2;border-radius:8px;">
          <span class="material-symbols-outlined" style="font-size:24px;color:#ef4444;">warning</span>
          <span style="font-size:13px;">Delete this video permanently? This action cannot be undone.</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-close-modal="modal-confirm-video">Cancel</button>
        <button class="btn btn-danger" style="background:#ef4444;color:#fff;border:none;" data-action="sp-confirm-delete-content" data-id="${videoId}">Delete</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    AppModal.open(overlay.id);
    initIcons();
  },

  filter() { AppRouter.render(); }
};

// ==============================================================
// PAGINATION HELPER
// ==============================================================
function pagination(totalPages, currentPage, action) {
  return `<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;">
    <button class="btn btn-secondary btn-sm" data-action="${action}" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''} style="height:34px;font-size:12px;">Previous</button>
    ${Array.from({length: totalPages}, (_, i) => i + 1).map(p => `
      <button class="btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" data-action="${action}" data-page="${p}" style="height:34px;min-width:34px;font-size:12px;">${p}</button>
    `).join('')}
    <button class="btn btn-secondary btn-sm" data-action="${action}" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''} style="height:34px;font-size:12px;">Next</button>
  </div>`;
}
