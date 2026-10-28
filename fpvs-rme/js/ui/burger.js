/* ================================================================
 *  МОБИЛЬНОЕ МЕНЮ
 * ================================================================ */

import { $, $$ } from "../core/dom.js";
import { modalOpened, modalClosed, registerModal } from "../core/modals.js";

export function initBurger() {
  const burger = $("#burger");
  const nav = $("#nav");
  if (!burger || !nav) return;

  const isOpen = () => nav.classList.contains("open");

  const openMenu = () => {
    nav.classList.add("open");
    modalOpened("navMenu");
  };

  const closeMenu = () => {
    if (!isOpen()) return;
    nav.classList.remove("open");
    modalClosed("navMenu");
  };

  burger.onclick = () => {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  $$("#nav a").forEach((a) => {
    a.onclick = () => closeMenu();
  });

  // Регистрируем в менеджере модалок
  registerModal("navMenu", closeMenu, isOpen);
}
