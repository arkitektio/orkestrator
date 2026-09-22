import { describe, expect, it } from "vitest";

import { decideAutoSnapshot } from "./autoSnapshotGate";

/**
 * The gate is the whole feature. Everything around it — capture, upload,
 * mutation — already existed and is exercised elsewhere (`mediaUpload.test.ts`);
 * what is new is the decision about WHEN it is allowed to run, and every way
 * this can go wrong is a wrong answer here: a blurry tile (fired mid-stream),
 * a duplicate upload (fired twice), a lost hand-composed picture (fired over an
 * existing snapshot), or a scene that never gets a tile at all (never fired).
 */
describe("decideAutoSnapshot", () => {
  const base = {
    enabled: true,
    hasSnapshot: false,
    attempted: false,
    sharp: true as boolean | null,
    hasVolumetricLayers: true,
    cameraTouched: false,
  };
  const decide = (o: Partial<typeof base> = {}) => decideAutoSnapshot({ ...base, ...o });

  it("shoots once the pipeline has drained", () => {
    expect(decide()).toBe("shoot");
  });

  it("waits while the pipeline is still streaming", () => {
    // The whole point of the `sharp` signal: capturing here would freeze a
    // half-streamed pyramid as the scene's permanent tile.
    expect(decide({ sharp: false })).toBe("skip");
  });

  it("does not wait forever on a scene with nothing volumetric to stream", () => {
    // On a mesh-only scene no brick pipeline ever runs, so the drained edge is
    // never coming and waiting for it would mean those scenes never get a tile.
    expect(decide({ sharp: null, hasVolumetricLayers: false })).toBe("wait-quiet");
  });

  it("waits for the drained edge when the scene IS volumetric but has not started", () => {
    // The regression this guards: treating "not started yet" like "nothing to
    // wait for" on a slow-to-start volumetric scene would fire the quiet
    // fallback against a blank canvas and freeze it as the permanent tile —
    // and since this never refreshes, no later open could fix it.
    expect(decide({ sharp: null, hasVolumetricLayers: true })).toBe("skip");
  });

  it("never overwrites a picture the scene already has", () => {
    // This fills a gap; it is not a refresh. A snapshot someone composed
    // deliberately must survive every subsequent open.
    expect(decide({ hasSnapshot: true })).toBe("skip");
    expect(decide({ hasSnapshot: true, sharp: null, hasVolumetricLayers: false })).toBe("skip");
  });

  it("fires at most once per mount", () => {
    expect(decide({ attempted: true })).toBe("skip");
  });

  it("skips once the camera has been driven", () => {
    // The tile should be the default fit-to-scene rig, so the card grid reads
    // consistently rather than freezing whatever angle the first visitor
    // happened to drag to.
    expect(decide({ cameraTouched: true })).toBe("skip");
    expect(decide({ cameraTouched: true, sharp: null, hasVolumetricLayers: false })).toBe("skip");
  });

  it("does nothing at all when the setting is off", () => {
    expect(decide({ enabled: false })).toBe("skip");
    expect(decide({ enabled: false, sharp: null, hasVolumetricLayers: false })).toBe("skip");
  });
});
