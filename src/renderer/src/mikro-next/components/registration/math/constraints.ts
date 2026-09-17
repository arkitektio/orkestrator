/**
 * The transform family the user is allowed to author.
 *
 * This limits the GESTURES (which gizmo handles are live, which numeric fields
 * edit) and the landmark solver's MODEL. It is deliberately NOT written to the
 * edge as a `TransformInvariance`: the schema states invariance "by kind, never
 * by inspecting the numbers", and the saved edge is `D · E`, which normally
 * carries the pixel size — a general affine however rigid `D` was. What the
 * user did is recorded in the edge's name instead (`describeSession`).
 */
import { applyPoint, det3, identity, linear3, type Mat4, type Vec3 } from "./mat4";
import type { DeltaParts } from "./decompose";

export type Constraint = "rigid" | "similarity" | "affine";

export const CONSTRAINTS: readonly { value: Constraint; label: string; description: string }[] = [
  { value: "rigid", label: "Rigid", description: "Move and rotate. Sizes and angles are kept." },
  { value: "similarity", label: "Similarity", description: "Move, rotate and scale uniformly." },
  { value: "affine", label: "Affine", description: "Also stretch per axis and shear." },
];

export type HandleKind = "translate" | "rotate" | "scale-uniform" | "scale-axis";

export const allowedHandles = (constraint: Constraint): readonly HandleKind[] => {
  switch (constraint) {
    case "rigid":
      return ["translate", "rotate"];
    case "similarity":
      return ["translate", "rotate", "scale-uniform"];
    case "affine":
      return ["translate", "rotate", "scale-uniform", "scale-axis"];
  }
};

const transpose3 = (m: number[][]): number[][] => m[0].map((_, c) => m.map((row) => row[c]));

const inverse3 = (m: number[][]): number[][] | null => {
  const det = det3(m);
  if (Math.abs(det) < 1e-14) return null;
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  return [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
};

/**
 * The rotation nearest a linear map (its polar factor), by Newton iteration
 * `R ← ½(R + R⁻ᵀ)`. A reflected map is un-mirrored first so the result is a
 * PROPER rotation: "rigid" means no mirror, and a mirror is only ever reached
 * through an explicit affine.
 */
export const nearestRotation = (linear: number[][]): number[][] | null => {
  let r = linear.map((row) => [...row]);
  if (det3(r) < 0) r = r.map((row) => [row[0], row[1], -row[2]]);
  for (let iteration = 0; iteration < 50; iteration++) {
    const inverse = inverse3(r);
    if (!inverse) return null;
    const inverseTranspose = transpose3(inverse);
    let change = 0;
    const next = r.map((row, i) =>
      row.map((value, j) => {
        const updated = 0.5 * (value + inverseTranspose[i][j]);
        change = Math.max(change, Math.abs(updated - value));
        return updated;
      }),
    );
    r = next;
    if (change < 1e-14) break;
  }
  return r;
};

/**
 * Snap a delta into a family, keeping the PIVOT's image fixed — so tightening
 * the constraint mid-session straightens the layer in place instead of
 * flinging it across the scene.
 */
export const projectToConstraint = (delta: Mat4, constraint: Constraint, pivot: Vec3): Mat4 => {
  if (constraint === "affine") return delta;
  const linear = linear3(delta);
  const rotation = nearestRotation(linear);
  if (!rotation) return delta;
  const factor = constraint === "similarity" ? Math.cbrt(Math.abs(det3(linear))) : 1;

  const out = identity();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out[i][j] = rotation[i][j] * factor;
  const target = applyPoint(delta, pivot);
  const landed = applyPoint(out, pivot);
  for (let i = 0; i < 3; i++) out[i][3] = target[i] - landed[i];
  return out;
};

/** The numeric panel's version: clamp the parts a family does not have. */
export const constrainParts = (
  parts: DeltaParts,
  constraint: Constraint,
  /** Which scale component the user just edited; it wins under similarity. */
  editedScaleAxis: 0 | 1 | 2 = 0,
): DeltaParts => {
  if (constraint === "affine") return parts;
  if (constraint === "rigid") {
    return { ...parts, scale: [1, 1, 1], shear: [0, 0, 0], reflected: false };
  }
  const uniform = Math.abs(parts.scale[editedScaleAxis]) || 1;
  return { ...parts, scale: [uniform, uniform, uniform], shear: [0, 0, 0], reflected: false };
};

/** The name a saved edge gets: what was done, since the kind cannot say it. */
export const describeSession = (summary: {
  constraint: Constraint;
  landmarkPairs?: number;
  rms?: number | null;
  unit?: string | null;
}): string => {
  const details: string[] = [summary.constraint];
  if (summary.landmarkPairs) {
    details.push(`${summary.landmarkPairs} pairs`);
    if (summary.rms != null && Number.isFinite(summary.rms)) {
      details.push(`RMS ${summary.rms.toPrecision(3)}${summary.unit ? ` ${summary.unit}` : ""}`);
    }
  }
  return `interactive (${details.join(", ")})`;
};
