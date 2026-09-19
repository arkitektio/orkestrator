import * as THREE from "three";
import type { RGBAColor } from "../../../api/scalars";
import { rgbaToCss } from "../../../lib/color";
import { IMPORTANCE_MUTED } from "../../../lib/heatmap";
import type { Morphology } from "./buildMorphology";

/**
 * What a section's colour means. `compartment` is the model's own tint (the
 * compartment matched on `category`), falling back to the depth hue for a
 * section whose compartment sets none — the original viewer's default.
 */
export type ColorBy = "compartment" | "depth" | "importance" | "uniform";

export const COLOR_BY_OPTIONS: { value: ColorBy; label: string; title: string }[] = [
  { value: "compartment", label: "compartment", title: "Tint each section by its compartment's colour" },
  { value: "depth", label: "depth", title: "Hue by distance from the root, in sections" },
  { value: "importance", label: "importance", title: "Heatmap of each section's dominance score" },
  { value: "uniform", label: "uniform", title: "One colour for the whole morphology" },
];

/** Hover and open-panel highlight. */
export const HIGHLIGHT_COLOR = "hotpink";

/** Golden-angle hue by tree depth — neighbouring depths never look alike. */
export const depthColor = (depth: number): string =>
  `hsl(${(depth * 137.508) % 360}, 70%, 60%)`;

/** Compartment id → CSS colour, for the compartments that set one. */
export const compartmentColors = (
  cells: readonly { biophysics: { compartments: readonly { id: string; color?: RGBAColor | null }[] } }[],
): Map<string, string> => {
  const colors = new Map<string, string>();
  for (const cell of cells) {
    for (const compartment of cell.biophysics.compartments) {
      const css = rgbaToCss(compartment.color);
      if (css) colors.set(compartment.id, css);
    }
  }
  return colors;
};

export type ColouringInput = {
  colorBy: ColorBy;
  compartments: ReadonlyMap<string, string>;
  /** sectionId → heatmap colour; sections without an entry are muted. */
  importance: ReadonlyMap<string, string> | null;
  uniform: string;
};

/** The CSS colour one section shows under `input`, before any highlight. */
export const sectionColor = (
  section: Morphology["sections"][number],
  input: ColouringInput,
): string => {
  switch (input.colorBy) {
    case "uniform":
      return input.uniform;
    case "depth":
      return depthColor(section.depth);
    case "importance":
      return input.importance?.get(section.id) ?? IMPORTANCE_MUTED;
    case "compartment":
    default:
      return input.compartments.get(section.category ?? "") ?? depthColor(section.depth);
  }
};

/**
 * One rgb triple per section ordinal, in three's working (linear) colour
 * space — what `InstancedMesh.setColorAt` takes. The GPU writer fans these
 * out to the section's segments and joints.
 */
export const sectionColors = (morphology: Morphology, input: ColouringInput): Float32Array => {
  const out = new Float32Array(morphology.sections.length * 3);
  const color = new THREE.Color();
  const cache = new Map<string, [number, number, number]>();
  for (const section of morphology.sections) {
    const css = sectionColor(section, input);
    let rgb = cache.get(css);
    if (!rgb) {
      color.setStyle(css);
      rgb = [color.r, color.g, color.b];
      cache.set(css, rgb);
    }
    out.set(rgb, section.ordinal * 3);
  }
  return out;
};
