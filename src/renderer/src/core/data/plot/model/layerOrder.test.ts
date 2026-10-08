import { describe, expect, it } from "vitest";
import { reorderedOrders } from "./layerOrder";

describe("reorderedOrders", () => {
  it("renumbers an unspaced stack so a move actually moves", () => {
    const layers = [
      { id: "a", order: 0 },
      { id: "b", order: 0 },
      { id: "c", order: 0 },
    ];
    // New sequence a, c, b: a keeps 0, c and b are renumbered.
    expect(reorderedOrders(layers, "c", -1)).toEqual([
      { id: "c", order: 1 },
      { id: "b", order: 2 },
    ]);
  });

  it("writes only the two that swap in a spaced stack", () => {
    const layers = [
      { id: "a", order: 0 },
      { id: "b", order: 1 },
      { id: "c", order: 2 },
    ];
    expect(reorderedOrders(layers, "a", 1)).toEqual([
      { id: "b", order: 0 },
      { id: "a", order: 1 },
    ]);
  });

  it("does nothing past either end", () => {
    const layers = [{ id: "a", order: 0 }];
    expect(reorderedOrders(layers, "a", -1)).toEqual([]);
    expect(reorderedOrders(layers, "a", 1)).toEqual([]);
  });
});
