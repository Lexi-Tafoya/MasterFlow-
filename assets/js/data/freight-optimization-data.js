/*
 * Freight Optimization — isolated data + state module.
 *
 * This module is intentionally self-contained and namespaced under
 * window.MasterFlowFreight. It NEVER touches ticketing state:
 *   - Ticketing lives in localStorage key "masterflowMultipageStateV1"
 *     (window.MasterFlowStore). This module uses only "masterflowFreightStateV1".
 *   - It does not read, write, or reset any ticket, user, queue, template,
 *     approval, SLA, reporting, or role data.
 *
 * All figures are FICTIONAL, demonstration-only, and MODELED. No live ERP,
 * TMS, carrier, or order-management integration is contacted. Savings are
 * modeled published-base-rate estimates, not verified freight invoices.
 *
 * The seed opportunities (ABI173, NORT41, METRO9) are adapted from the
 * coworker's Freight Optimization branch and reused unchanged as fictional
 * scenario data.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "masterflowFreightStateV1";

  // ---- Fictional, demonstration-only seed data -----------------------------
  function seedOpportunities() {
    return [
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
        currentFreightCost: 5547.0,
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
        decisionHistory: [],
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
        currentFreightCost: 1420.1,
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
        decisionHistory: [],
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
        currentFreightCost: 910.0,
        proposedFreightCost: 602.5,
        internalSavings: 307.5,
        customerSavings: 84.0,
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
        decisionHistory: [],
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
    ];
  }

  function seedSettings() {
    return {
      minimumSavings: 250,
      manualReviewConfidence: 70,
      autoActionConfidence: 90,
      freightSavingsTarget: 200000
    };
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function currentUserName() {
    var store = window.MasterFlowStore;
    if (store && store.CURRENT_USER && store.CURRENT_USER.name) return store.CURRENT_USER.name;
    return "Queue Manager";
  }

  function freshState() {
    return {
      version: 1,
      opportunities: seedOpportunities(),
      settings: seedSettings()
    };
  }

  function readState() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      raw = null;
    }
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.opportunities) || !parsed.settings) return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* localStorage may be unavailable (private mode); page still renders from memory */
    }
  }

  /*
   * Idempotent seeding: only writes the seed if no valid freight state exists.
   * Reloading or reopening the page never duplicates opportunities.
   */
  function ensureSeeded() {
    var state = readState();
    if (state) return state;
    var seeded = freshState();
    writeState(seeded);
    return seeded;
  }

  function getOpportunities() {
    return deepClone(ensureSeeded().opportunities);
  }

  function getSettings() {
    return deepClone(ensureSeeded().settings);
  }

  function updateFreight(id, action, note) {
    var state = ensureSeeded();
    var opportunity = state.opportunities.find(function (item) {
      return item.id === id;
    });
    if (!opportunity) return { ok: false, message: "Opportunity not found." };
    if (opportunity.decision === "hold" || opportunity.decision === "release") {
      return { ok: false, message: "This opportunity already has a final decision. Reset the freight scenario to repeat it." };
    }

    opportunity.decisionHistory = opportunity.decisionHistory || [];
    var now = new Date().toISOString();
    var by = currentUserName();
    var cleanNote = String(note || "").trim();

    if (action === "hold") {
      opportunity.status = "Time-boxed hold";
      opportunity.decision = "hold";
      opportunity.decisionNote = cleanNote || "Manual review approved until the automatic-release deadline.";
    } else if (action === "release") {
      opportunity.status = "Released unchanged";
      opportunity.decision = "release";
      opportunity.decisionNote = cleanNote || "Original shipping method retained.";
    } else if (action === "sales") {
      opportunity.status = "Sales review";
      opportunity.decision = "sales";
      opportunity.decisionNote = cleanNote || "Draft prepared for the sales owner. No customer email was sent.";
    } else {
      return { ok: false, message: "Unsupported freight action." };
    }

    opportunity.decisionAt = now;
    opportunity.decisionBy = by;
    opportunity.decisionHistory.push({
      at: now,
      by: by,
      action: action,
      note: cleanNote || "",
      status: opportunity.status
    });

    writeState(state);
    return { ok: true, opportunity: deepClone(opportunity) };
  }

  function reset() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* ignore */
    }
    return ensureSeeded();
  }

  window.MasterFlowFreight = {
    STORAGE_KEY: STORAGE_KEY,
    ensureSeeded: ensureSeeded,
    getOpportunities: getOpportunities,
    getSettings: getSettings,
    updateFreight: updateFreight,
    reset: reset
  };
})();
