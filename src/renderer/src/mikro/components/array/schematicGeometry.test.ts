import { describe, expect, it } from "vitest";
import { arraySchematic, chunkBoundaries, chunkCount, drawSizes, MAX_CHUNK_LINES, sliceIntervals } from "./schematicGeometry";

const axis = (name: string, size: number, chunk?: number) => ({ name, size, chunk });
const BOX = { width: 232, height: 92 };

const inside = (schematic: NonNullable<ReturnType<typeof arraySchematic>>) =>
  schematic.faces.flat().every(([x, y]) => x >= 0 && x <= BOX.width && y >= 0 && y <= BOX.height);

describe("arraySchematic", () => {
  it("keeps small ratios exact and compresses large ones, as dask does", () => {
    const [long, half, tiny] = drawSizes([1000, 500, 1], 100);
    expect(long).toBe(100);
    expect(half).toBeCloseTo(50);
    // 1000:1 is past the cap: drawn at 100 / ln(112.4), not 0.1.
    expect(tiny).toBeCloseTo(100 / Math.log(112.4));
  });

  it("draws a strip, a rectangle and a cube for one, two and three axes", () => {
    expect(arraySchematic([axis("x", 64)], BOX)!.faces).toHaveLength(1);
    expect(arraySchematic([axis("y", 64), axis("x", 64)], BOX)!.faces).toHaveLength(1);
    expect(arraySchematic([axis("z", 30), axis("y", 64), axis("x", 64)], BOX)!.faces).toHaveLength(3);
  });

  it("puts the last three axes in a cube and the leading ones in blocks before it", () => {
    // 4 axes: dask pads a size-1 axis in front, so (1, c) is a strip and (z, y, x) the cube.
    const four = arraySchematic([axis("c", 3), axis("z", 30), axis("y", 512), axis("x", 512)], BOX)!;
    expect(four.faces).toHaveLength(1 + 3);
    // The padding axis is drawn, never named.
    expect(four.labels.map((label) => label.text)).toEqual(["c 3", "x 512", "y 512", "z 30"]);
    expect(inside(four)).toBe(true);

    const five = arraySchematic([axis("t", 10), axis("c", 3), axis("z", 30), axis("y", 512), axis("x", 512)], BOX)!;
    expect(five.faces).toHaveLength(1 + 3);
    expect(five.labels).toHaveLength(5);
    expect(inside(five)).toBe(true);
  });

  it("draws one line per chunk boundary, and none past the cap", () => {
    expect(chunkBoundaries(axis("x", 512, 128))).toEqual([0.25, 0.5, 0.75]);
    expect(chunkBoundaries(axis("x", 512, 512))).toEqual([]);
    expect(chunkBoundaries(axis("x", 10_000, 1))).toHaveLength(0);
    expect(chunkBoundaries(axis("x", (MAX_CHUNK_LINES + 1) * 2, 2))).toHaveLength(MAX_CHUNK_LINES);
    // y in 2, x in 4 chunks: one line each way across the face.
    expect(arraySchematic([axis("y", 64, 32), axis("x", 64, 16)], BOX)!.lines).toHaveLength(1 + 3);
    expect(chunkCount([axis("y", 64, 32), axis("x", 64, 16)])).toBe(8);
    expect(chunkCount([axis("y", 64), axis("x", 64, 16)])).toBeUndefined();
  });

  it("highlights the part a lens selects", () => {
    const axes = [axis("c", 4), axis("y", 64), axis("x", 64)];
    const intervals = sliceIntervals(axes, [{ axis: "y", start: 0, stop: 32 }]);
    expect(intervals).toEqual([
      [0, 1],
      [0, 0.5],
      [0, 1],
    ]);
    const whole = arraySchematic(axes, BOX)!;
    const part = arraySchematic(axes, { ...BOX, highlight: intervals })!;
    expect(part.highlight).toHaveLength(3);
    // The front face of the selection is the top half of the array's.
    const [front, selected] = [whole.faces[2], part.highlight[2]];
    expect(selected[0]).toEqual(front[0]);
    expect(selected[2][1]).toBeCloseTo((front[0][1] + front[2][1]) / 2);
  });

  it("draws nothing for an array whose shape is unknown", () => {
    expect(arraySchematic([], BOX)).toBeUndefined();
    expect(arraySchematic([axis("x", 0)], BOX)).toBeUndefined();
  });
});
