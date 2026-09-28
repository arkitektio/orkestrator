import { parseQuantity } from "@/core/util/quantities";

/**
 * The ONE place a time quantity is converted into a clock's own units.
 *
 * Every placement the renderer synthesizes — a run's recordings on its clock, a
 * segment's signals on its clock — starts from wire strings ("10 kHz", "0.5 s")
 * and must end in the units of the clock's TIME axis, which is a pint `Unit`
 * spelled however the server wrote it: "ms", "millisecond", "second", "s". A
 * mismatch between those is a silent 1000× error — a trace drawn at the right
 * shape and the wrong length — so this is strict: an unrecognised unit returns
 * null and the caller refuses to place the view, rather than guessing.
 *
 * Pure — runs in node.
 */

/** Milliseconds per unit, keyed by every spelling we accept. */
const TIME_UNITS_MS: Record<string, number> = {
  ns: 1e-6, nanosecond: 1e-6, nanoseconds: 1e-6,
  "µs": 1e-3, "μs": 1e-3, us: 1e-3, microsecond: 1e-3, microseconds: 1e-3,
  ms: 1, millisecond: 1, milliseconds: 1,
  s: 1e3, sec: 1e3, second: 1e3, seconds: 1e3,
  min: 6e4, minute: 6e4, minutes: 6e4,
  h: 3.6e6, hour: 3.6e6, hours: 3.6e6,
};

/** Hertz per unit. */
const FREQUENCY_UNITS_HZ: Record<string, number> = {
  Hz: 1, hertz: 1, hz: 1,
  kHz: 1e3, kilohertz: 1e3, khz: 1e3,
  MHz: 1e6, megahertz: 1e6, mhz: 1e6,
  mHz: 1e-3, millihertz: 1e-3,
};

/** Milliseconds in one of `unit`, or null when the unit is not a time unit we know. */
export const timeUnitToMs = (unit: string | null | undefined): number | null => {
  if (unit == null) return null;
  const key = unit.trim();
  return TIME_UNITS_MS[key] ?? TIME_UNITS_MS[key.toLowerCase()] ?? null;
};

/** A duration string ("0.5 s", "100 ms") in milliseconds, or null. */
export const durationToMs = (value: string | number | null | undefined): number | null => {
  const { magnitude, unit } = parseQuantity(value);
  if (magnitude == null) return null;
  // A bare number carries no unit to trust; refuse it rather than assume one.
  const per = timeUnitToMs(unit || null);
  return per == null ? null : magnitude * per;
};

/** A frequency string ("10 kHz") in hertz, or null. */
export const frequencyToHz = (value: string | number | null | undefined): number | null => {
  const { magnitude, unit } = parseQuantity(value);
  if (magnitude == null || !unit) return null;
  const per = FREQUENCY_UNITS_HZ[unit.trim()] ?? null;
  return per == null ? null : magnitude * per;
};
