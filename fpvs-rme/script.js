/* ================================================================
 *  §1  УТИЛИТЫ И DOM
 * ================================================================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(text) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (e) {
    console.warn(`[fetchJSON] ${url}:`, e.message);
    return null;
  }
}

/* ================================================================
 *  §2  МОБИЛЬНОЕ МЕНЮ
 * ================================================================ */

function initBurger() {
  const burger = $("#burger");
  const nav = $("#nav");
  if (!burger || !nav) return;

  burger.onclick = () => nav.classList.toggle("open");
  $$("#nav a").forEach((a) => {
    a.onclick = () => nav.classList.remove("open");
  });
}

/* ================================================================
 *  §3  ТУРНИРНАЯ СЕТКА (демо)
 * ================================================================ */

function bracket(type, btn) {
  $$(".tabs button").forEach((x) => x.classList.remove("active"));
  btn.classList.add("active");

  const data = {
    f: `
      <div><small>ГРУППА A</small>
        <p>Смена <b>4</b></p>
        <p>Пляж 12 <b>2</b></p>
        <p>Йошкар-Ола <b>1</b></p>
      </div>
      <div><small>ПОЛУФИНАЛ</small>
        <p class="live">Смена <b>LIVE</b></p>
        <p>Пляж 12 <b>—</b></p>
      </div>
      <div class="final"><small>ФИНАЛ</small>
        <strong>🏆</strong><b>Финал</b>
        <span>Ожидает начала</span>
      </div>`,
    v: `
      <div><small>1/4 ФИНАЛА</small>
        <p>Команда «Марий Эл» <b>21</b></p>
        <p>«Оазис» <b>17</b></p>
        <p>«Волна» <b>21</b></p>
        <p>«Берег» <b>19</b></p>
      </div>
      <div><small>1/2 ФИНАЛА</small>
        <p class="live">Победитель 1 <b>LIVE</b></p>
        <p>Победитель 2 <b>—</b></p>
        <p>Победитель 3 <b>—</b></p>
      </div>
      <div class="final"><small>ФИНАЛ</small>
        <strong>🏆</strong><b>Финал</b>
        <span>Матч ещё не начался</span>
      </div>`,
  };

  const target = $("#bracket");
  if (target) target.innerHTML = data[type] || "";
}

window.bracket = bracket;

/* ================================================================
 *  §4  ФОРМА
 * ================================================================ */

function initForm() {
  const form = $("#form");
  if (!form) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    e.target.reset();
    toast("Сообщение принято в демонстрационном режиме");
  };
}

/* ================================================================
 *  §5  ПЛАВНЫЙ СКРОЛЛ
 * ================================================================ */

function initSmoothScroll() {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (href === "#") return;
      const el = document.querySelector(href);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}

/* ================================================================
 *  §6  ДАТЫ
 * ================================================================ */

const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (m === "01" && d === "01") return y;
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

/* ================================================================
 *  §7  ЛАЙТБОКС
 * ================================================================ */

const lightbox = { album: null, index: 0 };

function openLightbox(photos, index) {
  if (!photos || !photos.length) return;
  lightbox.album = photos;
  lightbox.index = index;
  renderLightbox();
  $("#lightbox")?.classList.add("open");
}

function renderLightbox() {
  const lb = $("#lightbox");
  if (!lb) return;
  const photo = lightbox.album[lightbox.index];
  lb.querySelector(".lb-img").src = photo.src;
  lb.querySelector(".lb-counter").textContent = `${lightbox.index + 1} / ${
    lightbox.album.length
  }  ·  ${photo.albumTitle}`;
}

function closeLightbox() {
  $("#lightbox")?.classList.remove("open");
}

function nextPhoto() {
  lightbox.index = (lightbox.index + 1) % lightbox.album.length;
  renderLightbox();
}

function prevPhoto() {
  lightbox.index =
    (lightbox.index - 1 + lightbox.album.length) % lightbox.album.length;
  renderLightbox();
}

function initLightbox() {
  const lb = $("#lightbox");
  if (!lb) return;

  lb.querySelector(".lb-close").onclick = closeLightbox;
  lb.querySelector(".lb-next").onclick = nextPhoto;
  lb.querySelector(".lb-prev").onclick = prevPhoto;

  lb.addEventListener("click", (e) => {
    if (e.target === lb) closeLightbox();
  });
}

/* ================================================================
 *  §8  ГАЛЕРЕЯ (data/albums.json)
 * ================================================================ */

let ALBUMS = [];

async function loadAlbums() {
  const data = await fetchJSON("data/albums.json");
  ALBUMS = Array.isArray(data) ? data : [];
  renderAlbums();
}

function renderAlbums() {
  const grid = $("#galleryGrid");
  if (!grid) return;

  if (!ALBUMS.length) {
    grid.innerHTML = `
      <figure style="grid-column:1/-1; padding:40px; text-align:center; color:#888;">
        Пока нет ни одного альбома.<br>
        Запусти <code>node generate-albums.js</code> после того, как добавишь папку в images/albums/.
      </figure>`;
    return;
  }

  const allPhotos = ALBUMS.flatMap((album) =>
    (album.photos || []).map((photo) => ({
      src: `${album.folder}/${photo}`,
      albumTitle: album.title,
      date: album.date,
    }))
  );

  const MAX = 12;
  const visible = allPhotos.slice(0, MAX);

  grid.innerHTML = visible
    .map(
      (p, i) => `
      <figure class="${i === 0 ? "big" : ""}" data-index="${i}">
        <img src="${p.src}" loading="lazy" alt="${p.albumTitle}">
        <figcaption>
          <b>${p.albumTitle}</b>
          <span>${formatDate(p.date)}</span>
        </figcaption>
      </figure>`
    )
    .join("");

  grid.querySelectorAll("figure").forEach((fig) => {
    fig.onclick = () => openLightbox(visible, parseInt(fig.dataset.index, 10));
  });

  const totalEl = $("#galleryTotal");
  if (totalEl) totalEl.textContent = allPhotos.length.toLocaleString("ru-RU");

  renderAlbumChips();
}

function renderAlbumChips() {
  const chips = $("#albumChips");
  if (!chips) return;

  chips.innerHTML = ALBUMS.map(
    (a) => `
      <span class="chip" data-folder="${a.folder}">
        <b>${a.title}</b>
        <small>${formatDate(a.date)} · ${a.photos.length} фото</small>
      </span>`
  ).join("");

  chips.querySelectorAll(".chip").forEach((chip) => {
    chip.onclick = () => {
      const album = ALBUMS.find((a) => a.folder === chip.dataset.folder);
      if (!album) return;
      const photos = album.photos.map((p) => ({
        src: `${album.folder}/${p}`,
        albumTitle: album.title,
        date: album.date,
      }));
      openLightbox(photos, 0);
    };
  });
}

/* ================================================================
 *  §9  ТУРНИРЫ (data/tournaments.json)
 * ================================================================ */

async function loadTournaments() {
  const grid = $("#tournamentsGrid");
  if (!grid) return;

  const items = (await fetchJSON("data/tournaments.json")) || [];

  if (!items.length) {
    grid.innerHTML = `<p style="color:#888">Пока нет турниров. Добавь их в <code>data/tournaments.json</code>.</p>`;
    return;
  }

  grid.innerHTML = items
    .map(
      (t) => `
      <article>
        <img src="${t.image}" alt="${t.title}" loading="lazy">
        <div>
          <label>${t.date}</label>
          <h3>${t.title}</h3>
          <p>${t.subtitle}</p>
          <b>${t.tag}</b>
          <a href="${t.linkHref}">${t.linkText}</a>
        </div>
      </article>`
    )
    .join("");
}

/* ================================================================
 *  §10  СТАТИСТИКА (data/stats.json + счёт фото из ALBUMS)
 * ================================================================ */

async function loadStats() {
  const photosEl = $("#statPhotos");
  const foundedEl = $("#statFounded");
  const sportsEl = $("#statSports");
  if (!photosEl && !foundedEl && !sportsEl) return;

  const s = (await fetchJSON("data/stats.json")) || {};
  if (foundedEl && s.founded != null) foundedEl.textContent = s.founded;
  if (sportsEl && s.sports != null) sportsEl.textContent = s.sports;

  if (photosEl) {
    const total = ALBUMS.reduce((sum, a) => sum + (a.photos?.length || 0), 0);
    photosEl.textContent = total.toLocaleString("ru-RU");
  }
}

/* ================================================================
 *  §11  КАЛЕНДАРЬ (data/calendar.json)
 * ================================================================ */

const HOT_STATUSES = ["Скоро", "Регистрация"];

async function loadCalendar() {
  const list = $("#calendarList");
  if (!list) return;

  const items = (await fetchJSON("data/calendar.json")) || [];

  if (!items.length) {
    list.innerHTML = `<p style="color:#888">Пока нет мероприятий в календаре.</p>`;
    return;
  }

  const sorted = [...items].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  );

  list.innerHTML = sorted
    .map((e) => {
      const isHot = HOT_STATUSES.includes(e.status);
      return `
        <article class="event${isHot ? " hot" : ""}">
          <strong>${e.day}<small>${e.month}</small></strong>
          <div>
            <label>${e.sportLabel}</label>
            <h3>${e.title}</h3>
            <p>${e.place}${e.weekday ? " · " + e.weekday : ""}</p>
          </div>
          <mark>${e.status}</mark>
          <a href="${e.linkHref}">${e.linkText}</a>
        </article>`;
    })
    .join("");
}

/* ================================================================
 *  §12  НОВОСТИ (data/news.json)
 * ================================================================ */

let NEWS = [];

async function loadNews() {
  const grid = document.getElementById("newsGrid");
  if (!grid) return;

  const items = (await fetchJSON("data/news.json")) || [];
  NEWS = Array.isArray(items) ? items : [];

  if (!NEWS.length) {
    grid.innerHTML = `<p style="color:#888">Пока нет новостей. Добавь их в <code>data/news.json</code>.</p>`;
    return;
  }

  const sorted = [...NEWS].sort((a, b) => (a.date < b.date ? 1 : -1));
  const featured = sorted.find((n) => n.featured) || sorted[0];
  const rest = sorted.filter((n) => n !== featured);

  grid.innerHTML = `
    ${renderNewsCard(featured, true)}
    <div class="side">
      ${rest
        .slice(0, 2)
        .map((n) => renderNewsCard(n, false))
        .join("")}
    </div>
  `;

  bindNewsClicks(grid);
}

function renderNewsCard(n, isFeatured) {
  const photos = Array.isArray(n.gallery) ? n.gallery.filter(Boolean) : [];
  const collage = photos.length
    ? `<div class="news-collage news-collage--${Math.min(
        photos.length,
        5
      )}">${renderCollage(photos, n.id)}</div>`
    : "";

  return `
    <article class="${isFeatured ? "main-post" : ""} news-card" data-news-id="${
    n.id
  }">
      ${collage}
      <div>
        <label>${formatNewsDate(n)} · ${n.tag}</label>
        <h3>${n.title}</h3>
        <p>${n.excerpt || ""}</p>
        <a href="#" data-news-open="${n.id}">Подробнее →</a>
      </div>
    </article>
  `;
}

function renderCollage(photos, newsId) {
  const MAX = 4;
  const visible = photos.slice(0, MAX);
  const hidden = photos.length - visible.length;

  const img = (src, i, cls = "") =>
    `<img src="${src}" alt="" loading="lazy" class="${cls}"
          data-photo-index="${i}" data-news-photo="${newsId}">`;

  if (visible.length === 1) return img(visible[0], 0);

  if (visible.length === 2) {
    return visible.map((src, i) => img(src, i)).join("");
  }

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

function formatNewsDate(n) {
  return n.dateLabel || formatDate(n.date);
}

/* ---------- Модалка-пост ---------- */

function openNewsPost(id) {
  const post = NEWS.find((n) => n.id === id);
  if (!post) return;

  const modal = document.getElementById("postModal");
  if (!modal) return;

  // Заголовок
  document.getElementById("pmTag").textContent = post.tag || "";
  document.getElementById("pmTitle").textContent = post.title || "";
  document.getElementById("pmDate").textContent = formatNewsDate(post);

  // Тело поста
  const bodyEl = document.getElementById("pmBody");
  bodyEl.innerHTML = (post.body || [])
    .map((p) => `<p>${renderInlineMarkup(p)}</p>`)
    .join("");

  // Галерея — все фото поста сеткой
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
      <figure data-photo-index="${i}" data-news-photo="${post.id}">
        <img src="${src}" alt="" loading="lazy">
      </figure>`
      )
      .join("");

    galEl.querySelectorAll("[data-news-photo]").forEach((fig) => {
      fig.style.cursor = "zoom-in";
      fig.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(fig.dataset.photoIndex, 10) || 0;
        openNewsGallery(post.id, idx);
      });
    });
  }

  // Открыть модалку
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelectorAll("[data-post-close]").forEach((el) => {
    el.onclick = closePostModal;
  });
}

function closePostModal() {
  const modal = document.getElementById("postModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function openNewsGallery(id, startIndex = 0) {
  const post = NEWS.find((n) => n.id === id);
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

/* ================================================================
 *  §13  ТОЧКА ВХОДА
 * ================================================================ */

window.addEventListener("DOMContentLoaded", async () => {
  initBurger();
  initForm();
  initSmoothScroll();
  initLightbox();

  await loadAlbums();
  loadStats();
  loadTournaments();
  loadCalendar();
  loadNews();

  // Esc — закрывает лайтбокс или модалку
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const lb = document.getElementById("lightbox");
    if (lb?.classList.contains("open")) {
      closeLightbox();
      return;
    }
    const modal = document.getElementById("postModal");
    if (modal?.classList.contains("open")) closePostModal();
  });
});
