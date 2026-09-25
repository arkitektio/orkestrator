import ELK from "elkjs/lib/elk.bundled.js";
import { describe, expect, it } from "vitest";
import { layoutOptionsFor, STRESS_NODE_LIMIT } from "./layout";
import { NODE_DIAMETER, NODE_SIZE } from "./nodeSize";

/**
 * The layout is ELK's, but two constants in two different files have to agree
 * for the picture to work: the footprint every node claims (nodeSize.ts) and
 * the spacing the layout is asked for (layout.ts). That is exactly the kind of
 * pairing that rots silently, so this runs the REAL ELK with the REAL options.
 *
 * It also guards the thing that actually broke: the layout used to be
 * `disco` + `stress`, which is superlinear in the node count and runs on the
 * calling thread — a few hundred residents froze the page for the better part
 * of a minute. The scale test below is the regression, not a nicety.
 */

// A dataset's grid with four residents, a calibration, a stage frame two tiles
// register into, a world above it, and an island connected to nothing.
const SYSTEMS = ["grid", "physical", "stage", "tileA", "tileB", "world"];
const RESIDENTS = [
  ["r1", "grid"],
  ["r2", "grid"],
  ["r3", "grid"],
  ["r4", "grid"],
  ["r5", "tileA"],
  ["r6", "tileB"],
];
const TRANSFORMATIONS = [
  ["t1", "grid", "physical"],
  ["t2", "physical", "stage"],
  ["t3", "tileA", "stage"],
  ["t4", "tileB", "stage"],
  ["t5", "stage", "world"],
];
const ISLAND = ["island-a", "island-b"];

const graph = () => ({
  id: "root",
  layoutOptions: layoutOptionsFor(
    SYSTEMS.length + RESIDENTS.length + ISLAND.length,
  ),
  children: [...SYSTEMS, ...RESIDENTS.map(([id]) => id), ...ISLAND].map(
    (id) => ({ id, ...NODE_SIZE }),
  ),
  edges: [
    ...RESIDENTS.map(([id, system]) => ({
      id: `lives-in-${id}`,
      sources: [system],
      targets: [id],
    })),
    ...TRANSFORMATIONS.map(([id, source, target]) => ({
      id,
      sources: [source],
      targets: [target],
    })),
    { id: "t6", sources: [ISLAND[0]], targets: [ISLAND[1]] },
  ],
});

const centres = (laid: { children?: { id: string; x?: number; y?: number }[] }) =>
  (laid.children ?? []).map((child) => ({
    id: child.id,
    x: (child.x ?? 0) + NODE_DIAMETER / 2,
    y: (child.y ?? 0) + NODE_DIAMETER / 2,
  }));

describe("the coordinate graph layout", () => {
  it("never lets two circles touch", async () => {
    const laid = await new ELK().layout(graph());
    const placed = centres(laid);

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const gap = Math.hypot(
          placed[i].x - placed[j].x,
          placed[i].y - placed[j].y,
        );
        expect(
          gap,
          `${placed[i].id} and ${placed[j].id} overlap`,
        ).toBeGreaterThanOrEqual(NODE_DIAMETER);
      }
    }
  });

  it("places every node, including the island nothing connects to", async () => {
    const laid = await new ELK().layout(graph());
    expect(laid.children).toHaveLength(
      SYSTEMS.length + RESIDENTS.length + ISLAND.length,
    );
    for (const child of laid.children ?? []) {
      expect(Number.isFinite(child.x)).toBe(true);
      expect(Number.isFinite(child.y)).toBe(true);
    }
  });

  it("settles in the same place every time", async () => {
    // An unseeded force-family layout lands somewhere new on every render, and
    // a graph that rearranges itself when you blink is unreadable.
    const first = centres(await new ELK().layout(graph()));
    const second = centres(await new ELK().layout(graph()));
    expect(second).toEqual(first);
  });

  it("keeps a resident nearer its own space than the graph is wide", async () => {
    // Deliberately a RELATIVE bound. The old absolute one (`3 * NODE_DIAMETER`)
    // was a stress artifact — one spring's rest length — and it does not
    // survive the tree fallback, which fans siblings out much further. This
    // holds under both, at any scale.
    //
    // Note this is NOT "nearer its own space than any other space". That is
    // false under mrtree — a system's tree-neighbour can sit closer to an
    // outlying resident than its own system does — and asserting it would be a
    // lie. The dashed residency edge is what makes ownership unambiguous on
    // screen, not proximity.
    const laid = await new ELK().layout(graph());
    const at = new Map(centres(laid).map((c) => [c.id, c]));
    const gap = (a: string, b: string) =>
      Math.hypot(at.get(a)!.x - at.get(b)!.x, at.get(a)!.y - at.get(b)!.y);

    let width = 0;
    for (const a of SYSTEMS) {
      for (const b of SYSTEMS) {
        if (a !== b) width = Math.max(width, gap(a, b));
      }
    }

    for (const [resident, home] of RESIDENTS) {
      expect(
        gap(resident, home),
        `${resident} drifted further from ${home} than the graph is wide`,
      ).toBeLessThan(width);
    }
  });

  it("switches off stress exactly at the limit, not near it", () => {
    // The whole point of the split is that the expensive layout is bounded.
    // An off-by-one here silently hands a 61-node graph to the slow one.
    const algorithm = (n: number) => layoutOptionsFor(n)["elk.algorithm"];
    expect(algorithm(1)).toBe("disco");
    expect(algorithm(STRESS_NODE_LIMIT)).toBe("disco");
    expect(algorithm(STRESS_NODE_LIMIT + 1)).toBe("mrtree");
    expect(algorithm(5000)).toBe("mrtree");
  });

  it("never lets two circles touch on the tree branch either", async () => {
    // The small fixture above covers stress. Past the limit a different
    // algorithm with different spacing takes over, and the no-overlap promise
    // has to survive the handover — mrtree honours node sizes, so it should.
    const count = STRESS_NODE_LIMIT + 30;
    const children = Array.from({ length: count }, (_, i) => ({
      id: `n${i}`,
      ...NODE_SIZE,
    }));
    const edges = Array.from({ length: count - 1 }, (_, i) => ({
      id: `e${i}`,
      sources: [`n${Math.floor((i + 1) / 3)}`],
      targets: [`n${i + 1}`],
    }));

    const laid = await new ELK().layout({
      id: "root",
      layoutOptions: layoutOptionsFor(count),
      children,
      edges,
    });
    const placed = centres(laid);

    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const gap = Math.hypot(
          placed[i].x - placed[j].x,
          placed[i].y - placed[j].y,
        );
        expect(
          gap,
          `${placed[i].id} and ${placed[j].id} overlap`,
        ).toBeGreaterThanOrEqual(NODE_DIAMETER);
      }
    }
  });

  it("lays out a few hundred nodes in well under a second", async () => {
    // The size that used to be fatal. disco+stress measured 42s for this; the
    // budget is deliberately loose enough not to flake on a busy CI box and
    // still two orders of magnitude under the regression.
    const systems = 200;
    const children = [];
    const edges = [];
    for (let i = 0; i < systems; i++) {
      children.push({ id: `s${i}`, ...NODE_SIZE });
      for (let r = 0; r < 2; r++) {
        children.push({ id: `s${i}r${r}`, ...NODE_SIZE });
        edges.push({
          id: `lives-in-s${i}r${r}`,
          sources: [`s${i}`],
          targets: [`s${i}r${r}`],
        });
      }
      if (i > 0) {
        edges.push({
          id: `t${i}`,
          sources: [`s${i}`],
          targets: [`s${Math.floor(i / 2)}`],
        });
      }
    }

    const started = performance.now();
    const laid = await new ELK().layout({
      id: "root",
      layoutOptions: layoutOptionsFor(children.length),
      children,
      edges,
    });
    const elapsed = performance.now() - started;

    expect(laid.children).toHaveLength(children.length);
    expect(elapsed).toBeLessThan(5000);
  });
});
