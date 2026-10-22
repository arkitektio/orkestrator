import { describe, expect, it } from "vitest";

import { VIEW_PLANES } from "@/core/data/scene/coords/viewAxes";
import { unplaceableReason } from "./placeable";
import { viewLayer } from "./viewLayer";

const WORLD = {
  id: "world",
  axes: [
    { name: "z", type: "SPACE", order: 0 },
    { name: "y", type: "SPACE", order: 1 },
    { name: "x", type: "SPACE", order: 2 },
  ],
};

/** A point table with centroid columns, placed onto the world by a diagonal scale. */
const pointLayer = (columns: { name: string; type: string }[], outputs: string[]) =>
  ({
    __typename: "PointLayer",
    id: "points",
    tableDataset: { coordinateSystem: { axes: columns } },
    asAffine: {
      inputAxes: columns.filter((column) => column.type === "SPACE").map((column) => column.name),
      outputAxes: outputs,
      matrix: outputs.map((_, row) => [...outputs.map((__, col) => (row === col ? 0.5 : 0)), 0]),
    },
  }) as never;

const view = (layer: unknown, plane: keyof typeof VIEW_PLANES = "XY") =>
  viewLayer(layer as never, { worldCoordinateSystem: WORLD, viewAxes: VIEW_PLANES[plane] }) as unknown as {
    xColumn: string | null;
    yColumn: string | null;
    zColumn: string | null;
    tColumn: string | null;
    edgeOn: boolean;
  };

const CENTROIDS = [
  { name: "frame", type: "TIME" },
  { name: "centroid_z", type: "SPACE" },
  { name: "centroid_y", type: "SPACE" },
  { name: "centroid_x", type: "SPACE" },
];

describe("viewLayer on a point table", () => {
  it("finds the columns through the placement, whatever they are called", () => {
    expect(view(pointLayer(CENTROIDS, ["z", "y", "x"]))).toMatchObject({
      xColumn: "centroid_x",
      yColumn: "centroid_y",
      zColumn: "centroid_z",
      tColumn: "frame",
      edgeOn: false,
    });
  });

  it("follows the view", () => {
    expect(view(pointLayer(CENTROIDS, ["z", "y", "x"]), "XZ")).toMatchObject({
      xColumn: "centroid_x",
      yColumn: "centroid_z",
      zColumn: "centroid_y",
    });
  });

  it("sees a 2D table edge-on from the side", () => {
    const flat = CENTROIDS.filter((column) => column.name !== "centroid_z");
    expect(view(pointLayer(flat, ["y", "x"])).edgeOn).toBe(false);
    expect(view(pointLayer(flat, ["y", "x"]), "YZ").edgeOn).toBe(true);
  });

  it("draws nothing from a table with no spatial column", () => {
    expect(view(pointLayer([{ name: "label", type: "INDEX" }], []))).toMatchObject({ xColumn: null, yColumn: null });
  });
});

describe("viewLayer on an image placed partly by a field", () => {
  // Uneven z planes: world z is given by an array read along the lens' `plane`.
  const layer = {
    __typename: "ImageLayer",
    id: "stack",
    pathToWorld: {},
    lens: {
      __typename: "ArrayLens",
      axisNames: ["plane", "y", "x"],
      coordinateSystem: {
        axes: [
          { name: "plane", type: "SPACE" },
          { name: "y", type: "SPACE" },
          { name: "x", type: "SPACE" },
        ],
      },
    },
    asAffine: {
      inputAxes: ["plane", "y", "x"],
      outputAxes: ["y", "x"],
      matrix: [
        [0, 1, 0, 0],
        [0, 0, 1, 0],
      ],
      fields: [{ outputAxis: "z", inputAxis: "plane", innerScale: 1, innerOffset: 0 }],
    },
  };

  it("draws the field's axis as depth, so the layer is held back as a field placement", () => {
    const viewed = viewLayer(layer as never, { worldCoordinateSystem: WORLD, viewAxes: VIEW_PLANES.XY }) as never as {
      renderAxes: { z: string | null };
    };
    expect(viewed.renderAxes.z).toBe("plane");
    expect(unplaceableReason(viewed as never)).toBe("field");
  });
});
