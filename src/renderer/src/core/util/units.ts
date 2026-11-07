/**
 * A unit as a person reads it: compact symbols, superscript powers.
 *
 * Units arrive as the strings the backends store — any spelling pint accepts,
 * kept as it was given: `"mV"`, `"S/cm2"`, `"second"`, and pint's own long form
 * `"micrometer ** 2"` or `"meter / second ** 2"`. Shown raw they read like code.
 * `formatUnit` turns them into `µm²`, `m/s²`, `S/cm²`, `°C`.
 *
 * DISPLAY ONLY: never write the result back (a form edits the stored string),
 * and never compare units by it. A word it does not know passes through as it
 * is, so nothing is ever lost — only prettier where it is sure.
 */

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

const superscript = (exponent: string) => [...exponent].map((c) => SUPERSCRIPT[c] ?? c).join("");

/** Long unit names (pint's) → symbols. */
const UNIT_NAMES: Record<string, string> = {
  meter: "m",
  metre: "m",
  second: "s",
  gram: "g",
  ampere: "A",
  kelvin: "K",
  mole: "mol",
  candela: "cd",
  liter: "L",
  litre: "L",
  hertz: "Hz",
  newton: "N",
  pascal: "Pa",
  joule: "J",
  watt: "W",
  coulomb: "C",
  volt: "V",
  ohm: "Ω",
  siemens: "S",
  farad: "F",
  henry: "H",
  tesla: "T",
  weber: "Wb",
  becquerel: "Bq",
  gray: "Gy",
  lumen: "lm",
  lux: "lx",
  molar: "M",
  dalton: "Da",
  electron_volt: "eV",
  minute: "min",
  hour: "h",
  day: "d",
  radian: "rad",
  steradian: "sr",
  degree: "°",
  degree_Celsius: "°C",
  degC: "°C",
  celsius: "°C",
  degree_Fahrenheit: "°F",
  percent: "%",
  angstrom: "Å",
  micron: "µm",
  pixel: "px",
  byte: "B",
  bit: "bit",
};

/** Long prefixes → symbols. */
const PREFIX_NAMES: Record<string, string> = {
  yotta: "Y",
  zetta: "Z",
  exa: "E",
  peta: "P",
  tera: "T",
  giga: "G",
  mega: "M",
  kilo: "k",
  hecto: "h",
  deca: "da",
  deka: "da",
  deci: "d",
  centi: "c",
  milli: "m",
  micro: "µ",
  nano: "n",
  pico: "p",
  femto: "f",
  atto: "a",
  zepto: "z",
  yocto: "y",
};

/** Symbols a prefix may stand before (`cm`, `mV`, `kHz`, `µM`). */
const PREFIXABLE = new Set(
  Object.values(UNIT_NAMES).filter((s) => !["°", "°C", "°F", "%", "Å", "µm", "px", "min", "h", "d"].includes(s)),
);
const PREFIX_SYMBOLS = [...new Set(Object.values(PREFIX_NAMES))];

/** No unit at all: shown as nothing. */
const NONE = new Set(["", "1", "dimensionless", "none", "unitless"]);

/** A word already written as a symbol, possibly prefixed (`mV`, `cm`, `kHz`), with `u` read as `µ`. */
const asSymbol = (word: string): string | null => {
  if (PREFIXABLE.has(word) || Object.values(UNIT_NAMES).includes(word)) return word;
  for (const prefix of PREFIX_SYMBOLS) {
    if (word.length > prefix.length && word.startsWith(prefix) && PREFIXABLE.has(word.slice(prefix.length))) {
      return word;
    }
  }
  // ASCII `u` for micro: `um`, `uM`, `us`.
  if (word.length > 1 && word[0] === "u" && PREFIXABLE.has(word.slice(1))) return `µ${word.slice(1)}`;
  return null;
};

/** A long name (`micrometers`, `millivolt`, `degree_Celsius`) as its symbol, or null. */
const fromName = (word: string): string | null => {
  const tries = word.length > 3 && word.endsWith("s") && !(word in UNIT_NAMES) ? [word, word.slice(0, -1)] : [word];
  for (const name of tries) {
    if (name in UNIT_NAMES) return UNIT_NAMES[name];
    const lower = name.toLowerCase();
    if (lower in UNIT_NAMES) return UNIT_NAMES[lower];
    for (const [prefix, symbol] of Object.entries(PREFIX_NAMES)) {
      const rest = lower.startsWith(prefix) ? lower.slice(prefix.length) : null;
      if (rest && rest in UNIT_NAMES && PREFIXABLE.has(UNIT_NAMES[rest])) return symbol + UNIT_NAMES[rest];
    }
  }
  return null;
};

/** One word of a unit expression, as its symbol (with a compact power: `cm2`), or as it was. */
const formatWord = (word: string): string => {
  const named = fromName(word) ?? asSymbol(word);
  if (named) return named;
  // Compact exponent spelling: `cm2`, `um3`, `s-1` — only on a word that IS a unit.
  const compact = /^(.*?[^\d-])(-?\d+)$/.exec(word);
  if (compact) {
    const base = fromName(compact[1]) ?? asSymbol(compact[1]);
    if (base) return compact[2] === "1" ? base : base + superscript(compact[2]);
  }
  return word;
};

/**
 * A unit string as it should be read, or null for no unit (none, `dimensionless`).
 *
 * - names become symbols: `micrometer` → `µm`, `millivolt` → `mV`, `degree_Celsius` → `°C`
 * - powers become superscripts: `** 2`, `^2` and compact `cm2` → `²`; `** -1` → `⁻¹`
 * - products become `·`, quotients `/`: `meter / second ** 2` → `m/s²`
 */
export const formatUnit = (unit: string | null | undefined): string | null => {
  if (unit == null) return null;
  const raw = String(unit).trim();
  if (NONE.has(raw.toLowerCase())) return null;
  return (
    raw
      // pint's `**` and a caret are the same power.
      .replace(/\s*\*\*\s*/g, "^")
      .replace(/\s*\^\s*/g, "^")
      // Every word (letters, µ, Ω, Å, °, underscores, a trailing compact power).
      .replace(/[A-Za-zµμΩÅ°_]+(?:-?\d+)?/g, (word) => formatWord(word.replace("μ", "µ")))
      // Integer powers as superscripts; a power of one says nothing.
      .replace(/\^\(?(-?\d+)\)?/g, (_, exponent: string) => (exponent === "1" ? "" : superscript(exponent)))
      .replace(/\s*\*\s*/g, "·")
      .replace(/\s*\/\s*/g, "/")
      .replace(/\s+/g, " ")
  );
};

/**
 * A label with its unit, the one way every surface writes it: `area (µm²)`.
 * Without a unit, the label alone; without a label, the unit alone.
 */
export const withUnit = (label: string | null | undefined, unit: string | null | undefined): string => {
  const shown = formatUnit(unit);
  if (!label) return shown ?? "";
  return shown ? `${label} (${shown})` : label;
};
