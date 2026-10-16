import { describe, expect, it } from "vitest";
import { findStandingMandate } from "./standing";

const AGENT = "live.arkitekt.orkestrator";
const mandate = (over: Partial<Parameters<typeof findStandingMandate>[0][number]> = {}) => ({
  id: "m",
  agentIdentifier: AGENT,
  claimant: "AGENT",
  subject: { identifier: "live.arkitekt.esp32" },
  parent: null,
  ...over,
});

describe("findStandingMandate", () => {
  it("finds this app's parentless agent mandate for the firmware", () => {
    const found = findStandingMandate(
      [
        mandate({ id: "child", parent: { id: "p" } }),
        mandate({ id: "pokket", agentIdentifier: "live.arkitekt.pokket" }),
        mandate({ id: "keyed", claimant: "KEY", agentIdentifier: null }),
        mandate({ id: "other-app", subject: { identifier: "live.arkitekt.other" } }),
        mandate({ id: "standing" }),
      ],
      AGENT,
      "live.arkitekt.esp32",
    );
    expect(found?.id).toBe("standing");
  });

  it("finds nothing to reuse when there is none", () => {
    expect(findStandingMandate([], AGENT, "live.arkitekt.esp32")).toBeUndefined();
  });
});
