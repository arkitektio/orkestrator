// Pint-like quantity helpers, shared across modules (elektro, mikro, …).
//
// Several GraphQL backends carry physical quantities as strings with an explicit
// unit — `Duration` ("100 ms"), `Length` ("1 µm"), `ElectricPotential`
// ("-70 mV"), `ElectricalConductance` ("5 nS") and `Frequency` ("50 Hz"). In the
// generated TS these map to named string aliases (see each module's
// `api/scalars.ts`), so nothing stops the rest of the app from doing arithmetic
// on what is actually a string. This module is the single place that parses,
// formats and unit-converts those strings.

export type Dimension =
  | "time"
  | "length"
  | "voltage"
  | "conductance"
  | "frequency"
  | "power"
  | "concentration"
  | "resistivity"
  | "capacitance"
  | "temperature";

export interface UnitDef {
  /** The symbol stored on the wire and shown in the selector, e.g. "ms". */
  symbol: string;
  /** Multiplier that converts a magnitude in this unit into the base unit. */
  toBase: number;
}

export interface DimensionDef {
  /** Unit every magnitude is normalised to for geometry / comparison math. */
  base: string;
  units: UnitDef[];
}

// Curated, fixed unit sets per dimension. The base unit (toBase === 1) is the
// one used for internal math and as the default when an incoming value carries
// no unit. Ordered roughly small → large for a sensible dropdown.
export const DIMENSIONS: Record<Dimension, DimensionDef> = {
  length: {
    base: "µm",
    units: [
      { symbol: "pm", toBase: 1e-6 },
      { symbol: "nm", toBase: 1e-3 },
      { symbol: "µm", toBase: 1 },
      { symbol: "mm", toBase: 1e3 },
      { symbol: "cm", toBase: 1e4 },
      { symbol: "m", toBase: 1e6 },
    ],
  },
  time: {
    base: "ms",
    units: [
      { symbol: "ns", toBase: 1e-6 },
      { symbol: "µs", toBase: 1e-3 },
      { symbol: "ms", toBase: 1 },
      { symbol: "s", toBase: 1e3 },
      { symbol: "min", toBase: 6e4 },
    ],
  },
  voltage: {
    base: "mV",
    units: [
      { symbol: "µV", toBase: 1e-3 },
      { symbol: "mV", toBase: 1 },
      { symbol: "V", toBase: 1e3 },
    ],
  },
  conductance: {
    base: "nS",
    units: [
      { symbol: "pS", toBase: 1e-3 },
      { symbol: "nS", toBase: 1 },
      { symbol: "µS", toBase: 1e3 },
      { symbol: "mS", toBase: 1e6 },
      { symbol: "S", toBase: 1e9 },
    ],
  },
  frequency: {
    base: "Hz",
    units: [
      { symbol: "Hz", toBase: 1 },
      { symbol: "kHz", toBase: 1e3 },
      { symbol: "MHz", toBase: 1e6 },
    ],
  },
  // Optical / laser power (mikro Power scalar, e.g. LaserElement.power "5 mW").
  power: {
    base: "mW",
    units: [
      { symbol: "nW", toBase: 1e-6 },
      { symbol: "µW", toBase: 1e-3 },
      { symbol: "mW", toBase: 1 },
      { symbol: "W", toBase: 1e3 },
    ],
  },
  // NEURON ion concentrations (nai/nao/…).
  concentration: {
    base: "mM",
    units: [
      { symbol: "nM", toBase: 1e-6 },
      { symbol: "µM", toBase: 1e-3 },
      { symbol: "mM", toBase: 1 },
      { symbol: "M", toBase: 1e3 },
    ],
  },
  // NEURON Ra (axial resistivity). 1 Ω·m = 100 Ω·cm.
  resistivity: {
    base: "Ω·cm",
    units: [
      { symbol: "Ω·cm", toBase: 1 },
      { symbol: "Ω·m", toBase: 100 },
      { symbol: "kΩ·cm", toBase: 1e3 },
    ],
  },
  // NEURON cm (specific membrane capacitance). 1 F/m² = 100 µF/cm².
  capacitance: {
    base: "µF/cm²",
    units: [
      { symbol: "µF/cm²", toBase: 1 },
      { symbol: "F/m²", toBase: 100 },
    ],
  },
  // Bath temperature. Kelvin-only: °C↔K is affine (K = °C + 273.15), which the
  // multiplicative `toBase` model cannot express, so we never offer °C on the wire
  // (the backend emits/defaults to Kelvin, e.g. "309.15 K").
  temperature: {
    base: "K",
    units: [
      { symbol: "K", toBase: 1 },
    ],
  },
};

/** Maps a GraphQL scalar name to the dimension it represents. */
export const SCALAR_DIMENSION = {
  Duration: "time",
  Length: "length",
  ElectricPotential: "voltage",
  ElectricalConductance: "conductance",
  Frequency: "frequency",
  Power: "power",
  Concentration: "concentration",
  Resistivity: "resistivity",
  SpecificCapacitance: "capacitance",
  Temperature: "temperature",
} as const satisfies Record<string, Dimension>;

export type QuantityScalar = keyof typeof SCALAR_DIMENSION;

// Leading signed number (decimal / exponent) followed by an optional unit, e.g.
// "-70 mV", "1.5e-3 s", "100ms" (space optional).
const QUANTITY_RE = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*?)\s*$/;

export interface ParsedQuantity {
  /** Magnitude as written, or null when the value is empty / unparseable. */
  magnitude: number | null;
  /** Unit symbol as written; falls back to the dimension's base unit. */
  unit: string;
}

/**
 * Split a wire string like "100 ms" into its magnitude (100) and unit ("ms").
 * Tolerates null / empty input and values with no unit. When `dimension` is
 * given, a missing unit defaults to that dimension's base unit.
 */
export const parseQuantity = (
  value: string | number | null | undefined,
  dimension?: Dimension,
): ParsedQuantity => {
  const fallbackUnit = dimension ? DIMENSIONS[dimension].base : "";

  if (value == null || value === "") {
    return { magnitude: null, unit: fallbackUnit };
  }
  if (typeof value === "number") {
    return { magnitude: Number.isFinite(value) ? value : null, unit: fallbackUnit };
  }

  const match = QUANTITY_RE.exec(value);
  if (!match) return { magnitude: null, unit: fallbackUnit };

  const magnitude = parseFloat(match[1]);
  const unit = match[2] || fallbackUnit;
  return { magnitude: Number.isFinite(magnitude) ? magnitude : null, unit };
};

/** Join a magnitude and unit back into the wire string, e.g. "100 ms". */
export const formatQuantity = (magnitude: number, unit: string): string =>
  `${magnitude} ${unit}`.trim();

/**
 * Parse a quantity and convert its magnitude into the dimension's base unit, so
 * geometry / comparison math is unit-agnostic. Returns `fallback` when the value
 * is empty, unparseable, or carries a unit unknown to the dimension.
 */
export const toBase = (
  value: string | number | null | undefined,
  dimension: Dimension,
  fallback: number = NaN,
): number => {
  const { magnitude, unit } = parseQuantity(value, dimension);
  if (magnitude == null) return fallback;

  const def = DIMENSIONS[dimension];
  const found = def.units.find((u) => u.symbol === unit);
  if (!found) return fallback;
  return magnitude * found.toBase;
};

/**
 * Human-readable rendering for read-only surfaces. Returns the raw string when
 * it can't be parsed so we never hide an unexpected server value.
 */
export const formatDisplay = (
  value: string | number | null | undefined,
  dimension?: Dimension,
): string => {
  if (value == null || value === "") return "—";
  const { magnitude, unit } = parseQuantity(value, dimension);
  if (magnitude == null) return String(value);
  return formatQuantity(magnitude, unit);
};
