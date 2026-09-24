const fs = require("fs");

const data = JSON.parse(fs.readFileSync("products.json", "utf-8"));

const cleaned = data.map((item) => {
  const shortCat = (item.cat || "Прочее").split(",")[0].trim();

  return {
    ...item,
    cat: shortCat,
  };
});

fs.writeFileSync(
  "products_clean.json",
  JSON.stringify(cleaned, null, 2),
  "utf-8"
);

// Посмотрим, что получилось
const unique = [...new Set(cleaned.map((x) => x.cat))];
console.log("Уникальные категории:", unique);
console.log("Всего товаров:", cleaned.length);
