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

/**
 * How wide a tab opened to the side STARTS: a name, or the side pane's share
 * of the width (clamped to what the divider allows). A hint for that one
 * open; dragging the divider afterwards is the user's and is saved as usual.
 * `tiny` (a fifth, as narrow as the divider goes) suits a list kept at hand
 * (My todos beside an image), `wide` a page that becomes the focus.
 */
export type SideSize = "tiny" | "narrow" | "half" | "wide" | number;

const SIDE_SHARE: Record<Exclude<SideSize, number>, number> = {
  tiny: 1 / 5,
  narrow: 1 / 3,
  half: 1 / 2,
  wide: 2 / 3,
};

/** The divider position (the LEFT pane's share) that gives the side pane `size`. */
export const ratioForSide = (size: SideSize): number => {
  const share = typeof size === "number" ? size : SIDE_SHARE[size];
  return Number.isFinite(share) ? clampSplitRatio(1 - share) : DEFAULT_SPLIT_RATIO;
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
