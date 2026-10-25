import { config, db, Query, storage, ID } from "./appwrite-client.js";

let allNews = [];
let currentNewsId = null;

const getElement = (id) => document.getElementById(id);

export function initNews() {
  const openBtn = getElement("openNewsBtn");
  const modal = getElement("newsModal");
  const closeBtns = modal?.querySelectorAll("[data-news-close]");

  if (!openBtn || !modal) return;

  openBtn.addEventListener("click", () => {
    modal.classList.add("open");
    loadNewsList();
  });

  closeBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.classList.remove("open");
    })
  );

  getElement("addNewsBtn")?.addEventListener("click", () => openEditor(null));
}

async function loadNewsList() {
  const list = getElement("newsList");
  list.innerHTML = '<div class="brackets-hint">Загрузка...</div>';

  try {
    // Берем все новости
    const res = await db.listDocuments(config.databaseId, "news", [
      Query.orderDesc("date"),
      Query.limit(100),
    ]);
    allNews = res.documents || [];

    if (allNews.length === 0) {
      list.innerHTML = '<div class="brackets-hint">Нет новостей</div>';
      return;
    }

    list.innerHTML = allNews
      .map(
        (news) => `
            <div class="news-item ${
              news.$id === currentNewsId ? "active" : ""
            }" data-news-id="${news.$id}">
                <div class="news-item__title">${escapeHtml(news.title)}</div>
                <div class="news-item__date">${news.date || ""}</div>
            </div>
        `
      )
      .join("");

    list.querySelectorAll(".news-item").forEach((item) => {
      item.addEventListener("click", () => openEditor(item.dataset.newsId));
    });
  } catch (e) {
    console.error(e);
    list.innerHTML = '<div class="brackets-hint">Ошибка загрузки</div>';
  }
}

function openEditor(id) {
  currentNewsId = id;
  const editor = getElement("newsEditor");
  const news = id ? allNews.find((n) => n.$id === id) : null;

  // Подсветка в списке
  document.querySelectorAll(".news-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.newsId === id);
  });

  editor.innerHTML = `
        <form class="news-form" id="newsForm">
            <h2>${news ? "Редактировать новость" : "Новая новость"}</h2>
            
            <div>
                <label>Заголовок</label>
                <input type="text" id="nfTitle" value="${
                  news ? escapeHtml(news.title) : ""
                }" required />
            </div>
            
            <div>
                <label>Тег (например, ⚽ Футбол)</label>
                <input type="text" id="nfTag" value="${
                  news ? escapeHtml(news.tag || "") : ""
                }" />
            </div>

            <div>
                <label>Дата (ГГГГ-ММ-ДД)</label>
                <input type="date" id="nfDate" value="${
                  news ? news.date : new Date().toISOString().slice(0, 10)
                }" required />
            </div>

            <div>
                <label>Краткое описание (для превью)</label>
                <textarea id="nfExcerpt" rows="3">${
                  news ? escapeHtml(news.excerpt || "") : ""
                }</textarea>
            </div>

            <div>
                <label>Полный текст (абзацы разделяйте пустой строкой)</label>
                <textarea id="nfBody" rows="8">${
                  news ? escapeHtml(news.body || "") : ""
                }</textarea>
            </div>

            <div>
                <label>Фото (необязательно)</label>
                <input type="file" id="nfImage" accept="image/*" />
                ${
                  news && news.imageId
                    ? `<img class="news-image-preview" src="${getFileUrl(
                        news.imageId
                      )}" />`
                    : ""
                }
            </div>

            <div class="news-form-actions">
                ${
                  news
                    ? `<button type="button" class="btn-delete" id="deleteNewsBtn">Удалить</button>`
                    : ""
                }
                <button type="submit" class="btn-save" id="saveNewsBtn">Сохранить</button>
            </div>
        </form>
    `;

  getElement("newsForm").addEventListener("submit", (e) => saveNews(e, news));

  if (news) {
    getElement("deleteNewsBtn").addEventListener("click", () =>
      deleteNews(news)
    );
  }
}

async function saveNews(e, existingNews) {
  e.preventDefault();
  const btn = getElement("saveNewsBtn");
  btn.disabled = true;
  btn.textContent = "Сохранение...";

  const title = getElement("nfTitle").value.trim();
  const tag = getElement("nfTag").value.trim();
  const date = getElement("nfDate").value;
  const excerpt = getElement("nfExcerpt").value.trim();
  const body = getElement("nfBody").value.trim();
  const fileInput = getElement("nfImage");
  const file = fileInput.files[0];

  try {
    let imageId = existingNews ? existingNews.imageId : null;

    // Если выбрано новое фото — сжимаем и загружаем
    if (file) {
      const compressed = await compressImage(file, 1200, 0.8);
      const uploaded = await storage.createFile(
        "news-images",
        ID.unique(),
        compressed
      );
      imageId = uploaded.$id;
    }

    // Генерируем slug из заголовка (латиница)
    let slug = existingNews
      ? existingNews.slug
      : transliterate(title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
    if (!slug) slug = "news-" + Date.now();

    const data = {
      title,
      tag,
      date,
      excerpt,
      body,
      imageId,
      slug,
    };

    if (existingNews) {
      await db.updateDocument(
        config.databaseId,
        "news",
        existingNews.$id,
        data
      );
    } else {
      await db.createDocument(config.databaseId, "news", ID.unique(), data);
    }

    await loadNewsList();
    openEditor(null); // Сброс формы
    alert("Сохранено!");
  } catch (err) {
    console.error(err);
    alert("Ошибка: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Сохранить";
  }
}

async function deleteNews(news) {
  if (!confirm(`Удалить новость "${news.title}"?`)) return;

  try {
    // Удаляем фото из Storage, если оно есть
    if (news.imageId) {
      await storage.deleteFile("news-images", news.imageId).catch(() => {});
    }
    await db.deleteDocument(config.databaseId, "news", news.$id);
    await loadNewsList();
    openEditor(null);
  } catch (err) {
    alert("Ошибка удаления: " + err.message);
  }
}

/* --- Сжатие фото в браузере --- */
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            // Возвращаем File (чтобы Appwrite понимал)
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

function getFileUrl(fileId) {
  return `${config.endpoint}/storage/buckets/news-images/files/${fileId}/view?project=${config.projectId}`;
}

function transliterate(str) {
  const map = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  return str
    .split("")
    .map((c) => map[c.toLowerCase()] || c)
    .join("");
}

function escapeHtml(value) {
  if (!value) return "";
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}
