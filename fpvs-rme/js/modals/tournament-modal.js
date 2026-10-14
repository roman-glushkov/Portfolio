/* ================================================================
 *  МОДАЛКА ТУРНИРА (галерея всех фото)
 * ================================================================ */

import { openLightbox } from "../ui/lightbox.js";
import { modalOpened, modalClosed } from "../core/modals.js";

export function showTournament(tournament) {
    if (!tournament) return;
    const modal = document.getElementById("albumModal");
    if (!modal) return;

    document.getElementById("amTitle").textContent = tournament.title;
    document.getElementById("amMeta").textContent =
        `${tournament.date} · ${tournament.photos.length} фото`;

    const photos = tournament.photos.map((src) => ({
        src,
        albumTitle: tournament.title,
        date: tournament.date,
    }));

    const grid = document.getElementById("amGrid");

    if (!photos.length) {
        grid.innerHTML = `<p style="padding:20px; color:#888;">Фото пока нет.</p>`;
    } else {
        grid.innerHTML = photos.map((p, i) => `
      <figure data-photo-index="${i}">
        <img src="${p.src}" alt="" loading="lazy">
      </figure>
    `).join("");

        grid.querySelectorAll("figure").forEach((fig) => {
            fig.style.cursor = "zoom-in";
            fig.onclick = () => {
                const idx = parseInt(fig.dataset.photoIndex, 10) || 0;
                openLightbox(photos, idx);
            };
        });
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    modal.querySelectorAll("[data-album-close]").forEach((el) => {
        el.onclick = closeTournamentModal;
    });

    modalOpened("tournament");
}

export function closeTournamentModal() {
    const modal = document.getElementById("albumModal");
    if (!modal || !modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    modalClosed("tournament");
}

export function isTournamentModalOpen() {
    return document.getElementById("albumModal")?.classList.contains("open") || false;
}
