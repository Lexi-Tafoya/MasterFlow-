(function () {
  "use strict";

  const Templates = window.MasterFlowTemplates;
  const UI = window.MasterFlowUI;

  if (!Templates || !UI || !UI.layoutReady) return;

  const list = document.getElementById("templateList");
  const search = document.getElementById("templateSearch");
  const form = document.getElementById("templateForm");
  const editorBody = document.getElementById("templateEditorBody");
  const editorTitle = document.getElementById("editorTitle");
  const templateCount = document.getElementById("templateCount");
  const resetButton = document.getElementById("resetTemplates");

  if (
    !list ||
    !search ||
    !form ||
    !editorBody ||
    !editorTitle ||
    !templateCount ||
    !resetButton
  ) {
    throw new Error("The Request Templates page is missing a required element.");
  }

  let activeId = "printer-ink";
  let workingTemplate = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeId(value) {
    return String(value || "field")
      .replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function allTemplates() {
    return Templates.getAll();
  }

  function ensureActiveTemplate() {
    const templates = allTemplates();

    if (!templates.length) {
      activeId = "";
      workingTemplate = null;
      return;
    }

    if (!templates.some((template) => template.id === activeId)) {
      activeId = templates[0].id;
    }

    workingTemplate = clone(Templates.get(activeId));
  }

  function renderList() {
    const templates = allTemplates();
    const query = search.value.trim().toLowerCase();

    if (!templates.some((template) => template.id === activeId)) {
      activeId = templates[0] ? templates[0].id : "";
      workingTemplate = activeId ? clone(Templates.get(activeId)) : null;
    }

    const visible = templates.filter((template) => {
      const haystack = [
        template.name,
        template.catalog,
        template.queue,
        template.description
      ]
        .join(" ")
        .toLowerCase();

      return !query || haystack.includes(query);
    });

    templateCount.textContent = `${templates.length} configured request types`;

    list.innerHTML = visible.length
      ? visible
          .map(
            (template) => `
              <button
                class="template-list-item${template.id === activeId ? " active" : ""}"
                type="button"
                role="option"
                aria-selected="${template.id === activeId}"
                data-template-id="${UI.escapeHtml(template.id)}"
              >
                <strong>${UI.escapeHtml(template.name)}</strong>
                <small>
                  ${UI.escapeHtml(template.catalog)} ·
                  ${UI.escapeHtml(template.queue)}
                </small>
                <span>
                  ${template.fields.length} fields ·
                  ${template.keywords.length} trigger phrases
                </span>
              </button>
            `
          )
          .join("")
      : '<div class="empty-state">No templates match that search.</div>';

    list
      .querySelectorAll("[data-template-id]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          activeId = button.dataset.templateId;
          workingTemplate = clone(Templates.get(activeId));
          renderList();
          renderEditor();
        });
      });
  }

  function fieldRow(field, index) {
    const options = Array.isArray(field.options)
      ? field.options.filter(Boolean).join(" | ")
      : "";

    return `
      <div class="template-field-row" data-field-index="${index}">
        <div class="template-field-main">
          <div class="field">
            <label for="field-label-${index}">Field label</label>
            <input
              class="input"
              id="field-label-${index}"
              data-field-prop="label"
              value="${UI.escapeHtml(field.label)}"
              required
            >
          </div>

          <div class="field">
            <label for="field-type-${index}">Type</label>
            <select
              class="select"
              id="field-type-${index}"
              data-field-prop="type"
            >
              ${[
                "text",
                "textarea",
                "select",
                "user",
                "date",
                "number",
                "attachment"
              ]
                .map(
                  (type) => `
                    <option
                      value="${type}"
                      ${field.type === type ? "selected" : ""}
                    >${type}</option>
                  `
                )
                .join("")}
            </select>
          </div>

          <div class="field">
            <label for="field-options-${index}">Select options</label>
            <input
              class="input"
              id="field-options-${index}"
              data-field-prop="options"
              value="${UI.escapeHtml(options)}"
              placeholder="Option one | Option two"
            >
          </div>
        </div>

        <div class="template-field-controls">
          <label class="check-control">
            <input
              type="checkbox"
              data-field-prop="required"
              ${field.required ? "checked" : ""}
            >
            Required
          </label>

          <label class="check-control">
            <input
              type="checkbox"
              data-field-prop="locked"
              ${field.locked ? "checked" : ""}
            >
            Locked
          </label>

          <button
            class="btn btn-ghost btn-sm"
            type="button"
            data-remove-field="${index}"
            ${workingTemplate.fields.length <= 1 ? "disabled" : ""}
          >
            Remove
          </button>
        </div>

        <input
          type="hidden"
          data-field-prop="id"
          value="${UI.escapeHtml(field.id || `field-${index + 1}`)}"
        >

        <input
          type="hidden"
          data-field-prop="extractor"
          value="${UI.escapeHtml(field.extractor || "")}"
        >

        <input
          type="hidden"
          data-field-prop="profileValue"
          value="${UI.escapeHtml(field.profileValue || "")}"
        >
      </div>
    `;
  }

  function renderEditor() {
    if (!workingTemplate) {
      editorTitle.textContent = "Choose a request type";
      editorBody.innerHTML = `
        <div class="empty-state">
          No request templates are currently available.
        </div>
      `;
      return;
    }

    editorTitle.textContent = workingTemplate.name;

    editorBody.innerHTML = `
      <div class="field-row">
        <div class="field">
          <label for="templateName">Request name</label>
          <input
            class="input"
            id="templateName"
            value="${UI.escapeHtml(workingTemplate.name)}"
            required
          >
        </div>

        <div class="field">
          <label for="templateCatalog">Catalog / business area</label>
          <input
            class="input"
            id="templateCatalog"
            value="${UI.escapeHtml(workingTemplate.catalog)}"
            required
          >
        </div>
      </div>

      <div class="field-row mt-12">
        <div class="field">
          <label for="templateQueue">Receiving queue</label>
          <input
            class="input"
            id="templateQueue"
            value="${UI.escapeHtml(workingTemplate.queue)}"
            required
          >
          <small>Preserves the team queue that owns this request type.</small>
        </div>

        <div class="field">
          <label for="templatePriority">Default priority</label>
          <select class="select" id="templatePriority">
            ${[
              "P1 - Critical",
              "P2 - High",
              "P3 - Normal",
              "P4 - Low"
            ]
              .map(
                (priority) => `
                  <option ${workingTemplate.priority === priority ? "selected" : ""}>
                    ${priority}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
      </div>

      <div class="field-row mt-12">
        <div class="field">
          <label for="responseSla">Response target (business hours)</label>
          <input
            class="input"
            id="responseSla"
            type="number"
            min="0.25"
            step="0.25"
            value="${Number(workingTemplate.responseSlaHours)}"
            required
          >
        </div>

        <div class="field">
          <label for="resolutionSla">Resolution target (business hours)</label>
          <input
            class="input"
            id="resolutionSla"
            type="number"
            min="1"
            step="1"
            value="${Number(workingTemplate.resolutionSlaHours)}"
            required
          >
        </div>
      </div>

      <div class="field mt-12">
        <label for="templateDescription">Employee-facing description</label>
        <textarea
          class="textarea"
          id="templateDescription"
          required
        >${UI.escapeHtml(workingTemplate.description)}</textarea>
      </div>

      <div class="field mt-12">
        <label for="templateKeywords">AI trigger phrases</label>
        <textarea
          class="textarea"
          id="templateKeywords"
          required
        >${UI.escapeHtml(workingTemplate.keywords.join("\n"))}</textarea>
        <small>Enter one phrase per line.</small>
      </div>

      <div class="template-fields-header mt-24">
        <div>
          <h3>Dynamic fields</h3>
          <p>
            The Smart Request Builder renders these fields and asks only for
            required information it could not pre-fill.
          </p>
        </div>

        <button
          class="btn btn-secondary btn-sm"
          id="addField"
          type="button"
        >
          + Add field
        </button>
      </div>

      <div class="template-fields" id="templateFields">
        ${workingTemplate.fields.map(fieldRow).join("")}
      </div>

      <div class="notice notice-warning mt-18">
        <span>!</span>
        <div>
          <strong>Production governance still applies.</strong>
          <p>
            Live template changes should be permission-controlled,
            validated, versioned, and audited.
          </p>
        </div>
      </div>
    `;

    document.getElementById("addField").addEventListener("click", () => {
      const next = workingTemplate.fields.length + 1;

      workingTemplate.fields.push({
        id: `customField${next}`,
        label: `New field ${next}`,
        type: "text",
        required: false
      });

      renderEditor();
    });

    editorBody
      .querySelectorAll("[data-remove-field]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          workingTemplate.fields.splice(
            Number(button.dataset.removeField),
            1
          );

          renderEditor();
        });
      });
  }

  function collectFields() {
    return Array.from(
      editorBody.querySelectorAll(".template-field-row")
    ).map((row, index) => {
      const control = (property) =>
        row.querySelector(`[data-field-prop="${property}"]`);

      const type = control("type").value;
      const optionInput = control("options").value.trim();

      const field = {
        id: safeId(control("id").value || `field-${index + 1}`),
        label: control("label").value.trim(),
        type,
        required: control("required").checked
      };

      if (control("locked").checked) {
        field.locked = true;
      }

      if (optionInput && type === "select") {
        field.options = [
          "",
          ...optionInput
            .split("|")
            .map((item) => item.trim())
            .filter(Boolean)
        ];
      }

      const extractor = control("extractor").value;
      const profileValue = control("profileValue").value;

      if (extractor) field.extractor = extractor;
      if (profileValue) field.profileValue = profileValue;

      return field;
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!workingTemplate || !form.reportValidity()) {
      return;
    }

    const fields = collectFields();

    if (fields.some((field) => !field.label)) {
      UI.showToast("Every field needs a label.");
      return;
    }

    const updated = {
      ...workingTemplate,
      name: document.getElementById("templateName").value.trim(),
      catalog: document.getElementById("templateCatalog").value.trim(),
      queue: document.getElementById("templateQueue").value.trim(),
      priority: document.getElementById("templatePriority").value,
      responseSlaHours: Number(
        document.getElementById("responseSla").value
      ),
      resolutionSlaHours: Number(
        document.getElementById("resolutionSla").value
      ),
      description: document
        .getElementById("templateDescription")
        .value.trim(),
      keywords: document
        .getElementById("templateKeywords")
        .value.split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
      fields
    };

    workingTemplate = clone(Templates.save(updated));
    activeId = workingTemplate.id;

    renderList();
    renderEditor();

    UI.showToast(
      `${workingTemplate.name} saved. The Smart Request Builder now uses this configuration.`
    );
  });

  search.addEventListener("input", renderList);

  resetButton.addEventListener("click", () => {
    const accepted = window.confirm(
      "Reset all request-template changes in this browser?"
    );

    if (!accepted) return;

    Templates.reset();
    activeId = "printer-ink";
    ensureActiveTemplate();
    renderList();
    renderEditor();

    UI.showToast("Request templates reset to the prototype defaults.");
  });

  ensureActiveTemplate();
  renderList();
  renderEditor();
})();
