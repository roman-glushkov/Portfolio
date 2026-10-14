/* ================================================================
 *  МОДАЛКА "ВСЕ ТУРНИРЫ"
 * ================================================================ */

import { showTournament } from "./tournament-modal.js";
import { prefillLeadForm } from "../forms/lead-form.js";
import { modalOpened, modalClosed } from "../core/modals.js";

let ALL_TOURNAMENTS = [];

export function showAllTournaments(tournaments) {
  ALL_TOURNAMENTS = tournaments;

  const modal = document.getElementById("allTournamentsModal");
  if (!modal) return;

  const list = document.getElementById("atList");
  list.innerHTML = tournaments.map((t, i) => renderRow(t, i)).join("");

  list.querySelectorAll("[data-open-all-tournament]").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.openAllTournament, 10);
      const t = ALL_TOURNAMENTS[idx];
      if (!t) return;

      if (t.isFuture) {
        closeAllTournaments();
        setTimeout(() => {
          prefillLeadForm({
            topic: "Хочу принять участие",
            tournamentSlug: t.slug,
          });
          document.getElementById("contacts")?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else {
        closeAllTournaments();
        setTimeout(() => showTournament(t), 100);
      }
    });
  });

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelectorAll("[data-all-close]").forEach((el) => {
    el.onclick = closeAllTournaments;
  });

  modalOpened("allTournaments");
}

export function closeAllTournaments() {
  const modal = document.getElementById("allTournamentsModal");
  if (!modal || !modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  modalClosed("allTournaments");
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

  const rightHtml = t.isFuture
    ? `<div class="at-row__cta">Принять<br>участие</div>`
    : `<div class="at-row__count">
         <b>${photosCount}</b>
         <small>фото</small>
       </div>`;

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
      ${rightHtml}
    </article>
  `;
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
