import { useEffect } from "react";

import { createSettler } from "@/lib/scene/perf/settle";
import {
  PROBE_READOUT_SETTLE_MS,
  needsImmediateReadout,
} from "../../platform/probe/probeReadout";
import type { ProbeResult } from "../../platform/probe/probeTypes";
import { useViewerStoreApi } from "../../platform/stores/viewerStore";

/**
 * A placement probe is the 3D annotation cursor, not a measurement, so it
 * retracts the readout rather than replacing it: leaving the last reading up
 * while the user draws would attach a number to a point they stopped asking
 * about.
 */
const readoutOf = (probe: ProbeResult | null): ProbeResult | null =>
  probe?.purpose === "placement" ? null : probe;

/**
 * Publishes `probeReadout` — the UI-cadence snapshot of the hot
 * `probedCoordinate` field — so the probe HUD renders when the cursor rests
 * rather than on every voxel crossing (OCTREE_RENDERER.md P17).
 *
 * Headless, and a VANILLA subscriber by construction: a React subscription
 * here would reintroduce exactly the per-crossing render this exists to
 * remove. The same shape as `CanvasSync`'s throttled `worldUnitsPerPixel`
 * publish, with a settle instead of a throttle — a numeric readout that
 * flickers through every voxel on the way somewhere is no more informative
 * than one that shows where you stopped.
 */
export function ProbeReadoutSettler() {
  const viewerStore = useViewerStoreApi();

  useEffect(() => {
    const settler = createSettler<ProbeResult | null>({
      delayMs: PROBE_READOUT_SETTLE_MS,
      emit: (probe) => viewerStore.getState().setProbeReadout(probe),
    });

    /**
     * The last value HANDED TO the settler — not the last one it emitted.
     * `needsImmediateReadout` must compare against the newest intent, or a
     * target change arriving mid-settle would be measured against a reading
     * two points old and be mistaken for a continuation of the sweep.
     */
    let offered = readoutOf(viewerStore.getState().probedCoordinate);

    const offer = (probe: ProbeResult | null) => {
      const next = readoutOf(probe);
      if (next === offered) return;
      const previous = offered;
      offered = next;
      if (needsImmediateReadout(previous, next)) settler.flush(next);
      else settler.push(next);
    };

    // Seed synchronously: a probe that survived a remount (a pinned click)
    // must be on screen before the first settle window, not after one.
    viewerStore.getState().setProbeReadout(offered);

    let last = viewerStore.getState().probedCoordinate;
    const unsubscribe = viewerStore.subscribe((state) => {
      if (state.probedCoordinate === last) return;
      last = state.probedCoordinate;
      offer(last);
    });

    return () => {
      unsubscribe();
      settler.cancel();
      viewerStore.getState().setProbeReadout(null);
    };
  }, [viewerStore]);

  return null;
}
