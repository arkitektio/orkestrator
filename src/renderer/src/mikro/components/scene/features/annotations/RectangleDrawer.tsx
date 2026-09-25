import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useModeStore } from "../../platform/stores/modeStore";
import { PreviewLine, type PreviewLineHandle } from "../../platform/draw/PreviewLine";
import {
  useRoiSelectionStore,
  useRoiSelectionStoreApi,
} from "./roiSelectionStore";
import { useRoiDrawingStore } from "./roiDrawingStore";
import { createRafCoalescer } from "@/lib/scene/perf/rafCoalesce";
import { DRAG_THRESHOLD_PX, intersectDrawPlane } from "./drawGesture";
import { rectangleOutline } from "./roiOutline";

/** The marquee sits on the same plane it hits, lifted clear of it. */
const MARQUEE_Z = 0.1;

function normalizeBounds(start: THREE.Vector3, end: THREE.Vector3) {
  return {
    minX: Math.min(start.x, end.x),
    maxX: Math.max(start.x, end.x),
    minY: Math.min(start.y, end.y),
    maxY: Math.max(start.y, end.y),
  };
}

function isContained(
  selectionBounds: ReturnType<typeof normalizeBounds>,
  roiBounds: { minX: number; maxX: number; minY: number; maxY: number },
) {
  return (
    roiBounds.minX >= selectionBounds.minX &&
    roiBounds.maxX <= selectionBounds.maxX &&
    roiBounds.minY >= selectionBounds.minY &&
    roiBounds.maxY <= selectionBounds.maxY
  );
}

export const RectangleDrawer = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const displayMode = useModeStore((s) => s.displayMode);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const replaceSelectedRois = useRoiSelectionStore((s) => s.replaceSelectedRois);
  const mergeSelectedRois = useRoiSelectionStore((s) => s.mergeSelectedRois);
  const clearSelectedRois = useRoiSelectionStore((s) => s.clearSelectedRois);
  // Read the visible ROIs at COMMIT time instead of subscribing: the annotation
  // layer re-mints that map on a 5-second poll, and subscribing to an object
  // re-rendered this drawer every time it did (P17/P9c).
  const selectionApi = useRoiSelectionStoreApi();
  const invalidate = useThree((s) => s.invalidate);

  const startRef = useRef<THREE.Vector3 | null>(null);
  const cursorRef = useRef<THREE.Vector3 | null>(null);
  const scratch = useRef(new THREE.Vector3());
  const previewRef = useRef<PreviewLineHandle | null>(null);

  const paint = useCallback(() => {
    const start = startRef.current;
    const cursor = cursorRef.current;
    previewRef.current?.setPoints(
      start && cursor ? rectangleOutline(start, cursor, MARQUEE_Z) : [],
    );
    invalidate();
  }, [invalidate]);

  const paintCoalescer = useMemo(
    () => createRafCoalescer<() => void>((run) => run()),
    [],
  );
  useEffect(() => () => paintCoalescer.cancel(), [paintCoalescer]);

  const endSession = useCallback(() => {
    startRef.current = null;
    cursorRef.current = null;
    paintCoalescer.cancel();
    previewRef.current?.clear();
    invalidate();
  }, [paintCoalescer, invalidate]);

  // R3F handles `pointercancel` at the canvas and never forwards it to object
  // handlers, so a cancelled gesture has to be caught here.
  useEffect(() => {
    window.addEventListener("pointercancel", endSession);
    window.addEventListener("blur", endSession);
    return () => {
      window.removeEventListener("pointercancel", endSession);
      window.removeEventListener("blur", endSession);
    };
  }, [endSession]);

  // The marquee is the Select *tool* of ANNOTATE mode, and it is 2D-only — the
  // toolbar hides it in 3D (`features/annotations/modeCompat.ts`), so this is belt and braces.
  if (
    displayMode !== "2D" ||
    interactionMode !== "ANNOTATE" ||
    activeTool !== "SELECT"
  ) {
    return null;
  }

  // Never `event.point`: under pointer capture R3F replays the press-time
  // intersection, so it freezes as soon as the drag leaves the plane.
  const pointOnPlane = (event: ThreeEvent<PointerEvent>) =>
    intersectDrawPlane(event.ray, 0, scratch.current);

  return (
    <group>
      {/* Note: this plane sits at z=0 while the shape drawer's sits at z=0.01.
          They are mutually exclusive by tool, so they never both hit-test —
          don't "unify" them into two overlapping full-scene targets. */}
      <mesh
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          // Only a real click clears the selection. Without the distance gate,
          // the click R3F synthesizes at the end of a marquee drag ran here with
          // the session already torn down and wiped the selection just made.
          if (!startRef.current && e.delta <= DRAG_THRESHOLD_PX) {
            clearSelectedRois();
          }
        }}
        onPointerDown={(e) => {
          const hit = pointOnPlane(e);
          if (!hit) return;
          e.stopPropagation();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          startRef.current = hit.clone();
          cursorRef.current = hit.clone();
          paintCoalescer.schedule(paint);
        }}
        onPointerMove={(e) => {
          if (!startRef.current) return;
          e.stopPropagation();
          const hit = pointOnPlane(e);
          if (!hit) return;
          cursorRef.current = hit.clone();
          paintCoalescer.schedule(paint);
        }}
        onPointerUp={(e) => {
          const start = startRef.current;
          if (!start) return;
          e.stopPropagation();
          (e.target as Element).releasePointerCapture?.(e.pointerId);

          const hit = pointOnPlane(e);
          const end = hit ? hit.clone() : (cursorRef.current ?? start);
          const selectionBounds = normalizeBounds(start, end);
          const containedRois = Object.values(
            selectionApi.getState().visibleRois,
          )
            .filter((roi) => isContained(selectionBounds, roi.bounds))
            .map(({ bounds: _bounds, ...roi }) => roi);

          if (e.shiftKey) {
            mergeSelectedRois(containedRois);
          } else {
            replaceSelectedRois(containedRois);
          }

          endSession();
        }}
      >
        <planeGeometry args={[80000, 80000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      <PreviewLine ref={previewRef} color="#fafafa" lineWidth={2} />
    </group>
  );
};
