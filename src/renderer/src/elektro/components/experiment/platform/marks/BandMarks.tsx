import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { Line2NodeMaterial, MeshBasicNodeMaterial } from "three/webgpu";
import { bindField } from "@/lib/scene/stores/bindStore";
import { bandKey, useViewerStoreApi, type Band } from "../stores/viewerStore";
import { useSegmentGeometry, writeSegments } from "./segmentGeometry";

/**
 * Drawing point marks — spike ticks, event instants, intervals, density bars —
 * inside one layer's row.
 *
 * Geometry is built in LANE UNITS: lane `i` of a layer spans y ∈ [−i, −(i+1)],
 * x is world time − origin. The OBJECT MATRIX maps lane units into the layer's
 * band (the row `stackLayout` gave it), so a relayout — a layer hidden, rows
 * reordered — is one matrix write per object, never a rebuild. The same rule the
 * trace lines follow.
 */

/** Lane units → world y for a band holding `laneCount` lanes. */
export const laneMatrixY = (band: Pick<Band, "top" | "bottom">, laneCount: number) => ({
  scale: (band.top - band.bottom) / Math.max(1, laneCount),
  offset: band.top,
});

/** Bind an object's matrix to its layer's band; hidden until a band exists. */
export const useBandMatrix = (object: THREE.Object3D, layerId: string, laneCount: number) => {
  const invalidate = useThree((s) => s.invalidate);
  const viewerApi = useViewerStoreApi();
  useEffect(
    () =>
      bindField(
        viewerApi,
        (s) => s.bands[bandKey(layerId, 0)],
        (band) => {
          if (!band) {
            object.visible = false;
            invalidate();
            return;
          }
          const { scale, offset } = laneMatrixY(band, laneCount);
          object.matrix.set(1, 0, 0, 0, 0, scale, 0, offset, 0, 0, 1, 0, 0, 0, 0, 1);
          object.matrixWorldNeedsUpdate = true;
          object.visible = true;
          invalidate();
        },
      ),
    [object, viewerApi, layerId, laneCount, invalidate],
  );
};

/**
 * Vertical ticks, one per mark: `(x, lane top) → (x, lane bottom)`, inset by
 * `height` (the fraction of the lane a tick fills). Per-tick colours, when given,
 * are RGB triples in mark order.
 */
export const TickLines = ({
  layerId,
  xs,
  lanes,
  laneCount,
  height = 0.8,
  color,
  colors,
  lineWidth = 1,
}: {
  layerId: string;
  xs: ArrayLike<number>;
  lanes?: ArrayLike<number> | null;
  laneCount: number;
  height?: number;
  color: string;
  colors?: Float32Array | null;
  lineWidth?: number;
}) => {
  const invalidate = useThree((s) => s.invalidate);
  const hasColors = colors != null && colors.length >= xs.length * 3;

  const material = useMemo(() => {
    const m = new Line2NodeMaterial();
    m.worldUnits = false;
    m.depthWrite = false;
    m.vertexColors = hasColors;
    return m;
  }, [hasColors]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.color.setStyle(hasColors ? "#ffffff" : color);
    material.linewidth = lineWidth;
    invalidate();
  }, [material, color, hasColors, lineWidth, invalidate]);

  // Sized for the tick count, written in place (see `segmentGeometry.ts`: a
  // bigger buffer swapped under a bound geometry drops the whole frame).
  const geometry = useSegmentGeometry(xs.length, hasColors);

  const line = useMemo(() => {
    const l = new Line2(geometry as never, material as never);
    l.matrixAutoUpdate = false;
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }, [geometry, material]);

  // Upload before the frame that draws it (see TraceLines: a Line2 drawn before
  // its instance attributes exist compiles against their absence).
  useLayoutEffect(() => {
    const n = xs.length;
    if (n === 0) {
      geometry.instanceCount = 0;
      invalidate();
      return;
    }
    const inset = (1 - Math.max(0.05, Math.min(1, height))) / 2;
    const positions = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const lane = lanes ? lanes[i] : 0;
      const x = xs[i];
      positions.set([x, -(lane + inset), 0.5, x, -(lane + 1 - inset), 0.5], i * 6);
    }
    let perVertex: Float32Array | null = null;
    if (hasColors && colors) {
      perVertex = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const r = colors[i * 3], g = colors[i * 3 + 1], b = colors[i * 3 + 2];
        perVertex.set([r, g, b, r, g, b], i * 6);
      }
    }
    writeSegments(geometry, positions, n, perVertex);
    invalidate();
  }, [xs, lanes, height, colors, hasColors, geometry, line, material, invalidate]);

  useBandMatrix(line, layerId, laneCount);
  return <primitive object={line} renderOrder={2} />;
};

/**
 * Filled rectangles in lane units — intervals, density bars. `quads` is
 * `[x0, x1, y0, y1]` per quad (y in lane units, y0 above y1); per-quad colours
 * are RGB triples.
 */
export const BarMesh = ({
  layerId,
  quads,
  laneCount,
  color,
  colors,
  opacity = 0.35,
}: {
  layerId: string;
  quads: Float32Array;
  laneCount: number;
  color: string;
  colors?: Float32Array | null;
  opacity?: number;
}) => {
  const invalidate = useThree((s) => s.invalidate);

  const material = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    m.vertexColors = true;
    // A plain mesh: `transparent` is safe here (the viewport-copy trap is
    // specific to Line2NodeMaterial).
    m.transparent = true;
    m.depthWrite = false;
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.opacity = opacity;
    invalidate();
  }, [material, opacity, invalidate]);

  const geometry = useMemo(() => {
    const count = Math.floor(quads.length / 4);
    const positions = new Float32Array(count * 18);
    const vertexColors = new Float32Array(count * 18);
    const base = new THREE.Color().setStyle(color);
    for (let i = 0; i < count; i++) {
      const [x0, x1, y0, y1] = [quads[i * 4], quads[i * 4 + 1], quads[i * 4 + 2], quads[i * 4 + 3]];
      const right = Math.max(x1, x0 + 1e-9);
      positions.set([x0, y0, 0, right, y0, 0, right, y1, 0, x0, y0, 0, right, y1, 0, x0, y1, 0], i * 18);
      const r = colors ? colors[i * 3] : base.r;
      const g = colors ? colors[i * 3 + 1] : base.g;
      const b = colors ? colors[i * 3 + 2] : base.b;
      for (let v = 0; v < 6; v++) vertexColors.set([r, g, b], i * 18 + v * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(vertexColors, 3));
    return g;
  }, [quads, colors, color]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const mesh = useMemo(() => {
    const m = new THREE.Mesh(geometry, material);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    m.visible = false;
    return m;
  }, [geometry, material]);
  useEffect(() => invalidate(), [mesh, invalidate]);

  useBandMatrix(mesh, layerId, laneCount);
  return <primitive object={mesh} renderOrder={1} />;
};

/** Density bars in one lane: heights normalized to the tallest bin. */
export const densityQuads = (
  bins: Float32Array,
  start: number,
  end: number,
  lane = 0,
): Float32Array => {
  let max = 0;
  for (const v of bins) if (v > max) max = v;
  const width = (end - start) / Math.max(1, bins.length);
  const out: number[] = [];
  if (max <= 0) return new Float32Array(0);
  for (let i = 0; i < bins.length; i++) {
    if (bins[i] <= 0) continue;
    const h = bins[i] / max;
    out.push(start + i * width, start + (i + 1) * width, -(lane + 1 - h * 0.9), -(lane + 1));
  }
  return Float32Array.from(out);
};
