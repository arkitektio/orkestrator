/**
 * Which of a lens' anchors describe which drawn line.
 *
 * An anchor pins metadata to coordinates of the dataset's INTRINSIC system —
 * `{c: 2}` is channel 2, `{}` is the whole dataset, and an anchor that omits an
 * axis is global along it. So a channel's anchors are the ones pinned to its
 * dataset index along the channel axis, plus the ones global along it; the
 * pinned one wins, being the more specific claim.
 *
 * Structural — no generated types — so it runs in node.
 */

export type ChannelAnchorLike = {
  coordinates?: unknown;
  channelLabel?: { label: string } | null;
};

/** The index an anchor pins `axis` to; null when it is global along it. */
export const pinOf = (coordinates: unknown, axis: string): number | null => {
  if (typeof coordinates !== "object" || coordinates === null || Array.isArray(coordinates)) {
    return null;
  }
  const raw = (coordinates as Record<string, unknown>)[axis];
  const value =
    typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
  return Number.isInteger(value) ? value : null;
};

/**
 * The anchors describing one channel, most specific first: pinned to it before
 * global along the channel axis. With no channel axis every anchor applies.
 */
export const anchorsForChannel = <A extends { coordinates?: unknown }>(
  anchors: readonly A[],
  channelAxis: string | null,
  datasetIndex: number | null,
): A[] => {
  if (!channelAxis || datasetIndex == null) return [...anchors];
  const pinned: A[] = [];
  const global: A[] = [];
  for (const anchor of anchors) {
    const pin = pinOf(anchor.coordinates, channelAxis);
    if (pin === null) global.push(anchor);
    else if (pin === datasetIndex) pinned.push(anchor);
  }
  return [...pinned, ...global];
};

/** One label per drawn channel (null where no anchor names it). */
export const channelLabelsOf = (
  anchors: readonly ChannelAnchorLike[],
  channelAxis: string | null,
  channelIndices: readonly number[],
): (string | null)[] =>
  channelIndices.map((index) => {
    for (const anchor of anchorsForChannel(anchors, channelAxis, index)) {
      const label = anchor.channelLabel?.label;
      if (label != null) return label;
    }
    return null;
  });
