// ================== ДАННЫЕ ==================
let products = [];
let cart = JSON.parse(localStorage.getItem("tm-cart") || "[]");
let fav = new Set(JSON.parse(localStorage.getItem("tm-fav") || "[]"));

// ================== ПАГИНАЦИЯ ==================
let currentPage = 1;
const PER_PAGE = 20;
let filtered = [];

const $ = (s) => document.querySelector(s);
const money = (n) => Number(n).toLocaleString("ru-RU") + " ₽";

// ================== ПАРС ЦЕНЫ ==================
function parsePrice(v) {
  if (typeof v === "number") return Math.round(v);
  if (typeof v !== "string") return 0;
  const cleaned = v
    .replace(/\s/g, "")
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

// ================== ЗАГРУЗКА ==================
async function loadProducts() {
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("Не удалось загрузить products.json");
    const data = await res.json();

    products = data.map((p, i) => {
      const price = parsePrice(p.price);
      return {
        id: i + 1,
        cat: String(p.cat || p.category || "Прочее")
          .split(",")[0]
          .trim(),
        brand: String(p.brand || "Без бренда").trim(),
        name: String(p.name || "Без названия")
          .replace(/^Details About\s+/i, "")
          .replace(/\s+/g, " ")
          .trim(),
        price: price,
        old: Math.round(price * (1 + (Math.random() * 0.15 + 0.05))),
        rating: (4 + Math.random()).toFixed(1),
        reviews: Math.floor(Math.random() * 300) + 20,
        img: p.localImg || "images/placeholder.jpg",
        spec: p.spec || "",
      };
    });

    render();
  } catch (err) {
    console.error(err);
    $("#products").innerHTML =
      '<p style="color:#888">Не удалось загрузить товары.</p>';
  }
}

// ================== РЕНДЕР ТОВАРОВ ==================
function render(list = products) {
  filtered = list;
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = 1;

  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = list.slice(start, start + PER_PAGE);

  $("#products").innerHTML = pageItems
    .map((p) => {
      const discount =
        p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
      return `
      <article class="product">
        <div class="pic">
          <img src="${p.img}" alt="${
        p.name
      }" onerror="this.style.display='none'">
          ${discount > 0 ? `<span class="sale">−${discount}%</span>` : ""}
          <button class="heart" data-fav="${p.id}">${
        fav.has(p.id) ? "♥" : "♡"
      }</button>
        </div>
        <h3>${p.name}</h3>
        <div class="rating">★ ${p.rating} <span>${
        p.reviews
      } отзывов</span></div>
        ${p.old > p.price ? `<div class="old">${money(p.old)}</div>` : ""}
        <div class="price">${money(p.price)}</div>
        <button class="add" data-add="${p.id}">В корзину</button>
      </article>
    `;
    })
    .join("");

  $("#result").textContent = `${list.length} товаров`;
  renderPagination(totalPages);
}

// ================== РЕНДЕР ПАГИНАЦИИ ==================
function renderPagination(totalPages) {
  const box = $("#pagination");
  if (!box) return;

  const pages = [];
  const delta = 2;

  pages.push(1);

  if (totalPages <= 7) {
    for (let i = 2; i <= totalPages; i++) pages.push(i);
  } else {
    let left = Math.max(2, currentPage - delta);
    let right = Math.min(totalPages - 1, currentPage + delta);

    if (currentPage <= 3) {
      left = 2;
      right = 5;
    }
    if (currentPage >= totalPages - 2) {
      left = totalPages - 4;
      right = totalPages - 1;
    }

    if (left > 2) pages.push("dots-left");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("dots-right");

    pages.push(totalPages);
  }

  let html = "";
  html += `<button data-page="prev" ${
    currentPage === 1 ? "disabled" : ""
  }>←</button>`;

  pages.forEach((p) => {
    if (typeof p === "string" && p.startsWith("dots")) {
      html += `<span class="dots">…</span>`;
    } else {
      html += `<button data-page="${p}" class="${
        p === currentPage ? "active" : ""
      }">${p}</button>`;
    }
  });

  html += `<button data-page="next" ${
    currentPage === totalPages ? "disabled" : ""
  }>→</button>`;

  box.innerHTML = html;
}

// ================== ФИЛЬТРЫ ==================
function filters() {
  const c = [...document.querySelectorAll(".cf:checked")].map((x) => x.value);
  const b = [...document.querySelectorAll(".bf:checked")].map((x) => x.value);
  const min = +$("#min").value || 0;
  const max = +$("#max").value || 999999;
  const r = +$("input[name=rating]:checked")?.value || 0;

  let list = products.filter(
    (p) =>
      (!c.length || c.includes(p.cat)) &&
      (!b.length || b.includes(p.brand)) &&
      p.price >= min &&
      p.price <= max &&
      p.rating >= r
  );

  const s = $("#sort").value;
  if (s === "up") list.sort((a, b) => a.price - b.price);
  if (s === "down") list.sort((a, b) => b.price - a.price);
  if (s === "rating") list.sort((a, b) => b.rating - a.rating);

  currentPage = 1;
  render(list);
}

// ================== КОРЗИНА ==================
function save() {
  localStorage.setItem("tm-cart", JSON.stringify(cart));
  localStorage.setItem("tm-fav", JSON.stringify([...fav]));
  $("#count").textContent = cart.reduce((a, x) => a + x.qty, 0);
}

function toast(t) {
  const x = $("#toast");
  x.textContent = t;
  x.classList.add("show");
  setTimeout(() => x.classList.remove("show"), 1600);
}

function openCart() {
  const box = $("#cartItems");
  box.innerHTML = cart.length
    ? cart
        .map((x) => {
          const p = products.find((y) => y.id === x.id);
          if (!p) return "";
          return `
          <div class="cartRow">
            <img src="${p.img}" onerror="this.style.display='none'">
            <div>
              <b>${p.name}</b>
              <div class="qty">
                <button data-m="${p.id}">−</button>
                <span>${x.qty}</span>
                <button data-p="${p.id}">+</button>
              </div>
            </div>
            <strong>${money(p.price * x.qty)}</strong>
          </div>
        `;
        })
        .join("")
    : '<p style="color:#888">В корзине пока ничего нет.</p>';

  $("#total").textContent = money(
    cart.reduce((s, x) => {
      const p = products.find((p) => p.id === x.id);
      return s + (p ? p.price * x.qty : 0);
    }, 0)
  );
  $("#modal").classList.add("show");
}

// ================== СОБЫТИЯ ==================
document.addEventListener("click", (e) => {
  // Пагинация
  const pageBtn = e.target.closest("[data-page]");
  if (pageBtn) {
    const val = pageBtn.dataset.page;
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    if (val === "prev" && currentPage > 1) currentPage--;
    else if (val === "next" && currentPage < totalPages) currentPage++;
    else if (!isNaN(+val)) currentPage = +val;

    render(filtered);
    document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
    return;
  }

  const add = e.target.closest("[data-add]");
  if (add) {
    const id = +add.dataset.add;
    const item = cart.find((q) => q.id === id);
    item ? item.qty++ : cart.push({ id, qty: 1 });
    save();
    toast("Товар добавлен в корзину");
  }

  const heart = e.target.closest("[data-fav]");
  if (heart) {
    const id = +heart.dataset.fav;
    fav.has(id) ? fav.delete(id) : fav.add(id);
    save();
    render(filtered);
  }

  const cat = e.target.closest("[data-cat]");
  if (cat) {
    document
      .querySelectorAll(".cf")
      .forEach((x) => (x.checked = x.value === cat.dataset.cat));
    location.hash = "catalog";
    filters();
  }

  const plus = e.target.closest("[data-p]");
  if (plus) {
    cart.find((x) => x.id === +plus.dataset.p).qty++;
    save();
    openCart();
  }

  const minus = e.target.closest("[data-m]");
  if (minus) {
    const item = cart.find((x) => x.id === +minus.dataset.m);
    item.qty--;
    if (item.qty < 1) cart = cart.filter((y) => y !== item);
    save();
    openCart();
  }

  if (e.target.classList.contains("close")) {
    $("#modal").classList.remove("show");
  }
});

// ================== ИНИЦИАЛИЗАЦИЯ ==================
document.addEventListener("DOMContentLoaded", () => {
  $("#cart").onclick = openCart;

  $("#checkout").onclick = () => {
    cart = [];
    save();
    $("#modal").classList.remove("show");
    toast("Заказ оформлен в демо-режиме");
  };

  $("#clear").onclick = () => {
    document
      .querySelectorAll(".filters input")
      .forEach((x) => (x.checked = false));
    $("#min").value = "";
    $("#max").value = "";
    $("#range").value = 160000;
    filters();
  };

  document
    .querySelectorAll(".filters input")
    .forEach((x) => (x.onchange = filters));
  $("#sort").onchange = filters;
  $("#range").oninput = (e) => {
    $("#max").value = e.target.value;
    filters();
  };

  $("#searchBtn").onclick = () => {
    const q = $("#search").value.toLowerCase();
    currentPage = 1;
    render(
      products.filter((p) =>
        (p.name + p.brand + p.cat).toLowerCase().includes(q)
      )
    );
  };
  $("#search").onkeydown = (e) => {
    if (e.key === "Enter") $("#searchBtn").click();
  };

  document.querySelectorAll("[data-go]").forEach(
    (x) =>
      (x.onclick = () => {
        document.getElementById(x.dataset.go).scrollIntoView();
      })
  );

  save();
  loadProducts();
});
