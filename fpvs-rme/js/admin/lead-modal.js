/* Details modal for an individual incoming request. */
import { getLeadById } from "./lead-store.js";

export function initLeadModal() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const modal = document.getElementById("leadModal");
    if (modal && modal.classList.contains("open")) closeLeadModal();
  });
}

export function openLeadModal(id) {
  const lead = getLeadById(id);
  if (!lead) return;

  const modal = document.getElementById("leadModal");
  const date = new Date(lead.$createdAt).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  document.getElementById("lmName").textContent = lead.name || "—";
  document.getElementById("lmDate").textContent = date;
  document.getElementById("lmPhone").textContent = lead.phone || "—";
  document.getElementById("lmTopic").textContent = lead.topic || "—";

  setOptionalField("lmTeamWrap", "lmTeam", lead.teamName);
  setOptionalField("lmPlayersWrap", "lmPlayers", lead.players);
  setOptionalField("lmTournamentWrap", "lmTournament", lead.tournament);
  setOptionalField("lmTournamentSlugWrap", "lmTournamentSlug", lead.tournamentSlug);
  setOptionalField("lmMessageWrap", "lmMessage", lead.message);

  document.getElementById("lmStatus").textContent =
    lead.status === "processed" ? "Обработано" : "Новая";

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  modal.querySelectorAll("[data-lead-close]").forEach((element) => {
    element.onclick = closeLeadModal;
  });
}

export function closeLeadModal() {
  document.getElementById("leadModal").classList.remove("open");
  document.body.style.overflow = "";
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
