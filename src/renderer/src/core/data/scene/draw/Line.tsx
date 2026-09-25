import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";
import type { ThreeEvent } from "@react-three/fiber";

type PointLike = THREE.Vector3 | [number, number, number];

export interface LineProps {
  /** Ordered polyline vertices, either Vector3 or [x, y, z] tuples. */
  points: PointLike[];
  color?: THREE.ColorRepresentation;
  /** Screen-space line width in pixels. */
  lineWidth?: number;
  dashed?: boolean;
  dashSize?: number;
  gapSize?: number;
  /**
   * Draw regardless of depth. Applied once at mount: `depthTest` is baked into
   * the WebGPU pipeline's depth-stencil state, so flipping it later needs a
   * `needsUpdate` to force a pipeline rebuild.
   */
  depthTest?: boolean;
  renderOrder?: number;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}

/**
 * WebGPU-native drop-in for drei's `<Line>`.
 *
 * drei's `<Line>` is backed by three-stdlib's `LineMaterial` — a raw WebGL
 * `ShaderMaterial` the WebGPU `NodeBuilder` cannot compile ("Material
 * 'LineMaterial' is not compatible" + an infinite `drawIndexed`). This uses the
 * WebGPU fat-line pair shipped in three 0.184 (`Line2` + `Line2NodeMaterial`),
 * which derives its screen resolution internally from the viewport node — so no
 * resolution tracking is needed here.
 */
export const Line = ({
  points,
  color = "white",
  lineWidth = 1,
  dashed = false,
  dashSize = 3,
  gapSize = 1,
  depthTest = true,
  renderOrder,
  onClick,
}: LineProps) => {
  /** The positions last handed to `setPositions`, for the value dedupe below. */
  const uploadedRef = useRef<number[] | null>(null);
  const geometry = useMemo(() => new LineGeometry(), []);
  const material = useMemo(() => new Line2NodeMaterial(), []);
  const line = useMemo(() => new Line2(geometry, material), [geometry, material]);

  // Release GPU resources when the line unmounts.
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Rebuild the vertex buffer whenever the points change. Layout effect, not
  // passive: the WGSL vertex layout is derived from the geometry's attributes,
  // so the positions must exist before the first frame draws — a bare
  // LineGeometry has no instanceStart/instanceEnd yet and the missing
  // attribute collapses to a scalar 0.0 in the generated shader
  // ("no matching constructor for vec4(abstract-float, abstract-float)").
  useLayoutEffect(() => {
    if (points.length < 2) return; // fewer than 2 points: nothing is rendered
    const flat: number[] = [];
    for (const point of points) {
      if (Array.isArray(point)) {
        flat.push(point[0], point[1], point[2]);
      } else {
        flat.push(point.x, point.y, point.z);
      }
    }
    // Compare by VALUE, not by the `points` array's identity. Callers build
    // their point arrays inline in render (`AnnotationLayer` does, for every
    // shape), so an identity dep re-uploaded every line's vertex buffer — and
    // rebuilt its line distances — on any re-render of the subtree, e.g. a
    // selection change. `setPositions` allocates fresh interleaved buffers and
    // marks the geometry for a GPU re-upload, so this is not a cheap no-op.
    const previous = uploadedRef.current;
    if (previous !== null && previous.length === flat.length) {
      let same = true;
      for (let i = 0; i < flat.length; i++) {
        if (previous[i] !== flat[i]) {
          same = false;
          break;
        }
      }
      if (same) return;
    }
    uploadedRef.current = flat;
    geometry.setPositions(flat);
    line.computeLineDistances(); // required for dashed rendering
  }, [points, geometry, line]);

  // Sync material appearance.
  //
  // Deliberately NOT setting `material.transparent`. On a Line2NodeMaterial that
  // is not a blend flag: the material hard-codes `blending = NoBlending`
  // ("transparency is not supported, yet") and `transparent` instead makes its
  // setup composite the output against `viewportOpaqueMipTexture()` — a
  // singleton viewport texture with `generateMipmaps: true` and an update type
  // of RENDER. That copies the whole drawing buffer and rebuilds its full mip
  // chain *every frame a dashed line is on screen*. We never set
  // `material.opacity`, so the composite is `rgb*1 + viewport*0` — algebraically
  // a no-op. Antialiasing is unaffected; it comes from alphaToCoverage.
  useEffect(() => {
    material.color = new THREE.Color(color);
    material.linewidth = lineWidth;
    material.dashed = dashed;
    material.dashSize = dashSize;
    material.gapSize = gapSize;
    // Set here rather than in a mount-only effect so it rides along with the
    // `needsUpdate` below: `depthTest` is baked into the WebGPU pipeline's
    // depth-stencil state, so changing it needs a pipeline rebuild to take.
    material.depthTest = depthTest;
    material.needsUpdate = true;
  }, [material, color, lineWidth, dashed, dashSize, gapSize, depthTest]);

  // Never mount a Line2 whose geometry has no segments: the shader would be
  // built against a geometry without instanceStart/instanceEnd attributes.
  if (points.length < 2) return null;

  // `renderOrder` rides on the primitive so R3F applies it — no need to reach
  // into the object ourselves.
  return <primitive object={line} renderOrder={renderOrder} onClick={onClick} />;
};
