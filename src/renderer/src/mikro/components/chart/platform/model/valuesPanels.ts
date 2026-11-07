import { withUnit } from "@/core/util/units";
import type { ChartLayerState } from "./chartLayerModel";
import type { ChartLayoutValue } from "./chartStructure";

/**
 * How a chart of VALUES is cut into panels, and what each panel's axes say.
 *
 * A VALUES chart lays its layers out as an AXIS chart lays out rows: STACKED is
 * one panel per layer; SHARED is one panel per group of layers whose axes mean
 * the same thing (`valuesGroupOf`: the same units on both axes). OVERLAY, which
 * only an axis can do, is read as SHARED.
 *
 * Pure, and in display order: a panel sits where its first layer does.
 */

export type PanelAxisTitles = {
  x: string | null;
  y: string | null;
  /** The x axis is the groups of a box plot: its labels come from the plane. */
  categorical: boolean;
};

export type ValuesPanel = {
  /** Stable while the panel's membership means the same thing: its React key. */
  key: string;
  /** Its layers, in draw order, with the kind that says which renderer draws each. */
  layers: { id: string; kind: ChartLayerState["kind"] }[];
  axes: PanelAxisTitles;
};

/** Every column on the axis, then its unit as a person reads it: `area, area_corrected (µm²)`. */
const titled = (names: readonly string[], unit: string | null) => withUnit(names.join(", "), unit);

/** Each distinct column, once, in the order the layers name them. */
const distinct = (names: readonly (string | null | undefined)[]) => [
  ...new Set(names.filter((n): n is string => !!n)),
];

/** What a panel's axes say, read off every layer in it (they agree on units by construction). */
export const panelAxesOf = (layers: readonly ChartLayerState[]): PanelAxisTitles => {
  const first = layers[0]?.values;
  if (!first) return { x: null, y: null, categorical: false };
  if (first.kind === "points") {
    const points = layers.flatMap((l) => (l.values?.kind === "points" ? [l.values] : []));
    return {
      x: titled(distinct(points.map((v) => v.x)), first.units.x),
      y: titled(distinct(points.map((v) => v.y)), first.units.y),
      categorical: false,
    };
  }
  const dists = layers.flatMap((l) => (l.values?.kind === "distribution" ? [l.values] : []));
  const value = titled(distinct(dists.map((v) => v.value)), first.unit);
  if (layers[0].mark === "BOX") return { x: first.group, y: value, categorical: true };
  return { x: value, y: first.group ? "fraction of the group's rows" : "rows", categorical: false };
};

export const valuesPanels = (
  layers: readonly ChartLayerState[],
  layout: ChartLayoutValue,
): ValuesPanel[] => {
  const groups = new Map<string, ChartLayerState[]>();
  for (const layer of layers) {
    // STACKED, or a layer with no group (not drawn): a panel of its own.
    const key = layout !== "STACKED" && layer.valuesGroup ? layer.valuesGroup : `layer:${layer.id}`;
    const members = groups.get(key);
    if (members) members.push(layer);
    else groups.set(key, [layer]);
  }
  return [...groups.entries()].map(([key, members]) => ({
    key,
    layers: members.map((l) => ({ id: l.id, kind: l.kind })),
    axes: panelAxesOf(members),
  }));
};
