/* ================================================================
 *  ТУРНИРЫ (Appwrite collection: tournaments)
 *  3 свежих + компактная кнопка "Все турниры"
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";
import { getTournamentCover, getTournamentPhotos } from "../core/images.js";
import { showTournament } from "../modals/tournament-modal.js";
import { showAllTournaments } from "../modals/all-tournaments-modal.js";

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

  TOURNAMENTS = await Promise.all(
    items.map(async (t) => ({
      ...t,
      cover: await getTournamentCover(t.slug),
      photos: await getTournamentPhotos(t.slug),
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

function renderCard(t, index) {
  const date = safeText(t.date);
  const title = safeText(t.title);
  const subtitle = safeText(t.subtitle);
  const tag = safeText(t.tag);
  const linkText = safeText(t.linkText);

  const imgHtml = t.cover
    ? `<img src="${t.cover}" alt="${escapeAttr(title)}" loading="lazy">`
    : "";

  const subtitleHtml = subtitle ? `<p>${subtitle}</p>` : "";
  const tagHtml = tag ? `<b>${tag}</b>` : "";
  const linkHref = safeText(t.linkHref);
  const finalLinkText = linkText || "Смотреть фото →";
  const linkHtml = linkHref
    ? `<a href="${escapeAttr(linkHref)}" data-open-tournament="${index}">${finalLinkText}</a>`
    : `<a href="#" data-open-tournament="${index}">${finalLinkText}</a>`;

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

/**
 * Компактная карточка "Все турниры" — четвёртая в сетке.
 * Занимает ту же ячейку, что обычная карточка турнира.
 */
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
  root.querySelectorAll("[data-open-tournament]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = parseInt(el.dataset.openTournament, 10);
      showTournament(TOURNAMENTS[idx]);
    });
  });

  root.querySelectorAll("[data-tournament-index]").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const idx = parseInt(card.dataset.tournamentIndex, 10);
      showTournament(TOURNAMENTS[idx]);
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
