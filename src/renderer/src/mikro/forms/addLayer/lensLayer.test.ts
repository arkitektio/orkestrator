import { describe, expect, it, vi } from "vitest";

import {
  CreateIntensityLayerDocument,
  CreateRgbLayerDocument,
  CreateVolumeLayerDocument,
  ProjectionMode,
} from "@/mikro/api/graphql";

import type { LensCandidate } from "./candidates";
import { lensLayerRequest, resolveLensLayerLenses } from "./lensLayer";

const defaults = {
  intensity: { intensityIndex: 1, colormap: "GREEN", blending: "ADDITIVE", climMin: 10, climMax: null, gamma: null },
  rgb: { redIndex: 0, greenIndex: 1, blueIndex: 2 },
};
const lenses = { channel: "c1", planes: null };

describe("lensLayerRequest", () => {
  it("asks for an intensity layer over the one channel, styled by the engine's defaults", () => {
    const request = lensLayerRequest({ kind: "INTENSITY", scene: "s", lens: "7", lenses, defaults });
    expect(request?.document).toBe(CreateIntensityLayerDocument);
    expect(request?.variables).toEqual({
      input: { scene: "s", lens: "c1", colormap: "GREEN", blending: "ADDITIVE", climMin: 10, climMax: undefined, gamma: undefined },
    });
  });

  it("projects a volume as a MIP unless told otherwise", () => {
    const plain = lensLayerRequest({ kind: "VOLUME", scene: "s", lens: "7", lenses, defaults });
    expect(plain?.document).toBe(CreateVolumeLayerDocument);
    expect(plain?.variables.input).toMatchObject({ lens: "c1", mode: ProjectionMode.Mip });
    const chosen = lensLayerRequest({ kind: "VOLUME", scene: "s", lens: "7", lenses, defaults, choices: { mode: ProjectionMode.Volume } });
    expect(chosen?.variables.input).toMatchObject({ mode: ProjectionMode.Volume });
  });

  it("keeps an RGB layer on the row's lens with its three planes, and asks for none without them", () => {
    const planes = { redLens: "r", greenLens: "g", blueLens: "b" };
    const request = lensLayerRequest({ kind: "RGB", scene: "s", lens: "7", lenses: { channel: "7", planes }, defaults });
    expect(request?.document).toBe(CreateRgbLayerDocument);
    expect(request?.variables).toEqual({ input: { scene: "s", lens: "7", ...planes } });
    expect(lensLayerRequest({ kind: "RGB", scene: "s", lens: "7", lenses, defaults })).toBeNull();
    expect(lensLayerRequest({ kind: "PHASOR", scene: "s", lens: "7", lenses, defaults })).toBeNull();
  });
});

describe("resolveLensLayerLenses", () => {
  const lens = {
    id: "7",
    dataset: { id: "d" },
    slices: [],
    shape: [3, 64, 64],
    axisNames: ["c", "y", "x"],
    renderAxes: { intensity: "c", x: "x", y: "y", z: null, t: null, phasor: null },
  } as unknown as LensCandidate;

  it("makes a one-channel layer from the channel's lens, and an RGB one from three", async () => {
    const registry = { ensureChannelLens: vi.fn(async (_d: string, _s: unknown, _a: string, index: number) => `ch${index}`) };
    expect(await resolveLensLayerLenses(registry, "INTENSITY", lens, defaults)).toEqual({ channel: "ch1", planes: null });
    expect(await resolveLensLayerLenses(registry, "RGB", lens, defaults)).toEqual({
      channel: "7",
      planes: { redLens: "ch0", greenLens: "ch1", blueLens: "ch2" },
    });
    expect(await resolveLensLayerLenses(registry, "LABEL", lens, defaults)).toEqual({ channel: "7", planes: null });
  });
});
