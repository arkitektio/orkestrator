import { describe, expect, it } from "vitest";

import { DEFAULT_RECONSTRUCT_PARAMS, createMeshDesignStore } from "../store/meshDesignStore";
import { RECONSTRUCTORS, reconstructorById, reconstructorsFor } from "./registry";
import { reconstructKey } from "./settings";

describe("reconstructor registry", () => {
  it("gives every reconstructor a unique id, a title and a description", () => {
    const ids = RECONSTRUCTORS.map((reconstructor) => reconstructor.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const reconstructor of RECONSTRUCTORS) {
      expect(reconstructor.title.length).toBeGreaterThan(0);
      expect(reconstructor.description.length).toBeGreaterThan(0);
      expect(reconstructorById(reconstructor.id)).toBe(reconstructor);
    }
  });

  it("offers a fitted and a surface reconstructor for both gestures", () => {
    expect(reconstructorsFor("stroke").map((r) => r.id)).toEqual(["tube-fit", "tube-surface"]);
    expect(reconstructorsFor("click").map((r) => r.id)).toEqual(["ball-fit", "ball-surface"]);
  });

  it("defaults each gesture to a reconstructor that answers it", () => {
    const { reconstructors } = createMeshDesignStore().getState();
    expect(reconstructorById(reconstructors.stroke)?.gesture).toBe("stroke");
    expect(reconstructorById(reconstructors.click)?.gesture).toBe("click");
  });

  it("keys a candidate on the reconstructor and on every setting", () => {
    const settings = {
      radiusWorld: 2,
      weights: { intensity: 1 } as never,
      tubeThreshold: 0.5,
      detailVoxels: 1,
      marcher: "cubes" as never,
      polishIterations: 8,
      blobSmoothness: 1,
      blobGap: 0,
    };
    const base = reconstructKey("tube-fit", settings, DEFAULT_RECONSTRUCT_PARAMS);
    expect(reconstructKey("tube-fit", { ...settings }, { ...DEFAULT_RECONSTRUCT_PARAMS })).toBe(base);
    expect(reconstructKey("tube-surface", settings, DEFAULT_RECONSTRUCT_PARAMS)).not.toBe(base);
    expect(reconstructKey("tube-fit", { ...settings, radiusWorld: 3 }, DEFAULT_RECONSTRUCT_PARAMS)).not.toBe(base);
    expect(
      reconstructKey("tube-fit", settings, { ...DEFAULT_RECONSTRUCT_PARAMS, tubeEdge: 0.4 }),
    ).not.toBe(base);
  });
});
