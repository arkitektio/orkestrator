import {
  createGestureMachine,
  type Commit as MachineCommit,
  type Draft as MachineDraft,
  type GestureEvent,
  type GestureResult as MachineResult,
  type GestureToolSpec,
} from "@/core/data/plot/annotate/gestureMachine";

/**
 * The chart's drawing tools, one per annotation kind a drawing surface holds.
 * Each draws a shape with a position along the axis AND a height:
 *
 *  - POINT: click.                 LINE / RECTANGLE: drag (a click draws nothing).
 *  - POINTS / PATH / POLYGON: click per vertex; Enter, or a second click on the
 *    last vertex (a double-click), finishes; Esc cancels.
 *
 * The gesture machine is the plot engine's, built here from this table.
 */

export type ChartTool = "POINT" | "POINTS" | "LINE" | "PATH" | "POLYGON" | "RECTANGLE";

export type ChartToolSpec = {
  tool: ChartTool;
  label: string;
  /** Lower-case key that arms it (ANNOTATE mode only). */
  shortcut: string;
  /** The annotation kind it draws. */
  kind: "POINT" | "MULTI_POINT" | "LINE" | "PATH" | "POLYGON" | "RECTANGLE";
  hint: string;
};

export const CHART_TOOLS: readonly ChartToolSpec[] = [
  { tool: "POINT", label: "Point", shortcut: "e", kind: "POINT", hint: "Click to mark a point" },
  { tool: "POINTS", label: "Points", shortcut: "s", kind: "MULTI_POINT", hint: "Click each point — Enter or double-click to finish" },
  { tool: "LINE", label: "Line", shortcut: "l", kind: "LINE", hint: "Drag a line — baseline to peak" },
  { tool: "PATH", label: "Path", shortcut: "h", kind: "PATH", hint: "Click points — Enter or double-click to finish" },
  { tool: "POLYGON", label: "Polygon", shortcut: "g", kind: "POLYGON", hint: "Click corners — Enter or double-click to close" },
  { tool: "RECTANGLE", label: "Box", shortcut: "r", kind: "RECTANGLE", hint: "Drag a box" },
];

export const chartToolSpec = (tool: ChartTool): ChartToolSpec =>
  CHART_TOOLS.find((t) => t.tool === tool) ?? CHART_TOOLS[0];

export const chartToolForShortcut = (key: string): ChartTool | null =>
  CHART_TOOLS.find((t) => t.shortcut === key.toLowerCase())?.tool ?? null;

const GESTURES: Record<ChartTool, GestureToolSpec> = {
  POINT: { gesture: "click", minVertices: 1 },
  POINTS: { gesture: "multi", minVertices: 1 },
  LINE: { gesture: "drag", minVertices: 2 },
  PATH: { gesture: "multi", minVertices: 2 },
  POLYGON: { gesture: "multi", minVertices: 3 },
  RECTANGLE: { gesture: "drag", minVertices: 2 },
};

export type ChartDraft = MachineDraft<ChartTool>;
export type ChartCommit = MachineCommit<ChartTool>;
export type ChartGestureResult = MachineResult<ChartTool>;
export type { GestureEvent };

export const chartGesture = createGestureMachine(GESTURES);
