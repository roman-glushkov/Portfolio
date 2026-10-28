/* Details modal for an individual incoming request. */
import { getLeadById } from "./lead-store.js";

let historyPushed = false;
// Если модалка «Подробнее» открыта ПОВЕРХ «Все заявки» — надо запомнить,
// что заявки уже запушили состояние, чтобы не задвоить историю.
function isAllLeadsOpen() {
  const m = document.getElementById("allLeadsModal");
  return !!m && m.classList.contains("active");
}

export function initLeadModal() {
  // Esc на компьютере
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const modal = document.getElementById("leadModal");
    if (!modal || !modal.classList.contains("open")) return;

    // Если открыта «Все заявки» — сначала закрываем верхнюю (Подробнее),
    // вторым Esc закроется «Все заявки» (его обработчик в leads.js)
    event.preventDefault();
    closeLeadModal();
  });

  // Кнопка «назад» на телефоне
  window.addEventListener("popstate", () => {
    const modal = document.getElementById("leadModal");
    if (modal && modal.classList.contains("open")) {
      closeLeadModal(true); // silent: не трогаем history, её уже двинул браузер
    }
  });
}

export function openLeadModal(id) {
  const lead = getLeadById(id);
  if (!lead) return;

  const modal = document.getElementById("leadModal");
  const date = new Date(lead.$createdAt).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  document.getElementById("lmName").textContent = lead.name || "—";
  document.getElementById("lmDate").textContent = date;
  document.getElementById("lmPhone").textContent = lead.phone || "—";
  document.getElementById("lmTopic").textContent = lead.topic || "—";

  setOptionalField("lmTeamWrap", "lmTeam", lead.teamName);
  setOptionalField("lmPlayersWrap", "lmPlayers", lead.players);
  setOptionalField("lmTournamentWrap", "lmTournament", lead.tournament);
  setOptionalField(
    "lmTournamentSlugWrap",
    "lmTournamentSlug",
    lead.tournamentSlug
  );
  setOptionalField("lmMessageWrap", "lmMessage", lead.message);

  document.getElementById("lmStatus").textContent =
    lead.status === "processed" ? "Обработано" : "Новая";

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  modal.querySelectorAll("[data-lead-close]").forEach((element) => {
    element.onclick = closeLeadModal;
  });

  // Пушим состояние только если «Все заявки» НЕ открыта —
  // иначе у нас уже есть запись в истории от неё, и вторая запись
  // потребует двух «назад», чтобы выйти, что плохо на Android.
  if (!isAllLeadsOpen() && !historyPushed) {
    history.pushState({ leadModal: true }, "");
    historyPushed = true;
  }
}

export function closeLeadModal(silent = false) {
  const modal = document.getElementById("leadModal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.style.overflow = "";

  if (!silent && historyPushed) {
    historyPushed = false;
    // Заменяем состояние, чтобы не «съесть» историю
    history.replaceState(null, "");
  }
}

function setOptionalField(wrapperId, valueId, value) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  if (!value) {
    wrapper.style.display = "none";
    return;
  }
  wrapper.style.display = "";
  document.getElementById(valueId).textContent = value;
}
