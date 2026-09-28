import * as THREE from "three";
import { DimSliceFragment } from "@/mikro/api/graphql";

/**
 * Canonical zarr axis-selection helpers, shared by the plane, volume and probe
 * paths. (Moved out of `layers/three_d/volume-math.ts`; the local copies in
 * PlaneLayer / SceneProbedPoint(2D) now import from here.)
 */
export type AxisSelection = {
  start: number;
  step: number;
  length: number;
};

/** Structural slice — accepts a zarrita `Slice` or a `DimSliceFragment`. */
export type SliceLike = {
  start?: number | null;
  stop?: number | null;
  step?: number | null;
};

export function resolveSpatialSelection(
  selection: null | undefined | SliceLike | number,
  axisLength: number,
): AxisSelection {
  if (typeof selection === "number") {
    const index = Math.max(0, Math.min(axisLength - 1, selection));
    return { start: index, step: 1, length: 1 };
  }

  const step = Math.max(1, selection?.step ?? 1);
  const start = Math.max(0, Math.min(axisLength, selection?.start ?? 0));
  const stop = Math.max(start, Math.min(axisLength, selection?.stop ?? axisLength));
  const length = stop <= start ? 0 : Math.max(1, Math.ceil((stop - start) / step));

  return { start, step, length };
}

export function resolveCollapsedSelection(
  slice: DimSliceFragment | undefined,
  axisLength: number,
): number {
  if (axisLength <= 1) return 0;

  const step = Math.max(1, slice?.step ?? 1);
  const start = Math.max(0, Math.min(axisLength - 1, slice?.start ?? 0));
  const exclusiveStop = Math.max(start + 1, Math.min(axisLength, slice?.stop ?? start + 1));
  const span = Math.max(1, Math.ceil((exclusiveStop - start) / step));
  const centeredIndex = start + Math.floor((span - 1) / 2) * step;

  return Math.max(0, Math.min(axisLength - 1, centeredIndex));
}

/**
 * Fixed index of a collapsible dim at pool creation: the scene-wide slider
 * selection (`viewerStore.dimSelections`, clamped to this layer's extent)
 * when present, else the lens slice's collapsed default. Pools are rebuilt
 * on slice-signature change, so a new selection takes effect via the flush.
 */
export function resolveFixedDimIndex(
  slice: DimSliceFragment | undefined,
  selection: number | undefined,
  axisLength: number,
): number {
  if (selection !== undefined) {
    return Math.max(0, Math.min(axisLength - 1, Math.round(selection)));
  }
  return resolveCollapsedSelection(slice, axisLength);
}

export function resolveVoxelIndex(normalizedPosition: number, selection: AxisSelection): number {
  const clampedPosition = THREE.MathUtils.clamp(normalizedPosition, 0, 0.999999);
  const relativeIndex = Math.min(
    selection.length - 1,
    Math.max(0, Math.floor(clampedPosition * selection.length)),
  );
  return selection.start + relativeIndex * selection.step;
}

/** Index a layer's slice list by dim key. */
export function buildSliceMap(
  slices: readonly DimSliceFragment[],
): Record<string, DimSliceFragment> {
  return slices.reduce<Record<string, DimSliceFragment>>((acc, slice) => {
    acc[slice.axis] = slice;
    return acc;
  }, {});
}
