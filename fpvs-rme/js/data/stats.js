/* ================================================================
 *  СТАТИСТИКА (фото считаем по манифесту + Appwrite)
 * ================================================================ */

import { appwriteList } from "../core/appwrite.js";

const FOUNDED_YEAR = 2018;
const SPORTS_COUNT = 2;

export async function loadStats() {
  const photosEl = document.getElementById("statPhotos");
  const foundedEl = document.getElementById("statFounded");
  const sportsEl = document.getElementById("statSports");

  if (foundedEl) foundedEl.textContent = FOUNDED_YEAR;
  if (sportsEl) sportsEl.textContent = SPORTS_COUNT;

  if (!photosEl) return;

  let totalPhotos = 0;

  // 1. Считаем фото из манифеста (турниры + общие: hero, logo, sergey)
  try {
    const res = await fetch("images/manifest.json", { cache: "no-cache" });
    const manifest = await res.json();

    // Общие файлы в корне images/
    if (manifest.tree && manifest.tree.files) {
      totalPhotos += manifest.tree.files.length; // hero.jpg, logo.jpg, sergey.jpg
    }

    // Фото турниров
    if (manifest.tree && manifest.tree.dirs && manifest.tree.dirs.tournaments) {
      const tournamentsDir = manifest.tree.dirs.tournaments.dirs || {};
      for (const slug in tournamentsDir) {
        if (tournamentsDir[slug].files) {
          totalPhotos += tournamentsDir[slug].files.length;
        }
      }
    }
  } catch (e) {
    console.warn("[stats] Ошибка чтения манифеста:", e.message);
  }

  // 2. Добавляем фото новостей из Appwrite
  try {
    const news = await appwriteList("news", { limit: 100 });
    news.forEach((n) => {
      if (n.gallery && n.gallery.length) {
        totalPhotos += n.gallery.length;
      }
    });
  } catch (e) {
    console.warn("[stats] Ошибка загрузки новостей:", e.message);
  }

  photosEl.textContent = totalPhotos.toLocaleString("ru-RU");
}
