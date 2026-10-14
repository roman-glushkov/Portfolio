/* ================================================================
 *  КАЛЕНДАРЬ (Appwrite collection: calendar)
 *  На главной: 3 события. В модалке: все + фильтр
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";

const HOT_STATUSES = ["Скоро", "Регистрация", "Идёт"];
const DEFAULT_PLACE = "Йошкар-Ола";
const PREVIEW_COUNT = 3;

const MONTHS = [
  "ЯНВАРЯ", "ФЕВРАЛЯ", "МАРТА", "АПРЕЛЯ", "МАЯ", "ИЮНЯ",
  "ИЮЛЯ", "АВГУСТА", "СЕНТЯБРЯ", "ОКТЯБРЯ", "НОЯБРЯ", "ДЕКАБРЯ",
];

const WEEKDAYS = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"];

const SPORT_LABELS = {
  football: "⚽ ФУТБОЛ",
  volleyball: "🏐 ВОЛЕЙБОЛ",
};

let ALL_EVENTS = [];
let currentFilter = ""; // "" | "football" | "volleyball"

export async function loadCalendar() {
  const list = document.getElementById("calendarList");
  if (!list) return;

  const items = await appwriteList("calendar", { orderDesc: "date", limit: 200 });

  // Свежие сверху
  ALL_EVENTS = items.sort((a, b) => (a.date < b.date ? 1 : -1));

  // Фильтры — ТОЛЬКО в модалке
  initModalFilters();

  render();
}

/* ---------- Фильтры (только модалка) ---------- */

function initModalFilters() {
  const container = document.getElementById("calendarFiltersModal");
  if (!container) return;

  container.querySelectorAll(".cal-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.sport || "";
      syncModalFiltersUI();
      renderModalList(getFiltered());
    });
  });
}

function syncModalFiltersUI() {
  const container = document.getElementById("calendarFiltersModal");
  if (!container) return;

  container.querySelectorAll(".cal-filter").forEach((btn) => {
    btn.classList.toggle("active", (btn.dataset.sport || "") === currentFilter);
  });
}

function getFiltered() {
  if (!currentFilter) return ALL_EVENTS;
  return ALL_EVENTS.filter((e) => e.sport === currentFilter);
}

/* ---------- Рендер на главной ---------- */

function render() {
  const list = document.getElementById("calendarList");
  const footer = document.getElementById("calendarFooter");
  const totalEl = document.getElementById("calendarTotalCount");
  if (!list) return;

  if (!ALL_EVENTS.length) {
    list.innerHTML = `<p style="color:#888">Пока нет мероприятий.</p>`;
    if (footer) footer.hidden = true;
    return;
  }

  // На главной показываем только PREVIEW_COUNT свежих
  const preview = ALL_EVENTS.slice(0, PREVIEW_COUNT);
  list.innerHTML = preview.map(renderEvent).join("");

  // Кнопка "Все события" — если есть что показать ещё
  if (footer && totalEl) {
    if (ALL_EVENTS.length > PREVIEW_COUNT) {
      footer.hidden = false;
      totalEl.textContent = ALL_EVENTS.length;
    } else {
      footer.hidden = true;
    }

    const btn = footer.querySelector("[data-show-all-events]");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", openAllEventsModal);
    }
  }
}

/* ---------- Модалка "Все события" ---------- */

function openAllEventsModal() {
  const modal = document.getElementById("allEventsModal");
  if (!modal) return;

  // Сбрасываем фильтр при каждом открытии
  currentFilter = "";
  syncModalFiltersUI();
  renderModalList(getFiltered());

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  modal.querySelectorAll("[data-all-events-close]").forEach((el) => {
    el.onclick = closeAllEventsModal;
  });
}

export function closeAllEventsModal() {
  const modal = document.getElementById("allEventsModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

export function isAllEventsModalOpen() {
  return document.getElementById("allEventsModal")?.classList.contains("open") || false;
}

function renderModalList(filtered) {
  const container = document.getElementById("allEventsList");
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `<p style="padding:20px; color:#888;">Нет событий.</p>`;
    return;
  }

  container.innerHTML = filtered.map(renderEvent).join("");
}

/* ---------- Рендер одного события ---------- */

function renderEvent(e) {
  const dateIso = safeText(e.date);
  const parsed = parseDate(dateIso);

  const day = parsed ? parsed.day : "";
  const month = parsed ? parsed.month : "";
  const weekday = parsed ? parsed.weekday : "";

  const sportLabel = SPORT_LABELS[e.sport] || "";
  const place = safeText(e.place) || DEFAULT_PLACE;
  const title = safeText(e.title);

  const status = safeText(e.status) || autoStatus(dateIso);
  const statusClass = statusToClass(status);
  const isHot = HOT_STATUSES.includes(status);

  const dayHtml = day ? `<strong>${day}<small>${month}</small></strong>` : "";
  const sportHtml = sportLabel ? `<label>${sportLabel}</label>` : "";
  const placeHtml = `<p>${place}${weekday ? " · " + weekday : ""}</p>`;
  const statusHtml = status
    ? `<mark class="${statusClass}">${status}</mark>`
    : "";

  return `
    <article class="event${isHot ? " hot" : ""}">
      ${dayHtml}
      <div>
        ${sportHtml}
        <h3>${title}</h3>
        ${placeHtml}
      </div>
      ${statusHtml}
    </article>
  `;
}

/* ---------- Вычисление статуса ---------- */

function autoStatus(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toIso(today);

  if (iso < todayIso) return "Прошло";
  if (iso === todayIso) return "Идёт";
  return "Скоро";
}

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function statusToClass(status) {
  switch (status) {
    case "Идёт": return "status-live";
    case "Скоро": return "status-soon";
    case "Регистрация": return "status-soon";
    case "Прошло": return "status-past";
    default: return "";
  }
}

/* ---------- Утилиты ---------- */

function parseDate(iso) {
  if (!iso) return null;
  const match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, y, m, d] = match;
  const monthIdx = parseInt(m, 10) - 1;
  const dayNum = parseInt(d, 10);

  const dateObj = new Date(`${y}-${m}-${d}T00:00:00`);
  const weekdayIdx = isNaN(dateObj.getTime()) ? null : dateObj.getDay();

  return {
    day: String(dayNum),
    month: MONTHS[monthIdx] || "",
    weekday: weekdayIdx !== null ? WEEKDAYS[weekdayIdx] : "",
  };
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
