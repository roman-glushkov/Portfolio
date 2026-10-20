const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMAGES_DIR = path.join(__dirname, "images");
const MAX_WIDTH = 1200; // Максимальная ширина (в пикселях)
const QUALITY = 80; // Качество сжатия (80% — идеальный баланс)

async function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath); // Рекурсивно заходим в папку
    } else if (entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name)) {
      // Обрабатываем только JPG и PNG
      try {
        const image = sharp(fullPath);
        const metadata = await image.metadata();

        // Если фото уже меньше 1200px, не трогаем его
        if (metadata.width <= MAX_WIDTH) {
          console.log(`⏭️ Пропуск (уже маленькое): ${fullPath}`);
          continue;
        }

        // Сжимаем
        const tempPath = fullPath + ".tmp";
        await image
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .jpeg({ quality: QUALITY, progressive: true, mozjpeg: true })
          .toFile(tempPath);

        // Заменяем оригинал
        fs.unlinkSync(fullPath);
        fs.renameSync(tempPath, fullPath);

        console.log(`✅ Сжато: ${fullPath}`);
      } catch (error) {
        console.error(`❌ Ошибка с ${fullPath}:`, error.message);
      }
    }
  }
}

async function main() {
  console.log("🚀 Начинаю сжатие фото (это может занять пару минут)...");
  await processDirectory(IMAGES_DIR);
  console.log("🎉 Готово! Все фото сжаты.");
}

main();
