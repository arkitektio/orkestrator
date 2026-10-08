import { useEffect, useMemo } from "react";
import type { InterleavedBufferAttribute } from "three";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { FLOATS_PER_SEGMENT } from "@/core/data/scene/gpu/lineBuffer";

/**
 * A `LineSegmentsGeometry` with a fixed CAPACITY, written in place.
 *
 * `setPositions` / `setColors` build a new interleaved buffer on every call. The
 * WebGPU backend keeps the vertex buffer it first bound for the geometry, so
 * once a later upload holds MORE segments than the first, the draw reads past
 * the bound buffer:
 *
 *     Instance range (first: 0, count: 1581) requires a larger buffer (37944)
 *     than the bound buffer size (37800) of the vertex buffer at slot 1
 *
 * — and that one invalid draw invalidates the whole frame's command buffer, so
 * EVERY layer vanishes until the count drops back. A trace repacked to the pixel
 * grid changes its segment count on every zoom, so this was "traces disappear
 * sometimes while panning and zooming".
 *
 * So the buffers are allocated once at a capacity and overwritten in place
 * (`needsUpdate` → one `writeBuffer`, the pattern of `@/lib/scene/gpu/lineBuffer`),
 * with `instanceCount` bounding the draw. A count past the capacity builds a NEW
 * geometry (a new object the backend binds afresh); capacities step by 4× so a
 * zoom sweep reallocates a handful of times, not per frame. As a side effect the
 * `instance*` attributes exist from construction, so a `Line2NodeMaterial` never
 * compiles against a geometry that lacks them.
 */

const MIN_CAPACITY = 256;

/** The capacity that holds `count` segments: 256, 1024, 4096, … */
export const segmentCapacityFor = (count: number): number => {
  let capacity = MIN_CAPACITY;
  while (capacity < count) capacity *= 4;
  return capacity;
};

export const createSegmentGeometry = (capacity: number, withColors: boolean): LineSegmentsGeometry => {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(new Float32Array(capacity * FLOATS_PER_SEGMENT));
  if (withColors) geometry.setColors(new Float32Array(capacity * FLOATS_PER_SEGMENT));
  geometry.instanceCount = 0;
  return geometry;
};

const writeInterleaved = (geometry: LineSegmentsGeometry, name: string, values: Float32Array, count: number) => {
  const attribute = geometry.getAttribute(name) as InterleavedBufferAttribute | undefined;
  if (!attribute) return;
  const buffer = attribute.data;
  (buffer.array as Float32Array).set(values.subarray(0, count * FLOATS_PER_SEGMENT));
  buffer.needsUpdate = true;
};

/**
 * Write `count` segments (6 floats each) — and, for a coloured geometry, their
 * per-vertex colours (6 floats each: start rgb, end rgb) — into the existing
 * buffers. The geometry MUST have been sized for `count` (`useSegmentGeometry`).
 */
export const writeSegments = (
  geometry: LineSegmentsGeometry,
  pairs: Float32Array,
  count: number,
  colors?: Float32Array | null,
): void => {
  writeInterleaved(geometry, "instanceStart", pairs, count);
  if (colors) writeInterleaved(geometry, "instanceColorStart", colors, count);
  geometry.instanceCount = count;
};

/**
 * The geometry for up to `count` segments: stable while the count fits its
 * capacity, replaced (and the old one disposed) when it outgrows it or when
 * colours are switched on or off.
 */
export const useSegmentGeometry = (count: number, withColors: boolean): LineSegmentsGeometry => {
  const capacity = segmentCapacityFor(count);
  const geometry = useMemo(() => createSegmentGeometry(capacity, withColors), [capacity, withColors]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
};
