/* ================================================================
 *  Счётчик уникальных посещений (Appwrite page_views)
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

        const url = `${config.endpoint.replace(/\/+$/, "")}/tablesdb/${config.databaseId}/tables/page_views/rows`;

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Appwrite-Project": config.projectId,
                },
                body: JSON.stringify({
                    rowId: documentId,
                    data: { visitorId, date },
                }),
            });

            // 201 — новая запись (уникальный посетитель за сегодня)
            // 409 — уже есть (тот же посетитель, тот же день) — игнорируем
            if (res.status === 201) {
                console.log("[views] Новое посещение зафиксировано:", documentId);
            } else if (res.status === 409) {
                console.log("[views] Этот посетитель уже был сегодня");
            } else {
                console.warn("[views] Appwrite ответил статусом", res.status);
            }
        } catch (e) {
            console.warn("[views] Не удалось записать посещение:", e.message);
        }
    }

    window.addEventListener("DOMContentLoaded", trackVisit);
})();
