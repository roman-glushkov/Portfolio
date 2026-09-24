const fs = require("fs");
const data = JSON.parse(fs.readFileSync("products.json", "utf-8"));

const groups = {
  // Ноутбуки и ПК
  Computers: "Ноутбуки и ПК",
  "Touch-Screen All-in-One Computers": "Ноутбуки и ПК",
  "Computers/Tablets & Networking": "Ноутбуки и ПК",
  Tablets: "Ноутбуки и ПК",

  // Комплектующие
  "Internal Solid State Drives": "Комплектующие",
  "Desktop Memory": "Комплектующие",
  "Micro SD (SD": "Комплектующие",

  // Аксессуары для ПК
  "Computer Accessories & Peripherals": "Аксессуары для ПК",
  "Computers & Accessories": "Аксессуары для ПК",
  Computers: "Аксессуары для ПК",

  // Наушники
  Headphones: "Наушники",
  "Bluetooth Headsets": "Наушники",

  // Колонки
  Stereos: "Колонки",
  "Portable Bluetooth Speakers": "Колонки",
  "Bluetooth & Wireless Speakers": "Колонки",
  "Surround Speakers": "Колонки",
  "In-Wall & In-Ceiling Speakers": "Колонки",
  "Outdoor Speakers": "Колонки",
  "Floor Speakers": "Колонки",
  Towers: "Колонки",
  "Marine Audio": "Колонки",
  Audio: "Колонки",

  // Домашний кинотеатр
  "Home Theater Systems": "Домашний кинотеатр",
  "Speaker Separates": "Домашний кинотеатр",
  Subwoofers: "Домашний кинотеатр",
  "Receivers Amplifiers": "Домашний кинотеатр",
  "Audio Power Conditioners": "Домашний кинотеатр",
  "Home Audio": "Домашний кинотеатр",
  "Audio & Video Accessories": "Домашний кинотеатр",

  // Телевизоры
  "LCD TVs": "Телевизоры",
  "LED & LCD TVs": "Телевизоры",
  TV: "Телевизоры",
  "All TVs": "Телевизоры",
  "Samsung Smart TVs": "Телевизоры",
  "4K Ultra HD TVs": "Телевизоры",
  "TV & Video": "Телевизоры",
  "TVs & Electronics": "Телевизоры",

  // Проекторы
  "Audio Visual Presentation": "Проекторы и экраны",

  // Авто
  "Car Electronics & GPS": "Автоэлектроника",
  "Parts & Accessories": "Автоэлектроника",
  "Auto & Tires": "Автоэлектроника",
  "Android Auto Receivers": "Автоэлектроника",
  "Satellite Radio": "Автоэлектроника",

  // Смартфоны и планшеты
  Mobile: "Смартфоны и планшеты",

  // Игры
  "Video Games & Consoles": "Игровые консоли",
  Controllers: "Игровые консоли",

  // Камеры
  "Cameras & Photo": "Камеры и фото",
  "Camera & Photo Accessories": "Камеры и фото",
  "Digital Cameras": "Камеры и фото",
  Photography: "Камеры и фото",

  // Умный дом и гаджеты
  "Sports & Handheld GPS": "Умный дом и гаджеты",
  "Sports & Outdoors": "Умный дом и гаджеты",
  "Home & Garden": "Умный дом и гаджеты",

  // Общие
  Electronics: "Электроника",
  "Consumer Electronics": "Электроника",
  Frys: "Электроника",
  Accessories: "Аксессуары",
  Office: "Аксессуары",
  "Straps & Hand Grips": "Аксессуары",
};

const seen = new Set();
const cleaned = data
  .filter((item) => {
    const name = String(item.name || "").trim();
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  })
  .map((item) => {
    const raw = String(item.cat || "").trim();
    const isGarbage =
      raw.length > 30 ||
      /uytueusqxdvcfrxftfeefvcxudq|Save|Tax|Well Chosen|See more/i.test(raw);
    const cat = isGarbage ? "Прочее" : groups[raw] || raw;
    return { ...item, cat };
  });

fs.writeFileSync(
  "products_grouped.json",
  JSON.stringify(cleaned, null, 2),
  "utf-8"
);

const counts = {};
cleaned.forEach((p) => (counts[p.cat] = (counts[p.cat] || 0) + 1));
console.log("Категории:");
Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([c, n]) => console.log(`  ${c}: ${n}`));
console.log(`\nВсего товаров: ${cleaned.length}`);
