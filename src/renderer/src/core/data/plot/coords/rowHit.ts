/**
 * Which trace row a world y falls in — the row a value shape is drawn over.
 *
 * Bands are keyed `${layerId}:${channel}` (`bandKey`), where `channel` is the
 * index into the layer's DRAWN channels. Only the layers `candidates` names are
 * considered, in that order: in SHARED mode several traces overlay one band,
 * and they share one clim there, so the first is as good as any.
 *
 * Null outside every candidate's band, or for a band whose clim is not seeded
 * yet (its values have no scale to be read against).
 *
 * Structural (a leaf of `platform/`): the caller passes `climOf`, which is the
 * viewer store's `effectiveClim` over its clims.
 *
 * Pure — runs in node.
 */

type BandLike = { bottom: number; top: number };
type ClimLike = { lo: number; hi: number };

export type RowHit<B extends BandLike = BandLike> = {
  layerId: string;
  channel: number;
  band: B;
  clim: ClimLike;
};

/** Split a band key back into its layer and channel. */
export const parseBandKey = (key: string): { layerId: string; channel: number } | null => {
  const at = key.lastIndexOf(":");
  if (at <= 0) return null;
  const channel = Number(key.slice(at + 1));
  return Number.isInteger(channel) ? { layerId: key.slice(0, at), channel } : null;
};

export const rowHitAt = <B extends BandLike>(
  y: number,
  bands: Record<string, B>,
  climOf: (band: B) => ClimLike | null,
  candidates: readonly string[],
): RowHit<B> | null => {
  const rank = new Map(candidates.map((id, i) => [id, i]));
  let best: RowHit<B> | null = null;
  let bestRank = Infinity;
  for (const [key, band] of Object.entries(bands)) {
    const lo = Math.min(band.bottom, band.top);
    const hi = Math.max(band.bottom, band.top);
    if (y < lo || y > hi) continue;
    const parsed = parseBandKey(key);
    if (!parsed) continue;
    const r = rank.get(parsed.layerId);
    if (r === undefined || r >= bestRank) continue;
    const clim = climOf(band);
    if (!clim) continue;
    best = { ...parsed, band, clim };
    bestRank = r;
  }
  return best;
};
