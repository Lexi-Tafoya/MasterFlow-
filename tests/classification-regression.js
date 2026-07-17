/*
 * MasterFlow classification regression harness  (Recommendation R6)
 * -----------------------------------------------------------------
 * Runs the REAL, unmodified classifier from assets/js/templates.js against a
 * fixed corpus and asserts the template the scorer selects for each phrase.
 *
 * Why this exists
 *   Every home-page example button, every template's happy-path phrasing, and
 *   a set of adversarial cross-template phrases are pinned here so that any
 *   future change to templates.js (especially to score()) is proven — in one
 *   command — not to silently misroute a curated demo phrase.
 *
 * How to run
 *   node tests/classification-regression.js
 *   (exit code 0 = all pass, 1 = at least one regression)
 *
 * No product code is imported into the browser bundle; this file is test-only.
 * templates.js is a browser IIFE that expects a few window globals, so we
 * provide the minimum deterministic stubs it reads during classify():
 *   - window.MasterFlowStore.getState().settings.ticketClassificationThreshold
 *   - window.MasterFlowStore.CURRENT_USER
 *   - window.localStorage (empty -> no template overrides)
 */

"use strict";

const path = require("path");

/* ---- Minimal deterministic browser stubs (classify() reads only these) ---- */
const THRESHOLD = 70; // matches store.js default ticketClassificationThreshold
const memoryStore = {};
global.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }
};
global.window = {
  MasterFlowStore: {
    getState: () => ({
      settings: {
        ticketClassificationThreshold: THRESHOLD,
        directorApprovalThreshold: 1000
      }
    }),
    CURRENT_USER: { name: "Regression Runner" }
  },
  localStorage: {
    getItem: (key) => (key in memoryStore ? memoryStore[key] : null),
    setItem: (key, value) => {
      memoryStore[key] = String(value);
    },
    removeItem: (key) => {
      delete memoryStore[key];
    }
  },
  dispatchEvent: () => true,
  CustomEvent: global.CustomEvent
};

// Load the real classifier (it attaches window.MasterFlowTemplates on require).
require(path.join(__dirname, "..", "assets", "js", "templates.js"));
const Templates = global.window.MasterFlowTemplates;
if (!Templates || typeof Templates.classify !== "function") {
  console.error("Failed to load MasterFlowTemplates.classify from templates.js");
  process.exit(2);
}

/*
 * Corpus.
 *   input   : the natural-language request
 *   expect  : the template id the scorer must rank first (its "suggested" pick)
 *   routed  : "yes" -> confidence must clear the threshold and route to expect
 *             "triage" -> must fall to general-triage (below threshold / floor)
 *   note    : why this case matters
 */
const CORPUS = [
  /* ---- The 8 curated home-page example buttons (judge-facing) ---- */
  { input: "Paper jam at Pack Station 14", expect: "printer-connectivity", routed: "yes", note: "home example" },
  { input: "The printer at Pack Station 14 stopped working", expect: "printer-connectivity", routed: "yes", note: "home example" },
  { input: "My laptop is running very slowly", expect: "laptop-performance", routed: "yes", note: "home example" },
  { input: "I need access to the shared Sales folder", expect: "shared-folder-access", routed: "yes", note: "home example" },
  { input: "The scanner at Receiving is not reading labels", expect: "receiving-scanner-issue", routed: "yes", note: "home example" },
  { input: "Forklift 3 will not lift and has been taken out of service", expect: "equipment-out-of-service", routed: "yes", note: "home example" },
  { input: "It is too hot near the Shipping area", expect: "facilities-hvac", routed: "yes", note: "home example" },
  { input: "Can someone verify the date code for part 12345 in Phoenix?", expect: "stock-check-phoenix", routed: "yes", note: "home example" },
  { input: "I need help, but I am not sure which team owns this", expect: "general-triage", routed: "triage", note: "home example (deliberate triage)" },

  /* ---- Every template's happy-path phrasing (R8 full walkthrough) ---- */
  { input: "The printer is out of toner at Pack Station 3", expect: "printer-ink", routed: "yes", note: "printer-ink" },
  { input: "The label printer will not print anything", expect: "printer-connectivity", routed: "yes", note: "printer-connectivity" },
  { input: "My computer keeps freezing and is very slow", expect: "laptop-performance", routed: "yes", note: "laptop-performance" },
  { input: "The receiving scanner will not read barcodes", expect: "receiving-scanner-issue", routed: "yes", note: "receiving-scanner" },
  { input: "Forklift 12 will not start, tagged out of service", expect: "equipment-out-of-service", routed: "yes", note: "equipment" },
  { input: "We received the wrong part and need a warehouse corrective action", expect: "corrective-action-warehouse", routed: "yes", note: "corrective-action" },
  { input: "Please verify the date code and quantity for part 2888-2 in Phoenix", expect: "stock-check-phoenix", routed: "yes", note: "stock-check" },
  { input: "MERP is not updating order status", expect: "systems-intake", routed: "yes", note: "systems-intake" },
  { input: "I need access to a shared network drive", expect: "shared-folder-access", routed: "yes", note: "shared-folder" },
  { input: "The air conditioning is broken and it is too hot", expect: "facilities-hvac", routed: "yes", note: "hvac" },
  { input: "I need a new scanner for Receiving Line 2", expect: "new-it-hardware", routed: "yes", note: "new-hardware" },
  { input: "Please help me with something unusual", expect: "general-triage", routed: "triage", note: "vague -> triage" },

  /* ---- Adversarial cross-template cases (R7 word-overlap guards) ---- */
  { input: "MERP is not updating", expect: "systems-intake", routed: "yes", note: "must NOT drift to scanner via 'not'" },
  { input: "OMS is not refreshing", expect: "systems-intake", routed: "yes", note: "systems, not scanner" },
  { input: "My scanner is broken", expect: "receiving-scanner-issue", routed: "yes", note: "broken scanner is an issue, NOT a purchase" },
  { input: "The scanner stopped working at Receiving", expect: "receiving-scanner-issue", routed: "yes", note: "issue, not purchase" },
  { input: "I need a new laptop", expect: "new-it-hardware", routed: "yes", note: "acquisition intent -> hardware" },
  { input: "My laptop is slow", expect: "laptop-performance", routed: "yes", note: "slow laptop is NOT a purchase" },
  { input: "The printer stopped working", expect: "printer-connectivity", routed: "yes", note: "connectivity, not ink" },
  { input: "The printer is low on ink", expect: "printer-ink", routed: "yes", note: "ink, not connectivity" },
  { input: "I need another monitor for my desk", expect: "new-it-hardware", routed: "yes", note: "acquisition -> hardware" },
  { input: "The conveyor stopped and is making a grinding noise", expect: "equipment-out-of-service", routed: "yes", note: "equipment" }
];

/* ---------------------------------- run ---------------------------------- */
function pickedId(result) {
  return result.suggestedTemplate ? result.suggestedTemplate.id : result.template.id;
}

let failures = 0;
const rows = [];
for (const testCase of CORPUS) {
  const result = Templates.classify(testCase.input);
  const top = pickedId(result);
  const routedId = result.template.id;
  const confidence = result.confidence;

  const topOk = top === testCase.expect;
  let routeOk = true;
  if (testCase.routed === "yes") {
    routeOk = routedId === testCase.expect; // cleared threshold, routed to expect
  } else if (testCase.routed === "triage") {
    routeOk = routedId === "general-triage";
  }

  const pass = topOk && routeOk;
  if (!pass) failures += 1;

  rows.push({
    status: pass ? "PASS" : "FAIL",
    input: testCase.input,
    expect: testCase.expect,
    got: top,
    routed: routedId,
    conf: confidence,
    note: testCase.note
  });
}

/* ------------------------------- reporting ------------------------------- */
const pad = (value, width) => String(value).padEnd(width).slice(0, width);
console.log("");
console.log("MasterFlow classification regression  (threshold " + THRESHOLD + "%)");
console.log("=".repeat(112));
console.log(
  pad("RESULT", 6) + "  " + pad("EXPECT", 26) + pad("GOT", 26) + pad("CONF", 6) + "INPUT"
);
console.log("-".repeat(112));
for (const row of rows) {
  console.log(
    pad(row.status, 6) +
      "  " +
      pad(row.expect, 26) +
      pad(row.got, 26) +
      pad(row.conf + "%", 6) +
      row.input
  );
  if (row.status === "FAIL") {
    console.log(
      "        -> routed to '" + row.routed + "'  (" + row.note + ")"
    );
  }
}
console.log("-".repeat(112));
console.log(
  (failures === 0 ? "ALL PASS" : failures + " FAILURE(S)") +
    "  —  " +
    (CORPUS.length - failures) +
    "/" +
    CORPUS.length +
    " cases passed"
);
console.log("");

process.exit(failures === 0 ? 0 : 1);
