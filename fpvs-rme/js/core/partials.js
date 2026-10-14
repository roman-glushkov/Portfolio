/* Loads HTML fragments before page-specific behavior is initialized. */
export async function loadPartials() {
  const placeholders = [...document.querySelectorAll("[data-partial]")];
  const loaded = await Promise.all(placeholders.map(async (placeholder) => {
    const url = placeholder.dataset.partial;
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Не удалось загрузить фрагмент ${url}: ${response.status}`);
    }
    return { placeholder, html: await response.text() };
  }));

  loaded.forEach(({ placeholder, html }) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    placeholder.replaceWith(template.content);
  });
}
