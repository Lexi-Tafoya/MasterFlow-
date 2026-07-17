(function (global) {
  "use strict";

  const DEFAULT_OPTIONS = Object.freeze({
    minimumReleaseCount: 2,
    lowMarginPercent: 15,
    highValueThreshold: 10000,
    maximumRenderedCandidates: 250,
    expediteLeadDaysThreshold: 3
  });

  const READINESS_ORDER = Object.freeze({
    ready: 0,
    partial: 1,
    waiting: 2
  });

  const EXPEDITE_SERVICE_KEYWORDS = Object.freeze(["AIR", "NEXT DAY", "2ND DAY", "2 DAY", "PRIORITY", "EXPRESS", "OVERNIGHT"]);

  function usesExpeditedService(shipViaValues) {
    return (shipViaValues || []).some((value) => {
      const upperValue = String(value || "").toUpperCase();
      return EXPEDITE_SERVICE_KEYWORDS.some((keyword) => upperValue.includes(keyword));
    });
  }

  function parseNormalizedDate(value) {
    const raw = String(value || "").trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const usMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  function daysBetween(fromValue, toValue) {
    const from = parseNormalizedDate(fromValue);
    const to = parseNormalizedDate(toValue);
    if (!from || !to) return null;
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter((value) => value != null && String(value).trim() !== "")));
  }

  function dateRange(values) {
    const dates = unique(values).sort();
    return {
      minimum: dates.length ? dates[0] : null,
      maximum: dates.length ? dates[dates.length - 1] : null,
      values: dates
    };
  }

  function stableHash(value) {
    let hash = 2166136261;
    const input = String(value || "");
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function candidateKey(record) {
    return [
      record.customer_number || "",
      record.destination_key || "",
      record.warehouse_code || "",
      record.effective_warehouse_print_date || ""
    ].join("|");
  }

  function isReviewRecord(record) {
    return record && (record.freight_review_disposition === "eligible" || record.freight_review_disposition === "flagged");
  }

  function isDuplicateRecord(record) {
    return Boolean(record && (record.cross_file_duplicate_of || record.exact_duplicate_of_row != null));
  }

  function readinessFor(group) {
    const actionableReleaseCount = unique(
      group.filter((record) => record.actionable_now).map((record) => record.combined_control_identifier)
    ).length;

    if (actionableReleaseCount >= 2) return "ready";
    if (actionableReleaseCount === 1) return "partial";
    return "waiting";
  }

  function priorityFor(candidate, options) {
    let score = 40;

    score += Math.min(18, Math.max(0, candidate.release_count - 2) * 3);
    if (candidate.base_control_count >= 2) score += 5;
    if (candidate.mixed_ship_via) score += 10;
    if (candidate.total_extended_resale >= options.highValueThreshold) score += 10;
    else if (candidate.total_extended_resale >= options.highValueThreshold / 2) score += 5;
    if (candidate.gross_margin_percent != null && candidate.gross_margin_percent < options.lowMarginPercent) score += 8;
    if (candidate.readiness === "ready") score += 10;
    if (candidate.readiness === "waiting") score -= 10;
    if (candidate.flagged_line_count > 0) score -= 5;

    score = Math.max(0, Math.min(100, Math.round(score)));
    return {
      score,
      band: score >= 75 ? "high" : score >= 55 ? "medium" : "low"
    };
  }

  function recommendationFor(candidate) {
    const releaseText = `${candidate.release_count} same-day release${candidate.release_count === 1 ? "" : "s"}`;

    if (candidate.readiness === "waiting") {
      return `Monitor ${releaseText}; none are currently soft allocated, so no consolidation action is ready yet.`;
    }

    if (candidate.readiness === "partial") {
      return `Review the actionable portion of ${releaseText} now and keep unallocated lines visible for follow-up.`;
    }

    if (candidate.mixed_ship_via) {
      return `Review ${releaseText} for consolidation and confirm whether the mixed shipping methods are intentional.`;
    }

    return `Review ${releaseText} for a possible consolidated shipment before warehouse print.`;
  }

  function reasonsFor(candidate, options) {
    const reasons = [
      `${candidate.release_count} release identifiers for the same customer and destination are scheduled to print from ${candidate.warehouse_code} on ${candidate.effective_warehouse_print_date}.`,
      `The normalized destination is ${candidate.destination_display}.`,
      `${candidate.line_count} part lines represent ${candidate.total_extended_resale.toLocaleString("en-US", { style: "currency", currency: "USD" })} in original line value.`
    ];

    if (candidate.base_control_count >= 2) {
      reasons.push(`The group spans ${candidate.base_control_count} base control numbers, which may create avoidable separate shipments.`);
    } else {
      reasons.push("The group contains multiple fulfillment releases under one base control number.");
    }

    if (candidate.mixed_ship_via) {
      reasons.push(`Multiple SHIP VIA values are present: ${candidate.ship_via_values.join(", ")}.`);
    }

    if (candidate.flagged_line_count > 0) {
      reasons.push(`${candidate.flagged_line_count} line${candidate.flagged_line_count === 1 ? " is" : "s are"} flagged and must remain visible during review.`);
    }

    if (candidate.gross_margin_percent != null && candidate.gross_margin_percent < options.lowMarginPercent) {
      reasons.push(`Weighted original gross margin is ${candidate.gross_margin_percent.toFixed(1)}%, making freight cost sensitivity more important.`);
    }

    if (candidate.expedite_review_lead_days != null && candidate.expedite_review_lead_days >= options.expediteLeadDaysThreshold) {
      reasons.push(`Current service (${candidate.ship_via_values.join(", ")}) may be more expedited than the customer's due date requires -- the due date is ${candidate.expedite_review_lead_days} day${candidate.expedite_review_lead_days === 1 ? "" : "s"} after the print date, so review whether a standard ground service still meets ${candidate.minimum_customer_due_date}.`);
    }

    return reasons;
  }

  function guardrailsFor(candidate) {
    const sameDueDate = candidate.customer_due_dates.length <= 1;
    const allAllocated = candidate.readiness === "ready" && candidate.flagged_line_count === 0;
    const destinationConfirmed = candidate.destination_status === "confirmed";

    return [
      {
        code: "SAME_CUSTOMER",
        label: "Same customer account",
        result: "pass",
        detail: `All lines use customer ${candidate.customer_number}.`
      },
      {
        code: "SAME_WAREHOUSE",
        label: "Same warehouse",
        result: "pass",
        detail: `All lines are assigned to ${candidate.warehouse_code}.`
      },
      {
        code: "SAME_PRINT_DATE",
        label: "Same requested print date",
        result: "pass",
        detail: `All lines use ${candidate.effective_warehouse_print_date}.`
      },
      {
        code: "PROMISE_DATE_ALIGNMENT",
        label: "Customer due-date alignment",
        result: sameDueDate ? "pass" : "review",
        detail: sameDueDate
          ? `All lines share customer due date ${candidate.customer_due_dates[0] || "not available"}.`
          : `Customer due dates range from ${candidate.minimum_customer_due_date} to ${candidate.maximum_customer_due_date}.`
      },
      {
        code: "ALLOCATION_READINESS",
        label: "Inventory allocation",
        result: allAllocated ? "pass" : "review",
        detail: candidate.readiness === "ready"
          ? `${candidate.actionable_line_count} lines are soft allocated; flagged lines still require review.`
          : candidate.readiness === "partial"
            ? `${candidate.actionable_line_count} of ${candidate.line_count} lines are actionable now.`
            : "No lines in this group are currently soft allocated."
      },
      {
        code: "SHIP_TO_CONFIRMATION",
        label: "Ship-to destination",
        result: destinationConfirmed ? "pass" : "review",
        detail: destinationConfirmed
          ? `All grouped lines share ${candidate.destination_display}.`
          : `All grouped lines share ${candidate.destination_display}, but part of the destination was inferred and should be confirmed.`
      },
      {
        code: "EXPORT_HOLD",
        label: "Export / hazmat compliance hold",
        result: candidate.rate_card_type === "EXPORT" ? "review" : "pass",
        detail: candidate.rate_card_type === "EXPORT"
          ? "This is an export shipment. Export holds are authoritative and must not be overridden -- confirm export and hazardous-material compliance before approving any service change."
          : "Domestic shipment; no export hold applies."
      },
      {
        code: "CUSTOMER_TERMS",
        label: "Customer shipping instructions",
        result: "review",
        detail: "Confirm customer terms, routing instructions, and any no-consolidation requirements."
      },
      {
        code: "ORIGIN_CONFIGURATION",
        label: "Warehouse origin",
        result: candidate.origin_postal_code ? "pass" : "review",
        detail: candidate.origin_postal_code
          ? `${candidate.warehouse_code} is configured with origin ZIP ${candidate.origin_postal_code}.`
          : `No origin ZIP is configured for ${candidate.warehouse_code}.`
      },
      {
        code: "PACKAGE_AND_RATE_DATA",
        label: "Weight, dimensions, and carrier rates",
        result: "review",
        detail: "Destination and origin are available, but billable weight, package dimensions, fuel, accessorials, and actual freight cost are still required before savings can be estimated."
      }
    ];
  }

  // A rule-based heuristic, not a trained model -- only meaningful once a candidate is
  // quoted (a recommendation needs a comparison to have any confidence about), and capped
  // below 100 so it never claims the certainty a real ML confidence score would imply.
  function confidenceFor(candidate, comparison) {
    if (!comparison || !comparison.ok) return null;
    const guardrails = candidate.guardrails || [];
    const passingCount = guardrails.filter((guardrail) => guardrail.result === "pass").length;
    const passRate = guardrails.length ? passingCount / guardrails.length : 0;
    const hasPositiveSavings = Number(comparison.published_base_rate_difference_usd || 0) > 0;
    return Math.round(Math.min(95, 50 + passRate * 40 + (hasPositiveSavings ? 5 : 0)));
  }

  function createCandidate(group, options) {
    const first = group[0];
    const releases = unique(group.map((record) => record.combined_control_identifier)).sort();
    const baseControls = unique(group.map((record) => record.control_number)).sort();
    const shipViaValues = unique(group.map((record) => record.ship_via)).sort();
    const sourceFiles = unique(group.map((record) => record.source_file_name)).sort();
    const parts = unique(group.map((record) => [record.product_code, record.part_number].filter(Boolean).join(" / "))).sort();
    const dueRange = dateRange(group.map((record) => record.customer_due_date));
    const totalResale = group.reduce((total, record) => total + number(record.extended_resale), 0);
    const totalCost = group.reduce((total, record) => total + number(record.extended_cost), 0);
    const grossMargin = totalResale - totalCost;
    const grossMarginPercent = totalResale > 0 ? (grossMargin / totalResale) * 100 : null;
    const readiness = readinessFor(group);
    const flaggedLineCount = group.filter((record) => record.freight_review_disposition === "flagged").length;
    const actionableLineCount = group.filter((record) => record.actionable_now).length;
    const actionableReleaseCount = unique(
      group.filter((record) => record.actionable_now).map((record) => record.combined_control_identifier)
    ).length;
    const expediteReviewLeadDays = usesExpeditedService(shipViaValues)
      ? daysBetween(first.effective_warehouse_print_date, dueRange.minimum)
      : null;

    const candidate = {
      id: `soc-${stableHash(candidateKey(first))}`,
      group_key: candidateKey(first),
      customer_number: first.customer_number,
      destination_key: first.destination_key,
      destination_display: first.destination_display,
      destination_status: group.some((record) => record.destination_status === "inferred") ? "inferred" : "confirmed",
      ship_address: first.ship_address,
      ship_city: first.ship_city,
      ship_state_province: first.ship_state_province,
      ship_postal_code: first.ship_postal_code,
      ship_country: first.ship_country,
      warehouse_code: first.warehouse_code,
      warehouse_name: first.warehouse_name,
      origin_postal_code: first.origin_postal_code,
      origin_country: first.origin_country,
      effective_warehouse_print_date: first.effective_warehouse_print_date,
      line_count: group.length,
      release_count: releases.length,
      base_control_count: baseControls.length,
      actionable_line_count: actionableLineCount,
      actionable_release_count: actionableReleaseCount,
      flagged_line_count: flaggedLineCount,
      release_identifiers: releases,
      base_control_numbers: baseControls,
      ship_via_values: shipViaValues,
      mixed_ship_via: shipViaValues.length > 1,
      expedite_review_lead_days: expediteReviewLeadDays,
      source_files: sourceFiles,
      parts,
      distinct_part_count: parts.length,
      total_extended_resale: totalResale,
      total_extended_cost: totalCost,
      gross_margin: grossMargin,
      gross_margin_percent: grossMarginPercent,
      customer_due_dates: dueRange.values,
      minimum_customer_due_date: dueRange.minimum,
      maximum_customer_due_date: dueRange.maximum,
      readiness,
      candidate_type: shipViaValues.length > 1 ? "mixed-service-consolidation" : "same-day-consolidation",
      rate_card_type: String(first.ship_country || "").toUpperCase() === "UNITED STATES" ? "DOMESTIC" : "EXPORT",
      rate_lookup_status: "needs_zone_and_billable_weight",
      savings_estimate: null,
      savings_estimate_status: "requires_freight_cost_package_and_rate_data",
      manual_review_required: true,
      records: group.slice()
    };

    const priority = priorityFor(candidate, options);
    candidate.priority_score = priority.score;
    candidate.priority_band = priority.band;
    candidate.recommendation = recommendationFor(candidate);
    candidate.reasons = reasonsFor(candidate, options);
    candidate.guardrails = guardrailsFor(candidate);
    return candidate;
  }

  function summarizeCandidates(candidates, metadata) {
    const summary = (candidates || []).reduce((result, candidate) => {
      result.total_candidates += 1;
      result[`${candidate.readiness}_candidates`] += 1;
      if (candidate.mixed_ship_via) result.mixed_service_candidates += 1;
      if (candidate.gross_margin_percent != null && candidate.gross_margin_percent < metadata.options.lowMarginPercent) result.low_margin_candidates += 1;
      if (candidate.total_extended_resale >= metadata.options.highValueThreshold) result.high_value_candidates += 1;
      result.candidate_lines += candidate.line_count;
      result.candidate_releases += candidate.release_count;
      result.total_extended_resale += candidate.total_extended_resale;
      result.total_extended_cost += candidate.total_extended_cost;
      result.total_gross_margin += candidate.gross_margin;
      return result;
    }, {
      total_candidates: 0,
      ready_candidates: 0,
      partial_candidates: 0,
      waiting_candidates: 0,
      mixed_service_candidates: 0,
      low_margin_candidates: 0,
      high_value_candidates: 0,
      candidate_lines: 0,
      candidate_releases: 0,
      total_extended_resale: 0,
      total_extended_cost: 0,
      total_gross_margin: 0,
      ignored_duplicate_rows: metadata.ignoredDuplicateRows || 0,
      review_rows_not_grouped: metadata.reviewRowsNotGrouped || 0,
      destination_review_rows: metadata.destinationReviewRows || 0,
      destination_ready_rows: metadata.destinationReadyRows || 0
    });

    summary.gross_margin_percent = summary.total_extended_resale > 0
      ? (summary.total_gross_margin / summary.total_extended_resale) * 100
      : null;

    return summary;
  }

  function buildCandidates(records, providedOptions) {
    const options = Object.assign({}, DEFAULT_OPTIONS, providedOptions || {});
    const reviewRecords = [];
    let ignoredDuplicateRows = 0;
    let destinationReviewRows = 0;

    (records || []).forEach((record) => {
      if (!isReviewRecord(record)) return;
      if (isDuplicateRecord(record)) {
        ignoredDuplicateRows += 1;
        return;
      }
      reviewRecords.push(record);
      if (!record.destination_group_eligible) destinationReviewRows += 1;
    });

    const groups = new Map();
    reviewRecords.forEach((record) => {
      if (!record.destination_group_eligible) return;
      const key = candidateKey(record);
      if (!record.customer_number || !record.destination_key || !record.warehouse_code || !record.effective_warehouse_print_date) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });

    const candidates = [];
    const candidateRecordKeys = new Set();

    groups.forEach((group) => {
      const releases = unique(group.map((record) => record.combined_control_identifier));
      if (releases.length < options.minimumReleaseCount) return;
      const candidate = createCandidate(group, options);
      candidates.push(candidate);
      group.forEach((record) => candidateRecordKeys.add(`${record.source_file_name}|${record.original_row_number}`));
    });

    candidates.sort((left, right) => {
      if (left.priority_score !== right.priority_score) return right.priority_score - left.priority_score;
      const leftReadiness = READINESS_ORDER[left.readiness] == null ? 9 : READINESS_ORDER[left.readiness];
      const rightReadiness = READINESS_ORDER[right.readiness] == null ? 9 : READINESS_ORDER[right.readiness];
      if (leftReadiness !== rightReadiness) return leftReadiness - rightReadiness;
      if (left.effective_warehouse_print_date !== right.effective_warehouse_print_date) {
        return String(left.effective_warehouse_print_date).localeCompare(String(right.effective_warehouse_print_date));
      }
      return right.total_extended_resale - left.total_extended_resale;
    });

    const reviewRowsNotGrouped = reviewRecords.length - candidateRecordKeys.size;
    return {
      options,
      candidates,
      summary: summarizeCandidates(candidates, {
        options,
        ignoredDuplicateRows,
        reviewRowsNotGrouped,
        destinationReviewRows,
        destinationReadyRows: reviewRecords.length - destinationReviewRows
      })
    };
  }

  function candidateSearchText(candidate) {
    return [
      candidate.customer_number,
      candidate.destination_display,
      candidate.ship_city,
      candidate.ship_state_province,
      candidate.ship_postal_code,
      candidate.ship_country,
      candidate.destination_status,
      candidate.warehouse_code,
      candidate.effective_warehouse_print_date,
      candidate.readiness,
      candidate.candidate_type,
      candidate.priority_band,
      candidate.recommendation,
      ...(candidate.release_identifiers || []),
      ...(candidate.base_control_numbers || []),
      ...(candidate.ship_via_values || []),
      ...(candidate.parts || []),
      ...(candidate.reasons || [])
    ].join(" ").toLowerCase();
  }

  function filterCandidates(candidates, query, filter) {
    const needle = String(query || "").trim().toLowerCase();
    const selected = String(filter || "all");

    return (candidates || []).filter((candidate) => {
      const matchesText = !needle || candidateSearchText(candidate).includes(needle);
      const matchesFilter = selected === "all"
        || candidate.readiness === selected
        || (selected === "mixed" && candidate.mixed_ship_via)
        || (selected === "high" && candidate.priority_band === "high")
        || (selected === "needs-decision" && needsDecision(candidate));
      return matchesText && matchesFilter;
    });
  }

  function csvCell(value) {
    const output = value == null ? "" : String(value);
    return /[",\r\n]/.test(output) ? `"${output.replace(/"/g, '""')}"` : output;
  }

  function buildCandidateCsv(candidates) {
    const headers = [
      "candidate_id",
      "priority_score",
      "priority_band",
      "readiness",
      "candidate_type",
      "customer_number",
      "destination_status",
      "ship_address",
      "ship_city",
      "ship_state_province",
      "ship_postal_code",
      "ship_country",
      "destination_key",
      "warehouse_code",
      "origin_postal_code",
      "effective_warehouse_print_date",
      "release_count",
      "base_control_count",
      "line_count",
      "actionable_release_count",
      "actionable_line_count",
      "flagged_line_count",
      "release_identifiers",
      "ship_via_values",
      "mixed_ship_via",
      "total_extended_resale",
      "total_extended_cost",
      "gross_margin",
      "gross_margin_percent",
      "minimum_customer_due_date",
      "maximum_customer_due_date",
      "recommendation",
      "manual_review_required",
      "savings_estimate_status",
      "quote_status",
      "quote_saved_at",
      "published_current_base_usd",
      "published_proposed_base_usd",
      "published_base_rate_difference_usd",
      "published_base_rate_difference_percent",
      "verified_savings_status"
    ];

    const lines = [headers.map(csvCell).join(",")];
    (candidates || []).forEach((candidate) => {
      const draft = quoteDraft(candidate.id);
      const comparison = draft && draft.comparison && draft.comparison.ok ? draft.comparison : null;
      const values = {
        candidate_id: candidate.id,
        priority_score: candidate.priority_score,
        priority_band: candidate.priority_band,
        readiness: candidate.readiness,
        candidate_type: candidate.candidate_type,
        customer_number: candidate.customer_number,
        destination_status: candidate.destination_status,
        ship_address: candidate.ship_address,
        ship_city: candidate.ship_city,
        ship_state_province: candidate.ship_state_province,
        ship_postal_code: candidate.ship_postal_code,
        ship_country: candidate.ship_country,
        destination_key: candidate.destination_key,
        warehouse_code: candidate.warehouse_code,
        origin_postal_code: candidate.origin_postal_code,
        effective_warehouse_print_date: candidate.effective_warehouse_print_date,
        release_count: candidate.release_count,
        base_control_count: candidate.base_control_count,
        line_count: candidate.line_count,
        actionable_release_count: candidate.actionable_release_count,
        actionable_line_count: candidate.actionable_line_count,
        flagged_line_count: candidate.flagged_line_count,
        release_identifiers: candidate.release_identifiers.join(" | "),
        ship_via_values: candidate.ship_via_values.join(" | "),
        mixed_ship_via: candidate.mixed_ship_via,
        total_extended_resale: candidate.total_extended_resale,
        total_extended_cost: candidate.total_extended_cost,
        gross_margin: candidate.gross_margin,
        gross_margin_percent: candidate.gross_margin_percent,
        minimum_customer_due_date: candidate.minimum_customer_due_date,
        maximum_customer_due_date: candidate.maximum_customer_due_date,
        recommendation: candidate.recommendation,
        manual_review_required: candidate.manual_review_required,
        savings_estimate_status: candidate.savings_estimate_status,
        quote_status: quoteStatus(candidate.id).code,
        quote_saved_at: draft ? draft.saved_at : null,
        published_current_base_usd: comparison ? comparison.current.published_base_transportation_total_usd : null,
        published_proposed_base_usd: comparison ? comparison.proposed.published_base_transportation_total_usd : null,
        published_base_rate_difference_usd: comparison ? comparison.published_base_rate_difference_usd : null,
        published_base_rate_difference_percent: comparison ? comparison.published_base_rate_difference_percent : null,
        verified_savings_status: comparison ? comparison.verified_savings_status : null
      };
      lines.push(headers.map((header) => csvCell(values[header])).join(","));
    });

    return `${lines.join("\r\n")}\r\n`;
  }

  const api = Object.freeze({
    DEFAULT_OPTIONS,
    buildCandidates,
    summarizeCandidates,
    filterCandidates,
    buildCandidateCsv,
    confidenceFor
  });

  global.MasterFlowScheduledOrderCandidates = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof document === "undefined") return;

  const UI = global.MasterFlowUI;
  const Store = global.MasterFlowStore;
  const section = document.getElementById("scheduledOrderCandidates");
  const statusText = document.getElementById("scheduledOrderCandidateStatus");
  const summaryPanel = document.getElementById("scheduledOrderCandidateSummary");
  const tablePanel = document.getElementById("scheduledOrderCandidateTable");
  const tableBody = document.getElementById("scheduledOrderCandidateBody");
  const tableMeta = document.getElementById("scheduledOrderCandidateTableMeta");
  const searchInput = document.getElementById("scheduledOrderCandidateSearch");
  const filterInput = document.getElementById("scheduledOrderCandidateFilter");
  const downloadButton = document.getElementById("scheduledOrderCandidateDownload");
  const dialog = document.getElementById("scheduledOrderCandidateDialog");
  const dialogTitle = document.getElementById("scheduledOrderCandidateDialogTitle");
  const dialogSubtitle = document.getElementById("scheduledOrderCandidateDialogSubtitle");
  const dialogBody = document.getElementById("scheduledOrderCandidateDialogBody");
  const selectAllCheckbox = document.getElementById("scheduledOrderCandidateSelectAll");
  const bulkToolbar = document.getElementById("scheduledOrderCandidateBulkToolbar");
  const bulkCount = document.getElementById("scheduledOrderCandidateBulkCount");
  const bulkReason = document.getElementById("scheduledOrderCandidateBulkReason");
  const bulkNote = document.getElementById("scheduledOrderCandidateBulkNote");
  const bulkExportLabel = document.getElementById("scheduledOrderCandidateBulkExportLabel");
  const bulkExportConfirm = document.getElementById("scheduledOrderCandidateBulkExportConfirm");
  const bulkAgreementLabel = document.getElementById("scheduledOrderCandidateBulkAgreementLabel");
  const bulkAgreementConfirm = document.getElementById("scheduledOrderCandidateBulkAgreementConfirm");
  const bulkInitials = document.getElementById("scheduledOrderCandidateBulkInitials");
  const bulkApproveButton = document.getElementById("scheduledOrderCandidateBulkApprove");
  const bulkDenyButton = document.getElementById("scheduledOrderCandidateBulkDeny");

  if (!UI || !UI.layoutReady || !section || !statusText || !summaryPanel || !tablePanel || !tableBody || !tableMeta || !searchInput || !filterInput || !downloadButton || !dialog || !dialogTitle || !dialogSubtitle || !dialogBody) return;

  let currentResult = null;
  let renderTimer = null;
  let activeCandidateId = null;
  const bulkSelection = new Set();

  function escape(value) {
    return UI.escapeHtml(value == null ? "" : value);
  }

  function formatMoney(value) {
    return UI.formatMoney(value || 0, 0);
  }

  function formatPercent(value) {
    return value == null || !Number.isFinite(Number(value)) ? "Not available" : `${Number(value).toFixed(1)}%`;
  }

  function quoteApi() {
    return global.MasterFlowFreightQuoteReadiness || null;
  }

  function quoteDraft(candidateId) {
    const api = quoteApi();
    return api && typeof api.getDraft === "function" ? api.getDraft(candidateId) : null;
  }

  function quoteStatus(candidateId) {
    const api = quoteApi();
    return api && typeof api.getStatus === "function"
      ? api.getStatus(candidateId)
      : { code: "not_started", label: "Not started", badge_class: "badge-gray" };
  }

  function quoteComparisonText(candidateId) {
    const draft = quoteDraft(candidateId);
    const comparison = draft && draft.comparison && draft.comparison.ok ? draft.comparison : null;
    if (!comparison) return "Not available from Lines Pulled alone";
    const difference = Number(comparison.published_base_rate_difference_usd || 0);
    if (difference > 0) return `${formatMoney(difference)} published base-rate reduction`;
    if (difference < 0) return `${formatMoney(Math.abs(difference))} published base-rate increase`;
    return "No published base-rate difference";
  }

  function thresholdSettings() {
    const defaults = { manualReviewConfidence: 70, autoActionConfidence: 90, minimumSavings: 250 };
    if (!Store || typeof Store.getState !== "function") return defaults;
    return Object.assign(defaults, Store.getState().settings || {});
  }

  function confidenceInfo(candidate) {
    const draft = quoteDraft(candidate.id);
    const comparison = draft && draft.comparison && draft.comparison.ok ? draft.comparison : null;
    if (!comparison) return null;
    const confidence = confidenceFor(candidate, comparison);
    const settings = thresholdSettings();
    const savings = Number(comparison.published_base_rate_difference_usd || 0);
    const belowSavingsThreshold = savings < settings.minimumSavings;
    let tierLabel;
    let tierClass;
    if (confidence < settings.manualReviewConfidence) {
      tierLabel = "Record only";
      tierClass = "badge-gray";
    } else if (confidence < settings.autoActionConfidence) {
      tierLabel = "Human review";
      tierClass = "badge-amber";
    } else {
      tierLabel = "Meets auto-action threshold";
      tierClass = "badge-green";
    }
    return { confidence, tierLabel, tierClass, belowSavingsThreshold, savings };
  }

  function needsDecision(candidate) {
    const code = quoteStatus(candidate.id).code;
    return code === "compared" || code === "sales_pending" || code === "on_hold";
  }

  function populateBulkReasonOptions(selectEl) {
    const api = quoteApi();
    if (!selectEl || !api || selectEl.dataset.populated) return;
    api.OVERRIDE_DENY_REASONS.forEach((entry) => {
      selectEl.insertAdjacentHTML("beforeend", `<option value="${escape(entry.code)}">${escape(entry.label)}</option>`);
    });
    selectEl.dataset.populated = "true";
  }

  function updateBulkToolbar() {
    if (!bulkToolbar || !currentResult) return;
    const count = bulkSelection.size;
    if (!count) {
      bulkToolbar.hidden = true;
      return;
    }
    bulkToolbar.hidden = false;
    if (bulkCount) bulkCount.textContent = `${count} candidate${count === 1 ? "" : "s"} selected`;

    const selectedCandidates = Array.from(bulkSelection).map((id) => currentResult.candidates.find((candidate) => candidate.id === id)).filter(Boolean);
    const needsExport = selectedCandidates.some((candidate) => candidate.rate_card_type === "EXPORT");
    if (bulkExportLabel) bulkExportLabel.hidden = !needsExport;

    const needsAgreement = Array.from(bulkSelection).some((id) => {
      const draft = quoteDraft(id);
      const risk = draft && draft.comparison && draft.comparison.ok ? draft.comparison.promise_date_risk : null;
      return Boolean(risk && risk.misses_due_date);
    });
    if (bulkAgreementLabel) bulkAgreementLabel.hidden = !needsAgreement;
    if (bulkInitials) bulkInitials.hidden = !needsAgreement;

    const reasonOk = Boolean(bulkReason && bulkReason.value);
    const exportOk = !needsExport || (bulkExportConfirm && bulkExportConfirm.checked);
    const agreementOk = !needsAgreement || (bulkAgreementConfirm && bulkAgreementConfirm.checked && bulkInitials && bulkInitials.value.trim());
    if (bulkApproveButton) bulkApproveButton.disabled = !(reasonOk && exportOk && agreementOk);
    if (bulkDenyButton) bulkDenyButton.disabled = !reasonOk;
  }

  function runBulkAction(action) {
    const api = quoteApi();
    if (!api || !bulkSelection.size) return;
    const ids = Array.from(bulkSelection);
    const result = api.bulkDecide(ids, action, "Alexandra Tafoya", {
      reasonCode: bulkReason ? bulkReason.value : "",
      note: bulkNote ? bulkNote.value : "",
      exportComplianceConfirmed: Boolean(bulkExportConfirm && bulkExportConfirm.checked),
      customerAgreementConfirmed: Boolean(bulkAgreementConfirm && bulkAgreementConfirm.checked),
      approverInitials: bulkInitials ? bulkInitials.value : ""
    });
    bulkSelection.clear();
    if (bulkNote) bulkNote.value = "";
    if (bulkReason) bulkReason.value = "";
    if (bulkExportConfirm) bulkExportConfirm.checked = false;
    if (bulkAgreementConfirm) bulkAgreementConfirm.checked = false;
    if (bulkInitials) bulkInitials.value = "";
    const failedSummary = result.failed.length
      ? ` ${result.failed.length} failed: ${result.failed.map((item) => item.message).join(" ")}`
      : "";
    UI.showToast(`${result.succeeded.length} ${action === "approve" ? "approved" : "denied"}.${failedSummary}`);
    global.dispatchEvent(new CustomEvent("masterflow:freight-quote-draft-updated", { detail: { bulk: true } }));
  }

  if (bulkReason) bulkReason.addEventListener("change", updateBulkToolbar);
  if (bulkExportConfirm) bulkExportConfirm.addEventListener("change", updateBulkToolbar);
  if (bulkAgreementConfirm) bulkAgreementConfirm.addEventListener("change", updateBulkToolbar);
  if (bulkInitials) bulkInitials.addEventListener("input", updateBulkToolbar);
  if (bulkApproveButton) bulkApproveButton.addEventListener("click", () => runBulkAction("approve"));
  if (bulkDenyButton) bulkDenyButton.addEventListener("click", () => runBulkAction("deny"));

  function updateDialogQuoteSummary(candidateId) {
    if (!candidateId) return;
    const statusElement = document.getElementById("scheduledOrderCandidateQuoteStatusText");
    const comparisonElement = document.getElementById("scheduledOrderCandidateQuoteComparisonText");
    if (statusElement) statusElement.textContent = quoteStatus(candidateId).label;
    if (comparisonElement) comparisonElement.textContent = quoteComparisonText(candidateId);
  }

  function readinessBadge(readiness) {
    if (readiness === "ready") return "badge-green";
    if (readiness === "partial") return "badge-amber";
    return "badge-gray";
  }

  function priorityBadge(band) {
    if (band === "high") return "badge-red";
    if (band === "medium") return "badge-amber";
    return "badge-blue";
  }

  function setCount(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value || 0);
  }

  function renderSummary() {
    if (!currentResult) return;
    const summary = currentResult.summary;
    setCount("scheduledOrderCandidateCount", summary.total_candidates);
    setCount("scheduledOrderCandidateReadyCount", summary.ready_candidates);
    setCount("scheduledOrderCandidatePartialCount", summary.partial_candidates);
    setCount("scheduledOrderCandidateWaitingCount", summary.waiting_candidates);
    setCount("scheduledOrderCandidateMixedCount", summary.mixed_service_candidates);
    setCount("scheduledOrderCandidateDestinationReviewCount", summary.destination_review_rows);
    setCount("scheduledOrderCandidateQuotedCount", currentResult.candidates.filter((candidate) => quoteStatus(candidate.id).code === "compared").length);
    const value = document.getElementById("scheduledOrderCandidateValue");
    if (value) value.textContent = formatMoney(summary.total_extended_resale);
    summaryPanel.hidden = false;
  }

  function renderTable() {
    if (!currentResult) return;
    const filtered = filterCandidates(currentResult.candidates, searchInput.value, filterInput.value);
    const visible = filtered.slice(0, currentResult.options.maximumRenderedCandidates);

    tableMeta.textContent = filtered.length > currentResult.options.maximumRenderedCandidates
      ? `Showing the first ${currentResult.options.maximumRenderedCandidates.toLocaleString()} of ${filtered.length.toLocaleString()} matching candidates. The download includes all candidates.`
      : `Showing ${filtered.length.toLocaleString()} candidate${filtered.length === 1 ? "" : "s"}.`;

    if (!visible.length) {
      tableBody.innerHTML = '<tr><td colspan="10"><div class="empty-state">No grouped freight-review candidates match the current filters.</div></td></tr>';
      if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.disabled = true;
        selectAllCheckbox.title = "No visible candidates to select.";
      }
      return;
    }

    const visibleIds = new Set(visible.map((candidate) => candidate.id));
    Array.from(bulkSelection).forEach((id) => { if (!visibleIds.has(id)) bulkSelection.delete(id); });

    let anyBulkActable = false;
    tableBody.innerHTML = visible.map((candidate) => {
      const status = quoteStatus(candidate.id);
      const confidence = confidenceInfo(candidate);
      const confidenceHtml = confidence
        ? `<span class="subtext"><span class="badge ${confidence.tierClass}">${escape(confidence.confidence)}% confidence</span> ${confidence.tierLabel}${confidence.belowSavingsThreshold ? ` <span class="badge badge-gray">Below ${escape(formatMoney(thresholdSettings().minimumSavings))} threshold</span>` : ""}</span>`
        : `<span class="subtext muted">Confidence: quote required</span>`;
      const canBulkAct = needsDecision(candidate);
      if (canBulkAct) anyBulkActable = true;
      const checkboxCell = canBulkAct
        ? `<td><input type="checkbox" class="candidate-bulk-checkbox" data-bulk-candidate-id="${escape(candidate.id)}"${bulkSelection.has(candidate.id) ? " checked" : ""}></td>`
        : "<td></td>";
      return `
      <tr>
        ${checkboxCell}
        <td><span class="badge ${priorityBadge(candidate.priority_band)}">${escape(candidate.priority_score)}</span><span class="subtext">${escape(candidate.priority_band)} priority</span></td>
        <td><strong>${escape(candidate.customer_number)}</strong><span class="subtext">${escape(candidate.destination_display)}</span><span class="subtext">${escape(candidate.warehouse_code)} · ${escape(candidate.effective_warehouse_print_date)}</span></td>
        <td>${escape(candidate.release_count)} releases<span class="subtext">${escape(candidate.base_control_count)} base controls · ${escape(candidate.line_count)} lines</span></td>
        <td>${escape(candidate.ship_via_values.slice(0, 2).join("; "))}${candidate.ship_via_values.length > 2 ? ` <span class="muted">+${candidate.ship_via_values.length - 2}</span>` : ""}<span class="subtext">${candidate.mixed_ship_via ? "Mixed services" : "One service"}</span></td>
        <td>${escape(formatMoney(candidate.total_extended_resale))}<span class="subtext">Margin ${escape(formatPercent(candidate.gross_margin_percent))}</span></td>
        <td><span class="badge ${readinessBadge(candidate.readiness)}">${escape(candidate.readiness)}</span><span class="subtext">${escape(candidate.actionable_release_count)} actionable releases</span></td>
        <td><span class="badge ${escape(status.badge_class)}">${escape(status.label)}</span><span class="subtext">${escape(quoteComparisonText(candidate.id))}</span>${confidenceHtml}</td>
        <td>${escape(candidate.recommendation)}</td>
        <td><button class="btn btn-secondary btn-sm" type="button" data-candidate-id="${escape(candidate.id)}">Review</button></td>
      </tr>`;
    }).join("");

    tableBody.querySelectorAll("button[data-candidate-id]").forEach((button) => {
      button.addEventListener("click", () => openCandidate(button.dataset.candidateId));
    });

    populateBulkReasonOptions(bulkReason);
    tableBody.querySelectorAll(".candidate-bulk-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const id = checkbox.dataset.bulkCandidateId;
        if (checkbox.checked) bulkSelection.add(id); else bulkSelection.delete(id);
        updateBulkToolbar();
      });
    });
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.disabled = !anyBulkActable;
      selectAllCheckbox.title = anyBulkActable ? "" : "No visible candidates are still awaiting a decision -- everything shown has already been approved, denied, or resolved.";
      selectAllCheckbox.onchange = () => {
        tableBody.querySelectorAll(".candidate-bulk-checkbox").forEach((checkbox) => {
          checkbox.checked = selectAllCheckbox.checked;
          const id = checkbox.dataset.bulkCandidateId;
          if (selectAllCheckbox.checked) bulkSelection.add(id); else bulkSelection.delete(id);
        });
        updateBulkToolbar();
      };
    }
    updateBulkToolbar();
  }

  function renderResult() {
    if (!currentResult) return;
    const summary = currentResult.summary;
    statusText.textContent = `${summary.total_candidates.toLocaleString()} same-customer, same-destination, same-warehouse, same-day candidate groups were found. ${summary.ready_candidates.toLocaleString()} have at least two actionable releases. ${summary.destination_review_rows.toLocaleString()} review rows were not grouped because the destination needs confirmation.`;
    section.hidden = false;
    tablePanel.hidden = false;
    downloadButton.disabled = summary.total_candidates === 0;
    renderSummary();
    renderTable();
  }

  function clearResult() {
    currentResult = null;
    activeCandidateId = null;
    section.hidden = true;
    summaryPanel.hidden = true;
    tablePanel.hidden = true;
    tableBody.innerHTML = '<tr><td colspan="10"><div class="empty-state">Load Lines Pulled reports to build grouped freight-review candidates.</div></td></tr>';
    tableMeta.textContent = "";
    searchInput.value = "";
    filterInput.value = "all";
    downloadButton.disabled = true;
  }

  function guardrailMarkup(guardrail) {
    const icon = guardrail.result === "pass" ? "✓" : "!";
    return `<div class="guardrail ${escape(guardrail.result)}"><span>${icon}</span><div><strong>${escape(guardrail.label)}</strong><div>${escape(guardrail.detail)}</div></div></div>`;
  }

  function openCandidate(id) {
    if (!currentResult) return;
    const candidate = currentResult.candidates.find((item) => item.id === id);
    if (!candidate) return;
    activeCandidateId = id;

    dialogTitle.textContent = `Freight-review candidate - ${candidate.customer_number}`;
    dialogSubtitle.textContent = `${candidate.warehouse_code} · ${candidate.destination_display} · Requested print ${candidate.effective_warehouse_print_date} · ${candidate.release_count} releases`;
    dialogBody.innerHTML = `
      <div class="notice notice-warning"><span>!</span><div><strong>Candidate, not a shipping decision</strong><p>The destination is included in grouping. Confirm customer instructions, package data, actual freight cost, and carrier rates before changing service or consolidating releases.</p></div></div>
      <div class="detail-grid mt-18">
        <div class="detail-cell"><small>Priority score</small><strong>${escape(candidate.priority_score)} · ${escape(candidate.priority_band)}</strong></div>
        <div class="detail-cell"><small>Readiness</small><strong>${escape(candidate.readiness)}</strong></div>
        <div class="detail-cell"><small>Ship-to destination</small><strong>${escape(candidate.destination_display)}</strong></div>
        <div class="detail-cell"><small>Destination status</small><strong>${escape(candidate.destination_status)}</strong></div>
        <div class="detail-cell"><small>Warehouse origin</small><strong>${escape(candidate.origin_postal_code || "Not configured")}</strong></div>
        <div class="detail-cell"><small>Release identifiers</small><strong>${escape(candidate.release_count)}</strong></div>
        <div class="detail-cell"><small>Base controls</small><strong>${escape(candidate.base_control_count)}</strong></div>
        <div class="detail-cell"><small>Part lines</small><strong>${escape(candidate.line_count)}</strong></div>
        <div class="detail-cell"><small>Distinct parts</small><strong>${escape(candidate.distinct_part_count)}</strong></div>
        <div class="detail-cell"><small>Original resale</small><strong>${escape(formatMoney(candidate.total_extended_resale))}</strong></div>
        <div class="detail-cell"><small>Original cost</small><strong>${escape(formatMoney(candidate.total_extended_cost))}</strong></div>
        <div class="detail-cell"><small>Original gross margin</small><strong>${escape(formatMoney(candidate.gross_margin))} · ${escape(formatPercent(candidate.gross_margin_percent))}</strong></div>
        <div class="detail-cell"><small>Customer due dates</small><strong>${escape(candidate.minimum_customer_due_date || "Not available")}${candidate.maximum_customer_due_date && candidate.maximum_customer_due_date !== candidate.minimum_customer_due_date ? ` to ${escape(candidate.maximum_customer_due_date)}` : ""}</strong></div>
        <div class="detail-cell"><small>SHIP VIA values</small><strong>${escape(candidate.ship_via_values.join(", "))}</strong></div>
        <div class="detail-cell"><small>Rate category</small><strong>${escape(candidate.rate_card_type)}</strong></div>
        <div class="detail-cell"><small>Quote input status</small><strong id="scheduledOrderCandidateQuoteStatusText">${escape(quoteStatus(candidate.id).label)}</strong></div>
        <div class="detail-cell"><small>Published base-rate comparison</small><strong id="scheduledOrderCandidateQuoteComparisonText">${escape(quoteComparisonText(candidate.id))}</strong></div>
      </div>
      <div class="dialog-section"><h3>Recommendation</h3><p class="small muted">${escape(candidate.recommendation)}</p></div>
      <div class="dialog-section"><h3>Why it surfaced</h3><ul class="small muted" style="padding-left:18px">${candidate.reasons.map((reason) => `<li>${escape(reason)}</li>`).join("")}</ul></div>
      <div class="dialog-section"><h3>Release identifiers</h3><p class="small muted">${escape(candidate.release_identifiers.join(", "))}</p></div>
      <div class="dialog-section"><h3>Guardrails</h3><div class="guardrail-list">${candidate.guardrails.map(guardrailMarkup).join("")}</div></div>`;
    global.dispatchEvent(new CustomEvent("masterflow:scheduled-order-candidate-opened", { detail: { candidate } }));
    dialog.showModal();
  }

  function downloadCandidateCsv() {
    if (!currentResult) return;
    const blob = new Blob([buildCandidateCsv(currentResult.candidates)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `scheduled-order-candidates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    UI.showToast("Grouped freight-review candidate CSV downloaded.");
  }

  global.addEventListener("masterflow:scheduled-orders-imported", (event) => {
    currentResult = buildCandidates(event.detail && event.detail.records ? event.detail.records : []);
    renderResult();
    global.dispatchEvent(new CustomEvent("masterflow:scheduled-order-candidates-built", { detail: currentResult }));
  });

  global.addEventListener("masterflow:scheduled-orders-cleared", clearResult);
  searchInput.addEventListener("input", () => {
    global.clearTimeout(renderTimer);
    renderTimer = global.setTimeout(renderTable, 120);
  });
  filterInput.addEventListener("change", renderTable);
  downloadButton.addEventListener("click", downloadCandidateCsv);
  global.addEventListener("masterflow:freight-quote-draft-updated", (event) => {
    if (currentResult) {
      renderSummary();
      renderTable();
    }
    const candidateId = event.detail && event.detail.candidate_id ? event.detail.candidate_id : null;
    if (candidateId && candidateId === activeCandidateId) updateDialogQuoteSummary(candidateId);
  });
  dialog.querySelectorAll("[data-close-scheduled-candidate]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
})(typeof window !== "undefined" ? window : globalThis);
