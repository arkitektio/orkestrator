/**
 * Logo bloks, as the SVG they rendered to.
 *
 * A logo is drawn once by the blok renderer, against its demo state. The
 * `<svg>` it produced is serialized and kept here under the blok's id, with
 * the server's `Blok.hash` of what it renders. Every later showing with the
 * same hash is an `<img>` of that SVG: a list of agents renders no bloks, and
 * fetches no trees.
 *
 * In IndexedDB, like the rail backdrop (`backdropStore.ts`), and mirrored in
 * memory so that a list showing one logo many times reads the store once. One
 * entry per blok: a new hash replaces the old drawing.
 */

const DB_NAME = "orkestrator-logos";
const STORE = "svgs";

/**
 * Bumped when how a logo renders changes (the SVG components themselves), so
 * a drawing cached by an older Orkestrator is drawn again.
 */
export const LOGO_RENDERER_VERSION = 1;

/** What a drawing is cached under: what the blok renders, and which renderer drew it. */
export const logoCacheKey = (hash: string) => `${hash}:v${LOGO_RENDERER_VERSION}`;

type StoredLogo = { key: string; svg: string };

const memory = new Map<string, StoredLogo>();

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This window cannot store logos."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the logo store."));
  });

const run = async <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = work(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not store the logo."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Could not store the logo."));
    });
  } finally {
    db.close();
  }
};

const isStoredLogo = (value: unknown): value is StoredLogo =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as StoredLogo).key === "string" &&
  typeof (value as StoredLogo).svg === "string";

/**
 * The SVG blok `blokId` rendered to, when it was rendered from what `hash`
 * describes; null when it never was, or has changed since. A store that
 * cannot be opened is a miss: the logo is drawn instead.
 */
export const loadLogo = async (blokId: string, hash: string): Promise<string | null> => {
  const key = logoCacheKey(hash);
  const remembered = memory.get(blokId);
  if (remembered) return remembered.key === key ? remembered.svg : null;
  let stored: unknown;
  try {
    stored = await run<unknown>("readonly", (store) => store.get(blokId));
  } catch {
    return null;
  }
  if (!isStoredLogo(stored)) return null;
  memory.set(blokId, stored);
  return stored.key === key ? stored.svg : null;
};

/** Keeps `svg` as blok `blokId`'s drawing for `hash`, replacing whatever was kept for it. */
export const saveLogo = async (blokId: string, hash: string, svg: string): Promise<void> => {
  const entry: StoredLogo = { key: logoCacheKey(hash), svg };
  memory.set(blokId, entry);
  try {
    await run("readwrite", (store) => store.put(entry, blokId));
  } catch (error) {
    // Kept for this window only; the next one draws it again.
    console.warn("[logo] could not store the drawing of", blokId, error);
  }
};

/** Forgets every drawing, in memory and stored. For tests, and a "clear caches" action. */
export const clearLogos = async (): Promise<void> => {
  memory.clear();
  await run("readwrite", (store) => store.clear());
};

/** A drawing as an `<img>` source. */
export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/**
 * The `<svg>` a logo blok drew, as text an `<img>` can show: null when there is
 * none, or when a node in it failed (that drawing is not the logo, so it is not
 * kept).
 */
export const serializeDrawing = (container: Element): string | null => {
  const svg = container.querySelector("svg[data-blok-svg]");
  if (!svg || svg.querySelector("[data-blok-error]")) return null;
  const copy = svg.cloneNode(true) as Element;
  // The serializer declares the SVG namespace itself; an `xmlns` attribute as well
  // would be a duplicate attribute, which no image decoder takes.
  copy.removeAttribute("xmlns");
  const text = new XMLSerializer().serializeToString(copy);
  return /^<svg[^>]*\sxmlns="/.test(text) ? text : text.replace("<svg", `<svg xmlns="${SVG_NAMESPACE}"`);
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
