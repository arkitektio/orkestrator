import { indexAt, type AxisInstants } from "@/core/data/scene/coords/axisTime";

/**
 * One layer's index selections: the scene-wide index selections, with every dim
 * that reaches the world replaced by the frame this layer shows at the selected
 * world coordinate.
 *
 * The ONE reader of `worldSelections`. Every consumer that fixes a layer's
 * collapsed dims (the brick pool, the slice signature, the vector read) asks this
 * instead of reading `dimSelections[dim]` directly, because a world-timed dim has
 * no scene-wide index: the 20 Hz movie and the event-triggered one show different
 * frames at the same instant.
 *
 * Before a layer's first frame it shows its FIRST frame rather than nothing: the
 * renderers have no "no data along t" state to draw, and a layer blinking out
 * while scrubbing reads as broken. The slider's range starts at the earliest
 * first frame, so this only happens for a layer that starts later than another.
 *
 * Without a world selection the dim is left alone, so the layer shows its lens
 * default exactly as before anything was scrubbed.
 */
export function selectionsFor(
  state: {
    dimSelections: Record<string, number>;
    // Optional so a state built before world time existed (a test fixture, a
    // snapshot) reads as "nothing world-timed" rather than throwing.
    worldSelections?: Record<string, number>;
    layerAxisInstants?: Record<string, readonly AxisInstants[]>;
  },
  layerId: string,
): Record<string, number> {
  const instants = state.layerAxisInstants?.[layerId];
  if (!instants || instants.length === 0) return state.dimSelections;

  const selections = { ...state.dimSelections };
  for (const entry of instants) {
    // A world-timed dim never follows the index slider of the same name.
    delete selections[entry.dim];
    const value = state.worldSelections?.[entry.worldAxis];
    if (value === undefined) continue;
    selections[entry.dim] = indexAt(entry, value) ?? entry.indices[0];
  }
  return selections;
}

/** The dims of a layer that are scrubbed in world units rather than by index. */
export function worldTimedDims(
  layerAxisInstants: Record<string, readonly AxisInstants[]>,
  layerId: string,
): Set<string> {
  return new Set((layerAxisInstants[layerId] ?? []).map((entry) => entry.dim));
}
