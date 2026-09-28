import type { ProbeResult } from "./probeTypes";

/**
 * The HUD's view of the probe settles instead of tracking it
 * (`features/probe/ProbeReadoutSettler.tsx`): `probedCoordinate` changes once per
 * voxel crossing, which while sweeping is once per frame, and the readout
 * panel is a React subtree (OCTREE_RENDERER.md P17).
 */

/** How long the cursor must rest before the readout updates. */
export const PROBE_READOUT_SETTLE_MS = 120;

/**
 * A probe change the HUD must show at once rather than wait out the settle.
 *
 * Settling is for the SWEEP — the stream of readings the cursor generates on
 * its way somewhere. Everything else is an event the user would read as
 * unresponsive if it lagged:
 *
 * - a retraction (`next === null`): the pointer left the data, and a stale
 *   reading left hanging over empty space is worse than a blank panel;
 * - a click: a deliberate act, and the one that may also re-pivot the camera
 *   or save the point, so the panel must agree with what just happened;
 * - the first reading after nothing;
 * - a change in WHAT is being measured (a different layer, or a different
 *   march strategy) — a settled delay there would show one layer's values
 *   under another layer's name.
 *
 * Note what is deliberately absent: a change of `voxelIndex` alone. That is
 * the sweep, and it is exactly what settles.
 */
export function needsImmediateReadout(
  previous: ProbeResult | null,
  next: ProbeResult | null,
): boolean {
  if (next === null) return true;
  if (next.origin === "click") return true;
  if (previous === null) return true;
  return previous.layerId !== next.layerId || previous.strategy !== next.strategy;
}
