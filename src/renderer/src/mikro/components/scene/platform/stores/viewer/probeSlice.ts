import type { SliceSet } from "./sliceTypes";
import { probeAfterPinChange } from "../../probe/probeTargeting";
import { applyExactValues } from "../../probe/probeTypes";
import { applyAttributeRows, buildProbedAttributes } from "@/mikro/lib/attributes/attributeTypes";
import {
  loadSelection,
  saveSelection,
  withHopColumns,
  withHopEnabled,
  withSparseLimit,
  type AttributeSelection,
} from "@/mikro/lib/attributes/attributeSelection";
import type { ProbeFetchKey, ProbeMode } from "../../probe/probeTypes";
import type { MeshSelectionState, ProbedCoordinate, SceneAttributeKey } from "../viewerStore";
import type { AttributeColumnLike, AttributeRow, HopMeta, PlanRowsState, ProbedAttributes } from "@/mikro/lib/attributes/attributeTypes";
/**
 * "What is under this pixel?" — the probed point, its readout cadence, the
 * attribute rows resolved for it, and the scene-wide picked mesh instance,
 * which is one selection of the same kind.
 */
export interface ProbeSlice {
  /**
   * The live probe. **A HOT field: vanilla subscribers only.**
   *
   * It changes once per voxel crossing, which while the cursor sweeps is
   * effectively once per rendered frame. Under P17 that bars React from
   * subscribing to it — the canvas-side consumers that genuinely need this
   * latency (the markers, the axis guides, the RoiDrawer's rubber band) bind
   * to it imperatively through `subscribe`/`getState`. React reads
   * `probeReadout`.
   */
  probedCoordinate: ProbedCoordinate | null;
  setProbedCoordinate: (coordinate: ProbedCoordinate | null) => void
  /**
   * Where the pointer's hit is NOW, in world space. **Hotter still: vanilla
   * subscribers only**, and only the things that draw at the cursor (the
   * marker, the axis guides, the drawer's rubber band).
   *
   * `probedCoordinate` is voxel-deduped, so its `worldPos` is where the pointer
   * ENTERED the voxel; zoomed in, a marker placed there sticks and then jumps.
   * A same-voxel hover move writes only this. `setProbedCoordinate` mirrors it
   * in the same write, so it is never behind the probe — read both through
   * `liveProbeWorld`.
   */
  probeCursorWorld: [number, number, number] | null;
  setProbeCursorWorld: (world: [number, number, number]) => void
  /**
   * UI-cadence mirror of `probedCoordinate` — the only probe field React may
   * subscribe to. Published by `features/probe/ProbeReadoutSettler.tsx` once the
   * cursor rests, with retractions, clicks and target changes bypassing the
   * wait (`platform/probe/probeReadout.ts`).
   */
  probeReadout: ProbedCoordinate | null;
  /** Written ONLY by `ProbeReadoutSettler`; everything else writes the hot
   * field and lets the settler decide when the HUD sees it. */
  setProbeReadout: (coordinate: ProbedCoordinate | null) => void
  probeThreshold: number;
  setProbeThreshold: (threshold: number) => void
  /** User-selected probe strategy; "auto" follows the layer's projection. */
  probeMode: ProbeMode;
  setProbeMode: (mode: ProbeMode) => void
  /**
   * Which layer the probe reads, or null for the DEFAULT: the first visible
   * layer (see `effectiveProbeLayerId`). Exactly one layer ever answers —
   * every other layer declines the pointer event (without stopping
   * propagation) so it falls through to the target layer's mesh.
   */
  probeLayerId: string | null;
  /** Pin the probe to one layer, or null for the default (first visible
   * layer). Clears a probe belonging to a different layer, so the readout
   * never keeps showing values from a layer the probe no longer reads; the
   * probe panel reconciles the default-target cases this setter cannot see. */
  setProbeLayerId: (layerId: string | null) => void
  /** Async exact-value upgrade: patches the active probe when the fetched key
   * still matches (no-op set otherwise, so late arrivals never cause
   * renders). Currently unwired on the hover path — the hover readout
   * deliberately stays at resident-LOD values (no per-hover chunk reads);
   * retained for a future save-time upgrade. */
  mergeExactProbeValues: (key: ProbeFetchKey, values: number[]) => void

  /** "What is under this pixel?" — per-table lookup results for the active
   * probe, written by AttributeProbeTracker executing the probed system's
   * attribute plans locally (zarr sample + DuckDB lookup). */
  probedAttributes: ProbedAttributes<SceneAttributeKey> | null;
  /** A new probed point's hops are known: reset the slice to all-pending. */
  beginProbedAttributes: (key: SceneAttributeKey, hops: readonly HopMeta[]) => void;
  /** Async per-hop settlement: no-op set when the key went stale (same
   * late-arrival contract as mergeExactProbeValues). */
  mergeAttributeRows: (key: SceneAttributeKey, hopKey: string, state: PlanRowsState) => void;
  /** Whole-slice commit for the SYNCHRONOUS all-cached path — one set for N
   * plans instead of `begin` plus a `merge` each, and no set at all when the
   * result is value-equal to what is already up. */
  commitProbedAttributes: (
    key: SceneAttributeKey,
    planMeta: NonNullable<ProbeSlice["probedAttributes"]>["planMeta"],
    states: readonly (readonly [string, PlanRowsState])[],
  ) => void;
  clearProbedAttributes: () => void;
  /** The lazy one-hop FK follow (`references`), registered by the tracker so
   * the HUD can expand a referencing attribute without owning the engine —
   * the captureScreenshot registration pattern. */
  followAttributeReference:
    | ((column: AttributeColumnLike, value: number | bigint) => Promise<readonly AttributeRow[] | null>)
    | null;
  registerFollowAttributeReference: (
    fn:
      | ((column: AttributeColumnLike, value: number | bigint) => Promise<readonly AttributeRow[] | null>)
      | null,
  ) => void;
  /** The picked mesh instance (one scene-wide, like the probe): set by a
   * click on a mesh layer, consumed by that layer's manager (highlight /
   * isolate) and the MeshLayerCard. `objectId` resolves asynchronously from
   * the collection's object catalog — null while in flight. */
  meshSelection: MeshSelectionState | null;
  setMeshSelection: (selection: MeshSelectionState | null) => void;
  /** Debug-page opt-in: probing a voxel whose attribute plans name a mesh
   * collection (a MeshSample plan) MARKS that instance — highlight + hull. */
  markProbedInstances: boolean;
  setMarkProbedInstances: (mark: boolean) => void;
  /**
   * What a hover FETCHES: which hops of each attribute plan run, which
   * columns a table hop selects, how much of a sparse profile is kept. Keyed
   * by hop identity, so it holds across scenes over the same data, and
   * persisted per browser (`loadSelection`/`saveSelection`). Read at UI
   * cadence by the settings picker; the tracker reads it imperatively and
   * folds its signature into the fetch key, so a change re-runs the probe.
   */
  attributeSelection: AttributeSelection;
  setHopEnabled: (hopKey: string, enabled: boolean) => void;
  setHopColumns: (hopKey: string, columns: readonly string[] | null) => void;
  setSparseLimit: (limit: number) => void;
}

export const createProbeSlice = (
  set: SliceSet<ProbeSlice>,
): ProbeSlice => ({
  probedCoordinate: null,
  setProbedCoordinate: (coordinate) =>
    set({ probedCoordinate: coordinate, probeCursorWorld: coordinate?.worldPos ?? null }),
  probeCursorWorld: null,
  setProbeCursorWorld: (world) =>
    set((state) => {
      const current = state.probeCursorWorld;
      // Only ever refines a live probe, and never publishes a point that did not move.
      if (!state.probedCoordinate) return state;
      if (current && current[0] === world[0] && current[1] === world[1] && current[2] === world[2]) {
        return state;
      }
      return { probeCursorWorld: world };
    }),
  probeReadout: null,
  setProbeReadout: (coordinate) =>
    set((state) =>
      state.probeReadout === coordinate ? state : { probeReadout: coordinate },
    ),
  probeThreshold: 0.01,
  setProbeThreshold: (threshold) => set({ probeThreshold: threshold }),
  probeMode: "auto",
  setProbeMode: (mode) => set({ probeMode: mode }),
  probeLayerId: null,
  setProbeLayerId: (layerId) =>
    set((state) => {
      const probedCoordinate = probeAfterPinChange(state.probedCoordinate, layerId);
      return {
        probeLayerId: layerId,
        probedCoordinate,
        probeCursorWorld: probedCoordinate ? state.probeCursorWorld : null,
      };
    }),
  mergeExactProbeValues: (key, values) =>
    set((state) => applyExactValues(state, key, values) ?? state),
  probedAttributes: null,
  beginProbedAttributes: (key, hops) =>
    set({
      probedAttributes: {
        key,
        byPlan: Object.fromEntries(
          hops.map((hop) => [hop.hopKey, { status: "pending", rows: [] } as PlanRowsState]),
        ),
        planMeta: Object.fromEntries(hops.map((hop) => [hop.hopKey, hop])),
      },
    }),
  mergeAttributeRows: (key, planKey, planState) =>
    set((state) => {
      const next = applyAttributeRows(state.probedAttributes, key, planKey, planState);
      return next ? { probedAttributes: next } : state;
    }),
  commitProbedAttributes: (key, planMeta, states) =>
    set((state) => {
      const next = buildProbedAttributes(state.probedAttributes, key, planMeta, states);
      return next ? { probedAttributes: next } : state;
    }),
  clearProbedAttributes: () =>
    set((state) => (state.probedAttributes === null ? state : { probedAttributes: null })),
  followAttributeReference: null,
  registerFollowAttributeReference: (fn) => set({ followAttributeReference: fn }),
  meshSelection: null,
  setMeshSelection: (selection) => set({ meshSelection: selection }),
  markProbedInstances: false,
  setMarkProbedInstances: (mark) => set({ markProbedInstances: mark }),
  attributeSelection: loadSelection(),
  setHopEnabled: (hopKey, enabled) =>
    set((state) => persisted(withHopEnabled(state.attributeSelection, hopKey, enabled))),
  setHopColumns: (hopKey, columns) =>
    set((state) => persisted(withHopColumns(state.attributeSelection, hopKey, columns))),
  setSparseLimit: (limit) =>
    set((state) => persisted(withSparseLimit(state.attributeSelection, limit))),
});

/**
 * The live probe's world point: the sub-voxel cursor when there is one, else
 * the probe's own hit. Null without a probe (or for one that carries no world
 * position), so a cleared probe can never leave a cursor behind.
 */
export const liveProbeWorld = (state: {
  probedCoordinate: ProbedCoordinate | null;
  probeCursorWorld: [number, number, number] | null;
}): [number, number, number] | null =>
  state.probedCoordinate ? (state.probeCursorWorld ?? state.probedCoordinate.worldPos ?? null) : null;

/** Write-through: the browser keeps what the session chose. */
const persisted = (attributeSelection: AttributeSelection) => {
  saveSelection(attributeSelection);
  return { attributeSelection };
};
