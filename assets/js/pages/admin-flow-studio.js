(function () {
  "use strict";

  if (document.body.dataset.page !== "admin-templates") {
    return;
  }

  const Templates = window.MasterFlowTemplates;
  const Engine = window.MasterFlowRequestEngine;
  const UI = window.MasterFlowUI;

  if (!Templates || !Engine || !UI || !UI.layoutReady) {
    console.error(
      "MasterFlow Flow Studio could not start because a dependency is missing."
    );
    return;
  }

  const ROLE_KEY = "masterflowAdminRoleV1";

  const roleSelect =
    document.getElementById("adminRoleSelect");

  /*
   * Service Team / Queue Manager may only use owned-flow personas.
   * The enterprise-governance persona stays with the Administrator.
   *
   * This role id is always derived from the real Service Team persona
   * (masterflowServicePersona), never left to default. Previously a
   * missing/stale value defaulted to "category-owner" (publish rights)
   * regardless of persona, which let a Service Team Member who opened
   * this page directly — without first visiting ticket-queues.html —
   * publish template changes. A Member must always resolve to the
   * read-only "queue-manager" role id here; only the Queue Manager
   * persona may resolve to the publish-capable "category-owner" id.
   */
  (function clampPersonaForRole() {
    const appRole =
      window.MasterFlowStore && window.MasterFlowStore.getRole
        ? window.MasterFlowStore.getRole()
        : "admin";
    if (appRole === "admin") return;
    if (roleSelect) {
      const enterpriseOption = roleSelect.querySelector('option[value="platform-admin"]');
      if (enterpriseOption) enterpriseOption.remove();
    }
    const servicePersona =
      window.localStorage.getItem("masterflowServicePersona") === "member"
        ? "member"
        : "manager";
    const expectedRoleId = servicePersona === "member" ? "queue-manager" : "category-owner";
    const stored = window.localStorage.getItem(ROLE_KEY);
    const needsCorrection =
      !stored ||
      stored === "platform-admin" ||
      (servicePersona === "member" && stored !== "queue-manager");
    if (needsCorrection) {
      window.localStorage.setItem(ROLE_KEY, expectedRoleId);
    }
    if (roleSelect) roleSelect.value = window.localStorage.getItem(ROLE_KEY) || expectedRoleId;
  })();

  const templateList =
    document.getElementById("templateList");

  const templateManager =
    document.querySelector(".template-manager");

  const templateForm =
    document.getElementById("templateForm");

  const resetButton =
    document.getElementById("resetTemplates");

  const ROLE_WORKSPACES = {
    "platform-admin": {
      eyebrow: "Enterprise governance",

      title: "Flow Studio",

      description:
        "Govern company-wide request flows, ownership, routing, SLA, priority, approval, P1, and safety controls.",

      noticeTitle:
        "Protect company-wide controls without maintaining every department's intake manually.",

      noticeText:
        "Review all request flows, validate governed behavior, and manage protected routing, queue, priority, and SLA settings.",

      testTitle:
        "Validate a request flow",

      testDescription:
        "Test classification and readiness before approving or publishing configuration changes.",

      listTitle:
        "All Request Flows",

      editorEyebrow:
        "Selected enterprise flow",

      editorDescription:
        "Edit the complete request-flow configuration, including governed controls.",

      flowBadge:
        "Full edit",

      flowBadgeClass:
        "badge-purple",

      flowSubtitle:
        "Enterprise view of what MasterFlow learns, routes, and gives the receiving team.",

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

      editorEyebrow:
        "Owned flow editor",

      editorDescription:
        "Publish low-risk content changes while queue, priority, and SLA controls remain locked.",

      flowBadge:
        "Owned content",

      flowBadgeClass:
        "badge-teal",

      flowSubtitle:
        "Plain-language summary of the request-quality content you own and can improve.",

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

      editorEyebrow:
        "Read-only flow",

      editorDescription:
        "Queue Managers review intake quality and submit recommendations rather than editing request design.",

      flowBadge:
        "Read-only",

      flowBadgeClass:
        "badge-blue",

      flowSubtitle:
        "Read-only summary of the request flow entering your managed queue.",

      hideEditor: true,
      showReset: false,
      showMetrics: false
    }
  };

  let syncQueued = false;

  function escapeHtml(value) {
    return UI.escapeHtml(
      String(
        value == null
          ? ""
          : value
      )
    );
  }

  function currentRoleId() {
    const selected =
      roleSelect
        ? roleSelect.value
        : "";

    const stored =
      window.localStorage.getItem(
        ROLE_KEY
      ) || "";

    const candidate =
      selected || stored;

    if (ROLE_WORKSPACES[candidate]) {
      return candidate;
    }

    /*
     * Default the Flow Studio persona from the active app role:
     * Service Team / Queue Manager opens in owned-flow scope,
     * Administrator opens in enterprise scope.
     */
    const appRole =
      window.MasterFlowStore && window.MasterFlowStore.getRole
        ? window.MasterFlowStore.getRole()
        : "admin";

    return appRole === "admin"
      ? "platform-admin"
      : "category-owner";
  }

  function currentWorkspace() {
    return ROLE_WORKSPACES[
      currentRoleId()
    ];
  }

  function selectedTemplateId() {
    const selected =
      document.querySelector(
        "#templateList " +
        "[data-template-id].active, " +
        "#templateList " +
        "[data-template-id].selected, " +
        "#templateList " +
        '[data-template-id][aria-selected="true"]'
      );

    if (selected) {
      return (
        selected.dataset.templateId ||
        ""
      );
    }

    const firstVisible =
      Array.from(
        document.querySelectorAll(
          "#templateList " +
          "[data-template-id]"
        )
      ).find(
        (item) =>
          !item.hidden
      );

    return firstVisible
      ? (
          firstVisible.dataset
            .templateId || ""
        )
      : "";
  }

  function selectedTemplate() {
    const id =
      selectedTemplateId();

    return id
      ? Templates.get(id)
      : null;
  }

  function setText(
    element,
    value
  ) {
    if (element) {
      element.textContent =
        value;
    }
  }

  // FLOW STUDIO M1: LIVE FLOW TEST
  function addFlowTest() {
    if (
      document.getElementById(
        "flowTestCard"
      ) ||
      !templateManager
    ) {
      return;
    }

    templateManager.insertAdjacentHTML(
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

              <p id="flowTestDescription">
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
    if (
      document.getElementById(
        "flowCard"
      ) ||
      !templateManager
    ) {
      return;
    }

    templateManager.insertAdjacentHTML(
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
                Choose a request flow to
                see its operational design.
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

  // FLOW STUDIO M1B: DISTINCT ROLE WORKSPACES
  function applyRoleWorkspace() {
    const roleId =
      currentRoleId();

    const workspace =
      currentWorkspace();

    document.body.dataset
      .roleWorkspace = roleId;

    document.body.dataset
      .flowStudioRole = roleId;

    const heading =
      document.querySelector(
        ".flow-studio-title"
      );

    if (heading) {
      setText(
        heading.querySelector(
          ".eyebrow"
        ),
        workspace.eyebrow
      );

      setText(
        heading.querySelector(
          "h1"
        ),
        workspace.title
      );

      setText(
        heading.querySelector(
          "p"
        ),
        workspace.description
      );
    }

    const introduction =
      document.querySelector(
        "main > .notice.notice-info"
      );

    if (introduction) {
      setText(
        introduction.querySelector(
          "strong"
        ),
        workspace.noticeTitle
      );

      setText(
        introduction.querySelector(
          "p"
        ),
        workspace.noticeText
      );
    }

    setText(
      document.getElementById(
        "flowTestTitle"
      ),
      workspace.testTitle
    );

    setText(
      document.getElementById(
        "flowTestDescription"
      ),
      workspace.testDescription
    );

    setText(
      document.querySelector(
        ".template-list-card " +
        ".card-header h2"
      ),
      workspace.listTitle
    );

    if (templateManager) {
      templateManager.classList.toggle(
        "flow-workspace-list-only",
        workspace.hideEditor
      );
    }

    if (templateForm) {
      templateForm.hidden =
        workspace.hideEditor;

      templateForm.setAttribute(
        "aria-hidden",
        workspace.hideEditor
          ? "true"
          : "false"
      );

      setText(
        templateForm.querySelector(
          ".card-header .eyebrow"
        ),
        workspace.editorEyebrow
      );

      setText(
        templateForm.querySelector(
          ".card-header p"
        ),
        workspace.editorDescription
      );
    }

    const titleActions =
      document.querySelector(
        ".flow-studio-title-actions"
      );

    if (titleActions) {
      titleActions.hidden =
        !workspace.showReset;
    }

    if (resetButton) {
      resetButton.hidden =
        !workspace.showReset;
    }

    const metrics =
      document.querySelector(
        ".flow-role-metrics"
      );

    if (metrics) {
      metrics.hidden =
        !workspace.showMetrics;
    }
  }

  function firstText(
    ...values
  ) {
    for (const value of values) {
      if (Array.isArray(value)) {
        const joined =
          value
            .map(
              (item) =>
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
      .map(
        (item) =>
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

  function diagnosticProfile(
    template
  ) {
    return (
      template &&
      template.diagnostics
    )
      ? template.diagnostics
      : {
          requiredForWork: [],
          suggestedFirstAction: "",
          questions: []
        };
  }

  function diagnosticQuestions(
    template
  ) {
    const profile =
      diagnosticProfile(
        template
      );

    return Array.isArray(
      profile.questions
    )
      ? profile.questions
      : [];
  }

  function requiredDiagnosticIds(
    template
  ) {
    const profile =
      diagnosticProfile(
        template
      );

    return Array.isArray(
      profile.requiredForWork
    )
      ? profile.requiredForWork
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

  function flowEvidence(
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
          field.required &&
          !excluded.has(
            field.id
          )
      );

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
      ...fields.map(
        fieldLabel
      ),
      ...diagnostics
    ]).slice(0, 8);
  }

  function flowUrgency(
    template,
    evidence
  ) {
    const items = [
      `Default priority: ${firstText(
        template.priority,
        template.defaultPriority,
        "Existing priority rule"
      )}`
    ];

    const evidenceText =
      evidence
        .join(" ")
        .toLowerCase();

    if (
      /scope|affected|users?|station|line/
        .test(evidenceText)
    ) {
      items.push(
        "Affected scope can increase urgency."
      );
    }

    if (
      /impact|outage|stopped|production/
        .test(evidenceText)
    ) {
      items.push(
        "Business impact can increase urgency."
      );
    }

    if (
      [
        "equipment-out-of-service",
        "facilities-hvac"
      ].includes(
        template.id
      )
    ) {
      items.push(
        "Safety or containment conditions can require escalation."
      );
    }

    items.push(
      "Shipping stopped: P1 bypass."
    );

    return uniqueText(items);
  }

  function receiverItems(
    template,
    evidence
  ) {
    const suggestedFirstAction =
      firstText(
        diagnosticProfile(
          template
        ).suggestedFirstAction,

        template.suggestedFirstAction,

        template.firstAction
      );

    return uniqueText([
      "Actionable request title",

      ...evidence.slice(
        0,
        4
      ),

      "Business impact",

      suggestedFirstAction
        ? (
            "Suggested first action: " +
            suggestedFirstAction
          )
        : "Suggested first action",

      "Known information gaps"
    ]).slice(0, 8);
  }

  function workReadinessQuestions(
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
        .map((field) =>
          firstText(
            field.question,

            field.prompt,

            `Provide ${
              fieldLabel(
                field
              ).toLowerCase()
            }.`
          )
        );

    const requiredIds =
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
            requiredIds.includes(
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

  function cardList(
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
            (item) =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("")}
      </ul>
    `;
  }

  function renderFlowCard() {
    const body =
      document.getElementById(
        "flowCardBody"
      );

    const title =
      document.getElementById(
        "flowCardTitle"
      );

    const subtitle =
      document.getElementById(
        "flowCardSubtitle"
      );

    const badge =
      document.getElementById(
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

    const workspace =
      currentWorkspace();

    const template =
      selectedTemplate();

    badge.className =
      `badge ${
        workspace.flowBadgeClass
      }`;

    badge.textContent =
      workspace.flowBadge;

    subtitle.textContent =
      workspace.flowSubtitle;

    if (!template) {
      title.textContent =
        "Request Flow Card";

      body.innerHTML = `
        <div class="empty-state">
          Select a request type to
          review the flow.
        </div>
      `;

      return;
    }

    const evidence =
      flowEvidence(
        template
      );

    const urgency =
      flowUrgency(
        template,
        evidence
      );

    const receiver =
      receiverItems(
        template,
        evidence
      );

    const questions =
      workReadinessQuestions(
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
        `${
          template.responseSlaHours
        }h response`
      );
    }

    if (
      template.resolutionSlaHours !=
      null
    ) {
      sla.push(
        `${
          template.resolutionSlaHours
        }h resolution`
      );
    }

    title.textContent =
      firstText(
        template.name,

        "Selected request flow"
      );

    const templateName =
      firstText(
        template.name,

        "request flow"
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
              firstText(
                template
                  .employeeFacingDescription,

                template
                  .employeeDescription,

                template.description,

                (
                  "Use when an employee " +
                  "needs help with " +
                  `${
                    templateName.toLowerCase()
                  }.`
                )
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

          ${cardList(
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
                ? sla.join(" | ")
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

          ${cardList(
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

          ${cardList(
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

          ${cardList(
            questions,

            "No additional work-readiness questions are required."
          )}
        </section>
      </div>
    `;
  }

  function hasValue(value) {
    return Array.isArray(value)
      ? value.length > 0
      : String(
          value == null
            ? ""
            : value
        ).trim() !== "";
  }

  function clampScore(value) {
    let raw = 0;

    if (
      value &&
      typeof value === "object"
    ) {
      raw = Number(
        value.score != null
          ? value.score
          : value.percent
      );
    } else {
      raw = Number(value);
    }

    if (
      !Number.isFinite(raw)
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(raw)
      )
    );
  }

  function testEvidence(result) {
    const items = [];

    if (
      Array.isArray(
        result.evidence
      )
    ) {
      result.evidence.forEach(
        (item) => {
          if (
            !item ||
            !hasValue(
              item.value
            )
          ) {
            return;
          }

          const label =
            firstText(
              item.reportLabel,
              item.label,
              item.fieldId,
              item.id
            );

          if (label) {
            items.push(
              `${label}: ${item.value}`
            );
          }
        }
      );
    }

    if (!items.length) {
      Object.values(
        result.extractionDetails ||
        {}
      ).forEach((item) => {
        if (
          item &&
          hasValue(
            item.value
          )
        ) {
          items.push(
            `${
              item.label ||
              item.fieldId
            }: ${item.value}`
          );
        }
      });

      Object.values(
        result.diagnosticDetails ||
        {}
      ).forEach((item) => {
        if (
          item &&
          hasValue(
            item.value
          )
        ) {
          items.push(
            `${
              item.reportLabel ||
              item.label ||
              item.id
            }: ${item.value}`
          );
        }
      });
    }

    return uniqueText(
      items
    ).slice(0, 8);
  }

  function testMissing(result) {
    const items = [
      ...(
        result.missingFields ||
        []
      ).map((item) =>
        typeof item === "string"
          ? humanize(item)
          : firstText(
              item.label,

              humanize(
                item.id
              )
            )
      ),

      ...(
        result.missingDiagnostics ||
        []
      ).map((item) =>
        typeof item === "string"
          ? humanize(item)
          : firstText(
              item.label,

              humanize(
                item.id
              )
            )
      )
    ];

    if (
      !items.length &&
      result.receiverBrief
    ) {
      items.push(
        ...(
          result.receiverBrief
            .informationGaps ||
          []
        )
      );
    }

    return uniqueText(
      items
    ).slice(0, 8);
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
            (item) =>
              `<li>${escapeHtml(item)}</li>`
          )
          .join("")}
      </ul>
    `;
  }

  function renderTest(result) {
    const target =
      document.getElementById(
        "flowTestResult"
      );

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
                (
                  "Enter a clearer request " +
                  "and try again."
                )
              )}
            </p>
          </div>
        </div>
      `;

      return;
    }

    if (result.requiresP1) {
      const p1Route =
        firstText(
          result.requestPlan &&
            result.requestPlan.queue,

          "Warehouse Systems / On-call"
        );

      const p1Preview =
        firstText(
          result.receiverBrief &&
            result.receiverBrief.title,

          result.originalText,

          "Shipping or manifesting stopped"
        );

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
              ${escapeHtml(p1Route)}
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
              ${escapeHtml(p1Preview)}
            </dd>
          </div>
        </dl>
      `;

      return;
    }

    const template =
      result.template || {};

    const route =
      firstText(
        result.requestPlan &&
          result.requestPlan.queue,

        template.queue,

        "Existing receiving queue"
      );

    const routing =
      clampScore(
        result.routingReadiness
      );

    const work =
      clampScore(
        result.workReadiness
      );

    const evidence =
      testEvidence(result);

    const missing =
      testMissing(result);

    const nextQuestion =
      firstText(
        result
          .clarificationQuestions &&

          result
            .clarificationQuestions[0] &&

          result
            .clarificationQuestions[0]
            .question,

        result.assistantResponse &&
          result.assistantResponse
            .nextQuestion,

        "No additional employee question is required."
      );

    const receiverPreview =
      firstText(
        result.receiverBrief &&
          result.receiverBrief.title,

        result.receiverPreview,

        template.name,

        "Receiver Brief preview"
      );

    target.innerHTML = `
      <div class="flow-test-overview">
        <div class="flow-test-metric">
          <small>
            Selected flow
          </small>

          <strong>
            ${escapeHtml(
              firstText(
                template.name,

                "General Request - Needs Triage"
              )
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
            missing,

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
            ${escapeHtml(nextQuestion)}
          </dd>
        </div>

        <div>
          <dt>
            Receiver preview
          </dt>

          <dd>
            ${escapeHtml(
              receiverPreview
            )}
          </dd>
        </div>
      </dl>
    `;
  }

  function runTest(text) {
    const target =
      document.getElementById(
        "flowTestResult"
      );

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

  function syncWorkspace() {
    syncQueued = false;

    applyRoleWorkspace();
    renderFlowCard();
  }

  function scheduleSync() {
    if (syncQueued) {
      return;
    }

    syncQueued = true;

    window.requestAnimationFrame(
      syncWorkspace
    );
  }

  function bindEvents() {
    if (roleSelect) {
      roleSelect.addEventListener(
        "change",
        () => {
          window.setTimeout(
            scheduleSync,
            0
          );
        }
      );
    }

    const testForm =
      document.getElementById(
        "flowTestForm"
      );

    if (testForm) {
      testForm.addEventListener(
        "submit",
        (event) => {
          event.preventDefault();

          const input =
            document.getElementById(
              "flowTestInput"
            );

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
        if (
          event.target.closest(
            "#templateList " +
            "[data-template-id]"
          ) ||
          event.target.closest(
            "#resetTemplates"
          )
        ) {
          window.setTimeout(
            scheduleSync,
            0
          );
        }
      }
    );

    if (resetButton) {
      resetButton.addEventListener(
        "click",
        (event) => {
          if (
            currentRoleId() ===
            "platform-admin"
          ) {
            return;
          }

          event.preventDefault();

          event
            .stopImmediatePropagation();

          UI.showToast(
            "Only Morgan Ellis can reset company request-flow configuration."
          );
        },
        true
      );
    }

    window.addEventListener(
      "masterflow:templates",
      () => {
        window.setTimeout(
          scheduleSync,
          0
        );
      }
    );

    if (templateList) {
      new MutationObserver(
        scheduleSync
      ).observe(
        templateList,
        {
          childList: true,
          subtree: true,
          attributes: true,

          attributeFilter: [
            "class",
            "aria-selected",
            "hidden"
          ]
        }
      );
    }
  }

  // FLOW STUDIO EXTENSION INITIALIZATION
  addFlowTest();
  addFlowCard();
  bindEvents();
  syncWorkspace();
  runTest("Paper jam");

  window.MasterFlowFlowStudio =
    Object.freeze({
      refresh:
        scheduleSync,

      runTest
    });
})();