(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const Templates = window.MasterFlowTemplates;
  const UI = window.MasterFlowUI || {};
  if (!Store || document.body.dataset.page !== "enterprise-triage") return;

  const esc = (v) => (UI.escapeHtml ? UI.escapeHtml(String(v == null ? "" : v)) : String(v == null ? "" : v));
  const CLOSED = new Set(["Resolved", "Closed", "Closed — No Action", "Cancelled", "Rejected"]);
  const FEEDBACK_KEY = "masterflowFlowFeedbackV1";

  const els = {
    total: document.getElementById("triageTotal"),
    risk: document.getElementById("triageRisk"),
    oldest: document.getElementById("triageOldest"),
    conflicts: document.getElementById("triageConflicts"),
    visible: document.getElementById("triageVisibleCount"),
    search: document.getElementById("triageSearch"),
    filter: document.getElementById("triageFilter"),
    sort: document.getElementById("triageSort"),
    list: document.getElementById("triageList"),
    detail: document.getElementById("triageDetailDialog"),
    reroute: document.getElementById("rerouteDialog")
  };
  let activeId = null;
  let noteMode = "note";

  /* ---------- helpers ---------- */
  function triageTickets() {
    return Store.getState().tickets.filter((t) => t.queue === "Enterprise Triage" && !CLOSED.has(t.status));
  }
  function ageText(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return "—";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m`;
    const hrs = Math.round((mins / 60) * 10) / 10;
    if (hrs < 48) return `${hrs}h`;
    return `${Math.round((hrs / 24) * 10) / 10}d`;
  }
  function minutesToSla(t) {
    const due = new Date(t.slaDueAt).getTime();
    if (!Number.isFinite(due)) return Infinity;
    return Math.round((due - Date.now()) / 60000);
  }
  function slaLabel(t) {
    const m = minutesToSla(t);
    if (!Number.isFinite(m)) return "No response target set";
    if (m < 0) return `Overdue by ${Math.abs(m) < 60 ? Math.abs(m) + "m" : Math.ceil(Math.abs(m) / 60) + "h"}`;
    if (m <= 60) return `Response target in ${Math.max(1, m)}m`;
    if (m < 1440) return `Response target in ${Math.ceil(m / 60)}h`;
    return "On track";
  }
  function isWaiting(t) { return /waiting on requester/i.test(t.status || ""); }
  function isConflict(t) { return t.triage && t.triage.reasonType === "conflict"; }
  function confidence(t) { return Number(t.classificationConfidence) || 0; }
  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  }

  /* ---------- summary + list ---------- */
  function render() {
    const all = triageTickets();
    els.total.textContent = String(all.length);
    els.risk.textContent = String(all.filter((t) => minutesToSla(t) <= 60).length);
    els.conflicts.textContent = String(all.filter(isConflict).length);
    const oldest = all.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
    els.oldest.textContent = oldest ? ageText(oldest.createdAt) : "—";

    const q = (els.search.value || "").trim().toLowerCase();
    const filter = els.filter.value;
    const me = Store.CURRENT_USER.name;
    let list = all.filter((t) => {
      if (filter === "new" && t.status !== "Triage" && t.status !== "New") return false;
      if (filter === "unassigned" && t.assignee && t.assignee !== "Unassigned") return false;
      if (filter === "mine" && t.assignee !== me) return false;
      if (filter === "waiting" && !isWaiting(t)) return false;
      if (filter === "ready" && isWaiting(t)) return false;
      if (filter === "low-confidence" && !(t.triage && t.triage.reasonType === "low-confidence")) return false;
      if (filter === "conflict" && !isConflict(t)) return false;
      if (filter === "risk" && minutesToSla(t) > 60) return false;
      if (q) {
        const hay = `${t.number} ${t.title} ${t.requester} ${t.department} ${t.description} ${(t.details && t.details.originalText) || ""} ${(t.triage && t.triage.candidates || []).map((c) => c.category + " " + c.queue).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sort = els.sort.value;
    list.sort((a, b) => {
      if (sort === "confidence") return confidence(a) - confidence(b);
      if (sort === "impact") return (minutesToSla(a)) - (minutesToSla(b));
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    els.visible.textContent = `${list.length} shown`;
    els.list.innerHTML = list.length ? list.map(card).join("") : '<div class="empty-state">Nothing is waiting in Enterprise Triage. MasterFlow is routing requests confidently.</div>';
    renderSignals();
  }

  function renderSignals() {
    const recEl = document.getElementById("triageRecommendation");
    const listEl = document.getElementById("triageSignalList");
    if (!listEl) return;
    const signals = Store.getClassificationFeedback();

    // Recommend the category with the most unsent corrections (repeat pattern).
    const byCategory = {};
    signals.filter((s) => !s.sentToFlowStudio).forEach((s) => {
      byCategory[s.correctedCategory] = byCategory[s.correctedCategory] || { count: 0, queue: s.correctedQueue };
      byCategory[s.correctedCategory].count += 1;
    });
    const top = Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count)[0];
    if (top && top[1].count >= 2) {
      recEl.innerHTML = `
        <div class="triage-recommendation">
          <div>
            <strong>${top[1].count} requests were manually rerouted to ${esc(top[0])}.</strong>
            <p class="muted">Sending this pattern to the owning Queue Manager's Flow Studio recommends improving recognition for it — you never edit their template directly.</p>
          </div>
          <button class="btn btn-primary btn-sm" type="button" data-send-signal="${esc(top[0])}">Send to Flow Studio</button>
        </div>`;
    } else {
      recEl.innerHTML = "";
    }

    listEl.innerHTML = signals.length
      ? signals.slice(0, 8).map((s) => `
          <div class="improvement-signal">
            <div>
              <strong>"${esc(s.phrase)}"</strong>
              <p class="muted">${esc(s.originalCategory)} (${esc(s.originalConfidence)}%) → ${esc(s.correctedCategory)} · ${esc(s.by)} · ${esc(formatDate(s.at))}</p>
            </div>
            ${s.sentToFlowStudio ? '<span class="badge badge-green">Sent to Flow Studio</span>' : `<button class="btn btn-ghost btn-sm" type="button" data-send-signal="${esc(s.correctedCategory)}">Send</button>`}
          </div>`).join("")
      : '<div class="empty-state">No routing corrections yet. Rerouting a triage request records a classification signal here.</div>';
  }

  function sendSignalToFlowStudio(category) {
    const signals = Store.getClassificationFeedback().filter((s) => s.correctedCategory === category && !s.sentToFlowStudio);
    if (!signals.length) return;
    const queue = signals[0].correctedQueue;
    // Write a recommendation into the Queue Manager Flow Studio feedback store.
    let items = [];
    try { items = JSON.parse(window.localStorage.getItem(FEEDBACK_KEY) || "[]"); } catch (e) { items = []; }
    items.unshift({
      id: `feedback-triage-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      ticketId: "", templateId: "", queue,
      submittedBy: Store.CURRENT_USER.name,
      sourceRole: "queue-manager",
      issueType: "recognition",
      title: `Improve recognition for "${signals[0].phrase}"`,
      description: `${signals.length} request${signals.length === 1 ? "" : "s"} were manually rerouted from triage to ${category}. Consider adding recognition phrases or aliases so these route automatically.`,
      suggestedChange: `Add recognition phrases/aliases that map wording like "${signals[0].phrase}" to ${category}.`,
      evidence: { missingFields: [], phrase: signals[0].phrase, diagnosticId: "" },
      status: "new"
    });
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("masterflow:flow-feedback", { detail: items.slice() }));
    Store.markClassificationFeedbackSent(signals.map((s) => s.id));
    window.alert(`Sent to the ${queue} Queue Manager's Flow Studio as a recommendation.`);
    render();
  }

  function card(t) {
    const cand = (t.triage && t.triage.candidates) || [];
    const suggest = cand.slice(0, 2).map((c) => `<span class="triage-chip">${esc(c.category)} → ${esc(c.queue)} · ${esc(c.confidence)}%</span>`).join("");
    const risk = minutesToSla(t) <= 60;
    return `
      <article class="work-item triage-item${risk ? " is-risk" : ""}" data-triage="${esc(t.id)}">
        <div class="work-item-main">
          <div class="triage-item-head">
            <strong>${esc(t.number)} — ${esc(t.title)}</strong>
            <span class="badge ${isConflict(t) ? "badge-amber" : "badge-gray"}">${isConflict(t) ? "Conflicting routes" : "Low confidence " + confidence(t) + "%"}</span>
            ${isWaiting(t) ? '<span class="badge badge-blue">Waiting for requester</span>' : ""}
          </div>
          <p class="triage-item-reason">${esc(t.triage ? t.triage.reason : t.routingReason)}</p>
          <p class="triage-item-meta muted">${esc(t.requester)} · ${esc(t.department || "—")} · ${esc(t.location || "—")} · submitted ${esc(formatDate(t.createdAt))} · age ${esc(ageText(t.createdAt))}</p>
          ${suggest ? `<div class="triage-suggest">${suggest}</div>` : ""}
        </div>
        <div class="triage-item-actions">
          <span class="triage-sla ${risk ? "is-risk" : ""}">${esc(slaLabel(t))}</span>
          <button class="btn btn-secondary btn-sm" type="button" data-open-triage="${esc(t.id)}">Open</button>
        </div>
      </article>`;
  }

  /* ---------- detail ---------- */
  function ticket(id) { return Store.getState().tickets.find((t) => t.id === id); }

  function openDetail(id) {
    activeId = id;
    const t = ticket(id);
    if (!t) return;
    document.getElementById("triageStatusBadge").textContent = t.status;
    document.getElementById("triageReasonBadge").textContent = isConflict(t) ? "Conflicting routes" : "Low confidence";
    document.getElementById("triageConfidenceBadge").textContent = `Confidence ${confidence(t)}%`;
    document.getElementById("triageDetailTitle").textContent = `${t.number} — ${t.title}`;
    document.getElementById("triageDetailSubtitle").textContent = `${t.requester} · ${t.department || "—"} · submitted ${formatDate(t.createdAt)} (age ${ageText(t.createdAt)})`;
    document.getElementById("triageWhy").textContent = t.triage ? t.triage.reason : (t.routingReason || "Routing could not be confidently determined.");
    document.getElementById("triageOwner").textContent = (t.assignee && t.assignee !== "Unassigned") ? t.assignee : ((t.triage && t.triage.owner) || "Unassigned");
    document.getElementById("triageSla").textContent = slaLabel(t);
    document.getElementById("triageOriginal").textContent = (t.details && t.details.originalText) || t.description || "No original request text recorded.";

    const p = (t.details && t.details.employeeProfile) || {};
    document.getElementById("triageProfile").innerHTML = [
      ["Requester", t.requester],
      ["Department", p.department || t.department],
      ["Team", p.team], ["Site", p.site], ["Manager", p.manager],
      ["Location", t.location], ["Email", p.email], ["Phone", p.phone]
    ].filter((r) => r[1]).map((r) => `<div class="triage-kv"><small>${esc(r[0])}</small><span>${esc(r[1])}</span></div>`).join("");

    const cand = (t.triage && t.triage.candidates) || [];
    document.getElementById("triageCandidates").innerHTML = cand.length
      ? cand.map((c) => `<div class="triage-candidate"><div><strong>${esc(c.category)}</strong><small class="muted"> → ${esc(c.queue)}</small></div><span class="triage-conf">${esc(c.confidence)}%</span></div>`).join("")
      : '<p class="muted">No confident classification candidates were produced.</p>';

    const clar = (t.details && t.details.clarifications) || [];
    document.getElementById("triageClarifications").innerHTML = clar.length
      ? clar.map((c) => `<div class="triage-qa"><small>${esc(c.question)}</small><span>${esc(c.answer)}</span></div>`).join("")
      : '<p class="muted">No clarification answers were captured.</p>';

    const missing = (t.triage && t.triage.missingInfo) || [];
    document.getElementById("triageMissing").innerHTML = missing.length
      ? `<ul class="triage-missing">${missing.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
      : '<p class="muted">No outstanding information gaps were flagged.</p>';

    document.getElementById("triageTimeline").innerHTML = (t.history || []).slice().reverse().map((h) =>
      `<div class="receiver-timeline-item"><small>${esc(formatDate(h.at))}${h.type ? " · " + esc(h.type) : ""}</small><p>${esc(h.text)}</p></div>`).join("");

    hideNote();
    if (typeof els.detail.showModal === "function") els.detail.showModal(); else els.detail.setAttribute("open", "");
  }

  function hideNote() {
    document.getElementById("triageNoteField").hidden = true;
    document.getElementById("triageNoteText").value = "";
  }
  function showNote(mode, label, placeholder) {
    noteMode = mode;
    document.getElementById("triageNoteLabel").textContent = label;
    const ta = document.getElementById("triageNoteText");
    ta.placeholder = placeholder || "";
    document.getElementById("triageNoteField").hidden = false;
    ta.focus();
  }

  /* ---------- reroute ---------- */
  function buildDestinations() {
    const sel = document.getElementById("rerouteDestination");
    const options = Templates.getAll().filter((tpl) => tpl.id !== "general-triage").map((tpl) => {
      const category = `${tpl.catalog} / ${tpl.name}`;
      return `<option value="${esc(tpl.id)}" data-queue="${esc(tpl.queue)}" data-category="${esc(category)}" data-sla="${esc(tpl.responseSlaHours || tpl.resolutionSlaHours || 8)}">${esc(category)} → ${esc(tpl.queue)}</option>`;
    });
    sel.innerHTML = '<option value="">Choose the correct request type…</option>' + options.join("");
  }

  function openReroute() {
    const t = ticket(activeId);
    if (!t) return;
    buildDestinations();
    document.getElementById("rerouteDestination").value = "";
    document.getElementById("reroutePriority").value = "";
    document.getElementById("rerouteReasonPreset").value = "";
    document.getElementById("rerouteReason").value = "";
    document.getElementById("rerouteTeamNote").value = "";
    document.getElementById("rerouteRequesterNote").value = "";
    document.getElementById("reroutePreview").hidden = true;
    if (typeof els.reroute.showModal === "function") els.reroute.showModal(); else els.reroute.setAttribute("open", "");
  }
  function updatePreview() {
    const t = ticket(activeId);
    const sel = document.getElementById("rerouteDestination");
    const opt = sel.selectedOptions[0];
    const preview = document.getElementById("reroutePreview");
    if (!t || !opt || !opt.value) { preview.hidden = true; return; }
    const newPriority = document.getElementById("reroutePriority").value || t.priority;
    const rows = [
      ["Classification", t.category, opt.dataset.category],
      ["Queue", t.queue, opt.dataset.queue],
      ["Owner", (t.assignee && t.assignee !== "Unassigned") ? t.assignee : "Unassigned", "Set by destination assignment rules"],
      ["Priority", t.priority, newPriority],
      ["Response target", `${opt.dataset.sla}h from reroute`, `${opt.dataset.sla}h from reroute`]
    ];
    document.getElementById("rerouteDiff").innerHTML = rows.map((r) =>
      `<div class="reroute-diff-row"><small>${esc(r[0])}</small><span class="reroute-from">${esc(r[1])}</span><span class="reroute-arrow">→</span><span class="reroute-to">${esc(r[2])}</span></div>`).join("");
    preview.hidden = false;
  }
  function confirmReroute() {
    const t = ticket(activeId);
    const opt = document.getElementById("rerouteDestination").selectedOptions[0];
    const reason = document.getElementById("rerouteReason").value.trim();
    if (!t || !opt || !opt.value) { document.getElementById("rerouteDestination").focus(); return; }
    if (reason.length < 4) { document.getElementById("rerouteReason").focus(); return; }
    const res = Store.rerouteTicket(t.id, {
      category: opt.dataset.category,
      queue: opt.dataset.queue,
      templateId: opt.value,
      slaHours: Number(opt.dataset.sla),
      priority: document.getElementById("reroutePriority").value || "",
      reason,
      teamNote: document.getElementById("rerouteTeamNote").value.trim(),
      requesterNote: document.getElementById("rerouteRequesterNote").value.trim()
    });
    if (!res.ok) { window.alert(res.message || "Could not reroute."); return; }
    closeDialog(els.reroute);
    closeDialog(els.detail);
    render();
  }

  function closeDialog(d) { if (d.open) d.close(); else d.removeAttribute("open"); }

  /* ---------- actions ---------- */
  function assignMe() {
    const t = ticket(activeId); if (!t) return;
    Store.updateTicket(t.id, { assignee: Store.CURRENT_USER.name }, `${Store.CURRENT_USER.name} took ownership of this triage request.`);
    openDetail(activeId); render();
  }
  function escalate() {
    const t = ticket(activeId); if (!t) return;
    const order = ["P4 - Low", "P3 - Normal", "P2 - High", "P1 - Critical"];
    const idx = order.findIndex((p) => (t.priority || "").startsWith(p.split(" ")[0]));
    if (idx < 0 || idx >= order.length - 1) { window.alert("This request is already at the highest priority."); return; }
    const next = order[idx + 1];
    if (!window.confirm(`Escalate ${t.number} from ${t.priority} to ${next}?`)) return;
    Store.updateTicket(t.id, { priority: next }, `Priority escalated to ${next} by ${Store.CURRENT_USER.name}.`);
    openDetail(activeId); render();
  }
  function saveNote() {
    const t = ticket(activeId); if (!t) return;
    const text = document.getElementById("triageNoteText").value.trim();
    if (noteMode !== "note" && text.length < 4) { document.getElementById("triageNoteText").focus(); return; }
    if (noteMode === "info") {
      Store.updateTicket(t.id, { status: "Waiting on requester" }, `Triage asked the requester: ${text}`);
    } else if (noteMode === "close") {
      Store.updateTicket(t.id, {
        status: "Closed — No Action", outcome: "closed-no-action",
        closureReason: "Closed from Enterprise Triage", closureExplanation: text,
        closedAt: new Date().toISOString(), closedBy: Store.CURRENT_USER.name
      }, `Closed without action from triage by ${Store.CURRENT_USER.name}. ${text}`);
      closeDialog(els.detail);
    } else {
      if (!text) { hideNote(); return; }
      Store.updateTicket(t.id, {}, `Internal triage note (${Store.CURRENT_USER.name}): ${text}`);
    }
    hideNote();
    if (els.detail.open) openDetail(activeId);
    render();
  }

  /* ---------- events ---------- */
  els.list.addEventListener("click", (e) => {
    const b = e.target.closest("[data-open-triage]");
    if (b) openDetail(b.getAttribute("data-open-triage"));
  });
  document.getElementById("triageImprovementSection").addEventListener("click", (e) => {
    const b = e.target.closest("[data-send-signal]");
    if (b) sendSignalToFlowStudio(b.getAttribute("data-send-signal"));
  });
  els.search.addEventListener("input", render);
  els.filter.addEventListener("change", render);
  els.sort.addEventListener("change", render);
  els.detail.querySelectorAll("[data-close-triage]").forEach((b) => b.addEventListener("click", () => closeDialog(els.detail)));
  els.reroute.querySelectorAll("[data-close-reroute]").forEach((b) => b.addEventListener("click", () => closeDialog(els.reroute)));
  document.getElementById("triageReroute").addEventListener("click", openReroute);
  document.getElementById("triageAssignMe").addEventListener("click", assignMe);
  document.getElementById("triageEscalate").addEventListener("click", escalate);
  document.getElementById("triageRequestInfo").addEventListener("click", () => showNote("info", "Question for the requester (required)", "What device, system, or location is affected?"));
  document.getElementById("triageAddNote").addEventListener("click", () => showNote("note", "Internal triage note", "Context for the record (not shown to the requester)."));
  document.getElementById("triageCloseNoAction").addEventListener("click", () => showNote("close", "Reason for closing without action (required)", "Explain clearly and respectfully why no action is being taken."));
  document.getElementById("triageNoteSave").addEventListener("click", saveNote);
  document.getElementById("triageNoteCancel").addEventListener("click", hideNote);
  document.getElementById("rerouteDestination").addEventListener("change", updatePreview);
  document.getElementById("reroutePriority").addEventListener("change", updatePreview);
  document.getElementById("rerouteReasonPreset").addEventListener("change", (e) => {
    if (e.target.value && !e.target.value.startsWith("Other")) {
      const ta = document.getElementById("rerouteReason");
      ta.value = ta.value ? ta.value : e.target.value;
    }
  });
  document.getElementById("rerouteConfirm").addEventListener("click", confirmReroute);

  window.addEventListener("masterflow:state", render);
  render();
})();
