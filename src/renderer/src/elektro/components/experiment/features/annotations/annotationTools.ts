/**
 * The annotate tools, and the one gesture machine that drives all of them.
 *
 * Mirrors mikro's `RoiToolbar` / `roiDrawingStore`: SELECT first (the
 * non-destructive tool), then one tool per annotation kind. Two scopes:
 *
 *  - **time** — EVENT, EVENTS, EPOCH. Instants and spans across every row, drawn
 *    into the experiment's own world-registered collection.
 *  - **row** — LINE, PATH, POLYGON. Shapes over ONE trace row, in its
 *    (time, value) space — a baseline-to-peak line, an outline round a burst.
 *    The row is locked where the gesture starts, so a vertex dragged past the
 *    row's edge still reads against that row's scale.
 *
 * Gestures:
 *  - EVENT: click.            EPOCH / LINE: drag (a click draws nothing).
 *  - EVENTS / PATH / POLYGON: click per vertex; Enter, or a second click on the
 *    last vertex (a double-click), finishes; Esc cancels. PATH needs 2 vertices,
 *    POLYGON 3, EVENTS 1.
 *
 * The machine is pure — the drawer feeds it pointer events already resolved to
 * world time, world y and the row under the pointer — so every gesture is
 * tested in node.
 */

export type AnnotateTool = "SELECT" | "EVENT" | "EVENTS" | "EPOCH" | "LINE" | "PATH" | "POLYGON";
export type DrawTool = Exclude<AnnotateTool, "SELECT">;
export type ToolScope = "time" | "row";

export type ToolSpec = {
  tool: AnnotateTool;
  label: string;
  /** Lower-case key that arms it (ANNOTATE mode only). */
  shortcut: string;
  scope: ToolScope | null;
  hint: string;
};

export const ANNOTATE_TOOLS: readonly ToolSpec[] = [
  { tool: "SELECT", label: "Select", shortcut: "v", scope: null, hint: "Click a mark to select it — shift-click adds" },
  { tool: "EVENT", label: "Event", shortcut: "e", scope: "time", hint: "Click to mark an instant" },
  { tool: "EVENTS", label: "Events", shortcut: "s", scope: "time", hint: "Click each instant — Enter or double-click to finish" },
  { tool: "EPOCH", label: "Epoch", shortcut: "p", scope: "time", hint: "Drag to span an epoch" },
  { tool: "LINE", label: "Line", shortcut: "l", scope: "row", hint: "Drag within a trace row — baseline to peak" },
  { tool: "PATH", label: "Path", shortcut: "h", scope: "row", hint: "Click points over a trace row — Enter or double-click to finish" },
  { tool: "POLYGON", label: "Polygon", shortcut: "g", scope: "row", hint: "Click corners over a trace row — Enter or double-click to close" },
];

export const toolSpec = (tool: AnnotateTool): ToolSpec =>
  ANNOTATE_TOOLS.find((t) => t.tool === tool) ?? ANNOTATE_TOOLS[0];

export const toolForShortcut = (key: string): AnnotateTool | null =>
  ANNOTATE_TOOLS.find((t) => t.shortcut === key.toLowerCase())?.tool ?? null;

/** The minimum vertex count a click-per-vertex tool commits with. */
export const MIN_VERTICES: Record<DrawTool, number> = {
  EVENT: 1,
  EVENTS: 1,
  EPOCH: 2,
  LINE: 2,
  PATH: 2,
  POLYGON: 3,
};

const CLICK_TOOLS: ReadonlySet<DrawTool> = new Set(["EVENTS", "PATH", "POLYGON"]);
const DRAG_TOOLS: ReadonlySet<DrawTool> = new Set(["EPOCH", "LINE"]);

/** Under this many pixels a press-and-release is a click, not a drag. */
export const CLICK_SLOP_PX = 4;

/** The row a row-scoped shape is drawn over: a trace layer's drawn channel. */
export type RowRef = { layerId: string; channel: number };

/** A pointer position, resolved by the drawer. */
export type GesturePoint = {
  /** World time. */
  time: number;
  /** World y (row units, 0 at top, negative down). */
  y: number;
  /** Surface pixels, for click slop and double-click detection. */
  px: number;
  py: number;
  /** The trace row under the pointer, if any. */
  row: RowRef | null;
};

export type Draft = {
  tool: DrawTool;
  points: GesturePoint[];
  /** Where the pointer is now — the rubber-band end of the preview. */
  cursor: GesturePoint | null;
  /** Locked at the first vertex, for a row tool. */
  row: RowRef | null;
  /** A drag tool between press and release. */
  dragging: boolean;
};

export type Commit = {
  tool: DrawTool;
  points: GesturePoint[];
  row: RowRef | null;
};

export type GestureEvent =
  | { type: "down"; point: GesturePoint }
  | { type: "move"; point: GesturePoint }
  | { type: "up"; point: GesturePoint }
  | { type: "finish" }
  | { type: "cancel" };

export type GestureResult = { draft: Draft | null; commit: Commit | null };

const isRowTool = (tool: DrawTool) => toolSpec(tool).scope === "row";

const near = (a: GesturePoint, b: GesturePoint) =>
  Math.abs(a.px - b.px) <= CLICK_SLOP_PX && Math.abs(a.py - b.py) <= CLICK_SLOP_PX;

const finish = (draft: Draft): GestureResult =>
  draft.points.length >= MIN_VERTICES[draft.tool]
    ? { draft: null, commit: { tool: draft.tool, points: draft.points, row: draft.row } }
    : { draft: null, commit: null };

export const gesture = (
  tool: AnnotateTool,
  draft: Draft | null,
  event: GestureEvent,
): GestureResult => {
  if (tool === "SELECT") return { draft: null, commit: null };
  // A tool switch mid-gesture abandons the old draft.
  if (draft && draft.tool !== tool) draft = null;

  switch (event.type) {
    case "cancel":
      return { draft: null, commit: null };

    case "finish":
      return draft && CLICK_TOOLS.has(draft.tool) ? finish(draft) : { draft, commit: null };

    case "move":
      return draft ? { draft: { ...draft, cursor: event.point }, commit: null } : { draft, commit: null };

    case "down": {
      const p = event.point;
      if (!draft) {
        // A row tool starts only over a row: there is nowhere else to draw it.
        if (isRowTool(tool) && !p.row) return { draft: null, commit: null };
        return {
          draft: {
            tool,
            points: [p],
            cursor: p,
            row: isRowTool(tool) ? p.row : null,
            dragging: DRAG_TOOLS.has(tool) || tool === "EVENT",
          },
          commit: null,
        };
      }
      if (!CLICK_TOOLS.has(draft.tool)) return { draft, commit: null };
      // A second press on the last vertex is the double-click that finishes.
      const last = draft.points[draft.points.length - 1];
      if (last && near(last, p)) return finish(draft);
      return { draft: { ...draft, points: [...draft.points, p], cursor: p }, commit: null };
    }

    case "up": {
      if (!draft || !draft.dragging) return { draft, commit: null };
      const start = draft.points[0];
      if (draft.tool === "EVENT") {
        return { draft: null, commit: { tool: "EVENT", points: [start], row: null } };
      }
      // A drag tool released where it was pressed drew nothing. An epoch spans
      // time only, so only horizontal travel counts for it.
      const still =
        draft.tool === "EPOCH"
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
