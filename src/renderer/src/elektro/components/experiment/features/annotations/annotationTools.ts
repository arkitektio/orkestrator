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
 * The machine itself is the plot engine's (`@/core/data/plot/annotate/gestureMachine`),
 * built here from this table — pure, so every gesture is tested in node.
 */

import {
  createGestureMachine,
  type Commit as MachineCommit,
  type Draft as MachineDraft,
  type GestureEvent,
  type GestureResult as MachineResult,
  type GestureToolSpec,
} from "@/core/data/plot/annotate/gestureMachine";

export {
  CLICK_SLOP_PX,
  type GestureEvent,
  type GesturePoint,
  type RowRef,
} from "@/core/data/plot/annotate/gestureMachine";

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

/** How each tool is gestured: its scope is what locks a row. */
const GESTURES: Record<DrawTool, GestureToolSpec> = {
  EVENT: { gesture: "click", minVertices: MIN_VERTICES.EVENT },
  EVENTS: { gesture: "multi", minVertices: MIN_VERTICES.EVENTS },
  // An epoch spans time only, so only horizontal travel counts for it.
  EPOCH: { gesture: "drag", minVertices: MIN_VERTICES.EPOCH, axisOnly: true },
  LINE: { gesture: "drag", minVertices: MIN_VERTICES.LINE, needsRow: true },
  PATH: { gesture: "multi", minVertices: MIN_VERTICES.PATH, needsRow: true },
  POLYGON: { gesture: "multi", minVertices: MIN_VERTICES.POLYGON, needsRow: true },
};

export type Draft = MachineDraft<DrawTool>;
export type Commit = MachineCommit<DrawTool>;
export type GestureResult = MachineResult<DrawTool>;

const machine = createGestureMachine(GESTURES);

export const gesture = (
  tool: AnnotateTool,
  draft: Draft | null,
  event: GestureEvent,
): GestureResult => (tool === "SELECT" ? { draft: null, commit: null } : machine(tool, draft, event));
