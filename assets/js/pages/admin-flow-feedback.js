(function () {
  "use strict";

  if (document.body.dataset.page !== "admin-templates") return;

  const Templates = window.MasterFlowTemplates;
  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;

  if (!Templates || !Store || !UI || !UI.layoutReady) return;

  const FEEDBACK_KEY = "masterflowFlowFeedbackV1";
  const PROPOSAL_KEY = "masterflowFlowProposalsV1";
  const ROLE_KEY = "masterflowAdminRoleV1";

  const OWNED_FLOWS = new Set([
    "printer-ink",
    "printer-connectivity",
    "systems-intake"
  ]);

  const OWNED_QUEUES = new Set([
    "IT Help Desk",
    "IT Information",
    "Business Enablement - Systems Intake",
    "IT Support",
    "Business Systems"
  ]);

  const GOVERNED_TYPES = new Set([
    "destination-queue",
    "response-sla",
    "resolution-sla",
    "default-priority",
    "approval-requirement",
    "p1-behavior",
    "safety-rule"
  ]);

  const roleSelect =
    document.getElementById(
      "adminRoleSelect"
    );

  let activeFeedbackId = "";

  const esc = (value) =>
    UI.escapeHtml(
      String(
        value == null
          ? ""
          : value
      )
    );

  const clean = (value) =>
    String(
      value == null
        ? ""
        : value
    ).trim();

  const human = (value) =>
    clean(value)
      .replace(
        /([a-z0-9])([A-Z])/g,
        "$1 $2"
      )
      .replace(
        /[_-]+/g,
        " "
      )
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );

  function read(key) {
    try {
      const value =
        JSON.parse(
          localStorage.getItem(
            key
          ) || "[]"
        );

      return Array.isArray(value)
        ? value
        : [];
    } catch (error) {
      console.warn(
        `Could not read ${key}.`,
        error
      );

      return [];
    }
  }

  function write(
    key,
    items,
    eventName
  ) {
    localStorage.setItem(
      key,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new CustomEvent(
        eventName,
        {
          detail:
            items.slice()
        }
      )
    );
  }

  function role() {
    return (
      roleSelect?.value ||
      localStorage.getItem(
        ROLE_KEY
      ) ||
      "platform-admin"
    );
  }

  function isMegan() {
    return (
      role() ===
      "platform-admin"
    );
  }

  function isManager() {
    return (
      role() ===
      "category-owner"
    );
  }

  function inManagerScope(item) {
    return (
      OWNED_FLOWS.has(
        clean(item.templateId)
      ) ||
      OWNED_QUEUES.has(
        clean(item.queue)
      )
    );
  }

  function scoped(items) {
    return isMegan()
      ? items
      : items.filter(
          inManagerScope
        );
  }

  function flowName(item) {
    const id =
      clean(
        item.templateId
      );

    if (id) {
      const template =
        Templates.get(id);

      if (
        template &&
        template.id === id
      ) {
        return template.name;
      }
    }

    return (
      clean(
        item.templateName
      ) ||
      clean(item.queue) ||
      "Unassigned request flow"
    );
  }

  function dateLabel(value) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }
    ).format(date);
  }

  function badge(status) {
    if (
      [
        "published",
        "approved"
      ].includes(status)
    ) {
      return "badge-green";
    }

    if (
      status === "rejected"
    ) {
      return "badge-red";
    }

    if (
      [
        "pending-approval",
        "proposal-created"
      ].includes(status)
    ) {
      return "badge-amber";
    }

    if (
      status === "reviewed"
    ) {
      return "badge-blue";
    }

    return "badge-gray";
  }

  function mount() {
    if (
      document.getElementById(
        "flowImprovementCenter"
      )
    ) {
      return;
    }

    const anchor =
      document.getElementById(
        "flowCard"
      ) ||
      document.querySelector(
        ".template-manager"
      );

    if (!anchor) return;

    anchor.insertAdjacentHTML(
      anchor.id === "flowCard"
        ? "afterend"
        : "beforebegin",
      `
        <section
          class="card flow-improvement-center mt-18"
          id="flowImprovementCenter"
        >
          <div class="card-header">
            <div>
              <div class="eyebrow">
                Observe and improve
              </div>

              <h2>
                Feedback & proposals
              </h2>

              <p id="flowImprovementDescription"></p>
            </div>

            <span
              class="badge badge-teal"
              id="flowImprovementRoleBadge"
            ></span>
          </div>

          <div class="card-body">
            <div class="flow-improvement-summary">
              <div>
                <small>
                  Visible feedback
                </small>

                <strong id="flowFeedbackMetric">
                  0
                </strong>
              </div>

              <div>
                <small>
                  Awaiting review
                </small>

                <strong id="flowNewFeedbackMetric">
                  0
                </strong>
              </div>

              <div>
                <small>
                  Pending Megan
                </small>

                <strong id="flowPendingProposalMetric">
                  0
                </strong>
              </div>

              <div>
                <small>
                  Published
                </small>

                <strong id="flowPublishedProposalMetric">
                  0
                </strong>
              </div>
            </div>

            <div class="flow-improvement-grid mt-18">
              <section class="flow-improvement-column">
                <div class="flow-improvement-column-header">
                  <h3>
                    Feedback Inbox
                  </h3>

                  <p>
                    Receiver and Queue Manager observations about
                    request quality.
                  </p>
                </div>

                <div
                  class="flow-feedback-list"
                  id="flowFeedbackInbox"
                ></div>
              </section>

              <section class="flow-improvement-column">
                <div class="flow-improvement-column-header">
                  <h3>
                    Proposals
                  </h3>

                  <p id="flowProposalListDescription"></p>
                </div>

                <div
                  class="flow-proposal-list"
                  id="flowProposalList"
                ></div>
              </section>
            </div>
          </div>
        </section>

        <dialog
          class="flow-proposal-dialog"
          id="flowProposalDialog"
        >
          <form id="flowProposalForm">
            <div class="dialog-header">
              <div>
                <h2>
                  Create improvement proposal
                </h2>

                <p id="flowProposalFeedbackSummary"></p>
              </div>

              <button
                class="close-button"
                type="button"
                data-close-flow-proposal
                aria-label="Close"
              >
                x
              </button>
            </div>

            <div class="dialog-body">
              <div class="field-row">
                <div class="field">
                  <label for="flowProposalChangeType">
                    Change type
                  </label>

                  <select
                    class="select"
                    id="flowProposalChangeType"
                    required
                  >
                    <option value="recognition-alias">
                      Recognition alias
                    </option>

                    <option value="question-wording">
                      Question wording
                    </option>

                    <option value="work-readiness">
                      Work-readiness requirement
                    </option>

                    <option value="receiver-brief">
                      Receiver Brief wording
                    </option>

                    <option value="suggested-first-action">
                      Suggested First Action
                    </option>

                    <option value="destination-queue">
                      Destination queue
                    </option>

                    <option value="response-sla">
                      Response SLA
                    </option>

                    <option value="resolution-sla">
                      Resolution SLA
                    </option>

                    <option value="default-priority">
                      Default priority
                    </option>

                    <option value="approval-requirement">
                      Approval requirement
                    </option>

                    <option value="p1-behavior">
                      P1 behavior
                    </option>

                    <option value="safety-rule">
                      Safety rule
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </div>

                <div class="field">
                  <label for="flowProposalRisk">
                    Publishing path
                  </label>

                  <select
                    class="select"
                    id="flowProposalRisk"
                    required
                  >
                    <option value="low">
                      Low-risk — publish directly
                    </option>

                    <option value="governed">
                      Governed — send to Megan
                    </option>
                  </select>

                  <small>
                    Queue, SLA, priority, approval, P1, and safety
                    changes require Megan.
                  </small>
                </div>
              </div>

              <div class="field mt-12">
                <label for="flowProposalBefore">
                  Current experience or problem
                </label>

                <textarea
                  class="textarea"
                  id="flowProposalBefore"
                  required
                ></textarea>
              </div>

              <div class="field mt-12">
                <label for="flowProposalAfter">
                  Proposed improvement
                </label>

                <textarea
                  class="textarea"
                  id="flowProposalAfter"
                  required
                ></textarea>
              </div>

              <div class="field mt-12">
                <label for="flowProposalReason">
                  Reason and evidence
                </label>

                <textarea
                  class="textarea"
                  id="flowProposalReason"
                  required
                ></textarea>
              </div>
            </div>

            <div class="dialog-footer">
              <button
                class="btn btn-secondary"
                type="button"
                data-close-flow-proposal
              >
                Cancel
              </button>

              <button
                class="btn btn-primary"
                type="submit"
                id="flowProposalSubmit"
              >
                Publish improvement
              </button>
            </div>
          </form>
        </dialog>
      `
    );
  }

  function feedbackActions(item) {
    if (!isManager()) {
      return "";
    }

    const actions = [];

    if (
      item.status === "new"
    ) {
      actions.push(`
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          data-feedback-action="review"
          data-feedback-id="${esc(item.id)}"
        >
          Mark reviewed
        </button>
      `);
    }

    if (
      [
        "new",
        "reviewed"
      ].includes(item.status)
    ) {
      actions.push(`
        <button
          class="btn btn-primary btn-sm"
          type="button"
          data-feedback-action="proposal"
          data-feedback-id="${esc(item.id)}"
        >
          Create proposal
        </button>
      `);
    }

    return actions.length
      ? `
          <div class="flow-item-actions">
            ${actions.join("")}
          </div>
        `
      : "";
  }

  function feedbackCard(item) {
    const missing =
      Array.isArray(
        item.evidence &&
        item.evidence.missingFields
      )
        ? item.evidence
            .missingFields
        : [];

    return `
      <article class="flow-feedback-item">
        <div class="flow-item-topline">
          <span class="badge ${badge(item.status)}">
            ${esc(
              human(
                item.status ||
                "new"
              )
            )}
          </span>

          <small>
            ${esc(
              dateLabel(
                item.createdAt
              )
            )}
          </small>
        </div>

        <h4>
          ${esc(
            item.title ||
            human(item.issueType)
          )}
        </h4>

        <p>
          ${esc(
            item.description ||
            "No description was provided."
          )}
        </p>

        <dl class="flow-item-meta">
          <div>
            <dt>Flow</dt>
            <dd>${esc(flowName(item))}</dd>
          </div>

          <div>
            <dt>Source</dt>
            <dd>${esc(human(item.sourceRole))}</dd>
          </div>

          <div>
            <dt>Issue</dt>
            <dd>${esc(human(item.issueType))}</dd>
          </div>
        </dl>

        ${
          item.suggestedChange
            ? `
                <div class="flow-item-recommendation">
                  <small>
                    Suggested change
                  </small>

                  <strong>
                    ${esc(item.suggestedChange)}
                  </strong>
                </div>
              `
            : ""
        }

        ${
          missing.length
            ? `
                <div class="flow-item-tags">
                  ${missing
                    .map(
                      (field) =>
                        `<span>${esc(field)}</span>`
                    )
                    .join("")}
                </div>
              `
            : ""
        }

        ${
          item.outcome
            ? `
                <div class="flow-item-outcome">
                  <small>Outcome</small>

                  <strong>
                    ${esc(item.outcome)}
                  </strong>
                </div>
              `
            : ""
        }

        ${feedbackActions(item)}
      </article>
    `;
  }

  function proposalActions(item) {
    if (!isMegan()) {
      return "";
    }

    if (
      item.status ===
      "pending-approval"
    ) {
      return `
        <div class="flow-item-actions">
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-proposal-action="approve"
            data-proposal-id="${esc(item.id)}"
          >
            Approve
          </button>

          <button
            class="btn btn-danger btn-sm"
            type="button"
            data-proposal-action="reject"
            data-proposal-id="${esc(item.id)}"
          >
            Reject
          </button>
        </div>
      `;
    }

    if (
      item.status ===
      "approved"
    ) {
      return `
        <div class="flow-item-actions">
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-proposal-action="publish"
            data-proposal-id="${esc(item.id)}"
          >
            Publish approved change
          </button>
        </div>
      `;
    }

    return "";
  }

  function proposalCard(item) {
    return `
      <article class="flow-proposal-item">
        <div class="flow-item-topline">
          <span class="badge ${badge(item.status)}">
            ${esc(human(item.status))}
          </span>

          <span
            class="badge ${
              item.riskLevel ===
              "governed"
                ? "badge-purple"
                : "badge-teal"
            }"
          >
            ${esc(human(item.riskLevel))}
          </span>
        </div>

        <h4>
          ${esc(flowName(item))}
        </h4>

        <p>
          ${esc(
            item.reason ||
            "No proposal reason was recorded."
          )}
        </p>

        <dl class="flow-item-meta">
          <div>
            <dt>Change</dt>
            <dd>${esc(human(item.changeType))}</dd>
          </div>

          <div>
            <dt>Proposed by</dt>
            <dd>${esc(item.proposedBy || "Unknown")}</dd>
          </div>

          <div>
            <dt>Created</dt>
            <dd>${esc(dateLabel(item.createdAt))}</dd>
          </div>
        </dl>

        <div class="flow-proposal-diff">
          <div>
            <small>Before</small>

            <p>
              ${esc(
                item.before ||
                "Not recorded"
              )}
            </p>
          </div>

          <div>
            <small>After</small>

            <p>
              ${esc(
                item.after ||
                "Not recorded"
              )}
            </p>
          </div>
        </div>

        ${proposalActions(item)}
      </article>
    `;
  }

  function render() {
    const feedback =
      scoped(
        read(FEEDBACK_KEY)
      ).sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );

    const proposals =
      scoped(
        read(PROPOSAL_KEY)
      ).sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );

    document.getElementById(
      "flowFeedbackMetric"
    ).textContent =
      String(feedback.length);

    document.getElementById(
      "flowNewFeedbackMetric"
    ).textContent =
      String(
        feedback.filter(
          (item) =>
            item.status ===
            "new"
        ).length
      );

    document.getElementById(
      "flowPendingProposalMetric"
    ).textContent =
      String(
        proposals.filter(
          (item) =>
            item.status ===
            "pending-approval"
        ).length
      );

    document.getElementById(
      "flowPublishedProposalMetric"
    ).textContent =
      String(
        proposals.filter(
          (item) =>
            item.status ===
            "published"
        ).length
      );

    const roleBadge =
      document.getElementById(
        "flowImprovementRoleBadge"
      );

    roleBadge.className =
      `badge ${
        isMegan()
          ? "badge-purple"
          : "badge-teal"
      }`;

    roleBadge.textContent =
      isMegan()
        ? "Megan governance"
        : "Category manager";

    document.getElementById(
      "flowImprovementDescription"
    ).textContent =
      isMegan()
        ? (
            "Review company-wide feedback and decide " +
            "governed request-flow changes."
          )
        : (
            "Review managed-flow feedback and turn " +
            "evidence into direct or governed improvements."
          );

    document.getElementById(
      "flowProposalListDescription"
    ).textContent =
      isMegan()
        ? (
            "Approve, reject, and publish governed proposals " +
            "submitted by category managers."
          )
        : (
            "Low-risk improvements publish directly; " +
            "governed changes wait for Megan."
          );

    document.getElementById(
      "flowFeedbackInbox"
    ).innerHTML =
      feedback.length
        ? feedback
            .map(
              feedbackCard
            )
            .join("")
        : `
            <div class="empty-state">
              No receiver or Queue Manager feedback
              is available for this scope.
            </div>
          `;

    document.getElementById(
      "flowProposalList"
    ).innerHTML =
      proposals.length
        ? proposals
            .map(
              proposalCard
            )
            .join("")
        : `
            <div class="empty-state">
              No flow-improvement proposals
              are available for this scope.
            </div>
          `;
  }

  function updateFeedback(
    id,
    patch
  ) {
    const items =
      read(FEEDBACK_KEY);

    const item =
      items.find(
        (candidate) =>
          candidate.id === id
      );

    if (!item) return null;

    Object.assign(
      item,
      patch
    );

    write(
      FEEDBACK_KEY,
      items,
      "masterflow:flow-feedback"
    );

    return item;
  }

  function syncRisk() {
    const type =
      document.getElementById(
        "flowProposalChangeType"
      ).value;

    const risk =
      document.getElementById(
        "flowProposalRisk"
      );

    const governed =
      GOVERNED_TYPES.has(type);

    risk.value =
      governed
        ? "governed"
        : risk.value;

    risk.disabled =
      governed;

    document.getElementById(
      "flowProposalSubmit"
    ).textContent =
      governed
        ? "Send to Megan"
        : "Publish improvement";
  }

  function openProposal(id) {
    const item =
      read(FEEDBACK_KEY)
        .find(
          (candidate) =>
            candidate.id === id
        );

    if (!item) return;

    activeFeedbackId = id;

    document.getElementById(
      "flowProposalFeedbackSummary"
    ).textContent =
      `${flowName(item)} · ${human(item.issueType)}`;

    document.getElementById(
      "flowProposalBefore"
    ).value =
      item.description ||
      item.title ||
      "";

    document.getElementById(
      "flowProposalAfter"
    ).value =
      item.suggestedChange ||
      "";

    document.getElementById(
      "flowProposalReason"
    ).value =
      [
        item.title,
        item.description,

        item.evidence &&
        item.evidence.phrase
          ? (
              "Employee phrase: " +
              item.evidence.phrase
            )
          : ""
      ]
        .filter(Boolean)
        .join("\n\n");

    const byIssue = {
      recognition:
        "recognition-alias",

      "question-wording":
        "question-wording",

      "receiver-brief":
        "receiver-brief",

      "missing-information":
        "work-readiness",

      routing:
        "destination-queue"
    };

    document.getElementById(
      "flowProposalChangeType"
    ).value =
      byIssue[item.issueType] ||
      "other";

    document.getElementById(
      "flowProposalRisk"
    ).value =
      "low";

    syncRisk();

    document.getElementById(
      "flowProposalDialog"
    ).showModal();
  }

    // FLOW FEEDBACK: MAP QUEUE FEEDBACK TO AN OWNED REQUEST FLOW
  function inferTemplateFromQueue(queue) {
    const normalizedQueue =
      clean(queue).toLowerCase();

    if (
      normalizedQueue.includes(
        "it information"
      )
    ) {
      return "printer-ink";
    }

    if (
      normalizedQueue.includes(
        "it help desk"
      ) ||
      normalizedQueue.includes(
        "it support"
      )
    ) {
      return "printer-connectivity";
    }

    if (
      normalizedQueue.includes(
        "systems intake"
      ) ||
      normalizedQueue.includes(
        "business systems"
      )
    ) {
      return "systems-intake";
    }

    return "";
  }

  function createProposal() {
    const feedback =
      read(FEEDBACK_KEY)
        .find(
          (item) =>
            item.id ===
            activeFeedbackId
        );

    if (!feedback) return null;

    const type =
      document.getElementById(
        "flowProposalChangeType"
      ).value;

    const risk =
      GOVERNED_TYPES.has(type)
        ? "governed"
        : document.getElementById(
            "flowProposalRisk"
          ).value;

    const now =
      new Date()
        .toISOString();

    const proposal = {
      id:
        `proposal-${Date.now()}-` +
        Math.random()
          .toString(36)
          .slice(2, 8),

      createdAt:
        now,

      templateId:
  clean(feedback.templateId) ||
  inferTemplateFromQueue(feedback.queue),

      templateName:
        flowName(feedback),

      queue:
        clean(
          feedback.queue
        ),

      proposedBy:
        Store.CURRENT_USER.name,

      proposedByRole:
        "IT Queue & Category Manager",

      changeType:
        type,

      riskLevel:
        risk,

      requiresApproval:
        risk === "governed",

      before:
        clean(
          document.getElementById(
            "flowProposalBefore"
          ).value
        ),

      after:
        clean(
          document.getElementById(
            "flowProposalAfter"
          ).value
        ),

      reason:
        clean(
          document.getElementById(
            "flowProposalReason"
          ).value
        ),

      relatedFeedbackIds: [
        feedback.id
      ],

      status:
        risk === "governed"
          ? "pending-approval"
          : "published"
    };

    const proposals =
      read(PROPOSAL_KEY);

    proposals.unshift(
      proposal
    );

    write(
      PROPOSAL_KEY,
      proposals,
      "masterflow:flow-proposals"
    );

    updateFeedback(
      feedback.id,
      {
        status:
          risk === "governed"
            ? "proposal-created"
            : "published",

        reviewedAt:
          feedback.reviewedAt ||
          now,

        reviewedBy:
          feedback.reviewedBy ||
          Store.CURRENT_USER.name,

        proposalId:
          proposal.id,

        outcome:
          risk === "governed"
            ? (
                "Submitted to Megan for " +
                "enterprise approval."
              )
            : (
                "Low-risk improvement published " +
                "by the category manager."
              )
      }
    );

    return proposal;
  }

  function updateLinkedFeedback(
    proposal,
    patch
  ) {
    const items =
      read(FEEDBACK_KEY);

    const ids =
      new Set(
        proposal
          .relatedFeedbackIds ||
        []
      );

    let changed = false;

    items.forEach((item) => {
      if (!ids.has(item.id)) return;

      Object.assign(
        item,
        patch
      );

      changed = true;
    });

    if (changed) {
      write(
        FEEDBACK_KEY,
        items,
        "masterflow:flow-feedback"
      );
    }
  }

  function decideProposal(
    id,
    action
  ) {
    const items =
      read(PROPOSAL_KEY);

    const proposal =
      items.find(
        (item) =>
          item.id === id
      );

    if (!proposal) return;

    const now =
      new Date()
        .toISOString();

    if (
      action === "approve" &&
      proposal.status ===
        "pending-approval"
    ) {
      proposal.status =
        "approved";

      proposal.decision =
        "approved";

      proposal.decisionAt =
        now;

      proposal.decisionBy =
        "Megan Delia";

      UI.showToast(
        "Governed proposal approved."
      );
    } else if (
      action === "reject" &&
      proposal.status ===
        "pending-approval"
    ) {
      const reason =
        clean(
          window.prompt(
            "Why is this proposal being rejected?"
          ) || ""
        );

      if (!reason) {
        UI.showToast(
          "A rejection reason is required."
        );

        return;
      }

      proposal.status =
        "rejected";

      proposal.decision =
        "rejected";

      proposal.decisionAt =
        now;

      proposal.decisionBy =
        "Megan Delia";

      proposal.decisionReason =
        reason;

      updateLinkedFeedback(
        proposal,
        {
          status:
            "rejected",

          outcome:
            `Rejected by Megan Delia: ${reason}`
        }
      );

      UI.showToast(
        "Governed proposal rejected."
      );
    } else if (
      action === "publish" &&
      proposal.status ===
        "approved"
    ) {
      proposal.status =
        "published";

      proposal.publishedAt =
        now;

      proposal.publishedBy =
        "Megan Delia";

      updateLinkedFeedback(
        proposal,
        {
          status:
            "published",

          outcome:
            "Governed improvement approved and published by Megan Delia."
        }
      );

      UI.showToast(
        "Approved proposal published."
      );
    } else {
      return;
    }

    write(
      PROPOSAL_KEY,
      items,
      "masterflow:flow-proposals"
    );
  }

  function bind() {
    const center =
      document.getElementById(
        "flowImprovementCenter"
      );

    const dialog =
      document.getElementById(
        "flowProposalDialog"
      );

    const form =
      document.getElementById(
        "flowProposalForm"
      );

    center.addEventListener(
      "click",
      (event) => {
        const feedbackButton =
          event.target.closest(
            "[data-feedback-action]"
          );

        if (feedbackButton) {
          const id =
            feedbackButton
              .dataset
              .feedbackId;

          if (
            feedbackButton
              .dataset
              .feedbackAction ===
            "review"
          ) {
            updateFeedback(
              id,
              {
                status:
                  "reviewed",

                reviewedAt:
                  new Date()
                    .toISOString(),

                reviewedBy:
                  Store.CURRENT_USER.name
              }
            );

            UI.showToast(
              "Feedback marked reviewed."
            );
          } else {
            openProposal(id);
          }

          return;
        }

        const proposalButton =
          event.target.closest(
            "[data-proposal-action]"
          );

        if (proposalButton) {
          decideProposal(
            proposalButton
              .dataset
              .proposalId,

            proposalButton
              .dataset
              .proposalAction
          );
        }
      }
    );

    dialog
      .querySelectorAll(
        "[data-close-flow-proposal]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            dialog.close()
        );
      });

    document.getElementById(
      "flowProposalChangeType"
    ).addEventListener(
      "change",
      syncRisk
    );

    form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        if (
          !form.reportValidity()
        ) {
          return;
        }

        const proposal =
          createProposal();

        if (!proposal) return;

        dialog.close();
        form.reset();

        activeFeedbackId = "";

        UI.showToast(
          proposal.requiresApproval
            ? (
                "Governed proposal " +
                "sent to Megan."
              )
            : (
                "Low-risk improvement " +
                "published."
              )
        );
      }
    );

    if (roleSelect) {
      roleSelect.addEventListener(
        "change",
        () =>
          setTimeout(
            render,
            0
          )
      );
    }

    window.addEventListener(
      "masterflow:flow-feedback",
      render
    );

    window.addEventListener(
      "masterflow:flow-proposals",
      render
    );

    window.addEventListener(
      "storage",
      render
    );
  }

  mount();
  bind();
  render();
})();
