import { describe, expect, it } from "vitest";
import {
  ANNOTATE_TOOLS,
  gesture,
  toolForShortcut,
  type AnnotateTool,
  type Draft,
  type GestureEvent,
  type GesturePoint,
  type RowRef,
} from "./annotationTools";

const row: RowRef = { layerId: "trace", channel: 1 };
const pt = (px: number, py = 10, over: RowRef | null = row): GesturePoint => ({
  time: px * 10,
  y: -py / 100,
  px,
  py,
  row: over,
});

/** Run a sequence of events through the machine, collecting commits. */
const run = (tool: AnnotateTool, events: GestureEvent[]) => {
  let draft: Draft | null = null;
  const commits = [];
  for (const event of events) {
    const result = gesture(tool, draft, event);
    draft = result.draft;
    if (result.commit) commits.push(result.commit);
  }
  return { draft, commits };
};
const click = (p: GesturePoint): GestureEvent[] => [
  { type: "down", point: p },
  { type: "up", point: p },
];

describe("annotate tools", () => {
  it("has unique shortcuts, with SELECT first", () => {
    expect(ANNOTATE_TOOLS[0].tool).toBe("SELECT");
    const keys = ANNOTATE_TOOLS.map((t) => t.shortcut);
    expect(new Set(keys).size).toBe(keys.length);
    // Never the viewport's own keys: hold-A annotate, F fit.
    expect(keys).not.toContain("a");
    expect(keys).not.toContain("f");
    expect(toolForShortcut("L")).toBe("LINE");
    expect(toolForShortcut("x")).toBeNull();
  });
});

describe("gesture", () => {
  it("SELECT draws nothing", () => {
    expect(run("SELECT", click(pt(5))).commits).toEqual([]);
  });

  it("EVENT commits one instant on click", () => {
    const { commits, draft } = run("EVENT", click(pt(5)));
    expect(draft).toBeNull();
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({ tool: "EVENT", row: null });
    expect(commits[0].points.map((p) => p.time)).toEqual([50]);
  });

  it("EPOCH commits on a horizontal drag, not on a click or a vertical drag", () => {
    expect(run("EPOCH", click(pt(5))).commits).toEqual([]);
    expect(
      run("EPOCH", [{ type: "down", point: pt(5, 10) }, { type: "up", point: pt(5, 80) }]).commits,
    ).toEqual([]);
    const { commits } = run("EPOCH", [
      { type: "down", point: pt(5) },
      { type: "move", point: pt(20) },
      { type: "up", point: pt(40) },
    ]);
    expect(commits[0].points.map((p) => p.time)).toEqual([50, 400]);
    expect(commits[0].row).toBeNull();
  });

  it("LINE starts only over a row, locks it, and commits on drag", () => {
    expect(run("LINE", [{ type: "down", point: pt(5, 10, null) }]).draft).toBeNull();
    const { commits } = run("LINE", [
      { type: "down", point: pt(5, 10) },
      // Dragged out of the row: still that row's line.
      { type: "up", point: pt(30, 90, null) },
    ]);
    expect(commits[0]).toMatchObject({ tool: "LINE", row });
    expect(commits[0].points).toHaveLength(2);
  });

  it("LINE released in place draws nothing", () => {
    expect(run("LINE", click(pt(5))).commits).toEqual([]);
  });

  it("PATH accumulates clicks and finishes on Enter", () => {
    const { commits, draft } = run("PATH", [...click(pt(5)), ...click(pt(20)), ...click(pt(40))]);
    expect(commits).toEqual([]);
    expect(draft?.points).toHaveLength(3);
    const done = gesture("PATH", draft, { type: "finish" });
    expect(done.draft).toBeNull();
    expect(done.commit?.points.map((p) => p.px)).toEqual([5, 20, 40]);
    expect(done.commit?.row).toEqual(row);
  });

  it("a second click on the last vertex (double-click) finishes", () => {
    const { commits } = run("PATH", [...click(pt(5)), ...click(pt(30)), ...click(pt(31))]);
    expect(commits).toHaveLength(1);
    expect(commits[0].points).toHaveLength(2);
  });

  it("enforces minimum vertex counts", () => {
    const path = run("PATH", click(pt(5)));
    expect(gesture("PATH", path.draft, { type: "finish" })).toEqual({ draft: null, commit: null });
    const poly = run("POLYGON", [...click(pt(5)), ...click(pt(20))]);
    expect(gesture("POLYGON", poly.draft, { type: "finish" }).commit).toBeNull();
    const poly3 = run("POLYGON", [...click(pt(5)), ...click(pt(20)), ...click(pt(40, 50))]);
    expect(gesture("POLYGON", poly3.draft, { type: "finish" }).commit?.points).toHaveLength(3);
  });

  it("EVENTS is a time tool: no row needed, one vertex is enough", () => {
    const { draft } = run("EVENTS", click(pt(5, 10, null)));
    const done = gesture("EVENTS", draft, { type: "finish" });
    expect(done.commit).toMatchObject({ tool: "EVENTS", row: null });
  });

  it("cancel drops the draft", () => {
    const { draft } = run("POLYGON", [...click(pt(5)), ...click(pt(20))]);
    expect(gesture("POLYGON", draft, { type: "cancel" })).toEqual({ draft: null, commit: null });
  });

  it("switching tools abandons the draft", () => {
    const { draft } = run("PATH", click(pt(5)));
    const next = gesture("EVENT", draft, { type: "move", point: pt(10) });
    expect(next.draft).toBeNull();
  });

  it("move updates the rubber band only", () => {
    const { draft } = run("PATH", click(pt(5)));
    const moved = gesture("PATH", draft, { type: "move", point: pt(15) });
    expect(moved.draft?.cursor?.px).toBe(15);
    expect(moved.draft?.points).toHaveLength(1);
  });
});
