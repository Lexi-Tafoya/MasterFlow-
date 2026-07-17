(function (global) {
  "use strict";

  // Shared decision-review UI: renders a saved published base-rate comparison plus the
  // approve/deny/verify workflow into any container. Used both by the inline quote-readiness
  // section on freight-optimization.html and by the per-anomaly review dialog on the same
  // page, so the two surfaces can never drift out of sync with each other.
  //
  // Scoped entirely to `container.querySelector(...)` with data-role attributes rather than
  // element IDs, because both surfaces can be present in the DOM at the same time.

  function escapeHtml(value) {
    const UI = global.MasterFlowUI;
    return UI ? UI.escapeHtml(value == null ? "" : value) : String(value == null ? "" : value);
  }

  function formatMoney(value) {
    const UI = global.MasterFlowUI;
    return UI ? UI.formatMoney(value || 0, 2) : String(value || 0);
  }

  function profileDetails(label, scenario) {
    const profile = scenario.profile || {};
    const dimensional = profile.dimensional_weight_lb_per_package == null
      ? "Not calculated"
      : `${escapeHtml(profile.dimensional_weight_lb_per_package)} lb`;
    const actual = profile.rounded_actual_weight_lb_per_package == null
      ? "Not entered"
      : `${escapeHtml(profile.rounded_actual_weight_lb_per_package)} lb`;
    return `
      <div class="dialog-section">
        <h3>${escapeHtml(label)}</h3>
        <div class="detail-grid">
          <div class="detail-cell"><small>Service</small><strong>${escapeHtml(scenario.service_name)}</strong></div>
          <div class="detail-cell"><small>Zone</small><strong>${escapeHtml(scenario.zone)}</strong></div>
          <div class="detail-cell"><small>Package type</small><strong>${escapeHtml(scenario.package_type)}</strong></div>
          <div class="detail-cell"><small>Package count</small><strong>${escapeHtml(profile.package_count)}</strong></div>
          <div class="detail-cell"><small>Rounded actual / package</small><strong>${actual}</strong></div>
          <div class="detail-cell"><small>Dimensional / package</small><strong>${dimensional}</strong></div>
          <div class="detail-cell"><small>Billable / package</small><strong>${escapeHtml(profile.billable_weight_lb_per_package)} lb</strong></div>
          <div class="detail-cell"><small>Total billable weight</small><strong>${escapeHtml(profile.total_billable_weight_lb)} lb</strong></div>
          <div class="detail-cell"><small>Published base / package</small><strong>${escapeHtml(formatMoney(scenario.published_base_rate_per_package_usd))}</strong></div>
          <div class="detail-cell"><small>Published base total</small><strong>${escapeHtml(formatMoney(scenario.published_base_transportation_total_usd))}</strong></div>
        </div>
        ${profile.packaging_waste_lb
          ? `<div class="notice notice-info mt-12"><span>i</span><div><strong>Packaging opportunity</strong><p>Dimensional weight (${escapeHtml(profile.dimensional_weight_lb_per_package)} lb) is well above the actual weight (${escapeHtml(profile.rounded_actual_weight_lb_per_package)} lb) for this plan -- a smaller or better-fitting box could reduce billable weight by up to ${escapeHtml(profile.packaging_waste_lb)} lb per package.</p></div></div>`
          : ""}
      </div>`;
  }

  function reasonOptionsHtml(QuoteReadiness) {
    return `<option value="">Choose a reason</option>${QuoteReadiness.OVERRIDE_DENY_REASONS.map((entry) => `<option value="${escapeHtml(entry.code)}">${escapeHtml(entry.label)}</option>`).join("")}`;
  }

  function reasonLabel(QuoteReadiness, code) {
    const match = QuoteReadiness.OVERRIDE_DENY_REASONS.find((entry) => entry.code === code);
    return match ? match.label : code;
  }

  function render(container, candidateId, comparison, options) {
    if (!container) return;
    const QuoteReadiness = global.MasterFlowFreightQuoteReadiness;
    if (!QuoteReadiness) return;
    const settings = Object.assign({ reviewerName: "Reviewer", onUpdated: null }, options || {});

    if (!comparison) {
      container.innerHTML = "";
      return;
    }

    if (!comparison.ok) {
      container.innerHTML = `<div class="notice notice-danger"><span>!</span><div><strong>Quote comparison is not ready</strong><ul class="small" style="margin:8px 0 0;padding-left:18px">${(comparison.errors || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>`;
      return;
    }

    const draft = QuoteReadiness.getDraft(candidateId);
    const difference = Number(comparison.published_base_rate_difference_usd || 0);
    const approval = draft && draft.approval ? draft.approval : null;
    const approvedSavingsLabel = approval ? formatMoney(approval.approved_savings_usd) : "Not approved";
    const verification = draft && draft.verification ? draft.verification : null;
    const verifiedSavingsLabel = verification ? formatMoney(verification.verified_savings_usd) : "Not verified";
    const directionLabel = difference > 0
      ? "Potential published base-rate reduction"
      : difference < 0
        ? "Published base-rate increase"
        : "No published base-rate difference";
    const differenceClass = difference > 0 ? "good" : difference < 0 ? "bad" : "";
    const percent = comparison.published_base_rate_difference_percent == null
      ? "Not available"
      : `${comparison.published_base_rate_difference_percent.toFixed(1)}%`;
    const warnings = [
      ...(comparison.current.warnings || []).map((item) => `Current plan: ${item}`),
      ...(comparison.proposed.warnings || []).map((item) => `Proposed plan: ${item}`)
    ];
    const denial = draft && draft.denial ? draft.denial : null;
    const isDenied = Boolean(denial) && (!approval || new Date(denial.at).getTime() > new Date(approval.at).getTime());
    const risk = comparison.promise_date_risk;
    const isPending = !approval && !isDenied;
    const requiresExportConfirmation = isPending && comparison.rate_card_type === "EXPORT";
    const requiresCustomerAgreement = isPending && Boolean(risk && risk.misses_due_date);
    const riskBannerHtml = risk
      ? `<div class="notice ${risk.misses_due_date ? "notice-danger" : "notice-warning"} mt-12"><span>!</span><div><strong>${risk.misses_due_date ? "This change would miss the customer due date" : "Possible promise-date impact"}</strong><p>${escapeHtml(risk.message)}</p>
          <div class="detail-grid mt-12">
            <div class="detail-cell"><small>Current estimated transit</small><strong>~${risk.current_transit_days_estimate} day${risk.current_transit_days_estimate === 1 ? "" : "s"} (arrives ~${escapeHtml(risk.estimated_current_arrival)})</strong></div>
            <div class="detail-cell"><small>Proposed estimated transit</small><strong>~${risk.proposed_transit_days_estimate} day${risk.proposed_transit_days_estimate === 1 ? "" : "s"} (arrives ~${escapeHtml(risk.estimated_proposed_arrival)})</strong></div>
            <div class="detail-cell"><small>Customer due date</small><strong>${escapeHtml(risk.customer_due_date)}</strong></div>
          </div>
          <p class="muted small mt-12">Transit times are a fictional estimate for this prototype, not a real carrier delivery commitment.</p>
        </div></div>`
      : "";
    const expediteAlternative = comparison.expedite_alternative;
    const expediteAlternativeHtml = expediteAlternative
      ? `<div class="notice notice-info mt-12"><span>i</span><div><strong>Expedite prevention opportunity</strong><p>${escapeHtml(expediteAlternative.message)}</p></div></div>`
      : "";
    const salesReferral = draft && draft.sales_referral ? draft.sales_referral : null;
    const salesPendingBannerHtml = isPending && salesReferral
      ? `<div class="notice notice-warning mt-12"><span>!</span><div><strong>Waiting on Sales</strong><p>Sent to Sales by ${escapeHtml(salesReferral.by)} on ${escapeHtml(new Date(salesReferral.at).toLocaleString())} for customer confirmation of the promise-date change.${salesReferral.note ? ` Note: ${escapeHtml(salesReferral.note)}` : ""}</p></div></div>`
      : "";
    const activeHold = draft && draft.hold && !draft.hold.released_at ? draft.hold : null;
    const holdSectionHtml = isPending
      ? `<div class="dialog-section mt-18">
          <h3>Temporary hold</h3>
          ${activeHold
            ? `<div class="notice notice-warning"><span>!</span><div><strong>On hold until ${escapeHtml(new Date(activeHold.cutoff).toLocaleString())}</strong><p>Owner: ${escapeHtml(activeHold.owner)}. Placed ${escapeHtml(new Date(activeHold.at).toLocaleString())}.${activeHold.note ? ` Note: ${escapeHtml(activeHold.note)}` : ""} If nobody approves or denies before the cutoff, this automatically releases to the current plan.</p></div></div>
              <div class="dialog-actions mt-12"><button data-role="release-hold-button" class="btn btn-ghost" type="button">Release hold now</button></div>`
            : `<p class="muted small">Defer this decision with a named owner and a cutoff. If nobody decides by then, it automatically releases to the current plan -- no indefinite holds.</p>
              <div class="grid grid-2 mt-12">
                <div><label data-role="hold-owner-label"><strong>Hold owner</strong></label><input class="input" data-role="hold-owner-input" type="text" placeholder="Name responsible for this hold"></div>
                <div><label data-role="hold-cutoff-label"><strong>Cutoff</strong></label><input class="input" data-role="hold-cutoff-input" type="datetime-local"></div>
              </div>
              <label class="mt-12" data-role="hold-note-label"><strong>Hold note</strong></label>
              <textarea class="textarea" data-role="hold-note-input" rows="2" placeholder="Why this shipment is being held."></textarea>
              <div class="dialog-actions mt-12"><button data-role="place-hold-button" class="btn btn-secondary" type="button">Place hold</button></div>`}
        </div>`
      : "";
    const whichPlanHtml = isPending
      ? `<p class="small muted mt-12">Approving switches this shipment to <strong>${escapeHtml(comparison.proposed.service_name)}</strong> (${escapeHtml(formatMoney(comparison.proposed.published_base_transportation_total_usd))}). Denying keeps it on <strong>${escapeHtml(comparison.current.service_name)}</strong> (${escapeHtml(formatMoney(comparison.current.published_base_transportation_total_usd))}).</p>`
      : "";
    const reasonDropdownHtml = isPending
      ? `<label class="mt-12" data-role="reason-label"><strong>Reason (required either way)</strong></label>
        <select class="select" data-role="reason-select">${reasonOptionsHtml(QuoteReadiness)}</select>`
      : "";
    const customerAgreementHtml = requiresCustomerAgreement
      ? `<label class="mt-12" style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-role="agreement-checkbox"><span>Customer agrees to the revised delivery date</span></label>
        <div class="field mt-12"><label data-role="initials-label"><strong>Approver initials</strong></label><input class="input" data-role="initials-input" type="text" maxlength="8" placeholder="e.g. AT" style="max-width:120px"></div>`
      : "";
    const verificationHtml = verification
      ? `<div class="notice notice-success mt-12"><span>&#10003;</span><div><strong>Verified savings recorded</strong><p class="muted small">${escapeHtml(formatMoney(verification.verified_savings_usd))} verified by ${escapeHtml(verification.by)} on ${escapeHtml(new Date(verification.at).toLocaleString())}. Evidence: ${escapeHtml(verification.evidence_reference)}. Note: ${escapeHtml(verification.note)}</p></div></div>`
      : approval
      ? `<div class="dialog-section mt-18">
          <h3>Verify final savings</h3>
          <p class="muted small">Enter actual freight costs and evidence to record verified savings. This does not change a shipment.</p>
          <div class="grid grid-2 mt-12">
            <div><label data-role="verify-current-cost-label"><strong>Current actual freight cost (USD)</strong></label><input class="input" data-role="verify-current-cost" type="number" min="0" step="0.01" placeholder="e.g. 32.40" value="${escapeHtml(comparison.current.published_base_transportation_total_usd)}"><small class="muted">Defaults to the published current-service rate -- adjust if the real invoice differs.</small></div>
            <div><label data-role="verify-final-cost-label"><strong>Final actual freight cost (USD)</strong></label><input class="input" data-role="verify-final-cost" type="number" min="0" step="0.01" placeholder="e.g. 18.11"></div>
          </div>
          <label class="mt-12" data-role="verify-evidence-label"><strong>Evidence / reference</strong></label>
          <input class="input" data-role="verify-evidence" type="text" placeholder="Invoice number, final quote reference, etc.">
          <label class="mt-12" data-role="verify-note-label"><strong>Verification note</strong></label>
          <textarea class="textarea" data-role="verify-note" rows="3" placeholder="Explain how these actual costs were confirmed."></textarea>
          <div class="dialog-actions mt-12">
            <button data-role="verify-button" class="btn btn-primary" type="button">Record verified savings</button>
          </div>
          <p class="muted small">Reviewer: ${escapeHtml(settings.reviewerName)}. Verified savings = current actual cost &minus; final actual cost.</p>
        </div>`
      : "";

    container.innerHTML = `
      <div class="notice notice-success"><span>✓</span><div><strong>Published base rates compared</strong><p>The comparison is saved only in this browser session and remains unverified.</p></div></div>
      <div class="detail-grid mt-12">
        <div class="detail-cell"><small>Current published base</small><strong>${escapeHtml(formatMoney(comparison.current.published_base_transportation_total_usd))}</strong></div>
        <div class="detail-cell"><small>Proposed published base</small><strong>${escapeHtml(formatMoney(comparison.proposed.published_base_transportation_total_usd))}</strong></div>
        <div class="detail-cell"><small>${escapeHtml(directionLabel)}</small><strong class="${differenceClass}">${escapeHtml(formatMoney(Math.abs(difference)))}</strong></div>
        <div class="detail-cell"><small>Difference percentage</small><strong>${escapeHtml(percent)}</strong></div>
        <div class="detail-cell"><small>Cost scope</small><strong>Published base transportation only</strong></div>
        <div class="detail-cell"><small>Approved savings</small><strong>${escapeHtml(approvedSavingsLabel)}</strong></div>
        <div class="detail-cell"><small>Verified savings</small><strong>${escapeHtml(verifiedSavingsLabel)}</strong></div>
      </div>
      ${profileDetails("Current plan details", comparison.current)}
      ${profileDetails("Proposed plan details", comparison.proposed)}
      ${isDenied
        ? `<div class="notice notice-danger mt-12"><span>!</span><div><strong>Change denied</strong><p>Denied by ${escapeHtml(denial.by)} on ${escapeHtml(new Date(denial.at).toLocaleString())}. Reason: ${escapeHtml(reasonLabel(QuoteReadiness, denial.reason_code))}${denial.note ? ` -- ${escapeHtml(denial.note)}` : ""}. The current service remains unchanged.</p></div></div>`
        : approval
        ? `<div class="notice notice-success mt-12"><span>✓</span><div><strong>Approved savings recorded</strong><p>${escapeHtml(formatMoney(approval.approved_savings_usd))} approved by ${escapeHtml(approval.by)} on ${escapeHtml(new Date(approval.at).toLocaleString())}. Reason: ${escapeHtml(reasonLabel(QuoteReadiness, approval.override_reason_code))}${approval.note ? ` -- ${escapeHtml(approval.note)}` : ""}${approval.customer_agreement_confirmed ? ` Customer agreement confirmed by ${escapeHtml(approval.approver_initials)}.` : ""}</p></div></div>`
        : `<div class="dialog-section mt-18">
            <h3>Approve published savings</h3>
            ${requiresExportConfirmation ? `<div class="notice notice-danger"><span>!</span><div><strong>Export hold is authoritative</strong><p>This is an export shipment. Export holds must not be overridden -- confirm export/hazmat compliance before approving.</p></div></div>
            <label class="mt-12" style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-role="export-checkbox"><span>Export/hazmat compliance reviewed and confirmed</span></label>` : ""}
            ${expediteAlternativeHtml}
            ${riskBannerHtml}
            ${salesPendingBannerHtml}
            ${whichPlanHtml}
            ${reasonDropdownHtml}
            ${customerAgreementHtml}
            <label class="mt-12" data-role="note-label"><strong>Decision note</strong></label>
            <textarea class="textarea" data-role="note-input" rows="3" placeholder="Document why this published base-rate reduction is approved or denied for operational follow-up."></textarea>
            <div class="dialog-actions mt-12">
              <button data-role="approve-button" class="btn btn-primary" type="button" disabled>Approve -- switch to proposed ${escapeHtml(formatMoney(Math.max(difference, 0)))}</button>
              <button data-role="deny-button" class="btn btn-secondary" type="button" disabled>Deny -- keep current plan</button>
              ${risk ? `<button data-role="send-to-sales-button" class="btn btn-ghost" type="button">Send to Sales</button>` : ""}
            </div>
            <p class="muted small">Reviewer: ${escapeHtml(settings.reviewerName)}. Approval records the published base-rate reduction only; it does not verify final savings or change the shipment.</p>
          </div>`}
      ${holdSectionHtml}
      ${verificationHtml}
      ${warnings.length ? `<div class="notice notice-warning mt-12"><span>!</span><div><strong>Package-profile review</strong><ul class="small" style="margin:8px 0 0;padding-left:18px">${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>` : ""}
      <div class="notice notice-warning mt-12"><span>!</span><div><strong>Not a final freight quote or verified savings amount</strong><p>${escapeHtml(comparison.warning)} Excluded items include ${escapeHtml(comparison.excluded_costs.join(", "))}.</p></div></div>`;

    const approveButton = container.querySelector('[data-role="approve-button"]');
    const denyButton = container.querySelector('[data-role="deny-button"]');
    const exportCheckbox = container.querySelector('[data-role="export-checkbox"]');
    const reasonSelect = container.querySelector('[data-role="reason-select"]');
    const agreementCheckbox = container.querySelector('[data-role="agreement-checkbox"]');
    const initialsInput = container.querySelector('[data-role="initials-input"]');
    const noteInput = container.querySelector('[data-role="note-input"]');

    function rerender() {
      render(container, candidateId, comparison, settings);
    }

    function updateDecisionButtonsState() {
      const exportOk = !requiresExportConfirmation || (exportCheckbox && exportCheckbox.checked);
      const reasonOk = Boolean(reasonSelect && reasonSelect.value);
      const agreementOk = !requiresCustomerAgreement || (agreementCheckbox && agreementCheckbox.checked && initialsInput && initialsInput.value.trim());
      const noteOk = Boolean(noteInput && noteInput.value.trim());
      if (approveButton) approveButton.disabled = !(exportOk && reasonOk && agreementOk && noteOk);
      if (denyButton) denyButton.disabled = !reasonOk;
    }

    if (exportCheckbox) exportCheckbox.addEventListener("change", updateDecisionButtonsState);
    if (reasonSelect) reasonSelect.addEventListener("change", updateDecisionButtonsState);
    if (agreementCheckbox) agreementCheckbox.addEventListener("change", updateDecisionButtonsState);
    if (initialsInput) initialsInput.addEventListener("input", updateDecisionButtonsState);
    if (noteInput) noteInput.addEventListener("input", updateDecisionButtonsState);
    updateDecisionButtonsState();

    function notifyUpdated(updatedDraft) {
      if (typeof settings.onUpdated === "function") settings.onUpdated(updatedDraft);
    }

    if (approveButton) {
      approveButton.addEventListener("click", () => {
        try {
          const updatedDraft = QuoteReadiness.approveDraft(
            candidateId,
            settings.reviewerName,
            noteInput ? noteInput.value : "",
            {
              exportComplianceConfirmed: Boolean(exportCheckbox && exportCheckbox.checked),
              reasonCode: reasonSelect ? reasonSelect.value : "",
              customerAgreementConfirmed: Boolean(agreementCheckbox && agreementCheckbox.checked),
              approverInitials: initialsInput ? initialsInput.value : ""
            }
          );
          notifyUpdated(updatedDraft);
          rerender();
        } catch (error) {
          global.alert(error.message);
        }
      });
    }

    if (denyButton) {
      denyButton.addEventListener("click", () => {
        try {
          const updatedDraft = QuoteReadiness.denyDraft(
            candidateId,
            settings.reviewerName,
            reasonSelect ? reasonSelect.value : "",
            noteInput ? noteInput.value : ""
          );
          notifyUpdated(updatedDraft);
          rerender();
        } catch (error) {
          global.alert(error.message);
        }
      });
    }

    const sendToSalesButton = container.querySelector('[data-role="send-to-sales-button"]');
    if (sendToSalesButton) {
      sendToSalesButton.addEventListener("click", () => {
        try {
          const updatedDraft = QuoteReadiness.sendToSales(
            candidateId,
            settings.reviewerName,
            noteInput ? noteInput.value : ""
          );
          notifyUpdated(updatedDraft);
          rerender();
        } catch (error) {
          global.alert(error.message);
        }
      });
    }

    const placeHoldButton = container.querySelector('[data-role="place-hold-button"]');
    if (placeHoldButton) {
      placeHoldButton.addEventListener("click", () => {
        const ownerInput = container.querySelector('[data-role="hold-owner-input"]');
        const cutoffInput = container.querySelector('[data-role="hold-cutoff-input"]');
        const holdNoteInput = container.querySelector('[data-role="hold-note-input"]');
        try {
          const updatedDraft = QuoteReadiness.holdDraft(
            candidateId,
            ownerInput ? ownerInput.value : "",
            cutoffInput ? cutoffInput.value : "",
            holdNoteInput ? holdNoteInput.value : ""
          );
          notifyUpdated(updatedDraft);
          rerender();
        } catch (error) {
          global.alert(error.message);
        }
      });
    }

    const releaseHoldButton = container.querySelector('[data-role="release-hold-button"]');
    if (releaseHoldButton) {
      releaseHoldButton.addEventListener("click", () => {
        try {
          const updatedDraft = QuoteReadiness.releaseHold(candidateId, settings.reviewerName, "");
          notifyUpdated(updatedDraft);
          rerender();
        } catch (error) {
          global.alert(error.message);
        }
      });
    }

    const verifyButton = container.querySelector('[data-role="verify-button"]');
    if (verifyButton) {
      verifyButton.addEventListener("click", () => {
        const currentCostInput = container.querySelector('[data-role="verify-current-cost"]');
        const finalCostInput = container.querySelector('[data-role="verify-final-cost"]');
        const evidenceInput = container.querySelector('[data-role="verify-evidence"]');
        const verifyNoteInput = container.querySelector('[data-role="verify-note"]');
        try {
          const updatedDraft = QuoteReadiness.verifyDraft(
            candidateId,
            settings.reviewerName,
            verifyNoteInput ? verifyNoteInput.value : "",
            currentCostInput ? currentCostInput.value : "",
            finalCostInput ? finalCostInput.value : "",
            evidenceInput ? evidenceInput.value : ""
          );
          notifyUpdated(updatedDraft);
          rerender();
        } catch (error) {
          global.alert(error.message);
        }
      });
    }
  }

  const api = Object.freeze({ render });
  global.MasterFlowFreightDecisionPanel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
