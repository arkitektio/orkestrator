import * as THREE from "three";

/**
 * GPU id-buffer picking: "which object is under this pixel?" answered by the
 * GPU instead of a CPU raycast.
 *
 * ## Why
 *
 * The collection layers draw what a CPU raycast cannot afford (fabriks: a
 * BatchedMesh of every mounted cell, raycast per instance, per triangle, no
 * BVH) or cannot see at all (konnektion: vertex-pulled from storage buffers,
 * so there is no CPU geometry to test). The GPU already knows the answer: it
 * rasterized it.
 *
 * ## How
 *
 * Every registered `GpuPickSource` renders its subtree once more, into a tiny
 * `PICK_REGION_PX`² `RGBA32F` target, with the camera's projection narrowed to
 * the pixels around the cursor (`camera.setViewOffset`) — so the pass
 * rasterizes a handful of fragments and a BatchedMesh's per-instance frustum
 * cull drops almost every cell. Each drawable is drawn with its source's own
 * id-writing SIBLING material (same position/vertex path, same discards), never
 * `scene.overrideMaterial`: a plain override corrupts BatchedMesh multi-draw
 * ranges (OCTREE_RENDERER.md, `passVisibility.disableColorWrite`). Anything
 * under a source's root without a pick material (selection hulls, debug boxes)
 * is hidden for the pass.
 *
 * All sources share one depth buffer, so the nearest collection wins across
 * layers. A texel is `(ordinal + 1, slot + 1, viewDepth, 1)` — `0` in G means
 * "nothing here" (the clear) — see `encodePickTexel`.
 *
 * Readback is `renderer.readRenderTargetPixelsAsync`, at most ONE in flight;
 * requests arriving meanwhile coalesce per lane, latest pointer wins, clicks
 * before hovers (`createPickScheduler`).
 *
 * platform/: knows nothing about fabriks or konnektion. A source is a root, a
 * material mapping and a slot uniform.
 */

/** Side of the square pick region, in CSS pixels. Odd, so there is a centre
 *  texel; wide enough that a sub-pixel network segment is still catchable. */
export const PICK_REGION_PX = 5;

/** The largest ordinal a texel carries exactly: `ordinal + 1` must be an
 *  integer float32 represents exactly (≤ 2^24). */
export const MAX_PICK_ORDINAL = 2 ** 24 - 2;

/** RGBA32F = 16 bytes a texel. */
const BYTES_PER_TEXEL = 16;

// --- the texel contract (the CPU mirror of `pickOutputNode`) ---------------

/** What a pick material writes for one fragment. */
export const encodePickTexel = (
  ordinal: number,
  slot: number,
  viewDepth: number,
): [number, number, number, number] => [ordinal + 1, slot + 1, viewDepth, 1];

export type DecodedPickTexel = { ordinal: number; slot: number; viewDepth: number };

/** A texel back to (ordinal, slot, depth), or null for a cleared texel. */
export const decodePickTexel = (
  r: number,
  g: number,
  b: number,
): DecodedPickTexel | null => {
  // G is the slot + 1; the clear is 0. Rounded: the value went through a
  // float render target and nothing else, but a readback is never the place
  // to trust an exact compare.
  const slotPlusOne = Math.round(g);
  const ordinalPlusOne = Math.round(r);
  if (!(slotPlusOne >= 1) || !(ordinalPlusOne >= 1)) return null;
  return { ordinal: ordinalPlusOne - 1, slot: slotPlusOne - 1, viewDepth: b };
};

// --- region geometry --------------------------------------------------------

/** WebGPU's copy rule: a readback row is padded to 256 bytes. In FLOATS. */
export const readbackFloatsPerRow = (width: number): number =>
  (Math.ceil((width * BYTES_PER_TEXEL) / 256) * 256) / 4;

/**
 * The `setViewOffset` arguments that make the pick camera see exactly the
 * `region`² block of the full view centred on the pointer.
 *
 * `x`/`y` are the pointer in CSS pixels relative to the canvas' top-left, and
 * `width`/`height` the canvas' CSS size — the same units the main camera's
 * aspect was built from, which is all `setViewOffset` needs to agree with.
 * The pointer's pixel is `floor(x)`, so the region's centre texel is the
 * pixel the pointer is IN.
 */
export const pickViewOffset = (
  pointer: { x: number; y: number },
  size: { width: number; height: number },
  region = PICK_REGION_PX,
) => {
  const half = Math.floor(region / 2);
  return {
    fullWidth: size.width,
    fullHeight: size.height,
    x: Math.floor(pointer.x) - half,
    y: Math.floor(pointer.y) - half,
    width: region,
    height: region,
  };
};

const scanOrders = new Map<number, readonly (readonly [number, number])[]>();

/**
 * The region's texels, nearest to the centre first (ties row-major, so the
 * order is deterministic). The first non-empty texel in this order is the
 * pick: the exact pixel when it hit, otherwise the closest near miss.
 */
export const pickScanOrder = (region: number): readonly (readonly [number, number])[] => {
  const cached = scanOrders.get(region);
  if (cached) return cached;
  const centre = Math.floor(region / 2);
  const order: [number, number][] = [];
  for (let row = 0; row < region; row++) {
    for (let column = 0; column < region; column++) order.push([column, row]);
  }
  const d2 = ([c, r]: readonly [number, number]) => (c - centre) ** 2 + (r - centre) ** 2;
  order.sort((a, b) => d2(a) - d2(b) || a[1] - b[1] || a[0] - b[0]);
  scanOrders.set(region, order);
  return order;
};

export type RegionHit = DecodedPickTexel & { column: number; row: number };

/** The nearest-to-centre non-empty texel of a (row-padded) readback. */
export const decodePickRegion = (
  data: ArrayLike<number>,
  region: number,
  floatsPerRow = readbackFloatsPerRow(region),
): RegionHit | null => {
  for (const [column, row] of pickScanOrder(region)) {
    const at = row * floatsPerRow + column * 4;
    if (at + 2 >= data.length) continue;
    const texel = decodePickTexel(data[at], data[at + 1], data[at + 2]);
    if (texel) return { ...texel, column, row };
  }
  return null;
};

const scratchPoint = new THREE.Vector3();

/**
 * The world position of a region texel from the view depth the pick material
 * wrote. Row 0 is the TOP of the region (`setViewOffset` and the readback
 * both count from the top).
 *
 * A point on the texel's ray at any NDC depth, scaled (perspective) or
 * re-seated (orthographic) to the written view depth — independent of which
 * NDC depth convention the camera's projection uses.
 */
export const pickWorldPosition = (
  camera: THREE.Camera,
  region: number,
  column: number,
  row: number,
  viewDepth: number,
  out: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 => {
  const ndcX = ((column + 0.5) / region) * 2 - 1;
  const ndcY = 1 - ((row + 0.5) / region) * 2;
  const view = scratchPoint.set(ndcX, ndcY, 0.5).applyMatrix4(camera.projectionMatrixInverse);
  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    view.multiplyScalar(viewDepth / -view.z);
  } else {
    view.z = -viewDepth;
  }
  return out.copy(view).applyMatrix4(camera.matrixWorld);
};

// --- scheduling -------------------------------------------------------------

export type PickLane = "click" | "hover";

type Pending<Req, Res> = { req: Req; callbacks: ((result: Res) => void)[] };

/**
 * At most ONE pick in flight; everything else waits in a one-deep slot per
 * lane where the newest request REPLACES the waiting one (latest pointer
 * wins). A request equal to the waiting one (`same`) joins it instead — two
 * layers asking about the same pointer event share one render and readback.
 * Clicks drain before hovers: a click is never lost to a sweep.
 *
 * A superseded request's callbacks are simply never called — its caller has
 * already asked again. Callers that can go stale for their OWN reasons (the
 * pointer left) carry their own generation token.
 */
export function createPickScheduler<Req, Res>(options: {
  run: (req: Req) => Promise<Res>;
  same?: (a: Req, b: Req) => boolean;
  onError?: (error: unknown) => void;
}) {
  const same = options.same ?? (() => false);
  const pending: Record<PickLane, Pending<Req, Res> | null> = { click: null, hover: null };
  let inFlight: (Pending<Req, Res> & { lane: PickLane }) | null = null;

  const pump = () => {
    if (inFlight) return;
    const lane: PickLane | null = pending.click ? "click" : pending.hover ? "hover" : null;
    if (!lane) return;
    const next = pending[lane]!;
    pending[lane] = null;
    const job = { ...next, lane };
    inFlight = job;
    let promise: Promise<Res>;
    try {
      promise = options.run(job.req);
    } catch (error) {
      promise = Promise.reject(error);
    }
    promise.then(
      (result) => {
        inFlight = null;
        for (const callback of job.callbacks) callback(result);
        pump();
      },
      (error: unknown) => {
        inFlight = null;
        options.onError?.(error);
        pump();
      },
    );
  };

  return {
    request(lane: PickLane, req: Req, callback: (result: Res) => void): void {
      if (inFlight && inFlight.lane === lane && same(inFlight.req, req)) {
        inFlight.callbacks.push(callback);
        return;
      }
      const waiting = pending[lane];
      if (waiting && same(waiting.req, req)) {
        waiting.callbacks.push(callback);
      } else {
        pending[lane] = { req, callbacks: [callback] };
      }
      pump();
    },
    get busy(): boolean {
      return inFlight !== null;
    },
    /** Waiting requests per lane — for tests and the debug panel. */
    get waiting(): { click: boolean; hover: boolean } {
      return { click: pending.click !== null, hover: pending.hover !== null };
    },
  };
}

// --- sources and the picker ------------------------------------------------

/** Anything the renderer draws with a single `material` slot. */
type Drawable = THREE.Object3D & { material: THREE.Material | THREE.Material[] };

export interface GpuPickSource {
  /** Reported back with a hit — the layer id, by convention. */
  readonly key: string;
  /** The subtree to render (its ClippingGroup, so a slab clip applies to the
   *  pick exactly as to the draw), or null while there is nothing yet. */
  root(): THREE.Object3D | null;
  /** The id-writing sibling for a drawable under `root`, or null to hide it
   *  for the pass. */
  pickMaterialFor(object: THREE.Object3D): THREE.Material | null;
  /** The uniform the pick materials write into G; the picker assigns it. */
  readonly slot: { value: number };
}

export type GpuPickHit = {
  key: string;
  ordinal: number;
  worldPos: [number, number, number];
};

export type GpuPickRequest = {
  clientX: number;
  clientY: number;
  camera: THREE.Camera;
};

/** The renderer surface the picker touches — WebGPURenderer's, structurally. */
export type PickRenderer = {
  domElement: HTMLCanvasElement;
  getRenderTarget(): THREE.RenderTarget | null;
  setRenderTarget(target: THREE.RenderTarget | null): void;
  getClearColor(target: THREE.Color): THREE.Color;
  getClearAlpha(): number;
  setClearColor(color: THREE.ColorRepresentation, alpha?: number): void;
  autoClear: boolean;
  render(scene: THREE.Object3D, camera: THREE.Camera): unknown;
  readRenderTargetPixelsAsync(
    target: THREE.RenderTarget,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<ArrayLike<number>>;
};

const isShown = (object: THREE.Object3D): boolean => {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
};

export class GpuPicker {
  private readonly sources = new Set<GpuPickSource>();
  private readonly target: THREE.RenderTarget;
  private readonly scheduler;
  private pickCamera: THREE.Camera | null = null;
  private unavailable = false;
  private readonly listeners = new Set<() => void>();
  private readonly clearScratch = new THREE.Color();
  private readonly swapped: [Drawable, THREE.Material | THREE.Material[]][] = [];
  private readonly hidden: THREE.Object3D[] = [];

  constructor(private readonly renderer: PickRenderer) {
    this.target = new THREE.RenderTarget(PICK_REGION_PX, PICK_REGION_PX, {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });
    this.scheduler = createPickScheduler<GpuPickRequest, GpuPickHit | null>({
      run: (req) => this.run(req),
      same: (a, b) => a.clientX === b.clientX && a.clientY === b.clientY && a.camera === b.camera,
      onError: (error) => {
        // One failure is a broken path, not a flaky one: fall back to the CPU
        // raycast for the rest of the session rather than half-working.
        console.warn("[gpuPick] disabled after a failed pick:", error);
        this.unavailable = true;
        for (const listener of this.listeners) listener();
      },
    });
  }

  /** False once a pick has failed; subscribers fall back to their CPU path. */
  get available(): boolean {
    return !this.unavailable;
  }

  onAvailabilityChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  register(source: GpuPickSource): () => void {
    this.sources.add(source);
    return () => this.sources.delete(source);
  }

  /** Queue a pick; `callback` gets the nearest hit or null (never called when
   *  a newer request on the same lane superseded this one). */
  pick(lane: PickLane, req: GpuPickRequest, callback: (hit: GpuPickHit | null) => void): void {
    if (this.unavailable) return;
    this.scheduler.request(lane, req, callback);
  }

  dispose(): void {
    this.target.dispose();
    this.sources.clear();
    this.listeners.clear();
  }

  private cameraFor(camera: THREE.Camera): THREE.Camera {
    if (!this.pickCamera || this.pickCamera.type !== camera.type) {
      this.pickCamera = camera.clone(false);
    }
    const pick = this.pickCamera;
    pick.copy(camera, false);
    // The copy carries the source's matrixWorld and matrixWorldInverse; the
    // renderer must not recompute them from `matrix` (a parented camera's
    // `matrix` is not its world transform).
    pick.matrixAutoUpdate = false;
    pick.matrixWorldAutoUpdate = false;
    return pick;
  }

  private async run(req: GpuPickRequest): Promise<GpuPickHit | null> {
    const renderer = this.renderer;
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const pointer = { x: req.clientX - rect.left, y: req.clientY - rect.top };
    if (pointer.x < 0 || pointer.y < 0 || pointer.x >= rect.width || pointer.y >= rect.height) {
      return null;
    }

    const camera = this.cameraFor(req.camera);
    const offset = pickViewOffset(pointer, rect);
    const viewCamera = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    if (typeof viewCamera.setViewOffset !== "function") return null;
    viewCamera.setViewOffset(
      offset.fullWidth,
      offset.fullHeight,
      offset.x,
      offset.y,
      offset.width,
      offset.height,
    );

    const drawn = this.renderSources(camera);
    if (drawn.length === 0) return null;

    const data = await renderer.readRenderTargetPixelsAsync(
      this.target,
      0,
      0,
      PICK_REGION_PX,
      PICK_REGION_PX,
    );
    const texel = decodePickRegion(data, PICK_REGION_PX);
    if (!texel) return null;
    const source = drawn[texel.slot];
    if (!source) return null;
    const world = pickWorldPosition(
      camera,
      PICK_REGION_PX,
      texel.column,
      texel.row,
      texel.viewDepth,
    );
    return { key: source.key, ordinal: texel.ordinal, worldPos: [world.x, world.y, world.z] };
  }

  /** Render every shown source into the pick target; returns them by slot. */
  private renderSources(camera: THREE.Camera): GpuPickSource[] {
    const renderer = this.renderer;
    const drawn: GpuPickSource[] = [];
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    renderer.getClearColor(this.clearScratch);
    const previousClearAlpha = renderer.getClearAlpha();
    try {
      renderer.setRenderTarget(this.target);
      renderer.setClearColor(0x000000, 0);
      for (const source of this.sources) {
        const root = source.root();
        if (!root || !isShown(root)) continue;
        source.slot.value = drawn.length;
        this.bindPickMaterials(source, root);
        try {
          // The first source clears colour AND depth; later ones draw into
          // the same depth, so the nearest collection wins across layers.
          renderer.autoClear = drawn.length === 0;
          renderer.render(root, camera);
        } finally {
          this.restoreMaterials();
        }
        drawn.push(source);
      }
    } finally {
      renderer.autoClear = previousAutoClear;
      renderer.setClearColor(this.clearScratch, previousClearAlpha);
      renderer.setRenderTarget(previousTarget);
    }
    return drawn;
  }

  private bindPickMaterials(source: GpuPickSource, root: THREE.Object3D): void {
    root.traverseVisible((object) => {
      if (object === root) return;
      const drawable = object as Drawable;
      if (!drawable.material) return;
      const material = source.pickMaterialFor(object);
      if (material) {
        this.swapped.push([drawable, drawable.material]);
        drawable.material = material;
      } else {
        object.visible = false;
        this.hidden.push(object);
      }
    });
  }

  private restoreMaterials(): void {
    for (const [object, material] of this.swapped) object.material = material;
    for (const object of this.hidden) object.visible = true;
    this.swapped.length = 0;
    this.hidden.length = 0;
  }
}
