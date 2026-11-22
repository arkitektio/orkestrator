import { describe, expect, it } from "vitest";
import { hasMore, PAGE, windowFetchPolicy } from "./window";

const grown = (limit: number) => ({
  reason: "variables-changed" as const,
  options: { variables: { filters: { unread: true }, pagination: { offset: 0, limit } } },
  initialFetchPolicy: "cache-and-network" as const,
});

describe("windowFetchPolicy", () => {
  it("reads a grown window from the cache", () => {
    expect(windowFetchPolicy("cache-and-network", grown(PAGE * 3))).toBe("cache-first");
  });

  it("asks the server again for the first page (a new filter)", () => {
    expect(windowFetchPolicy("cache-first", grown(PAGE))).toBe("cache-and-network");
  });

  it("keeps the policy after a fetch", () => {
    expect(windowFetchPolicy("cache-first", { ...grown(PAGE * 2), reason: "after-fetch" })).toBe("cache-first");
  });
});

describe("hasMore", () => {
  it("follows the count past the server's 100-row page", () => {
    expect(hasMore(150, 150, 420)).toBe(true);
    expect(hasMore(420, 450, 420)).toBe(false);
  });

  it("without a count, a full window may go on and a short one is the end", () => {
    expect(hasMore(100, 100)).toBe(true);
    expect(hasMore(73, 100)).toBe(false);
  });
});
