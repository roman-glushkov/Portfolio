/* ================================================================
 *  APPWRITE — универсальное чтение данных через REST
 * ================================================================ */

function getConfig() {
    const c = window.APPWRITE_CONFIG || {};
    if (!c.endpoint || !c.projectId || !c.databaseId) {
        throw new Error("Appwrite не настроен. Проверь appwrite-config.js.");
    }
    return {
        endpoint: c.endpoint.trim().replace(/\/+$/, ""),
        projectId: c.projectId.trim(),
        databaseId: c.databaseId.trim(),
    };
}

/**
 * Загрузить список документов из коллекции.
 * @param {string} collectionId — 'news' | 'tournaments' | 'calendar'
 * @param {object} options
 *   - limit: number (по умолчанию 100)
 *   - orderDesc: string — поле для сортировки DESC
 *   - orderAsc:  string — поле для сортировки ASC
 */
export async function appwriteList(collectionId, options = {}) {
    const { endpoint, projectId, databaseId } = getConfig();
    const params = new URLSearchParams();

    params.set("limit", String(options.limit || 100));
    if (options.orderDesc) params.set("orderDesc", options.orderDesc);
    if (options.orderAsc) params.set("orderAsc", options.orderAsc);

    const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?${params}`;

    let res;
    try {
        res = await fetch(url, {
            headers: { "X-Appwrite-Project": projectId },
        });
    } catch (e) {
        console.error(`[appwriteList] ${collectionId}: сеть недоступна`);
        return [];
    }

    if (!res.ok) {
        console.error(`[appwriteList] ${collectionId}: ${res.status}`);
        return [];
    }

    const json = await res.json();
    return Array.isArray(json.documents) ? json.documents : [];
}
