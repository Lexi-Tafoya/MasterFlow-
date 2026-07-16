(function () {
  "use strict";

  // Judge-facing summary page. Everything here is presentation-only: it fills a
  // handful of live metric tiles from the shared prototype state and never
  // mutates anything. The HTML ships with sensible static defaults, so if the
  // store is unavailable the page still reads correctly.

  const Store = window.MasterFlowStore;
  if (!Store) {
    console.error("Project summary could not read shared state; showing static defaults.");
    return;
  }

  const FEEDBACK_KEY = "masterflowFlowFeedbackV1";
  const PROPOSAL_KEY = "masterflowFlowProposalsV1";
  const CLOSED_STATUSES = ["Resolved", "Closed", "Cancelled"];

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setMeta(id, value, tone) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = value;
    node.classList.remove("good", "warn", "danger");
    if (tone) node.classList.add(tone);
  }

  // Reads a localStorage array written by the flow-feedback / governance pages.
  // Returns [] on any missing or malformed value so counts never show NaN.
  function readArray(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn(`Project summary could not read ${key}.`, error);
      return [];
    }
  }

  function isClosed(ticket) {
    return CLOSED_STATUSES.includes(ticket.status);
  }

  function isP1(ticket) {
    return String(ticket.priority || "").startsWith("P1");
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function render() {
    let state;
    try {
      state = Store.getState();
    } catch (error) {
      console.error("Project summary could not load state.", error);
      return;
    }

    const tickets = Array.isArray(state.tickets) ? state.tickets : [];
    const settings = state.settings || {};

    // Active requests
    const openTickets = tickets.filter((ticket) => !isClosed(ticket));
    setText("mfActiveRequests", String(openTickets.length));
    setText("mfActiveRequestsMeta", `${tickets.length} total request${tickets.length === 1 ? "" : "s"} on record`);

    // Average classification confidence (only over tickets that carry a score)
    const scored = tickets
      .map((ticket) => Number(ticket.classificationConfidence))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (scored.length) {
      const average = Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length);
      const tone = average >= 85 ? "good" : average >= 70 ? "warn" : "danger";
      setText("mfAvgConfidence", `${average}%`);
      setMeta("mfAvgConfidenceMeta", `Across ${scored.length} classified request${scored.length === 1 ? "" : "s"}`, tone);
    } else {
      setText("mfAvgConfidence", "—");
      setMeta("mfAvgConfidenceMeta", "No classified requests yet", null);
    }

    // Active P1 incidents (open only)
    const activeP1 = openTickets.filter(isP1).length;
    setText("mfActiveP1", String(activeP1));
    if (activeP1 > 0) {
      setMeta("mfActiveP1Meta", "Immediate response required", "danger");
    } else {
      setMeta("mfActiveP1Meta", "No critical outages active", "good");
    }

    // Governed improvements + feedback / proposal pipeline
    const feedback = readArray(FEEDBACK_KEY);
    const proposals = readArray(PROPOSAL_KEY);
    const published = proposals.filter((proposal) => proposal && proposal.status === "published").length;
    const inReview = proposals.filter((proposal) => proposal && proposal.status === "pending-approval").length;
    setText("mfPublished", String(published));
    setMeta(
      "mfPublishedMeta",
      `${feedback.length} feedback · ${inReview} in governance review`,
      published > 0 ? "good" : null
    );

    // Stated business baseline
    if (Number.isFinite(Number(settings.annualServiceNowCost))) {
      setText("mfServiceNowCost", formatMoney(settings.annualServiceNowCost));
    }
  }

  render();

  // Keep the tiles current if demo data is reset or changed elsewhere.
  window.addEventListener("masterflow:state", render);
})();
