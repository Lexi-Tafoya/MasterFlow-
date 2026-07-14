(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const tbody = document.getElementById("myTicketsBody");
  const searchInput = document.getElementById("ticketSearch");
  const statusFilter = document.getElementById("ticketStatusFilter");

  function requesterTickets() {
    return Store.getState().tickets
      .filter((ticket) => ticket.requester === Store.CURRENT_USER.name)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function renderKpis(tickets) {
    const open = tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status));
    const waiting = tickets.filter((ticket) => ticket.status === "Waiting on requester");
    const closed = tickets.filter((ticket) => ["Resolved", "Closed"].includes(ticket.status));
    document.getElementById("openTicketCount").textContent = String(open.length);
    document.getElementById("waitingTicketCount").textContent = String(waiting.length);
    document.getElementById("closedTicketCount").textContent = String(closed.length);
    document.getElementById("waitingTicketMeta").textContent = waiting.length ? `${waiting[0].title} needs your response` : "Nothing is waiting on you";
  }

  function render() {
    const all = requesterTickets();
    renderKpis(all);
    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const filtered = all.filter((ticket) => {
      const haystack = `${ticket.number} ${ticket.title} ${ticket.category} ${ticket.queue} ${ticket.status}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const isClosed = ["Resolved", "Closed"].includes(ticket.status);
      const matchesStatus = status === "all" || (status === "open" && !isClosed) || (status === "closed" && isClosed);
      return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No tickets match the current filters.</div></td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((ticket) => `
      <tr>
        <td><button class="link-button" type="button" data-ticket-id="${UI.escapeHtml(ticket.id)}">${UI.escapeHtml(ticket.number)} - ${UI.escapeHtml(ticket.title)}</button><span class="subtext">${UI.escapeHtml(ticket.location)}</span></td>
        <td>${UI.escapeHtml(ticket.category)}</td>
        <td><span class="badge ${UI.priorityClass(ticket.priority)}">${UI.escapeHtml(ticket.priority)}</span></td>
        <td><span class="badge ${UI.statusClass(ticket.status)}">${UI.escapeHtml(ticket.status)}</span></td>
        <td>${UI.escapeHtml(ticket.queue)}</td>
        <td>${UI.escapeHtml(UI.formatDate(ticket.updatedAt))}</td>
      </tr>`).join("");

    tbody.querySelectorAll("[data-ticket-id]").forEach((button) => button.addEventListener("click", () => {
      const ticket = Store.getTicket(button.dataset.ticketId);
      if (ticket) UI.openTicketDialog(ticket);
    }));
  }

  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  window.addEventListener("masterflow:state", render);
  render();
})();
