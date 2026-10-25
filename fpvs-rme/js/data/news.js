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

  // Берем только 3 последние новости (как ты и просил)
  const items = await appwriteList("news", { orderDesc: "date", limit: 3 });

  if (!items.length) {
    grid.innerHTML = `<p style="color:#888">Пока нет новостей.</p>`;
    setNews([]);
    return;
  }

  // Формируем ссылки на фото из Appwrite Storage
  const enriched = items.map((item) => {
    const gallery = item.imageId ? [getNewsImageUrl(item.imageId)] : [];
    return { ...item, gallery };
  });

  setNews(enriched);
  const news = getNews();

  // Первая (самая свежая) — большая, остальные две — маленькие
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

/**
 * Возвращает прямую ссылку на файл из Appwrite Storage
 */
function getNewsImageUrl(fileId) {
  const config = window.APPWRITE_CONFIG;
  if (!config) return "";
  return `${config.endpoint}/storage/buckets/news-images/files/${fileId}/view?project=${config.projectId}`;
}

function renderNewsCard(n, isFeatured) {
  const photos = Array.isArray(n.gallery) ? n.gallery.filter(Boolean) : [];

  if (isFeatured) {
    const collage = photos.length
      ? `<div class="news-collage news-collage--1">
           <img src="${photos[0]}" alt="" loading="lazy" class="photo-zoomable" data-news-photo="${n.slug}" data-photo-index="0">
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
