import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";

import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { batchColors, roiForSegment, type OutlineBatch } from "../annotationBatch";
import type { SelectedRoi } from "../roiSelectionStore";

/**
 * One merged fat-line draw for a batch of shape outlines. Picking maps the
 * raycast's `faceIndex` (the segment's instance index) back to the owning ROI
 * through the batch's sorted ranges — same handler-attachment gating as the
 * per-shape path (P20).
 *
 * GEOMETRY uploads only when the batch itself changes (data, plane-independent
 * by construction — sectioned ellipsoids are excluded); a SELECTION change is
 * genuinely a color-only pass (`batchColors` → `setColors`), which is the
 * perf property the batching was built for.
 */
export const AnnotationOutlineBatch = ({
  batch,
  selectedIds,
  selectable,
  onSelectRoi,
  hoverable,
  onHoverRoi,
  onUnhoverRoi,
}: {
  batch: OutlineBatch<SelectedRoi>;
  selectedIds: ReadonlySet<string>;
  selectable: boolean;
  onSelectRoi: (roi: SelectedRoi, appendSelection: boolean) => void;
  /** Arms the hover handlers (`annotationHoverEnabled`) — the raycast gate. */
  hoverable: boolean;
  /** Per move over a shape; the store dedupes by id (state changes on enter/leave). */
  onHoverRoi: (roi: SelectedRoi) => void;
  onUnhoverRoi: (roiId: string) => void;
}) => {
  perfMonitor.countRender("AnnotationOutlineBatch"); // no-op unless a recording is armed
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
  const geometry = useMemo(() => new LineSegmentsGeometry(), []);
  const material = useMemo(() => {
    const created = new Line2NodeMaterial();
    created.vertexColors = true;
    return created;
  }, []);
  const line = useMemo(() => new LineSegments2(geometry, material), [geometry, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Layout effect for the same reason as `Line`: the WGSL vertex layout is
  // derived from the geometry's attributes, so positions must exist before
  // the first frame draws.
  useLayoutEffect(() => {
    geometry.setPositions(batch.positions);
    line.computeLineDistances();
  }, [batch, geometry, line]);

  useLayoutEffect(() => {
    geometry.setColors(batchColors(batch, (id) => selectedIds.has(id)));
  }, [batch, selectedIds, geometry]);

  useEffect(() => {
    material.linewidth = batch.lineWidth;
    material.needsUpdate = true;
  }, [material, batch.lineWidth]);

  const handleClick = selectable
    ? (event: ThreeEvent<MouseEvent>) => {
        const roi = roiForSegment(batch.ranges, event.faceIndex);
        if (!roi) return;
        event.stopPropagation();
        onSelectRoi(roi, event.nativeEvent.shiftKey);
      }
    : undefined;

  // One object, many rois: R3F's own over/out are keyed per (object, index,
  // instanceId) and a Line2 hit carries only `faceIndex`, so crossing from one
  // roi's segments to another's never re-fires `onPointerOver`. Resolve the
  // roi on every move instead; the store dedupes by id, and re-asserting per
  // move heals a grace clear the pointer outstayed.
  const handleHoverMove = hoverable
    ? (event: ThreeEvent<PointerEvent>) => {
        const roi = roiForSegment(batch.ranges, event.faceIndex);
        if (!roi) return;
        hoveredIdRef.current = roi.id;
        onHoverRoi(roi);
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
    <primitive
      object={line}
      onClick={handleClick}
      onPointerMove={handleHoverMove}
      onPointerOut={handleHoverOut}
    />
  );
};
