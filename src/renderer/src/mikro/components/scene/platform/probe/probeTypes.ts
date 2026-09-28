/**
 * Probe data model — the result of probing a layer carries the coordinate
 * (base level-0 voxels, both 2D and 3D), the world hit, and the raw values
 * for every channel slab, tagged with provenance so the UI can distinguish
 * an approximate LOD read from an exact level-0 read.
 */

/** User-selectable probe mode; "auto" dispatches on the layer's projection. */
export type ProbeMode = "auto" | "first-hit" | "max" | "gradient";

/**
 * Where a probe came from. Hover probes update the readout but must never move
 * the camera — see `platform/camera/orbitPivot.ts` (`shouldRepivot`) and the
 * `ProbeOrbitPivot` effect in `platform/camera/CameraController.tsx`.
 */
export type ProbeOrigin = "click" | "hover";

/**
 * What a probe is FOR — orthogonal to `origin`, which says how it was
 * triggered.
 *
 * "readout" is a measurement: it feeds the HUD and the attribute plans.
 * "placement" is geometry for the shape being drawn — in 3D every annotation
 * vertex comes from the probe — and answers no question the user asked. The
 * distinction has to travel ON the probe rather than be re-derived from the
 * interaction mode by each consumer, because those consumers run after a
 * settle delay, by which time the mode may have changed.
 */
export type ProbePurpose = "readout" | "placement";

/** The march strategy actually executed after auto-dispatch. */
export type ResolvedProbeStrategy =
  | "first-hit"
  | "max"
  | "gradient"
  | "volume-accum";

export interface ProbeChannelValue {
  /** Channel slab index (0..channelSlabCount-1). */
  channel: number;
  /** Raw dtype value; null while unresolvable (pending exact fetch). */
  value: number | null;
}

export interface ProbeProvenance {
  /**
   * "resident" = read from the atlas CPU mirror at `level`;
   * "exact" = level-0 decoded-chunk read;
   * "pending" = nothing readable yet (atlas mirror stale).
   */
  source: "resident" | "exact" | "pending";
  /** LOD level the resident read came from (0 = finest). 0 for exact. */
  level: number;
}

export interface ProbeResult {
  layerId: string;
  /** Normalized local offset the markers / probe-orbit consume. */
  localPos: [number, number, number];
  /** ALWAYS base (level-0) voxels — both 2D and 3D probes. */
  voxelIndex: [number, number, number];
  /** World-space hit position (null when unavailable). */
  worldPos: [number, number, number] | null;
  /** Strategy that produced the hit (after auto dispatch); "plane" for 2D,
   * "mesh" for a fabriks instance pick (voxelIndex in the COLLECTION's voxel
   * space, values[0] = the instance's objectId). */
  strategy: ResolvedProbeStrategy | "plane" | "mesh";
  /**
   * "hover" = a follow-cursor sweep; "click" = a deliberate pointerDown.
   * Required, not optional, so both emitters have to declare intent — the
   * camera pivot only follows clicks.
   */
  origin: ProbeOrigin;
  /**
   * Measurement or annotation geometry. Required for the same reason as
   * `origin`: an emitter must say what it means, rather than leave every
   * consumer to guess from the mode it happens to observe later.
   */
  purpose: ProbePurpose;
  /** One entry per channel slab of the layer. */
  values: ProbeChannelValue[];
  provenance: ProbeProvenance;
  /** Base-level dtype (e.g. "uint16"), for display formatting. */
  dtype: string;
  /** Pool slice signature at probe time — staleness guard for async merges. */
  sliceSignature: string;
}

/** Identity key for async exact-value resolution. */
export interface ProbeFetchKey {
  layerId: string;
  voxelIndex: [number, number, number];
  sliceSignature: string;
}

export const isSameProbeKey = (
  probe: Pick<ProbeResult, "layerId" | "voxelIndex" | "sliceSignature">,
  key: ProbeFetchKey,
): boolean =>
  probe.layerId === key.layerId &&
  probe.sliceSignature === key.sliceSignature &&
  probe.voxelIndex.every((v, i) => v === key.voxelIndex[i]);

const upgradeToExact = (probe: ProbeResult, values: number[]): ProbeResult => ({
  ...probe,
  values: probe.values.map((entry, i) => ({
    channel: entry.channel,
    value: values[i] ?? entry.value,
  })),
  provenance: { source: "exact", level: 0 },
});

/**
 * Patch the active probe with exact values. Returns null when nothing matched
 * — callers must treat that as a no-op set (return the same state object) so
 * late async arrivals never cause renders.
 */
export function applyExactValues(
  state: { probedCoordinate: ProbeResult | null },
  key: ProbeFetchKey,
  values: number[],
): { probedCoordinate: ProbeResult | null } | null {
  const activeMatches =
    state.probedCoordinate !== null &&
    state.probedCoordinate.provenance.source !== "exact" &&
    isSameProbeKey(state.probedCoordinate, key);

  if (!activeMatches) return null;
  return { probedCoordinate: upgradeToExact(state.probedCoordinate!, values) };
}
