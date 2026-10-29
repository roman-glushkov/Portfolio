/* ================================================================
 *  СЧЁТЧИК ПОСЕЩЕНИЙ И ЧТЕНИЯ НОВОСТЕЙ
 * ================================================================ */

(function () {
  const VISITOR_KEY = "fpvs_visitor_id";

  function getToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function randomId(len = 12) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const arr = new Uint32Array(len);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < len; i++)
        arr[i] = Math.floor(Math.random() * 0xffffffff);
    }
    return Array.from(arr, (v) => chars[v % chars.length]).join("");
  }

  function getVisitorId() {
    let id = null;
    try {
      id = localStorage.getItem(VISITOR_KEY);
    } catch (e) { }

    if (!id) {
      id = randomId(12);
      try {
        localStorage.setItem(VISITOR_KEY, id);
      } catch (e) { }
    }
    return id;
  }

  async function trackVisit() {
    const config = window.APPWRITE_CONFIG;
    if (!config || !config.endpoint || !config.projectId) return;

    const visitorId = getVisitorId();
    const date = getToday();
    const documentId = `${visitorId}_${date}`;

    const base = config.endpoint.replace(/\/+$/, "");
    const rowsUrl = `${base}/tablesdb/${config.databaseId}/tables/page_views/rows`;
    const rowUrl = `${rowsUrl}/${documentId}`;

    const headers = {
      "Content-Type": "application/json",
      "X-Appwrite-Project": config.projectId,
    };

    try {
      const res = await fetch(rowsUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          rowId: documentId,
          data: { visitorId, date, count: 1 },
        }),
      });

      if (res.status === 201) {
        console.log("[views] Новое посещение:", documentId);
        return;
      }

      if (res.status === 409) {
        await incrementCount(rowUrl, headers);
        return;
      }

      console.warn("[views] Appwrite ответил:", res.status);
    } catch (e) {
      console.warn("[views] Ошибка:", e.message);
    }
  }

  async function incrementCount(rowUrl, headers) {
    try {
      const getRes = await fetch(rowUrl, { headers });
      if (!getRes.ok) return;

      const row = await getRes.json();
      const newCount = (row.count || 1) + 1;

      await fetch(rowUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          data: { count: newCount },
        }),
      });

      console.log("[views] count →", newCount);
    } catch (e) {
      console.warn("[views] Не удалось увеличить count:", e.message);
    }
  }

  // --- Чтение новостей ---
  async function trackNewsRead(newsSlug) {
    const config = window.APPWRITE_CONFIG;
    if (!config || !newsSlug) return;

    const visitorId = getVisitorId();
    const date = getToday();

    // Генерируем короткий documentId (максимум 36 символов)
    // Берем первые 15 символов от slug и добавляем visitorId
    const shortSlug = newsSlug.substring(0, 15);
    const documentId = `${shortSlug}_${visitorId}`;

    const url = `${config.endpoint.replace(/\/+$/, "")}/tablesdb/${config.databaseId
      }/tables/news_views/rows`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": config.projectId,
        },
        body: JSON.stringify({
          rowId: documentId,
          data: { newsSlug, visitorId, date },
        }),
      });

      if (res.status === 201) {
        console.log("[views] Новость прочитана:", newsSlug);
      } else if (res.status === 409) {
        // Если запись уже есть (409 Conflict) — это нормально, просто игнорируем
        console.log("[views] Вы уже читали эту новость сегодня");
      } else {
        console.warn("[views] Ошибка записи прочтения, статус:", res.status);
      }
    } catch (e) {
      console.warn("[views] Ошибка записи прочтения:", e.message);
    }
  }

  window.trackNewsRead = trackNewsRead;
  window.addEventListener("DOMContentLoaded", trackVisit);
})();
