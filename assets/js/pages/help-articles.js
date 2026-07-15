(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const METRICS_KEY = "masterflowKnowledgeMetricsV1";
  const grid = document.getElementById("articleGrid");
  const search = document.getElementById("articleSearch");
  const category = document.getElementById("articleCategory");
  const clearButton = document.getElementById("clearArticleSearch");
  const recommendedSection = document.getElementById("recommendedArticleSection");
  const recommendedContainer = document.getElementById("recommendedArticle");
  const dialog = document.getElementById("articleDialog");

  let activeArticleId = "";

  function readMetrics() {
    try {
      const value = JSON.parse(window.localStorage.getItem(METRICS_KEY) || "null");
      return value && typeof value === "object"
        ? {
            solved: Number(value.solved || 0),
            escalated: Number(value.escalated || 0),
            articleFeedback: value.articleFeedback && typeof value.articleFeedback === "object"
              ? value.articleFeedback
              : {}
          }
        : { solved: 0, escalated: 0, articleFeedback: {} };
    } catch (error) {
      console.warn("Knowledge metrics were reset because they could not be read.", error);
      return { solved: 0, escalated: 0, articleFeedback: {} };
    }
  }

  function writeMetrics(metrics) {
    window.localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
    renderSummary();
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function words(value) {
    return normalize(value)
      .split(" ")
      .filter((word) => word.length > 2);
  }

  function scoreArticle(article, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return 0;

    const title = normalize(article.title);
    const summary = normalize(article.summary);
    const categoryText = normalize(article.category);
    const tags = normalize((article.tags || []).join(" "));
    const steps = normalize((article.steps || []).join(" "));

    let score = 0;
    if (title.includes(normalizedQuery)) score += 80;
    if (summary.includes(normalizedQuery)) score += 45;
    if (tags.includes(normalizedQuery)) score += 55;
    if (steps.includes(normalizedQuery)) score += 25;

    words(normalizedQuery).forEach((word) => {
      if (title.includes(word)) score += 18;
      if (tags.includes(word)) score += 14;
      if (summary.includes(word)) score += 9;
      if (steps.includes(word)) score += 4;
      if (categoryText.includes(word)) score += 5;
    });

    return score;
  }

  function getVisibleArticles() {
    const state = Store.getState();
    const query = search.value.trim();
    const selectedCategory = category.value;

    return state.knowledgeArticles
      .map((article) => ({ article, score: scoreArticle(article, query) }))
      .filter(({ article, score }) => {
        const matchesCategory = selectedCategory === "all" || article.category === selectedCategory;
        const matchesQuery = !query || score > 0;
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => {
        if (query && b.score !== a.score) return b.score - a.score;
        return Number(b.article.helpful || 0) - Number(a.article.helpful || 0);
      });
  }

  function renderSummary() {
    const metrics = readMetrics();
    const total = Store.getState().knowledgeArticles.length;
    const visible = getVisibleArticles();

    document.getElementById("articleAvailableCount").textContent = String(total);
    document.getElementById("articleDeflectionCount").textContent = String(metrics.solved);
    document.getElementById("articleEscalationCount").textContent = String(metrics.escalated);
    document.getElementById("articleTopScore").textContent = search.value.trim() && visible.length
      ? `${Math.min(99, Math.max(1, visible[0].score))}%`
      : "—";
  }

  function articleMarkup(article, score, compact) {
    const helpful = Number(article.helpful || 0);
    return `
      <article class="article-card${compact ? " help-article-featured" : ""}">
        <div class="article-tags">
          <span class="badge badge-blue">${UI.escapeHtml(article.category)}</span>
          <span class="badge badge-green">${UI.escapeHtml(helpful)}% helpful</span>
          ${score > 0 ? `<span class="badge badge-teal">${Math.min(99, score)} match</span>` : ""}
        </div>
        <h2>${UI.escapeHtml(article.title)}</h2>
        <p>${UI.escapeHtml(article.summary)}</p>
        <div class="help-article-preview">
          <strong>${article.steps && article.steps.length ? `${article.steps.length} guided steps` : "Quick guidance"}</strong>
          <span>${UI.escapeHtml((article.tags || []).slice(0, 3).join(" · "))}</span>
        </div>
        <div class="help-article-actions">
          <button class="btn btn-primary btn-sm" type="button" data-open-article="${UI.escapeHtml(article.id)}">Open guide</button>
          <button class="btn btn-secondary btn-sm" type="button" data-use-article="${UI.escapeHtml(article.id)}">Still need help</button>
        </div>
      </article>
    `;
  }

  function bindArticleButtons(container) {
    container.querySelectorAll("[data-open-article]").forEach((button) => {
      button.addEventListener("click", () => openArticle(button.dataset.openArticle));
    });

    container.querySelectorAll("[data-use-article]").forEach((button) => {
      button.addEventListener("click", () => startRequestFromArticle(button.dataset.useArticle));
    });
  }

  function renderRecommended(items) {
    const query = search.value.trim();
    if (!query || !items.length || items[0].score <= 0) {
      recommendedSection.hidden = true;
      recommendedContainer.innerHTML = "";
      return;
    }

    recommendedSection.hidden = false;
    recommendedContainer.innerHTML = articleMarkup(items[0].article, items[0].score, true);
    bindArticleButtons(recommendedContainer);
  }

  function render() {
    const items = getVisibleArticles();
    renderRecommended(items);
    renderSummary();
    document.getElementById("articleResultCount").textContent = `${items.length} article${items.length === 1 ? "" : "s"}`;

    if (!items.length) {
      grid.innerHTML = `
        <div class="card help-empty-state">
          <div class="empty-state">
            <strong>No article matched that wording.</strong>
            <p>MasterFlow can still carry your description directly into a new request.</p>
            <a class="btn btn-primary btn-sm" href="index.html">Create a request</a>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(({ article, score }) => articleMarkup(article, score, false)).join("");
    bindArticleButtons(grid);
  }

  function openArticle(articleId) {
    const article = Store.getState().knowledgeArticles.find((item) => item.id === articleId);
    if (!article) return;

    activeArticleId = article.id;
    document.getElementById("articleDialogTitle").textContent = article.title;
    document.getElementById("articleDialogSummary").textContent = article.summary;
    document.getElementById("articleDialogTags").innerHTML = `
      <span class="badge badge-blue">${UI.escapeHtml(article.category)}</span>
      <span class="badge badge-green">${UI.escapeHtml(article.helpful)}% helpful</span>
    `;
    document.getElementById("articleDialogSteps").innerHTML = (article.steps || [])
      .map((step) => `<li>${UI.escapeHtml(step)}</li>`)
      .join("") || "<li>Follow the guidance provided in the article summary.</li>";

    if (!dialog.open) dialog.showModal();
  }

  function recordFeedback(articleId, outcome) {
    const metrics = readMetrics();
    const articleFeedback = metrics.articleFeedback[articleId] || { solved: 0, escalated: 0 };

    if (outcome === "solved") {
      metrics.solved += 1;
      articleFeedback.solved += 1;
    } else {
      metrics.escalated += 1;
      articleFeedback.escalated += 1;
    }

    metrics.articleFeedback[articleId] = articleFeedback;
    writeMetrics(metrics);
  }

  function startRequestFromArticle(articleId) {
    const article = Store.getState().knowledgeArticles.find((item) => item.id === articleId);
    if (!article) return;

    recordFeedback(article.id, "escalated");
    window.localStorage.setItem(
      "masterflowHomePrefill",
      `I tried the steps in "${article.title}" but I still need help. ${search.value.trim()}`.trim()
    );
    window.localStorage.setItem("masterflowKnowledgeSource", article.id);
    window.location.href = "index.html";
  }

  document.querySelectorAll("[data-close-article-dialog]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });

  document.getElementById("articleSolvedButton").addEventListener("click", () => {
    if (!activeArticleId) return;
    recordFeedback(activeArticleId, "solved");
    dialog.close();
    UI.showToast("Marked as solved. No ticket was created.");
  });

  document.getElementById("articleNeedHelpButton").addEventListener("click", () => {
    if (!activeArticleId) return;
    dialog.close();
    startRequestFromArticle(activeArticleId);
  });

  clearButton.addEventListener("click", () => {
    search.value = "";
    category.value = "all";
    render();
    search.focus();
  });

  search.addEventListener("input", render);
  category.addEventListener("change", render);
  render();
})();
