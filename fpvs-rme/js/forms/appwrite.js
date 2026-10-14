/* ================================================================
 *  APPWRITE — создание документа-заявки
 * ================================================================ */

export function createAppwriteDocumentId() {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const values = new Uint32Array(20);

  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i += 1) {
      values[i] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function getAppwriteConfig() {
  const config = window.APPWRITE_CONFIG || {};
  const requiredFields = ["endpoint", "projectId", "databaseId", "collectionId"];
  const missingField = requiredFields.find((field) => {
    const value = config[field];
    return (
      typeof value !== "string" ||
      !value.trim() ||
      value.includes("PASTE_") ||
      value.includes("<REGION>")
    );
  });

  if (missingField) {
    throw new Error(
      "Appwrite ещё не настроен. Заполни endpoint, projectId, databaseId и collectionId в appwrite-config.js."
    );
  }

  const endpoint = config.endpoint.trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(endpoint)) {
    throw new Error("Endpoint Appwrite должен начинаться с https://.");
  }

  return {
    endpoint,
    projectId: config.projectId.trim(),
    databaseId: config.databaseId.trim(),
    collectionId: config.collectionId.trim(),
  };
}

export async function createLeadDocument(data) {
  const config = getAppwriteConfig();
  const url =
    `${config.endpoint}/databases/${encodeURIComponent(config.databaseId)}` +
    `/collections/${encodeURIComponent(config.collectionId)}/documents`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": config.projectId,
      },
      body: JSON.stringify({
        documentId: createAppwriteDocumentId(),
        data,
      }),
    });
  } catch (error) {
    throw new Error(
      "Не удалось связаться с Appwrite. Проверь интернет, endpoint и Web-платформу в настройках проекта."
    );
  }

  let result = {};
  try {
    result = await response.json();
  } catch (error) {
    result = {};
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Appwrite запретил запись. Проверь разрешение Create для Any у коллекции leads. Не включай публичное чтение."
      );
    }

    if (response.status === 404) {
      throw new Error(
        "Appwrite не нашёл проект, базу или коллекцию. Проверь endpoint и все три идентификатора в appwrite-config.js."
      );
    }

    const details = typeof result.message === "string" ? ` ${result.message}` : "";
    throw new Error(`Appwrite вернул ошибку ${response.status}.${details}`);
  }

  return result;
}
