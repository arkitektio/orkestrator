import { useEffect, useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";

import { perfMonitor } from "../../../platform/perf/perfMonitor";
import { computeWorldUnitsPerPixel } from "../../../platform/probe/probeWorld";
import type { SelectedRoi } from "../roiSelectionStore";
import type { PointEntry } from "./placedAnnotations";
import { samePointEntries, syncPointColors, syncPointMatrices } from "./pointsInstancing";

/**
 * Point annotations, held at a constant size on screen: ONE `InstancedMesh`
 * per distinct opacity. The screen-size scaling stays imperative off the
 * camera (P17 — subscribing to a worldUnitsPerPixel store field would
 * re-render every annotation on every camera move); the scale lives in the
 * instance MATRICES so the raycast picks exactly what is drawn. The z-scrub
 * recomputes the entry lists every tick — `samePointEntries` skips the
 * rewrite (and the bounding-sphere pass) when the same points survived.
 */
const POINT_RADIUS_PX = 5;

const UNIT_CIRCLE_16 = new THREE.CircleGeometry(1, 16);

export const AnnotationPoints = ({
  entries,
  opacity,
  selectable,
  onSelectRoi,
  hoverable,
  onHoverRoi,
  onUnhoverRoi,
}: {
  entries: PointEntry[];
  opacity: number;
  selectable: boolean;
  onSelectRoi: (roi: SelectedRoi, appendSelection: boolean) => void;
  /** Arms the hover handlers (`annotationHoverEnabled`) — the raycast gate. */
  hoverable: boolean;
  /** Per move over a shape; the store dedupes by id (state changes on enter/leave). */
  onHoverRoi: (roi: SelectedRoi) => void;
  onUnhoverRoi: (roiId: string) => void;
}) => {
  perfMonitor.countRender("AnnotationPoints"); // no-op unless a recording is armed
  const meshRef = useRef<THREE.InstancedMesh>(null);
  /** The roi id this mesh last reported hovering; null once it reported leaving. */
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
  /** Last written screen-size scale; 0 until the first frame. */
  const scaleRef = useRef(0);
  const writtenRef = useRef<PointEntry[] | null>(null);

  // Grow-only capacity so entry-count churn (z-scrub filtering) doesn't
  // reconstruct the InstancedMesh every step; `count` trims the draw.
  const capacity = useMemo(
    () => Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(1, entries.length)))),
    [entries.length],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (samePointEntries(writtenRef.current, entries)) return; // scrub no-op
    writtenRef.current = entries;
    syncPointMatrices(mesh, entries, scaleRef.current);
    syncPointColors(mesh, entries);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, capacity]);

  useFrame(({ camera, size }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const scale = computeWorldUnitsPerPixel(camera, size.height) * POINT_RADIUS_PX;
    // One epsilon-gated batch rewrite instead of N per-frame closures.
    if (Math.abs(scale - scaleRef.current) <= scaleRef.current * 0.002) return;
    scaleRef.current = scale;
    syncPointMatrices(mesh, writtenRef.current ?? entries, scale);
  });

  const handleClick = selectable
    ? (event: ThreeEvent<MouseEvent>) => {
        const entry = event.instanceId !== undefined ? entries[event.instanceId] : undefined;
        if (!entry) return;
        event.stopPropagation();
        onSelectRoi(entry.roi, event.nativeEvent.shiftKey);
      }
    : undefined;

  // Per-instance hover from `onPointerMove` (the instance under the pointer
  // changes without any over/out of the MESH firing). The store dedupes by
  // id; re-asserting per move heals a grace clear the pointer outstayed.
  const handleHoverMove = hoverable
    ? (event: ThreeEvent<PointerEvent>) => {
        const entry = event.instanceId !== undefined ? entries[event.instanceId] : undefined;
        if (!entry) return;
        hoveredIdRef.current = entry.roi.id;
        onHoverRoi(entry.roi);
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
    <instancedMesh
      key={capacity}
      ref={meshRef}
      args={[UNIT_CIRCLE_16, undefined, capacity]}
      onClick={handleClick}
      onPointerMove={handleHoverMove}
      onPointerOut={handleHoverOut}
    >
      <meshBasicMaterial transparent opacity={opacity} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};
