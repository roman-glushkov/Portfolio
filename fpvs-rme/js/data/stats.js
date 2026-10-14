/* ================================================================
 *  СТАТИСТИКА (хардкод + фото из турниров)
 * ================================================================ */

import { getTournaments } from "./tournaments.js";

const FOUNDED_YEAR = 2018;
const SPORTS_COUNT = 2;

export function loadStats() {
  const photosEl = document.getElementById("statPhotos");
  const foundedEl = document.getElementById("statFounded");
  const sportsEl = document.getElementById("statSports");

  if (foundedEl) foundedEl.textContent = FOUNDED_YEAR;
  if (sportsEl) sportsEl.textContent = SPORTS_COUNT;

  if (photosEl) {
    const total = getTournaments().reduce(
      (sum, t) => sum + (t.photos?.length || 0),
      0
    );
    photosEl.textContent = total.toLocaleString("ru-RU");
  }
}
