/**
 * Tick positions and labels for the time axis.
 *
 * "Nice" steps — 1, 2 or 5 times a power of ten — so labels read as round numbers
 * at every zoom. The step is chosen from the pixel width so tick DENSITY stays
 * roughly constant: a wide window gets coarse steps, a narrow one fine steps, and
 * the labels never crowd.
 *
 * Pure — runs in node.
 */

export type Tick = { time: number; label: string };

/** Aim for a tick roughly this many pixels apart. */
export const TARGET_TICK_SPACING_PX = 110;

/** The smallest nice step (1/2/5 × 10^k) that is at least `raw`. */
export const niceStep = (raw: number): number => {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const exponent = Math.floor(Math.log10(raw));
  const base = 10 ** exponent;
  const fraction = raw / base;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * base;
};

/** Decimal places needed to show a step without rounding it away. */
export const decimalsFor = (step: number): number =>
  step >= 1 ? 0 : Math.min(12, Math.ceil(-Math.log10(step) - 1e-9));

export const timeTicks = (
  window: { start: number; end: number },
  widthPx: number,
  spacingPx = TARGET_TICK_SPACING_PX,
): { ticks: Tick[]; step: number } => {
  const width = window.end - window.start;
  if (!(width > 0) || !(widthPx > 0)) return { ticks: [], step: 0 };

  const count = Math.max(1, widthPx / spacingPx);
  const step = niceStep(width / count);
  const decimals = decimalsFor(step);

  const first = Math.ceil(window.start / step) * step;
  const ticks: Tick[] = [];
  // Bounded: a pathological window must not spin.
  for (let i = 0; i < 1000; i++) {
    const time = first + i * step;
    if (time > window.end + step * 1e-9) break;
    // Snap away float noise (0.30000000000000004) before formatting.
    const snapped = Number((Math.round(time / step) * step).toFixed(decimals));
    ticks.push({ time: snapped, label: snapped.toFixed(decimals) });
  }
  return { ticks, step };
};
