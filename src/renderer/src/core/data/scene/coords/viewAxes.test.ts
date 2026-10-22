import { describe, expect, it } from "vitest";

import {
  VIEW_PLANES,
  deriveRenderAxes,
  viewPlaneOf,
  viewToWorldPoint,
  viewTriple,
  worldToViewPoint,
} from "./viewAxes";

const WORLD = {
  id: "world",
  axes: [
    { name: "t", type: "TIME", order: 0 },
    { name: "z", type: "SPACE", order: 1 },
    { name: "y", type: "SPACE", order: 2 },
    { name: "x", type: "SPACE", order: 3 },
  ],
};

const STACK = [
  { name: "t", type: "TIME" },
  { name: "c", type: "CHANNEL" },
  { name: "z", type: "SPACE" },
  { name: "y", type: "SPACE" },
  { name: "x", type: "SPACE" },
];

/** A diagonal scale placement over (z, y, x), translation last. */
const scale = (sz: number, sy: number, sx: number) => ({
  inputAxes: ["z", "y", "x"],
  outputAxes: ["z", "y", "x"],
  matrix: [
    [sz, 0, 0, 0],
    [0, sy, 0, 0],
    [0, 0, sx, 0],
  ],
});

const derive = (
  plane: keyof typeof VIEW_PLANES,
  lensAxes = STACK,
  placement: Parameters<typeof deriveRenderAxes>[0]["placement"] = scale(2, 0.3, 0.3),
) =>
  deriveRenderAxes({
    lensAxes,
    axisNames: lensAxes.map((axis) => axis.name),
    placement,
    screen: viewTriple(WORLD, VIEW_PLANES[plane]),
    view: VIEW_PLANES[plane],
  });

describe("viewTriple", () => {
  it("orders the world's spatial axes by the view", () => {
    expect(viewTriple(WORLD, VIEW_PLANES.XY)).toEqual(["x", "y", "z"]);
    expect(viewTriple(WORLD, VIEW_PLANES.XZ)).toEqual(["x", "z", "y"]);
    expect(viewTriple(WORLD, VIEW_PLANES.YZ)).toEqual(["y", "z", "x"]);
  });

  it("names the plane a view is", () => {
    expect(viewPlaneOf([0, 2, 1])).toBe("XZ");
    expect(viewPlaneOf(null)).toBe("XY");
  });

  it("round-trips a point between screen and world order", () => {
    const screen: [number, number, number] = [1, 2, 3];
    const world = viewToWorldPoint(screen, VIEW_PLANES.YZ);
    expect(world).toEqual([3, 1, 2]);
    expect(worldToViewPoint(world, VIEW_PLANES.YZ)).toEqual(screen);
  });
});

describe("deriveRenderAxes", () => {
  it("answers the server's convention in the XY view, with the type-scanned axes", () => {
    expect(derive("XY")).toEqual({
      axes: { x: "x", y: "y", z: "z", t: "t", intensity: "c", phasor: null, vector: null },
      edgeOn: false,
    });
  });

  it("puts the lens axis under each screen slot in a side view", () => {
    expect(derive("XZ").axes).toMatchObject({ x: "x", y: "z", z: "y" });
    expect(derive("YZ").axes).toMatchObject({ x: "y", y: "z", z: "x" });
  });

  it("follows the placement, not the names: a lens registered transposed draws transposed back", () => {
    const rows = ["row", "col"];
    const lens = rows.map((name) => ({ name, type: "SPACE" }));
    // col lands on world y, row on world x.
    const placement = { inputAxes: rows, outputAxes: ["y", "x"], matrix: [[0, 1, 0], [1, 0, 0]] };
    expect(derive("XY", lens, placement).axes).toMatchObject({ x: "row", y: "col", z: null });
  });

  it("takes the dominant input under a rotation", () => {
    const c = Math.cos(0.3);
    const s = Math.sin(0.3);
    const placement = {
      inputAxes: ["z", "y", "x"],
      outputAxes: ["z", "y", "x"],
      matrix: [
        [1, 0, 0, 0],
        [0, c, s, 0],
        [0, -s, c, 0],
      ],
    };
    expect(derive("XY", STACK, placement).axes).toMatchObject({ x: "x", y: "y", z: "z" });
  });

  it("passes a world axis the placement does not constrain through by name", () => {
    const partial = { inputAxes: ["y", "x"], outputAxes: ["y", "x"], matrix: [[2, 0, 0], [0, 2, 0]] };
    expect(derive("XY", STACK, partial).axes).toMatchObject({ x: "x", y: "y", z: "z" });
  });

  it("gives a slot read through a field to the axis the field is read along", () => {
    // Uneven z planes: world z is the field's values, read along the lens' `plane`.
    const lens = [
      { name: "c", type: "CHANNEL" },
      { name: "plane", type: "SPACE" },
      { name: "y", type: "SPACE" },
      { name: "x", type: "SPACE" },
    ];
    const placement = {
      inputAxes: ["plane", "y", "x"],
      outputAxes: ["y", "x"],
      matrix: [[0, 1, 0, 0], [0, 0, 1, 0]],
      fields: [{ outputAxis: "z", inputAxis: "plane" }],
    };
    expect(derive("XY", lens, placement).axes).toMatchObject({ x: "x", y: "y", z: "plane" });
    expect(derive("XZ", lens, placement).axes).toMatchObject({ x: "x", y: "plane", z: "y" });
  });

  it("sees a 2D lens edge-on from the side, and flat from above", () => {
    const plane = STACK.filter((axis) => axis.name !== "z");
    const placement = { inputAxes: ["y", "x"], outputAxes: ["y", "x"], matrix: [[1, 0, 0], [0, 1, 0]] };
    expect(derive("XY", plane, placement)).toMatchObject({ axes: { x: "x", y: "y", z: null }, edgeOn: false });
    expect(derive("XZ", plane, placement).edgeOn).toBe(true);
  });

  it("falls back to the convention without a placement in the XY view", () => {
    expect(derive("XY", STACK, null).axes).toMatchObject({ x: "x", y: "y", z: "z" });
  });
});
