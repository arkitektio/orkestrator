import { describe, expect, it } from "vitest";

import { lookupInstants } from "@/core/data/scene/coords/axisTime";
import { probeCoordsFor } from "@/mikro/lib/attributes/planExec";
import { selectionsFor, worldTimedDims } from "./worldSelections";

/**
 * `selectionsFor` is the one reader of the world slider: these pin that a
 * world-timed dim follows the world value per layer, and never the index slider
 * of the same name.
 */
describe("selectionsFor", () => {
  const events = lookupInstants(
    { outputAxis: "t", inputAxis: "t", innerScale: 1, innerOffset: 0, scale: 1, offset: 0 },
    [0, 0.1, 0.15, 2, 7.5],
    { start: 0, step: 1, length: 5 },
  )!;
  const regular = lookupInstants(
    { outputAxis: "t", inputAxis: "t", innerScale: 1, innerOffset: 0, scale: 1, offset: 0 },
    [0, 1, 2, 3, 4, 5, 6, 7, 8],
    { start: 0, step: 1, length: 9 },
  )!;
  const state = {
    dimSelections: { t: 6, c: 1 },
    worldSelections: { t: 2.5 },
    layerAxisInstants: { events: [events], regular: [regular] },
  };

  it("gives each layer its own frame at the selected instant", () => {
    expect(selectionsFor(state, "events")).toEqual({ t: 3, c: 1 });
    expect(selectionsFor(state, "regular")).toEqual({ t: 2, c: 1 });
  });

  it("leaves a layer that is not world-timed on the index sliders", () => {
    expect(selectionsFor(state, "plain")).toEqual({ t: 6, c: 1 });
  });

  it("drops the index selection of a world-timed dim until the world slider is set", () => {
    expect(selectionsFor({ ...state, worldSelections: {} }, "events")).toEqual({ c: 1 });
  });

  it("shows the first frame before a layer starts", () => {
    const late = lookupInstants(
      { outputAxis: "t", inputAxis: "t", innerScale: 1, innerOffset: 0, scale: 1, offset: 10 },
      [0, 1],
      { start: 0, step: 1, length: 2 },
    )!;
    expect(selectionsFor({ ...state, layerAxisInstants: { late: [late] } }, "late").t).toBe(0);
  });

  it("names the world-timed dims of a layer", () => {
    expect([...worldTimedDims(state.layerAxisInstants, "events")]).toEqual(["t"]);
    expect(worldTimedDims(state.layerAxisInstants, "plain").size).toBe(0);
  });

  it("gives a probe the frame on screen, so its attributes are that frame's", () => {
    const coords = probeCoordsFor({
      axisNames: ["t", "y", "x"],
      renderAxes: { x: "x", y: "y" },
      voxelIndex: [4, 5, 0],
      dimSelections: selectionsFor(state, "events"),
    });
    expect(coords).toEqual({ t: 3, y: 5, x: 4 });
  });
});
