import { config, db, Query, ID } from "./appwrite-client.js";
import { modalOpened, modalClosed } from "../core/modals.js";

let allTournaments = [];
let currentTournamentId = null;

const getElement = (id) => document.getElementById(id);

export function initTournaments() {
  const openBtn = getElement("openTournamentsBtn");
  const modal = getElement("tournamentsModal");
  const closeBtns = modal?.querySelectorAll("[data-tournaments-close]");

  if (!openBtn || !modal) return;

  openBtn.addEventListener("click", () => {
    modal.classList.add("open");
    modalOpened("tournaments");
    loadTournamentsList();
  });

  closeBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.classList.remove("open");
      modalClosed("tournaments");
    })
  );

  getElement("addTournamentBtn")?.addEventListener("click", () =>
    openEditor(null)
  );
}

export function closeTournamentsModal() {
  const modal = getElement("tournamentsModal");
  if (!modal || !modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modalClosed("tournaments");
}

export function isTournamentsOpen() {
  return (
    document.getElementById("tournamentsModal")?.classList.contains("open") ||
    false
  );
}

async function loadTournamentsList() {
  const list = getElement("tournamentsList");
  list.innerHTML = '<div class="brackets-hint">Загрузка...</div>';

  try {
    const res = await db.listDocuments(config.databaseId, "tournaments", [
      Query.orderDesc("dateSort"),
      Query.limit(100),
    ]);
    allTournaments = res.documents || [];

    if (allTournaments.length === 0) {
      list.innerHTML = '<div class="brackets-hint">Нет турниров</div>';
      return;
    }

    list.innerHTML = allTournaments
      .map(
        (t) => `
            <div class="tournament-item ${
              t.$id === currentTournamentId ? "active" : ""
            }" data-tournament-id="${t.$id}">
                <div class="tournament-item__title">${escapeHtml(t.title)}</div>
                <div class="tournament-item__date">${t.date || ""}</div>
            </div>
        `
      )
      .join("");

    list.querySelectorAll(".tournament-item").forEach((item) => {
      item.addEventListener("click", () =>
        openEditor(item.dataset.tournamentId)
      );
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = '<div class="brackets-hint">Ошибка загрузки</div>';
  }
}

function openEditor(id) {
  currentTournamentId = id;
  const editor = getElement("tournamentsEditor");
  const tournament = id ? allTournaments.find((t) => t.$id === id) : null;

  document.querySelectorAll(".tournament-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.tournamentId === id);
  });

  editor.innerHTML = `
        <form class="tournaments-form" id="tournamentForm">
            <h2>${tournament ? "Редактировать турнир" : "Новый турнир"}</h2>
            
            <div>
                <label>Название *</label>
                <input type="text" id="tfTitle" value="${
                  tournament ? escapeHtml(tournament.title) : ""
                }" required />
            </div>
            
            <div>
                <label>Подзаголовок (например, "Пляжный футбол · мужские команды")</label>
                <input type="text" id="tfSubtitle" value="${
                  tournament ? escapeHtml(tournament.subtitle || "") : ""
                }" />
            </div>

            <div>
                <label>Тег (например, ⚽ Футбол)</label>
                <input type="text" id="tfTag" value="${
                  tournament ? escapeHtml(tournament.tag || "") : ""
                }" />
            </div>

            <div>
                <label>Дата (красивая, для отображения) *</label>
                <input type="text" id="tfDate" value="${
                  tournament ? escapeHtml(tournament.date || "") : ""
                }" placeholder="13 сентября · Йошкар-Ола" required />
            </div>

            <div>
                <label>Дата для сортировки (ГГГГ-ММ-ДД) *</label>
                <input type="date" id="tfDateSort" value="${
                  tournament
                    ? tournament.dateSort || ""
                    : new Date().toISOString().slice(0, 10)
                }" required />
            </div>

            <div>
                <label>Спорт (football / volleyball / пусто)</label>
                <input type="text" id="tfSport" value="${
                  tournament ? escapeHtml(tournament.sport || "") : ""
                }" />
            </div>

            <div>
                <label>Размер команды (0 — для футбола, 2/3/4 — для волейбола)</label>
                <input type="number" id="tfTeamSize" value="${
                  tournament && tournament.teamSize != null
                    ? tournament.teamSize
                    : 0
                }" min="0" max="10" />
            </div>

            <div>
                <label>Slug (латиницей, для связи с папкой фото)</label>
                <input type="text" id="tfSlug" value="${
                  tournament ? escapeHtml(tournament.slug || "") : ""
                }" required />
            </div>

            <div class="tournaments-form-actions">
                ${
                  tournament
                    ? `<button type="button" class="btn-delete" id="deleteTournamentBtn">Удалить</button>`
                    : ""
                }
                <button type="submit" class="btn-save" id="saveTournamentBtn">Сохранить</button>
            </div>
        </form>
    `;

  getElement("tournamentForm").addEventListener("submit", (e) =>
    saveTournament(e, tournament)
  );

  if (tournament) {
    getElement("deleteTournamentBtn").addEventListener("click", () =>
      deleteTournament(tournament)
    );
  }
}

async function saveTournament(e, existing) {
  e.preventDefault();
  const btn = getElement("saveTournamentBtn");
  btn.disabled = true;
  btn.textContent = "Сохранение...";

  const title = getElement("tfTitle").value.trim();
  const subtitle = getElement("tfSubtitle").value.trim();
  const tag = getElement("tfTag").value.trim();
  const date = getElement("tfDate").value.trim();
  const dateSort = getElement("tfDateSort").value;
  const sport = getElement("tfSport").value.trim();
  const teamSize = parseInt(getElement("tfTeamSize").value, 10) || 0;
  const slug = getElement("tfSlug").value.trim();

  try {
    const data = {
      title,
      subtitle,
      tag,
      date,
      dateSort,
      sport,
      teamSize,
      slug,
    };

    if (existing) {
      await db.updateDocument(
        config.databaseId,
        "tournaments",
        existing.$id,
        data
      );
    } else {
      await db.createDocument(
        config.databaseId,
        "tournaments",
        ID.unique(),
        data
      );
    }

    await loadTournamentsList();
    openEditor(null);
    alert("Сохранено!");
  } catch (err) {
    console.error(err);
    alert("Ошибка: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Сохранить";
  }
}

async function deleteTournament(tournament) {
  if (!confirm(`Удалить турнир "${tournament.title}"?`)) return;

  try {
    await db.deleteDocument(config.databaseId, "tournaments", tournament.$id);
    await loadTournamentsList();
    openEditor(null);
  } catch (err) {
    alert("Ошибка удаления: " + err.message);
  }
}

function escapeHtml(value) {
  if (!value) return "";
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}
