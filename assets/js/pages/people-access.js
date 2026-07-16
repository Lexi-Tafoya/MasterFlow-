(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const Templates = window.MasterFlowTemplates;
  const UI = window.MasterFlowUI || {};
  if (!Store || document.body.dataset.page !== "admin") return;
  const esc = (v) => (UI.escapeHtml ? UI.escapeHtml(String(v == null ? "" : v)) : String(v == null ? "" : v));

  const QUEUES = ["IT Help Desk", "IT Information", "Business Enablement - Systems Intake", "Facilities", "Warehouse Systems / On-call"];
  const CATEGORIES = (Templates && Templates.getAll ? Templates.getAll() : []).filter((t) => t.id !== "general-triage").map((t) => t.name);

  const els = {
    search: document.getElementById("paSearch"),
    dir: document.getElementById("paDirectory"),
    requests: document.getElementById("paRequests"),
    reqCount: document.getElementById("paRequestCount"),
    audit: document.getElementById("paAudit"),
    profile: document.getElementById("accessProfileDialog"),
    reqDialog: document.getElementById("accessRequestDialog")
  };
  if (!els.dir) return;
  let editingId = null;
  let activeReqId = null;

  function fmtDate(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  }

  /* ---------- directory ---------- */
  function renderDirectory() {
    const q = (els.search.value || "").trim().toLowerCase();
    const list = Store.getEmployees().filter((e) => {
      if (!q) return true;
      const hay = `${e.name} ${e.email} ${e.employeeId} ${e.department} ${e.team} ${e.site} ${e.role} ${(e.queues || []).join(" ")} ${(e.ownedCategories || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
    els.dir.innerHTML = list.length ? list.map((e) => `
      <article class="pa-person" data-emp="${esc(e.id)}">
        <div>
          <strong>${esc(e.name)}</strong> ${e.active ? "" : '<span class="badge badge-gray">Inactive</span>'}
          <p class="muted">${esc(e.role)} · ${esc(e.department)} / ${esc(e.team)} · ${esc(e.site)}</p>
          <p class="pa-person-scope">${(e.managerQueues && e.managerQueues.length ? "Manages: " + e.managerQueues.join(", ") + " · " : "")}${(e.queues || []).length ? "Works: " + e.queues.join(", ") : "No queue access"}</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" data-open-emp="${esc(e.id)}">Manage access</button>
      </article>`).join("") : '<div class="empty-state">No employees match your search.</div>';
  }

  /* ---------- profile editor ---------- */
  function emp(id) { return Store.getEmployees().find((e) => e.id === id); }

  function checkList(containerId, options, selected) {
    document.getElementById(containerId).innerHTML = options.map((o) =>
      `<label class="pa-check"><input type="checkbox" value="${esc(o)}" ${selected.includes(o) ? "checked" : ""}> ${esc(o)}</label>`).join("");
  }
  function readChecks(containerId) {
    return [...document.querySelectorAll(`#${containerId} input:checked`)].map((i) => i.value);
  }

  function openProfile(id) {
    const e = emp(id);
    if (!e) return;
    editingId = id;
    document.getElementById("paProfileTitle").textContent = e.name + (e.active ? "" : " (inactive)");
    document.getElementById("paProfileMeta").textContent = `${e.employeeId} · ${e.email}`;
    document.getElementById("paProfileFacts").innerHTML = [
      ["Department", e.department], ["Team", e.team], ["Manager", e.manager], ["Site", e.site], ["Current role", e.role]
    ].map((r) => `<div class="pa-kv"><small>${esc(r[0])}</small><span>${esc(r[1])}</span></div>`).join("");
    document.getElementById("paRolePreset").value = e.role;
    checkList("paQueues", QUEUES, e.queues || []);
    checkList("paCategories", CATEGORIES, e.ownedCategories || []);
    checkList("paManagerQueues", QUEUES, e.managerQueues || []);
    document.getElementById("paFlowStudio").checked = !!e.flowStudio;
    document.getElementById("paAssignmentRules").checked = !!e.assignmentRules;
    document.getElementById("paReporting").checked = !!e.reporting;
    document.getElementById("paAdmin").checked = !!e.admin;
    document.getElementById("paReason").value = "";
    updateEffective();
    if (typeof els.profile.showModal === "function") els.profile.showModal(); else els.profile.setAttribute("open", "");
  }

  function gather() {
    return {
      role: document.getElementById("paRolePreset").value,
      queues: readChecks("paQueues"),
      ownedCategories: readChecks("paCategories"),
      managerQueues: readChecks("paManagerQueues"),
      flowStudio: document.getElementById("paFlowStudio").checked,
      assignmentRules: document.getElementById("paAssignmentRules").checked,
      reporting: document.getElementById("paReporting").checked,
      admin: document.getElementById("paAdmin").checked
    };
  }

  function validate(patch) {
    const blockers = [];
    const warnings = [];
    if ((patch.managerQueues.length || patch.flowStudio || patch.assignmentRules) && patch.role === "Service Team Member" && !patch.admin) {
      warnings.push("This person has manager-level authority but the Service Team Member role. Consider the Queue Manager preset.");
    }
    if (patch.flowStudio && !patch.ownedCategories.length) blockers.push("Flow Studio editing requires at least one owned request category.");
    if (patch.assignmentRules && !patch.managerQueues.length) blockers.push("Assignment-rule management requires at least one managed queue.");
    if (patch.role === "Queue Manager" && !patch.managerQueues.length && !patch.admin) blockers.push("Queue Manager authority requires at least one managed queue.");
    // Do not remove the last active Enterprise Administrator.
    const admins = Store.getEmployees().filter((x) => x.admin && x.active);
    const wasAdmin = (emp(editingId) || {}).admin;
    if (wasAdmin && !patch.admin && admins.length <= 1) blockers.push("You cannot remove the last active Enterprise Administrator without a replacement.");
    const e = emp(editingId);
    if (e && !e.active) warnings.push("This employee is marked inactive. Confirm they still need access.");
    return { blockers, warnings };
  }

  function updateEffective() {
    const p = gather();
    const v = validate(p);
    const rows = [];
    rows.push(`<div class="pa-eff-row"><small>Global role</small><span>${esc(p.role)}</span></div>`);
    rows.push(`<div class="pa-eff-row"><small>Works tickets in</small><span>${esc(p.queues.join(", ") || "—")}</span></div>`);
    rows.push(`<div class="pa-eff-row"><small>Owned categories</small><span>${esc(p.ownedCategories.join(", ") || "—")}</span></div>`);
    rows.push(`<div class="pa-eff-row"><small>Manages queues</small><span>${esc(p.managerQueues.join(", ") || "—")}</span></div>`);
    const extra = [p.flowStudio ? "Flow Studio edit/publish" : "", p.assignmentRules ? "Assignment rules" : "", p.reporting ? "Queue reporting" : "", p.admin ? "Enterprise Administrator" : ""].filter(Boolean);
    rows.push(`<div class="pa-eff-row"><small>Additional authority</small><span>${esc(extra.join(", ") || "—")}</span></div>`);
    document.getElementById("paEffectiveBody").innerHTML = rows.join("");
    const warn = document.getElementById("paWarn");
    const msgs = v.blockers.map((b) => `<div class="pa-warn-block">⛔ ${esc(b)}</div>`).concat(v.warnings.map((w) => `<div class="pa-warn-warn">⚠ ${esc(w)}</div>`));
    warn.hidden = !msgs.length;
    warn.innerHTML = msgs.join("");
    document.getElementById("paSave").disabled = v.blockers.length > 0;
    return v;
  }

  function applyPreset(role) {
    if (role === "Enterprise Administrator") {
      document.getElementById("paAdmin").checked = true;
      document.getElementById("paReporting").checked = true;
    } else if (role === "Queue Manager") {
      document.getElementById("paAdmin").checked = false;
      document.getElementById("paFlowStudio").checked = true;
      document.getElementById("paAssignmentRules").checked = true;
      document.getElementById("paReporting").checked = true;
      // default manager queues to the queues they work
      const work = readChecks("paQueues");
      checkList("paManagerQueues", QUEUES, work.length ? work : []);
    } else {
      document.getElementById("paAdmin").checked = false;
      document.getElementById("paFlowStudio").checked = false;
      document.getElementById("paAssignmentRules").checked = false;
      document.getElementById("paReporting").checked = false;
      checkList("paManagerQueues", QUEUES, []);
    }
    updateEffective();
  }

  function saveProfile() {
    const p = gather();
    const v = updateEffective();
    if (v.blockers.length) return;
    const reason = document.getElementById("paReason").value.trim();
    if (reason.length < 4) { document.getElementById("paReason").focus(); UI.showToast && UI.showToast("Add a reason for the audit trail."); return; }
    if (p.admin && !(emp(editingId) || {}).admin) {
      if (!window.confirm("Grant company-wide Enterprise Administrator access? This is a high-privilege change.")) return;
    }
    const res = Store.updateEmployeeAccess(editingId, p, reason, `Access updated to ${p.role}`);
    if (!res.ok) { UI.showToast && UI.showToast(res.message); return; }
    closeDialog(els.profile);
    renderAll();
  }

  /* ---------- access requests ---------- */
  function renderRequests() {
    const reqs = Store.getAccessRequests();
    const pending = reqs.filter((r) => r.status === "pending");
    els.reqCount.textContent = `${pending.length} pending`;
    els.requests.innerHTML = reqs.length ? reqs.map((r) => `
      <article class="pa-request" data-req="${esc(r.id)}">
        <div>
          <strong>${esc(r.employeeName)}</strong> — ${esc(r.requested)}
          <p class="muted">${esc(r.queue || "")} · reason: ${esc(r.reason)} · requested by ${esc(r.requestedBy)} · ${esc(fmtDate(r.submittedAt))}</p>
          <span class="badge ${r.risk === "Medium" ? "badge-amber" : r.risk === "High" ? "badge-red" : "badge-gray"}">${esc(r.risk)} risk</span>
          <span class="badge ${r.status === "pending" ? "badge-amber" : r.status === "approved" ? "badge-green" : "badge-gray"}">${esc(r.status)}</span>
        </div>
        ${r.status === "pending" ? `<button class="btn btn-secondary btn-sm" type="button" data-open-req="${esc(r.id)}">Review</button>` : `<span class="muted small">${esc(r.decidedBy || "")}</span>`}
      </article>`).join("") : '<div class="notice notice-success"><div><strong>No access requests</strong><p>Requests from managers appear here for review.</p></div></div>';
  }

  function openRequest(id) {
    const r = Store.getAccessRequests().find((x) => x.id === id);
    if (!r) return;
    activeReqId = id;
    document.getElementById("paReqTitle").textContent = r.requested;
    document.getElementById("paReqMeta").textContent = `${r.employeeName} · ${r.risk} risk`;
    document.getElementById("paReqFacts").innerHTML = [
      ["Employee", r.employeeName], ["Requested access", r.requested], ["Queue / category", `${r.queue || "—"}${r.categories && r.categories.length ? " · " + r.categories.join(", ") : ""}`],
      ["Business reason", r.reason], ["Requested by", r.requestedBy], ["Manager", r.manager], ["Submitted", fmtDate(r.submittedAt)]
    ].map((row) => `<div class="pa-kv"><small>${esc(row[0])}</small><span>${esc(row[1])}</span></div>`).join("");
    document.getElementById("paReqNote").value = "";
    if (typeof els.reqDialog.showModal === "function") els.reqDialog.showModal(); else els.reqDialog.setAttribute("open", "");
  }

  function patchForRequest(r) {
    const e = Store.getEmployees().find((x) => x.id === r.employeeId) || {};
    const patch = {};
    if (/queue manager/i.test(r.requested)) {
      patch.role = "Queue Manager";
      patch.managerQueues = Array.from(new Set([].concat(e.managerQueues || [], r.queue ? [r.queue] : [])));
      patch.queues = Array.from(new Set([].concat(e.queues || [], r.queue ? [r.queue] : [])));
      patch.ownedCategories = Array.from(new Set([].concat(e.ownedCategories || [], r.categories || [])));
      patch.flowStudio = true; patch.assignmentRules = true; patch.reporting = true;
    } else {
      // work access
      patch.queues = Array.from(new Set([].concat(e.queues || [], r.queue ? [r.queue] : [])));
      patch.ownedCategories = Array.from(new Set([].concat(e.ownedCategories || [], r.categories || [])));
    }
    return patch;
  }

  function decideRequest(decision) {
    const r = Store.getAccessRequests().find((x) => x.id === activeReqId);
    if (!r) return;
    const note = document.getElementById("paReqNote").value.trim();
    if (decision !== "approved" && note.length < 4) { document.getElementById("paReqNote").focus(); UI.showToast && UI.showToast("Add a note to reject or modify."); return; }
    const patch = decision === "approved" ? patchForRequest(r) : null;
    Store.decideAccessRequest(activeReqId, decision === "rejected" ? "rejected" : "approved", note, patch);
    closeDialog(els.reqDialog);
    renderAll();
  }

  /* ---------- audit ---------- */
  function renderAudit() {
    const audit = Store.getAccessAudit();
    els.audit.innerHTML = audit.length ? audit.slice(0, 8).map((a) => `
      <div class="pa-audit-row">
        <div><strong>${esc(a.employeeName)}</strong> — ${esc(a.change)}${a.scope && a.scope !== "—" ? " (" + esc(a.scope) + ")" : ""}
        <p class="muted">${esc(a.by)} · ${esc(fmtDate(a.at))} · ${esc(a.reason)}</p></div>
      </div>`).join("") : '<div class="empty-state">No access changes recorded yet.</div>';
  }

  function renderAttention() {
    const grid = document.getElementById("attentionGrid");
    if (!grid) return;
    const tickets = Store.getState().tickets;
    const CLOSED = ["Resolved", "Closed", "Closed — No Action", "Cancelled", "Rejected"];
    const open = tickets.filter((t) => !CLOSED.includes(t.status));
    const triage = open.filter((t) => t.queue === "Enterprise Triage");
    const now = Date.now();
    const mins = (t) => (new Date(t.slaDueAt).getTime() - now) / 60000;
    const triageRisk = triage.filter((t) => mins(t) <= 60).length;
    const slaExceptions = open.filter((t) => mins(t) < 0).length;
    const pendingReq = Store.getAccessRequests().filter((r) => r.status === "pending").length;
    const govChanges = Store.getAccessAudit().length;
    const costTickets = tickets.filter((t) => t.cost && t.cost.status && t.cost.status !== "none").length;
    const cards = [
      ["Enterprise Triage backlog", triage.length, "Awaiting a routing decision", "enterprise-triage.html", triage.length ? "warn" : "good"],
      ["Triage response-target risk", triageRisk, "Due or overdue within 1h", "enterprise-triage.html", triageRisk ? "warn" : "good"],
      ["Access requests", pendingReq, "Awaiting your review", "#accessRequestsCard", pendingReq ? "warn" : "good"],
      ["Company-wide SLA exceptions", slaExceptions, "Overdue across all queues", "reporting.html", slaExceptions ? "warn" : "good"],
      ["Recent access changes", govChanges, "Recorded in the audit log", "#peopleAccessSection", "good"],
      ["Tickets with recorded cost", costTickets, "View operational spend", "reporting.html", "good"]
    ];
    grid.innerHTML = cards.map((c) => `<a class="attention-card ${c[4]}" href="${c[3]}"><small>${esc(c[0])}</small><strong>${esc(c[1])}</strong><span>${esc(c[2])}</span></a>`).join("");
  }

  function closeDialog(d) { if (d.open) d.close(); else d.removeAttribute("open"); }
  function renderAll() { renderAttention(); renderDirectory(); renderRequests(); renderAudit(); }

  /* ---------- events ---------- */
  els.search.addEventListener("input", renderDirectory);
  els.dir.addEventListener("click", (e) => { const b = e.target.closest("[data-open-emp]"); if (b) openProfile(b.getAttribute("data-open-emp")); });
  els.requests.addEventListener("click", (e) => { const b = e.target.closest("[data-open-req]"); if (b) openRequest(b.getAttribute("data-open-req")); });
  els.profile.querySelectorAll("[data-close-profile]").forEach((b) => b.addEventListener("click", () => closeDialog(els.profile)));
  els.reqDialog.querySelectorAll("[data-close-req]").forEach((b) => b.addEventListener("click", () => closeDialog(els.reqDialog)));
  document.getElementById("paRolePreset").addEventListener("change", (e) => applyPreset(e.target.value));
  ["paQueues", "paCategories", "paManagerQueues"].forEach((id) => document.getElementById(id).addEventListener("change", updateEffective));
  ["paFlowStudio", "paAssignmentRules", "paReporting", "paAdmin"].forEach((id) => document.getElementById(id).addEventListener("change", updateEffective));
  document.getElementById("paSave").addEventListener("click", saveProfile);
  document.getElementById("paReqApprove").addEventListener("click", () => decideRequest("approved"));
  document.getElementById("paReqReject").addEventListener("click", () => decideRequest("rejected"));
  document.getElementById("paReqModify").addEventListener("click", () => {
    // Modify & approve: approve then open the employee profile for adjustment.
    const r = Store.getAccessRequests().find((x) => x.id === activeReqId);
    decideRequest("approved");
    if (r) setTimeout(() => openProfile(r.employeeId), 50);
  });

  window.addEventListener("masterflow:state", renderAll);
  renderAll();
})();
