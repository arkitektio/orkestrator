/**
 * Which gizmo handles exist, and what dragging each one does.
 *
 * The gizmo component is meshes and event wiring; every decision about it is
 * here, where it can be tested: the constraint decides which KINDS of handle
 * are offered (`allowedHandles`), the view decides which AXES make sense, and
 * `gestureFor` maps a handle + two pointer rays to a world-space gesture.
 *
 * The 2D view offers in-plane handles only. That is not timidity: the plane
 * renderer slices lens-backed layers along axis-aligned voxel z, so a layer
 * tilted out of plane cannot be drawn correctly there — a handle that produces
 * a state the view cannot show would be a trap. Tilt in the 3D view.
 */
import { allowedHandles, type Constraint, type HandleKind } from "./constraints";
import {
  rotateAboutAxis,
  scaleAlongWorldAxis,
  scaleUniform,
  translateAlongAxis,
  translateInPlane,
  type Ray,
} from "./gizmoMath";
import type { Mat4, Vec3 } from "./mat4";

export type Slot = 0 | 1 | 2;

export type GizmoHandle =
  | { id: "move"; kind: "translate"; slot: null }
  | { id: `move-${"x" | "y" | "z"}`; kind: "translate"; slot: Slot }
  | { id: `rotate-${"x" | "y" | "z"}`; kind: "rotate"; slot: Slot }
  | { id: "scale"; kind: "scale-uniform"; slot: null }
  | { id: `scale-${"x" | "y" | "z"}`; kind: "scale-axis"; slot: Slot };

const NAMES = ["x", "y", "z"] as const;

export const AXIS_VECTORS: readonly Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

export const gizmoHandles = (constraint: Constraint, view: "2D" | "3D"): GizmoHandle[] => {
  const kinds = new Set<HandleKind>(allowedHandles(constraint));
  const slots: Slot[] = view === "2D" ? [0, 1] : [0, 1, 2];
  // In the flat view the only rotation that stays in the plane is about z.
  const rotationSlots: Slot[] = view === "2D" ? [2] : [0, 1, 2];
  const handles: GizmoHandle[] = [];

  if (kinds.has("translate")) {
    handles.push({ id: "move", kind: "translate", slot: null });
    for (const slot of slots) handles.push({ id: `move-${NAMES[slot]}`, kind: "translate", slot });
  }
  if (kinds.has("rotate")) {
    for (const slot of rotationSlots) handles.push({ id: `rotate-${NAMES[slot]}`, kind: "rotate", slot });
  }
  if (kinds.has("scale-uniform")) handles.push({ id: "scale", kind: "scale-uniform", slot: null });
  if (kinds.has("scale-axis")) {
    for (const slot of slots) handles.push({ id: `scale-${NAMES[slot]}`, kind: "scale-axis", slot });
  }
  return handles;
};

/** Rotation snap while Shift is held: 15°. */
export const ROTATION_SNAP = Math.PI / 12;

/**
 * The gesture a drag on `handle` has produced so far, measured from the drag's
 * start. Null = unreadable right now (handle viewed end-on, pointer at the
 * pivot): the caller keeps the last good gesture rather than applying garbage.
 */
export const gestureFor = (
  handle: GizmoHandle,
  drag: { start: Ray; current: Ray; pivot: Vec3; viewNormal: Vec3; snap: boolean },
): Mat4 | null => {
  const { start, current, pivot, viewNormal, snap } = drag;
  switch (handle.kind) {
    case "translate":
      return handle.slot === null
        ? translateInPlane(start, current, pivot, viewNormal)
        : translateAlongAxis(start, current, pivot, AXIS_VECTORS[handle.slot]);
    case "rotate":
      return rotateAboutAxis(start, current, pivot, AXIS_VECTORS[handle.slot], snap ? ROTATION_SNAP : null);
    case "scale-uniform":
      return scaleUniform(start, current, pivot, viewNormal);
    case "scale-axis":
      return scaleAlongWorldAxis(start, current, pivot, handle.slot);
  }
};
