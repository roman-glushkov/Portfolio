/* ================================================================
 *  ТУРНИРЫ (Appwrite collection: tournaments)
 *  - Свежие сверху
 *  - Будущие: "Принять участие" → скролл к форме + автозаполнение
 *  - Прошедшие: "Смотреть фото" → модалка галереи
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";
import { getTournamentCover, getTournamentPhotos } from "../core/images.js";
import { showTournament } from "../modals/tournament-modal.js";
import { showAllTournaments } from "../modals/all-tournaments-modal.js";
import { prefillLeadForm } from "../forms/lead-form.js";

let TOURNAMENTS = [];
const PREVIEW_COUNT = 3;

export async function loadTournaments() {
  const grid = document.getElementById("tournamentsGrid");
  if (!grid) return;

  const items = await appwriteList("tournaments", {
    orderDesc: "dateSort",
    limit: 100,
  });

  if (!items.length) {
    grid.innerHTML = `<p style="color:#888">Пока нет турниров.</p>`;
    TOURNAMENTS = [];
    return;
  }

  // Сортируем в JS — свежие сверху
  const sorted = [...items].sort((a, b) => {
    const da = a.dateSort || "";
    const db = b.dateSort || "";
    if (da < db) return 1;
    if (da > db) return -1;
    return 0;
  });

  TOURNAMENTS = await Promise.all(
    sorted.map(async (t) => ({
      ...t,
      cover: await getTournamentCover(t.slug),
      photos: await getTournamentPhotos(t.slug),
      isFuture: isFutureTournament(t.dateSort),
    }))
  );

  const preview = TOURNAMENTS.slice(0, PREVIEW_COUNT);
  const hasMore = TOURNAMENTS.length > PREVIEW_COUNT;

  grid.innerHTML =
    preview.map((t, i) => renderCard(t, i)).join("") +
    (hasMore ? renderMoreCard(TOURNAMENTS.length - PREVIEW_COUNT) : "");

  bindTournamentClicks(grid);

  const moreBtn = grid.querySelector("[data-show-all]");
  if (moreBtn) {
    moreBtn.addEventListener("click", () => showAllTournaments(TOURNAMENTS));
  }
}

/**
 * Будущий ли турнир. dateSort формата "2027-01-10".
 */
function isFutureTournament(dateSort) {
  if (!dateSort) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  return dateSort >= todayIso;
}

function renderCard(t, index) {
  const date = safeText(t.date);
  const title = safeText(t.title);
  const subtitle = safeText(t.subtitle);
  const tag = safeText(t.tag);

  const imgHtml = t.cover
    ? `<img src="${t.cover}" alt="${escapeAttr(title)}" loading="lazy">`
    : "";

  const subtitleHtml = subtitle ? `<p>${subtitle}</p>` : "";
  const tagHtml = tag ? `<b>${tag}</b>` : "";

  // Будущий турнир → "Принять участие"; прошедший → "Смотреть фото"
  let linkHtml;
  if (t.isFuture) {
    linkHtml = `<a href="#contacts" data-participate="${index}">Принять участие →</a>`;
  } else {
    linkHtml = `<a href="#" data-open-tournament="${index}">Смотреть фото →</a>`;
  }

  return `
    <article data-tournament-index="${index}">
      ${imgHtml}
      <div>
        ${date ? `<label>${date}</label>` : ""}
        <h3>${title}</h3>
        ${subtitleHtml}
        ${tagHtml}
        ${linkHtml}
      </div>
    </article>
  `;
}

function renderMoreCard(remaining) {
  return `
    <article class="show-all-card" data-show-all>
      <div class="show-all-inner">
        <span class="show-all-plus">+${remaining}</span>
        <b>Все турниры</b>
        <small>Открыть список →</small>
      </div>
    </article>
  `;
}

function bindTournamentClicks(root) {
  // "Смотреть фото" → модалка
  root.querySelectorAll("[data-open-tournament]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = parseInt(el.dataset.openTournament, 10);
      showTournament(TOURNAMENTS[idx]);
    });
  });

  // "Принять участие" → скролл + автозаполнение формы
  root.querySelectorAll("[data-participate]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = parseInt(el.dataset.participate, 10);
      const t = TOURNAMENTS[idx];
      if (!t) return;

      prefillLeadForm({
        topic: "Хочу принять участие",
        tournamentSlug: t.slug,
      });

      // Скролл к форме
      const target = document.getElementById("contacts");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Клик по всей карточке
  root.querySelectorAll("[data-tournament-index]").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const idx = parseInt(card.dataset.tournamentIndex, 10);
      const t = TOURNAMENTS[idx];
      if (!t) return;

      if (t.isFuture) {
        // Будущий — открываем форму
        prefillLeadForm({
          topic: "Хочу принять участие",
          tournamentSlug: t.slug,
        });
        document.getElementById("contacts")?.scrollIntoView({ behavior: "smooth" });
      } else {
        // Прошедший — открываем галерею
        showTournament(t);
      }
    });
  });
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getTournaments() {
  return TOURNAMENTS;
}
