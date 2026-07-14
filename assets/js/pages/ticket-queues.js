(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const tbody = document.getElementById("queueTicketsBody");
  const searchInput = document.getElementById("queueSearch");
  const statusFilter = document.getElementById("queueStatusFilter");
  const queueFilter = document.getElementById("queueFilter");
  const queueCards = document.getElementById("queueCards");

  function isOpen(ticket) {
    return !["Resolved", "Closed"].includes(ticket.status);
  }

  function slaLabel(ticket) {
    if (!isOpen(ticket)) return "Complete";
    const remaining = new Date(ticket.slaDueAt).getTime() - Date.now();
    if (!Number.isFinite(remaining)) return "Not set";
    if (remaining <= 0) return "Breached";
    const minutes = Math.round(remaining / 60000);
    if (minutes < 60) return `${minutes} min`;
    return `${(minutes / 60).toFixed(1)} hr`;
  }

  function queueCounts(tickets) {
    const open = tickets.filter(isOpen);
    const queueNames = [
      "Warehouse Systems / On-call",
      "IT Support",
      "Business Systems",
      "Megan Delia - Triage"
    ];
    return queueNames.map((name) => {
      const items = open.filter((ticket) => ticket.queue === name);
      const risk = items.filter((ticket) => new Date(ticket.slaDueAt).getTime() - Date.now() < 60 * 60 * 1000).length;
      return { name, count: items.length, risk };
    });
  }

  function renderQueueCards(tickets) {
    queueCards.innerHTML = queueCounts(tickets).map((queue) => {
      const critical = queue.name.includes("On-call");
      return `<button class="queue-card${critical ? " critical" : queue.risk ? " at-risk" : ""}" type="button" data-queue-card="${UI.escapeHtml(queue.name)}" style="text-align:left">
        <h3>${UI.escapeHtml(queue.name)}</h3>
        <div class="queue-number">${queue.count}</div>
        <div class="queue-meta">${queue.risk ? `${queue.risk} SLA at risk` : "No immediate SLA risk"}</div>
      </button>`;
    }).join("");
    queueCards.querySelectorAll("[data-queue-card]").forEach((button) => button.addEventListener("click", () => {
      queueFilter.value = button.dataset.queueCard;
      render();
    }));
  }

  function renderQueueOptions(tickets) {
    const existing = queueFilter.value;
    const queues = [...new Set(tickets.map((ticket) => ticket.queue))].sort();
    queueFilter.innerHTML = `<option value="all">All queues</option>${queues.map((queue) => `<option value="${UI.escapeHtml(queue)}">${UI.escapeHtml(queue)}</option>`).join("")}`;
    if (["all", ...queues].includes(existing)) queueFilter.value = existing;
  }

  function render() {
    const state = Store.getState();
    const tickets = state.tickets.slice().sort((a, b) => {
      const priorityOrder = { "P1 - Critical": 1, "P2 - High": 2, "P3 - Normal": 3, "P4 - Low": 4 };
      return (priorityOrder[a.priority] || 9) - (priorityOrder[b.priority] || 9) || new Date(a.slaDueAt) - new Date(b.slaDueAt);
    });
    renderQueueCards(tickets);
    renderQueueOptions(tickets);

    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedQueue = queueFilter.value;
    const filtered = tickets.filter((ticket) => {
      const haystack = `${ticket.number} ${ticket.title} ${ticket.queue} ${ticket.requester} ${ticket.status} ${ticket.category}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesQueue = selectedQueue === "all" || ticket.queue === selectedQueue;
      const matchesStatus = selectedStatus === "all" || (selectedStatus === "open" && isOpen(ticket)) || (selectedStatus === "unassigned" && isOpen(ticket) && ticket.assignee === "Unassigned") || (selectedStatus === "sla" && isOpen(ticket) && new Date(ticket.slaDueAt).getTime() - Date.now() < 60 * 60 * 1000);
      return matchesSearch && matchesQueue && matchesStatus;
    });

    document.getElementById("queueOpenCount").textContent = String(tickets.filter(isOpen).length);
    document.getElementById("queueUnassignedCount").textContent = String(tickets.filter((ticket) => isOpen(ticket) && ticket.assignee === "Unassigned").length);
    document.getElementById("queueRiskCount").textContent = String(tickets.filter((ticket) => isOpen(ticket) && new Date(ticket.slaDueAt).getTime() - Date.now() < 60 * 60 * 1000).length);
    document.getElementById("queueP1Count").textContent = String(tickets.filter((ticket) => isOpen(ticket) && ticket.priority.startsWith("P1")).length);

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No tickets match the current filters.</div></td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((ticket) => `
      <tr>
        <td><button class="link-button" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">${UI.escapeHtml(ticket.number)} - ${UI.escapeHtml(ticket.title)}</button><span class="subtext">${UI.escapeHtml(ticket.category)}</span></td>
        <td><span class="badge ${UI.priorityClass(ticket.priority)}">${UI.escapeHtml(ticket.priority)}</span></td>
        <td>${UI.escapeHtml(ticket.queue)}</td>
        <td>${UI.escapeHtml(ticket.requester)}</td>
        <td><span class="badge ${UI.statusClass(ticket.status)}">${UI.escapeHtml(ticket.status)}</span></td>
        <td>${UI.escapeHtml(ticket.assignee)}</td>
        <td><span class="badge ${slaLabel(ticket) === "Breached" ? "badge-red" : slaLabel(ticket).includes("min") ? "badge-amber" : "badge-gray"}">${UI.escapeHtml(slaLabel(ticket))}</span></td>
        <td>${ticket.assignee === "Unassigned" && isOpen(ticket) ? `<button class="btn btn-secondary btn-sm" type="button" data-assign-ticket="${UI.escapeHtml(ticket.id)}">Assign to me</button>` : `<button class="btn btn-ghost btn-sm" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">View</button>`}</td>
      </tr>`).join("");

    tbody.querySelectorAll("[data-ticket-id]").forEach((button) => button.addEventListener("click", () => {
      const ticket = Store.getTicket(button.dataset.ticketId);
      if (ticket) UI.openTicketDialog(ticket);
    }));
    tbody.querySelectorAll("[data-assign-ticket]").forEach((button) => button.addEventListener("click", () => {
      const ticket = Store.updateTicket(button.dataset.assignTicket, { assignee: Store.CURRENT_USER.name, status: "In progress" }, `Assigned to ${Store.CURRENT_USER.name}.`);
      if (ticket) UI.showToast(`${ticket.number} assigned to you.`);
    }));
  }

  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  queueFilter.addEventListener("change", render);
  window.addEventListener("masterflow:state", render);
  render();
})();
