/**
 * How many of one unit make another, for the units a mount's axes are in:
 * length, time, wavenumber (1/length) and photon energy. Pure.
 *
 * Deliberately small: a mount converts between the units mikro and lovekit
 * write, not every unit pint knows. An unknown unit converts to nothing, and the
 * mount says so instead of guessing.
 */

type Dimension = "length" | "time" | "wavenumber" | "energy";

type Known = { dimension: Dimension; si: number };

const LENGTH: Record<string, number> = {
  m: 1,
  meter: 1,
  metre: 1,
  km: 1e3,
  cm: 1e-2,
  centimeter: 1e-2,
  mm: 1e-3,
  millimeter: 1e-3,
  µm: 1e-6,
  μm: 1e-6,
  um: 1e-6,
  micron: 1e-6,
  micrometer: 1e-6,
  micrometre: 1e-6,
  nm: 1e-9,
  nanometer: 1e-9,
  nanometre: 1e-9,
  pm: 1e-12,
  picometer: 1e-12,
  å: 1e-10,
  angstrom: 1e-10,
};

const TIME: Record<string, number> = {
  s: 1,
  sec: 1,
  second: 1,
  ms: 1e-3,
  millisecond: 1e-3,
  µs: 1e-6,
  μs: 1e-6,
  us: 1e-6,
  microsecond: 1e-6,
  ns: 1e-9,
  nanosecond: 1e-9,
  ps: 1e-12,
  picosecond: 1e-12,
  min: 60,
  minute: 60,
  h: 3600,
  hour: 3600,
};

const ENERGY: Record<string, number> = {
  j: 1,
  joule: 1,
  ev: 1.602176634e-19,
  electronvolt: 1.602176634e-19,
  mev: 1.602176634e-22,
  kev: 1.602176634e-16,
};

const singular = (word: string): string => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word);

/** `1/cm`, `cm^-1`, `cm**-1`, `1 / centimeter` → the length inverted, or null. */
const inverseLength = (text: string): string | null => {
  const over = /^1\s*\/\s*(.+)$/.exec(text);
  if (over) return over[1];
  const power = /^(.+?)\s*(?:\^|\*\*)\s*-1$/.exec(text);
  return power ? power[1] : null;
};

/** A unit as its dimension and its size in SI, or null when it is none of ours. */
export const parseUnit = (unit: string | null | undefined): Known | null => {
  if (!unit) return null;
  const text = unit.trim();
  const inverted = inverseLength(text);
  if (inverted) {
    const length = LENGTH[singular(inverted.trim())] ?? LENGTH[singular(inverted.trim().toLowerCase())];
    return length ? { dimension: "wavenumber", si: 1 / length } : null;
  }
  const word = singular(text);
  if (LENGTH[word] !== undefined) return { dimension: "length", si: LENGTH[word] };
  const lower = singular(text.toLowerCase());
  if (LENGTH[lower] !== undefined) return { dimension: "length", si: LENGTH[lower] };
  if (TIME[word] !== undefined) return { dimension: "time", si: TIME[word] };
  if (TIME[lower] !== undefined) return { dimension: "time", si: TIME[lower] };
  // "MeV" and "meV" differ only in case, so energy is read case-sensitively first.
  if (text === "meV") return { dimension: "energy", si: ENERGY.mev };
  if (text === "MeV") return { dimension: "energy", si: 1.602176634e-13 };
  if (ENERGY[lower] !== undefined) return { dimension: "energy", si: ENERGY[lower] };
  return null;
};

/**
 * One `from` in `to`s: `unitFactor("µm", "m")` is 1e-6. Null across dimensions
 * (nm against 1/cm is not a scale) or for a unit this does not know.
 */
export const unitFactor = (from: string | null | undefined, to: string | null | undefined): number | null => {
  if (from && to && from.trim() === to.trim()) return 1;
  const a = parseUnit(from);
  const b = parseUnit(to);
  if (!a || !b || a.dimension !== b.dimension) return null;
  return a.si / b.si;
};
