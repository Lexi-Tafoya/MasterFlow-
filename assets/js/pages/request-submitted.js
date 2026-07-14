(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const ticketId = window.sessionStorage.getItem("masterflowSmartLastTicketId");
  const ticket = ticketId ? Store.getTicket(ticketId) : null;

  if (!ticket) {
    window.sessionStorage.setItem("masterflowFlash", "No newly submitted request was found. Your existing requests are still available here.");
    window.location.replace("my-tickets.html");
    return;
  }

  document.getElementById("ticketNumber").textContent = ticket.number;
  document.getElementById("ticketTitle").textContent = ticket.title;
  document.getElementById("ticketQueue").textContent = ticket.queue;
  document.getElementById("ticketPriority").textContent = ticket.priority;
  document.getElementById("ticketSla").textContent = UI.formatDate(ticket.slaDueAt);
  document.getElementById("ticketRequester").textContent = ticket.requester;
  document.getElementById("ticketSource").textContent = ticket.source;
  document.getElementById("ticketStatus").textContent = ticket.status;
  document.getElementById("ticketStatus").className = `badge ${UI.statusClass(ticket.status)}`;
  document.getElementById("confirmationCopy").textContent = `${ticket.queue} received the request. The current response target is ${UI.formatDate(ticket.slaDueAt)}.`;
})();
