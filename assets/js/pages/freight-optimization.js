/*
 * Freight Optimization — page controller (Queue-Manager-only workspace).
 *
 * Isolation contract:
 *   - Freight data comes ONLY from window.MasterFlowFreight (key
 *     "masterflowFreightStateV1"). Ticketing state is never read or written.
 *   - Shared window.MasterFlowStore / window.MasterFlowUI are used read-only for
 *     formatting, toasts, and the layout access gate. Nothing here mutates
 *     tickets, users, queues, templates, approvals, SLAs, reporting, or roles.
 *   - Access is enforced by layout.js (freight-optimization is a persona-
 *     restricted, receiver-only page). If the visitor is not an authorized
 *     Queue Manager, layout.js redirects and UI.layoutReady is false, so this
 *     controller returns immediately and renders NO freight data.
 */
(function () {
  "use strict";

  var UI = window.MasterFlowUI;
  var Freight = window.MasterFlowFreight;

  // Authorization gate: do not touch or render any freight data until the
  // shared layout has confirmed this role/persona may view the page.
  if (!UI || !UI.layoutReady) return;
  if (!Freight) return;

  var tbody = document.getElementById("freightBody");
  var searchInput = document.getElementById("freightSearch");
  var statusFilter = document.getElementById("freightStatusFilter");
  var dialog = document.getElementById("freightDialog");
  var dialogBody = document.getElementById("freightDialogBody");
  var dialogTitle = document.getElementById("freightDialogTitle");
  var dialogSubtitle = document.getElementById("freightDialogSubtitle");
  var decisionNote = document.getElementById("freightDecisionNote");
  var holdButton = document.getElementById("freightHold");
  var releaseButton = document.getElementById("freightRelease");
  var salesButton = document.getElementById("freightSales");
  var resetButton = document.getElementById("freightResetScenario");
  if (!tbody || !searchInput || !statusFilter || !dialog) return;

  var activeId = null;

  var ACTION_LABELS = {
    hold: "Time-boxed hold approved",
    release: "Released unchanged",
    sales: "Sent to sales owner for review"
  };

  function isFinal(item) {
    return item.decision === "hold" || item.decision === "release";
  }

  function confidenceBadgeClass(confidence) {
    if (confidence >= 90) return "badge-green";
    if (confidence >= 70) return "badge-amber";
    return "badge-red";
  }

  function renderKpis(opportunities) {
    var open = opportunities.filter(function (item) { return !isFinal(item); });
    var potential = open.reduce(function (total, item) { return total + item.internalSavings; }, 0);
    var waitingSales = opportunities.filter(function (item) { return item.status === "Sales review"; }).length;
    var approved = opportunities
      .filter(function (item) { return item.decision === "hold"; })
      .reduce(function (total, item) { return total + item.internalSavings; }, 0);
    document.getElementById("freightOpenCount").textContent = String(open.length);
    document.getElementById("freightPotentialSavings").textContent = UI.formatMoney(potential, 0);
    document.getElementById("freightSalesCount").textContent = String(waitingSales);
    document.getElementById("freightApprovedSavings").textContent = UI.formatMoney(approved, 0);
  }

  function renderPolicy(settings) {
    document.getElementById("policyMinimumSavings").textContent = UI.formatMoney(settings.minimumSavings, 0);
    document.getElementById("policyManualConfidence").textContent = settings.manualReviewConfidence + "%";
    document.getElementById("policyAutoConfidence").textContent = settings.autoActionConfidence + "%";
    document.getElementById("policySavingsTarget").textContent = UI.formatMoney(settings.freightSavingsTarget, 0);
  }

  function render() {
    var opportunities = Freight.getOpportunities();
    var settings = Freight.getSettings();
    renderKpis(opportunities);
    renderPolicy(settings);

    var query = searchInput.value.trim().toLowerCase();
    var status = statusFilter.value;
    var visible = opportunities.filter(function (item) {
      var haystack = (item.customerNumber + " " + item.customerName + " " + item.orderNumber + " " + item.warehouse + " " + item.recommendation + " " + item.status).toLowerCase();
      var matchesQuery = !query || haystack.indexOf(query) !== -1;
      var matchesStatus =
        status === "all" ||
        (status === "open" && !isFinal(item)) ||
        (status === "sales" && item.status === "Sales review") ||
        (status === "decided" && isFinal(item));
      return matchesQuery && matchesStatus;
    });

    if (!visible.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">No freight opportunities match the current filters.</div></td></tr>';
      return;
    }

    tbody.innerHTML = visible.map(function (item) {
      var autoEligible = item.confidence >= settings.autoActionConfidence && item.guardrails.every(function (g) { return g.result === "pass"; });
      return '' +
        '<tr>' +
        '<td><button class="link-button" type="button" data-freight-id="' + UI.escapeHtml(item.id) + '">' + UI.escapeHtml(item.customerNumber) + " - " + UI.escapeHtml(item.orderNumber) + '</button><span class="subtext">' + UI.escapeHtml(item.customerName) + " · " + UI.escapeHtml(item.warehouse) + '</span></td>' +
        '<td>' + UI.escapeHtml(item.currentCarrier) + '<span class="subtext">' + UI.escapeHtml(item.currentService) + '</span></td>' +
        '<td>' + UI.escapeHtml(item.proposedCarrier) + '<span class="subtext">' + UI.escapeHtml(item.proposedService) + '</span></td>' +
        '<td>' + UI.formatMoney(item.currentFreightCost) + '</td>' +
        '<td class="money">' + UI.formatMoney(item.internalSavings) + '</td>' +
        '<td><span class="badge ' + confidenceBadgeClass(item.confidence) + '">' + item.confidence + '%</span></td>' +
        '<td>' + (autoEligible ? '<span class="badge badge-green">Guardrails pass</span>' : '<span class="badge badge-amber">Human review</span>') + '</td>' +
        '<td><span class="badge ' + UI.statusClass(item.status) + '">' + UI.escapeHtml(item.status) + '</span></td>' +
        '<td><button class="btn btn-secondary btn-sm" type="button" data-freight-id="' + UI.escapeHtml(item.id) + '">Review</button></td>' +
        '</tr>';
    }).join("");

    tbody.querySelectorAll("[data-freight-id]").forEach(function (button) {
      button.addEventListener("click", function () { openOpportunity(button.dataset.freightId); });
    });
  }

  function openOpportunity(id) {
    var opportunities = Freight.getOpportunities();
    var settings = Freight.getSettings();
    var item = opportunities.find(function (opportunity) { return opportunity.id === id; });
    if (!item) return;
    activeId = id;
    dialogTitle.textContent = "Freight opportunity - " + item.customerNumber;
    dialogSubtitle.textContent = "Order " + item.orderNumber + " · Decision before " + item.shippingCutoff;
    decisionNote.value = item.decisionNote || "";

    var confidenceMessage = item.confidence < settings.manualReviewConfidence
      ? '<div class="notice notice-warning"><span aria-hidden="true">!</span><div><strong>' + item.confidence + "% confidence is below the normal " + settings.manualReviewConfidence + '% review threshold.</strong><p>This item is surfaced only because the potential value is meaningful. It cannot be applied automatically.</p></div></div>'
      : item.confidence < settings.autoActionConfidence
        ? '<div class="notice notice-warning"><span aria-hidden="true">!</span><div><strong>Human review required.</strong><p>' + item.confidence + "% confidence is below the " + settings.autoActionConfidence + '% automatic-action threshold.</p></div></div>'
        : '<div class="notice notice-success"><span aria-hidden="true">✓</span><div><strong>Confidence meets the prototype auto-action threshold.</strong><p>Automatic action would still require every customer, service, export, inventory, and reliability guardrail to pass.</p></div></div>';

    var relatedOrders = item.relatedOrders.length
      ? '<div class="table-wrap"><table><thead><tr><th>Related order</th><th>Estimated ship</th><th>Value</th><th>Inventory</th></tr></thead><tbody>' +
        item.relatedOrders.map(function (order) {
          return "<tr><td>" + UI.escapeHtml(order.orderNumber) + "</td><td>" + UI.escapeHtml(order.estimatedShipDate) + "</td><td>" + UI.formatMoney(order.value, 0) + "</td><td>" + UI.escapeHtml(order.inventoryStatus) + "</td></tr>";
        }).join("") +
        "</tbody></table></div>"
      : '<p class="muted small">No related backlog orders are needed for this recommendation.</p>';

    var historyHtml = (item.decisionHistory || [])
      .slice()
      .reverse()
      .map(function (entry) {
        var label = ACTION_LABELS[entry.action] || entry.status || entry.action;
        return '' +
          '<div class="list-row"><div>' +
          '<div class="list-title">' + UI.escapeHtml(label) + '</div>' +
          '<div class="list-meta">' + UI.escapeHtml(UI.formatDate(entry.at)) + " · " + UI.escapeHtml(entry.by) + '</div>' +
          '<div class="small muted">' + UI.escapeHtml(entry.note || "No note provided.") + '</div>' +
          '</div></div>';
      })
      .join("") || '<p class="muted small">No decision history yet.</p>';

    var rationaleHtml = (item.rationale && item.rationale.length)
      ? '<ul class="freight-rationale">' + item.rationale.map(function (reason) { return "<li>" + UI.escapeHtml(reason) + "</li>"; }).join("") + "</ul>"
      : "";

    dialogBody.innerHTML = '' +
      '<div class="detail-grid">' +
      '<div class="detail-cell"><small>Customer</small><strong>' + UI.escapeHtml(item.customerNumber) + " · " + UI.escapeHtml(item.customerName) + '</strong></div>' +
      '<div class="detail-cell"><small>Order value</small><strong>' + UI.formatMoney(item.orderValue) + '</strong></div>' +
      '<div class="detail-cell"><small>Parts</small><strong>' + UI.escapeHtml(item.parts.join(", ")) + '</strong></div>' +
      '<div class="detail-cell"><small>Current freight</small><strong>' + UI.formatMoney(item.currentFreightCost) + '</strong></div>' +
      '<div class="detail-cell"><small>Proposed freight</small><strong>' + UI.formatMoney(item.proposedFreightCost) + '</strong></div>' +
      '<div class="detail-cell"><small>Modeled internal savings</small><strong class="money">' + UI.formatMoney(item.internalSavings) + '</strong></div>' +
      '<div class="detail-cell"><small>Modeled customer savings</small><strong>' + UI.formatMoney(item.customerSavings) + '</strong></div>' +
      '<div class="detail-cell"><small>Current promise date</small><strong>' + UI.escapeHtml(item.currentPromiseDate) + '</strong></div>' +
      '<div class="detail-cell"><small>Proposed promise date</small><strong>' + UI.escapeHtml(item.proposedPromiseDate) + '</strong></div>' +
      '<div class="detail-cell"><small>Decision owner</small><strong>' + UI.escapeHtml(item.salesOwner) + ' + Logistics</strong></div>' +
      '<div class="detail-cell"><small>Shipping cutoff</small><strong>' + UI.escapeHtml(item.shippingCutoff) + '</strong></div>' +
      '<div class="detail-cell"><small>Automatic release</small><strong>' + UI.escapeHtml(item.autoReleaseDeadline) + '</strong></div>' +
      '</div>' +
      confidenceMessage +
      '<div class="dialog-section"><h3>Recommendation</h3><p>' + UI.escapeHtml(item.recommendation || "No recommendation is available.") + "</p>" + rationaleHtml + '</div>' +
      '<div class="dialog-section"><h3>Related backlog orders</h3>' + relatedOrders + '</div>' +
      '<div class="dialog-section"><h3>Guardrail results</h3><div class="guardrail-list">' +
      item.guardrails.map(function (guardrail) {
        var name = guardrail.label || guardrail.name || "Guardrail";
        var detail = guardrail.detail ? '<span class="guardrail-detail">' + UI.escapeHtml(guardrail.detail) + "</span>" : "";
        return '<div class="guardrail ' + UI.escapeHtml(guardrail.result) + '"><span aria-hidden="true">' + (guardrail.result === "pass" ? "✓" : "!") + '</span><span>' + UI.escapeHtml(name) + " " + (guardrail.result === "pass" ? "passed" : "needs review") + detail + "</span></div>";
      }).join("") +
      '</div></div>' +
      '<div class="dialog-section"><h3>Decision history</h3><div class="list">' + historyHtml + '</div></div>';

    var final = isFinal(item);
    holdButton.disabled = final;
    releaseButton.disabled = final;
    salesButton.disabled = final;
    holdButton.textContent = item.decision === "hold" ? "Hold approved" : "Approve time-boxed hold";
    releaseButton.textContent = item.decision === "release" ? "Released unchanged" : "Release unchanged";
    if (final) decisionNote.value = item.decisionNote;
    if (!dialog.open) dialog.showModal();
  }

  function act(action) {
    if (!activeId) return;
    if (action === "release" && !decisionNote.value.trim()) {
      UI.showToast("Add a short decision reason before releasing the order unchanged.");
      decisionNote.focus();
      return;
    }
    var result = Freight.updateFreight(activeId, action, decisionNote.value);
    if (!result.ok) {
      UI.showToast(result.message);
      return;
    }
    var holdReleaseAt = result.opportunity.autoReleaseDeadline;
    var messages = {
      hold: "Time-boxed hold approved. It will release automatically at " + holdReleaseAt + ".",
      release: "Order released unchanged. The decision reason was recorded.",
      sales: "Draft sent to the sales owner for review. No customer email was sent automatically."
    };
    UI.showToast(messages[action]);
    dialog.close();
    if (action === "hold" || action === "release") statusFilter.value = "all";
    render();
  }

  holdButton.addEventListener("click", function () { act("hold"); });
  releaseButton.addEventListener("click", function () { act("release"); });
  salesButton.addEventListener("click", function () { act("sales"); });
  dialog.querySelectorAll("[data-close-freight]").forEach(function (button) {
    button.addEventListener("click", function () { dialog.close(); });
  });
  searchInput.addEventListener("input", render);
  statusFilter.addEventListener("change", render);

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      var accepted = window.confirm("Reset the Freight Optimization scenario to its original fictional opportunities? This does not affect any ticket data.");
      if (!accepted) return;
      Freight.reset();
      if (dialog.open) dialog.close();
      searchInput.value = "";
      statusFilter.value = "open";
      render();
      UI.showToast("Freight scenario reset to the original fictional opportunities.");
    });
  }

  render();
})();
