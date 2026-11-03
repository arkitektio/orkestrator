/**
 * Depth view (hold Q / Shift+Q) — CPU mirror of `gpu/depthCodeNodes.ts`.
 *
 * A depth pass packs, per pixel, the VIEW-SPACE depth of the sample it shows
 * weighted by that sample's strength; the composite decodes it, takes a
 * SURFACE NORMAL from the depth of neighbouring rays and lights the image
 * with it (relief shading), over depth hues (Q) or the normal colours
 * (Shift+Q). Keep
 * every function here in lockstep with its TSL twin: the legend draws its
 * gradient from `depthRamp`, so a drift would make the legend lie about the
 * image.
 *
 * Conventions:
 *  - depth is `-z` in view space (positive in front of the camera), so it is
 *    the same quantity under perspective and orthographic cameras and a
 *    face-on plane has ONE depth, not a radial gradient;
 *  - the range is the scene's union box, shared by every layer — a per-layer
 *    or per-ray range would give each entity its own 0..1 and defeat the
 *    comparison the mode exists for.
 */

export type Rgb = [number, number, number];

// Turbo, polynomial fit (Mikhailov 2019 / Du's approximation).
const R4 = [0.13572138, 4.6153926, -42.66032258, 132.13108234] as const;
const G4 = [0.09140261, 2.19418839, 4.84296658, -14.18503333] as const;
const B4 = [0.1066733, 12.64194608, -60.58204836, 110.36276771] as const;
const R2 = [-152.94239396, 59.28637943] as const;
const G2 = [4.27729857, 2.82956604] as const;
const B2 = [-89.90310912, 27.34824973] as const;

/** The trimmed span of turbo the ramp uses: its two ends are near-black,
 * which would read as "dim" once multiplied by intensity. Near = warm. */
export const DEPTH_RAMP_NEAR = 0.9;
export const DEPTH_RAMP_FAR = 0.1;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Raw turbo at `x ∈ [0, 1]`. */
export const turbo = (x: number): Rgb => {
  const t = clamp01(x);
  const v = [1, t, t * t, t * t * t];
  const w = [v[2] * v[2], v[3] * v[2]];
  const ch = (k4: readonly number[], k2: readonly number[]) =>
    clamp01(v[0] * k4[0] + v[1] * k4[1] + v[2] * k4[2] + v[3] * k4[3] + w[0] * k2[0] + w[1] * k2[1]);
  return [ch(R4, R2), ch(G4, G2), ch(B4, B2)];
};

/** Depth fraction (0 = near, 1 = far) → colour. Warm near, cool far. */
export const depthRamp = (t: number): Rgb =>
  turbo(DEPTH_RAMP_NEAR + (DEPTH_RAMP_FAR - DEPTH_RAMP_NEAR) * clamp01(t));

/** `depth` placed in `[near, far]`, clamped; a degenerate range is mid-ramp. */
export const depthFraction = (depth: number, near: number, far: number): number => {
  const span = far - near;
  if (!(span > 1e-6)) return 0.5;
  return clamp01((depth - near) / span);
};

/**
 * The view-depth range of an axis-aligned world box: min/max of `-z_view`
 * over its 8 corners. `view` is a column-major 4×4 (three's
 * `Matrix4.elements`, i.e. `camera.matrixWorldInverse`). `near` is clamped
 * to 0 — a camera inside the box sees nothing behind itself, and spending
 * ramp on that would compress what is visible.
 */
export const boxViewDepthRange = (
  min: readonly [number, number, number],
  max: readonly [number, number, number],
  view: ArrayLike<number>,
): { near: number; far: number } => {
  let near = Infinity;
  let far = -Infinity;
  for (const x of [min[0], max[0]]) {
    for (const y of [min[1], max[1]]) {
      for (const z of [min[2], max[2]]) {
        const depth = -(view[2] * x + view[6] * y + view[10] * z + view[14]);
        if (depth < near) near = depth;
        if (depth > far) far = depth;
      }
    }
  }
  return { near: Math.max(near, 0), far: Math.max(far, 0) };
};

/** CSS gradient stops (near → far) for the legend, sampled from `depthRamp`. */
export const depthRampCssStops = (count = 9): string =>
  Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const [r, g, b] = depthRamp(t);
    const c = (v: number) => Math.round(v * 255);
    return `rgb(${c(r)} ${c(g)} ${c(b)}) ${(t * 100).toFixed(1)}%`;
  }).join(", ");

// ---------------------------------------------------------------------------
// Packed depth + edges (the compositor's stage)
// ---------------------------------------------------------------------------

/** What a depth pass writes: `(frac·s, s)`. Additive across passes. */
export type PackedDepth = { r: number; g: number };

export const packDepth = (frac: number, strength: number): PackedDepth => ({
  r: frac * strength,
  g: strength,
});

/** Strength-weighted mean depth of whatever passes added into this texel. */
export const decodeDepth = (p: PackedDepth): number => p.r / Math.max(p.g, 1e-5);

/** How a texel's depth fraction maps to world units across the screen. */
export type ReliefFrame = {
  /** Scene depth range (far − near) in world units: frac → world depth. */
  range: number;
  /** View depth of frac 0. */
  near: number;
  /** Perspective: world size of one texel per unit of depth, 2·tan(fov/2)/H.
   * Orthographic: world size of one texel. */
  pxScale: number;
  perspective: boolean;
};

/** Headlight from the upper left, toward the camera (view space, +y up). */
export const RELIEF_LIGHT: readonly [number, number, number] = (() => {
  const v = [-0.35, 0.45, 1];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l] as const;
})();
export const RELIEF_AMBIENT = 0.3;

/**
 * The view-space surface normal at the centre of a 3×3 block of decoded
 * depth FRACTIONS (row-major, rows top → bottom on screen). Sobel
 * derivatives (they average the jitter noise a single difference keeps);
 * a neighbour without trustworthy depth stands in with the centre's, so
 * an object's rim against empty space reads flat rather than as a cliff.
 *
 * Surface (x, y, −depth(x, y)) ⇒ n ∝ (∂depth/∂x, ∂depth/∂y, 1), facing the
 * camera. Screen rows run DOWN, view y runs up — hence the sign on gy.
 */
export const reliefNormal = (
  depths: readonly number[],
  valid: readonly boolean[],
  frame: ReliefFrame,
): [number, number, number] => {
  const c = depths[4];
  const d = (i: number) => (valid[i] ? depths[i] : c);
  const gx = (d(2) + 2 * d(5) + d(8) - d(0) - 2 * d(3) - d(6)) / 8;
  const gy = (d(6) + 2 * d(7) + d(8) - d(0) - 2 * d(1) - d(2)) / 8;
  const wpt = frame.perspective ? (frame.near + c * frame.range) * frame.pxScale : frame.pxScale;
  const k = frame.range / Math.max(wpt, 1e-9);
  const n: [number, number, number] = [gx * k, -gy * k, 1];
  const l = Math.hypot(n[0], n[1], n[2]);
  return [n[0] / l, n[1] / l, n[2] / l];
};

/** Lambert under `RELIEF_LIGHT` with an ambient floor: the colour multiplier. */
export const reliefShade = (n: readonly [number, number, number], ambient = RELIEF_AMBIENT): number =>
  ambient +
  (1 - ambient) * Math.max(n[0] * RELIEF_LIGHT[0] + n[1] * RELIEF_LIGHT[1] + n[2] * RELIEF_LIGHT[2], 0);
