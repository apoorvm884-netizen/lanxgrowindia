export async function render(main) {
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
            const eh = AppUtils.escapeHtml;
            return `<tr style="cursor:pointer;" data-action="navigate" data-route="content-manager">
              <td><div style="display:flex;align-items:center;gap:8px;"><span class="material-symbols-outlined" style="font-size:16px;color:var(--text-muted);">${typeIcon[c.type] || 'insert_drive_file'}</span><span class="font-semibold">${eh(c.name)}</span></div></td>
              <td><span class="status-badge" style="background:var(--primary-subtle);color:var(--primary);">${eh(c.type)}</span></td>
              <td><span class="status-badge ${c.status === 'published' ? 'status-active' : c.status === 'draft' ? 'status-suspended' : 'status-pending'}">${eh(c.status)}</span></td>
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
            const eh = AppUtils.escapeHtml;
            const userName = eh(profileMap[l.created_by]?.name || 'System');
            return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
              <div style="width:8px;height:8px;border-radius:50%;background:${actionColors[l.action] || '#94a3b8'};margin-top:6px;flex-shrink:0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:500;color:var(--on-surface);">${userName}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${eh(l.action)} ${eh(l.entity)} — ${eh(l.entity_name)}</div>
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
}
