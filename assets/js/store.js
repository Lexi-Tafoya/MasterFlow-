(function () {
  "use strict";

  const STORAGE_KEY = "masterflowMultipageStateV1";
  const ROLE_KEY = "masterflowDemoRole";
  const CURRENT_USER = {
    id: "usr-alexandra",
    name: "Alexandra Tafoya",
    initials: "AT",
    email: "alexandra.tafoya@example.invalid"
  };

  function isoMinutesFromNow(minutes) {
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  function isoHoursFromNow(hours) {
    return isoMinutesFromNow(hours * 60);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function seedState() {
    const now = Date.now();
    return {
      version: 1,
      nextTicketSequence: 1854,
      currentUser: deepClone(CURRENT_USER),
      tickets: [
        {
          id: "t-1842",
          number: "ME-2026-1842",
          title: "Connect to printer",
          description: "Need help connecting workstation P-14 to printer PHX-PRN-22.",
          category: "Hardware / Printer",
          priority: "P3 - Normal",
          queue: "IT Support",
          requester: "Alexandra Tafoya",
          assignee: "Jordan Kim",
          status: "Waiting on requester",
          createdAt: new Date(now - 2.2 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 12 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(5.2),
          location: "PHX Warehouse - Station P-14",
          source: "MasterFlow conversation",
          classificationConfidence: 94,
          routingReason: "Printer intent and workstation context matched IT Support routing rule.",
          details: {
            printer: "PHX-PRN-22",
            workstation: "P-14"
          },
          history: [
            { at: new Date(now - 2.2 * 60 * 60 * 1000).toISOString(), text: "Ticket created and routed to IT Support." },
            { at: new Date(now - 12 * 60 * 1000).toISOString(), text: "Agent requested confirmation of the printer label." }
          ]
        },
        {
          id: "t-1814",
          number: "ME-2026-1814",
          title: "Sales order report access",
          description: "Access is needed to the sales order backlog report.",
          category: "Software access",
          priority: "P3 - Normal",
          queue: "Business Systems",
          requester: "Alexandra Tafoya",
          assignee: "Priya Shah",
          status: "In progress",
          createdAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 20 * 60 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(14),
          location: "Remote",
          source: "Email",
          classificationConfidence: 91,
          routingReason: "Access request and report name matched Business Systems queue.",
          details: {},
          history: [
            { at: new Date(now - 26 * 60 * 60 * 1000).toISOString(), text: "Ticket created from company email." },
            { at: new Date(now - 20 * 60 * 60 * 1000).toISOString(), text: "Manager approval requested." }
          ]
        },
        {
          id: "t-1760",
          number: "ME-2026-1760",
          title: "Laptop performance",
          description: "Laptop was slow when opening ERP and Outlook.",
          category: "Device / Performance",
          priority: "P3 - Normal",
          queue: "IT Support",
          requester: "Alexandra Tafoya",
          assignee: "Jordan Kim",
          status: "Resolved",
          createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
          slaDueAt: new Date(now - 4.5 * 24 * 60 * 60 * 1000).toISOString(),
          location: "PHX Office",
          source: "MasterFlow conversation",
          classificationConfidence: 89,
          routingReason: "Device performance terms matched IT Support routing rule.",
          details: {},
          history: [
            { at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(), text: "Ticket created." },
            { at: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(), text: "Resolved after startup cleanup and operating system updates." }
          ]
        },
        {
          id: "t-p1-1849",
          number: "ME-2026-1849",
          title: "Outbound manifesting unavailable",
          description: "Outbound stations cannot manifest orders in the PHX warehouse.",
          category: "Warehouse operations outage",
          priority: "P1 - Critical",
          queue: "Warehouse Systems / On-call",
          requester: "Morgan Lee",
          assignee: "Unassigned",
          status: "New",
          createdAt: new Date(now - 18 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 18 * 60 * 1000).toISOString(),
          slaDueAt: isoMinutesFromNow(12),
          location: "PHX Warehouse - Outbound",
          source: "Shipping is stopped fast lane",
          classificationConfidence: 100,
          routingReason: "Direct P1 fast-lane submission; no AI classification gate.",
          details: {
            process: "Manifesting",
            affectedUsers: "12",
            started: "18 minutes ago"
          },
          history: [
            { at: new Date(now - 18 * 60 * 1000).toISOString(), text: "P1 created. On-call and operations leadership notified." }
          ]
        },
        {
          id: "t-triage-1838",
          number: "ME-2026-1838",
          title: "Cannot finish daily work",
          description: "The requester reported that a daily task cannot be completed but did not identify the system.",
          category: "Needs classification",
          priority: "P3 - Normal",
          queue: "Megan Delia - Triage",
          requester: "Taylor Jones",
          assignee: "Megan Delia",
          status: "Triage",
          createdAt: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2.9 * 60 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(1.4),
          location: "Unknown",
          source: "MasterFlow conversation",
          classificationConfidence: 42,
          routingReason: "Classification confidence was below the safe-routing threshold.",
          details: {},
          history: [
            { at: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(), text: "Low-confidence request sent to triage." }
          ]
        },
        {
          id: "t-approval-1846",
          number: "ME-2026-1846",
          title: "Replacement scanner purchase",
          description: "Replacement handheld scanner requested for receiving.",
          category: "Service request / Purchase",
          priority: "P3 - Normal",
          queue: "Warehouse Technology",
          requester: "Jamie Chen",
          assignee: "Alexandra Tafoya",
          status: "Approval required",
          createdAt: new Date(now - 80 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 45 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(4.5),
          location: "PHX Warehouse - Receiving",
          source: "MasterFlow form",
          classificationConfidence: 97,
          routingReason: "Purchase request exceeded the configured approval threshold.",
          details: { estimatedCost: "$1,285" },
          history: [
            { at: new Date(now - 80 * 60 * 1000).toISOString(), text: "Request created." },
            { at: new Date(now - 45 * 60 * 1000).toISOString(), text: "Director approval requested." }
          ]
        }
      ],
      freightOpportunities: [
        {
          id: "f-abi173",
          customerNumber: "ABI173",
          customerName: "ABI Technologies",
          orderNumber: "ABCD14-02",
          parts: ["2888-2", "67666BH", "3332-OH"],
          warehouse: "PHX",
          salesOwner: "Alexandra Tafoya",
          logisticsOwner: "Logistics Optimization Queue",
          currentCarrier: "FedEx Priority Freight",
          currentService: "Priority",
          proposedCarrier: "Contracted LTL",
          proposedService: "Scheduled consolidated service",
          currentFreightCost: 5547.00,
          proposedFreightCost: 5003.46,
          internalSavings: 543.54,
          customerSavings: 330.56,
          confidence: 67,
          orderValue: 18600,
          currentPromiseDate: "Aug 9, 2026",
          proposedPromiseDate: "Aug 10, 2026",
          shippingCutoff: "Today, 1:30 PM",
          autoReleaseDeadline: "Today, 1:30 PM",
          status: "Review required",
          decision: null,
          decisionAt: null,
          decisionBy: null,
          decisionNote: "",
          relatedOrders: [
            { orderNumber: "ABCD14-05", estimatedShipDate: "Aug 10, 2026", value: 8200, inventoryStatus: "Partially allocated" },
            { orderNumber: "ABCD14-07", estimatedShipDate: "Aug 12, 2026", value: 4100, inventoryStatus: "Backlog" }
          ],
          recommendation: "Evaluate a one-day consolidation with ABCD14-05 and move to contracted LTL service.",
          rationale: [
            "The same customer has a related order estimated to ship within one day.",
            "Current freight cost is unusually high relative to order value and historical shipments.",
            "The proposed carrier has acceptable historical on-time performance for this lane."
          ],
          guardrails: [
            { label: "Export hold", result: "pass", detail: "No export hold detected." },
            { label: "Hazmat restriction", result: "pass", detail: "No hazardous-material restriction detected." },
            { label: "Customer promise date", result: "fail", detail: "Proposed date is one day later; customer confirmation may be required." },
            { label: "Inventory certainty", result: "fail", detail: "Related order is only partially allocated." },
            { label: "Automatic-action confidence", result: "fail", detail: "67% is below the 90% auto-action threshold." }
          ]
        },
        {
          id: "f-nort41",
          customerNumber: "NORT41",
          customerName: "Northstar Controls",
          orderNumber: "NS-99281",
          parts: ["4471-A", "PWR-808"],
          warehouse: "PHX",
          salesOwner: "Diego Ruiz",
          logisticsOwner: "Logistics Optimization Queue",
          currentCarrier: "UPS Next Day Air",
          currentService: "Next Day Air",
          proposedCarrier: "UPS",
          proposedService: "2nd Day Air",
          currentFreightCost: 1420.10,
          proposedFreightCost: 779.88,
          internalSavings: 640.22,
          customerSavings: 0,
          confidence: 93,
          orderValue: 12650,
          currentPromiseDate: "Jul 16, 2026",
          proposedPromiseDate: "Jul 16, 2026",
          shippingCutoff: "Today, 3:00 PM",
          autoReleaseDeadline: "Today, 3:00 PM",
          status: "Ready to approve",
          decision: null,
          decisionAt: null,
          decisionBy: null,
          decisionNote: "",
          relatedOrders: [],
          recommendation: "Use 2nd Day Air; lane history indicates the customer promise remains protected.",
          rationale: [
            "Requested delivery date is still met with the lower service level.",
            "Historical transit performance supports the recommendation."
          ],
          guardrails: [
            { label: "Customer promise date", result: "pass", detail: "No change to promise date." },
            { label: "Customer terms", result: "pass", detail: "Customer terms allow carrier/service substitution." },
            { label: "Automatic-action confidence", result: "pass", detail: "93% exceeds the prototype threshold." }
          ]
        },
        {
          id: "f-metro9",
          customerNumber: "METRO9",
          customerName: "Metro Industrial",
          orderNumber: "MI-44012",
          parts: ["CABLE-44", "CONN-218"],
          warehouse: "NY",
          salesOwner: "Sam Patel",
          logisticsOwner: "Logistics Optimization Queue",
          currentCarrier: "Regional LTL",
          currentService: "Standard LTL",
          proposedCarrier: "Regional LTL",
          proposedService: "Repacked standard LTL",
          currentFreightCost: 910.00,
          proposedFreightCost: 602.50,
          internalSavings: 307.50,
          customerSavings: 84.00,
          confidence: 84,
          orderValue: 9100,
          currentPromiseDate: "Jul 17, 2026",
          proposedPromiseDate: "Jul 17, 2026",
          shippingCutoff: "Tomorrow, 10:00 AM",
          autoReleaseDeadline: "Tomorrow, 10:00 AM",
          status: "Packaging review",
          decision: null,
          decisionAt: null,
          decisionBy: null,
          decisionNote: "",
          relatedOrders: [],
          recommendation: "Reduce dimensional weight by using the validated 18 x 18 x 12 carton configuration.",
          rationale: [
            "Current carton selection creates avoidable dimensional weight.",
            "A validated packaging pattern exists for this order profile."
          ],
          guardrails: [
            { label: "Product protection", result: "pass", detail: "Validated packaging pattern is available." },
            { label: "Promise date", result: "pass", detail: "No date impact." },
            { label: "Automatic-action confidence", result: "fail", detail: "84% requires human confirmation in the prototype." }
          ]
        }
      ],
      knowledgeArticles: [
        {
          id: "kb-printer",
          title: "Connect to a network printer",
          category: "Hardware",
          summary: "Find the printer label or IP address and add it through Windows Printers & scanners.",
          steps: [
            "Open Settings and select Bluetooth & devices.",
            "Select Printers & scanners, then Add device.",
            "Use the printer name or IP address printed on the device label.",
            "Create a ticket if the printer is not found or access is denied."
          ],
          tags: ["printer", "network", "Windows"],
          helpful: 94
        },
        {
          id: "kb-laptop",
          title: "First steps for a slow laptop",
          category: "Device performance",
          summary: "Use a safe checklist before opening a performance ticket.",
          steps: [
            "Save work and restart the laptop once.",
            "Open Task Manager and note unusually high CPU or memory usage.",
            "Do not force-close company security or management software.",
            "Create a ticket and include whether one app or the entire device is affected."
          ],
          tags: ["laptop", "slow", "performance"],
          helpful: 88
        },
        {
          id: "kb-email",
          title: "Continue a ticket by email",
          category: "Using MasterFlow",
          summary: "Reply to the MasterFlow notification without creating a second request.",
          steps: [
            "Open the ticket confirmation email.",
            "Reply above the marked line with your update or attachment.",
            "The reply is added to the same ticket conversation.",
            "Use My tickets to see the complete timeline."
          ],
          tags: ["email", "ticket", "update"],
          helpful: 91
        },
        {
          id: "kb-p1",
          title: "When to use Shipping is stopped",
          category: "Warehouse operations",
          summary: "Use the P1 fast lane only when shipping or a critical warehouse process is blocked.",
          steps: [
            "Choose Shipping is stopped from the home page or side menu.",
            "Provide the warehouse, blocked process, start time, affected users, and symptom.",
            "The system immediately alerts on-call support and operations leadership.",
            "Do not wait for chatbot classification during an active outage."
          ],
          tags: ["P1", "shipping", "warehouse"],
          helpful: 97
        },
        {
          id: "kb-access",
          title: "Request access to a system or report",
          category: "Access",
          summary: "Include the system, role, business reason, and approving manager.",
          steps: [
            "Name the system or report.",
            "Describe what work the access enables.",
            "Identify your manager or required approver.",
            "Submit the request; MasterFlow will route the approval."
          ],
          tags: ["access", "report", "approval"],
          helpful: 86
        },
        {
          id: "kb-barcode",
          title: "Barcode scanner is not reading",
          category: "Warehouse technology",
          summary: "Check power, connection, and the active input field before creating a ticket.",
          steps: [
            "Confirm the scanner is powered and connected.",
            "Click in the expected barcode field and scan again.",
            "Try a known-good barcode label.",
            "Use Shipping is stopped only if the issue blocks the active warehouse process."
          ],
          tags: ["scanner", "barcode", "warehouse"],
          helpful: 90
        }
      ],
      settings: {
        ticketClassificationThreshold: 70,
        minimumSavings: 250,
        manualReviewConfidence: 70,
        autoActionConfidence: 90,
        directorApprovalThreshold: 1000,
        freightSavingsTarget: 200000,
        verifiedSavingsYtd: 126000,
        annualServiceNowCost: 300000,
        p1ResponseMinutes: 15,
        normalResponseHours: 4,
        normalResolutionHours: 24
      },
      routingRules: [
        { id: "rr-printer", name: "Printer and peripheral requests", condition: "Category contains Printer", route: "IT Support", active: true },
        { id: "rr-warehouse", name: "Warehouse application incidents", condition: "Location is warehouse and process is blocked", route: "Warehouse Systems / On-call", active: true },
        { id: "rr-triage", name: "Low-confidence classification", condition: "AI confidence below 70%", route: "Megan Delia - Triage", active: true }
      ],
      approvalRules: [
        { id: "ar-purchase", name: "Purchase request over $1,000", approver: "Director", active: true },
        { id: "ar-promise", name: "Freight action changes promise date", approver: "Sales owner plus customer confirmation", active: true },
        { id: "ar-auto", name: "High-confidence freight action", approver: "Auto-apply only when all guardrails pass", active: true }
      ]
    };
  }

  function readState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const state = seedState();
        writeState(state);
        return state;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) throw new Error("Unsupported state version");
      return parsed;
    } catch (error) {
      console.warn("MasterFlow state was reset because it could not be read.", error);
      const state = seedState();
      writeState(state);
      return state;
    }
  }

  function writeState(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("masterflow:state", { detail: deepClone(state) }));
    return state;
  }

  function resetState() {
    const state = seedState();
    writeState(state);
    window.localStorage.removeItem("masterflowTemplateOverridesV1");
    return deepClone(state);
  }

  function getRole() {
    return window.localStorage.getItem(ROLE_KEY) || "requester";
  }

  function setRole(role) {
    const allowed = new Set(["requester", "receiver", "admin"]);
    const safeRole = allowed.has(role) ? role : "requester";
    window.localStorage.setItem(ROLE_KEY, safeRole);
    return safeRole;
  }

  function addTicket(input) {
    const state = readState();
    const sequence = Number(state.nextTicketSequence || 1854);
    state.nextTicketSequence = sequence + 1;
    const now = new Date();
    const priority = input.priority || "P3 - Normal";
    const dueMinutes = priority.startsWith("P1") ? state.settings.p1ResponseMinutes : priority.startsWith("P2") ? 120 : state.settings.normalResolutionHours * 60;
    const ticket = {
      id: `t-${sequence}-${Math.random().toString(36).slice(2, 7)}`,
      number: `ME-2026-${sequence}`,
      title: input.title || "New request",
      description: input.description || "",
      category: input.category || "Needs classification",
      priority,
      queue: input.queue || "Megan Delia - Triage",
      requester: input.requester || CURRENT_USER.name,
      assignee: input.assignee || "Unassigned",
      status: input.status || "New",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      slaDueAt: input.slaDueAt || new Date(now.getTime() + dueMinutes * 60 * 1000).toISOString(),
      location: input.location || "Not provided",
      source: input.source || "MasterFlow",
      classificationConfidence: Number.isFinite(Number(input.classificationConfidence)) ? Number(input.classificationConfidence) : 0,
      routingReason: input.routingReason || "Created by requester.",
      details: input.details || {},
      history: [
        { at: now.toISOString(), text: input.historyText || `Ticket created and routed to ${input.queue || "triage"}.` }
      ]
    };
    state.tickets.unshift(ticket);
    writeState(state);
    return deepClone(ticket);
  }

  function updateTicket(id, patch, historyText) {
    const state = readState();
    const ticket = state.tickets.find((item) => item.id === id);
    if (!ticket) return null;
    Object.assign(ticket, patch, { updatedAt: new Date().toISOString() });
    if (historyText) {
      ticket.history = ticket.history || [];
      ticket.history.push({ at: new Date().toISOString(), text: historyText });
    }
    writeState(state);
    return deepClone(ticket);
  }

  function getTicket(id) {
    return deepClone(readState().tickets.find((item) => item.id === id) || null);
  }

  function updateFreight(id, action, note) {
    const state = readState();
    const opportunity = state.freightOpportunities.find((item) => item.id === id);
    if (!opportunity) return { ok: false, message: "Opportunity not found." };
    if (["hold", "release"].includes(opportunity.decision)) {
      return { ok: false, message: "This opportunity already has a final decision. Reset demo data to repeat it." };
    }

    const now = new Date().toISOString();
    const cleanNote = String(note || "").trim();
    if (action === "hold") {
      opportunity.status = "Time-boxed hold";
      opportunity.decision = "hold";
      opportunity.decisionAt = now;
      opportunity.decisionBy = CURRENT_USER.name;
      opportunity.decisionNote = cleanNote || "Manual review approved until the automatic-release deadline.";
    } else if (action === "release") {
      opportunity.status = "Released unchanged";
      opportunity.decision = "release";
      opportunity.decisionAt = now;
      opportunity.decisionBy = CURRENT_USER.name;
      opportunity.decisionNote = cleanNote || "Original shipping method retained.";
    } else if (action === "sales") {
      opportunity.status = "Sales review";
      opportunity.decision = "sales";
      opportunity.decisionAt = now;
      opportunity.decisionBy = CURRENT_USER.name;
      opportunity.decisionNote = cleanNote || "Draft prepared for the sales owner. No customer email was sent.";
    } else {
      return { ok: false, message: "Unsupported freight action." };
    }

    writeState(state);
    return { ok: true, opportunity: deepClone(opportunity) };
  }

  function updateSettings(patch) {
    const state = readState();
    state.settings = Object.assign({}, state.settings, patch);
    writeState(state);
    return deepClone(state.settings);
  }

  function updateRoutingRule(id, patch) {
    const state = readState();
    const rule = state.routingRules.find((item) => item.id === id);
    if (!rule) return null;
    Object.assign(rule, patch);
    writeState(state);
    return deepClone(rule);
  }

  function updateApprovalRule(id, patch) {
    const state = readState();
    const rule = state.approvalRules.find((item) => item.id === id);
    if (!rule) return null;
    Object.assign(rule, patch);
    writeState(state);
    return deepClone(rule);
  }

  function getState() {
    return deepClone(readState());
  }

  window.MasterFlowStore = {
    STORAGE_KEY,
    CURRENT_USER: deepClone(CURRENT_USER),
    getState,
    resetState,
    getRole,
    setRole,
    addTicket,
    updateTicket,
    getTicket,
    updateFreight,
    updateSettings,
    updateRoutingRule,
    updateApprovalRule
  };
})();
