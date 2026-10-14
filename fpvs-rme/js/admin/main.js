/* Independent admin-panel entry point. */
import { loadPartials } from "../core/partials.js";
import { initAuth } from "./auth.js";
import { initStatsControls, initStatsSlider, loadStats } from "./stats.js";
import { initLeadModal } from "./lead-modal.js";
import { loadLeads } from "./leads.js";

await loadPartials();
initStatsControls();
initStatsSlider();
initLeadModal();
initAuth(() => {
  loadStats();
  loadLeads();
});
