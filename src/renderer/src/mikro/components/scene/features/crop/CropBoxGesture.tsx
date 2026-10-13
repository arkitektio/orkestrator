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
import { isTypingTarget } from "../../platform/input/keyboardTarget";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { gatherLayerWorldBoxes } from "../../platform/visibility/layerBoxes";
import { rectOutline, boxOutline, depthPixelsPerStep, depthSteps, EDGE_ON_LIMIT } from "./cropGesture";

const OUTLINE_COLOR = "#f5c84c";

/**
 * How long the pointer rests on a depth before the box is applied there. The
 * outline follows every move; the scene behind it replans, and a replan per
 * pointer event is what P9 and P30 are about.
 */
const DEPTH_SETTLE_MS = 90;

/** What one gesture remembers between its events. Never React state. */
type Session = {
  /** The first corner, on the plane the rectangle is drawn in. */
  anchor: CropVec3;
  /** The opposite corner under the cursor; null until the pointer has moved. */
  corner: CropVec3 | null;
  /** Depth steps the pointer stands on in the depth phase. */
  steps: number;
  /** The pointer's y where the depth is one slice: where the rectangle was fixed. */
  depthFromY: number;
  /** Pointer pixels per depth step, fixed when the depth phase starts. */
  pixelsPerStep: number;
  grid: CropZGrid | null;
  /** Where the content is, to keep an oblique 3D ray from running to the horizon. */
  reach: THREE.Box3 | null;
};

/**
 * The crop gesture and the box's outline.
 *
 * `s` (bound in `KeyboardModeController`) only enters the mode (`cropPhase`
 * `arm`); this component does the rest, in three clicks: the first anchors a
 * corner where it lands, the rectangle then follows the pointer on the world
 * XY plane through it, the second click applies the box, moving the pointer up
 * and down grows and shrinks it through z, and the third click commits.
 *
 * ## Plain DOM listeners, attached only while a gesture runs
 *
 * No R3F pointer props: a handler on an object is what puts it in the raycast
 * set (P20), and this needs no object — the rectangle lives on a mathematical
 * plane. The listeners are capture-phase on `window`, so the gesture's clicks
 * never reach the camera controls, the probe, or a mesh's click handler. The
 * wheel and right and middle drags pass through untouched: the view stays free
 * while the box is being sized, and a drag does not move the depth.
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
  /** When the gesture last took a click — see the dblclick guard. */
  const lastClickRef = useRef(Number.NEGATIVE_INFINITY);

  // The gesture's clicks can land within a double-click's window; the
  // synthesized dblclick arrives AFTER the gesture has gone idle and would
  // recenter the camera (`DoubleClickRecenter`).
  useEffect(() => {
    const onDoubleClick = (event: MouseEvent) => {
      if (performance.now() - lastClickRef.current < 600) event.stopPropagation();
    };
    window.addEventListener("dblclick", onDoubleClick, true);
    return () => window.removeEventListener("dblclick", onDoubleClick, true);
  }, []);

  // The outline of the APPLIED box, whenever the gesture is not drawing its
  // own: the rectangle under the cursor, or the depth the pointer stands on.
  useEffect(() => {
    if (phase === "rect" || phase === "depth") return;
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

    /** The first click: fix a corner where it landed. False when there is none to fix. */
    const anchorAt = (clientX: number, clientY: number): boolean => {
      const viewer = viewerApi.getState();
      const ray = rayAt(clientX, clientY);
      // A rectangle on the XY plane cannot be pointed at from along that plane.
      if (!ray || Math.abs(ray.direction.z) < EDGE_ON_LIMIT) {
        viewer.refuseCrop("edge-on");
        return false;
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
        return false;
      }
      sessionRef.current = {
        anchor,
        corner: null,
        steps: 0,
        depthFromY: clientY,
        pixelsPerStep: depthPixelsPerStep(0, 0),
        grid: sceneZExtent(sceneApi.getState().layers),
        reach,
      };
      lineRef.current?.clear();
      return true;
    };

    const onCanvas = (event: Event) =>
      event.target instanceof Node && (event.target === element || element.contains(event.target));

    const boxOf = (session: Session, corner: CropVec3, steps: number): CropBox => {
      const [z0, z1] = cropZRange(session.anchor[2], steps, session.grid);
      return cropBoxFromCorners(
        [session.anchor[0], session.anchor[1], z0],
        [corner[0], corner[1], z1],
      );
    };

    // The depth the pointer stands on reaches the store once it rests there.
    let settle: ReturnType<typeof setTimeout> | null = null;
    const applyDepth = () => {
      if (settle !== null) {
        clearTimeout(settle);
        settle = null;
      }
      const session = sessionRef.current;
      if (!session?.corner) return;
      viewerApi.getState().setCropBox(boxOf(session, session.corner, session.steps));
      invalidate();
    };

    const followRect = (session: Session, event: PointerEvent) => {
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
      invalidate();
    };

    const followDepth = (session: Session, event: PointerEvent) => {
      if (!session.corner) return;
      if (event.buttons !== 0) {
        // A drag moves the VIEW (right, middle): the depth stays where it is,
        // and goes on from wherever the drag lets go.
        session.depthFromY = event.clientY + session.steps * session.pixelsPerStep;
        return;
      }
      const steps = depthSteps(session.depthFromY, event.clientY, session.pixelsPerStep);
      if (steps === session.steps) return;
      session.steps = steps;
      const box = boxOf(session, session.corner, steps);
      // The flat view shows the box from above: its outline does not change.
      if (!flat) lineRef.current?.setPoints(boxOutline(box));
      invalidate();
      if (settle !== null) clearTimeout(settle);
      settle = setTimeout(applyDepth, DEPTH_SETTLE_MS);
    };

    const onPointerMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) return;
      const current = viewerApi.getState().cropPhase;
      if (current === "rect") followRect(session, event);
      else if (current === "depth") followDepth(session, event);
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
      if (viewer.cropPhase === "arm") {
        if (anchorAt(event.clientX, event.clientY)) viewer.anchorCrop();
        return;
      }
      const session = sessionRef.current;
      if (!session) return;
      if (viewer.cropPhase === "depth") {
        // Where the pointer stands, not where it last rested.
        applyDepth();
        viewer.commitCrop();
        return;
      }
      const corner = session.corner;
      // A click before the pointer moved has no rectangle to fix.
      if (!corner || corner[0] === session.anchor[0] || corner[1] === session.anchor[1]) return;
      const slices = session.grid && session.grid.step > 0
        ? Math.round((session.grid.max - session.grid.min) / session.grid.step)
        : 0;
      session.steps = 0;
      session.depthFromY = event.clientY;
      session.pixelsPerStep = depthPixelsPerStep(element.getBoundingClientRect().height, slices);
      const box = boxOf(session, corner, 0);
      // From here the outline is the box the pointer's depth gives, drawn here.
      if (!flat) lineRef.current?.setPoints(boxOutline(box));
      viewer.fixCropRect(box);
    };

    // Esc leaves the mode. Capture-phase, and here rather than with the other
    // scene keys: the selection box (`core/dnd/selection/SelectionBox`) hears
    // Escape on `document` and stops it, so a bubble listener on `window`
    // never sees the key. Stopped in turn — this Esc cancels the box, it does
    // not also clear the selection.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target as { tagName?: string; isContentEditable?: boolean } | null)) return;
      event.stopPropagation();
      viewerApi.getState().cancelCrop();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", swallow, true);
    window.addEventListener("pointerup", swallow, true);
    window.addEventListener("click", onClick, true);
    return () => {
      if (settle !== null) clearTimeout(settle);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", swallow, true);
      window.removeEventListener("pointerup", swallow, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [phase, flat, camera, controls, gl, invalidate, viewerApi, sceneApi]);

  return (
    // Furniture: never baked into screenshots or animation captures.
    <group userData={{ [EXCLUDE_FROM_CAPTURE]: true }}>
      <PreviewLine ref={lineRef} color={OUTLINE_COLOR} lineWidth={1.5} renderOrder={9} capacity={32} />
    </group>
  );
};
