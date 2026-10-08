import { describe, expect, it } from "vitest";
import { MIN_BOX_PX, boxToWindow, dragIntentFor } from "./dragIntent";

describe("dragIntentFor", () => {
  it("boxes to zoom on a plain drag in explore", () => {
    expect(dragIntentFor("EXPLORE", { button: 0, shiftKey: false })).toBe("zoom-box");
  });

  it("keeps panning one modifier away", () => {
    expect(dragIntentFor("EXPLORE", { button: 0, shiftKey: true })).toBe("pan");
    expect(dragIntentFor("EXPLORE", { button: 1, shiftKey: false })).toBe("pan");
  });

  it("leaves the pointer to the drawer in annotate", () => {
    expect(dragIntentFor("ANNOTATE", { button: 0, shiftKey: false })).toBe("none");
  });

  it("ignores the right button", () => {
    expect(dragIntentFor("EXPLORE", { button: 2, shiftKey: false })).toBe("none");
  });
});

describe("boxToWindow", () => {
  it("zooms into the boxed stretch, whichever way it was dragged", () => {
    expect(boxToWindow({ from: 30, to: 10 }, 120)).toEqual({ start: 10, end: 30 });
  });

  it("treats a tiny drag as a click, not a zoom to a sliver", () => {
    expect(boxToWindow({ from: 10, to: 10.01 }, MIN_BOX_PX - 1)).toBeNull();
    expect(boxToWindow({ from: 10, to: 30 }, -(MIN_BOX_PX - 1))).toBeNull();
  });

  it("is null for a zero-width box", () => {
    expect(boxToWindow({ from: 10, to: 10 }, 50)).toBeNull();
  });
});
