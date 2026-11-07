import { niceStep } from "../coords/ticks";
import { formatSi } from "../coords/siFormat";

/**
 * Ticks for one axis of a plane: nice steps (1/2/5 × 10^k) chosen from the
 * axis' pixel length so their density stays constant at every zoom, labelled
 * with one SI prefix for the whole axis. A CATEGORICAL axis (the groups of a box
 * plot, the members of a grid) is labelled at its integer positions instead.
 *
 * Pure -- runs in node.
 */

export type PlaneTick = { value: number; label: string };

export const TARGET_X_SPACING_PX = 90;
export const TARGET_Y_SPACING_PX = 48;

export const numericTicks = (lo: number, hi: number, lengthPx: number, spacingPx: number): PlaneTick[] => {
  const span = hi - lo;
  if (!(span > 0) || !Number.isFinite(span) || !(lengthPx > 0)) return [];
  const step = niceStep(span / Math.max(1, lengthPx / spacingPx));
  const reference = Math.max(Math.abs(lo), Math.abs(hi));
  const first = Math.ceil(lo / step) * step;
  const out: PlaneTick[] = [];
  for (let i = 0; i < 1000; i++) {
    const value = first + i * step;
    if (value > hi + step * 1e-9) break;
    const snapped = Math.round(value / step) * step;
    out.push({ value: snapped, label: formatSi(snapped, step, reference) });
  }
  return out;
};

/**
 * Ticks at integer member positions `0..labels.length-1` (a cell's CENTRE sits
 * at `i + 0.5`), thinned so labels never crowd: every k-th member, k the
 * smallest that leaves `spacingPx` between neighbours.
 */
export const categoricalTicks = (
  lo: number,
  hi: number,
  lengthPx: number,
  labels: readonly string[],
  spacingPx: number,
  centred = true,
): PlaneTick[] => {
  const span = hi - lo;
  if (!(span > 0) || !(lengthPx > 0) || labels.length === 0) return [];
  const pxPerMember = lengthPx / span;
  const every = Math.max(1, Math.ceil(spacingPx / Math.max(1e-9, pxPerMember)));
  const out: PlaneTick[] = [];
  const first = Math.max(0, Math.floor(lo));
  const last = Math.min(labels.length - 1, Math.ceil(hi));
  for (let i = first - (first % every); i <= last; i += every) {
    if (i < 0) continue;
    out.push({ value: centred ? i + 0.5 : i, label: labels[i] ?? String(i) });
  }
  return out;
};

/**
 * Ticks at the members of an enumerating axis (a grid's rows or columns): member
 * `m` is the cell `[m, m + 1]`, or -- `flipped`, rows running down -- `[-(m + 1), -m]`,
 * labelled at its centre. Thinned to every k-th member, k a 1/2/5 step, so the
 * labels never crowd and stay put while panning.
 */
export const memberTicks = (
  lo: number,
  hi: number,
  lengthPx: number,
  spacingPx: number,
  label: (member: number) => string,
  flipped = false,
  bounds?: { first: number; last: number },
): PlaneTick[] => {
  const span = hi - lo;
  if (!(span > 0) || !(lengthPx > 0)) return [];
  const every = Math.max(1, niceStep(Math.max(1, spacingPx / (lengthPx / span))));
  const a = flipped ? -hi : lo;
  const b = flipped ? -lo : hi;
  let first = Math.max(Math.floor(a), bounds?.first ?? -Infinity);
  const last = Math.min(Math.ceil(b), bounds?.last ?? Infinity);
  first = Math.ceil(first / every) * every;
  const out: PlaneTick[] = [];
  for (let m = first; m <= last && out.length < 500; m += every) {
    out.push({ value: flipped ? -m - 0.5 : m + 0.5, label: label(m) });
  }
  return out;
};
