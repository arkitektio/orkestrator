import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useSceneDisplayMode } from "../../scene/sceneHost";
import { worldUnitsPerPixel, type Ray } from "../math/gizmoMath";
import { gestureFor, gizmoHandles, type GizmoHandle, type Slot } from "../math/handles";
import type { Vec3 } from "../math/mat4";
import { useRegistration, useRegistrationApi } from "../store/context";
import { drawnPivot } from "../store/registrationStore";

/**
 * The manipulation gizmo: arrows, rings and scale boxes at the pivot.
 *
 * Custom rather than drei's. `PivotControls` draws with `Line2`/`LineMaterial`,
 * a ShaderMaterial the WebGPU renderer cannot compile; three's
 * `TransformControls` installs its own DOM listeners and raycasts (outside the
 * scene's P20 handler-attachment rule), poses ONE Object3D rather than
 * producing a delta about a pivot, and has no uniform-only scale. And neither
 * can be verified without running the app — whereas here everything that can
 * be wrong lives in `math/handles.ts` + `math/gizmoMath.ts`, under test, and
 * this file is meshes and wiring.
 *
 * Conventions borrowed from the scene's own overlays (`VertexHandles`,
 * `SceneProbedPoint`):
 *  - sized in SCREEN pixels, imperatively in `useFrame` off the camera (P17 —
 *    no store subscription re-rendering per camera move); mounted at scale 0
 *    so nothing draws at the wrong size for a frame;
 *  - basic materials, `depthTest={false}`: a handle buried in a volume is
 *    useless;
 *  - handlers exist only while a session is editable — the component returns
 *    null otherwise, which is what removes it from R3F's raycast set (P20);
 *  - the camera is released for the length of a drag with the in-tree idiom
 *    `controls.enabled = false` (`MeshDesignSession`), so no interaction mode
 *    is needed: the scene stays in NAVIGATE and everything off a handle orbits
 *    and pans as usual.
 *
 * The frameloop is on DEMAND: the draft changing does not by itself cause a
 * frame (in `release` apply-mode nothing in the scene changes during a drag),
 * so this invalidates on every draft change.
 */

const COLORS = ["#ef4444", "#22c55e", "#3b82f6"] as const;
const NEUTRAL = "#fbbf24";
const HOVER = "#ffffff";

/** Pixels. The group is scaled by world-units-per-pixel every frame. */
const ARROW_LENGTH = 64;
const ARROW_RADIUS = 1.6;
const CONE_HEIGHT = 14;
const CONE_RADIUS = 5;
const RING_RADIUS = 46;
const RING_TUBE = 1.4;
const BOX = 8;
const SCALE_AXIS_AT = ARROW_LENGTH + CONE_HEIGHT + 10;
const SCALE_UNIFORM_AT = 30;
/** How fat the invisible grab volumes are: a 1.6 px shaft is not a target. */
const GRAB = 7;

/** Rotations taking three's +Y-aligned cylinder/cone onto each world axis. */
const AXIS_ROTATION: readonly [number, number, number][] = [
  [0, 0, -Math.PI / 2],
  [0, 0, 0],
  [Math.PI / 2, 0, 0],
];
/** Rotations taking three's torus (normal +Z) onto each axis as its normal. */
const RING_ROTATION: readonly [number, number, number][] = [
  [0, Math.PI / 2, 0],
  [Math.PI / 2, 0, 0],
  [0, 0, 0],
];

const axisPoint = (slot: Slot, distance: number): Vec3 => {
  const p: Vec3 = [0, 0, 0];
  p[slot] = distance;
  return p;
};

type Drag = { handle: GizmoHandle; start: Ray; pivot: Vec3; viewNormal: Vec3 };

export const Gizmo = () => {
  const api = useRegistrationApi();
  const editable = useRegistration((state) => state.session?.phase === "editing");
  const constraint = useRegistration((state) => state.constraint);
  const view = useSceneDisplayMode();
  const handles = useMemo(() => gizmoHandles(constraint, view), [constraint, view]);

  const group = useRef<THREE.Group>(null);
  const drag = useRef<Drag | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);
  const invalidate = useThree((state) => state.invalidate);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Demand frameloop: a draft change must ask for the frame that shows it.
  useEffect(() => api.subscribe(() => invalidate()), [api, invalidate]);

  useFrame(({ camera, size }) => {
    const node = group.current;
    if (!node) return;
    const pivot = drawnPivot(api.getState());
    node.position.set(pivot[0], pivot[1], pivot[2]);
    node.scale.setScalar(
      worldUnitsPerPixel(
        camera as { isOrthographicCamera?: boolean; zoom?: number; fov?: number },
        camera.position.distanceTo(node.position),
        size.height,
      ),
    );
  });

  // Window listeners for the length of a drag: the pointer leaves the handle
  // (and often the canvas) long before the gesture ends.
  useEffect(() => {
    if (!dragging) return;

    const rayAt = (event: PointerEvent): Ray => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, get().camera);
      const { origin, direction } = raycaster.ray;
      return { origin: [origin.x, origin.y, origin.z], direction: [direction.x, direction.y, direction.z] };
    };

    const release = () => {
      drag.current = null;
      setDragging(null);
      const controls = get().controls as { enabled?: boolean } | null;
      if (controls) controls.enabled = true;
    };

    const onMove = (event: PointerEvent) => {
      const active = drag.current;
      if (!active) return;
      const gesture = gestureFor(active.handle, {
        start: active.start,
        current: rayAt(event),
        pivot: active.pivot,
        viewNormal: active.viewNormal,
        snap: event.shiftKey,
      });
      // Unreadable right now (handle end-on, pointer on the pivot): keep the
      // last good state rather than applying garbage.
      if (gesture) api.getState().updateGesture(gesture);
    };
    const onUp = () => {
      api.getState().endGesture();
      release();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      api.getState().cancelGesture();
      release();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [dragging, api, gl, get, raycaster]);

  // Unmounting mid-drag (session ended, view switched) must not leave the
  // camera locked or a gesture open.
  useEffect(
    () => () => {
      if (!drag.current) return;
      drag.current = null;
      api.getState().cancelGesture();
      const controls = get().controls as { enabled?: boolean } | null;
      if (controls) controls.enabled = true;
    },
    [api, get],
  );

  if (!editable) return null;

  const begin = (handle: GizmoHandle) => (event: ThreeEvent<PointerEvent>) => {
    if (event.button !== 0) return;
    // Claim it: the layer under the handle must not also take this press.
    event.stopPropagation();
    const state = api.getState();
    if (state.session?.phase !== "editing") return;
    const { camera } = get();
    const forward = camera.getWorldDirection(new THREE.Vector3());
    drag.current = {
      handle,
      start: {
        origin: [event.ray.origin.x, event.ray.origin.y, event.ray.origin.z],
        direction: [event.ray.direction.x, event.ray.direction.y, event.ray.direction.z],
      },
      pivot: drawnPivot(state),
      viewNormal: [forward.x, forward.y, forward.z],
    };
    const controls = get().controls as { enabled?: boolean } | null;
    if (controls) controls.enabled = false;
    state.beginGesture();
    setDragging(handle.id);
  };

  const interaction = (handle: GizmoHandle) => ({
    onPointerDown: begin(handle),
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHovered(handle.id);
    },
    onPointerOut: () => setHovered((current) => (current === handle.id ? null : current)),
  });

  const colorOf = (handle: GizmoHandle) =>
    hovered === handle.id || dragging === handle.id ? HOVER : handle.slot === null ? NEUTRAL : COLORS[handle.slot];

  // While one handle is dragged the others only clutter the view.
  const shown = dragging ? handles.filter((handle) => handle.id === dragging) : handles;

  return (
    <group ref={group} scale={0} renderOrder={30}>
      {shown.map((handle) => {
        const color = colorOf(handle);
        const paint = <meshBasicMaterial color={color} depthTest={false} depthWrite={false} transparent opacity={0.95} />;
        const grab = <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} />;

        if (handle.kind === "translate" && handle.slot === null) {
          return (
            <mesh key={handle.id} renderOrder={31} {...interaction(handle)}>
              <sphereGeometry args={[BOX * 0.75, 16, 12]} />
              {paint}
            </mesh>
          );
        }

        if (handle.kind === "translate" && handle.slot !== null) {
          return (
            <group key={handle.id} rotation={AXIS_ROTATION[handle.slot]}>
              <mesh position={[0, ARROW_LENGTH / 2, 0]} renderOrder={30}>
                <cylinderGeometry args={[ARROW_RADIUS, ARROW_RADIUS, ARROW_LENGTH, 8]} />
                {paint}
              </mesh>
              <mesh position={[0, ARROW_LENGTH + CONE_HEIGHT / 2, 0]} renderOrder={30}>
                <coneGeometry args={[CONE_RADIUS, CONE_HEIGHT, 12]} />
                {paint}
              </mesh>
              <mesh position={[0, (ARROW_LENGTH + CONE_HEIGHT) / 2 + BOX, 0]} {...interaction(handle)}>
                <cylinderGeometry args={[GRAB, GRAB, ARROW_LENGTH + CONE_HEIGHT - BOX * 2, 8]} />
                {grab}
              </mesh>
            </group>
          );
        }

        if (handle.kind === "rotate") {
          return (
            <group key={handle.id} rotation={RING_ROTATION[handle.slot]}>
              <mesh renderOrder={30}>
                <torusGeometry args={[RING_RADIUS, RING_TUBE, 8, 64]} />
                {paint}
              </mesh>
              <mesh {...interaction(handle)}>
                <torusGeometry args={[RING_RADIUS, GRAB, 6, 48]} />
                {grab}
              </mesh>
            </group>
          );
        }

        const at: Vec3 =
          handle.kind === "scale-axis"
            ? axisPoint(handle.slot, SCALE_AXIS_AT)
            : view === "2D"
              ? [SCALE_UNIFORM_AT, SCALE_UNIFORM_AT, 0]
              : [SCALE_UNIFORM_AT, SCALE_UNIFORM_AT, SCALE_UNIFORM_AT];
        return (
          <group key={handle.id} position={at}>
            <mesh renderOrder={31}>
              <boxGeometry args={[BOX, BOX, BOX]} />
              {paint}
            </mesh>
            <mesh {...interaction(handle)}>
              <boxGeometry args={[BOX * 2, BOX * 2, BOX * 2]} />
              {grab}
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
