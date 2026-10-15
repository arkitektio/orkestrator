import { describe, expect, it } from "vitest";
import { LineageEdgeKind, LineageNodeKind, TransformKind } from "@/mikro/api/graphql";
import { layoutLineage, DATA_NODE_SIZE, dataNodeHeight, LENS_ROW_HEIGHT, LENS_ROWS_PADDING, lensRowCentre, SCHEMATIC_HEIGHT, TASK_NODE_SIZE } from "./layout";
import {
  LineageAnswer,
  LineageEdgeData,
  LineageNodeData,
  kindFromSegment,
  mergeLineage,
  taskNodeId,
  toFlow,
} from "./lineageGraph";

const node = (key: string, depth: number, more: Partial<LineageNodeData> = {}): LineageNodeData => {
  const [kind, id] = key.split(":");
  return {
    key,
    kind: kind === "file" ? LineageNodeKind.File : LineageNodeKind.Dataset,
    id,
    name: key,
    depth,
    hasMoreUp: false,
    hasMoreDown: false,
    lensCount: 0,
    lenses: [],
    axes: [],
    levels: 0,
    ...more,
  };
};

const edge = (source: string, target: string, taskId: string | null, more: Partial<LineageEdgeData> = {}): LineageEdgeData => ({
  key: `T:${source}>${target}`,
  kind: LineageEdgeKind.Derivation,
  source,
  target,
  taskId,
  transformationKind: TransformKind.Identity,
  primary: true,
  sourceLens: null,
  ...more,
});

const answer = (root: string, nodes: LineageNodeData[], edges: LineageEdgeData[], truncated = false): LineageAnswer => ({
  root,
  nodes,
  edges,
  truncated,
});

describe("mergeLineage", () => {
  it("shifts a later answer's depths by where it was rooted", () => {
    const first = mergeLineage(null, answer("dataset:1", [node("dataset:1", 0), node("dataset:2", 1, { hasMoreDown: true })], [edge("dataset:1", "dataset:2", null)]));
    const second = mergeLineage(
      first,
      answer("dataset:2", [node("dataset:2", 0), node("dataset:3", 1)], [edge("dataset:2", "dataset:3", null)]),
      { key: "dataset:2", direction: "down" },
    );
    expect(second.root).toBe("dataset:1");
    expect(second.nodes["dataset:3"].depth).toBe(2);
    expect(second.nodes["dataset:2"].hasMoreDown).toBe(false);
    expect(Object.keys(second.edges)).toHaveLength(2);
  });

  it("only ever clears 'more', except on the node an expansion was rooted at", () => {
    const first = mergeLineage(null, answer("dataset:1", [node("dataset:1", 0, { hasMoreUp: true }), node("dataset:2", 1, { hasMoreUp: false })], []));
    // A later answer, seeing dataset:2 without one of its parents, may claim it has more up.
    const second = mergeLineage(first, answer("dataset:3", [node("dataset:3", 0), node("dataset:2", -1, { hasMoreUp: true })], []), {
      key: "dataset:3",
      direction: "up",
    });
    expect(second.nodes["dataset:2"].hasMoreUp).toBe(false);

    // The expanded node's own flag is the answer's: capped stays capped.
    const third = mergeLineage(second, answer("dataset:1", [node("dataset:1", 0, { hasMoreUp: true })], []), { key: "dataset:1", direction: "up" });
    expect(third.nodes["dataset:1"].hasMoreUp).toBe(true);
  });

  it("is idempotent", () => {
    const one = answer("dataset:1", [node("dataset:1", 0), node("dataset:2", 1)], [edge("dataset:1", "dataset:2", "t1")]);
    const once = mergeLineage(null, one);
    expect(mergeLineage(once, one)).toEqual(once);
  });
});

describe("toFlow", () => {
  it("draws one task node between what it read and what it wrote", () => {
    // A fusion: one task read two datasets and wrote two.
    const state = mergeLineage(
      null,
      answer(
        "dataset:1",
        ["dataset:1", "dataset:2", "dataset:3", "dataset:4"].map((key, index) => node(key, index < 2 ? 0 : 1)),
        [
          edge("dataset:1", "dataset:3", "fuse"),
          edge("dataset:2", "dataset:3", "fuse"),
          edge("dataset:1", "dataset:4", "fuse"),
          edge("dataset:2", "dataset:4", "fuse"),
        ],
      ),
    );
    const { nodes, edges } = toFlow(state);
    expect(nodes.filter((n) => n.type === "task")).toEqual([{ type: "task", id: taskNodeId("fuse"), taskId: "fuse", inputs: 2, outputs: 2 }]);
    expect(edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual(
      ["dataset:1->task:fuse", "dataset:2->task:fuse", "task:fuse->dataset:3", "task:fuse->dataset:4"].sort(),
    );
  });

  it("leaves every edge from the lens it was computed from", () => {
    // One task read two lenses of one dataset (a crop and a channel) and wrote one thing.
    const state = mergeLineage(
      null,
      answer(
        "dataset:1",
        [node("dataset:1", 0), node("dataset:2", 1), node("file:9", 1)],
        [
          edge("dataset:1", "dataset:2", "t", { key: "T:a", sourceLens: "11" }),
          edge("dataset:1", "dataset:2", "t", { key: "T:b", sourceLens: "12" }),
          edge("dataset:1", "file:9", null, { key: "F:1", kind: LineageEdgeKind.Export, sourceLens: "10", transformationKind: null }),
        ],
      ),
    );
    const { edges } = toFlow(state);
    expect(
      edges
        .filter((e) => e.source === "dataset:1")
        .map((e) => [e.target, e.sourceHandle])
        .sort(),
    ).toEqual([
      ["file:9", "lens:10"],
      ["task:t", "lens:11"],
      ["task:t", "lens:12"],
    ]);
  });

  it("never loops a task through its own output", () => {
    // One task wrote a chain: A -> X -> Y, X and Y both its outputs.
    const state = mergeLineage(
      null,
      answer("dataset:1", [node("dataset:1", 0), node("dataset:2", 1), node("dataset:3", 2)], [edge("dataset:1", "dataset:2", "t"), edge("dataset:2", "dataset:3", "t")]),
    );
    const { nodes, edges } = toFlow(state);
    const pairs = edges.map((e) => `${e.source}->${e.target}`);
    expect(pairs).not.toContain("dataset:2->task:t");
    expect(pairs.sort()).toEqual(["dataset:1->task:t", "dataset:2->dataset:3", "task:t->dataset:2", "task:t->dataset:3"].sort());
    expect(nodes.find((n) => n.type === "task")).toMatchObject({ inputs: 1, outputs: 2 });
  });

  it("keeps a step with no task as a labelled direct edge", () => {
    const state = mergeLineage(
      null,
      answer("file:9", [node("file:9", 0), node("dataset:1", 1)], [edge("file:9", "dataset:1", null, { kind: LineageEdgeKind.Ingest, key: "F:1", transformationKind: null })]),
    );
    expect(toFlow(state).edges).toEqual([
      { id: "F:1", source: "file:9", sourceHandle: "out", target: "dataset:1", label: "ingest", kind: LineageEdgeKind.Ingest, unmappable: false },
    ]);
  });
});

describe("routes", () => {
  it("reads a kind back from its segment", () => {
    expect(kindFromSegment("arraydataset")).toBe(LineageNodeKind.Dataset);
    expect(kindFromSegment("nope")).toBeUndefined();
  });
});

describe("layoutLineage", () => {
  it("lays out the walk's limit without overlaps, fast enough for the main thread", async () => {
    // A realistic shape at the 300-node limit: ingests fanning into chains of tasks.
    const nodes: { id: string; type: "data" | "task" }[] = [];
    const edges: { id: string; source: string; target: string }[] = [];
    for (let file = 0; file < 10; file++) {
      nodes.push({ id: `f${file}`, type: "data" });
      let previous = `f${file}`;
      for (let step = 0; step < 14; step++) {
        const task = `t${file}-${step}`;
        const data = `d${file}-${step}`;
        nodes.push({ id: task, type: "task" }, { id: data, type: "data" });
        edges.push({ id: `${previous}>${task}`, source: previous, target: task }, { id: `${task}>${data}`, source: task, target: data });
        if (step % 4 === 3) {
          // A branch off the chain.
          const side = `s${file}-${step}`;
          nodes.push({ id: side, type: "data" });
          edges.push({ id: `${task}>${side}`, source: task, target: side });
        }
        previous = data;
      }
    }

    await layoutLineage(nodes, edges); // warm the engine
    const started = performance.now();
    const positions = await layoutLineage(nodes, edges);
    const elapsed = performance.now() - started;
    console.info(`[lineage layout] ${nodes.length} nodes, ${edges.length} edges: ${elapsed.toFixed(1)}ms`);

    const boxes = nodes.map((n) => ({ ...positions.get(n.id)!, ...(n.type === "task" ? TASK_NODE_SIZE : DATA_NODE_SIZE) }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlaps).toBe(false);
      }
    }
    expect(elapsed).toBeLessThan(500);
  });
});

describe("lens ports", () => {
  it("lays edges out of the row they leave from, without overlapping the taller tiles", async () => {
    // A dataset with four lenses; two children, one from the first lens and one from the last.
    const height = dataNodeHeight(4, false);
    const nodes = [
      { id: "root", type: "data" as const, height, ports: [0, 1, 2, 3].map((index) => ({ handle: `lens:${index}`, y: lensRowCentre(index) })) },
      { id: "fromFirst", type: "data" as const },
      { id: "fromLast", type: "data" as const },
    ];
    const edges = [
      { id: "a", source: "root", sourceHandle: "lens:3", target: "fromLast" },
      { id: "b", source: "root", sourceHandle: "lens:0", target: "fromFirst" },
    ];
    const positions = await layoutLineage(nodes, edges);
    // The child of the top row sits above the child of the bottom row: ELK read the ports.
    expect(positions.get("fromFirst")!.y).toBeLessThan(positions.get("fromLast")!.y);
    const root = positions.get("root")!;
    const first = positions.get("fromFirst")!;
    expect(first.x).toBeGreaterThanOrEqual(root.x + DATA_NODE_SIZE.width);
  });

  it("moves an array dataset's lens rows below its schematic, and the tile grows by it", () => {
    expect(dataNodeHeight(2, false, SCHEMATIC_HEIGHT) - dataNodeHeight(2, false)).toBe(SCHEMATIC_HEIGHT);
    expect(lensRowCentre(1, SCHEMATIC_HEIGHT) - lensRowCentre(1)).toBe(SCHEMATIC_HEIGHT);
    // The last row's centre is half a row and the padding above the tile's bottom.
    expect(dataNodeHeight(2, false, SCHEMATIC_HEIGHT) - lensRowCentre(1, SCHEMATIC_HEIGHT)).toBe(LENS_ROW_HEIGHT / 2 + LENS_ROWS_PADDING);
  });
});
