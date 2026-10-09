import { describe, expect, it } from "vitest";
import { sparklineGeometry, sparklineIndexAt, sparklineX } from "./sparklineGeometry";

describe("sparklineGeometry", () => {
  it("spans the box, highest value at the top", () => {
    const geometry = sparklineGeometry([0, 10, 5], 100, 20, 0);
    expect(geometry.points).toBe("0,20 50,0 100,10");
    expect([geometry.valueMin, geometry.valueMax]).toEqual([0, 10]);
  });

  it("lays a line out in a range shared with others", () => {
    const geometry = sparklineGeometry([0, 10], 100, 20, 0, { min: 0, max: 20 });
    expect(geometry.points).toBe("0,20 100,10");
    // The line's own extremes are still what it reports.
    expect([geometry.valueMin, geometry.valueMax]).toEqual([0, 10]);
  });

  it("puts a flat line in the middle", () => {
    expect(sparklineGeometry([3, 3], 100, 20, 0).points).toBe("0,10 100,10");
  });

  it("keeps a single-sample spike in a line far denser than the box", () => {
    const values = new Float32Array(10_000);
    values[4321] = 7;
    const geometry = sparklineGeometry(values, 100, 20);
    expect(geometry.valueMax).toBe(7);
    expect(geometry.xs.length).toBeLessThan(500);
  });

  it("is empty for no samples", () => {
    expect(sparklineGeometry([], 100, 20).points).toBe("");
  });

  it("maps index to x and back", () => {
    expect(sparklineX(5, 11, 100)).toBe(50);
    expect(sparklineIndexAt(50, 11, 100)).toBe(5);
    expect(sparklineIndexAt(-5, 11, 100)).toBe(0);
    expect(sparklineIndexAt(500, 11, 100)).toBe(10);
  });
});
