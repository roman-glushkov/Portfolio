/* ================================================================
 *  СЧЁТЧИК ПОСЕЩЕНИЙ
 *  Каждый заход увеличивает count. Уникальные считаются по visitorId.
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

  function randomId(len = 20) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const arr = new Uint32Array(len);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 0xffffffff);
    }
    return Array.from(arr, (v) => chars[v % chars.length]).join("");
  }

  function getVisitorId() {
    let id = null;
    try {
      id = localStorage.getItem(VISITOR_KEY);
    } catch (e) { }

    if (!id) {
      id = randomId(20);
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

    // 1. Пробуем создать новую запись
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
        // Запись уже есть — увеличиваем count
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
      // Получаем текущую запись
      const getRes = await fetch(rowUrl, { headers });
      if (!getRes.ok) return;

      const row = await getRes.json();
      const newCount = (row.count || 1) + 1;

      // Обновляем
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

  window.addEventListener("DOMContentLoaded", trackVisit);
})();
