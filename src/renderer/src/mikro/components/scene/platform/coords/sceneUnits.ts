/**
 * Display symbols for the scene's spatial unit.
 *
 * `sceneStore.spatialUnit` is a raw server string (the unit of the world
 * coordinate system's first SPACE axis), so anything unrecognised passes through
 * verbatim rather than being swallowed. Shared so the scale bar and the drawing
 * readout can never disagree about what "µm" means.
 */
export const UNIT_LABELS: Record<string, string> = {
  MICROMETERS: "µm",
  NANOMETERS: "nm",
  ANGSTROMS: "Å",
  PIXELS: "px",
  UNKNOWN: "units",
};

export const unitLabel = (spatialUnit: string): string =>
  UNIT_LABELS[spatialUnit] ?? spatialUnit;

/** Unit spellings that mean "no physical measurement, just indices". */
const NON_PHYSICAL_UNITS = new Set([
  "",
  "px",
  "pixel",
  "pixels",
  "PIXELS",
  "dimensionless",
  "UNKNOWN",
]);

/**
 * Whether the scene's spatial unit names a real physical length. A pixel-grid
 * world (no unit on its axes → the store's "px" fallback) measures nothing, so
 * length furniture like the scale bar must not pretend otherwise.
 */
export const isPhysicalUnit = (spatialUnit: string): boolean =>
  !NON_PHYSICAL_UNITS.has(spatialUnit);
