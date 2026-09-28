import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line } from "@/core/data/scene/draw/Line";
import { PreviewLine, type PreviewLineHandle } from "../../platform/draw/PreviewLine";
import { VertexHandles } from "./VertexHandles";
import { isTypingTarget } from "../../platform/input/keyboardTarget";
import { useModeStore } from "../../platform/stores/modeStore";
import {
  useRoiDrawingStore,
  DRAWING_TOOL_TO_ROI_KIND,
  isDrawingTool,
  isEnhanceableTool,
  isPrimitiveTool,
  type DrawingTool,
} from "./roiDrawingStore";
import {
  traceFailureMessage,
  useTraceHop,
  useTraceWaypoints,
  type TraceWaypoint,
} from "./enhancers/paths/vectorTrace/useTraceHop";
import { closingInsert, hopExtension } from "./enhancers/paths/vectorTrace/vectorEnhance";
import { planarRadius, primitiveCornerVectors, spatialRadius } from "./primitiveDraw";
import { useRoiDrawSessionStoreApi } from "./roiDrawSessionStore";
import { useSceneStore } from "../../platform/stores/sceneStore";
import { useViewerStore, useViewerStoreApi } from "../../platform/stores/viewerStore";
import { useCreateSceneAnnotation } from "./useCreateSceneAnnotation";
import { createRafCoalescer } from "@/core/data/scene/perf/rafCoalesce";
import {
  DRAG_THRESHOLD_PX,
  exceedsDragThreshold,
  intersectDrawPlane,
  intersectFacingPlane,
  withinSlop,
  type ScreenPoint,
} from "./drawGesture";
import { roiOutline, type OutlinePoint } from "./roiOutline";
import { formatDrawMeasure, measureDraw } from "./roiMeasure";
import { unitLabel } from "../../platform/coords/sceneUnits";
import type { DrawnRoi } from "./roiDrawingStore";

/** Lift the border off the slice so it never z-fights the plane it sits on. */
const PREVIEW_Z_LIFT = 0.1;

/**
 * The capture quad's size on the flat plane: the old baked 80000×80000, now
 * expressed as a scale on a unit plane so one mesh serves both views.
 */
const FLAT_CAPTURE_SIZE = 80000;

/**
 * Scratch for the capture quad's fallback placement and for the volumetric
 * sizing plane's normal. Neither escapes the call that fills it.
 */
const captureDirection = new THREE.Vector3();
const sizingNormal = new THREE.Vector3();

/**
 * How many times the camera→pivot distance the quad spans in 3D. The 3D camera
 * is a 45° perspective (`platform/camera/CameraController.tsx`), which shows
 * ≈0.83×distance of height at the pivot, so 8× covers the frustum with room to
 * spare — and it scales with the scene, where world units run from nanometres
 * to pixels and no fixed size is right for both.
 */
const ORBIT_CAPTURE_SPAN = 8;

const PREVIEW_COLOR = "#22d3ee";
const CLOSING_COLOR = "#0e7490";
const COMMITTED_COLOR = "#f59e0b";

type Phase = "idle" | "pressed" | "dragging" | "anchored";

/** One click of an enhanceable chain: where it landed, and what it resolved to. */
interface DrawAnchor {
  world: THREE.Vector3;
  /**
   * The click located on a layer's data — the input one traced edge needs.
   * Null when the enhancer is off or the click fell outside every layer;
   * an edge with a null end is drawn straight.
   */
  waypoint: TraceWaypoint | null;
}

interface DrawSession {
  phase: Phase;
  /** Canvas px at pointerdown — the drag-threshold basis. */
  downPx: ScreenPoint | null;
  /** True when the press in flight is the one that placed the anchor. */
  anchorPress: boolean;
  movedPastThreshold: boolean;
  /**
   * Frozen at gesture start. `currentZ` can change mid-drag (shift+wheel is not
   * gated on interaction mode), and letting the anchor and the cursor land on
   * different slices produces an annotation that straddles two z planes — which
   * the annotation layer then renders as a 3D box instead of a rectangle.
   */
  planeZ: number;
  vertices: THREE.Vector3[];
  cursor: THREE.Vector3 | null;
  lastClickPx: ScreenPoint | null;
  /**
   * The points the user actually clicked. `vertices` holds the full chain,
   * which is far denser when the vector enhancer traced the edges — the
   * handles, the rubber band's origin and the next edge's start belong to the
   * clicks rather than to what the search returned.
   */
  anchors: DrawAnchor[];
}

const freshSession = (): DrawSession => ({
  phase: "idle",
  downPx: null,
  anchorPress: false,
  movedPastThreshold: false,
  planeZ: 0,
  vertices: [],
  cursor: null,
  lastClickPx: null,
  anchors: [],
});

const eventPx = (event: ThreeEvent<PointerEvent | MouseEvent>): ScreenPoint => ({
  x: event.nativeEvent.offsetX,
  y: event.nativeEvent.offsetY,
});

export const RoiDrawer = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const displayMode = useModeStore((s) => s.displayMode);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);
  const addDrawnRoi = useRoiDrawingStore((s) => s.addDrawnRoi);
  const drawnRois = useRoiDrawingStore((s) => s.drawnRois);
  const markDrawnRoiPersisted = useRoiDrawingStore((s) => s.markDrawnRoiPersisted);
  const pendingPrimitiveAnchor = useRoiDrawingStore((s) => s.pendingPrimitiveAnchor);
  const setPendingPrimitiveAnchor = useRoiDrawingStore((s) => s.setPendingPrimitiveAnchor);
  const setPrimitiveSessionActive = useRoiDrawingStore((s) => s.setPrimitiveSessionActive);
  const vectorEnhance = useRoiDrawingStore(
    (s) => s.enhancersOn["vector-trace"] ?? false,
  );
  const setTraceMessage = useRoiDrawingStore((s) => s.setEnhancerMessage);
  const spatialUnit = useSceneStore((s) => s.spatialUnit);
  const currentZ = useViewerStore((s) => s.currentZ);
  const viewerStoreApi = useViewerStoreApi();
  const camera = useThree((s) => s.camera);
  const canvas = useThree((s) => s.gl.domElement);
  const invalidate = useThree((s) => s.invalidate);
  const readoutApi = useRoiDrawSessionStoreApi();

  const { createSceneAnnotation } = useCreateSceneAnnotation();
  const runTraceHop = useTraceHop();
  const traceWaypoints = useTraceWaypoints();

  /**
   * The only React state the gesture owns, and it moves at CLICK cadence — it
   * exists to drive the vertex handles. Everything that moves with the pointer
   * lives in `sessionRef` and is painted imperatively (P17).
   */
  const [placedVertices, setPlacedVertices] = useState<THREE.Vector3[]>([]);

  const sessionRef = useRef<DrawSession>(freshSession());
  const captureRef = useRef<THREE.Mesh | null>(null);
  const mainRef = useRef<PreviewLineHandle | null>(null);
  const closingRef = useRef<PreviewLineHandle | null>(null);
  const scratch = useRef(new THREE.Vector3());
  const cursorPxRef = useRef<ScreenPoint>({ x: 0, y: 0 });

  const tool: DrawingTool | null = isDrawingTool(activeTool) ? activeTool : null;
  const isPolygonLike = tool === "POLYGON" || tool === "PATH";
  const isPrimitive = isPrimitiveTool(tool);
  /**
   * Vector enhancer active for this tool: each clicked edge is traced through
   * the data (`features/annotations/enhancers/paths/vectorTrace/`) instead of drawn straight. The toggle moves at
   * click cadence at worst, so a plain subscription costs nothing (P17).
   */
  const enhanceOn = vectorEnhance && isEnhanceableTool(tool);
  const unit = unitLabel(spatialUnit);
  /**
   * In 3D there is no slice to draw on, so every vertex comes from the volume
   * probe instead of the draw plane — `currentZ` is a flat-view concept and a
   * plane at it would put the shape wherever that happens to fall. The gesture
   * becomes click-per-point for every tool (a rectangle is two probed corners),
   * which is the gesture the volumetric primitives already use.
   */
  const probePlaced = displayMode === "3D";

  /**
   * A volumetric primitive's radius from its anchor. The flat gesture measures
   * across the world-XY plane it is drawn on; the volume gesture measures the
   * true 3D distance, because its sizing plane faces the camera instead
   * (`sizingPoint`).
   */
  const sizingRadius = useCallback(
    (anchor: THREE.Vector3, cursor: { x: number; y: number; z: number }): number =>
      (probePlaced ? spatialRadius : planarRadius)(
        [anchor.x, anchor.y, anchor.z],
        [cursor.x, cursor.y, cursor.z],
      ),
    [probePlaced],
  );

  const paint = useCallback(() => {
    const session = sessionRef.current;
    if (!tool) return;

    let points = session.cursor
      ? [...session.vertices, session.cursor]
      : session.vertices;

    /**
     * The depth the planar preview sits on: the ANCHOR's, read before the
     * primitive translation below rewrites `points` into bounding corners — a
     * sphere's footprint belongs on its equator, not on its bottom face.
     */
    const anchorZ =
      session.vertices[0]?.z ?? session.cursor?.z ?? session.planeZ;

    // Volumetric tools rubber-band a RADIUS around the probe-seeded center,
    // but outline/measure speak the corner-pair convention — translate here so
    // both stay single-sourced (`features/annotations/primitiveDraw.ts`).
    if (isPrimitiveTool(tool) && session.vertices.length === 1) {
      const anchor = session.vertices[0];
      const radius = session.cursor ? sizingRadius(anchor, session.cursor) : 0;
      const [low, high] = primitiveCornerVectors(
        [anchor.x, anchor.y, anchor.z],
        radius,
      );
      points = [
        new THREE.Vector3(...low),
        new THREE.Vector3(...high),
      ];
    }

    // Each point keeps its OWN depth, lifted off whatever it sits on: one slice
    // in 2D, the probed surface in 3D — where consecutive vertices legitimately
    // differ in z. The flat `z` argument is the fallback the corner-pair shapes
    // (rectangle, ellipse, primitive footprint) still preview on: two corners
    // describe a box, and its outline belongs at the anchor's depth.
    const lifted = points.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z + PREVIEW_Z_LIFT,
    }));
    const z = anchorZ + PREVIEW_Z_LIFT;

    // `closePolygon: false` — the closing edge is the separate faint line below,
    // so the user can see the finished shape before committing to it.
    mainRef.current?.setPoints(
      roiOutline(tool, lifted, z, { closePolygon: false }),
    );

    // Always a STRAIGHT line, even when the enhancer will trace the closure on
    // commit: this preview repaints at pointer cadence, and an A* per
    // pointermove is not a price a preview may charge.
    const showClosing =
      tool === "POLYGON" && session.vertices.length >= 2 && session.cursor;
    closingRef.current?.setPoints(
      showClosing
        ? [
            [
              session.cursor!.x,
              session.cursor!.y,
              session.cursor!.z + PREVIEW_Z_LIFT,
            ],
            [
              session.vertices[0].x,
              session.vertices[0].y,
              session.vertices[0].z + PREVIEW_Z_LIFT,
            ],
          ]
        : [],
    );

    const label = formatDrawMeasure(measureDraw(tool, points), unit);
    readoutApi.getState().setReadout(
      label
        ? { label, x: cursorPxRef.current.x, y: cursorPxRef.current.y }
        : null,
    );

    invalidate(); // the Canvas is frameloop="demand"
  }, [tool, unit, readoutApi, invalidate, sizingRadius]);

  // Pointer-move storms coalesce to ≤1 repaint per frame (same idiom as the
  // brick layers): the ray math runs synchronously in the handler so the session
  // stays truthful for the next event, and only the idempotent paint is deferred.
  const paintCoalescer = useMemo(
    () => createRafCoalescer<() => void>((run) => run()),
    [],
  );
  useEffect(() => () => paintCoalescer.cancel(), [paintCoalescer]);

  const resetSession = useCallback(() => {
    sessionRef.current = freshSession();
    setPlacedVertices([]);
    paintCoalescer.cancel();
    mainRef.current?.clear();
    closingRef.current?.clear();
    readoutApi.getState().setReadout(null);
    // Whatever ends the session — commit, Escape, tool/mode change — the
    // volume may seed the next primitive anchor again.
    setPrimitiveSessionActive(false);
    setTraceMessage(null);
    invalidate();
  }, [paintCoalescer, readoutApi, setPrimitiveSessionActive, setTraceMessage, invalidate]);

  const submitRoi = useCallback(
    async (roi: DrawnRoi) => {
      // One annotation per drawn shape, in the scene's world. On failure the
      // committed local preview stays, so the shape is not silently lost.
      const created = await createSceneAnnotation(
        roi.kind,
        roi.worldVectors.map((v): [number, number, number] => [v.x, v.y, v.z]),
      );
      // Confirmed, but NOT dropped yet: the persisted shape is drawn by the
      // annotation layer's own query, and on a scene's first annotation that
      // layer does not exist yet. Dropping here would blink the shape off
      // screen in between. `resolvePersistedRois` hands over once the server
      // copy is actually on screen.
      if (created) {
        markDrawnRoiPersisted(roi.id, {
          id: created.id,
          collectionId: created.collection.id,
        });
      }
    },
    [createSceneAnnotation, markDrawnRoiPersisted],
  );

  const finishShape = useCallback(
    // `asTool` lets a gesture commit as a different tool than the one that ran
    // it: an enhanced LINE is an open polyline, and AnnotationKind.Line is a strictly
    // two-point kind — it commits as PATH so every found vertex survives.
    (worldVectors: THREE.Vector3[], asTool?: DrawingTool) => {
      if (!tool) return;
      const committedTool = asTool ?? tool;

      const roi: DrawnRoi = {
        id: Math.random().toString(36).substring(2, 9),
        kind: DRAWING_TOOL_TO_ROI_KIND[committedTool],
        tool: committedTool,
        worldVectors: worldVectors.map((v) => ({ x: v.x, y: v.y, z: v.z })),
      };

      addDrawnRoi(roi);
      submitRoi(roi);
      resetSession();
    },
    [tool, addDrawnRoi, submitRoi, resetSession],
  );

  /**
   * Cancel whatever is half-drawn whenever the context changes underneath it.
   *
   * Also fixes a live bug: `finishShape` reads the active tool at call time, so
   * finishing a polygon after switching to the ellipse tool used to commit an
   * ELLIPSE carrying N vectors.
   */
  useEffect(
    () => resetSession,
    [activeTool, interactionMode, displayMode, resetSession],
  );

  /**
   * In 3D the cursor IS the probe.
   *
   * The volume hover-probes for every shape tool in ANNOTATE mode and publishes
   * the point (`BrickVolumeLayer`), so the rubber band is driven from the store
   * rather than from this component's own pointermove: the volume legitimately
   * claims (and stops) that event whenever it is the front-most hit, and the
   * draw plane below would then never see the move.
   *
   * A null probe — pointer off the data — clears the cursor, which is what
   * makes the preview stop at the edge of what can actually be marked.
   */
  useEffect(() => {
    if (!probePlaced || interactionMode !== "ANNOTATE" || !tool) return;
    if (isPrimitiveTool(tool)) return; // sized on the plane through its anchor

    return viewerStoreApi.subscribe((state, previous) => {
      if (state.probedCoordinate === previous.probedCoordinate) return;
      const session = sessionRef.current;
      if (session.vertices.length === 0) return; // nothing to rubber-band yet
      const world = state.probedCoordinate?.worldPos;
      session.cursor = world ? new THREE.Vector3(...world) : null;
      paintCoalescer.schedule(paint);
    });
  }, [probePlaced, interactionMode, tool, viewerStoreApi, paint, paintCoalescer]);

  /**
   * Where to hang the measure readout in 3D. The geometry comes from the probe,
   * but its LABEL follows the pointer — and the draw plane no longer sees
   * pointermove there, so the position is read off the canvas directly. Stores
   * two numbers per event and schedules nothing: the paint that consumes them
   * is already driven by the probe.
   */
  useEffect(() => {
    if (!probePlaced || interactionMode !== "ANNOTATE" || !tool) return;
    const onMove = (event: PointerEvent) => {
      cursorPxRef.current = { x: event.offsetX, y: event.offsetY };
    };
    canvas.addEventListener("pointermove", onMove);
    return () => canvas.removeEventListener("pointermove", onMove);
  }, [probePlaced, interactionMode, tool, canvas]);

  // Probe-derived volumetric anchor: a click on the volume seeded the center
  // (see BrickVolumeLayer). Declared AFTER the reset effect above — within one
  // commit React runs cleanups first, then effect bodies in declaration order,
  // so the mode/tool flip's reset lands before the seed instead of wiping it.
  // From "anchored", pointer moves rubber-band the radius on the world
  // XY plane through the anchor, and a click commits. Raising
  // `primitiveSessionActive` here is what lets the commit click's same-event
  // hit on the volume be ignored instead of re-anchoring.
  useEffect(() => {
    if (!pendingPrimitiveAnchor) return;
    if (interactionMode !== "ANNOTATE" || !isPrimitiveTool(tool)) return;
    const session = sessionRef.current;
    session.planeZ = pendingPrimitiveAnchor[2];
    session.vertices = [new THREE.Vector3(...pendingPrimitiveAnchor)];
    session.phase = "anchored";
    session.cursor = null;
    session.lastClickPx = null;
    setPlacedVertices([...session.vertices]);
    setPrimitiveSessionActive(true);
    paintCoalescer.schedule(paint);
    setPendingPrimitiveAnchor(null);
  }, [
    pendingPrimitiveAnchor,
    interactionMode,
    tool,
    paint,
    paintCoalescer,
    setPendingPrimitiveAnchor,
    setPrimitiveSessionActive,
  ]);

  // Escape abandons the shape. Without it a half-placed polygon has no exit —
  // you have to finish a shape you don't want and then delete it server-side.
  // `pointercancel` has to be a window listener: R3F handles it at the canvas
  // and never forwards it to object handlers. (Deliberately NOT
  // `lostpointercapture`, which fires *before* pointerup and would kill every
  // gesture before it commits.)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isTypingTarget(event.target as HTMLElement | null)) return;
      if (sessionRef.current.phase === "idle" && sessionRef.current.vertices.length === 0) {
        return; // nothing of ours to cancel; leave Escape to whoever else wants it
      }
      event.preventDefault();
      resetSession();
    };
    const onCancel = () => resetSession();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
    };
  }, [resetSession]);

  /**
   * Keep the capture quad under the pointer.
   *
   * It is a pure EVENT SURFACE — every consumer re-derives its geometry from
   * `event.ray` (`pointOnPlane`) or from the probe (`pointOnData`), never from
   * `event.point` — so where it sits changes no placement math, only whether
   * the click is seen at all.
   *
   * And in 3D a fixed quad on the world XY plane is genuinely missable: the
   * view ray crosses z≈0 wherever the tilted camera happens to point it, which
   * for an orbited camera is routinely far outside any finite quad. That is
   * what silently killed every 3D click-placed tool — the volume published its
   * probe and no drawer handler ever ran. So in 3D the quad faces the camera at
   * the orbit pivot instead, where the ray cannot miss it.
   *
   * Per-frame rather than per-render: orbiting moves the camera without
   * re-rendering this component. Cheap (a copy and two scalars) and the Canvas
   * is `frameloop="demand"`, so it only runs on frames that were drawn anyway.
   */
  useFrame(({ camera, controls }) => {
    const mesh = captureRef.current;
    if (!mesh) return;
    if (!probePlaced) {
      // The flat view, exactly as before: the XY plane just above the slice.
      mesh.position.set(0, 0, 0.01);
      mesh.quaternion.identity();
      mesh.scale.setScalar(FLAT_CAPTURE_SIZE);
      return;
    }
    const pivot = (controls as { target?: THREE.Vector3 } | null)?.target;
    mesh.quaternion.copy(camera.quaternion);
    if (pivot) {
      mesh.position.copy(pivot);
      mesh.scale.setScalar(
        Math.max(FLAT_CAPTURE_SIZE, camera.position.distanceTo(pivot) * ORBIT_CAPTURE_SPAN),
      );
    } else {
      // No controls yet: hang it just in front of the camera, which covers the
      // frustum by construction.
      mesh.position
        .copy(camera.position)
        .add(camera.getWorldDirection(captureDirection));
      mesh.scale.setScalar(FLAT_CAPTURE_SIZE);
    }
  });

  // ANNOTATE mode + a *shape* tool is the whole condition. The Select tool arms
  // `RectangleDrawer` instead, so the two are mutually exclusive by
  // construction. Arming a layer is not part of it either: shapes land in the
  // scene's own coordinate system, so there is no layer to point at.
  if (interactionMode !== "ANNOTATE" || !tool) return null;

  /** The live pointer position on the slice being drawn — never `event.point`. */
  const pointOnPlane = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    const session = sessionRef.current;
    /**
     * An anchored primitive in the volume sizes on the plane through its
     * anchor FACING THE CAMERA, not on world XY. Orbit the view shallow
     * against that plane and the ray meets it far from the anchor, so a click
     * beside the centre asks for an enormous sphere — which is exactly what
     * this branch removes. The flat view is unaffected: there the camera looks
     * straight down the world-XY normal, so the two planes coincide.
     */
    if (probePlaced && isPrimitive && session.vertices.length > 0) {
      return intersectFacingPlane(
        event.ray,
        session.vertices[0],
        camera.getWorldDirection(sizingNormal),
        scratch.current,
      );
    }
    const planeZ = session.phase === "idle" && session.vertices.length === 0
      ? currentZ
      : session.planeZ;
    return intersectDrawPlane(event.ray, planeZ, scratch.current);
  };

  /**
   * The point under the cursor in 3D: whatever the volume last probed. Null
   * when the pointer is off the data — there is nothing there to mark, and a
   * vertex at the stale point would be a lie.
   */
  const pointOnData = (): THREE.Vector3 | null => {
    const world = viewerStoreApi.getState().probedCoordinate?.worldPos;
    return world ? new THREE.Vector3(...world) : null;
  };

  /**
   * The edge `prev`→`next`: traced through the data when the enhancer is on
   * and both clicks resolved onto one layer's data, the plain straight segment
   * otherwise. A failed hop FALLS BACK to straight and says so — the click is
   * never refused, so the chain always advances.
   */
  const enhanceEdge = (
    prev: DrawAnchor | undefined,
    next: DrawAnchor,
  ): THREE.Vector3[] => {
    if (!prev || !enhanceOn) return [next.world];
    if (!prev.waypoint || !next.waypoint) {
      setTraceMessage("Click landed off the data — straight edge used");
      return [next.world];
    }
    // The flat view draws one slice; the box must not reach past it.
    const hop = runTraceHop(prev.waypoint, next.waypoint, { flatten: !probePlaced });
    if (!hop.ok) {
      setTraceMessage(traceFailureMessage(hop.reason));
      return [next.world];
    }
    setTraceMessage(null);
    return hopExtension(hop.points);
  };

  /**
   * Commit the chain. An enhanced POLYGON gets one more hop — last anchor back
   * to the first — so its CLOSING edge follows the data too; on failure the
   * implicit straight closure stands. The failure message is set after
   * `finishShape`, whose `resetSession` would otherwise wipe it.
   */
  const finishChain = () => {
    const session = sessionRef.current;
    let vertices = [...session.vertices];
    let failure: string | null = null;
    if (tool === "POLYGON" && enhanceOn && session.anchors.length >= 3) {
      const first = session.anchors[0];
      const last = session.anchors[session.anchors.length - 1];
      if (first.waypoint && last.waypoint) {
        const hop = runTraceHop(last.waypoint, first.waypoint, {
          flatten: !probePlaced,
        });
        if (hop.ok) vertices = [...vertices, ...closingInsert(hop.points)];
        else failure = traceFailureMessage(hop.reason);
      }
    }
    finishShape(vertices);
    if (failure) setTraceMessage(failure);
  };

  /** One clicked point of a chain: resolve it onto the data when enhancing. */
  const anchorAt = (world: THREE.Vector3): DrawAnchor => ({
    world,
    waypoint: enhanceOn
      ? probePlaced
        ? traceWaypoints.fromProbe()
        : traceWaypoints.fromWorld(world)
      : null,
  });

  return (
    <group>
      {/* Invisible interaction plane. It still raycasts — Mesh.raycast never
          reads material.visible — while the renderer skips drawing it. A UNIT
          plane: the transform above sizes and places it per view (the flat XY
          slab in 2D, camera-facing at the pivot in 3D), and scaling a unit quad
          keeps its vertices at ±0.5 instead of baking huge coordinates into the
          geometry. The values here are the pre-first-frame defaults. */}
      <mesh
        ref={captureRef}
        position={[0, 0, 0.01]}
        scale={FLAT_CAPTURE_SIZE}
        onPointerDown={(e) => {
          // Click tools opt out entirely, so R3F's post-drag click can't
          // interfere with them. Primitives are click tools too — and their
          // anchor never comes from this plane (the volume seeds it). In 3D
          // EVERY tool is a click tool: there is no drag-a-plane gesture when
          // the points come from the probe.
          if (probePlaced || isPolygonLike || tool === "POINT" || isPrimitive) {
            return;
          }
          const hit = pointOnPlane(e);
          if (!hit) return;

          e.stopPropagation();
          (e.target as Element).setPointerCapture?.(e.pointerId);

          const session = sessionRef.current;
          session.downPx = eventPx(e);
          session.movedPastThreshold = false;

          if (session.vertices.length === 0) {
            session.planeZ = currentZ;
            session.vertices = [hit.clone().setZ(currentZ)];
            session.anchorPress = true;
            setPlacedVertices(session.vertices);
          } else {
            session.anchorPress = false;
          }

          session.phase = "pressed";
          session.cursor = hit.clone();
          cursorPxRef.current = eventPx(e);
          paintCoalescer.schedule(paint);
        }}
        onPointerMove={(e) => {
          const session = sessionRef.current;
          // A primitive tool with no anchor yet: the VOLUME owns the pointer
          // (hover probing, the anchoring click) — the plane must neither
          // consume the ray nor block propagation to it.
          if (isPrimitive && session.vertices.length === 0) return;
          // Same in 3D for every other tool, and for the whole gesture: the
          // cursor arrives through the probe subscription instead, so this
          // plane must stay out of the way of the volume's hover.
          if (probePlaced && !isPrimitive) return;
          // Otherwise unconditional: this plane sits in front of the image
          // planes, so stopping propagation is what keeps a probe from firing
          // while you draw.
          e.stopPropagation();

          const hit = pointOnPlane(e);
          if (!hit) return; // keep the last valid cursor rather than jumping

          if (session.phase === "pressed" && session.downPx) {
            if (exceedsDragThreshold(eventPx(e), session.downPx)) {
              session.phase = "dragging";
              session.movedPastThreshold = true;
            }
          }

          // Nothing to rubber-band against until the first vertex exists.
          if (session.vertices.length === 0) return;

          session.cursor = hit.clone();
          cursorPxRef.current = eventPx(e);
          paintCoalescer.schedule(paint);
        }}
        onPointerUp={(e) => {
          if (probePlaced || isPolygonLike || tool === "POINT" || isPrimitive) {
            return;
          }

          const session = sessionRef.current;
          e.stopPropagation();
          (e.target as Element).releasePointerCapture?.(e.pointerId);

          const hit = pointOnPlane(e);
          if (hit) session.cursor = hit.clone();

          // Commit when this press actually dragged, OR when it is the second
          // press of the click-move-click flow. A press that only placed the
          // anchor and didn't move stays anchored, rubber-banding on hover.
          const shouldCommit =
            session.vertices.length === 1 &&
            (session.movedPastThreshold || !session.anchorPress);

          if (shouldCommit && session.cursor) {
            const start = session.vertices[0];
            const end = session.cursor.clone().setZ(session.planeZ);
            if (tool === "LINE" && enhanceOn) {
              // A LINE enhances once, at commit — its rubber band stays
              // straight because A* at pointermove cadence is off the table.
              // Both endpoints resolve here (the drag flow kept no anchors).
              finishShape(
                [start, ...enhanceEdge(anchorAt(start), anchorAt(end))],
                "PATH",
              );
              return;
            }
            finishShape([start, end]);
            return;
          }

          session.phase = "anchored";
          session.downPx = null;
        }}
        onClick={(e) => {
          if (isPrimitive) {
            const session = sessionRef.current;
            // Only a probe-anchored session sizes and commits here. Early
            // returns deliberately do NOT stop propagation: an un-anchored
            // click must reach the volume so it can seed the anchor.
            if (session.phase !== "anchored" || session.vertices.length !== 1) return;
            const hit = pointOnPlane(e);
            if (!hit) return;
            const anchor = session.vertices[0];
            const radius = sizingRadius(anchor, hit);
            if (radius <= 0) return;
            // Suppress this click on the volume behind the plane. Combined
            // with the volume's `primitiveSessionActive` guard this is
            // order-independent: volume-first sees the flag still raised,
            // plane-first stops the event here.
            e.stopPropagation();
            const [low, high] = primitiveCornerVectors(
              [anchor.x, anchor.y, anchor.z],
              radius,
            );
            finishShape([new THREE.Vector3(...low), new THREE.Vector3(...high)]);
            return;
          }

          // 3D: one click, one probed vertex. The POINT tool is the volume's
          // own job (it creates the annotation at the probed coordinate), so it
          // is the one tool that never reaches this branch.
          if (probePlaced) {
            if (tool === "POINT") return;
            // An orbit-drag release is not a vertex.
            if (e.delta > DRAG_THRESHOLD_PX) return;
            const probed = pointOnData();
            if (!probed) return; // off the data: nothing there to mark
            e.stopPropagation();

            const px = eventPx(e);
            const session = sessionRef.current;

            if (isPolygonLike) {
              // Same double-click finish as the flat gesture, position-checked.
              // Counted in ANCHORS: with the enhancer on, one traced edge
              // already yields many vertices, and those are not clicks.
              if (
                e.detail >= 2 &&
                session.anchors.length >= 2 &&
                (!session.lastClickPx || withinSlop(px, session.lastClickPx))
              ) {
                finishChain();
                return;
              }
            } else if (session.vertices.length === 1) {
              // The two-point tools (rectangle, ellipse, line) commit on their
              // second probed point — the corner pair the annotation carries,
              // which the renderer extrudes when the two straddle depth.
              if (tool === "LINE" && enhanceOn) {
                // The enhanced LINE traces its one edge at commit, and commits
                // as PATH: AnnotationKind.Line is a strictly two-point kind.
                const prev = session.anchors[0];
                finishShape(
                  [session.vertices[0], ...enhanceEdge(prev, anchorAt(probed))],
                  "PATH",
                );
                return;
              }
              finishShape([session.vertices[0], probed]);
              return;
            }

            const anchor = anchorAt(probed);
            session.vertices = isPolygonLike
              ? [...session.vertices, ...enhanceEdge(session.anchors[session.anchors.length - 1], anchor)]
              : [...session.vertices, probed];
            session.anchors = [...session.anchors, anchor];
            session.lastClickPx = px;
            session.phase = "anchored";
            session.cursor = probed.clone();
            cursorPxRef.current = px;
            // Handles mark the CLICKS, not the points a traced edge found.
            setPlacedVertices(session.anchors.map((a) => a.world));
            paintCoalescer.schedule(paint);
            return;
          }

          if (!isPolygonLike && tool !== "POINT") return;
          e.stopPropagation();

          const hit = pointOnPlane(e);
          if (!hit) return;
          const px = eventPx(e);
          const session = sessionRef.current;

          if (tool === "POINT") {
            // A stray drag shouldn't drop a point.
            if (e.delta > DRAG_THRESHOLD_PX) return;
            session.planeZ = currentZ;
            finishShape([hit.clone().setZ(currentZ)]);
            return;
          }

          // Finish on double-click — but only if the second click landed on the
          // first. `detail` is position-blind, so without this two quick vertex
          // placements would end the polygon. Counted in ANCHORS: with the
          // enhancer on, one traced edge already yields many vertices.
          const isDoubleClick =
            e.detail >= 2 &&
            session.anchors.length >= 2 &&
            (!session.lastClickPx || withinSlop(px, session.lastClickPx));

          if (isDoubleClick) {
            finishChain();
            return;
          }

          if (session.vertices.length === 0) session.planeZ = currentZ;
          const anchor = anchorAt(hit.clone().setZ(session.planeZ));
          session.vertices = [
            ...session.vertices,
            ...enhanceEdge(session.anchors[session.anchors.length - 1], anchor),
          ];
          session.anchors = [...session.anchors, anchor];
          session.lastClickPx = px;
          session.phase = "anchored";
          session.cursor = hit.clone();
          cursorPxRef.current = px;
          // Handles mark the CLICKS, not the points a traced edge found.
          setPlacedVertices(session.anchors.map((a) => a.world));
          paintCoalescer.schedule(paint);
        }}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Mounted for the whole tool session so the handles never detach: these
          hide themselves rather than unmounting. */}
      <PreviewLine ref={mainRef} color={PREVIEW_COLOR} lineWidth={2} />
      <PreviewLine
        ref={closingRef}
        color={CLOSING_COLOR}
        lineWidth={2}
        dashed
        dashSize={3}
        gapSize={2}
      />

      {/* Each vertex already carries the frozen slice z, so the handles lift off
          it individually rather than reading the session during render. */}
      <VertexHandles
        vertices={placedVertices.map(
          (v) => [v.x, v.y, v.z + PREVIEW_Z_LIFT] as OutlinePoint,
        )}
      />

      {/* Committed locally, until the server copy arrives. */}
      {drawnRois.map((roi) => (
        <RoiShape key={roi.id} roi={roi} />
      ))}
    </group>
  );
};

/**
 * A shape that has been drawn and submitted but whose server copy hasn't landed
 * yet. One `roiOutline` call for every tool — which is what fixes the ellipse
 * that used to be stroked as a rectangle here (and in the live preview).
 */
const RoiShape = ({ roi }: { roi: DrawnRoi }) => {
  const vectors = roi.worldVectors;
  if (vectors.length === 0) return null;

  // Primitives carry BOUNDING corners; their committed footprint belongs on
  // the equator (the plane the user sized in), not the bottom face.
  const z =
    (isPrimitiveTool(roi.tool) && vectors.length >= 2
      ? ((vectors[0].z ?? 0) + (vectors[1].z ?? 0)) / 2
      : vectors[0].z ?? 0) + PREVIEW_Z_LIFT;

  if (roi.tool === "POINT") {
    return (
      <mesh position={[vectors[0].x, vectors[0].y, z]}>
        <circleGeometry args={[2, 16]} />
        <meshBasicMaterial color={COMMITTED_COLOR} transparent opacity={0.7} />
      </mesh>
    );
  }

  return (
    <Line
      // Lifted per point, not by the flat `z`: a shape drawn in the volume has
      // a depth per vertex, and only the corner-pair tools fall back to one
      // plane (`roiOutline`).
      points={roiOutline(
        roi.tool,
        vectors.map((vector) => ({
          x: vector.x,
          y: vector.y,
          z: (vector.z ?? 0) + PREVIEW_Z_LIFT,
        })),
        z,
      )}
      color={COMMITTED_COLOR}
      lineWidth={2}
      depthTest={false}
      renderOrder={9}
    />
  );
};
