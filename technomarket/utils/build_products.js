const fs = require("fs");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

// ================== НАСТРОЙКИ ==================
const INPUT = "products.json";
const OUTPUT = "products_final.json";
const IMG_DIR = "images";
const TIMEOUT = 6000;
const CONCURRENCY = 8;

const BAD_WORDS = [
  "no-image",
  "placeholder",
  "banner",
  "logo",
  "sprite",
  "icon",
  "thumb",
  "small",
  "ss40",
  "_ss40",
  "temp",
];
const GOOD_DOMAINS = [
  "ssl-images-amazon.com",
  "bbystatic.com",
  "bhphoto.com",
  "walmartimages.com",
  "ebayimg.com",
];

const PLACEHOLDERS = {
  "Аксессуары для ПК": "images/pc.jpg",
  "Ноутбуки и ПК": "images/pc.jpg",
  Комплектующие: "images/pc.jpg",
  Колонки: "images/audio.jpg",
  Наушники: "images/audio.jpg",
  "Домашний кинотеатр": "images/audio.jpg",
  Телевизоры: "images/tv.jpg",
  "Проекторы и экраны": "images/tv.jpg",
  Электроника: "images/electronics.jpg",
  "Смартфоны и планшеты": "images/electronics.jpg",
  "Умный дом и гаджеты": "images/electronics.jpg",
  Аксессуары: "images/accessories.jpg",
  "Камеры и фото": "images/accessories.jpg",
  Автоэлектроника: "images/car.jpg",
  "Игровые консоли": "images/car.jpg",
};

// ================== УТИЛИТЫ ==================
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(
      url,
      {
        timeout: TIMEOUT,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "image/*,*/*;q=0.8",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return resolve({ ok: false, reason: `status ${res.statusCode}` });
        }
        const type = res.headers["content-type"] || "";
        if (!type.startsWith("image/")) {
          res.resume();
          return resolve({ ok: false, reason: `not image (${type})` });
        }

        const file = fs.createWriteStream(dest);
        let size = 0;
        res.on("data", (chunk) => (size += chunk.length));
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          if (size < 3000) {
            fs.unlinkSync(dest);
            return resolve({ ok: false, reason: "too small file" });
          }
          resolve({ ok: true });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, reason: "timeout" });
    });
    req.on("error", (err) =>
      resolve({ ok: false, reason: err.code || "error" })
    );
  });
}

function looksGood(url) {
  const low = url.toLowerCase();
  if (BAD_WORDS.some((w) => low.includes(w))) return false;
  if (!GOOD_DOMAINS.some((d) => low.includes(d))) return false;
  return true;
}

function isBigEnough(filePath) {
  try {
    return fs.statSync(filePath).size > 10 * 1024;
  } catch {
    return false;
  }
}

// ================== ОСНОВНАЯ ЛОГИКА ==================
async function processItem(item, index, total, seenHashes) {
  const id = index + 1;
  const localPath = `${IMG_DIR}/${id}.jpg`;
  const relPath = `images/${id}.jpg`;

  // Если файла нет — качаем
  if (!fs.existsSync(localPath)) {
    const urls = String(item.image || "")
      .split(",")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"))
      .filter(looksGood);

    let downloaded = false;
    for (const url of urls) {
      const res = await download(url, localPath);
      if (res.ok && isBigEnough(localPath)) {
        downloaded = true;
        break;
      } else if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    if (!downloaded) {
      const ph = PLACEHOLDERS[item.cat] || "images/placeholder.jpg";
      console.log(`  [${id}/${total}] ✗ заглушка (${item.cat})`);
      return { ...item, localImg: ph };
    }
  }

  // Считаем MD5 и проверяем дубликат
  try {
    const buf = fs.readFileSync(localPath);
    const hash = crypto.createHash("md5").update(buf).digest("hex");

    if (seenHashes.has(hash)) {
      // Дубликат — удаляем файл и товар
      fs.unlinkSync(localPath);
      console.log(`  [${id}/${total}] ⊘ дубликат удалён`);
      return null;
    }

    seenHashes.set(hash, id);
    console.log(`  [${id}/${total}] ✓ ${relPath}`);
    return { ...item, localImg: relPath };
  } catch {
    return null;
  }
}

async function main() {
  ensureDir(IMG_DIR);

  const data = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  console.log(`Всего товаров: ${data.length}`);
  console.log(`Качаем, проверяем, чистим дубликаты...\n`);

  const seenHashes = new Map();
  const result = [];
  let duplicatesRemoved = 0;
  let placeholders = 0;

  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const batch = data.slice(i, i + CONCURRENCY);
    const processed = await Promise.all(
      batch.map((item, k) => processItem(item, i + k, data.length, seenHashes))
    );

    for (const p of processed) {
      if (p === null) {
        duplicatesRemoved++;
      } else {
        if (p.localImg.includes("placeholder")) placeholders++;
        result.push(p);
      }
    }

    console.log(`  Партия ${i + batch.length}/${data.length} готова`);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf-8");

  console.log(`\n✅ Готово!`);
  console.log(`   Было товаров: ${data.length}`);
  console.log(`   Дубликатов удалено: ${duplicatesRemoved}`);
  console.log(`   Заглушек: ${placeholders}`);
  console.log(`   Осталось: ${result.length}`);
  console.log(`   Файл: ${OUTPUT}`);
}

main().catch(console.error);
