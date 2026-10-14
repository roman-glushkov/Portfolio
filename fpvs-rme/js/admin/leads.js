/* Load, render, and update incoming requests. */
import { config, db, Query } from "./appwrite-client.js";
import { openLeadModal } from "./lead-modal.js";
import { markLeadProcessed, setLeads } from "./lead-store.js";

export async function loadLeads() {
  const wrap = document.getElementById("leadsWrap");
  wrap.innerHTML = '<div class="loading">Загружаю заявки…</div>';

  try {
    const result = await db.listDocuments(config.databaseId, "leads", [
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]);
    const rows = result.documents || [];
    setLeads(rows);
    renderLeads(rows);
  } catch (error) {
    console.error("Leads error:", error);
    wrap.innerHTML = '<div class="empty-state">Не удалось загрузить заявки</div>';
  }
}

function renderLeads(rows) {
  const wrap = document.getElementById("leadsWrap");
  if (!rows.length) {
    wrap.innerHTML = '<div class="empty-state">Пока нет заявок</div>';
    return;
  }

  wrap.innerHTML = `<table>
    <thead><tr>
      <th>Дата</th>
      <th>Имя</th>
      <th>Телефон</th>
      <th>Тема</th>
      <th>Турнир</th>
      <th>Команда</th>
      <th>Статус</th>
      <th></th>
    </tr></thead>
    <tbody>${rows.map(renderRow).join("")}</tbody>
  </table>`;

  wrap.querySelectorAll("[data-mark]").forEach((button) => {
    button.addEventListener("click", () => markProcessed(button.dataset.mark, button));
  });
  wrap.querySelectorAll("[data-details]").forEach((button) => {
    button.addEventListener("click", () => openLeadModal(button.dataset.details));
  });
}

function renderRow(lead) {
  const date = new Date(lead.$createdAt).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const processed = lead.status === "processed";
  return `<tr class="${processed ? "processed" : ""}" data-row="${lead.$id}">
    <td>${date}</td>
    <td>${escapeHtml(lead.name || "—")}</td>
    <td>${escapeHtml(lead.phone || "—")}</td>
    <td>${escapeHtml(lead.topic || "—")}</td>
    <td>${escapeHtml(lead.tournament || "—")}</td>
    <td>${escapeHtml(lead.teamName || "—")}</td>
    <td><span class="status-badge ${processed ? "status-processed" : "status-new"}">
      ${processed ? "Обработано" : "Новая"}
    </span></td>
    <td><button class="details-btn" data-details="${lead.$id}">Подробнее</button>
      ${processed ? "" : `<button class="mark-btn" data-mark="${lead.$id}">Обработано</button>`}
    </td>
  </tr>`;
}

async function markProcessed(rowId, button) {
  button.disabled = true;
  button.textContent = "Сохраняю…";

  try {
    await db.updateDocument(config.databaseId, "leads", rowId, { status: "processed" });
    const row = document.querySelector(`tr[data-row="${rowId}"]`);
    if (row) {
      row.classList.add("processed");
      const badge = row.querySelector(".status-badge");
      badge.className = "status-badge status-processed";
      badge.textContent = "Обработано";
      button.remove();
    }
    markLeadProcessed(rowId);
  } catch (error) {
    console.error("Update error:", error);
    button.disabled = false;
    button.textContent = "Ошибка. Повторить";
  }
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
