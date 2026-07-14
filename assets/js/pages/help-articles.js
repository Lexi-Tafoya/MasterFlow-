(function () {
  "use strict";

  const Store = window.MasterFlowStore;
  const UI = window.MasterFlowUI;
  if (!Store || !UI || !UI.layoutReady) return;

  const grid = document.getElementById("articleGrid");
  const search = document.getElementById("articleSearch");
  const category = document.getElementById("articleCategory");

  function render() {
    const state = Store.getState();
    const query = search.value.trim().toLowerCase();
    const selectedCategory = category.value;
    const articles = state.knowledgeArticles.filter((article) => {
      const haystack = `${article.title} ${article.category} ${article.summary} ${article.tags.join(" ")}`.toLowerCase();
      return (!query || haystack.includes(query)) && (selectedCategory === "all" || article.category === selectedCategory);
    });

    if (!articles.length) {
      grid.innerHTML = '<div class="card" style="grid-column:1/-1"><div class="empty-state">No help articles match that search.</div></div>';
      return;
    }

    grid.innerHTML = articles.map((article) => `
      <article class="article-card">
        <div class="article-tags"><span class="badge badge-blue">${UI.escapeHtml(article.category)}</span><span class="badge badge-green">${UI.escapeHtml(article.helpful)}% helpful</span></div>
        <h2>${UI.escapeHtml(article.title)}</h2>
        <p>${UI.escapeHtml(article.summary)}</p>
        <ol class="small muted" style="padding-left:18px;margin:0;display:grid;gap:5px">${article.steps.map((step) => `<li>${UI.escapeHtml(step)}</li>`).join("")}</ol>
        <div class="article-tags">${article.tags.map((tag) => `<span class="badge badge-gray">${UI.escapeHtml(tag)}</span>`).join("")}</div>
        <button class="btn btn-secondary btn-sm" type="button" data-use-article="${UI.escapeHtml(article.id)}">Still need help? Start a request</button>
      </article>`).join("");

    grid.querySelectorAll("[data-use-article]").forEach((button) => button.addEventListener("click", () => {
      const article = state.knowledgeArticles.find((item) => item.id === button.dataset.useArticle);
      if (!article) return;
      window.localStorage.setItem("masterflowHomePrefill", `I tried the steps in "${article.title}" but I still need help.`);
      window.location.href = "index.html";
    }));
  }

  search.addEventListener("input", render);
  category.addEventListener("change", render);
  render();
})();
