/**
 * The user's own rail backdrop, as the bytes they picked.
 *
 * In IndexedDB rather than in the settings: settings are one JSON string in
 * localStorage, rewritten on every change and handed whole to every window,
 * and an image of a few megabytes does not belong in that. Settings carry
 * only `railBackdrop: "custom"` and a version; every window of the app shares
 * this store and re-reads it when the version moves.
 */

const DB_NAME = "orkestrator-backdrop";
const STORE = "images";
const KEY = "rail";

/** Larger than this and the rail repaints noticeably while it scrolls. */
export const BACKDROP_MAX_BYTES = 8 * 1024 * 1024;
export const BACKDROP_TYPES = ["image/png", "image/webp", "image/jpeg", "image/svg+xml"];
export const BACKDROP_ACCEPT = BACKDROP_TYPES.join(",");

const megabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** Why `file` cannot be a backdrop, or null when it can. */
export const backdropProblem = (file: { type: string; size: number }): string | null => {
  if (!BACKDROP_TYPES.includes(file.type)) return "A backdrop has to be an image: PNG, WebP, JPEG or SVG.";
  if (file.size > BACKDROP_MAX_BYTES) {
    return `That image is ${megabytes(file.size)}; a backdrop can be at most ${megabytes(BACKDROP_MAX_BYTES)}.`;
  }
  return null;
};

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This window cannot store images."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the image store."));
  });

const run = async <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = work(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error ?? new Error("Could not store the image."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Could not store the image."));
    });
  } finally {
    db.close();
  }
};

export const saveBackdrop = async (blob: Blob): Promise<void> => {
  await run("readwrite", (store) => store.put(blob, KEY));
};

/** The stored image, or null when there is none (never uploaded, or storage cleared). */
export const loadBackdrop = async (): Promise<Blob | null> => {
  const stored = await run<unknown>("readonly", (store) => store.get(KEY));
  return stored instanceof Blob ? stored : null;
};

export const clearBackdrop = async (): Promise<void> => {
  await run("readwrite", (store) => store.delete(KEY));
};

/**
 * Stores `file` as the backdrop, exactly as picked: no re-encode, so a PNG's
 * transparency arrives in the rail the way it was drawn. Throws with a
 * sentence for the user when the file is not usable.
 */
export const importBackdrop = async (file: File): Promise<void> => {
  const problem = backdropProblem(file);
  if (problem) throw new Error(problem);
  await saveBackdrop(file);
};
