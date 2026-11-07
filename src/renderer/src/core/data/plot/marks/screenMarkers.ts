import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";
import { segmentCapacityFor } from "./segmentGeometry";

// three's TSL TypeScript surface lags the runtime API (swizzles, node-valued
// math); the node graph is built untyped, the public surface hand-typed — the
// convention of `gridNodeMaterial.ts` and the brick materials.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  Discard,
  Fn,
  abs,
  attribute,
  cameraProjectionMatrix,
  float,
  max,
  min,
  modelViewMatrix,
  positionGeometry,
  screenDPR,
  select,
  uniform,
  varying,
  vec2,
  vec4,
  viewport,
} = TSL;

/**
 * Markers drawn as SHAPES: one quad per point, sized in screen pixels, the
 * shape cut out of it in the fragment stage.
 *
 * A fat line's round caps can only ever be a disc, which is what markers were.
 * Here each point is an instance of one unit quad: the vertex stage projects
 * the point's centre through the object's matrix (an AXIS chart's row matrix,
 * a plane's origin) and the camera, then pushes the corners out by the marker
 * size in CSS pixels — so the size is the same at any zoom and a non-uniform
 * row scale never stretches a marker. The fragment stage keeps what lies
 * inside the shape and discards the rest: hard-edged, like the fat lines'
 * caps (the renderer runs without MSAA).
 *
 * The point buffer is the SAME 6-floats-per-point pair buffer the fat-line
 * dots used (`markerDots`, `packDots`): the centre is a pair's start, the
 * colour a pair's start colour. Nothing is packed twice.
 */

export type MarkerShape = "CIRCLE" | "SQUARE" | "DIAMOND" | "TRIANGLE" | "PLUS" | "CROSS";

/** In the order the shader indexes them. */
export const MARKER_SHAPES: readonly MarkerShape[] = ["CIRCLE", "SQUARE", "DIAMOND", "TRIANGLE", "PLUS", "CROSS"];

export const markerShapeIndex = (shape: MarkerShape | null | undefined): number =>
  Math.max(0, MARKER_SHAPES.indexOf(shape ?? "CIRCLE"));

const FLOATS_PER_POINT = 6;

/** How thick a plus or a cross's arms are, as a fraction of the marker. */
const ARM = 0.13;
/** How far a plus's arms reach (to the quad's edge), and a cross's (along the diagonal, near its corners: as big as the plus). */
const PLUS_REACH = 0.5;
const CROSS_REACH = 0.68;
/** A square's half side: a little inside the quad, so it weighs like a disc of the same size. */
const SQUARE = 0.4;
/** The triangle: apex up, base below, as fractions of the quad. */
const TRI_TOP = 0.45;
const TRI_BOTTOM = -0.38;
const TRI_HALF_BASE = 0.48;

/**
 * Whether a point of the marker's quad (each coordinate in −0.5…0.5, y up)
 * lies inside the shape. The shader's test, as plain math: what the tests pin.
 */
export const insideMarker = (shape: MarkerShape, x: number, y: number): boolean => {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const plus = (a: number, b: number, reach: number) => (a <= ARM && b <= reach) || (b <= ARM && a <= reach);
  switch (shape) {
    case "CIRCLE":
      return x * x + y * y <= 0.25;
    case "SQUARE":
      return Math.max(ax, ay) <= SQUARE;
    case "DIAMOND":
      return ax + ay <= 0.5;
    case "TRIANGLE":
      return y >= TRI_BOTTOM && ax * (TRI_TOP - TRI_BOTTOM) <= TRI_HALF_BASE * (TRI_TOP - y);
    case "PLUS":
      return plus(ax, ay, PLUS_REACH);
    case "CROSS": {
      const u = Math.abs((x + y) / Math.SQRT2);
      const v = Math.abs((x - y) / Math.SQRT2);
      return plus(u, v, CROSS_REACH);
    }
  }
};

/** A quad's corners and an instanced, in-place-writable point buffer (`segmentGeometry.ts`'s contract). */
export const createMarkerGeometry = (capacity: number, withColors: boolean): THREE.InstancedBufferGeometry => {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const centers = new THREE.InstancedInterleavedBuffer(new Float32Array(capacity * FLOATS_PER_POINT), FLOATS_PER_POINT, 1);
  geometry.setAttribute("markerCenter", new THREE.InterleavedBufferAttribute(centers, 3, 0));
  if (withColors) {
    const colors = new THREE.InstancedInterleavedBuffer(new Float32Array(capacity * FLOATS_PER_POINT), FLOATS_PER_POINT, 1);
    geometry.setAttribute("markerColor", new THREE.InterleavedBufferAttribute(colors, 3, 0));
  }
  geometry.instanceCount = 0;
  return geometry;
};

const writeInterleaved = (geometry: THREE.InstancedBufferGeometry, name: string, values: Float32Array, count: number) => {
  const attribute = geometry.getAttribute(name) as THREE.InterleavedBufferAttribute | undefined;
  if (!attribute) return;
  (attribute.data.array as Float32Array).set(values.subarray(0, count * FLOATS_PER_POINT));
  attribute.data.needsUpdate = true;
};

/** Write `count` points (a pair buffer's starts) and their colours in place. */
export const writeMarkers = (
  geometry: THREE.InstancedBufferGeometry,
  pairs: Float32Array,
  count: number,
  colors?: Float32Array | null,
): void => {
  writeInterleaved(geometry, "markerCenter", pairs, count);
  if (colors) writeInterleaved(geometry, "markerColor", colors, count);
  geometry.instanceCount = count;
};

type UniformLike<T> = { value: T };

export type MarkerMaterialHandle = {
  material: MeshBasicNodeMaterial;
  uniforms: { size: UniformLike<number>; shape: UniformLike<number>; color: UniformLike<THREE.Color> };
};

/** The marker material: screen-space quads, the shape a uniform (so switching it never recompiles). */
export const createMarkerMaterial = (withColors: boolean): MarkerMaterialHandle => {
  const uniforms = {
    size: uniform(5),
    shape: uniform(0),
    color: uniform(new THREE.Color("#ffffff")),
  };
  const u = uniforms as unknown as Record<keyof typeof uniforms, any>;

  const material = new MeshBasicNodeMaterial();
  material.depthWrite = false;

  material.vertexNode = Fn(() => {
    const center = attribute("markerCenter", "vec3");
    const clip = cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(center, 1.0))).toVar();
    // The viewport is in device pixels; a marker's size is in CSS pixels, as a line's width is.
    const css = vec2(viewport.z, viewport.w).div(screenDPR);
    const ndc = positionGeometry.xy.mul(u.size).mul(2.0).div(css);
    return clip.add(vec4(ndc.mul(clip.w), 0.0, 0.0));
  })();

  const p = varying(positionGeometry.xy);
  const on = (condition: any) => select(condition, float(1.0), float(0.0));
  material.colorNode = Fn(() => {
    const ax = abs(p.x);
    const ay = abs(p.y);
    const plusOf = (a: any, b: any, reach: number) =>
      max(
        min(on(a.lessThanEqual(ARM)), on(b.lessThanEqual(reach))),
        min(on(b.lessThanEqual(ARM)), on(a.lessThanEqual(reach))),
      );
    const circle = on(p.x.mul(p.x).add(p.y.mul(p.y)).lessThanEqual(0.25));
    const square = on(max(ax, ay).lessThanEqual(SQUARE));
    const diamond = on(ax.add(ay).lessThanEqual(0.5));
    const triangle = min(
      on(p.y.greaterThanEqual(TRI_BOTTOM)),
      on(ax.mul(TRI_TOP - TRI_BOTTOM).lessThanEqual(float(TRI_TOP).sub(p.y).mul(TRI_HALF_BASE))),
    );
    const plus = plusOf(ax, ay, PLUS_REACH);
    const cross = plusOf(abs(p.x.add(p.y).div(Math.SQRT2)), abs(p.x.sub(p.y).div(Math.SQRT2)), CROSS_REACH);
    const s = u.shape;
    const inside = select(
      s.lessThan(0.5),
      circle,
      select(
        s.lessThan(1.5),
        square,
        select(s.lessThan(2.5), diamond, select(s.lessThan(3.5), triangle, select(s.lessThan(4.5), plus, cross))),
      ),
    );
    Discard(inside.lessThan(0.5));
    const rgb = withColors ? attribute("markerColor", "vec3") : u.color;
    return vec4(rgb, 1.0);
  })();

  return { material, uniforms: uniforms as MarkerMaterialHandle["uniforms"] };
};

/**
 * One set of markers as a mesh: geometry sized by capacity and written in
 * place, the material's size, shape and colour as uniforms. The caller places
 * it (an AXIS row's band matrix, a plane's origin) and renders `<primitive>`.
 * Hidden while empty; the caller's placement decides when it shows.
 */
export const useScreenMarkers = ({
  pairs,
  count,
  colors,
  color,
  size,
  shape,
  opacity = 1,
}: {
  /** 6 floats per point; the point is each pair's start. */
  pairs: Float32Array;
  count: number;
  /** Per-point RGB, 6 floats per point (the start's colour), or null for `color`. */
  colors?: Float32Array | null;
  color: string;
  /** In CSS pixels. */
  size: number;
  shape: MarkerShape;
  opacity?: number;
}): THREE.Mesh => {
  const invalidate = useThree((s) => s.invalidate);
  const withColors = !!colors;
  const capacity = segmentCapacityFor(count);

  const geometry = useMemo(() => createMarkerGeometry(capacity, withColors), [capacity, withColors]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const handle = useMemo(() => createMarkerMaterial(withColors), [withColors]);
  useEffect(() => () => handle.material.dispose(), [handle]);

  const mesh = useMemo(() => {
    const m = new THREE.Mesh(geometry, handle.material);
    m.matrixAutoUpdate = false;
    m.frustumCulled = false;
    m.visible = false;
    return m;
  }, [geometry, handle]);

  // Size, shape, colour and opacity are content: uniforms, never a rebuild.
  useEffect(() => {
    handle.uniforms.size.value = size;
    handle.uniforms.shape.value = markerShapeIndex(shape);
    handle.uniforms.color.value.setStyle(color);
    const transparent = opacity < 1;
    if (handle.material.transparent !== transparent) {
      handle.material.transparent = transparent;
      handle.material.needsUpdate = true;
    }
    handle.material.opacity = opacity;
    invalidate();
  }, [handle, size, shape, color, opacity, invalidate]);

  // Before the frame that draws it, as for the fat lines: the vertex layout is
  // derived from the geometry's attributes.
  useLayoutEffect(() => {
    writeMarkers(geometry, pairs, count, colors ?? null);
    if (count === 0) mesh.visible = false;
    invalidate();
  }, [geometry, mesh, pairs, count, colors, invalidate]);

  return mesh;
};
