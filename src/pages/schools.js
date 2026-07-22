export async function render(main, data, router) {
  try {
    const q = (router._schoolSearchQuery || '').toLowerCase();
    let schools = data.schools;
    if (q) schools = schools.filter(s => s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));

    const perPage = 12;
    const totalPages = Math.max(1, Math.ceil(schools.length / perPage));
    const page = Math.min(Math.max(1, router._schoolsPage || 1), totalPages);
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
        const eh = AppUtils.escapeHtml;
        return `<div class="school-card" style="cursor:pointer;" data-action="open-school" data-id="${s.id}">
          <div class="school-card-top">
            <div class="school-logo ${logoClass}">${AppUtils.getInitials(eh(s.name))}</div>
            <div class="school-info">
              <div class="school-name">${eh(s.name)}</div>
              <div class="school-code">Code: ${eh(s.code)}</div>
              <div class="school-admin"><span class="material-symbols-outlined" style="font-size:14px;">person</span> ${eh(s.principal_name || 'No principal')}</div>
            </div>
            <span class="status-badge ${s.status === 'active' ? 'status-active' : 'status-suspended'}">${eh(s.status)}</span>
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
