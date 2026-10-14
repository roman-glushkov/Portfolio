/* ================================================================
 *  МОБИЛЬНОЕ МЕНЮ
 * ================================================================ */

import { $, $$ } from "../core/dom.js";

export function initBurger() {
  const burger = $("#burger");
  const nav = $("#nav");
  if (!burger || !nav) return;

  burger.onclick = () => nav.classList.toggle("open");
  $$("#nav a").forEach((a) => {
    a.onclick = () => nav.classList.remove("open");
  });
}
