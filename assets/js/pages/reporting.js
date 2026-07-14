(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  function render() {
    const state = Store.getState();
    const tickets = state.tickets;
    const open = tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status));
    const resolved = tickets.filter((ticket) => ["Resolved", "Closed"].includes(ticket.status));
    const slaCompliant = tickets.filter((ticket) => {
      if (!["Resolved", "Closed"].includes(ticket.status)) return new Date(ticket.slaDueAt).getTime() > Date.now();
      return new Date(ticket.updatedAt).getTime() <= new Date(ticket.slaDueAt).getTime();
    }).length;
    const slaRate = tickets.length ? Math.round((slaCompliant / tickets.length) * 100) : 100;
    const approvedPrototypeSavings = state.freightOpportunities.filter((item) => item.decision === "hold").reduce((total, item) => total + item.internalSavings, 0);
    const verifiedSavings = state.settings.verifiedSavingsYtd + approvedPrototypeSavings;
    const savingsPercent = Math.min(100, Math.round((verifiedSavings / state.settings.freightSavingsTarget) * 100));
    const p1Open = open.filter((ticket) => ticket.priority.startsWith("P1")).length;

    document.getElementById("reportTicketVolume").textContent = String(tickets.length);
    document.getElementById("reportOpenBacklog").textContent = String(open.length);
    document.getElementById("reportSlaCompliance").textContent = `${slaRate}%`;
    document.getElementById("reportP1Open").textContent = String(p1Open);
    document.getElementById("reportVerifiedSavings").textContent = UI.formatMoney(verifiedSavings, 0);
    document.getElementById("reportSavingsTarget").textContent = `${savingsPercent}% of ${UI.formatMoney(state.settings.freightSavingsTarget, 0)} target`;
    document.getElementById("savingsProgress").style.width = `${savingsPercent}%`;
    document.getElementById("savingsProgressLabel").textContent = `${savingsPercent}%`;

    const queueCounts = {};
    tickets.forEach((ticket) => { queueCounts[ticket.queue] = (queueCounts[ticket.queue] || 0) + 1; });
    const maxQueue = Math.max(...Object.values(queueCounts), 1);
    document.getElementById("ticketQueueChart").innerHTML = Object.entries(queueCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([queue, count]) => `<div class="chart-row"><span>${UI.escapeHtml(queue)}</span><div class="chart-track"><div class="chart-fill" style="width:${Math.round(count / maxQueue * 100)}%"></div></div><strong>${count}</strong></div>`)
      .join("");

    const freightActions = [
      { label: "Shipment consolidation", value: 41820 },
      { label: "Service-level optimization", value: 33470 },
      { label: "Expedite prevention", value: 29115 },
      { label: "Packaging / dimensional weight", value: 21595 }
    ];
    const maxFreight = Math.max(...freightActions.map((item) => item.value));
    document.getElementById("freightSavingsChart").innerHTML = freightActions.map((item) => `<div class="chart-row"><span>${UI.escapeHtml(item.label)}</span><div class="chart-track"><div class="chart-fill" style="width:${Math.round(item.value / maxFreight * 100)}%"></div></div><strong>${UI.formatMoney(item.value, 0)}</strong></div>`).join("");

    document.getElementById("resolvedCount").textContent = String(resolved.length);
  }

  window.addEventListener("masterflow:state", render);
  render();
})();
