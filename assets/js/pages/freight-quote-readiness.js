(function (global) {
  "use strict";

  const QuoteReadiness = global.MasterFlowFreightQuoteReadiness;
  const RateCards = global.MasterFlowRateCards;
  const UI = global.MasterFlowUI;
  const DecisionPanel = global.MasterFlowFreightDecisionPanel;
  const mount = document.getElementById("scheduledOrderCandidateQuoteReadiness");

  if (!QuoteReadiness || !RateCards || !UI || !UI.layoutReady || !mount || !DecisionPanel) return;

  let currentLibrary = null;
  let activeCandidate = null;

  function escape(value) {
    return UI.escapeHtml(value == null ? "" : value);
  }

  function formatMoney(value) {
    return UI.formatMoney(value || 0, 2);
  }

  function valueOf(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element && value != null) element.value = String(value);
  }

  function scenarioMarkup(prefix, title, countHint) {
    return `
      <section class="card" style="box-shadow:none;border:1px solid var(--border-color, #d9e2ec)">
        <div class="card-header"><div><h3>${escape(title)}</h3><p>Enter one representative package profile. When package count is greater than one, the same profile is applied to each package.</p></div></div>
        <div class="card-body">
          <div class="field-row">
            <div class="field"><label for="quote${prefix}Service">Carrier service</label><select class="select" id="quote${prefix}Service"><option value="">Choose service</option></select></div>
            <div class="field"><label for="quote${prefix}Zone">Zone</label><select class="select" id="quote${prefix}Zone"><option value="">Choose zone</option></select></div>
          </div>
          <div class="field-row mt-12">
            <div class="field"><label for="quote${prefix}Package">Package type</label><select class="select" id="quote${prefix}Package"><option value="">Choose package type</option></select></div>
            <div class="field"><label for="quote${prefix}Count">Package count</label><input class="input" id="quote${prefix}Count" type="number" min="1" step="1" placeholder="Example: ${escape(countHint)}"></div>
          </div>
          <div class="field-row mt-12">
            <div class="field"><label for="quote${prefix}Actual">Actual weight per package (lb)</label><input class="input" id="quote${prefix}Actual" type="number" min="0" step="0.1" placeholder="Example: 12.4"></div>
            <div class="field"><label for="quote${prefix}ManualBillable">Manual billable weight per package (optional)</label><input class="input" id="quote${prefix}ManualBillable" type="number" min="0" step="0.1" placeholder="Use when already known"></div>
          </div>
          <div class="mt-12" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
            <div class="field"><label for="quote${prefix}Length">Length (in)</label><input class="input" id="quote${prefix}Length" type="number" min="0" step="0.1"></div>
            <div class="field"><label for="quote${prefix}Width">Width (in)</label><input class="input" id="quote${prefix}Width" type="number" min="0" step="0.1"></div>
            <div class="field"><label for="quote${prefix}Height">Height (in)</label><input class="input" id="quote${prefix}Height" type="number" min="0" step="0.1"></div>
          </div>
          <div class="field mt-12"><label for="quote${prefix}Divisor">Dimensional divisor</label><input class="input" id="quote${prefix}Divisor" type="number" min="1" step="1" placeholder="Enter the applicable contract or rate-guide divisor"><small>No divisor is assumed by the prototype. Confirm the value that applies to the service and contract.</small></div>
        </div>
      </section>`;
  }

  function option(value, label) {
    return `<option value="${escape(value)}">${escape(label)}</option>`;
  }

  function scenarioIds(prefix) {
    return {
      service: `quote${prefix}Service`,
      zone: `quote${prefix}Zone`,
      packageType: `quote${prefix}Package`,
      count: `quote${prefix}Count`,
      actual: `quote${prefix}Actual`,
      manualBillable: `quote${prefix}ManualBillable`,
      length: `quote${prefix}Length`,
      width: `quote${prefix}Width`,
      height: `quote${prefix}Height`,
      divisor: `quote${prefix}Divisor`
    };
  }

  function populateServices(prefix, selectedService, selectedZone, selectedPackage) {
    const ids = scenarioIds(prefix);
    const service = document.getElementById(ids.service);
    const zone = document.getElementById(ids.zone);
    const packageType = document.getElementById(ids.packageType);
    if (!service || !zone || !packageType) return;

    service.innerHTML = '<option value="">Choose service</option>';
    zone.innerHTML = '<option value="">Choose zone</option>';
    packageType.innerHTML = '<option value="">Choose package type</option>';

    if (!currentLibrary || !activeCandidate) {
      service.disabled = true;
      zone.disabled = true;
      packageType.disabled = true;
      return;
    }

    service.disabled = false;
    RateCards.listServices(currentLibrary, activeCandidate.rate_card_type).forEach((item) => {
      service.insertAdjacentHTML("beforeend", option(item.service_code, item.service_name));
    });

    if (selectedService) service.value = selectedService;
    populateZones(prefix, selectedZone, selectedPackage);
  }

  function populateZones(prefix, selectedZone, selectedPackage) {
    const ids = scenarioIds(prefix);
    const service = document.getElementById(ids.service);
    const zone = document.getElementById(ids.zone);
    const packageType = document.getElementById(ids.packageType);
    if (!service || !zone || !packageType) return;

    zone.innerHTML = '<option value="">Choose zone</option>';
    packageType.innerHTML = '<option value="">Choose package type</option>';
    zone.disabled = !currentLibrary || !service.value;
    packageType.disabled = true;

    if (!currentLibrary || !activeCandidate || !service.value) return;
    RateCards.listZones(currentLibrary, activeCandidate.rate_card_type, service.value).forEach((item) => {
      zone.insertAdjacentHTML("beforeend", option(item, `Zone ${item}`));
    });
    if (selectedZone) zone.value = selectedZone;
    populatePackages(prefix, selectedPackage);
  }

  function populatePackages(prefix, selectedPackage) {
    const ids = scenarioIds(prefix);
    const service = document.getElementById(ids.service);
    const zone = document.getElementById(ids.zone);
    const packageType = document.getElementById(ids.packageType);
    if (!service || !zone || !packageType) return;

    packageType.innerHTML = '<option value="">Choose package type</option>';
    packageType.disabled = !currentLibrary || !service.value || !zone.value;
    if (packageType.disabled || !activeCandidate) return;

    RateCards.listPackageTypes(currentLibrary, activeCandidate.rate_card_type, service.value, zone.value).forEach((item) => {
      packageType.insertAdjacentHTML("beforeend", option(item, item.replaceAll("_", " ")));
    });
    if (selectedPackage) packageType.value = selectedPackage;
    if (!packageType.value && packageType.options.length === 2) packageType.selectedIndex = 1;
  }

  function collectScenario(prefix) {
    const ids = scenarioIds(prefix);
    return {
      service_code: valueOf(ids.service),
      zone: valueOf(ids.zone),
      package_type: valueOf(ids.packageType),
      package_count: valueOf(ids.count),
      actual_weight_lb_per_package: valueOf(ids.actual),
      manual_billable_weight_lb_per_package: valueOf(ids.manualBillable),
      length_in: valueOf(ids.length),
      width_in: valueOf(ids.width),
      height_in: valueOf(ids.height),
      dimensional_divisor: valueOf(ids.divisor)
    };
  }

  function collectInputs() {
    return {
      candidate_id: activeCandidate ? activeCandidate.id : null,
      rate_card_type: activeCandidate ? activeCandidate.rate_card_type : null,
      // The earliest (most conservative) due date in the group, consistent with the
      // candidate's own PROMISE_DATE_ALIGNMENT guardrail.
      print_date: activeCandidate ? activeCandidate.effective_warehouse_print_date : null,
      customer_due_date: activeCandidate ? activeCandidate.minimum_customer_due_date : null,
      current: collectScenario("Current"),
      proposed: collectScenario("Proposed")
    };
  }

  function applyScenario(prefix, values) {
    const ids = scenarioIds(prefix);
    const scenario = values || {};
    setValue(ids.count, scenario.package_count);
    setValue(ids.actual, scenario.actual_weight_lb_per_package);
    setValue(ids.manualBillable, scenario.manual_billable_weight_lb_per_package);
    setValue(ids.length, scenario.length_in);
    setValue(ids.width, scenario.width_in);
    setValue(ids.height, scenario.height_in);
    setValue(ids.divisor, scenario.dimensional_divisor);
    populateServices(prefix, scenario.service_code, scenario.zone, scenario.package_type);
  }

  function renderComparison(comparison) {
    const result = document.getElementById("candidateQuoteResult");
    if (!result || !DecisionPanel) return;
    DecisionPanel.render(result, activeCandidate ? activeCandidate.id : null, comparison, {
      reviewerName: "Alexandra Tafoya",
      onUpdated: (draft) => notifyDraftUpdated(draft)
    });
  }
      function notifyDraftUpdated(draft) {
    if (!activeCandidate) return;
    global.dispatchEvent(new CustomEvent("masterflow:freight-quote-draft-updated", {
      detail: {
        candidate_id: activeCandidate.id,
        draft: draft || null,
        status: QuoteReadiness.getStatus(activeCandidate.id)
      }
    }));
  }

  function bindScenario(prefix) {
    const ids = scenarioIds(prefix);
    const service = document.getElementById(ids.service);
    const zone = document.getElementById(ids.zone);
    if (service) service.addEventListener("change", () => populateZones(prefix));
    if (zone) zone.addEventListener("change", () => populatePackages(prefix));
  }

  function render() {
    if (!activeCandidate) {
      mount.innerHTML = "";
      return;
    }

    const draft = QuoteReadiness.getDraft(activeCandidate.id);
    const libraryNotice = currentLibrary
      ? `<div class="notice notice-success"><span>✓</span><div><strong>Carrier rate library loaded</strong><p>Published Domestic, Export, or Import base rates are available for this browser session.</p></div></div>`
      :  `<div class="notice notice-warning"><span>!</span><div><strong>Load the normalized carrier rate-card CSV first</strong><p>Use the "Carrier rate-card library" panel above to load the private rate CSV, then the service, zone, and package fields will fill in. You may save shipment inputs now, but a published base-rate comparison requires the rate library.</p></div></div>`;

    mount.innerHTML = `
      <div class="dialog-section">
        <h3>Quote readiness and shipment inputs</h3>
        <p class="small muted">Enter the current and proposed package plans for this candidate. No data is written to ERP, the customer record, or GitHub. Drafts are stored only in this browser tab.</p>
        ${libraryNotice}
        <div class="detail-grid mt-12">
          <div class="detail-cell"><small>Candidate rate category</small><strong>${escape(activeCandidate.rate_card_type)}</strong></div>
          <div class="detail-cell"><small>Current SHIP VIA reference</small><strong>${escape((activeCandidate.ship_via_values || []).join(", ") || "Not provided")}</strong></div>
          <div class="detail-cell"><small>Origin</small><strong>${escape(activeCandidate.origin_postal_code || "Not configured")}</strong></div>
          <div class="detail-cell"><small>Destination</small><strong>${escape(activeCandidate.destination_display)}</strong></div>
        </div>
      </div>
      <div class="grid grid-2 mt-12">
        ${scenarioMarkup("Current", "Current shipment plan", activeCandidate.actionable_release_count || activeCandidate.release_count || 2)}
        ${scenarioMarkup("Proposed", "Proposed shipment plan", 1)}
      </div>
      <div class="dialog-section">
        <div class="page-actions" style="justify-content:flex-start;flex-wrap:wrap">
          <button class="btn btn-secondary" type="button" id="candidateQuoteSuggest"${currentLibrary ? "" : " disabled"}>Suggest cheapest option</button>
         <button class="btn btn-primary" type="button" id="candidateQuoteCompare"${currentLibrary ? "" : " disabled"}>Compare published base rates</button>
          <button class="btn btn-secondary" type="button" id="candidateQuoteSave">Save inputs in this tab</button>
          <button class="btn btn-ghost" type="button" id="candidateQuoteClear"${draft ? "" : " disabled"}>Clear quote draft</button>
        </div>
        <div class="mt-12" id="candidateQuoteResult"></div>
      </div>`;

    applyScenario("Current", draft && draft.inputs ? draft.inputs.current : null);
    applyScenario("Proposed", draft && draft.inputs ? draft.inputs.proposed : null);
    bindScenario("Current");
    bindScenario("Proposed");
    renderComparison(draft ? draft.comparison : null);

    document.getElementById("candidateQuoteSuggest").addEventListener("click", () => {
      if (!currentLibrary) {
        UI.showToast("Load the normalized carrier rate-card CSV before requesting a recommendation.");
        return;
      }
      const currentScenario = collectScenario("Current");
      const profile = QuoteReadiness.calculatePackageProfile(currentScenario);
      if (!profile.ok || profile.billable_weight_lb_per_package == null) {
        UI.showToast("Enter a valid current package weight (and zone) before requesting a recommendation.");
        return;
      }
      if (!currentScenario.zone) {
        UI.showToast("Choose a current zone before requesting a recommendation.");
        return;
      }

      const recommendation = RateCards.recommendCheapest(currentLibrary, {
        rate_card_type: activeCandidate.rate_card_type,
        zone: currentScenario.zone,
        package_type: currentScenario.package_type || "PACKAGE",
        billable_weight_lb: profile.billable_weight_lb_per_package,
        exclude_service_code: currentScenario.service_code
      });

      if (!recommendation.ok) {
        UI.showToast((recommendation.errors || []).join(" ") || "No cheaper alternative service was found for this zone and weight.");
        return;
      }

      const rec = recommendation.recommended;
      applyScenario("Proposed", Object.assign({}, currentScenario, {
        service_code: rec.service_code,
        zone: rec.zone,
        package_type: rec.package_type
      }));

      const currentQuote = RateCards.quote(currentLibrary, {
        rate_card_type: activeCandidate.rate_card_type,
        service_code: currentScenario.service_code,
        zone: currentScenario.zone,
        package_type: currentScenario.package_type || "PACKAGE",
        billable_weight_lb: profile.billable_weight_lb_per_package
      });
      const savingsNote = currentQuote.ok
        ? ` Estimated ${formatMoney(Math.max(currentQuote.base_transportation_charge_usd - rec.base_transportation_charge_usd, 0))} cheaper per package than the current plan.`
        : "";
      UI.showToast(`Suggested ${rec.service_name} (${formatMoney(rec.base_transportation_charge_usd)} per package).${savingsNote} Considered ${recommendation.alternatives_considered} alternative service${recommendation.alternatives_considered === 1 ? "" : "s"}. Review before comparing.`);
    });

    document.getElementById("candidateQuoteCompare").addEventListener("click", () => {
      if (!currentLibrary) {
        UI.showToast("Load the normalized carrier rate-card CSV before comparing published rates.");
        return;
      }
    const inputs = collectInputs();
    const comparison = QuoteReadiness.compare(RateCards, currentLibrary, inputs);
    if (comparison.ok) {
      const saved = QuoteReadiness.saveDraft(activeCandidate.id, inputs, comparison);
      document.getElementById("candidateQuoteClear").disabled = false;
      notifyDraftUpdated(saved);
      renderComparison(comparison);
      UI.showToast("Published base-rate comparison saved in this browser tab.");
    } else {
      renderComparison(comparison);
    }
    });

    document.getElementById("candidateQuoteSave").addEventListener("click", () => {
      const saved = QuoteReadiness.saveDraft(activeCandidate.id, collectInputs(), null);
      document.getElementById("candidateQuoteClear").disabled = false;
      renderComparison(null);
      notifyDraftUpdated(saved);
      UI.showToast("Shipment inputs saved in this browser tab.");
    });

    document.getElementById("candidateQuoteClear").addEventListener("click", () => {
      QuoteReadiness.clearDraft(activeCandidate.id);
      notifyDraftUpdated(null);
      render();
      UI.showToast("Quote draft cleared.");
    });
  }

  global.addEventListener("masterflow:scheduled-order-candidate-opened", (event) => {
    activeCandidate = event.detail && event.detail.candidate ? event.detail.candidate : null;
    render();
  });

  global.addEventListener("masterflow:rate-cards-loaded", (event) => {
    currentLibrary = event.detail || null;
    if (activeCandidate) render();
  });

  global.addEventListener("masterflow:rate-cards-cleared", () => {
    currentLibrary = null;
    if (activeCandidate) render();
  });

  global.addEventListener("masterflow:scheduled-orders-cleared", () => {
    activeCandidate = null;
    mount.innerHTML = "";
  });
})(typeof window !== "undefined" ? window : globalThis);
