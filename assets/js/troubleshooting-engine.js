(function () {
  "use strict";

  const Store = window.MasterFlowStore;

  if (!Store) {
    throw new Error(
      "MasterFlowStore must load before troubleshooting-engine.js"
    );
  }

  const STORAGE_KEY = "masterflowTroubleshootingV2";
  const PENDING_KEY = "masterflowPendingTroubleshootingV2";
  const MAX_SESSIONS = 200;

  const ARTICLE_PLAYBOOKS = {
    "kb-printer": {
      mode: "troubleshooting",
      estimatedMinutes: 3,
      allowSolved: true,
      meaning:
        "The workstation may not have the correct printer connection, the printer may be offline, or the stored printer name or IP may have changed.",
      steps: [
        "Confirm the printer has power and note any error message, warning light, or code on the display.",
        "Find the printer name, asset label, or IP address printed on the device.",
        "Ask one nearby user whether they can print to the same printer.",
        "Restart the printer, wait two full minutes, and confirm it returns to a ready state.",
        "Open Settings, then Printers & scanners, and verify the correct printer is listed.",
        "Print a test page and record the exact result or error message."
      ],
      record:
        "Record the printer name or IP, workstation, exact error, whether another user can print, and whether labels or shipping work are blocked.",
      escalation:
        "Stop immediately for smoke, a burning smell, exposed wiring, repeated power loss, or physical damage. Use the P1 fast lane when multiple stations are affected and shipping cannot continue.",
      emergency: true,
      searchTerms: [
        "printer offline",
        "printer connection",
        "cannot print",
        "nothing prints",
        "print queue",
        "printer ip",
        "test page",
        "shipping labels"
      ]
    },

    "kb-laptop": {
      mode: "troubleshooting",
      estimatedMinutes: 4,
      allowSolved: true,
      meaning:
        "A slow laptop is commonly caused by a stuck application, high CPU or memory use, low storage, pending updates, or a network-dependent application.",
      steps: [
        "Save your work and restart the laptop once.",
        "Confirm whether one application is slow or the entire laptop is slow.",
        "Open Task Manager and note CPU, Memory, and Disk percentages while the slowdown is happening.",
        "Check available storage in Settings, then System, then Storage.",
        "Close only nonessential applications you recognize and test again.",
        "Record the laptop asset number, affected applications, and when the issue began."
      ],
      record:
        "Record the laptop asset number, affected applications, CPU/Memory/Disk percentages, available storage, and whether restarting changed the behavior.",
      escalation:
        "Stop using the laptop for overheating, a swollen battery, smoke, burning odor, liquid damage, or repeated unexpected shutdowns.",
      emergency: false,
      searchTerms: [
        "slow laptop",
        "computer slow",
        "high cpu",
        "high memory",
        "disk usage",
        "computer freezing",
        "performance"
      ]
    },

    "kb-email": {
      mode: "guidance",
      estimatedMinutes: 2,
      allowSolved: true,
      meaning:
        "A ticket email is designed to keep every reply and attachment in the same MasterFlow conversation. A second request can split the history and delay resolution.",
      steps: [
        "Open the most recent MasterFlow notification for the correct ticket number.",
        "Keep the original subject line and ticket number unchanged.",
        "Reply above the marked line with the new information or question.",
        "Attach any supporting file before sending the reply.",
        "Open My Requests and confirm the reply appears in the timeline."
      ],
      record:
        "Record the ticket number, email send time, subject, and any bounce or delivery error.",
      escalation:
        "Do not send passwords, credentials, export-controlled data, or unnecessary sensitive information in a ticket reply.",
      emergency: false,
      searchTerms: [
        "reply to ticket",
        "email update",
        "ticket email",
        "attachment",
        "same conversation"
      ]
    },

    "kb-p1": {
      mode: "safety",
      estimatedMinutes: 1,
      allowSolved: false,
      meaning:
        "The P1 fast lane is for an active outage that prevents shipping or blocks a critical warehouse process. It bypasses normal classification so on-call support is alerted immediately.",
      steps: [
        "Confirm that shipping, manifesting, picking, packing, receiving, or another critical process is blocked.",
        "Identify the exact warehouse, process, station, and number of people or stations affected.",
        "Record when the issue started and the exact error or blocked step.",
        "Apply only safe operational containment. Do not bypass safety controls.",
        "Open the Shipping is stopped fast lane immediately."
      ],
      record:
        "Record the warehouse, blocked process, start time, affected users or stations, exact error, and containment already completed.",
      escalation:
        "Use the P1 fast lane immediately. Do not wait for normal ticket classification or continue general troubleshooting.",
      emergency: true,
      searchTerms: [
        "shipping stopped",
        "cannot ship",
        "manifesting down",
        "warehouse outage",
        "outbound blocked",
        "p1"
      ]
    },

    "kb-access": {
      mode: "preparation",
      estimatedMinutes: 2,
      allowSolved: false,
      meaning:
        "Access requests usually require the exact system or report, the role needed, a business reason, and the correct manager or approval path.",
      steps: [
        "Identify the exact system, application, report, shared folder, or data set.",
        "Describe the work the access will enable and why current access is insufficient.",
        "Confirm whether this is new access, a role change, or access that previously worked.",
        "Identify the manager or approver required by the business area.",
        "Record the exact error message if access is denied or missing."
      ],
      record:
        "Record the system or report, requested role, business reason, manager or approver, and exact access error.",
      escalation:
        "Never share passwords, MFA codes, credentials, or another employee's account. Report suspected unauthorized access immediately.",
      emergency: false,
      searchTerms: [
        "access request",
        "permission",
        "role change",
        "cannot access",
        "report access",
        "login denied"
      ]
    },

    "kb-barcode": {
      mode: "troubleshooting",
      estimatedMinutes: 3,
      allowSolved: true,
      meaning:
        "A barcode scanner may be disconnected, pointed at the wrong input field, unable to read the label, or experiencing a device or workstation issue.",
      steps: [
        "Confirm the scanner has power and is securely connected or paired.",
        "Click inside the expected barcode input field before scanning.",
        "Scan a known-good barcode to separate a label issue from a scanner issue.",
        "Inspect the label for damage, glare, wrinkles, or low contrast.",
        "Test another scanner or workstation when one is safely available.",
        "Record the scanner asset number, station, label type, and exact result."
      ],
      record:
        "Record the scanner asset number, station, whether a known-good barcode worked, whether another scanner worked, and any error message.",
      escalation:
        "Use the P1 fast lane when scanner failures block an active shipping process across multiple stations. Stop for damaged batteries, smoke, heat, or exposed wiring.",
      emergency: true,
      searchTerms: [
        "barcode scanner",
        "scanner not reading",
        "scan failure",
        "rf gun",
        "label not scanning",
        "warehouse scanner"
      ]
    }
  };

  const TEMPLATE_GUIDES = {
    "printer-ink": {
      id: "template:printer-ink",
      title: "Confirm the printer supply request",
      summary:
        "Check the supply condition, exact printer, and whether another printer is available before submitting.",
      category: "Hardware",
      tags: ["printer", "toner", "ink", "supply"],
      mode: "preparation",
      estimatedMinutes: 2,
      allowSolved: false,
      meaning:
        "The printer may be low on ink, toner, ribbon, or another cartridge. A complete request helps IT provide the correct supply the first time.",
      steps: [
        "Confirm whether the supply is getting low or completely out.",
        "Record the exact printer name, asset label, or model when available.",
        "Confirm the station or work area where the printer is located.",
        "Check whether a compatible spare supply or backup printer is already available.",
        "Record whether printing is still possible or has stopped."
      ],
      record:
        "Record the printer name, location, supply type, supply status, quantity needed, and current printing impact.",
      escalation:
        "Use the P1 fast lane only when the supply issue has stopped shipping or a critical warehouse process.",
      emergency: true,
      searchTerms: [
        "toner",
        "ink",
        "ribbon",
        "cartridge",
        "printer supply"
      ]
    },

    "equipment-out-of-service": {
      id: "template:equipment-out-of-service",
      title: "Safely prepare an equipment-out-of-service request",
      summary:
        "Contain the equipment safely and capture the facts Facilities needs before arriving.",
      category: "Facilities",
      tags: [
        "forklift",
        "mhe",
        "pallet jack",
        "equipment"
      ],
      mode: "safety",
      estimatedMinutes: 2,
      allowSolved: false,
      meaning:
        "Material-handling equipment that will not start, move, lift, steer, or stop safely requires authorized inspection rather than employee repair.",
      steps: [
        "Stop using the equipment and move it only when doing so is safe and authorized.",
        "Apply the approved out-of-service tag or local containment process.",
        "Record the equipment or MHE number and exact location.",
        "Record the observed failure, alarm, leak, damage, smoke, odor, or charging problem.",
        "Identify who was operating the unit when the issue occurred."
      ],
      record:
        "Record the MHE number, exact location, failure mode, operator, and safety or containment status.",
      escalation:
        "Stop immediately for smoke, fire, chemical or hydraulic leaks, damaged batteries, loss of braking or steering, or any immediate safety risk.",
      emergency: false,
      searchTerms: [
        "forklift",
        "mhe",
        "pallet jack",
        "equipment broken"
      ]
    },

    "corrective-action-warehouse": {
      id: "template:corrective-action-warehouse",
      title: "Prepare a complete warehouse corrective action",
      summary:
        "Capture the problem, impact, immediate containment, and supporting evidence before submission.",
      category: "Quality",
      tags: [
        "corrective action",
        "wrong part",
        "damage",
        "warehouse error"
      ],
      mode: "preparation",
      estimatedMinutes: 3,
      allowSolved: false,
      meaning:
        "A corrective action should preserve evidence and protect affected orders or inventory before root-cause work begins.",
      steps: [
        "Describe exactly what was observed and how it differed from the expected process or order.",
        "Record the order, control number, customer, part, quantity, or location involved.",
        "Place affected orders, shipments, or inventory on hold when required.",
        "Record immediate containment already completed.",
        "Attach photos, labels, paperwork, or other supporting evidence when available."
      ],
      record:
        "Record the observed problem, order or customer impact, containment, identifiers, and evidence.",
      escalation:
        "Escalate immediately when the issue creates a safety risk, export concern, or active customer shipment risk.",
      emergency: false,
      searchTerms: [
        "wrong part",
        "wrong quantity",
        "damage",
        "corrective action"
      ]
    },

    "stock-check-phoenix": {
      id: "template:stock-check-phoenix",
      title: "Prepare a work-ready stock check",
      summary:
        "Specify the part and exact result the warehouse should return.",
      category: "Warehouse operations",
      tags: [
        "stock check",
        "inventory",
        "date code",
        "quantity"
      ],
      mode: "preparation",
      estimatedMinutes: 1,
      allowSolved: false,
      meaning:
        "A stock check is most useful when the warehouse knows the exact part and whether to verify quantity, date codes, condition, packaging, or everything.",
      steps: [
        "Confirm the exact part number.",
        "Choose the required result: quantity, date codes, condition, packaging, or full verification.",
        "Record the order or control number when the request supports an active order.",
        "State whether photos or packaging details are required.",
        "Confirm the correct warehouse or branch."
      ],
      record:
        "Record the part number, requested verification, order or control number, branch, and required evidence.",
      escalation:
        "Escalate through the appropriate operational path when the stock issue is actively blocking shipping.",
      emergency: true,
      searchTerms: [
        "stock check",
        "inventory check",
        "date code",
        "count"
      ]
    },

    "systems-intake": {
      id: "template:systems-intake",
      title: "Capture a reproducible systems issue",
      summary:
        "Gather the system, expected result, actual result, scope, and one clear example.",
      category: "Business systems",
      tags: [
        "OMS",
        "MERP",
        "SYQ",
        "EDI",
        "API",
        "system"
      ],
      mode: "troubleshooting",
      estimatedMinutes: 3,
      allowSolved: true,
      meaning:
        "A systems issue may be isolated to one user or transaction, or it may indicate a broader service problem. A reproducible example speeds diagnosis.",
      steps: [
        "Confirm the exact system and page, screen, transaction, or action involved.",
        "Retry the action once and record the exact error or unexpected result.",
        "Confirm what should have happened instead.",
        "Determine whether one user or example, multiple users, or all transactions are affected.",
        "Capture a safe example number or screenshot without exposing restricted information.",
        "Record the time the problem occurred and whether it is still happening."
      ],
      record:
        "Record the system, action, actual result, expected result, affected scope, example identifier, error, and time.",
      escalation:
        "Use the P1 fast lane when a critical warehouse or shipping process is blocked. Report suspected security or data-exposure issues immediately.",
      emergency: true,
      searchTerms: [
        "OMS",
        "MERP",
        "system not updating",
        "API",
        "EDI"
      ]
    },

    "facilities-hvac": {
      id: "template:facilities-hvac",
      title: "Safely document an HVAC problem",
      summary:
        "Capture the affected area and any leak, smoke, odor, electrical concern, or product risk.",
      category: "Facilities",
      tags: [
        "HVAC",
        "AC",
        "heating",
        "temperature"
      ],
      mode: "safety",
      estimatedMinutes: 2,
      allowSolved: false,
      meaning:
        "Temperature or airflow problems may be local to one zone or may affect a larger warehouse area. Facilities needs the exact location and safety condition.",
      steps: [
        "Confirm the exact room, station, aisle, or warehouse area affected.",
        "Note whether the area is too hot, too cold, has no airflow, is leaking, or is making an unusual noise.",
        "Determine whether one area or multiple areas are affected.",
        "Check for smoke, burning odor, electrical concern, active water leak, or product at risk.",
        "Do not open panels or attempt unauthorized HVAC repairs."
      ],
      record:
        "Record the exact area, observed condition, affected scope, start time, and safety or product-risk concern.",
      escalation:
        "Escalate immediately for smoke, burning odor, electrical concern, active leak near equipment, or temperature-sensitive product at risk.",
      emergency: false,
      searchTerms: [
        "too hot",
        "too cold",
        "AC broken",
        "HVAC",
        "no airflow"
      ]
    },

    "new-it-hardware": {
      id: "template:new-it-hardware",
      title: "Prepare a complete hardware request",
      summary:
        "Confirm the device, purpose, quantity, location, business reason, and cost or quote requirement.",
      category: "IT Information",
      tags: [
        "scanner",
        "laptop",
        "monitor",
        "printer",
        "hardware"
      ],
      mode: "preparation",
      estimatedMinutes: 2,
      allowSolved: false,
      meaning:
        "New and replacement hardware requests may require manager or director approval before IT can purchase or provision the device.",
      steps: [
        "Confirm the exact device type and whether it is new, additional, shared, or replacing an existing device.",
        "Record the work area and person or team that will use it.",
        "Confirm the quantity needed.",
        "Describe the business reason and operational impact.",
        "Provide the estimated cost or indicate that a quote is required."
      ],
      record:
        "Record the device, purpose, location, quantity, business reason, estimated cost or quote requirement, and requested-for employee.",
      escalation:
        "Approval routing is based on the configured dollar threshold. Do not purchase or promise delivery before approval is recorded.",
      emergency: false,
      searchTerms: [
        "new scanner",
        "new laptop",
        "new hardware",
        "replacement scanner"
      ]
    }
  };

  const TEMPLATE_ARTICLE_MAP = {
    "printer-connectivity": "kb-printer"
  };

  const GENERIC_CATEGORY_GUIDES = {
    Hardware: {
      mode: "troubleshooting",
      meaning:
        "The device may be offline, disconnected, misconfigured, or reporting a physical or software error.",
      record:
        "Record the device name or asset, location, exact error, affected users, and what changed after each safe step.",
      escalation:
        "Stop for smoke, heat, burning odor, exposed wiring, battery damage, or any safety concern."
    },

    "Device performance": {
      mode: "troubleshooting",
      meaning:
        "The issue may involve device resources, storage, updates, one application, or network-dependent performance.",
      record:
        "Record the device asset, affected applications, start time, resource usage, and whether restarting changed the issue.",
      escalation:
        "Stop using equipment that is overheating, physically damaged, swelling, smoking, or repeatedly shutting down."
    },

    "Warehouse operations": {
      mode: "safety",
      meaning:
        "The issue may affect an active warehouse process and should be evaluated for operational scope before troubleshooting continues.",
      record:
        "Record the warehouse, process, stations affected, start time, exact error, and containment already completed.",
      escalation:
        "Use the P1 fast lane immediately when shipping or a critical warehouse process is blocked."
    },

    Access: {
      mode: "preparation",
      meaning:
        "The request likely needs the exact resource, permission, business reason, and approval path.",
      record:
        "Record the resource, role, business reason, approver, and exact error or missing permission.",
      escalation:
        "Never share credentials or MFA codes. Escalate suspected unauthorized access immediately."
    },

    "Warehouse technology": {
      mode: "troubleshooting",
      meaning:
        "The device, workstation, label, connection, or application may be preventing normal scanning or warehouse work.",
      record:
        "Record the asset, station, known-good test result, affected scope, and exact error.",
      escalation:
        "Use the P1 fast lane when the issue blocks shipping or a critical process across multiple stations."
    }
  };

  function clone(value) {
    return value == null
      ? value
      : JSON.parse(
          JSON.stringify(value)
        );
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(
        /[^a-z0-9\s-]/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  function words(value) {
    return normalize(value)
      .split(" ")
      .filter(
        (word) =>
          word.length > 2
      );
  }

  function articleList() {
    const state = Store.getState();

    return Array.isArray(
      state.knowledgeArticles
    )
      ? state.knowledgeArticles
      : [];
  }

  function findArticle(articleId) {
    return articleList().find(
      (article) =>
        article.id === articleId
    ) || null;
  }

  function fallbackPlaybook(article) {
    const categoryGuide =
      GENERIC_CATEGORY_GUIDES[
        article.category
      ] || {};

    return {
      mode:
        categoryGuide.mode ||
        "guidance",

      estimatedMinutes: 3,
      allowSolved: true,

      meaning:
        categoryGuide.meaning ||
        article.summary ||
        "This guide covers the most common first steps for this request.",

      steps:
        Array.isArray(article.steps) &&
        article.steps.length
          ? article.steps.slice()
          : [
              article.summary ||
              "Review the available guidance."
            ],

      record:
        categoryGuide.record ||
        "Record the exact result, error, location, asset, system, and affected scope.",

      escalation:
        categoryGuide.escalation ||
        "Stop and contact support when the issue creates a safety, security, compliance, or critical operational risk.",

      emergency:
        article.id === "kb-p1",

      searchTerms: []
    };
  }

  function guideForArticle(articleOrId) {
    const article =
      typeof articleOrId ===
      "string"
        ? findArticle(articleOrId)
        : articleOrId;

    if (!article) return null;

    const playbook =
      ARTICLE_PLAYBOOKS[
        article.id
      ] ||
      fallbackPlaybook(article);

    return {
      id: article.id,
      articleId: article.id,
      title: article.title,
      summary: article.summary,
      category: article.category,
      tags: clone(
        article.tags || []
      ),
      helpful: Number(
        article.helpful || 0
      ),
      source: "knowledge-article",
      ...clone(playbook)
    };
  }

  function guideById(guideId) {
    if (!guideId) return null;

    const article =
      findArticle(guideId);

    if (article) {
      return guideForArticle(article);
    }

    const configured =
      Object.values(
        TEMPLATE_GUIDES
      ).find(
        (guide) =>
          guide.id === guideId
      );

    return configured
      ? {
          helpful: 0,
          source: "request-template",
          articleId: "",
          ...clone(configured)
        }
      : null;
  }

  function guideForTemplate(template) {
    if (!template) return null;

    const articleId =
      TEMPLATE_ARTICLE_MAP[
        template.id
      ];

    if (articleId) {
      return guideForArticle(
        articleId
      );
    }

    const configured =
      TEMPLATE_GUIDES[
        template.id
      ];

    if (configured) {
      return {
        helpful: 0,
        source: "request-template",
        articleId: "",
        ...clone(configured)
      };
    }

    if (template.article) {
      return {
        id:
          `template:${template.id}`,

        articleId: "",

        title:
          template.article.title ||
          template.name,

        summary:
          template.article.summary ||
          template.description,

        category:
          template.catalog,

        tags: [
          template.name,
          template.catalog
        ],

        helpful: 0,
        source: "request-template",
        mode: "preparation",
        estimatedMinutes: 2,
        allowSolved: false,

        meaning:
          template.article.summary ||
          template.description,

        steps: [
          "Review the request information already collected by MasterFlow.",
          "Confirm the exact location, asset, system, order, part, or person involved.",
          "Record the expected outcome and current business impact.",
          "Attach supporting evidence when it will help the receiving team begin work."
        ],

        record:
          "Record the key identifier, location, business impact, and any evidence needed by the receiving team.",

        escalation:
          "Use the appropriate urgent or P1 path when the request creates a safety risk or stops a critical operation.",

        emergency: false,
        searchTerms: []
      };
    }

    return null;
  }

  function scoreArticle(
    article,
    text,
    template
  ) {
    const query =
      normalize(text);

    if (!query) return 0;

    const guide =
      guideForArticle(article);

    const title =
      normalize(article.title);

    const summary =
      normalize(article.summary);

    const category =
      normalize(article.category);

    const tags =
      normalize(
        (article.tags || [])
          .join(" ")
      );

    const steps =
      normalize(
        (
          guide?.steps ||
          article.steps ||
          []
        ).join(" ")
      );

    const searchTerms =
      normalize(
        (
          guide?.searchTerms ||
          []
        ).join(" ")
      );

    const templateText =
      normalize(
        template
          ? `${template.name || ""} ` +
            `${template.catalog || ""} ` +
            `${template.description || ""}`
          : ""
      );

    let score = 0;

    if (
      title.includes(query)
    ) {
      score += 90;
    }

    if (
      summary.includes(query)
    ) {
      score += 50;
    }

    if (
      tags.includes(query)
    ) {
      score += 60;
    }

    if (
      searchTerms.includes(query)
    ) {
      score += 80;
    }

    if (
      steps.includes(query)
    ) {
      score += 30;
    }

    words(query).forEach(
      (word) => {
        if (title.includes(word)) {
          score += 20;
        }

        if (
          searchTerms.includes(word)
        ) {
          score += 18;
        }

        if (tags.includes(word)) {
          score += 15;
        }

        if (summary.includes(word)) {
          score += 10;
        }

        if (steps.includes(word)) {
          score += 5;
        }

        if (category.includes(word)) {
          score += 6;
        }

        if (
          templateText.includes(word)
        ) {
          score += 4;
        }
      }
    );

    const mappedArticleId =
      template &&
      TEMPLATE_ARTICLE_MAP[
        template.id
      ];

    if (
      mappedArticleId ===
      article.id
    ) {
      score += 150;
    }

    return score;
  }

  function isShippingStopped(text) {
    const input =
      normalize(text);

    const shipping =
      /\bshipping\b|\bshipment\b|\bmanifest(?:ing)?\b|\boutbound\b/.test(
        input
      );

    const blocked =
      /\bstopped\b|\bdown\b|\bblocked\b|\bcannot\b|\bcan t\b|\bunable\b|\bnot working\b/.test(
        input
      );

    return shipping && blocked;
  }

  function recommend(options) {
    const settings =
      options || {};

    const text =
      String(
        settings.text || ""
      ).trim();

    const template =
      settings.template || null;

    if (
      isShippingStopped(text)
    ) {
      const article =
        findArticle("kb-p1");

      const guide =
        article
          ? guideForArticle(article)
          : null;

      return guide
        ? {
            guide,
            score: 999,

            reason:
              "The description indicates that shipping or a critical outbound process may be stopped.",

            confidence:
              "Immediate"
          }
        : null;
    }

    const templateGuide =
      guideForTemplate(template);

    if (templateGuide) {
      return {
        guide: templateGuide,
        score: 160,

        reason:
          `This guidance is configured for the ${template.name} request flow.`,

        confidence: "High"
      };
    }

    const ranked =
      articleList()
        .map((article) => ({
          article,
          guide:
            guideForArticle(article),

          score:
            scoreArticle(
              article,
              text,
              template
            )
        }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            Number(
              b.article.helpful || 0
            ) -
            Number(
              a.article.helpful || 0
            )
        );

    const best = ranked[0];

    if (
      !best ||
      best.score < 12
    ) {
      return null;
    }

    return {
      guide: best.guide,
      score: best.score,

      reason:
        "MasterFlow matched the issue wording to this knowledge guide.",

      confidence:
        best.score >= 80
          ? "High"
          : best.score >= 35
            ? "Medium"
            : "Possible"
    };
  }

  function searchArticles(
    text,
    category
  ) {
    const selectedCategory =
      category || "all";

    const query =
      String(text || "").trim();

    return articleList()
      .map((article) => ({
        article: clone(article),

        guide:
          guideForArticle(article),

        score:
          query
            ? scoreArticle(
                article,
                query,
                null
              )
            : 0
      }))
      .filter(
        ({
          article,
          score
        }) => {
          const categoryMatch =
            selectedCategory ===
              "all" ||
            article.category ===
              selectedCategory;

          return (
            categoryMatch &&
            (!query || score > 0)
          );
        }
      )
      .sort((a, b) => {
        if (
          query &&
          b.score !== a.score
        ) {
          return b.score - a.score;
        }

        return (
          Number(
            b.article.helpful || 0
          ) -
          Number(
            a.article.helpful || 0
          )
        );
      });
  }

  function emptyState() {
    return {
      version: 1,
      sessions: []
    };
  }

  function readState() {
    try {
      const parsed =
        JSON.parse(
          window.localStorage.getItem(
            STORAGE_KEY
          ) || "null"
        );

      if (
        !parsed ||
        parsed.version !== 1 ||
        !Array.isArray(
          parsed.sessions
        )
      ) {
        return emptyState();
      }

      return parsed;
    } catch (error) {
      console.warn(
        "Troubleshooting history was reset because it could not be read.",
        error
      );

      return emptyState();
    }
  }

  function writeState(state) {
    const safeState = {
      version: 1,

      sessions:
        (state.sessions || [])
          .slice(
            0,
            MAX_SESSIONS
          )
    };

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(safeState)
    );

    window.dispatchEvent(
      new CustomEvent(
        "masterflow:troubleshooting",
        {
          detail: clone(safeState)
        }
      )
    );

    return safeState;
  }

  function sessionId() {
    if (
      window.crypto &&
      typeof window.crypto
        .randomUUID ===
        "function"
    ) {
      return (
        `trouble-` +
        window.crypto.randomUUID()
      );
    }

    return (
      `trouble-${Date.now()}-` +
      Math.random()
        .toString(36)
        .slice(2, 9)
    );
  }

  function startSession(options) {
    const settings =
      options || {};

    const guide =
      settings.guide;

    if (!guide) {
      throw new Error(
        "A troubleshooting guide is required."
      );
    }

    const now =
      new Date().toISOString();

    const session = {
      id: sessionId(),

      source:
        settings.source ||
        "smart-request",

      templateId:
        settings.templateId || "",

      articleId:
        guide.articleId || "",

      guideId:
        guide.id,

      guideTitle:
        guide.title,

      guideMode:
        guide.mode || "guidance",

      issueText:
        String(
          settings.issueText || ""
        ).trim(),

      completedSteps: [],
      affectedScope: "",
      identifiers: "",
      result: "",
      notes: "",
      outcome: "started",
      createdAt: now,
      updatedAt: now,
      completedAt: ""
    };

    return saveSession(session);
  }

  function saveSession(session) {
    const next =
      clone(session);

    next.updatedAt =
      new Date().toISOString();

    const state =
      readState();

    const existingIndex =
      state.sessions.findIndex(
        (item) =>
          item.id === next.id
      );

    if (
      existingIndex >= 0
    ) {
      state.sessions.splice(
        existingIndex,
        1
      );
    }

    state.sessions.unshift(next);
    writeState(state);

    return clone(next);
  }

  function finishSession(
    session,
    patch,
    outcome
  ) {
    const next = {
      ...clone(session),
      ...clone(patch || {}),
      outcome,

      completedAt:
        new Date().toISOString()
    };

    return saveSession(next);
  }

  function metrics() {
    const sessions =
      readState().sessions;

    return {
      opened:
        sessions.length,

      solved:
        sessions.filter(
          (item) =>
            item.outcome ===
            "solved"
        ).length,

      escalated:
        sessions.filter(
          (item) =>
            item.outcome ===
            "escalated"
        ).length,

      skipped:
        sessions.filter(
          (item) =>
            item.outcome ===
            "skipped"
        ).length,

      stepsCompleted:
        sessions.reduce(
          (total, item) =>
            total +
            (
              Array.isArray(
                item.completedSteps
              )
                ? item.completedSteps
                    .length
                : 0
            ),
          0
        )
    };
  }

  function setPending(session) {
    if (!session) {
      window.localStorage.removeItem(
        PENDING_KEY
      );

      return;
    }

    window.localStorage.setItem(
      PENDING_KEY,
      JSON.stringify(session)
    );
  }

  function getPending() {
    try {
      const parsed =
        JSON.parse(
          window.localStorage.getItem(
            PENDING_KEY
          ) || "null"
        );

      return (
        parsed &&
        parsed.id
          ? parsed
          : null
      );
    } catch (error) {
      return null;
    }
  }

  function clearPending() {
    window.localStorage.removeItem(
      PENDING_KEY
    );
  }

  function ticketRecord(session) {
    if (!session) return null;

    return {
      sessionId: session.id,
      guideId: session.guideId,
      articleId: session.articleId,
      guideTitle:
        session.guideTitle,
      mode: session.guideMode,
      outcome: session.outcome,

      completedSteps:
        clone(
          session.completedSteps ||
          []
        ),

      affectedScope:
        session.affectedScope || "",

      identifiers:
        session.identifiers || "",

      result:
        session.result || "",

      notes:
        session.notes || "",

      createdAt:
        session.createdAt,

      completedAt:
        session.completedAt ||
        session.updatedAt
    };
  }

  function formatForRequest(session) {
    if (!session) return "";

    const lines = [
      `Troubleshooting guide used: ${session.guideTitle}`,

      session.completedSteps &&
      session.completedSteps.length
        ? `Steps completed:\n- ${session.completedSteps.join(
            "\n- "
          )}`
        : "Steps completed: None recorded",

      session.affectedScope
        ? `Affected scope: ${session.affectedScope}`
        : "",

      session.identifiers
        ? `Location / asset / system / error: ${session.identifiers}`
        : "",

      session.result
        ? `Result after troubleshooting: ${session.result}`
        : "",

      session.notes
        ? `Additional notes: ${session.notes}`
        : ""
    ].filter(Boolean);

    return lines.join("\n");
  }

  window.MasterFlowTroubleshooting = {
    STORAGE_KEY,
    PENDING_KEY,
    recommend,
    searchArticles,
    guideForArticle,
    guideForTemplate,
    guideById,
    startSession,
    saveSession,
    finishSession,
    metrics,
    setPending,
    getPending,
    clearPending,
    ticketRecord,
    formatForRequest,
    isShippingStopped
  };
})();
