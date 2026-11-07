import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { Line2NodeMaterial, MeshBasicNodeMaterial } from "three/webgpu";
import { useScreenMarkers, type MarkerShape } from "../marks/screenMarkers";
import { useSegmentGeometry, writeSegments } from "../marks/segmentGeometry";

/**
 * The marks a plane draws, in data space: fat segments (points are segments
 * through themselves, so markers, polylines, whiskers and medians are one kind
 * of object), filled quads (bars, boxes) and an image (a heatmap).
 *
 * Every object is drawn RELATIVE to an origin its matrix translates back
 * (`planeMarkPacking.ts`). The camera's projection is the view; nothing here reads the
 * view, so a pan re-renders none of these.
 */

const atOrigin = (object: THREE.Object3D, origin: { x: number; y: number }) => {
  object.matrixAutoUpdate = false;
  object.matrix.makeTranslation(origin.x, origin.y, 0);
  object.matrixWorldNeedsUpdate = true;
};

/**
 * Fat segments in screen-pixel widths. `opacity` < 1 makes the material
 * transparent -- real alpha, so overlapping marks read as overlapping; at 1 the
 * cheaper opaque path is kept.
 */
export const PlaneSegments = ({
  pairs,
  count,
  origin,
  color,
  colors,
  width,
  opacity = 1,
  renderOrder = 2,
}: {
  pairs: Float32Array;
  count: number;
  origin: { x: number; y: number };
  color: string;
  /** Per-vertex RGB (6 floats per segment), or null for `color`. */
  colors?: Float32Array | null;
  width: number;
  opacity?: number;
  renderOrder?: number;
}) => {
  const invalidate = useThree((s) => s.invalidate);
  const withColors = !!colors;
  const material = useMemo(() => {
    const m = new Line2NodeMaterial();
    m.worldUnits = false;
    m.depthWrite = false;
    m.vertexColors = withColors;
    return m;
  }, [withColors]);
  useEffect(() => () => material.dispose(), [material]);

  useEffect(() => {
    material.color.setStyle(withColors ? "#ffffff" : color);
    material.linewidth = width;
    material.transparent = opacity < 1;
    material.opacity = opacity;
    material.needsUpdate = true;
    invalidate();
  }, [material, color, width, opacity, withColors, invalidate]);

  const geometry = useSegmentGeometry(count, withColors);
  const line = useMemo(() => {
    const l = new Line2(geometry as never, material as never);
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }, [geometry, material]);

  useLayoutEffect(() => {
    atOrigin(line, origin);
    if (count === 0) {
      line.visible = false;
      invalidate();
      return;
    }
    writeSegments(geometry, pairs, count, colors ?? null);
    line.visible = true;
    invalidate();
  }, [pairs, count, colors, geometry, line, origin, invalidate]);

  return <primitive object={line} renderOrder={renderOrder} />;
};

/**
 * Points as markers of a shape, in screen-pixel sizes (`screenMarkers.ts`):
 * the same dot buffer `PlaneSegments` drew discs from (`packDots`), its colours
 * included. `opacity` < 1 blends, as for the segments.
 */
export const PlaneMarkers = ({
  pairs,
  count,
  origin,
  color,
  colors,
  size,
  shape,
  opacity = 1,
  renderOrder = 3,
}: {
  pairs: Float32Array;
  count: number;
  origin: { x: number; y: number };
  color: string;
  colors?: Float32Array | null;
  size: number;
  shape: MarkerShape;
  opacity?: number;
  renderOrder?: number;
}) => {
  const invalidate = useThree((s) => s.invalidate);
  const mesh = useScreenMarkers({ pairs, count, colors, color, size, shape, opacity });
  useLayoutEffect(() => {
    atOrigin(mesh, origin);
    mesh.visible = count > 0;
    invalidate();
  }, [mesh, origin, count, invalidate]);
  return <primitive object={mesh} renderOrder={renderOrder} />;
};

/** Filled triangles with per-vertex colour: bars, box bodies, heatmap cells at small sizes. */
export const PlaneQuads = ({
  positions,
  colors,
  count,
  origin,
  opacity = 1,
  renderOrder = 1,
}: {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
  origin: { x: number; y: number };
  opacity?: number;
  renderOrder?: number;
}) => {
  const invalidate = useThree((s) => s.invalidate);
  const material = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    m.vertexColors = true;
    m.transparent = true;
    m.depthWrite = false;
    // Winding is meaningless for a flat overlay; do not let three cull half the quads.
    m.side = THREE.DoubleSide;
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.opacity = opacity;
    invalidate();
  }, [material, opacity, invalidate]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions.subarray(0, count * 18), 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors.subarray(0, count * 18), 3));
    return g;
  }, [positions, colors, count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const mesh = useMemo(() => {
    const m = new THREE.Mesh(geometry, material);
    m.frustumCulled = false;
    return m;
  }, [geometry, material]);
  useLayoutEffect(() => {
    atOrigin(mesh, origin);
    mesh.visible = count > 0;
    invalidate();
  }, [mesh, origin, count, invalidate]);

  return <primitive object={mesh} renderOrder={renderOrder} />;
};

/**
 * An RGBA image laid over a rectangle of data space, one texel per cell and
 * never smoothed: a heatmap of a matrix, coloured on the CPU through its
 * colormap. `rows` run upward from `y0` (row 0 at the bottom of the texture).
 */
export const PlaneImage = ({
  rgba,
  columns,
  rows,
  rect,
  opacity = 1,
  renderOrder = 0,
}: {
  rgba: Uint8Array;
  columns: number;
  rows: number;
  rect: { x0: number; x1: number; y0: number; y1: number };
  opacity?: number;
  renderOrder?: number;
}) => {
  const invalidate = useThree((s) => s.invalidate);
  const texture = useMemo(() => {
    const t = new THREE.DataTexture(rgba, Math.max(1, columns), Math.max(1, rows), THREE.RGBAFormat);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [rgba, columns, rows]);
  useEffect(() => () => texture.dispose(), [texture]);

  const material = useMemo(() => {
    const m = new MeshBasicNodeMaterial();
    m.transparent = true;
    m.depthWrite = false;
    m.side = THREE.DoubleSide;
    return m;
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.map = texture;
    material.opacity = opacity;
    material.needsUpdate = true;
    invalidate();
  }, [material, texture, opacity, invalidate]);

  const mesh = useMemo(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    m.frustumCulled = false;
    return m;
  }, [material]);
  useEffect(() => () => mesh.geometry.dispose(), [mesh]);
  useLayoutEffect(() => {
    mesh.matrixAutoUpdate = false;
    const w = rect.x1 - rect.x0;
    const h = rect.y1 - rect.y0;
    mesh.matrix.makeScale(w, h, 1).setPosition(rect.x0 + w / 2, rect.y0 + h / 2, 0);
    mesh.matrixWorldNeedsUpdate = true;
    invalidate();
  }, [mesh, rect.x0, rect.x1, rect.y0, rect.y1, invalidate]);

  return <primitive object={mesh} renderOrder={renderOrder} />;
};
