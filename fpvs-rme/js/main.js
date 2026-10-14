/* Public website entry point. */
import "./data/views.js";
import { loadPartials } from "./core/partials.js";
import { initSmoothScroll } from "./ui/smooth-scroll.js";
import { initLightbox, closeLightbox, isLightboxOpen } from "./ui/lightbox.js";
import { initForm } from "./forms/lead-form.js";
import { loadStats } from "./data/stats.js";
import { initBurger } from "./ui/burger.js";
import { loadTournaments } from "./data/tournaments.js";
import { loadCalendar, closeAllEventsModal, isAllEventsModalOpen } from "./data/calendar.js";
import { loadNews } from "./data/news.js";
import { closePostModal, isPostModalOpen } from "./modals/post-modal.js";
import { closeTournamentModal, isTournamentModalOpen } from "./modals/tournament-modal.js";
import { closeAllTournaments, isAllTournamentsOpen } from "./modals/all-tournaments-modal.js";
import { loadGallery, closeAllPhotosModal, isAllPhotosModalOpen } from "./data/gallery.js";
import { registerModal, modalOpened, modalClosed } from "./core/modals.js";

async function startSite() {
  await loadPartials();
  initBurger();
  initForm();
  initSmoothScroll();
  initLightbox();

  registerModal("lightbox", closeLightbox, isLightboxOpen);
  registerModal("tournament", closeTournamentModal, isTournamentModalOpen);
  registerModal("allTournaments", closeAllTournaments, isAllTournamentsOpen);
  registerModal("allEvents", closeAllEventsModal, isAllEventsModalOpen);
  registerModal("allPhotos", closeAllPhotosModal, isAllPhotosModalOpen);
  registerModal("post", closePostModal, isPostModalOpen);
  // Параллельно грузим данные — быстрее
  await Promise.all([
    loadTournaments(),
    loadCalendar(),
    loadNews(),
    loadGallery(),
  ]);
  loadStats();

  // Один обработчик Esc — закрывает верхнюю открытую модалку
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isLightboxOpen()) return closeLightbox();
    if (isTournamentModalOpen()) return closeTournamentModal();
    if (isAllTournamentsOpen()) return closeAllTournaments();
    if (isAllEventsModalOpen()) return closeAllEventsModal();
    if (isAllPhotosModalOpen()) return closeAllPhotosModal();
    if (isPostModalOpen()) closePostModal();
  });
}

startSite().catch((error) => {
  console.error("Не удалось инициализировать сайт ФПВС РМЭ:", error);
});
