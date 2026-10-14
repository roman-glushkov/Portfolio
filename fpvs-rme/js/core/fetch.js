/* ================================================================
 *  ЗАГРУЗКА JSON
 * ================================================================ */

export async function fetchJSON(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (e) {
    console.warn(`[fetchJSON] ${url}:`, e.message);
    return null;
  }
}
