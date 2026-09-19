import { DetailNeuronModelFragment } from "../../api/graphql";
import { rgbaToCss } from "../../lib/color";
import { SectionEdge, SectionNode } from "./types";

// Fixed node footprint fed to ELK; kept in sync with the SectionNode card.
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 64;

// Color used for sections whose `category` matches no compartment.
export const UNASSIGNED_COLOR = "rgba(136, 136, 136, 1)";

/** Stable, evenly-spread hue for a compartment index (golden-angle spacing —
 * the same scheme the 3D morphology viewer uses for depth tinting). */
const getFallbackColor = (index: number) =>
  `hsl(${(index * 137.508) % 360}, 70%, 55%)`;

/**
 * Assign every compartment (across all cells) a distinct CSS color, keyed by
 * compartment `id`. A compartment's own authored `color` wins; otherwise it gets
 * a generated golden-angle hue so each compartment stays visually distinct even
 * when no color is set. Encounter order is stable, so colors are deterministic.
 */
export const buildCompartmentColors = (
  model: DetailNeuronModelFragment,
): Map<string, string> => {
  const colors = new Map<string, string>();
  let index = 0;
  model.config.cells.forEach((cell) =>
    cell.biophysics.compartments.forEach((c) => {
      if (colors.has(c.id)) return;
      colors.set(c.id, rgbaToCss(c.color) ?? getFallbackColor(index));
      index++;
    }),
  );
  return colors;
};

export type CompartmentLegendEntry = {
  /** Compartment id — the same value a section stores in `category`. */
  id: string;
  color: string;
  /** How many sections belong to this compartment. */
  count: number;
};

/**
 * Legend rows for the compartments actually referenced by at least one section,
 * each with its resolved color and section count, sorted by id.
 */
export const buildCompartmentLegend = (
  model: DetailNeuronModelFragment,
): CompartmentLegendEntry[] => {
  const colors = buildCompartmentColors(model);
  const counts = new Map<string, number>();
  model.config.cells.forEach((cell) =>
    cell.topology.sections.forEach((section) => {
      const category = section.category ?? undefined;
      if (category && colors.has(category)) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }),
  );

  return Array.from(colors.entries())
    .map(([id, color]) => ({ id, color, count: counts.get(id) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
};

/**
 * Map every section (across all cells) to a React Flow node, tinted by its
 * compartment's color (matched on `section.category` → compartment `id`, the
 * same pairing the 3D morphology viewer uses). Sections with no matching
 * compartment fall back to a neutral grey.
 */
export const sectionsToNodes = (
  model: DetailNeuronModelFragment,
): SectionNode[] => {
  const compartmentColor = buildCompartmentColors(model);

  const nodes = new Map<string, SectionNode>();
  model.config.cells.forEach((cell) =>
    cell.topology.sections.forEach((section) => {
      if (nodes.has(section.id)) return;
      nodes.set(section.id, {
        id: section.id,
        type: "section",
        position: { x: 0, y: 0 },
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: {
          ...section,
          color:
            compartmentColor.get(section.category ?? "") ?? UNASSIGNED_COLOR,
        },
      });
    }),
  );

  return Array.from(nodes.values());
};

/**
 * Build the tree edges from each section's `parent` connection
 * (`parent.parent` is the parent section's id). Dangling parents — a parent id
 * with no matching section node — are skipped so React Flow never references a
 * missing node.
 */
export const sectionsToEdges = (
  model: DetailNeuronModelFragment,
): SectionEdge[] => {
  const sectionIds = new Set<string>();
  model.config.cells.forEach((cell) =>
    cell.topology.sections.forEach((section) => sectionIds.add(section.id)),
  );

  const edges = new Map<string, SectionEdge>();
  model.config.cells.forEach((cell) =>
    cell.topology.sections.forEach((section) => {
      const parent = section.parent;
      if (!parent || !sectionIds.has(parent.parent)) return;
      const id = `${parent.parent}->${section.id}`;
      if (edges.has(id)) return;
      edges.set(id, {
        id,
        type: "parent",
        source: parent.parent,
        target: section.id,
        data: { location: parent.parentLocation },
      });
    }),
  );

  return Array.from(edges.values());
};
