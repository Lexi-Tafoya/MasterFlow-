(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  const Troubleshooting =
    window.MasterFlowTroubleshooting;

  if (
    !Store ||
    !UI ||
    !UI.layoutReady ||
    !Troubleshooting
  ) {
    console.error(
      "Help Center dependencies did not load.",
      {
        Store: Boolean(Store),
        UI: Boolean(UI),
        layoutReady: Boolean(
          UI && UI.layoutReady
        ),
        Troubleshooting: Boolean(
          Troubleshooting
        )
      }
    );

    return;
  }

  const elements = {
    grid:
      document.getElementById(
        "articleGrid"
      ),

    search:
      document.getElementById(
        "articleSearch"
      ),

    category:
      document.getElementById(
        "articleCategory"
      ),

    clearButton:
      document.getElementById(
        "clearArticleSearch"
      ),

    recommendedSection:
      document.getElementById(
        "recommendedArticleSection"
      ),

    recommendedContainer:
      document.getElementById(
        "recommendedArticle"
      ),

    resultCount:
      document.getElementById(
        "articleResultCount"
      ),

    availableCount:
      document.getElementById(
        "articleAvailableCount"
      ),

    topScore:
      document.getElementById(
        "articleTopScore"
      ),

    deflectionCount:
      document.getElementById(
        "articleDeflectionCount"
      ),

    escalationCount:
      document.getElementById(
        "articleEscalationCount"
      ),

    dialog:
      document.getElementById(
        "helpTroubleshootingDialog"
      ),

    badges:
      document.getElementById(
        "helpTroubleshootingBadges"
      ),

    title:
      document.getElementById(
        "helpTroubleshootingTitle"
      ),

    summary:
      document.getElementById(
        "helpTroubleshootingSummary"
      ),

    meaning:
      document.getElementById(
        "helpTroubleshootingMeaning"
      ),

    stepsTitle:
      document.getElementById(
        "helpTroubleshootingStepsTitle"
      ),

    progress:
      document.getElementById(
        "helpTroubleshootingProgress"
      ),

    steps:
      document.getElementById(
        "helpTroubleshootingSteps"
      ),

    escalation:
      document.getElementById(
        "helpTroubleshootingEscalation"
      ),

    p1Button:
      document.getElementById(
        "helpTroubleshootingP1"
      ),

    recordGuidance:
      document.getElementById(
        "helpTroubleshootingRecord"
      ),

    outcome:
      document.getElementById(
        "helpTroubleshootingOutcome"
      ),

    scope:
      document.getElementById(
        "helpTroubleshootingScope"
      ),

    identifiers:
      document.getElementById(
        "helpTroubleshootingIdentifiers"
      ),

    notes:
      document.getElementById(
        "helpTroubleshootingNotes"
      ),

    solvedButton:
      document.getElementById(
        "helpTroubleshootingSolved"
      ),

    continueButton:
      document.getElementById(
        "helpTroubleshootingContinue"
      )
  };

  const missingElements =
    Object.entries(elements)
      .filter(([, element]) => !element)
      .map(([name]) => name);

  if (missingElements.length) {
    console.error(
      "Help Center HTML is missing required elements:",
      missingElements
    );

    return;
  }

  let activeGuide = null;
  let activeSession = null;

  function escape(value) {
    return UI.escapeHtml(value);
  }

  function modeLabel(mode) {
    const labels = {
      troubleshooting:
        "Guided troubleshooting",

      preparation:
        "Request checklist",

      safety:
        "Safety checklist",

      guidance:
        "Guidance"
    };

    return labels[mode] || "Guide";
  }

  function populateCategories() {
    const currentValue =
      elements.category.value || "all";

    const categories = [
      ...new Set(
        Store.getState()
          .knowledgeArticles
          .map(
            (article) =>
              article.category
          )
          .filter(Boolean)
      )
    ].sort();

    elements.category.innerHTML = [
      '<option value="all">All categories</option>',

      ...categories.map(
        (name) =>
          `<option value="${escape(
            name
          )}">${escape(name)}</option>`
      )
    ].join("");

    elements.category.value =
      ["all", ...categories].includes(
        currentValue
      )
        ? currentValue
        : "all";
  }

  function renderSummary(results) {
    const metrics =
      Troubleshooting.metrics();

    elements.availableCount.textContent =
      String(
        Store.getState()
          .knowledgeArticles.length
      );

    elements.deflectionCount.textContent =
      String(metrics.solved);

    elements.escalationCount.textContent =
      String(metrics.escalated);

    elements.topScore.textContent =
      elements.search.value.trim() &&
      results.length
        ? `${Math.min(
            99,
            Math.max(
              1,
              Number(
                results[0].score || 0
              )
            )
          )}%`
        : "—";
  }

  function articleMarkup(
    result,
    featured
  ) {
    const article = result.article;
    const guide = result.guide;
    const score = Number(
      result.score || 0
    );

    return `
      <article
        class="article-card${
          featured
            ? " help-article-featured"
            : ""
        }"
      >
        <div class="article-tags">
          <span class="badge badge-blue">
            ${escape(article.category)}
          </span>

          <span class="badge badge-green">
            ${escape(article.helpful)}% helpful
          </span>

          ${
            score > 0
              ? `
                <span class="badge badge-teal">
                  ${Math.min(
                    99,
                    score
                  )}% match
                </span>
              `
              : ""
          }
        </div>

        <h2>${escape(article.title)}</h2>

        <p>${escape(article.summary)}</p>

        <div class="help-article-preview">
          <strong>
            ${guide.steps.length}
            guided step${
              guide.steps.length === 1
                ? ""
                : "s"
            }
          </strong>

          <span>
            ${escape(
              modeLabel(guide.mode)
            )}
            · about
            ${escape(
              guide.estimatedMinutes
            )}
            minute${
              guide.estimatedMinutes === 1
                ? ""
                : "s"
            }
          </span>
        </div>

        <div class="help-article-actions">
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-open-guide="${escape(
              article.id
            )}"
          >
            Open guide
          </button>

          <button
            class="btn btn-secondary btn-sm"
            type="button"
            data-escalate-guide="${escape(
              article.id
            )}"
          >
            Still need help
          </button>
        </div>
      </article>
    `;
  }

  function render() {
    populateCategories();

    const results =
      Troubleshooting.searchArticles(
        elements.search.value.trim(),
        elements.category.value
      );

    renderSummary(results);

    elements.resultCount.textContent =
      `${results.length} article${
        results.length === 1
          ? ""
          : "s"
      }`;

    const best = results[0];

    if (
      elements.search.value.trim() &&
      best &&
      Number(best.score) > 0
    ) {
      elements.recommendedSection.hidden =
        false;

      elements.recommendedContainer.innerHTML =
        articleMarkup(
          best,
          true
        );
    } else {
      elements.recommendedSection.hidden =
        true;

      elements.recommendedContainer.innerHTML =
        "";
    }

    if (!results.length) {
      elements.grid.innerHTML = `
        <div class="card help-empty-state">
          <div class="empty-state">
            <strong>
              No article matched that wording.
            </strong>

            <p>
              MasterFlow can still carry
              your description into a request.
            </p>

            <a
              class="btn btn-primary btn-sm"
              href="index.html"
            >
              Create a request
            </a>
          </div>
        </div>
      `;

      return;
    }

    elements.grid.innerHTML =
      results
        .map(
          (result) =>
            articleMarkup(
              result,
              false
            )
        )
        .join("");
  }

  function checkedSteps() {
    return Array.from(
      elements.steps.querySelectorAll(
        'input[type="checkbox"]:checked'
      )
    )
      .map(
        (checkbox) =>
          checkbox.dataset.stepText
      )
      .filter(Boolean);
  }

  function updateProgress() {
    const checkboxes =
      Array.from(
        elements.steps.querySelectorAll(
          'input[type="checkbox"]'
        )
      );

    const completed =
      checkboxes.filter(
        (checkbox) =>
          checkbox.checked
      ).length;

    elements.progress.textContent =
      `${completed} of ${checkboxes.length} complete`;
  }

  function currentIssueText(article) {
    return (
      elements.search.value.trim() ||
      article.title
    );
  }

  function openGuide(articleId) {
    const guide =
      Troubleshooting.guideForArticle(
        articleId
      );

    const article =
      Store.getState()
        .knowledgeArticles
        .find(
          (item) =>
            item.id === articleId
        );

    if (!guide || !article) {
      UI.showToast(
        "The selected guide could not be opened."
      );

      return;
    }

    activeGuide = guide;

    activeSession =
      Troubleshooting.startSession({
        guide,

        source:
          "help-center",

        issueText:
          currentIssueText(article),

        templateId: ""
      });

    elements.title.textContent =
      guide.title;

    elements.summary.textContent =
      guide.summary;

    elements.meaning.textContent =
      guide.meaning;

    elements.escalation.textContent =
      guide.escalation;

    elements.recordGuidance.textContent =
      guide.record;

    elements.badges.innerHTML = `
      <span class="badge badge-blue">
        ${escape(guide.category)}
      </span>

      <span class="badge badge-teal">
        ${escape(
          modeLabel(guide.mode)
        )}
      </span>

      <span class="badge badge-gray">
        About
        ${escape(
          guide.estimatedMinutes
        )}
        min
      </span>
    `;

    elements.stepsTitle.textContent =
      guide.mode === "preparation"
        ? "Review this checklist"
        : guide.mode === "safety"
          ? "Complete these safety and containment steps"
          : "Try these steps in order";

    elements.steps.innerHTML =
      guide.steps
        .map(
          (step, index) => `
            <label class="troubleshooting-step">
              <input
                type="checkbox"
                data-step-text="${escape(
                  step
                )}"
              >

              <span
                class="troubleshooting-step-number"
              >
                ${index + 1}
              </span>

              <span>
                ${escape(step)}
              </span>
            </label>
          `
        )
        .join("");

    elements.outcome.value = "";
    elements.scope.value = "";
    elements.identifiers.value = "";
    elements.notes.value = "";

    elements.p1Button.hidden =
      !guide.emergency;

    elements.solvedButton.hidden =
      !guide.allowSolved;

    elements.continueButton.textContent =
      guide.allowSolved
        ? "I still need help"
        : "Continue request with checklist";

    updateProgress();

    if (!elements.dialog.open) {
      elements.dialog.showModal();
    }
  }

  function sessionPatch(
    defaultResult
  ) {
    return {
      completedSteps:
        checkedSteps(),

      affectedScope:
        elements.scope.value,

      identifiers:
        elements.identifiers
          .value
          .trim(),

      result:
        elements.outcome.value ||
        defaultResult ||
        "",

      notes:
        elements.notes
          .value
          .trim()
    };
  }

  function prepareRequest(session) {
    Troubleshooting.setPending(
      session
    );

    const prefill = [
      session.issueText
        ? `I still need help with this issue: ${session.issueText}`
        : "I still need help after guided troubleshooting.",

      Troubleshooting.formatForRequest(
        session
      )
    ]
      .filter(Boolean)
      .join("\n\n");

    window.localStorage.setItem(
      "masterflowHomePrefill",
      prefill
    );

    if (session.articleId) {
      window.localStorage.setItem(
        "masterflowKnowledgeSource",
        session.articleId
      );
    }

    window.location.href =
      "index.html";
  }

  function quickEscalate(articleId) {
    const guide =
      Troubleshooting.guideForArticle(
        articleId
      );

    const article =
      Store.getState()
        .knowledgeArticles
        .find(
          (item) =>
            item.id === articleId
        );

    if (!guide || !article) return;

    const started =
      Troubleshooting.startSession({
        guide,

        source:
          "help-center",

        issueText:
          currentIssueText(article),

        templateId: ""
      });

    const session =
      Troubleshooting.finishSession(
        started,

        {
          completedSteps: [],

          result:
            "Guide skipped; employee still needs support."
        },

        "escalated"
      );

    prepareRequest(session);
  }

  function handleCardClick(event) {
    const openButton =
      event.target.closest(
        "[data-open-guide]"
      );

    if (openButton) {
      openGuide(
        openButton.dataset.openGuide
      );

      return;
    }

    const escalateButton =
      event.target.closest(
        "[data-escalate-guide]"
      );

    if (escalateButton) {
      quickEscalate(
        escalateButton.dataset
          .escalateGuide
      );
    }
  }

  elements.grid.addEventListener(
    "click",
    handleCardClick
  );

  elements.recommendedContainer.addEventListener(
    "click",
    handleCardClick
  );

  elements.steps.addEventListener(
    "change",
    updateProgress
  );

  document
    .querySelectorAll(
      "[data-close-help-troubleshooting]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          elements.dialog.close();
        }
      );
    });

  elements.solvedButton.addEventListener(
    "click",
    () => {
      if (
        !activeSession ||
        !activeGuide ||
        !activeGuide.allowSolved
      ) {
        return;
      }

      const session =
        Troubleshooting.finishSession(
          activeSession,

          sessionPatch("Solved"),

          "solved"
        );

      Troubleshooting.clearPending();

      elements.dialog.close();

      render();

      UI.showToast(
        `Issue marked solved after ${session.completedSteps.length} completed step${
          session.completedSteps.length === 1
            ? ""
            : "s"
        }. No ticket was created.`
      );
    }
  );

  elements.continueButton.addEventListener(
    "click",
    () => {
      if (
        !activeSession ||
        !activeGuide
      ) {
        return;
      }

      const defaultResult =
        activeGuide.mode ===
          "preparation" ||
        activeGuide.mode ===
          "safety"
          ? "Information collected"
          : "No change";

      const session =
        Troubleshooting.finishSession(
          activeSession,

          sessionPatch(
            defaultResult
          ),

          "escalated"
        );

      elements.dialog.close();

      prepareRequest(session);
    }
  );

  elements.p1Button.addEventListener(
    "click",
    () => {
      elements.dialog.close();
      UI.openCriticalDialog();
    }
  );

  elements.clearButton.addEventListener(
    "click",
    () => {
      elements.search.value = "";
      elements.category.value = "all";
      render();
      elements.search.focus();
    }
  );

  elements.search.addEventListener(
    "input",
    render
  );

  elements.category.addEventListener(
    "change",
    render
  );

  window.addEventListener(
    "masterflow:troubleshooting",
    render
  );

  render();
})();