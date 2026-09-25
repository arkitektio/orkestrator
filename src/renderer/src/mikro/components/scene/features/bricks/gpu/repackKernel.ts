import type { RepackBrickInput } from "../octree/brickRepack";
import type { Vec3 } from "../../../platform/coords/levelGeometry";
import { R16F_DATA_SCALE } from "../octree/atlasFormat";

/**
 * The fused GPU brick-repack kernel (compute-shader port of `repackBrick`):
 * chunk→brick gather, border edge-replication, and min/max scan in one pass.
 * Two variants share the Params struct and all clamp/ownership math:
 * - **f32** writes straight into the r32float brick atlas (storage texture);
 * - **r8** packs uint8 texels 4-per-u32 into a storage BUFFER arena
 *   (`r8unorm` is not a core storage-texture format), which the device half
 *   then `copyBufferToTexture`s into the r8unorm atlas — rows padded to the
 *   256-byte `bytesPerRow` alignment, addressed via `out_base_word` /
 *   `row_words` (see `r8JobLayout`).
 * This module is the PURE half — the WGSL source and the CPU-side dispatch
 * math — so the parameter packing is unit-testable against `repackBrick`
 * without a GPU; `computeRepack.ts` owns all GPUDevice state.
 *
 * ## Kernel shape: one dispatch per (brick, chunk)
 *
 * Instead of binding all of a brick's chunks at once (descriptor arrays,
 * per-stage storage-buffer limits), each source chunk gets its own dispatch.
 * An invocation owns its output texel iff the texel's clamped source voxel
 * falls inside this chunk's overlap box and its channel inside this chunk's
 * channel range — ownership therefore partitions every output texel across the
 * brick's dispatches exactly once (the fetched chunks tile the fetch box, and
 * channel-chunks tile [0, channelCount)).
 *
 * The grid covers the OWNED sub-box, not the whole stored brick: see
 * `ownedGridBox` for why that set is a box and how its bounds are derived. The
 * per-invocation ownership test remains, both for the workgroup-rounding tail
 * and so that correctness never rests on the grid arithmetic alone.
 *
 * ## Border replication is a clamp
 *
 * `repackBrick`'s three axis-by-axis replication passes reduce to
 * `output[p] = value_at(clamp(destOrigin + p, fetchBox))` — copying the
 * nearest valid texel per axis is exactly a per-axis clamp of the source
 * position. The kernel clamps, so replication needs no second pass.
 *
 * ## Min/max over atomics
 *
 * WGSL atomics are u32-only; f32 values go through the order-preserving bit
 * trick (negative → ~bits, positive → bits | signbit), reduced per workgroup
 * in shared memory and flushed with one atomicMin/atomicMax pair. NaN never
 * contributes — matching the CPU scan, where `NaN < min` is always false.
 * A min/max slot still holding its init sentinels after readback means no
 * finite... no non-NaN voxel contributed; decode maps that to the CPU's
 * `!Number.isFinite(min)` outcome: `{ min: 0, max: 0, uniformValue: 0 }`.
 */

export const REPACK_WORKGROUP_SIZE = 4;

/** Bytes of one packed `Params` struct (40 words, see PARAM layout below). */
export const REPACK_PARAMS_BYTES = 160;
/** Uniform slices need 256-byte alignment for dynamic offsets. */
export const REPACK_PARAMS_STRIDE = 256;

export const MINMAX_ENTRY_BYTES = 8;
export const MINMAX_INIT_MIN = 0xffffffff;
export const MINMAX_INIT_MAX = 0;

/** Shared by both kernel variants; the r8-only addressing scalars ride in
 * what used to be tail padding. `grid_origin`/`z_span` place the dispatch grid
 * on the OWNED sub-box (see `ownedGridBox`) — word 35 is the vec3 alignment
 * pad, so the struct is 160 bytes. */
const PARAMS_STRUCT_WGSL = /* wgsl */ `
struct Params {
  dest_origin: vec3<i32>,
  stored_z: u32,
  stored_xy: vec2<u32>,
  channel_count: u32,
  brick_index: u32,
  fetch_min: vec3<i32>,
  chan_start: u32,
  fetch_max: vec3<i32>,
  chan_end: u32,
  lo: vec3<i32>,
  fixed_base: u32,
  hi: vec3<i32>,
  stride_c: u32,
  chunk_origin: vec3<i32>,
  stride_x: u32,
  slot_origin: vec3<u32>,
  stride_y: u32,
  stride_z: u32,
  out_base_word: u32,
  row_words: u32,
  // First min/max entry of this brick: entry (minmax_base + c) holds channel
  // slab c's pair (per-slab occupancy). Occupies what was the vec3 alignment
  // pad before grid_origin, so the struct is still 160 bytes.
  minmax_base: u32,
  // Origin of the dispatch grid inside the stored brick, and the number of z
  // texels this chunk owns. gid is relative to these, so the grid covers only
  // the box this dispatch can actually write.
  grid_origin: vec3<u32>,
  z_span: u32,
}
`;

/** Per-workgroup min/max accumulators, one per channel of the chunk's range
 * (a 4×4×4 workgroup can straddle channels along z). Bounded by the brick's
 * slab cap (`MAX_BRICK_CHANNELS`). */
const MAX_KERNEL_CHANNELS = 16;

/** The per-slab reduction epilogue both kernels share: flush this workgroup's
 * per-channel accumulators into the brick's `minmax_base + c` entries.
 * Untouched sentinels are global no-ops, so no per-channel branch. */
const REDUCE_EPILOGUE_WGSL = /* wgsl */ `
  if (lidx == 0u) {
    let count = min(P.chan_end - P.chan_start, ${MAX_KERNEL_CHANNELS}u);
    for (var k = 0u; k < count; k = k + 1u) {
      let entry = (P.minmax_base + P.chan_start + k) * 2u;
      atomicMin(&minmax[entry], atomicLoad(&wg_min[k]));
      atomicMax(&minmax[entry + 1u], atomicLoad(&wg_max[k]));
    }
  }
`;

export const REPACK_KERNEL_WGSL = /* wgsl */ `
${PARAMS_STRUCT_WGSL}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> minmax: array<atomic<u32>>;
@group(0) @binding(2) var out_atlas: texture_storage_3d<r32float, write>;
@group(1) @binding(0) var<storage, read> chunk_data: array<f32>;

var<workgroup> wg_min: array<atomic<u32>, 16>;
var<workgroup> wg_max: array<atomic<u32>, 16>;

// Order-preserving f32 → u32 map: monotone for all non-NaN values.
fn encode_order(v: f32) -> u32 {
  let b = bitcast<u32>(v);
  return select(b | 0x80000000u, ~b, (b & 0x80000000u) != 0u);
}

@compute @workgroup_size(${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx < ${MAX_KERNEL_CHANNELS}u) {
    atomicStore(&wg_min[lidx], ${MINMAX_INIT_MIN}u);
    atomicStore(&wg_max[lidx], ${MINMAX_INIT_MAX}u);
  }
  workgroupBarrier();

  let sz = P.stored_z;
  var contributes = false;
  var value = 0.0;
  var slab = 0u; // c - chan_start of the owned texel (per-slab accumulator)

  // No early returns before the barriers (uniform control flow); out-of-range
  // and non-owned invocations just skip the work.
  // gid is relative to the OWNED sub-box: the grid covers only the texels this
  // dispatch can write, instead of the whole stored brick once per chunk. The
  // guards below still matter for the workgroup-rounding tail.
  let span = max(1u, P.z_span);
  let px = P.grid_origin.x + gid.x;
  let py = P.grid_origin.y + gid.y;
  let c = P.chan_start + gid.z / span;
  let z = P.grid_origin.z + gid.z % span;
  if (px < P.stored_xy.x && py < P.stored_xy.y && z < sz && c < P.chan_end) {
    // Clamp into the fetch box: interior texels are unchanged, border texels
    // land on their nearest valid voxel (edge replication).
    let g = clamp(
      P.dest_origin + vec3<i32>(i32(px), i32(py), i32(z)),
      P.fetch_min,
      P.fetch_max - vec3<i32>(1),
    );
    if (all(g >= P.lo) && all(g < P.hi) && c >= P.chan_start) {
      let local = vec3<u32>(g - P.chunk_origin);
      let src = P.fixed_base
        + (c - P.chan_start) * P.stride_c
        + local.z * P.stride_z
        + local.y * P.stride_y
        + local.x * P.stride_x;
      value = chunk_data[src];
      slab = c - P.chan_start;
      textureStore(
        out_atlas,
        P.slot_origin + vec3<u32>(px, py, c * sz + z),
        vec4<f32>(value, 0.0, 0.0, 0.0),
      );
      contributes = value == value; // NaN never enters min/max (CPU parity)
    }
  }

  if (contributes) {
    let e = encode_order(value);
    atomicMin(&wg_min[slab], e);
    atomicMax(&wg_max[slab], e);
  }
  workgroupBarrier();
${REDUCE_EPILOGUE_WGSL}
}
`;

export const REPACK_KERNEL_R8_WGSL = /* wgsl */ `
${PARAMS_STRUCT_WGSL}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> minmax: array<atomic<u32>>;
// Output rides in a zero-cleared u32 arena, 4 uint8 texels per word, rows
// padded to P.row_words. atomicOr makes the multi-dispatch-per-brick
// partitioning race-free by construction: each texel is owned by exactly one
// dispatch (same invariant as the f32 kernel) and non-owned bytes contribute
// nothing to the OR.
@group(0) @binding(2) var<storage, read_write> out_words: array<atomic<u32>>;
// The decoded uint8 chunk, reinterpreted as packed u32 words — the strided
// element index below is a BYTE index into this array.
@group(1) @binding(0) var<storage, read> chunk_data: array<u32>;

var<workgroup> wg_min: array<atomic<u32>, 16>;
var<workgroup> wg_max: array<atomic<u32>, 16>;

@compute @workgroup_size(${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx < ${MAX_KERNEL_CHANNELS}u) {
    atomicStore(&wg_min[lidx], ${MINMAX_INIT_MIN}u);
    atomicStore(&wg_max[lidx], ${MINMAX_INIT_MAX}u);
  }
  workgroupBarrier();

  let sz = P.stored_z;
  var contributes = false;
  var value = 0u;
  var slab = 0u; // c - chan_start of the owned texel (per-slab accumulator)

  // No early returns before the barriers (uniform control flow); out-of-range
  // and non-owned invocations just skip the work.
  // gid is relative to the OWNED sub-box: the grid covers only the texels this
  // dispatch can write, instead of the whole stored brick once per chunk. The
  // guards below still matter for the workgroup-rounding tail.
  let span = max(1u, P.z_span);
  let px = P.grid_origin.x + gid.x;
  let py = P.grid_origin.y + gid.y;
  let c = P.chan_start + gid.z / span;
  let z = P.grid_origin.z + gid.z % span;
  if (px < P.stored_xy.x && py < P.stored_xy.y && z < sz && c < P.chan_end) {
    // Clamp into the fetch box: interior texels are unchanged, border texels
    // land on their nearest valid voxel (edge replication).
    let g = clamp(
      P.dest_origin + vec3<i32>(i32(px), i32(py), i32(z)),
      P.fetch_min,
      P.fetch_max - vec3<i32>(1),
    );
    if (all(g >= P.lo) && all(g < P.hi) && c >= P.chan_start) {
      let local = vec3<u32>(g - P.chunk_origin);
      let src = P.fixed_base
        + (c - P.chan_start) * P.stride_c
        + local.z * P.stride_z
        + local.y * P.stride_y
        + local.x * P.stride_x;
      value = extractBits(chunk_data[src >> 2u], 8u * (src & 3u), 8u);
      slab = c - P.chan_start;
      let word = P.out_base_word
        + ((c * sz + z) * P.stored_xy.y + py) * P.row_words
        + (px >> 2u);
      atomicOr(&out_words[word], value << (8u * (px & 3u)));
      contributes = true; // u8 has no NaN — every owned texel contributes
    }
  }

  if (contributes) {
    // Raw u8 values are already order-preserving as u32 — no bit trick.
    atomicMin(&wg_min[slab], value);
    atomicMax(&wg_max[slab], value);
  }
  workgroupBarrier();
${REDUCE_EPILOGUE_WGSL}
}
`;

/**
 * r16f variant (uint16 intensity pools, roadmap R3 atlases): the r8 ARENA
 * kernel's structure with TWO half-float texels per u32 word. `r16float` is
 * not a storage-texture format, so — exactly like r8 — the output rides a
 * zero-cleared u32 arena that the device half `copyBufferToTexture`s into
 * the atlas (any format is a valid copy destination). Each owned texel packs
 * `raw / R16F_DATA_SCALE` with `pack2x16float` into its 16-bit lane and ORs
 * it in: word-exclusive ownership does NOT hold here either (`dest_origin.x`
 * carries the border offset, so x-parity flips at chunk seams and one word
 * can straddle two dispatches), which is what keeps the OR load-bearing.
 * Min/max reduce the RAW f32 value through `encode_order`, per slab, so the
 * readback decodes with the f32 path's `decodeMinMax`. CPU lockstep:
 * `halfFloat.ts` `encodeHalfArray(scratch, out, 1 / R16F_DATA_SCALE)` — the
 * worker path; `pack2x16float`'s rounding is implementation-defined among
 * the nearest halves, so the GPU self-test tolerates 1 ulp there.
 */
export const REPACK_KERNEL_R16_WGSL = /* wgsl */ `
${PARAMS_STRUCT_WGSL}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> minmax: array<atomic<u32>>;
// Output arena: 2 half-float texels per word, rows padded to P.row_words.
@group(0) @binding(2) var<storage, read_write> out_words: array<atomic<u32>>;
@group(1) @binding(0) var<storage, read> chunk_data: array<f32>;

var<workgroup> wg_min: array<atomic<u32>, ${MAX_KERNEL_CHANNELS}>;
var<workgroup> wg_max: array<atomic<u32>, ${MAX_KERNEL_CHANNELS}>;

// Order-preserving f32 → u32 map: monotone for all non-NaN values.
fn encode_order(v: f32) -> u32 {
  let b = bitcast<u32>(v);
  return select(b | 0x80000000u, ~b, (b & 0x80000000u) != 0u);
}

const R16_INV_SCALE: f32 = ${1 / R16F_DATA_SCALE};

@compute @workgroup_size(${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx < ${MAX_KERNEL_CHANNELS}u) {
    atomicStore(&wg_min[lidx], ${MINMAX_INIT_MIN}u);
    atomicStore(&wg_max[lidx], ${MINMAX_INIT_MAX}u);
  }
  workgroupBarrier();

  let sz = P.stored_z;
  var contributes = false;
  var value = 0.0;
  var slab = 0u;

  let span = max(1u, P.z_span);
  let px = P.grid_origin.x + gid.x;
  let py = P.grid_origin.y + gid.y;
  let c = P.chan_start + gid.z / span;
  let z = P.grid_origin.z + gid.z % span;
  if (px < P.stored_xy.x && py < P.stored_xy.y && z < sz && c < P.chan_end) {
    let g = clamp(
      P.dest_origin + vec3<i32>(i32(px), i32(py), i32(z)),
      P.fetch_min,
      P.fetch_max - vec3<i32>(1),
    );
    if (all(g >= P.lo) && all(g < P.hi) && c >= P.chan_start) {
      let local = vec3<u32>(g - P.chunk_origin);
      let src = P.fixed_base
        + (c - P.chan_start) * P.stride_c
        + local.z * P.stride_z
        + local.y * P.stride_y
        + local.x * P.stride_x;
      value = chunk_data[src];
      slab = c - P.chan_start;
      let half = pack2x16float(vec2<f32>(value * R16_INV_SCALE, 0.0)) & 0xffffu;
      let word = P.out_base_word
        + ((c * sz + z) * P.stored_xy.y + py) * P.row_words
        + (px >> 1u);
      atomicOr(&out_words[word], half << (16u * (px & 1u)));
      contributes = value == value; // NaN never enters min/max (CPU parity)
    }
  }

  if (contributes) {
    let e = encode_order(value);
    atomicMin(&wg_min[slab], e);
    atomicMax(&wg_max[slab], e);
  }
  workgroupBarrier();
${REDUCE_EPILOGUE_WGSL}
}
`;

/**
 * r16f variant over RAW uint16 chunks (`orkestrator.raw16`,
 * `chunkFidelityForDtype`): identical to `REPACK_KERNEL_R16_WGSL` except the
 * source read — chunks arrive as unwidened Uint16Array data, bound as packed
 * u32 words and read with `extractBits` (the strided element index addresses
 * 16-bit lanes, exactly as the r8 kernel's byte index addresses 8-bit lanes).
 * The extracted raw value converts exactly to f32 (u16 ⊂ f32), so min/max,
 * the half encode, and the readback decode are bit-identical to the f32-source
 * kernel's on the same data.
 */
export const REPACK_KERNEL_R16_U16_WGSL = /* wgsl */ `
${PARAMS_STRUCT_WGSL}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> minmax: array<atomic<u32>>;
// Output arena: 2 half-float texels per word, rows padded to P.row_words.
@group(0) @binding(2) var<storage, read_write> out_words: array<atomic<u32>>;
// The raw uint16 chunk, reinterpreted as packed u32 words — the strided
// element index below addresses 16-bit lanes.
@group(1) @binding(0) var<storage, read> chunk_data: array<u32>;

var<workgroup> wg_min: array<atomic<u32>, ${MAX_KERNEL_CHANNELS}>;
var<workgroup> wg_max: array<atomic<u32>, ${MAX_KERNEL_CHANNELS}>;

// Order-preserving f32 → u32 map: monotone for all non-NaN values.
fn encode_order(v: f32) -> u32 {
  let b = bitcast<u32>(v);
  return select(b | 0x80000000u, ~b, (b & 0x80000000u) != 0u);
}

const R16_INV_SCALE: f32 = ${1 / R16F_DATA_SCALE};

@compute @workgroup_size(${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx < ${MAX_KERNEL_CHANNELS}u) {
    atomicStore(&wg_min[lidx], ${MINMAX_INIT_MIN}u);
    atomicStore(&wg_max[lidx], ${MINMAX_INIT_MAX}u);
  }
  workgroupBarrier();

  let sz = P.stored_z;
  var contributes = false;
  var value = 0.0;
  var slab = 0u;

  let span = max(1u, P.z_span);
  let px = P.grid_origin.x + gid.x;
  let py = P.grid_origin.y + gid.y;
  let c = P.chan_start + gid.z / span;
  let z = P.grid_origin.z + gid.z % span;
  if (px < P.stored_xy.x && py < P.stored_xy.y && z < sz && c < P.chan_end) {
    let g = clamp(
      P.dest_origin + vec3<i32>(i32(px), i32(py), i32(z)),
      P.fetch_min,
      P.fetch_max - vec3<i32>(1),
    );
    if (all(g >= P.lo) && all(g < P.hi) && c >= P.chan_start) {
      let local = vec3<u32>(g - P.chunk_origin);
      let src = P.fixed_base
        + (c - P.chan_start) * P.stride_c
        + local.z * P.stride_z
        + local.y * P.stride_y
        + local.x * P.stride_x;
      value = f32(extractBits(chunk_data[src >> 1u], 16u * (src & 1u), 16u));
      slab = c - P.chan_start;
      let half = pack2x16float(vec2<f32>(value * R16_INV_SCALE, 0.0)) & 0xffffu;
      let word = P.out_base_word
        + ((c * sz + z) * P.stored_xy.y + py) * P.row_words
        + (px >> 1u);
      atomicOr(&out_words[word], half << (16u * (px & 1u)));
      contributes = true; // u16 has no NaN — every owned texel contributes
    }
  }

  if (contributes) {
    let e = encode_order(value);
    atomicMin(&wg_min[slab], e);
    atomicMax(&wg_max[slab], e);
  }
  workgroupBarrier();
${REDUCE_EPILOGUE_WGSL}
}
`;

/**
 * rgba8 variant (3/4-channel uint8 pools — `atlasFormat.ts` `rgba8`): the r8
 * ARENA kernel with the channel slabs INTERLEAVED — texel `(px, py, z)` of
 * slab group `c >> 2` holds slab `c` in byte `c & 3`. Word math is therefore
 * one word per texel (`+ px`, not `px >> 2`), the image count is
 * `stored.z · ceil(channels / 4)`, and the OR is load-bearing for a new
 * reason: the channel axis is commonly chunked per channel (OME-Zarr c=1
 * chunks), so the four bytes of one texel arrive from up to four dispatches.
 * Min/max reduce raw bytes per slab, exactly like r8 (`decodeMinMaxU8`).
 */
export const REPACK_KERNEL_RGBA8_WGSL = /* wgsl */ `
${PARAMS_STRUCT_WGSL}
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> minmax: array<atomic<u32>>;
// Output arena: one rgba8 texel per word, rows padded to P.row_words.
@group(0) @binding(2) var<storage, read_write> out_words: array<atomic<u32>>;
@group(1) @binding(0) var<storage, read> chunk_data: array<u32>;

var<workgroup> wg_min: array<atomic<u32>, ${MAX_KERNEL_CHANNELS}>;
var<workgroup> wg_max: array<atomic<u32>, ${MAX_KERNEL_CHANNELS}>;

@compute @workgroup_size(${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE}, ${REPACK_WORKGROUP_SIZE})
fn main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx < ${MAX_KERNEL_CHANNELS}u) {
    atomicStore(&wg_min[lidx], ${MINMAX_INIT_MIN}u);
    atomicStore(&wg_max[lidx], ${MINMAX_INIT_MAX}u);
  }
  workgroupBarrier();

  let sz = P.stored_z;
  var contributes = false;
  var value = 0u;
  var slab = 0u;

  let span = max(1u, P.z_span);
  let px = P.grid_origin.x + gid.x;
  let py = P.grid_origin.y + gid.y;
  let c = P.chan_start + gid.z / span;
  let z = P.grid_origin.z + gid.z % span;
  if (px < P.stored_xy.x && py < P.stored_xy.y && z < sz && c < P.chan_end) {
    let g = clamp(
      P.dest_origin + vec3<i32>(i32(px), i32(py), i32(z)),
      P.fetch_min,
      P.fetch_max - vec3<i32>(1),
    );
    if (all(g >= P.lo) && all(g < P.hi) && c >= P.chan_start) {
      let local = vec3<u32>(g - P.chunk_origin);
      let src = P.fixed_base
        + (c - P.chan_start) * P.stride_c
        + local.z * P.stride_z
        + local.y * P.stride_y
        + local.x * P.stride_x;
      value = extractBits(chunk_data[src >> 2u], 8u * (src & 3u), 8u);
      slab = c - P.chan_start;
      let word = P.out_base_word
        + (((c >> 2u) * sz + z) * P.stored_xy.y + py) * P.row_words
        + px;
      atomicOr(&out_words[word], value << (8u * (c & 3u)));
      contributes = true; // u8 has no NaN — every owned texel contributes
    }
  }

  if (contributes) {
    atomicMin(&wg_min[slab], value);
    atomicMax(&wg_max[slab], value);
  }
  workgroupBarrier();
${REDUCE_EPILOGUE_WGSL}
}
`;

export type RepackDispatchInput = Omit<RepackBrickInput, "output">;

/** CPU-side mirror of the WGSL `Params` struct for one (brick, chunk) pass. */
export type KernelDispatch = {
  /** Index into `input.chunks` — selects the chunk-data bind group. */
  chunkIndex: number;
  destOrigin: Vec3;
  stored: Vec3;
  channelCount: number;
  brickIndex: number;
  /** First `minmax` entry of this brick; slab c reduces into entry
   * `minmaxBase + c` (per-slab occupancy). Defaults to `brickIndex` for the
   * single-entry-per-brick layout the tests simulate. */
  minmaxBase: number;
  fetchMin: Vec3;
  fetchMax: Vec3;
  chanStart: number;
  chanEnd: number;
  /** Chunk ∩ fetch-box overlap in level voxels ([lo, hi) per axis). */
  lo: Vec3;
  hi: Vec3;
  fixedBase: number;
  strideX: number;
  strideY: number;
  strideZ: number;
  strideC: number;
  chunkOrigin: Vec3;
  slotOrigin: Vec3;
  /** Origin of the owned sub-box inside the stored brick (see `ownedGridBox`). */
  gridOrigin: Vec3;
  /** Extents of that sub-box. `gridSize[2]` is the per-channel z span. */
  gridSize: Vec3;
};

/**
 * The sub-box of the stored brick that ONE (brick, chunk) dispatch can write.
 *
 * The kernel used to dispatch over the full stored brick for every chunk and
 * let each invocation discard itself if it did not own its texel. With a
 * 66×66×38 brick over 4 channels that is 702,848 invocations per dispatch, of
 * which roughly 1/8 do work — each chunk owns one channel-chunk and about half
 * the z range. Narrowing the grid to the owned box removes the rest.
 *
 * Why the owned set IS a box: the kernel's source position along each axis is
 * `f(p) = clamp(destOrigin + p, fetchMin, fetchMax - 1)`, which is monotone
 * non-decreasing in `p`. Ownership is `lo <= f(p) < hi`, and the preimage of an
 * interval under a monotone function is an interval — so per axis it is a
 * contiguous `[p0, p1)`, with closed forms:
 *
 *  - `p0 = 0` when `lo === fetchMin`, because the border texels below `fetchMin`
 *    clamp UP to `fetchMin` and are therefore owned by exactly the chunk whose
 *    `lo` sits at `fetchMin`. Otherwise `p0 = lo - destOrigin`.
 *  - `p1 = stored` when `hi === fetchMax` (symmetrically: the trailing border
 *    clamps DOWN to `fetchMax - 1`). Otherwise `p1 = hi - destOrigin`.
 *
 * Both are clamped into `[0, stored]`. An empty span means this chunk owns
 * nothing of the brick and the dispatch is skipped entirely.
 *
 * The per-texel ownership test stays in the kernel: the workgroup rounding tail
 * can still overshoot the box, and correctness must not depend on this
 * arithmetic being exactly right.
 */
export function ownedGridBox(d: {
  destOrigin: Vec3;
  stored: Vec3;
  fetchMin: Vec3;
  fetchMax: Vec3;
  lo: Vec3;
  hi: Vec3;
}): { gridOrigin: Vec3; gridSize: Vec3 } | null {
  const origin: number[] = [];
  const size: number[] = [];
  for (const axis of [0, 1, 2] as const) {
    const stored = d.stored[axis];
    const p0 =
      d.lo[axis] === d.fetchMin[axis]
        ? 0
        : Math.min(stored, Math.max(0, d.lo[axis] - d.destOrigin[axis]));
    const p1 =
      d.hi[axis] === d.fetchMax[axis]
        ? stored
        : Math.min(stored, Math.max(0, d.hi[axis] - d.destOrigin[axis]));
    if (p1 <= p0) return null;
    origin.push(p0);
    size.push(p1 - p0);
  }
  return {
    gridOrigin: [origin[0], origin[1], origin[2]],
    gridSize: [size[0], size[1], size[2]],
  };
}

/**
 * Build the per-chunk dispatch list for one brick — the same overlap /
 * stride / channel-range derivation as `repackBrick`'s chunk loop, minus the
 * voxel loops (those become the kernel). Non-overlapping chunks are skipped
 * exactly like the CPU `continue`.
 */
export function buildKernelDispatches(
  input: RepackDispatchInput,
  slotOrigin: Vec3,
  brickIndex: number,
  minmaxBase: number = brickIndex,
): KernelDispatch[] {
  const { spec, level, axes, brickBox, fetchBox, fixedOffsets, chunks } = input;
  const { xPos, yPos, zPos, intensityPos } = axes;
  const channelCount = spec.channelCount;
  const channelsPerChunk =
    intensityPos !== -1 ? Math.max(1, level.chunks[intensityPos] ?? 1) : 1;

  const destOrigin: Vec3 = [
    brickBox.min[0] - spec.border,
    brickBox.min[1] - spec.border,
    brickBox.min[2] - spec.border,
  ];

  const dispatches: KernelDispatch[] = [];
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    const chunkOrigin: Vec3 = [
      chunk.coords[0] * level.spatialChunks[0],
      chunk.coords[1] * level.spatialChunks[1],
      chunk.coords[2] * level.spatialChunks[2],
    ];

    const lo: number[] = [];
    const hi: number[] = [];
    let overlaps = true;
    for (const axis of [0, 1, 2] as const) {
      lo.push(Math.max(fetchBox.min[axis], chunkOrigin[axis]));
      hi.push(
        Math.min(fetchBox.max[axis], chunkOrigin[axis] + level.spatialChunks[axis]),
      );
      if (hi[axis] <= lo[axis]) overlaps = false;
    }
    if (!overlaps) continue;

    const chanStart = chunk.channelChunk * channelsPerChunk;
    const chanEnd = Math.min(channelCount, chanStart + channelsPerChunk);
    if (chanEnd <= chanStart) continue;

    const strideOf = (pos: number) => (pos !== -1 ? chunk.stride[pos] ?? 0 : 0);
    let fixedBase = 0;
    for (let d = 0; d < fixedOffsets.length; d++) {
      if (fixedOffsets[d] !== 0) fixedBase += fixedOffsets[d] * (chunk.stride[d] ?? 0);
    }

    const stored: Vec3 = [spec.stored[0], spec.stored[1], spec.stored[2]];
    const fetchMin: Vec3 = [fetchBox.min[0], fetchBox.min[1], fetchBox.min[2]];
    const fetchMax: Vec3 = [fetchBox.max[0], fetchBox.max[1], fetchBox.max[2]];
    const box = ownedGridBox({
      destOrigin,
      stored,
      fetchMin,
      fetchMax,
      lo: [lo[0], lo[1], lo[2]],
      hi: [hi[0], hi[1], hi[2]],
    });
    // Overlaps in level voxels but owns no brick texel (the whole overlap sits
    // in a region another chunk's clamp already covers) — nothing to dispatch.
    if (!box) continue;

    dispatches.push({
      chunkIndex,
      destOrigin,
      stored,
      channelCount,
      brickIndex,
      minmaxBase,
      fetchMin,
      fetchMax,
      chanStart,
      chanEnd,
      lo: [lo[0], lo[1], lo[2]],
      hi: [hi[0], hi[1], hi[2]],
      fixedBase,
      strideX: strideOf(xPos),
      strideY: strideOf(yPos),
      strideZ: strideOf(zPos),
      strideC: strideOf(intensityPos),
      chunkOrigin,
      slotOrigin,
      gridOrigin: box.gridOrigin,
      gridSize: box.gridSize,
    });
  }
  return dispatches;
}

/**
 * Workgroup counts covering the OWNED sub-box (z carries this chunk's channel
 * range). Previously this covered the whole stored brick times the whole
 * channel count for every chunk, so ~7/8 of the invocations existed only to
 * fail the ownership test.
 */
export function dispatchWorkgroups(d: KernelDispatch): Vec3 {
  const wg = REPACK_WORKGROUP_SIZE;
  const channels = Math.max(0, d.chanEnd - d.chanStart);
  return [
    Math.ceil(d.gridSize[0] / wg),
    Math.ceil(d.gridSize[1] / wg),
    Math.ceil((d.gridSize[2] * channels) / wg),
  ];
}

/**
 * Pack one dispatch into its 40-word uniform slice. Word layout mirrors the
 * WGSL `Params` struct field-for-field (vec3 aligned to 16 bytes, the scalar
 * riding in the 4th word); i32 values rely on typed-array modulo-2^32 wrap to
 * store their bit pattern. `r8Out` carries the r8 kernel's arena addressing
 * (words 33/34); the f32 kernel ignores those words.
 */
export function packKernelParams(
  d: KernelDispatch,
  out: Uint32Array,
  wordOffset: number,
  r8Out?: { outBaseWord: number; rowWords: number },
): void {
  const w = out.subarray(wordOffset, wordOffset + REPACK_PARAMS_BYTES / 4);
  w[0] = d.destOrigin[0];
  w[1] = d.destOrigin[1];
  w[2] = d.destOrigin[2];
  w[3] = d.stored[2];
  w[4] = d.stored[0];
  w[5] = d.stored[1];
  w[6] = d.channelCount;
  w[7] = d.brickIndex;
  w[8] = d.fetchMin[0];
  w[9] = d.fetchMin[1];
  w[10] = d.fetchMin[2];
  w[11] = d.chanStart;
  w[12] = d.fetchMax[0];
  w[13] = d.fetchMax[1];
  w[14] = d.fetchMax[2];
  w[15] = d.chanEnd;
  w[16] = d.lo[0];
  w[17] = d.lo[1];
  w[18] = d.lo[2];
  w[19] = d.fixedBase;
  w[20] = d.hi[0];
  w[21] = d.hi[1];
  w[22] = d.hi[2];
  w[23] = d.strideC;
  w[24] = d.chunkOrigin[0];
  w[25] = d.chunkOrigin[1];
  w[26] = d.chunkOrigin[2];
  w[27] = d.strideX;
  w[28] = d.slotOrigin[0];
  w[29] = d.slotOrigin[1];
  w[30] = d.slotOrigin[2];
  w[31] = d.strideY;
  w[32] = d.strideZ;
  w[33] = r8Out?.outBaseWord ?? 0;
  w[34] = r8Out?.rowWords ?? 0;
  w[35] = d.minmaxBase; // (was the vec3 alignment pad before grid_origin)
  w[36] = d.gridOrigin[0];
  w[37] = d.gridOrigin[1];
  w[38] = d.gridOrigin[2];
  w[39] = d.gridSize[2];
}

/**
 * Arena layout for one r8 job (all of a brick's dispatches share it): rows
 * padded to the 256-byte `copyBufferToTexture` bytesPerRow alignment, one
 * image per output z texel (channel slabs stacked on z, like the atlas slot).
 * `jobBytes` is a multiple of 256 by construction, so consecutive job base
 * offsets stay aligned for both the storage binding and the copy.
 *
 * KNOWN COST, measured and left alone: for a typical 66×66×38 brick over 4
 * channels the row padding is 256 bytes carrying 66 bytes of data, so the arena
 * is 256×66×152 = 2,568,192 B for 662,112 B of texels — 3.88×, all of it
 * cleared, atomicOr'd and strided-copied. Packing rows tighter is not as simple
 * as it looks: `atomicOr` operates at u32 granularity while texels are bytes,
 * so four adjacent x texels share a word and can belong to DIFFERENT dispatches
 * at a chunk boundary. That is what makes the OR (and hence the zero-clear)
 * load-bearing, and why a plain packed write would race. Any change here must
 * first establish word-exclusive ownership.
 */
export function r8JobLayout(
  stored: Vec3,
  channelCount: number,
): { rowBytes: number; imageRows: number; images: number; jobBytes: number } {
  return arenaJobLayout(stored, channelCount, 1);
}

/**
 * `r8JobLayout` generalised over the texel size: the r16f kernel packs 2-byte
 * halves (rows of 66 texels → 132 B → 256 B, 1.94× padding; 2D 256-wide
 * rows → 512 B, none). Both arena kernels and the device half's
 * `copyBufferToTexture` must use THIS for a job, never a hand-derived row.
 */
/**
 * The arena layout for a job by atlas kind: r8 = 1 B texels, r16f = 2 B,
 * rgba8 = 4 B texels holding FOUR slabs (so `ceil(channels / 4)` images per
 * z instead of `channels`). The device half's `copyBufferToTexture` and the
 * kernels' `row_words` must both come from here.
 */
export function arenaJobLayoutForKind(
  kind: "r8" | "r16f" | "rgba8",
  stored: Vec3,
  channelCount: number,
): { rowBytes: number; imageRows: number; images: number; jobBytes: number } {
  if (kind === "rgba8") return arenaJobLayout(stored, Math.ceil(channelCount / 4), 4);
  return arenaJobLayout(stored, channelCount, kind === "r16f" ? 2 : 1);
}

export function arenaJobLayout(
  stored: Vec3,
  channelCount: number,
  bytesPerTexel: number,
): { rowBytes: number; imageRows: number; images: number; jobBytes: number } {
  const rowBytes = Math.ceil((stored[0] * bytesPerTexel) / 256) * 256;
  const imageRows = stored[1];
  const images = stored[2] * channelCount;
  return { rowBytes, imageRows, images, jobBytes: rowBytes * imageRows * images };
}

/**
 * r8 counterpart of `decodeMinMax`: the kernel reduces RAW u8 values (no
 * order-encoding, no NaN), so the words decode as-is. Untouched sentinels
 * (possible only when no dispatch owned any texel) map to the same `{0, 0,
 * uniform 0}` outcome as the f32 path.
 */
export function decodeMinMaxU8(
  minWord: number,
  maxWord: number,
): { min: number; max: number; uniformValue: number | null } {
  if (minWord === MINMAX_INIT_MIN && maxWord === MINMAX_INIT_MAX) {
    return { min: 0, max: 0, uniformValue: 0 };
  }
  return { min: minWord, max: maxWord, uniformValue: minWord === maxWord ? minWord : null };
}

const orderScratch = new DataView(new ArrayBuffer(4));

/** TS mirror of the kernel's `encode_order` (tests + readback decoding). */
export function encodeOrderedF32(value: number): number {
  orderScratch.setFloat32(0, value, true);
  const bits = orderScratch.getUint32(0, true);
  return (bits & 0x80000000) !== 0 ? ~bits >>> 0 : (bits | 0x80000000) >>> 0;
}

export function decodeOrderedF32(encoded: number): number {
  const bits = (encoded & 0x80000000) !== 0 ? encoded ^ 0x80000000 : ~encoded;
  orderScratch.setUint32(0, bits >>> 0, true);
  return orderScratch.getFloat32(0, true);
}

/**
 * Decode one brick's min/max readback words into a `RepackResult`-shaped
 * outcome. Untouched sentinels (only possible when every voxel was NaN) map
 * to the CPU scan's `!Number.isFinite(min)` result: `{0, 0, uniform 0}` —
 * the brick demotes to an EMPTY page entry showing 0, which is what the CPU
 * path renders for such data too.
 */
export function decodeMinMax(
  minWord: number,
  maxWord: number,
): { min: number; max: number; uniformValue: number | null } {
  if (minWord === MINMAX_INIT_MIN && maxWord === MINMAX_INIT_MAX) {
    return { min: 0, max: 0, uniformValue: 0 };
  }
  const min = decodeOrderedF32(minWord);
  const max = decodeOrderedF32(maxWord);
  return { min, max, uniformValue: min === max ? min : null };
}

/**
 * Decode one brick's PER-SLAB min/max entries (`slabCount` consecutive pairs
 * from `base`) into a `RepackResult`-shaped outcome: the union is what the
 * single-entry decode used to produce, and `slabRanges` carries each slab's
 * own bracket. A slab whose pair still holds the init sentinels (no owned
 * texel — cannot happen when the chunks tile the channel range, but the
 * contract is conservative) takes the union; all-sentinel → `{0, 0, uniform
 * 0}` exactly like the single-entry decodes.
 */
export function decodeSlabRanges(
  words: Uint32Array,
  base: number,
  slabCount: number,
  decode: (minWord: number, maxWord: number) => { min: number; max: number },
): {
  min: number;
  max: number;
  uniformValue: number | null;
  slabRanges: (readonly [number, number])[];
} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  const perSlab: ([number, number] | null)[] = [];
  for (let s = 0; s < slabCount; s++) {
    const minWord = words[(base + s) * 2];
    const maxWord = words[(base + s) * 2 + 1];
    if (minWord === MINMAX_INIT_MIN && maxWord === MINMAX_INIT_MAX) {
      perSlab.push(null);
      continue;
    }
    const range = decode(minWord, maxWord);
    perSlab.push([range.min, range.max]);
    if (range.min < min) min = range.min;
    if (range.max > max) max = range.max;
  }
  if (!Number.isFinite(min)) {
    return {
      min: 0,
      max: 0,
      uniformValue: 0,
      slabRanges: Array.from({ length: slabCount }, () => [0, 0] as const),
    };
  }
  return {
    min,
    max,
    uniformValue: min === max ? min : null,
    slabRanges: perSlab.map((range) => range ?? ([min, max] as const)),
  };
}
