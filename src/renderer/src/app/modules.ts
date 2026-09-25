// The top-level path segments that App.tsx mounts a module under. Used to tell
// "unknown page inside a known module" apart from "unknown module".
export const MODULE_PATHS = [
  "mikro",
  "elektro",
  "rekuest",
  "fluss",
  "kabinet",
  "omeroark",
  "kraph",
  "lok",
  "settings",
  "blok",
  "alpaka",
  "lovekit",
  "dokuments",
] as const;

export type ModulePath = (typeof MODULE_PATHS)[number];

export const isModulePath = (segment?: string): segment is ModulePath =>
  !!segment && (MODULE_PATHS as readonly string[]).includes(segment);
