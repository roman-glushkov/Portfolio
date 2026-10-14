/* ================================================================
 *  МОДАЛКА АЛЬБОМА
 * ================================================================ */

import { formatDate } from "../core/dates.js";
import { openLightbox } from "../ui/lightbox.js";

export function showAlbum(album) {
  if (!album) return;
  const modal = document.getElementById("albumModal");
  if (!modal) return;

  document.getElementById("amTitle").textContent = album.title;
  document.getElementById("amMeta").textContent =
    `Турнир: ${formatDate(album.tournamentDate)} · ${album.photos.length} фото`;

  const photos = album.photos.map((p) => ({
    src: `${album.folder}/${p}`,
    albumTitle: album.title,
    date: album.tournamentDate,
  }));

  const grid = document.getElementById("amGrid");
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

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelectorAll("[data-album-close]").forEach((el) => {
    el.onclick = closeAlbumModal;
  });
}

export function closeAlbumModal() {
  const modal = document.getElementById("albumModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

export function isAlbumModalOpen() {
  return document.getElementById("albumModal")?.classList.contains("open") || false;
}
