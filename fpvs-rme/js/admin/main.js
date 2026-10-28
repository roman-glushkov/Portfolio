/* Independent admin-panel entry point. */
import { loadPartials } from "../core/partials.js";
import { initAuth } from "./auth.js";
import { initStatsControls, initStatsSlider, loadStats } from "./stats.js";
import { initLeadModal } from "./lead-modal.js";
import { loadLeads } from "./leads.js";
import { config, db, Query } from "./appwrite-client.js";
import { initBrackets } from "./brackets.js";
import { initNews, closeNewsModal, isNewsOpen } from "./news.js";
import {
  initTournaments,
  closeTournamentsModal,
  isTournamentsOpen,
} from "./tournaments-editor.js";
import { registerModal } from "../core/modals.js";

async function loadNewsStats() {
  const wrap = document.getElementById("newsStatsWrap");
  if (!wrap) return;

  try {
    const viewsRes = await db.listDocuments(config.databaseId, "news_views", [
      Query.limit(5000),
    ]);
    const views = viewsRes.documents || [];

    const counts = {};
    views.forEach((v) => {
      counts[v.newsSlug] = (counts[v.newsSlug] || 0) + 1;
    });

    const newsRes = await db.listDocuments(config.databaseId, "news", [
      Query.limit(100),
    ]);
    const news = newsRes.documents || [];

    if (!news.length) {
      wrap.innerHTML = '<div class="empty-state">Нет новостей</div>';
      return;
    }

    const rows = news
      .map((n) => ({
        title: n.title,
        slug: n.slug,
        count: counts[n.slug] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    wrap.innerHTML = `<table>
      <thead><tr>
        <th>Название новости</th>
        <th style="text-align: center; width: 150px;">Прочитали (чел.)</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `
          <tr>
            <td>${r.title}</td>
            <td style="text-align: center; font-weight: 700; font-size: 16px; color: #2d7764;">
              ${r.count}
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>`;
  } catch (e) {
    console.error("News stats error:", e);
    wrap.innerHTML =
      '<div class="empty-state">Не удалось загрузить статистику</div>';
  }
}

await loadPartials();
initStatsControls();
initStatsSlider();
initLeadModal();
initBrackets();
initNews();
initTournaments();

// Регистрируем модалки для Esc и кнопки "Назад"
registerModal("news", closeNewsModal, isNewsOpen);
registerModal("tournaments", closeTournamentsModal, isTournamentsOpen);

initAuth(() => {
  loadStats();
  loadLeads();
  loadNewsStats();
});

// Esc закрывает открытую модалку (в админке)
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (isNewsOpen()) return closeNewsModal();
  if (isTournamentsOpen()) return closeTournamentsModal();
});
