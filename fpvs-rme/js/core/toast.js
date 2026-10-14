/* ================================================================
 *  TOAST-УВЕДОМЛЕНИЯ
 * ================================================================ */

import { $ } from "./dom.js";

export function toast(text) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

// Existing inline buttons in the page call toast by its global name.
window.toast = toast;
