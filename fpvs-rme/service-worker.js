const CACHE_NAME = "fpvs-public-v2";
const CACHE_PREFIX = "fpvs-public-";
const OLD_CACHE_NAME = "fpvs-rme-v1"; // старый кэш, удаляем при активации

const ASSETS = [
  "./index.html",
  "./style.css",
  "./appwrite-config.js",
  "./images/logo.jpg",
  "./images/hero.jpg",
];

// Установка: кэшируем основные файлы
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("Не все файлы закэшированы:", err);
      });
    })
  );
  self.skipWaiting();
});

// Активация: удаляем старый кэш и старые версии своего
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            if (key === OLD_CACHE_NAME) return true; // удалить старый
            if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) return true;
            return false;
          })
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Стратегия: Сеть в приоритете, кэш как fallback
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Не кэшируем Appwrite
  if (url.hostname.includes("appwrite.io")) return;

  // Не трогаем админку — пусть идёт напрямую в сеть
  if (url.pathname.includes("/admin")) return;

  // Кэшируем только GET своего origin
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
