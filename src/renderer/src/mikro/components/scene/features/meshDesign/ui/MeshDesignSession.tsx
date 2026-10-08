import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";

import { DESIGN_TOOL_GESTURES, useModeStore, useModeStoreApi } from "../../../platform/stores/modeStore";
import { PreviewLine, type PreviewLineHandle } from "../../../platform/draw/PreviewLine";
import { useBrushSkeletonStoreApi } from "../brush";
import { commitCandidate } from "../reconstruct/candidate";
import type { Vec3 } from "../field/stamps";
import { useMeshDesignStore, useMeshDesignStoreApi, type DesignMesh } from "../store/meshDesignStore";
import { targetMesh } from "../tools/context";
import { applyStampClick } from "../tools/stampTool";
import { applySculptStroke } from "../tools/sculptTool";
import { applyTrim, planeFromScreenDrag } from "../tools/trimTool";
import { applySplit } from "../tools/splitTool";

/**
 * The designer's in-canvas overlay: one MUTABLE mesh per design entry, the
 * reconstruction CANDIDATE awaiting its verdict, and the SURFACE and SCREEN
 * gesture hosts (stamp, sculpt, split, trim) — the tools whose pointer never
 * goes through the volume probe.
 *
 * Deliberately not the fabriks `BatchedMesh`: that renderer is append-only
 * and LRU-owned, built for thousands of frozen cells. A design session holds
 * a handful of meshes that change with every slider move, so a plain
 * `<mesh>` each — rebuilt when its geometry identity changes — is the honest
 * representation. Handlers only mount while DESIGN is active (P20: nothing
 * joins the raycast set outside its mode), the surface handlers only while
 * their tool's key is held, and click-to-select only while NO key is — with
 * a tool in hand a click on a mesh is that tool's gesture.
 */

const colorFor = (hue: number, selected: boolean): THREE.Color =>
  new THREE.Color().setHSL(hue / 360, 0.65, selected ? 0.6 : 0.5);

type SuspendableControls = { enabled: boolean };

type SurfaceGesture = {
  /** Down on a surface (or the fallback plane) with a surface tool held. */
  onDown: (point: Vec3, event: ThreeEvent<PointerEvent>) => void;
  onMove: (point: Vec3) => void;
  onUp: () => void;
  active: boolean;
};

const DesignMeshView = ({
  mesh,
  selected,
  onSelect,
  surface,
}: {
  mesh: DesignMesh;
  selected: boolean;
  /** Null while a tool owns the left button. */
  onSelect: (() => void) | null;
  surface: SurfaceGesture | null;
}) => {
  const { current, hue, visible } = mesh;
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(current.positions, 3));
    g.setIndex(new THREE.BufferAttribute(current.indices, 1));
    // The geometry worker ships normals with the mesh; only geometry that
    // came another way (an import, a re-simplify) derives them here.
    if (current.normals) g.setAttribute("normal", new THREE.BufferAttribute(current.normals, 3));
    else g.computeVertexNormals();
    return g;
  }, [current]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const color = useMemo(() => colorFor(hue, selected), [hue, selected]);

  if (!visible) return null;
  return (
    <group>
      <mesh
        geometry={geometry}
        renderOrder={9}
        frustumCulled={false}
        onPointerDown={
          !surface
            ? undefined
            : (event) => {
                event.stopPropagation();
                (event.target as { setPointerCapture?: (id: number) => void }).setPointerCapture?.(event.pointerId);
                surface.onDown([event.point.x, event.point.y, event.point.z], event);
              }
        }
        onPointerMove={
          !surface?.active
            ? undefined
            : (event) => surface.onMove([event.point.x, event.point.y, event.point.z])
        }
        onPointerUp={!surface?.active ? undefined : () => surface.onUp()}
        onClick={
          surface || !onSelect
            ? undefined
            : (event) => {
                // A click, not the end of an orbit drag — DESIGN navigates with
                // the left button, so only a still pointer picks a mesh.
                if (event.delta > 4) return;
                event.stopPropagation();
                onSelect();
              }
        }
      >
        <meshStandardMaterial
          color={color}
          flatShading={false}
          transparent
          opacity={selected ? 0.75 : 0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {selected && (
        <mesh geometry={geometry} renderOrder={10} frustumCulled={false}>
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.25} depthTest={false} />
        </mesh>
      )}
    </group>
  );
};

/**
 * The surface tools' shared drag state: collected points, one apply on
 * release (one undo step), OrbitControls suspended for the duration.
 */
const useSurfaceGesture = (): SurfaceGesture | null => {
  const heldTool = useModeStore((s) => s.designTool);
  const controls = useThree((s) => s.controls);
  const designApi = useMeshDesignStoreApi();
  const brushApi = useBrushSkeletonStoreApi();
  const drag = useRef<{ points: Vec3[]; targetId: string | null; tool: "stamp" | "sculpt" | "split" } | null>(null);
  const [dragging, setDragging] = useState(false);

  const gesture =
    heldTool && DESIGN_TOOL_GESTURES[heldTool] === "surface"
      ? (heldTool as "stamp" | "sculpt" | "split")
      : null;

  // Suspend the camera for the drag's duration; whatever happens to this
  // component, the camera comes back (the BrushStrokeSession idiom).
  useEffect(() => {
    const ctrl = controls && "enabled" in controls ? (controls as unknown as SuspendableControls) : null;
    if (!ctrl) return;
    ctrl.enabled = !dragging;
    return () => {
      ctrl.enabled = true;
    };
  }, [controls, dragging]);

  const finish = useCallback(async () => {
    const current = drag.current;
    drag.current = null;
    setDragging(false);
    if (!current) return;
    // A reconstruction still awaiting its verdict is accepted by the next
    // gesture, so the tool edits what the user was looking at.
    const accepted = await commitCandidate(designApi.getState());
    const design = designApi.getState();
    const brush = brushApi.getState();
    // The drag's target was picked before the accept may have created one.
    if (accepted && !design.meshes.some((m) => m.id === current.targetId)) {
      current.targetId = targetMesh(design)?.id ?? null;
    }
    if (current.tool === "stamp") {
      void applyStampClick(design, brush, current.points[0]).then((ok) => {
        if (!ok) design.setStatus("editing", "Set a radius before stamping");
      });
      return;
    }
    if (current.tool === "split") {
      const point = current.points[0];
      const pending = design.pendingPoint;
      if (!pending) {
        design.setPendingPoint({ world: point, voxel: point });
        design.setStatus("editing", "Split — click the other side of the waist");
        return;
      }
      design.setPendingPoint(null);
      const target = current.targetId ? design.meshes.find((m) => m.id === current.targetId) : targetMesh(design);
      if (!target) {
        design.setStatus("editing", "Nothing to split — reconstruct a mesh first");
        return;
      }
      void applySplit(design, brush, target, pending.world, point).then((ok) => {
        if (!ok) design.setStatus("editing", "Could not split there — click two points inside the mesh");
      });
      return;
    }
    const target = current.targetId ? design.meshes.find((m) => m.id === current.targetId) : targetMesh(design);
    if (!target) {
      design.setStatus("editing", "Nothing to sculpt — reconstruct or stamp a mesh first");
      return;
    }
    void applySculptStroke(design, brush, target, current.points).then((ok) => {
      if (!ok) design.setStatus("editing", "The sculpt stroke touched nothing");
    });
  }, [designApi, brushApi]);

  const onDown = useCallback(
    (point: Vec3) => {
      if (!gesture || drag.current !== null) return;
      drag.current = { points: [point], targetId: targetMesh(designApi.getState())?.id ?? null, tool: gesture };
      setDragging(true);
      if (gesture === "stamp" || gesture === "split") void finish(); // clicks, not drags
    },
    [gesture, designApi, finish],
  );

  const onMove = useCallback(
    (point: Vec3) => {
      const current = drag.current;
      if (!current) return;
      const last = current.points[current.points.length - 1];
      const step = Math.hypot(point[0] - last[0], point[1] - last[1], point[2] - last[2]);
      const radius = brushApi.getState().radiusWorld ?? 1;
      if (step >= radius * 0.25) current.points.push(point);
    },
    [brushApi],
  );

  // The tool key came up mid-drag: the handlers go with it, so finish here —
  // otherwise the drag (and the suspended camera) would be stranded.
  useEffect(() => {
    if (!gesture && drag.current) void finish();
  }, [gesture, finish]);

  if (!gesture) return null;
  return { active: dragging, onDown, onMove, onUp: () => void finish() };
};

/** The TRIM screen drag: DOM-level, camera math, one cut on release. */
const TrimGesture = () => {
  const heldTool = useModeStore((s) => s.designTool);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls);
  const modeApi = useModeStoreApi();
  const designApi = useMeshDesignStoreApi();
  const brushApi = useBrushSkeletonStoreApi();

  useEffect(() => {
    if (heldTool !== "trim") return;
    const ctrl = controls && "enabled" in controls ? (controls as unknown as SuspendableControls) : null;
    const element = gl.domElement;
    let start: THREE.Vector2 | null = null;

    const ndc = (event: PointerEvent): THREE.Vector2 => {
      const rect = element.getBoundingClientRect();
      return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      );
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      start = ndc(event);
      if (ctrl) ctrl.enabled = false;
    };
    const onUp = (event: PointerEvent) => {
      const from = start;
      start = null;
      if (ctrl) ctrl.enabled = true;
      if (!from || modeApi.getState().designTool !== "trim") return;
      const plane = planeFromScreenDrag(camera, from, ndc(event));
      if (!plane) return;
      void commitCandidate(designApi.getState()).then(() => {
        const design = designApi.getState();
        const target = targetMesh(design);
        if (!target) {
          design.setStatus("editing", "Nothing to trim — reconstruct or stamp a mesh first");
          return;
        }
        return applyTrim(design, brushApi.getState(), target, plane).then((ok) => {
          if (!ok) design.setStatus("editing", "The cut missed the mesh");
        });
      });
    };
    element.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      element.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      if (ctrl) ctrl.enabled = true;
    };
  }, [heldTool, camera, gl, controls, modeApi, designApi, brushApi]);

  return null;
};

/**
 * The stamp tool's fallback target when nothing is hit: an invisible plane
 * through the orbit target, facing the camera — so an EMPTY session can
 * still start from a stamp in free space.
 */
const StampFallbackPlane = ({ surface }: { surface: SurfaceGesture }) => {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
  const anchor = controls?.target ?? new THREE.Vector3();
  return (
    <mesh
      position={[anchor.x, anchor.y, anchor.z]}
      quaternion={camera.quaternion}
      renderOrder={-1}
      onPointerDown={(event) => {
        surface.onDown([event.point.x, event.point.y, event.point.z], event);
      }}
    >
      <planeGeometry args={[1e6, 1e6]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
};

/**
 * The reconstruction awaiting accept / discard: amber, so it reads apart
 * from the session's own meshes, and never in the raycast set (P20) — it is
 * something to look at, not to touch. A fitted tube's centerline rides along.
 */
const CandidateView = () => {
  const candidate = useMeshDesignStore((s) => s.candidate);
  const busy = useMeshDesignStore((s) => s.candidateBusy);
  const guideRef = useRef<PreviewLineHandle | null>(null);
  const current = candidate?.current ?? null;
  const geometry = useMemo(() => {
    if (!current) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(current.positions, 3));
    g.setIndex(new THREE.BufferAttribute(current.indices, 1));
    if (current.normals) g.setAttribute("normal", new THREE.BufferAttribute(current.normals, 3));
    else g.computeVertexNormals();
    return g;
  }, [current]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  const guide = candidate?.guide;
  useEffect(() => {
    if (guide && guide.length >= 2) guideRef.current?.setPoints(guide.map((p) => [p[0], p[1], p[2]]));
    else guideRef.current?.clear();
  }, [guide]);

  return (
    <>
      <PreviewLine ref={guideRef} color="#fde68a" lineWidth={2} capacity={512} />
      {geometry && (
        <group>
          {/* depthTest OFF, like the stroke preview: the volume box spans real
              depth and would otherwise swallow a surface INSIDE the data. */}
          <mesh geometry={geometry} renderOrder={11} frustumCulled={false}>
            <meshStandardMaterial
              color="#fbbf24"
              transparent
              opacity={busy ? 0.2 : 0.4}
              depthTest={false}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh geometry={geometry} renderOrder={12} frustumCulled={false}>
            <meshBasicMaterial color="#fde68a" wireframe transparent opacity={0.2} depthTest={false} />
          </mesh>
        </group>
      )}
    </>
  );
};

export const MeshDesignSession = () => {
  const interactionMode = useModeStore((s) => s.interactionMode);
  const heldTool = useModeStore((s) => s.designTool);
  const meshes = useMeshDesignStore((s) => s.meshes);
  const selectedId = useMeshDesignStore((s) => s.selectedId);
  const select = useMeshDesignStore((s) => s.select);
  const surface = useSurfaceGesture();

  if (interactionMode !== "DESIGN") return null;
  return (
    <>
      {meshes.map((mesh) => (
        <DesignMeshView
          key={mesh.id}
          mesh={mesh}
          selected={mesh.id === selectedId}
          onSelect={heldTool === null ? () => select(mesh.id) : null}
          surface={surface}
        />
      ))}
      <CandidateView />
      <TrimGesture />
      {surface && heldTool === "stamp" && <StampFallbackPlane surface={surface} />}
    </>
  );
};
