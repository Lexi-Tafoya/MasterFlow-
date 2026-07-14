(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  if (!Store) throw new Error("MasterFlowStore must load before templates.js");

  const STORAGE_KEY = "masterflowTemplateOverridesV1";

  const baseTemplates = [
    {
      id: "printer-ink",
      name: "Printer Ink Request",
      description: "Request ink or toner for an existing company printer.",
      catalog: "IT Information",
      queue: "IT Information",
      priority: "P4 - Low",
      responseSlaHours: 8,
      resolutionSlaHours: 24,
      keywords: ["printer ink", "need ink", "ink for", "ink cartridge", "printer toner", "need toner", "toner for", "toner", "cartridge", "printer is low", "printer out of ink", "replace toner"],
      article: {
        title: "How to identify your printer name",
        summary: "Look for the white asset label or printer name near the display. Common names look like PhoenixPr02 or SM1301PR01."
      },
      fields: [
        { id: "printerName", label: "Printer Name", type: "text", required: false, recommended: true, recommendedHint: "the exact printer name helps IT resolve this faster", placeholder: "Example: PhoenixPr02 or SM1301PR01", extractor: "printerName" },
        { id: "printerLocation", label: "Printer Location", type: "text", required: true, placeholder: "Example: Pack Station 14", extractor: "location" },
        { id: "inkType", label: "Ink Type", type: "text", required: false, placeholder: "Tell us the type of ink or toner, if known", extractor: "inkType" },
        { id: "inkStatus", label: "Is the ink out or getting low?", type: "select", required: false, options: ["", "Getting low", "Completely out"], extractor: "inkStatus" },
        { id: "requestedFor", label: "Requested For", type: "user", required: true, profileValue: "name", locked: true },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    },
    {
      id: "printer-connectivity",
      name: "Report an issue to Help Desk",
      description: "Report a printer, laptop, network, software, or workstation issue.",
      catalog: "IT Information",
      queue: "IT Help Desk",
      priority: "P3 - Normal",
      responseSlaHours: 4,
      resolutionSlaHours: 16,
      keywords: ["connect to printer", "printer not working", "printer issue", "cannot print", "can't print", "printer offline", "zebra printer", "laptop slow", "computer slow"],
      article: {
        title: "Try reconnecting to a network printer",
        summary: "Confirm the printer is online and note its printer name or IP address before submitting."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "printerName", label: "Printer Name or IP", type: "text", required: false, recommended: true, recommendedHint: "the exact printer name or IP helps IT resolve this faster", placeholder: "Example: PHX-PRN-22", extractor: "printerName" },
        { id: "workstation", label: "Warehouse or Workstation", type: "text", required: true, placeholder: "Example: PHX P-14", extractor: "location" },
        { id: "impact", label: "How is work affected?", type: "select", required: true, options: ["", "Work can continue", "Work is slowed", "One station is stopped", "Shipping is stopped"], extractor: "impact" },
        { id: "description", label: "Describe the Issue", type: "textarea", required: true, extractor: "description" },
        { id: "requestedFor", label: "Requested For", type: "user", required: true, profileValue: "name", locked: true },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    },
    {
      id: "equipment-out-of-service",
      name: "Equipment Out of Service",
      description: "Report material handling or facility equipment that is no longer usable.",
      catalog: "Facilities",
      queue: "Facilities",
      priority: "P2 - High",
      responseSlaHours: 1,
      resolutionSlaHours: 8,
      keywords: ["equipment out of service", "forklift", "mhe", "pallet jack", "equipment broken", "won't move", "will not move", "conveyor broken"],
      article: {
        title: "Safely tag equipment out of service",
        summary: "Stop using the equipment and apply the approved out-of-service tag. Do not attempt repairs unless authorized."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "description", label: "Describe the Request", type: "textarea", required: true, extractor: "description" },
        { id: "requestedFor", label: "Requested for User", type: "user", required: true, profileValue: "name", locked: true },
        { id: "ccUser", label: "CC or Tag User", type: "user", required: false },
        { id: "location", label: "Location", type: "text", required: true, extractor: "location" },
        { id: "urgency", label: "Urgency", type: "select", required: false, options: ["", "Low", "Medium", "High", "Work stopped"], extractor: "urgency" },
        { id: "issue", label: "What is the issue?", type: "text", required: true, extractor: "shortDescription" },
        { id: "mheNumber", label: "MHE Number", type: "text", required: true, placeholder: "Example: FL-24", extractor: "assetNumber" },
        { id: "mheLocation", label: "Where is the MHE located?", type: "text", required: true, extractor: "location" },
        { id: "lastUser", label: "Who was using the equipment last?", type: "user", required: true },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    },
    {
      id: "corrective-action-warehouse",
      name: "Corrective Action (Warehouse)",
      description: "Create a warehouse corrective action for an operational error, repeat issue, or customer concern.",
      catalog: "Quality",
      queue: "Quality - Warehouse",
      priority: "P3 - Normal",
      responseSlaHours: 8,
      resolutionSlaHours: 72,
      keywords: ["corrective action", "warehouse corrective", "warehouse error", "repeat issue", "root cause", "customer concern warehouse"],
      article: {
        title: "What belongs in a warehouse corrective action",
        summary: "Include the observed problem, order or customer impact, containment already completed, and supporting evidence."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "description", label: "Describe the Request", type: "textarea", required: true, extractor: "description" },
        { id: "requestedFor", label: "Requested for User", type: "user", required: true, profileValue: "name", locked: true },
        { id: "ccUser", label: "CC or Tag User", type: "user", required: false },
        { id: "pendingOrder", label: "Pending Order", type: "select", required: true, options: ["", "Yes", "No"], extractor: "pendingOrder" },
        { id: "customerNumber", label: "Customer Number", type: "text", required: false, extractor: "customerNumber" },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    },
    {
      id: "stock-check-phoenix",
      name: "Stock Check Phoenix",
      description: "Request physical verification of stock in the Phoenix distribution center.",
      catalog: "DC Connect",
      queue: "DC Connect - Phoenix",
      priority: "P3 - Normal",
      responseSlaHours: 4,
      resolutionSlaHours: 16,
      keywords: ["stock check", "check stock", "verify inventory", "inventory verification", "date code check", "packaging check", "count parts", "phoenix stock"],
      article: {
        title: "Prepare a stock check request",
        summary: "Provide the exact part number and say whether you need quantity, date code, condition, or packaging verified."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "description", label: "Describe the Request", type: "textarea", required: true, extractor: "description" },
        { id: "requestedFor", label: "Requested for User", type: "user", required: true, profileValue: "name", locked: true },
        { id: "ccUser", label: "CC or Tag User", type: "user", required: false },
        { id: "stockCheckType", label: "Stock Check Type", type: "select", required: true, options: ["", "Count", "Date codes", "Condition", "Packaging", "Full verification"], extractor: "stockCheckType" },
        { id: "partNumber", label: "Part Number", type: "text", required: true, extractor: "partNumber" },
        { id: "controlNumber", label: "Control or Order Number", type: "text", required: false, extractor: "orderNumber" },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    },
    {
      id: "systems-intake",
      name: "Systems Intake",
      description: "Report an issue or enhancement for MERP, OMS, SYQ, API, EDI, or an internal website.",
      catalog: "Business Enablement",
      queue: "Business Enablement - Systems Intake",
      priority: "P3 - Normal",
      responseSlaHours: 8,
      resolutionSlaHours: 72,
      keywords: ["merp", "oms", "syq", "edi", "api issue", "internal website", "system enhancement", "business system", "order entry system"],
      article: {
        title: "Systems intake: incident or enhancement?",
        summary: "Choose Issue when something is not working as designed. Choose Enhancement for a new capability or process change."
      },
      fields: [
        { id: "system", label: "Affected System", type: "select", required: true, options: ["", "MERP", "OMS", "SYQ", "API", "EDI", "Website", "Other"], extractor: "system" },
        { id: "requestKind", label: "Request Type", type: "select", required: true, options: ["", "Issue", "Enhancement", "Access", "Data correction"], extractor: "requestKind" },
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "description", label: "Describe the Request", type: "textarea", required: true, extractor: "description" },
        { id: "impact", label: "Business Impact", type: "select", required: true, options: ["", "Low", "Medium", "High", "Shipping or order processing stopped"], extractor: "impact" },
        { id: "requestedFor", label: "Requested For", type: "user", required: true, profileValue: "name", locked: true },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    },
    {
      id: "facilities-hvac",
      name: "HVAC",
      description: "Report a problem with air conditioning or heating.",
      catalog: "Facilities",
      queue: "Facilities",
      priority: "P3 - Normal",
      responseSlaHours: 4,
      resolutionSlaHours: 24,
      keywords: ["hvac", "air conditioning", "ac broken", "too hot", "too cold", "heating", "temperature issue"],
      article: null,
      fields: [
        { id: "location", label: "Location", type: "text", required: true, extractor: "location" },
        { id: "issueType", label: "What is happening?", type: "select", required: true, options: ["", "Too hot", "Too cold", "No airflow", "Leak or unusual noise", "Other"] },
        { id: "description", label: "Describe the Issue", type: "textarea", required: true, extractor: "description" },
        { id: "requestedFor", label: "Requested For", type: "user", required: true, profileValue: "name", locked: true }
      ]
    },
    {
      id: "general-triage",
      name: "General Request - Needs Triage",
      description: "Use when MasterFlow cannot safely match an existing request type.",
      catalog: "Business Enablement",
      queue: "Megan Delia - Triage",
      priority: "P3 - Normal",
      responseSlaHours: 4,
      resolutionSlaHours: 48,
      keywords: [],
      article: null,
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "description", label: "Tell us what you need", type: "textarea", required: true, extractor: "description" },
        { id: "businessArea", label: "Which area seems closest?", type: "select", required: false, options: ["", "Accounting", "Business Systems", "Facilities", "IT", "Logistics", "Quality", "Warehouse", "Other"] },
        { id: "requestedFor", label: "Requested For", type: "user", required: true, profileValue: "name", locked: true },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readOverrides() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch (error) {
      console.warn("Template overrides were reset because they could not be read.", error);
      window.localStorage.removeItem(STORAGE_KEY);
      return {};
    }
  }

  function getAll() {
    const overrides = readOverrides();
    return baseTemplates.map((template) => ({ ...clone(template), ...(overrides[template.id] || {}) }));
  }

  function get(id) {
    return getAll().find((template) => template.id === id) || getAll().find((template) => template.id === "general-triage");
  }

  function save(template) {
    const overrides = readOverrides();
    const base = baseTemplates.find((item) => item.id === template.id);
    if (!base) throw new Error("Unknown template");
    overrides[template.id] = clone(template);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent("masterflow:templates", { detail: getAll() }));
    return get(template.id);
  }

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY);
    return getAll();
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function score(text, template) {
    const input = normalize(text);
    if (!input || !template.keywords.length) return 0;
    return template.keywords.reduce((total, phrase) => {
      const normalizedPhrase = normalize(phrase);
      if (input.includes(normalizedPhrase)) return total + 14 + normalizedPhrase.split(" ").length * 3;
      const matches = normalizedPhrase.split(" ").filter((word) => word.length > 2 && input.includes(word)).length;
      return total + matches * 2;
    }, 0);
  }

  function classify(text) {
    const templates = getAll().filter((template) => template.id !== "general-triage");
    const ranked = templates.map((template) => ({ template, score: score(text, template) })).sort((a, b) => b.score - a.score);
    const first = ranked[0] || { template: get("general-triage"), score: 0 };
    const second = ranked[1] || { score: 0 };
    const threshold = Number(Store.getState().settings.ticketClassificationThreshold || 70);
    if (first.score < 8) {
      return {
        template: get("general-triage"),
        confidence: 42,
        threshold,
        reason: "No existing request type matched with enough confidence, so Business Enablement will confirm the route.",
        ranked: ranked.slice(0, 4)
      };
    }
    const separation = Math.max(0, first.score - second.score);
    const confidence = Math.min(98, Math.max(58, 64 + Math.round(first.score * 1.2) + Math.min(10, separation)));
    return {
      template: confidence < threshold ? get("general-triage") : first.template,
      suggestedTemplate: first.template,
      confidence,
      threshold,
      reason: confidence < threshold
        ? `${first.template.name} was the closest match, but ${confidence}% is below the ${threshold}% safe-routing threshold.`
        : `The description matched the ${first.template.name} request definition and its routing phrases.`,
      ranked: ranked.slice(0, 4)
    };
  }

  function severityOf(text) {
    const blocked = /\b(cannot|can't|won't|unable to)\b[^.]{0,20}\b(print|ship|scan|pick|pack|process|move|start|manifest|work)\b|\bnot working\b|\bcompletely (down|out|stopped)\b|\bfully down\b/i;
    const degraded = /\bjam(?:ming|med)?\b|\bintermittent\b|\bon and off\b|\bsometimes\b|\bslow(?:ed)?\b|\bdelay(?:ed)?\b|\banother (?:printer|one|unit|station|machine) is (?:available|working)\b|\bbackup (?:printer|unit)\b|\bworkaround\b/i;
    const low = /\brunning low\b|\bgetting low\b|\blow on (?:ink|toner|supplies)\b|\balmost out\b|\bminor\b|\bsmall issue\b|\bnot urgent\b/i;
    if (blocked.test(text)) return "blocked";
    if (degraded.test(text)) return "degraded";
    if (low.test(text)) return "low";
    return "";
  }

  function pickOptionForSeverity(options, severity) {
    const choices = (options || []).filter(Boolean).filter((option) => !/ship/i.test(option));
    if (!choices.length || !severity) return "";
    const rankByLevel = {
      blocked: [/^high$/i, /work stopped/i, /station is stopped/i, /stopped$/i],
      degraded: [/^medium$/i, /slow/i],
      low: [/^low$/i, /can continue/i]
    };
    for (const pattern of rankByLevel[severity] || []) {
      const match = choices.find((option) => pattern.test(option));
      if (match) return match;
    }
    return "";
  }

  function extract(text, field) {
    const input = String(text || "").trim();
    const lower = input.toLowerCase();
    const profile = Store.CURRENT_USER;
    if (field.profileValue && profile[field.profileValue]) return { value: profile[field.profileValue], source: "profile" };

    const extractors = {
      shortDescription: () => input.replace(/\s+/g, " ").slice(0, 110),
      description: () => input,
      location: () => {
        const match = input.match(/(?:at|near|by|in|located at)\s+([a-z0-9][a-z0-9\s#-]{2,60})/i);
        return match ? match[1].replace(/[.,]$/, "") : "";
      },
      printerName: () => {
        const match = input.match(/\b(?:SM|PHX|CHI|WI|TO)[A-Z0-9-]*PR\d+\b/i) || input.match(/\b(?:Zebra|Brother|HP|Lexmark)\s+[A-Z0-9-]+\b/i);
        return match ? match[0] : "";
      },
      inkType: () => /toner/i.test(input) ? "Toner" : (/ink/i.test(input) ? "Ink / cartridge" : ""),
      inkStatus: () => /completely out|out of (?:ink|toner)|ink is out|toner is out/i.test(input) ? "Completely out" : (/low|getting low/i.test(input) ? "Getting low" : ""),
      impact: (field) => pickOptionForSeverity(field && field.options, severityOf(input)),
      urgency: (field) => pickOptionForSeverity(field && field.options, severityOf(input)),
      assetNumber: () => {
        const match = input.match(/\b(?:FL|MHE|PJ|FORKLIFT)[-\s]?\d{1,6}\b/i);
        return match ? match[0].toUpperCase().replace(/\s+/, "-") : "";
      },
      pendingOrder: () => /pending order|order pending|open order/i.test(input) ? "Yes" : "",
      customerNumber: () => {
        const match = input.match(/\b[A-Z]{2,4}\d{2,6}\b/);
        return match ? match[0] : "";
      },
      partNumber: () => {
        const match = input.match(/(?:part(?: number)?\s*[:#-]?\s*)([A-Z0-9-]{3,20})/i);
        return match ? match[1] : "";
      },
      orderNumber: () => {
        const match = input.match(/(?:order|ctrl|control)(?: number)?\s*[:#-]?\s*([A-Z0-9-]{3,24})/i);
        return match ? match[1] : "";
      },
      stockCheckType: () => /date code/i.test(input) ? "Date codes" : (/packag/i.test(input) ? "Packaging" : (/condition/i.test(input) ? "Condition" : (/count|quantity/i.test(input) ? "Count" : ""))),
      system: () => ["MERP", "OMS", "SYQ", "EDI", "API"].find((name) => lower.includes(name.toLowerCase())) || (lower.includes("website") ? "Website" : ""),
      requestKind: () => /enhancement|improve|new capability/i.test(input) ? "Enhancement" : (/access/i.test(input) ? "Access" : "Issue")
    };

    const value = field.extractor && extractors[field.extractor] ? extractors[field.extractor](field) : "";
    return { value, source: value ? "description" : "" };
  }

  window.MasterFlowTemplates = {
    STORAGE_KEY,
    getAll,
    get,
    save,
    reset,
    classify,
    extract
  };
})();
