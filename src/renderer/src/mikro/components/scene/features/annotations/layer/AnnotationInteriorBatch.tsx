import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { roiForSegment } from "../annotationBatch";
import { interiorColors, type InteriorBatch } from "../interiorBatch";
import type { HoverPoint, SelectedRoi } from "../roiSelectionStore";

/**
 * One merged interior mesh for a batch of flat shapes (rectangles, ellipses,
 * polygons): ONE geometry + ONE material + ONE draw where each shape used to
 * mount its own. Filled batches draw with per-vertex fill colors at the
 * batch's opacity; the pick-only batch (unfilled shapes) draws nothing but
 * still raycasts, which is what makes an unfilled shape clickable anywhere.
 *
 * Picking maps the raycast's `faceIndex` (the triangle) back to the owning
 * ROI through the batch's sorted ranges — the outline batch's idiom, with the
 * same handler-attachment gating (P20) and move/out hover protocol.
 *
 * GEOMETRY is rebuilt only when the batch changes (data; for the sectioned
 * batch, the plane); a SELECTION change is a color-only pass.
 */
export const AnnotationInteriorBatch = ({
  batch,
  selectedIds,
  selectable,
  onSelectRoi,
  hoverable,
  onHoverRoi,
  onUnhoverRoi,
}: {
  batch: InteriorBatch<SelectedRoi>;
  selectedIds: ReadonlySet<string>;
  selectable: boolean;
  onSelectRoi: (roi: SelectedRoi, appendSelection: boolean) => void;
  /** Arms the hover handlers (`annotationHoverEnabled`) — the raycast gate. */
  hoverable: boolean;
  /** Per move over a shape; the store dedupes by id (state changes on enter/leave). */
  onHoverRoi: (roi: SelectedRoi, point: HoverPoint) => void;
  onUnhoverRoi: (roiId: string) => void;
}) => {
  perfMonitor.countRender("AnnotationInteriorBatch"); // no-op unless a recording is armed
  /** The roi id this batch last reported hovering; null once it reported leaving. */
  const hoveredIdRef = useRef<string | null>(null);
  // Unmount or disarm (mode switch) mid-hover never gets a pointer-out:
  // report the leave here, so the attached button can't linger.
  useEffect(() => {
    if (!hoverable) hoveredIdRef.current = null;
    return () => {
      const id = hoveredIdRef.current;
      if (id === null) return;
      hoveredIdRef.current = null;
      onUnhoverRoi(id);
    };
  }, [hoverable, onUnhoverRoi]);

  // A fresh geometry per batch: the attribute LAYOUT (position [+ color]) is
  // fixed per component (keyed by `batch.key`), so the WebGPU pipeline is
  // reused; the color attribute exists from the first frame (zeros until the
  // layout effect below fills it) so the vertex layout never changes under it.
  const geometry = useMemo(() => {
    const created = new THREE.BufferGeometry();
    created.setAttribute("position", new THREE.BufferAttribute(batch.positions, 3));
    if (batch.filled) {
      created.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(batch.positions.length), 3),
      );
    }
    return created;
  }, [batch]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    if (!batch.filled) return;
    const attribute = geometry.getAttribute("color") as THREE.BufferAttribute;
    (attribute.array as Float32Array).set(interiorColors(batch, (id) => selectedIds.has(id)));
    attribute.needsUpdate = true;
  }, [batch, selectedIds, geometry]);

  const handleClick = selectable
    ? (event: ThreeEvent<MouseEvent>) => {
        const roi = roiForSegment(batch.ranges, event.faceIndex);
        if (!roi) return;
        event.stopPropagation();
        onSelectRoi(roi, event.nativeEvent.shiftKey);
      }
    : undefined;

  // One object, many rois: R3F's over/out are keyed per object, so crossing
  // from one roi's triangles to another's never re-fires `onPointerOver`.
  // Resolve the roi on every move; the store dedupes by id. No
  // stopPropagation: a hover must not starve the layers underneath.
  const handleHoverMove = hoverable
    ? (event: ThreeEvent<PointerEvent>) => {
        const roi = roiForSegment(batch.ranges, event.faceIndex);
        if (!roi) return;
        hoveredIdRef.current = roi.id;
        onHoverRoi(roi, [event.point.x, event.point.y, event.point.z]);
      }
    : undefined;
  const handleHoverOut = hoverable
    ? () => {
        const id = hoveredIdRef.current;
        if (id === null) return;
        hoveredIdRef.current = null;
        onUnhoverRoi(id);
      }
    : undefined;

  return (
    <mesh
      geometry={geometry}
      onClick={handleClick}
      onPointerMove={handleHoverMove}
      onPointerOut={handleHoverOut}
    >
      {batch.filled ? (
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={batch.opacity}
          side={THREE.DoubleSide}
        />
      ) : (
        // Invisible but pickable: the raycast ignores `material.visible`.
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      )}
    </mesh>
  );
};
