/**
 * Where the divider of a split view sits, as the left pane's share of the
 * width. One value, not per profile: it is a layout preference, like the
 * rail's width, not something that belongs to a membership.
 */
export const SPLIT_RATIO_KEY = "orkestrator:split-ratio:v1";
export const DEFAULT_SPLIT_RATIO = 0.5;
export const MIN_SPLIT_RATIO = 0.2;
export const MAX_SPLIT_RATIO = 0.8;

export const clampSplitRatio = (ratio: number): number =>
  Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio));

export const loadSplitRatio = (storage: Storage | null = safeStorage()): number => {
  try {
    const raw = storage?.getItem(SPLIT_RATIO_KEY);
    const parsed = raw === null || raw === undefined ? NaN : Number(raw);
    return Number.isFinite(parsed) ? clampSplitRatio(parsed) : DEFAULT_SPLIT_RATIO;
  } catch {
    return DEFAULT_SPLIT_RATIO;
  }
};

export const saveSplitRatio = (ratio: number, storage: Storage | null = safeStorage()): void => {
  try {
    storage?.setItem(SPLIT_RATIO_KEY, String(clampSplitRatio(ratio)));
  } catch {
    /* quota or blocked storage; a divider position is a convenience */
  }
};

/** The ratio for a pointer at `clientX` over a container spanning `left`..`left + width`. */
export const splitRatioFromPointer = (clientX: number, left: number, width: number): number =>
  width > 0 ? clampSplitRatio((clientX - left) / width) : DEFAULT_SPLIT_RATIO;

const safeStorage = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};
