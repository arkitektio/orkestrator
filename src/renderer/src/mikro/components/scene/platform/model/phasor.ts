import { AxisType, PhasorColorMode } from "@/mikro/api/graphql";
import { toBase } from "@/core/lib/quantities";

/**
 * Phasor math — the single source of truth, mirrored in three places that must
 * stay in lockstep:
 *
 *  - the CPU repack (`features/bricks/octree/brickRepack.ts`) reduces the phasor axis of a
 *    brick into three slabs (g, s, intensity) with `reduceProfile`;
 *  - the shader (`features/bricks/gpu/brickNodeMaterials.ts`) taps those three slabs
 *    and re-derives the pixel's color with the TSL port of `calibratePhasor` /
 *    `phasorValue` / `cursorHit`;
 *  - the panels display the same numbers next to the phasor plot.
 *
 * The phasor of a pixel is the normalized DFT of its profile along one axis at
 * one harmonic:
 *
 *     g = Σ I_k · cos(2π·h·k/N) / Σ I_k
 *     s = Σ I_k · sin(2π·h·k/N) / Σ I_k
 *
 * Over a MICROTIME axis a single-exponential decay lands exactly on the
 * "universal semicircle" (centre (0.5, 0), radius 0.5) and its phase and
 * modulation each read as a lifetime; a multi-exponential decay falls inside it
 * (which is why τ_m > τ_φ there). Over a SPECTRUM axis the phase reads as the
 * spectral centre of mass instead.
 */

export type PhasorReduction = {
  g: number;
  s: number;
  /** Σ I_k — the photon count the transfer's `intensity` function maps. */
  intensity: number;
};

/** The instrument-response correction, taking a raw phasor to a calibrated one. */
export type PhasorCalibrationValues = {
  /** Radians. */
  phaseOffset: number;
  modulationFactor: number;
};

export const IDENTITY_CALIBRATION: PhasorCalibrationValues = {
  phaseOffset: 0,
  modulationFactor: 1,
};

/**
 * The DFT of one pixel's profile at `harmonic`. A zero-photon pixel has no
 * phasor at all (0/0) — it returns the origin with intensity 0, and every
 * consumer treats intensity 0 as "nothing here".
 */
export const reduceProfile = (
  profile: ArrayLike<number>,
  harmonic = 1,
): PhasorReduction => {
  const bins = profile.length;
  if (bins === 0) return { g: 0, s: 0, intensity: 0 };

  let sum = 0;
  let re = 0;
  let im = 0;
  const step = (2 * Math.PI * harmonic) / bins;
  for (let k = 0; k < bins; k++) {
    const value = profile[k];
    sum += value;
    re += value * Math.cos(step * k);
    im += value * Math.sin(step * k);
  }

  if (sum <= 0) return { g: 0, s: 0, intensity: sum > 0 ? sum : 0 };
  return { g: re / sum, s: im / sum, intensity: sum };
};

/**
 * Apply the instrument response: rotate by the phase offset, scale by the
 * modulation factor. An uncalibrated phasor still renders — its hue is just not
 * traceable to an absolute lifetime — so the identity is a legitimate value.
 */
export const calibratePhasor = (
  g: number,
  s: number,
  calibration: PhasorCalibrationValues = IDENTITY_CALIBRATION,
): { g: number; s: number } => {
  const cos = Math.cos(calibration.phaseOffset);
  const sin = Math.sin(calibration.phaseOffset);
  const m = calibration.modulationFactor;
  return { g: m * (g * cos - s * sin), s: m * (g * sin + s * cos) };
};

/** The phasor's angle, in [0, 2π). */
export const phasorPhase = (g: number, s: number): number => {
  const phase = Math.atan2(s, g);
  return phase < 0 ? phase + 2 * Math.PI : phase;
};

/** The phasor's modulus, in [0, 1] for physically meaningful data. */
export const phasorModulation = (g: number, s: number): number =>
  Math.sqrt(g * g + s * s);

/**
 * What the phasor's angle and modulus MEAN for this axis — the bridge from a
 * unitless (g, s) to a value the colormap can be ranged in.
 *
 * `omega` is the angular frequency the transform ran at, expressed per BASE
 * unit of `dimension` (ms for a time axis, µm for a length axis — the bases in
 * `lib/quantities`), so every number downstream (including the transfer's
 * min/max, parsed with `toBase`) lives in one unit system.
 *
 * `omega` is null when the data says nothing about the physical axis (no laser
 * frequency, no calibrated bin width): the phasor is then only readable in its
 * own terms, and `phasorValue` falls back to the raw phase/modulation.
 */
export type PhasorScale = {
  omega: number | null;
  dimension: "time" | "length" | null;
  harmonic: number;
};

type PhasorContextLike = {
  axisType?: AxisType | null;
  harmonic?: number | null;
  /** e.g. "80 MHz" — the pulsed source's repetition rate. */
  laserFrequency?: string | null;
  /** e.g. "12.5 ns" / "320 nm" — bin width × bins on THIS lens. */
  window?: string | null;
};

const dimensionFor = (axisType: AxisType | null | undefined) => {
  if (axisType === AxisType.Microtime) return "time" as const;
  if (axisType === AxisType.Spectrum) return "length" as const;
  return null;
};

/**
 * Resolve the scale from a `PhasorContext`.
 *
 * A FLIM lifetime is absolute only against the LASER's clock, so the laser
 * frequency wins when the server states one. The `window` (bin width × bins on
 * this lens) is the fallback and the only option over a spectrum axis — and the
 * two deliberately diverge on a lens that crops its phasor axis, because the
 * window follows the data while the laser does not.
 */
export const resolvePhasorScale = (
  context: PhasorContextLike | null | undefined,
): PhasorScale => {
  const harmonic = Math.max(1, context?.harmonic ?? 1);
  const dimension = dimensionFor(context?.axisType);
  if (!dimension) return { omega: null, dimension: null, harmonic };

  if (dimension === "time" && context?.laserFrequency) {
    // Frequency base is Hz; time base is ms. f[Hz] = f[1/s] = f/1000 per ms.
    const hz = toBase(context.laserFrequency, "frequency", NaN);
    if (Number.isFinite(hz) && hz > 0) {
      return { omega: (2 * Math.PI * harmonic * hz) / 1000, dimension, harmonic };
    }
  }

  if (context?.window) {
    const window = toBase(context.window, dimension, NaN);
    if (Number.isFinite(window) && window > 0) {
      return { omega: (2 * Math.PI * harmonic) / window, dimension, harmonic };
    }
  }

  return { omega: null, dimension, harmonic };
};

/**
 * The phase-derived value: τ_φ = tan(φ)/ω over a microtime axis, the centre of
 * mass along the axis (offset from the window's start) over a spectrum one.
 * Without a scale it degrades to the phase as a fraction of a turn, in [0, 1).
 */
export const phaseValue = (phase: number, scale: PhasorScale): number => {
  if (scale.omega === null) return phase / (2 * Math.PI);
  if (scale.dimension === "length") {
    // A spectral centre of mass is a POSITION along the axis, not a lifetime:
    // the phase is the fraction of the window the mass sits at, and ω is
    // 2π·h/window — so the offset from the window's start is just φ/ω.
    return phase / scale.omega;
  }
  // tan is undefined at φ = π/2 and negative past it — a phasor above the
  // semicircle's apex has no positive phase lifetime. Clamp to 0 rather than
  // emitting ±Infinity into a colormap lookup.
  const tan = Math.tan(phase);
  if (!Number.isFinite(tan) || tan < 0) return 0;
  return tan / scale.omega;
};

/**
 * The modulation-derived value: τ_m = sqrt(1/M² − 1)/ω over a microtime axis.
 * Without a scale (or over a spectrum axis) it degrades to the modulus itself.
 */
export const modulationValue = (modulation: number, scale: PhasorScale): number => {
  if (scale.omega === null || scale.dimension !== "time") return modulation;
  const m = Math.min(Math.max(modulation, 1e-6), 1);
  return Math.sqrt(1 / (m * m) - 1) / scale.omega;
};

/**
 * The scalar the colormap maps, per the node's `mode`. AVERAGE is the mean of
 * the phase- and modulation-derived values (over a microtime axis: the mean of
 * τ_φ and τ_m — they coincide exactly for a single exponential and separate for
 * a mixture).
 */
export const phasorValue = (
  g: number,
  s: number,
  mode: PhasorColorMode,
  scale: PhasorScale,
): number => {
  const phase = phasorPhase(g, s);
  const modulation = phasorModulation(g, s);
  if (mode === PhasorColorMode.Modulation) return modulationValue(modulation, scale);
  if (mode === PhasorColorMode.Phase) return phaseValue(phase, scale);
  return (phaseValue(phase, scale) + modulationValue(modulation, scale)) / 2;
};

/**
 * Default cursor colors, by cursor index.
 *
 * A cursor MUST default to a color the colormap would not have given those
 * pixels anyway: painting a region with the colormap's own value there is a
 * no-op, and the user who just drew a circle sees nothing change. These are the
 * distinct, saturated hues FLIM tools conventionally cycle through.
 */
export const CURSOR_PALETTE: readonly (readonly [number, number, number])[] = [
  [239, 68, 68], // red
  [34, 197, 94], // green
  [59, 130, 246], // blue
  [234, 179, 8], // amber
  [168, 85, 247], // violet
  [20, 184, 166], // teal
];

export const cursorPaletteColor = (index: number): readonly [number, number, number] =>
  CURSOR_PALETTE[index % CURSOR_PALETTE.length];

/** The universal semicircle: every single-exponential decay lies on it. */
export const UNIVERSAL_SEMICIRCLE = { centerG: 0.5, centerS: 0, radius: 0.5 };

/** The (g, s) of a single-exponential decay of lifetime τ (base units) at ω. */
export const singleExponentialPhasor = (
  tau: number,
  scale: PhasorScale,
): { g: number; s: number } => {
  const omega = scale.omega ?? 0;
  const wt = omega * tau;
  const denominator = 1 + wt * wt;
  return { g: 1 / denominator, s: wt / denominator };
};

export type PhasorCursorLike = {
  kind: string;
  visible?: boolean | null;
  g?: number | null;
  s?: number | null;
  radius?: number | null;
  points?: readonly (readonly number[])[] | null;
};

/**
 * Does this pixel's phasor fall inside the cursor's region of phasor space?
 * (A cursor is a color rule on the image, not a plot widget.) Polygons use the
 * even-odd crossing test — the shader mirrors it vertex by vertex.
 */
export const cursorHit = (
  g: number,
  s: number,
  cursor: PhasorCursorLike,
): boolean => {
  if (cursor.visible === false) return false;

  if (cursor.kind === "POLYGON" || cursor.kind === "polygon") {
    const points = cursor.points ?? [];
    if (points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [gi, si] = points[i];
      const [gj, sj] = points[j];
      const crosses = si > s !== sj > s;
      if (crosses && g < ((gj - gi) * (s - si)) / (sj - si) + gi) {
        inside = !inside;
      }
    }
    return inside;
  }

  const radius = cursor.radius ?? 0;
  if (radius <= 0) return false;
  const dg = g - (cursor.g ?? 0);
  const ds = s - (cursor.s ?? 0);
  return dg * dg + ds * ds <= radius * radius;
};
