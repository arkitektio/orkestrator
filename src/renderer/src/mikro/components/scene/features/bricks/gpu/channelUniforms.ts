import * as THREE from "three";

import { Blending, PhasorColorMode, PhasorCursorKind } from "@/mikro/api/graphql";
import type { LayerState } from "../../../platform/model/layerModel";
import { climToUnit } from "../../../platform/model/dataRange";
import type { SlabDesc } from "../../../platform/coords/levelGeometry";
import { cursorPaletteColor, resolvePhasorScale, type PhasorScale } from "../../../platform/model/phasor";
import { effectiveScalarTransfer, type PhasorRenderNode } from "../../../platform/model/renderGraph";
import { buildColormapAtlas } from "../../../platform/gpu/colormaps";
import { MAX_CHANNELS, MAX_CURSORS, MAX_CURSOR_POINTS } from "./channelLimits";
import { toBase } from "@/core/lib/quantities";

/**
 * Compositor uniform data shared by the 2D and 3D brick materials.
 *
 * A "source" is a pixel-producing leaf of the layer's render graph: a CHANNEL
 * (one atlas slab, mapped through a transfer function) or a PHASOR (three
 * slabs — g, s and a mean photon count — colored by the phasor's phase or
 * modulation). Both occupy one compositor slot and are blended by the same
 * blend mode; only the tap differs.
 *
 * Per-slot scalars live in two packed vec4 uniform ARRAYS (`chParamsA/B`).
 * Everything phasor-specific goes in TEXTURES instead (`sourceParams`,
 * `cursors`): every `uniformArray` is its own uniform-buffer binding on the
 * WebGPU backend, and the material is already close to the 12-per-stage device
 * limit (see brickNodeMaterials.ts) — textures do not count against it, and the
 * cursor list is variable-length anyway.
 */

// Capacity constants live in a leaf module so pure consumers (the merge
// planner) can import them without dragging in the GraphQL API types below.
export { MAX_CHANNELS, MAX_CURSORS, MAX_CURSOR_POINTS } from "./channelLimits";

export const SOURCE_KIND_CHANNEL = 0;
export const SOURCE_KIND_PHASOR = 1;

export const PHASOR_MODE_PHASE = 0;
export const PHASOR_MODE_MODULATION = 1;
export const PHASOR_MODE_AVERAGE = 2;

export const CURSOR_KIND_CIRCLE = 0;
export const CURSOR_KIND_POLYGON = 1;

/** Texels per row of the source-params texture. */
const SOURCE_PARAM_TEXELS = 3;
/** Texels per row of the cursor texture: 2 header + the packed point pairs. */
const CURSOR_TEXELS = 2 + MAX_CURSOR_POINTS / 2;

export const blendModeToInt = (blend: Blending | undefined): number => {
  if (blend === Blending.Multiplicative) return 1;
  if (blend === Blending.Normal) return 2;
  return 0; // ADDITIVE
};

const phasorModeToInt = (mode: PhasorColorMode): number => {
  if (mode === PhasorColorMode.Modulation) return PHASOR_MODE_MODULATION;
  if (mode === PhasorColorMode.Average) return PHASOR_MODE_AVERAGE;
  return PHASOR_MODE_PHASE;
};

export type ChannelUniformData = {
  atlas: ReturnType<typeof buildColormapAtlas>;
  numChannels: number;
  blendMode: number;
  /** Integer atlas-slab index per compositor slot (a channel's slab, or a
   * phasor's INTENSITY slab — so the intensity transfer below applies to both). */
  channelIndex: number[];
  climMin: number[];
  climMax: number[];
  gamma: number[];
  opacity: number[];
  visible: number[];
  invert: number[];
  row: number[];
  /** RGBA32F, `SOURCE_PARAM_TEXELS` × MAX_CHANNELS — the phasor half of a slot. */
  sourceParams: THREE.DataTexture;
  /** RGBA32F, `CURSOR_TEXELS` × MAX_CURSORS. */
  cursors: THREE.DataTexture;
  cursorCount: number;
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

/**
 * The value window the phasor's colormap is ranged over, in the BASE units of
 * the axis' dimension (ms / µm — `lib/quantities`), matching `phasorValue`.
 *
 * A null min/max means "range over what this axis can express", not "0..1":
 *  - with a scale, a full turn of phase is the axis' whole window (2π/ω), and
 *    for a lifetime we take HALF of it — a decay slower than half the laser
 *    period is not measurable against that laser anyway, and ranging over the
 *    full period washes every real lifetime into the bottom of the colormap;
 *  - without a scale the phasor is only readable in its own terms: phase as a
 *    fraction of a turn, modulation as a modulus. Both are already [0, 1].
 */
const resolveValueRange = (
  phasor: PhasorRenderNode,
  scale: PhasorScale,
): [number, number] => {
  const dimension = scale.dimension;
  const parse = (value: string | null): number | null => {
    if (!value) return null;
    if (!dimension) return null;
    const parsed = toBase(value, dimension, NaN);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const explicitMin = parse(phasor.transfer.min);
  const explicitMax = parse(phasor.transfer.max);

  const defaultMin = 0;
  let defaultMax = 1;
  if (scale.omega !== null) {
    const turn = (2 * Math.PI) / scale.omega;
    defaultMax = scale.dimension === "time" ? turn / 2 : turn;
  }

  const min = explicitMin ?? defaultMin;
  const max = explicitMax ?? defaultMax;
  // A degenerate window would divide by ~0 in the shader.
  return max > min ? [min, max] : [min, min + 1e-6];
};

/**
 * The scalar WINDOW of one source — the fields a contrast drag moves. ONE
 * implementation shared by the full rebuild below and the allocation-free
 * fast path (`buildChannelWindows` / `buildMergedChannelWindows`), so the
 * two cannot drift; `buildChannelWindowSignature` keys on exactly these.
 */
export function sourceScalarWindow(
  source: { type: string; transfer: any },
  minValue: number,
  maxValue: number,
): { climMin: number; climMax: number; gamma: number; opacity: number } {
  // The transfer applied to the source's INTENSITY tap: a channel's own, or a
  // phasor node's `intensity` transfer over its mean photon count. With a
  // transfer CURVE the window becomes the curve's domain and gamma collapses
  // to 1 — the curve itself is baked into the LUT row's x axis.
  const transfer = source.type === "phasor" ? source.transfer.intensity : source.transfer;
  const scalar = effectiveScalarTransfer(transfer);
  return {
    climMin: climToUnit(scalar.climMin, minValue, maxValue, 0),
    climMax: climToUnit(scalar.climMax, minValue, maxValue, 1),
    gamma: scalar.gamma,
    opacity: transfer.opacity ?? 1,
  };
}

/** The per-slot window scalars of ONE layer, in slot order — the fast-path
 * counterpart of `buildChannelUniformData` for window-only edits. */
export type ChannelWindowData = {
  climMin: number[];
  climMax: number[];
  gamma: number[];
  opacity: number[];
};

export function buildChannelWindows(
  layer: LayerState | undefined,
  minValue: number,
  maxValue: number,
): ChannelWindowData {
  const sources = (layer?.sources ?? layer?.channels ?? []).slice(0, MAX_CHANNELS);
  const climMin = new Array<number>(MAX_CHANNELS).fill(0);
  const climMax = new Array<number>(MAX_CHANNELS).fill(1);
  const gamma = new Array<number>(MAX_CHANNELS).fill(1);
  const opacity = new Array<number>(MAX_CHANNELS).fill(1);
  sources.forEach((source, i) => {
    const window = sourceScalarWindow(source, minValue, maxValue);
    climMin[i] = window.climMin;
    climMax[i] = window.climMax;
    gamma[i] = window.gamma;
    opacity[i] = window.opacity;
  });
  return { climMin, climMax, gamma, opacity };
}

export function buildChannelUniformData(
  layer: LayerState | undefined,
  maxChannelIndex: number,
  // Base-native data range (pool.minValue/maxValue). Channel clim is stored in
  // absolute base-native units and normalized into the shader's [0,1] space here.
  minValue: number = 0,
  maxValue: number = 1,
  geometry?: {
    slabs: readonly SlabDesc[];
    channelSlabCount: number;
  },
): ChannelUniformData {
  const sources = (layer?.sources ?? layer?.channels ?? []).slice(0, MAX_CHANNELS);
  const numChannels = sources.length;
  const slabs = geometry?.slabs ?? [];

  const atlas = buildColormapAtlas(
    numChannels > 0
      ? sources.map((source) =>
          source.type === "phasor"
            ? { colormap: source.transfer.colormap, color: null }
            : {
                colormap: source.transfer.colormap,
                color: source.transfer.color,
                colorStops: source.transfer.colorStops,
                curve: source.transfer.stops,
              },
        )
      : [{ colormap: layer?.colormap, color: layer?.color }],
  );

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
  const cursorTexture = dataTexture(CURSOR_TEXELS, MAX_CURSORS);
  const cursorData = cursorTexture.image.data as Float32Array;
  let cursorCount = 0;

  // Phasor nodes are numbered in tree order — the same order `levelGeometry`
  // laid their g/s/i slabs out in.
  let phasorOrdinal = 0;

  const rows = Math.max(1, numChannels);
  sources.forEach((source, i) => {
    const transfer = source.type === "phasor" ? source.transfer.intensity : source.transfer;
    const window = sourceScalarWindow(source, minValue, maxValue);

    climMin[i] = window.climMin;
    climMax[i] = window.climMax;
    gamma[i] = window.gamma;
    opacity[i] = window.opacity;
    visible[i] = source.visible ? 1 : 0;
    invert[i] = transfer.invert ? 1 : 0;
    row[i] = (i + 0.5) / rows;

    const base = i * SOURCE_PARAM_TEXELS * 4;
    if (source.type === "channel") {
      channelIndex[i] = Math.min(maxChannelIndex, Math.max(0, source.intensityIndex ?? 0));
      params[base] = SOURCE_KIND_CHANNEL;
      return;
    }

    const node = phasorOrdinal++;
    const gSlab = slabs.findIndex(
      (slab) => slab.kind === "phasor" && slab.node === node && slab.component === "g",
    );
    const sSlab = slabs.findIndex(
      (slab) => slab.kind === "phasor" && slab.node === node && slab.component === "s",
    );
    const iSlab = slabs.findIndex(
      (slab) => slab.kind === "phasor" && slab.node === node && slab.component === "i",
    );
    if (gSlab === -1 || sSlab === -1 || iSlab === -1) {
      // The slot overflowed the brick's 16 slabs (levelGeometry dropped it), or
      // the pool predates the node. Render nothing rather than tapping a slab
      // that holds someone else's data.
      visible[i] = 0;
      params[base] = SOURCE_KIND_CHANNEL;
      return;
    }

    // The phasor's intensity tap IS its mean-photon-count slab, so the ordinary
    // clim/gamma path above applies to it unchanged.
    channelIndex[i] = iSlab;

    const context = layer?.lens.phasor;
    const scale = resolvePhasorScale({
      axisType: context?.axisType,
      // The node's harmonic, not the context's: ω scales with the harmonic, and
      // the lens' default context is resolved at harmonic 1. A node on another
      // harmonic reuses this context's instrument facts (they are acquisition
      // facts, and the layer's phasor axis is one axis) with its own harmonic.
      harmonic: source.harmonic,
      laserFrequency: context?.laserFrequency,
      window: context?.window,
    });
    const [valueMin, valueMax] = resolveValueRange(source, scale);
    const calibration = context?.calibration;

    params[base] = SOURCE_KIND_PHASOR;
    params[base + 1] = gSlab;
    params[base + 2] = sSlab;
    params[base + 3] = iSlab;
    params[base + 4] = phasorModeToInt(source.transfer.mode);
    params[base + 5] = calibration?.phaseOffset ?? 0;
    params[base + 6] = calibration?.modulationFactor ?? 1;
    params[base + 7] = scale.omega ?? 0; // 0 = "no scale": raw phase/modulation
    params[base + 8] = valueMin;
    params[base + 9] = valueMax;
    params[base + 10] = source.transfer.weightByIntensity ? 1 : 0;
    params[base + 11] = 0;

    cursorCount = writeCursors(cursorData, cursorCount, i, source);
  });

  return {
    atlas,
    numChannels,
    blendMode: blendModeToInt(layer?.blend),
    channelIndex,
    climMin,
    climMax,
    gamma,
    opacity,
    visible,
    invert,
    row,
    sourceParams,
    cursors: cursorTexture,
    cursorCount,
  };
}

/**
 * Pack a phasor node's cursors into the cursor texture. One cursor per row:
 *
 *   texel 0: (kind, source slot, point count, visible)
 *   texel 1: (r, g, b, radius)          — color in [0,1], radius for a CIRCLE
 *   texel 2: (centre g, centre s, 0, 0)
 *   texel 3+: polygon vertices, two (g, s) pairs per texel
 *
 * A cursor with no explicit color takes a distinct palette color (see
 * `cursorPaletteColor`) — NOT the colormap's color at its own phasor value,
 * which is the hue those pixels already have and would paint nothing.
 */
function writeCursors(
  data: Float32Array,
  start: number,
  slot: number,
  phasor: PhasorRenderNode,
): number {
  let count = start;
  for (const cursor of phasor.transfer.cursors) {
    if (count >= MAX_CURSORS) break;
    const isPolygon = cursor.kind === PhasorCursorKind.Polygon;
    const points = (cursor.points ?? []).slice(0, MAX_CURSOR_POINTS);
    if (isPolygon && points.length < 3) continue;
    if (!isPolygon && !(cursor.radius && cursor.radius > 0)) continue;

    const base = count * CURSOR_TEXELS * 4;
    data[base] = isPolygon ? CURSOR_KIND_POLYGON : CURSOR_KIND_CIRCLE;
    data[base + 1] = slot;
    data[base + 2] = isPolygon ? points.length : 0;
    data[base + 3] = cursor.visible === false ? 0 : 1;

    const rgb = cursor.color ?? cursorPaletteColor(count);
    const color = rgb.map((channel) => channel / 255);
    data[base + 4] = color[0] ?? 1;
    data[base + 5] = color[1] ?? 1;
    data[base + 6] = color[2] ?? 1;
    data[base + 7] = cursor.radius ?? 0;

    data[base + 8] = cursor.g ?? 0;
    data[base + 9] = cursor.s ?? 0;

    for (let p = 0; p < points.length; p++) {
      const texel = base + 8 + 4 + Math.floor(p / 2) * 4;
      const half = (p % 2) * 2;
      data[texel + half] = points[p][0] ?? 0;
      data[texel + half + 1] = points[p][1] ?? 0;
    }

    count += 1;
  }
  return count;
}
