/* ================================================================
 *  ИЗОБРАЖЕНИЯ — работа с images/manifest.json
 * ================================================================ */

let manifestCache = null;
let manifestPromise = null;

async function loadManifest() {
    if (manifestCache) return manifestCache;
    if (manifestPromise) return manifestPromise;

    manifestPromise = (async () => {
        try {
            const res = await fetch("images/manifest.json", { cache: "no-cache" });
            if (!res.ok) throw new Error(`${res.status}`);
            manifestCache = await res.json();
            return manifestCache;
        } catch (e) {
            console.warn("[images] manifest.json не загружен:", e.message);
            manifestCache = { tree: { files: [], dirs: {} } };
            return manifestCache;
        } finally {
            manifestPromise = null;
        }
    })();

    return manifestPromise;
}

function walk(tree, parts) {
    let node = tree;
    for (const part of parts) {
        if (!node || !node.dirs || !node.dirs[part]) return null;
        node = node.dirs[part];
    }
    return node;
}

/** Все URL-ы фото в папке (не рекурсивно). */
export async function getPhotoUrls(...parts) {
    const manifest = await loadManifest();
    const node = walk(manifest.tree, parts);
    if (!node) return [];
    const base = ["images", ...parts].join("/");
    return node.files.map((file) => `${base}/${file}`);
}

/** Первое фото из папки. */
export async function getFirstPhoto(...parts) {
    const urls = await getPhotoUrls(...parts);
    return urls[0] || null;
}

/* ---------- Турниры ---------- */

/**
 * Обложка турнира — ГАРАНТИРОВАННО cover.jpg из папки.
 * Если cover.jpg нет — падаем на первое фото.
 */
export async function getTournamentCover(slug) {
    const photos = await getPhotoUrls("tournaments", slug);
    const cover = photos.find((url) => /\/cover\.jpg$/i.test(url));
    return cover || photos[0] || null;
}

/** Все фото турнира, но cover.jpg первым. */
export async function getTournamentPhotos(slug) {
    const photos = await getPhotoUrls("tournaments", slug);
    const cover = photos.find((url) => /\/cover\.jpg$/i.test(url));
    if (!cover) return photos;
    return [cover, ...photos.filter((url) => url !== cover)];
}

/* ---------- Новости ---------- */

/** Фото новости — images/news/<slug>/. */
export function getNewsPhotoUrls(slug) {
    return getPhotoUrls("news", slug);
}
