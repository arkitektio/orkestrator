import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import { EXCLUDE_FROM_CAPTURE } from "@/core/data/scene/capture/captureVisibility";
import { bindField } from "@/core/data/scene/stores/bindStore";
import { nearestChordMidpointAlongRay } from "../../platform/camera/panScale";
import {
  cropBoxFromCorners,
  cropZRange,
  type CropBox,
  type CropVec3,
  type CropZGrid,
} from "../../platform/coords/cropBox";
import { sceneZExtent } from "../../platform/coords/worldTransform";
import { PreviewLine, type PreviewLineHandle } from "../../platform/draw/PreviewLine";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { gatherLayerWorldBoxes } from "../../platform/visibility/layerBoxes";
import { rectOutline, boxOutline, wheelSteps, EDGE_ON_LIMIT } from "./cropGesture";

const OUTLINE_COLOR = "#f5c84c";

/** What one gesture remembers between its events. Never React state. */
type Session = {
  /** The first corner, on the plane the rectangle is drawn in. */
  anchor: CropVec3;
  /** The opposite corner under the cursor; null until the pointer has moved. */
  corner: CropVec3 | null;
  /** Wheel steps taken in the depth phase. */
  steps: number;
  /** Unspent wheel travel (trackpads deliver it in crumbs). */
  wheelRemainder: number;
  grid: CropZGrid | null;
  /** Where the content is, to keep an oblique 3D ray from running to the horizon. */
  reach: THREE.Box3 | null;
};

/**
 * The crop gesture and the box's outline.
 *
 * `s` (bound in `KeyboardModeController`) moves `cropPhase` to `rect`; this
 * component does the rest: it anchors the first corner under the cursor, lets
 * the rectangle follow the pointer on the world XY plane through it, applies
 * the box on the first click, grows it through z on the wheel, and commits on
 * the second click.
 *
 * ## Plain DOM listeners, attached only while a gesture runs
 *
 * No R3F pointer props: a handler on an object is what puts it in the raycast
 * set (P20), and this needs no object — the rectangle lives on a mathematical
 * plane. The listeners are capture-phase on `window`, so the gesture's two
 * clicks and its wheel never reach the camera controls, the probe, or a mesh's
 * click handler. Right and middle drags pass through untouched: the view stays
 * free while the box is being sized.
 *
 * ## The moving rectangle is not in the store
 *
 * `cropBox` is the APPLIED box; everything that loads or draws follows it. The
 * rectangle under the cursor is only ever written to the outline here.
 */
export const CropBoxGesture = () => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const viewerApi = useViewerStoreApi();
  const sceneApi = useSceneStoreApi();
  const phase = useViewerStore((s) => s.cropPhase);
  const flat = useModeStore((s) => s.displayMode !== "3D");

  const lineRef = useRef<PreviewLineHandle>(null);
  const sessionRef = useRef<Session | null>(null);
  /** Last pointer position over the canvas, so `s` knows where the cursor is. */
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  /** When the gesture last took a click — see the dblclick guard. */
  const lastClickRef = useRef(Number.NEGATIVE_INFINITY);

  // The cursor, tracked cheaply and always: a keypress carries no position.
  // No raycast here — that happens once, when `s` is pressed.
  useEffect(() => {
    const element = gl.domElement;
    const onMove = (event: PointerEvent) => {
      cursorRef.current = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      cursorRef.current = null;
    };
    // The gesture's two clicks can land within a double-click's window; the
    // synthesized dblclick arrives AFTER the gesture has gone idle and would
    // recenter the camera (`DoubleClickRecenter`).
    const onDoubleClick = (event: MouseEvent) => {
      if (performance.now() - lastClickRef.current < 600) event.stopPropagation();
    };
    element.addEventListener("pointermove", onMove, { passive: true });
    element.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("dblclick", onDoubleClick, true);
    return () => {
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("dblclick", onDoubleClick, true);
    };
  }, [gl]);

  // The outline of the APPLIED box, whenever no rectangle is being dragged.
  useEffect(() => {
    if (phase === "rect") return;
    const draw = (box: CropBox | null) => {
      if (!box) lineRef.current?.clear();
      else lineRef.current?.setPoints(flat ? rectOutline(box.min, box.max, 0) : boxOutline(box));
    };
    return bindField(viewerApi, (state) => state.cropBox, draw);
  }, [phase, flat, viewerApi]);

  useEffect(() => {
    if (phase === "idle") {
      sessionRef.current = null;
      return;
    }

    const element = gl.domElement;
    const raycaster = new THREE.Raycaster(); // locally owned, not R3F's shared one
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();

    const rayAt = (clientX: number, clientY: number): THREE.Ray | null => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      ndc.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray;
    };

    /** Where a ray meets the horizontal plane at `z`, or null when it does not. */
    const onPlane = (ray: THREE.Ray, z: number): CropVec3 | null => {
      if (Math.abs(ray.direction.z) < 1e-9) return null;
      const t = (z - ray.origin.z) / ray.direction.z;
      if (t < 0) return null;
      hit.copy(ray.origin).addScaledVector(ray.direction, t);
      return [hit.x, hit.y, z];
    };

    // --- start: fix the first corner under the cursor -----------------------
    if (phase === "rect" && !sessionRef.current) {
      const cursor = cursorRef.current;
      const viewer = viewerApi.getState();
      // `s` is heard window-wide, but the box starts under the cursor: with the
      // pointer over a panel (or another scene) there is no corner to fix.
      if (!cursor) {
        viewer.cancelCrop();
        return;
      }
      const ray = rayAt(cursor.x, cursor.y);
      // A rectangle on the XY plane cannot be pointed at from along that plane.
      if (!ray || Math.abs(ray.direction.z) < EDGE_ON_LIMIT) {
        viewer.refuseCrop("edge-on");
        return;
      }

      const boxes: THREE.Box3[] = [];
      gatherLayerWorldBoxes(viewer.trackables, boxes);
      const reach = boxes.length > 0 ? boxes.reduce((all, box) => all.union(box), new THREE.Box3()) : null;

      let anchorZ: number;
      if (flat) {
        anchorZ = viewer.currentZ;
      } else {
        // The content under the cursor, resolved geometrically like the
        // double-click recenter: the probe does not run in NAVIGATE, so
        // `probedCoordinate` is stale there. No content under the cursor →
        // the plane through what the camera orbits.
        const depth = nearestChordMidpointAlongRay(ray.origin, ray.direction, boxes, Number.NaN);
        const target =
          controls && "target" in controls ? (controls as { target: THREE.Vector3 }).target : null;
        anchorZ = Number.isFinite(depth)
          ? ray.origin.z + ray.direction.z * depth
          : (target?.z ?? 0);
      }
      const anchor = onPlane(ray, anchorZ);
      if (!anchor) {
        viewer.refuseCrop("edge-on");
        return;
      }
      sessionRef.current = {
        anchor,
        corner: null,
        steps: 0,
        wheelRemainder: 0,
        grid: sceneZExtent(sceneApi.getState().layers),
        reach,
      };
      lineRef.current?.clear();
    }

    const session = sessionRef.current;
    if (!session) return;

    const onCanvas = (event: Event) =>
      event.target instanceof Node && (event.target === element || element.contains(event.target));

    const boxOf = (corner: CropVec3, steps: number): CropBox => {
      const [z0, z1] = cropZRange(session.anchor[2], steps, session.grid);
      return cropBoxFromCorners(
        [session.anchor[0], session.anchor[1], z0],
        [corner[0], corner[1], z1],
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      if (viewerApi.getState().cropPhase !== "rect") return;
      const ray = rayAt(event.clientX, event.clientY);
      const point = ray ? onPlane(ray, session.anchor[2]) : null;
      if (!point) return; // above the horizon: keep the last corner
      if (session.reach) {
        // A shallow 3D ray meets the plane far past the data; the box has no
        // business reaching beyond what there is to crop.
        point[0] = THREE.MathUtils.clamp(point[0], session.reach.min.x, session.reach.max.x);
        point[1] = THREE.MathUtils.clamp(point[1], session.reach.min.y, session.reach.max.y);
      }
      session.corner = point;
      lineRef.current?.setPoints(
        rectOutline(session.anchor, point, flat ? 0 : session.anchor[2]),
      );
    };

    /** Left presses on the canvas are the gesture's; nothing below sees them. */
    const swallow = (event: MouseEvent): boolean => {
      if (event.button !== 0 || !onCanvas(event)) return false;
      event.stopPropagation();
      return true;
    };

    const onClick = (event: MouseEvent) => {
      if (!swallow(event)) return;
      lastClickRef.current = performance.now();
      const viewer = viewerApi.getState();
      if (viewer.cropPhase === "depth") {
        viewer.commitCrop();
        return;
      }
      const corner = session.corner;
      // A click before the pointer moved has no rectangle to fix.
      if (!corner || corner[0] === session.anchor[0] || corner[1] === session.anchor[1]) return;
      viewer.fixCropRect(boxOf(corner, 0));
    };

    const onWheel = (event: WheelEvent) => {
      const viewer = viewerApi.getState();
      if (viewer.cropPhase !== "depth" || !onCanvas(event)) return;
      // The wheel is the box's for this phase: no zoom, no slice step.
      event.preventDefault();
      event.stopPropagation();
      const { steps, remainder } = wheelSteps(event, session.wheelRemainder);
      session.wheelRemainder = remainder;
      if (steps === 0 || !session.corner) return;
      session.steps = Math.max(0, session.steps + steps);
      viewer.setCropBox(boxOf(session.corner, session.steps));
      invalidate();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", swallow, true);
    window.addEventListener("pointerup", swallow, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", swallow, true);
      window.removeEventListener("pointerup", swallow, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("wheel", onWheel, true);
    };
  }, [phase, flat, camera, controls, gl, invalidate, viewerApi, sceneApi]);

  return (
    // Furniture: never baked into screenshots or animation captures.
    <group userData={{ [EXCLUDE_FROM_CAPTURE]: true }}>
      <PreviewLine ref={lineRef} color={OUTLINE_COLOR} lineWidth={1.5} renderOrder={9} capacity={32} />
    </group>
  );
};
