/* ================================================================
 *  ФОРМА ЗАЯВКИ
 *  - Выбор турнира (для "узнать" и "принять участие")
 *  - Для "принять участие" — только предстоящие турниры
 *  - Командные заявки (N игроков, если teamSize > 1)
 * ================================================================ */

import { $ } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { appwriteList } from "../core/appwrite.js";
import { createLeadDocument } from "./appwrite.js";

const OTHER_VALUE = "__other__";

let TOURNAMENTS_CACHE = [];
let TOURNAMENTS_FUTURE = [];
let TOURNAMENTS_PAST = [];

export async function initForm() {
  const form = $("#form");
  if (!form) return;

  await loadTournamentsIntoSelect();

  const topicSelect = $("#leadTopic");
  const tournamentFields = $("#tournamentFields");
  const tournamentSelect = $("#leadTournament");
  const customBlock = $("#customTournamentBlock");
  const customInput = $("#leadTournamentCustom");
  const registrationFields = $("#registrationFields");
  const teamNameInput = $("#teamName");
  const playersBlock = $("#playersBlock");
  const submitButton = $("#leadSubmit");
  const originalButtonText = submitButton?.textContent || "Отправить заявку";

  /* ---------- Видимость блоков ---------- */

  const updateVisibility = () => {
    const topic = topicSelect?.value || "";
    const needsTournament = topic === "Хочу узнать о турнире" || topic === "Хочу принять участие";
    const isRegistration = topic === "Хочу принять участие";

    if (tournamentFields) tournamentFields.hidden = !needsTournament;
    if (tournamentSelect) tournamentSelect.required = needsTournament;

    // При "принять участие" — только предстоящие турниры
    if (needsTournament) {
      renderTournamentOptions(isRegistration);
    }

    const isOther = tournamentSelect?.value === OTHER_VALUE;
    if (customBlock) customBlock.hidden = !isOther || !needsTournament;
    if (customInput) customInput.required = isOther && needsTournament;

    if (registrationFields) registrationFields.hidden = !isRegistration;
    if (teamNameInput) teamNameInput.required = Boolean(isRegistration);

    renderPlayersFields(isRegistration);
  };

  /* ---------- Опции турниров в select ---------- */

  const renderTournamentOptions = (onlyFuture) => {
    if (!tournamentSelect) return;

    const renderOption = (t) =>
      `<option value="${escapeAttr(t.slug)}">${escapeHtml(t.title)}</option>`;

    const currentValue = tournamentSelect.value;

    if (onlyFuture) {
      tournamentSelect.innerHTML = `
        <option value="">— Выберите турнир —</option>
        ${TOURNAMENTS_FUTURE.length
          ? TOURNAMENTS_FUTURE.map(renderOption).join("")
          : `<option value="" disabled>Пока нет предстоящих турниров</option>`}
        <option value="${OTHER_VALUE}">Другое (ввести вручную)</option>
      `;
    } else {
      tournamentSelect.innerHTML = `
        <option value="">— Выберите турнир —</option>
        ${TOURNAMENTS_FUTURE.length ? `<optgroup label="Предстоящие">${TOURNAMENTS_FUTURE.map(renderOption).join("")}</optgroup>` : ""}
        ${TOURNAMENTS_PAST.length ? `<optgroup label="Прошедшие">${TOURNAMENTS_PAST.map(renderOption).join("")}</optgroup>` : ""}
        <option value="${OTHER_VALUE}">Другое (ввести вручную)</option>
      `;
    }

    // Восстанавливаем выбор, если он доступен
    if (currentValue && [...tournamentSelect.options].some((o) => o.value === currentValue)) {
      tournamentSelect.value = currentValue;
    }
  };

  /* ---------- Поля игроков ---------- */

  const renderPlayersFields = (isRegistration) => {
    if (!playersBlock) return;

    if (!isRegistration) {
      playersBlock.innerHTML = "";
      return;
    }

    const selectedSlug = tournamentSelect?.value || "";
    if (!selectedSlug || selectedSlug === OTHER_VALUE) {
      playersBlock.innerHTML = "";
      return;
    }

    const t = TOURNAMENTS_CACHE.find((x) => x.slug === selectedSlug);
    const teamSize = Number(t?.teamSize || 0);

    if (!teamSize || teamSize <= 1) {
      playersBlock.innerHTML = "";
      return;
    }

    const rows = [];
    rows.push(`
      <label class="form-label">Состав команды (${teamSize} чел.) *</label>
      <input name="player1" maxlength="120" placeholder="Игрок 1 (капитан)"
             value="${escapeAttr($("#leadName")?.value || "")}" readonly />
    `);
    for (let i = 2; i <= teamSize; i++) {
      rows.push(`<input name="player${i}" maxlength="120" placeholder="Игрок ${i} *" required />`);
    }

    playersBlock.innerHTML = rows.join("");
  };

  /* ---------- Обработчики ---------- */

  topicSelect?.addEventListener("change", updateVisibility);
  tournamentSelect?.addEventListener("change", updateVisibility);
  $("#leadName")?.addEventListener("input", () => {
    const firstPlayerInput = playersBlock?.querySelector('input[name="player1"]');
    if (firstPlayerInput) {
      firstPlayerInput.value = $("#leadName")?.value || "";
    }
  });

  updateVisibility();
  form.dataset.startedAt = String(Date.now());

  form.addEventListener("input", () => {
    const status = $("#formStatus");
    if (status?.classList.contains("form-status--error")) {
      setFormStatus("");
    }
  });

  /* ---------- Отправка ---------- */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.busy === "true") return;

    const formData = new FormData(form);
    const honeypot = String(formData.get("website") || "").trim();
    if (honeypot) return;

    if (Date.now() - Number(form.dataset.startedAt || 0) < 1200) {
      setFormStatus("Проверь данные и попробуй отправить заявку ещё раз через секунду.", "error");
      return;
    }

    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const topic = String(formData.get("topic") || "").trim();
    const isRegistration = topic === "Хочу принять участие";
    const needsTournament = topic === "Хочу узнать о турнире" || isRegistration;

    let tournament = "";
    let tournamentSlug = "";
    if (needsTournament) {
      const sel = String(formData.get("tournament") || "").trim();
      if (sel === OTHER_VALUE) {
        tournament = String(formData.get("tournamentCustom") || "").trim();
      } else {
        const t = TOURNAMENTS_CACHE.find((x) => x.slug === sel);
        tournament = t?.title || sel;
        tournamentSlug = sel;
      }
    }

    const teamName = isRegistration ? String(formData.get("teamName") || "").trim() : "";
    const message = String(formData.get("message") || "").trim();

    const players = [];
    if (isRegistration) {
      for (let i = 1; i <= 20; i++) {
        const v = String(formData.get(`player${i}`) || "").trim();
        if (v) players.push(v);
      }
    }

    if (!name || !phone || !topic) {
      setFormStatus("Заполни обязательные поля, отмеченные звёздочкой.", "error");
      return;
    }
    if (needsTournament && !tournament) {
      setFormStatus("Укажи турнир.", "error");
      return;
    }
    if (isRegistration && !teamName) {
      setFormStatus("Введи название команды.", "error");
      return;
    }

    const lead = {
      name,
      captain: isRegistration ? name : "",
      phone,
      topic,
      tournament,
      tournamentSlug,
      teamName,
      players: players.join(", "),
      message,
      status: "new",
      source: "fpvs-rme-website",
    };

    form.dataset.busy = "true";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Отправка…";
    }
    setFormStatus("Отправляем заявку…");

    try {
      await createLeadDocument(lead);
      form.reset();
      form.dataset.startedAt = String(Date.now());
      if (playersBlock) playersBlock.innerHTML = "";
      updateVisibility();
      setFormStatus("Заявка сохранена. Представитель федерации свяжется с вами.", "success");
      toast("Заявка успешно отправлена");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Не удалось отправить заявку.";
      setFormStatus(messageText, "error");
      toast("Не удалось отправить заявку");
      console.error("[Appwrite] Ошибка:", error);
    } finally {
      form.dataset.busy = "false";
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}

/* ---------- Загрузка турниров ---------- */

async function loadTournamentsIntoSelect() {
  const items = await appwriteList("tournaments", {
    orderDesc: "dateSort",
    limit: 100,
  });

  const today = new Date().toISOString().slice(0, 10);

  const future = items
    .filter((t) => (t.dateSort || "") >= today)
    .sort((a, b) => (a.dateSort < b.dateSort ? -1 : 1));

  const past = items
    .filter((t) => (t.dateSort || "") < today)
    .sort((a, b) => (a.dateSort < b.dateSort ? 1 : -1));

  TOURNAMENTS_CACHE = [...future, ...past];
  TOURNAMENTS_FUTURE = future;
  TOURNAMENTS_PAST = past;
}

/* ---------- Утилиты ---------- */

function setFormStatus(message, type = "") {
  const status = $("#formStatus");
  if (!status) return;

  status.textContent = message;
  status.classList.remove("form-status--success", "form-status--error");
  if (type) status.classList.add(`form-status--${type}`);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/**
 * Предзаполнить форму заявки извне (например, из карточки турнира).
 * @param {object} opts
 *   - topic: "Хочу принять участие" | "Хочу узнать о турнире" | ...
 *   - tournamentSlug: string
 */
export function prefillLeadForm(opts = {}) {
  const topicSelect = document.getElementById("leadTopic");
  const tournamentSelect = document.getElementById("leadTournament");
  if (!topicSelect) return;

  if (opts.topic) {
    topicSelect.value = opts.topic;
    topicSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // После того как тема сменилась — обновляем список турниров
  // и выбираем нужный
  if (opts.tournamentSlug && tournamentSelect) {
    // Небольшая задержка, чтобы updateVisibility успел перестроить опции
    setTimeout(() => {
      tournamentSelect.value = opts.tournamentSlug;
      tournamentSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }, 50);
  }

  // Фокус на первое поле
  setTimeout(() => {
    document.getElementById("leadName")?.focus();
  }, 200);
}

/**
 * Перехватывает клики по ссылкам с data-prefill-topic.
 * Например: <a data-prefill-topic="Хочу стать партнёром" href="#contacts">
 */
export function initPrefillLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-prefill-topic]");
    if (!link) return;

    const topic = link.dataset.prefillTopic;
    if (!topic) return;

    // Не мешаем smooth-scroll — он тоже сработает (по href="#contacts")
    // Но добавляем своё: префилл
    prefillLeadForm({ topic });
  });
}
