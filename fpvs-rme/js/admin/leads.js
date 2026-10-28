/* Load, render, and update incoming requests. */
import { config, db, Query } from "./appwrite-client.js";
import { openLeadModal } from "./lead-modal.js";
import { markLeadProcessed, setLeads } from "./lead-store.js";

let allLeads = [];
let allLeadsHistoryPushed = false;

export async function loadLeads() {
  const wrap = document.getElementById("leadsWrap");
  wrap.innerHTML = '<div class="loading">Загружаю заявки…</div>';

  try {
    const result = await db.listDocuments(config.databaseId, "leads", [
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]);
    allLeads = result.documents || [];
    setLeads(allLeads);
    renderRecent();
  } catch (error) {
    console.error("Leads error:", error);
    wrap.innerHTML =
      '<div class="empty-state">Не удалось загрузить заявки</div>';
  }
}

/* ---- Главный экран: только новые + кнопка "Все" ---- */
function renderRecent() {
  const wrap = document.getElementById("leadsWrap");
  const fresh = allLeads.filter((l) => l.status !== "processed");

  if (!fresh.length) {
    wrap.innerHTML = `
      <div class="empty-state">Пока нет новых заявок</div>
      <div class="leads-footer">
        <button class="btn-all-leads" id="openAllLeads">Смотреть все заявки →</button>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="leads-count">Новых заявок: <b>${fresh.length}</b></div>
      <table>
        <thead><tr>
          <th>Дата</th><th>Имя</th><th>Телефон</th>
          <th>Тема</th><th>Турнир</th><th>Команда</th><th></th>
        </tr></thead>
        <tbody>${fresh.map(renderRow).join("")}</tbody>
      </table>
      <div class="leads-footer">
        <button class="btn-all-leads" id="openAllLeads">Смотреть все заявки (${
          allLeads.length
        }) →</button>
      </div>`;
  }

  bindRowActions(wrap);
  document
    .getElementById("openAllLeads")
    ?.addEventListener("click", openAllLeadsModal);
}

function bindRowActions(root) {
  root
    .querySelectorAll("[data-mark]")
    .forEach((btn) =>
      btn.addEventListener("click", () => markProcessed(btn.dataset.mark, btn))
    );
  root
    .querySelectorAll("[data-details]")
    .forEach((btn) =>
      btn.addEventListener("click", () => openLeadModal(btn.dataset.details))
    );
}

function renderRow(lead) {
  const date = new Date(lead.$createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const processed = lead.status === "processed";
  return `<tr class="${processed ? "processed" : ""}" data-row="${lead.$id}">
    <td>${date}</td>
    <td>${escapeHtml(lead.name || "—")}</td>
    <td>${escapeHtml(lead.phone || "—")}</td>
    <td>${escapeHtml(lead.topic || "—")}</td>
    <td>${escapeHtml(lead.tournament || "—")}</td>
    <td>${escapeHtml(lead.teamName || "—")}</td>
    <td><button class="details-btn" data-details="${
      lead.$id
    }">Подробнее</button>
      ${
        processed
          ? ""
          : `<button class="mark-btn" data-mark="${lead.$id}">Обработано</button>`
      }
    </td>
  </tr>`;
}

async function markProcessed(rowId, button) {
  button.disabled = true;
  button.textContent = "Сохраняю…";
  try {
    await db.updateDocument(config.databaseId, "leads", rowId, {
      status: "processed",
    });
    const lead = allLeads.find((l) => l.$id === rowId);
    if (lead) lead.status = "processed";
    markLeadProcessed(rowId);
    renderRecent();
  } catch (error) {
    console.error("Update error:", error);
    button.disabled = false;
    button.textContent = "Ошибка. Повторить";
  }
}

/* ---- Модалка "Все заявки" ---- */
function openAllLeadsModal() {
  const modal = document.getElementById("allLeadsModal");
  if (!modal) return;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";

  // Пушим историю для работы кнопки "назад" на телефоне
  if (!allLeadsHistoryPushed) {
    history.pushState({ allLeadsModal: true }, "");
    allLeadsHistoryPushed = true;
  }

  // Заполняем фильтр турниров
  const tournaments = [
    ...new Set(allLeads.map((l) => l.tournament).filter(Boolean)),
  ].sort();
  const tournamentSelect = document.getElementById("filterTournament");
  tournamentSelect.innerHTML =
    '<option value="">Все турниры</option>' +
    tournaments
      .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
      .join("");

  applyFilters();

  // Привязываем кнопки закрытия (крестик, клик по фону)
  modal.querySelectorAll("[data-all-close]").forEach((el) => {
    el.onclick = () => closeAllLeadsModal();
  });

  // ВЕШАЕМ ESC ПРЯМО ЗДЕСЬ (гарантированно сработает)
  document.onkeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeAllLeadsModal();
    }
  };
}

function closeAllLeadsModal(silent = false) {
  const modal = document.getElementById("allLeadsModal");
  if (!modal) return;

  modal.classList.remove("active");
  document.body.style.overflow = "";

  // Убираем обработчик Esc
  document.onkeydown = null;

  // Чистим историю
  if (!silent && allLeadsHistoryPushed) {
    allLeadsHistoryPushed = false;
    history.replaceState(null, "");
  } else {
    allLeadsHistoryPushed = false;
  }
}

function applyFilters() {
  const search = (document.getElementById("filterSearch")?.value || "")
    .toLowerCase()
    .trim();
  const topic = document.getElementById("filterTopic")?.value || "";
  const tournament = document.getElementById("filterTournament")?.value || "";
  const status = document.getElementById("filterStatus")?.value || "";

  const filtered = allLeads.filter((lead) => {
    if (search) {
      const hay = [lead.name, lead.phone, lead.teamName, lead.tournament]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (topic && lead.topic !== topic) return false;
    if (tournament && lead.tournament !== tournament) return false;
    if (status === "new" && lead.status === "processed") return false;
    if (status === "processed" && lead.status !== "processed") return false;
    return true;
  });

  const body = document.getElementById("allLeadsBody");
  if (!filtered.length) {
    body.innerHTML =
      '<tr><td colspan="8" class="empty-state">Ничего не найдено</td></tr>';
  } else {
    body.innerHTML = filtered.map(renderFullRow).join("");
    bindRowActions(body);
  }
  document.getElementById(
    "allLeadsCount"
  ).textContent = `Найдено: ${filtered.length}`;
}

function renderFullRow(lead) {
  const date = new Date(lead.$createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const processed = lead.status === "processed";
  return `<tr class="${processed ? "processed" : ""}" data-row="${lead.$id}">
    <td>${date}</td>
    <td>${escapeHtml(lead.name || "—")}</td>
    <td>${escapeHtml(lead.phone || "—")}</td>
    <td>${escapeHtml(lead.topic || "—")}</td>
    <td>${escapeHtml(lead.tournament || "—")}</td>
    <td>${escapeHtml(lead.teamName || "—")}</td>
    <td><span class="status-badge ${
      processed ? "status-processed" : "status-new"
    }">
      ${processed ? "Обработано" : "Новая"}</span></td>
    <td><button class="details-btn" data-details="${
      lead.$id
    }">Подробнее</button>
      ${
        processed
          ? ""
          : `<button class="mark-btn" data-mark="${lead.$id}">Обработано</button>`
      }
    </td>
  </tr>`;
}

/* ---- Инициализация событий модалки ---- */
export function initAllLeadsModal() {
  const modal = document.getElementById("allLeadsModal");
  if (!modal) return;

  // Кнопка "назад" на телефоне
  window.addEventListener("popstate", () => {
    if (modal.classList.contains("active")) {
      closeAllLeadsModal(true); // silent = true, чтобы не ломать историю
    }
  });

  // Фильтры
  document
    .getElementById("filterSearch")
    ?.addEventListener("input", applyFilters);
  document
    .getElementById("filterTopic")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("filterTournament")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("filterStatus")
    ?.addEventListener("change", applyFilters);
  document.getElementById("filterReset")?.addEventListener("click", () => {
    document.getElementById("filterSearch").value = "";
    document.getElementById("filterTopic").value = "";
    document.getElementById("filterTournament").value = "";
    document.getElementById("filterStatus").value = "";
    applyFilters();
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
