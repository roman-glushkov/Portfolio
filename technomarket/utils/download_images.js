const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ================== НАСТРОЙКИ ==================
const INPUT = "products.json"; // исходный JSON
const OUTPUT = "products_local.json"; // куда сохранить
const IMG_DIR = "images"; // папка для картинок
const TIMEOUT = 6000; // 6 сек на запрос
const MIN_SIZE = 200; // минимум 200×200 (меньше — мусор)
const CONCURRENCY = 8; // сколько товаров качать параллельно

// Мусорные домены/слова — если попались, картинку не берём
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

// Заглушки по категориям
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

// Скачать картинку с таймаутом
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
        // Проверяем статус и тип
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
            // Меньше 3 КБ — почти наверняка иконка или заглушка
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

// Проверка ссылки «на дурака» до скачивания
function looksGood(url) {
  const low = url.toLowerCase();
  if (BAD_WORDS.some((w) => low.includes(w))) return false;
  if (!GOOD_DOMAINS.some((d) => low.includes(d))) return false;
  return true;
}

// Проверка размера картинки (первые байты)
function isBigEnough(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size > 10 * 1024; // больше 10 КБ
  } catch {
    return false;
  }
}

// ================== ОСНОВНАЯ ЛОГИКА ==================
async function processItem(item, index, total) {
  const id = index + 1;
  const localPath = `${IMG_DIR}/${id}.jpg`;
  const relPath = `images/${id}.jpg`;

  // Если файл уже есть — просто прописываем путь
  if (fs.existsSync(localPath)) {
    return { ...item, localImg: relPath };
  }

  const urls = String(item.image || "")
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"))
    .filter(looksGood);

  for (const url of urls) {
    const res = await download(url, localPath);
    if (res.ok && isBigEnough(localPath)) {
      console.log(`  [${id}/${total}] ✓ ${url.slice(0, 60)}...`);
      return { ...item, localImg: relPath };
    } else {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }
  }

  // Если ни одна не подошла — заглушка
  const ph = PLACEHOLDERS[item.cat] || "images/placeholder.jpg";
  console.log(`  [${id}/${total}] ✗ заглушка (${item.cat})`);
  return { ...item, localImg: ph };
}

async function main() {
  ensureDir(IMG_DIR);

  const data = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  console.log(`Всего товаров: ${data.length}`);
  console.log(`Качаем картинки...\n`);

  const result = [];
  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const batch = data.slice(i, i + CONCURRENCY);
    const processed = await Promise.all(
      batch.map((item, k) => processItem(item, i + k, data.length))
    );
    result.push(...processed);
    console.log(`  Партия ${i + batch.length}/${data.length} готова`);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), "utf-8");

  // Статистика
  const withReal = result.filter(
    (r) => r.localImg !== "images/placeholder.jpg"
  ).length;
  const withPlaceholder = result.filter((r) =>
    r.localImg.includes("placeholder")
  ).length;

  console.log(`\n✅ Готово!`);
  console.log(`   Реальных картинок: ${withReal}`);
  console.log(`   Заглушек: ${withPlaceholder}`);
  console.log(`   Файл: ${OUTPUT}`);
}

main().catch(console.error);
