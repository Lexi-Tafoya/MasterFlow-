(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const Templates = window.MasterFlowTemplates;
  const UI = window.MasterFlowUI;
  const Troubleshooting = window.MasterFlowTroubleshooting;
  if (!Store || !Templates || !UI || !UI.layoutReady) return;

  const DRAFT_KEY = "masterflowSmartDraft";
  const LAST_TICKET_KEY = "masterflowSmartLastTicketId";
  let draft;
  try { draft = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) || "null"); }
  catch (error) { draft = null; }
  if (!draft || !draft.text) {
    window.sessionStorage.setItem("masterflowFlash", "Describe a request before opening the Smart Request Builder.");
    window.location.replace("index.html");
    return;
  }

  let activeTemplate = Templates.get(draft.templateId);
  let confidence = Number(draft.confidence || 42);
  let reason = draft.reason || "Request type selected.";
  const state = Store.getState();
  const form = document.getElementById("requestForm");
  const dynamicFields = document.getElementById("dynamicFields");
  const pickerDialog = document.getElementById("requestPickerDialog");
  const picker = document.getElementById("requestPicker");
  const pickerSearch = document.getElementById("requestPickerSearch");
  const troubleshootingPanel = document.getElementById("troubleshootingPanel");
  const troubleshootingDialog = document.getElementById("requestTroubleshootingDialog");

  let activeGuide = null;
  let activeSession = null;
  let troubleshootingCompletedSession = null;

  function escape(value) { return UI.escapeHtml(value); }

  function modeLabel(mode) {
    if (mode === "preparation") return "Checklist";
    if (mode === "safety") return "Safety";
    return "Guide";
  }

  function renderTroubleshootingPanel() {
    if (!Troubleshooting || !troubleshootingPanel) return;

    const guide = Troubleshooting.guideForTemplate(activeTemplate);
    activeGuide = guide;

    if (!guide) {
      troubleshootingPanel.hidden = true;
      return;
    }

    troubleshootingPanel.hidden = false;
    document.getElementById("troubleshootingTitle").textContent = guide.title;
    document.getElementById("troubleshootingSummary").textContent = guide.summary;
    document.getElementById("troubleshootingModeBadge").textContent = modeLabel(guide.mode);
    document.getElementById("troubleshootingTime").textContent = `About ${guide.estimatedMinutes} min`;
    document.getElementById("troubleshootingReason").textContent = guide.mode === "preparation"
      ? "Recommended so support has everything needed to start immediately."
      : "Recommended before this is routed to a person.";

    const resultBanner = document.getElementById("troubleshootingResult");
    const startButton = document.getElementById("troubleshootingStart");
    const skipButton = document.getElementById("troubleshootingSkip");

    if (troubleshootingCompletedSession) {
      resultBanner.hidden = false;
      resultBanner.textContent = `Troubleshooting recorded: ${troubleshootingCompletedSession.result || "steps completed"}. These notes will be included with this request.`;
      startButton.hidden = true;
      skipButton.hidden = true;
    } else {
      resultBanner.hidden = true;
      startButton.hidden = false;
      skipButton.hidden = false;
    }
  }

  function updateTroubleshootingProgress() {
    const checkboxes = Array.from(
      document.getElementById("requestTroubleshootingSteps").querySelectorAll('input[type="checkbox"]')
    );
    const completed = checkboxes.filter((checkbox) => checkbox.checked).length;
    document.getElementById("requestTroubleshootingProgress").textContent = `${completed} of ${checkboxes.length} complete`;
  }

  function troubleshootingSessionPatch(defaultResult) {
    const checkboxes = Array.from(
      document.getElementById("requestTroubleshootingSteps").querySelectorAll('input[type="checkbox"]:checked')
    );
    return {
      completedSteps: checkboxes.map((checkbox) => checkbox.dataset.stepText),
      affectedScope: document.getElementById("requestTroubleshootingScope").value,
      identifiers: document.getElementById("requestTroubleshootingIdentifiers").value.trim(),
      result: document.getElementById("requestTroubleshootingOutcome").value || defaultResult || "",
      notes: document.getElementById("requestTroubleshootingNotes").value.trim()
    };
  }

  function openTroubleshootingDialog() {
    if (!activeGuide || !troubleshootingDialog) return;

    activeSession = Troubleshooting.startSession({
      guide: activeGuide,
      source: "smart-request",
      templateId: activeTemplate.id,
      issueText: draft.text
    });

    document.getElementById("requestTroubleshootingTitle").textContent = activeGuide.title;
    document.getElementById("requestTroubleshootingSummary").textContent = activeGuide.summary;
    document.getElementById("requestTroubleshootingMeaning").textContent = activeGuide.meaning;
    document.getElementById("requestTroubleshootingEscalation").textContent = activeGuide.escalation;
    document.getElementById("requestTroubleshootingRecord").textContent = activeGuide.record;

    document.getElementById("requestTroubleshootingBadges").innerHTML = `
      <span class="badge badge-blue">${escape(activeTemplate.catalog)}</span>
      <span class="badge badge-teal">${escape(modeLabel(activeGuide.mode))}</span>
      <span class="badge badge-gray">About ${escape(activeGuide.estimatedMinutes)} min</span>
    `;

    document.getElementById("requestTroubleshootingStepsTitle").textContent =
      activeGuide.mode === "preparation"
        ? "Review this checklist"
        : activeGuide.mode === "safety"
          ? "Complete these safety and containment steps"
          : "Try these steps in order";

    document.getElementById("requestTroubleshootingSteps").innerHTML = activeGuide.steps.map((step, index) => `
      <label class="troubleshooting-step">
        <input type="checkbox" data-step-text="${escape(step)}">
        <span class="troubleshooting-step-number">${index + 1}</span>
        <span>${escape(step)}</span>
      </label>
    `).join("");

    document.getElementById("requestTroubleshootingOutcome").value = "";
    document.getElementById("requestTroubleshootingScope").value = "";
    document.getElementById("requestTroubleshootingIdentifiers").value = "";
    document.getElementById("requestTroubleshootingNotes").value = "";

    document.getElementById("requestTroubleshootingP1").hidden = !activeGuide.emergency;
    document.getElementById("requestTroubleshootingSolved").hidden = !activeGuide.allowSolved;

    updateTroubleshootingProgress();

    if (!troubleshootingDialog.open) troubleshootingDialog.showModal();
  }

  function fieldMarkup(field) {
    /*
     * Prefer values already prepared by the Request Engine.
     * Older drafts still fall back to templates.js extraction.
     */
    const engineDetail =
      draft.extractionDetails &&
      draft.extractionDetails[field.id] &&
      draft.extractionDetails[field.id].value
        ? draft.extractionDetails[field.id]
        : null;

    const extracted = engineDetail
      ? {
          value: engineDetail.value,
          source:
            engineDetail.source ||
            "description"
        }
      : Templates.extract(
          draft.text,
          field
        );

    const value =
      extracted.value || "";

    const required =
      field.required
        ? " required"
        : "";

    const requiredLabel =
      field.required
        ? '<span class="required-star">*</span>'
        : "";

    let prefilled = "";

    if (value) {
      let prefillSource =
        "Filled from your description";

      if (extracted.source === "profile") {
        prefillSource =
          "Filled from your employee profile";
      } else if (
        extracted.source ===
        "clarification"
      ) {
        prefillSource =
          "Filled from your answer";
      }

      prefilled =
        `<small class="prefill-note">` +
        `✓ ${prefillSource}` +
        `</small>`;
    } else if (field.recommended) {
      prefilled =
        `<small class="recommended-note">` +
        `Recommended — ${escape(
          field.recommendedHint ||
            "this may help support resolve your request faster"
        )}.` +
        `</small>`;
    }

    if (
      field.extractor ===
      "shortDescription"
    ) {
      return `
        <div
          class="field span-2 ai-summary-field"
          id="${escape(field.id)}-wrap"
        >
          <label for="${escape(field.id)}">
            ${requiredLabel}${escape(field.label)}
            <small class="ai-summary-tag">
              AI-created summary
            </small>
          </label>

          <div
            class="ai-summary-view"
            id="${escape(field.id)}-view"
          >
            ${
              value
                ? escape(value)
                : '<span class="muted">No summary yet.</span>'
            }
          </div>

          <input
            class="input ai-summary-input"
            type="text"
            id="${escape(field.id)}"
            name="${escape(field.id)}"
            value="${escape(value)}"
            ${required}
          >

          <button
            class="link-button ai-summary-edit"
            type="button"
            data-edit-field="${escape(field.id)}"
          >
            Edit
          </button>
        </div>
      `;
    }

    if (field.type === "attachment") {
      return `
        <div class="field span-2">
          <label>
            ${escape(field.label)}
          </label>

          <label class="attachment-drop">
            <input
              type="file"
              id="${escape(field.id)}"
              multiple
            >

            <strong>
              Choose files or drag them here
            </strong>

            <small>
              Prototype only: file names are recorded locally; no upload occurs.
            </small>
          </label>
        </div>
      `;
    }

    if (field.type === "textarea") {
      return `
        <div class="field span-2">
          <label for="${escape(field.id)}">
            ${requiredLabel}${escape(field.label)}
          </label>

          <textarea
            class="textarea"
            id="${escape(field.id)}"
            name="${escape(field.id)}"
            ${required}
          >${escape(value)}</textarea>

          ${prefilled}
        </div>
      `;
    }

    if (field.type === "select") {
      const options =
        (field.options || [])
          .map(
            (option) => `
              <option
                value="${escape(option)}"
                ${
                  option === value
                    ? "selected"
                    : ""
                }
              >
                ${escape(
                  option || "Choose one"
                )}
              </option>
            `
          )
          .join("");

      return `
        <div class="field">
          <label for="${escape(field.id)}">
            ${requiredLabel}${escape(field.label)}
          </label>

          <select
            class="select"
            id="${escape(field.id)}"
            name="${escape(field.id)}"
            ${required}
          >
            ${options}
          </select>

          ${prefilled}
        </div>
      `;
    }

    const type =
      field.type === "date"
        ? "date"
        : field.type === "number"
          ? "number"
          : "text";

    return `
      <div class="field">
        <label for="${escape(field.id)}">
          ${requiredLabel}${escape(field.label)}
        </label>

        <input
          class="input"
          type="${type}"
          id="${escape(field.id)}"
          name="${escape(field.id)}"
          value="${escape(value)}"
          placeholder="${escape(
            field.placeholder || ""
          )}"
          ${required}
          ${field.locked ? "readonly" : ""}
        >

        ${prefilled}
      </div>
    `;
  }

  function render() {
    const threshold = Number(Store.getState().settings.ticketClassificationThreshold || 70);
    document.getElementById("requestTitle").textContent = activeTemplate.name;
    document.getElementById("sourceText").textContent = draft.text;
    document.getElementById("interpretationTitle").textContent = activeTemplate.name;
    document.getElementById("interpretationReason").textContent = reason;
    document.getElementById("catalogValue").textContent = activeTemplate.catalog;
    document.getElementById("queueValue").textContent = activeTemplate.queue;
    document.getElementById("priorityValue").textContent = activeTemplate.priority;
    document.getElementById("responseSlaValue").textContent = `${activeTemplate.responseSlaHours} business hour${activeTemplate.responseSlaHours === 1 ? "" : "s"}`;
    document.getElementById("resolutionSlaValue").textContent = `${activeTemplate.resolutionSlaHours} business hour${activeTemplate.resolutionSlaHours === 1 ? "" : "s"}`;
    const isConfident = confidence >= threshold;
    document.getElementById("routingSummary").textContent = isConfident
      ? `Goes to ${activeTemplate.queue} · typically answered within ${activeTemplate.responseSlaHours} business hour${activeTemplate.responseSlaHours === 1 ? "" : "s"}.`
      : `Going to Megan Delia - Triage so a person can confirm where this belongs.`;
    const ring = document.getElementById("confidenceRing");
    ring.style.setProperty("--confidence", `${confidence}%`);
    ring.dataset.value = isConfident ? "✓" : `${confidence}%`;
    ring.classList.toggle("low", !isConfident);
    ring.classList.toggle("matched", isConfident);

    const alert = document.getElementById("confidenceAlert");
    if (activeTemplate.id === "general-triage" || confidence < threshold) {
      alert.hidden = false;
      alert.innerHTML = `<span>!</span><div><strong>Human triage required</strong><p>The match is below the ${threshold}% safe-routing threshold. This request will go to Megan Delia - Triage without asking you to start over.</p></div>`;
    } else {
      alert.hidden = true;
    }

    dynamicFields.innerHTML = activeTemplate.fields.map(fieldMarkup).join("");
    dynamicFields.querySelectorAll("[data-edit-field]").forEach((button) => {
      button.addEventListener("click", () => {
        const wrap = document.getElementById(`${button.dataset.editField}-wrap`);
        const input = document.getElementById(button.dataset.editField);
        if (wrap) wrap.classList.add("editing");
        if (input) input.focus();
      });
    });
    renderTroubleshootingPanel();
  }

  function renderPicker(query) {
    const search = String(query || "").toLowerCase().trim();
    const templates = Templates.getAll().filter((template) => template.id !== "general-triage").filter((template) => {
      const haystack = `${template.name} ${template.catalog} ${template.queue} ${template.description}`.toLowerCase();
      return !search || haystack.includes(search);
    });
    picker.innerHTML = templates.map((template) => `<button class="request-choice" type="button" data-template-id="${escape(template.id)}"><strong>${escape(template.name)}</strong><small>${escape(template.catalog)} · ${escape(template.queue)}</small><span>${escape(template.description)}</span></button>`).join("") || '<div class="empty-state">No request types match that search.</div>';
  }

  function fieldValues() {
    const values = {};
    activeTemplate.fields.forEach((field) => {
      const element = document.getElementById(field.id);
      if (!element) return;
      if (field.type === "attachment") {
        values[field.id] = Array.from(element.files || []).map((file) => file.name);
      } else {
        values[field.id] = element.value.trim();
      }
    });
    return values;
  }

  function titleFor(values) {
    if (activeTemplate.id === "new-it-hardware") {
      const hardware = values.hardwareType || "IT hardware";
      const purpose = values.requestPurpose || "New / additional device";
      const prefix = purpose === "Replacement device"
        ? "Replacement"
        : purpose === "Shared team device"
          ? "Shared"
          : "New";
      return `${prefix} ${hardware.toLowerCase()} request`;
    }
    if (values.shortDescription) return values.shortDescription;
    if (activeTemplate.id === "printer-ink" && values.printerName) return `Ink request for ${values.printerName}`;
    if (activeTemplate.id === "stock-check-phoenix" && values.partNumber) return `Stock check for ${values.partNumber}`;
    return activeTemplate.name;
  }

  function locationFor(values) {
    return values.printerLocation || values.workstation || values.location || values.mheLocation || Store.CURRENT_USER.site || "Not provided";
  }

  document.getElementById("startOver").addEventListener("click", () => {
    window.sessionStorage.removeItem(DRAFT_KEY);
    window.location.href = "index.html";
  });
  document.getElementById("chooseDifferent").addEventListener("click", () => {
    renderPicker("");
    pickerDialog.showModal();
  });
  document.querySelectorAll("[data-close-picker]").forEach((button) => button.addEventListener("click", () => pickerDialog.close()));
  pickerSearch.addEventListener("input", () => renderPicker(pickerSearch.value));
  picker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-template-id]");
    if (!button) return;
    activeTemplate = Templates.get(button.dataset.templateId);
    confidence = 100;
    reason = "You manually selected this existing request type.";
    draft.templateId = activeTemplate.id;
    draft.confidence = confidence;
    draft.reason = reason;
    draft.manual = true;
    troubleshootingCompletedSession = null;
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    pickerDialog.close();
    render();
    UI.showToast(`Changed to ${activeTemplate.name}.`);
  });

  if (troubleshootingPanel) {
    document.getElementById("troubleshootingStart").addEventListener("click", openTroubleshootingDialog);

    document.getElementById("troubleshootingSkip").addEventListener("click", () => {
      troubleshootingPanel.hidden = true;
    });
  }

  if (troubleshootingDialog) {
    document.querySelectorAll("[data-close-request-troubleshooting]").forEach((button) => {
      button.addEventListener("click", () => troubleshootingDialog.close());
    });

    document.getElementById("requestTroubleshootingSteps").addEventListener("change", updateTroubleshootingProgress);

    document.getElementById("requestTroubleshootingP1").addEventListener("click", () => {
      troubleshootingDialog.close();
      UI.openCriticalDialog();
    });

    document.getElementById("requestTroubleshootingSolved").addEventListener("click", () => {
      if (!activeSession || !activeGuide || !activeGuide.allowSolved) return;
      Troubleshooting.finishSession(activeSession, troubleshootingSessionPatch("Solved"), "solved");
      troubleshootingDialog.close();
      window.sessionStorage.removeItem(DRAFT_KEY);
      window.sessionStorage.setItem("masterflowFlash", "Marked as solved without creating a ticket.");
      window.location.href = "index.html";
    });

    document.getElementById("requestTroubleshootingContinue").addEventListener("click", () => {
      if (!activeSession || !activeGuide) return;
      const defaultResult = activeGuide.mode === "preparation" || activeGuide.mode === "safety"
        ? "Information collected"
        : "No change";
      troubleshootingCompletedSession = Troubleshooting.finishSession(
        activeSession,
        troubleshootingSessionPatch(defaultResult),
        "escalated"
      );
      troubleshootingDialog.close();
      renderTroubleshootingPanel();
      UI.showToast("Troubleshooting notes will be included with this request.");
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      UI.showToast("Complete the required fields before submitting.");
      return;
    }
    const values = fieldValues();
    const exactCritical = Object.values(values).some((value) => String(value).toLowerCase().includes("shipping is stopped") || String(value).toLowerCase().includes("shipping or order processing stopped"));
    if (exactCritical) {
      UI.showToast("Use the P1 fast lane for a shipping-stopped incident.");
      UI.openCriticalDialog();
      return;
    }


    const isHardwarePurchase =
      activeTemplate.id === "new-it-hardware";

    const rawEstimatedCost = String(
      values.estimatedCost || ""
    )
      .replace(/[$,]/g, "")
      .trim();

    const numericEstimatedCost =
      rawEstimatedCost &&
      Number.isFinite(Number(rawEstimatedCost))
        ? Number(rawEstimatedCost)
        : 0;

    const directorThreshold = Number(
      Store.getState().settings.directorApprovalThreshold || 1000
    );

    const costEstimateStatus =
      numericEstimatedCost > 0
        ? "Estimated cost provided"
        : values.costEstimateStatus || "Quote required";

    const approverRole =
      numericEstimatedCost >= directorThreshold
        ? "Area Director"
        : "Department Manager";

    const approvalLabel =
      numericEstimatedCost >= directorThreshold
        ? "Director approval"
        : "Manager approval";

    const ticketStatus =
      isHardwarePurchase
        ? "Approval required"
        : activeTemplate.id === "general-triage"
          ? "Triage"
          : "New";

    if (
      isHardwarePurchase &&
      values.costEstimateStatus === "Estimated cost provided" &&
      numericEstimatedCost <= 0
    ) {
      UI.showToast("Enter the estimated cost or choose Quote required.");
      const estimatedCostInput = document.getElementById("estimatedCost");
      if (estimatedCostInput) estimatedCostInput.focus();
      return;
    }

    const fieldLabels = Object.fromEntries(
      activeTemplate.fields.map((field) => [
        field.id,
        field.label
      ])
    );

    const now = new Date();
    const ticket = Store.addTicket({
      title:
        draft.receiverBrief?.title ||
        titleFor(values),

      description:
        draft.receiverBrief
          ?.observedSituation ||
        values.description ||
        draft.text,
      category: `${activeTemplate.catalog} / ${activeTemplate.name}`,
      priority:
        draft.requestPlan?.priority ||
        activeTemplate.priority,
      queue: activeTemplate.queue,
      requester: Store.CURRENT_USER.name,
      status: ticketStatus,
      location: locationFor(values),
      source: "MasterFlow Smart Request",
      classificationConfidence: confidence,
      routingReason: reason,
      slaDueAt: new Date(now.getTime() + Number(activeTemplate.responseSlaHours) * 60 * 60 * 1000).toISOString(),
      details: {
        requestTemplateId: activeTemplate.id,
        requestTemplateName: activeTemplate.name,
        resolutionTargetHours: activeTemplate.resolutionSlaHours,
        fieldLabels,
        ...values,

        ...(isHardwarePurchase
          ? {
              costEstimateStatus,
              estimatedCost:
                numericEstimatedCost > 0
                  ? `$${numericEstimatedCost.toFixed(2)}`
                  : "",
              approvalRequired: true,
              approval: {
                status: "not-sent",
                approverRole,
                approvalLabel,
                threshold: directorThreshold,
                amount: numericEstimatedCost,
                requestedAt: "",
                requestedBy: "",
                decisionAt: "",
                decisionBy: "",
                decisionNote: ""
              }
            }
          : {}),
        receiverBrief:
          draft.receiverBrief || null,

        diagnosticAnswers:
          draft.diagnosticAnswers || {},

        diagnosticDetails:
          draft.diagnosticDetails || {},

        routingReadiness:
          draft.routingReadiness || null,

        workReadiness:
          draft.workReadiness || null,

        reportingData:
          draft.reportingData || null,

        clarificationCount:
          draft.clarificationCount || 0,

        troubleshootingSummary:
          troubleshootingCompletedSession
            ? Troubleshooting.formatForRequest(troubleshootingCompletedSession)
            : "",
      },
      historyText: isHardwarePurchase
        ? numericEstimatedCost > 0
          ? `Hardware request created and routed to ${activeTemplate.queue}. Receiver validation is required before sending the ${UI.formatMoney(numericEstimatedCost)} request to the ${approverRole}.`
          : `Hardware request created and routed to ${activeTemplate.queue}. A quote is required before the receiver sends it to the ${approverRole}.`
        : `Ticket created through Smart Request and routed to ${activeTemplate.queue}.`
    });
    window.sessionStorage.setItem(LAST_TICKET_KEY, ticket.id);
    window.sessionStorage.removeItem(DRAFT_KEY);
    window.location.href = "request-submitted.html";
  });

  render();
})();
