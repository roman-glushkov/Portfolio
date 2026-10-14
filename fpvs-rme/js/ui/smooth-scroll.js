/* ================================================================
 *  ПЛАВНЫЙ СКРОЛЛ
 * ================================================================ */

import { $$ } from "../core/dom.js";

export function initSmoothScroll() {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (href === "#") return;
      const el = document.querySelector(href);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
}
