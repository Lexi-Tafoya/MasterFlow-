(function () {
  "use strict";

  if (
    document.body.dataset.page !==
    "reporting"
  ) {
    return;
  }

  const Store =
    window.MasterFlowStore;

  const Templates =
    window.MasterFlowTemplates;

  const Feedback =
    window.MasterFlowReceiverFeedback;

  const UI =
    window.MasterFlowUI;

  if (
    !Store ||
    !Templates ||
    !Feedback ||
    !UI ||
    !UI.layoutReady
  ) {
    console.error(
      "MasterFlow Intelligence could not start because a dependency is missing."
    );

    return;
  }

  const ADMIN_ROLE_KEY =
    "masterflowAdminRoleV1";

  const PROPOSAL_KEY =
    "masterflowFlowProposalsV1";

  const MANAGED_TEMPLATE_IDS =
    new Set([
      "printer-ink",
      "printer-connectivity",
      "systems-intake"
    ]);

  /*
   * The first three queues are the frozen
   * prototype ownership model.
   *
   * IT Support and Business Systems support
   * the current seeded demo records.
   */
  const MANAGED_QUEUES =
    new Set([
      "IT Help Desk",
      "IT Information",
      "Business Enablement - Systems Intake",
      "IT Support",
      "Business Systems"
    ]);

  /*
   * These are operational conditions rather
   * than intake-design defects.
   */
  const FLOW_GAP_EXCLUSIONS =
    new Set([
      "Assigned owner",
      "Confirmed routing",
      "Requester response"
    ]);

  function byId(id) {
    return document.getElementById(id);
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
    )
      .replace(/\s+/g, " ")
      .trim();
  }

  function setText(id, value) {
    const element = byId(id);

    if (element) {
      element.textContent =
        String(
          value == null
            ? ""
            : value
        );
    }
  }

  function setWidth(id, value) {
    const element = byId(id);

    if (!element) {
      return;
    }

    const number =
      Math.max(
        0,
        Math.min(
          100,
          Number(value) || 0
        )
      );

    element.style.width =
      `${number}%`;
  }

  function readStoredArray(key) {
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

  function percentage(
    part,
    total
  ) {
    return total
      ? Math.round(
          (
            part /
            total
          ) * 100
        )
      : 0;
  }

  function average(
    values,
    digits
  ) {
    const valid =
      values.filter(
        (value) =>
          Number.isFinite(
            Number(value)
          )
      );

    if (!valid.length) {
      return 0;
    }

    const result =
      valid.reduce(
        (sum, value) =>
          sum + Number(value),
        0
      ) / valid.length;

    return Number(
      result.toFixed(
        digits == null
          ? 0
          : digits
      )
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

  /*
   * This supports the current prototype role
   * implementation while the final global-role
   * consolidation remains scheduled for Claude.
   */
  function currentScope() {
    const adminRole =
      window.localStorage.getItem(
        ADMIN_ROLE_KEY
      ) || "";

    if (
      [
        "category-owner",
        "category-manager",
        "queue-manager"
      ].includes(adminRole)
    ) {
      return "manager";
    }

    if (
      adminRole ===
        "platform-admin" ||
      Store.getRole() === "admin"
    ) {
      return "enterprise";
    }

    return "manager";
  }

  function allTemplates() {
    const templates =
      Templates.getAll();

    return Array.isArray(
      templates
    )
      ? templates
      : [];
  }

  function templateByName(name) {
    const normalized =
      cleanText(name)
        .toLowerCase();

    return (
      allTemplates().find(
        (template) =>
          cleanText(
            template.name
          ).toLowerCase() ===
          normalized
      ) || null
    );
  }

  /*
   * Older demo tickets do not always contain
   * requestTemplateId, so this function infers
   * the most likely request flow for reporting.
   */
  function inferFlow(ticket) {
    const details =
      ticket.details || {};

    let templateId =
      cleanText(
        details.requestTemplateId ||
        details.templateId ||
        details.flowId
      );

    if (
      !templateId &&
      details.requestTemplateName
    ) {
      const namedTemplate =
        templateByName(
          details.requestTemplateName
        );

      templateId =
        namedTemplate
          ? namedTemplate.id
          : "";
    }

    if (templateId) {
      const configured =
        Templates.get(
          templateId
        );

      if (
        configured &&
        configured.id ===
          templateId
      ) {
        return {
          id:
            configured.id,

          name:
            configured.name,

          queue:
            configured.queue
        };
      }
    }

    const text = [
      ticket.title,
      ticket.description,
      ticket.category,
      ticket.queue
    ]
      .join(" ")
      .toLowerCase();

    if (
      /shipping|manifest|outbound/
        .test(text) &&
      /^p1/i.test(
        ticket.priority || ""
      )
    ) {
      return {
        id:
          "p1-fast-lane",

        name:
          "Shipping Is Stopped fast lane",

        queue:
          ticket.queue
      };
    }

    if (
      /toner|printer ink|ink cartridge|printer supply/
        .test(text)
    ) {
      const template =
        Templates.get(
          "printer-ink"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    if (
      /printer|laptop|computer|workstation|device performance|it support/
        .test(text)
    ) {
      const template =
        Templates.get(
          "printer-connectivity"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    if (
      /oms|merp|syq|edi|api|business systems|report access|software access|system/
        .test(text)
    ) {
      const template =
        Templates.get(
          "systems-intake"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    if (
      /forklift|pallet jack|mhe|equipment out of service/
        .test(text)
    ) {
      const template =
        Templates.get(
          "equipment-out-of-service"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    if (
      /stock check|inventory verification/
        .test(text)
    ) {
      const template =
        Templates.get(
          "stock-check-phoenix"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    if (
      /hvac|air conditioning|too hot|too cold|heating/
        .test(text)
    ) {
      const template =
        Templates.get(
          "facilities-hvac"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    if (
      /corrective action|warehouse error|wrong part|packaging error/
        .test(text)
    ) {
      const template =
        Templates.get(
          "corrective-action-warehouse"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    if (
      /triage|needs classification/
        .test(text)
    ) {
      const template =
        Templates.get(
          "general-triage"
        );

      return {
        id: template.id,
        name: template.name,
        queue: template.queue
      };
    }

    const fallbackName =
      cleanText(
        ticket.category
      ) ||
      cleanText(
        ticket.queue
      ) ||
      "Other request";

    return {
      id:
        "other-" +
        fallbackName
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            "-"
          ),

      name:
        fallbackName,

      queue:
        ticket.queue
    };
  }

  function managerCanSeeTicket(
    ticket
  ) {
    const flow =
      inferFlow(ticket);

    return (
      MANAGED_TEMPLATE_IDS.has(
        flow.id
      ) ||
      MANAGED_QUEUES.has(
        ticket.queue
      )
    );
  }

  function scopedTickets(
    tickets,
    scope
  ) {
    return scope ===
      "enterprise"
      ? tickets.slice()
      : tickets.filter(
          managerCanSeeTicket
        );
  }

  function scopedFeedback(
    items,
    tickets,
    scope
  ) {
    if (
      scope ===
      "enterprise"
    ) {
      return items.slice();
    }

    const ticketMap =
      new Map(
        tickets.map(
          (ticket) => [
            ticket.id,
            ticket
          ]
        )
      );

    return items.filter(
      (item) => {
        if (
          MANAGED_TEMPLATE_IDS.has(
            item.templateId
          )
        ) {
          return true;
        }

        if (
          MANAGED_QUEUES.has(
            item.queue
          )
        ) {
          return true;
        }

        const linkedTicket =
          ticketMap.get(
            item.ticketId
          );

        return linkedTicket
          ? managerCanSeeTicket(
              linkedTicket
            )
          : false;
      }
    );
  }

  function scopedProposals(
    items,
    scope
  ) {
    if (
      scope ===
      "enterprise"
    ) {
      return items.slice();
    }

    return items.filter(
      (item) =>
        MANAGED_TEMPLATE_IDS.has(
          item.templateId
        )
    );
  }

  function analysisFor(ticket) {
    try {
      return Feedback
        .analyzeTicket(
          ticket
        );
    } catch (error) {
      console.warn(
        `Could not analyze ${
          ticket.number ||
          ticket.id
        }.`,
        error
      );

      return {
        gaps: [],

        routingReadiness: {
          label:
            "Routing review needed"
        },

        workReadiness: {
          label:
            "Needs information"
        }
      };
    }
  }

  function intakeGaps(ticket) {
    return (
      analysisFor(
        ticket
      ).gaps || []
    ).filter(
      (gap) =>
        !FLOW_GAP_EXCLUSIONS.has(
          gap
        )
    );
  }

  function routingReady(
    ticket,
    threshold
  ) {
    const confidence =
      Number(
        ticket
          .classificationConfidence ||
        0
      );

    return (
      confidence >= threshold &&
      !/triage/i.test(
        ticket.queue || ""
      )
    );
  }

  function workReady(ticket) {
    if (
      Feedback.isWaiting(
        ticket
      )
    ) {
      return false;
    }

    return (
      intakeGaps(
        ticket
      ).length === 0
    );
  }

  function returnedForInformation(
    ticket
  ) {
    if (
      Feedback.isWaiting(
        ticket
      )
    ) {
      return true;
    }

    return (
      ticket.history || []
    ).some((item) => {
      const text =
        cleanText(
          item.text
        ).toLowerCase();

      return (
        /requested (?:more )?information|requested confirmation|information request|waiting on requester/
          .test(text)
      );
    });
  }

  function clarificationCount(
    ticket
  ) {
    const details =
      ticket.details || {};

    const candidates = [
      details.clarificationCount,

      details.reportingData &&
        details.reportingData
          .clarificationCount,

      details.analysis &&
        details.analysis
          .clarificationCount
    ];

    const configured =
      candidates.find(
        (value) =>
          Number.isFinite(
            Number(value)
          )
      );

    if (
      configured != null
    ) {
      return Number(
        configured
      );
    }

    return (
      ticket.history || []
    ).filter((item) => {
      const text =
        cleanText(
          item.text
        ).toLowerCase();

      return (
        /clarification|requested confirmation|requested (?:more )?information/
          .test(text)
      );
    }).length;
  }

  function slaCompliant(
    ticket
  ) {
    const due =
      new Date(
        ticket.slaDueAt
      ).getTime();

    if (
      !Number.isFinite(due)
    ) {
      return true;
    }

    if (
      Feedback.isClosed(
        ticket
      )
    ) {
      const completed =
        new Date(
          ticket.updatedAt
        ).getTime();

      return (
        !Number.isFinite(
          completed
        ) ||
        completed <= due
      );
    }

    return due > Date.now();
  }

  function flowGroups(
    tickets,
    feedback,
    threshold
  ) {
    const groups =
      new Map();

    tickets.forEach(
      (ticket) => {
        const flow =
          inferFlow(ticket);

        if (
          !groups.has(
            flow.id
          )
        ) {
          groups.set(
            flow.id,
            {
              id:
                flow.id,

              name:
                flow.name,

              queue:
                flow.queue ||
                ticket.queue,

              tickets: [],
              feedback: []
            }
          );
        }

        groups
          .get(flow.id)
          .tickets
          .push(ticket);
      }
    );

    feedback.forEach(
      (item) => {
        let flowId =
          item.templateId;

        if (
          !flowId &&
          item.ticketId
        ) {
          const linked =
            tickets.find(
              (ticket) =>
                ticket.id ===
                item.ticketId
            );

          if (linked) {
            flowId =
              inferFlow(
                linked
              ).id;
          }
        }

        if (
          !flowId &&
          item.queue
        ) {
          const group =
            [
              ...groups.values()
            ].find(
              (candidate) =>
                candidate.queue ===
                item.queue
            );

          flowId =
            group
              ? group.id
              : "";
        }

        if (
          flowId &&
          groups.has(flowId)
        ) {
          groups
            .get(flowId)
            .feedback
            .push(item);
        }
      }
    );

    return [
      ...groups.values()
    ]
      .map((group) => {
        const volume =
          group.tickets.length;

        const confidence =
          average(
            group.tickets.map(
              (ticket) =>
                Number(
                  ticket
                    .classificationConfidence ||
                  0
                )
            ),
            0
          );

        const routing =
          percentage(
            group.tickets.filter(
              (ticket) =>
                routingReady(
                  ticket,
                  threshold
                )
            ).length,
            volume
          );

        const ready =
          percentage(
            group.tickets.filter(
              workReady
            ).length,
            volume
          );

        const returned =
          percentage(
            group.tickets.filter(
              returnedForInformation
            ).length,
            volume
          );

        return {
          ...group,
          volume,
          confidence,
          routing,
          ready,
          returned,

          feedbackCount:
            group.feedback.length,

          clarifications:
            average(
              group.tickets.map(
                clarificationCount
              ),
              1
            )
        };
      })
      .sort(
        (a, b) =>
          b.volume -
            a.volume ||
          b.ready -
            a.ready
      );
  }

  function renderScope(scope) {
    const governance =
      byId(
        "reportGovernanceSection"
      );

    const badge =
      byId(
        "reportingScopeBadge"
      );

    if (
      scope ===
      "enterprise"
    ) {
      if (badge) {
        badge.className =
          "badge badge-purple";
      }

      setText(
        "reportingScopeBadge",
        "Enterprise view"
      );

      setText(
        "reportingScopeTitle",
        "Company-wide intake and workflow intelligence"
      );

      setText(
        "reportingScopeDescription",
        "Megan can review performance across every request flow, queue, feedback signal, and governed improvement."
      );

      if (governance) {
        governance.hidden =
          false;
      }

      return;
    }

    if (badge) {
      badge.className =
        "badge badge-teal";
    }

    setText(
      "reportingScopeBadge",
      "Managed IT view"
    );

    setText(
      "reportingScopeTitle",
      "Owned-flow and managed-queue intelligence"
    );

    setText(
      "reportingScopeDescription",
      "The IT Queue & Category Manager sees intake quality, recognition health, feedback, and performance for owned IT flows."
    );

    if (governance) {
      governance.hidden =
        true;
    }
  }

  function renderFlowChart(
    groups
  ) {
    const container =
      byId(
        "reportFlowPerformanceChart"
      );

    if (!container) {
      return;
    }

    if (!groups.length) {
      container.innerHTML =
        '<div class="empty-state">No request-flow data is available for this view.</div>';

      return;
    }

    container.innerHTML =
      groups
        .slice(0, 8)
        .map(
          (group) => `
            <div class="chart-row">
              <span
                title="${escapeHtml(
                  group.name
                )}"
              >
                ${escapeHtml(
                  group.name
                )}

                <small class="subtext">
                  ${group.volume}
                  request${
                    group.volume === 1
                      ? ""
                      : "s"
                  }
                </small>
              </span>

              <div
                class="chart-track"
                aria-label="${escapeHtml(
                  group.name
                )} work readiness ${
                  group.ready
                }%"
              >
                <div
                  class="chart-fill"
                  style="width:${
                    group.ready
                  }%"
                ></div>
              </div>

              <strong>
                ${group.ready}%
              </strong>
            </div>
          `
        )
        .join("");
  }

  function renderLowConfidence(
    tickets,
    threshold
  ) {
    const list =
      byId(
        "reportLowConfidenceList"
      );

    const low =
      tickets
        .filter(
          (ticket) =>
            Number(
              ticket
                .classificationConfidence ||
              0
            ) < threshold ||
            /triage/i.test(
              ticket.queue || ""
            )
        )
        .sort(
          (a, b) =>
            Number(
              a
                .classificationConfidence ||
              0
            ) -
            Number(
              b
                .classificationConfidence ||
              0
            )
        );

    setText(
      "reportLowConfidenceBadge",
      `${low.length} low confidence`
    );

    if (!list) {
      return;
    }

    list.innerHTML =
      low.length
        ? low
            .slice(0, 6)
            .map(
              (ticket) => `
                <div class="list-row">
                  <div>
                    <div class="list-title">
                      ${escapeHtml(
                        ticket.title
                      )}
                    </div>

                    <div class="list-meta">
                      <span>
                        ${escapeHtml(
                          ticket.number
                        )}
                      </span>

                      <span>
                        ${escapeHtml(
                          ticket.queue
                        )}
                      </span>
                    </div>
                  </div>

                  <span class="badge badge-amber">
                    ${Number(
                      ticket
                        .classificationConfidence ||
                      0
                    )}%
                  </span>
                </div>
              `
            )
            .join("")
        : `
            <div class="notice notice-success">
              <div>
                <strong>
                  No low-confidence requests
                </strong>

                <p>
                  All visible requests meet the
                  configured classification threshold.
                </p>
              </div>
            </div>
          `;
  }

  function recognitionSignals(
    tickets,
    feedback,
    threshold
  ) {
    const signals = [];
    const seen =
      new Set();

    feedback
      .filter(
        (item) =>
          item.issueType ===
          "recognition"
      )
      .forEach((item) => {
        const phrase =
          cleanText(
            item.evidence &&
            item.evidence.phrase
          ) ||
          cleanText(
            item.title
          );

        const key =
          phrase.toLowerCase();

        if (
          !phrase ||
          seen.has(key)
        ) {
          return;
        }

        seen.add(key);

        signals.push({
          phrase,

          detail:
            item.suggestedChange ||
            item.description ||
            "Add or improve a recognition alias.",

          source:
            "Feedback"
        });
      });

    tickets
      .filter(
        (ticket) =>
          Number(
            ticket
              .classificationConfidence ||
            0
          ) < threshold ||
          /triage/i.test(
            ticket.queue || ""
          )
      )
      .forEach((ticket) => {
        const phrase =
          cleanText(
            ticket.description
          ) ||
          cleanText(
            ticket.title
          );

        const key =
          phrase.toLowerCase();

        if (
          !phrase ||
          seen.has(key)
        ) {
          return;
        }

        seen.add(key);

        signals.push({
          phrase,

          detail:
            `Closest route: ${
              ticket.queue
            }. Confidence: ${
              Number(
                ticket
                  .classificationConfidence ||
                0
              )
            }%.`,

          source:
            "Low confidence"
        });
      });

    return signals.slice(
      0,
      6
    );
  }

  function renderRecognition(
    tickets,
    feedback,
    threshold
  ) {
    const container =
      byId(
        "reportRecognitionList"
      );

    if (!container) {
      return;
    }

    const signals =
      recognitionSignals(
        tickets,
        feedback,
        threshold
      );

    container.innerHTML =
      signals.length
        ? signals
            .map(
              (signal) => `
                <div class="list-row">
                  <div>
                    <div class="list-title">
                      “${escapeHtml(
                        signal.phrase
                      )}”
                    </div>

                    <div class="list-meta">
                      <span>
                        ${escapeHtml(
                          signal.detail
                        )}
                      </span>
                    </div>
                  </div>

                  <span class="badge badge-purple">
                    ${escapeHtml(
                      signal.source
                    )}
                  </span>
                </div>
              `
            )
            .join("")
        : `
            <div class="notice notice-success">
              <div>
                <strong>
                  No immediate recognition gap
                </strong>

                <p>
                  Current employee wording is matching
                  configured request flows safely.
                </p>
              </div>
            </div>
          `;
  }

  function gapCounts(
    tickets,
    feedback
  ) {
    const counts =
      new Map();

    tickets.forEach(
      (ticket) => {
        intakeGaps(
          ticket
        ).forEach((gap) => {
          counts.set(
            gap,
            (
              counts.get(gap) ||
              0
            ) + 1
          );
        });
      }
    );

    feedback.forEach(
      (item) => {
        const missing =
          item.evidence &&
          Array.isArray(
            item.evidence
              .missingFields
          )
            ? item.evidence
                .missingFields
            : [];

        missing.forEach(
          (gap) => {
            const label =
              cleanText(gap);

            if (
              !label ||
              FLOW_GAP_EXCLUSIONS.has(
                label
              )
            ) {
              return;
            }

            counts.set(
              label,
              (
                counts.get(label) ||
                0
              ) + 1
            );
          }
        );
      }
    );

    return [
      ...counts.entries()
    ].sort(
      (a, b) =>
        b[1] - a[1]
    );
  }

  function renderGaps(gaps) {
    const container =
      byId(
        "reportMissingInformationChart"
      );

    if (!container) {
      return;
    }

    if (!gaps.length) {
      container.innerHTML = `
        <div class="notice notice-success">
          <div>
            <strong>
              No repeated information gap
            </strong>

            <p>
              Visible requests contain the core
              facts receivers need.
            </p>
          </div>
        </div>
      `;

      return;
    }

    const maximum =
      Math.max(
        ...gaps.map(
          (item) =>
            item[1]
        ),
        1
      );

    container.innerHTML =
      gaps
        .slice(0, 7)
        .map(
          ([gap, count]) => `
            <div class="chart-row">
              <span>
                ${escapeHtml(gap)}
              </span>

              <div
                class="chart-track"
                aria-label="${escapeHtml(
                  gap
                )} ${count} signals"
              >
                <div
                  class="chart-fill"
                  style="width:${
                    Math.round(
                      (
                        count /
                        maximum
                      ) * 100
                    )
                  }%"
                ></div>
              </div>

              <strong>
                ${count}
              </strong>
            </div>
          `
        )
        .join("");
  }

  function renderFeedback(
    feedback
  ) {
    const container =
      byId(
        "reportFeedbackList"
      );

    setText(
      "reportFeedbackCount",
      `${feedback.length} signal${
        feedback.length === 1
          ? ""
          : "s"
      }`
    );

    if (!container) {
      return;
    }

    const sorted =
      feedback
        .slice()
        .sort(
          (a, b) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );

    container.innerHTML =
      sorted.length
        ? sorted
            .slice(0, 6)
            .map(
              (item) => `
                <div class="list-row">
                  <div>
                    <div class="list-title">
                      ${escapeHtml(
                        item.title ||
                        humanize(
                          item.issueType
                        )
                      )}
                    </div>

                    <div class="list-meta">
                      <span>
                        ${escapeHtml(
                          humanize(
                            item.issueType
                          )
                        )}
                      </span>

                      <span>
                        ${escapeHtml(
                          humanize(
                            item.sourceRole
                          )
                        )}
                      </span>

                      <span>
                        ${escapeHtml(
                          formatDate(
                            item.createdAt
                          )
                        )}
                      </span>
                    </div>
                  </div>

                  <span
                    class="badge ${
                      item.status ===
                      "new"
                        ? "badge-amber"
                        : "badge-gray"
                    }"
                  >
                    ${escapeHtml(
                      item.status ||
                      "new"
                    )}
                  </span>
                </div>
              `
            )
            .join("")
        : `
            <div class="empty-state">
              No receiver or manager feedback
              has been submitted yet.
            </div>
          `;
  }

  function renderTopImprovement(
    gaps,
    lowConfidence,
    feedback,
    scope
  ) {
    const panel =
      byId(
        "reportTopImprovement"
      );

    const evidence =
      byId(
        "reportImprovementEvidence"
      );

    if (
      !panel ||
      !evidence
    ) {
      return;
    }

    let title =
      "Maintain the current request-flow design";

    let description =
      "No repeated intake-quality problem is visible in the current prototype records.";

    let action =
      "Continue monitoring feedback and low-confidence requests before changing a flow.";

    let signal =
      "Stable";

    let impact =
      "No repeated pattern";

    let owner =
      scope ===
      "enterprise"
        ? "Megan Delia"
        : "IT Queue & Category Manager";

    if (gaps.length) {
      const [
        gap,
        count
      ] = gaps[0];

      title =
        `Collect ${
          gap.toLowerCase()
        } earlier`;

      description =
        `${count} visible signal${
          count === 1
            ? ""
            : "s"
        } show that ${
          gap.toLowerCase()
        } is missing or unclear.`;

      action =
        `Add or improve a plain-language question that captures ${
          gap.toLowerCase()
        } before submission.`;

      signal = gap;

      impact =
        `${count} affected signal${
          count === 1
            ? ""
            : "s"
        }`;

      owner =
        "IT Queue & Category Manager";
    } else if (
      lowConfidence.length
    ) {
      title =
        "Improve recognition for low-confidence employee wording";

      description =
        `${lowConfidence.length} visible request${
          lowConfidence.length === 1
            ? ""
            : "s"
        } fall below the configured classification threshold.`;

      action =
        "Review the employee phrases and add approved aliases or clearer request guidance.";

      signal =
        "Recognition";

      impact =
        `${lowConfidence.length} low-confidence request${
          lowConfidence.length === 1
            ? ""
            : "s"
        }`;

      owner =
        "IT Queue & Category Manager";
    } else if (
      feedback.length
    ) {
      title =
        feedback[0].title ||
        "Review the newest operational feedback";

      description =
        feedback[0].description ||
        "A resolver or manager submitted an improvement signal.";

      action =
        feedback[0]
          .suggestedChange ||
        "Review the evidence and determine whether the flow should change.";

      signal =
        humanize(
          feedback[0].issueType
        );

      impact =
        "Operational feedback";
    }

    panel.innerHTML = `
      <span aria-hidden="true">
        i
      </span>

      <div>
        <strong>
          ${escapeHtml(title)}
        </strong>

        <p>
          ${escapeHtml(description)}
          ${escapeHtml(action)}
        </p>
      </div>
    `;

    evidence.innerHTML = [
      [
        "Primary signal",
        signal
      ],
      [
        "Observed impact",
        impact
      ],
      [
        "Recommended owner",
        owner
      ]
    ]
      .map(
        ([label, value]) => `
          <div class="detail-cell">
            <small>
              ${escapeHtml(label)}
            </small>

            <strong>
              ${escapeHtml(value)}
            </strong>
          </div>
        `
      )
      .join("");
  }

  function rateBadge(
    value,
    reverse
  ) {
    if (reverse) {
      if (value <= 10) {
        return "badge-green";
      }

      if (value <= 25) {
        return "badge-amber";
      }

      return "badge-red";
    }

    if (value >= 80) {
      return "badge-green";
    }

    if (value >= 60) {
      return "badge-amber";
    }

    return "badge-red";
  }

  function renderFlowTable(
    groups
  ) {
    const body =
      byId(
        "reportFlowTableBody"
      );

    if (!body) {
      return;
    }

    body.innerHTML =
      groups.length
        ? groups
            .map(
              (group) => `
                <tr>
                  <td>
                    <strong>
                      ${escapeHtml(
                        group.name
                      )}
                    </strong>

                    <span class="subtext">
                      ${escapeHtml(
                        group.queue ||
                        "Queue not recorded"
                      )}
                    </span>
                  </td>

                  <td>
                    ${group.volume}
                  </td>

                  <td>
                    <span class="badge ${
                      rateBadge(
                        group.confidence
                      )
                    }">
                      ${group.confidence}%
                    </span>
                  </td>

                  <td>
                    <span class="badge ${
                      rateBadge(
                        group.routing
                      )
                    }">
                      ${group.routing}%
                    </span>
                  </td>

                  <td>
                    <span class="badge ${
                      rateBadge(
                        group.ready
                      )
                    }">
                      ${group.ready}%
                    </span>
                  </td>

                  <td>
                    <span class="badge ${
                      rateBadge(
                        group.returned,
                        true
                      )
                    }">
                      ${group.returned}%
                    </span>
                  </td>

                  <td>
                    ${group.feedbackCount}
                  </td>
                </tr>
              `
            )
            .join("")
        : `
            <tr>
              <td colspan="7">
                <div class="empty-state">
                  No request-flow performance
                  is available for this scope.
                </div>
              </td>
            </tr>
          `;
  }

  function buildImprovementPriorities(
    gaps,
    lowConfidence,
    feedback,
    triageCount,
    returnedCount,
    scope
  ) {
    const priorities = [];

    gaps
      .slice(0, 2)
      .forEach(
        ([gap, count]) => {
          priorities.push({
            opportunity:
              `Capture ${
                gap.toLowerCase()
              } earlier`,

            evidence:
              `${count} visible signal${
                count === 1
                  ? ""
                  : "s"
              }`,

            action:
              `Improve the intake question or required evidence for ${
                gap.toLowerCase()
              }.`,

            owner:
              "IT Queue & Category Manager"
          });
        }
      );

    if (
      lowConfidence.length
    ) {
      priorities.push({
        opportunity:
          "Improve classification recognition",

        evidence:
          `${lowConfidence.length} request${
            lowConfidence.length === 1
              ? ""
              : "s"
          } below threshold`,

        action:
          "Review employee wording and add approved aliases or clearer guidance.",

        owner:
          "IT Queue & Category Manager"
      });
    }

    if (triageCount) {
      priorities.push({
        opportunity:
          "Reduce General Triage volume",

        evidence:
          `${triageCount} request${
            triageCount === 1
              ? ""
              : "s"
          } required human routing`,

        action:
          "Assign the closest category owner and improve recognition or routing guidance.",

        owner:
          "Megan Delia"
      });
    }

    if (returnedCount) {
      priorities.push({
        opportunity:
          "Reduce requests returned for information",

        evidence:
          `${returnedCount} request${
            returnedCount === 1
              ? ""
              : "s"
          } required follow-up`,

        action:
          "Compare the missing facts with work-readiness questions and receiver feedback.",

        owner:
          "Queue Manager + Category Manager"
      });
    }

    if (feedback.length) {
      const typeCounts =
        new Map();

      feedback.forEach(
        (item) => {
          const label =
            humanize(
              item.issueType ||
              "other"
            );

          typeCounts.set(
            label,
            (
              typeCounts.get(
                label
              ) || 0
            ) + 1
          );
        }
      );

      const top =
        [
          ...typeCounts.entries()
        ].sort(
          (a, b) =>
            b[1] - a[1]
        )[0];

      if (top) {
        priorities.push({
          opportunity:
            `Address ${
              top[0].toLowerCase()
            } feedback`,

          evidence:
            `${top[1]} feedback signal${
              top[1] === 1
                ? ""
                : "s"
            }`,

          action:
            "Review linked evidence and convert the strongest signal into a flow proposal.",

          owner:
            scope ===
            "enterprise"
              ? "Megan Delia / Category Manager"
              : "IT Queue & Category Manager"
        });
      }
    }

    return priorities.slice(
      0,
      5
    );
  }

  function renderImprovementTable(
    priorities
  ) {
    const body =
      byId(
        "reportImprovementTableBody"
      );

    if (!body) {
      return;
    }

    body.innerHTML =
      priorities.length
        ? priorities
            .map(
              (item, index) => `
                <tr>
                  <td>
                    <span
                      class="badge ${
                        index === 0
                          ? "badge-red"
                          : index === 1
                            ? "badge-amber"
                            : "badge-blue"
                      }"
                    >
                      ${index + 1}
                    </span>
                  </td>

                  <td>
                    <strong>
                      ${escapeHtml(
                        item.opportunity
                      )}
                    </strong>
                  </td>

                  <td>
                    ${escapeHtml(
                      item.evidence
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      item.action
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      item.owner
                    )}
                  </td>
                </tr>
              `
            )
            .join("")
        : `
            <tr>
              <td colspan="5">
                <div class="empty-state">
                  No urgent improvement
                  priority is visible.
                </div>
              </td>
            </tr>
          `;
  }

  function renderFreightOutcomes(
    freightOpportunities,
    settings
  ) {
    const opportunities =
      freightOpportunities || [];

    const identified =
      opportunities.reduce(
        (total, item) =>
          total +
          Number(
            item.internalSavings || 0
          ),
        0
      );

    const captured =
      opportunities
        .filter(
          (item) =>
            item.decision === "hold"
        )
        .reduce(
          (total, item) =>
            total +
            Number(
              item.internalSavings || 0
            ),
          0
        );

    const guardrailBlocked =
      opportunities.filter(
        (item) =>
          (item.guardrails || []).some(
            (guardrail) =>
              guardrail.result === "fail"
          )
      ).length;

    setText(
      "reportFreightOpportunities",
      opportunities.length
    );

    setText(
      "reportFreightIdentified",
      UI.formatMoney(identified, 0)
    );

    setText(
      "reportFreightCaptured",
      UI.formatMoney(captured, 0)
    );

    setText(
      "reportFreightGuardrailBlocked",
      guardrailBlocked
    );

    const target =
      Number(
        settings.freightSavingsTarget || 0
      );

    const ytd =
      Number(
        settings.verifiedSavingsYtd || 0
      );

    setText(
      "reportFreightYtd",
      `${UI.formatMoney(ytd, 0)} of ${UI.formatMoney(target, 0)}`
    );

    setWidth(
      "reportFreightYtdProgress",
      target > 0
        ? percentage(ytd, target)
        : 0
    );

    const body =
      byId("reportFreightDecisionBody");

    if (!body) {
      return;
    }

    const decided =
      opportunities.filter(
        (item) => item.decision
      );

    const decisionLabels = {
      hold: "Time-boxed hold approved",
      release: "Released unchanged",
      sales: "Sent to Sales for review"
    };

    body.innerHTML =
      decided.length
        ? decided
            .map(
              (item) => `
                <tr>
                  <td>
                    <strong>${escapeHtml(item.customerName)}</strong>
                    <div class="muted small">${escapeHtml(item.customerNumber)} &middot; ${escapeHtml(item.orderNumber)}</div>
                  </td>

                  <td>${escapeHtml(decisionLabels[item.decision] || item.decision)}</td>

                  <td>${UI.formatMoney(Number(item.internalSavings || 0), 0)}</td>

                  <td>${escapeHtml(item.decisionBy || "Not recorded")}</td>

                  <td>${escapeHtml(UI.formatDate(item.decisionAt))}</td>
                </tr>
              `
            )
            .join("")
        : `
            <tr>
              <td colspan="5">
                <div class="empty-state">
                  No freight decisions have been recorded yet.
                </div>
              </td>
            </tr>
          `;
  }

  function renderGovernance(
    tickets,
    feedback,
    proposals,
    scope
  ) {
    if (
      scope !==
      "enterprise"
    ) {
      return;
    }

    const pendingProposals =
      proposals.filter(
        (item) =>
          [
            "draft",
            "pending-approval",
            "approved"
          ].includes(
            item.status
          )
      );

    const governedPending =
      proposals.filter(
        (item) =>
          item.riskLevel ===
            "governed" &&
          item.status ===
            "pending-approval"
      );

    const newFeedback =
      feedback.filter(
        (item) =>
          item.status ===
          "new"
      );

    const pendingApprovals =
      tickets.filter(
        (ticket) =>
          ticket.status ===
          "Awaiting approval"
      );

    setText(
      "reportPendingProposals",
      pendingProposals.length
    );

    setText(
      "reportNewFeedback",
      newFeedback.length
    );

    setText(
      "reportPendingApprovals",
      pendingApprovals.length
    );

    setText(
      "reportGovernanceExceptions",
      governedPending.length
    );

    const list =
      byId(
        "reportGovernanceList"
      );

    if (!list) {
      return;
    }

    const rows = [];

    pendingProposals
      .slice(0, 5)
      .forEach((proposal) => {
        rows.push(`
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
                      proposal.changeType ||
                      "flow change"
                    )
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    proposal.proposedBy ||
                    "Unknown proposer"
                  )}
                </span>
              </div>
            </div>

            <span
              class="badge ${
                proposal.status ===
                "pending-approval"
                  ? "badge-amber"
                  : "badge-gray"
              }"
            >
              ${escapeHtml(
                proposal.status
              )}
            </span>
          </div>
        `);
      });

    pendingApprovals
      .slice(0, 5)
      .forEach((ticket) => {
        rows.push(`
          <div class="list-row">
            <div>
              <div class="list-title">
                ${escapeHtml(
                  ticket.number
                )}
                -
                ${escapeHtml(
                  ticket.title
                )}
              </div>

              <div class="list-meta">
                <span>
                  ${escapeHtml(
                    ticket.queue
                  )}
                </span>

                <span>
                  ${escapeHtml(
                    ticket.requester
                  )}
                </span>
              </div>
            </div>

            <span class="badge badge-amber">
              Awaiting approval
            </span>
          </div>
        `);
      });

    list.innerHTML =
      rows.length
        ? rows.join("")
        : `
            <div class="notice notice-success">
              <div>
                <strong>
                  No pending governance action
                </strong>

                <p>
                  No flow proposal or ticket approval
                  currently requires an enterprise decision.
                </p>
              </div>
            </div>
          `;
  }

  function render() {
    const state =
      Store.getState();

    const scope =
      currentScope();

    const threshold =
      Number(
        state.settings
          .ticketClassificationThreshold ||
        70
      );

    const tickets =
      scopedTickets(
        state.tickets || [],
        scope
      );

    const feedback =
      scopedFeedback(
        Feedback.list(),
        state.tickets || [],
        scope
      );

    const proposals =
      scopedProposals(
        readStoredArray(
          PROPOSAL_KEY
        ),
        scope
      );

    const total =
      tickets.length;

    const readyCount =
      tickets.filter(
        workReady
      ).length;

    const routingReadyCount =
      tickets.filter(
        (ticket) =>
          routingReady(
            ticket,
            threshold
          )
      ).length;

    const returnedCount =
      tickets.filter(
        returnedForInformation
      ).length;

    const triageCount =
      tickets.filter(
        (ticket) =>
          /triage/i.test(
            ticket.queue || ""
          ) ||
          ticket.status ===
            "Triage"
      ).length;

    const completedCount =
      tickets.filter(
        Feedback.isClosed
      ).length;

    const slaCount =
      tickets.filter(
        slaCompliant
      ).length;

    const averageConfidence =
      average(
        tickets.map(
          (ticket) =>
            Number(
              ticket
                .classificationConfidence ||
              0
            )
        ),
        0
      );

    const averageClarifications =
      average(
        tickets.map(
          clarificationCount
        ),
        1
      );

    const workReadyRate =
      percentage(
        readyCount,
        total
      );

    const routingReadyRate =
      percentage(
        routingReadyCount,
        total
      );

    const returnedRate =
      percentage(
        returnedCount,
        total
      );

    const triageRate =
      percentage(
        triageCount,
        total
      );

    const completionRate =
      percentage(
        completedCount,
        total
      );

    const slaRate =
      percentage(
        slaCount,
        total
      );

    const activeP1 =
      tickets.filter(
        (ticket) =>
          !Feedback.isClosed(
            ticket
          ) &&
          /^P1/i.test(
            ticket.priority || ""
          )
      ).length;

    const lowConfidence =
      tickets.filter(
        (ticket) =>
          Number(
            ticket
              .classificationConfidence ||
            0
          ) < threshold ||
          /triage/i.test(
            ticket.queue || ""
          )
      );

    const groups =
      flowGroups(
        tickets,
        feedback,
        threshold
      );

    const gaps =
      gapCounts(
        tickets,
        feedback
      );

    renderScope(scope);

    setText(
      "reportTicketVolume",
      total
    );

    setText(
      "reportWorkReadyRate",
      `${workReadyRate}%`
    );

    setText(
      "reportWorkReadyMeta",
      `${readyCount} of ${total} visible requests ready without follow-up`
    );

    setText(
      "reportAverageConfidence",
      `${averageConfidence}%`
    );

    setText(
      "reportConfidenceMeta",
      `Safe-routing threshold: ${threshold}%`
    );

    setText(
      "reportAverageClarifications",
      averageClarifications
        .toFixed(1)
    );

    setText(
      "reportClarificationMeta",
      "Recorded clarification or information-request events"
    );

    setText(
      "reportReturnedRate",
      `${returnedRate}%`
    );

    setText(
      "reportReturnedMeta",
      `${returnedCount} request${
        returnedCount === 1
          ? ""
          : "s"
      } required employee follow-up`
    );

    setText(
      "reportTriageRate",
      `${triageRate}%`
    );

    setText(
      "reportTriageMeta",
      `${triageCount} request${
        triageCount === 1
          ? ""
          : "s"
      } required human routing`
    );

    setText(
      "resolvedCount",
      completedCount
    );

    setText(
      "reportRoutingReadyRate",
      `${routingReadyRate}%`
    );

    setWidth(
      "reportRoutingReadyProgress",
      routingReadyRate
    );

    setText(
      "reportWorkReadyDetail",
      `${workReadyRate}%`
    );

    setWidth(
      "reportWorkReadyProgress",
      workReadyRate
    );

    setText(
      "reportSlaCompliance",
      `${slaRate}%`
    );

    setWidth(
      "reportSlaProgress",
      slaRate
    );

    setText(
      "reportCompletionRate",
      `${completionRate}%`
    );

    setWidth(
      "reportCompletionProgress",
      completionRate
    );

    renderFlowChart(
      groups
    );

    renderLowConfidence(
      tickets,
      threshold
    );

    renderRecognition(
      tickets,
      feedback,
      threshold
    );

    renderGaps(
      gaps
    );

    renderFeedback(
      feedback
    );

    /*
     * Prototype estimate:
     * each work-ready request avoids one
     * receiver follow-up averaging eight minutes.
     */
    const followupsAvoided =
      readyCount;

    const minutesAvoided =
      followupsAvoided * 8;

    setText(
      "reportFollowupsAvoided",
      followupsAvoided
    );

    setWidth(
      "reportFollowupsAvoidedProgress",
      workReadyRate
    );

    setText(
      "reportMinutesAvoided",
      minutesAvoided
    );

    setWidth(
      "reportMinutesAvoidedProgress",
      workReadyRate
    );

    setText(
      "reportP1Open",
      activeP1
    );

    setWidth(
      "reportP1Progress",
      percentage(
        activeP1,
        total
      )
    );

    setText(
      "reportPlatformCost",
      UI.formatMoney(
        Number(
          state.settings
            .annualServiceNowCost ||
          0
        ),
        0
      )
    );

    setWidth(
      "reportPlatformCostProgress",
      100
    );

    renderTopImprovement(
      gaps,
      lowConfidence,
      feedback,
      scope
    );

    renderFreightOutcomes(
      state.freightOpportunities,
      state.settings
    );

    renderGovernance(
      tickets,
      feedback,
      proposals,
      scope
    );

    renderFlowTable(
      groups
    );

    const priorities =
      buildImprovementPriorities(
        gaps,
        lowConfidence,
        feedback,
        triageCount,
        returnedCount,
        scope
      );

    renderImprovementTable(
      priorities
    );

    setText(
      "reportGeneratedAt",
      "Updated " +
      new Intl.DateTimeFormat(
        "en-US",
        {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }
      ).format(
        new Date()
      )
    );
  }

  window.addEventListener(
    "masterflow:state",
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