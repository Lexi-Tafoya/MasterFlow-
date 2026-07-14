(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const form = document.getElementById("adminSettingsForm");
  const routingRules = document.getElementById("routingRules");
  const approvalRules = document.getElementById("approvalRules");

  function populateSettings(settings) {
    document.getElementById("ticketConfidence").value = settings.ticketClassificationThreshold;
    document.getElementById("minimumSavings").value = settings.minimumSavings;
    document.getElementById("manualConfidence").value = settings.manualReviewConfidence;
    document.getElementById("autoConfidence").value = settings.autoActionConfidence;
    document.getElementById("directorThreshold").value = settings.directorApprovalThreshold;
    document.getElementById("p1Response").value = settings.p1ResponseMinutes;
    document.getElementById("normalResponse").value = settings.normalResponseHours;
    document.getElementById("normalResolution").value = settings.normalResolutionHours;
  }

  function renderRules(state) {
    routingRules.innerHTML = state.routingRules.map((rule) => `
      <div class="rule-card">
        <h3>${UI.escapeHtml(rule.name)}</h3>
        <p><strong>When:</strong> ${UI.escapeHtml(rule.condition)}<br><strong>Route to:</strong> ${UI.escapeHtml(rule.route)}</p>
        <div class="rule-footer"><span class="badge ${rule.active ? "badge-green" : "badge-gray"}">${rule.active ? "Active" : "Inactive"}</span><button class="btn btn-secondary btn-sm" type="button" data-toggle-routing="${UI.escapeHtml(rule.id)}">${rule.active ? "Disable" : "Enable"}</button></div>
      </div>`).join("");

    approvalRules.innerHTML = state.approvalRules.map((rule) => `
      <div class="rule-card">
        <h3>${UI.escapeHtml(rule.name)}</h3>
        <p><strong>Approval:</strong> ${UI.escapeHtml(rule.approver)}</p>
        <div class="rule-footer"><span class="badge ${rule.active ? "badge-green" : "badge-gray"}">${rule.active ? "Active" : "Inactive"}</span><button class="btn btn-secondary btn-sm" type="button" data-toggle-approval="${UI.escapeHtml(rule.id)}">${rule.active ? "Disable" : "Enable"}</button></div>
      </div>`).join("");

    routingRules.querySelectorAll("[data-toggle-routing]").forEach((button) => button.addEventListener("click", () => {
      const current = Store.getState().routingRules.find((rule) => rule.id === button.dataset.toggleRouting);
      if (!current) return;
      Store.updateRoutingRule(current.id, { active: !current.active });
      UI.showToast(`${current.name} ${current.active ? "disabled" : "enabled"}.`);
    }));

    approvalRules.querySelectorAll("[data-toggle-approval]").forEach((button) => button.addEventListener("click", () => {
      const current = Store.getState().approvalRules.find((rule) => rule.id === button.dataset.toggleApproval);
      if (!current) return;
      Store.updateApprovalRule(current.id, { active: !current.active });
      UI.showToast(`${current.name} ${current.active ? "disabled" : "enabled"}.`);
    }));
  }

  function render() {
    const state = Store.getState();
    populateSettings(state.settings);
    renderRules(state);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const settings = {
      ticketClassificationThreshold: Number(document.getElementById("ticketConfidence").value),
      minimumSavings: Number(document.getElementById("minimumSavings").value),
      manualReviewConfidence: Number(document.getElementById("manualConfidence").value),
      autoActionConfidence: Number(document.getElementById("autoConfidence").value),
      directorApprovalThreshold: Number(document.getElementById("directorThreshold").value),
      p1ResponseMinutes: Number(document.getElementById("p1Response").value),
      normalResponseHours: Number(document.getElementById("normalResponse").value),
      normalResolutionHours: Number(document.getElementById("normalResolution").value)
    };
    if (settings.autoActionConfidence < settings.manualReviewConfidence) {
      UI.showToast("Automatic-action confidence must be at least the manual-review confidence.");
      return;
    }
    Store.updateSettings(settings);
    UI.showToast("Prototype rules saved. No developer change was required.");
  });

  document.getElementById("resetSettingsButton").addEventListener("click", () => {
    const accepted = window.confirm("Reset all fictional prototype data and rules?");
    if (!accepted) return;
    Store.resetState();
    UI.showToast("Prototype data and rules reset.");
  });

  window.addEventListener("masterflow:state", render);
  render();
})();
