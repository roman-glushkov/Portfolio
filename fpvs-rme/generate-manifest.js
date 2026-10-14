/**
 * generate-manifest.js
 * Рекурсивно сканирует images/ и создаёт images/manifest.json
 *
 * Запуск:  node generate-manifest.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const IMAGES_DIR = path.join(ROOT, "images");
const OUTPUT = path.join(IMAGES_DIR, "manifest.json");

const IMG_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

/**
 * Рекурсивно обходит папку и возвращает:
 *   { files: ["1.jpg", "2.jpg"], dirs: { "sub": {...} } }
 */
function scanDir(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  const files = [];
  const dirs = {};

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      dirs[entry.name] = scanDir(fullPath);
    } else if (entry.isFile() && IMG_RE.test(entry.name)) {
      files.push(entry.name);
    }
  }

  // Сортируем файлы "по-человечески": 1.jpg, 2.jpg, 10.jpg, а не 1, 10, 2
  files.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );

  return { files, dirs };
}

/**
 * Убирает пустые ветки, чтобы manifest.json не раздувался.
 * Папка без фото и без вложенных фото-папок — выкидывается.
 */
function prune(node) {
  const cleanDirs = {};
  for (const [name, child] of Object.entries(node.dirs)) {
    const cleaned = prune(child);
    if (cleaned.files.length > 0 || Object.keys(cleaned.dirs).length > 0) {
      cleanDirs[name] = cleaned;
    }
  }
  return { files: node.files, dirs: cleanDirs };
}

function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Не найдена папка: ${IMAGES_DIR}`);
    process.exit(1);
  }

  console.log(`🔍 Сканирую: ${IMAGES_DIR}`);

  const tree = prune(scanDir(IMAGES_DIR));

  const manifest = {
    generatedAt: new Date().toISOString(),
    root: "images",
    tree,
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2), "utf-8");

  // Считаем общее количество фото для отчёта
  let total = 0;
  (function count(node) {
    total += node.files.length;
    for (const child of Object.values(node.dirs)) count(child);
  })(tree);

  console.log(`✅ manifest.json обновлён`);
  console.log(`   📁 Файл:    ${path.relative(ROOT, OUTPUT)}`);
  console.log(`   🖼  Фото:    ${total}`);
  console.log(`   📦 Размер:  ${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB`);
}

main();
