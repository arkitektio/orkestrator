import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";
import {
  CINEMATIC_DEFAULTS,
  FILL_DIRECTION,
  FILL_WEIGHT,
  GRADIENT_H,
} from "../../../platform/gpu/shading";

// three's TSL TypeScript surface lags the runtime API this module needs
// (int/ivec3 uniforms, node-valued Loop bounds, tuple Fn params, method
// chaining on swizzles). The node GRAPH is typed dynamically; the module's
// PUBLIC surface (the uniform-node records the layer components write to) is
// hand-typed below, and correctness is pinned by runtime/golden verification.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  Break,
  Continue,
  Discard,
  Fn,
  If,
  Loop,
  atan,
  bool,
  clamp,
  cos,
  dot,
  exp,
  float,
  floor,
  fract,
  int,
  ivec2,
  ivec3,
  length,
  max,
  mix,
  oneMinus,
  pow,
  screenCoordinate,
  select,
  sin,
  sqrt,
  tan,
  texture,
  texture3D,
  textureLoad,
  uniform,
  uniformArray,
  uv,
  vec2,
  vec3,
  vec4,
} = TSL;

// three exports texture3DLoad from Texture3DNode.js but (as of 0.184) does not
// re-export it through the `three/tsl` barrel — recreate its one-liner here.
export const texture3DLoad = (...params: any[]) => texture3D(...params).setSampler(false);

/** A TSL uniform node as the layer components see it: a `.value` box. */
export type UniformNodeLike<T> = { value: T };
/** A TSL uniformArray node: elements are mutated in place via `.array`. */
export type UniformArrayNodeLike<T> = { array: T[] };

import { MAX_BRICK_LEVELS } from "../octree/brickEncoding";
import { MAX_RAY_STEPS_CEILING } from "../../../platform/quality/qualityGovernor";
import { NameScope } from "./tslNames";
import { ensureAggregate } from "./pageTableTexture";
import {
  emitVolumeRayBounds,
  makeVolumeRayNodes,
  makeVolumeRayUniforms,
  MAX_RAY_STEPS as SHARED_MAX_RAY_STEPS,
} from "./volumeRayNodes";
import type { LayerBrickPool } from "../residency/brickResidency";
import {
  MAX_CHANNELS,
  MAX_CURSORS,
  PHASOR_MODE_AVERAGE,
  PHASOR_MODE_MODULATION,
  SOURCE_KIND_PHASOR,
  CURSOR_KIND_POLYGON,
  MAX_CURSOR_POINTS,
  type ChannelUniformData,
  type ChannelWindowData,
} from "./channelUniforms";
import { fixedMemberUniforms, type FixedMemberUniforms } from "./mergedChannelUniforms";

/**
 * TSL (Three Shading Language) node materials for the brick-pool renderer —
 * the WebGPU-migration port of the raw GLSL that used to live in a `glsl/`
 * directory alongside two ShaderMaterials, since deleted. TSL compiles to WGSL,
 * the scene's only backend.
 *
 * Semantics are a 1:1 port — the CPU mirrors (`features/bricks/octree/brickSampling.ts`,
 * `features/bricks/shaderspec/opacityCorrection.ts`, `features/bricks/probeMath.ts` normalization) remain in
 * lockstep. The GLSL `uPickingPass` branch was NOT ported: it was dead code
 * (probing is a CPU march via `sampleResident`).
 *
 * Uniform updates: NodeMaterial has no `.uniforms` record — the returned
 * `nodes` object exposes the uniform nodes; write `nodes.uDesiredLevel.value =
 * …` (and mutate array elements in place for `uniformArray`s).
 */

const MAX_RAY_STEPS = SHARED_MAX_RAY_STEPS;

type Vec3Tuple = readonly [number, number, number];

const v3 = (t: Vec3Tuple | number[]): THREE.Vector3 => new THREE.Vector3(t[0], t[1], t[2]);

/** Public (consumer-facing) shape of the traversal uniform nodes. */
export type TraversalNodesPublic = {
  uNumLevels: UniformNodeLike<number>;
  uPageOffset: UniformArrayNodeLike<THREE.Vector3>;
  uLevelShape: UniformArrayNodeLike<THREE.Vector3>;
  uLevelScale: UniformArrayNodeLike<THREE.Vector3>;
  uBrickPayload: UniformNodeLike<THREE.Vector3>;
  uSlotSize: UniformNodeLike<THREE.Vector3>;
  uChannelSlabDepth: UniformNodeLike<number>;
  uBrickBorder: UniformNodeLike<number>;
  uAtlasTexels: UniformNodeLike<THREE.Vector3>;
  uAtlasScale: UniformNodeLike<number>;
  uEmptyDecodeMin: UniformNodeLike<number>;
  uEmptyDecodeRange: UniformNodeLike<number>;
  /**
   * Per-channel weights that recompose an EMPTY brick's code from its page-entry
   * BYTES, and the largest code that width can hold. `(1,0,0)/255` for an 8-bit
   * intensity code; `(1,256,65536)/16777215` for a 24-bit label id spread across
   * r,g,b. Uniforms rather than a `#if`, so one compiled material serves both and
   * the CPU mirror (`decodeEmptyValue`) has one round-trip to match.
   */
  uEmptyCodeWeights: UniformNodeLike<THREE.Vector3>;
  uEmptyCodeMax: UniformNodeLike<number>;
  /** The range occupancy texels are quantized against (`pool.occEncodeMin/
   * Max`) — the pool range, or under `orkestrator.occObservedRange` the
   * observed value range. MUST track the pool's encode range on every
   * `poolsVersion` bump (BrickVolumeLayer's decode-uniform effect) — the
   * decode-≡-encode-range lockstep invariant. */
  uOccDecodeMin: UniformNodeLike<number>;
  uOccDecodeRange: UniformNodeLike<number>;
  /** Per-slab occupancy (`orkestrator.occPerSlab`): the sidecar plane stride
   * along z — slab `s`'s texel is at `pageTexel.z + s · uOccSlabDepth`. 0 on
   * a single-plane page table (every slab reads plane 0 = the union). */
  uOccSlabDepth: UniformNodeLike<number>;
  /** BUILD-time constant (not a uniform — it selects which tap code is
   * emitted): channel slabs per atlas texel, 4 for an rgba8 atlas, else 1.
   * CPU mirror of the addressing: `shaderspec/atlasTap.ts`. */
  atlasChannelsPerTexel: number;
};

/** Public (consumer-facing) shape of the channel-compositor nodes.
 *
 * The eight per-channel scalars are packed into TWO vec4 uniform arrays —
 * every `uniformArray` is its own uniform buffer binding on the WebGPU
 * backend, and eight of them (plus the traversal arrays and three's internal
 * buffers) blew the 12-uniform-buffers-per-stage device limit. */
export type ChannelNodesPublic = {
  colormapAtlas: UniformNodeLike<THREE.Texture>;
  minValue: UniformNodeLike<number>;
  maxValue: UniformNodeLike<number>;
  numChannels: UniformNodeLike<number>;
  blendMode: UniformNodeLike<number>;
  /**
   * The four below are ABSENT on a SLIM material — a volume pass whose every
   * member is fixed-shape (simple intensity / rgb) reads per-member plain
   * uniforms instead and never allocates the two array bindings or the two
   * DataTextures. `updateChannelNodes` and the dispose sites guard on presence.
   */
  /** Per source: x = atlas-slab index (a channel's slab, or a phasor's INTENSITY
   * slab), y = climMin, z = climMax, w = gamma. */
  chParamsA?: UniformArrayNodeLike<THREE.Vector4>;
  /** Per source: x = opacity, y = visible, z = invert, w = colormap row. */
  chParamsB?: UniformArrayNodeLike<THREE.Vector4>;
  /**
   * The phasor half of a source slot, as TEXTURES rather than uniform arrays —
   * three more `uniformArray`s would each be another uniform-buffer binding and
   * blow the WebGPU 12-per-stage limit (see the note above), while a texture
   * costs none. `sourceParams` is 3 texels per row (one row per source):
   *
   *   (kind, gSlab, sSlab, iSlab)
   *   (mode, phaseOffset, modulationFactor, omega)   omega 0 = uncalibrated
   *   (valueMin, valueMax, weightByIntensity, -)
   */
  sourceParams?: UniformNodeLike<THREE.Texture>;
  /** One cursor per row; see `writeCursors` in channelUniforms.ts. */
  cursorParams?: UniformNodeLike<THREE.Texture>;
  cursorCount?: UniformNodeLike<number>;
};

/** Shared traversal uniform nodes for one (layer, mode) pool (node graph —
 * dynamically typed; see module header). */
export function makeTraversalNodes(
  pool: LayerBrickPool,
  dataRange: { minValue: number; maxValue: number },
): any {
  const pageOffsets: THREE.Vector3[] = [];
  const levelShapes: THREE.Vector3[] = [];
  const levelScales: THREE.Vector3[] = [];
  for (let i = 0; i < MAX_BRICK_LEVELS; i++) {
    const level = pool.geometry.levels[i];
    const offset = pool.pageTable.layout.levelOffset[i];
    pageOffsets.push(offset ? v3(offset) : new THREE.Vector3());
    levelShapes.push(level ? v3(level.spatialShape) : new THREE.Vector3());
    levelScales.push(level ? v3(level.scale) : new THREE.Vector3(1, 1, 1));
  }

  return {
    pageTable: pool.pageTable.texture,
    /** RG8 occupancy sidecar (per-brick min/max bracket) — only the volume
     * raymarcher's skip block samples it; inert elsewhere. */
    occupancy: pool.pageTable.occupancy,
    /** RG8 hierarchical-occupancy aggregate (R4, orkestrator.occHierarchy):
     * texel at (level h, cell) bounds the level-(h−1) measured ranges under
     * that cell. LAZILY allocated; referenced only when the flag emits the
     * coarse hop, and the hop emission calls ensureAggregate first — null
     * here is fine for every other material. */
    aggregate: pool.pageTable.aggregate,
    brickAtlas: pool.atlas.texture,
    uNumLevels: uniform(Math.min(pool.geometry.levels.length, MAX_BRICK_LEVELS), "int"),
    uPageOffset: uniformArray(pageOffsets, "ivec3"),
    uLevelShape: uniformArray(levelShapes, "ivec3"),
    uLevelScale: uniformArray(levelScales, "vec3"),
    uBrickPayload: uniform(v3(pool.spec.payload), "ivec3"),
    uSlotSize: uniform(v3(pool.atlas.slotSize), "ivec3"),
    uChannelSlabDepth: uniform(pool.spec.stored[2], "int"),
    uBrickBorder: uniform(pool.spec.border, "int"),
    uAtlasTexels: uniform(v3(pool.atlas.size), "vec3"),
    uAtlasScale: uniform(pool.atlas.dataScale, "float"),
    uEmptyDecodeMin: uniform(dataRange.minValue, "float"),
    uEmptyDecodeRange: uniform(dataRange.maxValue - dataRange.minValue, "float"),
    uEmptyCodeWeights: uniform(
      pool.emptyBits === 24 ? new THREE.Vector3(1, 256, 65536) : new THREE.Vector3(1, 0, 0),
      "vec3",
    ),
    uEmptyCodeMax: uniform(pool.emptyBits === 24 ? 0xffffff : 0xff, "float"),
    uOccDecodeMin: uniform(pool.occEncodeMin, "float"),
    uOccDecodeRange: uniform(pool.occEncodeMax - pool.occEncodeMin, "float"),
    uOccSlabDepth: uniform(
      pool.pageTable.occSlabs > 1 ? pool.pageTable.layout.size[2] : 0,
      "int",
    ),
    atlasChannelsPerTexel: pool.atlas.channelsPerTexel ?? 1,
  };
}

/**
 * Slab addressing inside a slot (CPU mirror: `shaderspec/atlasTap.ts`
 * `atlasTapSlabAddress`): the z offset of slab `slab`'s texel and the
 * component-select mask for `dot(tap, mask)`. At one channel per texel this
 * is the legacy `z += slab · slabDepth` and `.r` — emitted verbatim.
 */
const slabAddress = (t: any, slabIndex: any): { zOffset: any; mask: any | null } => {
  const cpt: number = t.atlasChannelsPerTexel ?? 1;
  if (cpt === 1) {
    return { zOffset: float(int(slabIndex).mul(t.uChannelSlabDepth)), mask: null };
  }
  const group = int(slabIndex).div(int(cpt));
  const comp = int(slabIndex).sub(group.mul(int(cpt)));
  const lane = (k: number) => select(comp.equal(int(k)), float(1.0), float(0.0));
  return {
    zOffset: float(group.mul(t.uChannelSlabDepth)),
    mask: vec4(lane(0), lane(1), lane(2), lane(3)),
  };
};

/** One texel's selected channel: `.r`, or `dot(rgba, mask)` on an rgba8 atlas. */
const selectLane = (tap: any, mask: any | null): any =>
  mask === null ? tap.r : TSL.dot(tap, mask);

/** Channel-compositor uniform nodes; arrays are mutated in place on update
 * (node graph — dynamically typed; see module header). */
function makeChannelNodes(data: ChannelUniformData, slim = false): any {
  const nodes: any = {
    // A shared TextureNode so channel edits can swap the rebuilt colormap
    // atlas via `.value = newAtlas` without rebuilding the material.
    colormapAtlas: texture(data.atlas),
    minValue: uniform(0, "float"),
    maxValue: uniform(1, "float"),
    numChannels: uniform(data.numChannels, "int"),
    blendMode: uniform(data.blendMode, "int"),
  };
  // SLIM: every member is fixed-shape and reads its per-member scalars — the
  // two uniform-buffer bindings and two textures below would be bound to a
  // shader that never references them. Not allocated at all.
  if (slim) return nodes;
  const paramsA: THREE.Vector4[] = [];
  const paramsB: THREE.Vector4[] = [];
  for (let i = 0; i < MAX_CHANNELS; i++) {
    paramsA.push(new THREE.Vector4());
    paramsB.push(new THREE.Vector4());
  }
  nodes.chParamsA = uniformArray(paramsA, "vec4");
  nodes.chParamsB = uniformArray(paramsB, "vec4");
  nodes.sourceParams = texture(data.sourceParams);
  nodes.cursorParams = texture(data.cursors);
  nodes.cursorCount = uniform(data.cursorCount, "int");
  copyChannelArrays(nodes, data);
  return nodes;
}

function copyChannelArrays(
  nodes: Pick<ChannelNodesPublic, "chParamsA" | "chParamsB">,
  data: ChannelUniformData,
): void {
  if (!nodes.chParamsA || !nodes.chParamsB) return;
  for (let i = 0; i < MAX_CHANNELS; i++) {
    nodes.chParamsA.array[i].set(
      data.channelIndex[i] ?? 0,
      data.climMin[i] ?? 0,
      data.climMax[i] ?? 1,
      data.gamma[i] ?? 1,
    );
    nodes.chParamsB.array[i].set(
      data.opacity[i] ?? 1,
      data.visible[i] ?? 0,
      data.invert[i] ?? 0,
      data.row[i] ?? 0,
    );
  }
}

/**
 * Window-only fast path: write fresh clim/gamma/opacity scalars into the
 * existing uniform nodes — no colormap-atlas rebuild, no DataTexture
 * allocations, no `channelData` memo run. The layer calls this when ONLY the
 * window signature moved (`buildChannelWindowSignature`); anything structural
 * still goes through the full `updateChannelNodes` above. Lane layout mirrors
 * `copyChannelArrays`: chParamsA = (slab, climMin, climMax, gamma), chParamsB
 * = (opacity, visible, invert, row). `memberSlots` (the last built merged
 * layout — structural, so still valid) routes the same scalars into the
 * fixed-shape members' plain uniforms, which are all a SLIM material has.
 */
export function updateChannelWindows(
  nodes: ChannelNodesPublic & { members?: VolumeMaterialNodes["members"] },
  windows: ChannelWindowData,
  memberSlots?: readonly { slotFirst: number; slotCount: number }[],
): void {
  if (nodes.chParamsA && nodes.chParamsB) {
    for (let i = 0; i < MAX_CHANNELS; i++) {
      const a = nodes.chParamsA.array[i];
      a.y = windows.climMin[i] ?? 0;
      a.z = windows.climMax[i] ?? 1;
      a.w = windows.gamma[i] ?? 1;
      nodes.chParamsB.array[i].x = windows.opacity[i] ?? 1;
    }
  }
  const members = nodes.members;
  if (members && memberSlots) {
    for (let m = 0; m < members.length; m++) {
      const fixed = members[m].fixed;
      const slots = memberSlots[m];
      if (!fixed || !slots) continue;
      fixed.uClimMin.value = windows.climMin[slots.slotFirst] ?? 0;
      fixed.uClimMax.value = windows.climMax[slots.slotFirst] ?? 1;
      fixed.uGamma.value = windows.gamma[slots.slotFirst] ?? 1;
    }
  }
}

/** Copy fresh channel data into the existing uniform nodes (no rebuild). */
export function updateChannelNodes(nodes: ChannelNodesPublic, data: ChannelUniformData): void {
  adoptFixedSizeTexture(nodes.colormapAtlas, data.atlas);
  nodes.numChannels.value = data.numChannels;
  nodes.blendMode.value = data.blendMode;
  copyChannelArrays(nodes, data);
  // Same in-place adoption as the colormap atlas, and for the same reason: the
  // builders hand us NEW DataTextures on every edit, and swapping the object
  // would leave the compiled material's bind group pointing at a disposed
  // texture. These two are fixed-size, so the copy always applies. A SLIM
  // material has none of them (see makeChannelNodes).
  if (nodes.sourceParams) adoptFixedSizeTexture(nodes.sourceParams, data.sourceParams);
  if (nodes.cursorParams) adoptFixedSizeTexture(nodes.cursorParams, data.cursors);
  if (nodes.cursorCount) nodes.cursorCount.value = data.cursorCount;
}

/**
 * Take over a freshly built DataTexture WITHOUT swapping the bound texture
 * object when the dimensions match: copy the texels into the texture the
 * material is already bound to and dispose the incoming one.
 *
 * Why not just assign? The layers rebuild these as NEW DataTextures on every
 * data change and used to dispose the old one — the texture the compiled
 * material was still bound to. On the WebGPU backend that leaves the bind
 * group pointing at a destroyed GPUTexture, which three silently replaces
 * with its default (white) texture: every channel then samples the SAME white
 * tint and an RGB composite collapses to gray. In-place adoption keeps one
 * long-lived texture bound for the material's whole life; only a size change
 * (rare: a render-graph channel add/remove) swaps the object, disposing the
 * old one AFTER the swap.
 *
 * This is NOT `platform/gpu/measurePalette.setMeasurePalette`, though it
 * guards the same hazard. That one owns a per-material IDENTITY texture it
 * must never dispose, accepts `null` to mean "unbind", compares BYTE LENGTH
 * rather than dimensions, and carries the row's filters across. None of that
 * applies here: these textures are fixed-size, always present, and never
 * change filtering. Folding the two together would need three extra branches
 * and a flag, so they stay separate — deliberately.
 */
function adoptFixedSizeTexture(
  node: UniformNodeLike<THREE.Texture>,
  next: THREE.DataTexture,
): void {
  const bound = node.value as THREE.DataTexture;
  if (bound === next) return;
  const boundImage = bound.image as { width: number; height: number; data: ArrayBufferView };
  const nextImage = next.image as { width: number; height: number; data: ArrayBufferView };
  if (boundImage.width === nextImage.width && boundImage.height === nextImage.height) {
    // Same element type on both sides by construction — each caller rebuilds
    // its own texture, so the pair is always Float32/Float32 or Uint8/Uint8.
    (boundImage.data as unknown as { set(v: ArrayBufferView): void }).set(nextImage.data);
    bound.needsUpdate = true;
    next.dispose();
  } else {
    node.value = next;
    bound.dispose();
  }
}


/** Node handles produced by `emitResolveBrickResidency`. */
export type ResolvedResidency = {
  /** 0 = nothing resident (transparent), 1 = resident, 2 = uniform EMPTY. */
  status: any;
  /** Decoded uniform value when status == 2 (per BRICK — shared by channels). */
  emptyValue: any;
  /** Atlas texel (slot origin + border + in-brick) when status == 1, WITHOUT
   * the channel-slab z offset. Per-channel taps must add the slab offset to a
   * COPY — mutating this shared var would leak offsets across channels. */
  texelBase: any;
  /**
   * Level whose brick cell the empty-space skip may hop over: the level the
   * walk STOPPED at (an EMPTY entry declares its entire cell uniform), or the
   * coarsest level when NOTHING is mapped anywhere along the chain. Hopping by
   * the fine desired level instead crossed a fully-unmapped volume — the
   * first-load / slice-flush frames — in fine-pitch steps, each paying the
   * full level walk above (up to numLevels page-table loads × MAX_RAY_STEPS
   * per fragment).
   */
  hopLevel: any;
  /** Level the walk stopped RESIDENT at (coarsest when not resident) — the
   * zoom-smoothing gate needs its voxel scale. */
  residentLevel: any;
  /** Page-table texel coords of the RESIDENT stop (zero otherwise) — where
   * the occupancy sidecar's texel for this brick lives. */
  pageTexel: any;
  /** Atlas texel of the resident SLOT's origin (no border, no slab offset) —
   * the tricubic tap clamp bounds derive from it. Zero when not resident. */
  slotOriginTexel: any;
};

/**
 * CHANNEL-INDEPENDENT half of `sampleBrickEx` (lockstep with the CPU mirror
 * `BrickResidencyManager.sampleResident`): walk levels desiredLevel→coarsest,
 * page-table `texture3DLoad` per level, stop at the first RESIDENT or EMPTY
 * brick. Everything here — level, brick, slot, EMPTY value — is the same for
 * every channel; only the atlas tap's slab-z differs (`emitChannelTap`).
 * Emitted ONCE per pixel (2D) / per ray step (3D), where it previously ran
 * once PER CHANNEL: the hoist saves (numChannels−1) × levelsWalked page-table
 * loads per pixel/step (×512 steps in 3D).
 *
 * Deliberately a plain JS helper that emits nodes into the CURRENT scope, not
 * a TSL `Fn`: (a) it needs multiple outputs, and (b) TSL inlines Fn bodies —
 * an unnamed internal Loop iterator (default `i`) once SHADOWED the caller's
 * channel loop and made inlined `element(i)` arguments index by resident
 * LEVEL instead of channel (channel flipped with zoom). The walk Loop stays
 * explicitly named `sbLvl`; never pass loop-dependent expressions into
 * inlined Fns without `.toVar()` first.
 *
 * `slabZ` (2D plane material only): `baseVoxel.z` is the INTEGER base slab
 * index, and the level z is picked with the planner's floor chain
 * (`nodePlanning.slabLevelZ`: floor(baseZ / scale), then +0.5 to recenter
 * inside the chosen level texel). Sampling floor((baseZ + 0.5) / scale)
 * instead disagrees with the planner at non-integer z scales (scale 4.22,
 * baseZ 8: planner fetched z=1, shader read z=2) — the lookup lands on an
 * UNMAPPED entry and silently falls back to a coarser level, flipping with
 * zoom.
 */
export function emitResolveBrickResidency(
  t: any,
  baseVoxel: any,
  desiredLevel: any,
  opts?: {
    slabZ?: boolean;
    /** Name prefix for this emission's vars (default "res"). REQUIRED when a
     * material emits the resolver more than once in one scope (the label
     * contour resolves per NEIGHBOUR): TSL auto-renames colliding names —
     * safe, but a console warning per var per extra emission, and the very
     * mechanism this module reserves for catching REAL shadowing bugs. */
    name?: string;
  },
): ResolvedResidency {
  const nm = (base: string) => `${opts?.name ?? "res"}${base}`;
  const status = float(0.0).toVar(nm("Status"));
  const emptyValue = float(0.0).toVar(nm("EmptyValue"));
  const texelBase = vec3(0.0).toVar(nm("TexelBase"));
  // Defaults to the coarsest level: only overwritten when the walk stops at
  // an EMPTY entry, so a fully-unmapped chain hops a coarsest-sized cell.
  const hopLevel = int(t.uNumLevels).sub(1).toVar(nm("HopLevel"));
  const residentLevel = int(t.uNumLevels).sub(1).toVar(nm("ResidentLevel"));
  const slotOriginTexel = vec3(0.0).toVar(nm("SlotOrigin"));
  const pageTexel = vec3(0.0).toVar(nm("PageTexel"));

  Loop(
    {
      start: int(0),
      end: t.uNumLevels,
      type: "int",
      condition: "<",
      name: opts?.name ? `${opts.name}Lvl` : "sbLvl",
    },
    (loopArgs: any) => {
      const sbLvl = loopArgs[opts?.name ? `${opts.name}Lvl` : "sbLvl"];
      If(int(sbLvl).lessThan(desiredLevel), () => {
        Continue();
      });

      const levelScale = vec3(t.uLevelScale.element(sbLvl)).toVar();
      const levelShape = vec3(t.uLevelShape.element(sbLvl)).toVar();
      const scaledVoxel = vec3(baseVoxel).div(levelScale).toVar();
      if (opts?.slabZ) {
        scaledVoxel.z.assign(floor(scaledVoxel.z).add(0.5));
      }
      const levelVoxel = clamp(
        scaledVoxel,
        vec3(0.0),
        levelShape.sub(0.5001),
      ).toVar();
      const brick = ivec3(floor(levelVoxel.div(vec3(t.uBrickPayload)))).toVar();
      // texture3DLoad, NOT textureLoad: the plain TSL textureLoad builds a 2D
      // TextureNode whose fetch coords collapse to ivec2 — invalid WGSL for a
      // texture_3d. Entry components are rgba8unorm floats; decode bytes with
      // round(v * 255).
      const entry = vec4(
        texture3DLoad(t.pageTable, ivec3(t.uPageOffset.element(sbLvl)).add(brick)),
      ).toVar();
      const flag = int(entry.a.mul(255.0).add(0.5)).toVar();

      // EMPTY: uniform-fill brick, its value encoded in the page entry itself
      // (P11) — 8 bits in R for an intensity, 24 across R,G,B for a label id.
      // The hop level is the level the EMPTY entry lives at — its whole cell is
      // uniform, so a non-contributing sample may skip the entire cell.
      //
      // Each byte is ROUNDED out of its unorm before it is weighted. An 8-bit
      // unorm reads back as k/255, and k/255*255 is only approximately k — an
      // error the 65536 weight would amplify into a different id entirely.
      If(flag.equal(int(2)), () => {
        status.assign(2.0);
        const bytes = vec3(
          floor(entry.r.mul(255.0).add(0.5)),
          floor(entry.g.mul(255.0).add(0.5)),
          floor(entry.b.mul(255.0).add(0.5)),
        );
        const code = dot(bytes, vec3(t.uEmptyCodeWeights));
        emptyValue.assign(
          float(t.uEmptyDecodeMin).add(code.div(t.uEmptyCodeMax).mul(t.uEmptyDecodeRange)),
        );
        hopLevel.assign(int(sbLvl));
        Break();
      });

      // RESIDENT: base atlas texel at slot origin + border + in-brick offset.
      // The channel-slab z offset is applied per channel in emitChannelTap.
      If(flag.equal(int(1)), () => {
        const inBrick = levelVoxel.sub(vec3(brick.mul(t.uBrickPayload)));
        const slot = ivec3(entry.xyz.mul(255.0).add(0.5));
        status.assign(1.0);
        residentLevel.assign(int(sbLvl));
        slotOriginTexel.assign(vec3(slot.mul(t.uSlotSize)));
        pageTexel.assign(vec3(ivec3(t.uPageOffset.element(sbLvl)).add(brick)));
        texelBase.assign(
          vec3(slot.mul(t.uSlotSize)).add(float(t.uBrickBorder)).add(inBrick),
        );
        Break();
      });
    },
  );

  return { status, emptyValue, texelBase, hopLevel, residentLevel, slotOriginTexel, pageTexel };
}

/**
 * Per-channel half of the sample: the raw value for one channel slab of an
 * already-resolved residency. Callers guard on `status >= 0.5` before the
 * channel loop; here EMPTY yields the shared uniform value, RESIDENT taps the
 * channel's slab. Emitted inside the channel loop — `slabIndex` must be a
 * `.toVar()` (loop-dependent).
 */
/**
 * Exported for the FIXED-SHAPE materials. They emit a different COMPOSITOR, not
 * a different tap: the atlas addressing, the EMPTY decode and the tricubic
 * clamp-to-slot-interior algebra (pinned by `shaderspec/tricubic.ts`) must stay
 * single-sourced, or a specialised material would sample the atlas by its own
 * slightly-different rules.
 */
export function emitChannelTap(
  t: any,
  resolved: ResolvedResidency,
  slabIndex: any,
  // A phasor source taps THREE slabs in one scope (g, s, intensity), so the tap
  // vars must be uniquely named — two `chRaw`s in one scope would redeclare.
  name = "ch",
  /** Zoom-smoothing gate node (or null when the filter is not emitted):
   * when true at runtime, the resident tap is tricubic instead of trilinear.
   * Only the INTENSITY tap passes this — phasor g/s stay single-tap. */
  smooth: any = null,
): any {
  const raw = float(0.0).toVar(`${name}Raw`);
  If(resolved.status.greaterThan(1.5), () => {
    raw.assign(resolved.emptyValue);
  }).Else(() => {
    // COPY texelBase — addAssign on the shared var would leak this channel's
    // slab offset into the next channel's tap.
    const texel = vec3(resolved.texelBase).toVar(`${name}Texel`);
    const address = slabAddress(t, slabIndex);
    texel.z.addAssign(address.zOffset);
    const singleTap = () => {
      const tap = texture3D(t.brickAtlas, texel.div(t.uAtlasTexels));
      // Fast path: explicit-LOD tap (textureSampleLevel). The atlas has no
      // mips, so level 0 is the same texel data — but the implicit-derivative
      // textureSample this replaces costs derivative math on every tap and is
      // a WGSL uniformity hazard inside the divergent ray loop.
      raw.assign(
        selectLane(tap.level(0), address.mask).mul(
          t.uAtlasScale,
        ),
      );
    };
    if (smooth) {
      If(smooth, () => {
        raw.assign(emitTricubicTap(t, resolved, texel, slabIndex, name, address.mask));
      }).Else(singleTap);
    } else {
      singleTap();
    }
  });
  return raw;
}

/**
 * The three taps of an rgb recipe. On a one-channel-per-texel atlas this is
 * three `emitChannelTap`s; on an RGBA8 atlas (`atlasChannelsPerTexel === 4`)
 * it is ONE `textureSampleLevel` whose `.rgb` lanes are selected per slab —
 * exact because a 3/4-channel pool's slabs all share slab group 0, so the
 * three slab z-offsets coincide (asserted by `atlasKindForGeometry`, which
 * only picks rgba8 for `channelCount ∈ {3, 4}`). Zoom smoothing (tricubic)
 * keeps three taps: the filter reconstructs one lane at a time.
 * CPU mirror of the addressing: `shaderspec/atlasTap.ts`.
 */
export function emitRgbTaps(
  t: any,
  resolved: ResolvedResidency,
  slabs: readonly [any, any, any],
  name: string,
  smooth: any = null,
): { r: any; g: any; b: any } {
  const cpt: number = t.atlasChannelsPerTexel ?? 1;
  if (cpt === 1) {
    return {
      r: emitChannelTap(t, resolved, slabs[0], `${name}R`, smooth),
      g: emitChannelTap(t, resolved, slabs[1], `${name}G`, smooth),
      b: emitChannelTap(t, resolved, slabs[2], `${name}B`, smooth),
    };
  }
  const r = float(0.0).toVar(`${name}RRaw`);
  const g = float(0.0).toVar(`${name}GRaw`);
  const b = float(0.0).toVar(`${name}BRaw`);
  const a0 = slabAddress(t, slabs[0]);
  const a1 = slabAddress(t, slabs[1]);
  const a2 = slabAddress(t, slabs[2]);
  If(resolved.status.greaterThan(1.5), () => {
    r.assign(resolved.emptyValue);
    g.assign(resolved.emptyValue);
    b.assign(resolved.emptyValue);
  }).Else(() => {
    const texel = vec3(resolved.texelBase).toVar(`${name}Texel`);
    texel.z.addAssign(a0.zOffset);
    const singleTap = () => {
      const tap = texture3D(t.brickAtlas, texel.div(t.uAtlasTexels)).level(0);
      r.assign(selectLane(tap, a0.mask).mul(t.uAtlasScale));
      g.assign(selectLane(tap, a1.mask).mul(t.uAtlasScale));
      b.assign(selectLane(tap, a2.mask).mul(t.uAtlasScale));
    };
    if (smooth) {
      If(smooth, () => {
        r.assign(emitTricubicTap(t, resolved, texel, slabs[0], `${name}R`, a0.mask));
        g.assign(emitTricubicTap(t, resolved, texel, slabs[1], `${name}G`, a1.mask));
        b.assign(emitTricubicTap(t, resolved, texel, slabs[2], `${name}B`, a2.mask));
      }).Else(singleTap);
    } else {
      singleTap();
    }
  });
  return { r, g, b };
}

/**
 * Tricubic B-spline reconstruction of one channel slab at `texel` (continuous
 * atlas texel coords, slab offset already applied) — the zoom-smoothing
 * filter: magnified fluorescence renders as smooth blobs instead of the hard
 * blocks trilinear leaves. Classic two-tap decomposition (Sigg & Hadwiger):
 * per axis the four cubic weights collapse into TWO hardware-trilinear taps,
 * so the full filter is 8 taps instead of 64. CPU lockstep mirror + algebra
 * tests: `features/bricks/shaderspec/tricubic.ts`.
 *
 * The atlas border is 1 voxel but cubic support reaches ±1.5, so every tap is
 * CLAMPED to the slot interior (x/y) and the channel slab (z) — edge voxels
 * smooth slightly less rather than bleeding into a neighboring slot/slab.
 * Emitted inside the slot loop: every declaration is uniquely named.
 */
function emitTricubicTap(
  t: any,
  resolved: ResolvedResidency,
  texel: any,
  slabIndex: any,
  name: string,
  /** rgba8 atlases: the component-select mask (`slabAddress`); null = `.r`. */
  mask: any | null = null,
): any {
  // Texel centers sit at half-integers: split into base index + fraction.
  const tc = vec3(texel).sub(0.5).toVar(`${name}CubTc`);
  const base = floor(tc).toVar(`${name}CubI`);
  const f = tc.sub(base).toVar(`${name}CubF`);
  const f2 = f.mul(f);
  const f3 = f2.mul(f);
  const omf = oneMinus(f);
  // Uniform cubic B-spline weights (vectorized over xyz).
  const w0 = omf.mul(omf).mul(omf).div(6.0).toVar(`${name}CubW0`);
  const w1 = f3.mul(3.0).sub(f2.mul(6.0)).add(4.0).div(6.0).toVar(`${name}CubW1`);
  const w2 = f3.mul(-3.0).add(f2.mul(3.0)).add(f.mul(3.0)).add(1.0).div(6.0).toVar(`${name}CubW2`);
  const w3 = f3.div(6.0).toVar(`${name}CubW3`);
  const g0 = w0.add(w1).toVar(`${name}CubG0`);
  // Two tap positions per axis (+0.5 restores texel-center coords). The
  // denominators are ≥ 1/6 for f ∈ [0,1) — no epsilon needed.
  const h0 = base.sub(1.0).add(w1.div(g0)).add(0.5).toVar(`${name}CubH0`);
  const h1 = base.add(1.0).add(w3.div(w2.add(w3))).add(0.5).toVar(`${name}CubH1`);

  // Clamp to the slot interior / channel slab (border 1 < cubic support 1.5).
  const slabStart = vec3(resolved.slotOriginTexel).z.add(slabAddress(t, slabIndex).zOffset);
  const clampMin = vec3(
    vec3(resolved.slotOriginTexel).x.add(0.5),
    vec3(resolved.slotOriginTexel).y.add(0.5),
    slabStart.add(0.5),
  ).toVar(`${name}CubMin`);
  const clampMax = vec3(
    vec3(resolved.slotOriginTexel).x.add(vec3(t.uSlotSize).x).sub(0.5),
    vec3(resolved.slotOriginTexel).y.add(vec3(t.uSlotSize).y).sub(0.5),
    slabStart.add(float(t.uChannelSlabDepth)).sub(0.5),
  ).toVar(`${name}CubMax`);
  h0.assign(clamp(h0, clampMin, clampMax));
  h1.assign(clamp(h1, clampMin, clampMax));

  const g1 = oneMinus(g0);
  const tap = (x: any, y: any, z: any) =>
    selectLane(texture3D(t.brickAtlas, vec3(x, y, z).div(t.uAtlasTexels)).level(0), mask);
  // 8 taps, weighted by the per-axis g products.
  const acc = tap(h0.x, h0.y, h0.z).mul(g0.x).mul(g0.y).mul(g0.z)
    .add(tap(h1.x, h0.y, h0.z).mul(g1.x).mul(g0.y).mul(g0.z))
    .add(tap(h0.x, h1.y, h0.z).mul(g0.x).mul(g1.y).mul(g0.z))
    .add(tap(h1.x, h1.y, h0.z).mul(g1.x).mul(g1.y).mul(g0.z))
    .add(tap(h0.x, h0.y, h1.z).mul(g0.x).mul(g0.y).mul(g1.z))
    .add(tap(h1.x, h0.y, h1.z).mul(g1.x).mul(g0.y).mul(g1.z))
    .add(tap(h0.x, h1.y, h1.z).mul(g0.x).mul(g1.y).mul(g1.z))
    .add(tap(h1.x, h1.y, h1.z).mul(g1.x).mul(g1.y).mul(g1.z));
  return acc.mul(t.uAtlasScale);
}

/** What one compositor slot contributes at one sample point. */
type SourceSample = {
  /** The slot's color, already cursor-painted for a phasor. */
  color: any;
  /** Blend weight (opacity × the normalized intensity). */
  weight: any;
  /** Normalized intensity — the ray weight the 3D projections rank samples by. */
  norm: any;
};

/**
 * Sample one compositor slot: a CHANNEL (one slab through the transfer
 * function, colored by its colormap) or a PHASOR (three slabs — g, s and the
 * mean photon count — colored by the phasor's value, and repainted where a
 * cursor covers it).
 *
 * Both kinds end up in the same shape — color + weight — which is what lets the
 * two blend under one blend mode, and lets a phasor source behave like any
 * other leaf under MIP / volume / iso projection: its *intensity* is the ray
 * weight, its *phasor* is only the hue.
 *
 * Emitted inside the slot loop, so every loop-dependent value is `.toVar()`
 * (see the shadowing note on emitResolveBrickResidency).
 */
function emitSourceSample(
  t: any,
  c: any,
  resolved: ResolvedResidency,
  slot: any,
  fns: { channelNormalize: any; phasorValue: any; cursorHit: any },
  // A merged pass emits this body once per MEMBER, so every declaration here
  // exists once per member in one shader. `nm` mints names through the
  // member's NameScope, which throws on a collision rather than letting TSL
  // silently rename (and, historically, silently shadow).
  nm: (name: string) => string = (name) => name,
  // COMPILE-TIME phasor specialization: false (a member whose slots hold no
  // phasor sources — `hasPhasorSources`) omits the whole phasor branch from
  // the WGSL: the kind textureLoad, two extra atlas taps, atan/tan/sqrt, and
  // the 16×24 nested cursor loop. The branch was runtime-skipped anyway, but
  // it inflated register pressure and instruction footprint inside the
  // step×slot loop of EVERY volume shader. The material is rebuilt when a
  // phasor source appears (bundle memo keys on hasPhasorSources).
  emitPhasor = true,
  /** Zoom-smoothing gate node (null = filter not emitted) — see emitChannelTap. */
  smooth: any = null,
): SourceSample {
  const paramsA = vec4(c.chParamsA.element(slot)).toVar(nm("srcA")); // (slab, climMin, climMax, gamma)
  const paramsB = vec4(c.chParamsB.element(slot)).toVar(nm("srcB")); // (opacity, visible, invert, row)

  // The intensity tap: a channel's slab, or a phasor's mean-photon-count slab.
  // Either way the ordinary clim/gamma/invert transfer applies to it.
  const rawIntensity = emitChannelTap(
    t,
    resolved,
    int(paramsA.x).toVar(nm("srcSlab")),
    nm("srcI"),
    smooth,
  );
  const norm = float(fns.channelNormalize(slot, rawIntensity)).toVar(nm("srcNorm"));

  const color = vec3(0.0).toVar(nm("srcColor"));
  const weight = float(0.0).toVar(nm("srcWeight"));

  if (!emitPhasor) {
    color.assign(c.colormapAtlas.sample(vec2(norm, paramsB.w)).rgb);
    weight.assign(paramsB.x.mul(norm));
    return { color, weight, norm };
  }

  const p0 = vec4(textureLoad(c.sourceParams, ivec2(int(0), slot))).toVar(nm("srcP0"));

  If(int(p0.x).equal(int(SOURCE_KIND_PHASOR)), () => {
    const p1 = vec4(textureLoad(c.sourceParams, ivec2(int(1), slot))).toVar(nm("srcP1"));
    const p2 = vec4(textureLoad(c.sourceParams, ivec2(int(2), slot))).toVar(nm("srcP2"));

    const rawG = emitChannelTap(t, resolved, int(p0.y).toVar(nm("srcGSlab")), nm("srcG"));
    const rawS = emitChannelTap(t, resolved, int(p0.z).toVar(nm("srcSSlab")), nm("srcS"));

    const value = float(fns.phasorValue(rawG, rawS, p1)).toVar(nm("srcValue"));
    const valueNorm = clamp(
      value.sub(p2.x).div(max(p2.y.sub(p2.x), 0.000001)),
      0.0,
      0.999,
    ).toVar(nm("srcValueNorm"));
    color.assign(c.colormapAtlas.sample(vec2(valueNorm, paramsB.w)).rgb);

    // A cursor repaints the pixels of phasor space it covers. Test against the
    // CALIBRATED phasor — the same (g, s) the plot draws the cursor in.
    const cursor = vec4(fns.cursorHit(slot, rawG, rawS)).toVar(nm("srcCursor"));
    If(cursor.w.greaterThan(0.5), () => {
      color.assign(cursor.xyz);
    });

    // weightByIntensity (p2.z): off, the lifetime hue is painted flat wherever
    // there are photons at all — which is what you want when the interesting
    // structure is dim. The intensity still gates the pixel (norm > 0), so
    // background does not bloom.
    const gate = select(norm.greaterThan(0.0), float(1.0), float(0.0));
    weight.assign(paramsB.x.mul(select(p2.z.greaterThan(0.5), norm, gate)));
  }).Else(() => {
    color.assign(c.colormapAtlas.sample(vec2(norm, paramsB.w)).rgb);
    weight.assign(paramsB.x.mul(norm));
  });

  return { color, weight, norm };
}

/**
 * The scalar transfer, as ONE emitter shared by every compositor: raw → range
 * norm → clim window → gamma. CPU mirror: `shaderspec/raymarchStep.ts`
 * `normalizeSlotValue` (minus its invert step, which only the general path
 * emits — see `makeChannelNormalize`).
 *
 * The general path reads its window/gamma out of `chParamsA.element(slot)`;
 * the fixed-shape paths (intensity, rgb) hand in plain uniform nodes instead.
 * Both go through THIS function, so the arithmetic — the two clamps, the
 * `max(…, 1e-5)` guards against a degenerate window, the `0.999` ceiling, the
 * `max(gamma, 1e-4)` — cannot drift between them; any difference would be a
 * colour difference between the two paths, which is exactly what the
 * fixed-shape kill switch exists to bisect and what must never actually happen.
 *
 * `gamma === null` omits the `pow` entirely: an `"rgb"` recipe has gamma 1 by
 * construction (`resolveRenderKind`), and `pow(x, 1)` is `x` exactly, so the
 * omission is bit-identical, not an approximation.
 */
export const emitScalarNormalize = (
  range: { minValue: any; maxValue: any },
  window: { climMin: any; climMax: any; gamma: any | null },
  rawValue: any,
): any => {
  const baseNorm = clamp(
    float(rawValue)
      .sub(range.minValue)
      .div(max(float(range.maxValue).sub(range.minValue), 0.00001)),
    0.0,
    1.0,
  );
  const climMin = float(window.climMin);
  const climRange = max(float(window.climMax).sub(climMin), 0.00001);
  const normalized = clamp(baseNorm.sub(climMin).div(climRange), 0.0, 0.999).toVar();
  if (window.gamma !== null) {
    normalized.assign(pow(normalized, max(float(window.gamma), 0.0001)));
  }
  return normalized;
};

/** The cinematic light rig as scalar uniform nodes.
 *
 * INVARIANT C6 — every one of these is a scalar or a plain vec3 `uniform()`,
 * never a `uniformArray`. Scalar uniforms share one object UBO and are free;
 * each `uniformArray` is its OWN binding, and this material already sits near
 * the WebGPU 12-uniform-buffers-per-stage limit with five of them
 * (`uPageOffset`, `uLevelShape`, `uLevelScale`, `chParamsA`, `chParamsB`).
 */
export type CinematicUniforms = {
  /** 0 = SCIENTIFIC (unlit), 1 = CINEMATIC. Dynamically uniform across the
   * draw, so the branch is coherent on GPU — no divergence, and one material
   * per pool `structureSignature` still holds. */
  uCinematic: UniformNodeLike<number>;
  /** Physical size of one BASE voxel, per axis (C3). */
  uBaseScale: UniformNodeLike<THREE.Vector3>;
  uAmbient: UniformNodeLike<number>;
  uSpecular: UniformNodeLike<number>;
  uShininess: UniformNodeLike<number>;
  uSurfaceGain: UniformNodeLike<number>;
  /** Diffuse weight for the MAX projections — see `LightRig.mipShading`. */
  uMipShading: UniformNodeLike<number>;
};

// ---------------------------------------------------------------------------
// Cinematic shading (CPU mirror: `platform/gpu/shading.ts`)
// ---------------------------------------------------------------------------

/**
 * Central-difference gradient of the NORMALIZED field, six taps off the
 * already-resolved `texelBase`.
 *
 * Emits NO Loop of its own — that is the only reason it is safe to inline
 * inside the ray loop (see the `emitResolveBrickResidency` shadowing hazard in
 * `OCTREE_RENDERER.md`).
 *
 * ZERO extra page-table walks: 3D bricks carry a 1-voxel replicated border
 * holding real neighbour data (`octree/brickSpec.ts`, `border = 1`) and the 3D
 * atlas is always linear-filtered (`brickResidency.ts`,
 * `filter: spec.border > 0 ? "linear" : "nearest"`). Six taps at ±0.5 texel
 * land inside that border, which is what the border is FOR. At the volume's
 * outer boundary the border is edge-replicated, so the outward gradient is
 * zero — correct, there is no data out there.
 *
 * NORMALIZED, not raw: the iso surface is DEFINED in normalized space
 * (`sampleNorm >= isoThreshold`), so the normal must be the gradient of that
 * same field. The transfer is monotone, so raw would give the right direction
 * except where clim clamps — where the raw gradient is nonzero but the visible
 * field is flat, and you would light a region that is not there.
 *
 * The taps are deliberately SINGLE-tap (never tricubic): a tricubic gradient
 * would be 48 fetches.
 *
 * @param normalize maps a raw atlas value to the sample's normalized field.
 * @returns d(norm)/d(level voxel).
 */
function emitFieldGradient(
  t: any,
  resolved: ResolvedResidency,
  slabIndex: any,
  normalize: (raw: any) => any,
  name: string,
): any {
  const g = vec3(0.0).toVar(`${name}GradLvl`);
  // An EMPTY brick (status 2) is a uniform field: no surface, no normal. A
  // non-resident one (status 0) has nothing to differentiate at all.
  If(resolved.status.greaterThanEqual(0.5).and(resolved.status.lessThan(1.5)), () => {
    const base = vec3(resolved.texelBase).toVar(`${name}GradBase`);
    const address = slabAddress(t, slabIndex);
    base.z.addAssign(address.zOffset);
    const tap = (offset: any) =>
      float(
        normalize(
          selectLane(
            texture3D(t.brickAtlas, base.add(offset).div(t.uAtlasTexels)).level(0),
            address.mask,
          ).mul(t.uAtlasScale),
        ),
      );
    const h = float(GRADIENT_H);
    const hn = float(-GRADIENT_H);
    g.assign(
      vec3(
        tap(vec3(h, 0.0, 0.0)).sub(tap(vec3(hn, 0.0, 0.0))),
        tap(vec3(0.0, h, 0.0)).sub(tap(vec3(0.0, hn, 0.0))),
        tap(vec3(0.0, 0.0, h)).sub(tap(vec3(0.0, 0.0, hn))),
      ).mul(float(0.5 / GRADIENT_H)),
    );
  });
  return g;
}

/**
 * Blinn-Phong headlight key + fixed object-space fill, gated by Levoy
 * surfaceness. TSL port of `shadeSample` in `platform/gpu/shading.ts`.
 *
 * INVARIANT C1: returns a COLOUR. The caller must never feed this back into
 * `sampleNorm`, `weight`, `volAlpha` or the iso hit test.
 * INVARIANT C3: the normal comes from the PHYSICAL gradient (anisotropic z is
 * routine in microscopy; a base-voxel normal visibly tilts toward the thin axis).
 * INVARIANT C5: surfaceness is gated on the LEVEL-voxel gradient, which keeps
 * `uSurfaceGain` a constant instead of a per-dataset knob.
 *
 * @param gradLevel d(norm)/d(level voxel).
 * @param voxelExtent level voxel size in physical units (levelScale · baseScale).
 * @param view unit vector from the sample TOWARD the eye.
 */
function emitShade(
  u: any,
  baseColor: any,
  gradLevel: any,
  voxelExtent: any,
  view: any,
  /**
   * How much of the diffuse term to apply: `null` (VOLUME / ISOSURFACE) means
   * the full term; `u.uMipShading` compresses it toward 1 for the MAX
   * projections. See `LightRig.mipShading` in the CPU mirror.
   */
  diffuseWeight: any = null,
): any {
  const out = vec3(baseColor).toVar("shadedColor");
  const s = clamp(length(gradLevel).mul(u.uSurfaceGain), 0.0, 1.0).toVar("surfaceness");
  // Where the field is flat — homogeneous interior, noise floor — there is no
  // surface, and lighting a noise gradient turns dim tissue into glitter.
  If(s.greaterThan(0.0), () => {
    const gPhys = gradLevel.div(max(voxelExtent, vec3(1e-9))).toVar("gradPhys");
    const n = TSL.normalize(gPhys).toVar("shadeNormal");
    // Face N at the viewer: the gradient points UP the intensity ramp — into
    // the object from outside, out of it from inside — so a surface would
    // otherwise go black purely because the ray entered from the dense side.
    // Only dot products follow, so this survives a consistent reflection (C4).
    If(dot(n, view).lessThan(0.0), () => {
      n.assign(n.negate());
    });

    const fill = vec3(FILL_DIRECTION[0], FILL_DIRECTION[1], FILL_DIRECTION[2]);
    const w = float(FILL_WEIGHT);
    const total = float(1.0 + FILL_WEIGHT);

    // Key = the view vector (headlight); fill = fixed in the SPECIMEN frame.
    // A pure headlight is flat exactly at frame centre (dot(N,V) = 1, no shape
    // cue where you are looking); a pure fixed key can leave the specimen
    // black. The specimen is static, so the fill reads as "lit in a room"
    // while you orbit, at no per-frame CPU cost.
    const ndlKey = max(dot(n, view), 0.0).toVar("ndlKey");
    const ndlFill = max(dot(n, fill), 0.0).toVar("ndlFill");
    const diffuseFull = mix(
      u.uAmbient,
      float(1.0),
      clamp(ndlKey.add(w.mul(ndlFill)).div(total), 0.0, 1.0),
    ).toVar("diffuseFull");
    // `mix(1, diffuse, weight)` and NOT `diffuse * weight`: at weight 0 the
    // colour must pass through UNTOUCHED (a max projection keeps reading as
    // intensity), not go black. Specular is deliberately not weighted — it
    // adds light, so it can never darken a MIP below its true value.
    const diffuse = (
      diffuseWeight ? mix(float(1.0), diffuseFull, clamp(diffuseWeight, 0.0, 1.0)) : diffuseFull
    ).toVar("diffuse");

    // Blinn's half vector. For the key it reduces to H = V.
    const specKey = pow(max(dot(n, view), 0.0), u.uShininess);
    const specFill = pow(max(dot(n, TSL.normalize(fill.add(view))), 0.0), u.uShininess);
    const specular = u.uSpecular
      .mul(specKey.mul(select(ndlKey.greaterThan(0.0), float(1.0), float(0.0))))
      .add(
        u.uSpecular.mul(w).mul(specFill.mul(select(ndlFill.greaterThan(0.0), float(1.0), float(0.0)))),
      )
      .div(total)
      .toVar("specular");

    const shaded = baseColor.mul(diffuse).add(vec3(specular));
    out.assign(mix(baseColor, shaded, s));
  });
  return out;
}

/** TSL port of `channelNormalize` (lockstep with core mirrors). */
function makeChannelNormalize(c: any) {
  return Fn(([i, rawValue]: any[]) => {
    const paramsA = vec4(c.chParamsA.element(i)).toVar(); // (channel, climMin, climMax, gamma)
    const normalized = emitScalarNormalize(
      c,
      { climMin: paramsA.y, climMax: paramsA.z, gamma: paramsA.w },
      rawValue,
    );
    If(vec4(c.chParamsB.element(i)).z.greaterThan(0.5), () => {
      normalized.assign(oneMinus(normalized));
    });
    return normalized;
  });
}

const TAU = Math.PI * 2;

/**
 * TSL port of `platform/model/phasor.ts` — keep the two in lockstep.
 *
 * Takes the three slabs the repack produced for a phasor node (g, s and the
 * mean photon count is tapped by the caller) and returns the scalar its
 * colormap maps: a lifetime (τ_φ / τ_m / their mean) when the instrument is
 * known, and the raw phase-as-a-fraction / modulus when it is not (an
 * uncalibrated phasor still renders — its hue is just not an absolute lifetime).
 *
 * `p1` is the source's (mode, phaseOffset, modulationFactor, omega) texel.
 */
const makePhasorValue = (nm: (name: string) => string = (name) => name) => {
  // Minted ONCE per factory call — the Fn body is inlined at each call site,
  // so names baked in here are per-member by construction.
  const N = {
    g: nm("phG"),
    s: nm("phS"),
    phase: nm("phPhase"),
    mod: nm("phMod"),
    phaseValue: nm("phPhaseValue"),
    modValue: nm("phModValue"),
  };
  return Fn(([rawG, rawS, p1]: any[]) => {
    const phaseOffset = float(vec4(p1).y);
    const modulationFactor = float(vec4(p1).z);
    const omega = float(vec4(p1).w);
    const mode = int(vec4(p1).x);

    // Instrument response: rotate by the phase offset, scale by the modulation
    // factor (calibratePhasor).
    const co = cos(phaseOffset);
    const si = sin(phaseOffset);
    const g = modulationFactor.mul(float(rawG).mul(co).sub(float(rawS).mul(si))).toVar(N.g);
    const s = modulationFactor.mul(float(rawG).mul(si).add(float(rawS).mul(co))).toVar(N.s);

    const phase = atan(s, g).toVar(N.phase);
    If(phase.lessThan(0.0), () => {
      phase.assign(phase.add(TAU));
    });
    const modulation = sqrt(g.mul(g).add(s.mul(s))).toVar(N.mod);

    // Uncalibrated (omega == 0): the phasor is only readable in its own terms.
    const phaseValue = float(0.0).toVar(N.phaseValue);
    const modulationValue = float(0.0).toVar(N.modValue);

    If(omega.lessThanEqual(0.0), () => {
      phaseValue.assign(phase.div(TAU));
      modulationValue.assign(modulation);
    }).Else(() => {
      // tau_phi = tan(phase)/omega. Past the semicircle's apex (phase > pi/2)
      // tan goes negative — there is no positive phase lifetime there, so clamp
      // to 0 instead of feeding ±Inf into a colormap lookup.
      phaseValue.assign(max(tan(phase), 0.0).div(omega));
      // tau_m = sqrt(1/m^2 - 1)/omega.
      const m = clamp(modulation, 0.000001, 1.0);
      modulationValue.assign(sqrt(max(float(1.0).div(m.mul(m)).sub(1.0), 0.0)).div(omega));
    });

    return select(
      mode.equal(int(PHASOR_MODE_MODULATION)),
      modulationValue,
      select(
        mode.equal(int(PHASOR_MODE_AVERAGE)),
        phaseValue.add(modulationValue).mul(0.5),
        phaseValue,
      ),
    );
  });
};

/**
 * Does this pixel's (calibrated) phasor fall inside any of the source's
 * cursors? Returns the cursor's color in rgb and a hit flag in a — a cursor is
 * a color RULE on the image, not a plot widget, so a hit repaints the pixel.
 *
 * Mirrors `cursorHit`: circles by distance, polygons by the even-odd crossing
 * test. Vertices are packed two per texel after the two header texels.
 */
const makeCursorHit = (c: any, nm: (name: string) => string = (name) => name) => {
  // Minted ONCE per factory call, for the same reason as makePhasorValue: the
  // Fn body is inlined at every call site, so a merged pass would otherwise
  // declare these names once per member in one scope.
  const N = {
    result: nm("curResult"),
    cur: nm("cur"),
    head: nm("curHead"),
    style: nm("curStyle"),
    centre: nm("curCentre"),
    inside: nm("curInside"),
    count: nm("curCount"),
    cross: nm("curCross"),
    cpt: nm("cpt"),
    cptJ: nm("cptJ"),
    pi: nm("curPi"),
    pj: nm("curPj"),
  };
  return Fn(([slot, g, s]: any[]) => {
    const result = vec4(0.0).toVar(N.result);

    Loop(
      { start: int(0), end: int(MAX_CURSORS), type: "int", condition: "<", name: N.cur },
      // Loop hands the iterator back keyed by its NAME, which is now
      // member-prefixed — destructuring a literal `cur` would silently yield
      // undefined and feed it straight into ivec2().
      (args: any) => {
        const cur = args[N.cur];
        If(int(cur).greaterThanEqual(c.cursorCount), () => {
          Break();
        });
        const header = vec4(textureLoad(c.cursorParams, ivec2(int(0), cur))).toVar(N.head);
        // (kind, source slot, point count, visible)
        If(int(header.y).notEqual(int(slot)).or(header.w.lessThan(0.5)), () => {
          Continue();
        });
        const style = vec4(textureLoad(c.cursorParams, ivec2(int(1), cur))).toVar(N.style);
        const centre = vec4(textureLoad(c.cursorParams, ivec2(int(2), cur))).toVar(N.centre);

        const inside = bool(false).toVar(N.inside);

        If(int(header.x).equal(int(CURSOR_KIND_POLYGON)), () => {
          const count = int(header.z).toVar(N.count);
          const crossings = int(0).toVar(N.cross);
          // Even-odd: count the edges the ray from (g, s) crosses. `j` trails
          // `i` by one vertex, wrapping at the end.
          Loop(
            {
              start: int(0),
              end: int(MAX_CURSOR_POINTS),
              type: "int",
              condition: "<",
              name: N.cpt,
            },
            (args: any) => {
              const cpt = args[N.cpt];
              If(int(cpt).greaterThanEqual(count), () => {
                Break();
              });
              const j = select(int(cpt).equal(int(0)), count.sub(1), int(cpt).sub(1)).toVar(N.cptJ);
              const pi = phasorPolygonPoint(c, cur, int(cpt)).toVar(N.pi);
              const pj = phasorPolygonPoint(c, cur, j).toVar(N.pj);
              const crosses = pi.y
                .greaterThan(float(s))
                .notEqual(pj.y.greaterThan(float(s)));
              If(crosses, () => {
                const x = pj.x
                  .sub(pi.x)
                  .mul(float(s).sub(pi.y))
                  .div(pj.y.sub(pi.y).add(0.000001))
                  .add(pi.x);
                If(float(g).lessThan(x), () => {
                  crossings.assign(crossings.add(int(1)));
                });
              });
            },
          );
          inside.assign(crossings.mod(int(2)).equal(int(1)));
        }).Else(() => {
          const radius = style.w;
          const dg = float(g).sub(centre.x);
          const ds = float(s).sub(centre.y);
          inside.assign(
            radius.greaterThan(0.0).and(dg.mul(dg).add(ds.mul(ds)).lessThanEqual(radius.mul(radius))),
          );
        });

        If(inside, () => {
          result.assign(vec4(style.xyz, 1.0));
          Break();
        });
      },
    );

    return result;
  });
};

/** Vertex `index` of a polygon cursor: two (g, s) pairs per texel, after the
 * two header texels and the centre texel. */
const phasorPolygonPoint = (c: any, cursor: any, index: any) => {
  const texel = int(index).div(int(2)).add(int(3));
  const value = vec4(textureLoad(c.cursorParams, ivec2(texel, cursor)));
  return select(int(index).mod(int(2)).equal(int(0)), value.xy, value.zw);
};

/** Motion-invariant jitter source (the classic sin/dot/fract hash). */
const rand2 = Fn(([co]: any[]) => {
  return fract(
    sin(dot(vec2(co), vec2(12.9898, 78.233))).mul(43758.5453),
  );
});

export const commonMaterialSettings = (material: NodeMaterial) => {
  material.transparent = true;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;
  material.lights = false;
  // NOTE: this is a NO-OP on the WebGPU backend and does NOT do what the name
  // suggests. `toneMapped` is read only by WebGLRenderer/WebGLPrograms; nothing
  // under renderers/common or nodes/ looks at it. The output transform runs as
  // a separate full-screen pass (`Renderer._renderOutput`) driven by
  // `needsFrameBufferTarget`, which is on because R3F applies ACES + sRGB — so
  // this material's additive result IS tone-mapped and sRGB-encoded regardless.
  // Kept only as a declaration of intent, and because it would matter if the
  // WebGL2 fallback path is ever exercised. Under the volume compositor
  // (orkestrator.volumeTarget) the volume passes render into a LINEAR
  // offscreen target and only the canvas composite goes through that output
  // pass — tone mapping still applies exactly once, at the end.
  material.toneMapped = false;
};

// ---------------------------------------------------------------------------
// 2D plane compositor
// ---------------------------------------------------------------------------

export type PlaneMaterialNodes = TraversalNodesPublic &
  ChannelNodesPublic & {
    uDesiredLevel: UniformNodeLike<number>;
    uSlabBaseZ: UniformNodeLike<number>;
    uBaseShape: UniformNodeLike<THREE.Vector3>;
  };

export type PlaneMaterialBundle = { material: NodeMaterial; nodes: PlaneMaterialNodes };

export function createPlaneNodeMaterial(
  pool: LayerBrickPool,
  dataRange: { minValue: number; maxValue: number },
  channelData: ChannelUniformData,
): PlaneMaterialBundle {
  const t = makeTraversalNodes(pool, dataRange);
  const c = makeChannelNodes(channelData);
  c.minValue.value = dataRange.minValue;
  c.maxValue.value = dataRange.maxValue;
  const fns = {
    channelNormalize: makeChannelNormalize(c),
    phasorValue: makePhasorValue(),
    cursorHit: makeCursorHit(c),
  };

  const uDesiredLevel = uniform(0, "int");
  /** INTEGER base slab z — the slab-mode resolve does the per-level floor +
   * recenter itself (see emitResolveBrickResidency), so no +0.5 here. */
  const uSlabBaseZ = uniform(0, "float");
  const uBaseShape = uniform(new THREE.Vector3(1, 1, 1), "vec3");

  const material = new NodeMaterial();
  commonMaterialSettings(material);
  material.depthTest = false;
  // The quad wears the layer's placement verbatim (no client-side flips —
  // COORDINATE_SYSTEMS.md §0). A reflected registration (negative determinant,
  // e.g. a Visium bin lattice fitted upside-down onto its H&E) flips the
  // triangle winding, and three.js' default FrontSide would cull the whole
  // layer. The slab is screen-space with depth test off, so both sides is free.
  material.side = THREE.DoubleSide;

  material.fragmentNode = Fn(() => {
    // Quad uv → base voxel space. Corner-anchored, no flip: voxel row 0 is at
    // uv.y = 0 (COORDINATE_SYSTEMS.md "Coordinate conventions" — any raster
    // y-down convention is the server's to express in the transforms).
    const baseVoxel = vec3(
      uv().x.mul(uBaseShape.x),
      uv().y.mul(uBaseShape.y),
      uSlabBaseZ,
    ).toVar("pxBaseVoxel");

    const accum = select(
      int(c.blendMode).equal(1),
      vec3(1.0),
      vec3(0.0),
    ).toVar("accum");

    // Residency is channel-independent: resolve ONCE per pixel, tap per
    // channel. Nothing resident → transparent (accum stays initial).
    const resolved = emitResolveBrickResidency(t, baseVoxel, uDesiredLevel, {
      slabZ: true,
    });

    If(resolved.status.greaterThanEqual(0.5), () => {
      Loop(
        { start: int(0), end: int(MAX_CHANNELS), type: "int", condition: "<", name: "ch" },
        ({ ch }: any) => {
          If(int(ch).greaterThanEqual(c.numChannels), () => {
            Break();
          });
          If(vec4(c.chParamsB.element(ch)).y.lessThan(0.5), () => {
            Continue();
          });

          const sample = emitSourceSample(t, c, resolved, ch, fns);
          const color = sample.color;
          const weight = sample.weight;

          If(int(c.blendMode).equal(1), () => {
            accum.mulAssign(mix(vec3(1.0), color, weight));
          })
            .ElseIf(int(c.blendMode).equal(2), () => {
              accum.assign(accum.mul(oneMinus(weight)).add(color.mul(weight)));
            })
            .Else(() => {
              accum.addAssign(color.mul(weight));
            });
        },
      );
    });

    return vec4(accum, 1.0);
  })();

  return {
    material,
    nodes: { ...t, ...c, uDesiredLevel, uSlabBaseZ, uBaseShape } as PlaneMaterialNodes,
  };
}

// ---------------------------------------------------------------------------
// 3D raymarcher
// ---------------------------------------------------------------------------

export type VolumeMaterialNodes = TraversalNodesPublic &
  ChannelNodesPublic &
  CinematicUniforms & {
    uDesiredLevel: UniformNodeLike<number>;
    uLodBias: UniformNodeLike<number>;
    uPxPerVoxelAtUnitDist: UniformNodeLike<number>;
    /** Per-axis world size of one base voxel (world-metric LOD; (1,1,1) =
     * legacy voxel metric — how `orkestrator.worldLod` off is pushed). */
    uVoxelWorldSize: UniformNodeLike<THREE.Vector3>;
    uMinDelta: UniformNodeLike<number>;
    uStepScale: UniformNodeLike<number>;
    uMaxSteps: UniformNodeLike<number>;
    /** Zoom-smoothing engagement threshold (px per resolved voxel; 0 = off). */
    uSmoothThreshold: UniformNodeLike<number>;
    uBaseShape: UniformNodeLike<THREE.Vector3>;
    /** Member 0's projection mode — the single-layer alias. */
    projectionMode: UniformNodeLike<number>;
    /** Member 0's iso threshold — the single-layer alias. */
    isoThreshold: UniformNodeLike<number>;
    /** Per-member scalars for a merged pass; length 1 for a single layer. */
    members: {
      slotFirst: UniformNodeLike<number>;
      slotCount: UniformNodeLike<number>;
      blendMode: UniformNodeLike<number>;
      projectionMode: UniformNodeLike<number>;
      isoThreshold: UniformNodeLike<number>;
      /**
       * The FIXED-SHAPE member's transfer as plain uniforms (see
       * `fixedMemberUniforms`): what the `emitSimple` / `emitRgb` arms read
       * instead of `chParamsA/B.element(slot)`. Always present (plain uniforms
       * cost no binding, and an unreferenced one is not emitted); only
       * meaningful for a member compiled as fixed-shape.
       */
      fixed: {
        uSlab0: UniformNodeLike<number>;
        uSlab1: UniformNodeLike<number>;
        uSlab2: UniformNodeLike<number>;
        uClimMin: UniformNodeLike<number>;
        uClimMax: UniformNodeLike<number>;
        uGamma: UniformNodeLike<number>;
        uRow: UniformNodeLike<number>;
      };
    }[];
  };

export type VolumeMaterialBundle = { material: NodeMaterial; nodes: VolumeMaterialNodes };

/**
 * One raymarch pass for one or more co-pool layers.
 *
 * `memberCount > 1` MERGES layers that share a brick pool into a single pass.
 * They share the atlas, page table, geometry, brick spec and value range (that
 * is what `buildPoolKey` asserts), so N passes walked the same volume N times:
 * N full rasterizations of the same screen region and N page-table level walks
 * per ray step, with no early-Z to save any of it (additive + depthWrite off +
 * Discard). Merged, the ray is walked ONCE and every member accumulates from
 * the shared residency resolve.
 *
 * Members are unrolled in JS rather than looped in the shader: each needs its
 * own set of projection accumulators, which a dynamic loop would have to keep
 * in indexable local arrays. The per-member CHANNEL loop stays dynamic over
 * `slotFirst`/`slotCount` uniforms, so adding or removing a channel does not
 * rebuild the material — only a membership change does.
 *
 * Semantics preserved exactly:
 *  - Each member keeps its own projection mode, blend mode and iso threshold.
 *  - Each member's early-out (MIP saturation, VOLUME alpha, ISO first crossing)
 *    becomes a per-member `done` flag instead of a shared `Break`, so a
 *    finished member stops accumulating without cutting the others' ray short.
 *  - Empty-space skipping tests the MAX sample across members — strictly more
 *    conservative than any single member's test, so no member loses a sample.
 *  - The output sums the members' contributions, which is exactly what the
 *    framebuffer's additive blending did across the separate passes.
 */
export function createVolumeNodeMaterial(
  pool: LayerBrickPool,
  dataRange: { minValue: number; maxValue: number },
  channelData: ChannelUniformData & {
    /** Present when the data came from `buildMergedChannelUniformData`. */
    members?: readonly {
      slotFirst: number;
      slotCount: number;
      blendMode: number;
      projectionMode: number;
      /** Compile-time phasor specialization input; absent → assume phasors. */
      hasPhasorSources?: boolean;
      /** Compile-time FIXED-SHAPE specialization input (one plain scalar
       * channel); absent → assume the general shape. */
      isSimpleIntensity?: boolean;
      isRgb?: boolean;
    }[];
  },
  memberCount = 1,
): VolumeMaterialBundle {
  // Read ONCE per material build (kill switch — see shaderFlags.ts): selects
  // which node graph is emitted. Off = the legacy emission order, verbatim.
  // Zoom smoothing (tricubic reconstruction past uSmoothThreshold px/voxel);
  // off = the filter is not emitted at all.
  const smoothZoom = true;
  // Direction-projected stride (Phase B, see shaderFlags.ts); off = the
  // legacy max-axis pitch, verbatim.
  const anisoStride = true;
  // Hierarchical-occupancy coarse hop (R4, default OFF); off = not emitted.
  // The aggregate sidecar is lazily allocated — ensure it exists BEFORE
  // makeTraversalNodes captures the texture reference (a pool created while
  // the flag was off would otherwise hand the emission a null texture).
  const occHierarchy = true;
  if (occHierarchy) ensureAggregate(pool.pageTable);
  const t = makeTraversalNodes(pool, dataRange);
  // Compile-time FIXED-SHAPE specialization (fast path + the flag): a member
  // that is one plain scalar channel (`isSimpleIntensity`) or three basis-
  // tinted channels over one window (`isRgb`) contributes through straight-
  // line code reading per-member plain uniforms instead of a dynamic loop over
  // `chParamsA/B`. Absent member info → conservative false (emit the loop).
  const memberShape = Array.from({ length: Math.max(1, memberCount) }, (_, m) => ({
    simple: channelData.members?.[m]?.isSimpleIntensity ?? false,
    rgb: channelData.members?.[m]?.isRgb ?? false,
  }));
  // Every member fixed-shape ⇒ the material never indexes the slot arrays or
  // the params textures: build the SLIM node set (two bindings + two
  // DataTextures fewer). With member info absent this is false.
  const slim = memberShape.every((s) => s.simple || s.rgb);
  const c = makeChannelNodes(channelData, slim);
  c.minValue.value = dataRange.minValue;
  c.maxValue.value = dataRange.maxValue;
  // One Fn set per MEMBER. `makePhasorValue` and `makeCursorHit` bake named
  // declarations into bodies that TSL INLINES at every call site, so a merged
  // pass declares `curPi`/`cptJ`/`phG`/... once per member in one scope — TSL
  // auto-renames those, which is precisely the silent-shadowing mechanism this
  // module has been bitten by before. Minting through one NameScope makes a
  // collision throw at build time instead of becoming a wrong image.
  //
  // With one member the prefix is empty, so the generated WGSL is what it was
  // before merging existed. `makeChannelNormalize` needs no prefix: it declares
  // only unnamed vars, which TSL numbers uniquely on its own.
  const nameScope = new NameScope();
  const memberFns = Array.from({ length: Math.max(1, memberCount) }, (_, m) => {
    const nm = nameScope.prefixed(memberCount > 1 ? `m${m}` : "");
    return {
      channelNormalize: makeChannelNormalize(c),
      phasorValue: makePhasorValue(nm),
      cursorHit: makeCursorHit(c, nm),
      nm,
      // Compile-time phasor specialization (fast path only): a member with no
      // phasor sources gets the phasor branch omitted from its WGSL. Absent
      // member info → conservative true (emit the branch).
      emitPhasor: channelData.members?.[m]?.hasPhasorSources ?? true,
      // See `memberShape` above.
      emitSimple: memberShape[m].simple,
      emitRgb: memberShape[m].rgb,
    };
  });

  // Per-member scalars are plain `uniform()` nodes, NOT `uniformArray` — every
  // uniformArray is its own uniform-buffer binding on WebGPU and this material
  // already sits near the 12-per-stage device limit, while individual uniforms
  // pack into three's shared node group and cost no binding.
  // Seeded from the data the material is built with, so the very first frame
  // is already correct — waiting for the uniform effect would flash member 0
  // rendering every member's slots.
  const memberNodes = Array.from({ length: Math.max(1, memberCount) }, (_, m) => {
    const seed = channelData.members?.[m];
    // Fixed-shape scalars, seeded from the same merged arrays the general arm
    // would index (`fixedMemberUniforms` slices exactly that member's slots)
    // so the first frame is already correct.
    const fx = fixedMemberUniforms(
      channelData,
      seed ?? { slotFirst: 0, slotCount: m === 0 ? channelData.numChannels : 0 },
    );
    return {
      slotFirst: uniform(seed?.slotFirst ?? 0, "int"),
      slotCount: uniform(
        seed ? seed.slotCount : m === 0 ? channelData.numChannels : 0,
        "int",
      ),
      blendMode: uniform(seed?.blendMode ?? (m === 0 ? channelData.blendMode : 0), "int"),
      // 0 MIP, 1 ATTENUATED_MIP, 2 VOLUME, 3 ISO
      projectionMode: uniform(seed?.projectionMode ?? 0, "int"),
      isoThreshold: uniform(0.5, "float"),
      fixed: {
        uSlab0: uniform(fx.slabs[0], "int"),
        uSlab1: uniform(fx.slabs[1], "int"),
        uSlab2: uniform(fx.slabs[2], "int"),
        uClimMin: uniform(fx.climMin, "float"),
        uClimMax: uniform(fx.climMax, "float"),
        uGamma: uniform(fx.gamma, "float"),
        uRow: uniform(fx.row, "float"),
      },
    };
  });

  /**
   * The fixed-shape transfer for member `m`, straight-line: the SHARED
   * `emitScalarNormalize` over the member's plain uniforms. rgb has gamma 1 by
   * construction, so its `pow` is omitted (exact). CPU mirrors:
   * `shaderspec/raymarchStep.ts` `normalizeSlotValue` (intensity) and
   * `shaderspec/rgbComposite.ts` (rgb).
   */
  const fixedNormalize = (m: number, raw: any): any =>
    emitScalarNormalize(
      c,
      {
        climMin: memberNodes[m].fixed.uClimMin,
        climMax: memberNodes[m].fixed.uClimMax,
        gamma: memberFns[m].emitRgb ? null : memberNodes[m].fixed.uGamma,
      },
      raw,
    );
  /** Occupancy upper bound for a fixed-shape member from a raw bracket — the
   * straight-line form of the `oc<m>` / `ag<m>` loops: no invert, so the
   * larger endpoint image bounds the brick; ONE window across an rgb
   * member's three slabs, so one pair of evaluations covers all of them. */
  const fixedUpperNorm = (m: number, lo: any, hi: any): any =>
    max(float(fixedNormalize(m, lo)), float(fixedNormalize(m, hi)));

  // PER-SLAB occupancy (orkestrator.occPerSlab): the sidecars carry one RG8
  // plane per atlas slab, stacked along z. Build-time: a single-plane page
  // table emits exactly the pre-flag code (one load per step, shared by
  // every slot); a multi-plane one loads each slot's OWN plane, so a channel
  // that is dark in a brick another channel lights up is still skippable.
  const perSlabOcc = pool.pageTable.occSlabs > 1;
  /** The sidecar texel for `slab` of the page texel `base`. */
  const occTexelAt = (base: any, slab: any): any =>
    ivec3(base).add(ivec3(int(0), int(0), int(slab).mul(t.uOccSlabDepth)));
  /**
   * Load + decode one occupancy/aggregate texel into a raw [min, max]
   * bracket, against the ENCODE range (uOccDecode*, = the pool range unless
   * orkestrator.occObservedRange promoted the observed one). Byte 0 on
   * either channel is the "unbounded on that side" sentinel and decodes to
   * the POOL endpoint — the all-zero "unknown, never skip" texel stays
   * airtight even while the observed range lags a brick whose readback has
   * not landed. CPU lockstep: brickEncoding.decodeOccupancyBounds.
   */
  const emitOccBounds = (sidecar: any, texel: any, name: string): { min: any; max: any } => {
    const occ = vec4(texture3DLoad(sidecar, ivec3(texel))).toVar(`${name}Texel`);
    const range = max(float(t.uOccDecodeRange), 0.00001);
    const min = select(
      occ.r.lessThan(0.002), // code 0 = 0.0; code 1 = 1/255 ≈ 0.0039
      float(c.minValue),
      float(t.uOccDecodeMin).add(occ.r.mul(range)),
    ).toVar(`${name}Min`);
    const maxV = select(
      occ.g.lessThan(0.002),
      float(c.maxValue),
      float(t.uOccDecodeMin).add(oneMinus(occ.g).mul(range)),
    ).toVar(`${name}Max`);
    return { min, max: maxV };
  };
  /**
   * A fixed-shape member's occupancy upper bound from a sidecar at `base`:
   * the union plane, or — per slab — its own plane(s): one for intensity,
   * three for rgb (max over them). CPU mirror: raymarchStep.ts
   * `occupancyUpperNormPerSlab`.
   */
  const fixedUpperNormAt = (
    m: number,
    sidecar: any,
    base: any,
    union: { min: any; max: any },
    name: string,
  ): any => {
    if (!perSlabOcc) return fixedUpperNorm(m, union.min, union.max);
    const nm = memberFns[m].nm;
    const fx = memberNodes[m].fixed;
    const at = (slab: any, tag: string) => {
      const b = emitOccBounds(sidecar, occTexelAt(base, slab), nm(`${name}${tag}`));
      return fixedUpperNorm(m, b.min, b.max);
    };
    if (!memberFns[m].emitRgb) return at(fx.uSlab0, "S0");
    return max(at(fx.uSlab0, "R"), max(at(fx.uSlab1, "G"), at(fx.uSlab2, "B")));
  };
  /** A general slot's bounds: the union, or its own plane per slab. */
  const slotBoundsAt = (
    sidecar: any,
    base: any,
    slot: any,
    union: { min: any; max: any },
    name: string,
  ): { min: any; max: any } =>
    perSlabOcc
      ? emitOccBounds(sidecar, occTexelAt(base, int(vec4(c.chParamsA.element(slot)).x)), name)
      : union;

  // The four ray uniforms come from `volumeRayNodes` so the intensity and the
  // LABEL raymarchers drive the same LOD pick — see that module's header on why
  // a second copy of `desiredLevelAt` would rot the planner lockstep.
  const rayUniforms = makeVolumeRayUniforms();
  const { uDesiredLevel, uLodBias, uPxPerVoxelAtUnitDist, uBaseShape } = rayUniforms;
  const uMinDelta = uniform(1, "float");
  const uStepScale = uniform(1, "float");
  // Zoom smoothing engages when the RESOLVED level's voxel spans at least
  // this many screen px (0 = runtime off without a rebuild). Perspective
  // only — ortho has no per-sample footprint here.
  const uSmoothThreshold = uniform(3, "float");
  // Per-tier hard iteration ceiling (quality profile `maxRaySteps`). Capping
  // steps LENGTHENS the stride (see floorDelta) rather than cutting the far
  // volume. The compile-time loop bound of THIS material is
  // MAX_RAY_STEPS_CEILING, not MAX_RAY_STEPS: the settle refinement ladder
  // (qualityGovernor.setSettleRefineStage) may raise the uniform up to 4×
  // the settled budget while idle; runtime cost stays bounded by the
  // uMaxSteps Break either way. The default here is overwritten at mount by
  // useStepScaleUniform.
  const uMaxSteps = uniform(MAX_RAY_STEPS, "float");
  // The CINEMATIC light rig (C6: all scalar/vec3, no uniformArray). 0 pushes
  // the shading branch out of every accumulator at runtime, with no rebuild.
  // Typed `any` like the rest of the node graph — `CinematicUniforms` is the
  // hand-written PUBLIC surface (a `.value` box per uniform), not the node API.
  const cine: any = {
    uCinematic: uniform(0, "float"),
    uBaseScale: uniform(new THREE.Vector3(1, 1, 1), "vec3"),
    uAmbient: uniform(CINEMATIC_DEFAULTS.ambient, "float"),
    uSpecular: uniform(CINEMATIC_DEFAULTS.specular, "float"),
    uShininess: uniform(CINEMATIC_DEFAULTS.shininess, "float"),
    uSurfaceGain: uniform(CINEMATIC_DEFAULTS.surfaceGain, "float"),
    uMipShading: uniform(CINEMATIC_DEFAULTS.mipShading, "float"),
  };

  // Back-compat aliases: the single-layer call site writes `projectionMode` /
  // `isoThreshold` directly, which is member 0.
  const projectionMode = memberNodes[0].projectionMode;
  const isoThreshold = memberNodes[0].isoThreshold;

  const material = new NodeMaterial();
  commonMaterialSettings(material);
  material.depthTest = true;
  // BACK faces, not front: the box is only a proxy to generate fragments for
  // the march, and once the camera dollies inside it every front face is behind
  // the near plane — the volume would blink out exactly when you zoom into it.
  // Back faces rasterize from inside AND outside. The ray is unaffected: its
  // origin is the camera (vOrigin) and its entry distance comes from the slab
  // test below, not from the rasterized face. DoubleSide would be wrong here —
  // blending is additive, so front+back would each march the ray and composite
  // the volume at double brightness.
  material.side = THREE.BackSide;
  // NOTE for the volume compositor (orkestrator.volumeTarget): this material
  // deliberately keeps PLAIN AdditiveBlending there too. Additive factors are
  // rgb (SrcAlpha, One) / alpha (One, One), and the alpha half is
  // load-bearing: the canvas is TRANSPARENT over the scene's DOM background
  // div, so a volume is visible only because it accumulates canvas ALPHA as
  // it draws. The compositor's offscreen target starts at (0,0,0,0), so after
  // this pass it holds exactly the rgb+alpha DELTA the direct path would
  // have added to the canvas — which the composite quad then adds with
  // (One, One) on both channels. Pinning alpha here (an earlier design)
  // left volume pixels at canvas alpha 0: invisible on a transparent canvas.

  // The ray, the base-voxel map, the per-sample LOD pick and the empty-space hop
  // — shared with the label raymarcher (`volumeRayNodes.ts`).
  const { vOrigin, vDirection, toBaseVoxel, desiredLevelAt, brickExitRel } =
    makeVolumeRayNodes(t, rayUniforms);

  material.fragmentNode = Fn(() => {
    // Ray ∩ [0, baseShape]; discards the fragment when the ray misses.
    const { originB, dirB, invD, boundsX, boundsY, rayLen } = emitVolumeRayBounds(
      { vOrigin, vDirection, toBaseVoxel, desiredLevelAt, brickExitRel },
      rayUniforms,
    );
    // Termination guarantee: uMaxSteps steps of at least this size always
    // cross the ray, whatever the per-sample LOD picks — a lower tier cap
    // trades step density for the same full-ray coverage.
    const floorDelta = rayLen.div(max(float(uMaxSteps), 1.0));

    // Marching pitch per level. Two rules behind orkestrator.anisoStride
    // (CPU mirror: features/bricks/shaderspec/raymarchStep.ts `directionProjectedPitch` — keep in
    // lockstep):
    //  - ON (default): the ELLIPSOIDAL voxel-crossing distance along the ray,
    //    0.75 / |dirB / scale|. Identical to the max rule on isotropic levels
    //    for EVERY direction, never exceeds 0.75·max(scale) (never
    //    oversamples the coarsest axis), and guarantees ~one sample per voxel
    //    crossing on every axis — which the max rule does not: on a
    //    [2ⁿ,2ⁿ,1] pyramid (z never downsampled) a face-on ray stepped by
    //    the xy factor straight THROUGH the z planes, a 6× undersample that
    //    dropped thin structures from MIP.
    //  - OFF: the legacy MAX spatial component (kept for A/B).
    // Note the deliberate asymmetry with `wantFiner`/`desiredLevelAt`, which
    // stay max-based: LOD selection is a screen-footprint question, the
    // pitch is a marching-density one. For the SAME reason the pitch stays
    // VOXEL-metric under world-metric LOD (uVoxelWorldSize): the ray marches
    // and samples in base-voxel space, so "one sample per voxel crossing" is
    // a voxel-space property — scaling it by the affine would under- or
    // over-sample the data grid, not the screen.
    const levelPitch = (level: any) => {
      const s = vec3(t.uLevelScale.element(level));
      if (anisoStride) {
        // dirB is unit-length in base-voxel space; |dirB/s| ≥ |dirB|/max(s)
        // bounds the pitch by the legacy rule from below.
        return float(0.75).div(max(float(length(dirB.div(s))), 1e-6));
      }
      return float(0.75).mul(max(s.x, max(s.y, s.z)));
    };

    // Reference step for VOLUME opacity correction (see
    // features/bricks/shaderspec/opacityCorrection.ts — keep in lockstep). Under anisoStride the
    // dead uMinDelta floor is dropped: uMinDelta is 0.5·max(scale) of the
    // plan target, which would pin the pitch back to the max-axis rule and
    // nullify the projection exactly where it matters (face-on thin slabs).
    const refStep = anisoStride
      ? max(floorDelta, levelPitch(uDesiredLevel)).toVar()
      : max(max(float(uMinDelta), floorDelta), levelPitch(uDesiredLevel)).toVar();

    // Jitter must not depend on rayLen or uStepScale (motion-invariant, P14).
    // Under anisoStride the amplitude is the projected pitch of the plan
    // target — like uMinDelta it changes only on replan. NOTE it matches the
    // UNSCALED pitch, not the actual stride: the stride multiplies by
    // uStepScale (2–3× while active), which P14 forbids in the amplitude —
    // motion frames are deliberately under-dithered rather than flickery.
    // (The legacy amplitude straddled ~5 face-on strides; this one matches
    // the settled stride exactly.)
    const jitterAmp = anisoStride ? levelPitch(uDesiredLevel) : float(uMinDelta);
    const rayT = boundsX.add(float(rand2(screenCoordinate.xy)).mul(jitterAmp)).toVar("rayT");

    // The cinematic view vector is LOOP-INVARIANT (rayT > 0 always), so it is
    // hoisted here: zero per-sample cost, still per-fragment correct under
    // perspective. `dirB` is unit-length in BASE-VOXEL space; scaling by the
    // base voxel's physical size takes it to physical space (C3), and the
    // negation makes it point from the sample TOWARD the eye.
    const viewPhys = TSL.normalize(dirB.mul(cine.uBaseScale)).negate().toVar("viewPhys");

    // Per-member accumulators. Deliberately UNNAMED `.toVar()`: TSL mints a
    // unique name for each, which is what makes unrolling members into one
    // scope safe. A named var here would collide across members.
    const acc = memberNodes.map(() => ({
      bestNorm: float(0.0).toVar(), // MIP
      bestColor: vec3(0.0).toVar(),
      attenuatedMax: float(0.0).toVar(), // ATTENUATED_MIP
      attenuatedColor: vec3(0.0).toVar(),
      volColor: vec3(0.0).toVar(), // VOLUME front-to-back
      volAlpha: float(0.0).toVar(),
      isoHit: bool(false).toVar(), // ISOSURFACE
      isoColor: vec3(0.0).toVar(),
      // Replaces the single-pass `Break()`: this member has all it can get, but
      // the ray continues for the others.
      done: bool(false).toVar(),
    }));

    Loop({ start: int(0), end: int(MAX_RAY_STEPS_CEILING), type: "int", condition: "<" }, ({ i }: any) => {
      // Tier cap: the uniform can't feed the compile-constant loop bound, so
      // it breaks here. floorDelta above guarantees full-ray coverage in
      // uMaxSteps iterations. The bound is the settle-refinement CEILING
      // (4× the largest settled budget) — cost stays bounded by uMaxSteps.
      If(float(i).greaterThanEqual(float(uMaxSteps)), () => {
        Break();
      });
      If(rayT.greaterThan(boundsY), () => {
        Break();
      });
      // Every member has finished: nothing further along the ray can change
      // the image. For one member this is exactly the old per-mode `Break`.
      let allDone: any = acc[0].done;
      for (let m = 1; m < acc.length; m++) allDone = allDone.and(acc[m].done);
      If(allDone, () => {
        Break();
      });

      const pB = originB.add(rayT.mul(dirB)).toVar();
      const lvl = int(desiredLevelAt(pB, originB)).toVar();

      // LOD-adaptive step (P14): fine pitch where fine data is sampled.
      // floorDelta stays in the max under both rules — the uMaxSteps
      // termination guarantee is stride-rule-independent.
      const stepLen = (anisoStride
        ? max(floorDelta, levelPitch(lvl))
        : max(max(float(uMinDelta), floorDelta), levelPitch(lvl))
      )
        .mul(max(float(uStepScale), 1.0))
        .toVar();

      // Residency is channel- AND member-independent: resolve ONCE per step.
      // This is the whole point of merging — N members used to pay N level
      // walks per step for the identical answer.
      const resolved = emitResolveBrickResidency(t, pB, lvl);

      // Empty-space skip hop: jump to the exit of the RESOLVED level's cell
      // (hopLevel: the EMPTY brick's own level, or the coarsest cell when the
      // whole chain is unmapped), not the fine desired level's.
      const hopPastCell = () => {
        rayT.addAssign(
          max(stepLen, float(brickExitRel(pB, invD, resolved.hopLevel)).add(0.01)),
        );
        Continue();
      };

      {
        // Skippability is decided BEFORE any per-slot sampling is
        // emitted (CPU mirror: features/bricks/shaderspec/raymarchStep.ts). The legacy path below
        // built the full transfer-function + colormap + phasor sample set
        // first and only then tested the skip predicate, so every skipped
        // step still paid the whole per-slot path.
        //
        // Unmapped chain: nothing to sample anywhere — hop immediately.
        If(resolved.status.lessThan(0.5), () => {
          hopPastCell();
        });
        // Uniform EMPTY brick: every slot taps the same uniform value, so the
        // step's max norm is derivable with pure ALU (channelNormalize only —
        // no colormap sample, no phasor taps, no cursor loop). Invisible
        // slots are excluded, exactly like the sampling loop's guard. The
        // max across members mirrors the legacy predicate: strictly more
        // conservative than any single member's, so no member loses a sample.
        If(resolved.status.greaterThan(1.5), () => {
          const maxEmptyNorm = float(0.0).toVar("esMaxNorm");
          memberNodes.forEach((mem, m) => {
            if (memberFns[m].emitSimple || memberFns[m].emitRgb) {
              // Same collapse as the sampling arm: known-visible slot(s) over
              // ONE window, so one normalize of the fill value bounds them all.
              maxEmptyNorm.assign(
                max(maxEmptyNorm, float(fixedNormalize(m, resolved.emptyValue))),
              );
              return;
            }
            Loop(
              { start: int(0), end: int(MAX_CHANNELS), type: "int", condition: "<", name: `es${m}` },
              (args: any) => {
                const k = args[`es${m}`];
                If(int(k).greaterThanEqual(mem.slotCount), () => {
                  Break();
                });
                const slot = int(mem.slotFirst).add(int(k)).toVar();
                If(vec4(c.chParamsB.element(slot)).y.lessThan(0.5), () => {
                  Continue();
                });
                maxEmptyNorm.assign(
                  max(
                    maxEmptyNorm,
                    float(memberFns[m].channelNormalize(slot, resolved.emptyValue)),
                  ),
                );
              },
            );
          });
          If(maxEmptyNorm.lessThanEqual(0.001), () => {
            hopPastCell();
          });
        });

        // HIERARCHICAL-OCCUPANCY COARSE HOP (R4, orkestrator.occHierarchy) —
        // tried BEFORE the per-brick skip: when the level-(lvl+1) AGGREGATE
        // (the union of every level-lvl measured range under that cell —
        // written only when complete, all-zero = unknown = never hop) proves
        // every member invisible / mip-beaten / iso-missed, the ray hops the
        // whole COARSE cell instead of brick-by-brick. Same predicate as the
        // per-brick skip (CPU mirror: residentBrickSkippable), same decode
        // as Phase A (sentinel per channel).
        //
        // SOUNDNESS (why no explicit level guard is emitted): the ray origin
        // IS the camera (perspective), so `desiredLevelAt` is monotone
        // NON-FINER along the ray — the finest desired level on any forward
        // segment is at its start, which is exactly `lvl`, the level the
        // aggregate bounds (ortho: desired is the constant uDesiredLevel).
        // Coarser fallback samples inside the cell stay within the level-lvl
        // hull up to downsampling boundary bleed — beneath the conservative
        // quantization slack. CPU mirror of the monotonicity argument:
        // features/bricks/shaderspec/raymarchStep.ts `desiredLevelForDistance` (+ tests).
        if (occHierarchy) {
          If(
                resolved.status
                  .greaterThanEqual(0.5)
                  .and(resolved.status.lessThan(1.5))
                  .and(int(lvl).add(1).lessThan(int(t.uNumLevels))),
                () => {
                  const aggLevel = int(lvl).add(1).toVar("aggLevel");
                  const aggScale = vec3(t.uLevelScale.element(aggLevel)).toVar("aggScale");
                  const aggShape = vec3(t.uLevelShape.element(aggLevel)).toVar("aggShape");
                  const aggVoxel = clamp(
                    vec3(pB).div(aggScale),
                    vec3(0.0),
                    aggShape.sub(0.5001),
                  ).toVar("aggVoxel");
                  const aggCell = ivec3(
                    floor(aggVoxel.div(vec3(t.uBrickPayload))),
                  ).toVar("aggCell");
                  const aggBase = ivec3(t.uPageOffset.element(aggLevel))
                    .add(aggCell)
                    .toVar("aggBase");
                  // Plane 0 (= the union, or slab 0 per slab) gates "known":
                  // aggregates are written for every plane at once, and a
                  // per-slab plane that happens to encode as all-zero decodes
                  // to the full range below — never a hop, always safe.
                  const aggTexel = vec4(texture3DLoad(t.aggregate, aggBase)).toVar("aggTexel");
                  If(aggTexel.r.add(aggTexel.g).greaterThan(0.001), () => {
                    const aggRange = max(float(t.uOccDecodeRange), 0.00001);
                    const aggMin = select(
                      aggTexel.r.lessThan(0.002),
                      float(c.minValue),
                      float(t.uOccDecodeMin).add(aggTexel.r.mul(aggRange)),
                    ).toVar("aggMin");
                    const aggMax = select(
                      aggTexel.g.lessThan(0.002),
                      float(c.maxValue),
                      float(t.uOccDecodeMin).add(oneMinus(aggTexel.g).mul(aggRange)),
                    ).toVar("aggMax");
                    const aggUnion = { min: aggMin, max: aggMax };
                    const aggSkipAll = bool(true).toVar("aggSkipAll");
                    memberNodes.forEach((mem, m) => {
                      const upper = float(0.0).toVar();
                      if (memberFns[m].emitSimple || memberFns[m].emitRgb) {
                        // Straight-line: no loop header, no Break, no
                        // visibility Continue, no array reads.
                        upper.assign(fixedUpperNormAt(m, t.aggregate, aggBase, aggUnion, "ag"));
                      } else {
                      Loop(
                        {
                          start: int(0),
                          end: int(MAX_CHANNELS),
                          type: "int",
                          condition: "<",
                          name: `ag${m}`,
                        },
                        (args: any) => {
                          const k = args[`ag${m}`];
                          If(int(k).greaterThanEqual(mem.slotCount), () => {
                            Break();
                          });
                          const slot = int(mem.slotFirst).add(int(k)).toVar();
                          If(vec4(c.chParamsB.element(slot)).y.lessThan(0.5), () => {
                            Continue();
                          });
                          const b = slotBoundsAt(
                            t.aggregate,
                            aggBase,
                            slot,
                            aggUnion,
                            memberFns[m].nm("agS"),
                          );
                          upper.assign(
                            max(
                              upper,
                              max(
                                float(memberFns[m].channelNormalize(slot, b.min)),
                                float(memberFns[m].channelNormalize(slot, b.max)),
                              ),
                            ),
                          );
                        },
                      );
                      }
                      const invisible = upper.lessThanEqual(0.001);
                      const mipBeaten = int(mem.projectionMode)
                        .equal(int(0))
                        .and(upper.lessThanEqual(acc[m].bestNorm));
                      const isoMiss = int(mem.projectionMode)
                        .equal(int(3))
                        .and(upper.lessThan(mem.isoThreshold));
                      aggSkipAll.assign(
                        aggSkipAll.and(acc[m].done.or(invisible).or(mipBeaten).or(isoMiss)),
                      );
                    });
                    If(aggSkipAll, () => {
                      rayT.addAssign(
                        max(
                          stepLen,
                          float(brickExitRel(pB, invD, aggLevel)).add(0.01),
                        ),
                      );
                      Continue();
                    });
                  });
                },
              );
        }
        // OCCUPANCY SKIP — the resident-brick analogue of the EMPTY hop (CPU
        // mirror: features/bricks/shaderspec/raymarchStep.ts `residentBrickSkippable`). The page
        // table's RG8 sidecar brackets each resident brick's raw [min, max]
        // conservatively (encodeOccupancyTexel: floor'd min, inverted-ceil'd
        // max, so an unwritten texel decodes to the full range and can never
        // skip). Because `channelNormalize` is monotone in the raw value up to
        // its final invert, the windowed norm over the whole brick is bounded
        // by max(normalize(bMin), normalize(bMax)) — valid for inverted
        // channels too. A brick skips for a member when
        //  - it is invisible under the current clim window (norm ≤ 0.001, the
        //    EMPTY threshold), or
        //  - the member is MIP and the brick cannot beat its accumulated max
        //    (the classic maximum-culling MIP acceleration), or
        //  - the member is ISO and the brick never reaches the threshold, or
        //  - the member is already done.
        // When EVERY member skips, the ray hops the resident brick's cell.
        // This is what finally gives MIP — the default projection, whose
        // 0.995 early-out dim fluorescence never reaches — a way to stop
        // paying full per-slot sampling through visually black or already-
        // beaten bricks.
        // KNOWN 0.1% BAND (phasor sources with weightByIntensity off): the
        // invisible predicate treats norm ≤ 0.001 as black, but such a
        // phasor paints ANY norm > 0 at full opacity — voxels in (0, 0.001]
        // are skipped here that the legacy (non-fastPath) emission would
        // have painted. Accepted as beneath quantization; documented, not
        // accidental.
        If(resolved.status.greaterThanEqual(0.5).and(resolved.status.lessThan(1.5)), () => {
          // Union plane (= plane 0): what every slot reads on a single-plane
          // page table, and the per-slab fallback (see emitOccBounds for the
          // sentinel decode).
          const occUnion = emitOccBounds(t.occupancy, resolved.pageTexel, "occ");
          const occSkipAll = bool(true).toVar("occSkipAll");
          memberNodes.forEach((mem, m) => {
            const upper = float(0.0).toVar();
            if (memberFns[m].emitSimple || memberFns[m].emitRgb) {
              // Straight-line form of the loop below (CPU mirror:
              // rgbComposite.ts `rgbOccupancyUpperNorm` ≡ occupancyUpperNorm).
              upper.assign(
                fixedUpperNormAt(m, t.occupancy, resolved.pageTexel, occUnion, "oc"),
              );
            } else {
            Loop(
              {
                start: int(0),
                end: int(MAX_CHANNELS),
                type: "int",
                condition: "<",
                name: `oc${m}`,
              },
              (args: any) => {
                const k = args[`oc${m}`];
                If(int(k).greaterThanEqual(mem.slotCount), () => {
                  Break();
                });
                const slot = int(mem.slotFirst).add(int(k)).toVar();
                If(vec4(c.chParamsB.element(slot)).y.lessThan(0.5), () => {
                  Continue();
                });
                const b = slotBoundsAt(
                  t.occupancy,
                  resolved.pageTexel,
                  slot,
                  occUnion,
                  memberFns[m].nm("ocS"),
                );
                upper.assign(
                  max(
                    upper,
                    max(
                      float(memberFns[m].channelNormalize(slot, b.min)),
                      float(memberFns[m].channelNormalize(slot, b.max)),
                    ),
                  ),
                );
              },
            );
            }
            const invisible = upper.lessThanEqual(0.001);
            const mipBeaten = int(mem.projectionMode)
              .equal(int(0))
              .and(upper.lessThanEqual(acc[m].bestNorm));
            const isoMiss = int(mem.projectionMode)
              .equal(int(3))
              .and(upper.lessThan(mem.isoThreshold));
            occSkipAll.assign(
              occSkipAll.and(acc[m].done.or(invisible).or(mipBeaten).or(isoMiss)),
            );
          });
          If(occSkipAll, () => {
            // Hop the RESIDENT level's cell — resolved.hopLevel defaults to
            // the coarsest here (it is only set by the EMPTY branch).
            rayT.addAssign(
              max(
                stepLen,
                float(brickExitRel(pB, invD, resolved.residentLevel)).add(0.01),
              ),
            );
            Continue();
          });
        });
      }

      // Zoom-smoothing gate, ONCE per step (shared by every member/slot):
      // tricubic engages only on RESIDENT samples whose resolved level is
      // magnified past uSmoothThreshold px per voxel — the same footprint
      // math as desiredLevelAt (keep in lockstep). Perspective only.
      // DELIBERATELY max-axis even under orkestrator.anisoStride: this is a
      // screen-footprint question ("how magnified is this level"), not a
      // marching-density one — the stride projection does not apply here.
      let smoothActive: any = null;
      if (smoothZoom) {
        // World metric, same uniform contract as desiredLevelAt: identity
        // uVoxelWorldSize reduces to the legacy voxel expressions exactly.
        const w = vec3(rayUniforms.uVoxelWorldSize);
        const stepDist = max(
          TSL.length(vec3(pB).sub(originB).mul(w)),
          max(w.x, max(w.y, w.z)),
        );
        const smoothScale = vec3(t.uLevelScale.element(resolved.residentLevel)).mul(w);
        const resolvedPxPerVoxel = float(uPxPerVoxelAtUnitDist)
          .div(stepDist)
          .mul(max(smoothScale.x, max(smoothScale.y, smoothScale.z)));
        smoothActive = uPxPerVoxelAtUnitDist
          .greaterThan(0.0)
          .and(uSmoothThreshold.greaterThan(0.0))
          .and(resolved.status.greaterThanEqual(0.5))
          .and(resolved.status.lessThan(1.5))
          .and(resolvedPxPerVoxel.greaterThanEqual(uSmoothThreshold))
          .toVar("smoothActive");
      }

      // Per-sample composite, per member (ChunkPlane semantics).
      const samples = memberNodes.map((mem, m) => {
        // A SIMPLE member seeds to zero unconditionally: its blend cannot be
        // MULTIPLICATIVE (that is what `resolveRenderKind` refuses), so the
        // `select` on the blend uniform is a known constant here.
        const fixed = memberFns[m].emitSimple || memberFns[m].emitRgb;
        const sampleColor = fixed
          ? vec3(0.0).toVar()
          : select(int(mem.blendMode).equal(1), vec3(1.0), vec3(0.0)).toVar();
        const sampleNorm = float(0.0).toVar();
        const nm = memberFns[m].nm;

        if (memberFns[m].emitSimple) {
          // ONE slot, known visible, plain transfer, collapsing blend — so the
          // whole per-slot region reduces to a tap, the shared normalize and
          // one LUT sample. Removed from the innermost (ray-step × slot) loop:
          // the loop header, the `k >= slotCount` Break, the visibility
          // Continue, the three-way blend branch, the `sourceParams` kind tap
          // and FOUR `chParamsA/B.element()` reads (the member's window,
          // gamma, slab and LUT row are plain uniforms — `fixed`).
          If(resolved.status.greaterThanEqual(0.5), () => {
            const raw = emitChannelTap(t, resolved, mem.fixed.uSlab0, nm("fxI"), smoothActive);
            const norm = float(fixedNormalize(m, raw)).toVar(nm("fxNorm"));
            sampleNorm.assign(norm);
            // color × weight with opacity 1: additive (or normal) onto a zero
            // accumulator IS assignment.
            sampleColor.assign(
              c.colormapAtlas.sample(vec2(norm, mem.fixed.uRow)).rgb.mul(norm),
            );
          });
          return {
            sampleColor,
            sampleNorm,
            gradSlab: int(mem.fixed.uSlab0),
            gradNormalize: (raw: any) => fixedNormalize(m, raw),
          };
        }

        if (memberFns[m].emitRgb) {
          const gradSlab = int(mem.fixed.uSlab0).toVar();
          // THREE basis-tinted slots over ONE window: the general path's
          // per-slot contribution is a CONSTANT tint row × (opacity 1 · norm),
          // summed additively — i.e. `vec3(normR, normG, normB)` with no LUT
          // sample at all (`rgbUniforms.ts` explains and its test pins the
          // constant rows). The ray ranks by the max per-slot norm, exactly as
          // the general loop's `sampleNorm = max(...)` does. CPU mirror:
          // `shaderspec/rgbComposite.ts`.
          If(resolved.status.greaterThanEqual(0.5), () => {
            // ONE tap on an rgba8 atlas, three otherwise (emitRgbTaps).
            const raw = emitRgbTaps(
              t,
              resolved,
              [mem.fixed.uSlab0, mem.fixed.uSlab1, mem.fixed.uSlab2],
              nm("fx"),
              smoothActive,
            );
            const nR = float(fixedNormalize(m, raw.r)).toVar(nm("fxNr"));
            const nG = float(fixedNormalize(m, raw.g)).toVar(nm("fxNg"));
            const nB = float(fixedNormalize(m, raw.b)).toVar(nm("fxNb"));
            sampleColor.assign(vec3(nR, nG, nB));
            sampleNorm.assign(max(nR, max(nG, nB)));
            // Shade the structure actually on screen: the brightest of the
            // three basis slabs. One window covers all three, so the gradient's
            // normalize is the member's plain `fixedNormalize` either way.
            // Two sequential Ifs over the same var, and the second CANNOT
            // undo the first: its `nB > nG` excludes the `nG >= nB` that armed
            // the first. Ties resolve R > G > B, and an all-zero sample keeps
            // the seed (slab0) rather than drifting to the last slab tested.
            If(nG.greaterThan(nR).and(nG.greaterThanEqual(nB)), () => {
              gradSlab.assign(int(mem.fixed.uSlab1));
            });
            If(nB.greaterThan(nR).and(nB.greaterThan(nG)), () => {
              gradSlab.assign(int(mem.fixed.uSlab2));
            });
          });
          return {
            sampleColor,
            sampleNorm,
            gradSlab,
            gradNormalize: (raw: any) => fixedNormalize(m, raw),
          };
        }

        // The slot whose intensity dominates this sample — the structure the
        // gradient should describe. `chParamsA.x` is the intensity slab for
        // channels AND phasors, so one path covers both kinds, and the cost is
        // six taps regardless of how many slots the member has.
        const domSlot = int(mem.slotFirst).toVar();
        If(resolved.status.greaterThanEqual(0.5), () => {
          Loop(
            {
              start: int(0),
              end: int(MAX_CHANNELS),
              type: "int",
              condition: "<",
              // Distinct iterator per member — see the shadowing note on
              // emitResolveBrickResidency.
              name: `ch${m}`,
            },
            (args: any) => {
              const k = args[`ch${m}`];
              If(int(k).greaterThanEqual(mem.slotCount), () => {
                Break();
              });
              // Members' slots are concatenated into the shared arrays; this
              // member owns [slotFirst, slotFirst + slotCount).
              const slot = int(mem.slotFirst).add(int(k)).toVar();
              If(vec4(c.chParamsB.element(slot)).y.lessThan(0.5), () => {
                Continue();
              });

              const sample = emitSourceSample(
                t,
                c,
                resolved,
                slot,
                memberFns[m],
                memberFns[m].nm,
                memberFns[m].emitPhasor,
                smoothActive,
              );
              const color = sample.color;
              const weight = sample.weight;
              // The ray ranks samples by INTENSITY, never by phasor value: a MIP
              // through a lifetime overlay must pick the brightest voxel along the
              // ray and show ITS lifetime — not the longest lifetime, which would
              // pick out the dimmest background pixels.
              // Compare against the PRE-max value with a STRICT `>`. Testing
              // `>=` after the max would latch on every TIE — including the
              // ubiquitous 0 == 0 of a dark voxel — so the last slot to read
              // zero would win the argmax instead of the brightest slot.
              const prevMax = float(sampleNorm).toVar();
              sampleNorm.assign(max(sampleNorm, sample.norm));
              // For a phasor member the gradient is of INTENSITY while the
              // colour is the lifetime hue — correct, and the same rule as the
              // ranking directly above.
              If(sample.norm.greaterThan(prevMax), () => {
                domSlot.assign(slot);
              });

              If(int(mem.blendMode).equal(1), () => {
                sampleColor.mulAssign(mix(vec3(1.0), color, weight));
              })
                .ElseIf(int(mem.blendMode).equal(2), () => {
                  sampleColor.assign(sampleColor.mul(oneMinus(weight)).add(color.mul(weight)));
                })
                .Else(() => {
                  sampleColor.addAssign(color.mul(weight));
                });
            },
          );
        });
        return {
          sampleColor,
          sampleNorm,
          gradSlab: int(vec4(c.chParamsA.element(domSlot)).x),
          gradNormalize: (raw: any) => memberFns[m].channelNormalize(domSlot, raw),
        };
      });

      memberNodes.forEach((mem, m) => {
        const a = acc[m];
        const { sampleColor, sampleNorm, gradSlab, gradNormalize } = samples[m];
        /**
         * Shade this sample's colour, for the VOLUME and ISOSURFACE arms only.
         *
         * C7 RELAXED — every projection calls this now. MIP and ATTENUATED_MIP
         * pass `cine.uMipShading` as the diffuse weight, so at 0 they keep the
         * "brightness IS max intensity" reading and gain only highlights, and
         * at 1 they are treated exactly like VOLUME. What is surrendered at
         * weight > 0 is that quantitative reading, and ONLY in cinematic mode.
         *
         * INVARIANT C1 — the result is used as a COLOUR and nothing else. The
         * caller must keep feeding the UNSHADED `sampleNorm` to the hit test
         * and `av`/`volAlpha` to the compositor, which is what keeps the CPU
         * transfer mirrors valid with zero changes.
         */
        const shadeColor = (
          name: string,
          extraCondition: any = null,
          /** MAX projections compress the diffuse term — see `uMipShading`. */
          diffuseWeight: any = null,
        ): any => {
          const shaded = vec3(sampleColor).toVar(name);
          // ONE gating contract: `shadeColor` ALWAYS owns the `uCinematic`
          // test, and a caller that has a further condition passes it in
          // rather than wrapping this call. Two call sites gating differently
          // is how one of them ends up unguarded after an edit.
          const gate = extraCondition
            ? cine.uCinematic.greaterThan(0.5).and(extraCondition)
            : cine.uCinematic.greaterThan(0.5);
          If(gate, () => {
            const gradLevel = emitFieldGradient(t, resolved, gradSlab, gradNormalize, name);
            // Level voxel size in physical units — the C3 divisor.
            const voxelExtent = vec3(t.uLevelScale.element(resolved.residentLevel)).mul(
              cine.uBaseScale,
            );
            shaded.assign(
              emitShade(cine, sampleColor, gradLevel, voxelExtent, viewPhys, diffuseWeight),
            );
          });
          return shaded;
        };
        // A finished member contributes nothing further; the others march on.
        If(a.done.not(), () => {
          If(int(mem.projectionMode).equal(1), () => {
            const depthFrac = rayT.sub(boundsX).div(rayLen);
            const atten = exp(float(-1.5).mul(depthFrac)).toVar();
            // The winner is chosen on the UNSHADED norm × attenuation (C1);
            // only the colour stored for it is lit. The exp() depth fade is
            // deliberately kept — it composes with shading as a depth cue,
            // and touching it would change which sample WINS.
            const av = sampleNorm.mul(atten);
            If(av.greaterThan(a.attenuatedMax), () => {
              a.attenuatedMax.assign(av);
              a.attenuatedColor.assign(shadeColor(`amipFastGrad${m}`, null, cine.uMipShading));
            });
            // Early ray termination (CPU mirror: attenuatedMipDone). atten
            // strictly decreases along the ray and sampleNorm ≤ 1, so every
            // future contribution is < atten_now; once the accumulated max
            // reaches that ceiling nothing later can beat it. Deterministic
            // per pixel (P14-safe, same argument as the MIP 0.995 bound).
            If(a.attenuatedMax.greaterThanEqual(atten), () => {
              a.done.assign(true);
            });
          })
            .ElseIf(int(mem.projectionMode).equal(2), () => {
              // Step-size (opacity) correction — mirrors features/bricks/shaderspec/opacityCorrection.ts.
              const av = oneMinus(
                pow(max(oneMinus(sampleNorm), 0.0), stepLen.div(max(refStep, 1e-5))),
              );
              // Gate on a CONTRIBUTING sample: one gradient per sample that
              // actually reaches the accumulator, none for the rest.
              const volShaded = shadeColor(`volGrad${m}`, av.greaterThan(0.01));
              a.volColor.addAssign(oneMinus(a.volAlpha).mul(av).mul(volShaded));
              // `av` and `volAlpha` are UNTOUCHED by shading (C1).
              a.volAlpha.addAssign(oneMinus(a.volAlpha).mul(av));
              If(a.volAlpha.greaterThanEqual(0.98), () => {
                a.done.assign(true);
              });
            })
            .ElseIf(int(mem.projectionMode).equal(3), () => {
              // The hit test reads the UNSHADED norm (C1); only the colour
              // that is stored is lit. One gradient per RAY — the ray is done
              // here — which is why the iso path costs ~2-5% and not 1.5×.
              If(sampleNorm.greaterThanEqual(mem.isoThreshold), () => {
                a.isoHit.assign(true);
                a.isoColor.assign(shadeColor(`isoGrad${m}`));
                a.done.assign(true);
              });
            })
            .Else(() => {
              // The max is still selected on the UNSHADED norm (C1) — so the
              // probe, the shaderspec mirrors and the 0.995 early-out below are
              // all unchanged. Only the colour stored for the winner is lit.
              // Cost note: a gradient fires on every running-max IMPROVEMENT,
              // which on a smooth monotone ramp is most steps until the early
              // out — i.e. worst case the same ~1.5-2x as lit VOLUME, not the
              // iso path's ~2-5%. That is why it rides the governor gate.
              If(sampleNorm.greaterThan(a.bestNorm), () => {
                a.bestNorm.assign(sampleNorm);
                a.bestColor.assign(shadeColor(`mipGrad${m}`, null, cine.uMipShading));
              });
              // Early ray termination: the normalize clamps to [0, 0.999] before
              // gamma (invert can reach exactly 1.0), so a max >= 0.995 is within
              // sub-colormap-step distance of the reachable ceiling — nothing
              // later on the ray can visibly beat it. Deterministic per pixel
              // (P14-safe). ATTENUATED_MIP's depth-decay bound lives in its own
              // branch above (fast path only).
              If(a.bestNorm.greaterThanEqual(0.995), () => {
                a.done.assign(true);
              });
            });
        });
      });

      rayT.addAssign(stepLen);
    });

    const outColor = vec3(0.0).toVar("finalColor");
    const keep = bool(false).toVar("keepFragment");

    // SUM the members. Across layers the compositing was always additive (the
    // material is AdditiveBlending and a layer's own blend applies only within
    // its own slots), and addition is associative — so summing here is exactly
    // what the framebuffer did across the separate passes. For one member the
    // addAssign onto a zeroed var is the old plain assign.
    memberNodes.forEach((mem, m) => {
      const a = acc[m];
      If(int(mem.projectionMode).equal(2), () => {
        If(a.volAlpha.greaterThanEqual(0.01), () => {
          outColor.addAssign(a.volColor);
          keep.assign(true);
        });
      })
        .ElseIf(int(mem.projectionMode).equal(3), () => {
          If(a.isoHit, () => {
            outColor.addAssign(a.isoColor);
            keep.assign(true);
          });
        })
        .Else(() => {
          // MIP / ATTENUATED_MIP: premultiplied additive output.
          const outNorm = select(
            int(mem.projectionMode).equal(1),
            a.attenuatedMax,
            a.bestNorm,
          );
          If(outNorm.greaterThanEqual(0.01), () => {
            outColor.addAssign(
              select(int(mem.projectionMode).equal(1), a.attenuatedColor, a.bestColor),
            );
            keep.assign(true);
          });
        });
    });

    Discard(keep.not());
    return vec4(outColor, 1.0);
  })();

  return {
    material,
    nodes: {
      ...t,
      ...c,
      uDesiredLevel,
      uLodBias,
      uPxPerVoxelAtUnitDist,
      uVoxelWorldSize: rayUniforms.uVoxelWorldSize,
      uMinDelta,
      uStepScale,
      uMaxSteps,
      uSmoothThreshold,
      uBaseShape,
      ...cine,
      projectionMode,
      isoThreshold,
      members: memberNodes,
    } as VolumeMaterialNodes,
  };
}

/**
 * Push the CINEMATIC light rig and the layer's base-voxel scale.
 *
 * `uCinematic` itself is deliberately NOT written here: whether the volume is
 * lit on a given frame depends on the quality tier and camera activity, which
 * is a vanilla-subscription cadence — so it is owned by the step-scale driver
 * (`useVolumeRayUniforms`), alongside `uStepScale` / `uMaxSteps` /
 * `uSmoothThreshold`, and value-deduped with them.
 *
 * `uBaseScale` is a property of the layer's GEOMETRY, not of the preset, but it
 * rides along because the shading normal is meaningless without it (C3).
 *
 * Cheap and idempotent: six scalar writes into the shared object UBO, no
 * texture adoption and no material rebuild.
 */
export function updateCinematicNodes(
  nodes: VolumeMaterialNodes,
  source: {
    baseScale: THREE.Vector3;
    ambient: number;
    specular: number;
    shininess: number;
    surfaceGain: number;
    mipShading: number;
  },
): void {
  if (!nodes.uBaseScale) return;
  nodes.uBaseScale.value.copy(source.baseScale);
  nodes.uAmbient.value = source.ambient;
  nodes.uSpecular.value = source.specular;
  nodes.uShininess.value = source.shininess;
  nodes.uSurfaceGain.value = source.surfaceGain;
  nodes.uMipShading.value = source.mipShading;
}

/**
 * Push a merged group's per-member uniforms. Channel arrays/textures go through
 * the existing `updateChannelNodes`; this covers only the per-member scalars
 * the merged fragment reads.
 *
 * Members whose data is missing this frame are zeroed rather than left stale —
 * a stale `slotCount` would have the shader read another member's slots.
 */
export function updateMergedMemberNodes(
  nodes: VolumeMaterialNodes,
  members: readonly {
    slotFirst: number;
    slotCount: number;
    blendMode: number;
    projectionMode: number;
    isoThreshold: number;
    /** The fixed-shape scalars (`fixedMemberUniforms`); pushed whenever given. */
    fixed?: FixedMemberUniforms;
  }[],
): void {
  const target = nodes.members ?? [];
  for (let m = 0; m < target.length; m++) {
    const source = members[m];
    target[m].slotFirst.value = source?.slotFirst ?? 0;
    target[m].slotCount.value = source?.slotCount ?? 0;
    target[m].blendMode.value = source?.blendMode ?? 0;
    target[m].projectionMode.value = source?.projectionMode ?? 0;
    target[m].isoThreshold.value = source?.isoThreshold ?? 0.5;
    const fx = source?.fixed;
    if (fx && target[m].fixed) {
      const f = target[m].fixed;
      f.uSlab0.value = fx.slabs[0];
      f.uSlab1.value = fx.slabs[1];
      f.uSlab2.value = fx.slabs[2];
      f.uClimMin.value = fx.climMin;
      f.uClimMax.value = fx.climMax;
      f.uGamma.value = fx.gamma;
      f.uRow.value = fx.row;
    }
  }
}
