import { describe, expect, it } from "vitest";
import { datasetRegistrations } from "./registrations";

const GRID = { id: "grid", name: "Pixel grid" };
const STAGE = { id: "stage", name: "Stage frame" };
const MICRONS = { id: "microns", name: "µm space" };
const LEVEL = { id: "level-1", name: "Level 1" };

const edge = (id: string, input: string, output: string) => ({
  id,
  input: { id: input },
  output: { id: output },
});

describe("datasetRegistrations", () => {
  const systems = [GRID, STAGE, MICRONS, LEVEL];

  it("returns the spaces the grid maps INTO", () => {
    const found = datasetRegistrations(GRID.id, systems, [
      edge("e1", GRID.id, STAGE.id),
      edge("e2", GRID.id, MICRONS.id),
    ]);

    expect(found.map((r) => r.system.name)).toEqual(["Stage frame", "µm space"]);
  });

  // The mistake worth a test: a pyramid level maps UP into the grid, so reading
  // edges the wrong way round yields the dataset's own furniture as if they
  // were worlds to compose over.
  it("ignores edges pointing at the grid", () => {
    expect(
      datasetRegistrations(GRID.id, systems, [edge("up", LEVEL.id, GRID.id)]),
    ).toEqual([]);
  });

  it("offers each target once, keeping the first (primary) edge", () => {
    const found = datasetRegistrations(GRID.id, systems, [
      edge("pixels", GRID.id, MICRONS.id),
      edge("calibration", GRID.id, MICRONS.id),
    ]);

    expect(found).toHaveLength(1);
    expect(found[0].edge.id).toBe("pixels");
  });

  it("drops self-edges and targets the graph did not return", () => {
    const found = datasetRegistrations(GRID.id, systems, [
      edge("self", GRID.id, GRID.id),
      edge("dangling", GRID.id, "absent"),
    ]);

    expect(found).toEqual([]);
  });

  it("has nothing to offer without a grid", () => {
    expect(datasetRegistrations(undefined, systems, [edge("e", "a", "b")])).toEqual(
      [],
    );
  });
});
