(function () {
  "use strict";

  const Store =
    window.MasterFlowStore;

  const UI =
    window.MasterFlowUI;

  if (
    !Store ||
    !UI ||
    !UI.layoutReady
  ) {
    return;
  }

  const tbody =
    document.getElementById(
      "myTicketsBody"
    );

  const searchInput =
    document.getElementById(
      "ticketSearch"
    );

  const statusFilter =
    document.getElementById(
      "ticketStatusFilter"
    );

  const ticketDialog =
    document.getElementById(
      "requesterTicketDialog"
    );

  if (
    !tbody ||
    !searchInput ||
    !statusFilter ||
    !ticketDialog
  ) {
    console.error(
      "My Requests could not start because required page elements are missing."
    );

    return;
  }

  const CLOSED_STATUSES =
    new Set([
      "Resolved",
      "Closed",
      "Closed — No Action",
      "Cancelled",
      "Rejected"
    ]);

  let activeTicketId = "";

  function clone(value) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  function cleanText(value) {
    return String(
      value == null
        ? ""
        : value
    ).trim();
  }

  function isClosed(ticket) {
    return CLOSED_STATUSES.has(
      cleanText(
        ticket &&
        ticket.status
      )
    );
  }

  function writeState(state) {
    window.localStorage.setItem(
      Store.STORAGE_KEY,
      JSON.stringify(state)
    );

    window.dispatchEvent(
      new CustomEvent(
        "masterflow:state",
        {
          detail: clone(state)
        }
      )
    );
  }

  function communicationMeta(ticket) {
    const details =
      ticket &&
      ticket.details
        ? ticket.details
        : {};

    return (
      details.communication &&
      typeof details.communication ===
        "object"
    )
      ? details.communication
      : {};
  }

  function requesterVisibleHistory(
    ticket
  ) {
    return (
      ticket.history || []
    )
      .filter((item) => {
        if (
          item.type !==
          "comment"
        ) {
          return true;
        }

        return (
          item.visibility ===
          "requester"
        );
      })
      .sort(
        (a, b) =>
          new Date(
            a.at
          ).getTime() -
          new Date(
            b.at
          ).getTime()
      );
  }

  function unreadMessageCount(
    ticket
  ) {
    const communication =
      communicationMeta(
        ticket
      );

    const lastRead =
      new Date(
        communication
          .lastRequesterReadAt ||
        ""
      ).getTime();

    return requesterVisibleHistory(
      ticket
    ).filter((item) => {
      const created =
        new Date(
          item.at
        ).getTime();

      if (
        !Number.isFinite(
          created
        )
      ) {
        return false;
      }

      if (
        item.type ===
        "comment"
      ) {
        return (
          item.author !==
            Store.CURRENT_USER.name &&
          (
            !Number.isFinite(
              lastRead
            ) ||
            created > lastRead
          )
        );
      }

      if (
        !Number.isFinite(
          lastRead
        ) ||
        created <= lastRead
      ) {
        return false;
      }

      return /resolved|closed|reopened|approved|rejected|waiting on requester|information requested|status changed/i.test(
        cleanText(
          item.text
        )
      );
    }).length;
  }

  let currentView = "mine";

  function requesterTickets() {
    return Store
      .getState()
      .tickets
      .filter(
        (ticket) =>
          ticket.requester ===
          Store.CURRENT_USER.name
      )
      .sort(
        (a, b) =>
          new Date(
            b.updatedAt
          ).getTime() -
          new Date(
            a.updatedAt
          ).getTime()
      );
  }

  /*
   * Team visibility: everyone on the same department/team can see
   * requests already submitted by teammates. This supports duplicate
   * prevention, shared awareness, and status follow-up. Prototype
   * scope is the requester's department rather than company-wide.
   */
  function teamTickets() {
    const dept = Store.CURRENT_USER.department || "___none___";
    return Store
      .getState()
      .tickets
      .filter((ticket) => (ticket.department || "") === dept)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
      );
  }

  function activeTickets() {
    return currentView === "team"
      ? teamTickets()
      : requesterTickets();
  }

  function userContribution(ticket) {
    const me = Store.CURRENT_USER.name;
    if (ticket.requester === me) return "own";
    const contributed = (ticket.history || []).some(
      (item) => (item.author || "") === me
    );
    return contributed ? "contributed" : "";
  }

  function renderKpis(tickets) {
    const open =
      tickets.filter(
        (ticket) =>
          !isClosed(ticket)
      );

    const waiting =
      tickets.filter(
        (ticket) =>
          ticket.status ===
          "Waiting on requester"
      );

    const closed =
      tickets.filter(
        isClosed
      );

    const unread =
      tickets.reduce(
        (total, ticket) =>
          total +
          unreadMessageCount(
            ticket
          ),
        0
      );

    document.getElementById(
      "openTicketCount"
    ).textContent =
      String(open.length);

    document.getElementById(
      "waitingTicketCount"
    ).textContent =
      String(waiting.length);

    document.getElementById(
      "closedTicketCount"
    ).textContent =
      String(closed.length);

    document.getElementById(
      "unreadMessageCount"
    ).textContent =
      String(unread);

    document.getElementById(
      "waitingTicketMeta"
    ).textContent =
      waiting.length > 0
        ? waiting.length === 1
          ? (
              `${waiting[0].title} ` +
              "needs your response"
            )
          : (
              `${waiting.length} requests ` +
              "need your response"
            )
        : "Nothing is waiting on you";

    document.getElementById(
      "unreadMessageMeta"
    ).textContent =
      unread > 0
        ? (
            `${unread} new message${
              unread === 1
                ? ""
                : "s"
            } from receiving teams`
          )
        : "No new receiver messages";
  }

  function render() {
    renderKpis(requesterTickets());

    const heading =
      document.getElementById("requestsHeading");
    const subhead =
      document.getElementById("requestsSubhead");
    if (heading) {
      heading.textContent = currentView === "team"
        ? "My team's requests"
        : "My recent requests";
    }
    if (subhead) {
      subhead.textContent = currentView === "team"
        ? "See what your team has already reported so you can add context or an update instead of opening a duplicate."
        : "Open a request to review its shared timeline and reply without creating a duplicate ticket.";
    }

    const all =
      activeTickets();

    const query =
      searchInput.value
        .trim()
        .toLowerCase();

    const status =
      statusFilter.value;

    const filtered =
      all.filter((ticket) => {
        const visibleMessages =
          requesterVisibleHistory(
            ticket
          )
            .map(
              (item) =>
                `${
                  item.author || ""
                } ${
                  item.text || ""
                }`
            )
            .join(" ");

        const haystack = [
          ticket.number,
          ticket.title,
          ticket.category,
          ticket.queue,
          ticket.status,
          ticket.location,
          visibleMessages
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query ||
          haystack.includes(
            query
          );

        const closed =
          isClosed(ticket);

        const matchesStatus =
          status === "all" ||
          (
            status === "open" &&
            !closed
          ) ||
          (
            status === "closed" &&
            closed
          );

        return (
          matchesSearch &&
          matchesStatus
        );
      });

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              No requests match the current filters.
            </div>
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      filtered
        .map((ticket) => {
          const unread =
            unreadMessageCount(
              ticket
            );

          return `
            <tr>
              <td>
                <button
                  class="link-button"
                  type="button"
                  data-ticket-id="${UI.escapeHtml(
                    ticket.id
                  )}"
                >
                  ${UI.escapeHtml(
                    ticket.number
                  )}
                  -
                  ${UI.escapeHtml(
                    ticket.title
                  )}
                </button>

                ${
                  unread
                    ? `
                        <span
                          class="
                            badge
                            badge-blue
                            requester-unread-badge
                          "
                        >
                          ${unread} new
                        </span>
                      `
                    : ""
                }

                <span class="subtext">
                  ${UI.escapeHtml(
                    ticket.location ||
                    "Location not provided"
                  )}${
                    currentView === "team"
                      ? " · " +
                        UI.escapeHtml(ticket.requester || "") +
                        (userContribution(ticket) === "own"
                          ? ' · <span class="badge badge-teal">You</span>'
                          : userContribution(ticket) === "contributed"
                            ? ' · <span class="badge badge-blue">You contributed</span>'
                            : "")
                      : ""
                  }
                </span>
              </td>

              <td>
                ${UI.escapeHtml(
                  ticket.category
                )}
              </td>

              <td>
                <span
                  class="badge ${UI.priorityClass(
                    ticket.priority
                  )}"
                >
                  ${UI.escapeHtml(
                    ticket.priority
                  )}
                </span>
              </td>

              <td>
                <span
                  class="badge ${UI.statusClass(
                    ticket.status
                  )}"
                >
                  ${UI.escapeHtml(
                    ticket.status
                  )}
                </span>
              </td>

              <td>
                ${UI.escapeHtml(
                  ticket.queue
                )}
              </td>

              <td>
                ${UI.escapeHtml(
                  UI.formatDate(
                    ticket.updatedAt
                  )
                )}
              </td>
            </tr>
          `;
        })
        .join("");
  }

  function attachmentMarkup(
    attachments
  ) {
    if (
      !Array.isArray(
        attachments
      ) ||
      !attachments.length
    ) {
      return "";
    }

    return `
      <div class="requester-attachment-list">
        ${attachments
          .map((attachment) => {
            const name =
              typeof attachment ===
              "string"
                ? attachment
                : attachment.name;

            return `
              <span class="requester-attachment">
                ${UI.escapeHtml(
                  name ||
                  "Attachment"
                )}
              </span>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderTimeline(ticket) {
    const timeline =
      document.getElementById(
        "requesterTimeline"
      );

    const history =
      requesterVisibleHistory(
        ticket
      );

    timeline.innerHTML =
      history.length
        ? history
            .map((item) => {
              if (
                item.type ===
                "comment"
              ) {
                const requesterMessage =
                  item.author ===
                  Store.CURRENT_USER.name;

                return `
                  <article
                    class="
                      requester-message
                      ${
                        requesterMessage
                          ? "is-requester"
                          : "is-receiver"
                      }
                    "
                  >
                    <div class="requester-message-header">
                      <strong>
                        ${
                          requesterMessage
                            ? "You"
                            : UI.escapeHtml(
                                item.author ||
                                "Receiving team"
                              )
                        }
                      </strong>

                      <small>
                        ${UI.escapeHtml(
                          UI.formatDate(
                            item.at
                          )
                        )}
                      </small>
                    </div>

                    <p>
                      ${UI.escapeHtml(
                        item.text ||
                        ""
                      )}
                    </p>

                    ${attachmentMarkup(
                      item.attachments
                    )}
                  </article>
                `;
              }

              return `
                <article
                  class="
                    requester-message
                    is-system
                  "
                >
                  <div class="requester-message-header">
                    <strong>
                      Request update
                    </strong>

                    <small>
                      ${UI.escapeHtml(
                        UI.formatDate(
                          item.at
                        )
                      )}
                    </small>
                  </div>

                  <p>
                    ${UI.escapeHtml(
                      item.text ||
                      "Status updated."
                    )}
                  </p>
                </article>
              `;
            })
            .join("")
        : `
            <div class="empty-state">
              No conversation activity has been recorded.
            </div>
          `;

    timeline.scrollTop =
      timeline.scrollHeight;
  }

  function markRequesterRead(
    ticketId
  ) {
    const state =
      Store.getState();

    const ticket =
      state.tickets.find(
        (item) =>
          item.id ===
          ticketId
      );

    if (
      !ticket ||
      unreadMessageCount(
        ticket
      ) === 0
    ) {
      return ticket
        ? clone(ticket)
        : null;
    }

    const now =
      new Date()
        .toISOString();

    ticket.details = {
      ...(ticket.details || {}),

      communication: {
        ...communicationMeta(
          ticket
        ),

        lastRequesterReadAt:
          now
      }
    };

    writeState(state);

    return clone(ticket);
  }

  function selectedAttachments() {
    const input =
      document.getElementById(
        "requesterReplyAttachments"
      );

    return Array
      .from(
        input.files || []
      )
      .slice(0, 5)
      .map((file) => ({
        name:
          file.name,

        size:
          file.size,

        type:
          file.type ||
          "application/octet-stream"
      }));
  }

  function addRequesterReply(
    ticketId,
    text,
    attachments
  ) {
    const state =
      Store.getState();

    const ticket =
      state.tickets.find(
        (item) =>
          item.id ===
          ticketId
      );

    if (!ticket) {
      return {
        ok: false,
        message:
          "Request not found."
      };
    }

    if (isClosed(ticket)) {
      return {
        ok: false,

        message:
          "This request is complete and cannot accept another reply."
      };
    }

    const cleanReply =
      cleanText(text);

    if (
      !cleanReply &&
      !attachments.length
    ) {
      return {
        ok: false,

        message:
          "Add a message or supporting file before sending."
      };
    }

    const now =
      new Date()
        .toISOString();

    const previousStatus =
      ticket.status;

    ticket.history =
      Array.isArray(
        ticket.history
      )
        ? ticket.history
        : [];

    ticket.history.push({
      id:
        `comment-${Date.now()}-` +
        Math.random()
          .toString(36)
          .slice(2, 7),

      type:
        "comment",

      author:
        Store.CURRENT_USER.name,

      visibility:
        "requester",

      text:
        cleanReply ||
        "Supporting files added.",

      attachments:
        clone(attachments),

      at:
        now,

      editableUntil:
        null,

      editedAt:
        null,

      revisions:
        []
    });

    if (
      previousStatus ===
      "Waiting on requester"
    ) {
      const nextStatus =
        ticket.assignee &&
        ticket.assignee !==
          "Unassigned"
          ? "In progress"
          : "New";

      ticket.status =
        nextStatus;

      ticket.history.push({
        at:
          now,

        type:
          "system",

        text:
          "Requester responded. " +
          "Status changed from " +
          "Waiting on requester to " +
          `${nextStatus}.`
      });
    }

    ticket.details = {
      ...(ticket.details || {}),

      communication: {
        ...communicationMeta(
          ticket
        ),

        lastRequesterReplyAt:
          now,

        lastRequesterReadAt:
          now,

        requesterReplyPending:
          true
      }
    };

    ticket.updatedAt =
      now;

    writeState(state);

    return {
      ok: true,
      ticket: clone(ticket)
    };
  }

  function renderDialog(ticket) {
    activeTicketId =
      ticket.id;

    document.getElementById(
      "requesterTicketTitle"
    ).textContent =
      `${ticket.number} - ${ticket.title}`;

    document.getElementById(
      "requesterTicketSubtitle"
    ).textContent =
      `${ticket.category} · Created ${UI.formatDate(
        ticket.createdAt
      )}`;

    const statusBadge =
      document.getElementById(
        "requesterStatusBadge"
      );

    statusBadge.textContent =
      ticket.status;

    statusBadge.className =
      `badge ${UI.statusClass(
        ticket.status
      )}`;

    document.getElementById(
      "requesterQueueBadge"
    ).textContent =
      ticket.queue;

    const priorityBadge =
      document.getElementById(
        "requesterPriorityBadge"
      );

    priorityBadge.textContent =
      ticket.priority;

    priorityBadge.className =
      `badge ${UI.priorityClass(
        ticket.priority
      )}`;

    document.getElementById(
      "requesterTicketOwner"
    ).textContent =
      ticket.assignee ||
      "Unassigned";

    document.getElementById(
      "requesterTicketLocation"
    ).textContent =
      ticket.location ||
      "Not provided";

    document.getElementById(
      "requesterTicketUpdated"
    ).textContent =
      UI.formatDate(
        ticket.updatedAt
      );

    document.getElementById(
      "requesterTicketDescription"
    ).textContent =
      ticket.description ||
      "No request description was recorded.";

    const waiting =
      ticket.status ===
      "Waiting on requester";

    const closed =
      isClosed(ticket);

    document.getElementById(
      "requesterResponseNotice"
    ).hidden =
      !waiting;

    document.getElementById(
      "requesterClosedNotice"
    ).hidden =
      !closed;

    document.getElementById(
      "requesterReplySection"
    ).hidden =
      closed;

    document.getElementById(
      "requesterReplyTitle"
    ).textContent =
      waiting
        ? "Send the requested information"
        : "Add a message";

    document.getElementById(
      "requesterReplyHint"
    ).textContent =
      waiting
        ? (
            "Your reply will return this request " +
            "to the receiving team's active work."
          )
        : (
            "Your message will be added to this request " +
            "and visible to the receiving team."
          );

    document.getElementById(
      "requesterReplySubmit"
    ).textContent =
      waiting
        ? "Send response"
        : "Add message";

    renderTimeline(ticket);

    if (!ticketDialog.open) {
      ticketDialog.showModal();
    }
  }

  function openTicket(ticketId) {
    const ticket =
      Store.getTicket(
        ticketId
      );

    if (!ticket) {
      return;
    }

    const readTicket =
      markRequesterRead(
        ticketId
      ) || ticket;

    renderDialog(
      readTicket
    );
  }

  function refreshOpenTicket() {
    if (!activeTicketId) {
      return;
    }

    const ticket =
      Store.getTicket(
        activeTicketId
      );

    if (ticket) {
      renderDialog(ticket);
    }
  }

  tbody.addEventListener(
    "click",
    (event) => {
      const button =
        event.target.closest(
          "[data-ticket-id]"
        );

      if (button) {
        openTicket(
          button.dataset.ticketId
        );
      }
    }
  );

  document
    .querySelectorAll(
      "[data-close-requester-ticket]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          ticketDialog.close()
      );
    });

  ticketDialog.addEventListener(
    "close",
    () => {
      activeTicketId = "";
    }
  );

  document
    .getElementById(
      "requesterReplyAttachments"
    )
    .addEventListener(
      "change",
      (event) => {
        const files =
          Array.from(
            event.target.files ||
            []
          ).slice(0, 5);

        document.getElementById(
          "requesterAttachmentSummary"
        ).textContent =
          files.length
            ? (
                `${files.length} file${
                  files.length === 1
                    ? ""
                    : "s"
                }: ` +
                files
                  .map(
                    (file) =>
                      file.name
                  )
                  .join(", ")
              )
            : (
                "Prototype stores file names " +
                "in the shared timeline."
              );
      }
    );

  document
    .getElementById(
      "requesterReplyForm"
    )
    .addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        if (!activeTicketId) {
          return;
        }

        const replyInput =
          document.getElementById(
            "requesterReplyText"
          );

        const attachmentInput =
          document.getElementById(
            "requesterReplyAttachments"
          );

        const attachments =
          selectedAttachments();

        const result =
          addRequesterReply(
            activeTicketId,
            replyInput.value,
            attachments
          );

        if (!result.ok) {
          UI.showToast(
            result.message
          );

          return;
        }

        replyInput.value = "";
        attachmentInput.value = "";

        document.getElementById(
          "requesterAttachmentSummary"
        ).textContent =
          "Prototype stores file names in the shared timeline.";

        UI.showToast(
          (
            result.ticket.status ===
              "In progress" ||
            result.ticket.status ===
              "New"
          )
            ? (
                "Response sent. " +
                "The request is active again."
              )
            : (
                "Message added to the request."
              )
        );

        renderDialog(
          result.ticket
        );
      }
    );

  searchInput.addEventListener(
    "input",
    render
  );

  statusFilter.addEventListener(
    "change",
    render
  );

  document.querySelectorAll(".view-seg-btn").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view === "team" ? "team" : "mine";
      document.querySelectorAll(".view-seg-btn").forEach((btn) => {
        const active = btn === button;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
      searchInput.value = "";
      searchInput.placeholder = currentView === "team"
        ? "Search team requests"
        : "Search my requests";
      render();
    });
  });

  window.addEventListener(
    "masterflow:state",
    () => {
      render();
      refreshOpenTicket();
    }
  );

  window.addEventListener(
    "storage",
    () => {
      render();
      refreshOpenTicket();
    }
  );

  const focusTicketId =
    window.sessionStorage.getItem("masterflowFocusTicket");
  if (focusTicketId) {
    window.sessionStorage.removeItem("masterflowFocusTicket");
    const focusTicket = Store.getState().tickets.find(
      (item) => item.id === focusTicketId
    );
    if (
      focusTicket &&
      focusTicket.requester !== Store.CURRENT_USER.name
    ) {
      currentView = "team";
      document.querySelectorAll(".view-seg-btn").forEach((btn) => {
        const active = btn.dataset.view === "team";
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
    }
    if (focusTicket) {
      searchInput.value = focusTicket.number;
    }
  }

  render();
})();
