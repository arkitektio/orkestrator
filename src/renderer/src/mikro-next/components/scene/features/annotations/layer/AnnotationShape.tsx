import { memo, useMemo } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro-next/api/graphql";
import { Line } from "@/lib/scene/draw/Line";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { ellipsoidCrossSectionScale } from "../primitiveDraw";
import { MIN_DEPTH, ellipseRing, getVectorPoint } from "../annotationBounds";
import { MIN_CROSS_SECTION_SCALE } from "../annotationBatch";
import { resolveStyle, type ShapeStyle } from "../annotationStyle";
import type { SelectedRoi } from "../roiSelectionStore";

/**
 * One annotation shape, in the collection's space (the parent group applies
 * the affine). Memoized on IDENTITY: `roi` and `annotation` are stable for
 * unchanged rows (`placedAnnotations.ts`), so a poll that changes one
 * annotation re-renders one shape.
 */

/** Shared unit geometries, scaled per shape via the mesh transform. Module
 * lifetime, never disposed (P13-safe by construction). */
const UNIT_SPHERE = new THREE.SphereGeometry(1, 24, 16);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_CIRCLE_48 = new THREE.CircleGeometry(1, 48);

export type AnnotationShapeProps = {
  annotation: SceneAnnotationFragment;
  roi: SelectedRoi;
  flattenToPlane: boolean;
  /** The flat view's slice in the COLLECTION's space; null in 3D. */
  planeZ: number | null;
  isActive: boolean;
  /** False in PROBE mode, so a shape can't swallow the click meant for a probe. */
  selectable: boolean;
  /** True when the collection's merged outline batch draws the fat lines. */
  onSelectRoi: (roi: SelectedRoi, appendSelection: boolean) => void;
};

/**
 * Only the ellipse/sphere branch reads `planeZ` (the cross-section it draws);
 * every other kind renders identically for any plane, so the memo can ignore
 * z-scrub ticks for them — a scrub re-renders ONLY the sectioned shapes.
 */
export const shapeReadsPlaneZ = (annotation: SceneAnnotationFragment): boolean =>
  annotation.kind === AnnotationKind.Ellipse || annotation.kind === AnnotationKind.Sphere;

export const shapePropsEqual = (
  prev: AnnotationShapeProps,
  next: AnnotationShapeProps,
): boolean =>
  prev.annotation === next.annotation &&
  prev.roi === next.roi &&
  prev.flattenToPlane === next.flattenToPlane &&
  prev.isActive === next.isActive &&
  prev.selectable === next.selectable &&
  prev.onSelectRoi === next.onSelectRoi &&
  (prev.planeZ === next.planeZ || !shapeReadsPlaneZ(next.annotation));

/** The interior material: fill, or an invisible-but-pickable surface. */
const InteriorMaterial = ({ style }: { style: ShapeStyle }) =>
  style.fill ? (
    <meshBasicMaterial
      color={style.fill}
      transparent
      opacity={style.fillOpacity}
      side={THREE.DoubleSide}
    />
  ) : (
    <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
  );

/**
 * A polygon's interior, as a pickable surface. Memoized on the RAW vectors
 * (stable for unchanged rows) — the previous inline `[...pts]` handed the
 * memo a fresh array every parent render, so every selection toggle disposed
 * and reconstructed the shape geometry.
 */
const PolygonInterior = ({
  vectors,
  flattenToPlane,
  style,
}: {
  vectors: readonly number[][];
  flattenToPlane: boolean;
  style: ShapeStyle;
}) => {
  const { shape, z } = useMemo(() => {
    const points = vectors.map((vector) => getVectorPoint(vector as number[], flattenToPlane));
    return {
      shape: new THREE.Shape(points.map((point) => new THREE.Vector2(point[0], point[1]))),
      z: points[0]?.[2] ?? 0,
    };
  }, [vectors, flattenToPlane]);

  // Triangulation needs three distinct vertices; below that there is no inside.
  if (vectors.length < 3) return null;

  // No handler of its own: the shape's group owns selection.
  return (
    <mesh position={[0, 0, z]}>
      <shapeGeometry args={[shape]} />
      <InteriorMaterial style={style} />
    </mesh>
  );
};

export const AnnotationShape = memo(function AnnotationShape({
  annotation,
  roi,
  flattenToPlane,
  planeZ,
  isActive,
  selectable,
  onSelectRoi,
}: AnnotationShapeProps) {
  perfMonitor.countRender("AnnotationShape"); // no-op unless a recording is armed
  const vectors = annotation.vectors; // Array of [x, y, z]
  if (!vectors || vectors.length === 0) return null;

  const style = resolveStyle(annotation, isActive);

  // `undefined` when the shape is not selectable, NOT a handler that returns
  // early (P20): a handler prop is what puts the object in R3F's interaction
  // set, and click-class events raycast that set UNFILTERED.
  const handleSelect = selectable
    ? (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        onSelectRoi(roi, event.nativeEvent.shiftKey);
      }
    : undefined;

  if (annotation.kind === AnnotationKind.Line && vectors.length >= 2) {
    // The merged outline batch draws the stroke AND owns the pick (segment →
    // roi mapping), so a line contributes nothing of its own.
    return null;
  }

  // CUBE shares the rectangle branch: same corner-pair vectors.
  if (
    (annotation.kind === AnnotationKind.Rectangle || annotation.kind === AnnotationKind.Cube) &&
    vectors.length >= 2
  ) {
    const [[x0, y0, z0], [x1, y1, z1]] = vectors.map((vector) =>
      getVectorPoint(vector, flattenToPlane),
    );
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);
    const depth = Math.abs(z1 - z0);

    if (!flattenToPlane && depth >= MIN_DEPTH) {
      const centerX = (x0 + x1) / 2;
      const centerY = (y0 + y1) / 2;
      const centerZ = (z0 + z1) / 2;

      return (
        <group onClick={handleSelect}>
          {style.fill && (
            <mesh
              position={[centerX, centerY, centerZ]}
              scale={[width, height, depth]}
              geometry={UNIT_BOX}
            >
              <meshBasicMaterial
                color={style.fill}
                transparent
                opacity={style.fillOpacity}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          <mesh
            position={[centerX, centerY, centerZ]}
            scale={[width, height, depth]}
            geometry={UNIT_BOX}
          >
            <meshBasicMaterial
              color={style.stroke}
              wireframe
              transparent
              opacity={style.strokeOpacity * 0.85}
            />
          </mesh>
        </group>
      );
    }

    return (
      <group onClick={handleSelect}>
        {/* Always present, invisible when unfilled: the interior is what makes
            a rectangle clickable anywhere rather than only on its edge. */}
        <mesh
          position={[(x0 + x1) / 2, (y0 + y1) / 2, z0]}
          scale={[width, height, 1]}
          geometry={UNIT_PLANE}
        >
          <InteriorMaterial style={style} />
        </mesh>
      </group>
    );
  }

  // SPHERE shares the ellipsis branch: corner-pair vectors are symmetric.
  if (
    (annotation.kind === AnnotationKind.Ellipse || annotation.kind === AnnotationKind.Sphere) &&
    vectors.length >= 2
  ) {
    const [[x0, y0, z0], [x1, y1, z1]] = vectors.map((vector) =>
      getVectorPoint(vector, flattenToPlane),
    );
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const cz = (z0 + z1) / 2;
    const rx = Math.abs(x1 - x0) / 2;
    const ry = Math.abs(y1 - y0) / 2;
    const rz = Math.abs(z1 - z0) / 2;

    if (!flattenToPlane && rz >= MIN_DEPTH) {
      return (
        <group onClick={handleSelect}>
          {style.fill && (
            <mesh position={[cx, cy, cz]} scale={[rx, ry, rz]} geometry={UNIT_SPHERE}>
              <meshBasicMaterial
                color={style.fill}
                transparent
                opacity={style.fillOpacity}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          <mesh position={[cx, cy, cz]} scale={[rx, ry, rz]} geometry={UNIT_SPHERE}>
            <meshBasicMaterial
              color={style.stroke}
              wireframe
              transparent
              opacity={style.strokeOpacity * 0.85}
            />
          </mesh>
        </group>
      );
    }

    // One ring: either a flat ellipse seen face-on, or the cross-section the
    // flat view's plane cuts out of an ellipsoid. Depth comes from the raw
    // vectors (`getVectorPoint` discarded z for drawing).
    const depthCenter = ((vectors[0][2] ?? 0) + (vectors[1][2] ?? 0)) / 2;
    const depthRadius = Math.abs((vectors[1][2] ?? 0) - (vectors[0][2] ?? 0)) / 2;
    const sectioned = flattenToPlane && depthRadius >= MIN_DEPTH;
    const section =
      planeZ === null || !sectioned
        ? 1
        : Math.max(
            ellipsoidCrossSectionScale(planeZ, depthCenter, depthRadius) ?? 0,
            // The plane is past the pole — it only reached this shape through
            // the visibility slab's half-slice of slack. Mark where the
            // ellipsoid ends rather than collapsing to nothing.
            MIN_CROSS_SECTION_SCALE,
          );

    const points = ellipseRing(cx, cy, z0, rx * section, ry * section, 48);
    points.push(points[0]);

    return (
      <group onClick={handleSelect}>
        {/* Scaled to the SECTIONED radii, so what can be clicked is what is
            drawn. */}
        <mesh
          position={[cx, cy, z0]}
          scale={[rx * section, ry * section, 1]}
          geometry={UNIT_CIRCLE_48}
        >
          <InteriorMaterial style={style} />
        </mesh>
        {/* A SECTIONED ring moves with the plane, so the batch — rebuilt only
            on data/selection changes, never per scrub — excludes it
            (`outlinePoints` returns null); it always draws its own line. */}
        {sectioned && (
          <Line points={points} color={style.stroke} lineWidth={style.strokeWidth} />
        )}
      </group>
    );
  }

  if ((annotation.kind === AnnotationKind.Polygon || annotation.kind === AnnotationKind.Path) && vectors.length >= 2) {
    const isPolygon = annotation.kind === AnnotationKind.Polygon;

    // A batched path has nothing left to draw here; a polygon keeps its
    // pickable interior.
    if (!isPolygon) return null;

    const pts = vectors.map((vector) => getVectorPoint(vector, flattenToPlane));
    if (isPolygon) pts.push(pts[0]); // close polygon

    return (
      <group onClick={handleSelect}>
        {isPolygon && (
          <PolygonInterior vectors={vectors} flattenToPlane={flattenToPlane} style={style} />
        )}
      </group>
    );
  }

  // Fallback: any other shape with enough vectors is a polyline, and the
  // merged outline batch draws it — nothing of its own to contribute.
  if (vectors.length >= 2) return null;

  return null;
}, shapePropsEqual);
