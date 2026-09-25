import * as THREE from "three";

import type { LayerState } from "../../../platform/model/layerModel";
import type { SlabDesc } from "../../../platform/coords/levelGeometry";
import { buildColormapAtlas } from "../../../platform/gpu/colormaps";
import { MAX_CHANNELS, MAX_CURSORS } from "./channelLimits";
import {
  buildChannelUniformData,
  blendModeToInt,
  sourceScalarWindow,
  type ChannelUniformData,
  type ChannelWindowData,
} from "./channelUniforms";

/**
 * Compositor uniforms for a MERGED volume pass — several co-pool layers drawn
 * in one raymarch.
 *
 * The single-layer layout already had the right shape for this: per-slot
 * scalars in two packed vec4 arrays, everything phasor-specific in textures.
 * Merging concatenates members' slots into those same 16 and slices them per
 * member, so the material gains no new uniform BINDINGS — which matters,
 * because every `uniformArray` is its own binding on the WebGPU backend and the
 * material already sits near the 12-per-stage device limit. The per-member
 * scalars below are plain `uniform()` nodes, which pack into three's shared
 * node uniform group and cost no binding.
 *
 * Each member is built by the EXISTING `buildChannelUniformData` and then
 * re-based onto its slot offset. That keeps one implementation of the
 * source/phasor/cursor semantics rather than a parallel copy that could drift —
 * and it is what lets the single-member case be asserted byte-identical to the
 * unmerged path (see `mergedChannelUniforms.test.ts`).
 */

export type MergedMemberInput = {
  layerId: string;
  layer: LayerState | undefined;
  /** Where this member's slots start in the merged arrays. */
  slotOffset: number;
};

export type MergedMemberUniforms = {
  layerId: string;
  /** First merged slot index this member owns. */
  slotFirst: number;
  /** How many merged slots it owns (already truncated to what fits). */
  slotCount: number;
  /** Per-member, applied across that member's own slots. */
  blendMode: number;
  /** `projectionModeToInt(layer.projection)` — filled by the caller. */
  projectionMode: number;
  /**
   * Whether any of this member's USED slots is a phasor source. Compile-time
   * input to the material: a member without phasors gets the phasor branch
   * (extra taps, atan/tan/sqrt, the 16×24 cursor loop) omitted from its WGSL
   * entirely. The material must be REBUILT when this flips — the layer keys
   * its bundle memo on it.
   */
  hasPhasorSources: boolean;
  /**
   * Whether this member is ONE plain scalar channel — `LayerState.renderKind
   * === "intensity"` AND exactly one used slot.
   *
   * A second compile-time input, alongside `hasPhasorSources` and read the same
   * way: it lets the material emit this member's contribution as straight-line
   * code instead of a dynamic loop over its slots. What that removes from the
   * innermost (ray-step × slot) region is a loop header, the `k >= slotCount`
   * `Break`, the per-slot visibility `Continue` and the three-way blend branch —
   * exact, because at one slot additive and normal both reduce to
   * `color * weight` over a zero-seeded accumulator (`resolveRenderKind` is what
   * keeps MULTIPLICATIVE, which does NOT reduce, out of the arm).
   *
   * The `renderKind` half is EARNED from the layer's sources, so a layer that
   * gains a curve or an invert demotes itself; the material must be REBUILT
   * when this flips, which the layer's bundle memo keys on.
   */
  isSimpleIntensity: boolean;
  /**
   * Whether this member is THREE basis-tinted channels over one window —
   * `LayerState.renderKind === "rgb"` AND exactly three used slots (a member
   * truncated by the merged 16 keeps the general path, as above).
   *
   * Third compile-time input. The `emitRgb` arm emits three taps assembled
   * straight into a vec3 — no LUT sample, no `pow`, no loop — exact because
   * the general path's tint rows are constant (see `rgbUniforms.ts`).
   */
  isRgb: boolean;
};

/**
 * The plain-scalar uniforms a FIXED-SHAPE member (simple intensity / rgb)
 * reads instead of indexing `chParamsA/B` — sliced out of the merged arrays
 * for that member's slots, so they are byte-identical to what the general
 * arm would have read at `slotFirst..slotFirst+slotCount`. The layer pushes
 * these through `updateMergedMemberNodes`; the material never touches the
 * arrays for such a member (and, when EVERY member is fixed-shape, does not
 * allocate them at all).
 */
export type FixedMemberUniforms = {
  /** Up to three slab indices (slot order). Unused entries are 0. */
  slabs: [number, number, number];
  climMin: number;
  climMax: number;
  gamma: number;
  /** Colormap-atlas row of slot 0 (intensity only; rgb samples no LUT). */
  row: number;
  /** Per-slot opacity of the first three slots — an rgb member's white-balance
   *  gains (`normalizeRgbLayer`). The intensity arm ignores them. */
  gains: [number, number, number];
};

export function fixedMemberUniforms(
  data: Pick<
    ChannelUniformData,
    "channelIndex" | "climMin" | "climMax" | "gamma" | "row" | "opacity"
  >,
  member: Pick<MergedMemberUniforms, "slotFirst" | "slotCount">,
): FixedMemberUniforms {
  const at = (k: number) => member.slotFirst + Math.min(k, Math.max(0, member.slotCount - 1));
  return {
    slabs: [
      data.channelIndex[at(0)] ?? 0,
      data.channelIndex[at(1)] ?? 0,
      data.channelIndex[at(2)] ?? 0,
    ],
    climMin: data.climMin[member.slotFirst] ?? 0,
    climMax: data.climMax[member.slotFirst] ?? 1,
    gamma: data.gamma[member.slotFirst] ?? 1,
    row: data.row[member.slotFirst] ?? 0,
    gains: [data.opacity[at(0)] ?? 1, data.opacity[at(1)] ?? 1, data.opacity[at(2)] ?? 1],
  };
}

export type MergedChannelUniformData = Omit<
  ChannelUniformData,
  "numChannels" | "blendMode"
> & {
  /** Total slots used across every member. */
  numChannels: number;
  /** Blend of the FIRST member — kept only so the merged data can stand in for
   * `ChannelUniformData` where a single blend is expected; the shader reads the
   * per-member value from `members` instead. */
  blendMode: number;
  members: MergedMemberUniforms[];
};

const dataTexture = (width: number, height: number): THREE.DataTexture => {
  const texture = new THREE.DataTexture(
    new Float32Array(width * height * 4),
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};

/** Texels per row of the source-params texture (mirrors channelUniforms). */
const SOURCE_PARAM_TEXELS = 3;
/** Texels per row of the cursor texture: 2 header + packed point pairs. */
const CURSOR_TEXELS = 2 + 24 / 2;

/**
 * The merged per-slot WINDOW scalars — the allocation-free counterpart of
 * `buildMergedChannelUniformData` for window-only edits (a clim/gamma drag).
 * Slot layout comes from the LAST BUILT merged data's `members` (valid while
 * the structure signature is unchanged — the layout is structural), and the
 * per-source math is `sourceScalarWindow`, the exact code the full rebuild
 * runs. `updateChannelWindows` (brickNodeMaterials) writes the result into
 * the existing uniform nodes.
 */
export function buildMergedChannelWindows(
  members: readonly MergedMemberInput[],
  memberSlots: readonly Pick<MergedMemberUniforms, "slotFirst" | "slotCount">[],
  minValue: number,
  maxValue: number,
): ChannelWindowData {
  const climMin = new Array<number>(MAX_CHANNELS).fill(0);
  const climMax = new Array<number>(MAX_CHANNELS).fill(1);
  const gamma = new Array<number>(MAX_CHANNELS).fill(1);
  const opacity = new Array<number>(MAX_CHANNELS).fill(1);

  members.forEach((input, m) => {
    const slots = memberSlots[m];
    if (!slots) return;
    const sources = (input.layer?.sources ?? input.layer?.channels ?? []).slice(
      0,
      slots.slotCount,
    );
    sources.forEach((source, i) => {
      const to = slots.slotFirst + i;
      if (to >= MAX_CHANNELS) return;
      const window = sourceScalarWindow(source, minValue, maxValue);
      climMin[to] = window.climMin;
      climMax[to] = window.climMax;
      gamma[to] = window.gamma;
      opacity[to] = window.opacity;
    });
  });

  return { climMin, climMax, gamma, opacity };
}

export function buildMergedChannelUniformData(
  members: readonly MergedMemberInput[],
  maxChannelIndex: number,
  minValue: number,
  maxValue: number,
  geometry: { slabs: readonly SlabDesc[]; channelSlabCount: number } | undefined,
  projectionModeOf: (layer: LayerState | undefined) => number,
): MergedChannelUniformData {
  const channelIndex = new Array<number>(MAX_CHANNELS).fill(0);
  const climMin = new Array<number>(MAX_CHANNELS).fill(0);
  const climMax = new Array<number>(MAX_CHANNELS).fill(1);
  const gamma = new Array<number>(MAX_CHANNELS).fill(1);
  const opacity = new Array<number>(MAX_CHANNELS).fill(1);
  const visible = new Array<number>(MAX_CHANNELS).fill(0);
  const invert = new Array<number>(MAX_CHANNELS).fill(0);
  const row = new Array<number>(MAX_CHANNELS).fill(0);

  const sourceParams = dataTexture(SOURCE_PARAM_TEXELS, MAX_CHANNELS);
  const params = sourceParams.image.data as Float32Array;
  const cursors = dataTexture(CURSOR_TEXELS, MAX_CURSORS);
  const cursorData = cursors.image.data as Float32Array;

  const colormapSpecs: Parameters<typeof buildColormapAtlas>[0] = [];
  const out: MergedMemberUniforms[] = [];
  let cursorCount = 0;
  let used = 0;

  for (const input of members) {
    // One implementation of the per-source semantics, reused verbatim.
    const single = buildChannelUniformData(
      input.layer,
      maxChannelIndex,
      minValue,
      maxValue,
      geometry,
    );
    const slotFirst = used;
    const slotCount = Math.min(single.numChannels, MAX_CHANNELS - used);

    for (let i = 0; i < slotCount; i++) {
      const to = slotFirst + i;
      channelIndex[to] = single.channelIndex[i];
      climMin[to] = single.climMin[i];
      climMax[to] = single.climMax[i];
      gamma[to] = single.gamma[i];
      opacity[to] = single.opacity[i];
      visible[to] = single.visible[i];
      invert[to] = single.invert[i];
      // `row` is rebased below, once the merged atlas height is known.
      const from = i * SOURCE_PARAM_TEXELS * 4;
      params.set(
        (single.sourceParams.image.data as Float32Array).subarray(
          from,
          from + SOURCE_PARAM_TEXELS * 4,
        ),
        to * SOURCE_PARAM_TEXELS * 4,
      );
    }

    // Cursors carry the slot they belong to in their header (texel 0, .y), so
    // that field must be rebased onto the merged slot numbering.
    const singleCursors = single.cursors.image.data as Float32Array;
    for (let c = 0; c < single.cursorCount && cursorCount < MAX_CURSORS; c++) {
      const from = c * CURSOR_TEXELS * 4;
      const to = cursorCount * CURSOR_TEXELS * 4;
      cursorData.set(singleCursors.subarray(from, from + CURSOR_TEXELS * 4), to);
      const localSlot = singleCursors[from + 1];
      if (localSlot >= slotCount) {
        // Its source was truncated away; render nothing rather than paint over
        // another member's slot.
        cursorData[to + 3] = 0;
      }
      cursorData[to + 1] = slotFirst + localSlot;
      cursorCount += 1;
    }

    const memberSources = (input.layer?.sources ?? input.layer?.channels ?? []).slice(
      0,
      MAX_CHANNELS,
    );
    for (let i = 0; i < slotCount; i++) {
      const source = memberSources[i];
      colormapSpecs.push(
        source
          ? source.type === "phasor"
            ? { colormap: source.transfer.colormap, color: null }
            : {
                colormap: source.transfer.colormap,
                color: source.transfer.color,
                colorStops: source.transfer.colorStops,
                curve: source.transfer.stops,
              }
          : { colormap: input.layer?.colormap, color: input.layer?.color },
      );
    }
    // A member with no sources still contributes the layer-level fallback row,
    // exactly as the single-layer builder does.
    if (slotCount === 0 && single.numChannels === 0) {
      colormapSpecs.push({ colormap: input.layer?.colormap, color: input.layer?.color });
    }

    out.push({
      layerId: input.layerId,
      slotFirst,
      slotCount,
      blendMode: blendModeToInt(input.layer?.blend),
      projectionMode: projectionModeOf(input.layer),
      hasPhasorSources: memberSources
        .slice(0, slotCount)
        .some((source) => source?.type === "phasor"),
      // BOTH halves are required. `renderKind` promises the transfer is plain
      // and the blend collapses; `slotCount === 1` is what makes the loop
      // removable — a truncated member (its slots did not fit the merged 16)
      // must keep the general path.
      isSimpleIntensity: input.layer?.renderKind === "intensity" && slotCount === 1,
      isRgb: input.layer?.renderKind === "rgb" && slotCount === 3,
    });

    single.atlas.dispose();
    single.sourceParams.dispose();
    single.cursors.dispose();
    used += slotCount;
  }

  const atlas = buildColormapAtlas(
    colormapSpecs as Parameters<typeof buildColormapAtlas>[0],
  );
  // Rows index the MERGED atlas, whose height is the total spec count.
  const rows = Math.max(1, colormapSpecs.length);
  for (let i = 0; i < used; i++) row[i] = (i + 0.5) / rows;

  sourceParams.needsUpdate = true;
  cursors.needsUpdate = true;

  return {
    atlas,
    numChannels: used,
    blendMode: out[0]?.blendMode ?? 0,
    channelIndex,
    climMin,
    climMax,
    gamma,
    opacity,
    visible,
    invert,
    row,
    sourceParams,
    cursors,
    cursorCount,
    members: out,
  };
}
