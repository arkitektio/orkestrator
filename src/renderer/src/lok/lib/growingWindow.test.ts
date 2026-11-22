import { describe, expect, it } from "vitest";
import { growingWindowFetchPolicy } from "./growingWindow";

type Vars = { pagination?: { limit?: number } };

const policy = growingWindowFetchPolicy<Vars>((v) => v?.pagination?.limit, 31);
const changed = (limit: number) => ({
  reason: "variables-changed" as const,
  options: { variables: { pagination: { limit } } },
  initialFetchPolicy: "cache-and-network" as const,
});

describe("growingWindowFetchPolicy", () => {
  it("reads a grown window from the cache", () => {
    expect(policy("cache-and-network", changed(61))).toBe("cache-first");
    expect(policy("cache-and-network", changed(151))).toBe("cache-first");
  });

  it("asks the server again for the first page (a new filter)", () => {
    expect(policy("cache-first", changed(31))).toBe("cache-and-network");
  });

  it("keeps the current policy after a fetch", () => {
    expect(
      policy("cache-and-network", { reason: "after-fetch", options: {}, initialFetchPolicy: "cache-and-network" }),
    ).toBe("cache-and-network");
  });
});
