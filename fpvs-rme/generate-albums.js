/**
 * generate-albums.js
 * Сканирует images/albums/ и создаёт albums.json
 *
 * Запуск:  node generate-albums.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const ALBUMS_DIR = path.join(ROOT, "images", "albums");
const OUTPUT = path.join(ROOT, "data", "albums.json");

const IMG_RE = /\.(jpe?g|png|webp|gif|avif)$/i;

function extractDate(folderName, folderPath) {
  // Ищем ДД.ММ.ГГГГ или ДД-ДД.ММ.ГГГГ или ГГГГ
  const m = folderName.match(/(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const yearOnly = folderName.match(/\b(20\d{2})\b/);
  if (yearOnly) return `${yearOnly[1]}-01-01`;

  // Fallback — дата изменения папки
  const stat = fs.statSync(folderPath);
  return stat.mtime.toISOString().slice(0, 10);
}

function humanTitle(folderName) {
  // Убираем дату из отображаемого заголовка
  return folderName
    .replace(/\s*\d{1,2}[.\-]\d{1,2}[.\-]\d{4}\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guessSport(folderName) {
  const n = folderName.toLowerCase();
  if (n.includes("футбол")) return "football";
  if (n.includes("волейбол")) return "volleyball";
  return null;
}

function main() {
  if (!fs.existsSync(ALBUMS_DIR)) {
    console.error(`❌ Не найдена папка: ${ALBUMS_DIR}`);
    process.exit(1);
  }

  const albums = fs
    .readdirSync(ALBUMS_DIR)
    .map((folderName) => {
      const folderPath = path.join(ALBUMS_DIR, folderName);
      if (!fs.statSync(folderPath).isDirectory()) return null;

      const photos = fs
        .readdirSync(folderPath)
        .filter((f) => IMG_RE.test(f))
        .sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
        );

      if (photos.length === 0) return null;

      return {
        folder: `images/albums/${folderName}`,
        title: humanTitle(folderName),
        rawName: folderName,
        date: extractDate(folderName, folderPath),
        sport: guessSport(folderName),
        cover: photos[0],
        photos,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // новые сверху

  fs.writeFileSync(OUTPUT, JSON.stringify(albums, null, 2), "utf-8");
  console.log(`✅ albums.json обновлён — ${albums.length} альбом(ов):`);
  albums.forEach((a) =>
    console.log(`   • ${a.title}  (${a.photos.length} фото, ${a.date})`)
  );
}

main();
