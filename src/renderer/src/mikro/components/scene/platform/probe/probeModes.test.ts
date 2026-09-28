// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from "vitest";
import { ProjectionMode } from "@/mikro/api/graphql";
import { ISO_PROBE_THRESHOLD, resolveProbeStrategy } from "./probeModes";

describe("resolveProbeStrategy", () => {
  it("passes explicit modes through with the user threshold", () => {
    expect(resolveProbeStrategy("first-hit", ProjectionMode.Mip, 0.2)).toEqual({
      strategy: "first-hit",
      threshold: 0.2,
    });
    expect(resolveProbeStrategy("max", ProjectionMode.Volume, 0.2)).toEqual({
      strategy: "max",
      threshold: 0.2,
    });
    expect(resolveProbeStrategy("gradient", undefined, 0.05)).toEqual({
      strategy: "gradient",
      threshold: 0.05,
    });
  });

  it("auto-dispatches on the projection mode", () => {
    expect(resolveProbeStrategy("auto", ProjectionMode.Mip, 0.01).strategy).toBe("max");
    expect(resolveProbeStrategy("auto", ProjectionMode.AttenuatedMip, 0.01).strategy).toBe(
      "max",
    );
    expect(resolveProbeStrategy("auto", ProjectionMode.Volume, 0.01).strategy).toBe(
      "volume-accum",
    );
  });

  it("auto + isosurface probes first-hit at the shader's iso threshold", () => {
    expect(resolveProbeStrategy("auto", ProjectionMode.Isosurface, 0.01)).toEqual({
      strategy: "first-hit",
      threshold: ISO_PROBE_THRESHOLD,
    });
  });

  it("auto without a projection falls back to first-hit at the user threshold", () => {
    expect(resolveProbeStrategy("auto", undefined, 0.03)).toEqual({
      strategy: "first-hit",
      threshold: 0.03,
    });
  });
});
