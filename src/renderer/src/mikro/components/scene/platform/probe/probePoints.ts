import type { AxisCoords } from "@/mikro/lib/coords/axisPath";
import type { ProbeResult } from "./probeTypes";

/**
 * Probe points — the readings a click in PROBE mode leaves behind.
 *
 * A probe point is NOT an annotation: nothing is written to the server, it
 * has no shape and no collection, and it is gone with the session. It is a
 * snapshot of what the probe measured where the user clicked, kept so several
 * places can be read side by side (the live probe is a single slot, and the
 * next hover overwrites it).
 */

/**
 * Where a point's attribute plans are asked. Resolved when the point is
 * pinned and never again: the collapsed dims (t, c, …) are the ones on screen
 * at the click, so scrubbing time afterwards does not silently re-point a
 * pinned reading at another frame.
 */
export interface ProbePointLookup {
  systemId: string;
  /** Named level-0 coordinates in `systemId`. */
  coords: AxisCoords;
  /** Mesh picks only: the instance's objectId, which IS the field value. */
  instanceValue?: number;
}

export interface ProbePoint {
  id: string;
  /** 1-based, in pinning order, never reused within a session. */
  index: number;
  probe: ProbeResult;
  /** Null when nothing links the probed layer to a coordinate system (or a
   * mesh pick's objectId has not resolved yet). */
  lookup: ProbePointLookup | null;
  /** The point as named level-0 coordinates of its layer's dataset — voxel
   * plus the collapsed dims at the click, frozen like the lookup. Null for a
   * pick on a layer with no lens (meshes, networks). */
  coords: AxisCoords | null;
  /** The flat view's slice plane at the click; null for a point pinned in 3D.
   * What lets the 2D marker say "this is on another slice". */
  flatZ: number | null;
}

export interface ProbePointsState {
  probePoints: readonly ProbePoint[];
  /** The last index handed out. */
  probePointSerial: number;
}

/**
 * One colour per point, shared by its marker in the scene and its panel in
 * the HUD — the pairing is the whole reason for it. None of them is the live
 * probe's orange.
 */
const PROBE_POINT_COLORS = [
  "#38bdf8",
  "#a3e635",
  "#f472b6",
  "#facc15",
  "#c084fc",
  "#2dd4bf",
  "#f87171",
  "#818cf8",
] as const;

/** The live probe's own colour, as its marker in the scene draws it. */
export const LIVE_PROBE_COLOR = "#f97316";

export const probePointColor = (index: number): string =>
  PROBE_POINT_COLORS[(index - 1 + PROBE_POINT_COLORS.length) % PROBE_POINT_COLORS.length];

/** Two probes of the same place: same layer, voxel, slice and kind of hit. */
export const isSameProbePoint = (a: ProbeResult, b: ProbeResult): boolean =>
  a.layerId === b.layerId &&
  a.strategy === b.strategy &&
  a.sliceSignature === b.sliceSignature &&
  a.voxelIndex.every((v, i) => v === b.voxelIndex[i]);

/**
 * A later publish of a point that is already pinned: take its values (a mesh
 * pick re-publishes once its objectId resolves), and the lookup it could not
 * have before. A lookup that already exists is kept — see `ProbePointLookup`.
 */
const refreshed = (
  point: ProbePoint,
  probe: ProbeResult,
  lookup: ProbePointLookup | null,
): ProbePoint => ({ ...point, probe, lookup: point.lookup ?? lookup });

/**
 * Pin `probe`. Clicking a place that is already pinned refreshes that point
 * instead of stacking a second panel for it.
 */
export const pinProbePoint = (
  state: ProbePointsState,
  probe: ProbeResult,
  lookup: ProbePointLookup | null,
  flatZ: number | null = null,
  coords: AxisCoords | null = null,
): ProbePointsState => {
  if (state.probePoints.some((point) => isSameProbePoint(point.probe, probe))) {
    return refreshProbePoint(state, probe, lookup);
  }
  const index = state.probePointSerial + 1;
  return {
    probePoints: [
      ...state.probePoints,
      { id: `probe-point-${index}`, index, probe, lookup, flatZ, coords },
    ],
    probePointSerial: index,
  };
};

/** Update the pinned point at `probe`'s place, if there is one. Never adds. */
export const refreshProbePoint = (
  state: ProbePointsState,
  probe: ProbeResult,
  lookup: ProbePointLookup | null,
): ProbePointsState => {
  if (!state.probePoints.some((point) => isSameProbePoint(point.probe, probe))) return state;
  return {
    probePointSerial: state.probePointSerial,
    probePoints: state.probePoints.map((point) =>
      isSameProbePoint(point.probe, probe) ? refreshed(point, probe, lookup) : point,
    ),
  };
};
