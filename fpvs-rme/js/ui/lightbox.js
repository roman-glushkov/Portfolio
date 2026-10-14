/* ================================================================
 *  ЛАЙТБОКС
 *  Управление: клики + клавиатура (← → Esc)
 * ================================================================ */

import { $ } from "../core/dom.js";
import { modalOpened, modalClosed } from "../core/modals.js";

const lightbox = { album: null, index: 0 };
let keyboardBound = false;

export function openLightbox(photos, index) {
  if (!photos || !photos.length) return;
  lightbox.album = photos;
  lightbox.index = index;
  renderLightbox();
  $("#lightbox")?.classList.add("open");
  bindKeyboard();
  modalOpened("lightbox");
}

function renderLightbox() {
  const lb = $("#lightbox");
  if (!lb) return;
  const photo = lightbox.album[lightbox.index];
  lb.querySelector(".lb-img").src = photo.src;
  lb.querySelector(".lb-counter").textContent =
    `${lightbox.index + 1} / ${lightbox.album.length}  ·  ${photo.albumTitle}`;
}

export function closeLightbox() {
  const lb = $("#lightbox");
  if (!lb || !lb.classList.contains("open")) return;
  lb.classList.remove("open");
  modalClosed("lightbox");
}

function nextPhoto() {
  if (!lightbox.album) return;
  lightbox.index = (lightbox.index + 1) % lightbox.album.length;
  renderLightbox();
}

function prevPhoto() {
  if (!lightbox.album) return;
  lightbox.index =
    (lightbox.index - 1 + lightbox.album.length) % lightbox.album.length;
  renderLightbox();
}

export function initLightbox() {
  const lb = $("#lightbox");
  if (!lb) return;

  lb.querySelector(".lb-close").onclick = closeLightbox;
  lb.querySelector(".lb-next").onclick = nextPhoto;
  lb.querySelector(".lb-prev").onclick = prevPhoto;

  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });
}

export function isLightboxOpen() {
  return $("#lightbox")?.classList.contains("open") || false;
}

/* ---------- Клавиатура ---------- */

function bindKeyboard() {
  if (keyboardBound) return;
  keyboardBound = true;

  document.addEventListener("keydown", (e) => {
    if (!isLightboxOpen()) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextPhoto();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevPhoto();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    }
  });
}
