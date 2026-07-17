/*
 * Freight savings & decisions reporting (Queue-Manager-only freight page).
 *
 * Read-only. Two sources, both freight-specific:
 *   1. Seeded-scenario Master vs. customer savings from Store.getState().freightOpportunities.
 *   2. Recorded CSV-candidate decisions from window.MasterFlowFreightCostSummaryStore
 *      (sessionStorage cache written by freight-optimization.js's writeCostSummaryCache()).
 *
 * Never reads or writes ticketing state. Renders nothing until layout authorizes the page.
 */
(function () {
  "use strict";

  var Store = window.MasterFlowStore;
  var UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  var Cache = window.MasterFlowFreightCostSummaryStore || null;

  function money(value) {
    return UI.formatMoney(Number(value || 0), 0);
  }

  function renderSeeded() {
    var state = Store.getState();
    var opportunities = state.freightOpportunities || [];
    var isFinal = function (item) { return item.decision === "hold" || item.decision === "release"; };
    var open = opportunities.filter(function (item) { return !isFinal(item); });
    var masterSavings = open.reduce(function (total, item) { return total + Number(item.internalSavings || 0); }, 0);
    var customerSavings = open.reduce(function (total, item) { return total + Number(item.customerSavings || 0); }, 0);
    var held = opportunities.filter(function (item) { return item.decision === "hold"; }).length;
    var released = opportunities.filter(function (item) { return item.decision === "release"; }).length;
    set("fsrSeedMasterSavings", money(masterSavings));
    set("fsrSeedCustomerSavings", money(customerSavings));
    set("fsrSeedHeldCount", String(held));
    set("fsrSeedReleasedCount", String(released));
  }

  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function renderChartBars(container, entries) {
    if (!container) return;
    if (!entries.length) {
      container.innerHTML = '<p class="muted small">No data yet.</p>';
      return;
    }
    var max = Math.max.apply(null, entries.map(function (entry) { return entry.value; }));
    container.innerHTML = entries.map(function (entry) {
      var width = max > 0 ? Math.round(entry.value / max * 100) : 0;
      return '<div class="chart-row"><span>' + UI.escapeHtml(entry.label) + '</span><div class="chart-track"><div class="chart-fill" style="width:' + width + '%"></div></div><strong>' + money(entry.value) + "</strong></div>";
    }).join("");
  }

  function topEntries(map, limit) {
    return Object.keys(map || {})
      .map(function (label) { return { label: label, value: Number(map[label] || 0) }; })
      .filter(function (entry) { return entry.value > 0; })
      .sort(function (a, b) { return b.value - a.value; })
      .slice(0, limit);
  }

  function renderCandidates() {
    var summaryEl = document.getElementById("fsrCandidateSummary");
    var kpis = document.getElementById("fsrCandidateKpis");
    var grid = document.getElementById("fsrBreakdownGrid");
    var historyWrap = document.getElementById("fsrDecisionHistoryWrap");
    var historyBody = document.getElementById("fsrDecisionHistoryBody");
    if (!summaryEl) return;

    var summary = Cache ? Cache.load() : null;
    var history = summary && Array.isArray(summary.decision_history) ? summary.decision_history : [];

    if (!summary || !summary.quoted_count) {
      summaryEl.textContent = "Quote and decide candidates above to populate approved, verified, and denied savings.";
      if (kpis) kpis.hidden = true;
      if (grid) grid.hidden = true;
      if (historyWrap) historyWrap.hidden = true;
      return;
    }

    var approvedCount = history.filter(function (h) { return h.decision_code === "approved"; }).length;
    var deniedCount = history.filter(function (h) { return h.decision_code === "denied"; }).length;

    summaryEl.textContent = summary.quoted_count + " candidate" + (summary.quoted_count === 1 ? "" : "s") +
      " quoted; " + approvedCount + " approved, " + deniedCount + " denied, " +
      (summary.verified_candidate_count || 0) + " verified.";

    if (kpis) kpis.hidden = false;
    set("fsrApprovedSavings", money(summary.total_approved_savings_usd));
    set("fsrVerifiedSavings", money(summary.total_verified_savings_usd));
    set("fsrApprovedCount", String(approvedCount));
    set("fsrDeniedCount", String(deniedCount));

    var byZone = topEntries(summary.approved_savings_by_zone, 8);
    var byCarrier = topEntries(summary.approved_savings_by_carrier, 8);
    if (grid) grid.hidden = !(byZone.length || byCarrier.length);
    renderChartBars(document.getElementById("fsrByZone"), byZone);
    renderChartBars(document.getElementById("fsrByCarrier"), byCarrier);

    if (historyWrap && historyBody) {
      if (!history.length) {
        historyWrap.hidden = true;
      } else {
        historyWrap.hidden = false;
        historyBody.innerHTML = history.slice(0, 30).map(function (entry) {
          var amount = entry.amount_usd == null ? "—" : money(entry.amount_usd);
          var where = [entry.customer_number, entry.destination_display].filter(Boolean).join(" · ");
          return "<tr><td>" + UI.escapeHtml(UI.formatDate(entry.decided_at)) + "</td><td>" + UI.escapeHtml(where || "—") +
            '</td><td><span class="badge ' + UI.statusClass(entry.decision_label || entry.decision_code) + '">' + UI.escapeHtml(entry.decision_label || entry.decision_code) +
            "</span></td><td>" + amount + "</td><td>" + UI.escapeHtml(entry.decided_by || "—") + "</td></tr>";
        }).join("");
      }
    }
  }

  function renderAll() {
    renderSeeded();
    renderCandidates();
  }

  renderAll();
  window.addEventListener("masterflow:state", renderSeeded);
  window.addEventListener("masterflow:freight-quote-draft-updated", renderCandidates);
  window.addEventListener("masterflow:scheduled-order-candidates-built", renderCandidates);
  window.addEventListener("masterflow:scheduled-orders-cleared", renderCandidates);
})();
