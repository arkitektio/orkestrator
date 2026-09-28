import {
  INF_COST,
  SKELETON_BASE_COST,
} from "../corridorCost";
import { NEIGHBOUR_OFFSETS } from "../geodesicReference";
import { DEFAULT_MARCHER, marcherFor, type MarcherId } from "../../meshes/marcher";
import type { Vec3 } from "../strokeModel";

/**
 * The GPU skeleton kernels (compute-shader port of `features/annotations/enhancers/shared/`): the
 * corridor cost field and the geodesic distance relaxation. This module is
 * the PURE half — WGSL sources and CPU-side packing/dispatch math, all
 * unit-testable against the `features/annotations/enhancers/shared` reference without a GPU;
 * `computeSkeleton.ts` owns all GPUDevice state.
 *
 * ## Kernel A — cost (`SKELETON_COST_WGSL`)
 *
 * One invocation per corridor-box voxel. Mirrors
 * `corridorCost.buildCostField` exactly: outside the stroke tube → INF;
 * then the page-table residency resolve at ONE fixed level — UNMAPPED →
 * INF + hole count, EMPTY → the entry's own quantized value
 * (`brickEncoding.decodeEmptyValue` restated: normalized = code/ceiling),
 * RESIDENT → `textureLoad` of the atlas slot (border-shifted, channel slab
 * stacked on z exactly like `repackKernel`'s write side) scaled by
 * `dataScale` and normalized with the pool's data range. The page table is
 * RGBA8 **unorm** (see `pageTableTexture.ts`) so bytes decode as
 * `round(v*255)` — the same convention as the raymarcher.
 *
 * ## Kernel B — relax (`SKELETON_RELAX_WGSL`)
 *
 * Jacobi (gather) Bellman–Ford over the 26-neighbourhood, ping-pong
 * dist/pred buffers: `out[v] = min(in[v], min_n(in[n] + |step|·(c(n)+c(v))/2))`,
 * ties to the LOWER predecessor index — the same metric and tie-break as
 * `geodesicReference.geodesicField`, so both converge to the same distance
 * field (min over paths of the f32-accumulated path cost) and the same
 * shortest-path tree. Gather (not scatter+atomics) because WebGPU has no f32
 * atomic min, and because a race-free deterministic kernel is what makes the
 * parity self-test a plain compare. A `changed` flag (atomicStore) tells the
 * host when a batch of passes has converged. WebGPU orders dispatches within
 * a pass, so one pass carries a whole ping-pong batch.
 */

export const SKELETON_WORKGROUP_SIZE = 4;

/** Words in the packed CostParams struct (see layout in `packCostParams`). */
export const COST_PARAMS_BYTES = 144;
/** Words in the packed RelaxParams struct. */
export const RELAX_PARAMS_BYTES = 32;

/** Ping-pong passes recorded per submit before the changed-flag readback. */
export const RELAX_ITERS_PER_SUBMIT = 64;
/** Hard cap — an unconverged field after this many passes answers null and
 * the caller falls back to the CPU reference. */
export const MAX_RELAX_ITERS = 4096;

export const NO_PRED_WORD = 0xffffffff;

/** The 26 offsets as a WGSL const array, generated from the SAME source as
 * the CPU reference so the neighbour order can never drift between them. */
const offsetsWGSL = NEIGHBOUR_OFFSETS.map(
  ([x, y, z]) => `vec3<i32>(${x}, ${y}, ${z})`,
).join(",\n  ");

const COST_PARAMS_STRUCT = /* wgsl */ `
struct CostParams {
  box_origin: vec3<i32>,
  stroke_count: u32,
  box_size: vec3<u32>,
  channel: u32,
  page_offset: vec3<i32>,
  border: u32,
  payload: vec3<u32>,
  stored_z: u32,
  slot_size: vec3<u32>,
  _pad0: u32,
  spacing: vec3<f32>,
  radius: f32,
  min_value: f32,
  range: f32,
  data_scale: f32,
  empty_ceiling: f32,
  w_intensity: f32,
  exponent: f32,
  base_cost: f32,
  inf_cost: f32,
  // The POOL's data range, for the EMPTY-brick decode — distinct from
  // min_value/range, which are the (clim-windowed) NORMALIZATION window.
  pool_min: f32,
  pool_range: f32,
  // >= 0 switches the kernel to CONNECTIVITY mode: instead of the shaped
  // cost, write the binary field (windowed intensity >= binary_tau → 0,
  // else 1; walls stay INF) the Gap geodesic runs on. Binary passes never
  // count holes — the normal pass over the same corridor already did.
  binary_tau: f32,
  _pad2: f32,
}
`;

export const SKELETON_COST_WGSL = /* wgsl */ `
${COST_PARAMS_STRUCT}
@group(0) @binding(0) var<uniform> P: CostParams;
@group(0) @binding(1) var<storage, read_write> cost: array<f32>;
@group(0) @binding(2) var<storage, read_write> holes: atomic<u32>;
@group(0) @binding(3) var<storage, read> stroke_pts: array<vec4<f32>>;
@group(1) @binding(0) var page_table: texture_3d<f32>;
@group(1) @binding(1) var atlas: texture_3d<f32>;

// Squared world distance from point p to segment [a, b], all in level-voxel
// coordinates scaled per axis by spacing — corridorCost.segmentDistanceSq.
fn segment_distance_sq(p: vec3<f32>, a: vec3<f32>, b: vec3<f32>) -> f32 {
  let ap = (p - a) * P.spacing;
  let ab = (b - a) * P.spacing;
  let len_sq = dot(ab, ab);
  var t = 0.0;
  if (len_sq > 0.0) {
    t = clamp(dot(ap, ab) / len_sq, 0.0, 1.0);
  }
  let d = ap - t * ab;
  return dot(d, d);
}

fn byte_of(v: f32) -> u32 {
  return u32(round(v * 255.0));
}

@compute @workgroup_size(${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (any(gid >= P.box_size)) { return; }
  let index = gid.x + gid.y * P.box_size.x + gid.z * P.box_size.x * P.box_size.y;
  let voxel = P.box_origin + vec3<i32>(gid);

  // Corridor tube test at the voxel CENTER (k + 0.5).
  let center = vec3<f32>(voxel) + vec3<f32>(0.5);
  let r_sq = P.radius * P.radius;
  var inside = false;
  let segments = max(P.stroke_count, 1u) - 1u;
  if (P.stroke_count == 1u) {
    inside = segment_distance_sq(center, stroke_pts[0].xyz, stroke_pts[0].xyz) <= r_sq;
  }
  for (var i = 0u; i < segments; i = i + 1u) {
    if (inside) { break; }
    inside = segment_distance_sq(center, stroke_pts[i].xyz, stroke_pts[i + 1u].xyz) <= r_sq;
  }
  if (!inside) {
    cost[index] = P.inf_cost;
    return;
  }

  // Residency resolve at the fixed level, through the packed page table.
  let brick = vec3<u32>(voxel) / P.payload;
  let local = vec3<u32>(voxel) - brick * P.payload;
  let entry = textureLoad(page_table, P.page_offset + vec3<i32>(brick), 0);
  let flag = byte_of(entry.a);

  if (flag == 0u) { // UNMAPPED: missing data is a wall, and worth reporting.
    cost[index] = P.inf_cost;
    if (P.binary_tau < 0.0) { atomicAdd(&holes, 1u); }
    return;
  }

  var normalized = 0.0;
  if (flag == 2u) { // EMPTY: the uniform value rides in the entry bytes.
    let code = f32(byte_of(entry.r) + byte_of(entry.g) * 256u + byte_of(entry.b) * 65536u);
    // decodeEmptyValue over the POOL range, then normalized through the
    // window — exactly what sampleResident + the CPU sampler produce.
    let raw = P.pool_min + (code / P.empty_ceiling) * P.pool_range;
    normalized = clamp((raw - P.min_value) / P.range, 0.0, 1.0);
  } else { // RESIDENT: read the atlas slot (channel slabs stacked on z).
    let slot = vec3<u32>(byte_of(entry.r), byte_of(entry.g), byte_of(entry.b));
    let texel = slot * P.slot_size + vec3<u32>(
      P.border + local.x,
      P.border + local.y,
      P.channel * P.stored_z + P.border + local.z,
    );
    let raw = textureLoad(atlas, vec3<i32>(texel), 0).r * P.data_scale;
    normalized = clamp((raw - P.min_value) / P.range, 0.0, 1.0);
  }

  if (P.binary_tau >= 0.0) {
    cost[index] = select(1.0, 0.0, normalized >= P.binary_tau);
  } else {
    cost[index] = P.base_cost + P.w_intensity * pow(1.0 - normalized, P.exponent);
  }
}
`;

const RELAX_PARAMS_STRUCT = /* wgsl */ `
struct RelaxParams {
  box_size: vec3<u32>,
  _pad0: u32,
  spacing: vec3<f32>,
  inf_cost: f32,
}
`;

export const SKELETON_RELAX_WGSL = /* wgsl */ `
${RELAX_PARAMS_STRUCT}
@group(0) @binding(0) var<uniform> P: RelaxParams;
@group(0) @binding(1) var<storage, read> cost: array<f32>;
@group(0) @binding(2) var<storage, read> dist_in: array<f32>;
@group(0) @binding(3) var<storage, read> pred_in: array<u32>;
@group(0) @binding(4) var<storage, read_write> dist_out: array<f32>;
@group(0) @binding(5) var<storage, read_write> pred_out: array<u32>;
@group(0) @binding(6) var<storage, read_write> changed: atomic<u32>;

// SAME order as geodesicReference.NEIGHBOUR_OFFSETS (generated from it).
const OFFSETS = array<vec3<i32>, 26>(
  ${offsetsWGSL}
);

@compute @workgroup_size(${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (any(gid >= P.box_size)) { return; }
  let index = gid.x + gid.y * P.box_size.x + gid.z * P.box_size.x * P.box_size.y;

  let own_cost = cost[index];
  var best = dist_in[index];
  var best_pred = pred_in[index];

  if (own_cost < P.inf_cost) {
    let p = vec3<i32>(gid);
    let size = vec3<i32>(P.box_size);
    for (var k = 0u; k < 26u; k = k + 1u) {
      let n = p + OFFSETS[k];
      if (any(n < vec3<i32>(0)) || any(n >= size)) { continue; }
      let n_index = u32(n.x) + u32(n.y) * P.box_size.x + u32(n.z) * P.box_size.x * P.box_size.y;
      let n_cost = cost[n_index];
      if (n_cost >= P.inf_cost) { continue; }
      let n_dist = dist_in[n_index];
      if (n_dist >= P.inf_cost) { continue; }
      // Edge weight: step's world length × mean endpoint cost — the exact
      // geodesicReference metric.
      let step = length(vec3<f32>(OFFSETS[k]) * P.spacing);
      let candidate = n_dist + step * ((n_cost + own_cost) * 0.5);
      if (candidate < best || (candidate == best && n_index < best_pred)) {
        best = candidate;
        best_pred = n_index;
      }
    }
  }

  dist_out[index] = best;
  pred_out[index] = best_pred;
  if (best < dist_in[index]) {
    atomicStore(&changed, 1u);
  }
}
`;

/** Words in the packed TubeParams struct. */
export const TUBE_PARAMS_BYTES = 48;

/** Words in the packed SmoothParams struct. */
export const SMOOTH_PARAMS_BYTES = 32;

/**
 * ## Kernel D — field smoothing (`SKELETON_SMOOTH_WGSL`)
 *
 * One axis of the separable box blur behind the smooth-blob "Smooth"
 * slider; `features/annotations/enhancers/shared/fieldSmooth.ts` is the CPU twin and documents the
 * shared semantics (clamp first, edge replication, 2r+1 window). Run three
 * times (axis 0, 1, 2) ping-ponging buffers; the tube kernel then marches
 * the blurred copy while the geodesic keeps the pristine cost buffer — INF
 * walls must stay impassable.
 */
export const SKELETON_SMOOTH_WGSL = /* wgsl */ `
struct SmoothParams {
  box_size: vec3<u32>,
  axis: u32,
  radius: i32,
  clamp_value: f32,
  _pad0: f32,
  _pad1: f32,
}
@group(0) @binding(0) var<uniform> P: SmoothParams;
@group(0) @binding(1) var<storage, read> src: array<f32>;
@group(0) @binding(2) var<storage, read_write> dst: array<f32>;

fn index_of(v: vec3<u32>) -> u32 {
  return v.x + v.y * P.box_size.x + v.z * P.box_size.x * P.box_size.y;
}

@compute @workgroup_size(${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (any(gid >= P.box_size)) { return; }
  let extent = i32(P.box_size[P.axis]);
  var sum = 0.0;
  for (var k = -P.radius; k <= P.radius; k = k + 1) {
    var sample = vec3<i32>(gid);
    sample[P.axis] = clamp(sample[P.axis] + k, 0, extent - 1);
    sum = sum + min(src[index_of(vec3<u32>(sample))], P.clamp_value);
  }
  dst[index_of(gid)] = sum / f32(2 * P.radius + 1);
}
`;

export function packSmoothParams(input: {
  boxSize: Vec3;
  axis: 0 | 1 | 2;
  radius: number;
  clampValue: number;
}): ArrayBuffer {
  const buffer = new ArrayBuffer(SMOOTH_PARAMS_BYTES);
  const u32 = new Uint32Array(buffer);
  const i32 = new Int32Array(buffer);
  const f32 = new Float32Array(buffer);
  u32[0] = input.boxSize[0];
  u32[1] = input.boxSize[1];
  u32[2] = input.boxSize[2];
  u32[3] = input.axis;
  i32[4] = Math.max(1, Math.floor(input.radius));
  f32[5] = input.clampValue;
  return buffer;
}

/**
 * ## Kernel C — tube surface (`SKELETON_TUBE_WGSL`)
 *
 * Marching tetrahedra over the SAME cost buffer Kernel A wrote — the
 * isosurface `cost = iso` wraps the bright structure inside the corridor
 * (`features/annotations/enhancers/meshes/tubeMarch.ts` is the CPU twin; the case table
 * comes from the marcher registry (`meshes/marcher.ts`), so the two cannot drift). One
 * invocation per CELL (box_size - 1 per axis); triangles are appended with
 * one atomicAdd per triangle into a capped vec4 vertex buffer — the counter
 * keeps counting past the cap, so the host learns the exact demand and can
 * report truncation. Emitted positions are absolute level-voxel coordinates
 * (k + 0.5), like the CPU twin.
 */
export function tubeWgslFor(marcherId: MarcherId): string {
  const marcher = marcherFor(marcherId);
  return /* wgsl */ `
struct TubeParams {
  box_origin: vec3<i32>,
  capacity: u32,
  box_size: vec3<u32>,
  _pad0: u32,
  iso: f32,
  clamp_value: f32,
  // >= 0 enables the Gap connectivity mask: corners whose geodesic dark
  // distance from the seed (connect_dist) exceeds this read as OUTSIDE, so
  // the surface cannot exist across an unbridged gap. < 0 disables (the
  // connect_dist binding then carries a dummy buffer, never read).
  gap_limit: f32,
  _pad2: f32,
}
@group(0) @binding(0) var<uniform> P: TubeParams;
@group(0) @binding(1) var<storage, read> cost: array<f32>;
@group(0) @binding(2) var<storage, read_write> vertices: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> vertex_count: atomic<u32>;
@group(0) @binding(4) var<storage, read> connect_dist: array<f32>;

${marcher.wgslTables()}

// Cube corner id c → cell-local offset (c&1, c>>1&1, c>>2&1).
fn corner_offset(c: u32) -> vec3<f32> {
  return vec3<f32>(f32(c & 1u), f32((c >> 1u) & 1u), f32((c >> 2u) & 1u));
}

// The iso crossing on a packed edge (p | q << 3), in absolute level voxels.
fn edge_point(edge: u32, values: array<f32, 8>, cell: vec3<f32>) -> vec3<f32> {
  let p = edge & 7u;
  let q = edge >> 3u;
  let vp = values[p];
  let vq = values[q];
  let s = (P.iso - vp) / (vq - vp); // straddles iso: vq != vp
  return cell + mix(corner_offset(p), corner_offset(q), s);
}

// One atomicAdd per triangle; past the cap it is still COUNTED (exact demand
// for the host's truncation report) but not written.
fn emit_triangle(e0: u32, e1: u32, e2: u32, values: array<f32, 8>, cell: vec3<f32>) {
  let base = atomicAdd(&vertex_count, 3u);
  if (base + 3u > P.capacity) { return; }
  vertices[base] = vec4<f32>(edge_point(e0, values, cell), 0.0);
  vertices[base + 1u] = vec4<f32>(edge_point(e1, values, cell), 0.0);
  vertices[base + 2u] = vec4<f32>(edge_point(e2, values, cell), 0.0);
}

@compute @workgroup_size(${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE}, ${SKELETON_WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (any(gid + vec3<u32>(1u) >= P.box_size)) { return; }

  var values: array<f32, 8>;
  var cell_mask = 0u;
  for (var c = 0u; c < 8u; c = c + 1u) {
    let o = vec3<u32>(c & 1u, (c >> 1u) & 1u, (c >> 2u) & 1u);
    let v = gid + o;
    let index = v.x + v.y * P.box_size.x + v.z * P.box_size.x * P.box_size.y;
    values[c] = min(cost[index], P.clamp_value);
    if (P.gap_limit >= 0.0 && connect_dist[index] > P.gap_limit) {
      values[c] = P.clamp_value; // unconnected: outside, whatever it looked like
    }
    if (values[c] <= P.iso) { cell_mask = cell_mask | (1u << c); }
  }
  if (cell_mask == 0u || cell_mask == 255u) { return; }

  let cell = vec3<f32>(vec3<i32>(gid) + P.box_origin) + vec3<f32>(0.5);
${marcher.wgslEmit}
}
`;
}

/** The default marcher's kernel — kept for callers that never choose. */
export const SKELETON_TUBE_WGSL = tubeWgslFor(DEFAULT_MARCHER);

export function packTubeParams(input: {
  boxOrigin: Vec3;
  boxSize: Vec3;
  capacity: number;
  iso: number;
  clampValue: number;
  /** >= 0 enables the Gap connectivity mask (world units). */
  gapLimit?: number;
}): ArrayBuffer {
  const buffer = new ArrayBuffer(TUBE_PARAMS_BYTES);
  const i32 = new Int32Array(buffer);
  const u32 = new Uint32Array(buffer);
  const f32 = new Float32Array(buffer);
  i32[0] = input.boxOrigin[0];
  i32[1] = input.boxOrigin[1];
  i32[2] = input.boxOrigin[2];
  u32[3] = input.capacity;
  u32[4] = input.boxSize[0];
  u32[5] = input.boxSize[1];
  u32[6] = input.boxSize[2];
  u32[7] = 0;
  f32[8] = input.iso;
  f32[9] = input.clampValue;
  f32[10] = input.gapLimit ?? -1;
  return buffer;
}

/** Workgroup counts covering the CELL grid (one less than voxels per axis). */
export function tubeWorkgroups(boxSize: Vec3): Vec3 {
  const wg = SKELETON_WORKGROUP_SIZE;
  return [
    Math.ceil(Math.max(1, boxSize[0] - 1) / wg),
    Math.ceil(Math.max(1, boxSize[1] - 1) / wg),
    Math.ceil(Math.max(1, boxSize[2] - 1) / wg),
  ];
}

/** Workgroup counts covering a corridor box. */
export function skeletonWorkgroups(boxSize: Vec3): Vec3 {
  const wg = SKELETON_WORKGROUP_SIZE;
  return [
    Math.ceil(boxSize[0] / wg),
    Math.ceil(boxSize[1] / wg),
    Math.ceil(boxSize[2] / wg),
  ];
}

export type CostParamsInput = {
  boxOrigin: Vec3;
  boxSize: Vec3;
  strokeCount: number;
  channel: number;
  /** `PageTableLayout.levelOffset[level]` — the level's region in the packed texture. */
  pageOffset: Vec3;
  payload: Vec3;
  border: 0 | 1;
  /** `spec.stored[2]` — the z extent of one channel slab in the slot. */
  storedZ: number;
  slotSize: Vec3;
  /** World size of one level voxel per axis. */
  spacing: Vec3;
  radiusWorld: number;
  /** Normalization WINDOW (clim-windowed display range, raw units). */
  minValue: number;
  /** `max(maxValue - minValue, epsilon)` — pre-guarded by the caller. */
  range: number;
  dataScale: number;
  /** `2^emptyBits - 1` (255 for intensity pools, 2^24-1 for label pools). */
  emptyCeiling: number;
  /** The POOL's own range (EMPTY-brick codes decode against it). */
  poolMin: number;
  poolRange: number;
  weights: { intensity: number; exponent: number };
  /** >= 0 switches the kernel to the binary connectivity field. */
  binaryTau?: number;
};

/** Pack the cost kernel's uniform struct (layout mirrors CostParams). */
export function packCostParams(input: CostParamsInput): ArrayBuffer {
  const buffer = new ArrayBuffer(COST_PARAMS_BYTES);
  const i32 = new Int32Array(buffer);
  const u32 = new Uint32Array(buffer);
  const f32 = new Float32Array(buffer);
  i32[0] = input.boxOrigin[0];
  i32[1] = input.boxOrigin[1];
  i32[2] = input.boxOrigin[2];
  u32[3] = input.strokeCount;
  u32[4] = input.boxSize[0];
  u32[5] = input.boxSize[1];
  u32[6] = input.boxSize[2];
  u32[7] = input.channel;
  i32[8] = input.pageOffset[0];
  i32[9] = input.pageOffset[1];
  i32[10] = input.pageOffset[2];
  u32[11] = input.border;
  u32[12] = input.payload[0];
  u32[13] = input.payload[1];
  u32[14] = input.payload[2];
  u32[15] = input.storedZ;
  u32[16] = input.slotSize[0];
  u32[17] = input.slotSize[1];
  u32[18] = input.slotSize[2];
  u32[19] = 0;
  f32[20] = input.spacing[0];
  f32[21] = input.spacing[1];
  f32[22] = input.spacing[2];
  f32[23] = input.radiusWorld;
  f32[24] = input.minValue;
  f32[25] = input.range;
  f32[26] = input.dataScale;
  f32[27] = input.emptyCeiling;
  f32[28] = input.weights.intensity;
  f32[29] = input.weights.exponent;
  f32[30] = SKELETON_BASE_COST;
  f32[31] = INF_COST;
  f32[32] = input.poolMin;
  f32[33] = input.poolRange;
  f32[34] = input.binaryTau ?? -1;
  return buffer;
}

/** Pack the relax kernel's uniform struct (layout mirrors RelaxParams). */
export function packRelaxParams(boxSize: Vec3, spacing: Vec3): ArrayBuffer {
  const buffer = new ArrayBuffer(RELAX_PARAMS_BYTES);
  const u32 = new Uint32Array(buffer);
  const f32 = new Float32Array(buffer);
  u32[0] = boxSize[0];
  u32[1] = boxSize[1];
  u32[2] = boxSize[2];
  u32[3] = 0;
  f32[4] = spacing[0];
  f32[5] = spacing[1];
  f32[6] = spacing[2];
  f32[7] = INF_COST;
  return buffer;
}

/** The stroke points as the vec4 array the cost kernel binds (w unused). */
export function packStrokePoints(strokeLevelPts: readonly Vec3[]): Float32Array {
  const out = new Float32Array(Math.max(1, strokeLevelPts.length) * 4);
  strokeLevelPts.forEach((p, i) => {
    out[i * 4] = p[0];
    out[i * 4 + 1] = p[1];
    out[i * 4 + 2] = p[2];
  });
  return out;
}
