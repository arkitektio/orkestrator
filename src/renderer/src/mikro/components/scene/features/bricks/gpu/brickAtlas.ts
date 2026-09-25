import * as THREE from "three";
import {
  atlasBytesPerVoxel,
  atlasChannelsPerTexel,
  atlasKindForDtype,
  atlasSlotDepth,
  type AtlasKind,
} from "../octree/atlasFormat";
import type { BrickArray } from "../octree/brickRepack";
import type { BrickSpec } from "../octree/brickSpec";
import type { Vec3 } from "../../../platform/coords/levelGeometry";
import { uploadTexSubImage3D } from "./texSubImage3d";
import type { SceneRenderer } from "../../../platform/gpu/sceneRenderer";

/**
 * The brick pool's GPU side: one big `Data3DTexture` per (layer, mode)
 * holding fixed-size slots. A slot stores one brick's `stored` voxels with
 * its channel slabs stacked along z (slot depth = stored.z × channelCount).
 *
 * The CPU BACKING MIRROR is LAZY by default (roadmap R3): every atlas byte
 * used to exist twice — VRAM plus the JS-heap array the Data3DTexture was
 * built over — which on unified-memory machines doubles the real footprint.
 * Without a mirror, probes read every brick through the decoded-chunk cache
 * (`sampleChunkCacheSync` — the path GPU-repacked bricks, the MAJORITY on
 * this WebGPU-only build, have always used), and a lost device restores by
 * refetch (the chunk cache is warm, so it is a repack, not a network storm).
 * `orkestrator.atlasMirror = "on"` restores the eager mirror for A/B — except
 * for R16F atlases, whose backing would hold half-float BITS that a raw
 * probe read would misinterpret; they are always mirror-less.
 */

export type BrickAtlas = {
  texture: THREE.Data3DTexture;
  kind: AtlasKind;
  /** Channel slabs packed into one texel: 4 for rgba8, else 1 — the shader's
   * tap selects `slab mod channelsPerTexel` and offsets z by
   * `floor(slab / channelsPerTexel)` slab depths (`shaderspec/atlasTap.ts`). */
  channelsPerTexel: number;
  /** Texels one slot occupies ([stored.x, stored.y, stored.z × ceil(channels / channelsPerTexel)]). */
  slotSize: Vec3;
  slotGrid: Vec3;
  capacity: number;
  /** Texture extents in texels. */
  size: Vec3;
  /** Hardware-normalization factor (255 for R8, 65535 for R16F, 1 for R32F). */
  dataScale: number;
  /** GPU allocation size in bytes (texels × bytes/voxel) — the budget number.
   * Independent of `backing`, which no longer necessarily exists. */
  byteLength: number;
  /** CPU mirror; null in lazy mode (the default — see the header). */
  backing: BrickArray | null;
};

/**
 * Factor `desiredSlots` into a slot grid that fits the texture-extent caps and
 * NEVER exceeds the requested slot count.
 *
 * The rectangular grid used to be built by rounding UP (`ceil(wanted / gx)`),
 * which quietly overshot the byte budget it was derived from: 202 requested
 * slots became 31×7×1 = 217, i.e. 137 MiB against a 128 MiB cap — 7.4% over,
 * per pool, unaudited. Since `desiredSlots` is already `floor(budget /
 * slotBytes)`, the invariant "product ≤ desiredSlots" is exactly the invariant
 * "capacity × slotBytes ≤ budget".
 *
 * `minSlots` is the P16 coarsest-grid floor, which DELIBERATELY overrides the
 * byte budget — a pool that cannot hold its own coarsest level has no fallback
 * chain and renders nothing. When no in-budget factorization reaches it, the
 * floor wins and the overshoot is intentional.
 */
export function chooseSlotGrid(
  desiredSlots: number,
  maxSlots: Vec3,
  minSlots = 1,
): { slotGrid: Vec3; capacity: number } {
  const wanted = Math.max(1, Math.floor(desiredSlots));
  let best: Vec3 = [1, 1, 1];
  let bestCapacity = 1;

  // Search x downward: wide-and-flat grids keep z (the axis the channel slabs
  // multiply) small, which is the axis most likely to hit the extent cap.
  for (let gx = Math.min(maxSlots[0], wanted); gx >= 1; gx--) {
    const gy = Math.min(maxSlots[1], Math.floor(wanted / gx));
    if (gy < 1) continue;
    const gz = Math.min(maxSlots[2], Math.floor(wanted / (gx * gy)));
    if (gz < 1) continue;
    const capacity = gx * gy * gz;
    if (capacity > wanted) continue; // never overshoot the budget
    if (capacity > bestCapacity) {
      bestCapacity = capacity;
      best = [gx, gy, gz];
      if (capacity === wanted) break; // exact factorization; cannot do better
    }
  }

  if (bestCapacity >= minSlots) return { slotGrid: best, capacity: bestCapacity };

  // The coarsest-level floor could not be met inside the budget. Fall back to
  // the round-up grid and accept the overshoot — see the P16 note above.
  const gx = Math.min(maxSlots[0], Math.max(1, minSlots));
  const gy = Math.min(maxSlots[1], Math.ceil(minSlots / gx));
  const gz = Math.min(maxSlots[2], Math.ceil(minSlots / (gx * gy)));
  return { slotGrid: [gx, gy, gz], capacity: gx * gy * gz };
}

export function createBrickAtlas(opts: {
  spec: BrickSpec;
  dtype: string;
  desiredSlots: number;
  /** P16 coarsest-grid floor; overrides the byte budget when they conflict. */
  minSlots?: number;
  maxExtent: number;
  filter: "linear" | "nearest";
  /**
   * Native-WebGPU-backend only: let the GPU repack kernel `textureStore`
   * into the atlas. Applied only for r32f — `r8unorm` is not a core
   * storage-texture format, so an r8 atlas with this usage would fail
   * `createTexture` validation (the r8 repack kernel instead packs into a
   * storage buffer that is `copyBufferToTexture`d into the atlas).
   */
  computeStorage?: boolean;
  /**
   * Override the dtype-derived kind. Used by phasor layers: their slabs hold a
   * DERIVED (g, s) — signed, in [-1, 1] — which an r8unorm atlas can neither
   * represent nor quantize acceptably (a 1/255 step in g is a visible step in
   * lifetime), so they force r32f even over uint8 source data.
   */
  kind?: AtlasKind;
}): BrickAtlas {
  const { spec, dtype, desiredSlots, maxExtent, filter } = opts;
  const kind = opts.kind ?? atlasKindForDtype(dtype);
  const slotSize: Vec3 = [spec.stored[0], spec.stored[1], atlasSlotDepth(spec, kind)];

  const maxSlots: Vec3 = [
    Math.max(1, Math.floor(maxExtent / slotSize[0])),
    Math.max(1, Math.floor(maxExtent / slotSize[1])),
    Math.max(1, Math.floor(maxExtent / slotSize[2])),
  ];
  const { slotGrid, capacity } = chooseSlotGrid(
    desiredSlots,
    maxSlots,
    opts.minSlots ?? 1,
  );
  const [gx, gy, gz] = slotGrid;

  const size: Vec3 = [gx * slotSize[0], gy * slotSize[1], gz * slotSize[2]];
  const elementCount = size[0] * size[1] * size[2];
  const bytesPerVoxel = atlasBytesPerVoxel(kind);
  // Lazy mirror (default): NO CPU backing — WebGPU textures are zero-
  // initialized by spec, so a null-data Data3DTexture starts black and every
  // byte arrives via writeTexture; this also skips the one-time full zero
  // upload the eager path paid. R16F never mirrors (half-float BITS in the
  // backing would corrupt raw probe reads), nor does RGBA8 (interleaved
  // texels — the probe's slab-stride read assumes one channel per texel;
  // probes read these pools through the decoded-chunk cache).
  const backing: BrickArray | null =
    false
      ? kind === "r8"
        ? new Uint8Array(elementCount)
        : new Float32Array(elementCount)
      : null;

  const texture = new THREE.Data3DTexture(backing, size[0], size[1], size[2]);
  // No explicit internalFormat: the backend derives it from format+type
  // (r8unorm/r16float/r32float). Setting a WebGL enum string here would be
  // passed verbatim to GPUDevice.createTexture, which throws and silently
  // degrades the texture to a 1x1 2D placeholder.
  texture.format = kind === "rgba8" ? THREE.RGBAFormat : THREE.RedFormat;
  texture.type =
    kind === "r8" || kind === "rgba8"
      ? THREE.UnsignedByteType
      : kind === "r16f"
        ? THREE.HalfFloatType
        : THREE.FloatType;
  texture.minFilter = filter === "linear" ? THREE.LinearFilter : THREE.NearestFilter;
  texture.magFilter = filter === "linear" ? THREE.LinearFilter : THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.flipY = false;
  texture.needsUpdate = true; // create the GPU texture (uploads backing when present)
  if (!backing) {
    // The load-bearing line of lazy-mirror mode: three's Textures.updateTexture
    // runs `backend.createTexture` (pure GPU allocation — WebGPU zero-
    // initializes it) unconditionally, but gates the DATA upload on
    // `source.dataReady` (a documented Source field for exactly this). With a
    // null image.data the upload path would throw inside `writeTexture`
    // ("Overload resolution failed" — no null guard in `_copyBufferToTexture`),
    // which is precisely how `initTexture` on a mirror-less pool crashed pool
    // creation. dataReady stays false for the texture's whole life: every
    // byte arrives through `uploadTexSubImage3D`'s direct queue writes.
    texture.source.dataReady = false;
  }

  if (opts.computeStorage && kind === "r32f") {
    // In three r184 this flag's ONLY effect on a sampled Data3DTexture is
    // adding GPUTextureUsage.STORAGE_BINDING at createTexture
    // (WebGPUTextureUtils.js) — sampling bindings key off isData3DTexture and
    // node code off isStorageTextureNode, both unaffected. Verified against
    // r184 source; the gpu-repack parity self-test guards three upgrades.
    (texture as THREE.Data3DTexture & { isStorageTexture?: boolean }).isStorageTexture = true;
  }

  return {
    texture,
    kind,
    channelsPerTexel: atlasChannelsPerTexel(kind),
    slotSize,
    slotGrid,
    capacity,
    size,
    dataScale: kind === "r8" || kind === "rgba8" ? 255 : kind === "r16f" ? 65535 : 1,
    byteLength: elementCount * bytesPerVoxel,
    backing,
  };
}

/**
 * Upload one repacked brick into a slot. The CPU backing mirror is NOT
 * written here (see `mirrorBrickToBacking`): the row-by-row copy costs a
 * sizable share of the drain's wall-clock budget (thousands of `set` calls
 * per 3D brick), which throttled real uploads exactly when a zoom multiplied
 * the queue — the residency manager defers it to idle time instead.
 */
export function writeBrickToAtlas(
  renderer: SceneRenderer,
  atlas: BrickAtlas,
  slotCoords: Vec3,
  brick: BrickArray,
): boolean {
  return uploadTexSubImage3D(
    renderer,
    atlas.texture,
    atlas.kind,
    [
      slotCoords[0] * atlas.slotSize[0],
      slotCoords[1] * atlas.slotSize[1],
      slotCoords[2] * atlas.slotSize[2],
    ],
    [atlas.slotSize[0], atlas.slotSize[1], atlas.slotSize[2]],
    brick,
  );
}

/** Row-by-row copy of a brick into the probe mirror. No-op in lazy-mirror
 * mode (backing null) — callers gate on `atlas.backing` before queueing. */
export function mirrorBrickToBacking(
  atlas: BrickAtlas,
  slotCoords: Vec3,
  brick: BrickArray,
): void {
  const backing = atlas.backing;
  if (!backing) return;
  const origin: [number, number, number] = [
    slotCoords[0] * atlas.slotSize[0],
    slotCoords[1] * atlas.slotSize[1],
    slotCoords[2] * atlas.slotSize[2],
  ];
  const [w, h] = [atlas.size[0], atlas.size[1]];
  const [bw, bh, bd] = atlas.slotSize;
  for (let z = 0; z < bd; z++) {
    for (let y = 0; y < bh; y++) {
      const src = (z * bh + y) * bw;
      const dest = ((origin[2] + z) * h + (origin[1] + y)) * w + origin[0];
      backing.set(brick.subarray(src, src + bw), dest);
    }
  }
}

export function disposeBrickAtlas(atlas: BrickAtlas): void {
  atlas.texture.dispose();
}
