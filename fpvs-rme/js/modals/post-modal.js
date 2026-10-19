/* ================================================================
 *  МОДАЛКА-ПОСТ
 * ================================================================ */

import { formatNewsDate } from "../core/dates.js";
import { findNewsById } from "../data/news-store.js";
import { openLightbox } from "../ui/lightbox.js";
import { modalOpened, modalClosed } from "../core/modals.js";

let readTimer = null;

export function openNewsPost(slug) {
  const post = findNewsById(slug);
  if (!post) return;

  const modal = document.getElementById("postModal");
  if (!modal) return;

  document.getElementById("pmTag").textContent = post.tag || "";
  document.getElementById("pmTitle").textContent = post.title || "";
  document.getElementById("pmDate").textContent = formatNewsDate(post);

  const bodyEl = document.getElementById("pmBody");
  const bodyLines = String(post.body || "").split("\n\n");
  bodyEl.innerHTML = bodyLines
    .map((p) => `<p>${renderInlineMarkup(p)}</p>`)
    .join("");

  const photos = (post.gallery || []).filter(Boolean);
  const galEl = document.getElementById("pmGallery");

  if (!photos.length) {
    galEl.innerHTML = "";
    galEl.style.display = "none";
  } else {
    galEl.style.display = "";
    galEl.className = "post-modal__gallery";
    galEl.innerHTML = photos
      .map(
        (src, i) => `
      <figure data-photo-index="${i}">
        <img src="${src}" alt="" loading="lazy">
      </figure>
    `
      )
      .join("");

    galEl.querySelectorAll("figure").forEach((fig) => {
      fig.style.cursor = "zoom-in";
      fig.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(fig.dataset.photoIndex, 10) || 0;
        openNewsGallery(post.slug, idx);
      });
    });
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelectorAll("[data-post-close]").forEach((el) => {
    el.onclick = closePostModal;
  });

  modalOpened("post");

  // Таймер 7 секунд на прочтение
  clearTimeout(readTimer);
  readTimer = setTimeout(() => {
    if (window.trackNewsRead) {
      window.trackNewsRead(post.slug);
    }
  }, 7000);
}

export function closePostModal() {
  const modal = document.getElementById("postModal");
  if (!modal || !modal.classList.contains("open")) return;

  clearTimeout(readTimer);

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  modalClosed("post");
}

export function isPostModalOpen() {
  return (
    document.getElementById("postModal")?.classList.contains("open") || false
  );
}

function openNewsGallery(slug, startIndex = 0) {
  const post = findNewsById(slug);
  if (!post) return;
  const photos = (post.gallery || []).filter(Boolean);
  if (!photos.length) return;
  const lbPhotos = photos.map((src) => ({
    src,
    albumTitle: post.title,
    date: post.date,
  }));
  openLightbox(lbPhotos, startIndex);
}

function renderInlineMarkup(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br>");
}
