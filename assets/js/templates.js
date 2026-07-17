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
      description: "Report a printer, network, software, or workstation issue.",
      catalog: "IT Information",
      queue: "IT Help Desk",
      priority: "P3 - Normal",
      responseSlaHours: 4,
      resolutionSlaHours: 16,
      keywords: ["connect to printer", "printer not working", "printer issue", "cannot print", "can't print", "printer offline", "zebra printer"],
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
      id: "laptop-performance",
      name: "Laptop or Computer Performance Issue",
      description: "Report a slow, freezing, or unresponsive laptop or desktop computer.",
      catalog: "IT Information",
      queue: "IT Help Desk",
      priority: "P3 - Normal",
      responseSlaHours: 4,
      resolutionSlaHours: 16,
      keywords: ["laptop slow", "computer slow", "pc slow", "slow laptop", "slow computer", "laptop freezing", "computer freezing", "laptop performance", "computer performance"],
      article: {
        title: "Before you submit a slow-laptop request",
        summary: "Save your work and restart the laptop once. If the problem continues, MasterFlow will gather what IT needs to begin work."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "assetNumber", label: "Laptop or Asset Number", type: "text", required: false, recommended: true, recommendedHint: "the asset number or device name helps IT resolve this faster", placeholder: "Example: PHX-LT-118", extractor: "assetNumber" },
        { id: "description", label: "Describe the Issue", type: "textarea", required: true, extractor: "description" },
        { id: "requestedFor", label: "Requested For", type: "user", required: true, profileValue: "name", locked: true },
        { id: "attachments", label: "Attachments", type: "attachment", required: false }
      ]
    },
    {
      id: "receiving-scanner-issue",
      name: "Receiving Scanner Issue",
      description: "Report a handheld, station-mounted, or wireless scanner that is not working correctly.",
      catalog: "IT Information",
      queue: "IT Help Desk",
      priority: "P3 - Normal",
      responseSlaHours: 4,
      resolutionSlaHours: 16,
      keywords: ["scanner not reading", "scanner issue", "barcode scanner", "scanner disconnected", "scanner error", "receiving scanner", "handheld scanner issue"],
      article: {
        title: "Before you submit a scanner request",
        summary: "Confirm the scanner has power and try a known-good barcode to separate a label issue from a device issue."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "location", label: "Receiving Area or Work Location", type: "text", required: true, placeholder: "Example: Receiving Dock B", extractor: "location" },
        { id: "assetNumber", label: "Scanner Asset Number", type: "text", required: false, recommended: true, recommendedHint: "the asset number helps IT locate the exact device", placeholder: "Example: SCN-204", extractor: "assetNumber" },
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
      id: "shared-folder-access",
      name: "Shared Folder or Drive Access",
      description: "Request new, changed, or restored access to a shared folder, drive, or SharePoint site.",
      catalog: "Business Enablement",
      queue: "Business Enablement - Systems Intake",
      priority: "P3 - Normal",
      responseSlaHours: 8,
      resolutionSlaHours: 48,
      keywords: ["shared folder", "shared drive", "network drive", "file share", "sharepoint access", "folder access", "drive access", "folder permission"],
      article: {
        title: "Before you request folder access",
        summary: "Know the exact folder or site name, the access level you need, and the business reason. MasterFlow will confirm the rest."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        { id: "resourceName", label: "Folder, Drive, or Site", type: "text", required: true, placeholder: "Example: Sales shared folder", extractor: "resourceName" },
        { id: "accessLevel", label: "Access Level Needed", type: "select", required: true, options: ["", "View only", "Edit", "Upload", "Full control", "Not sure"], extractor: "accessLevel" },
        { id: "businessReason", label: "Business Reason", type: "textarea", required: true, placeholder: "Why is this access needed?" },
        { id: "ccUser", label: "Requesting On Behalf Of (optional)", type: "user", required: false },
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
      id: "new-it-hardware",
      name: "New IT Hardware Request",
      description: "Request a new, additional, or replacement scanner, laptop, monitor, printer, or other IT-managed hardware.",
      catalog: "IT Information",
      queue: "IT Information",
      priority: "P3 - Normal",
      responseSlaHours: 8,
      resolutionSlaHours: 72,
      keywords: [
        "new scanner",
        "need a scanner",
        "need new scanner",
        "scanner request",
        "additional scanner",
        "replacement scanner",
        "replace scanner",
        "new barcode scanner",
        "barcode scanner request",
        "new handheld scanner",
        "handheld scanner request",
        "new laptop",
        "replacement laptop",
        "new monitor",
        "replacement monitor",
        "new printer",
        "replacement printer",
        "new hardware",
        "replacement hardware",
        "need equipment",
        "need new equipment"
      ],
      article: {
        title: "Prepare a new hardware request",
        summary: "Provide the device type, location, quantity, business reason, and estimated cost when known. If cost is unknown, MasterFlow will flag that a quote is required."
      },
      fields: [
        { id: "shortDescription", label: "Short Description", type: "text", required: true, extractor: "shortDescription" },
        {
          id: "hardwareType",
          label: "Hardware Type",
          type: "select",
          required: true,
          options: ["", "Scanner", "Barcode scanner", "Handheld scanner", "Laptop", "Monitor", "Printer", "Other"],
          extractor: "hardwareType"
        },
        {
          id: "requestPurpose",
          label: "Request Purpose",
          type: "select",
          required: true,
          options: ["", "New / additional device", "Replacement device", "Shared team device", "Not sure"],
          extractor: "requestPurpose"
        },
        {
          id: "location",
          label: "Location or Work Area",
          type: "text",
          required: true,
          placeholder: "Example: Packaging Line 2",
          extractor: "hardwareLocation"
        },
        {
          id: "quantity",
          label: "Quantity Needed",
          type: "number",
          required: true,
          extractor: "quantity"
        },
        {
          id: "businessReason",
          label: "Business Reason",
          type: "textarea",
          required: true,
          placeholder: "What work will this hardware support, restore, or improve?"
        },
        {
          id: "costEstimateStatus",
          label: "Cost Estimate Status",
          type: "select",
          required: true,
          options: ["", "Estimated cost provided", "Quote required"],
          extractor: "costEstimateStatus"
        },
        {
          id: "estimatedCost",
          label: "Estimated Cost",
          type: "number",
          required: false,
          placeholder: "Leave blank when a quote is required",
          extractor: "estimatedCost"
        },
        {
          id: "replacementAsset",
          label: "Existing Asset or Scanner Number",
          type: "text",
          required: false,
          recommended: true,
          recommendedHint: "include the current asset number when this is a replacement",
          placeholder: "Example: SCN-204"
        },
        { id: "requestedFor", label: "Requested For", type: "user", required: true, profileValue: "name", locked: true },
        { id: "attachments", label: "Attachments or Quote", type: "attachment", required: false }
      ]
    },
    {
      id: "general-triage",
      name: "General Request - Needs Triage",
      description: "Use when MasterFlow cannot safely match an existing request type.",
      catalog: "Business Enablement",
      queue: "Enterprise Triage",
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
/*
   * Diagnostic profiles define what the receiving team
   * needs before a request is considered workable.
   *
   * templates.js owns the configuration.
   * request-engine.js will decide what is already known
   * and which question should be asked next.
   */
    /*
   * Common shorthand employees may enter.
   *
   * These phrases help MasterFlow identify the correct
   * request type before the diagnostic conversation begins.
   */
  const classificationAliases = {
    "printer-ink": [
      "printer supply",
      "need toner",
      "toner low",
      "low toner",
      "out of toner",
      "toner out",
      "need ink",
      "ink low",
      "low ink",
      "out of ink",
      "ink out",
      "need ribbon",
      "ribbon low",
      "out of ribbon",
      "replace cartridge",
      "printer cartridge"
    ],

    "printer-connectivity": [
      "printer stopped working",
      "printer stopped",
      "printer does not work",
      "printer not working",
      "printer is broken",
      "printer broken",
      "printer will not print",
      "printer wont print",
      "will not print",
      "nothing printed",
      "nothing is coming out",
      "nothing comes out",
      "printer not responding",
      "printer is not responding",
      "printer keeps jamming",
      "keeps jamming",
      "printer light not turning on",
      "printer no lights",
      "no lights on the printer",
      "label printer",
      "label printer not responding",
      "packaging printer",
      "packaging printer issue",
      "work printer",
      "work printer stopped",
      "printer issue",
      "printer problem",
      "keeps eating the labels",
      "eating the labels",
      "paper jam",
      "printer jam",
      "jammed printer",
      "paper feed problem",
      "printer won't feed",
      "printer will not feed",
      "printer offline",
      "printer disconnected",
      "printer won't turn on",
      "printer will not turn on",
      "no power to printer",
      "printer no power",
      "print job stuck",
      "job stuck in queue",
      "nothing prints",
      "printer error",
      "printer error message",
      "blank print",
      "prints blank",
      "faded print",
      "streaked print",
      "poor print quality"
    ],

    "laptop-performance": [
      "laptop running slow",
      "computer running slow",
      "running slow",
      "runs slow",
      "runs slowly",
      "laptop slow",
      "laptop is slow",
      "my laptop is slow",
      "computer slow",
      "computer is slow",
      "my computer is slow",
      "pc slow",
      "pc is slow",
      "machine is slow",
      "system is slow",
      "slow laptop",
      "slow computer",
      "slow pc",
      "slow performance",
      "so slow",
      "too slow",
      "laptop freezing",
      "computer freezing",
      "laptop keeps freezing",
      "computer keeps freezing",
      "laptop is frozen",
      "computer is frozen"
    ],

    "receiving-scanner-issue": [
      "scanner will not read",
      "scanner does not read",
      "will not read anything",
      "does not read anything",
      "not reading",
      "cannot read",
      "reads nothing",
      "scanner not working",
      "scanner issue",
      "barcode scanner not working",
      "scanner won't scan",
      "scanner will not scan",
      "scanner disconnected",
      "scanner error",
      "scanner broken",
      "scanner is broken",
      "scanner is not working",
      "scanner does not work",
      "receiving scanner is not reading",
      "receiving scanner will not read",
      "scanner at receiving"
    ],

    "equipment-out-of-service": [
      "conveyor stopped",
      "conveyor is stopped",
      "conveyor not moving",
      "conveyor not running",
      "belt stopped",
      "strange noise",
      "unusual noise",
      "weird noise",
      "loud noise",
      "grinding noise",
      "rattling noise",
      "making a noise",
      "making noise",
      "equipment noise",
      "machine stopped",
      "equipment stopped",
      "forklift issue",
      "forklift broken",
      "forklift won't start",
      "forklift will not start",
      "forklift won't move",
      "forklift will not move",
      "forklift won't lift",
      "forklift will not lift",
      "pallet jack issue",
      "pallet jack broken",
      "conveyor issue",
      "conveyor broken",
      "mhe issue",
      "mhe broken",
      "equipment leaking",
      "forklift leaking",
      "brake problem",
      "steering problem",
      "battery problem",
      "charging problem"
    ],

    "corrective-action-warehouse": [
      "damaged material",
      "received damaged",
      "damaged goods",
      "material damaged",
      "arrived damaged",
      "damaged on arrival",
      "received the wrong",
      "received wrong",
      "wrong item",
      "wrong part",
      "wrong quantity",
      "missing quantity",
      "packaging error",
      "wrong packaging",
      "wrong label",
      "labeling error",
      "shipping error",
      "warehouse error",
      "damaged shipment",
      "damaged product",
      "customer complaint",
      "repeat issue",
      "recurring issue"
    ],

    "stock-check-phoenix": [
      "verify the date code",
      "verify date code",
      "check the date code",
      "confirm the date code",
      "confirm date code",
      "check date code",
      "date code",
      "stock check",
      "check stock",
      "inventory check",
      "inventory verification",
      "date code check",
      "check date codes",
      "verify date codes",
      "quantity check",
      "verify quantity",
      "count inventory",
      "condition check",
      "packaging check",
      "verify packaging",
      "check part"
    ],

    "systems-intake": [
      "oms issue",
      "oms not updating",
      "oms not refreshing",
      "merp issue",
      "merp not updating",
      "syq issue",
      "edi issue",
      "api issue",
      "website issue",
      "system issue",
      "system not updating",
      "system not refreshing",
      "data correction",
      "system enhancement"
    ],

    "shared-folder-access": [
      "shared folder",
      "shared drive",
      "network drive",
      "file share",
      "shared sales folder",
      "access to the shared",
      "access to a shared",
      "access to shared",
      "folder access",
      "drive access",
      "need access to",
      "need access to the",
      "request access to",
      "access request",
      "sharepoint access",
      "permission to the folder",
      "folder permission"
    ],

    "facilities-hvac": [
      "ac broken",
      "ac is broken",
      "ac broke",
      "air conditioner broken",
      "air conditioning broken",
      "freezing",
      "freezing in here",
      "no heat",
      "no ac",
      "hvac issue",
      "ac issue",
      "ac broken",
      "air conditioning broken",
      "heater issue",
      "heating issue",
      "too hot",
      "too cold",
      "no airflow",
      "vent not working",
      "vent leaking",
      "hvac leak",
      "burning smell from vent",
      "temperature issue"
    ],

    "new-it-hardware": [
      "i need a new scanner",
      "need a new scanner",
      "need another scanner",
      "need additional scanner",
      "need replacement scanner",
      "replace the scanner",
      "replacement barcode scanner",
      "new barcode scanner",
      "new handheld scanner",
      "hardware request",
      "new hardware request",
      "need a new laptop",
      "need another laptop",
      "need a new monitor",
      "need another monitor",
      "need a new printer",
      "need another printer",
      "need new equipment",
      "request new equipment"
    ],

    "general-triage": []
  };
  const diagnosticProfiles = {
    "printer-ink": {
      requiredForWork: [
        "supplyStatus",
        "printingImpact"
      ],

      suggestedFirstAction:
        "Confirm the printer identity and compatible supply, then replenish or replace the requested ink, toner, ribbon, or cartridge.",

      questions: [
        {
          id: "supplyStatus",
          label: "Supply status",
          reportLabel:
            "Current supply condition",

          question:
            "Is the printer supply getting low, or is it completely out?",

          why:
            "This tells IT whether the request is preventive or whether printing may already be unavailable.",

          type: "select",

          options: [
            "Getting low",
            "Completely out",
            "Not sure"
          ],

          signals: {
            "Getting low": [
              "running low",
              "getting low",
              "low on ink",
              "low on toner",
              "almost out"
            ],

            "Completely out": [
              "completely out",
              "out of ink",
              "out of toner",
              "no ink",
              "no toner"
            ]
          }
        },

        {
          id: "printingImpact",
          label: "Printing impact",
          reportLabel:
            "Current printing impact",

          question:
            "Can the station still print, or has printing stopped?",

          why:
            "This helps the receiving team prioritize the request correctly.",

          type: "select",

          options: [
            "Still printing",
            "Printing is stopped",
            "Using another printer",
            "Not sure"
          ],

          signals: {
            "Still printing": [
              "still printing",
              "can still print"
            ],

            "Printing is stopped": [
              "cannot print",
              "can't print",
              "printing stopped",
              "won't print"
            ],

            "Using another printer": [
              "another printer",
              "backup printer",
              "using a different printer"
            ]
          }
        }
      ]
    },

    "printer-connectivity": {
      requiredForWork: [
        "symptom",
        "affectedScope"
      ],

      suggestedFirstAction:
        "Begin with the reported symptom, verify power and connectivity, then check the shared print queue, device, network, or affected application.",

      questions: [
         {
          id: "symptom",
          label: "Observed symptom",

          reportLabel:
            "Observed printer behavior",

          question:
            "Which best describes the printer problem?",

          why:
            "This identifies the correct request path and gives the receiving team a useful troubleshooting starting point.",

          type: "select",

          options: [
            "No power or lights",
            "Offline or disconnected",
            "Print job sends but nothing prints",
            "Paper jam or feed problem",
            "Ink, toner, or ribbon is getting low",
            "Ink, toner, or ribbon is completely out",
            "Print is blank, faded, streaked, or incorrect",
            "Error message or something else"
          ],

          signals: {
            "No power or lights": [
              "no power",
              "no lights",
              "won't turn on",
              "will not turn on",
              "does not turn on"
            ],

            "Offline or disconnected": [
              "offline",
              "disconnected",
              "not connected"
            ],

            "Print job sends but nothing prints": [
              "job sends but nothing prints",
              "nothing prints",
              "print job stuck",
              "stays in the queue",
              "stuck in the queue"
            ],

            "Paper jam or feed problem": [
              "paper jam",
              "jamming",
              "won't feed",
              "will not feed",
              "feed problem"
            ],

            "Ink, toner, or ribbon is getting low": [
              "running low",
              "getting low",
              "low on ink",
              "low on toner",
              "low on ribbon",
              "almost out"
            ],

            "Ink, toner, or ribbon is completely out": [
              "completely out",
              "out of ink",
              "out of toner",
              "out of ribbon",
              "no ink",
              "no toner",
              "no ribbon"
            ],

            "Print is blank, faded, streaked, or incorrect": [
              "blank print",
              "prints blank",
              "faded",
              "streaked",
              "poor print quality",
              "wrong color",
              "incorrect print"
            ],

            "Error message or something else": [
              "error message",
              "error code",
              "printer error"
            ]
          }
        },
        {
          id: "affectedScope",
          label: "Affected scope",
          reportLabel:
            "Who or what is affected",

          question:
            "Is this affecting only you, one station or device, or multiple users?",

          why:
            "Scope helps the Help Desk distinguish an individual device problem from a wider service issue.",

          type: "select",

          options: [
            "Only me",
            "One station or device",
            "Multiple users or stations",
            "Not sure"
          ],

          signals: {
            "Only me": [
              "only me",
              "just me"
            ],

            "One station or device": [
              "one station",
              "this station",
              "my station",
              "only my station",
              "just my station",
              "my workstation",
              "one printer",
              "this printer"
            ],

            "Multiple users or stations": [
              "multiple users",
              "multiple stations",
              "everyone",
              "all users",
              "whole area"
            ]
          }
        }
      ]
    },

    "laptop-performance": {
      requiredForWork: [
        "scopeOfSlowness",
        "startTime",
        "currentImpact",
        "symptomDetail",
        "restarted"
      ],

      suggestedFirstAction:
        "Confirm what feels slow, when it began, and current impact, then restart the device once and check CPU, memory, storage, and pending updates before escalating.",

      questions: [
        {
          id: "scopeOfSlowness",
          label: "What feels slow",
          reportLabel: "What feels slow",
          question: "What feels slow?",
          why: "This separates a single misbehaving application from a whole-device or network problem.",
          type: "select",
          options: ["Everything", "One application", "Internet or network", "Startup or login", "Not sure"],
          signals: {
            "Everything": ["everything is slow", "whole laptop is slow", "whole computer is slow", "entire laptop", "entire computer"],
            "One application": ["one application", "one app", "specific application", "specific program"],
            "Internet or network": ["internet is slow", "network is slow", "wifi is slow", "browsing is slow"],
            "Startup or login": ["slow to start", "slow startup", "slow to log in", "slow login", "slow boot"]
          }
        },
        {
          id: "startTime",
          label: "When it began",
          reportLabel: "When the slowness began",
          question: "When did it begin?",
          why: "This helps IT correlate the problem with a recent update, event, or gradual decline.",
          type: "select",
          options: ["Today", "Within the last few days", "More than a week ago", "It has gradually become worse", "Not sure"],
          signals: {
            "Today": ["started today", "since today", "this morning"],
            "Within the last few days": ["last few days", "past few days", "since yesterday"],
            "More than a week ago": ["more than a week", "for weeks", "for a while"],
            "It has gradually become worse": ["gradually", "getting worse", "slowly gotten worse"]
          }
        },
        {
          id: "currentImpact",
          label: "Current impact",
          reportLabel: "Business impact",
          question: "What is the current impact on your work?",
          why: "Impact determines how urgently this needs to be worked.",
          type: "select",
          options: ["Inconvenient but I can work", "Work is significantly slowed", "I cannot complete my work", "Multiple employees are affected"],
          signals: {
            "I cannot complete my work": ["cannot work", "can't work", "completely blocked", "unable to work"],
            "Work is significantly slowed": ["significantly slowed", "really slowing me down", "major delay"],
            "Multiple employees are affected": ["multiple employees", "several employees", "the whole team", "everyone on the team"]
          }
        },
        {
          id: "symptomDetail",
          label: "Freezing, crashing, or errors",
          reportLabel: "Freezing, crashing, overheating, or errors",
          question: "Does the device freeze, crash, overheat, or show an error?",
          why: "These symptoms point to different root causes and may require an immediate safety precaution.",
          type: "select",
          options: ["No freezing or crashing", "It freezes", "It crashes or restarts unexpectedly", "It overheats", "It shows an error message", "Not sure"],
          signals: {
            "It freezes": ["freezes", "freezing", "locks up", "locking up"],
            "It crashes or restarts unexpectedly": ["crashes", "crashing", "restarts on its own", "reboots on its own", "shuts down on its own"],
            "It overheats": ["overheats", "overheating", "very hot", "too hot to touch"],
            "It shows an error message": ["error message", "error code", "blue screen"]
          }
        },
        {
          id: "restarted",
          label: "Restarted already",
          reportLabel: "Whether the device has been restarted",
          question: "Have you restarted the laptop?",
          why: "A restart rules out a large set of common, low-effort causes before IT investigates further.",
          type: "select",
          options: ["Yes, it did not help", "Yes, it helped temporarily", "No, not yet"],
          signals: {
            "Yes, it did not help": ["restarted", "already restarted", "rebooted", "already rebooted", "tried restarting"],
            "No, not yet": ["have not restarted", "haven't restarted", "not restarted yet"]
          }
        }
      ]
    },

    "receiving-scanner-issue": {
      requiredForWork: [
        "equipmentType",
        "symptomDetail",
        "scopeOfImpact",
        "startTime"
      ],

      suggestedFirstAction:
        "Confirm the scanner type and exact symptom, then verify power, connection, and a known-good barcode before escalating.",

      questions: [
        {
          id: "equipmentType",
          label: "Scanner type",
          reportLabel: "Scanner type",
          question: "What type of scanner is affected?",
          why: "Not every scanner belongs to a numbered station — this identifies the correct equipment context.",
          type: "select",
          options: ["Handheld scanner", "Station-mounted scanner", "Scanner connected to a computer", "Mobile or wireless scanner", "Not sure"],
          signals: {
            "Handheld scanner": ["handheld", "hand held", "hand-held", "handheld scanner"],
            "Station-mounted scanner": ["station-mounted", "station mounted", "mounted at the station", "fixed scanner", "fixed-mount"],
            "Scanner connected to a computer": ["connected to a computer", "connected to my computer", "plugged into a computer", "usb scanner", "wired to"],
            "Mobile or wireless scanner": ["wireless scanner", "mobile scanner", "bluetooth scanner", "wifi scanner", "cordless scanner"]
          }
        },
        {
          id: "symptomDetail",
          label: "What happens when scanning",
          reportLabel: "Observed scanner behavior",
          question: "What happens when you scan?",
          why: "The exact symptom tells the receiving team whether this is a label, device, or connection problem.",
          type: "select",
          options: ["Nothing happens", "It beeps but no data appears", "It shows an error", "It reads the wrong value", "It disconnects", "It only fails on some labels", "Not sure"],
          signals: {
            "Nothing happens": ["nothing happens", "does nothing", "no response"],
            "It beeps but no data appears": ["beeps but no data", "beeps but nothing", "beep with no data"],
            "It shows an error": ["shows an error", "error message", "error code"],
            "It reads the wrong value": ["wrong value", "wrong number", "incorrect value", "reads incorrectly", "sends incorrect information"],
            "It disconnects": ["disconnects", "keeps disconnecting", "loses connection", "drops connection"],
            "It only fails on some labels": ["some labels", "certain labels", "only some barcodes", "some barcode types"]
          }
        },
        {
          id: "scopeOfImpact",
          label: "Scope",
          reportLabel: "Whether one or multiple scanners are affected",
          question: "Is one scanner affected, or multiple scanners?",
          why: "Multiple affected scanners may point to a shared system or network problem rather than one device.",
          type: "select",
          options: ["One scanner", "Multiple scanners", "Not sure"],
          signals: {
            "One scanner": ["one scanner", "just this scanner", "only this scanner", "a single scanner"],
            "Multiple scanners": ["multiple scanners", "several scanners", "all the scanners", "every scanner"]
          }
        },
        {
          id: "startTime",
          label: "When it began",
          reportLabel: "When the problem began",
          question: "When did the problem begin?",
          why: "This helps distinguish a new failure from an ongoing, known issue.",
          type: "select",
          options: ["Today", "Within the last few days", "More than a week ago", "Not sure"],
          signals: {
            "Today": ["started today", "since today", "this morning"],
            "Within the last few days": ["last few days", "past few days", "since yesterday"],
            "More than a week ago": ["more than a week", "for weeks", "for a while"]
          }
        }
      ]
    },

    "equipment-out-of-service": {
      requiredForWork: [
        "failureMode",
        "safetyStatus"
      ],

      suggestedFirstAction:
        "Confirm the equipment is safely removed from service, review the reported failure mode, and assign authorized Facilities or MHE support.",

      questions: [
        {
          id: "failureMode",
          label: "Equipment failure",
          reportLabel:
            "Observed equipment failure",

          question:
            "Which best describes what the equipment is doing?",

          why:
            "This gives Facilities the correct inspection path before arriving at the unit.",

          type: "select",

          options: [
            "Will not start",
            "Will not move",
            "Will not lift or lower",
            "Steering, brake, battery, or charging issue",
            "Leak, damage, alarm, or other"
          ],

          signals: {
            "Will not start": [
              "won't start",
              "will not start",
              "does not start"
            ],

            "Will not move": [
              "won't move",
              "will not move",
              "cannot move"
            ],

            "Will not lift or lower": [
              "won't lift",
              "will not lift",
              "won't lower",
              "will not lower"
            ],

            "Steering, brake, battery, or charging issue": [
              "steering",
              "brake",
              "battery",
              "charging"
            ],

            "Leak, damage, alarm, or other": [
              "leak",
              "damaged",
              "damage",
              "alarm",
              "error code"
            ]
          }
        },

        {
          id: "safetyStatus",
          label: "Safety and containment",
          reportLabel:
            "Safety or containment status",

          question:
            "Has the equipment been taken out of service, and is there any leak, damage, smoke, odor, or alarm?",

          why:
            "This confirms immediate containment without asking the requester to attempt a repair.",

          type: "select",

          options: [
            "Tagged out; no immediate hazard seen",
            "Tagged out; hazard or damage is present",
            "Not tagged out yet",
            "Not sure"
          ],

          signals: {
            "Tagged out; no immediate hazard seen": [
              "tagged out",
              "out of service tag",
              "removed from service"
            ],

            "Tagged out; hazard or damage is present": [
              "tagged out and leaking",
              "tagged out with damage",
              "smoke",
              "burning smell"
            ],

            "Not tagged out yet": [
              "not tagged",
              "still in service"
            ]
          }
        }
      ]
    },

    "corrective-action-warehouse": {
      requiredForWork: [
        "problemCategory",
        "containmentStatus"
      ],

      suggestedFirstAction:
        "Review the reported problem, affected order or customer, containment already completed, and supporting evidence before beginning root-cause analysis.",

      questions: [
        {
          id: "problemCategory",
          label: "Problem category",
          reportLabel:
            "Corrective action category",

          question:
            "Which best describes the warehouse problem?",

          why:
            "A consistent category improves triage, reporting, and recurring-issue analysis.",

          type: "select",

          options: [
            "Wrong part or quantity",
            "Packaging or labeling error",
            "Damage or condition issue",
            "Shipping or process error",
            "Repeat issue, customer concern, or other"
          ],

          signals: {
            "Wrong part or quantity": [
              "wrong part",
              "wrong quantity",
              "undershipped",
              "overshipped",
              "missing part"
            ],

            "Packaging or labeling error": [
              "packaging error",
              "wrong label",
              "labeling error"
            ],

            "Damage or condition issue": [
              "damaged",
              "damage",
              "condition issue"
            ],

            "Shipping or process error": [
              "shipping error",
              "process not followed",
              "warehouse error"
            ],

            "Repeat issue, customer concern, or other": [
              "repeat issue",
              "recurring",
              "customer complaint",
              "customer concern"
            ]
          }
        },

        {
          id: "containmentStatus",
          label: "Containment completed",
          reportLabel:
            "Immediate containment",

          question:
            "What immediate containment has already been completed?",

          why:
            "Quality needs to know what was protected or placed on hold before beginning the investigation.",

          type: "select",

          options: [
            "Order or shipment placed on hold",
            "Inventory isolated or recounted",
            "Customer or leadership notified",
            "No containment completed yet",
            "Not sure"
          ],

          signals: {
            "Order or shipment placed on hold": [
              "placed on hold",
              "shipment on hold",
              "order on hold"
            ],

            "Inventory isolated or recounted": [
              "inventory isolated",
              "quarantined",
              "recounted",
              "recount"
            ],

            "Customer or leadership notified": [
              "customer notified",
              "leadership notified",
              "manager notified"
            ],

            "No containment completed yet": [
              "no containment",
              "nothing done yet"
            ]
          }
        }
      ]
    },

    "stock-check-phoenix": {
      requiredForWork: [
        "resultNeeded"
      ],

      suggestedFirstAction:
        "Verify the requested stock attributes against the part number, then return the requested result with quantities, date codes, condition, packaging, or supporting photos as appropriate.",

      questions: [
        {
          id: "resultNeeded",
          label:
            "Required stock-check result",

          reportLabel:
            "Result the requester needs",

          question:
            "What result should the warehouse send back?",

          why:
            "This prevents the warehouse from receiving a vague request to simply check the part.",

          type: "select",

          options: [
            "Physical quantity by location",
            "Date codes with quantities",
            "Condition details or photos",
            "Packaging details or photos",
            "Full verification summary"
          ],

          signals: {
            "Physical quantity by location": [
              "physical quantity",
              "count by location",
              "quantity"
            ],

            "Date codes with quantities": [
              "date codes",
              "date code"
            ],

            "Condition details or photos": [
              "condition",
              "damaged"
            ],

            "Packaging details or photos": [
              "packaging",
              "package"
            ],

            "Full verification summary": [
              "full verification",
              "verify everything"
            ]
          }
        }
      ]
    },

    "systems-intake": {
      requiredForWork: [
        "expectedOutcome",
        "affectedScope"
      ],

      suggestedFirstAction:
        "Use the supplied example to reproduce the action, compare actual versus expected behavior, and identify whether the issue is isolated or affecting multiple users.",

      questions: [
        {
          id: "expectedOutcome",
          label: "Expected result",
          reportLabel:
            "Expected behavior",

          question:
            "What should the system do instead?",

          why:
            "Expected behavior helps Business Enablement distinguish a defect from an enhancement or process misunderstanding.",

          type: "textarea",
          options: []
        },

        {
          id: "affectedScope",
          label: "Affected scope",
          reportLabel:
            "Affected users or transactions",

          question:
            "Is this affecting one user or example, multiple users, or all transactions?",

          why:
            "Scope helps determine urgency and whether this may be a broader system incident.",

          type: "select",

          options: [
            "One user or one example",
            "Multiple users or examples",
            "All users or transactions",
            "Not sure"
          ],

          signals: {
            "One user or one example": [
              "only me",
              "one order",
              "one example"
            ],

            "Multiple users or examples": [
              "multiple users",
              "several users",
              "multiple orders"
            ],

            "All users or transactions": [
              "everyone",
              "all users",
              "all orders",
              "all transactions"
            ]
          }
        }
      ]
    },

    "shared-folder-access": {
      requiredForWork: [
        "accessSituation",
        "accessDuration"
      ],

      suggestedFirstAction:
        "Confirm whether this is new access, broken existing access, or a permission change, then verify the resource owner and grant the requested level.",

      questions: [
        {
          id: "accessSituation",
          label: "Access situation",
          reportLabel: "Type of access need",
          question: "Is this new access, access that stopped working, a different permission level, or access for someone else?",
          why: "This determines whether IT grants new permissions, repairs existing access, or confirms a request made on behalf of someone else.",
          type: "select",
          options: ["New access", "Existing access that stopped working", "Different permission level", "Access for another employee or team", "Not sure"],
          signals: {
            "New access": ["never had access", "don't have access", "do not have access", "new access", "first time"],
            "Existing access that stopped working": ["used to have access", "stopped working", "lost access", "no longer able to open", "worked before"],
            "Different permission level": ["change my access", "different permission", "upgrade my access", "more access", "higher level"],
            "Access for another employee or team": ["for another employee", "for my team", "for a coworker", "on behalf of", "for someone else"]
          }
        },
        {
          id: "accessDuration",
          label: "Duration needed",
          reportLabel: "Temporary or permanent access",
          question: "Is this temporary access or ongoing/permanent access?",
          why: "Temporary access should be reviewed and removed on a schedule; permanent access follows standard ongoing-access approval.",
          type: "select",
          options: ["Temporary", "Permanent", "Not sure"],
          signals: {
            "Temporary": ["temporary", "just for", "short term", "until", "for a project"],
            "Permanent": ["permanent", "ongoing", "indefinitely", "as part of my role"]
          }
        }
      ]
    },

    "facilities-hvac": {
      requiredForWork: [
        "affectedScope",
        "safetyConcern"
      ],

      suggestedFirstAction:
        "Inspect the reported area and condition, beginning with any leak, smoke, burning odor, electrical concern, or product-risk indication.",

      questions: [
        {
          id: "affectedScope",
          label: "Affected area",
          reportLabel:
            "Area affected",

          question:
            "Is this limited to one room or station, or is a larger area affected?",

          why:
            "The affected area helps Facilities identify the likely equipment zone and urgency.",

          type: "select",

          options: [
            "One room or station",
            "Several rooms or stations",
            "An entire department or warehouse area",
            "Not sure"
          ],

          signals: {
            "One room or station": [
              "one room",
              "one station",
              "this room"
            ],

            "Several rooms or stations": [
              "several rooms",
              "multiple stations",
              "several stations"
            ],

            "An entire department or warehouse area": [
              "whole area",
              "entire department",
              "entire warehouse",
              "all of packing"
            ]
          }
        },

        {
          id: "safetyConcern",
          label: "Safety concern",
          reportLabel:
            "Reported safety concern",

          question:
            "Is there any active leak, smoke, burning odor, electrical concern, or product risk?",

          why:
            "This identifies conditions that may require an urgent Facilities response.",

          type: "select",

          options: [
            "No immediate safety concern",
            "Active leak",
            "Smoke, burning odor, or electrical concern",
            "Product or temperature-sensitive material at risk",
            "Not sure"
          ],

          signals: {
            "No immediate safety concern": [
              "no safety concern",
              "no leak",
              "no smoke"
            ],

            "Active leak": [
              "active leak",
              "leaking",
              "water leak"
            ],

            "Smoke, burning odor, or electrical concern": [
              "smoke",
              "burning smell",
              "burning odor",
              "electrical"
            ],

            "Product or temperature-sensitive material at risk": [
              "product at risk",
              "temperature sensitive",
              "inventory at risk"
            ]
          }
        }
      ]
    },

    "new-it-hardware": {
      // requestPurpose, businessReason, and costEstimateStatus are already
      // required fields on the template (routing questions), so they are
      // gathered and phrased conversationally there. Duplicating them here
      // as diagnostic questions with the same ids caused the same question
      // to be asked twice (routing answers don't satisfy a diagnostic
      // question with a matching id) — keep this profile empty for those.
      requiredForWork: [],

      suggestedFirstAction:
        "Validate the hardware need, location, quantity, and cost information, then send the request through the configured manager or director approval route before fulfillment.",

      questions: []
    },

    "general-triage": {
      requiredForWork: [
        "requestedOutcome",
        "affectedScope"
      ],

      suggestedFirstAction:
        "Confirm the requested outcome and assign the closest responsible team without asking the employee to restart the intake process.",

      questions: [
        {
          id: "requestedOutcome",
          label: "Requested outcome",
          reportLabel:
            "What the requester needs",

          question:
            "What do you need MasterFlow to help complete, restore, correct, or provide?",

          why:
            "A clear desired outcome lets the triage team route the request without restarting the conversation.",

          type: "textarea",
          options: []
        },

        {
          id: "affectedScope",
          label: "Affected scope",
          reportLabel:
            "Who or what is affected",

          question:
            "Who, what process, or what business area is affected?",

          why:
            "This gives triage enough context to identify the responsible team and business impact.",

          type: "textarea",
          options: []
        }
      ]
    }
  };
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

  /*
   * Work-type classification so incidents, service requests, and
   * change requests are visibly distinguished on the request, the
   * ticket, and in reporting. Change-type work (system changes and
   * enhancements) also flows through the approval workflow.
   */
  const WORK_TYPES = {
    "printer-ink": "Service request",
    "printer-connectivity": "Incident",
    "laptop-performance": "Incident",
    "receiving-scanner-issue": "Incident",
    "equipment-out-of-service": "Incident",
    "corrective-action-warehouse": "Incident",
    "stock-check-phoenix": "Service request",
    "systems-intake": "Change request",
    "shared-folder-access": "Service request",
    "facilities-hvac": "Incident",
    "new-it-hardware": "Service request",
    "general-triage": "Needs triage"
  };

 function getAll() {
    const overrides = readOverrides();

    return baseTemplates.map(
      (template) => {
        const override =
          overrides[template.id] || {};

        const diagnostics =
          diagnosticProfiles[
            template.id
          ] || {
            requiredForWork: [],
            suggestedFirstAction: "",
            questions: []
          };

        return {
          ...clone(template),
          ...clone(override),

          workType:
            override.workType ||
            template.workType ||
            WORK_TYPES[template.id] ||
            "",

          diagnostics: {
            ...clone(diagnostics),

            ...(override.diagnostics
              ? clone(
                  override.diagnostics
                )
              : {})
          }
        };
      }
    );
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

  function applyGovernedProposal(proposal) {
    const templateId = String(proposal.templateId || "").trim();
    if (!templateId) {
      return { applied: false, summary: "Governance decision published; no request-flow ID was linked." };
    }

    const template = get(templateId);
    if (!template || template.id !== templateId) {
      throw new Error(`Request flow "${templateId}" was not found.`);
    }

    const updated = clone(template);
    const after = String(proposal.after || "").trim();

    const feedback = (() => {
      const ids = new Set(proposal.relatedFeedbackIds || []);
      try {
        const items = JSON.parse(window.localStorage.getItem("masterflowFlowFeedbackV1") || "[]");
        return (Array.isArray(items) ? items : []).find((item) => ids.has(item.id)) || null;
      } catch (error) {
        return null;
      }
    })();

    const numericValue = (value) => {
      const match = String(value || "").trim().match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : Number.NaN;
    };

    const unique = (items) => [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];

    let summary = "";

    if (proposal.changeType === "destination-queue") {
      if (!after) throw new Error("The proposed queue is empty.");
      updated.queue = after;
      summary = `Receiving queue changed to ${after}.`;
    } else if (proposal.changeType === "response-sla") {
      const hours = numericValue(after);
      if (!Number.isFinite(hours) || hours <= 0) throw new Error("The proposed response SLA does not contain a valid positive number.");
      updated.responseSlaHours = hours;
      summary = `Response SLA changed to ${hours} hour${hours === 1 ? "" : "s"}.`;
    } else if (proposal.changeType === "resolution-sla") {
      const hours = numericValue(after);
      if (!Number.isFinite(hours) || hours <= 0) throw new Error("The proposed resolution SLA does not contain a valid positive number.");
      updated.resolutionSlaHours = hours;
      summary = `Resolution SLA changed to ${hours} hour${hours === 1 ? "" : "s"}.`;
    } else if (proposal.changeType === "default-priority") {
      const match = after.match(/\bP[1-4]\b/i);
      if (!match) throw new Error("The proposed priority must include P1, P2, P3, or P4.");
      const priorities = { P1: "P1 - Critical", P2: "P2 - High", P3: "P3 - Normal", P4: "P4 - Low" };
      updated.priority = priorities[match[0].toUpperCase()];
      summary = `Default priority changed to ${updated.priority}.`;
    } else if (proposal.changeType === "recognition-alias") {
      const aliases = unique(after.split(/\n|,/));
      if (!aliases.length) throw new Error("No recognition alias was supplied.");
      updated.keywords = unique([...(updated.keywords || []), ...aliases]);
      summary = `${aliases.length} recognition alias${aliases.length === 1 ? "" : "es"} added.`;
    } else if (proposal.changeType === "suggested-first-action") {
      updated.diagnostics = { ...(updated.diagnostics || {}), suggestedFirstAction: after };
      summary = "Suggested First Action updated.";
    } else if (proposal.changeType === "receiver-brief") {
      updated.receiverBrief = after;
      summary = "Receiver Brief wording updated.";
    } else if (proposal.changeType === "question-wording") {
      const diagnosticId = String((feedback && feedback.evidence && feedback.evidence.diagnosticId) || "").trim();
      const questions = updated.diagnostics && Array.isArray(updated.diagnostics.questions) ? updated.diagnostics.questions : [];
      const question = questions.find((item) => item.id === diagnosticId);
      if (!diagnosticId || !question) {
        return { applied: false, summary: "Question-wording decision published; no diagnostic question ID was linked." };
      }
      question.question = after;
      summary = `Diagnostic question "${diagnosticId}" updated.`;
    } else if (proposal.changeType === "work-readiness") {
      const diagnosticId = String((feedback && feedback.evidence && feedback.evidence.diagnosticId) || "").trim();
      if (!diagnosticId) {
        return { applied: false, summary: "Work-readiness decision published; no diagnostic requirement ID was linked." };
      }
      updated.diagnostics = {
        ...(updated.diagnostics || {}),
        requiredForWork: unique([
          ...(updated.diagnostics && Array.isArray(updated.diagnostics.requiredForWork) ? updated.diagnostics.requiredForWork : []),
          diagnosticId
        ])
      };
      summary = `"${diagnosticId}" added as a work-readiness requirement.`;
    } else {
      return { applied: false, summary: "Governance decision published; this change remains represented by the proposal record." };
    }

    save(updated);
    return { applied: true, summary };
  }

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY);
    return getAll();
  }

  /*
   * Deterministic language normalization.
   *
   * Expands common contractions, repairs frequent operational
   * misspellings and spacing, drops filler intensifiers, and
   * standardizes light morphology so classification tolerates how
   * employees actually type. No external model is used; every rule
   * here is transparent, local, and testable.
   */
  const CONTRACTIONS = [
    [/\bwon['’]?t\b/g, "will not"],
    [/\bcan['’]?t\b/g, "cannot"],
    [/\bdoesn['’]?t\b/g, "does not"],
    [/\bdon['’]?t\b/g, "do not"],
    [/\bdidn['’]?t\b/g, "did not"],
    [/\bisn['’]?t\b/g, "is not"],
    [/\baren['’]?t\b/g, "are not"],
    [/\bwasn['’]?t\b/g, "was not"],
    [/\bwouldn['’]?t\b/g, "would not"],
    [/\bit['’]?s\b/g, "it is"]
  ];

  const CANONICAL = [
    [/\bfork\s*lift\b/g, "forklift"],
    [/\bprintr\b/g, "printer"],
    [/\bpriner\b/g, "printer"],
    [/\bprnter\b/g, "printer"],
    [/\bpritner\b/g, "printer"],
    [/\bpriner\b/g, "printer"],
    [/\bwrking\b/g, "working"],
    [/\bworkin\b/g, "working"],
    [/\bscaner\b/g, "scanner"],
    [/\bscannner\b/g, "scanner"],
    [/\bskaner\b/g, "scanner"],
    [/\blabtop\b/g, "laptop"],
    [/\blaptp\b/g, "laptop"],
    [/\bcomputor\b/g, "computer"],
    [/\bconvyor\b/g, "conveyor"],
    [/\bconveyer\b/g, "conveyor"],
    [/\bconvayor\b/g, "conveyor"],
    [/\bbroke\b/g, "broken"],
    [/\bslowly\b/g, "slow"]
  ];

  const FILLER = /\b(?:really|very|super|extremely|totally|kinda|sorta)\b/g;

  /*
   * Generic words that carry no template-distinguishing meaning.
   *
   * The keyword fallback in score() may award a weak signal for
   * overlapping individual words when a full keyword phrase is not
   * present. These filler and ultra-generic problem words are excluded
   * from that fallback so a single shared word (for example "not",
   * "issue", or "problem") cannot nudge an unrelated template over the
   * routing floor. Strong signals still come from exact keyword and
   * alias phrase matches, which are unaffected by this list.
   */
  const FALLBACK_STOPWORDS = new Set([
    "the", "and", "for", "with", "this", "that", "from", "are", "was",
    "were", "has", "have", "had", "you", "your", "our", "its", "not",
    "but", "all", "any", "can", "cannot", "will", "would", "should",
    "does", "did", "been", "into", "than", "then", "there", "here",
    "they", "them", "when", "what", "which", "who", "how", "please",
    "just", "very", "really", "some", "about", "issue", "issues",
    "problem", "problems", "thing", "something", "someone", "anything",
    "help"
  ]);

  function normalize(text) {
    let value = String(text || "").toLowerCase();
    CONTRACTIONS.forEach(([pattern, replacement]) => {
      value = value.replace(pattern, replacement);
    });
    value = value.replace(/[^a-z0-9\s-]/g, " ");
    CANONICAL.forEach(([pattern, replacement]) => {
      value = value.replace(pattern, replacement);
    });
    value = value.replace(FILLER, " ");
    return value.replace(/\s+/g, " ").trim();
  }

  function exactPhraseScore(
    input,
    phrases,
    baseWeight
  ) {
    return (phrases || []).reduce(
      (total, phrase) => {
        const normalizedPhrase =
          normalize(phrase);

        if (!normalizedPhrase) {
          return total;
        }

        if (
          input.includes(
            normalizedPhrase
          )
        ) {
          const wordCount =
            normalizedPhrase
              .split(" ")
              .filter(Boolean)
              .length;

          return (
            total +
            baseWeight +
            wordCount * 4
          );
        }

        return total;
      },
      0
    );
  }

  function score(text, template) {
    const input = normalize(text);

    if (!input) {
      return 0;
    }

    /*
     * A hardware purchase must contain clear acquisition intent.
     * This prevents phrases such as "my scanner is broken" from
     * becoming purchase requests when they belong with Help Desk.
     */
    if (template.id === "new-it-hardware") {
      const device = "(?:scanner|barcode scanner|handheld scanner|laptop|monitor|printer|hardware|equipment)";
      const acquisitionPatterns = [
        new RegExp(`\\b(?:new|another|additional|replacement)\\s+${device}\\b`, "i"),
        new RegExp(`\\b(?:replace|purchase|buy|order|request)\\b.{0,35}\\b${device}\\b`, "i"),
        new RegExp(`\\bneed\\s+(?:a|an|one|\\d+)?\\s*(?:new|another|additional|replacement)?\\s*${device}\\b`, "i")
      ];

      if (!acquisitionPatterns.some((pattern) => pattern.test(input))) {
        return 0;
      }
    }

    /*
     * Existing template keyword scoring supports
     * normal descriptions and partial word matches.
     */
    const keywordScore =
      (template.keywords || []).reduce(
        (total, phrase) => {
          const normalizedPhrase =
            normalize(phrase);

          if (!normalizedPhrase) {
            return total;
          }

          if (
            input.includes(
              normalizedPhrase
            )
          ) {
            return (
              total +
              14 +
              normalizedPhrase
                .split(" ")
                .length *
                3
            );
          }

          /*
           * Fallback partial-word scoring (hardened, Recommendation R7).
           *
           * Only DISTINCTIVE overlapping words earn fallback points:
           * generic filler is excluded via FALLBACK_STOPWORDS. This
           * removes the fragile behavior where a shared filler word (for
           * example "not", "issue", or "problem") could push an unrelated
           * template over the routing floor, while still crediting real
           * topical overlap ("printer", "scanner", "forklift"). Strong
           * signals continue to come from exact keyword and alias matches.
           */
          const distinctiveMatches =
            normalizedPhrase
              .split(" ")
              .filter(
                (word) =>
                  word.length > 2 &&
                  !FALLBACK_STOPWORDS.has(word) &&
                  input.includes(word)
              )
              .length;

          return total + distinctiveMatches * 2;
        },
        0
      );

    /*
     * Classification aliases receive a stronger score
     * because they represent known employee shorthand.
     */
    const aliasScore =
      exactPhraseScore(
        input,
        classificationAliases[
          template.id
        ] || [],
        40
      );

    return (
      keywordScore +
      aliasScore
    );
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
      // Hardware requests are commonly phrased as "for <location>" ("a new
      // scanner for Receiving Line 2") rather than "at/in <location>" — a
      // dedicated extractor keeps that broader "for" match scoped to this
      // one field instead of loosening the shared `location` extractor
      // used by incident-style templates.
      hardwareLocation: () => {
        const match = input.match(/(?:at|near|by|in|located at|for)\s+([a-z0-9][a-z0-9\s#-]{2,60})/i);
        return match ? match[1].replace(/[.,]$/, "").trim() : "";
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
      hardwareType: () => {
        if (/barcode scanner/i.test(input)) return "Barcode scanner";
        if (/handheld scanner/i.test(input)) return "Handheld scanner";
        if (/scanner/i.test(input)) return "Scanner";
        if (/laptop/i.test(input)) return "Laptop";
        if (/monitor/i.test(input)) return "Monitor";
        if (/printer/i.test(input)) return "Printer";
        return "";
      },
      requestPurpose: () => {
        if (/replace(?:ment)?|replacing/i.test(input)) return "Replacement device";
        if (/shared|team device|team scanner/i.test(input)) return "Shared team device";
        if (/\b(?:new|another|additional)\b/i.test(input)) return "New / additional device";
        return "Not sure";
      },
      quantity: () => {
        const explicit = input.match(/\b(?:qty|quantity|need|request(?:ing)?)\s*(?:of\s*)?(\d+)\b/i);
        if (explicit) return explicit[1];
        const deviceCount = input.match(/\b(\d+)\s+(?:new\s+|replacement\s+|additional\s+)?(?:scanner|scanners|laptop|laptops|monitor|monitors|printer|printers)\b/i);
        if (deviceCount) return deviceCount[1];
        if (/\b(?:a|an|one)\s+(?:new\s+|replacement\s+|additional\s+)?(?:scanner|laptop|monitor|printer)\b/i.test(input)) return "1";
        if (/\b(?:new|replacement|additional)\s+(?:scanner|laptop|monitor|printer)\b/i.test(input)) return "1";
        return "";
      },
      estimatedCost: () => {
        const match = input.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/) || input.match(/\b([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd)\b/i);
        return match ? match[1].replace(/,/g, "") : "";
      },
      costEstimateStatus: () => {
        if (/\$\s*[\d,]+|\b[\d,]+(?:\.\d{1,2})?\s*(?:dollars?|usd)\b/i.test(input)) return "Estimated cost provided";
        return "Quote required";
      },
      requestKind: () => /enhancement|improve|new capability/i.test(input) ? "Enhancement" : (/access/i.test(input) ? "Access" : "Issue"),
      resourceName: () => {
        const match = input.match(/(?:the|to)\s+(?:shared\s+)?([a-z0-9][a-z0-9\s#-]{2,50}?)\s+(?:shared\s+)?(?:folder|drive|site)\b/i) || input.match(/\bshared\s+([a-z0-9][a-z0-9\s#-]{2,50})\s+folder\b/i);
        return match ? match[1].replace(/[.,]$/, "").replace(/^(?:the|a|an)\s+/i, "").trim() : "";
      },
      accessLevel: () => {
        if (/full control/i.test(input)) return "Full control";
        if (/upload/i.test(input)) return "Upload";
        if (/edit|read.?write|modify/i.test(input)) return "Edit";
        if (/view.?only|read.?only|just (?:view|look)/i.test(input)) return "View only";
        return "";
      }
    };

    const value = field.extractor && extractors[field.extractor] ? extractors[field.extractor](field) : "";
    return { value, source: value ? "description" : "" };
  }

  window.MasterFlowTemplates = {
    STORAGE_KEY,
    getAll,
    get,
    save,
    applyGovernedProposal,
    reset,
    classify,
    extract
  };
})();
