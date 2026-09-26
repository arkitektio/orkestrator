import * as THREE from "three";
import type { GpuPickSource } from "../../platform/draw/gpuPick";
import {
  DEFAULT_INSTANCE_COLORMAP,
  INSTANCE_COLORMAP_SPECS,
  type FabriksInstanceColormap,
} from "../../platform/gpu/instanceColormaps";
import type { KonnektionCollection } from "./konnektion/konnektionCollection";
import {
  buildKonnektionCellIndex,
  type KonnektionCellIndex,
  type KonnektionCellRow,
  type KonnektionObjectEntry,
} from "./konnektion/konnektionCatalogs";
import type { DecodedNetworkCell } from "./konnektion/konnektionDecode";
import {
  IDENTITY_STYLING,
  networkCapacityFor,
  packNetworkCells,
  type NetworkStyling,
} from "./konnektion/konnektionPack";
import {
  groupByRowGroup,
  planKonnektionCells,
  type KonnektionPlan,
  type KonnektionPlanInput,
} from "./konnektion/konnektionPlanner";
import {
  createNetworkGpuBundle,
  createNetworkUniforms,
  type NetworkGpuBundle,
  type NetworkUniforms,
} from "./networkMaterial";
import {
  CollectionManagerBase,
  type SlabClip,
} from "../../platform/collections/collectionManagerBase";

/**
 * Everything that draws a konnektion collection, and nothing that renders
 * React.
 *
 * ## The two-plane rule (P17)
 *
 * This class lives entirely on the RENDER plane: it is driven by imperative
 * setters, it mutates three.js objects and uniforms in place, and it calls
 * `onInvalidate` when a frame is owed. It never writes to a store and never
 * knows the UI's cadence — `onStatsChanged` is a bare notification the caller
 * throttles. Reading `stats` is safe at any time precisely because it is
 * mutated rather than replaced.
 *
 * ## Allocate once, memcpy per plan
 *
 * The GPU bundle (`networkMaterial.ts`) is created ONCE, lazily, sized by
 * `networkCapacityFor` so that every plan the planner can emit fits by
 * construction. A plan swap is then: pack the decoded cells into the bundle's
 * arrays (`konnektionPack.ts` — a memcpy plus an edge-index rebase), flip
 * `needsUpdate`, set `instanceCount`. No geometry is created or disposed, no
 * material is touched, no pipeline recompiles — the storage-buffer twin of
 * the rule `pointsMaterial.ts` follows.
 *
 * Everything the card can change is a uniform, a material prop or a `visible`
 * flag. `lineWidth` in particular is a uniform consulted only where a node's
 * stored radius is 0, so a width drag costs nothing for any collection.
 *
 * ## Why it is so much smaller than `fabriksManager.ts`
 *
 * The mesh manager streams cells at mixed levels into a growing `BatchedMesh`,
 * with a geometry LRU, a four-way concurrent drain and generation guards. None
 * of that applies here: konnektion draws ONE level at a time (see
 * `konnektionPlanner.ts`), and a graph is far smaller than the surface it runs
 * through. So a plan is: fetch the level's in-view cells, pack them, done.
 */

/** Counters the debug panel reads. Mutated in place — never replaced (P17). */
export type NetworkManagerStats = {
  plannedCells: number;
  residentCells: number;
  level: number;
  nodes: number;
  edges: number;
  ghosts: number;
  /** True when a budget forced a coarser level than the error wanted. */
  coarsenedForBudget: boolean;
  /** True when the chosen level itself blew a budget and was cut near-first. */
  truncated: boolean;
  fetchMs: number;
  decodeMs: number;
  errors: number;
  /**
   * Vocabulary names the active styling asked for that the resident cells
   * could not resolve. A rule over one was SKIPPED, never applied — the card
   * surfaces these the way `columnLut` surfaces a skipped entry. Replaced (not
   * mutated) per pack, since it is a list rather than a counter.
   */
  attributesMissing: string[];
};

export type NetworkMaterialConfig = {
  /** RGBA 0–255, as the API stores it. */
  color?: readonly number[] | null;
  opacity?: number;
  /** Flat width in scene units, used where the collection carries no radii. */
  lineWidth?: number | null;
  showNodes?: boolean;
  directed?: boolean;
  /** Colour by instance id (the DEFAULT, the mesh layer's convention) vs the
   *  flat material colour. Explicit rather than inferred from `color`'s
   *  presence — a layer with a stored colour must still be instance-colorable. */
  colorByInstance?: boolean;
  /** Which instance palette the id hue is drawn from (default "hues"). */
  instanceColormap?: FabriksInstanceColormap;
};

export type NetworkPlanConfig = {
  pixelBudget?: number;
  maxCells?: number;
  maxNodes?: number;
  maxEdges?: number;
  maxLevel?: number | null;
};

export type { SlabClip };

/** How the packed values become colour. Null clim ends stretch over the packed
 *  range, the "over what you read" convention every other picker keeps. */
export type NetworkValueAppearance = {
  palette: THREE.DataTexture | null;
  climMin: number | null;
  climMax: number | null;
  colorize: boolean;
  applyToGlyphs: boolean;
  /** Which buffer a segment's value is pulled from: "node" (the start node's
   *  slot — graph, object-level and per-node colourings) or "edge" (the packed
   *  edge's own slot — a per-EDGE-table colouring). Optional so pre-existing
   *  appearances read as "node". */
  valueSource?: "node" | "edge";
};

const IDENTITY_APPEARANCE: NetworkValueAppearance = {
  palette: null,
  climMin: null,
  climMax: null,
  colorize: false,
  applyToGlyphs: true,
  valueSource: "node",
};

const DEFAULT_PIXEL_BUDGET = 4;
const DEFAULT_MAX_CELLS = 4096;
/**
 * The OOM guard, sized from what a planned count COSTS. With storage-buffer
 * pulling that is 28 B a node (12 position + 16 aux) and 8 B an edge, shared
 * by segments and both glyph draws and allocated ONCE at capacity — ~64 MB
 * worst case at these defaults, against ~350 MB rebuilt per swap under the
 * old per-instance-attribute path. `truncated` in the stats says when a cap
 * bit.
 */
const DEFAULT_MAX_NODES = 1_500_000;
const DEFAULT_MAX_EDGES = 2_000_000;
/** Fallback half-width when neither the layer nor the collection states one. */
const DEFAULT_LINE_WIDTH = 1;

type KonnektionPlanView = Omit<
  KonnektionPlanInput,
  "index" | "maxCells" | "maxLevel" | "pixelBudget" | "previousLevel"
>;

type Options = {
  collection: KonnektionCollection;
  onInvalidate: () => void;
  onStatsChanged: () => void;
};

export class KonnektionCollectionManager extends CollectionManagerBase<
  KonnektionCellRow,
  KonnektionCellIndex
> {
  // `group` (a ClippingGroup), placement, the slab clip and the generation /
  // disposed guard live in `CollectionManagerBase`.

  readonly stats: NetworkManagerStats = {
    plannedCells: 0,
    residentCells: 0,
    level: 0,
    nodes: 0,
    edges: 0,
    ghosts: 0,
    coarsenedForBudget: false,
    truncated: false,
    fetchMs: 0,
    decodeMs: 0,
    errors: 0,
    attributesMissing: [],
  };

  private readonly collection: KonnektionCollection;

  /** Live from construction, so selection and width writes never need the
   *  bundle to exist yet. */
  private readonly uniforms: NetworkUniforms = createNetworkUniforms();
  private bundle: NetworkGpuBundle | null = null;

  private indexPromise: Promise<KonnektionCellIndex> | null = null;
  private objects: Map<number, KonnektionObjectEntry> | null = null;

  private planConfig: Required<Omit<NetworkPlanConfig, "maxLevel">> & {
    maxLevel: number | null;
  } = {
    pixelBudget: DEFAULT_PIXEL_BUDGET,
    maxCells: DEFAULT_MAX_CELLS,
    maxNodes: DEFAULT_MAX_NODES,
    maxEdges: DEFAULT_MAX_EDGES,
    maxLevel: null,
  };
  private material: NetworkMaterialConfig = {};
  private lastPlan: KonnektionPlan | null = null;
  /** The newest settle's camera inputs, replayed when a placement change
   *  rebuilds the index — recorded even while hidden. */
  private lastView: KonnektionPlanView | null = null;
  private visible = true;
  private warnedTruncated = false;

  /** What the pack styles nodes with: the active GRAPH colouring's attribute
   *  and the reduced filter rules. Changed by `setStyling`, spent per pack. */
  private styling: NetworkStyling = IDENTITY_STYLING;
  private appearance: NetworkValueAppearance = IDENTITY_APPEARANCE;
  private lastValueRange: { min: number | null; max: number | null } = { min: null, max: null };
  /**
   * The decoded cells of the mounted plan, retained so a styling change is a
   * re-pack rather than a re-fetch. This deliberately reverses the old
   * "decoded cells are NOT retained" rule: pickers made the pack a function of
   * per-node state the card can edit, and a graph is small enough (the whole
   * argument for this manager's shape) that the CPU copy is cheap where a
   * refetch is a network round trip per rule toggle.
   */
  private residentCells: readonly DecodedNetworkCell[] = [];

  // The base's `generation` is bumped on every plan: a fetch that finishes
  // against a stale one is dropped rather than mounted, which is the whole of
  // the race handling a swap-the-buffers strategy needs. Its `disposed` stops a
  // plan in flight at unmount from building a bundle nothing frees (P13).

  constructor(options: Options) {
    super({ onInvalidate: options.onInvalidate, onStatsChanged: options.onStatsChanged });
    this.collection = options.collection;
  }

  protected buildIndex(rows: KonnektionCellRow[], voxelToWorld: THREE.Matrix4): KonnektionCellIndex {
    return buildKonnektionCellIndex(rows, this.collection.manifest, voxelToWorld);
  }

  /**
   * A placement change moved every world box, so the mounted level was chosen
   * against the old ones. This used NOT to replan (only fabriks did), so a
   * moved network kept drawing the old placement's in-view cells until the
   * next camera settle. `sameKeys` makes an unchanged plan free.
   */
  protected replanAfterPlacement(): void {
    if (this.lastView) void this.updatePlan(this.lastView);
  }

  // --- configuration ------------------------------------------------------

  getCollection(): KonnektionCollection {
    return this.collection;
  }

  /**
   * Appearance. EVERY branch here is a uniform, material-prop or visibility
   * write — nothing rebuilds a pipeline or touches a buffer, which is what
   * makes an opacity or width drag free at any collection size.
   */
  setMaterialConfig(config: NetworkMaterialConfig): void {
    this.material = { ...this.material, ...config };
    if (config.lineWidth !== undefined) {
      this.uniforms.uHalfWidth.value = (config.lineWidth ?? DEFAULT_LINE_WIDTH) / 2;
    }
    // Instance colouring is the DEFAULT (unset means on), so it is derived
    // from the merged config every time rather than gated on the patch: the
    // palette spec is three uniform writes, never a recompile.
    this.uniforms.uInstanceColorize.value = this.material.colorByInstance === false ? 0 : 1;
    const spec =
      INSTANCE_COLORMAP_SPECS[this.material.instanceColormap ?? DEFAULT_INSTANCE_COLORMAP];
    this.uniforms.uInstanceSaturation.value = spec.saturation;
    this.uniforms.uInstanceValue.value = spec.value;
    this.uniforms.uInstanceTiered.value = spec.tiered ? 1 : 0;
    if (this.bundle) this.applyMaterialToBundle(this.bundle);
    this.invalidate();
  }

  /** The cached config onto a bundle — also run once at bundle creation, so a
   *  config set before the first fetch is not lost. */
  private applyMaterialToBundle(bundle: NetworkGpuBundle): void {
    const rgba = this.material.color;
    if (rgba && rgba.length >= 3) {
      bundle.segmentMaterial.color.setRGB(rgba[0] / 255, rgba[1] / 255, rgba[2] / 255);
      bundle.glyphMaterial.color.copy(bundle.segmentMaterial.color);
      bundle.arrowMaterial.color.copy(bundle.segmentMaterial.color);
    }
    const opacity = this.material.opacity ?? 1;
    bundle.segmentMaterial.opacity = opacity;
    bundle.glyphMaterial.opacity = opacity;
    bundle.arrowMaterial.opacity = opacity;
    // The fabriks rule: transparent only below full opacity, and `needsUpdate`
    // only on the flip — it recompiles the pipeline, so a slider must not set
    // it per tick. Opaque, the network is a depth-prepass occluder.
    const transparent = opacity < 1;
    for (const material of [bundle.segmentMaterial, bundle.glyphMaterial, bundle.arrowMaterial]) {
      if (material.transparent === transparent) continue;
      material.transparent = transparent;
      material.needsUpdate = true;
    }
    // `visible` rather than a zero count: it skips the render-list insertion
    // outright, and keeps `instanceCount` meaning "live data" alone.
    bundle.nodeGlyphs.visible = this.material.showNodes === true;
    bundle.arrowGlyphs.visible = this.material.directed === true;
  }

  getPlanConfig(): { pixelBudget: number; maxCells: number; maxLevel: number | null } {
    return this.planConfig;
  }

  setPlanConfig(config: NetworkPlanConfig): void {
    this.planConfig = { ...this.planConfig, ...config };
    this.invalidate();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.group.visible = visible;
    this.invalidate();
  }

  /**
   * This collection as a GPU pick source (`platform/draw/gpuPick.ts`): the
   * group (so the slab clip applies), each of the bundle's three draws with
   * its id sibling (`NetworkGpuBundle.pickMaterialFor`). Nothing to pick
   * before the first plan built a bundle.
   */
  pickSource(key: string): GpuPickSource {
    return {
      key,
      slot: this.uniforms.uPickSlot,
      root: () => (this.disposed || !this.bundle ? null : this.group),
      pickMaterialFor: (object) => this.bundle?.pickMaterialFor(object) ?? null,
    };
  }

  getSelection(): number {
    return this.uniforms.selectedOrdinal.value;
  }

  /** Selection is a uniform write. Never a pipeline rebuild, never a replan. */
  setSelection(ordinal: number | null, isolate = false): void {
    this.uniforms.selectedOrdinal.value = ordinal ?? -1;
    this.uniforms.isolate.value = isolate ? 1 : 0;
    this.invalidate();
  }

  /**
   * The active colouring's SOURCE and the active rules — the per-node half of
   * the picker, spent as a re-pack of the resident cells. Everything about how
   * the values LOOK (palette, window, targets) is `setValueAppearance`, which
   * costs uniforms only; this is the half that genuinely rewrites buffers, and
   * it fires only when the card switches entries or edits rules.
   */
  setStyling(styling: NetworkStyling): void {
    this.styling = styling;
    if (this.bundle && this.residentCells.length > 0) {
      this.uploadResident(this.residentCells);
    }
  }

  /**
   * How the packed values become colour. Uniform and texture-swap writes only
   * — a colormap or window nudge re-packs nothing, the `pointsMaterial` rule.
   *
   * A null clim end is "stretch over what you read": the server publishes no
   * statistics, so the open end is filled from the packed values' own range —
   * re-filled after every pack, since a plan swap changes what was read.
   */
  setValueAppearance(appearance: NetworkValueAppearance): void {
    this.appearance = appearance;
    this.applyAppearance();
  }

  private applyAppearance(): void {
    const range = this.lastValueRange;
    this.uniforms.uColorize.value = this.appearance.colorize ? 1 : 0;
    this.uniforms.uClimMin.value = this.appearance.climMin ?? range.min ?? 0;
    this.uniforms.uClimMax.value = this.appearance.climMax ?? range.max ?? 1;
    this.uniforms.uApplyToGlyphs.value = this.appearance.applyToGlyphs ? 1 : 0;
    this.uniforms.uValueSource.value = this.appearance.valueSource === "edge" ? 1 : 0;
    this.bundle?.setPalette(this.appearance.palette);
    this.invalidate();
  }

  // --- the catalog and the plan -------------------------------------------

  /** Load the cell catalog and build the world-space index. Memoized. */
  ensureIndex(): Promise<KonnektionCellIndex> {
    if (!this.indexPromise) {
      this.indexPromise = this.collection
        .loadCellCatalog()
        .then((rows) => this.adoptCatalog(rows))
        .catch((error: unknown) => {
          this.indexPromise = null;
          this.stats.errors++;
          throw error;
        });
    }
    return this.indexPromise;
  }

  /** The object catalog, lazily. Nothing on the first-render path needs it. */
  async listObjects(): Promise<KonnektionObjectEntry[]> {
    if (!this.objects) this.objects = await this.collection.loadObjectCatalog();
    return [...this.objects.values()];
  }

  /**
   * Re-plan and, if the plan changed, fetch and mount it.
   *
   * Called at camera-SETTLE cadence, never per frame.
   */
  async updatePlan(view: KonnektionPlanView): Promise<void> {
    this.lastView = view;
    if (!this.visible || this.disposed) return;
    const index = this.index ?? (await this.ensureIndex());
    if (this.disposed) return;

    // Once the bundle exists its capacity is the hard ceiling: budgets raised
    // afterwards are clamped rather than honoured, because honouring them
    // would need a new bundle — and no caller raises them (the card only
    // touches pixelBudget/maxLevel).
    const capacity = this.bundle?.capacity;
    const plan = planKonnektionCells({
      ...view,
      index,
      pixelBudget: this.planConfig.pixelBudget,
      maxCells: this.planConfig.maxCells,
      maxNodes: capacity ? Math.min(this.planConfig.maxNodes, capacity.nodes) : this.planConfig.maxNodes,
      maxEdges: capacity ? Math.min(this.planConfig.maxEdges, capacity.edges) : this.planConfig.maxEdges,
      maxLevel: this.planConfig.maxLevel,
      previousLevel: this.lastPlan?.level ?? null,
    });

    if (this.lastPlan && sameKeys(this.lastPlan.keys, plan.keys)) return;

    this.lastPlan = plan;
    this.stats.plannedCells = plan.cells.length;
    this.stats.level = plan.level;
    this.stats.coarsenedForBudget = plan.coarsenedForBudget;
    this.stats.truncated = plan.truncated;
    if (plan.truncated && !this.warnedTruncated) {
      this.warnedTruncated = true;
      console.warn(
        `[konnektion] level ${plan.level} exceeds the plan budget ` +
          `(${this.planConfig.maxCells} cells / ${this.planConfig.maxNodes} nodes / ` +
          `${this.planConfig.maxEdges} edges); drawing the nearest ${plan.cells.length} cells ` +
          `(${plan.totalNodes} nodes, ${plan.totalEdges} edges). The rest of the collection is ` +
          `deliberately not drawn — it would not fit in memory.`,
      );
    }
    this.notifyStats();

    const generation = this.bumpGeneration();
    const started = performance.now();
    const decoded: DecodedNetworkCell[] = [];
    try {
      for (const group of groupByRowGroup(plan.cells)) {
        const cells = await this.collection.readFetchGroup(group);
        if (this.isStale(generation)) return; // superseded mid-flight
        for (const cell of cells.values()) decoded.push(cell);
      }
    } catch (error) {
      if (this.isStale(generation)) return;
      // Forget the plan, or the next settle with the same keys hits the
      // `sameKeys` early return and the layer stays empty until the camera
      // moves far enough to change the plan.
      this.lastPlan = null;
      this.stats.errors++;
      console.error("[konnektion] failed to read a planned level", error);
      this.notifyStats();
      return;
    }
    this.stats.fetchMs += performance.now() - started;

    if (this.isStale(generation)) return;
    // Retained past the upload, because the pickers made the pack a function
    // of editable state — see the field's own comment.
    this.residentCells = decoded;
    this.uploadResident(decoded);
  }

  // --- the upload ---------------------------------------------------------

  /**
   * The bundle, created ONCE at a capacity every possible plan fits into.
   *
   * Lazy because the capacity comes from the catalog index, which does not
   * exist at construction. Null for a collection with no geometry at all.
   */
  private ensureBundle(): NetworkGpuBundle | null {
    if (this.bundle) return this.bundle;
    if (this.disposed) return null;
    if (!this.index) return null; // unreachable off updatePlan, which awaited it
    const capacity = networkCapacityFor(this.index, {
      maxNodes: this.planConfig.maxNodes,
      maxEdges: this.planConfig.maxEdges,
    });
    if (capacity.nodes === 0 && capacity.edges === 0) return null;

    const bundle = createNetworkGpuBundle(capacity, this.uniforms);
    this.applyMaterialToBundle(bundle);
    this.group.add(bundle.segments, bundle.nodeGlyphs, bundle.arrowGlyphs);
    this.bundle = bundle;
    return bundle;
  }

  /**
   * Pack every resident cell into the bundle and point the draws at it.
   *
   * This replaces the old dispose-and-rebuild: a plan swap is a memcpy, a
   * `needsUpdate` and three `instanceCount` writes. Nothing is allocated on
   * the GPU or the heap beyond what the packer writes into.
   */
  private uploadResident(cells: readonly DecodedNetworkCell[]): void {
    const started = performance.now();

    let ownedTotal = 0;
    let ghostTotal = 0;
    let edgeTotal = 0;
    for (const cell of cells) {
      ownedTotal += cell.nodeCount;
      ghostTotal += cell.ghostCount;
      edgeTotal += cell.edgeCount;
    }
    this.stats.residentCells = cells.length;
    this.stats.nodes = ownedTotal;
    this.stats.edges = edgeTotal;
    this.stats.ghosts = ghostTotal;

    const bundle = this.ensureBundle();
    if (bundle) {
      const packed = packNetworkCells(
        cells,
        {
          positions: bundle.positions.array as Float32Array,
          aux: bundle.aux.array as Float32Array,
          values: bundle.values.array as Float32Array,
          edgeValues: bundle.edgeValues.array as Float32Array,
          edges: bundle.edges.array as Uint32Array,
        },
        this.styling,
      );
      // Only the written prefix of each buffer goes to the GPU: a plan swap at a
      // fraction of capacity no longer re-uploads the whole allocation.
      bundle.markUploaded(packed.used);
      bundle.setCounts(packed.nodes, packed.edges);
      this.lastValueRange = { min: packed.valueMin, max: packed.valueMax };
      this.applyAppearance();
      this.stats.attributesMissing = packed.attributesMissing;
      if (packed.attributesMissing.length > 0) {
        console.warn(
          `[konnektion] the picker names attribute(s) the resident cells do not carry: ` +
            `${packed.attributesMissing.join(", ")}. A rule over one was skipped rather than ` +
            `applied; the collection and the layer disagree about the vocabulary.`,
        );
      }
      if (packed.clamped) {
        // The capacity formula makes this unreachable; if it ever fires, the
        // draw is merely partial rather than out of bounds — say so loudly.
        console.warn(
          `[konnektion] packed ${packed.cells}/${cells.length} cells before hitting bundle ` +
            `capacity (${bundle.capacity.nodes} nodes / ${bundle.capacity.edges} edges); ` +
            `the capacity math and the planner disagree.`,
        );
      }
    }

    this.stats.decodeMs += performance.now() - started;
    this.notifyStats();
    this.invalidate();
  }

  // --- teardown -----------------------------------------------------------

  /** The bundle owns its geometries and materials and must dispose them
   *  explicitly (P13): three disposes nothing on `remove()` or GC. */
  dispose(): void {
    this.markDisposed(); // strands any fetch still in flight
    if (this.bundle) {
      this.group.remove(this.bundle.segments, this.bundle.nodeGlyphs, this.bundle.arrowGlyphs);
      this.bundle.dispose();
      this.bundle = null;
    }
    this.collection.release();
    this.index = null;
    this.catalogRows = null;
    this.residentCells = [];
  }

  /** What the debug panel shows for this layer. */
  buildDebugReport(): Record<string, unknown> {
    return {
      manifest: {
        specVersion: this.collection.manifest.specVersion,
        levels: this.collection.manifest.grid.levels,
        cellSize: this.collection.manifest.grid.cellSize,
        encoding: this.collection.manifest.encoding,
      },
      plan: this.lastPlan
        ? { level: this.lastPlan.level, cells: this.lastPlan.cells.length }
        : null,
      capacity: this.bundle ? { ...this.bundle.capacity } : null,
      stats: { ...this.stats },
      transport: this.collection.transportStats(),
    };
  }
}

const sameKeys = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean => {
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
};
