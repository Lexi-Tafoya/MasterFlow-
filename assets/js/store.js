(function () {
  "use strict";

  const STORAGE_KEY = "masterflowMultipageStateV1";
  const ROLE_KEY = "masterflowDemoRole";
  const CURRENT_USER = {
    id: "usr-alexandra",
    name: "Alexandra Tafoya",
    initials: "AT",
    email: "alexandra.tafoya@example.invalid",
    department: "Packaging Operations",
    team: "Packaging - Phoenix",
    site: "Phoenix Distribution Center",
    workLocation: "Packaging area, Phoenix",
    manager: "Dana Whitfield",
    phone: "(602) 555-0114",
    extension: "4471"
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
          department: "Packaging Operations",
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
          department: "Packaging Operations",
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
          department: "Packaging Operations",
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
          queue: "Enterprise Triage",
          requester: "Taylor Jones",
          department: "Receiving",
          assignee: "Morgan Ellis",
          status: "Triage",
          createdAt: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 2.9 * 60 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(1.4),
          location: "Unknown",
          source: "MasterFlow conversation",
          classificationConfidence: 42,
          routingReason: "Classification confidence was below the safe-routing threshold.",
          details: {
            requestTemplateId: "general-triage",
            originalText: "I can't finish my daily work and I'm honestly not sure who I'm supposed to ask about this.",
            employeeProfile: {
              name: "Taylor Jones", department: "Receiving", team: "Inbound Dock B",
              site: "Phoenix DC", workLocation: "Dock B", manager: "R. Alvarez",
              email: "taylor.jones@masterelectronics.com", phone: "(602) 555-0148"
            },
            clarifications: [
              { question: "What are you trying to get done?", answer: "Finish my daily receiving tasks." },
              { question: "Which system or device is involved?", answer: "Not sure — a screen I use every day." }
            ]
          },
          triage: {
            reason: "Classification confidence (42%) was below the 70% safe-routing threshold.",
            reasonType: "low-confidence",
            enteredAt: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(),
            owner: "Morgan Ellis",
            candidates: [
              { category: "Report an issue to Help Desk", queue: "IT Help Desk", templateId: "printer-connectivity", confidence: 42 },
              { category: "Systems Intake", queue: "Business Enablement - Systems Intake", templateId: "systems-intake", confidence: 31 }
            ],
            missingInfo: ["Which system or device is affected", "Exact location or workstation"]
          },
          history: [
            { at: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(), text: "Low-confidence request sent to Enterprise Triage (confidence 42%)." }
          ]
        },
        {
          id: "t-triage-1839",
          number: "ME-2026-1839",
          title: "Need access set up for a new process",
          description: "Requester asked for help getting set up for a new process but the owning team is ambiguous between IT and Facilities.",
          category: "Needs classification",
          priority: "P3 - Normal",
          queue: "Enterprise Triage",
          requester: "Jordan Blake",
          department: "Packaging Operations",
          assignee: "Unassigned",
          status: "Triage",
          createdAt: new Date(now - 1.6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 1.4 * 60 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(2.4),
          location: "Phoenix DC — Line 2",
          source: "MasterFlow conversation",
          classificationConfidence: 55,
          routingReason: "Two destinations matched with similar confidence; the correct owner is ambiguous.",
          details: {
            requestTemplateId: "general-triage",
            originalText: "I'm starting on the new labeling process and need to get set up — not sure if that's IT or Facilities.",
            employeeProfile: {
              name: "Jordan Blake", department: "Packaging Operations", team: "Line 2",
              site: "Phoenix DC", workLocation: "Line 2", manager: "M. Okafor",
              email: "jordan.blake@masterelectronics.com", phone: "(602) 555-0151"
            },
            clarifications: [
              { question: "What are you trying to get done?", answer: "Get set up for the new labeling process." }
            ]
          },
          triage: {
            reason: "Two destinations matched with similar confidence (IT Help Desk 55% vs Facilities 49%) — the correct owner is ambiguous.",
            reasonType: "conflict",
            enteredAt: new Date(now - 1.6 * 60 * 60 * 1000).toISOString(),
            owner: "Unassigned",
            candidates: [
              { category: "Report an issue to Help Desk", queue: "IT Help Desk", templateId: "printer-connectivity", confidence: 55 },
              { category: "Equipment Out of Service", queue: "Facilities", templateId: "equipment-out-of-service", confidence: 49 }
            ],
            missingInfo: ["Whether the setup is a system/login need or a physical equipment need"]
          },
          history: [
            { at: new Date(now - 1.6 * 60 * 60 * 1000).toISOString(), text: "Conflicting routes detected; sent to Enterprise Triage for a routing decision." }
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
        },
        {
          id: "t-team-1851",
          number: "ME-2026-1851",
          title: "Printer offline at Pack Station 14",
          description: "Zebra label printer at Pack Station 14 shows offline; work slowed for the packing team.",
          category: "IT Information / Report an issue to Help Desk",
          priority: "P3 - Normal",
          queue: "IT Help Desk",
          requester: "Marcus Reed",
          department: "Packaging Operations",
          assignee: "Jordan Kim",
          status: "In progress",
          createdAt: new Date(now - 55 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 20 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(3.4),
          location: "PHX Warehouse - Pack Station 14",
          source: "MasterFlow conversation",
          classificationConfidence: 96,
          routingReason: "Printer symptom and station context matched IT Help Desk.",
          details: { printerName: "PHX-PRN-14", symptom: "Offline or disconnected" },
          history: [
            { at: new Date(now - 55 * 60 * 1000).toISOString(), text: "Ticket created and routed to IT Help Desk." },
            { at: new Date(now - 20 * 60 * 1000).toISOString(), text: "Help Desk confirmed the printer and began remote checks." }
          ]
        },
        {
          id: "t-team-1852",
          number: "ME-2026-1852",
          title: "Label printer jam at Packaging Line 2",
          description: "Label printer on Packaging Line 2 keeps jamming during high-volume runs.",
          category: "IT Information / Report an issue to Help Desk",
          priority: "P3 - Normal",
          queue: "IT Help Desk",
          requester: "Priya Nair",
          department: "Packaging Operations",
          assignee: "Unassigned",
          status: "Waiting on requester",
          createdAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 90 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(2),
          location: "PHX Warehouse - Packaging Line 2",
          source: "MasterFlow conversation",
          classificationConfidence: 92,
          routingReason: "Recurring jam symptom matched IT Help Desk.",
          details: { symptom: "Paper jam or feed problem" },
          history: [
            { at: new Date(now - 6 * 60 * 60 * 1000).toISOString(), text: "Ticket created and routed to IT Help Desk." },
            { at: new Date(now - 90 * 60 * 1000).toISOString(), text: "Help Desk asked for the label stock part number." }
          ]
        },
        {
          id: "t-team-1853",
          number: "ME-2026-1853",
          title: "Replacement scanner for packing",
          description: "Handheld scanner for the packing team is failing intermittently; requesting a replacement.",
          category: "IT Information / New IT Hardware Request",
          priority: "P3 - Normal",
          queue: "IT Information",
          requester: "Devon Brooks",
          department: "Packaging Operations",
          assignee: "Unassigned",
          status: "New",
          createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
          slaDueAt: isoHoursFromNow(20),
          location: "PHX Warehouse - Packaging",
          source: "MasterFlow form",
          classificationConfidence: 95,
          routingReason: "Hardware acquisition intent matched New IT Hardware Request.",
          details: { hardwareType: "Handheld scanner" },
          history: [
            { at: new Date(now - 3 * 60 * 60 * 1000).toISOString(), text: "Request created and routed to IT Information." }
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
        manualReviewConfidence: 70,
        autoActionConfidence: 90,
        directorApprovalThreshold: 1000,
        annualServiceNowCost: 300000,
        p1ResponseMinutes: 15,
        normalResponseHours: 4,
        normalResolutionHours: 24,
        // Freight Optimization thresholds (Queue-Manager-only workspace). Additive;
        // ticketing ignores these. All freight figures are fictional and modeled.
        minimumSavings: 250,
        freightSavingsTarget: 200000
      },
      freightOpportunities: [
        {
          id: "f-abi173", customerNumber: "ABI173", customerName: "ABI Technologies", orderNumber: "ABCD14-02",
          parts: ["2888-2", "67666BH", "3332-OH"], warehouse: "PHX", salesOwner: "Alexandra Tafoya",
          logisticsOwner: "Logistics Optimization Queue", currentCarrier: "FedEx Priority Freight", currentService: "Priority",
          proposedCarrier: "Contracted LTL", proposedService: "Scheduled consolidated service",
          currentFreightCost: 5547.00, proposedFreightCost: 5003.46, internalSavings: 543.54, customerSavings: 330.56,
          confidence: 67, orderValue: 18600, currentPromiseDate: "Aug 9, 2026", proposedPromiseDate: "Aug 10, 2026",
          shippingCutoff: "Today, 1:30 PM", autoReleaseDeadline: "Today, 1:30 PM", status: "Review required",
          decision: null, decisionAt: null, decisionBy: null, decisionNote: "", decisionHistory: [],
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
          id: "f-nort41", customerNumber: "NORT41", customerName: "Northstar Controls", orderNumber: "NS-99281",
          parts: ["4471-A", "PWR-808"], warehouse: "PHX", salesOwner: "Diego Ruiz",
          logisticsOwner: "Logistics Optimization Queue", currentCarrier: "UPS Next Day Air", currentService: "Next Day Air",
          proposedCarrier: "UPS", proposedService: "2nd Day Air",
          currentFreightCost: 1420.10, proposedFreightCost: 779.88, internalSavings: 640.22, customerSavings: 0,
          confidence: 93, orderValue: 12650, currentPromiseDate: "Jul 16, 2026", proposedPromiseDate: "Jul 16, 2026",
          shippingCutoff: "Today, 3:00 PM", autoReleaseDeadline: "Today, 3:00 PM", status: "Ready to approve",
          decision: null, decisionAt: null, decisionBy: null, decisionNote: "", decisionHistory: [],
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
          id: "f-metro9", customerNumber: "METRO9", customerName: "Metro Industrial", orderNumber: "MI-44012",
          parts: ["CABLE-44", "CONN-218"], warehouse: "NY", salesOwner: "Sam Patel",
          logisticsOwner: "Logistics Optimization Queue", currentCarrier: "Regional LTL", currentService: "Standard LTL",
          proposedCarrier: "Regional LTL", proposedService: "Repacked standard LTL",
          currentFreightCost: 910.00, proposedFreightCost: 602.50, internalSavings: 307.50, customerSavings: 84.00,
          confidence: 84, orderValue: 9100, currentPromiseDate: "Jul 17, 2026", proposedPromiseDate: "Jul 17, 2026",
          shippingCutoff: "Tomorrow, 10:00 AM", autoReleaseDeadline: "Tomorrow, 10:00 AM", status: "Packaging review",
          decision: null, decisionAt: null, decisionBy: null, decisionNote: "", decisionHistory: [],
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
      routingRules: [
        { id: "rr-printer", name: "Printer and peripheral requests", condition: "Category contains Printer", route: "IT Support", active: true },
        { id: "rr-warehouse", name: "Warehouse application incidents", condition: "Location is warehouse and process is blocked", route: "Warehouse Systems / On-call", active: true },
        { id: "rr-triage", name: "Low-confidence classification", condition: "AI confidence below 70%", route: "Enterprise Triage", active: true }
      ],
      approvalRules: [
        { id: "ar-purchase", name: "Purchase request over $1,000", approver: "Director", active: true }
      ],
      assignmentRules: [
        { id: "asg-printer-conn", name: "Printer specialist assignment", queue: "IT Help Desk", templateId: "printer-connectivity", category: "Report an issue to Help Desk", primaryAssignee: "Jordan Kim", backupAssignee: "Taylor Morgan", fallback: "unassigned", active: true, priority: 1, notes: "Printer connectivity issues go to the printer specialist.", createdBy: "Queue Manager", updatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(), appliedCount: 4 },
        { id: "asg-printer-ink", name: "Printer supply assignment", queue: "IT Information", templateId: "printer-ink", category: "Printer Ink Request", primaryAssignee: "Taylor Morgan", backupAssignee: "Jordan Kim", fallback: "unassigned", active: true, priority: 1, notes: "Ink and toner requests go to Taylor.", createdBy: "Queue Manager", updatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(), appliedCount: 2 }
      ],
      teamAvailability: {
        "Jordan Kim": true,
        "Taylor Morgan": true,
        "Priya Shah": true,
        "Casey Rivera": true
      },
      flowImprovements: [],
      classificationFeedback: [
        { id: "cf-seed-1", phrase: "printer stopped working at my station", originalCategory: "Needs classification", originalConfidence: 48, correctedCategory: "IT Information / Report an issue to Help Desk", correctedQueue: "IT Help Desk", reason: "Printer issue confirmed from requester clarification.", by: "Morgan Ellis", at: new Date(now - 26 * 60 * 60 * 1000).toISOString(), sentToFlowStudio: false },
        { id: "cf-seed-2", phrase: "printer not printing labels", originalCategory: "Needs classification", originalConfidence: 52, correctedCategory: "IT Information / Report an issue to Help Desk", correctedQueue: "IT Help Desk", reason: "Original description was too ambiguous; confirmed printer connectivity.", by: "Morgan Ellis", at: new Date(now - 20 * 60 * 60 * 1000).toISOString(), sentToFlowStudio: false }
      ],
      employees: [
        { id: "emp-morgan", name: "Morgan Ellis", employeeId: "ME-1001", email: "morgan.ellis@masterelectronics.com", department: "Business Enablement", team: "Platform Governance", site: "Phoenix HQ", manager: "COO", role: "Enterprise Administrator", queues: [], managerQueues: [], ownedCategories: [], flowStudio: false, assignmentRules: false, reporting: true, admin: true, active: true },
        { id: "emp-jkim", name: "Jordan Kim", employeeId: "ME-4471", email: "jordan.kim@masterelectronics.com", department: "IT", team: "IT Help Desk", site: "Phoenix DC", manager: "Morgan Ellis", role: "Service Team Member", queues: ["IT Help Desk"], managerQueues: [], ownedCategories: ["Report an issue to Help Desk"], flowStudio: false, assignmentRules: false, reporting: false, admin: false, active: true },
        { id: "emp-tmorgan", name: "Taylor Morgan", employeeId: "ME-4472", email: "taylor.morgan@masterelectronics.com", department: "IT", team: "IT Help Desk", site: "Phoenix DC", manager: "Morgan Ellis", role: "Queue Manager", queues: ["IT Help Desk", "IT Information"], managerQueues: ["IT Help Desk", "IT Information"], ownedCategories: ["Report an issue to Help Desk", "Printer Ink Request", "New IT Hardware Request"], flowStudio: true, assignmentRules: true, reporting: true, admin: false, active: true },
        { id: "emp-pshah", name: "Priya Shah", employeeId: "ME-4488", email: "priya.shah@masterelectronics.com", department: "IT", team: "Systems Intake", site: "Phoenix DC", manager: "Morgan Ellis", role: "Service Team Member", queues: ["Business Enablement - Systems Intake"], managerQueues: [], ownedCategories: ["Systems Intake"], flowStudio: false, assignmentRules: false, reporting: false, admin: false, active: true },
        { id: "emp-crivera", name: "Casey Rivera", employeeId: "ME-4490", email: "casey.rivera@masterelectronics.com", department: "IT", team: "IT Information", site: "Phoenix DC", manager: "Taylor Morgan", role: "Service Team Member", queues: ["IT Information"], managerQueues: [], ownedCategories: ["New IT Hardware Request"], flowStudio: false, assignmentRules: false, reporting: false, admin: false, active: true },
        { id: "emp-mreed", name: "Marcus Reed", employeeId: "ME-4501", email: "marcus.reed@masterelectronics.com", department: "Facilities", team: "Facilities Ops", site: "Phoenix DC", manager: "D. Chen", role: "Service Team Member", queues: ["Facilities"], managerQueues: [], ownedCategories: ["Equipment Out of Service", "HVAC"], flowStudio: false, assignmentRules: false, reporting: false, admin: false, active: true },
        { id: "emp-dbrooks", name: "Devon Brooks", employeeId: "ME-4520", email: "devon.brooks@masterelectronics.com", department: "IT", team: "IT Help Desk", site: "New York DC", manager: "Taylor Morgan", role: "Service Team Member", queues: [], managerQueues: [], ownedCategories: [], flowStudio: false, assignmentRules: false, reporting: false, admin: false, active: false }
      ],
      accessRequests: [
        { id: "areq-1", employeeId: "emp-crivera", employeeName: "Casey Rivera", requested: "Work access — Printer Connectivity in IT Help Desk", queue: "IT Help Desk", categories: ["Report an issue to Help Desk"], reason: "Cross-training to cover Help Desk printer tickets.", requestedBy: "Taylor Morgan", manager: "Taylor Morgan", submittedAt: new Date(now - 18 * 60 * 60 * 1000).toISOString(), risk: "Low", status: "pending" },
        { id: "areq-2", employeeId: "emp-pshah", employeeName: "Priya Shah", requested: "Queue Manager — IT Help Desk", queue: "IT Help Desk", categories: ["Report an issue to Help Desk"], reason: "Covering for the team lead during a two-week leave.", requestedBy: "Morgan Ellis", manager: "Morgan Ellis", submittedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(), risk: "Medium", status: "pending" }
      ],
      accessAudit: [
        { id: "aud-1", employeeName: "Taylor Morgan", change: "Granted Queue Manager authority", scope: "IT Help Desk, IT Information", by: "Morgan Ellis", at: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(), reason: "Promoted to Queue Manager." },
        { id: "aud-2", employeeName: "Devon Brooks", change: "Removed queue access", scope: "IT Help Desk", by: "Morgan Ellis", at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), reason: "Transferred to a different site; access pending re-grant." }
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
      // Backfill collections added after a user's state was first seeded, so new
      // features appear without forcing a full reset. Only adds when absent.
      let migrated = false;
      if (!parsed.assignmentRules) { parsed.assignmentRules = seedState().assignmentRules; migrated = true; }
      if (!parsed.teamAvailability) { parsed.teamAvailability = seedState().teamAvailability; migrated = true; }
      if (!parsed.flowImprovements) { parsed.flowImprovements = []; migrated = true; }
      if (!parsed.classificationFeedback) { parsed.classificationFeedback = []; migrated = true; }
      if (!parsed.employees) { parsed.employees = seedState().employees; migrated = true; }
      if (!parsed.accessRequests) { parsed.accessRequests = seedState().accessRequests; migrated = true; }
      if (!parsed.accessAudit) { parsed.accessAudit = seedState().accessAudit; migrated = true; }
      // Freight Optimization data was added after some users' state was seeded.
      if (!parsed.freightOpportunities) { parsed.freightOpportunities = seedState().freightOpportunities; migrated = true; }
      if (parsed.settings && parsed.settings.minimumSavings == null) {
        const freshSettings = seedState().settings;
        parsed.settings.minimumSavings = freshSettings.minimumSavings;
        parsed.settings.freightSavingsTarget = freshSettings.freightSavingsTarget;
        migrated = true;
      }
      if (migrated) writeState(parsed);
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

  // Automatic assignment rules run AFTER routing. They never change the queue,
  // priority, or SLA — they only choose an owner within the queue the routing
  // engine already selected. Primary -> backup -> configured fallback.
  function resolveAssignment(state, ticket) {
    const rules = (state.assignmentRules || []).filter((rule) => rule.active);
    if (!rules.length) return null;
    const availability = state.teamAvailability || {};
    const isAvailable = (name) => Boolean(name) && availability[name] !== false;
    const ticketCategory = (ticket.category || "").toLowerCase();
    const templateId = ticket.details && ticket.details.requestTemplateId;
    const matches = rules
      .filter((rule) => {
        if (rule.queue && rule.queue !== ticket.queue) return false;
        const templateMatch = rule.templateId && templateId && rule.templateId === templateId;
        const categoryMatch = rule.category && ticketCategory.includes(String(rule.category).toLowerCase());
        return templateMatch || categoryMatch;
      })
      .sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99));
    if (!matches.length) return null;
    const rule = matches[0];
    if (isAvailable(rule.primaryAssignee)) {
      return { rule, assignee: rule.primaryAssignee, fallbackReason: "" };
    }
    if (isAvailable(rule.backupAssignee)) {
      return {
        rule,
        assignee: rule.backupAssignee,
        fallbackReason: `${rule.primaryAssignee} was unavailable, so this request went to the backup owner ${rule.backupAssignee}.`
      };
    }
    if (rule.fallback === "manager") {
      return {
        rule,
        assignee: "Queue Manager",
        fallbackReason: `No configured owner was available, so this request was routed to the Queue Manager for assignment.`
      };
    }
    return {
      rule,
      assignee: "",
      fallbackReason: `No configured owner was available. The request stays in ${ticket.queue} for the Queue Manager to assign.`
    };
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
      queue: input.queue || "Enterprise Triage",
      requester: input.requester || CURRENT_USER.name,
      department: input.department || CURRENT_USER.department || "General",
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

    // Apply queue-owned automatic assignment rules after routing. This never
    // changes the queue the routing engine chose — it only assigns an owner.
    if ((!input.assignee || input.assignee === "Unassigned") && !priority.startsWith("P1")) {
      const resolution = resolveAssignment(state, ticket);
      if (resolution) {
        const liveRule = (state.assignmentRules || []).find((rule) => rule.id === resolution.rule.id);
        if (liveRule) liveRule.appliedCount = (Number(liveRule.appliedCount) || 0) + 1;
        if (resolution.assignee) {
          ticket.assignee = resolution.assignee;
          ticket.status = ticket.status === "New" ? "Assigned" : ticket.status;
          ticket.assignmentSource = `Automatic assignment rule: ${resolution.rule.name}`;
          ticket.assignmentRuleId = resolution.rule.id;
          ticket.history.push({
            at: now.toISOString(),
            text: resolution.fallbackReason
              ? `Automatically assigned to ${resolution.assignee} by the "${resolution.rule.name}" rule. ${resolution.fallbackReason} Queue ${ticket.queue} is unchanged.`
              : `Automatically assigned to ${resolution.assignee} by the "${resolution.rule.name}" rule. Queue ${ticket.queue} is unchanged.`
          });
        } else {
          ticket.assignmentSource = `Assignment rule "${resolution.rule.name}" could not assign an owner`;
          ticket.assignmentNeedsAttention = true;
          ticket.history.push({
            at: now.toISOString(),
            text: `The "${resolution.rule.name}" rule could not assign an owner. ${resolution.fallbackReason}`
          });
        }
      }
    }

    // Enrich tickets that land in Enterprise Triage with routing-review context so
    // the Administrator can see why MasterFlow could not confidently route them.
    if (ticket.queue === "Enterprise Triage" && !ticket.triage) {
      const confidence = Number(ticket.classificationConfidence) || 0;
      ticket.status = ticket.status === "New" ? "Triage" : ticket.status;
      ticket.triage = {
        reason: input.triageReason ||
          (confidence
            ? `Classification confidence (${confidence}%) was below the ${state.settings.ticketClassificationThreshold || 70}% safe-routing threshold.`
            : "MasterFlow could not confidently match this request to an active request category."),
        reasonType: input.triageReasonType || "low-confidence",
        enteredAt: now.toISOString(),
        owner: input.triageOwner || "Unassigned",
        candidates: Array.isArray(input.classificationCandidates) ? input.classificationCandidates : [],
        missingInfo: Array.isArray(input.missingInfo) ? input.missingInfo : []
      };
    }

    state.tickets.unshift(ticket);
    writeState(state);
    return deepClone(ticket);
  }

  // Reroute a triage ticket once the correct destination is understood. Preserves
  // the ticket number, submission time, history, and attachments; rebuilds SLA for
  // the destination; records the prior/new route + reason; runs destination
  // assignment rules; and creates a classification feedback signal.
  function rerouteTicket(id, patch) {
    const state = readState();
    const ticket = state.tickets.find((item) => item.id === id);
    if (!ticket) return { ok: false, message: "Ticket not found." };
    if (!patch || !patch.queue || !patch.category) return { ok: false, message: "A destination queue and request category are required." };
    if (!patch.reason || String(patch.reason).trim().length < 4) return { ok: false, message: "A meaningful rerouting reason is required." };

    const now = new Date();
    const priorRoute = { category: ticket.category, queue: ticket.queue, owner: ticket.assignee || "Unassigned", sla: ticket.slaDueAt };
    const originalPhrase = (ticket.details && ticket.details.originalText) || ticket.description || ticket.title;
    const originalCategory = ticket.category;
    const originalConfidence = Number(ticket.classificationConfidence) || 0;

    ticket.category = patch.category;
    ticket.queue = patch.queue;
    if (patch.priority) ticket.priority = patch.priority;
    ticket.details = ticket.details || {};
    if (patch.templateId) ticket.details.requestTemplateId = patch.templateId;
    ticket.details.rerouted = true;

    // Rebuild SLA from the destination (do not hide elapsed time — createdAt is preserved).
    const slaHours = Number(patch.slaHours) || Number(state.settings.normalResolutionHours) || 24;
    ticket.slaDueAt = new Date(now.getTime() + slaHours * 60 * 60 * 1000).toISOString();

    ticket.assignee = "Unassigned";
    ticket.status = "Assigned";
    delete ticket.triage;

    ticket.reroute = {
      from: priorRoute,
      to: { category: ticket.category, queue: ticket.queue },
      reason: String(patch.reason).trim(),
      by: CURRENT_USER.name,
      at: now.toISOString()
    };
    ticket.updatedAt = now.toISOString();
    ticket.history = ticket.history || [];
    ticket.history.push({ at: now.toISOString(), type: "audit", text: `Rerouted from ${priorRoute.queue} (${priorRoute.category}) to ${ticket.queue} (${ticket.category}) by ${CURRENT_USER.name}. Reason: ${ticket.reroute.reason}` });
    if (patch.teamNote) ticket.history.push({ at: now.toISOString(), text: `Note to the receiving team: ${String(patch.teamNote).trim()}` });
    ticket.history.push({ at: now.toISOString(), type: "requester", text: patch.requesterNote ? String(patch.requesterNote).trim() : `Your request was routed to the ${ticket.queue} team, who will take it from here.` });

    // Run destination automatic-assignment rules (P1 never auto-assigned).
    if (!String(ticket.priority).startsWith("P1")) {
      const resolution = resolveAssignment(state, ticket);
      if (resolution) {
        const liveRule = (state.assignmentRules || []).find((rule) => rule.id === resolution.rule.id);
        if (liveRule) liveRule.appliedCount = (Number(liveRule.appliedCount) || 0) + 1;
        if (resolution.assignee) {
          ticket.assignee = resolution.assignee;
          ticket.assignmentSource = `Automatic assignment rule: ${resolution.rule.name}`;
          ticket.history.push({ at: now.toISOString(), text: `Automatically assigned to ${resolution.assignee} by the "${resolution.rule.name}" rule after rerouting. Queue ${ticket.queue} is unchanged.` });
        }
      }
    }

    // Record a classification feedback signal for continuous improvement.
    state.classificationFeedback = state.classificationFeedback || [];
    state.classificationFeedback.unshift({
      id: `cf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      phrase: originalPhrase,
      originalCategory,
      originalConfidence,
      correctedCategory: ticket.category,
      correctedQueue: ticket.queue,
      reason: ticket.reroute.reason,
      by: CURRENT_USER.name,
      at: now.toISOString(),
      sentToFlowStudio: false
    });

    writeState(state);
    return { ok: true, ticket: deepClone(ticket) };
  }

  function getClassificationFeedback() {
    return deepClone(readState().classificationFeedback || []);
  }

  /* ---------- People & Access ---------- */
  function getEmployees() {
    return deepClone(readState().employees || []);
  }

  function addAccessAudit(state, entry) {
    state.accessAudit = state.accessAudit || [];
    state.accessAudit.unshift(Object.assign({
      id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      by: CURRENT_USER.name,
      at: new Date().toISOString()
    }, entry));
  }

  function updateEmployeeAccess(id, patch, reason, changeSummary) {
    const state = readState();
    const emp = (state.employees || []).find((e) => e.id === id);
    if (!emp) return { ok: false, message: "Employee not found." };
    const before = deepClone(emp);
    Object.assign(emp, patch);
    addAccessAudit(state, {
      employeeName: emp.name,
      change: changeSummary || "Access updated",
      scope: [].concat(emp.managerQueues || [], emp.queues || []).join(", ") || "—",
      reason: reason || "Not provided",
      previous: { role: before.role, queues: before.queues, managerQueues: before.managerQueues, ownedCategories: before.ownedCategories, flowStudio: before.flowStudio, assignmentRules: before.assignmentRules, reporting: before.reporting, admin: before.admin }
    });
    writeState(state);
    return { ok: true, employee: deepClone(emp) };
  }

  function getAccessRequests() {
    return deepClone(readState().accessRequests || []);
  }

  function decideAccessRequest(id, decision, note, appliedPatch) {
    const state = readState();
    const req = (state.accessRequests || []).find((r) => r.id === id);
    if (!req) return { ok: false, message: "Request not found." };
    req.status = decision;
    req.decisionNote = note || "";
    req.decidedBy = CURRENT_USER.name;
    req.decidedAt = new Date().toISOString();
    if (decision === "approved") {
      const emp = (state.employees || []).find((e) => e.id === req.employeeId);
      if (emp && appliedPatch) Object.assign(emp, appliedPatch);
      addAccessAudit(state, {
        employeeName: req.employeeName,
        change: `Approved: ${req.requested}`,
        scope: req.queue || "—",
        reason: note || req.reason || "Approved access request",
        relatedRequestId: req.id
      });
    } else {
      addAccessAudit(state, {
        employeeName: req.employeeName,
        change: `Rejected: ${req.requested}`,
        scope: req.queue || "—",
        reason: note || "Rejected",
        relatedRequestId: req.id
      });
    }
    writeState(state);
    return { ok: true, request: deepClone(req) };
  }

  function getAccessAudit() {
    return deepClone(readState().accessAudit || []);
  }

  function markClassificationFeedbackSent(ids) {
    const state = readState();
    const set = new Set(Array.isArray(ids) ? ids : [ids]);
    (state.classificationFeedback || []).forEach((item) => {
      if (set.has(item.id)) item.sentToFlowStudio = true;
    });
    writeState(state);
    return deepClone(state.classificationFeedback || []);
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

  function updateSettings(patch) {
    const state = readState();
    state.settings = Object.assign({}, state.settings, patch);
    writeState(state);
    return deepClone(state.settings);
  }

  // Freight Optimization decision (Queue-Manager-only workspace). Records a
  // human hold / release / sales decision on a fictional freight opportunity.
  // No indefinite holds: every hold carries an automatic-release deadline.
  function updateFreight(id, action, note) {
    const state = readState();
    const opportunity = (state.freightOpportunities || []).find((item) => item.id === id);
    if (!opportunity) return { ok: false, message: "Opportunity not found." };
    if (["hold", "release"].includes(opportunity.decision)) {
      return { ok: false, message: "This opportunity already has a final decision. Reset demo data to repeat it." };
    }
    opportunity.decisionHistory = opportunity.decisionHistory || [];
    const now = new Date().toISOString();
    const cleanNote = String(note || "").trim();
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
    opportunity.decisionBy = CURRENT_USER.name;
    opportunity.decisionHistory.push({ at: now, by: CURRENT_USER.name, action, note: cleanNote || "", status: opportunity.status });
    writeState(state);
    return { ok: true, opportunity: deepClone(opportunity) };
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

  function getAssignmentRules() {
    return deepClone(readState().assignmentRules || []);
  }

  function upsertAssignmentRule(rule) {
    const state = readState();
    state.assignmentRules = state.assignmentRules || [];
    const clean = Object.assign({}, rule);
    clean.updatedAt = new Date().toISOString();
    if (clean.id) {
      const existing = state.assignmentRules.find((item) => item.id === clean.id);
      if (existing) {
        Object.assign(existing, clean);
        writeState(state);
        return deepClone(existing);
      }
    }
    clean.id = clean.id || `asg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    clean.appliedCount = Number(clean.appliedCount) || 0;
    clean.createdBy = clean.createdBy || "Queue Manager";
    state.assignmentRules.push(clean);
    writeState(state);
    return deepClone(clean);
  }

  function deleteAssignmentRule(id) {
    const state = readState();
    const before = (state.assignmentRules || []).length;
    state.assignmentRules = (state.assignmentRules || []).filter((item) => item.id !== id);
    writeState(state);
    return before !== state.assignmentRules.length;
  }

  function getTeamAvailability() {
    return deepClone(readState().teamAvailability || {});
  }

  function setMemberAvailability(name, available) {
    const state = readState();
    state.teamAvailability = state.teamAvailability || {};
    state.teamAvailability[name] = Boolean(available);
    writeState(state);
    return deepClone(state.teamAvailability);
  }

  // Non-persisting preview used by the Queue Manager "test a rule" tool.
  function previewAssignment(sampleTicket) {
    const state = readState();
    const ticket = {
      queue: sampleTicket.queue,
      category: sampleTicket.category || "",
      priority: sampleTicket.priority || "P3 - Normal",
      details: { requestTemplateId: sampleTicket.templateId || "" }
    };
    if ((ticket.priority || "").startsWith("P1")) {
      return { matched: false, p1: true, assignee: "", ruleName: "", reason: "P1 incidents bypass automatic assignment." };
    }
    const resolution = resolveAssignment(state, ticket);
    if (!resolution) {
      return { matched: false, assignee: "", ruleName: "", reason: "No active rule matches this queue and request type." };
    }
    return {
      matched: true,
      assignee: resolution.assignee,
      ruleName: resolution.rule.name,
      reason: resolution.fallbackReason || `Primary owner ${resolution.rule.primaryAssignee} is available.`,
      queue: ticket.queue
    };
  }

  function getFlowImprovements() {
    return deepClone(readState().flowImprovements || []);
  }

  // Queue-owned request-flow improvements publish immediately. Governed fields
  // (queue, SLA, priority, approvals, P1, safety) are never changed here.
  function publishFlowImprovement(entry) {
    const state = readState();
    state.flowImprovements = state.flowImprovements || [];
    const record = Object.assign(
      {
        id: `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        status: "published",
        publishedAt: new Date().toISOString(),
        publishedBy: CURRENT_USER.name,
        approval: "Not required (queue-owned change)"
      },
      entry
    );
    state.flowImprovements.unshift(record);
    writeState(state);
    return deepClone(record);
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
    updateApprovalRule,
    getAssignmentRules,
    upsertAssignmentRule,
    deleteAssignmentRule,
    getTeamAvailability,
    setMemberAvailability,
    previewAssignment,
    getFlowImprovements,
    publishFlowImprovement,
    rerouteTicket,
    getClassificationFeedback,
    markClassificationFeedbackSent,
    getEmployees,
    updateEmployeeAccess,
    getAccessRequests,
    decideAccessRequest,
    getAccessAudit
  };
})();
