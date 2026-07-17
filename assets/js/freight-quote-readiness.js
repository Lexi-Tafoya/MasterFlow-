(function (global) {
  "use strict";

  const STORAGE_KEY = "masterflowFreightQuoteDraftsV1";
  // Dimensional weight must exceed actual weight by more than this ratio before the packaging
  // gap is worth flagging as a recommendation rather than ordinary rounding noise.
  const PACKAGING_WASTE_THRESHOLD_RATIO = 1.2;

  function text(value) {
    return value == null ? "" : String(value);
  }

  function trimmed(value) {
    return text(value).trim();
  }

  function upper(value) {
    return trimmed(value).toUpperCase();
  }

  function numberOrNull(value) {
    const raw = trimmed(value);
    if (!raw) return null;
    const parsed = Number(raw.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function positiveNumber(value, label, errors, options) {
    const settings = Object.assign({ required: false, integer: false }, options || {});
    const parsed = numberOrNull(value);

    if (parsed == null) {
      if (settings.required) errors.push(`${label} is required.`);
      return null;
    }

    if (parsed <= 0) {
      errors.push(`${label} must be greater than zero.`);
      return null;
    }

    if (settings.integer && !Number.isInteger(parsed)) {
      errors.push(`${label} must be a whole number.`);
      return null;
    }

    return parsed;
  }

  function currency(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function calculatePackageProfile(input) {
    const settings = Object.assign({}, input || {});
    const errors = [];
    const warnings = [];

    const packageCount = positiveNumber(settings.package_count, "Package count", errors, {
      required: true,
      integer: true
    });
    const actualWeight = positiveNumber(settings.actual_weight_lb_per_package, "Actual weight per package", errors);
    const manualBillableWeight = positiveNumber(
      settings.manual_billable_weight_lb_per_package,
      "Manual billable weight per package",
      errors
    );

    const length = numberOrNull(settings.length_in);
    const width = numberOrNull(settings.width_in);
    const height = numberOrNull(settings.height_in);
    const dimensionValues = [length, width, height];
    const anyDimension = dimensionValues.some((value) => value != null);
    const allDimensions = dimensionValues.every((value) => value != null && value > 0);

    if (anyDimension && !allDimensions) {
      errors.push("Length, width, and height must all be supplied when dimensions are used.");
    }

    if (dimensionValues.some((value) => value != null && value <= 0)) {
      errors.push("Package dimensions must be greater than zero.");
    }

    let dimensionalDivisor = null;
    if (allDimensions) {
      dimensionalDivisor = positiveNumber(settings.dimensional_divisor, "Dimensional divisor", errors, {
        required: true
      });
    } else if (trimmed(settings.dimensional_divisor)) {
      dimensionalDivisor = positiveNumber(settings.dimensional_divisor, "Dimensional divisor", errors);
    }

    const roundedActualWeight = actualWeight == null ? null : Math.ceil(actualWeight);
    const roundedLength = allDimensions ? Math.ceil(length) : null;
    const roundedWidth = allDimensions ? Math.ceil(width) : null;
    const roundedHeight = allDimensions ? Math.ceil(height) : null;
    const dimensionalWeight = allDimensions && dimensionalDivisor
      ? Math.ceil((roundedLength * roundedWidth * roundedHeight) / dimensionalDivisor)
      : null;

    const suggestedWeights = [roundedActualWeight, dimensionalWeight].filter((value) => value != null);
    const suggestedBillableWeight = suggestedWeights.length ? Math.max(...suggestedWeights) : null;
    const billableWeight = manualBillableWeight == null
      ? suggestedBillableWeight
      : Math.ceil(manualBillableWeight);

    if (billableWeight == null) {
      errors.push("Enter a manual billable weight or provide enough weight and dimension data to calculate one.");
    }

    if (
      manualBillableWeight != null &&
      suggestedBillableWeight != null &&
      manualBillableWeight < suggestedBillableWeight
    ) {
      warnings.push(
        `The manual billable weight is below the calculated ${suggestedBillableWeight} lb package weight and should be confirmed.`
      );
    }

    if (packageCount != null && packageCount > 1) {
      warnings.push("This prototype applies one package profile to every package in the scenario.");
    }

    // A dimensional weight well above the actual weight means the box is bigger than the
    // part needs -- a smaller or better-fitting box could bring the billable weight down
    // toward the actual weight. Only worth flagging once the gap is clearly not just rounding.
    const packagingWasteLb = dimensionalWeight != null && roundedActualWeight != null
      && dimensionalWeight > roundedActualWeight * PACKAGING_WASTE_THRESHOLD_RATIO
      ? dimensionalWeight - roundedActualWeight
      : null;

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      package_count: packageCount,
      actual_weight_lb_per_package: actualWeight,
      rounded_actual_weight_lb_per_package: roundedActualWeight,
      length_in: length,
      width_in: width,
      height_in: height,
      rounded_length_in: roundedLength,
      rounded_width_in: roundedWidth,
      rounded_height_in: roundedHeight,
      dimensional_divisor: dimensionalDivisor,
      dimensional_weight_lb_per_package: dimensionalWeight,
      suggested_billable_weight_lb_per_package: suggestedBillableWeight,
      manual_billable_weight_lb_per_package: manualBillableWeight,
      billable_weight_lb_per_package: billableWeight,
      total_actual_weight_lb: actualWeight == null || packageCount == null ? null : actualWeight * packageCount,
      total_billable_weight_lb: billableWeight == null || packageCount == null ? null : billableWeight * packageCount,
      packaging_waste_lb: packagingWasteLb
    };
  }

  function scenarioErrors(prefix, errors) {
    return (errors || []).map((message) => `${prefix}: ${message}`);
  }

  function quoteScenario(rateCards, library, rateCardType, input, label) {
    const scenario = Object.assign({}, input || {});
    const errors = [];
    const serviceCode = trimmed(scenario.service_code);
    const zone = trimmed(scenario.zone);
    const packageType = upper(scenario.package_type);

    if (!serviceCode) errors.push("Choose a carrier service.");
    if (!zone) errors.push("Choose a zone.");
    if (!packageType) errors.push("Choose a package type.");

    const profile = calculatePackageProfile(scenario);
    errors.push(...profile.errors);

    if (errors.length) {
      return {
        ok: false,
        label,
        errors: scenarioErrors(label, errors),
        warnings: profile.warnings,
        profile
      };
    }

    if (!rateCards || typeof rateCards.quote !== "function" || !library) {
      return {
        ok: false,
        label,
        errors: [`${label}: Load the normalized carrier rate-card library before comparing rates.`],
        warnings: profile.warnings,
        profile
      };
    }

    const quote = rateCards.quote(library, {
      rate_card_type: rateCardType,
      service_code: serviceCode,
      zone,
      package_type: packageType,
      billable_weight_lb: profile.billable_weight_lb_per_package
    });

    if (!quote.ok) {
      return {
        ok: false,
        label,
        errors: scenarioErrors(label, quote.errors || ["No published rate matched the scenario."]),
        warnings: profile.warnings,
        profile
      };
    }

    const totalBase = currency(quote.base_transportation_charge_usd * profile.package_count);
    return {
      ok: true,
      label,
      service_code: serviceCode,
      service_name: quote.service_name,
      carrier: quote.carrier || null,
      zone,
      package_type: packageType,
      profile,
      quote,
      published_base_rate_per_package_usd: currency(quote.base_transportation_charge_usd),
      published_base_transportation_total_usd: totalBase,
      warnings: profile.warnings.slice()
    };
  }

  const TRANSIT_DAY_RULES = Object.freeze([
    { keywords: ["NEXT DAY", "OVERNIGHT"], days: 1 },
    { keywords: ["2ND DAY", "2 DAY", "2DAY"], days: 2 },
    { keywords: ["3 DAY", "3DAY"], days: 3 },
    { keywords: ["EXPRESS", "PRIORITY", "SAVER"], days: 3 }
  ]);
  const DEFAULT_TRANSIT_DAYS_ESTIMATE = 5;
  const EXPEDITE_SERVICE_KEYWORDS = Object.freeze(["AIR", "NEXT DAY", "2ND DAY", "2 DAY", "PRIORITY", "EXPRESS", "OVERNIGHT"]);

  const OVERRIDE_DENY_REASONS = Object.freeze([
    { code: "manager_approval", label: "Manager approval" },
    { code: "customer_approval", label: "Customer approval" },
    { code: "promise_date_danger_zone", label: "Promise date in danger zone" },
    { code: "savings_justify_risk", label: "Cost savings justify the risk" },
    { code: "hold_expired_auto_release", label: "Hold expired -- automatically released to current plan" },
    { code: "other", label: "Other (see note)" }
  ]);

  // No carrier in this system publishes a transit-day commitment anywhere in the rate-card
  // data -- this is a fictional, keyword-based estimate that exists only to force a human
  // due-date check before a slower service could be approved, never a real delivery promise.
  function estimateTransitDays(serviceName) {
    const name = upper(serviceName);
    const rule = TRANSIT_DAY_RULES.find((entry) => entry.keywords.some((keyword) => name.includes(keyword)));
    return rule ? rule.days : DEFAULT_TRANSIT_DAYS_ESTIMATE;
  }

  function parseIsoDate(value) {
    const match = trimmed(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function addDaysIso(date, days) {
    const result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    const year = result.getFullYear();
    const month = String(result.getMonth() + 1).padStart(2, "0");
    const day = String(result.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Only meaningful once a print date and customer due date are both known (the caller
  // supplies these from the candidate) -- without them, compare() still works (e.g. in
  // isolated tests), it just can't assess due-date risk.
  function promiseDateRisk(current, proposed, printDateIso, dueDateIso) {
    const currentDays = estimateTransitDays(current.service_name);
    const proposedDays = estimateTransitDays(proposed.service_name);
    if (proposedDays <= currentDays) return null;

    const printDate = parseIsoDate(printDateIso);
    const dueDate = trimmed(dueDateIso);
    if (!printDate || !dueDate) return null;

    const estimatedCurrentArrival = addDaysIso(printDate, currentDays);
    const estimatedProposedArrival = addDaysIso(printDate, proposedDays);
    const missesDueDate = estimatedProposedArrival > dueDate;
    const currentDayLabel = `${currentDays} day${currentDays === 1 ? "" : "s"}`;
    const proposedDayLabel = `${proposedDays} day${proposedDays === 1 ? "" : "s"}`;

    return {
      current_transit_days_estimate: currentDays,
      proposed_transit_days_estimate: proposedDays,
      estimated_current_arrival: estimatedCurrentArrival,
      estimated_proposed_arrival: estimatedProposedArrival,
      customer_due_date: dueDate,
      misses_due_date: missesDueDate,
      message: missesDueDate
        ? `Estimated ${proposed.service_name} arrival (${estimatedProposedArrival}, ~${proposedDayLabel}) is after the customer due date (${dueDate}). Current ${current.service_name} is estimated at ~${currentDayLabel} (${estimatedCurrentArrival}).`
        : `Estimated ${proposed.service_name} arrival (${estimatedProposedArrival}, ~${proposedDayLabel}) is slower than current ${current.service_name} (~${currentDayLabel}) but still meets the customer due date (${dueDate}).`
    };
  }

  function isExpeditedServiceName(serviceName) {
    const name = upper(serviceName);
    return EXPEDITE_SERVICE_KEYWORDS.some((keyword) => name.includes(keyword));
  }

  // Only surfaced when the current plan uses an expedited service and a genuinely cheaper
  // alternative exists in the library -- absence of a suggestion here means nothing was found,
  // not that the current service is already optimal.
  function expediteAlternative(rateCards, library, rateCardType, current, printDateIso, dueDateIso) {
    if (!current || !isExpeditedServiceName(current.service_name)) return null;
    if (!rateCards || typeof rateCards.recommendCheapest !== "function" || !library) return null;

    const packageCount = current.profile ? current.profile.package_count : null;
    const billableWeight = current.profile ? current.profile.billable_weight_lb_per_package : null;
    if (!packageCount || billableWeight == null) return null;

    const recommendation = rateCards.recommendCheapest(library, {
      rate_card_type: rateCardType,
      zone: current.zone,
      package_type: current.package_type,
      billable_weight_lb: billableWeight,
      exclude_service_code: current.service_code
    });
    if (!recommendation.ok) return null;

    const alternative = recommendation.recommended;
    const alternativeTotal = currency(alternative.base_transportation_charge_usd * packageCount);
    const savings = currency(current.published_base_transportation_total_usd - alternativeTotal);
    if (savings <= 0) return null;

    const currentDays = estimateTransitDays(current.service_name);
    const alternativeDays = estimateTransitDays(alternative.service_name);
    const printDate = parseIsoDate(printDateIso);
    const dueDate = trimmed(dueDateIso);
    const meetsDueDate = printDate && dueDate ? addDaysIso(printDate, alternativeDays) <= dueDate : null;

    const dueDateClause = meetsDueDate == null
      ? "the customer due date was not available to check"
      : meetsDueDate
        ? "would still meet the customer due date"
        : "would NOT meet the customer due date -- review before switching";

    return {
      carrier: alternative.carrier || null,
      service_name: alternative.service_name,
      current_transit_days_estimate: currentDays,
      alternative_transit_days_estimate: alternativeDays,
      meets_due_date: meetsDueDate,
      savings_usd: savings,
      message: `Current plan uses an expedited service (${current.service_name}). Switching to ${alternative.service_name} would save $${savings.toFixed(2)} and ${dueDateClause}.`
    };
  }

  function compare(rateCards, library, request) {
    const input = Object.assign({}, request || {});
    const rateCardType = upper(input.rate_card_type);
    const errors = [];

    if (!["DOMESTIC", "EXPORT", "IMPORT"].includes(rateCardType)) {
      errors.push("Choose a valid rate category.");
    }

    const current = quoteScenario(rateCards, library, rateCardType, input.current, "Current plan");
    const proposed = quoteScenario(rateCards, library, rateCardType, input.proposed, "Proposed plan");
    errors.push(...(current.errors || []), ...(proposed.errors || []));

    if (errors.length) {
      return {
        ok: false,
        errors,
        rate_card_type: rateCardType || null,
        current,
        proposed,
        verified_savings_status: "not_verified"
      };
    }

    const currentTotal = current.published_base_transportation_total_usd;
    const proposedTotal = proposed.published_base_transportation_total_usd;
    const difference = currency(currentTotal - proposedTotal);
    const percentage = currentTotal > 0 ? (difference / currentTotal) * 100 : null;

    return {
      ok: true,
      compared_at: new Date().toISOString(),
      rate_card_type: rateCardType,
      current,
      proposed,
      published_base_rate_difference_usd: difference,
      published_base_rate_difference_percent: percentage,
      comparison_direction: difference > 0 ? "reduction" : difference < 0 ? "increase" : "no_change",
      quote_readiness_status: "published_base_rate_compared",
      cost_scope: "published_base_transportation_only",
      verified_savings_status: "not_verified",
      promise_date_risk: promiseDateRisk(current, proposed, input.print_date, input.customer_due_date),
      expedite_alternative: expediteAlternative(rateCards, library, rateCardType, current, input.print_date, input.customer_due_date),
      excluded_costs: [
        "fuel surcharge",
        "accessorial charges",
        "negotiated discounts",
        "package-specific variations",
        "duties, taxes, and brokerage",
        "actual carrier invoice corrections"
      ],
      warning:
        "This is a published base-transportation comparison only. It is not a verified savings amount or a shipping decision."
    };
  }

  function getStorage() {
    try {
      return global.sessionStorage || null;
    } catch (error) {
      return null;
    }
  }

  function readDrafts() {
    const storage = getStorage();
    if (!storage) return {};
    try {
      return JSON.parse(storage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (error) {
      storage.removeItem(STORAGE_KEY);
      return {};
    }
  }

  function writeDrafts(drafts) {
    const storage = getStorage();
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(drafts || {}));
    return true;
  }

  function saveDraft(candidateId, inputs, comparison) {
    const id = trimmed(candidateId);
    if (!id) throw new Error("A candidate ID is required to save a quote draft.");
    const drafts = readDrafts();
    const draft = {
      candidate_id: id,
      saved_at: new Date().toISOString(),
      inputs: JSON.parse(JSON.stringify(inputs || {})),
      comparison: comparison && comparison.ok ? JSON.parse(JSON.stringify(comparison)) : null,
           approval: null,
      approval_history: drafts[id] && Array.isArray(drafts[id].approval_history)
        ? JSON.parse(JSON.stringify(drafts[id].approval_history))
        : [],
      denial: null,
      denial_history: drafts[id] && Array.isArray(drafts[id].denial_history)
        ? JSON.parse(JSON.stringify(drafts[id].denial_history))
        : [],
      verification: null,
      verification_history: drafts[id] && Array.isArray(drafts[id].verification_history)
        ? JSON.parse(JSON.stringify(drafts[id].verification_history))
        : [],
      sales_referral: null,
      sales_referral_history: drafts[id] && Array.isArray(drafts[id].sales_referral_history)
        ? JSON.parse(JSON.stringify(drafts[id].sales_referral_history))
        : [],
      hold: null,
      hold_history: drafts[id] && Array.isArray(drafts[id].hold_history)
        ? JSON.parse(JSON.stringify(drafts[id].hold_history))
        : []
    };
    drafts[id] = draft;
    writeDrafts(drafts);
    return draft;
  }

  // Not a final decision -- just a marker that the promise-date change needs the customer's
  // sign-off through Sales before anyone approves or denies it. Approve/deny remain available
  // afterward; whichever happens later determines the status (see getStatus()).
  function sendToSales(candidateId, reviewer, note) {
    const id = trimmed(candidateId);
    const by = trimmed(reviewer);
    const reason = trimmed(note);

    if (!id) throw new Error("A candidate ID is required.");
    if (!by) throw new Error("A named reviewer is required.");

    const drafts = readDrafts();
    const draft = drafts[id];

    if (!draft || !draft.comparison || !draft.comparison.ok) {
      throw new Error("A completed published base-rate comparison is required before routing to Sales.");
    }
    if (!draft.comparison.promise_date_risk) {
      throw new Error("Routing to Sales is only needed when this change would affect the customer promise date.");
    }

    const referral = {
      at: new Date().toISOString(),
      by,
      note: reason
    };

    const history = Array.isArray(draft.sales_referral_history) ? draft.sales_referral_history.slice() : [];
    history.push(referral);
    draft.sales_referral = referral;
    draft.sales_referral_history = history;
    draft.saved_at = referral.at;

    drafts[id] = draft;
    writeDrafts(drafts);

    return JSON.parse(JSON.stringify(draft));
  }

  // No indefinite holds -- every hold needs a named owner and a cutoff, and if nobody
  // approves or denies before the cutoff, it auto-releases to the current (unchanged) plan
  // rather than sitting open forever. See autoResolveExpiredHold(), called lazily from
  // getDraft() so no background timer is needed.
  function holdDraft(candidateId, owner, cutoffIso, note) {
    const id = trimmed(candidateId);
    const holdOwner = trimmed(owner);
    const cutoff = trimmed(cutoffIso);
    const reason = trimmed(note);

    if (!id) throw new Error("A candidate ID is required.");
    if (!holdOwner) throw new Error("A named hold owner is required.");
    const cutoffDate = cutoff ? new Date(cutoff) : null;
    if (!cutoff || !cutoffDate || Number.isNaN(cutoffDate.getTime())) {
      throw new Error("A valid hold cutoff date/time is required.");
    }
    if (cutoffDate.getTime() <= Date.now()) {
      throw new Error("The hold cutoff must be in the future.");
    }

    const drafts = readDrafts();
    const draft = drafts[id];

    if (!draft || !draft.comparison || !draft.comparison.ok) {
      throw new Error("A completed published base-rate comparison is required before placing a hold.");
    }

    const hold = {
      at: new Date().toISOString(),
      owner: holdOwner,
      cutoff,
      note: reason,
      released_at: null
    };

    const history = Array.isArray(draft.hold_history) ? draft.hold_history.slice() : [];
    history.push(hold);
    draft.hold = hold;
    draft.hold_history = history;
    draft.saved_at = hold.at;

    drafts[id] = draft;
    writeDrafts(drafts);

    return JSON.parse(JSON.stringify(draft));
  }

  // Manual early release -- a human resolved it (or no longer needs the hold) before the
  // cutoff. Does not itself approve or deny anything; it just clears the hold marker.
  function releaseHold(candidateId, reviewer, note) {
    const id = trimmed(candidateId);
    const by = trimmed(reviewer);

    if (!id) throw new Error("A candidate ID is required.");
    if (!by) throw new Error("A named reviewer is required.");

    const drafts = readDrafts();
    const draft = drafts[id];

    if (!draft || !draft.hold || draft.hold.released_at) {
      throw new Error("There is no active hold on this candidate to release.");
    }

    draft.hold.released_at = new Date().toISOString();
    draft.hold.released_by = by;
    draft.hold.released_note = trimmed(note);

    drafts[id] = draft;
    writeDrafts(drafts);

    return JSON.parse(JSON.stringify(draft));
  }

  // Lazily checked every time a draft is read (see getDraft()) instead of on a background
  // timer -- a static prototype has no server process to run one, and any reasonably active
  // session re-fetches drafts often enough that this still resolves an expired hold promptly.
  function autoResolveExpiredHold(drafts, id) {
    const draft = drafts[id];
    if (!draft || !draft.hold || draft.hold.released_at) return false;

    const cutoffDate = new Date(draft.hold.cutoff);
    if (Number.isNaN(cutoffDate.getTime()) || Date.now() < cutoffDate.getTime()) return false;

    const holdAt = new Date(draft.hold.at).getTime();
    // >= rather than > -- millisecond-resolution timestamps from synchronous calls can land
    // on the same tick, and a decision recorded at the same instant the hold was placed still
    // counts as a decision, not as "nothing happened."
    const decidedAfterHold = (draft.approval && new Date(draft.approval.at).getTime() >= holdAt)
      || (draft.denial && new Date(draft.denial.at).getTime() >= holdAt);

    if (decidedAfterHold) {
      draft.hold.released_at = new Date().toISOString();
      draft.hold.released_by = "System (already decided)";
      return true;
    }

    const denial = {
      at: new Date().toISOString(),
      by: `System (auto-release; hold owner ${draft.hold.owner})`,
      reason_code: "hold_expired_auto_release",
      note: draft.hold.note
        ? `Hold note: ${draft.hold.note}`
        : "Hold cutoff passed with no decision; automatically released to the current plan."
    };
    const history = Array.isArray(draft.denial_history) ? draft.denial_history.slice() : [];
    history.push(denial);
    draft.denial = denial;
    draft.denial_history = history;
    draft.hold.released_at = denial.at;
    draft.hold.released_by = denial.by;
    draft.saved_at = denial.at;
    return true;
  }

function approveDraft(candidateId, reviewer, note, confirmations) {
  const id = trimmed(candidateId);
  const by = trimmed(reviewer);
  const reason = trimmed(note);
  const confirmed = Object.assign(
    { exportComplianceConfirmed: false, reasonCode: "", customerAgreementConfirmed: false, approverInitials: "" },
    confirmations || {}
  );
  const reasonCode = trimmed(confirmed.reasonCode);
  const approverInitials = trimmed(confirmed.approverInitials);

  if (!id) throw new Error("A candidate ID is required.");
  if (!by) throw new Error("A named reviewer is required.");
  if (!reason) throw new Error("An approval reason is required.");

  const drafts = readDrafts();
  const draft = drafts[id];

  if (!draft || !draft.comparison || !draft.comparison.ok) {
    throw new Error("A completed published base-rate comparison is required before approval.");
  }

  // Export holds are authoritative and must never be silently overridden. Every decision --
  // whether keeping the current plan or switching to the proposed one -- needs an explicit,
  // coded reason on record so it is reportable, not a free-text afterthought.
  if (draft.comparison.rate_card_type === "EXPORT" && !confirmed.exportComplianceConfirmed) {
    throw new Error("Export/hazmat compliance must be confirmed before approving an export shipment.");
  }
  if (!OVERRIDE_DENY_REASONS.some((entry) => entry.code === reasonCode)) {
    throw new Error("A reason must be selected before approving this change.");
  }

  const risk = draft.comparison.promise_date_risk;
  // A missed customer due date is never assumed away -- the customer's agreement and the
  // approver's initials must both be on record before the change can proceed.
  if (risk && risk.misses_due_date) {
    if (!confirmed.customerAgreementConfirmed) {
      throw new Error("Customer agreement to the revised delivery date must be confirmed before approving a change that misses the due date.");
    }
    if (!approverInitials) {
      throw new Error("Approver initials are required before approving a change that misses the due date.");
    }
  }

  const approvedSavings = Math.max(
    Number(draft.comparison.published_base_rate_difference_usd || 0),
    0
  );

  if (approvedSavings <= 0) {
    throw new Error("The comparison must show a positive published base-rate reduction before approval.");
  }

  const approval = {
    at: new Date().toISOString(),
    by,
    note: reason,
    approved_savings_usd: approvedSavings,
    export_compliance_confirmed: draft.comparison.rate_card_type === "EXPORT" ? true : null,
    override_reason_code: reasonCode,
    customer_agreement_confirmed: risk && risk.misses_due_date ? true : null,
    approver_initials: risk && risk.misses_due_date ? approverInitials : null
  };

  const history = Array.isArray(draft.approval_history)
    ? draft.approval_history.slice()
    : [];

  history.push(approval);
  draft.approval = approval;
  draft.approval_history = history;
  draft.saved_at = approval.at;

  drafts[id] = draft;
  writeDrafts(drafts);

  return JSON.parse(JSON.stringify(draft));
}

function denyDraft(candidateId, reviewer, reasonCode, note) {
  const id = trimmed(candidateId);
  const by = trimmed(reviewer);
  const code = trimmed(reasonCode);
  const reason = trimmed(note);

  if (!id) throw new Error("A candidate ID is required.");
  if (!by) throw new Error("A named reviewer is required.");
  if (!OVERRIDE_DENY_REASONS.some((entry) => entry.code === code)) {
    throw new Error("A reason must be selected before denying this change.");
  }

  const drafts = readDrafts();
  const draft = drafts[id];

  if (!draft || !draft.comparison || !draft.comparison.ok) {
    throw new Error("A completed published base-rate comparison is required before a decision can be recorded.");
  }

  const denial = {
    at: new Date().toISOString(),
    by,
    reason_code: code,
    note: reason
  };

  const history = Array.isArray(draft.denial_history) ? draft.denial_history.slice() : [];
  history.push(denial);
  draft.denial = denial;
  draft.denial_history = history;
  draft.saved_at = denial.at;

  drafts[id] = draft;
  writeDrafts(drafts);

  return JSON.parse(JSON.stringify(draft));
}

  function verifyDraft(
    candidateId,
    reviewer,
    note,
    currentActualCost,
    finalActualCost,
    evidenceReference
  ) {
    const id = trimmed(candidateId);
    const by = trimmed(reviewer);
    const reason = trimmed(note);
    const evidence = trimmed(evidenceReference);
    const currentCost = numberOrNull(currentActualCost);
    const finalCost = numberOrNull(finalActualCost);

    if (!id) throw new Error("A candidate ID is required.");
    if (!by) throw new Error("A named verifier is required.");
    if (!reason) throw new Error("A verification note is required.");
    if (!evidence) throw new Error("An invoice or final-quote reference is required.");
    if (currentCost === null || currentCost < 0) {
      throw new Error("Current actual freight cost must be zero or greater.");
    }
    if (finalCost === null || finalCost < 0) {
      throw new Error("Final actual freight cost must be zero or greater.");
    }

    const drafts = readDrafts();
    const draft = drafts[id];

    if (!draft || !draft.approval) {
      throw new Error("Approved savings are required before verification.");
    }

    const verifiedSavings = Math.round((currentCost - finalCost) * 100) / 100;
    const verification = {
      at: new Date().toISOString(),
      by,
      note: reason,
      evidence_reference: evidence,
      current_actual_cost_usd: currentCost,
      final_actual_cost_usd: finalCost,
      verified_savings_usd: verifiedSavings
    };

    const history = Array.isArray(draft.verification_history)
      ? draft.verification_history.slice()
      : [];

    history.push(verification);
    draft.verification = verification;
    draft.verification_history = history;
    draft.saved_at = verification.at;

    drafts[id] = draft;
    writeDrafts(drafts);

    return JSON.parse(JSON.stringify(draft));
  }
  function getDraft(candidateId) {
    const id = trimmed(candidateId);
    if (!id) return null;
    const drafts = readDrafts();
    if (!drafts[id]) return null;
    if (autoResolveExpiredHold(drafts, id)) writeDrafts(drafts);
    return JSON.parse(JSON.stringify(drafts[id]));
  }

  function clearDraft(candidateId) {
    const id = trimmed(candidateId);
    if (!id) return false;
    const drafts = readDrafts();
    if (!Object.prototype.hasOwnProperty.call(drafts, id)) return false;
    delete drafts[id];
    writeDrafts(drafts);
    return true;
  }

  function clearAllDrafts() {
    const storage = getStorage();
    if (!storage) return false;
    storage.removeItem(STORAGE_KEY);
    return true;
  }

  // Denial, approval, a Sales referral, and an active hold are compared by timestamp so
  // whichever happened most recently determines the badge -- a later decision always
  // supersedes an earlier referral/hold, and a later referral or hold supersedes an earlier
  // decision. Verification always wins outright since it can only follow an approval. An
  // expired hold is auto-resolved into a denial by getDraft() before this ever runs, so
  // "on_hold" here only ever means an active, unexpired hold.
  function getStatus(candidateId) {
    const draft = getDraft(candidateId);
    if (!draft) {
      return { code: "not_started", label: "Not started", badge_class: "badge-gray" };
    }
    if (draft.verification) {
      return { code: "verified", label: "Savings verified", badge_class: "badge-green" };
    }

    const denialAt = draft.denial ? new Date(draft.denial.at).getTime() : -Infinity;
    const approvalAt = draft.approval ? new Date(draft.approval.at).getTime() : -Infinity;
    const referralAt = draft.sales_referral ? new Date(draft.sales_referral.at).getTime() : -Infinity;
    const holdAt = draft.hold && !draft.hold.released_at ? new Date(draft.hold.at).getTime() : -Infinity;

    if (draft.denial && denialAt >= approvalAt && denialAt >= referralAt && denialAt >= holdAt) {
      return { code: "denied", label: "Change denied", badge_class: "badge-red" };
    }
    if (draft.approval && approvalAt >= denialAt && approvalAt >= referralAt && approvalAt >= holdAt) {
      return { code: "approved", label: "Savings approved", badge_class: "badge-green" };
    }
    if (holdAt !== -Infinity && holdAt >= denialAt && holdAt >= approvalAt && holdAt >= referralAt) {
      return { code: "on_hold", label: "On hold", badge_class: "badge-amber" };
    }
    if (draft.sales_referral && referralAt >= denialAt && referralAt >= approvalAt && referralAt >= holdAt) {
      return { code: "sales_pending", label: "Waiting on Sales", badge_class: "badge-amber" };
    }
    if (draft.comparison && draft.comparison.ok) {
      return { code: "compared", label: "Published comparison", badge_class: "badge-green" };
    }
    return { code: "inputs_saved", label: "Inputs saved", badge_class: "badge-amber" };
  }

  function reasonLabel(code) {
    const match = OVERRIDE_DENY_REASONS.find((entry) => entry.code === code);
    return match ? match.label : code;
  }

  // Reuses approveDraft/denyDraft as-is per candidate -- no new approval/denial logic,
  // just a loop that keeps going on individual failures so one bad candidate (e.g. zero
  // savings) doesn't silently swallow or block the rest of the batch.
  function bulkDecide(candidateIds, action, reviewer, options) {
    const settings = Object.assign(
      { reasonCode: "", note: "", exportComplianceConfirmed: false, customerAgreementConfirmed: false, approverInitials: "" },
      options || {}
    );
    const results = { succeeded: [], failed: [] };

    (candidateIds || []).forEach((candidateId) => {
      try {
        if (action === "approve") {
          const note = trimmed(settings.note) || `Bulk approval (${reasonLabel(settings.reasonCode)})`;
          approveDraft(candidateId, reviewer, note, {
            exportComplianceConfirmed: settings.exportComplianceConfirmed,
            reasonCode: settings.reasonCode,
            customerAgreementConfirmed: settings.customerAgreementConfirmed,
            approverInitials: settings.approverInitials
          });
        } else if (action === "deny") {
          denyDraft(candidateId, reviewer, settings.reasonCode, settings.note);
        } else {
          throw new Error("Unsupported bulk action.");
        }
        results.succeeded.push(candidateId);
      } catch (error) {
        results.failed.push({ id: candidateId, message: error.message });
      }
    });

    return results;
  }

  const api = Object.freeze({
    STORAGE_KEY,
    OVERRIDE_DENY_REASONS,
    estimateTransitDays,
    calculatePackageProfile,
    compare,
    saveDraft,
    approveDraft,
    denyDraft,
    sendToSales,
    holdDraft,
    releaseHold,
    bulkDecide,
    verifyDraft,
    getDraft,
    clearDraft,
    clearAllDrafts,
    getStatus
  });

  global.MasterFlowFreightQuoteReadiness = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);