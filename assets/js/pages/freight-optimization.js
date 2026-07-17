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
const historyHtml = (item.decisionHistory || [])
  .slice()
  .reverse()
  .map((entry) => `
    <div class="list-row">
      <div>
        <div class="list-title">${UI.escapeHtml(entry.action)}</div>
        <div class="list-meta">
          ${UI.escapeHtml(UI.formatDate(entry.at))} · ${UI.escapeHtml(entry.by)}
        </div>
        <div class="small muted">
          ${UI.escapeHtml(entry.note || "No note provided.")}
        </div>
      </div>
    </div>
  `)
  .join("") || '<p class="muted small">No decision history yet.</p>';
    dialogBody.innerHTML = `
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
      ${confidenceMessage}


<div class="dialog-section">
  <h3>Decision history</h3>
  <div class="list">${historyHtml}</div>
</div>

<div class="dialog-section">
  <h3>Recommendation</h3>
  <p>${UI.escapeHtml(item.recommendation || "No recommendation is available.")}</p>
</div>

<div class="dialog-section">
  <h3>Related backlog orders</h3>
  ${relatedOrders}
</div>

<div class="dialog-section">
  <h3>Guardrail results</h3>
  <div class="guardrail-list">
    ${item.guardrails.map((guardrail) => `
      <div class="guardrail ${UI.escapeHtml(guardrail.result)}">
        <span>${guardrail.result === "pass" ? "✓" : "!"}</span>
        <span>${UI.escapeHtml(guardrail.label || guardrail.name || "Guardrail")}</span>
      </div>
    `).join("")}
  </div>
</div>
`;
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
    const holdReleaseAt = result.opportunity.autoReleaseDeadline;
const messages = {
  hold: "Time-boxed hold approved. It will release automatically at " + holdReleaseAt + ".",
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

  const anomalySummary = document.getElementById("freightAnomalySummary");
  const anomalyTableWrap = document.getElementById("freightAnomalyTableWrap");
  const anomalyBody = document.getElementById("freightAnomalyBody");
  const anomalySelectAll = document.getElementById("freightAnomalySelectAll");
  const anomalyBulkToolbar = document.getElementById("freightAnomalyBulkToolbar");
  const anomalyBulkCount = document.getElementById("freightAnomalyBulkCount");
  const anomalyBulkReason = document.getElementById("freightAnomalyBulkReason");
  const anomalyBulkNote = document.getElementById("freightAnomalyBulkNote");
  const anomalyBulkExportLabel = document.getElementById("freightAnomalyBulkExportLabel");
  const anomalyBulkExportConfirm = document.getElementById("freightAnomalyBulkExportConfirm");
  const anomalyBulkAgreementLabel = document.getElementById("freightAnomalyBulkAgreementLabel");
  const anomalyBulkAgreementConfirm = document.getElementById("freightAnomalyBulkAgreementConfirm");
  const anomalyBulkInitials = document.getElementById("freightAnomalyBulkInitials");
  const anomalyBulkApprove = document.getElementById("freightAnomalyBulkApprove");
  const anomalyBulkDeny = document.getElementById("freightAnomalyBulkDeny");
  const anomalyReviewDialog = document.getElementById("freightAnomalyReviewDialog");
  const anomalyReviewDialogTitle = document.getElementById("freightAnomalyReviewDialogTitle");
  const anomalyReviewDialogSubtitle = document.getElementById("freightAnomalyReviewDialogSubtitle");
  const anomalyReviewDialogBody = document.getElementById("freightAnomalyReviewDialogBody");
  let anomalyCandidates = [];
  const anomalySelection = new Set();

  function candidateRiskMissesDueDate(candidateId) {
    const QuoteReadiness = window.MasterFlowFreightQuoteReadiness;
    if (!QuoteReadiness) return false;
    const draft = QuoteReadiness.getDraft(candidateId);
    const risk = draft && draft.comparison && draft.comparison.ok ? draft.comparison.promise_date_risk : null;
    return Boolean(risk && risk.misses_due_date);
  }

  function openAnomalyReview(candidateId) {
    const QuoteReadiness = window.MasterFlowFreightQuoteReadiness;
    const DecisionPanel = window.MasterFlowFreightDecisionPanel;
    if (!QuoteReadiness || !DecisionPanel || !anomalyReviewDialog || !anomalyReviewDialogBody) return;
    const candidate = anomalyCandidates.find((item) => item.id === candidateId);
    const draft = QuoteReadiness.getDraft(candidateId);
    const comparison = draft ? draft.comparison : null;
    if (anomalyReviewDialogTitle) anomalyReviewDialogTitle.textContent = candidate ? `Anomaly review - ${candidate.customer_number}` : "Anomaly review";
    if (anomalyReviewDialogSubtitle) anomalyReviewDialogSubtitle.textContent = candidate ? `${candidate.destination_display} · ${candidate.warehouse_code}` : "";
    DecisionPanel.render(anomalyReviewDialogBody, candidateId, comparison, {
      reviewerName: "Alexandra Tafoya",
      onUpdated: () => {
        window.dispatchEvent(new CustomEvent("masterflow:freight-quote-draft-updated", { detail: { candidate_id: candidateId } }));
      }
    });
    anomalyReviewDialog.showModal();
  }

  if (anomalyReviewDialog) {
    anomalyReviewDialog.querySelectorAll("[data-close-anomaly-review]").forEach((button) => {
      button.addEventListener("click", () => anomalyReviewDialog.close());
    });
  }

  function formatRatio(value) {
    return value == null ? "Not applicable" : `${(value * 100).toFixed(1)}%`;
  }

  function populateBulkReasonOptions(selectEl) {
    const QuoteReadiness = window.MasterFlowFreightQuoteReadiness;
    if (!selectEl || !QuoteReadiness || selectEl.dataset.populated) return;
    QuoteReadiness.OVERRIDE_DENY_REASONS.forEach((entry) => {
      selectEl.insertAdjacentHTML("beforeend", `<option value="${UI.escapeHtml(entry.code)}">${UI.escapeHtml(entry.label)}</option>`);
    });
    selectEl.dataset.populated = "true";
  }

  function updateAnomalyBulkToolbar() {
    if (!anomalyBulkToolbar) return;
    const count = anomalySelection.size;
    if (!count) {
      anomalyBulkToolbar.hidden = true;
      return;
    }
    anomalyBulkToolbar.hidden = false;
    if (anomalyBulkCount) anomalyBulkCount.textContent = `${count} candidate${count === 1 ? "" : "s"} selected`;

    const selectedCandidates = Array.from(anomalySelection).map((id) => anomalyCandidates.find((candidate) => candidate.id === id)).filter(Boolean);
    const needsExport = selectedCandidates.some((candidate) => candidate.rate_card_type === "EXPORT");
    if (anomalyBulkExportLabel) anomalyBulkExportLabel.hidden = !needsExport;

    const needsAgreement = Array.from(anomalySelection).some((id) => candidateRiskMissesDueDate(id));
    if (anomalyBulkAgreementLabel) anomalyBulkAgreementLabel.hidden = !needsAgreement;
    if (anomalyBulkInitials) anomalyBulkInitials.hidden = !needsAgreement;

    const reasonOk = Boolean(anomalyBulkReason && anomalyBulkReason.value);
    const exportOk = !needsExport || (anomalyBulkExportConfirm && anomalyBulkExportConfirm.checked);
    const agreementOk = !needsAgreement || (anomalyBulkAgreementConfirm && anomalyBulkAgreementConfirm.checked && anomalyBulkInitials && anomalyBulkInitials.value.trim());
    if (anomalyBulkApprove) anomalyBulkApprove.disabled = !(reasonOk && exportOk && agreementOk);
    if (anomalyBulkDeny) anomalyBulkDeny.disabled = !reasonOk;
  }

  function runAnomalyBulkAction(action) {
    const QuoteReadiness = window.MasterFlowFreightQuoteReadiness;
    if (!QuoteReadiness || !anomalySelection.size) return;
    const ids = Array.from(anomalySelection);
    const result = QuoteReadiness.bulkDecide(ids, action, "Alexandra Tafoya", {
      reasonCode: anomalyBulkReason ? anomalyBulkReason.value : "",
      note: anomalyBulkNote ? anomalyBulkNote.value : "",
      exportComplianceConfirmed: Boolean(anomalyBulkExportConfirm && anomalyBulkExportConfirm.checked),
      customerAgreementConfirmed: Boolean(anomalyBulkAgreementConfirm && anomalyBulkAgreementConfirm.checked),
      approverInitials: anomalyBulkInitials ? anomalyBulkInitials.value : ""
    });
    anomalySelection.clear();
    if (anomalyBulkNote) anomalyBulkNote.value = "";
    if (anomalyBulkReason) anomalyBulkReason.value = "";
    if (anomalyBulkExportConfirm) anomalyBulkExportConfirm.checked = false;
    if (anomalyBulkAgreementConfirm) anomalyBulkAgreementConfirm.checked = false;
    if (anomalyBulkInitials) anomalyBulkInitials.value = "";
    const failedSummary = result.failed.length
      ? ` ${result.failed.length} failed: ${result.failed.map((item) => item.message).join(" ")}`
      : "";
    UI.showToast(`${result.succeeded.length} ${action === "approve" ? "approved" : "denied"}.${failedSummary}`);
    window.dispatchEvent(new CustomEvent("masterflow:freight-quote-draft-updated", { detail: { bulk: true } }));
  }

  if (anomalyBulkReason) anomalyBulkReason.addEventListener("change", updateAnomalyBulkToolbar);
  if (anomalyBulkExportConfirm) anomalyBulkExportConfirm.addEventListener("change", updateAnomalyBulkToolbar);
  if (anomalyBulkAgreementConfirm) anomalyBulkAgreementConfirm.addEventListener("change", updateAnomalyBulkToolbar);
  if (anomalyBulkInitials) anomalyBulkInitials.addEventListener("input", updateAnomalyBulkToolbar);
  if (anomalyBulkApprove) anomalyBulkApprove.addEventListener("click", () => runAnomalyBulkAction("approve"));
  if (anomalyBulkDeny) anomalyBulkDeny.addEventListener("click", () => runAnomalyBulkAction("deny"));

  function renderAnomalies() {
    if (!anomalySummary || !anomalyTableWrap || !anomalyBody) return;
    const Anomaly = window.FreightAnomaly;
    const QuoteReadiness = window.MasterFlowFreightQuoteReadiness;

    if (!Anomaly || !QuoteReadiness || !anomalyCandidates.length) {
      anomalySummary.textContent = "Quote candidates from the freight-review candidate table above to enable anomaly screening. A freight anomaly cannot be evaluated before a published base-rate figure exists.";
      anomalyTableWrap.hidden = true;
      anomalyBody.innerHTML = "";
      anomalySelection.clear();
      updateAnomalyBulkToolbar();
      return;
    }

    const result = Anomaly.detect(anomalyCandidates, (id) => QuoteReadiness.getDraft(id));

    if (!result.quoted_count) {
      anomalySummary.textContent = "No candidates have a saved published base-rate comparison yet. Quote candidates from the freight-review candidate table above to enable anomaly screening.";
      anomalyTableWrap.hidden = true;
      anomalyBody.innerHTML = "";
      anomalySelection.clear();
      updateAnomalyBulkToolbar();
      return;
    }

    anomalySummary.textContent = `${result.quoted_count} candidate${result.quoted_count === 1 ? "" : "s"} quoted; ${result.flagged_count} flagged as a freight cost anomaly (threshold: ${result.sigma_multiplier}σ vs peers, or fixed screening thresholds when fewer than ${result.min_peer_group_size} peers are quoted).`;

    if (!result.flagged_count) {
      anomalyTableWrap.hidden = true;
      anomalyBody.innerHTML = "";
      anomalySelection.clear();
      updateAnomalyBulkToolbar();
      return;
    }

    anomalyTableWrap.hidden = false;
    const candidatesById = new Map(anomalyCandidates.map((candidate) => [candidate.id, candidate]));
    const flaggedIds = new Set(result.flagged.map((flag) => flag.candidate_id));
    Array.from(anomalySelection).forEach((id) => { if (!flaggedIds.has(id)) anomalySelection.delete(id); });

    let anyBulkActable = false;
    anomalyBody.innerHTML = result.flagged.map((flag) => {
      const candidate = candidatesById.get(flag.candidate_id);
      const label = candidate ? `${candidate.customer_number} · ${candidate.destination_display}` : flag.candidate_id;
      const bulkActStatusCode = QuoteReadiness.getStatus(flag.candidate_id).code;
      const canBulkAct = bulkActStatusCode === "compared" || bulkActStatusCode === "sales_pending" || bulkActStatusCode === "on_hold";
      if (canBulkAct) anyBulkActable = true;
      const checkboxCell = canBulkAct
        ? `<td><input type="checkbox" class="anomaly-bulk-checkbox" data-candidate-id="${UI.escapeHtml(flag.candidate_id)}"${anomalySelection.has(flag.candidate_id) ? " checked" : ""}></td>`
        : "<td></td>";
      return `
        <tr>
          ${checkboxCell}
          <td><strong>${UI.escapeHtml(label)}</strong><span class="subtext">${UI.escapeHtml(flag.candidate_id)}</span></td>
          <td>${UI.escapeHtml(flag.peer_group)}</td>
          <td>${UI.formatMoney(flag.freight_usd)}</td>
          <td>${UI.formatMoney(flag.order_value_usd)}</td>
          <td>${UI.formatMoney(flag.margin_usd)}</td>
          <td>${formatRatio(flag.ratio_to_value)}</td>
          <td>${formatRatio(flag.ratio_to_margin)}</td>
          <td><ul class="small muted" style="margin:0;padding-left:16px">${flag.reasons.map((reason) => `<li>${UI.escapeHtml(reason)}</li>`).join("")}</ul></td>
          <td><button class="btn btn-secondary btn-sm" type="button" data-review-candidate-id="${UI.escapeHtml(flag.candidate_id)}">Review</button></td>
        </tr>`;
    }).join("");

    populateBulkReasonOptions(anomalyBulkReason);
    anomalyBody.querySelectorAll(".anomaly-bulk-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.candidateId;
        if (checkbox.checked) anomalySelection.add(id); else anomalySelection.delete(id);
        updateAnomalyBulkToolbar();
      });
    });
    anomalyBody.querySelectorAll("[data-review-candidate-id]").forEach((button) => {
      button.addEventListener("click", () => openAnomalyReview(button.dataset.reviewCandidateId));
    });
    if (anomalySelectAll) {
      anomalySelectAll.checked = false;
      anomalySelectAll.disabled = !anyBulkActable;
      anomalySelectAll.title = anyBulkActable ? "" : "No flagged candidates are still awaiting a decision -- everything visible has already been approved, denied, or resolved.";
      anomalySelectAll.onchange = () => {
        anomalyBody.querySelectorAll(".anomaly-bulk-checkbox").forEach((checkbox) => {
          checkbox.checked = anomalySelectAll.checked;
          const id = checkbox.dataset.candidateId;
          if (anomalySelectAll.checked) anomalySelection.add(id); else anomalySelection.delete(id);
        });
        updateAnomalyBulkToolbar();
      };
    }
    updateAnomalyBulkToolbar();
  }

  const costBreakdownSummary = document.getElementById("freightCostBreakdownSummary");
  const costBreakdownGrid = document.getElementById("freightCostBreakdownGrid");
  const costByCustomerEl = document.getElementById("freightCostByCustomer");
  const costByWarehouseEl = document.getElementById("freightCostByWarehouse");
  const costByCarrierEl = document.getElementById("freightCostByCarrier");
  const costByProductEl = document.getElementById("freightCostByProduct");

  function renderChartBars(container, entries) {
    if (!container) return;
    if (!entries.length) {
      container.innerHTML = '<p class="muted small">No data.</p>';
      return;
    }
    const max = Math.max(...entries.map((entry) => entry.value));
    container.innerHTML = entries.map((entry) => `<div class="chart-row"><span>${UI.escapeHtml(entry.label)}</span><div class="chart-track"><div class="chart-fill" style="width:${Math.round(entry.value / max * 100)}%"></div></div><strong>${UI.formatMoney(entry.value, 0)}</strong></div>`).join("");
  }

  function topEntries(map, limit) {
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  function renderCostBreakdown() {
    if (!costBreakdownSummary || !costBreakdownGrid) return;
    const QuoteReadiness = window.MasterFlowFreightQuoteReadiness;

    if (!QuoteReadiness || !anomalyCandidates.length) {
      costBreakdownSummary.textContent = "Quote candidates from the freight-review candidate table above to see this breakdown.";
      costBreakdownGrid.hidden = true;
      return;
    }

    const byCustomer = new Map();
    const byWarehouse = new Map();
    const byCarrier = new Map();
    const byProduct = new Map();
    let quotedCount = 0;
    let totalFreight = 0;

    function add(map, key, amount) {
      if (!key) return;
      map.set(key, (map.get(key) || 0) + amount);
    }

    anomalyCandidates.forEach((candidate) => {
      const draft = QuoteReadiness.getDraft(candidate.id);
      const comparison = draft && draft.comparison && draft.comparison.ok ? draft.comparison : null;
      if (!comparison) return;
      const freight = Number(comparison.current.published_base_transportation_total_usd || 0);
      quotedCount += 1;
      totalFreight += freight;
      add(byCustomer, candidate.customer_number, freight);
      add(byWarehouse, candidate.warehouse_code, freight);
      add(byCarrier, (candidate.ship_via_values || [])[0], freight);
      const products = new Set((candidate.records || []).map((record) => record.product_code).filter(Boolean));
      products.forEach((product) => add(byProduct, product, freight));
    });

    if (!quotedCount) {
      costBreakdownSummary.textContent = "No candidates have a saved published base-rate comparison yet.";
      costBreakdownGrid.hidden = true;
      return;
    }

    costBreakdownSummary.textContent = `${quotedCount} quoted candidate${quotedCount === 1 ? "" : "s"} totaling ${UI.formatMoney(totalFreight, 0)} in published base-rate freight.`;
    costBreakdownGrid.hidden = false;

    renderChartBars(costByCustomerEl, topEntries(byCustomer, 8));
    renderChartBars(costByWarehouseEl, topEntries(byWarehouse, 8));
    renderChartBars(costByCarrierEl, topEntries(byCarrier, 8));
    renderChartBars(costByProductEl, topEntries(byProduct, 8));
  }

  function writeCostSummaryCache() {
    const Cache = window.MasterFlowFreightCostSummaryStore;
    const QuoteReadiness = window.MasterFlowFreightQuoteReadiness;
    const ScheduledOrderCandidates = window.MasterFlowScheduledOrderCandidates;
    if (!Cache) return;

    if (!QuoteReadiness || !anomalyCandidates.length) {
      Cache.clear();
      return;
    }

    const settings = Store.getState().settings || {};
    let quotedCount = 0;
    let totalQuotedFreight = 0;
    let totalApprovedSavings = 0;
    let totalVerifiedSavings = 0;
    let verifiedCandidateCount = 0;
    const approvedByType = {};
    const verifiedByType = {};
    const overrideCountsByReason = {};
    const denyCountsByReason = {};
    const savingsByZone = {};
    const savingsByCarrier = {};
    let autoQualityCount = 0;
    let autoQualityApprovedCount = 0;
    let autoQualitySavingsUsd = 0;
    let missedPromiseDateCount = 0;
    let missedPromiseDateSavingsUsd = 0;
    const missedPromiseDateByReason = {};
    const decisionHistory = [];

    function decisionHistoryEntry(candidate, draft, status) {
      let event = null;
      let amount = null;
      let reasonCode = null;
      if (status.code === "verified") {
        event = draft.verification;
        amount = Number(draft.verification.verified_savings_usd || 0);
      } else if (status.code === "denied") {
        event = draft.denial;
        reasonCode = draft.denial.reason_code;
      } else if (status.code === "approved") {
        event = draft.approval;
        amount = Number(draft.approval.approved_savings_usd || 0);
        reasonCode = draft.approval.override_reason_code;
      } else if (status.code === "sales_pending") {
        event = draft.sales_referral;
      } else if (status.code === "on_hold") {
        event = draft.hold;
      }
      if (!event) return null;
      return {
        candidate_id: candidate.id,
        customer_number: candidate.customer_number || null,
        destination_display: candidate.destination_display || null,
        decision_code: status.code,
        decision_label: status.label,
        decided_at: event.at,
        decided_by: event.by || event.owner || null,
        reason_code: reasonCode,
        amount_usd: amount
      };
    }

    anomalyCandidates.forEach((candidate) => {
      const draft = QuoteReadiness.getDraft(candidate.id);
      const comparison = draft && draft.comparison && draft.comparison.ok ? draft.comparison : null;
      if (!comparison) return;

      const status = QuoteReadiness.getStatus(candidate.id);
      const historyEntry = decisionHistoryEntry(candidate, draft, status);
      if (historyEntry) decisionHistory.push(historyEntry);
      quotedCount += 1;
      totalQuotedFreight += Number(comparison.current.published_base_transportation_total_usd || 0);
      const type = candidate.candidate_type || "unknown";

      const risk = comparison.promise_date_risk;
      const meetsPromiseDate = !risk || !risk.misses_due_date;
      const meetsSavings = Number(comparison.published_base_rate_difference_usd || 0) >= Number(settings.minimumSavings || 0);
      const confidence = ScheduledOrderCandidates && typeof ScheduledOrderCandidates.confidenceFor === "function"
        ? ScheduledOrderCandidates.confidenceFor(candidate, comparison)
        : null;
      const meetsConfidence = confidence != null && confidence >= Number(settings.autoActionConfidence || 0);
      const isAutoQuality = meetsConfidence && meetsSavings && meetsPromiseDate;
      if (isAutoQuality) autoQualityCount += 1;

      if (draft.approval) {
        const approvedSavings = Number(draft.approval.approved_savings_usd || 0);
        approvedByType[type] = (approvedByType[type] || 0) + approvedSavings;
        totalApprovedSavings += approvedSavings;
        if (comparison.current.zone) savingsByZone[comparison.current.zone] = (savingsByZone[comparison.current.zone] || 0) + approvedSavings;
        if (comparison.proposed.carrier) savingsByCarrier[comparison.proposed.carrier] = (savingsByCarrier[comparison.proposed.carrier] || 0) + approvedSavings;
        if (isAutoQuality) {
          autoQualityApprovedCount += 1;
          autoQualitySavingsUsd += approvedSavings;
        }
        if (draft.approval.override_reason_code) {
          overrideCountsByReason[draft.approval.override_reason_code] = (overrideCountsByReason[draft.approval.override_reason_code] || 0) + 1;
        }
        if (risk && risk.misses_due_date) {
          missedPromiseDateCount += 1;
          missedPromiseDateSavingsUsd += approvedSavings;
          const reasonCode = draft.approval.override_reason_code || "other";
          missedPromiseDateByReason[reasonCode] = (missedPromiseDateByReason[reasonCode] || 0) + 1;
        }
      }
      if (draft.verification) {
        const verifiedSavings = Number(draft.verification.verified_savings_usd || 0);
        verifiedByType[type] = (verifiedByType[type] || 0) + verifiedSavings;
        totalVerifiedSavings += verifiedSavings;
        verifiedCandidateCount += 1;
      }
      if (draft.denial) {
        denyCountsByReason[draft.denial.reason_code] = (denyCountsByReason[draft.denial.reason_code] || 0) + 1;
      }
    });

    if (!quotedCount) {
      Cache.clear();
      return;
    }

    Cache.save({
      updated_at: new Date().toISOString(),
      quoted_count: quotedCount,
      total_quoted_freight_usd: totalQuotedFreight,
      total_approved_savings_usd: totalApprovedSavings,
      total_verified_savings_usd: totalVerifiedSavings,
      verified_candidate_count: verifiedCandidateCount,
      approved_savings_by_type: approvedByType,
      verified_savings_by_type: verifiedByType,
      approved_savings_by_zone: savingsByZone,
      approved_savings_by_carrier: savingsByCarrier,
      override_counts_by_reason: overrideCountsByReason,
      deny_counts_by_reason: denyCountsByReason,
      auto_approval_quality_confidence_threshold: Number(settings.autoActionConfidence || 0),
      auto_quality_count: autoQualityCount,
      auto_quality_approved_count: autoQualityApprovedCount,
      auto_quality_savings_usd: autoQualitySavingsUsd,
      missed_promise_date_count: missedPromiseDateCount,
      missed_promise_date_savings_usd: missedPromiseDateSavingsUsd,
      missed_promise_date_by_reason: missedPromiseDateByReason,
      decision_history: decisionHistory.slice().sort((a, b) => new Date(b.decided_at) - new Date(a.decided_at))
    });
  }

  window.addEventListener("masterflow:scheduled-order-candidates-built", (event) => {
    anomalyCandidates = (event.detail && event.detail.candidates) || [];
    renderAnomalies();
    renderCostBreakdown();
    writeCostSummaryCache();
  });

  window.addEventListener("masterflow:scheduled-orders-cleared", () => {
    anomalyCandidates = [];
    renderAnomalies();
    renderCostBreakdown();
    writeCostSummaryCache();
  });

  window.addEventListener("masterflow:freight-quote-draft-updated", () => {
    renderAnomalies();
    renderCostBreakdown();
    writeCostSummaryCache();
  });

  renderAnomalies();
  renderCostBreakdown();
  writeCostSummaryCache();
})();