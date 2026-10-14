/* Visitor statistics and the 7/30-day chart. */
import { config, db, Query } from "./appwrite-client.js";

let rows = [];
let byDate = {};
const DAY_MS = 86400000;

export function initStatsControls() {
  document.querySelectorAll("#chartPeriod button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("#chartPeriod button").forEach((item) => {
        item.classList.remove("active");
      });
      button.classList.add("active");
      renderChart(Number.parseInt(button.dataset.days, 10));
    });
  });
}

export async function loadStats() {
  try {
    const result = await db.listDocuments(config.databaseId, "page_views", [Query.limit(5000)]);
    rows = result.documents || [];
  } catch (error) {
    console.error("Stats error:", error);
    ["statToday", "statWeek", "statMonth", "statYear"].forEach((id) => {
      document.getElementById(id).textContent = "?";
    });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const count = (days) => {
    const from = new Date(Date.now() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
    const visitors = new Set();
    rows.forEach((row) => {
      if (row.date >= from && row.date <= today) visitors.add(row.visitorId);
    });
    return visitors.size;
  };

  document.getElementById("statToday").textContent = count(1);
  document.getElementById("statWeek").textContent = count(7);
  document.getElementById("statMonth").textContent = count(30);
  document.getElementById("statYear").textContent = count(365);

  byDate = {};
  rows.forEach((row) => {
    if (!byDate[row.date]) byDate[row.date] = new Set();
    byDate[row.date].add(row.visitorId);
  });
  renderChart(7);
}

function renderChart(days) {
  const chart = document.getElementById("chart");
  const labels = document.getElementById("chartLabels");
  if (!chart || !labels) return;

  const values = [];
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * DAY_MS).toISOString().slice(0, 10);
    values.push({ date, count: byDate[date] ? byDate[date].size : 0 });
  }

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
