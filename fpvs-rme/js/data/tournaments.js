/* ================================================================
 *  ТУРНИРЫ (Appwrite collection: tournaments)
 *  - Клик по фото → лайтбокс
 *  - Клик по тексту → форма (если будущий) или модалка (если прошедший)
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";
import { getTournamentCover, getTournamentPhotos } from "../core/images.js";
import { showTournament } from "../modals/tournament-modal.js";
import { showAllTournaments } from "../modals/all-tournaments-modal.js";
import { prefillLeadForm } from "../forms/lead-form.js";
import { openLightbox } from "../ui/lightbox.js";

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

  // Картинка кликабельна отдельно
  const imgHtml = t.cover
    ? `<img src="${t.cover}" alt="${escapeAttr(
        title
      )}" loading="lazy" class="photo-zoomable" data-tournament-photo="${index}">`
    : "";

  const subtitleHtml = subtitle ? `<p>${subtitle}</p>` : "";
  const tagHtml = tag ? `<b>${tag}</b>` : "";

  let linkHtml;
  if (t.isFuture) {
    linkHtml = `<a href="#contacts" data-participate="${index}">Принять участие →</a>`;
  } else {
    linkHtml = `<a href="#" data-open-tournament="${index}">Смотреть фото →</a>`;
  }

  return `
    <article data-tournament-index="${index}">
      ${imgHtml}
      <div data-tournament-text="${index}" style="cursor: pointer;">
        ${date ? `<label>${date}</label>` : ""}
        <h3>${title}</h3>
        ${subtitleHtml}
        ${tagHtml}
        ${linkHtml}
      </div>
    </article>
  `;
}

function bindTournamentClicks(root) {
  // 1. Клик по фото → лайтбокс
  root.querySelectorAll("[data-tournament-photo]").forEach((img) => {
    img.addEventListener("click", (e) => {
      e.stopPropagation(); // чтобы не открылась модалка
      const idx = parseInt(img.dataset.tournamentPhoto, 10);
      const t = TOURNAMENTS[idx];
      if (t && t.cover) {
        openLightbox([{ src: t.cover, albumTitle: t.title, date: t.date }], 0);
      }
    });
  });

  // 2. Клик по тексту → запись или модалка
  root.querySelectorAll("[data-tournament-text]").forEach((el) => {
    el.addEventListener("click", (e) => {
      // Если кликнули по ссылке внутри текста — не перехватываем
      if (e.target.closest("a")) return;

      const idx = parseInt(el.dataset.tournamentText, 10);
      const t = TOURNAMENTS[idx];
      if (!t) return;

      if (t.isFuture) {
        prefillLeadForm({
          topic: "Хочу принять участие",
          tournamentSlug: t.slug,
        });
        document
          .getElementById("contacts")
          ?.scrollIntoView({ behavior: "smooth" });
      } else {
        showTournament(t);
      }
    });
  });

  // 3. Клики по ссылкам внутри карточек
  root.querySelectorAll("[data-open-tournament]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(el.dataset.openTournament, 10);
      showTournament(TOURNAMENTS[idx]);
    });
  });

  root.querySelectorAll("[data-participate]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(el.dataset.participate, 10);
      const t = TOURNAMENTS[idx];
      if (!t) return;

      prefillLeadForm({
        topic: "Хочу принять участие",
        tournamentSlug: t.slug,
      });
      document
        .getElementById("contacts")
        ?.scrollIntoView({ behavior: "smooth" });
    });
  });
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
