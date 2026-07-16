(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  const Feedback = window.MasterFlowReceiverFeedback;

  if (!Store || !UI || !UI.layoutReady || !Feedback) return;

  const recommendedSection = document.getElementById("recommendedSection");
  const recommendedList = document.getElementById("recommendedWorkList");
  const teamQueueSection = document.getElementById("teamQueueSection");
  const queueCards = document.getElementById("workCenterQueueCards");
  const workList = document.getElementById("workCenterList");
  const tableBody = document.getElementById("workCenterTableBody");
  const searchInput = document.getElementById("workCenterSearch");
  const queueFilter = document.getElementById("workCenterQueueFilter");
  const viewButtons = Array.from(document.querySelectorAll("[data-work-view]"));
  const ticketDialog = document.getElementById("receiverTicketDialog");

  let currentView = "recommended";
  let currentTicketId = "";

  const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;

  const APPROVAL_FINAL_STATUSES = new Set(["Rejected"]);

  const isApprovalRequired = Feedback.isApprovalRequired;
  const isAwaitingApproval = Feedback.isAwaitingApproval;
  const isApprovedForFulfillment = Feedback.isApprovedForFulfillment;
  const requestedCost = Feedback.requestedCost;
  const numericRequestedCost = Feedback.numericRequestedCost;
  const approvalRouteFor = Feedback.approvalRoute;

  function isApprovalFinal(ticket) {
    return APPROVAL_FINAL_STATUSES.has(String(ticket && ticket.status || ""));
  }

  function isFinished(ticket) {
    return Feedback.isClosed(ticket) || isApprovalFinal(ticket);
  }

  function suggestedActionFor(ticket, analysis) {
    const route = approvalRouteFor(ticket);

    if (isApprovalRequired(ticket)) {
      const cost = requestedCost(ticket);
      return cost
        ? `Validate the ${cost} request and send it to the ${route.approverRole} for approval.`
        : `Validate the request and send it to the ${route.approverRole} for approval.`;
    }

    if (isAwaitingApproval(ticket)) {
      return `Approval is pending with the ${route.approverRole}. No approval decision is required from the ticket receiver.`;
    }

    if (isApprovedForFulfillment(ticket)) {
      return "Approval is complete. Begin fulfillment and keep the requester updated.";
    }

    if (ticket && ticket.status === "Rejected") {
      return "The authorized approver rejected this request. Review the recorded reason with the requester.";
    }

    return analysis.suggestedFirstAction;
  }

  function dueLabelFor(ticket, analysis) {
    if (isApprovalFinal(ticket)) {
      return `${ticket.status} ${UI.formatDate(ticket.updatedAt)}`;
    }
    if (isAwaitingApproval(ticket)) {
      return "Awaiting approval decision";
    }
    return analysis.dueLabel;
  }

  function workReadinessFor(ticket, analysis) {
    if (isApprovedForFulfillment(ticket)) {
      return { label: "Ready to fulfill", className: "badge-green" };
    }
    if (ticket && ticket.status === "Rejected") {
      return { label: "Rejected", className: "badge-red" };
    }
    if (isAwaitingApproval(ticket)) {
      return { label: "Awaiting approver", className: "badge-amber" };
    }
    if (isApprovalRequired(ticket)) {
      return { label: "Ready to route", className: "badge-amber" };
    }
    return analysis.workReadiness;
  }

  function statusClassFor(status) {
    if (status === "Rejected") return "badge-red";
    if (status === "Approved - Ready to fulfill") return "badge-green";
    return UI.statusClass(status);
  }

  const viewDefinitions = {
    recommended: {
      title: "Prioritized work",
      description: "MasterFlow ranks active tickets by operational impact, SLA timing, ownership, and readiness."
    },
    mine: {
      title: "My work",
      description: "Active tickets currently assigned to you."
    },
    team: {
      title: "Team work",
      description: "Active tickets in the queues you are authorized to support."
    },
    unassigned: {
      title: "Needs assignment",
      description: "Tickets that cannot progress consistently until someone accepts ownership."
    },
    risk: {
      title: "SLA risk",
      description: "Active tickets that are overdue or due within one hour."
    },
    waiting: {
      title: "Waiting on requester",
      description: "Tickets blocked until an employee provides more information."
    },
    completed: {
      title: "Recently completed",
      description: "Resolved and closed tickets available for reference."
    }
  };

  function bucketFor(ticket) {
    if (isFinished(ticket)) return "completed";
    if (String(ticket.priority || "").startsWith("P1")) return "critical";
    if (Feedback.isWaiting(ticket)) return "waiting";
    if (Feedback.isSlaRisk(ticket)) return "risk";
    return "ready";
  }

  function bucketLabel(bucket) {
    const labels = {
      critical: "Critical operations",
      risk: "SLA risk",
      ready: "Ready to work",
      waiting: "Waiting on requester",
      completed: "Completed"
    };
    return labels[bucket] || "Active";
  }

  function bucketBadgeClass(bucket) {
    const classes = {
      critical: "badge-red",
      risk: "badge-amber",
      ready: "badge-teal",
      waiting: "badge-purple",
      completed: "badge-green"
    };
    return classes[bucket] || "badge-gray";
  }

  function minutesUntilDue(ticket) {
    const due = new Date(ticket.slaDueAt).getTime();
    if (!Number.isFinite(due)) return Number.POSITIVE_INFINITY;
    return Math.round((due - Date.now()) / 60000);
  }

  function priorityWeight(priority) {
    const value = String(priority || "");
    if (value.startsWith("P1")) return 100;
    if (value.startsWith("P2")) return 60;
    if (value.startsWith("P3")) return 30;
    if (value.startsWith("P4")) return 10;
    return 20;
  }

  function calculateWorkScore(ticket) {
    if (isFinished(ticket)) return 0;

    let score = priorityWeight(ticket.priority);
    const minutes = minutesUntilDue(ticket);
    const analysis = Feedback.analyzeTicket(ticket);

    if (minutes < 0) score += 80;
    else if (minutes <= 15) score += 60;
    else if (minutes <= 60) score += 40;
    else if (minutes <= 240) score += 20;

    if (ticket.status === "Approval required") score += 30;
    if (ticket.status === "Awaiting approval") score -= 20;
    if (ticket.status === "Approved - Ready to fulfill") score += 35;
    if (ticket.status === "Triage") score += 25;
    if (ticket.status === "New") score += 15;
    if (ticket.assignee === Store.CURRENT_USER.name) score += 15;
    if (!ticket.assignee || ticket.assignee === "Unassigned") score += 25;
    if (Feedback.isWaiting(ticket)) score -= 50;
    if (workReadinessFor(ticket, analysis).label === "Ready to work") score += 15;

    return score;
  }

  function priorityReasons(ticket) {
    const reasons = [];
    const minutes = minutesUntilDue(ticket);
    const analysis = Feedback.analyzeTicket(ticket);

    if (String(ticket.priority || "").startsWith("P1")) reasons.push("Critical operational impact");
    if (minutes < 0) reasons.push("SLA is overdue");
    else if (minutes <= 60) reasons.push("SLA due within one hour");
    if (ticket.status === "Approval required") reasons.push("Approval routing required");
    if (ticket.status === "Awaiting approval") reasons.push("Pending authorized decision");
    if (ticket.status === "Approved - Ready to fulfill") reasons.push("Approved for fulfillment");
    if (ticket.status === "Triage") reasons.push("Routing must be confirmed");
    if (ticket.assignee === Store.CURRENT_USER.name) reasons.push("Assigned to you");
    if (!ticket.assignee || ticket.assignee === "Unassigned") reasons.push("No owner assigned");
    if (Feedback.isWaiting(ticket)) reasons.push("Blocked by missing information");
    if (workReadinessFor(ticket, analysis).label === "Ready to work") reasons.push("Work-ready on arrival");
    if (!reasons.length) reasons.push("Ready for action");

    return reasons.slice(0, 3);
  }

  function getTickets() {
    return Store.getState().tickets
      .map((ticket) => ({
        ticket,
        bucket: bucketFor(ticket),
        score: calculateWorkScore(ticket)
      }))
      .sort((a, b) => {
        if (isFinished(a.ticket) !== isFinished(b.ticket)) {
          return isFinished(a.ticket) ? 1 : -1;
        }
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.ticket.slaDueAt).getTime() - new Date(b.ticket.slaDueAt).getTime();
      });
  }

  function matchesView(item) {
    const ticket = item.ticket;
    if (currentView === "recommended") return !isFinished(ticket);
    if (currentView === "mine") return !isFinished(ticket) && ticket.assignee === Store.CURRENT_USER.name;
    if (currentView === "team") return !isFinished(ticket);
    if (currentView === "unassigned") return !isFinished(ticket) && (!ticket.assignee || ticket.assignee === "Unassigned");
    if (currentView === "risk") return Feedback.isSlaRisk(ticket);
    if (currentView === "waiting") return !isFinished(ticket) && Feedback.isWaiting(ticket);
    if (currentView === "completed") return isFinished(ticket);
    return true;
  }

  function filteredItems(items) {
    const query = searchInput.value.trim().toLowerCase();
    const selectedQueue = queueFilter.value;

    return items.filter((item) => {
      const ticket = item.ticket;
      const analysis = Feedback.analyzeTicket(ticket);
      const haystack = [
        ticket.number,
        ticket.title,
        ticket.description,
        ticket.category,
        ticket.queue,
        ticket.assignee,
        ticket.requester,
        ticket.status,
        ticket.location,
        analysis.requestedOutcome,
        suggestedActionFor(ticket, analysis)
      ].join(" ").toLowerCase();

      return matchesView(item)
        && (selectedQueue === "all" || ticket.queue === selectedQueue)
        && (!query || haystack.includes(query));
    });
  }

  function renderCounts(items) {
    const active = items.filter((item) => !isFinished(item.ticket));
    const completed = items.filter((item) => isFinished(item.ticket));
    const counts = {
      recommended: active.length,
      mine: active.filter((item) => item.ticket.assignee === Store.CURRENT_USER.name).length,
      team: active.length,
      unassigned: active.filter((item) => !item.ticket.assignee || item.ticket.assignee === "Unassigned").length,
      risk: active.filter((item) => Feedback.isSlaRisk(item.ticket)).length,
      waiting: active.filter((item) => Feedback.isWaiting(item.ticket)).length,
      completed: completed.length
    };

    Object.entries(counts).forEach(([view, count]) => {
      const element = document.getElementById(`count-${view}`);
      if (element) element.textContent = String(count);
    });
  }

  function renderQueueOptions(items) {
    const existing = queueFilter.value;
    const queues = [...new Set(items.map((item) => item.ticket.queue))].sort();
    queueFilter.innerHTML = `<option value="all">All authorized queues</option>${queues
      .map((queue) => `<option value="${UI.escapeHtml(queue)}">${UI.escapeHtml(queue)}</option>`)
      .join("")}`;
    if (["all", ...queues].includes(existing)) queueFilter.value = existing;
  }

  function queueSummary(items) {
    const active = items.filter((item) => !isFinished(item.ticket));
    const queues = [...new Set(active.map((item) => item.ticket.queue))];

    return queues.map((name) => {
      const tickets = active.filter((item) => item.ticket.queue === name);
      return {
        name,
        count: tickets.length,
        unassigned: tickets.filter((item) => !item.ticket.assignee || item.ticket.assignee === "Unassigned").length,
        risk: tickets.filter((item) => Feedback.isSlaRisk(item.ticket)).length,
        critical: tickets.filter((item) => String(item.ticket.priority || "").startsWith("P1")).length
      };
    }).sort((a, b) => {
      const aUrgency = a.critical * 100 + a.risk * 10 + a.unassigned;
      const bUrgency = b.critical * 100 + b.risk * 10 + b.unassigned;
      return bUrgency - aUrgency || b.count - a.count;
    });
  }

  function renderQueueCards(items) {
    const summaries = queueSummary(items);
    if (!summaries.length) {
      queueCards.innerHTML = '<div class="empty-state">No active team queues are visible.</div>';
      return;
    }

    queueCards.innerHTML = summaries.map((queue) => {
      const className = queue.critical ? " critical" : queue.risk ? " at-risk" : "";
      const details = [];
      if (queue.critical) details.push(`${queue.critical} critical`);
      if (queue.risk) details.push(`${queue.risk} SLA risk`);
      if (queue.unassigned) details.push(`${queue.unassigned} unassigned`);
      if (!details.length) details.push("No immediate risk");

      return `
        <button class="queue-card${className}" type="button" data-queue-card="${UI.escapeHtml(queue.name)}">
          <h3>${UI.escapeHtml(queue.name)}</h3>
          <div class="queue-number">${queue.count}</div>
          <div class="queue-meta">${UI.escapeHtml(details.join(" · "))}</div>
        </button>
      `;
    }).join("");
  }

  function workCardBasics(ticket) {
    return {
      analysis: Feedback.analyzeTicket(ticket),
      reasons: priorityReasons(ticket).map((reason) => `<span>${UI.escapeHtml(reason)}</span>`).join("")
    };
  }

  function claimButtonMarkup(ticket) {
    return !ticket.assignee || ticket.assignee === "Unassigned"
      ? `<button class="btn btn-primary btn-sm" type="button" data-claim-ticket="${UI.escapeHtml(ticket.id)}">Claim ticket</button>`
      : "";
  }

  function recommendedMarkup(item, index) {
    const ticket = item.ticket;
    const { analysis, reasons } = workCardBasics(ticket);

    return `
      <article class="work-card work-card-recommended is-${item.bucket}">
        <div class="work-rank" aria-label="Recommended position ${index + 1}">
          <small>Work</small>
          <strong>${index + 1}</strong>
        </div>
        <div class="work-card-main">
          <div class="work-card-topline">
            <span class="badge ${bucketBadgeClass(item.bucket)}">${UI.escapeHtml(bucketLabel(item.bucket))}</span>
            <span class="work-due">${UI.escapeHtml(dueLabelFor(ticket, analysis))}</span>
          </div>
          <button class="work-ticket-title" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">${UI.escapeHtml(ticket.title)}</button>
          <div class="work-ticket-reference">${UI.escapeHtml(ticket.number)} · ${UI.escapeHtml(ticket.queue)}</div>
          <p class="work-impact">${UI.escapeHtml(analysis.scopeImpact)}</p>
          <div class="work-next-action">
            <small>Suggested first action</small>
            <strong>${UI.escapeHtml(suggestedActionFor(ticket, analysis))}</strong>
          </div>
          <div class="work-reason-list">${reasons}</div>
        </div>
        <div class="work-card-actions">
          ${claimButtonMarkup(ticket)}
          <button class="btn btn-secondary btn-sm" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">Open request</button>
        </div>
      </article>
    `;
  }

  function workCardMarkup(item) {
    const ticket = item.ticket;
    const { analysis, reasons } = workCardBasics(ticket);

    return `
      <article class="work-card is-${item.bucket}">
        <div class="work-card-main">
          <div class="work-card-topline">
            <span class="badge ${bucketBadgeClass(item.bucket)}">${UI.escapeHtml(bucketLabel(item.bucket))}</span>
            <span class="work-due">${UI.escapeHtml(dueLabelFor(ticket, analysis))}</span>
          </div>
          <button class="work-ticket-title" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">${UI.escapeHtml(ticket.title)}</button>
          <div class="work-ticket-reference">${UI.escapeHtml(ticket.number)} · ${UI.escapeHtml(ticket.queue)}</div>
          <div class="work-card-readiness">
            <span class="badge ${analysis.routingReadiness.className}">${UI.escapeHtml(analysis.routingReadiness.label)}</span>
            <span class="badge ${workReadinessFor(ticket, analysis).className}">${UI.escapeHtml(workReadinessFor(ticket, analysis).label)}</span>
          </div>
          <div class="work-next-action compact">
            <small>Next action</small>
            <strong>${UI.escapeHtml(suggestedActionFor(ticket, analysis))}</strong>
          </div>
          <div class="work-meta">
            <span>Owner: <strong>${UI.escapeHtml(ticket.assignee || "Unassigned")}</strong></span>
            <span>Requester: <strong>${UI.escapeHtml(ticket.requester)}</strong></span>
            <span>Priority: <strong>${UI.escapeHtml(analysis.priorityLabel)}</strong></span>
          </div>
          <div class="work-reason-list">${reasons}</div>
        </div>
        <div class="work-card-actions">
          ${claimButtonMarkup(ticket)}
          <button class="btn btn-secondary btn-sm" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">${isFinished(ticket) ? "View" : "Open"}</button>
        </div>
      </article>
    `;
  }

  function renderRecommended(items) {
    const active = items.filter((item) => !isFinished(item.ticket));
    const actionable = active.filter((item) =>
      !Feedback.isWaiting(item.ticket) && !isAwaitingApproval(item.ticket)
    );
    const recommended = (actionable.length ? actionable : active).slice(0, 3);
    recommendedList.innerHTML = recommended.length
      ? recommended.map(recommendedMarkup).join("")
      : '<div class="empty-state">No active tickets need attention.</div>';
  }

  function renderWorkList(items) {
    workList.innerHTML = items.length
      ? items.map(workCardMarkup).join("")
      : '<div class="empty-state">No tickets match this view.</div>';
  }

  function renderTable(items) {
    if (!items.length) {
      tableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No tickets match this view.</div></td></tr>';
      return;
    }

    tableBody.innerHTML = items.map((item) => {
      const ticket = item.ticket;
      const analysis = Feedback.analyzeTicket(ticket);
      return `
        <tr>
          <td>
            <button class="link-button" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">${UI.escapeHtml(ticket.number)} - ${UI.escapeHtml(ticket.title)}</button>
            <span class="subtext">${UI.escapeHtml(ticket.category)}</span>
          </td>
          <td><span class="badge ${UI.priorityClass(ticket.priority)}">${UI.escapeHtml(analysis.priorityLabel)}</span></td>
          <td><span class="badge ${UI.statusClass(ticket.status)}">${UI.escapeHtml(ticket.status)}</span></td>
          <td>${UI.escapeHtml(ticket.queue)}</td>
          <td>${UI.escapeHtml(ticket.assignee || "Unassigned")}</td>
          <td><strong>${UI.escapeHtml(dueLabelFor(ticket, analysis))}</strong><span class="subtext">${UI.escapeHtml(UI.formatDate(ticket.slaDueAt))}</span></td>
          <td>
            ${!ticket.assignee || ticket.assignee === "Unassigned"
              ? `<button class="btn btn-secondary btn-sm" type="button" data-claim-ticket="${UI.escapeHtml(ticket.id)}">Claim</button>`
              : `<button class="btn btn-ghost btn-sm" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">View</button>`}
          </td>
        </tr>
      `;
    }).join("");
  }

  function updateViewControls() {
    viewButtons.forEach((button) => {
      const active = button.dataset.workView === currentView;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const definition = viewDefinitions[currentView];
    document.getElementById("workListTitle").textContent = definition.title;
    document.getElementById("workListDescription").textContent = definition.description;
  }

  function setBadge(element, text, className) {
    element.textContent = text;
    element.className = `badge ${className}`;
  }

  function assigneeNames() {
    const names = Store.getState().tickets
      .map((ticket) => ticket.assignee)
      .filter((name) => name && name !== "Unassigned");
    names.push(Store.CURRENT_USER.name, "Jordan Kim", "Priya Shah", "Megan Delia");
    return [...new Set(names)].sort();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function writeState(state) {
    window.localStorage.setItem(Store.STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("masterflow:state", { detail: clone(state) }));
  }

  function createComment(text, visibility) {
    const now = new Date();
    return {
      id: `comment-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      type: "comment",
      author: Store.CURRENT_USER.name,
      visibility: visibility === "requester" ? "requester" : "internal",
      text: String(text || "").trim(),
      originalText: String(text || "").trim(),
      revisions: [],
      at: now.toISOString(),
      editedAt: null,
      editableUntil: new Date(now.getTime() + COMMENT_EDIT_WINDOW_MS).toISOString()
    };
  }

  function updateTicketWithComment(ticketId, patch, systemText, commentText, visibility) {
    const state = Store.getState();
    const ticket = state.tickets.find((item) => item.id === ticketId);
    if (!ticket) return null;

    const now = new Date().toISOString();
    Object.assign(ticket, patch || {}, { updatedAt: now });
    ticket.history = Array.isArray(ticket.history) ? ticket.history : [];

    if (systemText) {
      ticket.history.push({ at: now, text: systemText, type: "system" });
    }

    const cleanComment = String(commentText || "").trim();
    if (cleanComment) {
      ticket.history.push(createComment(cleanComment, visibility));
    }

    writeState(state);
    return clone(ticket);
  }

  function canEditComment(item) {
    if (!item || item.type !== "comment") return false;
    if (item.author !== Store.CURRENT_USER.name) return false;

    const fallbackDeadline = new Date(item.at).getTime() + COMMENT_EDIT_WINDOW_MS;
    const configuredDeadline = new Date(item.editableUntil || "").getTime();
    const deadline = Number.isFinite(configuredDeadline) ? configuredDeadline : fallbackDeadline;
    return Number.isFinite(deadline) && Date.now() <= deadline;
  }

  function editComment(ticketId, commentId, nextText) {
    const cleanText = String(nextText || "").trim();
    if (!cleanText) return { ok: false, message: "A comment cannot be empty." };

    const state = Store.getState();
    const ticket = state.tickets.find((item) => item.id === ticketId);
    if (!ticket) return { ok: false, message: "Ticket not found." };

    const comment = (ticket.history || []).find((item) => item.id === commentId);
    if (!comment) return { ok: false, message: "Comment not found." };
    if (!canEditComment(comment)) {
      return { ok: false, message: "The five-minute edit window has closed." };
    }

    if (comment.text === cleanText) {
      return { ok: false, message: "No changes were made." };
    }

    const now = new Date().toISOString();
    comment.originalText = comment.originalText || comment.text;
    comment.revisions = Array.isArray(comment.revisions) ? comment.revisions : [];
    comment.revisions.push({
      text: comment.text,
      editedAt: now,
      editedBy: Store.CURRENT_USER.name
    });
    comment.text = cleanText;
    comment.editedAt = now;
    ticket.updatedAt = now;

    writeState(state);
    return { ok: true, ticket: clone(ticket) };
  }

  function commentAuditMarkup(item) {
    if (!item.editedAt || !item.originalText) return "";
    return `
      <details class="receiver-comment-audit">
        <summary>View original comment</summary>
        <p>${UI.escapeHtml(item.originalText)}</p>
      </details>
    `;
  }

  function renderTimeline(ticket) {
    const history = (ticket.history || []).slice().reverse();
    const container = document.getElementById("receiverTimeline");

    container.innerHTML = history.length
      ? history.map((item) => {
          if (item.type === "comment") {
            const visibilityLabel = item.visibility === "requester"
              ? "Requester message"
              : "Internal update";
            const visibilityClass = item.visibility === "requester"
              ? "badge-blue"
              : "badge-gray";
            const editedLabel = item.editedAt ? " · Edited" : "";
            const editControls = canEditComment(item)
              ? `
                  <button class="link-button receiver-comment-edit" type="button" data-edit-comment="${UI.escapeHtml(item.id)}">Edit</button>
                  <span class="receiver-comment-window">Editable for five minutes</span>
                `
              : "";

            return `
              <article class="receiver-timeline-item receiver-comment-item" data-comment-id="${UI.escapeHtml(item.id)}">
                <div class="receiver-timeline-dot"></div>
                <div class="receiver-comment-content">
                  <div class="receiver-comment-header">
                    <div class="receiver-comment-author">
                      <strong>${UI.escapeHtml(item.author || "Unknown user")}</strong>
                      <span class="badge ${visibilityClass}">${visibilityLabel}</span>
                    </div>
                    <small>${UI.escapeHtml(UI.formatDate(item.at))}${editedLabel}</small>
                  </div>
                  <p class="receiver-comment-text">${UI.escapeHtml(item.text || "")}</p>
                  <div class="receiver-comment-actions">
                    ${editControls}
                    ${commentAuditMarkup(item)}
                  </div>
                </div>
              </article>
            `;
          }

          return `
            <article class="receiver-timeline-item receiver-system-item">
              <div class="receiver-timeline-dot"></div>
              <div>
                <strong>${UI.escapeHtml(item.text)}</strong>
                <small>${UI.escapeHtml(UI.formatDate(item.at))}</small>
              </div>
            </article>
          `;
        }).join("")
      : '<div class="empty-state">No timeline activity has been recorded.</div>';
  }

  function renderCostSummary(ticket) {
    const section = document.getElementById("receiverCostSummary");
    const body = document.getElementById("receiverCostBody");
    if (!section || !body) return;
    const c = ticket.cost;
    if (!c) { section.hidden = true; body.innerHTML = ""; return; }
    section.hidden = false;
    const money = (n) => "$" + (Number(n) || 0).toFixed(2);
    const statusLabel = c.status === "none" ? "No direct cost" : c.status === "pending" ? "Cost pending final invoice" : "Cost recorded";
    const items = (c.items || []).map((it) => `<div class="cost-line"><span>${UI.escapeHtml(it.type)}${it.desc ? " — " + UI.escapeHtml(it.desc) : ""} ${it.qty > 1 ? "×" + it.qty : ""}</span><strong>${money(it.total)}</strong></div>`).join("");
    const estRow = c.estimate ? `<div class="cost-line"><span>Approved estimate</span><strong>${money(c.estimate)}</strong></div><div class="cost-line"><span>Actual (confirmed)</span><strong>${money(c.totalCost)}</strong></div>` : "";
    body.innerHTML = `
      <div class="cost-summary-grid">
        <div class="cost-kv"><small>Outcome</small><span>${UI.escapeHtml(ticket.status)}</span></div>
        <div class="cost-kv"><small>Cost outcome</small><span>${UI.escapeHtml(statusLabel)}</span></div>
        <div class="cost-kv"><small>Direct spend</small><span>${money(c.directCost)}</span></div>
        <div class="cost-kv"><small>Labor</small><span>${c.laborHours || 0} hr · ${money(c.laborCost)}</span></div>
        <div class="cost-kv"><small>Total ticket cost</small><span><strong>${money(c.totalCost)}</strong></span></div>
        ${c.assetAction ? `<div class="cost-kv"><small>Asset</small><span>${UI.escapeHtml(c.assetAction)}</span></div>` : ""}
        ${c.vendor ? `<div class="cost-kv"><small>Vendor</small><span>${UI.escapeHtml(c.vendor)}</span></div>` : ""}
        ${c.poNumber ? `<div class="cost-kv"><small>PO / ref</small><span>${UI.escapeHtml(c.poNumber)}</span></div>` : ""}
        <div class="cost-kv"><small>Entered by</small><span>${UI.escapeHtml(c.enteredBy || "—")} · ${UI.escapeHtml(UI.formatDate(c.confirmedAt))}</span></div>
      </div>
      ${items ? `<div class="cost-lines">${items}</div>` : ""}
      ${estRow ? `<div class="cost-lines">${estRow}</div>` : ""}
      ${c.notes ? `<p class="muted">${UI.escapeHtml(c.notes)}</p>` : ""}`;
  }

  function renderReceiverTicket(ticket) {
    currentTicketId = ticket.id;
    renderCostSummary(ticket);
    const analysis = Feedback.analyzeTicket(ticket);

    document.getElementById("receiverTicketTitle").textContent = `${ticket.number} - ${ticket.title}`;
    document.getElementById("receiverTicketSubtitle").textContent = `${ticket.queue} · ${ticket.status}`;
    setBadge(document.getElementById("receiverStatusBadge"), ticket.status, statusClassFor(ticket.status));
    setBadge(document.getElementById("receiverRoutingBadge"), analysis.routingReadiness.label, analysis.routingReadiness.className);
    setBadge(document.getElementById("receiverWorkBadge"), workReadinessFor(ticket, analysis).label, workReadinessFor(ticket, analysis).className);

    document.getElementById("receiverBriefHeadline").textContent = analysis.requestedOutcome;
    document.getElementById("receiverBriefSummary").textContent = suggestedActionFor(ticket, analysis);
    document.getElementById("receiverCurrentOwner").textContent = ticket.assignee || "Unassigned";
    document.getElementById("receiverSlaLabel").textContent = dueLabelFor(ticket, analysis);
    document.getElementById("receiverRequestedOutcome").textContent = analysis.requestedOutcome;
    document.getElementById("receiverObservedSituation").textContent = analysis.observedSituation;
    document.getElementById("receiverScopeImpact").textContent = analysis.scopeImpact;
    document.getElementById("receiverSafetyContainment").textContent = analysis.safetyContainment;
    document.getElementById("receiverSuggestedAction").textContent = suggestedActionFor(ticket, analysis);

    document.getElementById("receiverIdentifiers").innerHTML = analysis.identifiers.length
      ? analysis.identifiers.map((item) => `
          <div class="receiver-identifier">
            <small>${UI.escapeHtml(item.label)}</small>
            <strong>${UI.escapeHtml(item.value)}</strong>
          </div>
        `).join("")
      : '<div class="notice notice-warning"><div><strong>No key identifier captured</strong><p>Confirm the location, asset, order, system, or other identifier needed to perform the work.</p></div></div>';

    document.getElementById("receiverInformationGaps").innerHTML = analysis.gaps.length
      ? `<ul class="receiver-gap-list">${analysis.gaps.map((gap) => `<li>${UI.escapeHtml(gap)}</li>`).join("")}</ul>`
      : '<div class="notice notice-success"><div><strong>No blocking information gap detected</strong><p>The ticket contains the core facts needed to begin work.</p></div></div>';

    const assigneeSelect = document.getElementById("receiverAssigneeSelect");
    assigneeSelect.innerHTML = `<option value="Unassigned">Unassigned</option>${assigneeNames()
      .map((name) => `<option value="${UI.escapeHtml(name)}">${UI.escapeHtml(name)}</option>`)
      .join("")}`;
    assigneeSelect.value = ticket.assignee || "Unassigned";

    const closed = isFinished(ticket);
    const approvalRequired = isApprovalRequired(ticket);
    const awaitingApproval = isAwaitingApproval(ticket);
    const approvedForFulfillment = isApprovedForFulfillment(ticket);
    const canReopen = ["Resolved", "Closed", "Closed — No Action"].includes(ticket.status);
    const approvalRoute = approvalRouteFor(ticket);

    const claimButton = document.getElementById("receiverClaimTicket");
    const assignButton = document.getElementById("receiverAssignTicket");
    const startButton = document.getElementById("receiverStartWork");
    const sendApprovalButton = document.getElementById("receiverSendApproval");
    const requestInfoButton = document.getElementById("receiverRequestInfo");
    const addUpdateButton = document.getElementById("receiverAddUpdate");
    const resolveButton = document.getElementById("receiverResolveTicket");
    const reopenButton = document.getElementById("receiverReopenTicket");
    const actionPanel = document.getElementById("receiverActionPanel");
    const approvalSummary = document.getElementById("receiverApprovalSummary");
    const approvalBadge = document.getElementById("receiverApprovalBadge");

    const showApprovalSummary =
      approvalRequired || awaitingApproval || approvedForFulfillment || ticket.status === "Rejected";

    approvalSummary.hidden = !showApprovalSummary;
    if (showApprovalSummary) {
      document.getElementById("receiverApprovalRoute").textContent = approvalRoute.approverRole;

      let approvalText = `This request must be reviewed by the ${approvalRoute.approverRole}.`;
      let approvalBadgeText = "Approval required";
      let approvalBadgeClass = "badge-amber";

      if (awaitingApproval) {
        approvalText = `Sent by ${approvalRoute.requestedBy || "the ticket receiver"}. The authorized approver must make the decision in Queue Manager.`;
        approvalBadgeText = "Awaiting approval";
      } else if (approvedForFulfillment) {
        approvalText = `Approved by ${approvalRoute.decisionBy || "an authorized approver"}. The fulfillment team can now complete the work.`;
        approvalBadgeText = "Approved";
        approvalBadgeClass = "badge-green";
      } else if (ticket.status === "Rejected") {
        approvalText = `Rejected by ${approvalRoute.decisionBy || "an authorized approver"}${approvalRoute.decisionNote ? `: ${approvalRoute.decisionNote}` : "."}`;
        approvalBadgeText = "Rejected";
        approvalBadgeClass = "badge-red";
      }

      document.getElementById("receiverApprovalStatusText").textContent = approvalText;
      approvalBadge.textContent = approvalBadgeText;
      approvalBadge.className = `badge ${approvalBadgeClass}`;
    }

    claimButton.hidden = closed || Boolean(ticket.assignee && ticket.assignee !== "Unassigned");
    assignButton.hidden = closed;
    assigneeSelect.disabled = closed;
    startButton.hidden =
      closed || approvalRequired || awaitingApproval || ticket.status === "In progress";
    startButton.textContent = approvedForFulfillment ? "Start fulfillment" : "Start work";
    sendApprovalButton.hidden = !approvalRequired;
    requestInfoButton.hidden = closed;
    addUpdateButton.hidden = closed;
    resolveButton.hidden = closed || approvalRequired || awaitingApproval;
    document.getElementById("receiverCloseNoAction").hidden = closed;
    reopenButton.hidden = !canReopen;
    actionPanel.hidden = closed && !canReopen;
    document.getElementById("receiverActionNote").value = "";

    renderTimeline(ticket);

    const technical = [
      ["Priority", analysis.priorityLabel],
      ["Queue", ticket.queue],
      ["Assignee", ticket.assignee || "Unassigned"],
      ["Requester", ticket.requester],
      ["Location", ticket.location || "Not provided"],
      ["SLA due", UI.formatDate(ticket.slaDueAt)],
      ["Classification confidence", `${Number(ticket.classificationConfidence || 0)}%`],
      ["Routing explanation", ticket.routingReason || "Not provided"]
    ];
    document.getElementById("receiverTechnicalDetails").innerHTML = technical.map(([label, value]) => `
      <div class="detail-cell"><small>${UI.escapeHtml(label)}</small><strong>${UI.escapeHtml(value)}</strong></div>
    `).join("");

    if (!ticketDialog.open) ticketDialog.showModal();
  }

  function openTicket(ticketId) {
    const ticket = Store.getTicket(ticketId);
    if (ticket) renderReceiverTicket(ticket);
  }

  function refreshOpenTicket() {
    if (!currentTicketId) return;
    const ticket = Store.getTicket(currentTicketId);
    if (ticket) renderReceiverTicket(ticket);
  }

  function updateCurrentTicket(patch, historyText, toastMessage) {
    if (!currentTicketId) return null;
    const ticket = Store.updateTicket(currentTicketId, patch, historyText);
    if (ticket) {
      UI.showToast(toastMessage || `${ticket.number} updated.`);
      renderReceiverTicket(ticket);
    }
    return ticket;
  }

  function requireNote(actionName) {
    const note = document.getElementById("receiverActionNote").value.trim();
    if (!note) {
      UI.showToast(`Add a note before you ${actionName}.`);
      document.getElementById("receiverActionNote").focus();
      return "";
    }
    return note;
  }

  function handleWorkAction(event) {
    const claimButton = event.target.closest("[data-claim-ticket]");
    if (claimButton) {
      const ticket = Store.updateTicket(
        claimButton.dataset.claimTicket,
        { assignee: Store.CURRENT_USER.name },
        `Claimed by ${Store.CURRENT_USER.name}.`
      );
      if (ticket) UI.showToast(`${ticket.number} claimed by you.`);
      return;
    }

    const ticketButton = event.target.closest("[data-ticket-id]");
    if (ticketButton) openTicket(ticketButton.dataset.ticketId);
  }

  function render() {
    const items = getTickets();
    const visibleItems = filteredItems(items);
    renderCounts(items);
    renderQueueOptions(items);
    renderRecommended(items);
    renderQueueCards(items);
    renderWorkList(visibleItems);
    renderTable(visibleItems);
    updateViewControls();
    recommendedSection.hidden = currentView !== "recommended";
    teamQueueSection.hidden = currentView !== "team";
    document.getElementById("visibleTicketCount").textContent = `${visibleItems.length} shown`;
  }

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.workView;
      render();
    });
  });

  queueCards.addEventListener("click", (event) => {
    const button = event.target.closest("[data-queue-card]");
    if (!button) return;
    queueFilter.value = button.dataset.queueCard;
    render();
  });

  recommendedList.addEventListener("click", handleWorkAction);
  workList.addEventListener("click", handleWorkAction);
  tableBody.addEventListener("click", handleWorkAction);
  searchInput.addEventListener("input", render);
  queueFilter.addEventListener("change", render);

  document.querySelectorAll("[data-close-receiver-ticket]").forEach((button) => {
    button.addEventListener("click", () => ticketDialog.close());
  });

  document.getElementById("receiverClaimTicket").addEventListener("click", () => {
    updateCurrentTicket(
      { assignee: Store.CURRENT_USER.name },
      `Claimed by ${Store.CURRENT_USER.name}.`,
      "Ticket claimed."
    );
  });

  document.getElementById("receiverAssignTicket").addEventListener("click", () => {
    const assignee = document.getElementById("receiverAssigneeSelect").value;
    updateCurrentTicket(
      { assignee },
      assignee === "Unassigned" ? "Ticket ownership was cleared." : `Assigned to ${assignee}.`,
      assignee === "Unassigned" ? "Ticket returned to the unassigned queue." : `Ticket assigned to ${assignee}.`
    );
  });

  document.getElementById("receiverStartWork").addEventListener("click", () => {
    const ticket = Store.getTicket(currentTicketId);
    if (!ticket) return;
    const approvedFulfillment = isApprovedForFulfillment(ticket);
    updateCurrentTicket(
      {
        status: "In progress",
        assignee: !ticket.assignee || ticket.assignee === "Unassigned" ? Store.CURRENT_USER.name : ticket.assignee
      },
      approvedFulfillment
        ? `Fulfillment started by ${Store.CURRENT_USER.name} after approval.`
        : `Work started by ${Store.CURRENT_USER.name}.`,
      approvedFulfillment ? "Fulfillment started." : "Work started."
    );
  });

  document.getElementById("receiverSendApproval").addEventListener("click", () => {
    const ticket = Store.getTicket(currentTicketId);
    if (!ticket || !isApprovalRequired(ticket)) return;

    const note = document.getElementById("receiverActionNote").value.trim();
    const route = approvalRouteFor(ticket);
    const now = new Date().toISOString();
    const details = {
      ...(ticket.details || {}),
      approval: {
        status: "pending",
        approverRole: route.approverRole,
        approvalLabel: route.approvalLabel,
        threshold: route.threshold,
        amount: route.amount,
        requestedAt: now,
        requestedBy: Store.CURRENT_USER.name,
        decisionAt: "",
        decisionBy: "",
        decisionNote: "",
        receiverNote: note
      }
    };

    updateCurrentTicket(
      { status: "Awaiting approval", details },
      `Sent to the ${route.approverRole} for approval by ${Store.CURRENT_USER.name}${note ? `: ${note}` : "."}`,
      `Approval request sent to the ${route.approverRole}.`
    );
  });

  document.getElementById("receiverRequestInfo").addEventListener("click", () => {
    const note = requireNote("request more information");
    if (!note) return;
    const existingTicket = Store.getTicket(currentTicketId);
    const updatedTicket = updateTicketWithComment(
      currentTicketId,
      { status: "Waiting on requester" },
      `Status changed to Waiting on requester by ${Store.CURRENT_USER.name}.`,
      note,
      "requester"
    );
    if (updatedTicket) {
      UI.showToast(`Information request sent to ${existingTicket ? existingTicket.requester : "the requester"}.`);
      renderReceiverTicket(updatedTicket);
    }
  });

  document.getElementById("receiverAddUpdate").addEventListener("click", () => {
    const note = requireNote("add an update");
    if (!note) return;
    const updatedTicket = updateTicketWithComment(
      currentTicketId,
      {},
      "",
      note,
      "internal"
    );
    if (updatedTicket) {
      UI.showToast("Update added. You can edit it for five minutes.");
      renderReceiverTicket(updatedTicket);
    }
  });

  /* ---------- Cost & outcome capture at resolution ---------- */
  const COST_TYPES = ["Hardware replacement", "Hardware repair", "Parts or supplies", "Software or license", "Vendor service", "Shipping or service fee", "Internal labor", "Other"];
  let costItems = [];
  const money = (n) => "$" + (Number(n) || 0).toFixed(2);

  function currentTicketObj() {
    return Store.getState().tickets.find((t) => t.id === currentTicketId) || null;
  }

  function openCostDialog() {
    const note = requireNote("resolve the ticket");
    if (!note) return;
    const t = currentTicketObj();
    if (!t) return;
    costItems = [];
    document.getElementById("costResolutionNote").value = note;
    document.getElementById("costStatus").value = "";
    document.getElementById("costLaborHours").value = "";
    document.getElementById("costLaborRate").value = "";
    document.getElementById("costVendor").value = "";
    document.getElementById("costAsset").value = "";
    document.getElementById("costPo").value = "";
    document.getElementById("costActual").value = "";
    document.getElementById("costNotes").value = "";
    document.getElementById("costDetails").hidden = true;
    // Show an approved estimate if the approval workflow captured one.
    const est = t.details && t.details.approval && Number(t.details.approval.amount);
    const estRow = document.getElementById("costEstimateRow");
    if (est) {
      estRow.hidden = false;
      document.getElementById("costEstimateValue").textContent = money(est);
    } else {
      estRow.hidden = true;
    }
    renderCostItems();
    recalcCost();
    const d = document.getElementById("costDialog");
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
  }

  function renderCostItems() {
    const c = document.getElementById("costItems");
    c.innerHTML = costItems.map((it, i) => `
      <div class="cost-item-row" data-i="${i}">
        <select class="select cost-it-type" data-f="type">${COST_TYPES.map((t) => `<option ${t === it.type ? "selected" : ""}>${t}</option>`).join("")}</select>
        <input class="input cost-it-desc" data-f="desc" placeholder="Description" value="${UI.escapeHtml(it.desc || "")}">
        <input class="input cost-it-qty" data-f="qty" type="number" min="1" step="1" value="${it.qty || 1}">
        <input class="input cost-it-unit" data-f="unit" type="number" min="0" step="0.01" placeholder="Unit $" value="${it.unit != null ? it.unit : ""}">
        <span class="cost-it-total">${money((Number(it.qty) || 1) * (Number(it.unit) || 0))}</span>
        <button class="btn btn-ghost btn-sm cost-it-remove" type="button" aria-label="Remove">&times;</button>
      </div>`).join("");
  }

  function recalcCost() {
    const direct = costItems.reduce((s, it) => s + (Number(it.qty) || 1) * (Number(it.unit) || 0), 0);
    const hours = Number(document.getElementById("costLaborHours").value) || 0;
    const rate = Number(document.getElementById("costLaborRate").value) || 0;
    const labor = hours * rate;
    const actualField = document.getElementById("costActual");
    const total = actualField.value !== "" ? Number(actualField.value) || 0 : direct + labor;
    document.getElementById("costTotalDirect").textContent = money(direct);
    document.getElementById("costTotalLabor").textContent = money(labor);
    document.getElementById("costTotalAll").textContent = money(total);
    return { direct, hours, rate, labor, total };
  }

  document.getElementById("costStatus").addEventListener("change", (e) => {
    const recorded = e.target.value === "recorded" || e.target.value === "pending";
    document.getElementById("costDetails").hidden = !recorded;
    if (recorded && !costItems.length && e.target.value === "recorded") { costItems.push({ type: COST_TYPES[0], desc: "", qty: 1, unit: "" }); renderCostItems(); }
    recalcCost();
  });
  document.getElementById("costAddItem").addEventListener("click", () => { costItems.push({ type: COST_TYPES[0], desc: "", qty: 1, unit: "" }); renderCostItems(); recalcCost(); });
  document.getElementById("costItems").addEventListener("input", (e) => {
    const row = e.target.closest(".cost-item-row"); if (!row) return;
    const i = Number(row.dataset.i); const f = e.target.dataset.f; if (f == null) return;
    costItems[i][f] = e.target.value;
    row.querySelector(".cost-it-total").textContent = money((Number(costItems[i].qty) || 1) * (Number(costItems[i].unit) || 0));
    recalcCost();
  });
  document.getElementById("costItems").addEventListener("click", (e) => {
    if (!e.target.closest(".cost-it-remove")) return;
    const row = e.target.closest(".cost-item-row"); costItems.splice(Number(row.dataset.i), 1); renderCostItems(); recalcCost();
  });
  ["costLaborHours", "costLaborRate", "costActual"].forEach((id) => document.getElementById(id).addEventListener("input", recalcCost));
  document.querySelectorAll("[data-close-cost]").forEach((b) => b.addEventListener("click", () => {
    const d = document.getElementById("costDialog"); if (d.open) d.close(); else d.removeAttribute("open");
  }));

  document.getElementById("costConfirm").addEventListener("click", () => {
    const note = document.getElementById("costResolutionNote").value.trim();
    const status = document.getElementById("costStatus").value;
    if (!note) { UI.showToast("Add a resolution note."); document.getElementById("costResolutionNote").focus(); return; }
    if (!status) { UI.showToast("Choose a cost outcome."); document.getElementById("costStatus").focus(); return; }
    const totals = recalcCost();
    if (status === "recorded" && totals.total <= 0) { UI.showToast("Enter the actual cost, or choose No direct cost."); return; }
    const est = (currentTicketObj().details && currentTicketObj().details.approval && Number(currentTicketObj().details.approval.amount)) || 0;
    const cost = {
      status,
      items: status === "none" ? [] : costItems.map((it) => ({ type: it.type, desc: it.desc, qty: Number(it.qty) || 1, unit: Number(it.unit) || 0, total: (Number(it.qty) || 1) * (Number(it.unit) || 0) })),
      directCost: status === "none" ? 0 : totals.direct,
      laborHours: status === "none" ? 0 : totals.hours,
      laborRate: totals.rate,
      laborCost: status === "none" ? 0 : totals.labor,
      totalCost: status === "none" ? 0 : totals.total,
      vendor: document.getElementById("costVendor").value.trim(),
      assetAction: document.getElementById("costAsset").value,
      poNumber: document.getElementById("costPo").value.trim(),
      notes: document.getElementById("costNotes").value.trim(),
      estimate: est,
      enteredBy: Store.CURRENT_USER.name,
      confirmedAt: new Date().toISOString()
    };
    const label = status === "none" ? "no direct cost" : status === "pending" ? "cost pending final invoice" : `${money(cost.totalCost)} total`;
    const d = document.getElementById("costDialog"); if (d.open) d.close(); else d.removeAttribute("open");
    updateCurrentTicket(
      { status: "Resolved", outcome: "resolved", cost },
      `Resolved by ${Store.CURRENT_USER.name} (${label}): ${note}`,
      "Ticket resolved."
    );
  });

  document.getElementById("receiverResolveTicket").addEventListener("click", openCostDialog);

  document.getElementById("receiverReopenTicket").addEventListener("click", () => {
    updateCurrentTicket(
      { status: "In progress", assignee: Store.CURRENT_USER.name },
      `Reopened by ${Store.CURRENT_USER.name}.`,
      "Ticket reopened."
    );
  });

  function openCloseNoActionDialog() {
    if (!currentTicketId) return;
    const form = document.getElementById("closeNoActionForm");
    if (form) form.reset();
    const dialog = document.getElementById("closeNoActionDialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  function confirmCloseNoAction() {
    const reason = document.getElementById("closeNoActionReason").value;
    const explanation = document.getElementById("closeNoActionExplanation").value.trim();
    if (!reason) {
      UI.showToast("Choose a closure reason.");
      return;
    }
    if (explanation.length < 4) {
      UI.showToast("Add a meaningful explanation before closing without action.");
      document.getElementById("closeNoActionExplanation").focus();
      return;
    }
    const requesterNote =
      `This request was closed without action because: ${reason}. ` +
      `The Service Team added the following explanation: ${explanation}`;
    const updated = updateTicketWithComment(
      currentTicketId,
      {
        status: "Closed — No Action",
        outcome: "closed-no-action",
        closureReason: reason,
        closureExplanation: explanation,
        closedAt: new Date().toISOString(),
        closedBy: Store.CURRENT_USER.name
      },
      `Closed without action by ${Store.CURRENT_USER.name} — ${reason}.`,
      requesterNote,
      "requester"
    );
    document.getElementById("closeNoActionDialog").close();
    const form = document.getElementById("closeNoActionForm");
    if (form) form.reset();
    if (updated) {
      UI.showToast(`${updated.number} closed without action.`);
      renderReceiverTicket(updated);
    }
  }

  document.getElementById("receiverCloseNoAction").addEventListener("click", openCloseNoActionDialog);
  document.getElementById("confirmCloseNoAction").addEventListener("click", confirmCloseNoAction);
  document.querySelectorAll("[data-close-noaction]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById("closeNoActionDialog").close());
  });

  document.getElementById("receiverFlowStudio").addEventListener("click", () => {
    const ticket = Store.getTicket(currentTicketId);
    const templateId = ticket && ticket.details && ticket.details.requestTemplateId;
    window.location.href = templateId
      ? `admin-templates.html?flow=${encodeURIComponent(templateId)}`
      : "admin-templates.html";
  });

  document.getElementById("receiverTimeline").addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-comment]");
    if (editButton) {
      const ticket = Store.getTicket(currentTicketId);
      const comment = ticket && (ticket.history || []).find((item) => item.id === editButton.dataset.editComment);
      if (!comment || !canEditComment(comment)) {
        UI.showToast("The five-minute edit window has closed.");
        refreshOpenTicket();
        return;
      }

      const article = event.target.closest("[data-comment-id]");
      const content = article && article.querySelector(".receiver-comment-content");
      if (!content) return;

      content.innerHTML = `
        <div class="receiver-comment-editor">
          <label for="receiverCommentEdit-${UI.escapeHtml(comment.id)}">Edit your comment</label>
          <textarea class="textarea" id="receiverCommentEdit-${UI.escapeHtml(comment.id)}" rows="3">${UI.escapeHtml(comment.text)}</textarea>
          <div class="receiver-comment-editor-actions">
            <button class="btn btn-primary btn-sm" type="button" data-save-comment="${UI.escapeHtml(comment.id)}">Save edit</button>
            <button class="btn btn-secondary btn-sm" type="button" data-cancel-comment-edit>Cancel</button>
          </div>
          <small>The original wording remains preserved in the audit history.</small>
        </div>
      `;
      const input = content.querySelector("textarea");
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    const saveButton = event.target.closest("[data-save-comment]");
    if (saveButton) {
      const article = event.target.closest("[data-comment-id]");
      const input = article && article.querySelector("textarea");
      const result = editComment(currentTicketId, saveButton.dataset.saveComment, input ? input.value : "");
      UI.showToast(result.message || (result.ok ? "Comment updated." : "Comment could not be updated."));
      if (result.ok && result.ticket) renderReceiverTicket(result.ticket);
      return;
    }

    if (event.target.closest("[data-cancel-comment-edit]")) {
      refreshOpenTicket();
    }
  });

  document.getElementById("receiverFeedbackButton").addEventListener("click", () => {
    const ticket = Store.getTicket(currentTicketId);
    if (!ticket) return;
    const analysis = Feedback.analyzeTicket(ticket);
    Feedback.open({
      sourceRole: "resolver",
      ticketId: ticket.id,
      templateId: ticket.details && ticket.details.requestTemplateId ? ticket.details.requestTemplateId : "",
      queue: ticket.queue,
      issueType: analysis.gaps.length ? "missing-information" : "receiver-brief",
      title: analysis.gaps.length ? `Improve information quality for ${ticket.title}` : `Improve the receiver brief for ${ticket.title}`,
      description: analysis.gaps.length
        ? `The receiver brief identified the following gaps: ${analysis.gaps.join(", ")}.`
        : "The ticket was workable, but the receiver brief could be clearer or more actionable.",
      suggestedChange: analysis.gaps.length
        ? `Capture ${analysis.gaps[0].toLowerCase()} earlier in the request flow.`
        : "Adjust the receiver brief wording so the requested outcome and first action are immediately clear.",
      missingFields: analysis.gaps,
      phrase: ticket.description || ""
    });
  });

  window.addEventListener("masterflow:state", () => {
    render();
    refreshOpenTicket();
  });

  render();

  const requestedTicketId = window.localStorage.getItem("masterflowReceiverOpenTicket");
  if (requestedTicketId) {
    window.localStorage.removeItem("masterflowReceiverOpenTicket");
    window.setTimeout(() => openTicket(requestedTicketId), 50);
  }
})();
