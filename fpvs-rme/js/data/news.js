/* ================================================================
 *  НОВОСТИ (Appwrite collection: news)
 *  Поля: slug, date, tag, title, excerpt, body, featured
 *  Фото — из images/news/<slug>/
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";
import { getNewsPhotoUrls } from "../core/images.js";
import { formatNewsDate } from "../core/dates.js";
import { setNews, getNews } from "./news-store.js";
import { openNewsPost } from "../modals/post-modal.js";

export async function loadNews() {
  const grid = document.getElementById("newsGrid");
  if (!grid) return;

  const items = await appwriteList("news", { orderDesc: "date", limit: 100 });

  if (!items.length) {
    grid.innerHTML = `<p style="color:#888">Пока нет новостей.</p>`;
    setNews([]);
    return;
  }

  // Подтягиваем фото из manifest по slug
  const enriched = await Promise.all(
    items.map(async (item) => {
      const gallery = await getNewsPhotoUrls(item.slug);
      return { ...item, gallery };
    })
  );

  setNews(enriched);
  const news = getNews();

  const featured = news.find((n) => n.featured) || news[0];
  const rest = news.filter((n) => n !== featured);

  grid.innerHTML = `
    ${renderNewsCard(featured, true)}
    <div class="side">
      ${rest.slice(0, 2).map((n) => renderNewsCard(n, false)).join("")}
    </div>
  `;

  bindNewsClicks(grid);
}

function renderNewsCard(n, isFeatured) {
  const photos = Array.isArray(n.gallery) ? n.gallery.filter(Boolean) : [];

  if (isFeatured) {
    const collage = photos.length
      ? `<div class="news-collage news-collage--${Math.min(photos.length, 5)}">
           ${renderCollage(photos, n.slug)}
         </div>`
      : "";
    return `
      <article class="main-post news-card" data-news-id="${n.slug}">
        ${collage}
        <div class="news-card__text">
          <label>${formatNewsDate(n)}${n.tag ? " · " + n.tag : ""}</label>
          <h3>${n.title}</h3>
          <p>${n.excerpt || ""}</p>
          <a href="#" data-news-open="${n.slug}">Подробнее →</a>
        </div>
      </article>
    `;
  }

  const thumb = photos.length
    ? `<img class="side-thumb" src="${photos[0]}" alt="" loading="lazy">`
    : `<div class="side-thumb side-thumb--empty"></div>`;

  return `
    <article class="side-card news-card" data-news-id="${n.slug}">
      ${thumb}
      <div class="side-card__text">
        <label>${formatNewsDate(n)}${n.tag ? " · " + n.tag : ""}</label>
        <h3>${n.title}</h3>
        <a href="#" data-news-open="${n.slug}">Подробнее →</a>
      </div>
    </article>
  `;
}

function renderCollage(photos, newsSlug) {
  const MAX = 4;
  const visible = photos.slice(0, MAX);
  const hidden = photos.length - visible.length;

  const img = (src, i, cls = "") =>
    `<img src="${src}" alt="" loading="lazy" class="${cls}"
          data-photo-index="${i}" data-news-photo="${newsSlug}">`;

  if (visible.length === 1) return img(visible[0], 0);
  if (visible.length === 2) return visible.map((src, i) => img(src, i)).join("");
  if (visible.length === 3) {
    return `
      ${img(visible[0], 0, "collage-big")}
      <div class="collage-col">
        ${img(visible[1], 1)}
        ${img(visible[2], 2)}
      </div>
    `;
  }

  return visible.slice(0, 4).map((src, i) => {
    const isLast = i === 3 && hidden > 0;
    return `
      <div class="collage-cell">
        ${img(src, i)}
        ${isLast ? `<span class="collage-more">+${hidden}</span>` : ""}
      </div>
    `;
  }).join("");
}

function bindNewsClicks(root) {
  root.querySelectorAll("[data-news-open]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openNewsPost(el.dataset.newsOpen);
    });
  });

  root.querySelectorAll("[data-news-id]").forEach((card) => {
    card.style.cursor = "pointer";
    card.addEventListener("click", (e) => {
      if (e.target.closest("img[data-news-photo]")) return;
      if (e.target.closest("[data-news-open]")) return;
      openNewsPost(card.dataset.newsId);
    });
  });
}
