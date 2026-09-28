import { describe, expect, it } from "vitest";
import { shouldShowAgentIsland } from "./islandVisibility";

const base = {
  disabled: false,
  startAgent: true,
  connected: true,
  assignments: 0,
  lastCode: undefined as number | undefined,
  lastReason: undefined as string | undefined,
};

describe("shouldShowAgentIsland", () => {
  it("stays silent when connected and idle", () => {
    expect(shouldShowAgentIsland(base)).toBe(false);
  });

  it("stays silent in a build without agent support", () => {
    expect(
      shouldShowAgentIsland({ ...base, disabled: true, assignments: 3 }),
    ).toBe(false);
  });

  it("stays silent when the user has the agent switched off", () => {
    expect(
      shouldShowAgentIsland({
        ...base,
        startAgent: false,
        connected: false,
        lastCode: 1006,
      }),
    ).toBe(false);
  });

  it("shows while running an assignment", () => {
    expect(shouldShowAgentIsland({ ...base, assignments: 1 })).toBe(true);
  });

  it("shows when disconnected with a close code", () => {
    expect(
      shouldShowAgentIsland({ ...base, connected: false, lastCode: 1006 }),
    ).toBe(true);
  });

  it("shows when disconnected with only a reason", () => {
    expect(
      shouldShowAgentIsland({
        ...base,
        connected: false,
        lastReason: "Retrying connection to the AGI endpoint (1/3).",
      }),
    ).toBe(true);
  });

  it("stays silent on the first clean connection attempt", () => {
    expect(shouldShowAgentIsland({ ...base, connected: false })).toBe(false);
  });
});
