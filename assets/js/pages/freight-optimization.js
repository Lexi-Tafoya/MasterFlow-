(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const tbody = document.getElementById("freightBody");
  const searchInput = document.getElementById("freightSearch");
  const statusFilter = document.getElementById("freightStatusFilter");
  const dialog = document.getElementById("freightDialog");
  const dialogBody = document.getElementById("freightDialogBody");
  const dialogTitle = document.getElementById("freightDialogTitle");
  const dialogSubtitle = document.getElementById("freightDialogSubtitle");
  const decisionNote = document.getElementById("freightDecisionNote");
  const holdButton = document.getElementById("freightHold");
  const releaseButton = document.getElementById("freightRelease");
  const salesButton = document.getElementById("freightSales");
  let activeId = null;

  function isFinal(item) {
    return item.decision === "hold" || item.decision === "release";
  }

  function renderKpis(state) {
    const open = state.freightOpportunities.filter((item) => !isFinal(item));
    const potential = open.reduce((total, item) => total + item.internalSavings, 0);
    const waitingSales = state.freightOpportunities.filter((item) => item.status === "Sales review").length;
    const approved = state.freightOpportunities.filter((item) => item.decision === "hold").reduce((total, item) => total + item.internalSavings, 0);
    document.getElementById("freightOpenCount").textContent = String(open.length);
    document.getElementById("freightPotentialSavings").textContent = UI.formatMoney(potential, 0);
    document.getElementById("freightSalesCount").textContent = String(waitingSales);
    document.getElementById("freightApprovedSavings").textContent = UI.formatMoney(approved, 0);
  }

  function renderPolicy(settings) {
    document.getElementById("policyMinimumSavings").textContent = UI.formatMoney(settings.minimumSavings, 0);
    document.getElementById("policyManualConfidence").textContent = `${settings.manualReviewConfidence}%`;
    document.getElementById("policyAutoConfidence").textContent = `${settings.autoActionConfidence}%`;
    document.getElementById("policySavingsTarget").textContent = UI.formatMoney(settings.freightSavingsTarget, 0);
  }

  function render() {
    const state = Store.getState();
    renderKpis(state);
    renderPolicy(state.settings);

    const query = searchInput.value.trim().toLowerCase();
    const status = statusFilter.value;
    const opportunities = state.freightOpportunities.filter((item) => {
      const haystack = `${item.customerNumber} ${item.customerName} ${item.orderNumber} ${item.warehouse} ${item.recommendation} ${item.status}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesStatus = status === "all" || (status === "open" && !isFinal(item)) || (status === "sales" && item.status === "Sales review") || (status === "decided" && isFinal(item));
      return matchesQuery && matchesStatus;
    });

    if (!opportunities.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">No freight opportunities match the current filters.</div></td></tr>';
      return;
    }

    tbody.innerHTML = opportunities.map((item) => {
      const autoEligible = item.confidence >= state.settings.autoActionConfidence && item.guardrails.every((guardrail) => guardrail.result === "pass");
      return `
        <tr>
          <td><button class="link-button" type="button" data-freight-id="${UI.escapeHtml(item.id)}">${UI.escapeHtml(item.customerNumber)} - ${UI.escapeHtml(item.orderNumber)}</button><span class="subtext">${UI.escapeHtml(item.customerName)} · ${UI.escapeHtml(item.warehouse)}</span></td>
          <td>${UI.escapeHtml(item.currentCarrier)}<span class="subtext">${UI.escapeHtml(item.currentService)}</span></td>
          <td>${UI.escapeHtml(item.proposedCarrier)}<span class="subtext">${UI.escapeHtml(item.proposedService)}</span></td>
          <td>${UI.formatMoney(item.currentFreightCost)}</td>
          <td class="money">${UI.formatMoney(item.internalSavings)}</td>
          <td><span class="badge ${item.confidence >= 90 ? "badge-green" : item.confidence >= 70 ? "badge-amber" : "badge-red"}">${item.confidence}%</span></td>
          <td>${autoEligible ? '<span class="badge badge-green">Guardrails pass</span>' : '<span class="badge badge-amber">Human review</span>'}</td>
          <td><span class="badge ${UI.statusClass(item.status)}">${UI.escapeHtml(item.status)}</span></td>
          <td><button class="btn btn-secondary btn-sm" type="button" data-freight-id="${UI.escapeHtml(item.id)}">Review</button></td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll("[data-freight-id]").forEach((button) => button.addEventListener("click", () => openOpportunity(button.dataset.freightId)));
  }

  function openOpportunity(id) {
    const state = Store.getState();
    const item = state.freightOpportunities.find((opportunity) => opportunity.id === id);
    if (!item) return;
    activeId = id;
    dialogTitle.textContent = `Freight opportunity - ${item.customerNumber}`;
    dialogSubtitle.textContent = `Order ${item.orderNumber} · Decision before ${item.shippingCutoff}`;
    decisionNote.value = item.decisionNote || "";

    const confidenceMessage = item.confidence < state.settings.manualReviewConfidence
      ? `<div class="notice notice-warning"><span>!</span><div><strong>${item.confidence}% confidence is below the normal ${state.settings.manualReviewConfidence}% review threshold.</strong><p>This item is surfaced only because the potential value is meaningful. It cannot be applied automatically.</p></div></div>`
      : item.confidence < state.settings.autoActionConfidence
        ? `<div class="notice notice-warning"><span>!</span><div><strong>Human review required.</strong><p>${item.confidence}% confidence is below the ${state.settings.autoActionConfidence}% automatic-action threshold.</p></div></div>`
        : `<div class="notice notice-success"><span>✓</span><div><strong>Confidence meets the prototype auto-action threshold.</strong><p>Automatic action would still require every customer, service, export, inventory, and reliability guardrail to pass.</p></div></div>`;

    const relatedOrders = item.relatedOrders.length
      ? `<div class="table-wrap"><table><thead><tr><th>Related order</th><th>Estimated ship</th><th>Value</th><th>Inventory</th></tr></thead><tbody>${item.relatedOrders.map((order) => `<tr><td>${UI.escapeHtml(order.orderNumber)}</td><td>${UI.escapeHtml(order.estimatedShipDate)}</td><td>${UI.formatMoney(order.value, 0)}</td><td>${UI.escapeHtml(order.inventoryStatus)}</td></tr>`).join("")}</tbody></table></div>`
      : '<p class="muted small">No related backlog orders are needed for this recommendation.</p>';

    dialogBody.innerHTML = `
      ${confidenceMessage}
      <div class="detail-grid mt-18">
        <div class="detail-cell"><small>Customer</small><strong>${UI.escapeHtml(item.customerNumber)} · ${UI.escapeHtml(item.customerName)}</strong></div>
        <div class="detail-cell"><small>Order value</small><strong>${UI.formatMoney(item.orderValue)}</strong></div>
        <div class="detail-cell"><small>Parts</small><strong>${UI.escapeHtml(item.parts.join(", "))}</strong></div>
        <div class="detail-cell"><small>Current freight</small><strong>${UI.formatMoney(item.currentFreightCost)}</strong></div>
        <div class="detail-cell"><small>Proposed freight</small><strong>${UI.formatMoney(item.proposedFreightCost)}</strong></div>
        <div class="detail-cell"><small>Internal savings</small><strong class="money">${UI.formatMoney(item.internalSavings)}</strong></div>
        <div class="detail-cell"><small>Customer savings</small><strong>${UI.formatMoney(item.customerSavings)}</strong></div>
        <div class="detail-cell"><small>Current promise date</small><strong>${UI.escapeHtml(item.currentPromiseDate)}</strong></div>
        <div class="detail-cell"><small>Proposed promise date</small><strong>${UI.escapeHtml(item.proposedPromiseDate)}</strong></div>
        <div class="detail-cell"><small>Decision owner</small><strong>${UI.escapeHtml(item.salesOwner)} + Logistics</strong></div>
        <div class="detail-cell"><small>Shipping cutoff</small><strong>${UI.escapeHtml(item.shippingCutoff)}</strong></div>
        <div class="detail-cell"><small>Automatic release</small><strong>${UI.escapeHtml(item.autoReleaseDeadline)}</strong></div>
      </div>
      <div class="dialog-section"><h3>Recommendation</h3><p class="small muted">${UI.escapeHtml(item.recommendation)}</p><ul class="small muted" style="padding-left:18px">${item.rationale.map((reason) => `<li>${UI.escapeHtml(reason)}</li>`).join("")}</ul></div>
      <div class="dialog-section"><h3>Related backlog orders</h3>${relatedOrders}</div>
      <div class="dialog-section"><h3>Guardrail results</h3><div class="guardrail-list">${item.guardrails.map((guardrail) => `<div class="guardrail ${guardrail.result}"><span>${guardrail.result === "pass" ? "✓" : "!"}</span><div><strong>${UI.escapeHtml(guardrail.label)}</strong><div>${UI.escapeHtml(guardrail.detail)}</div></div></div>`).join("")}</div></div>`;

    const final = isFinal(item);
    holdButton.disabled = final;
    releaseButton.disabled = final;
    salesButton.disabled = final;
    holdButton.textContent = item.decision === "hold" ? "Hold approved" : "Approve time-boxed hold";
    releaseButton.textContent = item.decision === "release" ? "Released unchanged" : "Release unchanged";
    if (final) decisionNote.value = item.decisionNote;
    dialog.showModal();
  }

  function act(action) {
    if (!activeId) return;
    if (action === "release" && !decisionNote.value.trim()) {
      UI.showToast("Add a short decision reason before releasing the order unchanged.");
      decisionNote.focus();
      return;
    }
    const result = Store.updateFreight(activeId, action, decisionNote.value);
    if (!result.ok) {
      UI.showToast(result.message);
      return;
    }
    const messages = {
      hold: `Time-boxed hold approved. It will release automatically at ${result.opportunity.autoReleaseDeadline} without a recorded response.`,
      release: "Order released unchanged. The decision reason was recorded.",
      sales: "Draft sent to the sales owner for review. No customer email was sent automatically."
    };
    UI.showToast(messages[action]);
    dialog.close();
    if (action === "hold" || action === "release") statusFilter.value = "all";
    render();
  }

  holdButton.addEventListener("click", () => act("hold"));
  releaseButton.addEventListener("click", () => act("release"));
  salesButton.addEventListener("click", () => act("sales"));
  dialog.querySelectorAll("[data-close-freight]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);
  window.addEventListener("masterflow:state", render);

  render();
  const requestedId = window.localStorage.getItem("masterflowOpenFreight");
  if (requestedId) {
    window.localStorage.removeItem("masterflowOpenFreight");
    window.setTimeout(() => openOpportunity(requestedId), 80);
  }
})();
