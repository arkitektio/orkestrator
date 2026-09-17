/**
 * How wide the app rail is, as a preference the user drags.
 *
 * Stored on `document.documentElement` as `--rail-width`, which is the single
 * token every layout already reads — the rail's own width and the task popout's
 * viewport cap both follow from it, so nothing else needs to know a drag
 * happened.
 *
 * Global rather than per-organization: this is a preference about this person's
 * screen, not about the tenant's data, so it should not reset when they switch
 * organizations (unlike tabs and recents, which must).
 */

export const RAIL_WIDTH_STORAGE_KEY = "orkestrator:rail-width:v1";

/** Narrow enough to be mostly icons, but still wide enough to read a label. */
export const MIN_RAIL_WIDTH = 176;
/** Past this the rail stops being chrome and starts competing with the page. */
export const MAX_RAIL_WIDTH = 384;
export const DEFAULT_RAIL_WIDTH = 240;

export const clampRailWidth = (width: number): number =>
  Math.min(MAX_RAIL_WIDTH, Math.max(MIN_RAIL_WIDTH, Math.round(width)));

export const loadRailWidth = (storage: Storage = localStorage): number => {
  let raw: string | null = null;
  try {
    raw = storage.getItem(RAIL_WIDTH_STORAGE_KEY);
  } catch {
    return DEFAULT_RAIL_WIDTH;
  }
  if (!raw) return DEFAULT_RAIL_WIDTH;

  const parsed = Number(raw);
  // A hand-edited or version-skewed value must not collapse the rail to
  // nothing; anything unreadable falls back rather than being clamped from
  // garbage.
  return Number.isFinite(parsed) ? clampRailWidth(parsed) : DEFAULT_RAIL_WIDTH;
};

export const saveRailWidth = (width: number, storage: Storage = localStorage): void => {
  try {
    storage.setItem(RAIL_WIDTH_STORAGE_KEY, String(clampRailWidth(width)));
  } catch {
    // Quota or blocked storage; the width is a convenience, not state worth
    // failing over.
  }
};

export const applyRailWidth = (width: number): void => {
  document.documentElement.style.setProperty("--rail-width", `${clampRailWidth(width)}px`);
};
