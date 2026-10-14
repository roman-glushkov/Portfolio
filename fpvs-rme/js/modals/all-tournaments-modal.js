/* ================================================================
 *  МОДАЛКА "ВСЕ ТУРНИРЫ"
 * ================================================================ */

import { showTournament } from "./tournament-modal.js";

let ALL_TOURNAMENTS = [];

export function showAllTournaments(tournaments) {
    ALL_TOURNAMENTS = tournaments;

    const modal = document.getElementById("allTournamentsModal");
    if (!modal) return;

    const list = document.getElementById("atList");
    list.innerHTML = tournaments.map((t, i) => renderRow(t, i)).join("");

    // Клик по строке → открыть галерею турнира
    list.querySelectorAll("[data-open-all-tournament]").forEach((el) => {
        el.addEventListener("click", () => {
            const idx = parseInt(el.dataset.openAllTournament, 10);
            // Закрываем эту модалку и открываем модалку конкретного турнира
            closeAllTournaments();
            setTimeout(() => showTournament(ALL_TOURNAMENTS[idx]), 100);
        });
    });

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    modal.querySelectorAll("[data-all-close]").forEach((el) => {
        el.onclick = closeAllTournaments;
    });
}

export function closeAllTournaments() {
    const modal = document.getElementById("allTournamentsModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

export function isAllTournamentsOpen() {
    return document.getElementById("allTournamentsModal")?.classList.contains("open") || false;
}

function renderRow(t, index) {
    const date = safeText(t.date);
    const title = safeText(t.title);
    const tag = safeText(t.tag);
    const cover = t.cover || "";
    const photosCount = (t.photos || []).length;

    return `
    <article class="at-row" data-open-all-tournament="${index}">
      <div class="at-row__cover">
        ${cover ? `<img src="${cover}" alt="" loading="lazy">` : ""}
      </div>
      <div class="at-row__text">
        ${tag ? `<small>${tag}</small>` : ""}
        <h3>${title}</h3>
        ${date ? `<span>${date}</span>` : ""}
      </div>
      <div class="at-row__count">
        <b>${photosCount}</b>
        <small>фото</small>
      </div>
    </article>
  `;
}

function safeText(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}
