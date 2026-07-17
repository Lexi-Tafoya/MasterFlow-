(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  if (!Store) throw new Error("MasterFlowStore must load before layout.js");

  const pages = {
    home: {
      href: "index.html",
      label: "Home",
      icon: "⌂",
      group: "For me",
      roles: ["requester", "receiver", "admin"],
      title: "Home",
      subtitle: "Create a request in your own words."
    },
    "my-tickets": {
      href: "my-tickets.html",
      label: "My requests",
      icon: "✓",
      group: "For me",
      roles: ["requester", "receiver", "admin"],
      title: "My requests",
      subtitle: "Track updates and continue request conversations."
    },
    "help-articles": {
      href: "help-articles.html",
      label: "Help articles",
      icon: "?",
      group: "For me",
      roles: ["requester", "receiver", "admin"],
      title: "Help articles",
      subtitle: "Search practical self-service guidance."
    },
    "smart-request": {
      href: "smart-request.html",
      label: "Smart request",
      icon: "✦",
      group: null,
      roles: ["requester", "receiver", "admin"],
      title: "Smart Request Builder",
      subtitle: "Review the existing request template and fill only what is missing."
    },
    "request-submitted": {
      href: "request-submitted.html",
      label: "Request submitted",
      icon: "✓",
      group: null,
      roles: ["requester", "receiver", "admin"],
      title: "Request submitted",
      subtitle: "Your request was created and routed."
    },
"assigned-work": {
  href: "assigned-work.html",
  label: "Work Center",
  icon: "◆",
  group: "Operations",
  roles: ["receiver"],
  title: "Work Center",
  subtitle: "Prioritized personal and team ticket work in one place."
},
"ticket-queues": {
  href: "ticket-queues.html",
  label: "Queue Manager",
  icon: "☷",
  group: null,
  roles: ["receiver"],
  title: "Queue Manager",
  subtitle: "Pending approvals, queue health, coverage, and improvement recommendations."
},
    reporting: {
      href: "reporting.html",
      label: "Reporting",
      icon: "▥",
      group: "Operations",
      roles: ["receiver", "admin"],
      title: "Reporting",
      subtitle: "Measure service performance, request quality, and SLA outcomes."
    },
    "freight-optimization": {
      href: "freight-optimization.html",
      label: "Freight Optimization",
      icon: "⇄",
      group: "Administration",
      roles: ["receiver"],
      title: "Freight Optimization",
      subtitle: "Review modeled freight savings, guardrails, and time-boxed shipping decisions."
    },
    "admin-templates": {
      href: "admin-templates.html",
      label: "Flow Studio",
      icon: "▤",
      group: "Operations",
      roles: ["receiver"],
      title: "Flow Studio",
      subtitle: "Improve how requests enter your queues."
    },
    admin: {
      href: "admin-rules-access.html",
      label: "Enterprise Governance",
      icon: "⚙",
      group: "Administration",
      roles: ["admin"],
      title: "Enterprise Governance",
      subtitle: "Company-wide controls, triage, cost, access, and audit — the Administrator home."
    },
    "enterprise-triage": {
      href: "enterprise-triage.html",
      label: "Enterprise Triage",
      icon: "⚑",
      group: "Administration",
      roles: ["admin"],
      title: "Enterprise Triage",
      subtitle: "Requests MasterFlow could not confidently route — review, clarify, and reroute."
    },
    "admin-migration": {
      href: "admin-migration.html",
      label: "ServiceNow Transition",
      icon: "⇥",
      group: "Administration",
      roles: ["receiver", "admin"],
      title: "ServiceNow Transition",
      subtitle: "Track migration progress, data quality, reconciliation, and remaining actions."
    },
    "project-summary": {
      href: "project-summary.html",
      label: "Project summary",
      icon: "i",
      group: "About",
      roles: ["requester", "receiver", "admin"],
      title: "Project summary",
      subtitle: "What MasterFlow does, how it solves Problem #4, and how it transitions off ServiceNow."
    }
  };

  const currentPage = document.body.dataset.page || "home";
  const pageDefinition = pages[currentPage] || pages.home;
  const roleLabels = {
    requester: "Employee",
    receiver: "Service Team",
    admin: "Administrator"
  };

  const roleDescriptions = {
    requester: "Submit and track requests",
    receiver: "Work requests — includes Queue Manager and Service Team Member views",
    admin: "Manage enterprise governance and platform controls"
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#039;",
      '"': "&quot;"
    }[char]));
  }

  function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function formatMoney(value, maximumFractionDigits) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: maximumFractionDigits == null ? 2 : maximumFractionDigits
    }).format(Number(value || 0));
  }

  function priorityClass(priority) {
    if (String(priority).startsWith("P1")) return "badge-red";
    if (String(priority).startsWith("P2")) return "badge-amber";
    return "badge-blue";
  }

  function statusClass(status) {
    const text = String(status || "").toLowerCase();
    if (text.includes("resolved") || text.includes("closed") || text.includes("approved") || text.includes("ready")) return "badge-green";
    if (text.includes("critical") || text.includes("breach") || text.includes("stopped")) return "badge-red";
    if (text.includes("waiting") || text.includes("review") || text.includes("hold") || text.includes("approval") || text.includes("triage")) return "badge-amber";
    if (text.includes("release")) return "badge-gray";
    return "badge-blue";
  }

  function getRole() {
    return Store.getRole();
  }

  // MasterFlow Intelligence (reporting.html) and the Queue Manager dashboard
  // (ticket-queues.html — queue-level reporting, coverage, and controls) are
  // limited to Queue Managers and Enterprise Administrators. A Service Team
  // Member is a receiver-role persona, so role alone cannot gate this — the
  // active persona must also be checked, both for nav visibility and for
  // direct-URL access. A Member works tickets from the Work Center instead.
  // Freight Optimization is Queue-Manager-only: receiver role AND manager
  // persona. Standard Service Team Members, requesters, and administrators
  // must not see the nav item and must be redirected on direct URL access.
  const PERSONA_RESTRICTED_PAGES = new Set(["reporting", "ticket-queues", "freight-optimization"]);

  function activeServicePersona() {
    return window.localStorage.getItem("masterflowServicePersona") === "member" ? "member" : "manager";
  }

  function isPersonaAllowed(pageId, role) {
    if (!PERSONA_RESTRICTED_PAGES.has(pageId)) return true;
    if (role !== "receiver") return true;
    return activeServicePersona() === "manager";
  }

  function isAllowed(pageId, role) {
    return Boolean(pages[pageId] && pages[pageId].roles.includes(role)) && isPersonaAllowed(pageId, role);
  }

  function safeLanding(role) {
    if (role === "admin") return pages.admin.href;
    if (role === "receiver") return pages["assigned-work"].href;
    return pages.home.href;
  }

  function counts() {
    const state = Store.getState();
    const openTickets = state.tickets.filter((ticket) => !["Resolved", "Closed", "Closed — No Action"].includes(ticket.status));
    const requesterTickets = openTickets.filter((ticket) => ticket.requester === Store.CURRENT_USER.name).length;
    const queueTickets = openTickets.length;
    return { requesterTickets, queueTickets };
  }

  function navMarkup(role) {
    const pageCounts = counts();
    const groupOrder = ["For me", "Operations", "Administration", "About"];
    const servicePersona = window.localStorage.getItem("masterflowServicePersona") === "member" ? "member" : "manager";
    return groupOrder.map((group) => {
      const links = Object.entries(pages)
        .filter(([id, definition]) => {
          if (!(definition.group === group && definition.roles.includes(role))) return false;
          // ServiceNow Transition is only for Enterprise Administrators and Queue Managers.
          if (id === "admin-migration" && role === "receiver" && servicePersona !== "manager") return false;
          // MasterFlow Intelligence (Reporting) is only for Queue Managers and Enterprise Administrators.
          if (!isPersonaAllowed(id, role)) return false;
          return true;
        })
        .map(([id, definition]) => {
          let badge = "";
          if (id === "my-tickets" && pageCounts.requesterTickets) badge = `<span class="nav-badge">${pageCounts.requesterTickets}</span>`;
          if (id === "assigned-work" && pageCounts.queueTickets) badge = `<span class="nav-badge">${pageCounts.queueTickets}</span>`;
          return `<a class="nav-link${id === currentPage ? " active" : ""}" href="${definition.href}" data-page-link="${id}"><span class="nav-icon" aria-hidden="true">${definition.icon}</span><span>${definition.label}</span>${badge}</a>`;
        }).join("");
      if (!links) return "";
      return `<nav class="nav-group" aria-label="${group}"><div class="nav-label">${group}</div>${links}</nav>`;
    }).join("");
  }

  function renderLayout() {
    const role = getRole();
    if (!isAllowed(currentPage, role)) {
      window.sessionStorage.setItem("masterflowFlash", "That workspace is not available in the selected demo role.");
      window.location.replace(safeLanding(role));
      return false;
    }

    document.body.dataset.role = role;
    const topbar = document.createElement("header");
    topbar.className = "topbar";
    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="menu-button" id="menuButton" aria-label="Open navigation" aria-expanded="false">☰</button>
        <a class="brand-logo" href="index.html" aria-label="Master Electronics home">
          <img src="assets/images/master-logo.png" alt="Master Electronics">
        </a>
        <div class="page-context">
          <span class="page-context-text"><h1>${escapeHtml(pageDefinition.title)}</h1><p>${escapeHtml(pageDefinition.subtitle)}</p></span>
        </div>
      </div>
      <a class="topbar-brandname" href="index.html" aria-label="MasterFlow home">
        <strong>MasterFlow</strong>
        <small>Powered by Master Electronics</small>
      </a>
      <div class="topbar-right">
        <div class="role-switch">
          <button class="role-switch-button" id="roleSwitchButton" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Switch workspace. Prototype view; production access comes from SSO." title="Switch workspace (prototype view)">
            <span class="role-switch-dot role-${role}" aria-hidden="true"></span>
            <span class="role-switch-text">
              <span class="role-switch-eyebrow">Viewing as</span>
              <span class="role-switch-current">${escapeHtml(roleLabels[role])}</span>
            </span>
            <svg class="role-switch-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="role-switch-menu" id="roleSwitchMenu" role="menu" aria-label="Switch workspace" hidden>
            <div class="role-switch-menu-head">Switch workspace <span>prototype view</span></div>
            ${["requester", "receiver", "admin"].map((r) => `
              <button class="role-switch-option${r === role ? " is-current" : ""}" type="button" role="menuitemradio" aria-checked="${r === role}" data-role="${r}">
                <span class="role-switch-dot role-${r}" aria-hidden="true"></span>
                <span class="role-switch-opt-text"><strong>${escapeHtml(roleLabels[r])}</strong><small>${escapeHtml(roleDescriptions[r])}</small></span>
                <span class="role-switch-check" aria-hidden="true">${r === role ? "✓" : ""}</span>
              </button>`).join("")}
          </div>
        </div>
        <div class="notif-wrap">
          <button class="icon-button notif-button" id="notifButton" type="button" aria-haspopup="true" aria-expanded="false" title="Notifications" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span class="notif-badge" id="notifBadge" hidden>0</span>
          </button>
          <div class="notif-panel" id="notifPanel" role="dialog" aria-label="Notifications" hidden></div>
        </div>
        <div class="avatar" title="${escapeHtml(Store.CURRENT_USER.name)}">${escapeHtml(Store.CURRENT_USER.initials)}</div>
      </div>`;

    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.id = "sidebar";
    sidebar.setAttribute("aria-label", "Primary navigation");
    sidebar.innerHTML = `
      ${navMarkup(role)}
      <div class="sidebar-bottom">
        <div class="system-status">
          <small>Operational status</small>
          <div class="status-row"><span class="status-dot"></span>All core systems available</div>
        </div>
        <button class="sidebar-action sidebar-critical" type="button" data-open-critical><span class="nav-icon">!</span>Shipping is stopped</button>
        <button class="sidebar-action reset-demo" type="button" data-reset-demo><span class="nav-icon">↺</span>Reset demo data</button>
      </div>`;

    const scrim = document.createElement("div");
    scrim.className = "sidebar-scrim";
    scrim.id = "sidebarScrim";
    scrim.setAttribute("aria-hidden", "true");

    document.body.prepend(scrim);
    document.body.prepend(sidebar);
    document.body.prepend(topbar);
    document.body.insertAdjacentHTML("beforeend", criticalDialogMarkup());
    document.body.insertAdjacentHTML("beforeend", '<div class="toast-region" id="toastRegion" aria-live="polite" aria-atomic="true"></div>');

    bindLayoutEvents();
    const flash = window.sessionStorage.getItem("masterflowFlash");
    if (flash) {
      window.sessionStorage.removeItem("masterflowFlash");
      window.setTimeout(() => showToast(flash), 50);
    }
    return true;
  }

  function criticalContactDefault() {
    const user = Store.CURRENT_USER;
    return `${user.name}${user.phone ? " · " + user.phone : ""}`;
  }

  function criticalDialogMarkup() {
    return `
      <dialog id="criticalDialog" aria-labelledby="criticalTitle">
        <form method="dialog" id="criticalForm">
          <div class="dialog-header">
            <div><h2 id="criticalTitle">Shipping is stopped — P1 critical</h2><p>Immediate P1 fast lane. No AI classification gate.</p></div>
            <button class="close-button" value="cancel" aria-label="Close">×</button>
          </div>
          <div class="dialog-body">
            <div class="batphone">
              <div class="batphone-eyebrow">Do this first</div>
              <strong class="batphone-title">Call the Bat Phone now</strong>
              <a class="batphone-number" href="tel:+18005553858">(800) 555-3858</a>
              <p>Call immediately so the response team can begin coordinating while MasterFlow prepares this request. Do not wait for the form below.</p>
            </div>
            <div class="notice notice-danger"><span>!</span><div><strong>Use this only when shipping or a critical warehouse process is blocked.</strong><p>Submitting notifies Warehouse Systems on-call and operations leadership.</p></div></div>
            <div class="field-row mt-18">
              <div class="field"><label for="criticalLocation">Building or warehouse</label><select class="select" id="criticalLocation" required><option value="">Choose location</option><option>PHX Warehouse</option><option>NY Warehouse</option><option>Customer Service</option><option>Other</option></select></div>
              <div class="field"><label for="criticalArea">Exact area, line, station, or dock</label><input class="input" id="criticalArea" required placeholder="Example: Packaging Line 2 / Dock 4"></div>
            </div>
            <div class="field-row mt-12">
              <div class="field"><label for="criticalProcess">Process stopped</label><select class="select" id="criticalProcess" required><option value="">Choose process</option><option>Order picking</option><option>Packing</option><option>Manifesting</option><option>Shipping</option><option>Receiving</option><option>ERP order entry</option><option>Other</option></select></div>
              <div class="field"><label for="criticalSystem">Equipment, system, app, or carrier involved</label><input class="input" id="criticalSystem" placeholder="Example: Manifest station 3 / OMS / FedEx"></div>
            </div>
            <div class="field-row mt-12">
              <div class="field"><label for="criticalStarted">When did it start?</label><input class="input" id="criticalStarted" required placeholder="Example: 10 minutes ago"></div>
              <div class="field"><label for="criticalDegree">Fully stopped or degraded?</label><select class="select" id="criticalDegree" required><option value="">Choose</option><option>Completely stopped</option><option>Partially degraded</option></select></div>
            </div>
            <div class="field-row mt-12">
              <div class="field"><label for="criticalScope">How much is affected?</label><select class="select" id="criticalScope" required><option value="">Choose scope</option><option>One station</option><option>One line</option><option>Several areas</option><option>Entire operation</option></select></div>
              <div class="field"><label for="criticalUsers">People or stations affected</label><input class="input" id="criticalUsers" placeholder="Example: 8 outbound stations"></div>
            </div>
            <div class="field mt-12"><label for="criticalSymptom">What is happening? Any error, alarm, or symptom</label><textarea class="textarea" id="criticalSymptom" required placeholder="Describe the error or blocked step in one or two sentences."></textarea></div>
            <div class="field-row mt-12">
              <div class="field"><label for="criticalSafety">Safety concern?</label><select class="select" id="criticalSafety" required><option value="">Choose</option><option>No immediate safety concern</option><option>Safety concern present</option></select></div>
              <div class="field"><label for="criticalWorkaround">Workaround available?</label><select class="select" id="criticalWorkaround"><option value="">Choose</option><option>No workaround available</option><option>Temporary workaround in place</option></select></div>
            </div>
            <div class="field mt-12"><label for="criticalAttempted">What has already been attempted? (optional)</label><input class="input" id="criticalAttempted" placeholder="Example: restarted the manifest station"></div>
            <div class="field mt-12"><label for="criticalContact">Best contact for the response team</label><input class="input" id="criticalContact" required value="${escapeHtml(criticalContactDefault())}"></div>
          </div>
          <div class="dialog-footer p1-footer">
            <button class="btn btn-ghost" id="falseAlarmButton" type="button">This was a false alarm</button>
            <div class="p1-footer-right">
              <button class="btn btn-secondary" value="cancel">Cancel</button>
              <button class="btn btn-danger" id="submitCritical" value="default">Create P1 and notify on-call</button>
            </div>
          </div>
        </form>
      </dialog>`;
  }

  function openSidebar() {
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("sidebarScrim");
    const button = document.getElementById("menuButton");
    if (!sidebar) return;
    sidebar.classList.add("open");
    scrim.classList.add("open");
    button.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("sidebarScrim");
    const button = document.getElementById("menuButton");
    if (!sidebar) return;
    sidebar.classList.remove("open");
    scrim.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  }

  function showToast(message, timeout) {
    const region = document.getElementById("toastRegion");
    if (!region) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), timeout || 4200);
  }

  const ATTACHMENT_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>`;

  /*
   * Shared attachment control markup. The native file input stays in the DOM
   * (visually hidden, not display:none) so keyboard/focus/screen-reader
   * behavior and the browser's file dialog keep working — only the visible
   * chrome around it is custom. Prototype only stores selected file names;
   * nothing is uploaded.
   */
  function attachmentFieldMarkup(options) {
    const opts = options || {};
    const inputId = escapeHtml(opts.inputId || "attachmentInput");
    const labelId = `${inputId}Label`;
    const triggerLabel = escapeHtml(opts.triggerLabel || "Add files");
    const helpText = escapeHtml(opts.helpText || "Prototype records selected file names in the shared timeline.");
    const multiple = opts.multiple === false ? "" : "multiple";
    return `
      <div class="attachment-field" data-attachment-field>
        <span id="${labelId}" class="sr-only">${triggerLabel}</span>
        <input
          class="attachment-field-input"
          type="file"
          id="${inputId}"
          ${multiple}
          aria-labelledby="${labelId}"
        >
        <button type="button" class="attachment-field-trigger" data-attachment-trigger aria-controls="${inputId}">
          ${ATTACHMENT_ICON}
          <span>${triggerLabel}</span>
        </button>
        <div class="attachment-field-list" data-attachment-list aria-live="polite"></div>
        <small class="attachment-field-help muted">${helpText}</small>
      </div>
    `;
  }

  function initAttachmentField(root) {
    if (!root) return null;
    const field = root.hasAttribute && root.hasAttribute("data-attachment-field") ? root : root.querySelector("[data-attachment-field]");
    if (!field || field.dataset.attachmentReady) return field;
    field.dataset.attachmentReady = "true";

    const input = field.querySelector(".attachment-field-input");
    const trigger = field.querySelector("[data-attachment-trigger]");
    const list = field.querySelector("[data-attachment-list]");
    if (!input || !trigger || !list) return field;

    function renderList() {
      const files = Array.from(input.files || []);
      if (!files.length) {
        list.innerHTML = "";
        return;
      }
      list.innerHTML = `<span class="attachment-field-count">${files.length} file${files.length === 1 ? "" : "s"} selected</span>` +
        files.map((file, index) => `
          <span class="attachment-field-chip">
            <span class="attachment-field-chip-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            <button type="button" class="attachment-field-chip-remove" data-attachment-remove="${index}" aria-label="Remove ${escapeHtml(file.name)}">&times;</button>
          </span>
        `).join("");
    }

    function replaceFiles(nextFiles) {
      if (typeof DataTransfer === "undefined") return;
      const transfer = new DataTransfer();
      nextFiles.forEach((file) => transfer.items.add(file));
      input.files = transfer.files;
      renderList();
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    trigger.addEventListener("click", () => input.click());
    input.addEventListener("focus", () => field.classList.add("is-focused"));
    input.addEventListener("blur", () => field.classList.remove("is-focused"));
    input.addEventListener("change", renderList);

    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-attachment-remove]");
      if (!button) return;
      const index = Number(button.dataset.attachmentRemove);
      replaceFiles(Array.from(input.files || []).filter((_, i) => i !== index));
    });

    if (input.hasAttribute("multiple") && typeof DataTransfer !== "undefined") {
      field.addEventListener("dragover", (event) => { event.preventDefault(); field.classList.add("is-dragover"); });
      field.addEventListener("dragleave", () => field.classList.remove("is-dragover"));
      field.addEventListener("drop", (event) => {
        event.preventDefault();
        field.classList.remove("is-dragover");
        const dropped = Array.from((event.dataTransfer && event.dataTransfer.files) || []);
        if (!dropped.length) return;
        replaceFiles(Array.from(input.files || []).concat(dropped));
      });
    }

    renderList();
    return field;
  }

  function openCriticalDialog() {
    const dialog = document.getElementById("criticalDialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  /*
   * Notifications: surface the current requester's tickets that
   * need their attention or were recently updated. This gives the
   * header control a real, useful purpose.
   */
  function userNotifications() {
    const me = Store.CURRENT_USER.name;
    const list = (Store.getState().tickets || []).filter((ticket) => ticket.requester === me);
    const needsYou = list.filter((ticket) => /waiting on requester/i.test(ticket.status || ""));
    const recentlyUpdated = list.filter((ticket) =>
      !/waiting on requester/i.test(ticket.status || "") &&
      !["Resolved", "Closed"].includes(ticket.status) &&
      (Date.now() - new Date(ticket.updatedAt || ticket.createdAt).getTime()) < 48 * 60 * 60 * 1000
    );
    return { needsYou, recentlyUpdated };
  }

  function updateNotifBadge() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    const { needsYou } = userNotifications();
    if (needsYou.length) {
      badge.textContent = String(needsYou.length);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  function renderNotifPanel() {
    const panel = document.getElementById("notifPanel");
    if (!panel) return;
    const { needsYou, recentlyUpdated } = userNotifications();
    const item = (ticket, cls, label) => `
      <a class="notif-item" href="my-tickets.html">
        <span class="notif-item-top"><strong>${escapeHtml(ticket.number)}</strong><span class="notif-tag ${cls}">${label}</span></span>
        <span class="notif-item-title">${escapeHtml(ticket.title)}</span>
        <span class="notif-item-meta">${escapeHtml(ticket.queue || "")}</span>
      </a>`;
    const body =
      (!needsYou.length && !recentlyUpdated.length)
        ? `<div class="notif-empty">You're all caught up. No updates on your requests right now.</div>`
        : needsYou.map((ticket) => item(ticket, "notif-tag-amber", "Needs your response")).join("") +
          recentlyUpdated.map((ticket) => item(ticket, "notif-tag-blue", "Updated")).join("");
    panel.innerHTML = `
      <div class="notif-head"><strong>Notifications</strong><a href="my-tickets.html">View all requests</a></div>
      <div class="notif-body">${body}</div>`;
  }

  function toggleNotifPanel(force) {
    const panel = document.getElementById("notifPanel");
    const button = document.getElementById("notifButton");
    if (!panel || !button) return;
    const willOpen = typeof force === "boolean" ? force : panel.hidden;
    if (willOpen) {
      renderNotifPanel();
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
    } else {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  }

  function bindLayoutEvents() {
    document.getElementById("menuButton").addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      if (sidebar.classList.contains("open")) closeSidebar(); else openSidebar();
    });
    document.getElementById("sidebarScrim").addEventListener("click", closeSidebar);

    const roleSwitchButton = document.getElementById("roleSwitchButton");
    const roleSwitchMenu = document.getElementById("roleSwitchMenu");
    if (roleSwitchButton && roleSwitchMenu) {
      const closeRoleMenu = () => {
        roleSwitchMenu.hidden = true;
        roleSwitchButton.setAttribute("aria-expanded", "false");
      };
      const openRoleMenu = () => {
        roleSwitchMenu.hidden = false;
        roleSwitchButton.setAttribute("aria-expanded", "true");
      };
      roleSwitchButton.addEventListener("click", (event) => {
        event.stopPropagation();
        if (roleSwitchMenu.hidden) openRoleMenu(); else closeRoleMenu();
      });
      roleSwitchMenu.querySelectorAll("[data-role]").forEach((option) => {
        option.addEventListener("click", () => {
          const role = Store.setRole(option.dataset.role);
          window.sessionStorage.setItem("masterflowFlash", `${roleLabels[role]} workspace enabled. Production access would come from SSO.`);
          window.location.href = safeLanding(role);
        });
      });
      document.addEventListener("click", (event) => {
        if (!event.target.closest(".role-switch")) closeRoleMenu();
      });
    }

    document.querySelectorAll("[data-open-critical]").forEach((button) => button.addEventListener("click", openCriticalDialog));

    document.querySelectorAll("[data-reset-demo]").forEach((button) => button.addEventListener("click", () => {
      const accepted = window.confirm("Reset all fictional tickets and prototype settings to the original scenario?");
      if (!accepted) return;
      Store.resetState();
      window.sessionStorage.setItem("masterflowFlash", "Demo data reset to the original fictional scenario.");
      window.location.reload();
    }));

    const criticalForm = document.getElementById("criticalForm");

    const falseAlarmButton = document.getElementById("falseAlarmButton");
    if (falseAlarmButton) {
      falseAlarmButton.addEventListener("click", () => {
        document.getElementById("criticalDialog").close();
        criticalForm.reset();
        const contactField = document.getElementById("criticalContact");
        if (contactField) contactField.value = criticalContactDefault();
        showToast("Marked as a false alarm. No P1 ticket was created.");
      });
    }

    criticalForm.addEventListener("submit", (event) => {
      const submitter = event.submitter;
      if (!submitter || submitter.id !== "submitCritical") return;
      event.preventDefault();
      if (!criticalForm.reportValidity()) return;
      const val = (id) => (document.getElementById(id).value || "").trim();
      const location = val("criticalLocation");
      const area = val("criticalArea");
      const process = val("criticalProcess");
      const system = val("criticalSystem");
      const started = val("criticalStarted");
      const degree = val("criticalDegree");
      const scope = val("criticalScope");
      const users = val("criticalUsers");
      const symptom = val("criticalSymptom");
      const safety = val("criticalSafety");
      const workaround = val("criticalWorkaround");
      const attempted = val("criticalAttempted");
      const contact = val("criticalContact");
      const ticket = Store.addTicket({
        title: `${process || "Critical process"} ${degree === "Partially degraded" ? "degraded" : "stopped"} at ${area || location}`,
        description: `${symptom} (${degree || "Completely stopped"}; ${scope || "scope not specified"}).`,
        category: "Warehouse operations outage",
        priority: "P1 - Critical",
        queue: "Warehouse Systems / On-call",
        requester: Store.CURRENT_USER.name,
        status: "New",
        location: `${location}${area ? " - " + area : ""}`,
        source: "Shipping is stopped fast lane",
        classificationConfidence: 100,
        routingReason: "Direct P1 fast-lane submission; no AI classification gate.",
        details: {
          process,
          system: system || "Not specified",
          started,
          degree: degree || "Completely stopped",
          scope: scope || "Not specified",
          affected: users || "Not specified",
          safety: safety || "Not specified",
          workaround: workaround || "Not specified",
          attempted: attempted || "None reported",
          contact,
          batPhoneAcknowledged: "(800) 555-3858 call instruction shown to requester"
        },
        historyText: "P1 created via Shipping-stopped fast lane. Bat Phone (800) 555-3858 call instruction shown. Warehouse Systems on-call and operations leadership notified."
      });
      document.getElementById("criticalDialog").close();
      criticalForm.reset();
      const contactField = document.getElementById("criticalContact");
      if (contactField) contactField.value = criticalContactDefault();
      showToast(`${ticket.number} created. On-call and operations leadership were notified.`);
      window.dispatchEvent(new CustomEvent("masterflow:critical-created", { detail: ticket }));
    });

    const notifButton = document.getElementById("notifButton");
    if (notifButton) {
      notifButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleNotifPanel();
      });
      document.addEventListener("click", (event) => {
        if (!event.target.closest(".notif-wrap")) toggleNotifPanel(false);
      });
    }
    updateNotifBadge();

    window.addEventListener("masterflow:state", () => {
      const sidebar = document.getElementById("sidebar");
      if (!sidebar) return;
      sidebar.querySelectorAll(".nav-group").forEach((node) => node.remove());
      sidebar.insertAdjacentHTML("afterbegin", navMarkup(getRole()));
      updateNotifBadge();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSidebar();
        toggleNotifPanel(false);
        const roleMenu = document.getElementById("roleSwitchMenu");
        const roleBtn = document.getElementById("roleSwitchButton");
        if (roleMenu && !roleMenu.hidden) {
          roleMenu.hidden = true;
          if (roleBtn) roleBtn.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

function openTicketDialog(ticket) {
  const ticketId = ticket.id;
  let dialog = document.getElementById("sharedTicketDialog");

  if (!dialog) {
    document.body.insertAdjacentHTML("beforeend", `
      <dialog
        id="sharedTicketDialog"
        class="ticket-workspace-dialog"
        aria-labelledby="sharedTicketTitle"
      >
        <div class="dialog-header">
          <div>
            <h2 id="sharedTicketTitle"></h2>
            <p id="sharedTicketSubtitle"></p>
          </div>
          <button
            class="close-button"
            type="button"
            data-close-ticket-dialog
            aria-label="Close"
          >×</button>
        </div>

        <div class="dialog-body" id="sharedTicketBody"></div>

        <div class="dialog-footer">
          <button
            class="btn btn-secondary"
            type="button"
            data-close-ticket-dialog
          >Close</button>
        </div>
      </dialog>
    `);

    dialog = document.getElementById("sharedTicketDialog");

    dialog
      .querySelectorAll("[data-close-ticket-dialog]")
      .forEach((button) => {
        button.addEventListener("click", () => dialog.close());
      });
  }

  const canManage = ["receiver", "admin"].includes(getRole());

  function isClosed(item) {
    return ["Resolved", "Closed", "Cancelled"].includes(item.status);
  }

  function isWaiting(item) {
    return /waiting on requester|waiting on employee/i.test(
      String(item.status || "")
    );
  }

  function minutesUntilDue(item) {
    const due = new Date(item.slaDueAt).getTime();
    if (!Number.isFinite(due)) return Number.POSITIVE_INFINITY;
    return Math.round((due - Date.now()) / 60000);
  }

  function dueLabel(item) {
    const minutes = minutesUntilDue(item);

    if (!Number.isFinite(minutes)) return "No SLA due time";
    if (isClosed(item)) return "SLA complete";
    if (minutes < -60) {
      return `SLA overdue by ${Math.ceil(Math.abs(minutes) / 60)} hours`;
    }
    if (minutes < 0) return `SLA overdue by ${Math.abs(minutes)} minutes`;
    if (minutes <= 60) return `SLA due in ${Math.max(1, minutes)} minutes`;
    if (minutes < 1440) return `SLA due in ${Math.ceil(minutes / 60)} hours`;

    return `SLA due ${formatDate(item.slaDueAt)}`;
  }

  function statusSummary(item) {
    const assignee = item.assignee && item.assignee !== "Unassigned"
      ? item.assignee
      : item.queue;

    if (isClosed(item)) {
      return "This request is complete. Reopen it only if the issue is still occurring.";
    }

    if (String(item.priority).startsWith("P1")) {
      return "A critical operational process is affected. Immediate response and frequent updates are required.";
    }

    if (isWaiting(item)) {
      return `${assignee} is waiting for information from ${item.requester} before work can continue.`;
    }

    if (item.status === "Approval required") {
      return "An authorized decision is required before this request can continue.";
    }

    if (item.status === "Triage") {
      return "Business Enablement must confirm the correct receiving queue and owner.";
    }

    if (!item.assignee || item.assignee === "Unassigned") {
      return "This request has not been assigned to an owner yet.";
    }

    if (item.status === "New") {
      return `${item.assignee} owns this request and should begin the initial review.`;
    }

    if (item.status === "In progress") {
      return `${item.assignee} is actively working this request.`;
    }

    return `${assignee} currently owns this request.`;
  }

  function nextAction(item) {
    if (isClosed(item)) {
      return "No action is required. Review the resolution or reopen the request if needed.";
    }

    if (String(item.priority).startsWith("P1")) {
      return "Acknowledge the incident, confirm the affected process and users, and begin the critical-response workflow now.";
    }

    if (item.status === "Approval required") {
      return "Review the request details and record an approval or rejection.";
    }

    if (item.status === "Triage") {
      return "Confirm the correct queue, select an owner, and move the request into active work.";
    }

    if (isWaiting(item)) {
      return "Review the latest question. Send a reminder if the requester has not responded within the expected time.";
    }

    if (!item.assignee || item.assignee === "Unassigned") {
      return "Assign the request to yourself or the best available team member.";
    }

    if (item.status === "New") {
      return "Review the request, validate the supplied information, and start work.";
    }

    if (item.status === "In progress") {
      return "Continue troubleshooting, document the result, and post the next update.";
    }

    return "Review the request and complete the next available action.";
  }

  function businessImpact(item) {
    const details = item.details || {};
    const category = String(item.category || "").toLowerCase();
    const title = String(item.title || "").toLowerCase();

    if (String(item.priority).startsWith("P1")) {
      const process = details.process || "A critical warehouse process";
      const affected = details.affectedUsers
        ? ` ${details.affectedUsers} are reported as affected.`
        : "";
      return `${process} is blocked at ${item.location}.${affected}`;
    }

    if (isWaiting(item)) {
      return "Resolution is paused because support is waiting for information from the requester.";
    }

    if (item.status === "Approval required") {
      return "The requested work or purchase cannot continue until an authorized decision is recorded.";
    }

    if (category.includes("printer") || title.includes("printer")) {
      return `Printing or label-production work at ${item.location} may be delayed until this request is resolved.`;
    }

    if (category.includes("access") || title.includes("access")) {
      return "The requester may be unable to use a required system, report, or business process.";
    }

    if (category.includes("performance") || title.includes("laptop")) {
      return "The employee can continue working, but device performance may reduce productivity.";
    }

    return `This active request affects work at ${item.location || "the reported location"}.`;
  }

  function missingInformation(item) {
    const historyText = (item.history || [])
      .map((entry) => entry.text)
      .join(" ")
      .toLowerCase();

    if (isWaiting(item)) {
      if (/printer label|printer asset|printer name|ip address/.test(historyText)) {
        return ["Printer name, asset number, or IP address"];
      }
      if (/manager approval|director approval|approval/.test(historyText)) {
        return ["Required approval decision"];
      }
      return ["Requester response to the latest question"];
    }

    if (!item.assignee || item.assignee === "Unassigned") {
      return ["Assigned owner"];
    }

    if (item.status === "Triage") {
      return ["Confirmed receiving queue", "Assigned owner"];
    }

    return ["No blocking information detected"];
  }

  function suggestedResolution(item) {
    const text = `${item.title} ${item.category} ${item.description}`.toLowerCase();

    if (text.includes("printer")) {
      return [
        "Confirm the printer name, asset number, or IP address.",
        "Verify the printer is online and reachable from the workstation.",
        "Reconnect or remap the printer and test a label or print job."
      ];
    }

    if (text.includes("laptop") || text.includes("performance")) {
      return [
        "Confirm whether one application or the whole device is affected.",
        "Review CPU, memory, storage, and startup applications.",
        "Restart, apply approved updates, and retest the reported workflow."
      ];
    }

    if (text.includes("access") || text.includes("report")) {
      return [
        "Confirm the exact system, report, and role required.",
        "Validate the business reason and required approval.",
        "Apply the approved access and confirm the requester can sign in."
      ];
    }

    if (String(item.priority).startsWith("P1") || text.includes("manifest")) {
      return [
        "Confirm the outage scope and whether all stations are affected.",
        "Check the shared system or service before troubleshooting individual stations.",
        "Post frequent updates and confirm recovery with Operations before resolving."
      ];
    }

    if (item.status === "Approval required") {
      return [
        "Verify the request details and business justification.",
        "Record the approval decision and notify the requester."
      ];
    }

    return [
      "Review the requester description and most recent activity.",
      "Confirm any missing facts before changing the ticket status.",
      "Document the action taken and the verified outcome."
    ];
  }

  function progressMarkup(item) {
    const status = String(item.status || "").toLowerCase();
    const assigned = Boolean(item.assignee && item.assignee !== "Unassigned");
    const workingReached =
      status.includes("in progress") ||
      status.includes("waiting") ||
      status.includes("approval") ||
      status.includes("resolved") ||
      status.includes("closed");
    const resolved = isClosed(item);

    const stages = [
      { label: "Submitted", state: "complete" },
      { label: "Routed", state: item.queue ? "complete" : "active" },
      { label: "Assigned", state: assigned ? "complete" : "active" },
      {
        label: isWaiting(item) ? "Waiting" : "Working",
        state: workingReached ? (resolved ? "complete" : "active") : "pending"
      },
      { label: "Resolved", state: resolved ? "complete" : "pending" }
    ];

    return stages
      .map((stage) => `
        <div class="ticket-progress-step ${stage.state}">
          <span>${stage.state === "complete" ? "✓" : ""}</span>
          <small>${escapeHtml(stage.label)}</small>
        </div>
      `)
      .join("");
  }

  function historyMarkup(item) {
    const history = (item.history || []).slice().reverse();

    if (!history.length) {
      return '<p class="muted small">No activity has been recorded yet.</p>';
    }

    return history
      .map((entry) => `
        <div class="ticket-activity-item">
          <span class="ticket-activity-dot"></span>
          <div>
            <strong>${escapeHtml(entry.text)}</strong>
            <small>${escapeHtml(formatDate(entry.at))}</small>
          </div>
        </div>
      `)
      .join("");
  }

  function renderTicket(currentTicket) {
    const missing = missingInformation(currentTicket);
    const suggestions = suggestedResolution(currentTicket);
    const closed = isClosed(currentTicket);
    const unassigned =
      !currentTicket.assignee || currentTicket.assignee === "Unassigned";

    document.getElementById("sharedTicketTitle").textContent =
      `${currentTicket.number} - ${currentTicket.title}`;

    document.getElementById("sharedTicketSubtitle").textContent =
      `${currentTicket.queue} · ${currentTicket.status}`;

    const managementPanel = canManage
      ? `
        <section class="ticket-action-panel">
          <div>
            <h3>Work this ticket</h3>
            <p>Add an update, ask the requester a question, or record the resolution.</p>
          </div>

          <textarea
            class="textarea"
            id="ticketUpdateText"
            placeholder="Write an update, question, or resolution note..."
          ></textarea>

          <div class="ticket-action-buttons">
            ${unassigned && !closed ? `
              <button class="btn btn-secondary btn-sm" type="button" data-ticket-action="assign">
                Assign to me
              </button>
            ` : ""}

            ${!closed && currentTicket.status !== "In progress" ? `
              <button class="btn btn-primary btn-sm" type="button" data-ticket-action="start">
                Start work
              </button>
            ` : ""}

            ${!closed ? `
              <button class="btn btn-secondary btn-sm" type="button" data-ticket-action="request-info">
                Request information
              </button>

              <button class="btn btn-soft btn-sm" type="button" data-ticket-action="resolve">
                Mark resolved
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" type="button" data-ticket-action="reopen">
                Reopen ticket
              </button>
            `}

            <button class="btn btn-ghost btn-sm" type="button" data-ticket-action="post">
              Post update
            </button>
          </div>
        </section>
      `
      : `
        <section class="ticket-action-panel">
          <div>
            <h3>Reply or add information</h3>
            <p>Your update stays in this request conversation.</p>
          </div>

          <textarea
            class="textarea"
            id="ticketUpdateText"
            placeholder="Add a reply, answer, or update..."
          ></textarea>

          <div class="ticket-action-buttons">
            <button class="btn btn-primary btn-sm" type="button" data-ticket-action="requester-reply">
              Send update
            </button>
          </div>
        </section>
      `;

    document.getElementById("sharedTicketBody").innerHTML = `
      <section class="ticket-status-hero ${
        String(currentTicket.priority).startsWith("P1")
          ? "is-critical"
          : isWaiting(currentTicket)
            ? "is-waiting"
            : closed
              ? "is-complete"
              : "is-active"
      }">
        <div>
          <span class="badge ${statusClass(currentTicket.status)}">
            ${escapeHtml(currentTicket.status)}
          </span>
          <h3>${escapeHtml(statusSummary(currentTicket))}</h3>
          <p>${escapeHtml(dueLabel(currentTicket))}</p>
        </div>
      </section>

      <div class="ticket-progress" aria-label="Ticket progress">
        ${progressMarkup(currentTicket)}
      </div>

      <div class="ticket-workspace-grid">
        <div class="ticket-workspace-main">
          <section class="ticket-panel">
            <div class="ticket-panel-label">AI summary</div>
            <h3>${escapeHtml(currentTicket.title)}</h3>
            <p>
              ${escapeHtml(
                currentTicket.description || "No description was provided."
              )}
            </p>
            <div class="ticket-summary-meta">
              <span><strong>Location:</strong> ${escapeHtml(currentTicket.location)}</span>
              <span><strong>Requester:</strong> ${escapeHtml(currentTicket.requester)}</span>
              <span><strong>Current owner:</strong> ${escapeHtml(currentTicket.assignee || "Unassigned")}</span>
            </div>
          </section>

          <section class="ticket-next-action-card">
            <div class="ticket-panel-label">Recommended next action</div>
            <strong>${escapeHtml(nextAction(currentTicket))}</strong>
          </section>

          ${managementPanel}

          <section class="ticket-panel">
            <div class="ticket-panel-label">Activity and conversation</div>
            <div class="ticket-activity-list">
              ${historyMarkup(currentTicket)}
            </div>
          </section>
        </div>

        <aside class="ticket-workspace-side">
          <section class="ticket-side-card ticket-impact-card">
            <div class="ticket-panel-label">Business impact</div>
            <p>${escapeHtml(businessImpact(currentTicket))}</p>
          </section>

          <section class="ticket-side-card">
            <div class="ticket-panel-label">Still needed</div>
            <ul class="ticket-info-list">
              ${missing
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("")}
            </ul>
          </section>

          <section class="ticket-side-card">
            <div class="ticket-panel-label">Suggested resolution path</div>
            <ol class="ticket-suggested-list">
              ${suggestions
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("")}
            </ol>
          </section>

          <details class="ticket-technical-details">
            <summary>Technical and routing details</summary>

            <div class="detail-grid">
              <div class="detail-cell">
                <small>Priority</small>
                <strong>
                  <span class="badge ${priorityClass(currentTicket.priority)}">
                    ${escapeHtml(currentTicket.priority)}
                  </span>
                </strong>
              </div>

              <div class="detail-cell">
                <small>Assigned team</small>
                <strong>${escapeHtml(currentTicket.queue)}</strong>
              </div>

              <div class="detail-cell">
                <small>Assignee</small>
                <strong>${escapeHtml(currentTicket.assignee || "Unassigned")}</strong>
              </div>

              <div class="detail-cell">
                <small>Requester</small>
                <strong>${escapeHtml(currentTicket.requester)}</strong>
              </div>

              <div class="detail-cell">
                <small>Location</small>
                <strong>${escapeHtml(currentTicket.location)}</strong>
              </div>

              <div class="detail-cell">
                <small>SLA due</small>
                <strong>${escapeHtml(formatDate(currentTicket.slaDueAt))}</strong>
              </div>
            </div>

            <div class="notice notice-info mt-12">
              <div>
                <strong>${escapeHtml(currentTicket.classificationConfidence)}% classification confidence</strong>
                <p>${escapeHtml(currentTicket.routingReason)}</p>
              </div>
            </div>
          </details>
        </aside>
      </div>
    `;

    const body = document.getElementById("sharedTicketBody");
    const noteInput = body.querySelector("#ticketUpdateText");

    body.querySelectorAll("[data-ticket-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.ticketAction;
        const note = noteInput ? noteInput.value.trim() : "";
        let updated = null;

        if (action === "assign") {
          updated = Store.updateTicket(
            ticketId,
            {
              assignee: Store.CURRENT_USER.name,
              status: currentTicket.status === "New"
                ? "In progress"
                : currentTicket.status
            },
            `Assigned to ${Store.CURRENT_USER.name}.`
          );
        }

        if (action === "start") {
          updated = Store.updateTicket(
            ticketId,
            {
              assignee: unassigned
                ? Store.CURRENT_USER.name
                : currentTicket.assignee,
              status: "In progress"
            },
            `${Store.CURRENT_USER.name} started work on the ticket.`
          );
        }

        if (action === "request-info") {
          if (!note) {
            showToast("Write the question or missing information before requesting a response.");
            noteInput.focus();
            return;
          }

          updated = Store.updateTicket(
            ticketId,
            { status: "Waiting on requester" },
            `${Store.CURRENT_USER.name} requested information: ${note}`
          );
        }

        if (action === "resolve") {
          updated = Store.updateTicket(
            ticketId,
            { status: "Resolved" },
            note
              ? `${Store.CURRENT_USER.name} resolved the ticket: ${note}`
              : `${Store.CURRENT_USER.name} resolved the ticket.`
          );
        }

        if (action === "reopen") {
          updated = Store.updateTicket(
            ticketId,
            {
              status: "In progress",
              assignee: unassigned
                ? Store.CURRENT_USER.name
                : currentTicket.assignee
            },
            `${Store.CURRENT_USER.name} reopened the ticket.`
          );
        }

        if (action === "post") {
          if (!note) {
            showToast("Write an update before posting.");
            noteInput.focus();
            return;
          }

          updated = Store.updateTicket(
            ticketId,
            {},
            `${Store.CURRENT_USER.name}: ${note}`
          );
        }

        if (action === "requester-reply") {
          if (!note) {
            showToast("Write a reply before sending.");
            noteInput.focus();
            return;
          }

          updated = Store.updateTicket(
            ticketId,
            {
              status: isWaiting(currentTicket)
                ? "In progress"
                : currentTicket.status
            },
            `${Store.CURRENT_USER.name} replied: ${note}`
          );
        }

        if (!updated) return;

        showToast(`${updated.number} updated.`);
        renderTicket(updated);
      });
    });
  }

  renderTicket(Store.getTicket(ticketId) || ticket);

  if (!dialog.open) {
    dialog.showModal();
  }
}

  const layoutReady = renderLayout();

  window.MasterFlowUI = {
    pages,
    currentPage,
    getRole,
    isAllowed,
    safeLanding,
    showToast,
    openCriticalDialog,
    openSidebar,
    closeSidebar,
    openTicketDialog,
    escapeHtml,
    formatDate,
    formatMoney,
    priorityClass,
    statusClass,
    attachmentFieldMarkup,
    initAttachmentField,
    layoutReady
  };
})();
