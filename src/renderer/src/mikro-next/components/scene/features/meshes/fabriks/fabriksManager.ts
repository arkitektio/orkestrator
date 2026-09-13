import * as THREE from "three";
import { ClippingGroup } from "three/webgpu";
import { LruByteCache } from "@/mikro-next/components/scene/platform/parquet/lruByteCache";
import { FabriksBatchRenderer, type FabriksBatchStats } from "./fabriksBatch";
import {
  createFabriksMaterial,
  disposeColorAppearance,
  setColorAppearance,
  setColorLut,
  setInstanceColoring,
  type FabriksMaterialHandle,
} from "./fabriksMaterial";
import {
  DEFAULT_INSTANCE_COLORMAP,
  instanceHue,
  type FabriksInstanceColormap,
} from "../../../platform/gpu/instanceColormaps";
import {
  buildFabriksCellIndex,
  type FabriksCellEntry,
  type FabriksCellIndex,
  type FabriksCellRow,
  type FabriksObjectEntry,
} from "./fabriksCatalogs";
import type { FabriksCollection, FabriksTransportStats } from "./fabriksCollection";
import type { MeshoptDecoderLike } from "./fabriksDecode";
import {
  sharedFabriksDecodeDispatcher,
  type FabriksDecodeDispatcher,
} from "./fabriksDecodeDispatcher";
import { cellGridBox } from "./fabriksGrid";
import { groupByRowGroup, planFabriksCells, type FabriksPlanInput } from "./fabriksPlanner";
import { createSlabPlanes, updateSlabPlanes } from "../../../platform/coords/slabClip";

/**
 * Imperative orchestration of one fabriks collection: plan → fetch → decode →
 * scene-graph reconciliation.
 *
 * Deliberately NOT a React component (mirroring `BrickResidencyManager`): the
 * React layer owns lifecycle and feeds camera-settle events, and everything at
 * render cadence lives here behind plain method calls, so nothing re-renders
 * per streaming batch (OCTREE_RENDERER.md P17).
 *
 * Two properties worth naming, because both were absent from the DuckDB mesh
 * path this replaces:
 *
 *  - **Superseded work is abandoned.** Every drain carries a generation; a
 *    replan bumps it, and a stale drain stops at its next await instead of
 *    decoding and mounting a batch nobody asked for.
 *  - **Fetching is per ROW GROUP, not per cell.** The cell catalog's locator
 *    means several planned cells routinely live in one row group, and a row
 *    group is the smallest thing the reader can fetch.
 *
 * Debug consumers (DebugPanel) read `stats` / `buildDebugReport()` and steer
 * the planner through `setPlanConfig` — the `BrickResidencyManager.stats`
 * pattern, so the octree and mesh panels share one idiom.
 */

const DEFAULT_CACHE_BYTES = 192 * 1024 * 1024;
const DEFAULT_MAX_CELLS = 2048;
/** 5M triangles. `maxCells` caps cell COUNT; this caps what they weigh. */
const DEFAULT_MAX_INDICES = 15_000_000;
/**
 * Row groups in flight at once. Sequential fetching made wall time the SUM of
 * round trips; a handful in parallel hides most of the latency while decode
 * (still main-thread) naturally paces the pipeline. Workers pull groups from
 * one near-first cursor, so priority order is preserved.
 */
const CONCURRENT_FETCHES = 4;

/** The debug overlay's child name; the reconcile loop must never treat it as a cell. */
const CELL_BOXES_NAME = "__fabriks-cell-boxes__";
/** The selected instance's hull (bbox overlay). */
const SELECTION_HULL_NAME = "__fabriks-selection-hull__";

/** 12 box edges as corner-index pairs (corners differing in exactly one bit;
 * bit 0 → x, bit 1 → y, bit 2 → z picks min/max per axis). */
const BOX_EDGES: ReadonlyArray<readonly [number, number]> = (() => {
  const edges: [number, number][] = [];
  for (let corner = 0; corner < 8; corner++) {
    for (const bit of [1, 2, 4]) {
      if ((corner & bit) === 0) edges.push([corner, corner | bit]);
    }
  }
  return edges;
})();

export type FabriksMaterialConfig = {
  /** The uniform color used when `colorByInstance` is false. */
  color: readonly number[] | null | undefined;
  wireframe: boolean;
  opacity: number;
  /** Which instance colormap to color by; defaults to the standard one. */
  instanceColormap?: FabriksInstanceColormap;
  /** Instance coloring is the DEFAULT; false = uniform materialColor. */
  colorByInstance?: boolean;
  /** Double-sided surfaces (the default) vs front faces only. */
  doubleSided?: boolean;
};

/** One selected instance, addressed by its dense ordinal. */
export type FabriksSelection = {
  ordinal: number;
  /** Draw ONLY the selected instance. */
  isolate: boolean;
};

/** Camera-derived inputs per plan. Budgets live in `FabriksPlanConfig`.
 * `errorBudget` is the ORTHO path: a world-space error cap derived from the
 * 2D view's world-units-per-pixel (the planner's camera-free branch). */
export type FabriksPlanView = Pick<
  FabriksPlanInput,
  "frustum" | "cameraPosition" | "focalPixels" | "errorBudget"
>;

/** Runtime planner knobs, adjustable from the debug panel between settles. */
export type FabriksPlanConfig = {
  /** Screen-space error a cell may carry before it is refined, in pixels. */
  pixelBudget: number;
  /** Cap on planned cells. Exhausting it coarsens; it never drops a region. */
  maxCells: number;
  /** Cap on the plan's total index count; exhausting it coarsens likewise. */
  maxIndices: number;
  /** Ignore camera settles (the last plan keeps rendering) — for inspecting a
   * plan from other angles without replanning it away. */
  frozen: boolean;
};

/**
 * Counters over the manager's lifetime, mutated in place — never a store
 * write at streaming cadence (P17). `streamMs` brackets `readFetchGroup`
 * (network + parse + decode together — the transport's own `fetchMs` isolates
 * the network share) and is a CONCURRENT SUM across the parallel fetchers, so
 * it overstates wall time; `buildMs` brackets BufferGeometry assembly and
 * `normalsMs` the `computeVertexNormals` share of it. `completeMs` is the
 * wall clock from a plan to its last mounted cell — the mesh twin of the
 * brick stats' `timeToSharpMs`, and the number to judge streaming by.
 */
export type FabriksManagerStats = {
  plans: number;
  planMs: number;
  streamMs: number;
  buildMs: number;
  normalsMs: number;
  decodedCells: number;
  fetchErrors: number;
  /** Drains stopped by a superseding replan (or disposal) mid-work. */
  abortedDrains: number;
  completeMs: number;
  /** World-space index rebuilds from a placement change. More than a handful
   * means something is churning matrices that should be value-stable. */
  indexRebuilds: number;
};

/** One plan's shape, kept for the debug panel after the plan itself is consumed. */
export type FabriksPlanSummary = {
  cellCount: number;
  /** Selected cells per level, e.g. `{ 2: 8, 1: 41 }`. */
  byLevel: Record<number, number>;
  totalIndices: number;
  coarsenedRegions: number;
};

export class FabriksCollectionManager {
  /** Mounted by the React layer via `<primitive>`; children managed here.
   * A ClippingGroup because on the WebGPU node path clipping comes ONLY from
   * the scene graph — `material.clippingPlanes` is WebGL-era API the node
   * system never reads (verified: three.webgpu.js consumes planes solely via
   * `isClippingGroup` → ClippingContext). Disabled outside slab mode. */
  readonly group = new ClippingGroup();

  readonly stats: FabriksManagerStats = {
    plans: 0,
    planMs: 0,
    streamMs: 0,
    buildMs: 0,
    normalsMs: 0,
    decodedCells: 0,
    fetchErrors: 0,
    abortedDrains: 0,
    completeMs: 0,
    indexRebuilds: 0,
  };

  private readonly materialHandle: FabriksMaterialHandle;
  private get material() {
    return this.materialHandle.material;
  }
  /** Decoded cell geometries, owned here: mounting never transfers ownership
   * (the batch copies; the mesh path shares), so eviction is the ONE place a
   * geometry is disposed. */
  private readonly cache: LruByteCache<THREE.BufferGeometry>;
  /** All mounted cells as one BatchedMesh — one render object instead of one
   * per cell. The unbatched path below is the A/B fallback. */
  private readonly batch: FabriksBatchRenderer;
  private batching = true;
  /** The unbatched path's per-cell meshes (share cache-owned geometries). */
  private readonly mountedMeshes = new Map<string, THREE.Mesh>();
  /** Voxel → world for this layer, updated in place via `setVoxelToWorld`. */
  private readonly voxelToWorld = new THREE.Matrix4();
  /** Catalog rows, kept so a placement change rebuilds the world-space index
   * without re-reading the catalog — and without touching the caches, whose
   * geometry is in VOXEL space and survives any placement. */
  private catalogRows: FabriksCellRow[] | null = null;
  private index: FabriksCellIndex | null = null;
  private planned = new Map<string, string>();
  private plannedEntries: readonly FabriksCellEntry[] = [];
  private lastPlan: FabriksPlanSummary | null = null;
  private previousKeys: ReadonlySet<string> = new Set();
  private decoderPromise: Promise<MeshoptDecoderLike | null> | null = null;
  /** Where the CPU half of a row-group read runs (workers in production;
   * shared across managers — never disposed here). */
  private readonly decodeDispatcher: FabriksDecodeDispatcher;
  /** Bumped per plan; a drain whose generation is stale abandons its work. */
  private generation = 0;
  /** Aborts decodes still queued in the dispatcher when the plan they served
   * is superseded — see `bumpGeneration`. */
  private decodeAbort = new AbortController();
  private draining = false;
  private pendingView: FabriksPlanView | null = null;
  private disposed = false;
  /** Hidden ≠ disposed: the caches, catalogs and batch all survive, so a
   * hide/show cycle costs nothing. Deliberate memory retention — a hidden
   * layer keeps its geometry LRU and byte cache warm. */
  private hidden = false;
  private planConfig: FabriksPlanConfig;
  /** The camera inputs of the newest settle, replayed when a knob changes. */
  private lastView: FabriksPlanView | null = null;
  private planStartedAt = 0;
  private showCellBoxes = false;
  private cellBoxes: THREE.LineSegments | null = null;
  /** Derivative (per-face) normals: no normals computed or uploaded at all.
   * The default — `computeVertexNormals` was the largest main-thread cost on
   * the streaming path, and per-cell smooth normals seam at cell borders. */
  private flatNormals = true;
  /** The colormap currently baked into the material (null = uniform color). */
  private appliedColormap: FabriksInstanceColormap | null = DEFAULT_INSTANCE_COLORMAP;
  /** The colour LUT currently on the GPU, so a rebuild frees the old one. */
  private appliedLut: THREE.Texture | null = null;
  /** WORLD-space clip planes for the 2D slab (constants mutated on z-scrub).
   *  Order and pairing come from `platform/coords/slabClip.ts`. */
  private readonly clipPlanes = createSlabPlanes();
  private slab: { z: number; thickness: number } | null = null;
  private selection: FabriksSelection | null = null;
  /** The hull's persistent scene objects — created once, rewritten per
   * selection. A new material is a new pipeline under the WebGPU node system,
   * and the hull sits on the HOVER path when probe-marking is on: sweeping the
   * cursor across a dense collection must not compile per instance crossed. */
  private selectionHull: {
    group: THREE.Group;
    edgePositions: THREE.BufferAttribute;
    edgeMaterial: THREE.LineBasicMaterial;
    fill: THREE.Mesh;
    fillMaterial: THREE.MeshBasicMaterial;
  } | null = null;
  private hullOrdinal: number | null = null;
  /** Draw order for mounted cells (0 in 3D; 2 in slab mode — above the image
   * quad's renderOrder 1, matching the 2D overlay convention). */
  private cellRenderOrder = 0;

  constructor(
    private readonly opts: {
      collection: FabriksCollection;
      loadDecoder: () => Promise<MeshoptDecoderLike | null>;
      onInvalidate: () => void;
      /** Streaming-cadence stats signal for debug consumers; throttle at the
       * subscriber, not here (the manager stays render-cadence-blind). */
      onStatsChanged?: () => void;
      maxCacheBytes?: number;
      maxCells?: number;
      /** The decode pool. Defaults to the shared worker-backed dispatcher;
       * tests inject the sync one to stay deterministic and worker-free. */
      decodeDispatcher?: FabriksDecodeDispatcher;
    },
  ) {
    this.decodeDispatcher = opts.decodeDispatcher ?? sharedFabriksDecodeDispatcher();
    this.group.matrixAutoUpdate = false;
    this.group.clippingPlanes = this.clipPlanes;
    this.group.enabled = false; // slab mode only (setSlabClip)
    this.planConfig = {
      // The layer's "balanced" preset (DETAIL_BUDGETS); the card's effect
      // overrides this before the first plan either way.
      pixelBudget: 4,
      maxCells: opts.maxCells ?? DEFAULT_MAX_CELLS,
      maxIndices: DEFAULT_MAX_INDICES,
      frozen: false,
    };
    // Node material, instance-colored by `objectOrdinal` by default; the
    // flat-normals default and the selection uniforms live in the handle
    // (fabriksMaterial.ts).
    this.materialHandle = createFabriksMaterial();
    this.cache = new LruByteCache<THREE.BufferGeometry>(
      opts.maxCacheBytes ?? DEFAULT_CACHE_BYTES,
      (key, geometry) => {
        // three never disposes GPU buffers for you, and a streaming layer is
        // exactly the unbounded leak OCTREE_RENDERER.md P13 warns about.
        this.unmountCell(key);
        geometry.dispose();
      },
    );
    this.batch = new FabriksBatchRenderer(this.material, (next) => {
      this.group.add(next); // the batch removes its predecessor itself
      this.opts.onInvalidate();
    });
  }

  setMaterialConfig({
    color,
    wireframe,
    opacity,
    instanceColormap,
    colorByInstance,
    doubleSided,
  }: FabriksMaterialConfig): void {
    // Coloring mode is EXPLICIT: instance colors (objectOrdinal palette) by
    // default; `colorByInstance: false` switches to the uniform materialColor
    // (which a layer may carry either way — its presence decides nothing).
    if (color && color.length >= 3) {
      this.material.color.setRGB(color[0] / 255, color[1] / 255, color[2] / 255);
    }
    const targetColormap =
      colorByInstance === false ? null : (instanceColormap ?? DEFAULT_INSTANCE_COLORMAP);
    const coloringChanged = targetColormap !== this.appliedColormap;
    if (coloringChanged) {
      setInstanceColoring(this.materialHandle, targetColormap);
      this.appliedColormap = targetColormap;
    }

    // `needsUpdate` only on real pipeline-state flips: under the WebGPU node
    // system it can recompile the material, so an opacity slider must not set
    // it per tick. Color and opacity are uniforms and need nothing.
    const transparent = opacity < 1;
    const side = doubleSided === false ? THREE.FrontSide : THREE.DoubleSide;
    const pipelineChanged =
      coloringChanged ||
      this.material.wireframe !== wireframe ||
      this.material.transparent !== transparent ||
      this.material.side !== side;
    this.material.wireframe = wireframe;
    this.material.opacity = opacity;
    this.material.transparent = transparent;
    this.material.side = side;
    if (pipelineChanged) this.material.needsUpdate = true;
  }

  /**
   * Bind the ordinal → value-code lookup a layer's `colorBys` / `filterBys`
   * resolve to (`fabriksColorLut.ts`), or `null` to drop back to the instance
   * palette with nothing filtered.
   *
   * Uniform writes and a texture swap, exactly like `setSelection` — a picker
   * toggle must not recompile a pipeline. A REUSED arena hands over the same
   * texture object, which is the no-dispose case below; a previously bound
   * texture that is actually replaced is disposed here because this manager
   * is what put it on the GPU.
   */
  setColorLut(
    lut: {
      texture: THREE.Texture;
      width: number;
      height: number;
      window: { valueMin: number; valueMax: number };
    } | null,
    modes: { colorize: boolean; filter: boolean },
  ): void {
    if (lut?.texture !== this.appliedLut) {
      this.appliedLut?.dispose();
      this.appliedLut = lut?.texture ?? null;
    }
    setColorLut(this.materialHandle, lut, modes);
    this.opts.onInvalidate();
  }

  /**
   * The APPEARANCE half — palette row and clim window
   * (`composeMeshLutAppearance`). Two uniform writes and an in-place palette
   * refill; the table is never touched, which is the whole point of the
   * value-code encoding.
   */
  setColorAppearance(style: {
    palette: THREE.DataTexture | null;
    climMin: number;
    climMax: number;
  }): void {
    setColorAppearance(this.materialHandle, style);
    this.opts.onInvalidate();
  }

  /**
   * Highlight (and optionally isolate) one instance. Uniform writes only —
   * the selection branch is always compiled, so picking never rebuilds a
   * pipeline.
   */
  setSelection(selection: FabriksSelection | null): void {
    this.selection = selection ? { ...selection } : null;
    this.materialHandle.uniforms.selectedOrdinal.value = selection?.ordinal ?? -1;
    this.materialHandle.uniforms.isolate.value = selection?.isolate ? 1 : 0;
    this.updateSelectionHull();
    this.opts.onInvalidate();
    this.opts.onStatsChanged?.();
  }

  /**
   * The selected instance's HULL: its catalog bbox as bright edges + a faint
   * fill, in the instance's own hue (CPU twin of the shader's hue scatter).
   * Performance over fidelity by design — no second pass over mesh geometry,
   * just 12 edges and a box, appearing when the (cached) catalog resolves.
   */
  private updateSelectionHull(): void {
    const ordinal = this.selection?.ordinal ?? null;
    if (ordinal === null) {
      this.hideSelectionHull();
      return;
    }
    if (this.hullOrdinal === ordinal && this.selectionHull?.group.visible) return;
    void this.identifyOrdinal(ordinal)
      .then((entry) => {
        // Latest-wins: the selection may have moved while the catalog loaded.
        if (this.disposed || this.selection?.ordinal !== ordinal) return;
        this.buildSelectionHull(ordinal, entry);
        this.opts.onInvalidate();
      })
      .catch(() => {
        // No catalog, no hull — the shader highlight still marks the object.
      });
  }

  /** The hull's objects, created ONCE for the manager's lifetime. */
  private ensureSelectionHull(): NonNullable<typeof this.selectionHull> {
    if (this.selectionHull) return this.selectionHull;

    const hull = new THREE.Group();
    hull.name = SELECTION_HULL_NAME;
    hull.matrixAutoUpdate = false;
    hull.visible = false;
    // Pure furniture: it marks the picked instance, it can never BE one — it
    // carries no `objectOrdinal` attribute, so `resolveMeshHit` discards any
    // hit on it. But the layer's pointer handlers sit on THIS group, so three
    // raycasts the hull's children along with the BatchedMesh on every pointer
    // move while hover probing. `raycast = noop` returns nothing AND stops the
    // recursion into the children (three.core.js `intersect`), which is what
    // takes the per-segment LineSegments walk below off the hot path.
    hull.raycast = () => {};

    const edgePositions = new THREE.BufferAttribute(
      new Float32Array(BOX_EDGES.length * 2 * 3),
      3,
    );
    edgePositions.setUsage(THREE.DynamicDrawUsage);
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", edgePositions);
    const edgeMaterial = new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.renderOrder = 3;
    edges.matrixAutoUpdate = false;
    // The positions are rewritten in place per selection; a lazily-computed
    // bounding sphere would go stale, and culling a 24-vertex overlay that is
    // drawn depth-free anyway buys nothing.
    edges.frustumCulled = false;
    hull.add(edges);

    const fillMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.08,
      depthTest: false,
      depthWrite: false,
    });
    const fill = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), fillMaterial);
    fill.renderOrder = 3;
    fill.frustumCulled = false;
    hull.add(fill);

    this.selectionHull = { group: hull, edgePositions, edgeMaterial, fill, fillMaterial };
    this.group.add(hull);
    return this.selectionHull;
  }

  private buildSelectionHull(ordinal: number, entry: FabriksObjectEntry | null): void {
    if (!entry) {
      this.hideSelectionHull();
      return;
    }
    const hull = this.ensureSelectionHull();
    const min = entry.bboxMin;
    const max = entry.bboxMax;

    const positions = hull.edgePositions.array as Float32Array;
    let cursor = 0;
    for (const [a, b] of BOX_EDGES) {
      for (const corner of [a, b]) {
        positions[cursor] = corner & 1 ? max[0] : min[0];
        positions[cursor + 1] = corner & 2 ? max[1] : min[1];
        positions[cursor + 2] = corner & 4 ? max[2] : min[2];
        cursor += 3;
      }
    }
    hull.edgePositions.needsUpdate = true;

    // Uniform writes only — the CPU twin of the shader's hue scatter.
    const color = new THREE.Color().setHSL(instanceHue(ordinal), 0.85, 0.6);
    hull.edgeMaterial.color.copy(color);
    hull.fillMaterial.color.copy(color);
    hull.fill.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    hull.fill.scale.set(
      Math.max(max[0] - min[0], 1e-6),
      Math.max(max[1] - min[1], 1e-6),
      Math.max(max[2] - min[2], 1e-6),
    );
    hull.group.visible = true;
    this.hullOrdinal = ordinal;
  }

  private hideSelectionHull(): void {
    if (this.selectionHull) this.selectionHull.group.visible = false;
    this.hullOrdinal = null;
  }

  private disposeSelectionHull(): void {
    if (!this.selectionHull) return;
    this.group.remove(this.selectionHull.group);
    for (const child of this.selectionHull.group.children) {
      const object = child as THREE.Mesh | THREE.LineSegments;
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.selectionHull = null;
    this.hullOrdinal = null;
  }

  getSelection(): FabriksSelection | null {
    return this.selection ? { ...this.selection } : null;
  }

  /** ordinal → the object catalog's entry (lazy; the catalog loads once). */
  async identifyOrdinal(ordinal: number): Promise<FabriksObjectEntry | null> {
    return (await this.ordinalIndex()).get(ordinal) ?? null;
  }

  /**
   * SYNCHRONOUS ordinal lookup for the hover hot path: answers from the
   * already-resolved catalog (the common case after the first pick) and
   * returns null while it is still loading — kicking the load so the next
   * peek answers. Instant cursor-tracking depends on this never awaiting.
   */
  peekOrdinal(ordinal: number): FabriksObjectEntry | null {
    if (!this.ordinalIndexResolved) {
      void this.ordinalIndex().catch(() => {});
      return null;
    }
    return this.ordinalIndexResolved.get(ordinal) ?? null;
  }

  /** objectId → entry (for select-by-id; same lazy catalog). */
  async identifyObjectId(objectId: number): Promise<FabriksObjectEntry | null> {
    return (await this.opts.collection.loadObjectCatalog()).get(objectId) ?? null;
  }

  /**
   * EVERY object in the collection, ordinal-ordered — for a list that browses
   * the collection rather than picking out of it (`features/meshes/MeshesPanel`).
   *
   * Shares the lazy ordinal index with picking, so the list is free once
   * anything has resolved an ordinal, and vice versa. REJECTS when the
   * collection carries no object catalog (the picking callers all swallow
   * that; a list has to say so), so callers must handle the rejection.
   */
  async listObjects(): Promise<readonly FabriksObjectEntry[]> {
    const byOrdinal = await this.ordinalIndex();
    return [...byOrdinal.values()].sort((a, b) => a.ordinal - b.ordinal);
  }

  private ordinalIndexPromise: Promise<Map<number, FabriksObjectEntry>> | null = null;
  /** The resolved map, for the synchronous `peekOrdinal` fast path. */
  private ordinalIndexResolved: Map<number, FabriksObjectEntry> | null = null;
  private ordinalIndex(): Promise<Map<number, FabriksObjectEntry>> {
    if (!this.ordinalIndexPromise) {
      this.ordinalIndexPromise = this.opts.collection
        .loadObjectCatalog()
        .then((objects) => {
          const byOrdinal = new Map<number, FabriksObjectEntry>();
          for (const entry of objects.values()) byOrdinal.set(entry.ordinal, entry);
          this.ordinalIndexResolved = byOrdinal;
          return byOrdinal;
        })
        .catch((error: unknown) => {
          this.ordinalIndexPromise = null;
          throw error;
        });
    }
    return this.ordinalIndexPromise;
  }

  /**
   * The layer's placement, applied without disruption: the group matrix moves,
   * the world-space index is rebuilt from the kept catalog rows, and the plan
   * re-runs — but the byte and geometry caches survive untouched, because the
   * geometry itself is in voxel space. (This used to rebuild the entire
   * manager, which turned any placement-adjacent store change into a full
   * refetch.) A value-equal matrix is a no-op.
   */
  /** The open collection — for readers that extract geometry outside the
   * render plan (the mesh designer's edit-existing path). */
  getCollection(): FabriksCollection {
    return this.opts.collection;
  }

  /** A copy of the current voxel → world placement. */
  getVoxelToWorld(): THREE.Matrix4 {
    return this.voxelToWorld.clone();
  }

  setVoxelToWorld(matrix: THREE.Matrix4): void {
    if (this.disposed || this.voxelToWorld.equals(matrix)) return;
    this.voxelToWorld.copy(matrix);
    this.group.matrix.copy(matrix);
    this.group.matrixWorldNeedsUpdate = true;
    if (this.catalogRows) {
      this.index = buildFabriksCellIndex(
        this.catalogRows,
        this.opts.collection.manifest,
        this.voxelToWorld,
      );
      this.stats.indexRebuilds++;
      if (!this.planConfig.frozen && this.lastView) this.runPlan(this.lastView);
    }
    this.opts.onInvalidate();
  }

  getFlatNormals(): boolean {
    return this.flatNormals;
  }

  /**
   * Flat (derivative) vs smooth (computed) normals. The cached geometries are
   * brought in line either way — smooth retrofits normals (a smooth material
   * with no normal attribute shades flat regardless), flat DELETES them (the
   * batch's fixed attribute layout must match what future decodes carry) —
   * and a batch in use rebuilds under the new layout.
   */
  setFlatNormals(flat: boolean): void {
    if (this.flatNormals === flat) return;
    this.flatNormals = flat;
    this.material.flatShading = flat;
    this.material.needsUpdate = true; // legitimate: the normal path changes
    if (flat) {
      this.cache.forEach((geometry) => {
        if (geometry.getAttribute("normal")) geometry.deleteAttribute("normal");
      });
    } else {
      // Timed per geometry, not around the walk: `normalsMs` means "genuine
      // main-thread normal computation", and a walk over an empty cache must
      // not smear timer noise into it.
      this.cache.forEach((geometry) => {
        if (geometry.getAttribute("normal")) return;
        const start = performance.now();
        geometry.computeVertexNormals();
        this.stats.normalsMs += performance.now() - start;
      });
    }
    if (this.batching) this.batch.refresh();
    this.opts.onInvalidate();
    this.opts.onStatsChanged?.();
  }

  getPlanConfig(): Readonly<FabriksPlanConfig> {
    return this.planConfig;
  }

  /** The instance colormap in effect, or null when a uniform color is. */
  getAppliedColormap(): FabriksInstanceColormap | null {
    return this.appliedColormap;
  }

  /**
   * The 2D slab: clip the collection to a world-z window around the displayed
   * slice, drawn as an OVERLAY (depth test off, renderOrder above the image
   * quad — the annotation-layer convention; `currentZ` may sit at any world z
   * relative to the quad's plane, so depth-testing against it is a coin flip).
   * `null` restores the 3D state. A z-scrub with the slab already on mutates
   * only the plane constants (uniforms) — no pipeline rebuild.
   */
  setSlabClip(slab: { z: number; thickness: number } | null): void {
    const wasClipping = this.slab !== null;
    this.slab = slab ? { ...slab } : null;
    if (slab) updateSlabPlanes(this.clipPlanes, slab);
    const clipping = slab !== null;
    if (clipping !== wasClipping) {
      // The plane-count change flows through the ClippingGroup's context and
      // rebuilds pipelines by itself; needsUpdate covers the depth flip.
      this.group.enabled = clipping;
      this.material.depthTest = !clipping;
      this.material.needsUpdate = true;
      this.cellRenderOrder = clipping ? 2 : 0;
      this.batch.setRenderOrder(this.cellRenderOrder);
      for (const mesh of this.mountedMeshes.values()) mesh.renderOrder = this.cellRenderOrder;
    }
    this.opts.onInvalidate();
  }

  getSlabClip(): { z: number; thickness: number } | null {
    return this.slab ? { ...this.slab } : null;
  }

  /**
   * Adjust planner knobs between settles. A change replans against the last
   * settle's camera immediately (unless frozen), so a slider drag shows its
   * effect without waiting for the next camera move; unfreezing replays the
   * settles that were ignored.
   */
  setPlanConfig(partial: Partial<FabriksPlanConfig>): void {
    const previous = this.planConfig;
    this.planConfig = { ...previous, ...partial };
    if (this.disposed) return;
    const thawed = previous.frozen && !this.planConfig.frozen;
    const changed =
      this.planConfig.pixelBudget !== previous.pixelBudget ||
      this.planConfig.maxCells !== previous.maxCells ||
      this.planConfig.maxIndices !== previous.maxIndices;
    if ((thawed || changed) && !this.planConfig.frozen && this.lastView) {
      this.runPlan(this.lastView);
    }
  }

  /** Draw the current plan's cell boxes (voxel-space, colored by level). */
  setShowCellBoxes(show: boolean): void {
    this.showCellBoxes = show;
    this.rebuildCellBoxes();
    this.opts.onInvalidate();
  }

  getShowCellBoxes(): boolean {
    return this.showCellBoxes;
  }

  /** Load the spatial index. One whole-file read; no geometry is opened. */
  async ensureIndex(): Promise<void> {
    if (this.index || this.disposed) return;
    const rows: FabriksCellRow[] = await this.opts.collection.loadCellCatalog();
    if (this.disposed) return;
    this.catalogRows = rows;
    this.index = buildFabriksCellIndex(rows, this.opts.collection.manifest, this.voxelToWorld);
  }

  /**
   * Layer visibility WITHOUT teardown. Hiding stops planning and abandons the
   * in-flight drain (hidden work is superseded work) but keeps everything
   * paid for — open footers, byte cache, geometry LRU, catalogs, batch — so
   * showing again re-plans from cache instead of refetching the collection.
   * (Unmounting the layer still disposes it all.)
   *
   * The re-show REPLAN is the driver's (`CollectionDriver.update`), not this
   * method's: it owns that edge for both collection formats, and planning here
   * too would run the whole plan+drain twice per toggle. `lastView` is still
   * recorded while hidden for `setPlanConfig` / `setVoxelToWorld`.
   */
  setVisible(visible: boolean): void {
    const hidden = !visible;
    if (this.hidden === hidden || this.disposed) return;
    this.hidden = hidden;
    this.group.visible = visible;
    if (hidden) {
      this.bumpGeneration(); // stale-mark the current drain; it stops at its next await
      this.pendingView = null;
    }
    this.opts.onInvalidate();
  }

  updatePlan(view: FabriksPlanView): void {
    // Recorded even when frozen, hidden or index-less, so a thaw / re-show /
    // late index replans against the newest camera rather than a stale one.
    this.lastView = view;
    if (!this.index || this.disposed || this.planConfig.frozen || this.hidden) return;
    this.runPlan(view);
  }

  private runPlan(view: FabriksPlanView): void {
    const index = this.index;
    // `hidden` guards the DIRECT callers too (setPlanConfig, setVoxelToWorld
    // replay lastView themselves); the settle is in lastView for the re-show.
    if (!index || this.disposed || this.hidden) return;

    const planStart = performance.now();
    const plan = planFabriksCells({
      index,
      maxCells: this.planConfig.maxCells,
      maxIndices: this.planConfig.maxIndices,
      pixelBudget: this.planConfig.pixelBudget,
      previousKeys: this.previousKeys,
      ...view,
    });
    this.previousKeys = plan.keys;
    this.planned = new Map(plan.cells.map((cell) => [cell.key, cell.key]));
    this.plannedEntries = plan.cells;
    this.lastPlan = {
      cellCount: plan.cells.length,
      byLevel: plan.cells.reduce<Record<number, number>>((acc, cell) => {
        acc[cell.level] = (acc[cell.level] ?? 0) + 1;
        return acc;
      }, {}),
      totalIndices: plan.totalIndices,
      coarsenedRegions: plan.coarsenedRegions,
    };
    this.cache.protect(this.planned.keys());

    // Drop no-longer-planned cells BEFORE sizing the batch: a capacity growth
    // rebuilds the BatchedMesh by re-adding every mounted geometry, and cells
    // this plan just dropped would be copied only to be thrown away.
    for (const key of [...this.mountedKeys()]) {
      if (!this.planned.has(key)) this.unmountCell(key);
    }
    // Room for the whole plan up front, so no rebuild lands mid-drain; then
    // reclaim the dropped cells' buffer space at this plan boundary, keeping
    // the mid-mount optimize() in ensureRoom the rare fallback. (A rebuild
    // from ensureCapacity already yields zero waste, so compact() no-ops.)
    if (this.batching) {
      let vertices = 0;
      let indices = 0;
      for (const cell of plan.cells) {
        vertices += cell.vertexCount;
        indices += cell.indexCount;
      }
      this.batch.ensureCapacity(
        Math.ceil((plan.cells.length + 1) * 1.2),
        Math.ceil(vertices * 1.2),
        Math.ceil(indices * 1.2),
      );
      this.batch.compact();
    }
    // Mount already-decoded cells instantly.
    for (const key of this.planned.keys()) {
      if (this.isMounted(key)) continue;
      const cached = this.cache.get(key);
      if (cached) this.mountCell(key, cached);
    }
    this.rebuildCellBoxes();
    this.stats.plans++;
    this.stats.planMs += performance.now() - planStart;
    this.planStartedAt = planStart;
    this.opts.onInvalidate();
    this.opts.onStatsChanged?.();

    // A replan invalidates whatever the previous drain was doing.
    this.bumpGeneration();
    this.pendingView = view;
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (!this.disposed && this.pendingView) {
        this.pendingView = null;
        const generation = this.generation;
        const index = this.index;
        if (!index) break;

        const missing = [...this.planned.keys()]
          .filter((key) => !this.cache.has(key))
          .map((key) => index.byKey.get(key))
          .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
        if (missing.length === 0) {
          this.stats.completeMs = performance.now() - this.planStartedAt;
          this.opts.onStatsChanged?.();
          continue;
        }

        // Near-first, a few in flight: `missing` preserves the plan's
        // ordering and the workers pull from one shared cursor, so the
        // closest cell's row group is still requested first — but round trips
        // overlap instead of summing.
        const groups = groupByRowGroup(missing);
        const failed: typeof groups = [];
        let cursor = 0;
        const worker = async (): Promise<void> => {
          while (!this.isStale(generation)) {
            const next = cursor++;
            if (next >= groups.length) return;
            const group = groups[next];
            if (!(await this.streamGroup(group, generation))) failed.push(group);
          }
        };
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENT_FETCHES, groups.length) }, worker),
        );
        // Superseded: CONTINUE, never return — the replan that staled this
        // generation already set `pendingView` and its own drain() call
        // early-returned against `draining`, so exiting here would strand the
        // NEW plan's missing cells until some later settle. The loop re-reads
        // `pendingView` and drains the new plan (or exits if hidden/disposed
        // cleared it).
        if (this.isStale(generation)) {
          this.abandon();
          continue;
        }

        // One retry round for transiently-failed groups (an expired-grant 403
        // heals on the forced rotation the failure triggered). A group that
        // fails twice stays a hole ONLY until the next replan — its cells are
        // uncached, so any settle refetches them.
        let retriesAbandoned = false;
        for (const group of failed) {
          if (this.isStale(generation)) {
            retriesAbandoned = true;
            break;
          }
          await this.streamGroup(group, generation);
        }
        if (retriesAbandoned || this.isStale(generation)) {
          this.abandon();
          continue;
        }
        this.stats.completeMs = performance.now() - this.planStartedAt;
        this.opts.onStatsChanged?.();
      }
    } finally {
      this.draining = false;
    }
  }

  /** Fetch, decode and mount one row group's worth of planned cells — the
   * fetch on this thread (byte cache, credential rotation), the decode on the
   * dispatcher's workers. Returns false on a fetch/decode failure (the drain
   * retries once). */
  private async streamGroup(
    group: ReturnType<typeof groupByRowGroup>[number],
    generation: number,
  ): Promise<boolean> {
    const streamStart = performance.now();
    let decoded;
    try {
      decoded = await this.opts.collection.readFetchGroupVia(
        group,
        (request) =>
          this.decodeDispatcher.decode(request, () => this.ensureDecoder(), {
            signal: this.decodeAbort.signal,
          }),
        // Smooth mode: the worker computes the normals too, so nothing
        // per-vertex is left on this thread.
        { computeNormals: !this.flatNormals },
      );
    } catch (error) {
      // A superseded plan's queued decode was dropped on purpose, not failed.
      if (this.isStale(generation)) return false;
      this.stats.fetchErrors++;
      this.opts.onStatsChanged?.();
      console.error(
        `[fabriks] failed to read level ${group.level} part ${group.part} row group ${group.rowGroup}:`,
        error,
      );
      return false;
    }
    this.stats.streamMs += performance.now() - streamStart;
    if (this.isStale(generation)) return true;

    const buildStart = performance.now();
    for (const [key, cell] of decoded) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(cell.positions, 3));
      geometry.setAttribute("objectOrdinal", new THREE.BufferAttribute(cell.objectOrdinals, 1));
      geometry.setIndex(new THREE.BufferAttribute(cell.indices, 1));
      // fabriks carries no normals column. Flat (derivative) shading needs
      // none at all; smooth shading gets them PRECOMPUTED by the decode
      // worker (`computeSmoothNormals`, three's math exactly). The
      // main-thread compute survives only for a normals toggle that raced
      // this fetch — the request was made under the other mode.
      if (!this.flatNormals) {
        if (cell.normals) {
          geometry.setAttribute("normal", new THREE.BufferAttribute(cell.normals, 3));
        } else {
          const normalsStart = performance.now();
          geometry.computeVertexNormals();
          this.stats.normalsMs += performance.now() - normalsStart;
        }
      }
      this.applyAnalyticBounds(geometry, key);

      this.cache.set(key, geometry, cell.bytes);
      // Mount only if still planned: a replan may have raced this fetch, and
      // the cache absorbs the result either way.
      if (this.planned.has(key) && !this.isMounted(key)) this.mountCell(key, geometry);
    }
    this.stats.buildMs += performance.now() - buildStart;
    this.stats.decodedCells += decoded.size;
    this.opts.onInvalidate();
    this.opts.onStatsChanged?.();
    return true;
  }

  /** A drain from a superseded plan stops rather than mounting stale work. */
  private isStale(generation: number): boolean {
    return this.disposed || generation !== this.generation;
  }

  /** Stale-mark the running drain AND drop its decodes still queued in the
   * dispatcher, so a replan never waits behind work nobody will mount. */
  private bumpGeneration(): void {
    this.generation++;
    this.decodeAbort.abort();
    this.decodeAbort = new AbortController();
  }

  getBatching(): boolean {
    return this.batching;
  }

  /** A/B switch: one BatchedMesh (default) vs one Mesh per cell. Remounts the
   * current plan's cached cells into the chosen path; nothing refetches. */
  setBatching(batching: boolean): void {
    if (this.batching === batching || this.disposed) return;
    for (const key of [...this.mountedKeys()]) this.unmountCell(key);
    if (!batching) this.batch.dispose();
    this.batching = batching;
    for (const key of this.planned.keys()) {
      const cached = this.cache.get(key);
      if (cached) this.mountCell(key, cached);
    }
    this.opts.onInvalidate();
    this.opts.onStatsChanged?.();
  }

  private mountedKeys(): IterableIterator<string> {
    return this.batching ? this.batch.keys() : this.mountedMeshes.keys();
  }

  private isMounted(key: string): boolean {
    return this.batching ? this.batch.has(key) : this.mountedMeshes.has(key);
  }

  private mountCell(key: string, geometry: THREE.BufferGeometry): void {
    if (this.batching) {
      // The batch's attribute layout is fixed, so the geometry must match the
      // CURRENT normals mode even if it was decoded under the other one.
      if (this.flatNormals) {
        if (geometry.getAttribute("normal")) geometry.deleteAttribute("normal");
      } else if (!geometry.getAttribute("normal")) {
        const start = performance.now();
        geometry.computeVertexNormals();
        this.stats.normalsMs += performance.now() - start;
      }
      this.batch.mount(key, geometry);
      return;
    }
    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.name = key;
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = this.cellRenderOrder;
    this.group.add(mesh);
    this.mountedMeshes.set(key, mesh);
  }

  private unmountCell(key: string): void {
    if (this.batch.has(key)) this.batch.unmount(key);
    const mesh = this.mountedMeshes.get(key);
    if (mesh) {
      mesh.removeFromParent();
      this.mountedMeshes.delete(key);
    }
  }

  private abandon(): void {
    this.stats.abortedDrains++;
    this.opts.onStatsChanged?.();
  }

  /** One paste-able snapshot for DebugPanel and the octree debug report. */
  buildDebugReport(): {
    planConfig: FabriksPlanConfig;
    flatNormals: boolean;
    stats: FabriksManagerStats;
    lastPlan: FabriksPlanSummary | null;
    mountedCells: number;
    slab: { z: number; thickness: number } | null;
    selection: FabriksSelection | null;
    cache: { cells: number; bytes: number };
    batch: FabriksBatchStats | null;
    transport: FabriksTransportStats | null;
    catalog: { cells: number; levels: number[]; roots: number } | null;
  } {
    return {
      planConfig: { ...this.planConfig },
      flatNormals: this.flatNormals,
      stats: { ...this.stats },
      lastPlan: this.lastPlan ? { ...this.lastPlan, byLevel: { ...this.lastPlan.byLevel } } : null,
      mountedCells: this.batching ? this.batch.count : this.mountedMeshes.size,
      slab: this.getSlabClip(),
      selection: this.getSelection(),
      cache: { cells: this.cache.size, bytes: this.cache.bytes },
      batch: this.batching ? this.batch.stats() : null,
      transport: this.opts.collection.transportStats(),
      catalog: this.index
        ? {
            cells: this.index.cells.length,
            levels: [...this.index.levels],
            roots: this.index.roots.length,
          }
        : null,
    };
  }

  private ensureDecoder(): Promise<MeshoptDecoderLike | null> {
    if (!this.decoderPromise) this.decoderPromise = this.opts.loadDecoder();
    return this.decoderPromise;
  }

  /**
   * Bounding volumes from the catalog, not from the vertices. three would
   * otherwise walk every position on first frustum test — per cell, on the
   * main thread. The catalog's box is exact up to quantization, so it is
   * expanded by one quantization step of the cell's grid box.
   */
  private applyAnalyticBounds(geometry: THREE.BufferGeometry, key: string): void {
    const entry = this.index?.byKey.get(key);
    if (!entry) return;
    const grid = cellGridBox(this.opts.collection.manifest.grid, entry.level, entry.cell);
    const box = new THREE.Box3(
      new THREE.Vector3(...entry.bboxMin),
      new THREE.Vector3(...entry.bboxMax),
    );
    for (const axis of [0, 1, 2] as const) {
      const step = (grid.max[axis] - grid.min[axis]) / 65535;
      box.min.setComponent(axis, box.min.getComponent(axis) - step);
      box.max.setComponent(axis, box.max.getComponent(axis) + step);
    }
    geometry.boundingBox = box;
    geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  }

  /**
   * The plan's cell boxes as ONE LineSegments (never a helper per cell), in
   * the collection's VOXEL space — the catalog's exact geometry bounds — so
   * the group's voxel→world matrix places them like the meshes themselves.
   */
  private rebuildCellBoxes(): void {
    if (this.cellBoxes) {
      this.group.remove(this.cellBoxes);
      this.cellBoxes.geometry.dispose();
      (this.cellBoxes.material as THREE.Material).dispose();
      this.cellBoxes = null;
    }
    if (!this.showCellBoxes || this.plannedEntries.length === 0 || this.disposed) return;

    const positions = new Float32Array(this.plannedEntries.length * BOX_EDGES.length * 2 * 3);
    const colors = new Float32Array(positions.length);
    const color = new THREE.Color();
    let cursor = 0;
    for (const entry of this.plannedEntries) {
      color.setHSL((entry.level * 0.31 + 0.05) % 1, 0.85, 0.55);
      for (const [a, b] of BOX_EDGES) {
        for (const corner of [a, b]) {
          positions[cursor] = corner & 1 ? entry.bboxMax[0] : entry.bboxMin[0];
          positions[cursor + 1] = corner & 2 ? entry.bboxMax[1] : entry.bboxMin[1];
          positions[cursor + 2] = corner & 4 ? entry.bboxMax[2] : entry.bboxMin[2];
          colors[cursor] = color.r;
          colors[cursor + 1] = color.g;
          colors[cursor + 2] = color.b;
          cursor += 3;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.cellBoxes = new THREE.LineSegments(geometry, material);
    this.cellBoxes.name = CELL_BOXES_NAME;
    this.cellBoxes.matrixAutoUpdate = false;
    // Debug overlay, never pickable — and a LineSegments raycast is per
    // segment, so leaving it in the layer's pick set made turning debug on
    // silently expensive to hover. Same reasoning as the selection hull.
    this.cellBoxes.raycast = () => {};
    this.group.add(this.cellBoxes);
  }

  dispose(): void {
    this.disposed = true;
    this.bumpGeneration();
    this.cache.clear(); // evictions unmount and dispose every geometry
    this.batch.dispose();
    this.mountedMeshes.clear();
    this.disposeSelectionHull();
    if (this.cellBoxes) {
      this.cellBoxes.geometry.dispose();
      (this.cellBoxes.material as THREE.Material).dispose();
      this.cellBoxes = null;
    }
    this.group.clear();
    this.appliedLut?.dispose();
    this.appliedLut = null;
    disposeColorAppearance(this.materialHandle);
    this.material.dispose();
    this.opts.collection.release();
  }
}
