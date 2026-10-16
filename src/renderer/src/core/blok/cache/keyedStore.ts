/**
 * What a blok rendered to, kept per blok in IndexedDB under the hash of what
 * it renders, and mirrored in memory so that a list showing one blok many
 * times reads the store once.
 *
 * One entry per id: a new hash replaces the old entry, so the store never
 * grows past the bloks this window has shown. A store that cannot be opened
 * is a miss, and a save still serves this window.
 */
export type KeyedStore<T> = {
  /** What `id` was kept as, when it was rendered from what `hash` describes; null otherwise. */
  load: (id: string, hash: string) => Promise<T | null>;
  /** Keeps `value` as `id`'s rendering of `hash`, replacing whatever was kept for it. */
  save: (id: string, hash: string, value: T) => Promise<void>;
  /** Forgets every entry, in memory and stored. */
  clear: () => Promise<void>;
};

type Stored<T> = { key: string; value: T };

export const createKeyedStore = <T>({
  db: dbName,
  store: storeName,
  version,
  isValue,
  label,
  /** How an entry was spelled before it was `{ key, value }` (the logo store's `{ key, svg }`). */
  legacy,
}: {
  db: string;
  store: string;
  /** Bumped when how the renderer draws changes: older entries are drawn again. */
  version: number;
  isValue: (value: unknown) => value is T;
  /** Named in warnings. */
  label: string;
  legacy?: { read: (stored: unknown) => Stored<T> | null; write: (entry: Stored<T>) => unknown };
}): KeyedStore<T> & { cacheKey: (hash: string) => string } => {
  const memory = new Map<string, Stored<T>>();
  const cacheKey = (hash: string) => `${hash}:v${version}`;

  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error(`This window cannot store ${label}s.`));
        return;
      }
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Could not open the ${label} store.`));
    });

  const run = async <R>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> => {
    const db = await open();
    try {
      return await new Promise<R>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const request = work(transaction.objectStore(storeName));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error ?? new Error(`Could not store the ${label}.`));
        transaction.onabort = () => reject(transaction.error ?? new Error(`Could not store the ${label}.`));
      });
    } finally {
      db.close();
    }
  };

  const read = (stored: unknown): Stored<T> | null => {
    if (legacy) return legacy.read(stored);
    if (typeof stored !== "object" || stored === null) return null;
    const entry = stored as Stored<T>;
    return typeof entry.key === "string" && isValue(entry.value) ? entry : null;
  };

  return {
    cacheKey,
    load: async (id, hash) => {
      const key = cacheKey(hash);
      const remembered = memory.get(id);
      if (remembered) return remembered.key === key ? remembered.value : null;
      let stored: unknown;
      try {
        stored = await run<unknown>("readonly", (store) => store.get(id));
      } catch {
        return null;
      }
      const entry = read(stored);
      if (!entry) return null;
      memory.set(id, entry);
      return entry.key === key ? entry.value : null;
    },
    save: async (id, hash, value) => {
      const entry: Stored<T> = { key: cacheKey(hash), value };
      memory.set(id, entry);
      try {
        await run("readwrite", (store) => store.put(legacy ? legacy.write(entry) : entry, id));
      } catch (error) {
        // Kept for this window only; the next one draws it again.
        console.warn(`[${label}] could not store the rendering of`, id, error);
      }
    },
    clear: async () => {
      memory.clear();
      await run("readwrite", (store) => store.clear());
    },
  };
};
