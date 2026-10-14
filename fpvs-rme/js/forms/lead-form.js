/* ================================================================
 *  ФОРМА ЗАЯВКИ
 * ================================================================ */

import { $ } from "../core/dom.js";
import { toast } from "../core/toast.js";
import { createLeadDocument } from "./appwrite.js";

function setFormStatus(message, type = "") {
  const status = $("#formStatus");
  if (!status) return;

  status.textContent = message;
  status.classList.remove("form-status--success", "form-status--error");
  if (type) status.classList.add(`form-status--${type}`);
}

export function initForm() {
  const form = $("#form");
  if (!form) return;

  const topicSelect = $("#leadTopic");
  const registrationFields = $("#registrationFields");
  const teamNameInput = $("#teamName");
  const submitButton = $("#leadSubmit");
  const originalButtonText = submitButton?.textContent || "Отправить заявку";

  const updateRegistrationFields = () => {
    const isRegistration = topicSelect?.value === "Хочу принять участие";
    if (registrationFields) registrationFields.hidden = !isRegistration;
    if (teamNameInput) teamNameInput.required = Boolean(isRegistration);
  };

  topicSelect?.addEventListener("change", updateRegistrationFields);
  updateRegistrationFields();
  form.dataset.startedAt = String(Date.now());

  form.addEventListener("input", () => {
    const status = $("#formStatus");
    if (status?.classList.contains("form-status--error")) {
      setFormStatus("");
    }
  });

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
    const teamName = String(formData.get("teamName") || "").trim();
    const tournament = String(formData.get("tournament") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !phone || !topic || (isRegistration && !teamName)) {
      setFormStatus("Заполни обязательные поля, отмеченные звёздочкой.", "error");
      return;
    }

    const lead = {
      name,
      captain: isRegistration ? name : "",
      phone,
      topic,
      teamName: isRegistration ? teamName : "",
      tournament: isRegistration ? tournament : "",
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
      updateRegistrationFields();
      setFormStatus(
        "Заявка сохранена. Представитель федерации сможет связаться с вами по указанному телефону.",
        "success"
      );
      toast("Заявка успешно отправлена");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Не удалось отправить заявку.";
      setFormStatus(messageText, "error");
      toast("Не удалось отправить заявку");
      console.error("[Appwrite] Не удалось сохранить заявку:", error);
    } finally {
      form.dataset.busy = "false";
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}
