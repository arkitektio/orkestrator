import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { InterleavedBufferAttribute } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";

import { swapGeometry } from "@/core/data/scene/gpu/swapGeometry";
import { raycastNearestOnly } from "../../../platform/draw/linePicking";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { batchColors, roiForSegment, type OutlineBatch } from "../annotationBatch";
import type { HoverPoint, SelectedRoi } from "../roiSelectionStore";

/**
 * One merged fat-line draw for a batch of shape outlines. Picking maps the
 * raycast's `faceIndex` (the segment's instance index) back to the owning ROI
 * through the batch's sorted ranges — same handler-attachment gating as the
 * per-shape path (P20).
 *
 * GEOMETRY uploads only when the batch itself changes (data, plane-independent
 * by construction — sectioned ellipsoids are excluded), as a NEW geometry
 * (`swapGeometry`: re-uploading into the drawn one froze the canvas as soon as
 * a batch grew); a SELECTION change is genuinely a color-only pass
 * (`batchColors`, written in place), which is the perf property the batching
 * was built for.
 */
export const AnnotationOutlineBatch = ({
  batch,
  selectedIds,
  hoveredId,
  selectable,
  onSelectRoi,
  hoverable,
  onHoverRoi,
  onUnhoverRoi,
}: {
  batch: OutlineBatch<SelectedRoi>;
  selectedIds: ReadonlySet<string>;
  /** The hovered roi when it belongs to this layer — a color-only pass too. */
  hoveredId: string | null;
  selectable: boolean;
  onSelectRoi: (roi: SelectedRoi, appendSelection: boolean) => void;
  /** Arms the hover handlers (`annotationHoverEnabled`) — the raycast gate. */
  hoverable: boolean;
  /** Per move over a shape; the store dedupes by id (state changes on enter/leave). */
  onHoverRoi: (roi: SelectedRoi, point: HoverPoint) => void;
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
  const material = useMemo(() => {
    const created = new Line2NodeMaterial();
    created.vertexColors = true;
    return created;
  }, []);
  const line = useMemo(() => {
    const created = new LineSegments2(new LineSegmentsGeometry(), material);
    // One object, many shapes, a generous pick band: report the stroke the
    // pointer is nearest to, not the first one inside the band.
    raycastNearestOnly(created);
    return created;
  }, [material]);

  // `line.geometry`, not a mount-time one: every batch is a new geometry.
  useEffect(
    () => () => {
      line.geometry.dispose();
      material.dispose();
    },
    [line, material],
  );

  // Layout effect for the same reason as `Line`: the WGSL vertex layout is
  // derived from the geometry's attributes, so positions must exist before
  // the first frame draws.
  useLayoutEffect(() => {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(batch.positions);
    swapGeometry(line, geometry);
    line.computeLineDistances();
  }, [batch, line]);

  // Declared AFTER the upload above, so on a new batch it runs against that
  // batch's geometry: the first pass creates the color attributes (nothing has
  // drawn them yet), every later one — a selection change — rewrites them in
  // place, the one kind of update the renderer picks up on a drawn geometry.
  useLayoutEffect(() => {
    const colors = batchColors(batch, (id) => selectedIds.has(id), hoveredId);
    const attribute = line.geometry.attributes.instanceColorStart as
      | InterleavedBufferAttribute
      | undefined;
    if (attribute && attribute.data.array.length === colors.length) {
      (attribute.data.array as Float32Array).set(colors);
      attribute.data.needsUpdate = true;
      return;
    }
    line.geometry.setColors(colors);
  }, [batch, selectedIds, hoveredId, line]);

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
    <primitive
      object={line}
      onClick={handleClick}
      onPointerMove={handleHoverMove}
      onPointerOut={handleHoverOut}
    />
  );
};
