import type { LayerState } from "../../../../platform/model/layerModel";
// Type-only reach into the vector-trace strategy: `TraceHopFailure` extends
// the A* search's failure union, and a type import cannot cycle.
import type { TraceFailure } from "../paths/vectorTrace/traceSearch";

/**
 * What a trace needs to know about the LAYER it is tracing through: which
 * channel to read, how big the data is, and what to say when a hop fails.
 *
 * Pure, and separate from the hook that uses it (`features/annotations/enhancers/paths/vectorTrace/useTraceHop`),
 * because these are the decisions most likely to be quietly wrong — the channel
 * mapping especially — and they are worth testing without a scene.
 */

/** Every way a hop can come back empty-handed, search and setup alike. */
export type TraceHopFailure = TraceFailure | "no-layer" | "layer-changed";

/**
 * Which channel slab the cost function reads: the first VISIBLE channel's.
 *
 * A brick's slabs are laid out one per intensity index — `levelGeometry` builds
 * `{kind: "channel", channel}` for `channel` in `0..channelSlabCount`, and the
 * shader's uniforms agree (`channelUniforms` sets `channelIndex[i]` from the
 * source's `intensityIndex`). So the slab is the channel's INTENSITY INDEX, not
 * its position in the render graph's flattened list — a layer rendering only
 * channels 2 and 5 would otherwise be traced along channel 0, silently.
 *
 * A layer with everything hidden falls back to slab 0 rather than refusing to
 * trace; `sampleResident` clamps the index either way.
 */
export const traceChannelSlab = (
  layer: Pick<LayerState, "channels">,
): number => {
  const visible = layer.channels.find((channel) => channel.visible);
  return Math.max(0, visible?.intensityIndex ?? 0);
};

/** The layer facts the box planner needs; structural, so tests need no scene. */
export type TraceLayerShape = Pick<
  LayerState,
  "xAxis" | "yAxis" | "zAxis"
> & {
  lens: {
    dataset: {
      axisNames: readonly string[];
      dataArrays: readonly { level: number; shape: readonly number[] }[];
    };
  };
};

/**
 * Level-0 spatial extent in RENDER-axis order (x, y, z) — the order every
 * voxel coordinate in `features/annotations/enhancers/paths/vectorTrace/` is stated in, and the order the probe
 * reports `voxelIndex` in.
 *
 * A layer with no z axis is one slab deep rather than unsupported: that is the
 * flat case, and the search handles it as a degenerate box instead of as a
 * separate code path.
 */
export function traceLayerShape(
  layer: TraceLayerShape,
): [number, number, number] | null {
  const level0 = layer.lens.dataset.dataArrays.reduce<
    { level: number; shape: readonly number[] } | null
  >((best, da) => (best === null || da.level < best.level ? da : best), null);
  if (!level0) return null;

  const axisNames = layer.lens.dataset.axisNames;
  const positionOf = (axis: string | null) =>
    axis === null ? -1 : axisNames.indexOf(axis);
  const x = positionOf(layer.xAxis);
  const y = positionOf(layer.yAxis);
  const z = positionOf(layer.zAxis);
  // Without both planar axes there is no lattice to search.
  if (x === -1 || y === -1) return null;

  return [
    level0.shape[x] ?? 1,
    level0.shape[y] ?? 1,
    z === -1 ? 1 : (level0.shape[z] ?? 1),
  ];
}

/**
 * Level-0 voxels per voxel at each pyramid level, per RENDER axis.
 *
 * Measured from the levels' own shapes, never assumed to be `2 ** level`: a
 * microscopy pyramid commonly downsamples xy and leaves z alone (z is already
 * the coarse axis), so level 2 of a 512×512×64 stack is often 128×128×64 —
 * steps `[4, 4, 1]`. Stepping z by 4 there would sample every fourth slice of
 * data that was never coarsened, quietly walking past whatever sits between.
 *
 * Ordered by level, deduplicated on shape the way the brick geometry does, so
 * index 0 is always the finest.
 */
export function traceLevelSteps(layer: TraceLayerShape): [number, number, number][] {
  const axisNames = layer.lens.dataset.axisNames;
  const positionOf = (axis: string | null) =>
    axis === null ? -1 : axisNames.indexOf(axis);
  const positions: [number, number, number] = [
    positionOf(layer.xAxis),
    positionOf(layer.yAxis),
    positionOf(layer.zAxis),
  ];

  const levels = [...layer.lens.dataset.dataArrays].sort((a, b) => a.level - b.level);
  if (levels.length === 0) return [[1, 1, 1]];

  const base = levels[0];
  const extentOf = (
    array: { shape: readonly number[] },
    axis: number,
  ): number => (positions[axis] === -1 ? 1 : Math.max(1, array.shape[positions[axis]] ?? 1));

  const steps: [number, number, number][] = [];
  const seen = new Set<string>();
  for (const level of levels) {
    const step: [number, number, number] = [0, 1, 2].map((axis) =>
      Math.max(1, Math.round(extentOf(base, axis) / extentOf(level, axis))),
    ) as [number, number, number];
    const key = step.join(":");
    if (seen.has(key)) continue; // duplicate resolutions buy nothing
    seen.add(key);
    steps.push(step);
  }

  return steps;
}

/** What to tell the user when a hop finds nothing. */
export const traceFailureMessage = (reason: TraceHopFailure): string => {
  switch (reason) {
    case "blocked-endpoint":
      return "No data loaded at that point — try again on the visible structure";
    case "unreachable":
      return "No route through loaded data between those points";
    case "budget":
      return "That hop is too long — place a waypoint part-way";
    case "layer-changed":
      return "Keep the whole trace on one layer";
    case "no-layer":
      return "Nothing to trace through here";
  }
};
