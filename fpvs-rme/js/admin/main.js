/* Independent admin-panel entry point. */
import { loadPartials } from "../core/partials.js";
import { initAuth } from "./auth.js";
import { initStatsControls, loadStats } from "./stats.js";
import { initLeadModal } from "./lead-modal.js";
import { loadLeads } from "./leads.js";

await loadPartials();
initStatsControls();
initLeadModal();
initAuth(() => {
  loadStats();
  loadLeads();
});
