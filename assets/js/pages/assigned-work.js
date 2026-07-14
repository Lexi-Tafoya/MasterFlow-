(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const tbody = document.getElementById("assignedWorkBody");
  const searchInput = document.getElementById("assignedSearch");
  const typeFilter = document.getElementById("assignedTypeFilter");

  function getWork() {
    const state = Store.getState();
    const ticketItems = state.tickets
      .filter((ticket) => ticket.assignee === Store.CURRENT_USER.name || ticket.queue === "Megan Delia - Triage" || ticket.priority.startsWith("P1"))
      .map((ticket) => ({
        id: ticket.id,
        type: "Ticket",
        title: `${ticket.number} - ${ticket.title}`,
        subtitle: ticket.queue,
        priority: ticket.priority,
        status: ticket.status,
        due: ticket.slaDueAt,
        value: ticket.priority.startsWith("P1") ? "P1 response" : "SLA",
        sort: new Date(ticket.slaDueAt).getTime(),
        ticket
      }));

    const freightItems = state.freightOpportunities
      .filter((item) => item.salesOwner === Store.CURRENT_USER.name || item.status === "Sales review")
      .map((item) => ({
        id: item.id,
        type: "Freight",
        title: `${item.customerNumber} - ${item.recommendation}`,
        subtitle: `Order ${item.orderNumber}`,
        priority: item.confidence >= 90 ? "High" : "Review",
        status: item.status,
        due: item.autoReleaseDeadline,
        value: UI.formatMoney(item.internalSavings),
        sort: Date.now() + 3 * 60 * 60 * 1000,
        freight: item
      }));

    return [...ticketItems, ...freightItems].sort((a, b) => a.sort - b.sort);
  }

  function renderKpis(items) {
    const ticketCount = items.filter((item) => item.type === "Ticket").length;
    const freightItems = items.filter((item) => item.type === "Freight");
    const atRisk = items.filter((item) => item.type === "Ticket" && new Date(item.due).getTime() - Date.now() < 60 * 60 * 1000 && !["Resolved", "Closed"].includes(item.status)).length;
    const savings = freightItems.reduce((total, item) => total + item.freight.internalSavings, 0);
    document.getElementById("assignedCount").textContent = String(items.length);
    document.getElementById("assignedTicketCount").textContent = String(ticketCount);
    document.getElementById("assignedFreightCount").textContent = String(freightItems.length);
    document.getElementById("assignedFreightMeta").textContent = `${UI.formatMoney(savings, 0)} potential savings`;
    document.getElementById("assignedRiskCount").textContent = String(atRisk);
  }

  function render() {
    const items = getWork();
    renderKpis(items);
    const query = searchInput.value.trim().toLowerCase();
    const type = typeFilter.value;
    const filtered = items.filter((item) => {
      const haystack = `${item.title} ${item.subtitle} ${item.status} ${item.type}`.toLowerCase();
      return (!query || haystack.includes(query)) && (type === "all" || item.type.toLowerCase() === type);
    });

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No assigned work matches the current filters.</div></td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map((item) => `
      <tr>
        <td><button class="link-button" type="button" data-work-id="${UI.escapeHtml(item.id)}" data-work-type="${item.type.toLowerCase()}">${UI.escapeHtml(item.title)}</button><span class="subtext">${UI.escapeHtml(item.subtitle)}</span></td>
        <td><span class="badge ${item.type === "Freight" ? "badge-green" : "badge-blue"}">${item.type}</span></td>
        <td>${item.type === "Ticket" ? `<span class="badge ${UI.priorityClass(item.priority)}">${UI.escapeHtml(item.priority)}</span>` : `<span class="badge badge-amber">${UI.escapeHtml(item.priority)}</span>`}</td>
        <td><span class="badge ${UI.statusClass(item.status)}">${UI.escapeHtml(item.status)}</span></td>
        <td>${UI.escapeHtml(item.due)}</td>
        <td class="${item.type === "Freight" ? "money" : ""}">${UI.escapeHtml(item.value)}</td>
      </tr>`).join("");

    tbody.querySelectorAll("[data-work-id]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.workType === "ticket") {
        const ticket = Store.getTicket(button.dataset.workId);
        if (ticket) UI.openTicketDialog(ticket);
      } else {
        window.localStorage.setItem("masterflowOpenFreight", button.dataset.workId);
        window.location.href = "freight-optimization.html";
      }
    }));
  }

  searchInput.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  window.addEventListener("masterflow:state", render);
  render();
})();
