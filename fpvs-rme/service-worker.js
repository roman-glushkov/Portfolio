const CACHE_NAME = "fpvs-rme-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/admin.html",
  "/style.css",
  "/appwrite-config.js",
  "/images/logo.jpg",
  "/images/hero.jpg",
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

// Активация: удаляем старые кэши
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Стратегия: Сеть в приоритете, кэш как fallback
self.addEventListener("fetch", (event) => {
  // Не кэшируем запросы к Appwrite (база данных должна быть всегда свежей)
  if (event.request.url.includes("appwrite.io")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Если ответ успешный, клонируем его в кэш
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Если сети нет, отдаем из кэша
        return caches.match(event.request);
      })
  );
});
