import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";
import {
  DEFAULT_SKELETON_WEIGHTS,
  type SkeletonWeights,
} from "./shared/corridorCost";
import { appendSample, type BrushSample, type Vec3 } from "./shared/strokeModel";
import { DEFAULT_MARCHER, type MarcherId } from "./meshes/marcher";
import type { DesignToolId } from "../../../platform/stores/modeStore";

/**
 * The skeleton brush's session state: the stroke being painted, the extracted
 * centerline waiting for a verdict, and the knobs the panel edits.
 *
 * Vanilla store, NO immer, on purpose: `stroke` is appended at pointer
 * cadence (P17), so it keeps a STABLE array identity and `strokeVersion` is
 * what moves. Nothing may subscribe to the stroke through a React selector —
 * the stroke preview reads it imperatively via `.subscribe` + `.getState()`,
 * exactly like `roiDrawSessionStore`. The panel-facing fields (`status`,
 * `radiusWorld`, `weights`, `message`, `candidate`) move at gesture cadence
 * and are fine to select on.
 */

export type BrushSkeletonStatus =
  | "idle"
  | "painting"
  | "extracting"
  | "preview"
  | "saving"
  | "error";

export type TubeSurface = {
  /** Triangle soup in scene WORLD coordinates, xyz triplets, 3 per triangle. */
  positions: Float32Array;
  triangles: number;
  /** The vertex cap was hit; the surface is incomplete. */
  truncated: boolean;
};

export type SkeletonCandidate = {
  /** The centerline, scene WORLD coordinates — what save() submits verbatim. */
  points: Vec3[];
  layerId: string;
  /** Pyramid level the extraction ran at (coarser = lower fidelity). */
  level: number;
  /** Corridor voxels with nothing resident — "may detour" when > 0. */
  holes: number;
  /** The tube surface, when the option was on for this extraction. */
  tube?: TubeSurface | null;
};

export interface BrushSkeletonState {
  status: BrushSkeletonStatus;
  /** Why the last extraction degraded or failed; the panel shows it. */
  message: string | null;
  /**
   * Brush radius in world units. Null until the first arming initializes it
   * from the target layer's voxel size (`initRadius`) — world units vary by
   * orders of magnitude between datasets, so there is no honest constant.
   */
  radiusWorld: number | null;
  /** Slider range, set alongside the default. */
  radiusBounds: [number, number] | null;
  weights: SkeletonWeights;
  /** Also extract the tube surface (isosurface of the cost field) around
   * the centerline. Off by default — the plain brush stays plain. */
  tubeEnabled: boolean;
  /** Normalized-intensity threshold τ: the tube wraps voxels brighter than
   * this (`voxelCost(τ)` is the cost-space iso value). */
  tubeThreshold: number;
  /**
   * Surface detail in VOXELS of the extraction level: the mesh is simplified
   * to stay within this many voxels of the marched isosurface, and from 2 up
   * the corridor is marched at a correspondingly coarser pyramid level. 1 =
   * the data's own resolution — the default; finer is only noise from the
   * tet march.
   */
  detailVoxels: number;
  /** Which isosurface algorithm extracts the surface (`meshes/marcher.ts`). */
  marcher: MarcherId;
  /** Taubin smoothing passes applied to a DESIGN surface before it is
   * simplified — removes marching artefacts without shrinking. 0 = off. */
  polishIterations: number;
  /** STABLE identity, mutated in place; `strokeVersion` is the signal. */
  stroke: BrushSample[];
  strokeVersion: number;
  strokeLayerId: string | null;
  /**
   * Which gesture owns the session: "stroke" (the brush — paint, extract a
   * centerline) or "blob" (the smooth-blob tool — one probed point, grow a
   * surface). Set by `beginStroke` and read by the extraction.
   */
  strokeMode: "stroke" | "blob";
  /**
   * DESIGN only: the tool the gesture was captured FOR — its `run` gets the
   * release (`meshDesign/tools/registry.ts`). "brush" in ANNOTATE.
   */
  strokeTool: DesignToolId;
  /** Smooth-blob only: box-blur radius (level voxels) applied to the field
   * before the surface is marched — the "Smooth" slider. */
  blobSmoothness: number;
  /** Smooth-blob only: the "Gap" slider (level voxels). The surface is
   * restricted to the seed's CONNECTED component, bridging dark gaps up to
   * roughly this many voxels wide — 0 = strictly connected. */
  blobGap: number;
  candidate: SkeletonCandidate | null;
  /**
   * The live tube preview while PAINTING: re-meshed on the GPU as the stroke
   * grows (throttled by `BrushStrokeSession`). Survives `endStroke` so the
   * surface doesn't blink out during extraction; replaced by
   * `candidate.tube` when the final extraction lands.
   */
  liveTube: TubeSurface | null;

  initRadius: (radiusWorld: number, bounds: [number, number]) => void;
  setRadiusWorld: (radiusWorld: number) => void;
  setWeights: (weights: Partial<SkeletonWeights>) => void;
  setTubeEnabled: (on: boolean) => void;
  setTubeThreshold: (threshold: number) => void;
  setDetailVoxels: (voxels: number) => void;
  setMarcher: (marcher: MarcherId) => void;
  setPolishIterations: (iterations: number) => void;
  setBlobSmoothness: (radius: number) => void;
  setBlobGap: (voxels: number) => void;
  beginStroke: (layerId: string, mode?: "stroke" | "blob", tool?: DesignToolId) => void;
  /** Returns whether the sample was kept (`strokeModel.appendSample`). */
  addSample: (sample: BrushSample) => boolean;
  /** The pointer lifted: hand over to extraction. No-op unless painting. */
  endStroke: () => void;
  setExtracting: (message?: string | null) => void;
  /** Ignored unless painting or extracting — the grow loop animates its
   * expansion through this while "extracting"; anything later is stale. */
  setLiveTube: (tube: TubeSurface) => void;
  setCandidate: (candidate: SkeletonCandidate, message: string | null) => void;
  setSaving: () => void;
  fail: (message: string) => void;
  /** Discard everything — stroke, candidate, message — back to idle. */
  clear: () => void;
}

export const createBrushSkeletonStore = () =>
  createStore<BrushSkeletonState>()((set, get) => ({
    status: "idle",
    message: null,
    radiusWorld: null,
    radiusBounds: null,
    weights: DEFAULT_SKELETON_WEIGHTS,
    tubeEnabled: false,
    tubeThreshold: 0.5,
    detailVoxels: 1,
    marcher: DEFAULT_MARCHER,
    polishIterations: 8,
    blobSmoothness: 1,
    blobGap: 0,
    stroke: [],
    strokeVersion: 0,
    strokeLayerId: null,
    strokeMode: "stroke" as const,
    strokeTool: "brush" as DesignToolId,
    candidate: null,
    liveTube: null,

    initRadius: (radiusWorld, bounds) =>
      set((state) =>
        // Only ever fills the blank: a radius the user chose survives strokes,
        // layer switches and re-armings.
        state.radiusWorld === null
          ? { radiusWorld, radiusBounds: bounds }
          : state.radiusBounds === null
            ? { radiusBounds: bounds }
            : state,
      ),
    setRadiusWorld: (radiusWorld) => set({ radiusWorld }),
    setWeights: (weights) =>
      set((state) => ({ weights: { ...state.weights, ...weights } })),
    setTubeEnabled: (tubeEnabled) => set({ tubeEnabled }),
    setTubeThreshold: (tubeThreshold) => set({ tubeThreshold }),
    setDetailVoxels: (detailVoxels) => set({ detailVoxels: Math.min(2, Math.max(0.1, detailVoxels)) }),
    setMarcher: (marcher) => set({ marcher }),
    setPolishIterations: (polishIterations) =>
      set({ polishIterations: Math.max(0, Math.min(20, Math.round(polishIterations))) }),
    setBlobSmoothness: (blobSmoothness) => set({ blobSmoothness }),
    setBlobGap: (blobGap) => set({ blobGap }),

    beginStroke: (layerId, mode = "stroke", tool = "brush") => {
      const stroke = get().stroke;
      stroke.length = 0;
      set({
        status: "painting",
        strokeLayerId: layerId,
        strokeMode: mode,
        strokeTool: tool,
        strokeVersion: 0,
        candidate: null,
        liveTube: null,
        message: null,
      });
    },
    addSample: (sample) => {
      const state = get();
      if (state.status !== "painting") return false;
      const minStep = (state.radiusWorld ?? 0) / 4;
      if (!appendSample(state.stroke, sample, minStep)) return false;
      set({ strokeVersion: state.strokeVersion + 1 });
      return true;
    },
    endStroke: () => {
      const state = get();
      if (state.status !== "painting") return;
      if (state.stroke.length === 0) {
        set({ status: "error", message: "The click landed off the data" });
        return;
      }
      // The blob gesture grows from ONE probed point; the brush needs a
      // painted stroke to extract a centerline from.
      if (state.strokeMode === "stroke" && state.stroke.length < 2) {
        set({
          status: "error",
          message: "Paint a stroke along the structure — a click is not enough",
        });
        return;
      }
      set({ status: "extracting", message: null });
    },
    setExtracting: (message = null) => set({ status: "extracting", message }),
    setLiveTube: (tube) =>
      set((state) =>
        state.status === "painting" || state.status === "extracting"
          ? { liveTube: tube }
          : state,
      ),
    setCandidate: (candidate, message) =>
      set({ status: "preview", candidate, message, liveTube: null }),
    setSaving: () => set({ status: "saving" }),
    fail: (message) =>
      set((state) => ({
        // A failed SAVE keeps the candidate on screen — the user's extraction
        // must not vanish because the server said no.
        status: state.candidate ? "preview" : "error",
        message,
        liveTube: null,
      })),
    clear: () => {
      const stroke = get().stroke;
      stroke.length = 0;
      set({
        status: "idle",
        message: null,
        strokeVersion: 0,
        strokeLayerId: null,
        candidate: null,
        liveTube: null,
      });
    },
  }));

const {
  StoreContext: BrushSkeletonStoreContext,
  useScopedStore: useBrushSkeletonStore,
  useStoreApi: useBrushSkeletonStoreApi,
} = createScopedStoreHooks<BrushSkeletonState>("BrushSkeletonStore");

export {
  BrushSkeletonStoreContext,
  useBrushSkeletonStore,
  useBrushSkeletonStoreApi,
};
