(function () {
  "use strict";

  const Store =
    window.MasterFlowStore;

  const Templates =
    window.MasterFlowTemplates;

  const UI =
    window.MasterFlowUI;

  if (
    !Store ||
    !Templates ||
    !UI ||
    !UI.layoutReady
  ) {
    console.error(
      "Platform Governance could not start because a dependency is missing."
    );

    return;
  }

  const PROPOSAL_KEY =
    "masterflowFlowProposalsV1";

  const FEEDBACK_KEY =
    "masterflowFlowFeedbackV1";

  const form =
    document.getElementById(
      "adminSettingsForm"
    );

  const routingRules =
    document.getElementById(
      "routingRules"
    );

  const approvalRules =
    document.getElementById(
      "approvalRules"
    );

  const proposalList =
    document.getElementById(
      "governanceProposalList"
    );

  const recentList =
    document.getElementById(
      "governanceRecentList"
    );

  if (
    !form ||
    !routingRules ||
    !approvalRules ||
    !proposalList ||
    !recentList
  ) {
    console.error(
      "Platform Governance could not find its required page elements."
    );

    return;
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

  function cleanText(value) {
    return String(
      value == null
        ? ""
        : value
    ).trim();
  }

  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function humanize(value) {
    return cleanText(value)
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
  }

  function formatDate(value) {
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

  function readArray(key) {
    try {
      const parsed =
        JSON.parse(
          window.localStorage.getItem(
            key
          ) || "[]"
        );

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch (error) {
      console.warn(
        `MasterFlow could not read ${key}.`,
        error
      );

      return [];
    }
  }

  function writeArray(
    key,
    items,
    eventName
  ) {
    window.localStorage.setItem(
      key,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new CustomEvent(
        eventName,
        {
          detail:
            clone(items)
        }
      )
    );
  }

  function setText(id, value) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        String(
          value == null
            ? ""
            : value
        );
    }
  }

  function numericValue(value) {
    const match =
      cleanText(value).match(
        /-?\d+(?:\.\d+)?/
      );

    if (!match) {
      return Number.NaN;
    }

    return Number(match[0]);
  }

  function unique(items) {
    return [
      ...new Set(
        items
          .map(cleanText)
          .filter(Boolean)
      )
    ];
  }

  function relevantApprovalRules(state) {
    return (
      state.approvalRules ||
      []
    ).filter((rule) => {
      const text =
        `${rule.name || ""} ${rule.approver || ""}`
          .toLowerCase();

      return !(
        text.includes("freight") ||
        text.includes("promise date") ||
        text.includes("auto-apply")
      );
    });
  }

  function settingsWithDefaults(settings) {
    return {
      ticketClassificationThreshold:
        Number(
          settings.ticketClassificationThreshold ??
          70
        ),

      p1ResponseMinutes:
        Number(
          settings.p1ResponseMinutes ??
          15
        ),

      normalResponseHours:
        Number(
          settings.normalResponseHours ??
          4
        ),

      normalResolutionHours:
        Number(
          settings.normalResolutionHours ??
          24
        ),

      managerApprovalLimit:
        Number(
          settings.managerApprovalLimit ??
          settings.directorApprovalThreshold ??
          1000
        ),

      managerResponseSlaDeltaHours:
        Number(
          settings.managerResponseSlaDeltaHours ??
          4
        ),

      managerResolutionSlaDeltaHours:
        Number(
          settings.managerResolutionSlaDeltaHours ??
          24
        )
    };
  }

  function populateSettings(settings) {
    const values =
      settingsWithDefaults(
        settings
      );

    document.getElementById(
      "ticketConfidence"
    ).value =
      values.ticketClassificationThreshold;

    document.getElementById(
      "p1Response"
    ).value =
      values.p1ResponseMinutes;

    document.getElementById(
      "normalResponse"
    ).value =
      values.normalResponseHours;

    document.getElementById(
      "normalResolution"
    ).value =
      values.normalResolutionHours;

    document.getElementById(
      "managerApprovalLimit"
    ).value =
      values.managerApprovalLimit;

    document.getElementById(
      "managerResponseSlaDelta"
    ).value =
      values.managerResponseSlaDeltaHours;

    document.getElementById(
      "managerResolutionSlaDelta"
    ).value =
      values.managerResolutionSlaDeltaHours;
  }

  function statusBadge(status) {
    if (
      status === "published" ||
      status === "approved"
    ) {
      return "badge-green";
    }

    if (status === "rejected") {
      return "badge-red";
    }

    if (
      status === "pending-approval"
    ) {
      return "badge-amber";
    }

    return "badge-gray";
  }

  function proposalActionMarkup(
    proposal
  ) {
    if (
      proposal.status ===
      "pending-approval"
    ) {
      return `
        <div class="page-actions">
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-proposal-action="approve"
            data-proposal-id="${escapeHtml(
              proposal.id
            )}"
          >
            Approve
          </button>

          <button
            class="btn btn-danger btn-sm"
            type="button"
            data-proposal-action="reject"
            data-proposal-id="${escapeHtml(
              proposal.id
            )}"
          >
            Reject
          </button>
        </div>
      `;
    }

    if (
      proposal.status ===
      "approved"
    ) {
      return `
        <div class="page-actions">
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-proposal-action="publish"
            data-proposal-id="${escapeHtml(
              proposal.id
            )}"
          >
            Publish approved change
          </button>
        </div>
      `;
    }

    return "";
  }

  function proposalMarkup(proposal) {
    return `
      <article class="rule-card">
        <div class="rule-footer">
          <div class="list-meta">
            <span
              class="badge ${statusBadge(
                proposal.status
              )}"
            >
              ${escapeHtml(
                humanize(
                  proposal.status
                )
              )}
            </span>

            <span
              class="badge ${
                proposal.riskLevel ===
                "governed"
                  ? "badge-purple"
                  : "badge-teal"
              }"
            >
              ${escapeHtml(
                humanize(
                  proposal.riskLevel ||
                  "governed"
                )
              )}
            </span>
          </div>

          ${proposalActionMarkup(
            proposal
          )}
        </div>

        <h3>
          ${escapeHtml(
            proposal.templateName ||
            proposal.templateId ||
            "Request-flow proposal"
          )}
        </h3>

        <p>
          ${escapeHtml(
            proposal.reason ||
            "No proposal reason was recorded."
          )}
        </p>

        <div class="detail-grid mt-12">
          <div class="detail-cell">
            <small>Change type</small>

            <strong>
              ${escapeHtml(
                humanize(
                  proposal.changeType
                )
              )}
            </strong>
          </div>

          <div class="detail-cell">
            <small>Proposed by</small>

            <strong>
              ${escapeHtml(
                proposal.proposedBy ||
                "Unknown"
              )}
            </strong>
          </div>

          <div class="detail-cell">
            <small>Created</small>

            <strong>
              ${escapeHtml(
                formatDate(
                  proposal.createdAt
                )
              )}
            </strong>
          </div>
        </div>

        <div class="detail-grid mt-12">
          <div class="detail-cell">
            <small>Before</small>

            <strong>
              ${escapeHtml(
                proposal.before ||
                "Not recorded"
              )}
            </strong>
          </div>

          <div class="detail-cell">
            <small>After</small>

            <strong>
              ${escapeHtml(
                proposal.after ||
                "Not recorded"
              )}
            </strong>
          </div>

          <div class="detail-cell">
            <small>Applied result</small>

            <strong>
              ${escapeHtml(
                proposal.applicationSummary ||
                (
                  proposal.status ===
                    "published"
                    ? "Published"
                    : "Not yet applied"
                )
              )}
            </strong>
          </div>
        </div>

        ${
          proposal.decisionReason
            ? `
                <div class="notice notice-danger mt-12">
                  <div>
                    <strong>
                      Rejection reason
                    </strong>

                    <p>
                      ${escapeHtml(
                        proposal.decisionReason
                      )}
                    </p>
                  </div>
                </div>
              `
            : ""
        }
      </article>
    `;
  }

  function renderProposals() {
    const proposals =
      readArray(PROPOSAL_KEY)
        .slice()
        .sort((a, b) => {
          const priority = {
            "pending-approval": 0,
            approved: 1,
            published: 2,
            rejected: 3
          };

          const aRank =
            priority[a.status] ?? 4;

          const bRank =
            priority[b.status] ?? 4;

          if (aRank !== bRank) {
            return aRank - bRank;
          }

          return (
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
          );
        });

    const actionable =
      proposals.filter(
        (proposal) =>
          [
            "pending-approval",
            "approved"
          ].includes(
            proposal.status
          )
      );

    setText(
      "governancePendingCount",
      proposals.filter(
        (proposal) =>
          proposal.status ===
          "pending-approval"
      ).length
    );

    setText(
      "governanceApprovedCount",
      proposals.filter(
        (proposal) =>
          proposal.status ===
          "approved"
      ).length
    );

    setText(
      "governanceProposalCount",
      `${actionable.length} action${
        actionable.length === 1
          ? ""
          : "s"
      }`
    );

    proposalList.innerHTML =
      proposals.length
        ? proposals
            .slice(0, 12)
            .map(
              proposalMarkup
            )
            .join("")
        : `
            <div class="notice notice-success">
              <div>
                <strong>
                  No governed proposals
                </strong>

                <p>
                  Protected changes submitted by category managers
                  will appear here.
                </p>
              </div>
            </div>
          `;
  }

  function renderRecent() {
    const decisions =
      readArray(PROPOSAL_KEY)
        .filter(
          (proposal) =>
            [
              "approved",
              "published",
              "rejected"
            ].includes(
              proposal.status
            )
        )
        .sort((a, b) => {
          const aDate =
            a.publishedAt ||
            a.decisionAt ||
            a.createdAt;

          const bDate =
            b.publishedAt ||
            b.decisionAt ||
            b.createdAt;

          return (
            new Date(
              bDate
            ).getTime() -
            new Date(
              aDate
            ).getTime()
          );
        });

    recentList.innerHTML =
      decisions.length
        ? `
            <div class="list">
              ${decisions
                .slice(0, 8)
                .map((proposal) => `
                  <div class="list-row">
                    <div>
                      <div class="list-title">
                        ${escapeHtml(
                          proposal.templateName ||
                          proposal.templateId ||
                          "Flow proposal"
                        )}
                      </div>

                      <div class="list-meta">
                        <span>
                          ${escapeHtml(
                            humanize(
                              proposal.changeType
                            )
                          )}
                        </span>

                        <span>
                          ${escapeHtml(
                            proposal.decisionBy ||
                            proposal.publishedBy ||
                            "Megan Delia"
                          )}
                        </span>

                        <span>
                          ${escapeHtml(
                            formatDate(
                              proposal.publishedAt ||
                              proposal.decisionAt ||
                              proposal.createdAt
                            )
                          )}
                        </span>
                      </div>
                    </div>

                    <span
                      class="badge ${statusBadge(
                        proposal.status
                      )}"
                    >
                      ${escapeHtml(
                        humanize(
                          proposal.status
                        )
                      )}
                    </span>
                  </div>
                `)
                .join("")}
            </div>
          `
        : `
            <div class="empty-state">
              No governance decisions have been recorded yet.
            </div>
          `;
  }

  function renderRules(state) {
    const routes =
      state.routingRules || [];

    const approvals =
      relevantApprovalRules(
        state
      );

    routingRules.innerHTML =
      routes.length
        ? routes
            .map((rule) => `
              <div class="rule-card">
                <h3>
                  ${escapeHtml(
                    rule.name
                  )}
                </h3>

                <p>
                  <strong>When:</strong>
                  ${escapeHtml(
                    rule.condition
                  )}

                  <br>

                  <strong>Route to:</strong>
                  ${escapeHtml(
                    rule.route
                  )}
                </p>

                <div class="rule-footer">
                  <span
                    class="badge ${
                      rule.active
                        ? "badge-green"
                        : "badge-gray"
                    }"
                  >
                    ${
                      rule.active
                        ? "Active"
                        : "Inactive"
                    }
                  </span>

                  <button
                    class="btn btn-secondary btn-sm"
                    type="button"
                    data-toggle-routing="${escapeHtml(
                      rule.id
                    )}"
                  >
                    ${
                      rule.active
                        ? "Disable"
                        : "Enable"
                    }
                  </button>
                </div>
              </div>
            `)
            .join("")
        : `
            <div class="empty-state">
              No routing guardrails are configured.
            </div>
          `;

    approvalRules.innerHTML =
      approvals.length
        ? approvals
            .map((rule) => `
              <div class="rule-card">
                <h3>
                  ${escapeHtml(
                    rule.name
                  )}
                </h3>

                <p>
                  <strong>Approval:</strong>
                  ${escapeHtml(
                    rule.approver
                  )}
                </p>

                <div class="rule-footer">
                  <span
                    class="badge ${
                      rule.active
                        ? "badge-green"
                        : "badge-gray"
                    }"
                  >
                    ${
                      rule.active
                        ? "Active"
                        : "Inactive"
                    }
                  </span>

                  <button
                    class="btn btn-secondary btn-sm"
                    type="button"
                    data-toggle-approval="${escapeHtml(
                      rule.id
                    )}"
                  >
                    ${
                      rule.active
                        ? "Disable"
                        : "Enable"
                    }
                  </button>
                </div>
              </div>
            `)
            .join("")
        : `
            <div class="notice notice-info">
              <div>
                <strong>
                  No additional ticket-approval rules
                </strong>

                <p>
                  The manager approval limit above controls the current
                  prototype’s financial escalation.
                </p>
              </div>
            </div>
          `;
  }

  function renderKpis(state) {
    const settings =
      settingsWithDefaults(
        state.settings
      );

    const activeRoutes =
      (
        state.routingRules ||
        []
      ).filter(
        (rule) =>
          rule.active
      ).length;

    const activeApprovals =
      relevantApprovalRules(
        state
      ).filter(
        (rule) =>
          rule.active
      ).length;

    setText(
      "governanceManagerLimit",
      UI.formatMoney(
        settings.managerApprovalLimit,
        0
      )
    );

    setText(
      "governanceGuardrailCount",
      activeRoutes +
      activeApprovals +
      2
    );
  }

  function linkedFeedback(
    proposal
  ) {
    const ids =
      new Set(
        proposal.relatedFeedbackIds ||
        []
      );

    return readArray(
      FEEDBACK_KEY
    ).find(
      (item) =>
        ids.has(item.id)
    ) || null;
  }

  function updateLinkedFeedback(
    proposal,
    patch
  ) {
    const items =
      readArray(
        FEEDBACK_KEY
      );

    const ids =
      new Set(
        proposal.relatedFeedbackIds ||
        []
      );

    let changed = false;

    items.forEach((item) => {
      if (!ids.has(item.id)) {
        return;
      }

      Object.assign(
        item,
        patch
      );

      changed = true;
    });

    if (changed) {
      writeArray(
        FEEDBACK_KEY,
        items,
        "masterflow:flow-feedback"
      );
    }
  }

  function applyProposalToTemplate(
    proposal
  ) {
    const templateId =
      cleanText(
        proposal.templateId
      );

    if (!templateId) {
      return {
        applied: false,

        summary:
          "Governance decision published; no request-flow ID was linked."
      };
    }

    const template =
      Templates.get(
        templateId
      );

    if (
      !template ||
      template.id !==
        templateId
    ) {
      throw new Error(
        `Request flow "${templateId}" was not found.`
      );
    }

    const updated =
      clone(template);

    const after =
      cleanText(
        proposal.after
      );

    const feedback =
      linkedFeedback(
        proposal
      );

    let summary = "";

    if (
      proposal.changeType ===
      "destination-queue"
    ) {
      if (!after) {
        throw new Error(
          "The proposed queue is empty."
        );
      }

      updated.queue =
        after;

      summary =
        `Receiving queue changed to ${after}.`;
    } else if (
      proposal.changeType ===
      "response-sla"
    ) {
      const hours =
        numericValue(after);

      if (
        !Number.isFinite(hours) ||
        hours <= 0
      ) {
        throw new Error(
          "The proposed response SLA does not contain a valid positive number."
        );
      }

      updated.responseSlaHours =
        hours;

      summary =
        `Response SLA changed to ${hours} hour${
          hours === 1
            ? ""
            : "s"
        }.`;
    } else if (
      proposal.changeType ===
      "resolution-sla"
    ) {
      const hours =
        numericValue(after);

      if (
        !Number.isFinite(hours) ||
        hours <= 0
      ) {
        throw new Error(
          "The proposed resolution SLA does not contain a valid positive number."
        );
      }

      updated.resolutionSlaHours =
        hours;

      summary =
        `Resolution SLA changed to ${hours} hour${
          hours === 1
            ? ""
            : "s"
        }.`;
    } else if (
      proposal.changeType ===
      "default-priority"
    ) {
      const match =
        after.match(
          /\bP[1-4]\b/i
        );

      if (!match) {
        throw new Error(
          "The proposed priority must include P1, P2, P3, or P4."
        );
      }

      const priorities = {
        P1: "P1 - Critical",
        P2: "P2 - High",
        P3: "P3 - Normal",
        P4: "P4 - Low"
      };

      updated.priority =
        priorities[
          match[0].toUpperCase()
        ];

      summary =
        `Default priority changed to ${updated.priority}.`;
    } else if (
      proposal.changeType ===
      "recognition-alias"
    ) {
      const aliases =
        unique(
          after.split(
            /\n|,/
          )
        );

      if (!aliases.length) {
        throw new Error(
          "No recognition alias was supplied."
        );
      }

      updated.keywords =
        unique([
          ...(
            updated.keywords ||
            []
          ),
          ...aliases
        ]);

      summary =
        `${aliases.length} recognition alias${
          aliases.length === 1
            ? ""
            : "es"
        } added.`;
    } else if (
      proposal.changeType ===
      "suggested-first-action"
    ) {
      updated.diagnostics = {
        ...(
          updated.diagnostics ||
          {}
        ),

        suggestedFirstAction:
          after
      };

      summary =
        "Suggested First Action updated.";
    } else if (
      proposal.changeType ===
      "receiver-brief"
    ) {
      updated.receiverBrief =
        after;

      summary =
        "Receiver Brief wording updated.";
    } else if (
      proposal.changeType ===
      "question-wording"
    ) {
      const diagnosticId =
        cleanText(
          feedback &&
          feedback.evidence &&
          feedback.evidence.diagnosticId
        );

      const questions =
        updated.diagnostics &&
        Array.isArray(
          updated.diagnostics.questions
        )
          ? updated.diagnostics.questions
          : [];

      const question =
        questions.find(
          (item) =>
            item.id ===
            diagnosticId
        );

      if (
        !diagnosticId ||
        !question
      ) {
        return {
          applied: false,

          summary:
            "Question-wording decision published; no diagnostic question ID was linked."
        };
      }

      question.question =
        after;

      summary =
        `Diagnostic question "${diagnosticId}" updated.`;
    } else if (
      proposal.changeType ===
      "work-readiness"
    ) {
      const diagnosticId =
        cleanText(
          feedback &&
          feedback.evidence &&
          feedback.evidence.diagnosticId
        );

      if (!diagnosticId) {
        return {
          applied: false,

          summary:
            "Work-readiness decision published; no diagnostic requirement ID was linked."
        };
      }

      updated.diagnostics = {
        ...(
          updated.diagnostics ||
          {}
        ),

        requiredForWork:
          unique([
            ...(
              updated.diagnostics &&
              Array.isArray(
                updated.diagnostics
                  .requiredForWork
              )
                ? updated.diagnostics
                    .requiredForWork
                : []
            ),

            diagnosticId
          ])
      };

      summary =
        `"${diagnosticId}" added as a work-readiness requirement.`;
    } else {
      return {
        applied: false,

        summary:
          "Governance decision published; this change remains represented by the proposal record."
      };
    }

    Templates.save(
      updated
    );

    return {
      applied: true,
      summary
    };
  }

  function decideProposal(
    proposalId,
    action
  ) {
    const proposals =
      readArray(
        PROPOSAL_KEY
      );

    const proposal =
      proposals.find(
        (item) =>
          item.id ===
          proposalId
      );

    if (!proposal) {
      UI.showToast(
        "Proposal not found."
      );

      return;
    }

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

      updateLinkedFeedback(
        proposal,
        {
          outcome:
            "Approved by Megan Delia and awaiting publication."
        }
      );

      UI.showToast(
        "Governed proposal approved."
      );
    } else if (
      action === "reject" &&
      proposal.status ===
        "pending-approval"
    ) {
      const reason =
        cleanText(
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
      let result;

      try {
        result =
          applyProposalToTemplate(
            proposal
          );
      } catch (error) {
        console.error(
          "Could not apply governed proposal.",
          error
        );

        UI.showToast(
          error.message ||
          "The approved change could not be applied."
        );

        return;
      }

      proposal.status =
        "published";

      proposal.publishedAt =
        now;

      proposal.publishedBy =
        "Megan Delia";

      proposal.appliedToTemplate =
        result.applied;

      proposal.applicationSummary =
        result.summary;

      updateLinkedFeedback(
        proposal,
        {
          status:
            "published",

          outcome:
            `Published by Megan Delia. ${result.summary}`
        }
      );

      UI.showToast(
        result.applied
          ? "Approved proposal published and applied."
          : "Governance decision published."
      );
    } else {
      return;
    }

    writeArray(
      PROPOSAL_KEY,
      proposals,
      "masterflow:flow-proposals"
    );

    render();
  }

  function render() {
    const state =
      Store.getState();

    populateSettings(
      state.settings
    );

    renderKpis(state);
    renderRules(state);
    renderProposals();
    renderRecent();
  }

  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const managerApprovalLimit =
        Number(
          document.getElementById(
            "managerApprovalLimit"
          ).value
        );

      const settings = {
        ticketClassificationThreshold:
          Number(
            document.getElementById(
              "ticketConfidence"
            ).value
          ),

        p1ResponseMinutes:
          Number(
            document.getElementById(
              "p1Response"
            ).value
          ),

        normalResponseHours:
          Number(
            document.getElementById(
              "normalResponse"
            ).value
          ),

        normalResolutionHours:
          Number(
            document.getElementById(
              "normalResolution"
            ).value
          ),

        managerApprovalLimit,

        /*
         * Existing ticket approval logic reads this key.
         * Keeping both values synchronized makes the new
         * label immediately affect current prototype behavior.
         */
        directorApprovalThreshold:
          managerApprovalLimit,

        managerResponseSlaDeltaHours:
          Number(
            document.getElementById(
              "managerResponseSlaDelta"
            ).value
          ),

        managerResolutionSlaDeltaHours:
          Number(
            document.getElementById(
              "managerResolutionSlaDelta"
            ).value
          )
      };

      const numericValues =
        Object.values(settings);

      if (
        numericValues.some(
          (value) =>
            !Number.isFinite(value) ||
            value < 0
        )
      ) {
        UI.showToast(
          "Every governance threshold must contain a valid non-negative number."
        );

        return;
      }

      Store.updateSettings(
        settings
      );

      UI.showToast(
        "Megan’s governance thresholds were saved."
      );
    }
  );

  routingRules.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-toggle-routing]"
        );

      if (!button) {
        return;
      }

      const current =
        Store.getState()
          .routingRules
          .find(
            (rule) =>
              rule.id ===
              button.dataset
                .toggleRouting
          );

      if (!current) {
        return;
      }

      Store.updateRoutingRule(
        current.id,
        {
          active:
            !current.active
        }
      );

      UI.showToast(
        `${current.name} ${
          current.active
            ? "disabled"
            : "enabled"
        }.`
      );
    }
  );

  approvalRules.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-toggle-approval]"
        );

      if (!button) {
        return;
      }

      const current =
        Store.getState()
          .approvalRules
          .find(
            (rule) =>
              rule.id ===
              button.dataset
                .toggleApproval
          );

      if (!current) {
        return;
      }

      Store.updateApprovalRule(
        current.id,
        {
          active:
            !current.active
        }
      );

      UI.showToast(
        `${current.name} ${
          current.active
            ? "disabled"
            : "enabled"
        }.`
      );
    }
  );

  proposalList.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-proposal-action]"
        );

      if (!button) {
        return;
      }

      decideProposal(
        button.dataset.proposalId,
        button.dataset.proposalAction
      );
    }
  );

  document.getElementById(
    "resetSettingsButton"
  ).addEventListener(
    "click",
    () => {
      const accepted =
        window.confirm(
          "Reset all prototype tickets, templates, feedback, proposals, settings, and rules?"
        );

      if (!accepted) {
        return;
      }

      Store.resetState();

      window.localStorage.removeItem(
        PROPOSAL_KEY
      );

      window.localStorage.removeItem(
        FEEDBACK_KEY
      );

      window.dispatchEvent(
        new CustomEvent(
          "masterflow:flow-proposals",
          {
            detail: []
          }
        )
      );

      window.dispatchEvent(
        new CustomEvent(
          "masterflow:flow-feedback",
          {
            detail: []
          }
        )
      );

      UI.showToast(
        "All prototype data and governance records were reset."
      );

      render();
    }
  );

  window.addEventListener(
    "masterflow:state",
    render
  );

  window.addEventListener(
    "masterflow:flow-proposals",
    render
  );

  window.addEventListener(
    "masterflow:flow-feedback",
    render
  );

  window.addEventListener(
    "masterflow:templates",
    render
  );

  window.addEventListener(
    "storage",
    render
  );

  render();
})();
