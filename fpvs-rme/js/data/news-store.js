/* Shared state for the news list and post modal. */
let newsItems = [];

export function setNews(items) {
  newsItems = Array.isArray(items) ? items : [];
}

export function getNews() {
  return newsItems;
}

export function findNewsById(slug) {
  return newsItems.find((item) => String(item.slug) === String(slug));
}
