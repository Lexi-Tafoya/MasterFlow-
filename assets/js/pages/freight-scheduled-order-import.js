(function (global) {
  "use strict";

  const MAX_RENDERED_ROWS = 250;
  const DISPOSITION_ORDER = Object.freeze({
    eligible: 0,
    flagged: 1,
    invalid: 2,
    excluded: 3
  });

  function cloneIssue(item) {
    return {
      code: item && item.code ? String(item.code) : "UNKNOWN_ISSUE",
      message: item && item.message ? String(item.message) : "Unspecified validation issue.",
      field: item && item.field != null ? String(item.field) : null,
      value: item && item.value != null ? item.value : null
    };
  }

  function cloneRecord(record) {
    return Object.assign({}, record, {
      raw_source_values: Object.assign({}, record.raw_source_values || {}),
      validation_errors: (record.validation_errors || []).map(cloneIssue),
      validation_warnings: (record.validation_warnings || []).map(cloneIssue)
    });
  }

  function hasIssue(list, code) {
    return (list || []).some((item) => item && item.code === code);
  }

  function addIssue(record, type, item) {
    const key = type === "error" ? "validation_errors" : "validation_warnings";
    if (!record[key]) record[key] = [];
    if (!hasIssue(record[key], item.code)) record[key].push(cloneIssue(item));
  }

  function reclassify(record) {
    if ((record.validation_errors || []).length > 0) {
      record.freight_review_disposition = "invalid";
      record.freight_review_eligible = false;
      record.actionable_now = false;
      return record;
    }

    if (record.order_complete === "C") {
      record.freight_review_disposition = "excluded";
      record.freight_review_eligible = false;
      record.actionable_now = false;
      record.exclusion_reason = record.exclusion_reason || "ORDER COMPLETE is C; the individual part line is complete.";
      return record;
    }

    record.freight_review_eligible = true;
    record.freight_review_disposition = (record.validation_warnings || []).length > 0 ? "flagged" : "eligible";
    record.actionable_now = record.allocation === "SOFTFULL";
    record.exclusion_reason = null;
    return record;
  }

  function fingerprint(record) {
    const raw = record.raw_source_values || {};
    return Object.keys(raw)
      .sort()
      .map((key) => `${key}=${String(raw[key] == null ? "" : raw[key])}`)
      .join("\u001F");
  }

  function summarizeRecords(records) {
    return (records || []).reduce((summary, record) => {
      const disposition = record.freight_review_disposition || "invalid";
      summary.total_rows += 1;
      summary[`${disposition}_rows`] += 1;
      if (record.actionable_now) summary.actionable_now_rows += 1;
      if (record.allocation === "SOFTZERO") summary.softzero_rows += 1;
      if (record.order_complete === "C") summary.complete_rows += 1;
      if (record.cross_file_duplicate_of) summary.cross_file_duplicate_rows += 1;
      if (record.destination_status === "confirmed") summary.destination_confirmed_rows += 1;
      if (record.destination_status === "inferred") summary.destination_inferred_rows += 1;
      if (record.destination_status === "review_required") summary.destination_review_rows += 1;
      if (record.destination_status === "not_provided") summary.destination_not_provided_rows += 1;
      return summary;
    }, {
      total_rows: 0,
      eligible_rows: 0,
      flagged_rows: 0,
      excluded_rows: 0,
      invalid_rows: 0,
      actionable_now_rows: 0,
      softzero_rows: 0,
      complete_rows: 0,
      cross_file_duplicate_rows: 0,
      destination_confirmed_rows: 0,
      destination_inferred_rows: 0,
      destination_review_rows: 0,
      destination_not_provided_rows: 0
    });
  }

  function combineResults(results) {
    const records = [];
    const fileErrors = [];
    const files = [];

    (results || []).forEach((result) => {
      const name = result && result.source_file_name ? result.source_file_name : "unknown.csv";
      const errors = (result && result.file_errors ? result.file_errors : []).map(cloneIssue);
      const fileRecords = result && Array.isArray(result.records) ? result.records : [];

      files.push({
        source_file_name: name,
        row_count: fileRecords.length,
        file_error_count: errors.length
      });

      errors.forEach((error) => fileErrors.push(Object.assign({ source_file_name: name }, error)));
      fileRecords.forEach((record) => records.push(cloneRecord(record)));
    });

    const seenRows = new Map();
    records.forEach((record) => {
      const key = fingerprint(record);
      if (!key) return;
      if (seenRows.has(key)) {
        const first = seenRows.get(key);
        record.cross_file_duplicate_of = {
          source_file_name: first.source_file_name,
          original_row_number: first.original_row_number
        };
        addIssue(record, "warning", {
          code: "CROSS_FILE_DUPLICATE",
          message: `This row exactly duplicates ${first.source_file_name} row ${first.original_row_number}.`,
          field: null,
          value: null
        });
      } else {
        seenRows.set(key, record);
      }
    });

    const controls = new Map();
    records.forEach((record) => {
      if (!record.control_number || !record.customer_number) return;
      if (!controls.has(record.control_number)) controls.set(record.control_number, []);
      controls.get(record.control_number).push(record);
    });

    controls.forEach((group, controlNumber) => {
      const customers = new Set(group.map((record) => record.customer_number).filter(Boolean));
      if (customers.size <= 1) return;
      const customerList = Array.from(customers).sort().join(", ");
      group.forEach((record) => {
        addIssue(record, "error", {
          code: "CONTROL_CUSTOMER_MISMATCH",
          message: `Control ${controlNumber} contains multiple customer numbers: ${customerList}.`,
          field: "CUST#",
          value: record.customer_number
        });
      });
    });

    const releaseDestinations = new Map();
    records.forEach((record) => {
      if (!record.combined_control_identifier || !record.destination_key) return;
      if (!releaseDestinations.has(record.combined_control_identifier)) releaseDestinations.set(record.combined_control_identifier, []);
      releaseDestinations.get(record.combined_control_identifier).push(record);
    });

    releaseDestinations.forEach((group, releaseIdentifier) => {
      const destinations = new Set(group.map((record) => record.destination_key).filter(Boolean));
      if (destinations.size <= 1) return;
      group.forEach((record) => {
        addIssue(record, "warning", {
          code: "RELEASE_DESTINATION_CHANGE",
          message: `Release ${releaseIdentifier} appears with more than one normalized destination across the selected files. Confirm whether the ship-to changed.`,
          field: "DESTINATION",
          value: record.destination_display
        });
      });
    });

    records.forEach(reclassify);

    return {
      files,
      file_errors: fileErrors,
      records,
      summary: summarizeRecords(records)
    };
  }

  function matchesDisposition(record, disposition) {
    if (!disposition || disposition === "review") {
      return record.freight_review_disposition === "eligible" || record.freight_review_disposition === "flagged";
    }
    if (disposition === "all") return true;
    return record.freight_review_disposition === disposition;
  }

  function searchableText(record) {
    return [
      record.source_file_name,
      record.original_row_number,
      record.combined_control_identifier,
      record.control_number,
      record.control_suffix,
      record.customer_number,
      record.product_code,
      record.part_number,
      record.ship_via,
      record.warehouse_code,
      record.ship_address,
      record.ship_city,
      record.ship_state_province,
      record.ship_postal_code,
      record.ship_country,
      record.destination_status,
      record.destination_display,
      record.inside_sales_representative_initials,
      record.allocation,
      record.order_complete,
      record.freight_review_disposition,
      ...(record.validation_errors || []).map((item) => `${item.code} ${item.message}`),
      ...(record.validation_warnings || []).map((item) => `${item.code} ${item.message}`)
    ].join(" ").toLowerCase();
  }

  function filterRecords(records, query, disposition) {
    const needle = String(query || "").trim().toLowerCase();
    return (records || [])
      .filter((record) => matchesDisposition(record, disposition))
      .filter((record) => !needle || searchableText(record).includes(needle))
      .slice()
      .sort((left, right) => {
        const leftRank = DISPOSITION_ORDER[left.freight_review_disposition] == null ? 9 : DISPOSITION_ORDER[left.freight_review_disposition];
        const rightRank = DISPOSITION_ORDER[right.freight_review_disposition] == null ? 9 : DISPOSITION_ORDER[right.freight_review_disposition];
        if (leftRank !== rightRank) return leftRank - rightRank;
        const leftDate = left.effective_warehouse_print_date || "9999-12-31";
        const rightDate = right.effective_warehouse_print_date || "9999-12-31";
        return leftDate.localeCompare(rightDate) || String(left.combined_control_identifier || "").localeCompare(String(right.combined_control_identifier || ""));
      });
  }

  function csvCell(value) {
    const output = value == null ? "" : String(value);
    return /[",\r\n]/.test(output) ? `"${output.replace(/"/g, '""')}"` : output;
  }

  function issueCodes(record) {
    return [
      ...(record.validation_errors || []).map((item) => item.code),
      ...(record.validation_warnings || []).map((item) => item.code)
    ].join(" | ");
  }

  function buildReviewCsv(records) {
    const columns = [
      ["source_file_name", (record) => record.source_file_name],
      ["original_row_number", (record) => record.original_row_number],
      ["control_number", (record) => record.control_number],
      ["control_suffix", (record) => record.control_suffix],
      ["combined_control_identifier", (record) => record.combined_control_identifier],
      ["customer_number", (record) => record.customer_number],
      ["ship_address", (record) => record.ship_address],
      ["ship_city", (record) => record.ship_city],
      ["ship_state_province", (record) => record.ship_state_province],
      ["ship_postal_code", (record) => record.ship_postal_code],
      ["ship_country", (record) => record.ship_country],
      ["destination_status", (record) => record.destination_status],
      ["destination_key", (record) => record.destination_key],
      ["origin_postal_code", (record) => record.origin_postal_code],
      ["product_code", (record) => record.product_code],
      ["part_number", (record) => record.part_number],
      ["order_quantity", (record) => record.order_quantity],
      ["extended_resale", (record) => record.extended_resale],
      ["extended_cost", (record) => record.extended_cost],
      ["gross_margin", (record) => record.gross_margin],
      ["gross_margin_percent", (record) => record.gross_margin_percent],
      ["customer_due_date", (record) => record.customer_due_date],
      ["line_scheduled_print_date", (record) => record.line_scheduled_print_date],
      ["warehouse_print_request_date", (record) => record.warehouse_print_request_date],
      ["effective_warehouse_print_date", (record) => record.effective_warehouse_print_date],
      ["allocation", (record) => record.allocation],
      ["order_complete", (record) => record.order_complete],
      ["order_status", (record) => record.order_status],
      ["order_type", (record) => record.order_type],
      ["warehouse_code", (record) => record.warehouse_code],
      ["ship_via", (record) => record.ship_via],
      ["inside_sales_representative_initials", (record) => record.inside_sales_representative_initials],
      ["freight_review_disposition", (record) => record.freight_review_disposition],
      ["actionable_now", (record) => record.actionable_now],
      ["issue_codes", issueCodes]
    ];

    const reviewRecords = (records || []).filter((record) =>
      record.freight_review_disposition === "eligible" || record.freight_review_disposition === "flagged"
    );

    const lines = [columns.map(([header]) => csvCell(header)).join(",")];
    reviewRecords.forEach((record) => {
      lines.push(columns.map(([, getter]) => csvCell(getter(record))).join(","));
    });
    return `${lines.join("\r\n")}\r\n`;
  }

  const api = Object.freeze({
    MAX_RENDERED_ROWS,
    combineResults,
    summarizeRecords,
    filterRecords,
    buildReviewCsv,
    reclassify
  });

  global.MasterFlowScheduledOrderImport = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof document === "undefined") return;

  const Parser = global.MasterFlowScheduledOrders;
  const UI = global.MasterFlowUI;
  const FileHandleStore = global.MasterFlowFileHandleStore;
  const HANDLE_STORE_KEY = "scheduledOrderCsv";
  const chooseButton = document.getElementById("scheduledOrderChooseFiles");
  const reloadRememberedButton = document.getElementById("scheduledOrderReloadRemembered");
  const fileInput = document.getElementById("scheduledOrderFiles");
  const clearButton = document.getElementById("scheduledOrderClear");
  const downloadButton = document.getElementById("scheduledOrderDownload");
  const statusText = document.getElementById("scheduledOrderImportStatus");
  const summaryPanel = document.getElementById("scheduledOrderSummary");
  const resultsPanel = document.getElementById("scheduledOrderResults");
  const searchInput = document.getElementById("scheduledOrderSearch");
  const dispositionFilter = document.getElementById("scheduledOrderDispositionFilter");
  const resultsTable = document.getElementById("scheduledOrderResultsTable");
  const tableBody = document.getElementById("scheduledOrderBody");
  const tableMeta = document.getElementById("scheduledOrderTableMeta");
  const messages = document.getElementById("scheduledOrderImportMessages");

  if (!chooseButton || !fileInput || !clearButton || !downloadButton || !statusText || !summaryPanel || !resultsPanel || !searchInput || !dispositionFilter || !resultsTable || !tableBody || !tableMeta || !messages) return;

  if (!Parser || !UI || !UI.layoutReady) {
    statusText.textContent = "Scheduled-order intake is unavailable because its parser or page layout did not load.";
    messages.innerHTML = '<div class="notice notice-danger"><span>!</span><div><strong>Importer unavailable</strong><p>Confirm that scheduled-order-parser.js and freight-scheduled-order-import.js are included on this page.</p></div></div>';
    chooseButton.disabled = true;
    return;
  }

  let currentImport = null;
  let renderTimer = null;

  function escape(value) {
    return UI.escapeHtml(value == null ? "" : value);
  }

  function dispositionClass(value) {
    if (value === "eligible") return "badge-green";
    if (value === "flagged") return "badge-amber";
    if (value === "invalid") return "badge-red";
    return "badge-gray";
  }

  function formatPercent(value) {
    return value != null && value !== "" && Number.isFinite(Number(value))
      ? `${Number(value).toFixed(1)}%`
      : "Not available";
  }

  function formatMoney(value) {
    return value != null && value !== "" && Number.isFinite(Number(value))
      ? UI.formatMoney(value)
      : "Not available";
  }

  function issueDisplay(record) {
    const issues = [
      ...(record.validation_errors || []),
      ...(record.validation_warnings || [])
    ];
    if (!issues.length) return '<span class="muted">None</span>';
    const shown = issues.slice(0, 2).map((item) => escape(item.code)).join(", ");
    return `${shown}${issues.length > 2 ? ` <span class="muted">+${issues.length - 2} more</span>` : ""}`;
  }

  function setBusy(busy) {
    chooseButton.disabled = busy;
    chooseButton.textContent = busy ? "Reading reports..." : "Choose CSV reports";
  }

  function setCount(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value || 0);
  }

  function renderSummary() {
    if (!currentImport) return;
    const summary = currentImport.summary;
    setCount("scheduledOrderTotalCount", summary.total_rows);
    setCount("scheduledOrderActionableCount", summary.actionable_now_rows);
    setCount("scheduledOrderEligibleCount", summary.eligible_rows);
    setCount("scheduledOrderFlaggedCount", summary.flagged_rows);
    setCount("scheduledOrderExcludedCount", summary.excluded_rows);
    setCount("scheduledOrderInvalidCount", summary.invalid_rows);
    setCount("scheduledOrderDestinationConfirmedCount", summary.destination_confirmed_rows);
    setCount("scheduledOrderDestinationInferredCount", summary.destination_inferred_rows);
    setCount("scheduledOrderDestinationReviewCount", summary.destination_review_rows + summary.destination_not_provided_rows);
    summaryPanel.hidden = false;
  }

  function renderMessages() {
    if (!currentImport) {
      messages.innerHTML = "";
      return;
    }

    const chunks = [];
    if (currentImport.file_errors.length) {
      const list = currentImport.file_errors
        .map((item) => `<li><strong>${escape(item.source_file_name)}</strong>: ${escape(item.message)}</li>`)
        .join("");
      chunks.push(`<div class="notice notice-danger"><span>!</span><div><strong>${currentImport.file_errors.length} file-level issue${currentImport.file_errors.length === 1 ? "" : "s"}</strong><ul class="small" style="margin:8px 0 0;padding-left:18px">${list}</ul></div></div>`);
    }

    if (currentImport.summary.cross_file_duplicate_rows) {
      chunks.push(`<div class="notice notice-warning mt-12"><span>!</span><div><strong>${currentImport.summary.cross_file_duplicate_rows} overlapping row${currentImport.summary.cross_file_duplicate_rows === 1 ? "" : "s"} detected</strong><p>Exact repeats across selected files remain visible but are flagged for review.</p></div></div>`);
    }

    const destinationReviewCount = currentImport.summary.destination_review_rows + currentImport.summary.destination_not_provided_rows;
    if (destinationReviewCount) {
      chunks.push(`<div class="notice notice-warning mt-12"><span>!</span><div><strong>${destinationReviewCount.toLocaleString()} row${destinationReviewCount === 1 ? "" : "s"} need destination confirmation</strong><p>These rows remain visible but will not be placed into automatic consolidation groups.</p></div></div>`);
    }

    messages.innerHTML = chunks.join("");
  }

  function renderTable() {
    if (!currentImport) return;
    const filtered = filterRecords(currentImport.records, searchInput.value, dispositionFilter.value);
    const visible = filtered.slice(0, MAX_RENDERED_ROWS);

    tableMeta.textContent = filtered.length > MAX_RENDERED_ROWS
      ? `Showing the first ${MAX_RENDERED_ROWS.toLocaleString()} of ${filtered.length.toLocaleString()} matching rows. The download includes the full review population.`
      : `Showing ${filtered.length.toLocaleString()} matching row${filtered.length === 1 ? "" : "s"}.`;

    if (!visible.length) {
      tableBody.innerHTML = '<tr><td colspan="11"><div class="empty-state">No scheduled-order lines match the current filters.</div></td></tr>';
      return;
    }

    tableBody.innerHTML = visible.map((record) => `
      <tr>
        <td>${escape(record.source_file_name)}<span class="subtext">Row ${escape(record.original_row_number)}</span></td>
        <td>${escape(record.combined_control_identifier)}<span class="subtext">Customer ${escape(record.customer_number)}</span></td>
        <td>${escape(record.destination_display)}<span class="subtext">${escape(record.destination_status)}</span></td>
        <td>${escape(record.product_code)} / ${escape(record.part_number)}<span class="subtext">Qty ${escape(record.order_quantity)}</span></td>
        <td>${escape(record.effective_warehouse_print_date)}<span class="subtext">Due ${escape(record.customer_due_date)}</span></td>
        <td>${escape(record.allocation)}<span class="subtext">${record.actionable_now ? "Ready now" : "Not ready now"}</span></td>
        <td>${escape(record.order_complete)}</td>
        <td>${escape(formatMoney(record.extended_resale))}</td>
        <td>${escape(formatMoney(record.gross_margin))}<span class="subtext">${escape(formatPercent(record.gross_margin_percent))}</span></td>
        <td><span class="badge ${dispositionClass(record.freight_review_disposition)}">${escape(record.freight_review_disposition)}</span></td>
        <td>${issueDisplay(record)}</td>
      </tr>`).join("");
  }

  function renderImport() {
    if (!currentImport) return;
    const summary = currentImport.summary;
    const goodFiles = currentImport.files.filter((file) => file.file_error_count === 0).length;
    const reviewCount = summary.eligible_rows + summary.flagged_rows;
    const destinationReady = summary.destination_confirmed_rows + summary.destination_inferred_rows;
    statusText.textContent = `${currentImport.files.length} file${currentImport.files.length === 1 ? "" : "s"} selected; ${goodFiles} parsed successfully. ${summary.total_rows.toLocaleString()} rows loaded, ${reviewCount.toLocaleString()} remain in review, and ${destinationReady.toLocaleString()} have a usable destination.`;
    clearButton.disabled = false;
    downloadButton.disabled = reviewCount === 0;
    resultsPanel.hidden = false;
    resultsTable.hidden = false;
    renderSummary();
    renderMessages();
    renderTable();
  }

  function clearImport() {
    currentImport = null;
    fileInput.value = "";
    statusText.textContent = "No reports loaded. Choose one or more Lines Pulled CSV files.";
    summaryPanel.hidden = true;
    resultsPanel.hidden = true;
    resultsTable.hidden = true;
    messages.innerHTML = "";
    tableBody.innerHTML = '<tr><td colspan="11"><div class="empty-state">Choose CSV reports to build the scheduled-order review population.</div></td></tr>';
    tableMeta.textContent = "";
    searchInput.value = "";
    dispositionFilter.value = "review";
    clearButton.disabled = true;
    downloadButton.disabled = true;
    global.dispatchEvent(new CustomEvent("masterflow:scheduled-orders-cleared"));
  }

  async function parseSelectedFiles(files) {
    setBusy(true);
    statusText.textContent = `Reading ${files.length} report${files.length === 1 ? "" : "s"}...`;
    messages.innerHTML = "";

    try {
      const results = await Promise.all(files.map(async (file) => {
        try {
          return await Parser.parseFile(file);
        } catch (error) {
          return {
            source_file_name: file.name,
            headers: [],
            records: [],
            summary: {},
            file_errors: [{
              code: "FILE_READ_ERROR",
              message: error && error.message ? error.message : "The file could not be read.",
              field: null,
              value: null
            }]
          };
        }
      }));

      currentImport = combineResults(results);
      renderImport();
      global.dispatchEvent(new CustomEvent("masterflow:scheduled-orders-imported", { detail: currentImport }));
    } catch (error) {
      console.error("Scheduled-order import failed", error);
      statusText.textContent = "The selected reports could not be processed.";
      messages.innerHTML = `<div class="notice notice-danger"><span>!</span><div><strong>Import failed</strong><p>${escape(error && error.message ? error.message : "Unexpected import error.")}</p></div></div>`;
    } finally {
      setBusy(false);
    }
  }

  function downloadReviewCsv() {
    if (!currentImport) return;
    const csv = buildReviewCsv(currentImport.records);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `scheduled-order-review-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    UI.showToast("Review-population CSV downloaded. Excluded and invalid rows were not included.");
  }

  const rememberFilesSupported = Boolean(FileHandleStore && FileHandleStore.isSupported());

  async function handlesToFiles(handles) {
    const files = [];
    for (const handle of handles) {
      try {
        if ((await handle.requestPermission({ mode: "read" })) !== "granted") continue;
        files.push(await handle.getFile());
      } catch (error) {
        // Handle may point at a file that moved or was deleted; skip it.
      }
    }
    return files;
  }

  async function chooseWithFilePicker() {
    let handles;
    try {
      handles = await window.showOpenFilePicker({
        multiple: true,
        types: [{ description: "CSV files", accept: { "text/csv": [".csv"] } }]
      });
    } catch (error) {
      if (error && error.name === "AbortError") return;
      fileInput.value = "";
      fileInput.click();
      return;
    }

    // Remembering the pick is best-effort: if it fails (private browsing, storage quota,
    // etc.) the user's already-made selection should still be parsed, not discarded.
    try {
      await FileHandleStore.save(HANDLE_STORE_KEY, handles);
      if (reloadRememberedButton) reloadRememberedButton.disabled = false;
    } catch (error) {
      console.warn("Could not remember the selected CSV reports for next time.", error);
    }

    parseSelectedFiles(await Promise.all(handles.map((handle) => handle.getFile())));
  }

  async function reloadRememberedFiles() {
    const handles = await FileHandleStore.load(HANDLE_STORE_KEY);
    if (!handles.length) {
      UI.showToast("No remembered CSV reports yet. Choose reports once to remember them for next time.");
      return;
    }
    const files = await handlesToFiles(handles);
    if (!files.length) {
      UI.showToast("Access to the remembered CSV reports was not granted. Choose the reports again.");
      return;
    }
    parseSelectedFiles(files);
  }

  chooseButton.addEventListener("click", () => {
    if (rememberFilesSupported) {
      chooseWithFilePicker();
    } else {
      fileInput.value = "";
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files || []);
    if (files.length) parseSelectedFiles(files);
  });
  clearButton.addEventListener("click", clearImport);
  downloadButton.addEventListener("click", downloadReviewCsv);
  dispositionFilter.addEventListener("change", renderTable);
  searchInput.addEventListener("input", () => {
    window.clearTimeout(renderTimer);
    renderTimer = window.setTimeout(renderTable, 120);
  });

  if (reloadRememberedButton) {
    if (rememberFilesSupported) {
      reloadRememberedButton.hidden = false;
      reloadRememberedButton.addEventListener("click", reloadRememberedFiles);
      FileHandleStore.load(HANDLE_STORE_KEY).then((handles) => {
        reloadRememberedButton.disabled = handles.length === 0;
      });
    } else {
      reloadRememberedButton.hidden = true;
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
