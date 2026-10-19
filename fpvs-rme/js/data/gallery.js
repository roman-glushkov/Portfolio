/* ================================================================
 *  ГАЛЕРЕЯ — сборка всех фото проекта с датами
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";
import { modalOpened, modalClosed } from "../core/modals.js";

const PREVIEW_COUNT = 3;

const PINNED = [
  { src: "images/hero.jpg", albumTitle: "ФПВС РМЭ", date: "" },
  { src: "images/logo.jpg", albumTitle: "ФПВС РМЭ", date: "" },
];

let ALL_PHOTOS = [];
let manifestCache = null;

export async function loadGallery() {
  const grid = document.getElementById("galleryGrid");
  const totalEl = document.getElementById("galleryTotal");
  const footer = document.getElementById("galleryFooter");
  if (!grid) return;

  manifestCache = await fetchManifest();
  if (!manifestCache) {
    grid.innerHTML = `<figure style="grid-column:1/-1; padding:40px; text-align:center; color:#888;">Не удалось загрузить manifest.json</figure>`;
    return;
  }

  const [tournaments, news] = await Promise.all([
    appwriteList("tournaments", { orderDesc: "dateSort", limit: 100 }),
    appwriteList("news", { orderDesc: "date", limit: 100 }),
  ]);

  ALL_PHOTOS = buildPhotoList(tournaments, news);

  if (totalEl) totalEl.textContent = ALL_PHOTOS.length.toLocaleString("ru-RU");

  const preview = ALL_PHOTOS.slice(0, PREVIEW_COUNT);
  grid.innerHTML = preview.map((p, i) => renderFigure(p, i)).join("");

  const previewLb = preview.map((p) => ({
    src: p.src,
    albumTitle: p.albumTitle,
    date: p.date,
  }));

  grid.querySelectorAll("figure").forEach((fig) => {
    fig.onclick = () => {
      const idx = parseInt(fig.dataset.photoIndex, 10) || 0;
      import("../ui/lightbox.js").then((m) => m.openLightbox(previewLb, idx));
    };
  });

  if (footer) {
    if (ALL_PHOTOS.length > PREVIEW_COUNT) {
      footer.hidden = false;
      const btn = footer.querySelector("[data-show-all-photos]");
      if (btn && !btn.dataset.bound) {
        btn.dataset.bound = "1";
        btn.addEventListener("click", openAllPhotosModal);
      }
      const count = document.getElementById("galleryTotalCount");
      if (count) count.textContent = ALL_PHOTOS.length;
    } else {
      footer.hidden = true;
    }
  }
}

function buildPhotoList(tournaments, news) {
  const list = [];

  PINNED.forEach((p) => list.push(p));

  tournaments.forEach((t) => {
    const files = getFilesFromManifest(["tournaments", t.slug]);
    if (!files.length) return;

    const cover = files.find((f) => /^cover\.jpg$/i.test(f));
    const ordered = cover
      ? [cover, ...files.filter((f) => f !== cover)]
      : files;

    ordered.forEach((file) => {
      list.push({
        src: `images/tournaments/${t.slug}/${file}`,
        albumTitle: t.title || "Турнир",
        date: t.dateSort || "",
        sortKey: t.dateSort || "",
      });
    });
  });

  news.forEach((n) => {
    const files = getFilesFromManifest(["news", n.slug]);
    if (!files.length) return;

    files.forEach((file) => {
      list.push({
        src: `images/news/${n.slug}/${file}`,
        albumTitle: n.title || "Новость",
        date: n.date || "",
        sortKey: n.date || "",
      });
    });
  });

  const pinned = list.filter((p) => p.sortKey === "");
  const rest = list.filter((p) => p.sortKey !== "");

  rest.sort((a, b) =>
    a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0
  );

  return [...pinned, ...rest];
}

function getFilesFromManifest(parts) {
  if (!manifestCache || !manifestCache.tree) return [];
  let node = manifestCache.tree;
  for (const part of parts) {
    if (!node || !node.dirs || !node.dirs[part]) return [];
    node = node.dirs[part];
  }
  return Array.isArray(node.files) ? node.files : [];
}

async function fetchManifest() {
  try {
    const res = await fetch("images/manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn("[gallery] manifest.json не загружен:", e.message);
    return null;
  }
}

function renderFigure(photo, index) {
  const dateLabel = formatDateShort(photo.date);

  return `
    <figure data-photo-index="${index}">
      <img src="${photo.src}" loading="lazy" alt="${escapeAttr(
    photo.albumTitle
  )}">
      <figcaption>
        <b>${escapeHtml(photo.albumTitle)}</b>
        ${dateLabel ? `<span>${dateLabel}</span>` : ""}
      </figcaption>
    </figure>
  `;
}

function openAllPhotosModal() {
  const modal = document.getElementById("allPhotosModal");
  if (!modal) return;

  const list = document.getElementById("allPhotosList");
  list.innerHTML = ALL_PHOTOS.map((p, i) => renderModalPhoto(p, i)).join("");

  const lbPhotos = ALL_PHOTOS.map((p) => ({
    src: p.src,
    albumTitle: p.albumTitle,
    date: p.date,
  }));

  list.querySelectorAll("figure").forEach((fig) => {
    fig.style.cursor = "zoom-in";
    fig.onclick = () => {
      const idx = parseInt(fig.dataset.photoIndex, 10) || 0;
      import("../ui/lightbox.js").then((m) => m.openLightbox(lbPhotos, idx));
    };
  });

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelectorAll("[data-all-photos-close]").forEach((el) => {
    el.onclick = closeAllPhotosModal;
  });

  modalOpened("allPhotos");
}

export function closeAllPhotosModal() {
  const modal = document.getElementById("allPhotosModal");
  if (!modal || !modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  modalClosed("allPhotos");
}

export function isAllPhotosModalOpen() {
  return (
    document.getElementById("allPhotosModal")?.classList.contains("open") ||
    false
  );
}

function renderModalPhoto(photo, index) {
  const prev = index > 0 ? ALL_PHOTOS[index - 1] : null;
  const showAlbumHeader = !prev || prev.albumTitle !== photo.albumTitle;

  const header = showAlbumHeader
    ? `<div class="all-photos__album">${escapeHtml(photo.albumTitle)}${
        photo.date ? ` <small>${formatDateShort(photo.date)}</small>` : ""
      }</div>`
    : "";

  return `
    ${header}
    <figure data-photo-index="${index}">
      <img src="${photo.src}" alt="" loading="lazy">
    </figure>
  `;
}

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "май",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function formatDateShort(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, , mm, dd] = m;
  return `${parseInt(dd, 10)} ${MONTHS_SHORT[parseInt(mm, 10) - 1]}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

// Обработчик для фото Сергея Канашина
const sergeyImg = document.querySelector("[data-about-photo]");
if (sergeyImg) {
  sergeyImg.addEventListener("click", () => {
    openLightbox(
      [{ src: "images/sergey.jpg", albumTitle: "Сергей Канашин", date: "" }],
      0
    );
  });
}
