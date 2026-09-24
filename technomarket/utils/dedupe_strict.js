const fs = require("fs");
const crypto = require("crypto");

const INPUT = "products_local.json"; // файл от download_images.js
const OUTPUT = "products_unique.json"; // куда сохранить

const data = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

const seenHashes = new Map(); // хеш → id первого товара
const result = [];
let removed = 0;

for (const item of data) {
  const img = item.localImg;

  // Если картинка — заглушка, оставляем как есть
  if (
    !img ||
    img.includes("placeholder") ||
    img.includes("images/audio") ||
    img.includes("images/pc") ||
    img.includes("images/tv") ||
    img.includes("images/electronics") ||
    img.includes("images/accessories") ||
    img.includes("images/car")
  ) {
    result.push(item);
    continue;
  }

  // Если файла нет — оставляем как есть
  if (!fs.existsSync(img)) {
    result.push(item);
    continue;
  }

  try {
    const buf = fs.readFileSync(img);
    const hash = crypto.createHash("md5").update(buf).digest("hex");

    if (seenHashes.has(hash)) {
      // Дубликат — удаляем товар
      removed++;
      continue;
    }

    seenHashes.set(hash, item.id);
    result.push(item);
  } catch {
    result.push(item);
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf-8");

console.log(`Всего товаров было: ${data.length}`);
console.log(`Удалено дубликатов: ${removed}`);
console.log(`Осталось уникальных: ${result.length}`);
console.log(`Файл: ${OUTPUT}`);
