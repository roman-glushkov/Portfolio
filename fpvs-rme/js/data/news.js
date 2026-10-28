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
import { modalOpened, modalClosed } from "../core/modals.js";

export async function loadNews() {
  const grid = document.getElementById("newsGrid");
  if (!grid) return;

  const items = await appwriteList("news", { limit: 100 });

  if (!items.length) {
    grid.innerHTML = `<p style="color:#888">Пока нет новостей.</p>`;
    setNews([]);
    return;
  }

  // Сортируем по дате (свежие сверху)
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Формируем ссылки на фото для ВСЕХ новостей
  const enriched = items.map((item) => {
    let photos = [];
    if (item.gallery && item.gallery.length > 0) {
      photos = item.gallery.map((fileId) => getNewsImageUrl(fileId));
    }
    return { ...item, gallery: photos };
  });

  // Сохраняем ВСЕ новости (для модалки)
  setNews(enriched);
  const allNews = getNews();

  // Берем только 3 для главной
  const preview = allNews.slice(0, 3);
  const featured = preview[0];
  const rest = preview.slice(1, 3);

  grid.innerHTML = `
    ${renderNewsCard(featured, true)}
    <div class="side">
      ${rest.map((n) => renderNewsCard(n, false)).join("")}
    </div>
  `;

  bindNewsClicks(grid);

  // Кнопка "Все новости"
  const footer = document.getElementById("newsFooter");
  if (footer) {
    if (allNews.length > 3) {
      footer.hidden = false;
      const btn = footer.querySelector("[data-show-all-news]");
      if (btn && !btn.dataset.bound) {
        btn.dataset.bound = "1";
        btn.addEventListener("click", openAllNewsModal);
      }
    } else {
      footer.hidden = true;
    }
  }
}

function getNewsImageUrl(fileId) {
  const config = window.APPWRITE_CONFIG;
  if (!config) return "";
  return `${config.endpoint}/storage/buckets/news-images/files/${fileId}/download?project=${config.projectId}`;
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

  root.querySelectorAll("[data-news-text]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      const slug = el.dataset.newsText;
      openNewsPost(slug);
    });
  });

  root.querySelectorAll("[data-news-open]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openNewsPost(el.dataset.newsOpen);
    });
  });
}

/* ---------- Модалка "Все новости" ---------- */

function openAllNewsModal() {
  const modal = document.getElementById("allNewsModal");
  if (!modal) return;

  const allNews = getNews();
  const list = document.getElementById("allNewsList");

  if (!allNews.length) {
    list.innerHTML = '<p style="color:#888; padding: 20px;">Нет новостей</p>';
  } else {
    list.innerHTML = allNews
      .map(
        (n) => `
      <div class="news-row" data-news-slug="${n.slug}">
        <div class="news-row__date">
          <span>${formatNewsDate(n)}</span>
          ${n.tag ? `<span>· ${n.tag}</span>` : ""}
        </div>
        <div class="news-row__title">${n.title}</div>
        ${n.excerpt ? `<div class="news-row__excerpt">${n.excerpt}</div>` : ""}
      </div>
    `
      )
      .join("");

    list.querySelectorAll(".news-row").forEach((row) => {
      row.addEventListener("click", () => {
        closeAllNewsModal();
        setTimeout(() => openNewsPost(row.dataset.newsSlug), 150);
      });
    });
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  modalOpened("allNews"); // <--- ДОБАВЛЕНО

  modal.querySelectorAll("[data-all-news-close]").forEach((el) => {
    el.onclick = closeAllNewsModal;
  });
}

export function closeAllNewsModal() {
  const modal = document.getElementById("allNewsModal");
  if (!modal || !modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  modalClosed("allNews"); // <--- ДОБАВЛЕНО
}

export function isAllNewsOpen() {
  return (
    document.getElementById("allNewsModal")?.classList.contains("open") || false
  );
}
