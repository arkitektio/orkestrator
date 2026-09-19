import * as THREE from "three";
import type { Morphology } from "./buildMorphology";

/**
 * The zoomed-in render: a FOCUS (a cell's sections, one section) framed and
 * orbited, with the rest of the model kept as context — dimmed, hidden, or
 * shown as is. Pure, so the framing and the colour math are testable.
 */

export type FocusContext = "dim" | "hide" | "show";

export const FOCUS_CONTEXT_OPTIONS: { value: FocusContext; label: string; title: string }[] = [
  { value: "dim", label: "dim", title: "Keep the rest of the model, dimmed" },
  { value: "hide", label: "hide", title: "Draw only the focus" },
  { value: "show", label: "show", title: "Draw the whole model as is" },
];

/** What the rest of the model keeps of its colour when dimmed. */
const DIM = 0.18;
/** Where a dimmed colour sits between black and this grey. */
const DIM_FLOOR = 0.03;

export type Frame = { center: THREE.Vector3; radius: number };

/**
 * The sphere the camera frames for `focus`: the radius-padded bounds of its
 * sections. Null when nothing in the focus is in the morphology.
 */
export const focusFrame = (
  morphology: Morphology,
  focus: ReadonlySet<string>,
): Frame | null => {
  const box = new THREE.Box3();
  const pad = new THREE.Vector3();
  for (const id of focus) {
    const section = morphology.byId.get(id);
    if (!section) continue;
    section.points.forEach((point, i) => {
      pad.setScalar(section.radii[i]);
      box.expandByPoint(point.clone().add(pad));
      box.expandByPoint(point.clone().sub(pad));
    });
  }
  if (box.isEmpty()) return null;
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  return { center: sphere.center, radius: Math.max(sphere.radius, 1) };
};

/** The whole morphology's frame: orbit the roots, fit everything. */
export const wholeFrame = (morphology: Morphology): Frame => ({
  center: morphology.rootCentroid,
  radius: Math.max(morphology.radius, 1),
});

/** Section colours with everything outside `focus` dimmed (`context: "dim"`). */
export const dimOutsideFocus = (
  colors: Float32Array,
  morphology: Morphology,
  focus: ReadonlySet<string>,
): Float32Array => {
  const out = colors.slice();
  for (const section of morphology.sections) {
    if (focus.has(section.id)) continue;
    const o = section.ordinal * 3;
    for (let c = 0; c < 3; c++) out[o + c] = DIM_FLOOR + out[o + c] * DIM;
  }
  return out;
};

/** The sections `context: "hide"` leaves out: everything not in the focus. */
export const hiddenOutsideFocus = (
  morphology: Morphology,
  focus: ReadonlySet<string>,
): Set<string> => new Set(morphology.sections.filter((s) => !focus.has(s.id)).map((s) => s.id));
