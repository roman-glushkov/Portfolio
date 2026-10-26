/* ================================================================
 *  НОВОСТИ (Appwrite collection: news)
 *  - Берем только 3 последние новости
 *  - Фото грузим из Appwrite Storage (bucket: news-images)
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";
import { formatNewsDate } from "../core/dates.js";
import { setNews, getNews } from "./news-store.js";
import { openNewsPost } from "../modals/post-modal.js";
import { openLightbox } from "../ui/lightbox.js";

export async function loadNews() {
  const grid = document.getElementById("newsGrid");
  if (!grid) return;

  // Берем только 3 последние новости
  const items = await appwriteList("news", { orderDesc: "date", limit: 3 });

  if (!items.length) {
    grid.innerHTML = `<p style="color:#888">Пока нет новостей.</p>`;
    setNews([]);
    return;
  }

  // Формируем ссылки на фото из Appwrite Storage
  const enriched = items.map((item) => {
    // Если в базе есть массив gallery (ID файлов), собираем ссылки
    let photos = [];
    if (item.gallery && item.gallery.length > 0) {
      photos = item.gallery.map((fileId) => getNewsImageUrl(fileId));
    } else if (item.imageId) {
      // На всякий случай поддержка старого поля imageId (одно фото)
      photos = [getNewsImageUrl(item.imageId)];
    }
    return { ...item, gallery: photos };
  });

  setNews(enriched);
  const news = getNews();

  const featured = news[0];
  const rest = news.slice(1, 3);

  grid.innerHTML = `
    ${renderNewsCard(featured, true)}
    <div class="side">
      ${rest.map((n) => renderNewsCard(n, false)).join("")}
    </div>
  `;

  bindNewsClicks(grid);
}

function getNewsImageUrl(fileId) {
  const config = window.APPWRITE_CONFIG;
  if (!config) return "";
  // Используем /download вместо /view
  return `${config.endpoint}/storage/buckets/news-images/files/${fileId}/download?project=${config.projectId}`;
}

function renderNewsCard(n, isFeatured) {
  // Берем все фото из массива gallery (если он есть)
  const photos = Array.isArray(n.gallery) ? n.gallery.filter(Boolean) : [];

  if (isFeatured) {
    // Если фото есть, рисуем коллаж. Если нет — пусто.
    const collage = photos.length
      ? `<div class="news-collage news-collage--${Math.min(photos.length, 5)}">
           ${renderCollage(photos, n.slug)}
         </div>`
      : "";
    return `
      <article class="main-post news-card" data-news-id="${n.slug}">
        ${collage}
        <div class="news-card__text" data-news-text="${
          n.slug
        }" style="cursor: pointer;">
          <label>${formatNewsDate(n)}${n.tag ? " · " + n.tag : ""}</label>
          <h3>${n.title}</h3>
          <p>${n.excerpt || ""}</p>
          <a href="#" data-news-open="${n.slug}">Подробнее →</a>
        </div>
      </article>
    `;
  }

  const thumb = photos.length
    ? `<img class="side-thumb photo-zoomable" src="${photos[0]}" alt="" loading="lazy" data-news-photo="${n.slug}" data-photo-index="0">`
    : `<div class="side-thumb side-thumb--empty"></div>`;

  return `
    <article class="side-card news-card" data-news-id="${n.slug}">
      ${thumb}
      <div class="side-card__text" data-news-text="${
        n.slug
      }" style="cursor: pointer;">
        <label>${formatNewsDate(n)}${n.tag ? " · " + n.tag : ""}</label>
        <h3>${n.title}</h3>
        <a href="#" data-news-open="${n.slug}">Подробнее →</a>
      </div>
    </article>
  `;
}

// Функция для сборки коллажа (такая же, как была раньше)
function renderCollage(photos, newsSlug) {
  const MAX = 4;
  const visible = photos.slice(0, MAX);
  const hidden = photos.length - visible.length;

  const img = (src, i, cls = "") =>
    `<img src="${src}" alt="" loading="lazy" class="${cls} photo-zoomable"
          data-photo-index="${i}" data-news-photo="${newsSlug}">`;

  if (visible.length === 1) return img(visible[0], 0);
  if (visible.length === 2)
    return visible.map((src, i) => img(src, i)).join("");
  if (visible.length === 3) {
    return `
      ${img(visible[0], 0, "collage-big")}
      <div class="collage-col">
        ${img(visible[1], 1)}
        ${img(visible[2], 2)}
      </div>
    `;
  }

  return visible
    .slice(0, 4)
    .map((src, i) => {
      const isLast = i === 3 && hidden > 0;
      return `
      <div class="collage-cell">
        ${img(src, i)}
        ${isLast ? `<span class="collage-more">+${hidden}</span>` : ""}
      </div>
    `;
    })
    .join("");
}

function bindNewsClicks(root) {
  // 1. Клик по фото → лайтбокс
  root.querySelectorAll("img[data-news-photo]").forEach((img) => {
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      const slug = img.dataset.newsPhoto;
      const post = getNews().find((n) => n.slug === slug);
      if (!post) return;

      const photos = (post.gallery || []).filter(Boolean);
      if (!photos.length) return;

      const idx = parseInt(img.dataset.photoIndex, 10) || 0;
      const lbPhotos = photos.map((src) => ({
        src,
        albumTitle: post.title,
        date: post.date,
      }));
      openLightbox(lbPhotos, idx);
    });
  });

  // 2. Клик по тексту → модалка новости
  root.querySelectorAll("[data-news-text]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const slug = el.dataset.newsText;
      openNewsPost(slug);
    });
  });

  // 3. Клик по ссылке "Подробнее"
  root.querySelectorAll("[data-news-open]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openNewsPost(el.dataset.newsOpen);
    });
  });
}
