import { config, db, Query, storage, ID } from "./appwrite-client.js";
import { modalOpened, modalClosed } from "../core/modals.js";

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
    modalOpened("news");
    loadNewsList();
  });

  closeBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      modal.classList.remove("open");
      modalClosed("news");
    })
  );

  getElement("addNewsBtn")?.addEventListener("click", () => openEditor(null));
}

export function closeNewsModal() {
  const modal = getElement("newsModal");
  if (!modal || !modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modalClosed("news");
}

export function isNewsOpen() {
  return (
    document.getElementById("newsModal")?.classList.contains("open") || false
  );
}

async function loadNewsList() {
  const list = getElement("newsList");
  list.innerHTML = '<div class="brackets-hint">Загрузка...</div>';

  try {
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
                <label>Фотографии (можно несколько)</label>
                <div class="file-upload-wrapper" id="fileUploadWrapper">
                    <input type="file" id="nfImages" accept="image/*" class="file-input" multiple />
                    <div class="file-upload-content">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span id="fileUploadText">Нажмите, чтобы загрузить фото (можно несколько)</span>
                    </div>
                </div>
                <div id="imagePreviewContainer" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                    ${
                      news && news.gallery
                        ? news.gallery
                            .map(
                              (id) =>
                                `<div class="preview-item" data-id="${id}" style="position: relative;">
                                  <img class="news-image-preview" src="${getFileUrl(
                                    id
                                  )}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px;" />
                                  <button type="button" class="remove-photo-btn" data-id="${id}" style="position: absolute; top: -5px; right: -5px; background: #d84343; color: #fff; border: 0; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: grid; place-items: center;">✕</button>
                                </div>`
                            )
                            .join("")
                        : ""
                    }
                </div>
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

  // Обработчик удаления фото
  let deletedGalleryIds = [];
  editor.querySelectorAll(".remove-photo-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const fileId = btn.dataset.id;
      deletedGalleryIds.push(fileId);

      const previewItem = btn.closest(".preview-item");
      if (previewItem) previewItem.remove();
    });
  });

  getElement("newsForm").addEventListener("submit", (e) =>
    saveNews(e, news, deletedGalleryIds)
  );

  if (news) {
    getElement("deleteNewsBtn").addEventListener("click", () =>
      deleteNews(news)
    );
  }

  // Обработка выбора новых файлов
  const fileInput = getElement("nfImages");
  const uploadWrapper = getElement("fileUploadWrapper");
  const uploadText = getElement("fileUploadText");
  const previewContainer = getElement("imagePreviewContainer");

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        uploadText.textContent = `Выбрано файлов: ${files.length}`;
        uploadWrapper.classList.add("has-file");

        Array.from(files).forEach((file) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const div = document.createElement("div");
            div.className = "preview-item";
            div.style.position = "relative";
            div.innerHTML = `
              <img class="news-image-preview" src="${ev.target.result}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px;" />
            `;
            previewContainer.appendChild(div);
          };
          reader.readAsDataURL(file);
        });
      } else {
        uploadText.textContent =
          "Нажмите, чтобы загрузить фото (можно несколько)";
        uploadWrapper.classList.remove("has-file");
      }
    });
  }
}

async function saveNews(e, existingNews, deletedGalleryIds = []) {
  e.preventDefault();
  const btn = getElement("saveNewsBtn");
  btn.disabled = true;
  btn.textContent = "Сохранение...";

  const title = getElement("nfTitle").value.trim();
  const tag = getElement("nfTag").value.trim();
  const date = getElement("nfDate").value;
  const excerpt = getElement("nfExcerpt").value.trim();
  const body = getElement("nfBody").value.trim();
  const fileInput = getElement("nfImages");
  const files = fileInput.files;

  try {
    let gallery =
      existingNews && existingNews.gallery ? existingNews.gallery : [];

    // 1. Удаляем фото из Storage, если были нажаты крестики
    if (deletedGalleryIds.length > 0) {
      for (const fileId of deletedGalleryIds) {
        await storage.deleteFile("news-images", fileId).catch(() => {});
      }
      gallery = gallery.filter((id) => !deletedGalleryIds.includes(id));
    }

    // 2. Загружаем новые фото, если выбраны
    if (files.length > 0) {
      for (const file of files) {
        const compressed = await compressImage(file, 1200, 0.8);
        const uploaded = await storage.createFile(
          "news-images",
          ID.unique(),
          compressed
        );
        gallery.push(uploaded.$id);
      }
    }

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
      gallery,
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
    openEditor(null);
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
    if (news.gallery) {
      for (const fileId of news.gallery) {
        await storage.deleteFile("news-images", fileId).catch(() => {});
      }
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
