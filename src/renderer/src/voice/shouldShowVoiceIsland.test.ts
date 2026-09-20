import { describe, expect, it } from "vitest";
import { shouldShowVoiceIsland } from "./shouldShowVoiceIsland";
import { overallPercent } from "./VoiceIsland";

describe("shouldShowVoiceIsland", () => {
  it("is silent when voice input is off, whatever the engine says", () => {
    expect(shouldShowVoiceIsland({ enabled: false, status: "error" })).toBe(false);
    expect(shouldShowVoiceIsland({ enabled: false, status: "downloading" })).toBe(false);
  });

  it("shows while a model downloads or loads, and on failure", () => {
    expect(shouldShowVoiceIsland({ enabled: true, status: "starting" })).toBe(true);
    expect(shouldShowVoiceIsland({ enabled: true, status: "downloading" })).toBe(true);
    expect(shouldShowVoiceIsland({ enabled: true, status: "error" })).toBe(true);
  });

  it("is silent once ready — the badge takes over from there", () => {
    expect(shouldShowVoiceIsland({ enabled: true, status: "ready" })).toBe(false);
    expect(shouldShowVoiceIsland({ enabled: true, status: "off" })).toBe(false);
  });
});

describe("overallPercent", () => {
  it("spreads the files evenly and the bytes within the current one", () => {
    expect(overallPercent(undefined)).toBeUndefined();
    expect(
      overallPercent({ modelId: "m", file: "a", fileIndex: 0, fileCount: 2, loaded: 50, total: 100 }),
    ).toBe(25);
    expect(
      overallPercent({ modelId: "m", file: "b", fileIndex: 1, fileCount: 2, loaded: 100, total: 100 }),
    ).toBe(100);
  });

  it("counts a file with no content-length as not started", () => {
    expect(
      overallPercent({ modelId: "m", file: "a", fileIndex: 1, fileCount: 4, loaded: 999, total: 0 }),
    ).toBe(25);
  });
});
