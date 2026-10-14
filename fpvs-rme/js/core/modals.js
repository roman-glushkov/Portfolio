/* ================================================================
 *  МЕНЕДЖЕР МОДАЛОК
 *  Back-кнопка закрывает верхнюю модалку
 * ================================================================ */

const MODALS = {};          // id → { closeFn, isOpenFn }
const stack = [];           // порядок открытых
let isPoppingState = false; // флаг: "мы сами вызвали history.back()"

export function registerModal(id, closeFn, isOpenFn) {
    MODALS[id] = { closeFn, isOpenFn };
}

export function modalOpened(id) {
    if (stack.includes(id)) return;
    stack.push(id);
    history.pushState({ __modal: id }, "");
}

export function modalClosed(id) {
    const i = stack.indexOf(id);
    if (i === -1) return;
    stack.splice(i, 1);

    // Если мы НЕ в popstate — откатываем историю
    if (!isPoppingState) {
        isPoppingState = true;
        history.back();
    } else {
        isPoppingState = false;
    }
}

window.addEventListener("popstate", () => {
    // Пользователь нажал "Назад"
    if (isPoppingState) {
        // это наш собственный back() — игнорируем
        isPoppingState = false;
        return;
    }

    // Закрываем верхнюю открытую модалку
    for (let i = stack.length - 1; i >= 0; i--) {
        const id = stack[i];
        const m = MODALS[id];
        if (m && m.isOpenFn()) {
            // ставим флаг, чтобы closeFn не дёрнул history.back() опять
            isPoppingState = true;
            m.closeFn();
            stack.splice(i, 1);
            // сбрасываем флаг через микрозадержку
            setTimeout(() => { isPoppingState = false; }, 0);
            return;
        }
    }
});
