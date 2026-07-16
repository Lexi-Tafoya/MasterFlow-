(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI || {};
  if (!Store || document.body.dataset.page !== "admin-migration") return;
  const esc = (v) => (UI.escapeHtml ? UI.escapeHtml(String(v == null ? "" : v)) : String(v == null ? "" : v));

  const role = Store.getRole();
  const persona = window.localStorage.getItem("masterflowServicePersona") === "member" ? "member" : "manager";
  // Only Enterprise Administrators and Queue Managers may see the transition report.
  if (role === "requester" || (role === "receiver" && persona === "member")) {
    window.sessionStorage.setItem("masterflowFlash", "ServiceNow Transition is available to Queue Managers and Administrators.");
    window.location.replace(role === "receiver" ? "assigned-work.html" : "index.html");
    return;
  }
  const isEnterprise = role === "admin";
  const OWNED = ["IT Help Desk", "IT Information", "Business Enablement - Systems Intake"];
  const inScope = (queue) => isEnterprise || OWNED.includes(queue);
  const badge = (label) => {
    const map = { "Ready": "badge-green", "Reconciled": "badge-green", "Migrated": "badge-green", "In progress": "badge-blue", "Validating": "badge-blue", "Validation required": "badge-amber", "Needs mapping": "badge-amber", "Mapping required": "badge-amber", "Warning": "badge-amber", "Blocked": "badge-red" };
    return `<span class="badge ${map[label] || "badge-gray"}">${esc(label)}</span>`;
  };

  /* ---------- modeled prototype data ---------- */
  const QUEUES = [
    { queue: "IT Help Desk", manager: "Taylor Morgan", sn: 640, open: 38, hist: 602, mapped: 610, remaining: 30, catMap: 100, userMap: 98, slaMap: 100, validation: "Validating", readiness: "In progress", nextAction: "Resolve 1 inactive owner" },
    { queue: "IT Information", manager: "Taylor Morgan", sn: 410, open: 22, hist: 388, mapped: 410, remaining: 0, catMap: 100, userMap: 100, slaMap: 100, validation: "Reconciled", readiness: "Ready", nextAction: "None — ready for next wave" },
    { queue: "Business Enablement - Systems Intake", manager: "Priya Shah", sn: 260, open: 26, hist: 234, mapped: 240, remaining: 20, catMap: 92, userMap: 100, slaMap: 100, validation: "Validation required", readiness: "Needs mapping", nextAction: "Map 2 intake subcategories" },
    { queue: "Facilities", manager: "Marcus Reed", sn: 320, open: 17, hist: 303, mapped: 300, remaining: 20, catMap: 88, userMap: 96, slaMap: 90, validation: "Validation required", readiness: "Needs mapping", nextAction: "Confirm SLA mapping for Facilities" },
    { queue: "Warehouse Systems / On-call", manager: "On-call rotation", sn: 150, open: 9, hist: 141, mapped: 120, remaining: 30, catMap: 80, userMap: 90, slaMap: 100, validation: "Blocked", readiness: "Blocked", nextAction: "Approve Phoenix Stock Check queue ownership" },
    { queue: "Quality - Warehouse", manager: "Unassigned", sn: 96, open: 5, hist: 91, mapped: 60, remaining: 36, catMap: 70, userMap: 85, slaMap: 80, validation: "Needs mapping", readiness: "Needs mapping", nextAction: "Assign a Queue Manager" }
  ];

  const OBJECT_TYPES = [
    { type: "Open tickets", discovered: 117, mapped: 117, migrated: 0, validated: 110, remaining: 117, warnings: 4, blocking: 1, owner: "Queue Managers", qm: true },
    { type: "Historical tickets", discovered: 1759, mapped: 1747, migrated: 0, validated: 1720, remaining: 1759, warnings: 12, blocking: 0, owner: "Enterprise Admin", qm: true },
    { type: "Users", discovered: 486, mapped: 483, migrated: 0, validated: 480, remaining: 486, warnings: 0, blocking: 3, owner: "Enterprise Admin", qm: false },
    { type: "Groups & queues", discovered: 22, mapped: 20, migrated: 0, validated: 20, remaining: 22, warnings: 0, blocking: 0, owner: "Enterprise Admin", qm: true },
    { type: "Knowledge articles", discovered: 54, mapped: 54, migrated: 0, validated: 54, remaining: 54, warnings: 0, blocking: 0, owner: "Queue Managers", qm: true },
    { type: "Categories & subcategories", discovered: 41, mapped: 37, migrated: 0, validated: 37, remaining: 41, warnings: 0, blocking: 0, owner: "Queue Managers", qm: true },
    { type: "Attachments", discovered: 903, mapped: 903, migrated: 0, validated: 898, remaining: 903, warnings: 5, blocking: 0, owner: "Enterprise Admin", qm: false },
    { type: "Comments & work notes", discovered: 6120, mapped: 6120, migrated: 0, validated: 6120, remaining: 6120, warnings: 0, blocking: 0, owner: "Enterprise Admin", qm: false },
    { type: "Approvals", discovered: 74, mapped: 72, migrated: 0, validated: 72, remaining: 74, warnings: 2, blocking: 0, owner: "Enterprise Admin", qm: false },
    { type: "SLA records", discovered: 240, mapped: 234, migrated: 0, validated: 234, remaining: 240, warnings: 0, blocking: 0, owner: "Enterprise Admin", qm: false }
  ];

  const SN_TICKETS = [
    { number: "INC0012345", desc: "Label printer offline at Pack Station 14", requester: "Marcus Reed", dept: "Packaging", group: "IT Help Desk", assignee: "Jordan Kim", status: "In progress", priority: "P3", age: "4d", sla: "On track", propCat: "Report an issue to Help Desk", propQueue: "IT Help Desk", owner: "Jordan Kim", confidence: 96, wave: "Wave 3", mig: "Ready", validation: "Passed" },
    { number: "REQ0009981", desc: "New scanner for Receiving Line 2", requester: "Priya Nair", dept: "Receiving", group: "IT Information", assignee: "Casey Rivera", status: "New", priority: "P4", age: "1d", sla: "On track", propCat: "New IT Hardware Request", propQueue: "IT Information", owner: "Casey Rivera", confidence: 94, wave: "Wave 3", mig: "Ready", validation: "Passed" },
    { number: "INC0012410", desc: "Cannot connect to shared drive", requester: "Devon Brooks", dept: "IT", group: "IT Help Desk", assignee: "Jordan Kim", status: "On hold", priority: "P3", age: "6d", sla: "At risk", propCat: "Report an issue to Help Desk", propQueue: "IT Help Desk", owner: "Jordan Kim", confidence: 91, wave: "Wave 3", mig: "Validating", validation: "Warning" },
    { number: "CHG0004412", desc: "Approve new label template rollout", requester: "Taylor Morgan", dept: "IT", group: "IT Information", assignee: "Taylor Morgan", status: "Awaiting approval", priority: "P3", age: "3d", sla: "On track", propCat: "New IT Hardware Request", propQueue: "IT Information", owner: "Taylor Morgan", confidence: 82, wave: "Wave 3", mig: "Mapping required", validation: "Warning" },
    { number: "REQ0009720", desc: "Access to shared Sales folder", requester: "Sam Patel", dept: "Sales", group: "Business Enablement - Systems Intake", assignee: "Priya Shah", status: "New", priority: "P4", age: "2d", sla: "On track", propCat: "Systems Intake", propQueue: "Business Enablement - Systems Intake", owner: "Priya Shah", confidence: 88, wave: "Wave 3", mig: "Mapping required", validation: "Warning" },
    { number: "INC0012501", desc: "HVAC too warm near Shipping", requester: "Alex Nguyen", dept: "Shipping", group: "Facilities", assignee: "Marcus Reed", status: "In progress", priority: "P3", age: "1d", sla: "On track", propCat: "HVAC", propQueue: "Facilities", owner: "Marcus Reed", confidence: 90, wave: "Wave 3", mig: "Validating", validation: "Passed" },
    { number: "INC0012333", desc: "Forklift 3 will not lift — out of service", requester: "R. Alvarez", dept: "Warehouse", group: "Facilities", assignee: "Marcus Reed", status: "In progress", priority: "P2", age: "2d", sla: "At risk", propCat: "Equipment Out of Service", propQueue: "Facilities", owner: "Marcus Reed", confidence: 93, wave: "Wave 3", mig: "Validating", validation: "Passed" },
    { number: "INC0012118", desc: "Stock check date code for part 12345", requester: "Jamie Cole", dept: "Quality", group: "Quality - Warehouse", assignee: "Unassigned", status: "New", priority: "P4", age: "5d", sla: "At risk", propCat: "Stock Check Phoenix", propQueue: "DC Connect - Phoenix", owner: "Unassigned", confidence: 61, wave: "Wave 3", mig: "Blocked", validation: "Blocking" },
    { number: "INC0011980", desc: "Old laptop replacement (resolved)", requester: "Chris Doyle", dept: "IT", group: "IT Information", assignee: "Casey Rivera", status: "Resolved", priority: "P4", age: "40d", sla: "Met", propCat: "New IT Hardware Request", propQueue: "IT Information", owner: "Casey Rivera", confidence: 95, wave: "Wave 4", mig: "Migrated", validation: "Passed" }
  ];

  const FIELD_MAP = [
    ["sys_id", "Legacy ServiceNow ID", "Preserved as legacyReference.sysId", "Required", "Mapped"],
    ["number", "Legacy ServiceNow number", "Preserved (e.g., INC0012345)", "Required", "Mapped"],
    ["short_description", "Request title", "Trim & clean", "Required", "Mapped"],
    ["description", "Request description", "Passthrough", "Required", "Mapped"],
    ["caller_id", "Requester + profile", "Match on email → Users", "Required", "3 unmatched"],
    ["assignment_group", "Queue", "Group → queue lookup", "Required", "2 → Enterprise Triage"],
    ["assigned_to", "Assigned Service Team Member", "Match on email → employee", "Optional", "Mapped"],
    ["category / subcategory", "Request category / subtype", "Catalog mapping table", "Required", "37 / 41 mapped"],
    ["priority (1–5)", "Priority (P1–P4)", "Severity map", "Required", "Mapped"],
    ["state", "Status", "New / In progress / On hold / Resolved / Closed", "Required", "Mapped"],
    ["opened_at / closed_at", "Created / closed date", "Parse to ISO · UTC (elapsed time preserved)", "Required", "Mapped"],
    ["comments / work_notes", "Shared timeline / internal notes", "Split requester-visible vs internal", "Required", "Mapped"],
    ["watch_list", "Followers", "Match on email → employees", "Optional", "Mapped"],
    ["task_sla", "SLA history", "Response & resolution hours (elapsed preserved)", "Required", "Mapped"],
    ["approvers", "Approval history", "Approver → MasterFlow approver", "Optional", "Confirm owners"],
    ["attachments", "Attachments", "Binary transfer + checksum validate", "Optional", "898 / 903 validated"]
  ];

  const WAVES = [
    { n: 0, name: "Discovery & preparation", state: "complete" },
    { n: 1, name: "Users, groups, queues, permissions", state: "complete" },
    { n: 2, name: "Knowledge articles & configuration", state: "complete" },
    { n: 3, name: "Open tickets", state: "current" },
    { n: 4, name: "Historical tickets", state: "upcoming" },
    { n: 5, name: "Delta sync & cutover", state: "upcoming" },
    { n: 6, name: "Stabilization & archive", state: "upcoming" }
  ];

  const ACTIONS = [
    { issue: "Map 2 remaining intake subcategories", queue: "Business Enablement - Systems Intake", severity: "Medium", records: 2, owner: "Priya Shah", wave: "Wave 3", recommended: "Add destination templates for the two unmapped subcategories.", status: "Open" },
    { issue: "Resolve 1 inactive user assignment", queue: "IT Help Desk", severity: "Medium", records: 1, owner: "Taylor Morgan", wave: "Wave 3", recommended: "Reassign the ticket to an active owner before import.", status: "Open" },
    { issue: "Confirm SLA mapping for Facilities", queue: "Facilities", severity: "Medium", records: 12, owner: "Marcus Reed", wave: "Wave 3", recommended: "Confirm response/resolution hours for Facilities SLAs.", status: "Open" },
    { issue: "Approve Phoenix Stock Check queue ownership", queue: "Warehouse Systems / On-call", severity: "High", records: 1, owner: "Enterprise Admin", wave: "Wave 3", recommended: "Assign a Queue Manager so Stock Check tickets have a destination owner.", status: "Blocked" },
    { issue: "Resolve 3 users missing an email address", queue: "Enterprise", severity: "High", records: 3, owner: "Enterprise Admin", wave: "Wave 1", recommended: "Manually match the 3 users to active employees before cutover.", status: "Open" },
    { issue: "Review 14 historical tickets with missing categories", queue: "Enterprise", severity: "Low", records: 14, owner: "Enterprise Admin", wave: "Wave 4", recommended: "Bulk-assign a default archived category; no destination template needed.", status: "Open" }
  ];

  /* ---------- render ---------- */
  function scopedQueues() { return QUEUES.filter((q) => inScope(q.queue)); }
  function scopedTickets() { return SN_TICKETS.filter((t) => inScope(t.propQueue) || inScope(t.group)); }
  function scopedActions() { return ACTIONS.filter((a) => isEnterprise || (a.queue !== "Enterprise" && inScope(a.queue))); }
  function scopedObjects() { return isEnterprise ? OBJECT_TYPES : OBJECT_TYPES.filter((o) => o.qm); }

  function renderHeader() {
    document.getElementById("transitionRoleBadge").textContent = isEnterprise ? "Enterprise view" : "Queue Manager view";
    document.getElementById("transitionScope").textContent = isEnterprise
      ? "Company-wide transition status — what has moved, what remains in ServiceNow, what is blocked, and what happens next."
      : "Transition status for the queues you manage — your tickets, mapping, blockers, and required actions.";
    document.getElementById("remainsScopeBadge").textContent = isEnterprise ? "All object types" : "Your queues' data";
    document.getElementById("queueScopeNote").textContent = isEnterprise
      ? "Readiness for each queue: ticket counts, mapping completeness, validation, blockers, and the next required action."
      : "Readiness for the queues you manage.";
  }

  function renderKpis() {
    const qs = scopedQueues();
    const sn = qs.reduce((s, q) => s + q.sn, 0);
    const remaining = qs.reduce((s, q) => s + q.remaining, 0);
    const blocked = scopedActions().filter((a) => a.status === "Blocked").length + qs.filter((q) => q.readiness === "Blocked").length;
    const readyQ = qs.filter((q) => q.readiness === "Ready").length;
    const cards = [
      ["Records identified", sn.toLocaleString(), isEnterprise ? "Across all queues" : "In your queues"],
      ["Prepared / mapped", qs.reduce((s, q) => s + q.mapped, 0).toLocaleString(), "Ready to import"],
      ["Remaining in ServiceNow", remaining.toLocaleString(), "Not yet migrated"],
      ["Queues ready", `${readyQ} / ${qs.length}`, "Ready for the next wave"],
      ["Blocking issues", String(blocked), "Must resolve before cutover"],
      ["Current wave", "Wave 3", "Open tickets"]
    ];
    document.getElementById("transitionKpis").innerHTML = cards.map((c) => `<article class="kpi"><div class="kpi-label">${esc(c[0])}</div><div class="kpi-value">${esc(c[1])}</div><div class="kpi-meta">${esc(c[2])}</div></article>`).join("");
  }

  function renderRemains() {
    document.getElementById("remainsBody").innerHTML = scopedObjects().map((o) => `
      <tr>
        <td><strong>${esc(o.type)}</strong></td><td>${o.discovered.toLocaleString()}</td><td>${o.mapped.toLocaleString()}</td>
        <td>${o.migrated.toLocaleString()}</td><td>${o.validated.toLocaleString()}</td><td>${o.remaining.toLocaleString()}</td>
        <td>${o.warnings ? `<span class="badge badge-amber">${o.warnings}</span>` : "0"}</td>
        <td>${o.blocking ? `<span class="badge badge-red">${o.blocking}</span>` : "0"}</td>
        <td>${esc(o.owner)}</td>
      </tr>`).join("");
  }

  function renderQueues() {
    const filter = document.getElementById("queueFilter").value;
    let qs = scopedQueues();
    if (filter === "ready") qs = qs.filter((q) => q.readiness === "Ready");
    if (filter === "progress") qs = qs.filter((q) => q.readiness === "In progress");
    if (filter === "mapping") qs = qs.filter((q) => q.readiness === "Needs mapping");
    if (filter === "blocked") qs = qs.filter((q) => q.readiness === "Blocked");
    if (filter === "validation") qs = qs.filter((q) => q.validation === "Validation required");
    document.getElementById("queueStatusBody").innerHTML = qs.length ? qs.map((q) => `
      <tr>
        <td><strong>${esc(q.queue)}</strong></td><td>${esc(q.manager)}</td><td>${q.sn}</td><td>${q.open}</td><td>${q.hist}</td>
        <td>${q.mapped}</td><td>${q.remaining}</td><td>${q.catMap}%</td><td>${q.userMap}%</td><td>${q.slaMap}%</td>
        <td>${badge(q.validation)}</td><td>${badge(q.readiness)}</td><td>${esc(q.nextAction)}</td>
      </tr>`).join("") : '<tr><td colspan="13"><div class="empty-state">No queues match this filter.</div></td></tr>';
  }

  function renderTickets() {
    const q = (document.getElementById("snSearch").value || "").trim().toLowerCase();
    const sf = document.getElementById("snStatusFilter").value;
    let list = scopedTickets().filter((t) => {
      if (sf !== "all" && t.mig !== sf) return false;
      if (q) { const hay = `${t.number} ${t.desc} ${t.requester} ${t.dept} ${t.propCat} ${t.propQueue} ${t.group}`.toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
    document.getElementById("snTicketCount").textContent = `${list.length} shown`;
    document.getElementById("snTicketBody").innerHTML = list.length ? list.map((t) => `
      <tr>
        <td><strong>${esc(t.number)}</strong></td><td>${esc(t.desc)}</td><td>${esc(t.requester)}<div class="muted small">${esc(t.dept)}</div></td>
        <td>${esc(t.group)}</td><td>${esc(t.status)}</td><td>${esc(t.priority)}</td><td>${esc(t.age)}</td>
        <td>${esc(t.propCat)}</td><td>${esc(t.propQueue)}</td><td>${esc(t.owner)}</td>
        <td>${t.confidence}%</td><td>${esc(t.wave)}</td><td>${badge(t.mig)}</td>
      </tr>`).join("") : '<tr><td colspan="13"><div class="empty-state">No ServiceNow tickets match your search.</div></td></tr>';
  }

  function renderFieldMap() {
    document.getElementById("fieldMapBody").innerHTML = FIELD_MAP.map((r) => {
      const status = r[4];
      const cls = /mapped/i.test(status) && !/\//.test(status) ? "badge-green" : /unmatched|confirm|triage|\//i.test(status) ? "badge-amber" : "badge-gray";
      return `<tr><td class="map-from">${esc(r[0])}</td><td class="map-to">${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td><span class="badge ${cls}">${esc(status)}</span></td></tr>`;
    }).join("");
  }

  function renderReconcile() {
    const qs = scopedQueues();
    const source = qs.reduce((s, q) => s + q.sn, 0);
    const imported = qs.reduce((s, q) => s + q.mapped, 0);
    const failed = scopedActions().filter((a) => a.severity === "High").reduce((s, a) => s + a.records, 0);
    const warnings = scopedObjects().reduce((s, o) => s + o.warnings, 0);
    const matching = imported - failed;
    const pct = source ? Math.round((matching / source) * 1000) / 10 : 0;
    document.getElementById("reconBar").style.width = pct + "%";
    document.getElementById("reconLegend").innerHTML = `
      <span>Source <b>${source.toLocaleString()}</b></span>
      <span style="color:var(--good,#15803d)">Matching <b>${matching.toLocaleString()}</b></span>
      <span style="color:#b45309">Warnings <b>${warnings}</b></span>
      <span style="color:var(--danger,#b91c1c)">Failed <b>${failed}</b></span>
      <span>Reconciled <b>${pct}%</b></span>`;
    document.getElementById("reconNotes").innerHTML = [
      '<li><span class="badge badge-amber">Warning</span> Historical tickets referencing a group with no MasterFlow queue are routed to Enterprise Triage for one-time review.</li>',
      '<li><span class="badge badge-red">Blocking</span> Records that fail validation are quarantined in an exception state for review — they are never dropped or hidden.</li>',
      '<li><span class="badge badge-green">Preserved</span> Every imported ticket keeps its ServiceNow legacy reference, original dates, and SLA elapsed time.</li>'
    ].join("");
  }

  function renderWaves() {
    document.getElementById("wavesBody").innerHTML = WAVES.map((w) => `
      <div class="wave-row wave-${w.state}">
        <span class="wave-dot">${w.state === "complete" ? "✓" : w.n}</span>
        <div><strong>Wave ${w.n} — ${esc(w.name)}</strong>
        <span class="wave-state">${w.state === "current" ? "Current wave" : w.state === "complete" ? "Complete" : "Upcoming"}</span></div>
      </div>`).join("");
  }

  function renderActions() {
    const actions = scopedActions();
    document.getElementById("actionCount").textContent = `${actions.filter((a) => a.status !== "Done").length} open`;
    document.getElementById("actionBody").innerHTML = actions.length ? actions.map((a) => `
      <article class="action-item action-${a.severity.toLowerCase()}">
        <div>
          <strong>${esc(a.issue)}</strong>
          <p class="muted">${esc(a.queue)} · ${a.records} record${a.records === 1 ? "" : "s"} · owner: ${esc(a.owner)} · ${esc(a.wave)}</p>
          <p class="action-rec">${esc(a.recommended)}</p>
        </div>
        <div class="action-tags">${badge(a.severity === "High" ? "Blocked" : a.severity === "Medium" ? "Warning" : "Ready")}<span class="badge badge-gray">${esc(a.status)}</span></div>
      </article>`).join("") : '<div class="notice notice-success"><div><strong>No open actions</strong><p>Your queues have no outstanding transition actions.</p></div></div>';
  }

  function renderAll() {
    renderHeader(); renderKpis(); renderRemains(); renderQueues(); renderTickets(); renderFieldMap(); renderReconcile(); renderWaves(); renderActions();
  }

  document.getElementById("queueFilter").addEventListener("change", renderQueues);
  document.getElementById("snSearch").addEventListener("input", renderTickets);
  document.getElementById("snStatusFilter").addEventListener("change", renderTickets);
  renderAll();
})();
