/* ================================================================
 *  РАБОТА С ДАТАМИ
 * ================================================================ */

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (m === "01" && d === "01") return y;
  return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

export function formatNewsDate(n) {
  return n.dateLabel || formatDate(n.date);
}
