/**
 * Reading a lens' active anchors: what each drawn channel is called, where it
 * was recorded, and what value range the server measured for it.
 *
 * An anchor pins metadata to coordinates of the dataset's INTRINSIC system —
 * `{c: 2}` is channel 2, `{}` is the whole dataset, and an anchor that omits an
 * axis is global along it. So a channel's anchors are the ones pinned to its
 * dataset index along the channel axis, plus the ones global along it; the
 * pinned one wins, being the more specific claim.
 *
 * Structural — no generated types — so it runs in node.
 */

import { anchorsForChannel, pinOf } from "@/core/data/plot/model/channelAnchors";

// Which anchor describes which line is the plot engine's; the rest of this
// file is what an experiment reads off them.
export { anchorsForChannel, channelLabelsOf, pinOf } from "@/core/data/plot/model/channelAnchors";

export type AnchorLike = {
  coordinates?: unknown;
  channelLabel?: { label: string } | null;
  valueUnit?: { unit: string } | null;
  valueHistogram?: {
    min?: number | null;
    max?: number | null;
    p1?: number | null;
    p99?: number | null;
  } | null;
  recordingSite?: SiteRefLike | null;
  stimulusSite?: SiteRefLike | null;
};

/** A recording or stimulus site as the thin anchor projection carries it. */
export type SiteRefLike = {
  id?: string;
  kind?: string | null;
  label: string;
  cell?: string | null;
  location?: string | null;
  position?: number | null;
};

/** A channel's site, and which side of the experiment it is on. */
export type ChannelSite = SiteRefLike & { role: "recording" | "stimulus" };

const first = <A, T>(items: readonly A[], pick: (a: A) => T | null | undefined): T | null => {
  for (const item of items) {
    const value = pick(item);
    if (value != null) return value;
  }
  return null;
};

/**
 * One site per drawn channel — where it was recorded, else what stimulated it —
 * from the channel's own anchors, most specific first (null where none names
 * one). A trace with no channel axis is one line, and gets one entry.
 */
export const channelSitesOf = (
  anchors: readonly AnchorLike[],
  channelAxis: string | null,
  channelIndices: readonly number[],
): (ChannelSite | null)[] => {
  const indices: (number | null)[] = channelIndices.length > 0 ? [...channelIndices] : [null];
  return indices.map((index) => {
    const own = anchorsForChannel(anchors, channelAxis, index);
    const recording = first(own, (a) => a.recordingSite);
    if (recording) return { ...recording, role: "recording" as const };
    const stimulus = first(own, (a) => a.stimulusSite);
    return stimulus ? { ...stimulus, role: "stimulus" as const } : null;
  });
};

/**
 * What the layer was recorded at or stimulated through: the site label of the
 * first anchor that names one (a recording site before a stimulus site).
 */
export const siteLabelOf = (anchors: readonly AnchorLike[]): string | null =>
  first(anchors, (a) => a.recordingSite?.label) ?? first(anchors, (a) => a.stimulusSite?.label);

/** The value unit an anchor states, when the dataset does not. */
export const anchorUnitOf = (anchors: readonly AnchorLike[]): string | null =>
  first(anchors, (a) => a.valueUnit?.unit);

/**
 * The value range the server measured for the drawn channels: the union of
 * their histograms' min..max (p1..p99 where min/max are missing). Null when no
 * anchor carries a histogram.
 *
 * This is what lets a trace draw at the right scale on the FIRST tile, instead
 * of at whatever the first window happened to contain.
 */
export const histogramClimOf = (
  anchors: readonly AnchorLike[],
  channelAxis: string | null,
  channelIndices: readonly number[],
): { lo: number; hi: number } | null => {
  let lo = Infinity;
  let hi = -Infinity;
  const indices = channelIndices.length > 0 ? channelIndices : [null];
  for (const index of indices) {
    const histogram = first(anchorsForChannel(anchors, channelAxis, index), (a) => a.valueHistogram);
    if (!histogram) continue;
    const min = histogram.min ?? histogram.p1;
    const max = histogram.max ?? histogram.p99;
    if (min != null && min < lo) lo = min;
    if (max != null && max > hi) hi = max;
  }
  return hi > lo ? { lo, hi } : null;
};

/**
 * The clim a trace starts at, in the order that is most right soonest:
 *  1. the layer's persisted `climMin`/`climMax` (someone chose it);
 *  2. the anchors' value histograms (right before the first tile lands);
 *  3. null — the first window seeds it.
 * A half-persisted clim fills its missing end from the histogram.
 */
export const climSeedOf = (
  persisted: { climMin?: number | null; climMax?: number | null },
  histogram: { lo: number; hi: number } | null,
): { lo: number; hi: number } | null => {
  const lo = persisted.climMin ?? histogram?.lo ?? null;
  const hi = persisted.climMax ?? histogram?.hi ?? null;
  return lo != null && hi != null && hi > lo ? { lo, hi } : null;
};

/**
 * What a trace layer is showing right now, in the terms an anchor pins: dataset
 * indices along the channel axis, and a run of dataset samples along time.
 *
 * The lens' own slices need no place here — `Lens.activeAnchors` already keeps
 * only the anchors inside them. What the server cannot know is what the VIEWER
 * shows: which channel `channelIndex` narrowed the lens to, and which part of
 * the timeline is on screen.
 */
export type AnchorCoverage = {
  channelAxis: string | null;
  /** Dataset indices along the channel axis that are drawn. Empty: no channel axis. */
  channelIndices: readonly number[];
  timeAxis: string | null;
  /** Half-open dataset sample run on screen; null when unknown (everything counts). */
  timeSamples: { start: number; end: number } | null;
};

/**
 * The dataset samples a world-time window covers, off the finest level's law
 * (`t = t0 + i · period`). Half-open, and ordered even when time runs backwards.
 */
export const sampleWindowOf = (
  finest: { t0: number; period: number } | null | undefined,
  window: { start: number; end: number },
): { start: number; end: number } | null => {
  if (!finest || !finest.period || !Number.isFinite(finest.period)) return null;
  const a = (window.start - finest.t0) / finest.period;
  const b = (window.end - finest.t0) / finest.period;
  return { start: Math.min(a, b), end: Math.max(a, b) };
};

/**
 * Whether an anchor describes something on screen: pinned to a drawn channel
 * (or global along the channel axis), and pinned to a sample inside the window
 * (or global along time). Sample `i` spans `[i, i + 1)`, so an anchor on the
 * sample straddling the window's edge is still in view.
 */
export const anchorInView = (coordinates: unknown, coverage: AnchorCoverage): boolean => {
  if (coverage.channelAxis && coverage.channelIndices.length > 0) {
    const pin = pinOf(coordinates, coverage.channelAxis);
    if (pin !== null && !coverage.channelIndices.includes(pin)) return false;
  }
  if (coverage.timeAxis && coverage.timeSamples) {
    const pin = pinOf(coordinates, coverage.timeAxis);
    if (pin !== null && (pin + 1 <= coverage.timeSamples.start || pin >= coverage.timeSamples.end)) {
      return false;
    }
  }
  return true;
};

/** Split anchors into the ones describing what is on screen and the rest, order kept. */
export const partitionAnchors = <A extends { coordinates?: unknown }>(
  anchors: readonly A[],
  coverage: AnchorCoverage,
): { inView: A[]; outOfView: A[] } => {
  const inView: A[] = [];
  const outOfView: A[] = [];
  for (const anchor of anchors) {
    (anchorInView(anchor.coordinates, coverage) ? inView : outOfView).push(anchor);
  }
  return { inView, outOfView };
};

/**
 * One channel's metadata as ONE record, from its in-view anchors ordered most
 * specific first (`anchorsForChannel`): each field is the first anchor's that
 * states it, and acquisition metadata merges key by key the same way — so a
 * value pinned to the channel overrides the dataset-wide one, and nothing
 * stated anywhere is lost.
 */
export const mergeChannelAnchors = <
  A extends {
    channelLabel?: { label: string } | null;
    valueUnit?: { unit: string } | null;
    valueHistogram?: unknown;
    rig?: unknown;
    acquisitionMetadata?: { metadata: unknown } | null;
  },
>(
  anchors: readonly A[],
): {
  label: string | null;
  unit: string | null;
  histogram: NonNullable<A["valueHistogram"]> | null;
  rig: NonNullable<A["rig"]> | null;
  acquisition: [string, unknown][];
} => {
  const acquisition = new Map<string, unknown>();
  for (const anchor of anchors) {
    const metadata = anchor.acquisitionMetadata?.metadata;
    if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) continue;
    for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
      if (value == null || value === "" || acquisition.has(key)) continue;
      acquisition.set(key, value);
    }
  }
  return {
    label: first(anchors, (a) => a.channelLabel?.label),
    unit: first(anchors, (a) => a.valueUnit?.unit),
    histogram: first(anchors, (a) => a.valueHistogram as NonNullable<A["valueHistogram"]> | null),
    rig: first(anchors, (a) => a.rig as NonNullable<A["rig"]> | null),
    acquisition: [...acquisition],
  };
};
