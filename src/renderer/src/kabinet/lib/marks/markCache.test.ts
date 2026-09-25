import { beforeEach, describe, expect, it } from "vitest";
import { MARK_SPEC_VERSION } from "./constants";
import {
  cacheGet,
  cacheSet,
  clearMarkCache,
  markKey,
  markPixels,
  markSimple,
} from "./markCache";

const request = (over: Partial<Parameters<typeof markKey>[0]> = {}) => ({
  name: "stardist-node",
  identifier: "live.arkitekt.stardist",
  px: 128,
  simple: false,
  ...over,
});

describe("markKey", () => {
  it("is stable for the same request", () => {
    expect(markKey(request())).toBe(markKey(request()));
  });

  it("changes with every input that changes the picture", () => {
    const base = markKey(request());
    expect(markKey(request({ identifier: "other" }))).not.toBe(base);
    expect(markKey(request({ name: "other" }))).not.toBe(base);
    expect(markKey(request({ px: 256 }))).not.toBe(base);
    expect(markKey(request({ simple: true }))).not.toBe(base);
    expect(markKey(request({ embedding: "AAAA" }))).not.toBe(base);
  });

  it("leads with the spec version, because a refit changes every mark", () => {
    expect(markKey(request()).startsWith(`${MARK_SPEC_VERSION}|`)).toBe(true);
  });

  it("hashes the embedding rather than inlining it", () => {
    // Embeddings are ~700 base64 characters; inlined they would dominate the
    // memory of a 200-entry map.
    const embedding = "Z".repeat(700);
    const key = markKey(request({ embedding }));
    expect(key).not.toContain(embedding);
    expect(key.length).toBeLessThan(120);
    expect(markKey(request({ embedding }))).toBe(key);
    expect(markKey(request({ embedding: "Y".repeat(700) }))).not.toBe(key);
  });

  it("treats a missing and an empty embedding alike", () => {
    expect(markKey(request({ embedding: null }))).toBe(markKey(request()));
    expect(markKey(request({ embedding: undefined }))).toBe(markKey(request()));
  });
});

describe("markPixels", () => {
  it("quantises to powers of two, so nearby icon sizes share entries", () => {
    // size-12 (48) and size-14 (56) must not each render their own copy.
    expect(markPixels(48)).toBe(markPixels(56));
    for (const size of [12, 48, 56, 80, 96, 4000]) {
      const px = markPixels(size);
      expect(Math.log2(px) % 1, String(size)).toBe(0);
      expect(px).toBeGreaterThanOrEqual(64);
      expect(px).toBeLessThanOrEqual(512);
    }
  });

  it("never asks for less than the icon's own size", () => {
    for (const size of [12, 48, 56, 80, 96]) {
      expect(markPixels(size), String(size)).toBeGreaterThanOrEqual(size);
    }
  });
});

describe("markSimple", () => {
  it("drops the extras below the size they turn to mush at", () => {
    expect(markSimple(24)).toBe(true);
    expect(markSimple(47)).toBe(true);
    expect(markSimple(48)).toBe(false);
    expect(markSimple(96)).toBe(false);
  });
});

describe("the cache", () => {
  beforeEach(() => clearMarkCache());

  it("misses cleanly for a mark that was never rendered", () => {
    expect(cacheGet(markKey(request()))).toBeUndefined();
  });

  it("returns what was stored", () => {
    cacheSet("k", "data:image/png;base64,AAAA");
    expect(cacheGet("k")).toBe("data:image/png;base64,AAAA");
  });

  it("evicts the least recently used once it is full", () => {
    // Bounded on purpose: at ~8-15 kB per PNG data URL an unbounded map would
    // grow without limit across a long browsing session.
    for (let i = 0; i < 250; i++) cacheSet(`k${i}`, `v${i}`);
    expect(cacheGet("k0")).toBeUndefined();
    expect(cacheGet("k249")).toBe("v249");
  });

  it("counts a read as a use, so a visible icon is not evicted", () => {
    cacheSet("old", "v");
    for (let i = 0; i < 150; i++) cacheSet(`k${i}`, `v${i}`);
    expect(cacheGet("old")).toBe("v"); // refreshes recency
    for (let i = 150; i < 260; i++) cacheSet(`k${i}`, `v${i}`);
    expect(cacheGet("old")).toBe("v");
  });
});
