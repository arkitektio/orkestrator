import { describe, expect, it } from "vitest";
import { ChunkRefRegistry } from "./chunkRefRegistry";

describe("ChunkRefRegistry", () => {
  it("signals last-owner release exactly once", () => {
    const registry = new ChunkRefRegistry();
    registry.acquire("chunk", "brick-a");
    registry.acquire("chunk", "brick-b");
    expect(registry.release("chunk", "brick-a")).toBe(false); // b still needs it
    expect(registry.release("chunk", "brick-b")).toBe(true); // last owner
    expect(registry.release("chunk", "brick-b")).toBe(false); // already gone
  });

  it("acquire is idempotent per owner", () => {
    const registry = new ChunkRefRegistry();
    registry.acquire("chunk", "brick-a");
    registry.acquire("chunk", "brick-a");
    expect(registry.referrers("chunk")).toBe(1);
    expect(registry.release("chunk", "brick-a")).toBe(true);
  });

  it("releasing an unknown pair is a safe no-op", () => {
    const registry = new ChunkRefRegistry();
    expect(registry.release("never-seen", "brick-a")).toBe(false);
    registry.acquire("chunk", "brick-a");
    expect(registry.release("chunk", "brick-OTHER")).toBe(false);
    expect(registry.referrers("chunk")).toBe(1);
  });

  it("chunks are independent", () => {
    const registry = new ChunkRefRegistry();
    registry.acquire("chunk-1", "brick-a");
    registry.acquire("chunk-2", "brick-a");
    expect(registry.release("chunk-1", "brick-a")).toBe(true);
    expect(registry.referrers("chunk-2")).toBe(1);
  });

  it("re-acquiring after a full release starts a fresh cycle", () => {
    const registry = new ChunkRefRegistry();
    registry.acquire("chunk", "brick-a");
    registry.release("chunk", "brick-a");
    registry.acquire("chunk", "brick-b");
    expect(registry.referrers("chunk")).toBe(1);
    expect(registry.release("chunk", "brick-b")).toBe(true);
  });

  it("clear drops everything", () => {
    const registry = new ChunkRefRegistry();
    registry.acquire("chunk", "brick-a");
    registry.clear();
    expect(registry.referrers("chunk")).toBe(0);
    expect(registry.release("chunk", "brick-a")).toBe(false);
  });
});
