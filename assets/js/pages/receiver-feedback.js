(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;

  if (!Store || !UI || !UI.layoutReady) return;

  const FEEDBACK_KEY = "masterflowFlowFeedbackV1";
  const CLOSED_STATUSES = new Set(["Resolved", "Closed", "Closed — No Action", "Cancelled", "Rejected"]);
  const FLOW_GAP_EXCLUSIONS = new Set(["Assigned owner", "Confirmed routing", "Requester response"]);
  const ISSUE_TYPES = new Set([
    "missing-information",
    "routing",
    "recognition",
    "question-wording",
    "receiver-brief",
    "other"
  ]);

  let feedbackContext = null;

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function readFeedback() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(FEEDBACK_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Receiver feedback was reset because it could not be read.", error);
      window.localStorage.removeItem(FEEDBACK_KEY);
      return [];
    }
  }

  function writeFeedback(items) {
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("masterflow:flow-feedback", { detail: items.slice() }));
    return items;
  }

  function feedbackId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `feedback-${window.crypto.randomUUID()}`;
    }
    return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function addFeedback(input) {
    const sourceRole = input && input.sourceRole === "queue-manager" ? "queue-manager" : "resolver";
    const issueType = ISSUE_TYPES.has(input && input.issueType) ? input.issueType : "other";
    const evidence = input && input.evidence ? input.evidence : {};

    const item = {
      id: feedbackId(),
      createdAt: new Date().toISOString(),
      ticketId: cleanText(input && input.ticketId),
      templateId: cleanText(input && input.templateId),
      queue: cleanText(input && input.queue),
      submittedBy: cleanText(input && input.submittedBy) || Store.CURRENT_USER.name,
      sourceRole,
      issueType,
      title: cleanText(input && input.title),
      description: cleanText(input && input.description),
      suggestedChange: cleanText(input && input.suggestedChange),
      expectedBenefit: cleanText(input && input.expectedBenefit),
      internalNote: cleanText(input && input.internalNote),
      evidence: {
        missingFields: Array.isArray(evidence.missingFields)
          ? evidence.missingFields.map(cleanText).filter(Boolean)
          : [],
        phrase: cleanText(evidence.phrase),
        diagnosticId: cleanText(evidence.diagnosticId)
      },
      status: "new"
    };

    const items = readFeedback();
    items.unshift(item);
    writeFeedback(items);
    return item;
  }

  const FEEDBACK_STATUS_LABELS = {
    new: "Pending Queue Manager Review",
    published: "Approved & published",
    rejected: "Rejected",
    "needs-info": "More information requested",
    escalated: "Escalated to Enterprise Governance"
  };

  function feedbackStatusLabel(status) {
    return FEEDBACK_STATUS_LABELS[status] || FEEDBACK_STATUS_LABELS.new;
  }

  function feedbackStatusClass(status) {
    if (status === "published") return "badge-green";
    if (status === "rejected") return "badge-red";
    if (status === "needs-info") return "badge-amber";
    if (status === "escalated") return "badge-blue";
    return "badge-gray";
  }

  // Routine queue-owned decisions on a Service Team Member's ticket-linked
  // suggestion. This never edits template JSON directly (that remains Flow
  // Studio's job) — it records a governance decision the submitter can see,
  // and (when linked to a ticket) posts a note to that ticket's timeline.
  function decideFeedback(id, action, note) {
    const items = readFeedback();
    const item = items.find((entry) => entry.id === id);
    if (!item) return null;

    const nextStatus = { publish: "published", reject: "rejected", "needs-info": "needs-info", escalate: "escalated" }[action];
    if (!nextStatus) return null;

    const cleanNote = cleanText(note);
    const decisionText = {
      published: `approved and published by ${Store.CURRENT_USER.name}`,
      rejected: `rejected by ${Store.CURRENT_USER.name}${cleanNote ? `: ${cleanNote}` : "."}`,
      "needs-info": `sent back for more information by ${Store.CURRENT_USER.name}${cleanNote ? `: ${cleanNote}` : "."}`,
      escalated: `escalated to Enterprise Governance by ${Store.CURRENT_USER.name}${cleanNote ? `: ${cleanNote}` : "."}`
    }[nextStatus];

    item.status = nextStatus;
    item.decision = { action: nextStatus, by: Store.CURRENT_USER.name, at: new Date().toISOString(), note: cleanNote };
    writeFeedback(items);

    if (item.ticketId && Store.getTicket(item.ticketId)) {
      Store.updateTicket(item.ticketId, {}, `Flow suggestion "${item.title}" was ${decisionText}.`);
    }
    return item;
  }

  function isClosed(ticket) {
    return CLOSED_STATUSES.has(cleanText(ticket && ticket.status));
  }

  function isWaiting(ticket) {
    return /waiting on requester|waiting on employee/i.test(cleanText(ticket && ticket.status));
  }

  function minutesUntilDue(ticket) {
    const due = new Date(ticket && ticket.slaDueAt).getTime();
    if (!Number.isFinite(due)) return Number.POSITIVE_INFINITY;
    return Math.round((due - Date.now()) / 60000);
  }

  function isSlaRisk(ticket) {
    return !isClosed(ticket) && minutesUntilDue(ticket) <= 60;
  }

  function formatExactDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function dueLabel(ticket) {
    if (isClosed(ticket)) return `Completed ${formatExactDate(ticket.updatedAt)}`;
    const minutes = minutesUntilDue(ticket);
    if (!Number.isFinite(minutes)) return "No SLA set";
    if (minutes < -60) return `Overdue by ${Math.ceil(Math.abs(minutes) / 60)}h`;
    if (minutes < 0) return `Overdue by ${Math.abs(minutes)}m`;
    if (minutes <= 60) return `Due in ${Math.max(1, minutes)}m`;
    if (minutes < 1440) return `Due in ${Math.ceil(minutes / 60)}h`;
    return `Due ${formatExactDate(ticket.slaDueAt)}`;
  }

  function priorityLabel(priority) {
    const code = cleanText(priority).split(" - ")[0];
    const labels = { P1: "Critical", P2: "High", P3: "Normal", P4: "Low" };
    return labels[code] ? `${labels[code]} (${code})` : cleanText(priority) || "Normal";
  }

  function isApprovalRequired(ticket) {
    return cleanText(ticket && ticket.status) === "Approval required";
  }

  function isAwaitingApproval(ticket) {
    return cleanText(ticket && ticket.status) === "Awaiting approval";
  }

  function isApprovedForFulfillment(ticket) {
    return cleanText(ticket && ticket.status) === "Approved - Ready to fulfill";
  }

  function requestedCost(ticket) {
    const details = ticket && ticket.details || {};
    return cleanText(details.estimatedCost || details.cost || details.amount);
  }

  function numericRequestedCost(ticket) {
    const amount = Number(requestedCost(ticket).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(amount) ? amount : 0;
  }

  function approvalRoute(ticket) {
    const details = ticket && ticket.details || {};
    const approval = details.approval && typeof details.approval === "object"
      ? details.approval
      : {};
    const threshold = Number(Store.getState().settings.directorApprovalThreshold || 1000);
    const amount = numericRequestedCost(ticket);
    const director = amount >= threshold;

    return {
      approverRole: cleanText(approval.approverRole) || (director ? "Area Director" : "Department Manager"),
      approvalLabel: cleanText(approval.approvalLabel) || (director ? "Director approval" : "Manager approval"),
      threshold,
      amount,
      status: cleanText(approval.status) || "not-sent",
      requestedAt: cleanText(approval.requestedAt),
      requestedBy: cleanText(approval.requestedBy),
      decisionAt: cleanText(approval.decisionAt),
      decisionBy: cleanText(approval.decisionBy),
      decisionNote: cleanText(approval.decisionNote)
    };
  }

  function humanizeKey(key) {
    return cleanText(key)
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function valueText(value) {
    if (value == null) return "";

    if (Array.isArray(value)) {
      return value
        .filter((item) => ["string", "number", "boolean"].includes(typeof item))
        .map(cleanText)
        .filter(Boolean)
        .join(", ");
    }

    if (typeof value === "object") return "";
    return cleanText(value);
  }

  function keyIdentifiers(ticket) {
    const identifiers = [];
    const details = ticket.details || {};
    const excludedKeys = new Set([
      "requestTemplateId",
      "requestTemplateName",
      "resolutionTargetHours",
      "requestedOutcome",
      "businessImpact",
      "safetyContainment",
      "containment",
      "observedSituation",
      "receiverBrief",
      "diagnosticAnswers",
      "diagnostics",
      "classification",
      "analysis",
      "rawPayload",
      "requestPayload",
      "extractionResults",
      "approval"
    ]);
    const seen = new Set();

    function addIdentifier(label, value) {
      const cleanLabel = cleanText(label);
      const cleanValue = valueText(value);
      if (!cleanLabel || !cleanValue) return;

      const duplicateKey = `${cleanLabel.toLowerCase()}::${cleanValue.toLowerCase()}`;
      if (seen.has(duplicateKey)) return;
      seen.add(duplicateKey);
      identifiers.push({ label: cleanLabel, value: cleanValue });
    }

    function customFieldLabel(key) {
      if (details.fieldLabels && typeof details.fieldLabels === "object" && details.fieldLabels[key]) {
        return details.fieldLabels[key];
      }
      if (details.customFieldLabels && typeof details.customFieldLabels === "object" && details.customFieldLabels[key]) {
        return details.customFieldLabels[key];
      }

      const ticketText = [ticket.title, ticket.category, ticket.description].join(" ").toLowerCase();
      if (/^customField\d+$/i.test(key) && /printer|ink|toner|supply/.test(ticketText)) {
        return "Quantity needed";
      }
      return humanizeKey(key);
    }

    if (ticket.location && !/not provided|unknown/i.test(ticket.location)) {
      addIdentifier("Location", ticket.location);
    }

    const receiverBrief = details.receiverBrief;
    if (receiverBrief && typeof receiverBrief === "object" && Array.isArray(receiverBrief.identifiers)) {
      receiverBrief.identifiers.forEach((identifier) => {
        if (!identifier || typeof identifier !== "object") return;
        addIdentifier(identifier.label || identifier.name, identifier.value);
      });
    }

    if (Array.isArray(details.customFields)) {
      details.customFields.forEach((field) => {
        if (!field || typeof field !== "object") return;
        addIdentifier(field.label || field.name, field.value);
      });
    }

    Object.entries(details).forEach(([key, value]) => {
      if (excludedKeys.has(key)) return;
      if (["fieldLabels", "customFieldLabels", "customFields"].includes(key)) return;
      if (value && typeof value === "object") return;
      addIdentifier(customFieldLabel(key), value);
    });

    return identifiers.slice(0, 10);
  }

  function informationGaps(ticket) {
    const gaps = [];
    const details = ticket.details || {};
    const text = `${ticket.title || ""} ${ticket.description || ""} ${ticket.category || ""}`.toLowerCase();

    if (!ticket.assignee || ticket.assignee === "Unassigned") gaps.push("Assigned owner");
    if (!ticket.location || /not provided|unknown/i.test(ticket.location)) gaps.push("Exact location");
    if (!ticket.description || cleanText(ticket.description).length < 20) gaps.push("Clear issue description");
    if (Number(ticket.classificationConfidence || 0) < 70 || /triage/i.test(ticket.queue || "")) gaps.push("Confirmed routing");
    if (isWaiting(ticket)) gaps.push("Requester response");

    if (/printer/.test(text) && !details.printer && !details.printerName && !details.printerNameOrIp) {
      gaps.push("Printer name, asset number, or IP");
    }
    if (/forklift|mhe|pallet jack|equipment out of service/.test(text) && !details.mheNumber && !details.assetNumber) {
      gaps.push("Equipment or MHE number");
    }
    if (/stock check|inventory verification/.test(text) && !details.partNumber) gaps.push("Part number");
    if (/systems intake|merp|oms|syq|edi|api/.test(text) && !details.system) gaps.push("Affected system");
    if (/\b(?:order|control|ctrl)(?:\s+number|\s*#|\s*:)/.test(text) && !details.orderNumber && !details.controlNumber && !details.pendingOrder) {
      gaps.push("Order or control number");
    }

    return [...new Set(gaps)];
  }

  function requestedOutcome(ticket) {
    const details = ticket.details || {};
    if (details.requestedOutcome) return valueText(details.requestedOutcome);

    const text = `${ticket.title || ""} ${ticket.category || ""}`.toLowerCase();
    if (/connect to printer|printer connectivity|cannot print|printer/.test(text)) {
      return "Restore reliable printing so the requester can continue the affected work.";
    }
    if (/access/.test(text)) return "Provide the approved system or report access needed for the requester to work.";
    if (/laptop performance|computer slow/.test(text)) return "Restore acceptable device performance for normal business work.";
    if (/manifest|shipping|warehouse operations outage|stopped/.test(text)) {
      return "Restore the blocked warehouse or shipping process and confirm operations are stable.";
    }
    if (/replacement|purchase/.test(text)) return "Complete the requested approval and provide the required replacement equipment.";
    if (/stock check/.test(text)) return "Verify the requested inventory facts and return a clear result to the requester.";
    return `Complete the requested outcome for: ${ticket.title || "this request"}.`;
  }

  function observedSituation(ticket) {
    const details = ticket.details || {};
    return valueText(details.observedSituation) || cleanText(ticket.description) || "No observed situation was captured.";
  }

  function scopeImpact(ticket) {
    const details = ticket.details || {};
    if (details.businessImpact) return valueText(details.businessImpact);

    const parts = [];
    if (details.affectedUsers) parts.push(`${valueText(details.affectedUsers)} affected`);
    if (details.process) parts.push(`${valueText(details.process)} process`);
    if (ticket.location && !/not provided|unknown/i.test(ticket.location)) parts.push(ticket.location);

    if (String(ticket.priority || "").startsWith("P1")) {
      parts.unshift("Critical operations may be blocked");
    } else if (isWaiting(ticket)) {
      parts.unshift("Resolution is blocked until the requester responds");
    } else if (isApprovalRequired(ticket)) {
      parts.unshift("Work must be routed to an authorized approver");
    } else if (isAwaitingApproval(ticket)) {
      parts.unshift("Work is waiting on an authorized approval decision");
    } else if (isApprovedForFulfillment(ticket)) {
      parts.unshift("Approval is complete and fulfillment can begin");
    } else {
      parts.unshift("Active business work is affected");
    }

    return `${parts.join(". ")}.`;
  }

  function safetyContainment(ticket) {
    const details = ticket.details || {};
    if (details.safetyContainment) return valueText(details.safetyContainment);
    if (details.containment) return valueText(details.containment);

    const text = `${ticket.title || ""} ${ticket.description || ""} ${ticket.category || ""}`.toLowerCase();
    if (/forklift|mhe|pallet jack|equipment out of service/.test(text)) {
      return "Keep the equipment out of service and tagged until an authorized person clears it.";
    }
    if (String(ticket.priority || "").startsWith("P1") || /shipping is stopped|manifest/.test(text)) {
      return "Maintain the current operational containment and follow the P1 escalation path until service is restored.";
    }
    return "No special safety or containment requirement has been recorded.";
  }

  function suggestedFirstAction(ticket, gaps) {
    const text = `${ticket.title || ""} ${ticket.description || ""} ${ticket.category || ""}`.toLowerCase();
    const route = approvalRoute(ticket);

    if (ticket.status === "Rejected") {
      return "Review the authorized rejection reason with the requester and close any remaining follow-up.";
    }
    if (isApprovalRequired(ticket)) {
      return `Validate the request and send it to the ${route.approverRole} for approval.`;
    }
    if (isAwaitingApproval(ticket)) {
      return `Wait for the ${route.approverRole} decision or provide any additional information they request.`;
    }
    if (isApprovedForFulfillment(ticket)) {
      return "Begin fulfillment now that the authorized approval is complete.";
    }
    if (isClosed(ticket)) return "Review the recorded resolution and reopen only if the issue returns.";
    if (String(ticket.priority || "").startsWith("P1")) {
      return "Confirm the full operational scope, claim ownership, and begin the critical response immediately.";
    }
    if (!ticket.assignee || ticket.assignee === "Unassigned") return "Claim the ticket or assign the best available owner.";
    if (ticket.status === "Triage") return "Confirm the correct queue and owner before normal work begins.";
    if (isWaiting(ticket)) return "Review the latest request for information and send a reminder if the response is overdue.";
    if (gaps.length) return `Close the highest-impact information gap first: ${gaps[0]}.`;
    if (/printer/.test(text)) return "Verify printer power, network availability, and the stored printer name or IP.";
    if (/access/.test(text)) return "Validate the requested access, business reason, and approval path.";
    if (/laptop performance|computer slow/.test(text)) return "Confirm affected applications, recent restart status, and current CPU or memory pressure.";
    if (/stock check/.test(text)) return "Verify the exact part number and requested check type before dispatching the warehouse task.";
    return "Review the receiver brief, confirm ownership, and begin the next available work step.";
  }

  function analyzeTicket(ticket) {
    const gaps = informationGaps(ticket);
    const identifiers = keyIdentifiers(ticket);
    const routingReady = Number(ticket.classificationConfidence || 0) >= 70 && !/triage/i.test(ticket.queue || "");

    let workLabel = "Ready to work";
    let workClass = "badge-green";
    let workDetail = "The receiver can begin without waiting on another person.";

    if (ticket.status === "Rejected") {
      workLabel = "Rejected";
      workClass = "badge-red";
      workDetail = "An authorized approver rejected the request.";
    } else if (isApprovedForFulfillment(ticket)) {
      workLabel = "Ready to fulfill";
      workClass = "badge-green";
      workDetail = "Approval is complete and the fulfillment team can begin work.";
    } else if (isAwaitingApproval(ticket)) {
      workLabel = "Awaiting approver";
      workClass = "badge-amber";
      workDetail = `The request is pending with the ${approvalRoute(ticket).approverRole}.`;
    } else if (isApprovalRequired(ticket)) {
      workLabel = "Approval routing needed";
      workClass = "badge-amber";
      workDetail = "The receiver must validate and send the request to the authorized approver.";
    } else if (isClosed(ticket)) {
      workLabel = "Completed";
      workClass = "badge-green";
      workDetail = "The ticket has a recorded completion state.";
    } else if (isWaiting(ticket)) {
      workLabel = "Blocked on requester";
      workClass = "badge-amber";
      workDetail = "The receiver is waiting for employee information.";
    } else if (!ticket.assignee || ticket.assignee === "Unassigned") {
      workLabel = "Needs owner";
      workClass = "badge-amber";
      workDetail = "The ticket cannot progress consistently until ownership is assigned.";
    } else if (gaps.some((gap) => !["Assigned owner", "Confirmed routing"].includes(gap))) {
      workLabel = "Needs information";
      workClass = "badge-amber";
      workDetail = "One or more operational facts are still missing.";
    }

    return {
      requestedOutcome: requestedOutcome(ticket),
      observedSituation: observedSituation(ticket),
      scopeImpact: scopeImpact(ticket),
      identifiers,
      safetyContainment: safetyContainment(ticket),
      gaps,
      suggestedFirstAction: suggestedFirstAction(ticket, gaps),
      routingReadiness: {
        label: routingReady ? "Routing ready" : "Routing review needed",
        className: routingReady ? "badge-green" : "badge-amber",
        detail: routingReady
          ? "The current queue is supported by the recorded classification confidence."
          : "The route should be confirmed before relying on normal queue ownership."
      },
      workReadiness: {
        label: workLabel,
        className: workClass,
        detail: workDetail
      },
      dueLabel: dueLabel(ticket),
      priorityLabel: priorityLabel(ticket)
    };
  }

  function ensureFeedbackDialog() {
    let dialog = document.getElementById("receiverFeedbackDialog");
    if (dialog) return dialog;

    document.body.insertAdjacentHTML("beforeend", `
      <dialog id="receiverFeedbackDialog" class="receiver-feedback-dialog" aria-labelledby="receiverFeedbackTitle">
        <form id="receiverFeedbackForm">
          <div class="dialog-header">
            <div>
              <h2 id="receiverFeedbackTitle">Suggest a flow improvement</h2>
              <p>Capture receiver evidence without changing routing or template logic in this workstream.</p>
            </div>
            <button class="close-button" type="button" data-close-receiver-feedback aria-label="Close">x</button>
          </div>
          <div class="dialog-body">
            <div class="field-row">
              <div class="field">
                <label for="receiverFeedbackType">Issue type</label>
                <select class="select" id="receiverFeedbackType" required>
                  <option value="missing-information">Missing information</option>
                  <option value="routing">Routing</option>
                  <option value="recognition">Recognition</option>
                  <option value="question-wording">Question wording</option>
                  <option value="receiver-brief">Receiver brief</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="field">
                <label for="receiverFeedbackTitleInput">Title</label>
                <input class="input" id="receiverFeedbackTitleInput" required>
              </div>
            </div>
            <div class="field mt-12">
              <label for="receiverFeedbackDescription">What happened?</label>
              <textarea class="textarea" id="receiverFeedbackDescription" required></textarea>
            </div>
            <div class="field mt-12">
              <label for="receiverFeedbackSuggestedChange">Suggested change</label>
              <textarea class="textarea" id="receiverFeedbackSuggestedChange"></textarea>
            </div>
            <div class="field mt-12">
              <label for="receiverFeedbackExpectedBenefit">Expected benefit</label>
              <textarea class="textarea" id="receiverFeedbackExpectedBenefit" placeholder="What improves for requesters or the Service Team if this ships?"></textarea>
            </div>
            <div class="field-row mt-12">
              <div class="field">
                <label for="receiverFeedbackMissingFields">Missing fields</label>
                <input class="input" id="receiverFeedbackMissingFields" placeholder="Comma-separated">
              </div>
              <div class="field">
                <label for="receiverFeedbackDiagnosticId">Diagnostic ID</label>
                <input class="input" id="receiverFeedbackDiagnosticId" placeholder="Optional">
              </div>
            </div>
            <div class="field mt-12">
              <label for="receiverFeedbackPhrase">Evidence phrase</label>
              <input class="input" id="receiverFeedbackPhrase" placeholder="Original wording or recurring phrase">
            </div>
            <div class="field mt-12">
              <label for="receiverFeedbackInternalNote">Internal note (optional)</label>
              <textarea class="textarea" id="receiverFeedbackInternalNote" placeholder="Anything else the Queue Manager should know."></textarea>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="btn btn-secondary" type="button" data-close-receiver-feedback>Cancel</button>
            <button class="btn btn-primary" type="submit">Save feedback</button>
          </div>
        </form>
      </dialog>
    `);

    dialog = document.getElementById("receiverFeedbackDialog");
    const form = document.getElementById("receiverFeedbackForm");

    dialog.querySelectorAll("[data-close-receiver-feedback]").forEach((button) => {
      button.addEventListener("click", () => dialog.close());
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity() || !feedbackContext) return;

      const missingFields = document.getElementById("receiverFeedbackMissingFields").value
        .split(",")
        .map(cleanText)
        .filter(Boolean);

      const item = addFeedback({
        ticketId: feedbackContext.ticketId,
        templateId: feedbackContext.templateId,
        queue: feedbackContext.queue,
        submittedBy: Store.CURRENT_USER.name,
        sourceRole: feedbackContext.sourceRole,
        issueType: document.getElementById("receiverFeedbackType").value,
        title: document.getElementById("receiverFeedbackTitleInput").value,
        description: document.getElementById("receiverFeedbackDescription").value,
        suggestedChange: document.getElementById("receiverFeedbackSuggestedChange").value,
        expectedBenefit: document.getElementById("receiverFeedbackExpectedBenefit").value,
        internalNote: document.getElementById("receiverFeedbackInternalNote").value,
        evidence: {
          missingFields,
          phrase: document.getElementById("receiverFeedbackPhrase").value,
          diagnosticId: document.getElementById("receiverFeedbackDiagnosticId").value
        }
      });

      dialog.close();
      form.reset();
      feedbackContext = null;
      UI.showToast(`Feedback saved: ${item.title}`);
    });

    return dialog;
  }

  function openFeedback(context) {
    const dialog = ensureFeedbackDialog();
    feedbackContext = {
      ticketId: cleanText(context && context.ticketId),
      templateId: cleanText(context && context.templateId),
      queue: cleanText(context && context.queue),
      sourceRole: context && context.sourceRole === "queue-manager" ? "queue-manager" : "resolver"
    };

    document.getElementById("receiverFeedbackType").value = ISSUE_TYPES.has(context && context.issueType)
      ? context.issueType
      : "other";
    document.getElementById("receiverFeedbackTitleInput").value = cleanText(context && context.title);
    document.getElementById("receiverFeedbackDescription").value = cleanText(context && context.description);
    document.getElementById("receiverFeedbackSuggestedChange").value = cleanText(context && context.suggestedChange);
    document.getElementById("receiverFeedbackExpectedBenefit").value = cleanText(context && context.expectedBenefit);
    document.getElementById("receiverFeedbackInternalNote").value = cleanText(context && context.internalNote);
    document.getElementById("receiverFeedbackMissingFields").value = Array.isArray(context && context.missingFields)
      ? context.missingFields.join(", ")
      : "";
    document.getElementById("receiverFeedbackPhrase").value = cleanText(context && context.phrase);
    document.getElementById("receiverFeedbackDiagnosticId").value = cleanText(context && context.diagnosticId);

    if (!dialog.open) dialog.showModal();
  }

  function readinessForQueue(ticket) {
    const label = analyzeTicket(ticket).workReadiness.label;
    return label === "Ready to work" || label === "Ready to fulfill";
  }

  function queueRecommendation(activeTickets) {
    const gapCounts = new Map();
    const gapQueues = new Map();

    activeTickets.forEach((ticket) => {
      analyzeTicket(ticket).gaps.filter((gap) => !FLOW_GAP_EXCLUSIONS.has(gap)).forEach((gap) => {
        gapCounts.set(gap, (gapCounts.get(gap) || 0) + 1);
        if (!gapQueues.has(gap)) gapQueues.set(gap, new Map());
        const queueMap = gapQueues.get(gap);
        queueMap.set(ticket.queue, (queueMap.get(ticket.queue) || 0) + 1);
      });
    });

    const top = [...gapCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) {
      return {
        title: "Maintain the current request-flow design",
        description: "No repeated information gap is visible in the current prototype data.",
        suggestedChange: "Continue monitoring receiver feedback before changing a request flow.",
        gap: "",
        queue: "",
        count: 0
      };
    }

    const gap = top[0];
    const count = top[1];
    const queueEntries = [...gapQueues.get(gap).entries()].sort((a, b) => b[1] - a[1]);
    const queue = queueEntries.length ? queueEntries[0][0] : "the affected queue";

    return {
      title: `Collect ${gap.toLowerCase()} earlier`,
      description: `${count} active ticket${count === 1 ? "" : "s"} currently lack ${gap.toLowerCase()}, with the largest impact in ${queue}.`,
      suggestedChange: `Add or improve a plain-language intake question that captures ${gap.toLowerCase()} before submission, while keeping a safe fallback for genuinely unknown information.`,
      gap,
      queue,
      count
    };
  }

  /*
   * My Team's Requests: requester-team visibility for a Queue Manager or
   * people manager, separate from the Service Team roster used for queue
   * coverage/workload/assignment. Scope is direct reports (via the
   * requester's employeeProfile.manager, when captured) or the current
   * user's own department/team — never company-wide, never the Service
   * Team's own membership list.
   */
  function requesterProfile(ticket) {
    const details = (ticket && ticket.details) || {};
    const profile = (details.employeeProfile && typeof details.employeeProfile === "object") ? details.employeeProfile : {};
    return {
      department: cleanText(ticket && ticket.department) || cleanText(profile.department),
      team: cleanText(profile.team),
      manager: cleanText(profile.manager)
    };
  }

  function isMyTeamRequest(ticket) {
    if (!ticket || ticket.requester === Store.CURRENT_USER.name) return false;
    const profile = requesterProfile(ticket);
    const managerMatch = profile.manager && profile.manager === Store.CURRENT_USER.name;
    const deptMatch = profile.department && profile.department === Store.CURRENT_USER.department;
    return Boolean(managerMatch || deptMatch);
  }

  function teamRequestTickets() {
    return Store.getState().tickets.filter(isMyTeamRequest);
  }

  function hasUserContributed(ticket) {
    const me = Store.CURRENT_USER.name;
    return (ticket.history || []).some((item) => cleanText(item.text).includes(me) || item.author === me);
  }

  // Prototype duplicate heuristic: same category, and either the same
  // location or the same department, submitted within a 30-day window.
  // This surfaces candidates for a human to judge — it never blocks a
  // new request or merges tickets automatically.
  function possibleDuplicatesFor(ticket, pool) {
    const category = cleanText(ticket.category).toLowerCase();
    if (!category) return [];
    const created = new Date(ticket.createdAt).getTime();
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    const loc = cleanText(ticket.location).toLowerCase();
    const dept = cleanText(ticket.department).toLowerCase();
    return pool.filter((other) => {
      if (other.id === ticket.id) return false;
      if (cleanText(other.category).toLowerCase() !== category) return false;
      const otherCreated = new Date(other.createdAt).getTime();
      if (!Number.isFinite(otherCreated) || !Number.isFinite(created)) return false;
      if (Math.abs(otherCreated - created) > windowMs) return false;
      const otherLoc = cleanText(other.location).toLowerCase();
      const otherDept = cleanText(other.department).toLowerCase();
      return (loc && otherLoc === loc) || (dept && otherDept === dept);
    });
  }

  function initTeamRequests() {
    const section = document.getElementById("qmTeamRequestsSection");
    if (!section) return;

    const body = document.getElementById("teamRequestsBody");
    const empty = document.getElementById("teamRequestsEmpty");
    const countBadge = document.getElementById("teamRequestsCount");
    const search = document.getElementById("teamRequestsSearch");
    const statusFilter = document.getElementById("teamRequestsStatusFilter");
    const queueFilter = document.getElementById("teamRequestsQueueFilter");
    const flagFilter = document.getElementById("teamRequestsFlagFilter");
    const dialog = document.getElementById("teamRequestDialog");
    let currentTicketId = "";
    let lastDuplicateMatch = null;

    function statusBucket(ticket) {
      if (isClosed(ticket)) return "closed";
      if (isWaiting(ticket)) return "waiting";
      return "open";
    }

    function matchesFilters(ticket, allTeam) {
      const term = cleanText(search.value).toLowerCase();
      if (term) {
        const haystack = `${ticket.number} ${ticket.title} ${ticket.requester} ${ticket.description || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter.value !== "all" && statusBucket(ticket) !== statusFilter.value) return false;
      if (queueFilter.value !== "all" && ticket.queue !== queueFilter.value) return false;
      if (flagFilter.value === "duplicate" && !possibleDuplicatesFor(ticket, allTeam).length) return false;
      if (flagFilter.value === "escalated" && !ticket.escalation) return false;
      return true;
    }

    function renderQueueOptions(allTeam) {
      const current = queueFilter.value;
      const queues = [...new Set(allTeam.map((ticket) => ticket.queue).filter(Boolean))].sort();
      queueFilter.innerHTML = '<option value="all">All queues</option>' +
        queues.map((queue) => `<option value="${UI.escapeHtml(queue)}">${UI.escapeHtml(queue)}</option>`).join("");
      if (queues.includes(current)) queueFilter.value = current;
    }

    function flagsMarkup(ticket, allTeam) {
      const flags = [];
      if (possibleDuplicatesFor(ticket, allTeam).length) flags.push('<span class="badge badge-amber">Possible duplicate</span>');
      if (ticket.escalation) flags.push('<span class="badge badge-red">Escalated</span>');
      if (hasUserContributed(ticket)) flags.push('<span class="badge badge-gray">You contributed</span>');
      return flags.join(" ") || '<span class="muted small">—</span>';
    }

    function render() {
      const allTeam = teamRequestTickets();
      renderQueueOptions(allTeam);
      countBadge.textContent = `${allTeam.length} request${allTeam.length === 1 ? "" : "s"}`;

      const visible = allTeam
        .filter((ticket) => matchesFilters(ticket, allTeam))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      empty.hidden = allTeam.length !== 0;
      body.innerHTML = visible.map((ticket) => {
        const profile = requesterProfile(ticket);
        const deptTeam = [profile.department, profile.team].filter(Boolean).join(" / ") || "Not on file";
        return `
          <tr data-team-ticket="${UI.escapeHtml(ticket.id)}">
            <td><strong>${UI.escapeHtml(ticket.number)}</strong><br><span class="muted small">${UI.escapeHtml(ticket.title)}</span></td>
            <td>${UI.escapeHtml(ticket.requester)}</td>
            <td>${UI.escapeHtml(deptTeam)}</td>
            <td>${UI.escapeHtml(formatExactDate(ticket.createdAt))}</td>
            <td><span class="badge ${statusClassForTeam(ticket)}">${UI.escapeHtml(ticket.status)}</span></td>
            <td>${UI.escapeHtml(priorityLabel(ticket.priority))}</td>
            <td>${UI.escapeHtml(ticket.queue || "Unrouted")}</td>
            <td>${UI.escapeHtml(ticket.assignee || "Unassigned")}</td>
            <td>${UI.escapeHtml(dueLabel(ticket))}</td>
            <td>${flagsMarkup(ticket, allTeam)}</td>
            <td><button class="btn btn-secondary btn-sm" type="button" data-open-team-ticket="${UI.escapeHtml(ticket.id)}">Open</button></td>
          </tr>
        `;
      }).join("");

      if (!visible.length && allTeam.length) {
        body.innerHTML = `<tr><td colspan="11" class="muted">No requests match the current search or filters.</td></tr>`;
      }
    }

    function statusClassForTeam(ticket) {
      if (isClosed(ticket)) return "badge-green";
      if (isWaiting(ticket)) return "badge-amber";
      if (String(ticket.priority).startsWith("P1")) return "badge-red";
      return "badge-blue";
    }

    function openTeamRequest(ticketId) {
      const ticket = Store.getTicket(ticketId);
      if (!ticket) return;
      currentTicketId = ticketId;
      const allTeam = teamRequestTickets();
      const duplicates = possibleDuplicatesFor(ticket, Store.getState().tickets);
      lastDuplicateMatch = duplicates[0] || null;

      document.getElementById("teamRequestTitle").textContent = `${ticket.number} - ${ticket.title}`;
      document.getElementById("teamRequestSubtitle").textContent = `${ticket.requester} · ${ticket.queue || "Unrouted"}`;
      const statusBadge = document.getElementById("teamRequestStatusBadge");
      statusBadge.textContent = ticket.status;
      statusBadge.className = `badge ${statusClassForTeam(ticket)}`;
      document.getElementById("teamRequestDuplicateBadge").hidden = !duplicates.length;
      document.getElementById("teamRequestEscalatedBadge").hidden = !ticket.escalation;

      const profile = requesterProfile(ticket);
      document.getElementById("teamRequestMeta").innerHTML = `
        <div class="detail-cell"><small>Requester</small><strong>${UI.escapeHtml(ticket.requester)}</strong></div>
        <div class="detail-cell"><small>Department / team</small><strong>${UI.escapeHtml([profile.department, profile.team].filter(Boolean).join(" / ") || "Not on file")}</strong></div>
        <div class="detail-cell"><small>Owning queue</small><strong>${UI.escapeHtml(ticket.queue || "Unrouted")}</strong></div>
        <div class="detail-cell"><small>Assigned Service Team Member</small><strong>${UI.escapeHtml(ticket.assignee || "Unassigned")}</strong></div>
        <div class="detail-cell"><small>SLA condition</small><strong>${UI.escapeHtml(dueLabel(ticket))}</strong></div>
        <div class="detail-cell"><small>Last update</small><strong>${UI.escapeHtml(formatExactDate(ticket.updatedAt))}</strong></div>
      `;

      const dupNotice = document.getElementById("teamRequestDuplicateNotice");
      if (duplicates.length) {
        dupNotice.hidden = false;
        document.getElementById("teamRequestDuplicateText").textContent =
          `${duplicates[0].number} (${duplicates[0].requester}) looks similar — same category and location or department, submitted within 30 days.`;
      } else {
        dupNotice.hidden = true;
      }

      document.getElementById("teamRequestTimeline").innerHTML = (ticket.history || []).length
        ? (ticket.history || []).slice().reverse().map((item) => `
            <article class="receiver-timeline-item receiver-system-item">
              <div class="receiver-timeline-dot"></div>
              <div>
                <strong>${UI.escapeHtml(item.text)}</strong>
                <small>${UI.escapeHtml(formatExactDate(item.at))}</small>
              </div>
            </article>
          `).join("")
        : '<div class="empty-state">No timeline activity has been recorded.</div>';

      document.getElementById("teamRequestNote").value = "";
      document.getElementById("teamRequestEscalateField").hidden = true;
      document.getElementById("teamRequestEscalateReason").value = "";

      if (!dialog.open) dialog.showModal();
    }

    body.addEventListener("click", (event) => {
      const button = event.target.closest("[data-open-team-ticket]");
      if (!button) return;
      openTeamRequest(button.dataset.openTeamTicket);
    });

    document.querySelectorAll("[data-close-team-request]").forEach((button) => {
      button.addEventListener("click", () => dialog.close());
    });

    document.getElementById("teamRequestViewDuplicate").addEventListener("click", () => {
      if (lastDuplicateMatch) openTeamRequest(lastDuplicateMatch.id);
    });

    function noteValue() {
      return cleanText(document.getElementById("teamRequestNote").value);
    }

    document.getElementById("teamRequestAddContext").addEventListener("click", () => {
      const note = noteValue();
      if (!note) { UI.showToast("Add a note before sending it to the timeline."); return; }
      Store.updateTicket(currentTicketId, {}, `${Store.CURRENT_USER.name} (manager) added context: ${note}`);
      UI.showToast("Context added to the shared timeline.");
      openTeamRequest(currentTicketId);
    });

    document.getElementById("teamRequestManagerNote").addEventListener("click", () => {
      const note = noteValue();
      if (!note) { UI.showToast("Add a note before saving it."); return; }
      Store.updateTicket(currentTicketId, {}, `${Store.CURRENT_USER.name} (manager note): ${note}`);
      UI.showToast("Manager note saved to the shared timeline.");
      openTeamRequest(currentTicketId);
    });

    document.getElementById("teamRequestAskUpdate").addEventListener("click", () => {
      const ticket = Store.getTicket(currentTicketId);
      const note = noteValue();
      const owner = (ticket && ticket.assignee && ticket.assignee !== "Unassigned") ? ticket.assignee : (ticket && ticket.queue) || "the owning queue";
      Store.updateTicket(
        currentTicketId,
        {},
        `${Store.CURRENT_USER.name} (manager) asked ${owner} for an update.${note ? ` ${note}` : ""}`
      );
      UI.showToast(`Update requested from ${owner}.`);
      openTeamRequest(currentTicketId);
    });

    document.getElementById("teamRequestEscalate").addEventListener("click", () => {
      document.getElementById("teamRequestEscalateField").hidden = false;
    });
    document.getElementById("teamRequestEscalateCancel").addEventListener("click", () => {
      document.getElementById("teamRequestEscalateField").hidden = true;
    });
    document.getElementById("teamRequestEscalateConfirm").addEventListener("click", () => {
      const reason = document.getElementById("teamRequestEscalateReason").value;
      if (!reason) { UI.showToast("Choose an escalation reason."); return; }
      const note = noteValue();
      const now = new Date().toISOString();
      Store.updateTicket(
        currentTicketId,
        { escalation: { requestedBy: Store.CURRENT_USER.name, requestedAt: now, reason } },
        `${Store.CURRENT_USER.name} (manager) requested escalation — ${reason}.${note ? ` ${note}` : ""}`
      );
      UI.showToast("Escalation requested. This does not change priority or SLA automatically.");
      document.getElementById("teamRequestEscalateField").hidden = true;
      openTeamRequest(currentTicketId);
    });

    search.addEventListener("input", render);
    statusFilter.addEventListener("change", render);
    queueFilter.addEventListener("change", render);
    flagFilter.addEventListener("change", render);
    window.addEventListener("masterflow:state", render);
    render();
  }

  function initQueueManager() {
    if (document.body.dataset.page !== "ticket-queues") return;

    const activeVolume = document.getElementById("qmActiveVolume");
    const slaRisk = document.getElementById("qmSlaRisk");
    const unassigned = document.getElementById("qmUnassigned");
    const readinessRate = document.getElementById("qmReadinessRate");
    const queueBody = document.getElementById("qmQueueBody");
    const workloadBody = document.getElementById("qmWorkloadBody");
    const coverageList = document.getElementById("qmCoverageList");
    const gapList = document.getElementById("qmGapList");
    const waitingList = document.getElementById("qmWaitingList");
    const waitingCount = document.getElementById("qmWaitingCount");
    const recommendationPanel = document.getElementById("qmRecommendation");
    const feedbackList = document.getElementById("qmFeedbackList");
    const approvalList = document.getElementById("qmApprovalList");
    const approvalCount = document.getElementById("qmApprovalCount");
    let currentRecommendation = null;

    function approvalCardMarkup(ticket) {
      const route = approvalRoute(ticket);
      const amount = requestedCost(ticket) || "Amount not provided";
      const requestedBy = route.requestedBy || "Service Team Member";

      return `
        <article class="queue-approval-card" data-approval-ticket="${UI.escapeHtml(ticket.id)}">
          <div class="queue-approval-main">
            <div class="queue-approval-topline">
              <span class="badge badge-amber">Awaiting approval</span>
              <span>${UI.escapeHtml(route.approverRole)}</span>
            </div>
            <strong>${UI.escapeHtml(ticket.number)} - ${UI.escapeHtml(ticket.title)}</strong>
            <p>${UI.escapeHtml(ticket.requester)} · ${UI.escapeHtml(ticket.queue)} · ${UI.escapeHtml(amount)}</p>
            <p>${UI.escapeHtml(ticket.description || "No business justification was provided.")}</p>
            <small>Submitted for approval by ${UI.escapeHtml(requestedBy)}${route.requestedAt ? ` on ${UI.escapeHtml(formatExactDate(route.requestedAt))}` : ""}.</small>
          </div>
          <div class="queue-approval-decision">
            <label for="approval-note-${UI.escapeHtml(ticket.id)}">Decision note</label>
            <textarea
              class="textarea"
              id="approval-note-${UI.escapeHtml(ticket.id)}"
              data-approval-note="${UI.escapeHtml(ticket.id)}"
              rows="2"
              placeholder="Required for rejection or a request for more information."
            ></textarea>
            <div class="queue-approval-actions">
              <button class="btn btn-primary btn-sm" type="button" data-approval-action="approve" data-ticket-id="${UI.escapeHtml(ticket.id)}">Approve</button>
              <button class="btn btn-danger btn-sm" type="button" data-approval-action="reject" data-ticket-id="${UI.escapeHtml(ticket.id)}">Reject</button>
              <button class="btn btn-secondary btn-sm" type="button" data-approval-action="information" data-ticket-id="${UI.escapeHtml(ticket.id)}">Request information</button>
            </div>
          </div>
        </article>
      `;
    }

    function decideApproval(ticketId, action, note) {
      const ticket = Store.getTicket(ticketId);
      if (!ticket || !isAwaitingApproval(ticket)) {
        UI.showToast("This request is no longer awaiting approval.");
        return;
      }

      const route = approvalRoute(ticket);
      const cleanNoteValue = cleanText(note);
      if (["reject", "information"].includes(action) && !cleanNoteValue) {
        UI.showToast("Add a decision note before continuing.");
        const input = approvalList.querySelector(`[data-approval-note="${ticketId}"]`);
        if (input) input.focus();
        return;
      }

      const now = new Date().toISOString();
      const decisionBy = `${Store.CURRENT_USER.name} (${route.approverRole})`;
      let status = "Awaiting approval";
      let approvalStatus = "pending";
      let historyText = "";
      let toastText = "";

      if (action === "approve") {
        status = "Approved - Ready to fulfill";
        approvalStatus = "approved";
        historyText = `Approved by ${decisionBy}${cleanNoteValue ? `: ${cleanNoteValue}` : "."}`;
        toastText = `${ticket.number} approved and returned to the fulfillment team.`;
      } else if (action === "reject") {
        status = "Rejected";
        approvalStatus = "rejected";
        historyText = `Rejected by ${decisionBy}: ${cleanNoteValue}`;
        toastText = `${ticket.number} rejected.`;
      } else if (action === "information") {
        status = "Waiting on requester";
        approvalStatus = "information-requested";
        historyText = `Additional information requested by ${decisionBy}: ${cleanNoteValue}`;
        toastText = `Information requested for ${ticket.number}.`;
      } else {
        return;
      }

      const details = {
        ...(ticket.details || {}),
        approval: {
          ...((ticket.details && ticket.details.approval) || {}),
          status: approvalStatus,
          approverRole: route.approverRole,
          approvalLabel: route.approvalLabel,
          threshold: route.threshold,
          amount: route.amount,
          decisionAt: now,
          decisionBy,
          decisionNote: cleanNoteValue
        }
      };

      Store.updateTicket(ticket.id, { status, details }, historyText);
      UI.showToast(toastText);
    }

    function formatCloseDuration(ms) {
      const minutes = Math.round(ms / 60000);
      if (minutes < 60) return `${minutes} min`;
      const hours = ms / 3600000;
      if (hours < 48) return `${Math.round(hours * 10) / 10} hr`;
      return `${Math.round((ms / 86400000) * 10) / 10} days`;
    }

    /*
     * Average time from created to completed across resolved and
     * closed-without-action tickets. Open tickets are excluded, and
     * missing/invalid timestamps are skipped so no broken value shows.
     */
    function avgCloseTime(list) {
      const durations = (list || [])
        .filter((ticket) => isClosed(ticket))
        .map((ticket) => {
          const created = new Date(ticket.createdAt).getTime();
          const done = new Date(ticket.closedAt || ticket.updatedAt).getTime();
          return Number.isFinite(created) && Number.isFinite(done) && done >= created
            ? done - created
            : null;
        })
        .filter((value) => value != null);
      if (!durations.length) return "No closed tickets yet";
      return formatCloseDuration(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    function renderQueueManager() {
      const tickets = Store.getState().tickets.slice();
      const active = tickets.filter((ticket) => !isClosed(ticket));
      const ready = active.filter(readinessForQueue);
      const waiting = active.filter(isWaiting);
      const risk = active.filter(isSlaRisk);
      const noOwner = active.filter((ticket) => !ticket.assignee || ticket.assignee === "Unassigned");

      activeVolume.textContent = String(active.length);
      slaRisk.textContent = String(risk.length);
      unassigned.textContent = String(noOwner.length);
      readinessRate.textContent = `${active.length ? Math.round((ready.length / active.length) * 100) : 100}%`;
      waitingCount.textContent = `${waiting.length} waiting`;

      const pendingApprovals = tickets.filter(isAwaitingApproval);
      approvalCount.textContent = `${pendingApprovals.length} pending`;
      approvalList.innerHTML = pendingApprovals.length
        ? pendingApprovals.map(approvalCardMarkup).join("")
        : '<div class="notice notice-success"><div><strong>No pending approvals</strong><p>Requests appear here after a ticket receiver validates them and sends them to the authorized manager or director.</p></div></div>';

      const queueNames = [...new Set(active.map((ticket) => ticket.queue))].sort();
      queueBody.innerHTML = queueNames.length
        ? queueNames.map((queue) => {
            const items = active.filter((ticket) => ticket.queue === queue);
            return `
              <tr>
                <td><strong>${UI.escapeHtml(queue)}</strong></td>
                <td>${items.length}</td>
                <td>${items.filter(readinessForQueue).length}</td>
                <td>${items.filter(isWaiting).length}</td>
                <td>${items.filter((ticket) => !ticket.assignee || ticket.assignee === "Unassigned").length}</td>
                <td>${items.filter(isSlaRisk).length}</td>
              </tr>
            `;
          }).join("")
        : '<tr><td colspan="6"><div class="empty-state">No active queue work.</div></td></tr>';

      const ownerNames = [...new Set(active.map((ticket) => ticket.assignee || "Unassigned"))].sort();
      workloadBody.innerHTML = ownerNames.length
        ? ownerNames.map((owner) => {
            const items = active.filter((ticket) => (ticket.assignee || "Unassigned") === owner);
            const highImpact = items.filter((ticket) => /^P1|^P2/.test(ticket.priority || "")).length;
            const ownerAll = tickets.filter((ticket) => (ticket.assignee || "Unassigned") === owner);
            return `
              <tr>
                <td><strong>${UI.escapeHtml(owner)}</strong></td>
                <td>${items.length}</td>
                <td>${highImpact}</td>
                <td>${items.filter(isWaiting).length}</td>
                <td>${items.filter(isSlaRisk).length}</td>
                <td>${UI.escapeHtml(avgCloseTime(ownerAll))}</td>
              </tr>
            `;
          }).join("")
        : '<tr><td colspan="6"><div class="empty-state">No active owner workload.</div></td></tr>';

      const teamAvgEl = document.getElementById("qmTeamAvgClose");
      if (teamAvgEl) {
        const teamAvg = avgCloseTime(tickets);
        teamAvgEl.textContent = teamAvg === "No closed tickets yet"
          ? "No closed tickets yet"
          : `Team avg. close time: ${teamAvg}`;
      }

      const coverage = queueNames.map((queue) => {
        const items = active.filter((ticket) => ticket.queue === queue);
        const owners = [...new Set(items.map((ticket) => ticket.assignee).filter((owner) => owner && owner !== "Unassigned"))];
        const unassignedCount = items.filter((ticket) => !ticket.assignee || ticket.assignee === "Unassigned").length;
        let message = "Coverage appears balanced for current prototype volume.";
        let tone = "good";
        if (!owners.length) {
          message = "No active owner is recorded for this queue.";
          tone = "danger";
        } else if (unassignedCount) {
          message = `${unassignedCount} ticket${unassignedCount === 1 ? "" : "s"} need ownership.`;
          tone = "warn";
        } else if (items.length >= 3 && owners.length === 1) {
          message = "All active work depends on one owner.";
          tone = "warn";
        }
        return { queue, message, tone, owners: owners.length };
      }).filter((item) => item.tone !== "good");

      coverageList.innerHTML = coverage.length
        ? coverage.map((item) => `
            <div class="manager-insight manager-insight-${item.tone}">
              <strong>${UI.escapeHtml(item.queue)}</strong>
              <p>${UI.escapeHtml(item.message)}</p>
            </div>
          `).join("")
        : '<div class="notice notice-success"><div><strong>No immediate coverage gap</strong><p>Every visible queue has an active owner and no unassigned work.</p></div></div>';

      const gapCounts = new Map();
      active.forEach((ticket) => {
        analyzeTicket(ticket).gaps.filter((gap) => !FLOW_GAP_EXCLUSIONS.has(gap)).forEach((gap) => gapCounts.set(gap, (gapCounts.get(gap) || 0) + 1));
      });
      const gaps = [...gapCounts.entries()].sort((a, b) => b[1] - a[1]);
      gapList.innerHTML = gaps.length
        ? gaps.slice(0, 6).map(([gap, count]) => `
            <div class="manager-insight">
              <strong>${UI.escapeHtml(gap)}</strong>
              <p>${count} active ticket${count === 1 ? "" : "s"} require follow-up or confirmation.</p>
            </div>
          `).join("")
        : '<div class="notice notice-success"><div><strong>No repeated information gap</strong><p>Current active tickets contain the core information receivers need.</p></div></div>';

      waitingList.innerHTML = waiting.length
        ? waiting.slice(0, 8).map((ticket) => `
            <article class="manager-ticket-item">
              <div>
                <strong>${UI.escapeHtml(ticket.number)} - ${UI.escapeHtml(ticket.title)}</strong>
                <p>${UI.escapeHtml(ticket.queue)} · ${UI.escapeHtml(ticket.requester)} · ${UI.escapeHtml(dueLabel(ticket))}</p>
              </div>
              <button class="btn btn-secondary btn-sm" type="button" data-qm-ticket="${UI.escapeHtml(ticket.id)}">Open in Work Center</button>
            </article>
          `).join("")
        : '<div class="empty-state">No tickets are waiting on a requester.</div>';

      currentRecommendation = queueRecommendation(active);
      recommendationPanel.innerHTML = `
        <div class="queue-recommendation-icon">i</div>
        <div>
          <h3>${UI.escapeHtml(currentRecommendation.title)}</h3>
          <p>${UI.escapeHtml(currentRecommendation.description)}</p>
          <strong>${UI.escapeHtml(currentRecommendation.suggestedChange)}</strong>
        </div>
      `;

      // Gate the publish action by persona, then reflect the most recent improvement.
      const isManager = servicePersona() === "manager";
      const publishBtn = document.getElementById("qmPublishRecommendation");
      if (publishBtn) {
        publishBtn.hidden = !isManager;
        publishBtn.disabled = !currentRecommendation.gap;
      }
      const recNote = document.querySelector(".queue-recommendation-note");
      if (recNote) {
        recNote.textContent = isManager
          ? "Queue-owned change · publishes immediately · no administrator approval required."
          : "Service Team Members can log feedback. Switch to Queue Manager to publish changes.";
      }
      if (!isManager) {
        approvalList.querySelectorAll("[data-approval-action]").forEach((button) => { button.disabled = true; });
      }
      const recStatus = document.getElementById("qmRecommendationStatus");
      if (recStatus) {
        const latest = Store.getFlowImprovements()[0];
        if (latest) {
          recStatus.hidden = false;
          recStatus.innerHTML = `
            <span class="badge badge-green">Published</span>
            <span><strong>${UI.escapeHtml(latest.title)}</strong> is live now in ${UI.escapeHtml(latest.queue || "the queue")}. ${UI.escapeHtml(latest.approval)}.</span>
          `;
        } else {
          recStatus.hidden = true;
          recStatus.innerHTML = "";
        }
      }

      const feedback = readFeedback();
      const canDecide = servicePersona() === "manager";
      feedbackList.innerHTML = feedback.length
        ? feedback.slice(0, 10).map((item) => {
            const linkedTicket = item.ticketId ? Store.getTicket(item.ticketId) : null;
            const pending = item.status === "new" || !item.status;
            const decisionNote = item.decision && item.decision.note
              ? ` — ${UI.escapeHtml(item.decision.note)}`
              : "";
            return `
            <article class="feedback-item" data-feedback-id="${UI.escapeHtml(item.id)}">
              <div>
                <span class="badge badge-gray">${UI.escapeHtml(item.issueType)}</span>
                <span class="badge ${feedbackStatusClass(item.status)}">${UI.escapeHtml(feedbackStatusLabel(item.status))}</span>
                <strong>${UI.escapeHtml(item.title)}</strong>
                <p>${UI.escapeHtml(item.description)}</p>
                ${item.suggestedChange ? `<p><strong>Suggested change:</strong> ${UI.escapeHtml(item.suggestedChange)}</p>` : ""}
                ${item.expectedBenefit ? `<p><strong>Expected benefit:</strong> ${UI.escapeHtml(item.expectedBenefit)}</p>` : ""}
                ${linkedTicket ? `<p class="muted small">Related ticket: ${UI.escapeHtml(linkedTicket.number)} · ${UI.escapeHtml(linkedTicket.queue || "Unrouted")}</p>` : ""}
                ${!pending ? `<p class="muted small">${UI.escapeHtml(feedbackStatusLabel(item.status))}${decisionNote}</p>` : ""}
              </div>
              <small>${UI.escapeHtml(item.submittedBy || item.sourceRole)} · ${UI.escapeHtml(formatExactDate(item.createdAt))}</small>
              ${pending && canDecide ? `
                <div class="feedback-item-actions">
                  <button class="btn btn-primary btn-sm" type="button" data-feedback-action="publish" data-feedback-id="${UI.escapeHtml(item.id)}">Approve &amp; publish</button>
                  <button class="btn btn-secondary btn-sm" type="button" data-feedback-action="needs-info" data-feedback-id="${UI.escapeHtml(item.id)}">Return for more info</button>
                  <button class="btn btn-danger btn-sm" type="button" data-feedback-action="reject" data-feedback-id="${UI.escapeHtml(item.id)}">Reject</button>
                  <button class="btn btn-ghost btn-sm" type="button" data-feedback-action="escalate" data-feedback-id="${UI.escapeHtml(item.id)}">Escalate to governance</button>
                </div>
              ` : ""}
            </article>
          `;
          }).join("")
        : '<div class="empty-state">No receiver or manager feedback has been submitted yet.</div>';
    }

    approvalList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-approval-action]");
      if (!button) return;
      const ticketId = button.dataset.ticketId;
      const noteInput = approvalList.querySelector(`[data-approval-note="${ticketId}"]`);
      decideApproval(ticketId, button.dataset.approvalAction, noteInput ? noteInput.value : "");
    });

    waitingList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-qm-ticket]");
      if (!button) return;
      window.localStorage.setItem("masterflowReceiverOpenTicket", button.dataset.qmTicket);
      window.location.href = "assigned-work.html";
    });

    const FEEDBACK_ACTION_PROMPTS = {
      reject: "Reason for rejecting this suggestion:",
      "needs-info": "What additional information is needed?",
      escalate: "Why does this need Enterprise Governance review?"
    };

    feedbackList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-feedback-action]");
      if (!button) return;
      const action = button.dataset.feedbackAction;
      const promptText = FEEDBACK_ACTION_PROMPTS[action];
      let note = "";
      if (promptText) {
        note = window.prompt(promptText) || "";
        if (!note.trim()) {
          UI.showToast("A reason is required for this decision.");
          return;
        }
      }
      const updated = decideFeedback(button.dataset.feedbackId, action, note);
      if (updated) {
        UI.showToast(`Suggestion "${updated.title}" — ${feedbackStatusLabel(updated.status).toLowerCase()}.`);
        renderQueueManager();
      }
    });

    document.getElementById("qmSubmitRecommendation").addEventListener("click", () => {
      if (!currentRecommendation) return;
      openFeedback({
        sourceRole: "queue-manager",
        queue: currentRecommendation.queue,
        issueType: currentRecommendation.gap ? "question-wording" : "other",
        title: currentRecommendation.title,
        description: currentRecommendation.description,
        suggestedChange: currentRecommendation.suggestedChange,
        missingFields: currentRecommendation.gap ? [currentRecommendation.gap] : []
      });
    });

    // Direct-publish path for queue-owned request-flow improvements (no approval).
    const improvementDialog = document.getElementById("improvementPublishDialog");
    function openFlowStudioForRec() {
      const templateId = queueToFlow(currentRecommendation ? currentRecommendation.queue : "");
      window.location.href = templateId
        ? `admin-templates.html?flow=${encodeURIComponent(templateId)}`
        : "admin-templates.html";
    }
    function openImprovementDialog() {
      if (!currentRecommendation || !currentRecommendation.gap) return;
      const diff = improvementDiff(currentRecommendation);
      document.getElementById("improvementBefore").textContent = diff.before;
      document.getElementById("improvementAfter").textContent = diff.after;
      document.getElementById("improvementUnchanged").textContent = diff.unchanged;
      if (typeof improvementDialog.showModal === "function") improvementDialog.showModal();
      else improvementDialog.setAttribute("open", "");
    }
    function closeImprovementDialog() {
      if (improvementDialog.open) improvementDialog.close();
      else improvementDialog.removeAttribute("open");
    }
    document.getElementById("qmPublishRecommendation").addEventListener("click", openImprovementDialog);
    document.getElementById("qmOpenFlowStudio").addEventListener("click", openFlowStudioForRec);
    document.getElementById("improvementOpenStudio").addEventListener("click", openFlowStudioForRec);
    improvementDialog.querySelectorAll("[data-close-improvement]").forEach((button) => {
      button.addEventListener("click", closeImprovementDialog);
    });
    document.getElementById("improvementConfirmPublish").addEventListener("click", () => {
      if (!currentRecommendation || !currentRecommendation.gap) return;
      const diff = improvementDiff(currentRecommendation);
      Store.publishFlowImprovement({
        title: currentRecommendation.title,
        queue: currentRecommendation.queue,
        gap: currentRecommendation.gap,
        before: diff.before,
        after: diff.after,
        unchanged: diff.unchanged,
        templateId: diff.templateId,
        suggestedChange: currentRecommendation.suggestedChange
      });
      addFeedback({
        sourceRole: "queue-manager",
        queue: currentRecommendation.queue,
        templateId: diff.templateId,
        issueType: "question-wording",
        title: `Published: ${currentRecommendation.title}`,
        description: `${diff.after} Published directly by the Queue Manager — no administrator approval required.`,
        suggestedChange: currentRecommendation.suggestedChange
      });
      closeImprovementDialog();
      renderQueueManager();
    });

    document.getElementById("qmAddFeedback").addEventListener("click", () => {
      openFeedback({ sourceRole: "queue-manager", issueType: "other" });
    });

    initServicePersona();
    initAssignmentRules();

    window.addEventListener("masterflow:state", renderQueueManager);
    window.addEventListener("masterflow:flow-feedback", renderQueueManager);
    window.addEventListener("masterflow:persona", renderQueueManager);
    renderQueueManager();
  }

  // Queue-owned automatic assignment rules. Queue Managers create, edit, test,
  // and publish these directly — no administrator approval. Rules only choose an
  // owner within a queue the routing engine already selected.
  const OWNED_QUEUES = ["IT Help Desk", "IT Information", "Business Enablement - Systems Intake"];
  const OWNED_FLOWS = [
    { templateId: "printer-connectivity", label: "Report an issue to Help Desk", queue: "IT Help Desk" },
    { templateId: "printer-ink", label: "Printer Ink Request", queue: "IT Information" },
    { templateId: "new-it-hardware", label: "New IT Hardware Request", queue: "IT Information" },
    { templateId: "systems-intake", label: "Systems Intake", queue: "Business Enablement - Systems Intake" }
  ];
  const TEAM_MEMBERS = ["Jordan Kim", "Taylor Morgan", "Priya Shah", "Casey Rivera"];

  function queueToFlow(queue) {
    const flow = OWNED_FLOWS.find((item) => item.queue === queue);
    return flow ? flow.templateId : "";
  }

  // Builds the before / after / unchanged preview for a queue-owned request-flow
  // improvement. Governed elements (queue, routing, SLA, priority, approvals, P1)
  // are always listed as unchanged.
  function improvementDiff(rec) {
    const gap = rec && rec.gap ? rec.gap.toLowerCase() : "";
    const flow = OWNED_FLOWS.find((item) => item.queue === (rec && rec.queue));
    const flowLabel = flow ? flow.label : "this request type";
    return {
      templateId: flow ? flow.templateId : "",
      flowLabel,
      before: gap
        ? `Requests can be submitted without ${gap}, so the Service Team often has to follow up before work can start.`
        : "The current request flow is performing well; no repeated information gap is visible.",
      after: gap
        ? (flow
            ? `The "${flow.label}" intake asks for ${gap} up front, with a clear "not known" fallback so no one is blocked.`
            : `The intake for ${flowLabel} asks for ${gap} up front, with a clear "not known" fallback so no one is blocked.`)
        : "No change is proposed. Continue monitoring feedback.",
      unchanged: `Queue (${(rec && rec.queue) || "unchanged"}), automatic routing, SLA targets, priority, approvals, and P1 fast-lane handling all stay exactly the same.`
    };
  }

  // Service Team persona: a Queue Manager gets the full toolset; a Service Team
  // Member works tickets and sees manager tools as read-only. Stored locally and
  // kept in sync with the Flow Studio persona.
  const SERVICE_PERSONA_KEY = "masterflowServicePersona";
  function servicePersona() {
    return window.localStorage.getItem(SERVICE_PERSONA_KEY) === "member" ? "member" : "manager";
  }
  function setServicePersona(persona) {
    const value = persona === "member" ? "member" : "manager";
    window.localStorage.setItem(SERVICE_PERSONA_KEY, value);
    window.localStorage.setItem("masterflowAdminRoleV1", value === "member" ? "queue-manager" : "category-owner");
    window.dispatchEvent(new CustomEvent("masterflow:persona", { detail: value }));
  }

  function initServicePersona() {
    const bar = document.getElementById("servicePersonaBar");
    if (!bar) return;
    const titleEl = document.getElementById("personaTitle");
    const descEl = document.getElementById("personaDesc");
    const options = bar.querySelectorAll(".persona-option");
    function apply() {
      const persona = servicePersona();
      bar.dataset.persona = persona;
      if (titleEl) titleEl.textContent = persona === "member" ? "Service Team Member" : "Queue Manager";
      if (descEl) {
        descEl.textContent = persona === "member"
          ? "Works and resolves tickets. Queue health, assignment rules, publishing, and Flow Studio are view-only."
          : "Full queue tools: team workload, owned reporting, assignment rules, direct publishing, and Flow Studio.";
      }
      options.forEach((button) => {
        const active = button.dataset.persona === persona;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
    options.forEach((button) => {
      button.addEventListener("click", () => {
        setServicePersona(button.dataset.persona);
        apply();
      });
    });
    window.addEventListener("masterflow:persona", apply);
    apply();
  }

  function initAssignmentRules() {
    const listEl = document.getElementById("qmAssignmentRuleList");
    const availabilityEl = document.getElementById("qmAvailabilityList");
    const summaryEl = document.getElementById("qmAssignmentSummary");
    const newButton = document.getElementById("qmNewAssignmentRule");
    const dialog = document.getElementById("assignmentRuleDialog");
    if (!listEl || !dialog) return;

    const titleEl = document.getElementById("assignmentRuleTitle");
    const nameEl = document.getElementById("ruleName");
    const queueEl = document.getElementById("ruleQueue");
    const flowEl = document.getElementById("ruleFlow");
    const primaryEl = document.getElementById("rulePrimary");
    const backupEl = document.getElementById("ruleBackup");
    const fallbackEl = document.getElementById("ruleFallback");
    const priorityEl = document.getElementById("rulePriority");
    const notesEl = document.getElementById("ruleNotes");
    const activeEl = document.getElementById("ruleActive");
    const testButton = document.getElementById("ruleTestButton");
    const testResult = document.getElementById("ruleTestResult");
    const saveButton = document.getElementById("ruleSaveButton");
    let editingId = null;

    queueEl.innerHTML = OWNED_QUEUES.map((q) => `<option value="${UI.escapeHtml(q)}">${UI.escapeHtml(q)}</option>`).join("");
    flowEl.innerHTML = OWNED_FLOWS.map((f) => `<option value="${UI.escapeHtml(f.templateId)}">${UI.escapeHtml(f.label)}</option>`).join("");
    function memberOptions(includeBlank) {
      return (includeBlank ? '<option value="">No backup owner</option>' : "") +
        TEAM_MEMBERS.map((m) => `<option value="${UI.escapeHtml(m)}">${UI.escapeHtml(m)}</option>`).join("");
    }
    primaryEl.innerHTML = memberOptions(false);
    backupEl.innerHTML = memberOptions(true);

    // Keep queue in sync with the selected request type (routing owns the queue).
    flowEl.addEventListener("change", () => {
      const flow = OWNED_FLOWS.find((f) => f.templateId === flowEl.value);
      if (flow) queueEl.value = flow.queue;
    });

    function availabilityFor(name) {
      const map = Store.getTeamAvailability();
      return map[name] !== false;
    }

    function renderRules() {
      const editable = servicePersona() === "manager";
      const viewOnlyNote = document.getElementById("qmAssignmentViewOnly");
      if (newButton) newButton.hidden = !editable;
      if (viewOnlyNote) viewOnlyNote.hidden = editable;
      const rules = Store.getAssignmentRules().filter((rule) => OWNED_QUEUES.includes(rule.queue));
      const activeCount = rules.filter((r) => r.active).length;
      summaryEl.textContent = rules.length
        ? `${rules.length} rule${rules.length === 1 ? "" : "s"} · ${activeCount} active`
        : "No rules yet";
      listEl.innerHTML = rules.length
        ? rules
            .slice()
            .sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99))
            .map((rule) => {
              const flow = OWNED_FLOWS.find((f) => f.templateId === rule.templateId);
              const flowLabel = flow ? flow.label : (rule.category || "Any request type");
              const primaryOk = availabilityFor(rule.primaryAssignee);
              const backupText = rule.backupAssignee ? `Backup: ${rule.backupAssignee}` : "No backup";
              const fallbackText = rule.fallback === "manager" ? "then Queue Manager" : "then leave unassigned";
              return `
                <article class="assignment-rule-card${rule.active ? "" : " is-inactive"}" data-rule-id="${UI.escapeHtml(rule.id)}">
                  <div class="assignment-rule-main">
                    <div class="assignment-rule-heading">
                      <strong>${UI.escapeHtml(rule.name)}</strong>
                      <span class="badge ${rule.active ? "badge-green" : "badge-gray"}">${rule.active ? "Active" : "Paused"}</span>
                      <span class="badge badge-gray">Priority ${UI.escapeHtml(String(rule.priority || 1))}</span>
                    </div>
                    <p class="assignment-rule-route">
                      <span class="assignment-chip">${UI.escapeHtml(rule.queue)}</span>
                      <span aria-hidden="true">·</span>
                      <span>${UI.escapeHtml(flowLabel)}</span>
                    </p>
                    <p class="assignment-rule-owner">
                      Assign to <strong>${UI.escapeHtml(rule.primaryAssignee)}</strong>${primaryOk ? "" : ' <span class="assignment-warn">(currently unavailable)</span>'}
                      · ${UI.escapeHtml(backupText)} · ${UI.escapeHtml(fallbackText)}
                    </p>
                    <p class="assignment-rule-meta muted">Applied to ${Number(rule.appliedCount) || 0} request${(Number(rule.appliedCount) || 0) === 1 ? "" : "s"}${rule.notes ? " · " + UI.escapeHtml(rule.notes) : ""}</p>
                  </div>
                  ${editable ? `
                  <div class="assignment-rule-actions">
                    <button class="btn btn-ghost btn-sm" type="button" data-rule-action="toggle">${rule.active ? "Pause" : "Activate"}</button>
                    <button class="btn btn-secondary btn-sm" type="button" data-rule-action="edit">Edit</button>
                    <button class="btn btn-ghost btn-sm" type="button" data-rule-action="delete">Delete</button>
                  </div>` : ""}
                </article>
              `;
            })
            .join("")
        : '<div class="empty-state">No automatic assignment rules yet. Create one to route requests to a specific owner.</div>';
    }

    function renderAvailability() {
      const editable = servicePersona() === "manager";
      const map = Store.getTeamAvailability();
      availabilityEl.innerHTML = TEAM_MEMBERS.map((name) => {
        const available = map[name] !== false;
        return `
          <label class="assignment-availability-item">
            <input type="checkbox" data-availability="${UI.escapeHtml(name)}" ${available ? "checked" : ""} ${editable ? "" : "disabled"}>
            <span>${UI.escapeHtml(name)}</span>
            <small class="${available ? "assignment-avail-on" : "assignment-avail-off"}">${available ? "Available" : "Unavailable"}</small>
          </label>
        `;
      }).join("");
    }

    function render() {
      renderRules();
      renderAvailability();
    }

    function openDialog(rule) {
      editingId = rule ? rule.id : null;
      titleEl.textContent = rule ? "Edit assignment rule" : "New assignment rule";
      saveButton.textContent = rule ? "Save changes" : "Publish rule";
      nameEl.value = rule ? rule.name : "";
      flowEl.value = rule ? rule.templateId : OWNED_FLOWS[0].templateId;
      const flow = OWNED_FLOWS.find((f) => f.templateId === flowEl.value);
      queueEl.value = rule ? rule.queue : (flow ? flow.queue : OWNED_QUEUES[0]);
      primaryEl.value = rule ? rule.primaryAssignee : TEAM_MEMBERS[0];
      backupEl.value = rule ? (rule.backupAssignee || "") : "";
      fallbackEl.value = rule ? (rule.fallback || "unassigned") : "unassigned";
      priorityEl.value = rule ? (rule.priority || 1) : 1;
      notesEl.value = rule ? (rule.notes || "") : "";
      activeEl.checked = rule ? rule.active !== false : true;
      testResult.hidden = true;
      testResult.innerHTML = "";
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }

    function closeDialog() {
      if (dialog.open) dialog.close();
      else dialog.removeAttribute("open");
    }

    function collectRule() {
      const flow = OWNED_FLOWS.find((f) => f.templateId === flowEl.value);
      return {
        id: editingId || undefined,
        name: nameEl.value.trim(),
        queue: queueEl.value,
        templateId: flowEl.value,
        category: flow ? flow.label : "",
        primaryAssignee: primaryEl.value,
        backupAssignee: backupEl.value || "",
        fallback: fallbackEl.value,
        priority: Number(priorityEl.value) || 1,
        notes: notesEl.value.trim(),
        active: activeEl.checked
      };
    }

    newButton.addEventListener("click", () => openDialog(null));

    listEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-rule-action]");
      if (!button) return;
      const card = button.closest("[data-rule-id]");
      const id = card && card.dataset.ruleId;
      if (!id) return;
      const rule = Store.getAssignmentRules().find((r) => r.id === id);
      if (!rule) return;
      const action = button.dataset.ruleAction;
      if (action === "edit") {
        openDialog(rule);
      } else if (action === "toggle") {
        Store.upsertAssignmentRule(Object.assign({}, rule, { active: !rule.active }));
        render();
      } else if (action === "delete") {
        if (window.confirm(`Delete the "${rule.name}" rule? New requests will no longer be auto-assigned by it.`)) {
          Store.deleteAssignmentRule(id);
          render();
        }
      }
    });

    testButton.addEventListener("click", () => {
      const draft = collectRule();
      const flow = OWNED_FLOWS.find((f) => f.templateId === draft.templateId);
      const result = Store.previewAssignment({
        queue: draft.queue,
        category: flow ? `${draft.queue} / ${flow.label}` : draft.queue,
        templateId: draft.templateId
      });
      testResult.hidden = false;
      // Preview the *draft* owner logic directly so unsaved edits are reflected.
      const primaryAvailable = Store.getTeamAvailability()[draft.primaryAssignee] !== false;
      const backupAvailable = draft.backupAssignee && Store.getTeamAvailability()[draft.backupAssignee] !== false;
      let who = "";
      let why = "";
      if (!draft.active) {
        who = "No assignment";
        why = "This rule is paused, so it would not run.";
      } else if (primaryAvailable) {
        who = draft.primaryAssignee;
        why = `${draft.primaryAssignee} is available and would receive the request.`;
      } else if (backupAvailable) {
        who = draft.backupAssignee;
        why = `${draft.primaryAssignee} is unavailable, so the backup owner ${draft.backupAssignee} would receive it.`;
      } else if (draft.fallback === "manager") {
        who = "Queue Manager";
        why = "No configured owner is available, so it would route to the Queue Manager.";
      } else {
        who = "Left unassigned";
        why = "No configured owner is available, so it would stay in the queue for you to assign.";
      }
      testResult.innerHTML = `
        <div class="assignment-test-outcome">
          <span class="muted">A "${UI.escapeHtml(flow ? flow.label : draft.templateId)}" request in ${UI.escapeHtml(draft.queue)} would be assigned to</span>
          <strong>${UI.escapeHtml(who)}</strong>
          <p class="muted">${UI.escapeHtml(why)} The queue stays ${UI.escapeHtml(draft.queue)}.</p>
        </div>
      `;
    });

    saveButton.addEventListener("click", () => {
      const draft = collectRule();
      if (!draft.name) {
        nameEl.focus();
        return;
      }
      Store.upsertAssignmentRule(draft);
      closeDialog();
      render();
    });

    dialog.querySelectorAll("[data-close-assignment]").forEach((button) => {
      button.addEventListener("click", closeDialog);
    });

    availabilityEl.addEventListener("change", (event) => {
      const input = event.target.closest("[data-availability]");
      if (!input) return;
      Store.setMemberAvailability(input.dataset.availability, input.checked);
      render();
    });

    window.addEventListener("masterflow:state", render);
    window.addEventListener("masterflow:persona", render);
    render();
  }

  window.MasterFlowReceiverFeedback = {
    STORAGE_KEY: FEEDBACK_KEY,
    list: readFeedback,
    add: addFeedback,
    open: openFeedback,
    analyzeTicket,
    isClosed,
    isWaiting,
    isSlaRisk,
    dueLabel,
    priorityLabel,
    isApprovalRequired,
    isAwaitingApproval,
    isApprovedForFulfillment,
    requestedCost,
    numericRequestedCost,
    approvalRoute
  };

  initQueueManager();
  initTeamRequests();
})();
