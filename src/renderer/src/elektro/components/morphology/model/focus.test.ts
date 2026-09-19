import { describe, expect, it } from "vitest";
import { buildMorphology } from "./buildMorphology";
import { dimOutsideFocus, focusFrame, hiddenOutsideFocus, wholeFrame } from "./focus";

const coord = (x: number, y: number, z: number) => ({ x: `${x} µm`, y: `${y} µm`, z: `${z} µm` });

const morph = buildMorphology([
  {
    id: "cell",
    topology: {
      sections: [
        { id: "soma", diam: "2 µm", coords: [coord(0, 0, 0), coord(0, 10, 0)] },
        {
          id: "far",
          diam: "2 µm",
          coords: [coord(100, 0, 0), coord(120, 0, 0)],
          parent: { parent: "soma" },
        },
      ],
    },
  },
]);

describe("focusFrame", () => {
  it("frames only the focused sections", () => {
    const frame = focusFrame(morph, new Set(["far"]))!;
    expect(frame.center.x).toBeCloseTo(110);
    expect(frame.center.y).toBeCloseTo(0);
    // Half the 20 µm run plus the 1 µm radius, as a sphere around the box.
    expect(frame.radius).toBeGreaterThan(10);
    expect(frame.radius).toBeLessThan(wholeFrame(morph).radius);
  });

  it("is null for a focus the morphology doesn't have", () => {
    expect(focusFrame(morph, new Set(["nowhere"]))).toBeNull();
  });
});

describe("focus context", () => {
  it("dims everything outside the focus, leaving the focus as is", () => {
    const colors = new Float32Array([1, 1, 1, 1, 1, 1]);
    const dimmed = dimOutsideFocus(colors, morph, new Set(["soma"]));
    const soma = morph.byId.get("soma")!.ordinal * 3;
    const far = morph.byId.get("far")!.ordinal * 3;
    expect(dimmed[soma]).toBe(1);
    expect(dimmed[far]).toBeLessThan(0.3);
    // The input is not written to.
    expect(colors[far]).toBe(1);
  });

  it("hides exactly the sections outside the focus", () => {
    expect([...hiddenOutsideFocus(morph, new Set(["soma"]))]).toEqual(["far"]);
  });
});
