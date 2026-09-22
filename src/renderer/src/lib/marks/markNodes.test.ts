import { describe, expect, it } from "vitest";
import { EXTRA_Z, LETTER_Z, MARK_SCALE, MARK_SCALE_SIMPLE, ORBIT, SPIKE_R, STUD_R } from "./constants";
import { colorFor, markNodes } from "./markNodes";
import { markParams, type MarkParams } from "./markParams";
import type { ElementKind } from "./spec";

/**
 * `markNodes` is what stops the live canvas and the offscreen renderer from
 * drifting — both map over the nodes it returns, so the layout is only ever
 * described once. That makes it the layer worth testing: it is the only one
 * that pins where things sit, and it does so without needing a GPU.
 */
const withElement = (element: ElementKind, over: Partial<MarkParams> = {}): MarkParams => ({
  ...markParams({ name: "stardist-node", identifier: "live.arkitekt.stardist" }),
  element,
  count: 5,
  elementScale: 0.3,
  ...over,
});

const radius = (position: [number, number, number]) =>
  Math.hypot(position[0], position[1]);

describe("markNodes", () => {
  it("always has a plate and a letter", () => {
    const { nodes } = markNodes(withElement("none"));
    expect(nodes.map((n) => n.key)).toEqual(["plate", "letter"]);
    expect(nodes[0].material).toBe("base");
    expect(nodes[1].material).toBe("ink");
  });

  it("puts the letter clear of the plate's front bevel", () => {
    const letter = markNodes(withElement("none")).nodes.find((n) => n.geom === "letter");
    expect(letter?.position[2]).toBe(LETTER_Z);
    expect(letter?.letter).toBe("S");
  });

  it("gives each element kind the right number of extras", () => {
    const counts: [ElementKind, number][] = [
      ["none", 0],
      ["orbs", 5],
      ["cubes", 5],
      ["studs", 5],
      ["spikes", 5],
      ["trail", 6], // n + 1: the trail includes its own head
      ["orbitRing", 1],
    ];
    for (const [element, expected] of counts) {
      const { nodes } = markNodes(withElement(element));
      const extras = nodes.filter((n) => n.geom !== "plate" && n.geom !== "letter");
      expect(extras, element).toHaveLength(expected);
      expect(extras.every((n) => n.material === "accent"), element).toBe(true);
    }
  });

  it("keeps every extra outside the outline, so none covers the letter", () => {
    const radii: [ElementKind, number][] = [
      ["orbs", ORBIT],
      ["cubes", ORBIT],
      ["trail", ORBIT],
      ["studs", STUD_R],
      ["spikes", SPIKE_R],
    ];
    for (const [element, r] of radii) {
      const extras = markNodes(withElement(element)).nodes.filter(
        (n) => n.geom !== "plate" && n.geom !== "letter",
      );
      for (const node of extras) {
        expect(radius(node.position), element).toBeCloseTo(r, 6);
        expect(node.position[2], element).toBe(EXTRA_Z);
        // A unit-sphere symbol means radius 1, so anything at 1.07+ clears it.
        expect(r).toBeGreaterThan(1);
      }
    }
  });

  it("drops the extras and grows the plate when simple", () => {
    const simple = markNodes(withElement("orbs"), { simple: true });
    expect(simple.nodes.map((n) => n.key)).toEqual(["plate", "letter"]);
    expect(simple.scale).toBe(MARK_SCALE_SIMPLE);
    expect(markNodes(withElement("orbs")).scale).toBe(MARK_SCALE);
  });

  it("multiplies the framing scale rather than replacing it", () => {
    expect(markNodes(withElement("none"), { scale: 2 }).scale).toBeCloseTo(MARK_SCALE * 2, 10);
  });

  it("gives every node a key unique within the mark", () => {
    for (const element of ["orbs", "cubes", "studs", "spikes", "trail", "orbitRing"] as const) {
      const keys = markNodes(withElement(element)).nodes.map((n) => n.key);
      expect(new Set(keys).size, element).toBe(keys.length);
    }
  });

  it("is deterministic", () => {
    const p = withElement("studs");
    expect(markNodes(p)).toEqual(markNodes(p));
  });
});

describe("colorFor", () => {
  it("maps each role to its channel", () => {
    const p = withElement("orbs", {
      baseColor: "#111111",
      accentColor: "#222222",
      ink: "#333333",
    });
    expect(colorFor(p, "base")).toBe("#111111");
    expect(colorFor(p, "accent")).toBe("#222222");
    expect(colorFor(p, "ink")).toBe("#333333");
  });
});
