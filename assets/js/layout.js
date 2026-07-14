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
      label: "My assigned work",
      icon: "◆",
      group: "Operations",
      roles: ["receiver", "admin"],
      title: "My assigned work",
      subtitle: "Tickets, approvals, and freight decisions assigned to you."
    },
    "ticket-queues": {
      href: "ticket-queues.html",
      label: "Ticket queues",
      icon: "☷",
      group: "Operations",
      roles: ["receiver", "admin"],
      title: "Ticket queues",
      subtitle: "Manage ownership, priority, backlog, and SLA risk."
    },
    freight: {
      href: "freight-optimization.html",
      label: "Freight optimization",
      icon: "⇄",
      group: "Operations",
      roles: ["receiver", "admin"],
      title: "Freight optimization",
      subtitle: "Review actionable savings opportunities before cost is incurred."
    },
    reporting: {
      href: "reporting.html",
      label: "Reporting",
      icon: "▥",
      group: "Operations",
      roles: ["receiver", "admin"],
      title: "Reporting",
      subtitle: "Measure service performance and verified freight savings."
    },
    "admin-templates": {
      href: "admin-templates.html",
      label: "Request templates",
      icon: "▤",
      group: "Administration",
      roles: ["admin"],
      title: "Request templates",
      subtitle: "Configure dynamic fields, queues, SLAs, and AI trigger phrases."
    },
    admin: {
      href: "admin-rules-access.html",
      label: "Rules & access",
      icon: "⚙",
      group: "Administration",
      roles: ["admin"],
      title: "Rules & access",
      subtitle: "Configure common routing, approval, SLA, and permission rules."
    },
    "project-summary": {
      href: "project-summary.html",
      label: "Project summary",
      icon: "i",
      group: "Administration",
      roles: ["admin"],
      title: "Project summary",
      subtitle: "Locked product direction and Claude handoff context."
    }
  };

  const currentPage = document.body.dataset.page || "home";
  const pageDefinition = pages[currentPage] || pages.home;
  const roleLabels = {
    requester: "Regular user",
    receiver: "Ticket receiver",
    admin: "Administrator"
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

  function isAllowed(pageId, role) {
    return Boolean(pages[pageId] && pages[pageId].roles.includes(role));
  }

  function safeLanding(role) {
    if (role === "admin") return pages.admin.href;
    if (role === "receiver") return pages["ticket-queues"].href;
    return pages.home.href;
  }

  function counts() {
    const state = Store.getState();
    const openTickets = state.tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status));
    const requesterTickets = openTickets.filter((ticket) => ticket.requester === Store.CURRENT_USER.name).length;
    const queueTickets = openTickets.length;
    const freight = state.freightOpportunities.filter((item) => !["Released unchanged"].includes(item.status) && !item.decision).length;
    return { requesterTickets, queueTickets, freight };
  }

  function navMarkup(role) {
    const pageCounts = counts();
    const groupOrder = ["For me", "Operations", "Administration"];
    return groupOrder.map((group) => {
      const links = Object.entries(pages)
        .filter(([, definition]) => definition.group === group && definition.roles.includes(role))
        .map(([id, definition]) => {
          let badge = "";
          if (id === "my-tickets" && pageCounts.requesterTickets) badge = `<span class="nav-badge">${pageCounts.requesterTickets}</span>`;
          if (id === "ticket-queues" && pageCounts.queueTickets) badge = `<span class="nav-badge">${pageCounts.queueTickets}</span>`;
          if (id === "freight" && pageCounts.freight) badge = `<span class="nav-badge">${pageCounts.freight}</span>`;
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
<a class="brand-lockup" href="index.html" aria-label="MasterFlow home">
  <span class="brand-mark">
    <img src="assets/images/master-logo.png" alt="Master Electronics logo">
  </span>
  <span class="brand-copy">
    <strong>MasterFlow</strong>
    <small>Powered by Master Electronics</small>
  </span>
</a>
        <div class="page-context">
          <span class="page-context-text"><h1>${escapeHtml(pageDefinition.title)}</h1><p>${escapeHtml(pageDefinition.subtitle)}</p></span>
        </div>
      </div>
      <div class="topbar-right">
        <label class="role-control" title="Prototype only. Production access would come from SSO permissions.">
          <span>Demo view</span>
          <select id="roleSelect" aria-label="Choose prototype role">
            <option value="requester"${role === "requester" ? " selected" : ""}>Regular user</option>
            <option value="receiver"${role === "receiver" ? " selected" : ""}>Ticket receiver</option>
            <option value="admin"${role === "admin" ? " selected" : ""}>Administrator</option>
          </select>
        </label>
        <button class="icon-button" type="button" title="Notifications" aria-label="Notifications">♢</button>
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

  function criticalDialogMarkup() {
    return `
      <dialog id="criticalDialog" aria-labelledby="criticalTitle">
        <form method="dialog" id="criticalForm">
          <div class="dialog-header">
            <div><h2 id="criticalTitle">Shipping is stopped</h2><p>Immediate P1 fast lane. No AI classification gate.</p></div>
            <button class="close-button" value="cancel" aria-label="Close">×</button>
          </div>
          <div class="dialog-body">
            <div class="notice notice-danger"><span>!</span><div><strong>Use this only when shipping or a critical warehouse process is blocked.</strong><p>Submitting notifies Warehouse Systems on-call and operations leadership.</p></div></div>
            <div class="field-row mt-18">
              <div class="field"><label for="criticalLocation">Warehouse or location</label><select class="select" id="criticalLocation" required><option value="">Choose location</option><option>PHX Warehouse</option><option>NY Warehouse</option><option>Customer Service</option><option>Other</option></select></div>
              <div class="field"><label for="criticalProcess">Process stopped</label><select class="select" id="criticalProcess" required><option value="">Choose process</option><option>Order picking</option><option>Packing</option><option>Manifesting</option><option>Receiving</option><option>ERP order entry</option><option>Other</option></select></div>
            </div>
            <div class="field-row mt-12">
              <div class="field"><label for="criticalStarted">When did it start?</label><input class="input" id="criticalStarted" required placeholder="Example: 10 minutes ago"></div>
              <div class="field"><label for="criticalUsers">People or stations affected</label><input class="input" id="criticalUsers" required placeholder="Example: 8 outbound stations"></div>
            </div>
            <div class="field mt-12"><label for="criticalSymptom">What is happening?</label><textarea class="textarea" id="criticalSymptom" required placeholder="Describe the error or blocked step in one or two sentences."></textarea></div>
          </div>
          <div class="dialog-footer">
            <button class="btn btn-secondary" value="cancel">Cancel</button>
            <button class="btn btn-danger" id="submitCritical" value="default">Create P1 and notify on-call</button>
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

  function openCriticalDialog() {
    const dialog = document.getElementById("criticalDialog");
    if (dialog && !dialog.open) dialog.showModal();
  }

  function bindLayoutEvents() {
    document.getElementById("menuButton").addEventListener("click", () => {
      const sidebar = document.getElementById("sidebar");
      if (sidebar.classList.contains("open")) closeSidebar(); else openSidebar();
    });
    document.getElementById("sidebarScrim").addEventListener("click", closeSidebar);

    document.getElementById("roleSelect").addEventListener("change", (event) => {
      const role = Store.setRole(event.target.value);
      window.sessionStorage.setItem("masterflowFlash", `${roleLabels[role]} view enabled. Production access would come from SSO.`);
      window.location.href = safeLanding(role);
    });

    document.querySelectorAll("[data-open-critical]").forEach((button) => button.addEventListener("click", openCriticalDialog));

    document.querySelectorAll("[data-reset-demo]").forEach((button) => button.addEventListener("click", () => {
      const accepted = window.confirm("Reset all fictional tickets, freight decisions, and prototype settings?");
      if (!accepted) return;
      Store.resetState();
      window.sessionStorage.setItem("masterflowFlash", "Demo data reset to the original fictional scenario.");
      window.location.reload();
    }));

    const criticalForm = document.getElementById("criticalForm");
    criticalForm.addEventListener("submit", (event) => {
      const submitter = event.submitter;
      if (!submitter || submitter.id !== "submitCritical") return;
      event.preventDefault();
      if (!criticalForm.reportValidity()) return;
      const location = document.getElementById("criticalLocation").value;
      const process = document.getElementById("criticalProcess").value;
      const started = document.getElementById("criticalStarted").value.trim();
      const users = document.getElementById("criticalUsers").value.trim();
      const symptom = document.getElementById("criticalSymptom").value.trim();
      const ticket = Store.addTicket({
        title: `${process} unavailable at ${location}`,
        description: symptom,
        category: "Warehouse operations outage",
        priority: "P1 - Critical",
        queue: "Warehouse Systems / On-call",
        requester: Store.CURRENT_USER.name,
        status: "New",
        location,
        source: "Shipping is stopped fast lane",
        classificationConfidence: 100,
        routingReason: "Direct P1 fast-lane submission; no AI classification gate.",
        details: { process, started, affectedUsers: users },
        historyText: "P1 created. Warehouse Systems on-call and operations leadership notified."
      });
      document.getElementById("criticalDialog").close();
      criticalForm.reset();
      showToast(`${ticket.number} created. On-call and operations leadership were notified.`);
      window.dispatchEvent(new CustomEvent("masterflow:critical-created", { detail: ticket }));
    });

    window.addEventListener("masterflow:state", () => {
      const sidebar = document.getElementById("sidebar");
      if (!sidebar) return;
      sidebar.querySelectorAll(".nav-group").forEach((node) => node.remove());
      sidebar.insertAdjacentHTML("afterbegin", navMarkup(getRole()));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSidebar();
    });
  }

  function openTicketDialog(ticket) {
    let dialog = document.getElementById("sharedTicketDialog");
    if (!dialog) {
      document.body.insertAdjacentHTML("beforeend", `
        <dialog id="sharedTicketDialog" aria-labelledby="sharedTicketTitle">
          <div class="dialog-header"><div><h2 id="sharedTicketTitle"></h2><p id="sharedTicketSubtitle"></p></div><button class="close-button" type="button" data-close-ticket-dialog aria-label="Close">×</button></div>
          <div class="dialog-body" id="sharedTicketBody"></div>
          <div class="dialog-footer"><button class="btn btn-secondary" type="button" data-close-ticket-dialog>Close</button></div>
        </dialog>`);
      dialog = document.getElementById("sharedTicketDialog");
      dialog.querySelectorAll("[data-close-ticket-dialog]").forEach((button) => button.addEventListener("click", () => dialog.close()));
    }
    document.getElementById("sharedTicketTitle").textContent = `${ticket.number} - ${ticket.title}`;
    document.getElementById("sharedTicketSubtitle").textContent = `${ticket.queue} · ${ticket.status}`;
    const history = (ticket.history || []).slice().reverse().map((item) => `<div class="list-row"><div><div class="list-title">${escapeHtml(item.text)}</div><div class="list-meta"><span>${escapeHtml(formatDate(item.at))}</span></div></div></div>`).join("");
    document.getElementById("sharedTicketBody").innerHTML = `
      <div class="detail-grid">
        <div class="detail-cell"><small>Priority</small><strong><span class="badge ${priorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span></strong></div>
        <div class="detail-cell"><small>Assigned team</small><strong>${escapeHtml(ticket.queue)}</strong></div>
        <div class="detail-cell"><small>Assignee</small><strong>${escapeHtml(ticket.assignee || "Unassigned")}</strong></div>
        <div class="detail-cell"><small>Requester</small><strong>${escapeHtml(ticket.requester)}</strong></div>
        <div class="detail-cell"><small>Location</small><strong>${escapeHtml(ticket.location)}</strong></div>
        <div class="detail-cell"><small>SLA due</small><strong>${escapeHtml(formatDate(ticket.slaDueAt))}</strong></div>
      </div>
      <div class="dialog-section"><h3>Description</h3><p class="small muted">${escapeHtml(ticket.description || "No description provided.")}</p></div>
      <div class="dialog-section"><h3>Routing explanation</h3><div class="notice notice-info"><div><strong>${escapeHtml(ticket.classificationConfidence)}% classification confidence</strong><p>${escapeHtml(ticket.routingReason)}</p></div></div></div>
      <div class="dialog-section"><h3>Timeline</h3><div class="list">${history || '<p class="muted small">No history yet.</p>'}</div></div>`;
    dialog.showModal();
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
    layoutReady
  };
})();
