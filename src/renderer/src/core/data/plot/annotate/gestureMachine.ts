/**
 * The one gesture machine behind every drawing tool of a plot.
 *
 * A tool is described, not coded: how it is gestured (one click, a drag, a
 * click per vertex), how many vertices it commits with, and whether it must
 * start over a row. The module supplies that table — elektro's events, epochs
 * and row shapes; a chart's points, lines and outlines — and gets back the
 * machine for it.
 *
 * Gestures:
 *  - **click**: press and release commits one vertex.
 *  - **drag**: press, drag, release commits two; a release where it was pressed
 *    draws nothing. `axisOnly` counts only travel ALONG the axis (a span has no
 *    height to drag).
 *  - **multi**: a click per vertex; `finish` (Enter), or a second click on the
 *    last vertex (a double-click), commits; `cancel` (Esc) abandons.
 *
 * Pure — the drawer feeds it pointer events already resolved to a position
 * along the axis, a world y and the row under the pointer; the machine never
 * reads a pixel beyond the click slop. Every gesture is tested in node.
 */

export type GestureKind = "click" | "drag" | "multi";

export type GestureToolSpec = {
  gesture: GestureKind;
  /** The fewest vertices it commits with. */
  minVertices: number;
  /** Drawn over ONE row, locked where the gesture starts; starts nowhere else. */
  needsRow?: boolean;
  /** A drag whose extent is along the axis only. */
  axisOnly?: boolean;
};

/** Under this many pixels a press-and-release is a click, not a drag. */
export const CLICK_SLOP_PX = 4;

/** The row a row-scoped shape is drawn over: a layer's drawn channel. */
export type RowRef = { layerId: string; channel: number };

/** A pointer position, resolved by the drawer. */
export type GesturePoint = {
  /** Position along the plot's axis, in world units. */
  time: number;
  /** World y (row units, 0 at top, negative down). */
  y: number;
  /** Surface pixels, for click slop and double-click detection. */
  px: number;
  py: number;
  /** The row under the pointer, if any. */
  row: RowRef | null;
};

export type Draft<T extends string> = {
  tool: T;
  points: GesturePoint[];
  /** Where the pointer is now — the rubber-band end of the preview. */
  cursor: GesturePoint | null;
  /** Locked at the first vertex, for a row tool. */
  row: RowRef | null;
  /** A click or drag tool between press and release. */
  dragging: boolean;
};

export type Commit<T extends string> = {
  tool: T;
  points: GesturePoint[];
  row: RowRef | null;
};

export type GestureEvent =
  | { type: "down"; point: GesturePoint }
  | { type: "move"; point: GesturePoint }
  | { type: "up"; point: GesturePoint }
  | { type: "finish" }
  | { type: "cancel" };

export type GestureResult<T extends string> = { draft: Draft<T> | null; commit: Commit<T> | null };

const near = (a: GesturePoint, b: GesturePoint) =>
  Math.abs(a.px - b.px) <= CLICK_SLOP_PX && Math.abs(a.py - b.py) <= CLICK_SLOP_PX;

export const createGestureMachine = <T extends string>(specs: Readonly<Record<T, GestureToolSpec>>) => {
  const finish = (draft: Draft<T>): GestureResult<T> =>
    draft.points.length >= specs[draft.tool].minVertices
      ? { draft: null, commit: { tool: draft.tool, points: draft.points, row: draft.row } }
      : { draft: null, commit: null };

  return (tool: T, draft: Draft<T> | null, event: GestureEvent): GestureResult<T> => {
    // A tool switch mid-gesture abandons the old draft.
    if (draft && draft.tool !== tool) draft = null;
    const spec = specs[tool];

    switch (event.type) {
      case "cancel":
        return { draft: null, commit: null };

      case "finish":
        return draft && specs[draft.tool].gesture === "multi" ? finish(draft) : { draft, commit: null };

      case "move":
        return draft ? { draft: { ...draft, cursor: event.point }, commit: null } : { draft, commit: null };

      case "down": {
        const p = event.point;
        if (!draft) {
          // A row tool starts only over a row: there is nowhere else to draw it.
          if (spec.needsRow && !p.row) return { draft: null, commit: null };
          return {
            draft: {
              tool,
              points: [p],
              cursor: p,
              row: spec.needsRow ? p.row : null,
              dragging: spec.gesture !== "multi",
            },
            commit: null,
          };
        }
        if (specs[draft.tool].gesture !== "multi") return { draft, commit: null };
        // A second press on the last vertex is the double-click that finishes.
        const last = draft.points[draft.points.length - 1];
        if (last && near(last, p)) return finish(draft);
        return { draft: { ...draft, points: [...draft.points, p], cursor: p }, commit: null };
      }

      case "up": {
        if (!draft || !draft.dragging) return { draft, commit: null };
        const start = draft.points[0];
        const drawn = specs[draft.tool];
        if (drawn.gesture === "click") {
          return { draft: null, commit: { tool: draft.tool, points: [start], row: draft.row } };
        }
        // A drag tool released where it was pressed drew nothing.
        const still = drawn.axisOnly
          ? Math.abs(start.px - event.point.px) <= CLICK_SLOP_PX
          : near(start, event.point);
        if (still) return { draft: null, commit: null };
        return {
          draft: null,
          commit: { tool: draft.tool, points: [start, event.point], row: draft.row },
        };
      }
    }
  };
};
