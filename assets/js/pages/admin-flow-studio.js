(function () {
  "use strict";

  if (
    document.body.dataset.page !==
    "admin-templates"
  ) {
    return;
  }

  const Templates =
    window.MasterFlowTemplates;

  const Engine =
    window.MasterFlowRequestEngine;

  const UI =
    window.MasterFlowUI;

  if (
    !Templates ||
    !Engine ||
    !UI ||
    !UI.layoutReady
  ) {
    console.error(
      "MasterFlow Flow Studio could not start because a dependency is missing."
    );

    return;
  }

  const ROLE_KEY =
    "masterflowAdminRoleV1";

  const FEEDBACK_KEY =
    "masterflowFlowFeedbackV1";

  const PROPOSALS_KEY =
    "masterflowFlowProposalsV1";

  const ROLE_IDS = new Set([
    "platform-admin",
    "category-owner",
    "queue-manager"
  ]);

  // FLOW STUDIO M1: ROLE MODEL
  const ROLES = {
    "platform-admin": {
      label:
        "Megan Delia — Enterprise Administrator",

      eyebrow:
        "Enterprise administrator",

      badge:
        "Enterprise scope",

      badgeClass:
        "badge-purple",

      description:
        "View and edit every request flow, including governed routing, priority, SLA, approval, P1, and safety controls.",

      permissions: [
        "All request flows",
        "Governed settings",
        "Ownership and approvals"
      ],

      templateIds: ["*"],
      queues: ["*"],

      canEdit: true,
      canEditGoverned: true,
      canReset: true
    },

    "category-owner": {
      label:
        "IT Request Category Owner",

      eyebrow:
        "Request category owner",

      badge:
        "Owned IT flows",

      badgeClass:
        "badge-teal",

      description:
        "Teach and test the IT flows you own. Request wording, recognition, questions, options, and work-readiness content are editable; governed controls stay locked.",

      permissions: [
        "Owned request flows",
        "Questions and evidence",
        "Recognition and guidance"
      ],

      templateIds: [
        "printer-ink",
        "printer-connectivity",
        "systems-intake"
      ],

      queues: [],

      canEdit: true,
      canEditGoverned: false,
      canReset: false
    },

    "queue-manager": {
      label:
        "IT Help Desk Queue Manager",

      eyebrow:
        "Queue manager",

      badge:
        "Managed IT queues",

      badgeClass:
        "badge-blue",

      description:
        "Review and test flows entering IT Help Desk, IT Information, and Business Enablement - Systems Intake. Configuration is read-only.",

      permissions: [
        "Managed-queue flows",
        "Read-only flow details",
        "Flow testing"
      ],

      templateIds: [],

      queues: [
        "IT Help Desk",
        "IT Information",
        "Business Enablement - Systems Intake"
      ],

      canEdit: false,
      canEditGoverned: false,
      canReset: false
    }
  };

  const CATEGORY_OWNER_LOCKS = [
    "#templateCatalog",
    "#templateQueue",
    "#templatePriority",
    "#responseSla",
    "#resolutionSla",
    '[data-field-prop="id"]',
    '[data-field-prop="extractor"]',
    '[data-field-prop="profileValue"]',
    '[data-field-prop="locked"]'
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function query(
    selector,
    root = document
  ) {
    return root.querySelector(selector);
  }

  function queryAll(
    selector,
    root = document
  ) {
    return Array.from(
      root.querySelectorAll(selector)
    );
  }

  function escapeHtml(value) {
    return UI.escapeHtml(
      String(
        value == null
          ? ""
          : value
      )
    );
  }

  const storedRole =
    window.localStorage.getItem(
      ROLE_KEY
    );

  let roleId =
    ROLE_IDS.has(storedRole)
      ? storedRole
      : "platform-admin";

  let activeTemplateId =
    "printer-ink";

  let renderQueued = false;

  function readLocalArray(key) {
    try {
      const value = JSON.parse(
        window.localStorage.getItem(
          key
        ) || "[]"
      );

      return Array.isArray(value)
        ? value
        : [];
    } catch (error) {
      console.warn(
        `MasterFlow could not read ${key}.`,
        error
      );

      return [];
    }
  }

  function role() {
    return ROLES[roleId];
  }

  function allTemplates() {
    const templates =
      Templates.getAll();

    return Array.isArray(templates)
      ? templates
      : [];
  }

  function activeTemplate() {
    return Templates.get(
      activeTemplateId
    );
  }

  function templateInScope(
    template
  ) {
    const current = role();

    if (!template) {
      return false;
    }

    if (
      current.templateIds.includes("*") ||
      current.queues.includes("*")
    ) {
      return true;
    }

    return (
      current.templateIds.includes(
        template.id
      ) ||
      current.queues.includes(
        template.queue
      )
    );
  }

  function visibleTemplates() {
    return allTemplates().filter(
      templateInScope
    );
  }

  // FLOW STUDIO M1: PAGE SHELL
  function addRoleSelector() {
    if (byId("adminRoleSelect")) {
      return;
    }

    const title =
      query(".flow-studio-title");

    if (!title) {
      return;
    }

    title.insertAdjacentHTML(
      "afterend",
      `
        <aside
          class="flow-role-panel"
          aria-labelledby="adminRoleTitle"
        >
          <div class="flow-role-panel-header">
            <div>
              <div
                class="eyebrow"
                id="adminRoleEyebrow"
              >
                Enterprise administrator
              </div>

              <strong id="adminRoleTitle">
                Megan Delia — Enterprise Administrator
              </strong>
            </div>

            <span
              class="badge badge-purple"
              id="adminRoleBadge"
            >
              Enterprise scope
            </span>
          </div>

          <div class="field">
            <label for="adminRoleSelect">
              View as
            </label>

            <select
              class="select"
              id="adminRoleSelect"
            >
              <option value="platform-admin">
                Megan Delia — Enterprise Administrator
              </option>

              <option value="category-owner">
                IT Request Category Owner
              </option>

              <option value="queue-manager">
                IT Help Desk Queue Manager
              </option>
            </select>
          </div>

          <p
            class="flow-role-description"
            id="adminRoleDescription"
          ></p>

          <div
            class="flow-role-permissions"
            id="adminRolePermissions"
            aria-label="Role permissions"
          ></div>
        </aside>
      `
    );
  }

  function addFlowTest() {
    if (byId("flowTestCard")) {
      return;
    }

    const manager =
      query(".template-manager");

    if (!manager) {
      return;
    }

    manager.insertAdjacentHTML(
      "beforebegin",
      `
        <section
          class="card flow-test-card mt-18"
          id="flowTestCard"
          aria-labelledby="flowTestTitle"
        >
          <div class="card-header">
            <div>
              <div class="eyebrow">
                Test
              </div>

              <h2 id="flowTestTitle">
                Try an employee request
              </h2>

              <p>
                Run the live request engine
                without creating a ticket.
              </p>
            </div>

            <span class="badge badge-teal">
              Live request engine
            </span>
          </div>

          <div class="card-body">
            <form
              class="flow-test-form"
              id="flowTestForm"
            >
              <div class="field">
                <label for="flowTestInput">
                  Employee says
                </label>

                <input
                  class="input"
                  id="flowTestInput"
                  value="Paper jam"
                  autocomplete="off"
                  required
                >
              </div>

              <button
                class="btn btn-primary"
                type="submit"
              >
                Test flow
              </button>
            </form>

            <div
              class="flow-test-result"
              id="flowTestResult"
              aria-live="polite"
            ></div>
          </div>
        </section>
      `
    );
  }

  // FLOW STUDIO M2: HUMAN-READABLE FLOW CARD
  function addFlowCard() {
    if (byId("flowCard")) {
      return;
    }

    const manager =
      query(".template-manager");

    if (!manager) {
      console.error(
        "Flow Studio could not find .template-manager."
      );

      return;
    }

    manager.insertAdjacentHTML(
      "beforebegin",
      `
        <section
          class="card flow-card mt-18"
          id="flowCard"
          aria-labelledby="flowCardTitle"
        >
          <div class="card-header">
            <div>
              <div class="eyebrow">
                Understand
              </div>

              <h2 id="flowCardTitle">
                Request Flow Card
              </h2>

              <p id="flowCardSubtitle">
                Choose a request flow to see
                its operational design.
              </p>
            </div>

            <span
              class="badge badge-purple"
              id="flowCardAccessBadge"
            >
              Full edit
            </span>
          </div>

          <div
            class="card-body"
            id="flowCardBody"
          >
            <div class="empty-state">
              Select a request type to
              review the flow.
            </div>
          </div>
        </section>
      `
    );
  }

  function updateRoleSummary() {
    const current = role();
    const scoped = visibleTemplates();
    const templates = allTemplates();

    document.body.dataset
      .flowStudioRole = roleId;

    document.body.dataset
      .adminRole = roleId;

    const select =
      byId("adminRoleSelect");

    if (
      select &&
      select.value !== roleId
    ) {
      select.value = roleId;
    }

    const eyebrow =
      byId("adminRoleEyebrow");

    const title =
      byId("adminRoleTitle");

    const badge =
      byId("adminRoleBadge") ||
      byId("flowRoleBadge");

    if (eyebrow) {
      eyebrow.textContent =
        current.eyebrow;
    }

    if (title) {
      title.textContent =
        current.label;
    }

    if (badge) {
      badge.className =
        `badge ${current.badgeClass}`;

      badge.textContent =
        current.badge;
    }

    [
      byId("adminRoleDescription"),
      byId("flowRoleDescription")
    ]
      .filter(Boolean)
      .forEach((element) => {
        element.textContent =
          current.description;
      });

    const permissions =
      byId("adminRolePermissions");

    if (permissions) {
      permissions.innerHTML =
        current.permissions
          .map(
            (item) => `
              <span class="flow-permission-chip">
                ${escapeHtml(item)}
              </span>
            `
          )
          .join("");
    }

    const visibleFlowCount =
      byId("visibleFlowCount");

    if (visibleFlowCount) {
      visibleFlowCount.textContent =
        String(scoped.length);
    }

    const visibleFlowHint =
      byId("visibleFlowHint");

    if (visibleFlowHint) {
      visibleFlowHint.textContent =
        `of ${templates.length} company request flows`;
    }

    const feedbackSignalCount =
      byId("feedbackSignalCount");

    if (feedbackSignalCount) {
      feedbackSignalCount.textContent =
        String(
          readLocalArray(
            FEEDBACK_KEY
          ).length
        );
    }

    const pendingProposalCount =
      byId("pendingProposalCount");

    if (pendingProposalCount) {
      const openStatuses =
        new Set([
          "draft",
          "pending-approval",
          "approved"
        ]);

      const count =
        readLocalArray(
          PROPOSALS_KEY
        ).filter(
          (item) =>
            openStatuses.has(
              item.status
            )
        ).length;

      pendingProposalCount.textContent =
        String(count);
    }

    const governedControlCount =
      byId("governedControlCount");

    if (governedControlCount) {
      governedControlCount.textContent =
        current.canEditGoverned
          ? "Full"
          : current.canEdit
            ? "Approval"
            : "View";
    }

    const flowRoleScope =
      byId("flowRoleScope");

    if (flowRoleScope) {
      flowRoleScope.textContent =
        `${scoped.length} of ` +
        `${templates.length} ` +
        "request flows visible";
    }
  }

  // FLOW STUDIO M1: ROLE-SCOPED TEMPLATE ACCESS
  function rememberActiveTemplate() {
    const selected =
      query(
        "#templateList " +
        "[data-template-id].active, " +
        "#templateList " +
        "[data-template-id].selected, " +
        "#templateList " +
        '[data-template-id][aria-selected="true"]'
      );

    if (selected) {
      activeTemplateId =
        selected.dataset.templateId;
    }
  }

  function applyListScope() {
    const allowed =
      new Set(
        visibleTemplates().map(
          (template) => template.id
        )
      );

    const buttons =
      queryAll(
        "#templateList " +
        "[data-template-id]"
      );

    buttons.forEach((button) => {
      button.hidden =
        !allowed.has(
          button.dataset.templateId
        );
    });

    const count =
      byId("templateCount");

    if (count) {
      count.textContent =
        `${allowed.size} visible of ` +
        `${allTemplates().length} ` +
        "configured request types";
    }

    if (
      !allowed.has(
        activeTemplateId
      )
    ) {
      const first =
        buttons.find(
          (button) =>
            !button.hidden
        );

      if (first) {
        activeTemplateId =
          first.dataset.templateId;

        first.click();
      }
    }
  }

  function setDisabled(
    control,
    forced
  ) {
    if (
      !control.dataset
        .flowStudioOriginalDisabled
    ) {
      control.dataset
        .flowStudioOriginalDisabled =
          control.disabled
            ? "true"
            : "false";
    }

    control.disabled =
      control.dataset
        .flowStudioOriginalDisabled ===
        "true" ||
      forced;
  }

  function ensurePermissionBanner() {
    if (
      byId(
        "flowEditorPermissionBanner"
      )
    ) {
      return;
    }

    const header =
      query(
        "#templateForm .card-header"
      );

    if (!header) {
      return;
    }

    header.insertAdjacentHTML(
      "afterend",
      `
        <div
          class="flow-permission-banner"
          id="flowEditorPermissionBanner"
        >
          <strong
            id="flowPermissionTitle"
          ></strong>

          <span
            id="flowPermissionDetail"
          ></span>
        </div>
      `
    );
  }

  function permissionCopy(inScope) {
    if (!inScope) {
      return [
        "none",
        "Outside this role's scope",
        "Choose a request flow owned or managed by the selected role."
      ];
    }

    if (!role().canEdit) {
      return [
        "read-only",
        "Read-only queue view",
        "Queue Managers can inspect and test this flow, but cannot change request design or governed behavior."
      ];
    }

    if (
      !role().canEditGoverned
    ) {
      return [
        "limited-edit",
        "Owned-flow editing",
        "Wording, recognition, questions, options, and work-readiness content are editable. Catalog, queue, priority, SLA, and technical bindings are locked."
      ];
    }

    return [
      "full-edit",
      "Enterprise administrator editing",
      "All request-flow settings are editable in this prototype."
    ];
  }

  function applyEditorPermissions() {
    const form =
      byId("templateForm");

    if (!form) {
      return;
    }

    ensurePermissionBanner();
    rememberActiveTemplate();

    const inScope =
      templateInScope(
        activeTemplate()
      );

    const canEdit =
      inScope &&
      role().canEdit;

    const [
      access,
      title,
      detail
    ] = permissionCopy(
      inScope
    );

    form.dataset.flowAccess =
      access;

    const banner =
      byId(
        "flowEditorPermissionBanner"
      );

    if (banner) {
      banner.dataset.access =
        access;
    }

    const permissionTitle =
      byId("flowPermissionTitle");

    if (permissionTitle) {
      permissionTitle.textContent =
        title;
    }

    const permissionDetail =
      byId("flowPermissionDetail");

    if (permissionDetail) {
      permissionDetail.textContent =
        detail;
    }

    queryAll(
      "input, select, textarea, button",
      form
    ).forEach((control) => {
      setDisabled(
        control,
        !canEdit
      );
    });

    queryAll(
      ".flow-governed-field",
      form
    ).forEach((field) => {
      field.classList.remove(
        "flow-governed-field"
      );
    });

    if (
      canEdit &&
      !role().canEditGoverned
    ) {
      queryAll(
        CATEGORY_OWNER_LOCKS.join(
          ","
        ),
        form
      ).forEach((control) => {
        setDisabled(
          control,
          true
        );

        const field =
          control.closest(".field");

        if (field) {
          field.classList.add(
            "flow-governed-field"
          );
        }
      });
    }

    const save =
      query(
        'button[type="submit"]',
        form
      );

    if (save) {
      save.hidden =
        !canEdit;

      setDisabled(
        save,
        !canEdit
      );
    }

    const reset =
      byId("resetTemplates");

    if (reset) {
      reset.disabled =
        !role().canReset;

      reset.title =
        role().canReset
          ? "Restore prototype template defaults"
          : "Only Megan Delia can reset company flow configuration";
    }
  }

  function restoreGovernedValues() {
    const template =
      activeTemplate();

    if (!template) {
      return;
    }

    const values = {
      templateCatalog:
        template.catalog || "",

      templateQueue:
        template.queue || "",

      templatePriority:
        template.priority || "",

      responseSla:
        template.responseSlaHours ==
        null
          ? ""
          : template.responseSlaHours,

      resolutionSla:
        template
          .resolutionSlaHours ==
        null
          ? ""
          : template
              .resolutionSlaHours
    };

    Object.entries(
      values
    ).forEach(
      ([id, value]) => {
        const control =
          byId(id);

        if (control) {
          control.value =
            value;
        }
      }
    );
  }

  function firstText(...values) {
    for (const value of values) {
      if (Array.isArray(value)) {
        const joined =
          value
            .map((item) =>
              String(
                item == null
                  ? ""
                  : item
              ).trim()
            )
            .filter(Boolean)
            .join(", ");

        if (joined) {
          return joined;
        }
      }

      if (
        value !== null &&
        value !== undefined &&
        typeof value !== "object"
      ) {
        const text =
          String(value).trim();

        if (text) {
          return text;
        }
      }
    }

    return "";
  }

  function humanize(value) {
    return String(value || "")
      .replace(
        /([a-z0-9])([A-Z])/g,
        "$1 $2"
      )
      .replace(
        /[-_]+/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );
  }

  function uniqueText(items) {
    const seen =
      new Set();

    return items
      .map((item) =>
        String(
          item == null
            ? ""
            : item
        ).trim()
      )
      .filter((item) => {
        const key =
          item.toLowerCase();

        if (
          !item ||
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      });
  }

  function templateFields(
    template
  ) {
    return (
      template &&
      Array.isArray(
        template.fields
      )
    )
      ? template.fields
      : [];
  }

  function diagnosticQuestions(
    template
  ) {
    return (
      template &&
      template.diagnostics &&
      Array.isArray(
        template.diagnostics
          .questions
      )
    )
      ? template.diagnostics
          .questions
      : [];
  }

  function requiredDiagnosticIds(
    template
  ) {
    return (
      template &&
      template.diagnostics &&
      Array.isArray(
        template.diagnostics
          .requiredForWork
      )
    )
      ? template.diagnostics
          .requiredForWork
      : [];
  }

  function fieldLabel(field) {
    return firstText(
      field &&
        field.employeeLabel,

      field &&
        field.label,

      field &&
        field.name,

      humanize(
        field &&
          field.id
      )
    );
  }

  function questionLabel(
    question
  ) {
    return firstText(
      question &&
        question.reportLabel,

      question &&
        question.label,

      humanize(
        question &&
          question.id
      )
    );
  }

  function flowCardUseCase(
    template
  ) {
    const configured =
      firstText(
        template
          .employeeFacingDescription,

        template
          .employeeDescription,

        template.description,

        template.helpText,

        template.summary
      );

    if (configured) {
      return configured;
    }

    const name =
      firstText(
        template.name,
        "this request flow"
      );

    return (
      "Use when an employee needs " +
      `help with ${name.toLowerCase()}.`
    );
  }

  function flowCardEvidence(
    template
  ) {
    const excluded =
      new Set([
        "requestedFor",
        "requestedBy",
        "shortDescription",
        "description",
        "attachments"
      ]);

    const fields =
      templateFields(
        template
      ).filter(
        (field) =>
          field &&
          !excluded.has(
            field.id
          )
      );

    const required =
      fields.filter(
        (field) =>
          field.required
      );

    const selected =
      required.length
        ? required
        : fields.slice(0, 5);

    const questions =
      diagnosticQuestions(
        template
      );

    const diagnostics =
      requiredDiagnosticIds(
        template
      ).map((id) => {
        const question =
          questions.find(
            (item) =>
              item.id === id
          );

        return question
          ? questionLabel(
              question
            )
          : humanize(id);
      });

    return uniqueText([
      ...selected.map(
        fieldLabel
      ),
      ...diagnostics
    ]).slice(0, 8);
  }

  function flowCardUrgency(
    template,
    evidence
  ) {
    const priority =
      firstText(
        template.priority,
        template.defaultPriority
      );

    const items = [
      priority
        ? `Default priority: ${priority}`
        : "Default priority follows the existing request-flow rules."
    ];

    const text =
      evidence
        .join(" ")
        .toLowerCase();

    if (
      /scope|affected|users?|station|line/
        .test(text)
    ) {
      items.push(
        "Affected scope can increase urgency."
      );
    }

    if (
      /impact|outage|stopped|production|safety/
        .test(text)
    ) {
      items.push(
        "Business impact can increase urgency."
      );
    }

    items.push(
      "Shipping stopped: P1 bypass."
    );

    return uniqueText(items);
  }

  function flowCardReceiverItems(
    template,
    evidence
  ) {
    const configured = [];

    if (
      Array.isArray(
        template.receiverBriefItems
      )
    ) {
      configured.push(
        ...template
          .receiverBriefItems
      );
    }

    if (
      typeof template
        .receiverBrief ===
      "string"
    ) {
      configured.push(
        template.receiverBrief
      );
    }

    const action =
      firstText(
        template
          .suggestedFirstAction,

        template.firstAction
      );

    return uniqueText([
      ...configured,
      "Actionable request title",
      ...evidence.slice(0, 4),

      action
        ? `Suggested first action: ${action}`
        : "Suggested first action",

      "Known information gaps"
    ]).slice(0, 8);
  }

  function flowCardWorkQuestions(
    template
  ) {
    const excluded =
      new Set([
        "requestedFor",
        "requestedBy",
        "attachments"
      ]);

    const fieldPrompts =
      templateFields(
        template
      )
        .filter(
          (field) =>
            field &&
            field.required &&
            !excluded.has(
              field.id
            )
        )
        .map((field) => {
          const configured =
            firstText(
              field.question,
              field.prompt
            );

          if (configured) {
            return configured;
          }

          return (
            "Provide " +
            `${fieldLabel(field).toLowerCase()}.`
          );
        });

    const required =
      requiredDiagnosticIds(
        template
      );

    const diagnosticPrompts =
      diagnosticQuestions(
        template
      )
        .filter(
          (question) =>
            question.required ||
            required.includes(
              question.id
            )
        )
        .map((question) =>
          firstText(
            question.question,
            question.prompt,
            question.label,
            humanize(
              question.id
            )
          )
        );

    return uniqueText([
      ...fieldPrompts,
      ...diagnosticPrompts
    ]).slice(0, 10);
  }

  function flowCardList(
    items,
    emptyText
  ) {
    if (!items.length) {
      return `
        <p class="flow-card-empty">
          ${escapeHtml(emptyText)}
        </p>
      `;
    }

    return `
      <ul class="flow-card-list">
        ${items
          .map(
            (item) => `
              <li>
                ${escapeHtml(item)}
              </li>
            `
          )
          .join("")}
      </ul>
    `;
  }

  function flowCardAccess() {
    if (
      role().canEditGoverned
    ) {
      return {
        label: "Full edit",
        className:
          "badge-purple"
      };
    }

    if (role().canEdit) {
      return {
        label:
          "Owned content",

        className:
          "badge-teal"
      };
    }

    return {
      label: "Read-only",
      className: "badge-blue"
    };
  }

  function renderFlowCard() {
    const body =
      byId("flowCardBody");

    const title =
      byId("flowCardTitle");

    const subtitle =
      byId("flowCardSubtitle");

    const badge =
      byId(
        "flowCardAccessBadge"
      );

    if (
      !body ||
      !title ||
      !subtitle ||
      !badge
    ) {
      return;
    }

    const template =
      activeTemplate();

    const access =
      flowCardAccess();

    badge.className =
      `badge ${access.className}`;

    badge.textContent =
      access.label;

    if (
      !template ||
      !templateInScope(
        template
      )
    ) {
      title.textContent =
        "Request Flow Card";

      subtitle.textContent =
        "Choose a request flow available to the selected role.";

      body.innerHTML = `
        <div class="empty-state">
          No in-scope request flow is selected.
        </div>
      `;

      return;
    }

    const evidence =
      flowCardEvidence(
        template
      );

    const urgency =
      flowCardUrgency(
        template,
        evidence
      );

    const receiver =
      flowCardReceiverItems(
        template,
        evidence
      );

    const questions =
      flowCardWorkQuestions(
        template
      );

    const route =
      firstText(
        template.queue,
        template.receivingQueue,
        "Existing receiving queue"
      );

    const sla = [];

    if (
      template.responseSlaHours !=
      null
    ) {
      sla.push(
        `${template.responseSlaHours}h response`
      );
    }

    if (
      template
        .resolutionSlaHours !=
      null
    ) {
      sla.push(
        `${template.resolutionSlaHours}h resolution`
      );
    }

    title.textContent =
      firstText(
        template.name,
        "Selected request flow"
      );

    subtitle.textContent =
      role().canEdit
        ? (
            "Plain-language summary of what " +
            "MasterFlow learns, routes, and " +
            "gives the receiver."
          )
        : (
            "Read-only summary of the request " +
            "flow entering your managed queue."
          );

    body.innerHTML = `
      <div class="flow-card-grid">
        <section
          class="
            flow-card-section
            flow-card-section-wide
          "
        >
          <div class="flow-card-section-heading">
            <span>1</span>

            <h3>
              When employees need this
            </h3>
          </div>

          <p class="flow-card-copy">
            ${escapeHtml(
              flowCardUseCase(
                template
              )
            )}
          </p>
        </section>

        <section class="flow-card-section">
          <div class="flow-card-section-heading">
            <span>2</span>

            <h3>
              What MasterFlow must learn
            </h3>
          </div>

          ${flowCardList(
            evidence,
            "No required evidence has been configured yet."
          )}
        </section>

        <section class="flow-card-section">
          <div class="flow-card-section-heading">
            <span>3</span>

            <h3>
              Where the work goes
            </h3>
          </div>

          <div class="flow-card-route">
            ${escapeHtml(route)}
          </div>

          <p class="flow-card-meta">
            ${escapeHtml(
              sla.length
                ? sla.join(" • ")
                : (
                    "Existing queue ownership " +
                    "and SLA controls are preserved."
                  )
            )}
          </p>
        </section>

        <section class="flow-card-section">
          <div class="flow-card-section-heading">
            <span>4</span>

            <h3>
              What changes urgency
            </h3>
          </div>

          ${flowCardList(
            urgency,
            "Urgency follows the existing priority rules."
          )}
        </section>

        <section class="flow-card-section">
          <div class="flow-card-section-heading">
            <span>5</span>

            <h3>
              What the receiver gets
            </h3>
          </div>

          ${flowCardList(
            receiver,
            "Receiver Brief content has not been configured yet."
          )}
        </section>

        <section
          class="
            flow-card-section
            flow-card-section-wide
          "
        >
          <div class="flow-card-section-heading">
            <span>6</span>

            <h3>
              Work-readiness questions
            </h3>
          </div>

          ${flowCardList(
            questions,
            "No additional work-readiness questions are required."
          )}
        </section>
      </div>
    `;
  }

  // FLOW STUDIO M1: LIVE ENGINE TEST
  function hasValue(value) {
    return Array.isArray(value)
      ? value.length > 0
      : String(
          value == null
            ? ""
            : value
        ).trim() !== "";
  }

  function diagnosticAnswers(
    result,
    template
  ) {
    const answers = {};

    const supplied =
      result.diagnosticAnswers ||
      result.extractedDiagnostics ||
      {};

    const input =
      String(
        result.originalText || ""
      ).toLowerCase();

    diagnosticQuestions(
      template
    ).forEach((question) => {
      let value =
        supplied[question.id] ||
        (
          result.extractedFields ||
          {}
        )[question.id] ||
        (
          result.fieldAnswers ||
          {}
        )[question.id] ||
        "";

      if (
        value &&
        typeof value === "object"
      ) {
        value =
          value.value || "";
      }

      if (
        !hasValue(value) &&
        question.signals
      ) {
        Object.entries(
          question.signals
        ).some(
          ([answer, phrases]) => {
            const matched =
              (phrases || []).some(
                (phrase) =>
                  input.includes(
                    String(
                      phrase
                    ).toLowerCase()
                  )
              );

            if (matched) {
              value = answer;
            }

            return matched;
          }
        );
      }

      if (hasValue(value)) {
        answers[question.id] = {
          id: question.id,

          label:
            question.reportLabel ||
            question.label ||
            question.id,

          value
        };
      }
    });

    return answers;
  }

  function testEvidence(
    result,
    template
  ) {
    const excluded =
      new Set([
        "shortDescription",
        "description",
        "requestedFor",
        "attachments"
      ]);

    const evidence = [];
    const seen = new Set();

    Object.values(
      result.extractionDetails ||
      {}
    ).forEach((detail) => {
      if (
        !detail ||
        excluded.has(
          detail.fieldId
        ) ||
        !hasValue(
          detail.value
        )
      ) {
        return;
      }

      const label =
        detail.label ||
        detail.fieldId;

      const key =
        String(
          label
        ).toLowerCase();

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      evidence.push(
        `${label}: ${detail.value}`
      );
    });

    Object.values(
      diagnosticAnswers(
        result,
        template
      )
    ).forEach((detail) => {
      const key =
        detail.label
          .toLowerCase();

      if (seen.has(key)) {
        return;
      }

      seen.add(key);

      evidence.push(
        `${detail.label}: ${detail.value}`
      );
    });

    return evidence.slice(
      0,
      6
    );
  }

  function testMissing(
    result,
    template
  ) {
    const missing =
      (
        result.missingFields ||
        []
      ).map((field) => {
        if (
          typeof field ===
          "string"
        ) {
          return {
            id: field,
            label: humanize(field)
          };
        }

        return {
          id: field.id,

          label:
            field.label ||
            humanize(field.id)
        };
      });

    const answers =
      diagnosticAnswers(
        result,
        template
      );

    const questions =
      diagnosticQuestions(
        template
      );

    requiredDiagnosticIds(
      template
    ).forEach((id) => {
      if (
        answers[id] ||
        missing.some(
          (item) =>
            item.id === id
        )
      ) {
        return;
      }

      const question =
        questions.find(
          (item) =>
            item.id === id
        );

      missing.push({
        id,

        label: question
          ? questionLabel(
              question
            )
          : humanize(id)
      });
    });

    return missing;
  }

  function routingReadiness(
    result
  ) {
    const value =
      result.routingReadiness;

    const direct =
      (
        value &&
        typeof value ===
        "object"
      )
        ? Number(
            value.percent
          )
        : Number(value);

    if (
      Number.isFinite(
        direct
      )
    ) {
      return Math.max(
        0,
        Math.min(
          100,
          Math.round(direct)
        )
      );
    }

    if (result.requiresP1) {
      return 100;
    }

    if (
      result.template &&
      result.template.id ===
        "general-triage"
    ) {
      return Math.min(
        50,
        Number(
          result.confidence || 0
        )
      );
    }

    return Math.max(
      0,
      Math.round(
        Number(
          result.confidence || 0
        ) -
        Math.min(
          40,
          (
            result.missingFields ||
            []
          ).length * 12
        )
      )
    );
  }

  function workReadiness(
    result,
    template
  ) {
    const value =
      result.workReadiness;

    const direct =
      (
        value &&
        typeof value ===
        "object"
      )
        ? Number(
            value.percent
          )
        : Number(value);

    if (
      Number.isFinite(
        direct
      )
    ) {
      return Math.max(
        0,
        Math.min(
          100,
          Math.round(direct)
        )
      );
    }

    const fields =
      templateFields(
        template
      ).filter(
        (field) =>
          field.required &&
          ![
            "requestedFor",
            "attachments"
          ].includes(
            field.id
          )
      );

    const diagnostics =
      requiredDiagnosticIds(
        template
      );

    const answers =
      diagnosticAnswers(
        result,
        template
      );

    const extracted =
      result.extractedFields ||
      {};

    const complete =
      fields.filter(
        (field) =>
          hasValue(
            extracted[
              field.id
            ]
          )
      ).length +
      diagnostics.filter(
        (id) =>
          answers[id]
      ).length;

    const total =
      fields.length +
      diagnostics.length;

    return total
      ? Math.round(
          (
            complete /
            total
          ) * 100
        )
      : 100;
  }

  function testList(
    items,
    emptyText
  ) {
    if (!items.length) {
      return `
        <p class="flow-test-empty">
          ${escapeHtml(emptyText)}
        </p>
      `;
    }

    return `
      <ul class="flow-test-list">
        ${items
          .map(
            (item) => `
              <li>
                ${escapeHtml(item)}
              </li>
            `
          )
          .join("")}
      </ul>
    `;
  }

  function receiverPreview(
    result,
    template,
    answers
  ) {
    const direct =
      result.receiverPreview ||
      (
        result.receiverBrief &&
        (
          result.receiverBrief
            .title ||
          result.receiverBrief
            .headline
        )
      );

    if (hasValue(direct)) {
      return direct;
    }

    const location =
      Object.values(
        result.extractionDetails ||
        {}
      ).find((detail) => {
        return (
          detail &&
          hasValue(
            detail.value
          ) &&
          /location|station|area/i
            .test(
              `${detail.fieldId} ${detail.label}`
            )
        );
      });

    const symptom =
      Object.values(
        answers
      ).find((detail) => {
        return (
          /symptom|behavior|issue/i
            .test(
              `${detail.id} ${detail.label}`
            )
        );
      });

    const subject =
      symptom
        ? symptom.value
        : String(
            result.initialText ||
            result.originalText ||
            template.name
          )
            .split(
              /[.!?]/
            )[0]
            .trim();

    return (
      `${subject} at ` +
      `${
        location
          ? location.value
          : "[location pending]"
      }`
    );
  }

  function renderTest(result) {
    const target =
      byId("flowTestResult");

    if (!target) {
      return;
    }

    if (
      !result ||
      !result.ok
    ) {
      target.innerHTML = `
        <div class="notice notice-warning">
          <span>!</span>

          <div>
            <strong>
              MasterFlow could not analyze that request.
            </strong>

            <p>
              ${escapeHtml(
                (
                  result &&
                  result.error
                ) ||
                "Enter a clearer request and try again."
              )}
            </p>
          </div>
        </div>
      `;

      return;
    }

    if (result.requiresP1) {
      const queue =
        (
          result.requestPlan &&
          result.requestPlan.queue
        )
          ? result.requestPlan.queue
          : "Existing P1 queue";

      target.innerHTML = `
        <div class="flow-test-overview">
          <div class="flow-test-metric">
            <small>
              Selected flow
            </small>

            <strong>
              Shipping Is Stopped fast lane
            </strong>
          </div>

          <div class="flow-test-metric">
            <small>
              Confidence
            </small>

            <strong>
              100%
            </strong>
          </div>

          <div class="flow-test-metric">
            <small>
              Route
            </small>

            <strong>
              ${escapeHtml(queue)}
            </strong>
          </div>
        </div>

        <dl class="flow-test-outcome">
          <div>
            <dt>
              Next employee question
            </dt>

            <dd>
              Normal AI intake is bypassed
              for the immediate P1 workflow.
            </dd>
          </div>

          <div>
            <dt>
              Receiver preview
            </dt>

            <dd>
              ${escapeHtml(
                result.originalText
              )}
            </dd>
          </div>
        </dl>
      `;

      return;
    }

    const template =
      result.template;

    if (!template) {
      renderTest({
        ok: false,

        error:
          "The request engine did not return a request flow."
      });

      return;
    }

    const answers =
      diagnosticAnswers(
        result,
        template
      );

    const evidence =
      testEvidence(
        result,
        template
      );

    const missing =
      testMissing(
        result,
        template
      );

    const route =
      (
        result.requestPlan &&
        result.requestPlan.queue
      ) ||
      template.queue ||
      "Existing receiving queue";

    const routing =
      routingReadiness(
        result
      );

    const work =
      workReadiness(
        result,
        template
      );

    const firstDiagnostic =
      diagnosticQuestions(
        template
      ).find((question) => {
        return missing.some(
          (item) =>
            item.id ===
            question.id
        );
      });

    const nextQuestion =
      (
        result.clarificationQuestions &&
        result.clarificationQuestions[0] &&
        result.clarificationQuestions[0]
          .question
      ) ||
      (
        firstDiagnostic &&
        firstDiagnostic.question
      ) ||
      "No additional employee question is required.";

    target.innerHTML = `
      <div class="flow-test-overview">
        <div class="flow-test-metric">
          <small>
            Selected flow
          </small>

          <strong>
            ${escapeHtml(
              template.name
            )}
          </strong>
        </div>

        <div class="flow-test-metric">
          <small>
            Confidence
          </small>

          <strong>
            ${Math.round(
              Number(
                result.confidence ||
                0
              )
            )}%
          </strong>
        </div>

        <div class="flow-test-metric">
          <small>
            Route
          </small>

          <strong>
            ${escapeHtml(route)}
          </strong>
        </div>
      </div>

      <div class="flow-readiness-grid">
        <div class="flow-readiness-item">
          <div>
            <span>
              Routing readiness
            </span>

            <strong>
              ${routing}%
            </strong>
          </div>

          <div
            class="flow-readiness-meter"
            role="progressbar"
            aria-label="Routing readiness"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${routing}"
          >
            <span
              style="width:${routing}%"
            ></span>
          </div>
        </div>

        <div class="flow-readiness-item">
          <div>
            <span>
              Work readiness
            </span>

            <strong>
              ${work}%
            </strong>
          </div>

          <div
            class="flow-readiness-meter"
            role="progressbar"
            aria-label="Work readiness"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow="${work}"
          >
            <span
              style="width:${work}%"
            ></span>
          </div>
        </div>
      </div>

      <div class="flow-test-detail-grid">
        <section class="flow-test-section">
          <h3>
            Detected evidence
          </h3>

          ${testList(
            evidence,
            "No work detail was detected yet."
          )}
        </section>

        <section class="flow-test-section">
          <h3>
            Still needed
          </h3>

          ${testList(
            missing.map(
              (item) =>
                item.label
            ),
            "Nothing else is required before review."
          )}
        </section>
      </div>

      <dl class="flow-test-outcome">
        <div>
          <dt>
            Next employee question
          </dt>

          <dd>
            ${escapeHtml(
              nextQuestion
            )}
          </dd>
        </div>

        <div>
          <dt>
            Receiver preview
          </dt>

          <dd>
            ${escapeHtml(
              receiverPreview(
                result,
                template,
                answers
              )
            )}
          </dd>
        </div>
      </dl>
    `;
  }

  function runTest(text) {
    const target =
      byId("flowTestResult");

    if (target) {
      target.innerHTML = `
        <div class="flow-test-loading">
          Analyzing request...
        </div>
      `;
    }

    try {
      renderTest(
        Engine.analyze(text)
      );
    } catch (error) {
      console.error(
        "MasterFlow Flow Studio test failed",
        error
      );

      renderTest({
        ok: false,

        error:
          "The live request engine returned an error."
      });
    }
  }

  function applyRoleState() {
    renderQueued = false;

  // FLOW STUDIO M1B: DISTINCT ROLE WORKSPACES
  function applyRoleWorkspace() {
    const workspaces = {
      "platform-admin": {
        eyebrow:
          "Enterprise governance",

        title:
          "Megan Control Center",

        description:
          "Govern company-wide request flows, ownership, routing, SLA, priority, approval, P1, and safety controls.",

        noticeTitle:
          "Protect company-wide controls without maintaining every department’s intake manually.",

        noticeText:
          "Review all request flows, validate governed behavior, and manage protected routing, queue, priority, and SLA settings.",

        testTitle:
          "Validate a request flow",

        testDescription:
          "Test classification and readiness before approving or publishing configuration changes.",

        listTitle:
          "All Request Flows",

        hideEditor: false,
        showReset: true,
        showMetrics: true
      },

      "category-owner": {
        eyebrow:
          "Teach and improve",

        title:
          "My Request Flows",

        description:
          "Teach, test, and improve the IT request flows you own while protected routing and SLA controls remain governed.",

        noticeTitle:
          "Improve request quality without changing governed controls.",

        noticeText:
          "Edit employee wording, recognition phrases, questions, answer options, evidence requirements, and Receiver Brief content.",

        testTitle:
          "Test one of my flows",

        testDescription:
          "Preview how an employee request will be classified, clarified, and prepared for the receiving team.",

        listTitle:
          "My Request Flows",

        hideEditor: false,
        showReset: false,
        showMetrics: false
      },

      "queue-manager": {
        eyebrow:
          "Observe intake quality",

        title:
          "Intake Quality",

        description:
          "Review how requests arrive in your managed queues and identify missing information, unclear questions, and recognition problems.",

        noticeTitle:
          "Inspect the quality of requests entering your queues.",

        noticeText:
          "Test managed-queue flows and review their operational outcome. Request design and governed settings remain read-only.",

        testTitle:
          "Test intake into my queues",

        testDescription:
          "Run a sample employee request and inspect the route, readiness, missing evidence, and Receiver Brief outcome.",

        listTitle:
          "Flows Entering My Queues",

        hideEditor: true,
        showReset: false,
        showMetrics: false
      }
    };

    const workspace =
      workspaces[roleId] ||
      workspaces["platform-admin"];

    const heading =
      document.querySelector(
        ".flow-studio-title"
      );

    if (heading) {
      const eyebrow =
        heading.querySelector(
          ".eyebrow"
        );

      const title =
        heading.querySelector(
          "h1"
        );

      const description =
        heading.querySelector(
          "p"
        );

      if (eyebrow) {
        eyebrow.textContent =
          workspace.eyebrow;
      }

      if (title) {
        title.textContent =
          workspace.title;
      }

      if (description) {
        description.textContent =
          workspace.description;
      }
    }

    const introduction =
      document.querySelector(
        "main > .notice.notice-info"
      );

    if (introduction) {
      const introductionTitle =
        introduction.querySelector(
          "strong"
        );

      const introductionText =
        introduction.querySelector(
          "p"
        );

      if (introductionTitle) {
        introductionTitle.textContent =
          workspace.noticeTitle;
      }

      if (introductionText) {
        introductionText.textContent =
          workspace.noticeText;
      }
    }

    const testTitle =
      document.getElementById(
        "flowTestTitle"
      );

    if (testTitle) {
      testTitle.textContent =
        workspace.testTitle;

      const testDescription =
        testTitle.parentElement
          ? testTitle.parentElement.querySelector(
              "p"
            )
          : null;

      if (testDescription) {
        testDescription.textContent =
          workspace.testDescription;
      }
    }

    const listTitle =
      document.querySelector(
        ".template-list-card " +
        ".card-header h2"
      );

    if (listTitle) {
      listTitle.textContent =
        workspace.listTitle;
    }

    const templateManager =
      document.querySelector(
        ".template-manager"
      );

    if (templateManager) {
      templateManager.classList.toggle(
        "flow-workspace-list-only",
        workspace.hideEditor
      );
    }

    const templateEditor =
      document.getElementById(
        "templateForm"
      );

    if (templateEditor) {
      templateEditor.hidden =
        workspace.hideEditor;
    }

    const resetButton =
      document.getElementById(
        "resetTemplates"
      );

    if (resetButton) {
      resetButton.hidden =
        !workspace.showReset;
    }

    const titleActions =
      document.querySelector(
        ".flow-studio-title-actions"
      );

    if (titleActions) {
      titleActions.hidden =
        !workspace.showReset;
    }

    const roleMetrics =
      document.querySelector(
        ".flow-role-metrics"
      );

    if (roleMetrics) {
      roleMetrics.hidden =
        !workspace.showMetrics;
    }

    document.body.dataset
      .roleWorkspace = roleId;
  }

  function applyRoleState() {
    renderQueued = false;

    rememberActiveTemplate();
    updateRoleSummary();
    applyListScope();
    applyEditorPermissions();
    applyRoleWorkspace();
    renderFlowCard();
  }

  function scheduleRoleState() {
    if (renderQueued) {
      return;
    }

    renderQueued = true;

    window.requestAnimationFrame(
      applyRoleState
    );
  }

  function changeRole(
    nextRoleId
  ) {
    if (
      !ROLE_IDS.has(
        nextRoleId
      )
    ) {
      console.error(
        `Flow Studio received an unknown role: ${nextRoleId}`
      );

      return;
    }

    roleId = nextRoleId;

    window.localStorage.setItem(
      ROLE_KEY,
      roleId
    );

    document.body.dataset
      .flowStudioRole = roleId;

    document.body.dataset
      .adminRole = roleId;

    const search =
      byId("templateSearch");

    if (search) {
      search.value = "";

      search.dispatchEvent(
        new Event(
          "input",
          {
            bubbles: true
          }
        )
      );
    }

    applyRoleState();

    window.setTimeout(
      applyRoleState,
      0
    );

    UI.showToast(
      `Flow Studio is now showing the ${role().label} view.`
    );
  }

  // FLOW STUDIO M1/M2: INITIALIZATION
  addRoleSelector();
  addFlowTest();
  addFlowCard();

  const roleSelect =
    byId("adminRoleSelect");

  if (!roleSelect) {
    console.error(
      "Flow Studio could not find #adminRoleSelect."
    );
  } else {
    roleSelect.value =
      roleId;

    roleSelect.addEventListener(
      "change",
      (event) => {
        changeRole(
          event.currentTarget.value
        );
      }
    );
  }

  const testForm =
    byId("flowTestForm");

  if (testForm) {
    testForm.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        const input =
          byId("flowTestInput");

        const text =
          input
            ? input.value.trim()
            : "";

        if (!text) {
          if (input) {
            input.focus();
          }

          UI.showToast(
            "Enter an employee request before testing the flow."
          );

          return;
        }

        runTest(text);
      }
    );
  }

  document.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "#templateList " +
          "[data-template-id]"
        );

      if (button) {
        const template =
          Templates.get(
            button.dataset
              .templateId
          );

        if (
          !templateInScope(
            template
          )
        ) {
          event.preventDefault();

          event
            .stopImmediatePropagation();

          UI.showToast(
            "That request flow is outside the selected role's scope."
          );

          return;
        }

        activeTemplateId =
          button.dataset
            .templateId;

        scheduleRoleState();
      }

      if (
        event.target.closest(
          "#resetTemplates"
        ) &&
        !role().canReset
      ) {
        event.preventDefault();

        event
          .stopImmediatePropagation();

        UI.showToast(
          "Only Megan Delia can reset company request-flow configuration."
        );
      }
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      if (
        event.target.id !==
        "templateForm"
      ) {
        return;
      }

      if (
        !templateInScope(
          activeTemplate()
        ) ||
        !role().canEdit
      ) {
        event.preventDefault();

        event
          .stopImmediatePropagation();

        UI.showToast(
          "This role can review and test the flow, but cannot edit it."
        );

        return;
      }

      if (
        !role().canEditGoverned
      ) {
        restoreGovernedValues();
      }
    },
    true
  );

  const manager =
    query(".template-manager");

  if (manager) {
    new MutationObserver(
      scheduleRoleState
    ).observe(
      manager,
      {
        childList: true,
        subtree: true
      }
    );
  }

  window.addEventListener(
    "masterflow:templates",
    scheduleRoleState
  );

  rememberActiveTemplate();
  applyRoleState();
  runTest("Paper jam");
})();