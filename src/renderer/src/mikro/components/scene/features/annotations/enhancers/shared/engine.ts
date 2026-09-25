import type { MarcherId } from "../meshes/marcher";
import type { BrickAtlas } from "../../../bricks/gpu/brickAtlas";
import type { PageTableTexture } from "../../../bricks/gpu/pageTableTexture";
import type { SkeletonWeights } from "./corridorCost";
import type { GeodesicField } from "./geodesicReference";
import type { Vec3 } from "./strokeModel";
import type { PickedCorridor } from "./planning";

/**
 * The extraction ENGINE seam: one interface, two implementations —
 * `gpuEngine.ts` (the WGSL kernels via `computeSkeleton`) and `cpuEngine.ts`
 * (the `features/annotations/enhancers/shared` reference). The hook (`useBrushSkeleton`) plans a
 * corridor per engine budget and walks the engine list until one answers;
 * an engine returns null to say "not me, ask the next one" (pipeline dead,
 * capability missing, corridor too big) — it never throws for that.
 *
 * Everything an engine answers is in LEVEL-VOXEL coordinates at the picked
 * corridor's level; the caller owns the world transforms (`planning.ts`).
 */

/** A marched surface in level-voxel coordinates. */
export type LevelTube = {
  positions: Float32Array;
  triangles: number;
  truncated: boolean;
};

export type TubeOptions = {
  /** Cost-space iso value (`voxelCost(τ)`); inside = cost <= iso. */
  iso: number;
  /** Interpolation clamp (`tubeClampValue(iso)`). */
  clampValue: number;
  /** Box-blur radius (level voxels); 0 = off. The geodesic never sees it. */
  smoothVoxels: number;
  /** Restrict to the seed's connected component, bridging dark gaps up to
   * `gapLimitWorld` (world units); null = no connectivity mask. */
  connectivity: { tau: number; gapLimitWorld: number; seed: Vec3 } | null;
  /** Vertex cap override (the live preview shrinks it); engines fall back
   * to their own `maxTubeVertices`. */
  maxVertices?: number;
  /** Which isosurface algorithm (`meshes/marcher.ts`); default `cubes`. */
  marcher?: MarcherId;
};

/** Inputs shared by every extraction over one picked corridor. */
export type EngineRequest = {
  picked: PickedCorridor;
  /** Resampled stroke in LEVEL-voxel coordinates. */
  strokeLevelPts: Vec3[];
  radiusWorld: number;
  weights: SkeletonWeights;
};

export type CenterlineRequest = EngineRequest & {
  /** BOX-relative seed voxel. */
  seed: Vec3;
  /** Also extract the tube surface in the same pass, when set. */
  tube: TubeOptions | null;
};

export type CenterlineResult = {
  field: GeodesicField;
  holes: number;
  /** Null when no tube was requested OR this engine could not produce one —
   * the caller may then ask another engine for the tube alone. */
  tube: LevelTube | null;
};

export type TubeRequest = EngineRequest & { tube: TubeOptions };

export interface SkeletonEngine {
  readonly kind: "gpu" | "cpu";
  /** Corridor voxel budget the caller should plan against for this engine. */
  readonly maxCorridorVoxels: number;
  /** Default tube vertex cap when the request does not override it. */
  readonly maxTubeVertices: number;
  /** Geodesic centerline field (+ optional tube) over the corridor. */
  centerline(request: CenterlineRequest): Promise<CenterlineResult | null>;
  /** Tube surface only — the live preview and the blob grow steps. */
  tube(request: TubeRequest): Promise<LevelTube | null>;
}

/**
 * What both engines need to know about the data source, pre-bound to one
 * layer. Structural on purpose: the CPU engine touches only `sampleResident`
 * and the ranges, the GPU engine additionally hands the atlas + page table
 * to its kernels — and tests can fake either without a residency manager.
 */
export type SkeletonEngineContext = {
  channel: number;
  /** Clim-windowed normalization range, raw units (`planning.climWindow`). */
  window: { min: number; max: number };
  pool: {
    atlas: BrickAtlas;
    pageTable: PageTableTexture;
    spec: {
      payload: readonly [number, number, number];
      border: 0 | 1;
      stored: readonly [number, number, number];
    };
    emptyBits: 8 | 24;
    minValue: number;
    maxValue: number;
  };
  /** `BrickResidencyManager.sampleResident`, pre-bound to the layer. */
  sampleResident: (baseVoxel: Vec3, level: number, channel: number) => number | null;
};
