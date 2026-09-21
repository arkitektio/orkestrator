/**
 * Tick positions and labels for a VALUE axis — one row's band, in its own units.
 *
 * The time axis' rule (`platform/camera/timeTicks.ts`), turned sideways: "nice"
 * steps — 1, 2 or 5 times a power of ten — chosen from the band's PIXEL height so
 * density stays roughly constant however the row is scaled, and the labels read as
 * round numbers at every clim.
 *
 * The difference from the time axis is that a row is not the whole viewport: a
 * six-channel trace splits its row into six bands, and a band only tens of pixels
 * tall has no room for labels at all. That is the one anti-crowding rule, and it
 * lives HERE rather than in the overlay: below `MIN_BAND_PX` a band gets no ticks.
 *
 * Pure — runs in node.
 */

import { decimalsFor, niceStep } from "../camera/timeTicks";

export type ValueTick = { value: number; label: string };

/** Aim for a tick roughly this many pixels apart. */
export const TARGET_VALUE_SPACING_PX = 55;

/** A band shorter than this is not labelled: two labels would touch. */
export const MIN_BAND_PX = 36;

export const valueTicks = (
  clim: { lo: number; hi: number },
  heightPx: number,
  spacingPx = TARGET_VALUE_SPACING_PX,
): ValueTick[] => {
  const span = clim.hi - clim.lo;
  if (!(span > 0) || !Number.isFinite(span)) return [];
  if (!(heightPx >= MIN_BAND_PX)) return [];

  const count = Math.max(1, heightPx / Math.max(1, spacingPx));
  const step = niceStep(span / count);
  const decimals = decimalsFor(step);

  const first = Math.ceil(clim.lo / step) * step;
  const ticks: ValueTick[] = [];
  // Bounded: a pathological clim must not spin.
  for (let i = 0; i < 1000; i++) {
    const value = first + i * step;
    if (value > clim.hi + step * 1e-9) break;
    // Snap away float noise (0.30000000000000004) before formatting.
    const snapped = Number((Math.round(value / step) * step).toFixed(decimals));
    ticks.push({ value: snapped, label: snapped.toFixed(decimals) });
  }
  return ticks;
};
