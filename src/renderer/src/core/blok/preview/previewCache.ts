/**
 * Blok previews, as the cleaned markup their drawing left (`snapshot.ts`).
 *
 * A panel or a scene is drawn once against its demo state, offscreen, and
 * kept here under the blok's id with the server's `Blok.hash` of what it
 * renders (tree, demo state, context). Every later showing with the same hash
 * places the kept markup: a list of bloks renders none of them and fetches no
 * trees. One entry per blok: a new hash replaces the old preview.
 *
 * Only what `sanitizeSnapshot` returned is ever stored.
 */
import { createKeyedStore } from "../cache/keyedStore";
import type { BlokSnapshot } from "./snapshot";

/**
 * Bumped when how a preview is drawn or kept changes (the components, the
 * cleaning, the viewport), so a preview kept by an older Orkestrator is drawn again.
 */
export const PREVIEW_RENDERER_VERSION = 1;

const isSnapshot = (value: unknown): value is BlokSnapshot =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as BlokSnapshot).html === "string" &&
  typeof (value as BlokSnapshot).width === "number" &&
  typeof (value as BlokSnapshot).height === "number";

const previews = createKeyedStore<BlokSnapshot>({
  db: "orkestrator-blok-previews",
  store: "snapshots",
  version: PREVIEW_RENDERER_VERSION,
  isValue: isSnapshot,
  label: "blok preview",
});

/** What a preview is cached under: what the blok renders, and which renderer drew it. */
export const previewCacheKey = previews.cacheKey;

/** The preview blok `cacheId` left when drawn from what `hash` describes; null when never, or changed since. */
export const loadPreview = (cacheId: string, hash: string): Promise<BlokSnapshot | null> => previews.load(cacheId, hash);

/** Keeps `snapshot` as `cacheId`'s preview of `hash`, replacing whatever was kept for it. */
export const savePreview = (cacheId: string, hash: string, snapshot: BlokSnapshot): Promise<void> =>
  previews.save(cacheId, hash, snapshot);

/** Forgets every preview, in memory and stored. */
export const clearPreviews = (): Promise<void> => previews.clear();

/**
 * Drawings that could not be kept (a model that would not load, a tree that
 * would not come) are not drawn again in this window: a list shown again
 * costs no offscreen render. The next window tries again.
 */
const failed = new Set<string>();
const failedKey = (cacheId: string, hash: string, binding: string) =>
  `${cacheId}:${previewCacheKey(hash)}:${binding}`;

/** `binding` names what else the drawing used (the agents its files came from): another binding may succeed. */
export const markPreviewFailed = (cacheId: string, hash: string, binding = ""): void => {
  failed.add(failedKey(cacheId, hash, binding));
};

export const previewFailed = (cacheId: string, hash: string, binding = ""): boolean =>
  failed.has(failedKey(cacheId, hash, binding));
