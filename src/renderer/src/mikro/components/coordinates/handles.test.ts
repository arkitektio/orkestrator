import { describe, expect, it } from "vitest";
import { facingHandles } from "./handles";

/**
 * A force layout has no direction, so an edge that always left the right side
 * would double back across its own node half the time. These pin the pairing.
 */

describe("facingHandles", () => {
  it("runs right-to-left when the target is to the right", () => {
    expect(facingHandles(400, 20)).toEqual({ source: "right", target: "left" });
  });

  it("turns around when the target is behind the source", () => {
    expect(facingHandles(-400, 20)).toEqual({ source: "left", target: "right" });
  });

  it("goes vertical when the drop dominates the run", () => {
    expect(facingHandles(20, 400)).toEqual({ source: "bottom", target: "top" });
    expect(facingHandles(20, -400)).toEqual({ source: "top", target: "bottom" });
  });

  it("always pairs a side with the one facing it", () => {
    const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [300, -200],
      [-50, 900],
    ]) {
      const { source, target } = facingHandles(dx, dy);
      expect(target).toBe(opposite[source]);
    }
  });

  it("breaks a tie horizontally — the nodes are wider than they are tall", () => {
    expect(facingHandles(100, 100).source).toBe("right");
  });
});
