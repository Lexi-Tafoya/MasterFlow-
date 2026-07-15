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
          extractor: "location"
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
      "poor print quality",
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
      "scanner does not work"
    ],

    "equipment-out-of-service": [
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
      "access request",
      "data correction",
      "system enhancement"
    ],

    "facilities-hvac": [
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
      requiredForWork: [
        "requestPurpose",
        "businessReason",
        "costEstimateStatus"
      ],

      suggestedFirstAction:
        "Validate the hardware need, location, quantity, and cost information, then send the request through the configured manager or director approval route before fulfillment.",

      questions: [
        {
          id: "requestPurpose",
          label: "Request purpose",
          reportLabel: "Why the hardware is needed",
          question: "Is this a new or additional device, a replacement, or a shared team device?",
          why: "The purpose determines whether an existing asset, replacement reason, or additional approval evidence may be needed.",
          type: "select",
          options: [
            "New / additional device",
            "Replacement device",
            "Shared team device",
            "Not sure"
          ],
          signals: {
            "New / additional device": [
              "new scanner",
              "another scanner",
              "additional scanner",
              "new laptop",
              "new monitor",
              "new printer"
            ],
            "Replacement device": [
              "replacement scanner",
              "replace scanner",
              "replacement laptop",
              "replacement monitor",
              "replacement printer"
            ],
            "Shared team device": [
              "shared scanner",
              "team scanner",
              "shared device"
            ]
          }
        },
        {
          id: "businessReason",
          label: "Business reason",
          reportLabel: "Business need",
          question: "What work will this hardware support, restore, or improve?",
          why: "The receiving team and approver need a concise business reason before deciding whether to purchase or reassign equipment.",
          type: "textarea",
          options: []
        },
        {
          id: "costEstimateStatus",
          label: "Cost estimate status",
          reportLabel: "Cost information",
          question: "Do you know the estimated cost, or should the receiving team obtain a quote?",
          why: "The amount determines whether manager or director approval is required.",
          type: "select",
          options: [
            "Estimated cost provided",
            "Quote required"
          ],
          signals: {
            "Estimated cost provided": [
              "estimated cost",
              "cost is",
              "quote is",
              "dollars",
              "usd"
            ],
            "Quote required": [
              "need a quote",
              "quote required",
              "cost unknown",
              "do not know the cost"
            ]
          }
        }
      ]
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

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY);
    return getAll();
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
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

          const matches =
            normalizedPhrase
              .split(" ")
              .filter(
                (word) =>
                  word.length > 2 &&
                  input.includes(word)
              )
              .length;

          return total + matches * 2;
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
        if (/\b(?:a|an|one)\s+(?:new\s+|replacement\s+|additional\s+)?(?:scanner|laptop|monitor|printer)\b/i) return "1";
        if (/\b(?:new|replacement|additional)\s+(?:scanner|laptop|monitor|printer)\b/i) return "1";
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
