(function (global) {
  "use strict";

  const RateCards = global.MasterFlowRateCards;
  const UI = global.MasterFlowUI;
  const FileHandleStore = global.MasterFlowFileHandleStore;
  const HANDLE_STORE_KEY = "rateCardCsv";

  const chooseButton = document.getElementById("rateCardChooseFiles");
  const reloadRememberedButton = document.getElementById("rateCardReloadRemembered");
  const fileInput = document.getElementById("rateCardFiles");
  const clearButton = document.getElementById("rateCardClear");
  const statusText = document.getElementById("rateCardStatus");
  const summaryPanel = document.getElementById("rateCardSummary");
  const messages = document.getElementById("rateCardMessages");
  const candidateStatus = document.getElementById("rateCardCandidateStatus");
  const typeSelect = document.getElementById("rateLookupType");
  const serviceSelect = document.getElementById("rateLookupService");
  const zoneSelect = document.getElementById("rateLookupZone");
  const packageSelect = document.getElementById("rateLookupPackage");
  const weightInput = document.getElementById("rateLookupWeight");
  const lookupButton = document.getElementById("rateLookupButton");
  const lookupResult = document.getElementById("rateLookupResult");

  if (!chooseButton || !fileInput || !clearButton || !statusText || !summaryPanel || !messages || !candidateStatus || !typeSelect || !serviceSelect || !zoneSelect || !packageSelect || !weightInput || !lookupButton || !lookupResult) return;

  if (!RateCards || !UI || !UI.layoutReady) {
    statusText.textContent = "The rate-card library could not start because its parser or page layout did not load.";
    chooseButton.disabled = true;
    return;
  }

  let currentLibrary = null;
  let latestCandidates = null;

  function escape(value) {
    return UI.escapeHtml(value == null ? "" : value);
  }

  function setCount(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = Number(value || 0).toLocaleString();
  }

  function option(value, label) {
    return `<option value="${escape(value)}">${escape(label)}</option>`;
  }

  function renderCandidateStatus() {
    if (!latestCandidates) {
      candidateStatus.textContent = "Load scheduled orders to map candidate groups to Domestic or Export rate categories.";
      return;
    }

    const candidates = latestCandidates.candidates || [];
    const domestic = candidates.filter((candidate) => candidate.rate_card_type === "DOMESTIC").length;
    const international = candidates.filter((candidate) => candidate.rate_card_type === "EXPORT").length;
    candidateStatus.textContent = `${domestic.toLocaleString()} candidate groups map to Domestic rates and ${international.toLocaleString()} map to Export rates. No candidate is quote-ready until a shipping zone and billable weight are supplied.`;
  }

  function renderSummary() {
    if (!currentLibrary) return;
    const summary = currentLibrary.summary;
    setCount("rateCardRowCount", summary.valid_rate_rows);
    setCount("rateCardServiceCount", summary.service_count);
    setCount("rateCardZoneCount", summary.zone_count);
    setCount("rateCardDomesticCount", summary.domestic_rate_rows);
    setCount("rateCardImportCount", summary.import_rate_rows);
    setCount("rateCardExportCount", summary.export_rate_rows);
    summaryPanel.hidden = false;
  }

  function renderMessages() {
    if (!currentLibrary) {
      messages.innerHTML = "";
      return;
    }
    const chunks = [];
    if (currentLibrary.file_errors.length) {
      const list = currentLibrary.file_errors.map((item) => `<li><strong>${escape(item.source_file_name || "Rate file")}</strong>: ${escape(item.message)}</li>`).join("");
      chunks.push(`<div class="notice notice-danger"><span>!</span><div><strong>${currentLibrary.file_errors.length} file-level issue${currentLibrary.file_errors.length === 1 ? "" : "s"}</strong><ul class="small" style="margin:8px 0 0;padding-left:18px">${list}</ul></div></div>`);
    }
    if (currentLibrary.summary.invalid_rate_rows) {
      chunks.push(`<div class="notice notice-warning mt-12"><span>!</span><div><strong>${currentLibrary.summary.invalid_rate_rows.toLocaleString()} invalid rate row${currentLibrary.summary.invalid_rate_rows === 1 ? "" : "s"}</strong><p>Invalid rows are excluded from lookup results.</p></div></div>`);
    }
    messages.innerHTML = chunks.join("");
  }

  function populateServices() {
    serviceSelect.innerHTML = '<option value="">Choose service</option>';
    zoneSelect.innerHTML = '<option value="">Choose zone</option>';
    packageSelect.innerHTML = '<option value="">Choose package type</option>';
    if (!currentLibrary || !typeSelect.value) return;
    RateCards.listServices(currentLibrary, typeSelect.value).forEach((service) => {
      serviceSelect.insertAdjacentHTML("beforeend", option(service.service_code, service.service_name));
    });
  }

  function populateZones() {
    zoneSelect.innerHTML = '<option value="">Choose zone</option>';
    packageSelect.innerHTML = '<option value="">Choose package type</option>';
    if (!currentLibrary || !typeSelect.value || !serviceSelect.value) return;
    RateCards.listZones(currentLibrary, typeSelect.value, serviceSelect.value).forEach((zone) => {
      zoneSelect.insertAdjacentHTML("beforeend", option(zone, `Zone ${zone}`));
    });
  }

  function populatePackages() {
    packageSelect.innerHTML = '<option value="">Choose package type</option>';
    if (!currentLibrary || !typeSelect.value || !serviceSelect.value || !zoneSelect.value) return;
    RateCards.listPackageTypes(currentLibrary, typeSelect.value, serviceSelect.value, zoneSelect.value).forEach((packageType) => {
      packageSelect.insertAdjacentHTML("beforeend", option(packageType, packageType.replaceAll("_", " ")));
    });
    if (packageSelect.options.length === 2) packageSelect.selectedIndex = 1;
  }

  function resetLookup() {
    typeSelect.value = "";
    serviceSelect.innerHTML = '<option value="">Choose service</option>';
    zoneSelect.innerHTML = '<option value="">Choose zone</option>';
    packageSelect.innerHTML = '<option value="">Choose package type</option>';
    weightInput.value = "";
    lookupResult.innerHTML = "";
  }

  function renderLibrary(fileCount) {
    if (!currentLibrary) return;
    const summary = currentLibrary.summary;
    statusText.textContent = `${fileCount} normalized rate-card CSV file${fileCount === 1 ? "" : "s"} loaded. ${summary.valid_rate_rows.toLocaleString()} valid published rate rows cover ${summary.service_count.toLocaleString()} services and ${summary.zone_count.toLocaleString()} rate-type/zone combinations.`;
    clearButton.disabled = false;
    renderSummary();
    renderMessages();
    populateServices();
    renderCandidateStatus();
  }

  function clearLibrary() {
    currentLibrary = null;
    fileInput.value = "";
    statusText.textContent = "No rate cards loaded. Choose the private normalized carrier rate-card CSV.";
    summaryPanel.hidden = true;
    clearButton.disabled = true;
    messages.innerHTML = "";
    resetLookup();
    global.dispatchEvent(new CustomEvent("masterflow:rate-cards-cleared"));
  }

  async function parseSelectedFiles(files) {
    chooseButton.disabled = true;
    chooseButton.textContent = "Reading rates...";
    statusText.textContent = `Reading ${files.length} normalized rate-card file${files.length === 1 ? "" : "s"}...`;
    try {
      const results = await Promise.all(files.map(async (file) => {
        try {
          return await RateCards.parseFile(file);
        } catch (error) {
          return {
            source_file_name: file.name,
            records: [],
            summary: {},
            file_errors: [{ code: "FILE_READ_ERROR", message: error && error.message ? error.message : "The file could not be read." }]
          };
        }
      }));
      currentLibrary = RateCards.combine(results);
      renderLibrary(files.length);
      global.dispatchEvent(new CustomEvent("masterflow:rate-cards-loaded", { detail: currentLibrary }));
    } catch (error) {
      console.error("Rate-card import failed", error);
      statusText.textContent = "The selected rate-card file could not be processed.";
      messages.innerHTML = `<div class="notice notice-danger"><span>!</span><div><strong>Rate-card import failed</strong><p>${escape(error && error.message ? error.message : "Unexpected import error.")}</p></div></div>`;
    } finally {
      chooseButton.disabled = false;
      chooseButton.textContent = "Choose normalized rate CSV";
    }
  }

  function runLookup() {
    if (!currentLibrary) {
      UI.showToast("Load the normalized carrier rate-card CSV before running a lookup.");
      return;
    }

    const result = RateCards.quote(currentLibrary, {
      rate_card_type: typeSelect.value,
      service_code: serviceSelect.value,
      zone: zoneSelect.value,
      package_type: packageSelect.value,
      billable_weight_lb: weightInput.value
    });

    if (!result.ok) {
      lookupResult.innerHTML = `<div class="notice notice-danger"><span>!</span><div><strong>Rate not found</strong><p>${escape((result.errors || []).join(" "))}</p></div></div>`;
      return;
    }

    const effective = result.effective_date || (result.rate_year ? `Rate year ${result.rate_year}` : "Effective date not provided");
    lookupResult.innerHTML = `
      <div class="notice notice-success"><span>✓</span><div><strong>${escape(result.service_name)} · Zone ${escape(result.zone)}</strong><p>Published ${escape(result.published_weight_label)} ${escape(result.rate_basis === "PER_LB" ? `at ${UI.formatMoney(result.rate_usd)}/lb` : "rate")}.</p></div></div>
      <div class="detail-grid mt-12">
        <div class="detail-cell"><small>Base transportation</small><strong>${escape(UI.formatMoney(result.base_transportation_charge_usd))}</strong></div>
        <div class="detail-cell"><small>Billable weight</small><strong>${escape(result.billable_weight_lb)} lb</strong></div>
        <div class="detail-cell"><small>Package type</small><strong>${escape(result.package_type)}</strong></div>
        <div class="detail-cell"><small>Rate category</small><strong>${escape(result.rate_card_type)}</strong></div>
        <div class="detail-cell"><small>Minimum charge</small><strong>${result.minimum_charge_usd == null ? "Not listed" : escape(UI.formatMoney(result.minimum_charge_usd))}</strong></div>
        <div class="detail-cell"><small>Effective</small><strong>${escape(effective)}</strong></div>
      </div>
      <div class="notice notice-warning mt-12"><span>!</span><div><strong>Prototype base-rate lookup only</strong><p>${escape(result.warning)}</p></div></div>`;
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
      console.warn("Could not remember the selected rate-card file for next time.", error);
    }

    parseSelectedFiles(await Promise.all(handles.map((handle) => handle.getFile())));
  }

  async function reloadRememberedFiles() {
    const handles = await FileHandleStore.load(HANDLE_STORE_KEY);
    if (!handles.length) {
      UI.showToast("No remembered rate-card file yet. Choose the file once to remember it for next time.");
      return;
    }
    const files = await handlesToFiles(handles);
    if (!files.length) {
      UI.showToast("Access to the remembered rate-card file was not granted. Choose the file again.");
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
  clearButton.addEventListener("click", clearLibrary);
  typeSelect.addEventListener("change", populateServices);
  serviceSelect.addEventListener("change", populateZones);
  zoneSelect.addEventListener("change", populatePackages);
  lookupButton.addEventListener("click", runLookup);
  global.addEventListener("masterflow:scheduled-order-candidates-built", (event) => {
    latestCandidates = event.detail || null;
    renderCandidateStatus();
  });
  global.addEventListener("masterflow:scheduled-orders-cleared", () => {
    latestCandidates = null;
    renderCandidateStatus();
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
