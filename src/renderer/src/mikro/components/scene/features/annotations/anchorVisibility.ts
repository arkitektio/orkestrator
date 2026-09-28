import type { DimSliceFragment } from "@/mikro/api/graphql";
import { buildSliceMap, resolveFixedDimIndex } from "../../platform/coords/selection";

/**
 * Is a coordinate anchor's metadata about what the layer is showing right now?
 *
 * A `CoordinateAnchor` pins metadata (a channel label, a value histogram, the
 * light path, the microscope state) to coordinates of a dataset — LEVEL-0 pixel
 * indices of its INTRINSIC system, e.g. `{"c": 0, "t": 5}`. The rule the schema
 * states twice: an anchor that omits an axis is GLOBAL along it. Its slab is one
 * voxel wide where it pins and the container's full extent where it does not.
 *
 * So an anchor is in view when every axis it pins is currently showing that
 * index. Four kinds of axis answer that differently:
 *
 * - **Whole axes** — the spatial render axes (x/y/z) and the phasor axis. Every
 *   index is on screen: x/y are drawn in full, and the phasor reduction consumes
 *   every bin of its axis (which is why it gets no dim slider,
 *   `sliceSignature.collapsibleDims`). A pin here is always met. Generous for z
 *   in 2D mode, where only one slab is drawn — z pins are vanishingly rare, and
 *   `viewerStore.layerViewRanges` is the refinement if that ever changes.
 * - **The intensity axis** — a layer renders SEVERAL channels at once, one
 *   render node each. A pin is met when some *visible* node selects that index,
 *   so toggling a channel off takes its metadata with it.
 * - **Collapsed dims** (t, tau, …) — at exactly one index, resolved the way the
 *   brick pools and the probe resolve it (`resolveFixedDimIndex`: the scene-wide
 *   slider selection clamped, else the lens slice's collapsed default). Matching
 *   any other way would show metadata for a slice that is not being fetched.
 * - **Anything else** — an axis the dataset does not have. Unmet: we cannot
 *   evaluate the pin, and claiming it is in view would be a lie.
 */

/** A layer's level-0 shape: the intrinsic pixel extent anchor coordinates index. */
type DataArrayLike = { level: number; shape: readonly number[] };

/**
 * The slice of a layer this module needs. Structural, so `LayerState` satisfies
 * it and a test needs a five-field object rather than a whole scene.
 */
export type AnchorLayer = {
  intensityAxis: string | null;
  phasorAxis: string | null;
  channels: readonly { intensityIndex: number; visible: boolean }[];
  phasors: readonly { intensityIndex: number; visible: boolean }[];
  lens: {
    slices?: readonly DimSliceFragment[] | null;
    renderAxes?: {
      x?: string | null;
      y?: string | null;
      z?: string | null;
    } | null;
    dataset: {
      axisNames?: readonly string[] | null;
      dataArrays?: readonly DataArrayLike[] | null;
    };
  };
};

/** What a layer currently has on screen, per axis. */
export type LayerCoverage = {
  /** Every axis the dataset has, in array order. A pin outside this is unmet. */
  axisNames: readonly string[];
  /** Axes shown in full — a pin along one is always met. */
  whole: ReadonlySet<string>;
  /** Collapsed dims and the single index each sits at. */
  fixed: Readonly<Record<string, number>>;
  intensityAxis: string | null;
  /** Indices the layer's VISIBLE channel/phasor nodes select. */
  intensityIndices: ReadonlySet<number>;
};

const level0Of = (
  dataArrays: readonly DataArrayLike[] | null | undefined,
): DataArrayLike | null =>
  (dataArrays ?? []).reduce<DataArrayLike | null>(
    (best, da) => (best === null || da.level < best.level ? da : best),
    null,
  );

export function layerCoverage(
  layer: AnchorLayer,
  dimSelections: Readonly<Record<string, number>>,
): LayerCoverage {
  const axisNames = layer.lens.dataset.axisNames ?? [];
  const renderAxes = layer.lens.renderAxes;
  const whole = new Set(
    [renderAxes?.x, renderAxes?.y, renderAxes?.z, layer.phasorAxis].filter(
      (axis): axis is string => Boolean(axis),
    ),
  );

  const level0 = level0Of(layer.lens.dataset.dataArrays);
  const sliceMap = buildSliceMap(layer.lens.slices ?? []);
  const fixed: Record<string, number> = {};
  axisNames.forEach((axis, position) => {
    if (whole.has(axis) || axis === layer.intensityAxis) return;
    fixed[axis] = resolveFixedDimIndex(
      sliceMap[axis],
      dimSelections[axis],
      level0?.shape[position] ?? 1,
    );
  });

  const intensityIndices = new Set<number>();
  for (const node of [...layer.channels, ...layer.phasors]) {
    if (node.visible) intensityIndices.add(node.intensityIndex);
  }

  return {
    axisNames,
    whole,
    fixed,
    intensityAxis: layer.intensityAxis,
    intensityIndices,
  };
}

/** One axis an anchor pins, and whether the layer is showing that index. */
export type AnchorPin = {
  axis: string;
  /** Null when the pin's value was not a readable integer. */
  value: number | null;
  met: boolean;
  /** What the layer shows along this axis, for the "why not" line. */
  current: string;
};

export type AnchorMatch = {
  /** True when every pin is met — including the vacuous case of no pins. */
  satisfied: boolean;
  pins: AnchorPin[];
};

/**
 * One pin against one layer's coverage. Exported because annotations pin the
 * same way anchors do (`Coordinate` = axis + index) but answer a different
 * question with the verdict — see `annotationVisibility.ts`.
 */
export const evaluatePin = (
  axis: string,
  value: number,
  coverage: LayerCoverage,
): { met: boolean; current: string } => {
  if (!coverage.axisNames.includes(axis)) {
    return { met: false, current: "no such axis" };
  }
  if (coverage.whole.has(axis)) {
    return { met: true, current: "all" };
  }
  if (axis === coverage.intensityAxis) {
    const shown = [...coverage.intensityIndices].sort((a, b) => a - b);
    return {
      met: coverage.intensityIndices.has(value),
      current: shown.length > 0 ? shown.join(", ") : "none visible",
    };
  }
  const current = coverage.fixed[axis];
  if (current === undefined) return { met: false, current: "unresolved" };
  return { met: current === value, current: String(current) };
};

/**
 * Match one anchor's `coordinates` against a layer's coverage.
 *
 * `coordinates` is the `Any` scalar — unvalidated JSON off the wire. Anything
 * that is not an object of axis→index degrades to "pins nothing", i.e. global,
 * because that is what an anchor with no readable pins actually claims. An
 * individual pin we cannot read is a different matter: it is a claim we failed
 * to evaluate, so it counts as unmet rather than silently ignored.
 */
export function matchAnchor(
  coordinates: unknown,
  coverage: LayerCoverage,
): AnchorMatch {
  const pins: AnchorPin[] = [];

  if (
    typeof coordinates !== "object" ||
    coordinates === null ||
    Array.isArray(coordinates)
  ) {
    return { satisfied: true, pins };
  }

  for (const [axis, raw] of Object.entries(
    coordinates as Record<string, unknown>,
  )) {
    // An explicitly null value pins nothing — same as omitting the axis.
    if (raw === null || raw === undefined) continue;

    const value =
      typeof raw === "number"
        ? raw
        : typeof raw === "string" && raw.trim() !== ""
          ? Number(raw)
          : Number.NaN;

    if (!Number.isInteger(value)) {
      pins.push({ axis, value: null, met: false, current: "unreadable pin" });
      continue;
    }

    pins.push({ axis, value, ...evaluatePin(axis, value, coverage) });
  }

  return { satisfied: pins.every((pin) => pin.met), pins };
}

/** Human-readable pin list for a row header, e.g. `c=0, t=5`. Empty = global. */
export const describePins = (pins: readonly AnchorPin[]): string =>
  pins.map((pin) => `${pin.axis}=${pin.value ?? "?"}`).join(", ");
