/* ================================================================
 *  СТАТИСТИКА ПОСЕЩЕНИЙ
 *  Периоды — КАЛЕНДАРНЫЕ: день / неделя (с ПН) / месяц (с 1) / год (с 1 янв)
 *
 *  Экран 1: Всего визитов (сумма count)
 *  Экран 2: Уникальные посетители (разные visitorId)
 *  График тоже переключается вместе с экраном.
 * ================================================================ */

import { config, db, Query } from "./appwrite-client.js";

let rows = [];
let byDateUnique = {};   // date → Set(visitorId)
let byDateVisits = {};   // date → сумма count
let currentChartMode = "visits"; // "visits" | "unique"
let currentChartDays = 7;

const DAY_MS = 86400000;

/* ---------- Периоды ---------- */

function getPeriodStart(period) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (period === "day") return toIso(now);

  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diff);
    return toIso(monday);
  }

  if (period === "month") {
    return toIso(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  if (period === "year") {
    return toIso(new Date(now.getFullYear(), 0, 1));
  }

  return toIso(now);
}

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ---------- Табы ---------- */

export function initStatsSlider() {
  const slider = document.getElementById("statsSlider");
  const tabs = document.querySelectorAll("#statsTabs .stats-tab");
  if (!slider || !tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const screenIdx = Number(tab.dataset.screen);
      slider.scrollTo({ left: screenIdx * slider.clientWidth, behavior: "smooth" });
      setChartMode(screenIdx === 1 ? "unique" : "visits");
    });
  });

  const updateTabs = () => {
    const activeIdx = Math.round(slider.scrollLeft / slider.clientWidth);
    tabs.forEach((tab, i) => {
      tab.classList.toggle("active", i === activeIdx);
    });
    setChartMode(activeIdx === 1 ? "unique" : "visits");
  };

  slider.addEventListener("scroll", updateTabs, { passive: true });
  updateTabs();
}

function setChartMode(mode) {
  if (mode === currentChartMode) return;
  currentChartMode = mode;

  // Обновляем заголовок графика
  const title = document.getElementById("chartTitle");
  if (title) {
    title.textContent = mode === "unique"
      ? "Уникальные посетители по дням"
      : "Всего визитов по дням";
  }

  // Перерисовываем график
  renderChart(currentChartDays);
}

/* ---------- График — контролы ---------- */

export function initStatsControls() {
  document.querySelectorAll("#chartPeriod button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#chartPeriod button").forEach((item) => {
        item.classList.remove("active");
      });
      button.classList.add("active");
      currentChartDays = Number.parseInt(button.dataset.days, 10);
      renderChart(currentChartDays);
    });
  });
}

/* ---------- Загрузка ---------- */

export async function loadStats() {
  try {
    const result = await db.listDocuments(config.databaseId, "page_views", [
      Query.limit(5000),
    ]);
    rows = result.documents || [];
  } catch (error) {
    console.error("Stats error:", error);
    ["statToday", "statWeek", "statMonth", "statYear",
      "uniqToday", "uniqWeek", "uniqMonth", "uniqYear"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "?";
      });
    return;
  }

  const today = toIso(new Date());

  const visitsInPeriod = (period) => {
    const from = getPeriodStart(period);
    let sum = 0;
    rows.forEach((row) => {
      if (row.date >= from && row.date <= today) sum += (row.count || 1);
    });
    return sum;
  };

  const uniqueInPeriod = (period) => {
    const from = getPeriodStart(period);
    const set = new Set();
    rows.forEach((row) => {
      if (row.date >= from && row.date <= today) set.add(row.visitorId);
    });
    return set.size;
  };

  /* ---------- Экран 1: Всего визитов ---------- */
  document.getElementById("statToday").textContent = visitsInPeriod("day");
  document.getElementById("statWeek").textContent = visitsInPeriod("week");
  document.getElementById("statMonth").textContent = visitsInPeriod("month");
  document.getElementById("statYear").textContent = visitsInPeriod("year");

  /* ---------- Экран 2: Уникальные посетители ---------- */
  document.getElementById("uniqToday").textContent = uniqueInPeriod("day");
  document.getElementById("uniqWeek").textContent = uniqueInPeriod("week");
  document.getElementById("uniqMonth").textContent = uniqueInPeriod("month");
  document.getElementById("uniqYear").textContent = uniqueInPeriod("year");

  /* ---------- Подготовка данных для графика ---------- */
  byDateUnique = {};
  byDateVisits = {};
  rows.forEach((row) => {
    if (!byDateUnique[row.date]) byDateUnique[row.date] = new Set();
    byDateUnique[row.date].add(row.visitorId);

    if (!byDateVisits[row.date]) byDateVisits[row.date] = 0;
    byDateVisits[row.date] += (row.count || 1);
  });

  renderChart(7);
}

/* ---------- График ---------- */

function renderChart(days) {
  const chart = document.getElementById("chart");
  const labels = document.getElementById("chartLabels");
  if (!chart || !labels) return;

  let dates = [];

  if (days === 7) {
    // Текущая неделя: понедельник — воскресенье
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diffToMonday);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(toIso(d));
    }
  } else if (days === 30) {
    // Текущий месяц: с 1-го по последнее число
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= lastDay; d++) {
      dates.push(toIso(new Date(year, month, d)));
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      dates.push(toIso(new Date(Date.now() - i * DAY_MS)));
    }
  }

  // Значения в зависимости от режима
  const values = dates.map((date) => {
    let count;
    if (currentChartMode === "unique") {
      count = byDateUnique[date] ? byDateUnique[date].size : 0;
    } else {
      count = byDateVisits[date] || 0;
    }
    return { date, count };
  });

  const max = Math.max(...values.map((item) => item.count), 1);

  chart.innerHTML = values.map((item) => {
    const height = (item.count / max) * 100;
    return `<div class="bar" style="height:${height}%" title="${item.date}: ${item.count}">
      <span class="value">${item.count}</span>
    </div>`;
  }).join("");

  labels.innerHTML = values.map((item) => {
    const parts = item.date.split("-");
    return `<span>${Number.parseInt(parts[2], 10)}.${parts[1]}</span>`;
  }).join("");
}
