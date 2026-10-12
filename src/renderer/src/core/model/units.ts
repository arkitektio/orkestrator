/**
 * Values at the binding boundary: plain numbers are meters or radians, and a
 * quantity (`{magnitude, unit}` or `{value, unit}`) is converted to them.
 */

export type Dimension = 'length' | 'angle';

const LENGTH: Record<string, number> = {
  m: 1,
  meter: 1,
  metre: 1,
  dm: 1e-1,
  cm: 1e-2,
  mm: 1e-3,
  um: 1e-6,
  µm: 1e-6,
  μm: 1e-6,
  micrometer: 1e-6,
  micron: 1e-6,
  nm: 1e-9,
  km: 1e3,
  in: 0.0254,
  inch: 0.0254,
  ft: 0.3048,
};

const ANGLE: Record<string, number> = {
  rad: 1,
  radian: 1,
  mrad: 1e-3,
  deg: Math.PI / 180,
  degree: Math.PI / 180,
  '°': Math.PI / 180,
  turn: 2 * Math.PI,
  rev: 2 * Math.PI,
};

const TABLES: Record<Dimension, Record<string, number>> = {length: LENGTH, angle: ANGLE};

export type Converted = {ok: true; value: number} | {ok: false; reason: string};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const factorFor = (unit: string, dimension: Dimension): number | undefined => {
  const table = TABLES[dimension];
  return table[unit] ?? table[unit.toLowerCase()] ?? table[unit.toLowerCase().replace(/s$/, '')];
};

/** A bound value as a number in the base unit of `dimension` (m or rad). */
export const toBaseUnit = (raw: unknown, dimension: Dimension): Converted => {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? {ok: true, value: raw} : {ok: false, reason: 'the value is not finite'};
  }
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
    return {ok: true, value: Number(raw)};
  }
  if (isRecord(raw)) {
    const magnitude = raw.magnitude ?? raw.value;
    const unit = raw.unit ?? raw.units;
    if (typeof magnitude !== 'number' || !Number.isFinite(magnitude) || typeof unit !== 'string') {
      return {ok: false, reason: 'a quantity needs a numeric magnitude and a unit'};
    }
    const factor = factorFor(unit.trim(), dimension);
    if (factor === undefined) {
      return {
        ok: false,
        reason: `'${unit}' is not a unit of ${dimension}; expected ${dimension === 'length' ? 'meters' : 'radians'} or a convertible unit`,
      };
    }
    return {ok: true, value: magnitude * factor};
  }
  return {ok: false, reason: 'the value is neither a number nor a quantity'};
};

/** A visible wavelength in nanometers as an sRGB hex color (Bruton's approximation). */
export const wavelengthToColor = (nanometers: number): string => {
  const w = Math.min(Math.max(nanometers, 380), 780);
  let r = 0;
  let g = 0;
  let b = 0;
  if (w < 440) [r, g, b] = [-(w - 440) / 60, 0, 1];
  else if (w < 490) [r, g, b] = [0, (w - 440) / 50, 1];
  else if (w < 510) [r, g, b] = [0, 1, -(w - 510) / 20];
  else if (w < 580) [r, g, b] = [(w - 510) / 70, 1, 0];
  else if (w < 645) [r, g, b] = [1, -(w - 645) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const falloff = w < 420 ? 0.3 + (0.7 * (w - 380)) / 40 : w > 700 ? 0.3 + (0.7 * (780 - w)) / 80 : 1;
  const channel = (c: number) =>
    Math.round(255 * Math.pow(Math.max(c, 0) * falloff, 0.8))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
};

/** `"x y z"` (or a 3-array) as a vector; `undefined` when it is neither. */
export const parseVector = (raw: unknown): [number, number, number] | undefined => {
  const parts =
    typeof raw === 'string' ? raw.trim().split(/[\s,]+/).map(Number) : Array.isArray(raw) ? raw.map(Number) : [];
  return parts.length === 3 && parts.every(Number.isFinite) ? (parts as [number, number, number]) : undefined;
};

/** `x`, `y`, `z` or a vector, as a unit vector. */
export const parseAxis = (raw: unknown): [number, number, number] | undefined => {
  if (raw === 'x') return [1, 0, 0];
  if (raw === 'y') return [0, 1, 0];
  if (raw === 'z') return [0, 0, 1];
  const vector = parseVector(raw);
  if (!vector) return undefined;
  const length = Math.hypot(...vector);
  return length > 0 ? (vector.map(c => c / length) as [number, number, number]) : undefined;
};
