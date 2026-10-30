import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { LineSegments2 } from "three/examples/jsm/lines/webgpu/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { Line2NodeMaterial } from "three/webgpu";

import { swapGeometry } from "@/core/data/scene/gpu/swapGeometry";
import { useDrawEffect } from "@/core/data/scene/stores/useDrawEffect";
import { lazyPickIndex, raycastNearestOnly, type PickIndex } from "../../../platform/draw/linePicking";
import { perfMonitor } from "../../../platform/perf/perfMonitor";
import {
  STROKE_FLOATS,
  createRangeTints,
  markTinted,
  roiForSegment,
  strokeColorOf,
  tintRanges,
  type OutlineBatch,
  type RangeTints,
} from "../annotationBatch";
import type { HoverPoint, SelectedRoi } from "../roiSelectionStore";
import { clickPointOf } from "../hover/annotationActionTarget";
import { DRAG_THRESHOLD_PX } from "../drawGesture";

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
 * (`tintRanges`, the changed shapes written and uploaded in place), which is the
 * perf property the batching was built for.
 */
export const AnnotationOutlineBatch = ({
  batch,
  selectedIds,
  hoveredId,
  muted,
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
  /** A new shape is being drawn: grayed out, a color-only pass too. */
  muted: boolean;
  selectable: boolean;
  onSelectRoi: (roi: SelectedRoi, appendSelection: boolean, point?: HoverPoint) => void;
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
  /** The drawn batch's pick index, swapped with its geometry below. */
  const pickIndexRef = useRef<(() => PickIndex) | null>(null);
  const line = useMemo(() => {
    const created = new LineSegments2(new LineSegmentsGeometry(), material);
    // One object, many shapes, a generous pick band: report the stroke the
    // pointer is nearest to, not the first one inside the band. Hover arms this
    // for every pointer move, so it tests only the runs the ray can reach.
    raycastNearestOnly(created, () => pickIndexRef.current?.() ?? null);
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
  useDrawEffect(() => {
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(batch.positions);
    swapGeometry(line, geometry);
    pickIndexRef.current = lazyPickIndex(batch.positions, batch.ranges, 6);
  }, [batch, line]);

  // Declared AFTER the upload above, so on a new batch it runs against that
  // batch's geometry: the first pass creates the color attributes (nothing has
  // drawn them yet), every later one — a hover, a selection — rewrites the
  // shapes that changed in place, the one kind of update the renderer picks up
  // on a drawn geometry.
  const tintsRef = useRef<{
    geometry: unknown;
    tints: RangeTints;
    attributes: [THREE.InstancedBufferAttribute, THREE.InstancedBufferAttribute];
  } | null>(null);
  useDrawEffect(() => {
    const colorOf = strokeColorOf(batch, (id) => selectedIds.has(id), hoveredId, muted);
    const held = tintsRef.current;
    if (!held || held.geometry !== line.geometry) {
      const tints = createRangeTints(batch.segmentCount * STROKE_FLOATS, batch.ranges.length);
      tintRanges(tints, batch.ranges, STROKE_FLOATS, colorOf);
      // See `STROKE_FLOATS`: one array, two attributes, each uploading on its own.
      const start = new THREE.InstancedBufferAttribute(tints.colors, STROKE_FLOATS);
      const end = new THREE.InstancedBufferAttribute(tints.colors, STROKE_FLOATS);
      line.geometry.setAttribute("instanceColorStart", start);
      line.geometry.setAttribute("instanceColorEnd", end);
      tintsRef.current = { geometry: line.geometry, tints, attributes: [start, end] };
      return;
    }
    const upload = tintRanges(held.tints, batch.ranges, STROKE_FLOATS, colorOf);
    for (const attribute of held.attributes) markTinted(attribute, upload);
  }, [batch, selectedIds, hoveredId, muted, line]);

  useDrawEffect(() => {
    material.linewidth = batch.lineWidth;
    material.needsUpdate = true;
  }, [material, batch.lineWidth]);

  const handleClick = selectable
    ? (event: ThreeEvent<MouseEvent>) => {
        // A drag's release is not a pick: a pan (Space-, middle- or right-drag)
        // ending over a shape would otherwise toggle it.
        if (event.delta > DRAG_THRESHOLD_PX) return;
        const roi = roiForSegment(batch.ranges, event.faceIndex);
        if (!roi) return;
        event.stopPropagation();
        onSelectRoi(roi, event.nativeEvent.shiftKey, clickPointOf(event));
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
