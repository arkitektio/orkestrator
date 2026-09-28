import { memo, useEffect, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

import { AnnotationKind, type SceneAnnotationFragment } from "@/mikro/api/graphql";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { getVectorPoint } from "../annotationBounds";
import { drawsOwnMesh } from "../annotationBatch";
import { resolveStyle } from "../annotationStyle";
import type { SelectedRoi } from "../roiSelectionStore";
import { useSharedBasicMaterial } from "./sharedBasicMaterial";

/**
 * One EXTRUDED 3D annotation (box / ellipsoid), in the collection's space
 * (the parent group applies the affine): a wireframe mesh plus an optional
 * fill. Every flat shape is drawn by the merged batches instead — outlines
 * (`AnnotationOutlineBatch`, sectioned rings included) and interiors
 * (`AnnotationInteriorBatch`) — so the renderer mounts this only for
 * `drawsOwnMesh` entries. Materials are shared by value
 * (`useSharedBasicMaterial`), not one per shape.
 *
 * Memoized on IDENTITY: `roi` and `annotation` are stable for unchanged rows
 * (`placedAnnotations.ts`), so a poll that changes one annotation re-renders
 * one shape. Nothing here reads the plane, so a z-scrub re-renders none.
 */

/** Shared unit geometries, scaled per shape via the mesh transform. Module
 * lifetime, never disposed (P13-safe by construction). */
const UNIT_SPHERE = new THREE.SphereGeometry(1, 24, 16);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export type AnnotationShapeProps = {
  annotation: SceneAnnotationFragment;
  roi: SelectedRoi;
  flattenToPlane: boolean;
  isActive: boolean;
  /** False in PROBE mode, so a shape can't swallow the click meant for a probe. */
  selectable: boolean;
  onSelectRoi: (roi: SelectedRoi, appendSelection: boolean) => void;
  /** Arms the hover handlers (`annotationHoverEnabled`) — the raycast gate. */
  hoverable: boolean;
  /** Per move over the shape; the store dedupes by id (state changes on enter/leave). */
  onHoverRoi: (roi: SelectedRoi) => void;
  onUnhoverRoi: (roiId: string) => void;
};

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
  prev.hoverable === next.hoverable &&
  prev.onHoverRoi === next.onHoverRoi &&
  prev.onUnhoverRoi === next.onUnhoverRoi;

/** One scaled unit mesh with a shared (by-value) material. */
const StyledMesh = ({
  geometry,
  position,
  scale,
  color,
  opacity,
  wireframe,
}: {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
  wireframe: boolean;
}) => {
  const material = useSharedBasicMaterial({ color, opacity, wireframe });
  return <mesh position={position} scale={scale} geometry={geometry} material={material} />;
};

export const AnnotationShape = memo(function AnnotationShape({
  annotation,
  roi,
  flattenToPlane,
  isActive,
  selectable,
  onSelectRoi,
  hoverable,
  onHoverRoi,
  onUnhoverRoi,
}: AnnotationShapeProps) {
  perfMonitor.countRender("AnnotationShape"); // no-op unless a recording is armed
  // Whether THIS shape reported a hover it has not yet reported leaving.
  const hoveringRef = useRef(false);
  // A shape that unmounts (z-scrub) or disarms (mode switch) mid-hover never
  // gets a pointer-out: report the leave itself, so the button can't linger.
  useEffect(() => {
    if (!hoverable) hoveringRef.current = false;
    return () => {
      if (!hoveringRef.current) return;
      hoveringRef.current = false;
      onUnhoverRoi(roi.id);
    };
  }, [hoverable, onUnhoverRoi, roi.id]);
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

  // Hover: `onPointerMove` + `onPointerOut`, NOT `onPointerOver` — R3F keys
  // its over/out per (object, index, instanceId), which the merged batches
  // can't use; the same idiom on every pick surface keeps them alike. The
  // store dedupes by id, so re-asserting per move is cheap and is what heals
  // a grace clear that landed while the pointer never left the shape.
  // No stopPropagation: a hover must not starve the layers underneath.
  const handleHoverMove = hoverable
    ? () => {
        hoveringRef.current = true;
        onHoverRoi(roi);
      }
    : undefined;
  const handleHoverOut = hoverable
    ? () => {
        if (!hoveringRef.current) return;
        hoveringRef.current = false;
        onUnhoverRoi(roi.id);
      }
    : undefined;
  const pick = {
    onClick: handleSelect,
    onPointerMove: handleHoverMove,
    onPointerOut: handleHoverOut,
  };

  // Flat shapes (and lines, paths, fallbacks) are wholly the batches' job.
  if (!drawsOwnMesh(annotation, flattenToPlane)) return null;

  const [[x0, y0, z0], [x1, y1, z1]] = vectors.map((vector) =>
    getVectorPoint(vector, flattenToPlane),
  );
  const center: [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  // CUBE shares the rectangle branch, SPHERE the ellipse one: corner-pair
  // vectors. The box scales by its extents, the ellipsoid by its radii.
  const isBox =
    annotation.kind === AnnotationKind.Rectangle || annotation.kind === AnnotationKind.Cube;
  const geometry = isBox ? UNIT_BOX : UNIT_SPHERE;
  const extent = isBox ? 1 : 0.5;
  const scale: [number, number, number] = [
    Math.abs(x1 - x0) * extent,
    Math.abs(y1 - y0) * extent,
    Math.abs(z1 - z0) * extent,
  ];

  return (
    <group {...pick}>
      {style.fill && (
        <StyledMesh
          geometry={geometry}
          position={center}
          scale={scale}
          color={style.fill}
          opacity={style.fillOpacity}
          wireframe={false}
        />
      )}
      <StyledMesh
        geometry={geometry}
        position={center}
        scale={scale}
        color={style.stroke}
        opacity={style.strokeOpacity * 0.85}
        wireframe
      />
    </group>
  );
}, shapePropsEqual);
