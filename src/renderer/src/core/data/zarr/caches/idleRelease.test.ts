import { afterEach, describe, expect, it, vi } from "vitest";
import { ByteBudgetByteCache } from "./byteBudgetByteCache";
import { ByteBudgetChunkCache } from "./byteBudgetChunkCache";
import { IdleRelease } from "./idleRelease";
import type { Chunk, DataType } from "zarrita";

afterEach(() => vi.useRealTimers());

const chunkOf = (bytes: number) => ({ data: new Uint8Array(bytes), shape: [bytes], stride: [1] }) as unknown as Chunk<DataType>;

describe("IdleRelease", () => {
  it("releases once, a full quiet period after the last touch", () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const idle = new IdleRelease(release, 1000);
    idle.touch();
    vi.advanceTimersByTime(700);
    idle.touch();
    vi.advanceTimersByTime(700);
    expect(release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(release).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("arms nothing until touched, and cancel disarms", () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const idle = new IdleRelease(release, 1000);
    expect(vi.getTimerCount()).toBe(0);
    idle.touch();
    idle.cancel();
    vi.advanceTimersByTime(5000);
    expect(release).not.toHaveBeenCalled();
  });
});

describe("module-level byte caches", () => {
  it("empty themselves after a quiet period, and not while read", () => {
    vi.useFakeTimers();
    const chunks = new ByteBudgetChunkCache(1000, 1000);
    const bytes = new ByteBudgetByteCache(1000, 1000);
    chunks.set("c", chunkOf(100));
    bytes.set("b", new ArrayBuffer(100));
    vi.advanceTimersByTime(900);
    expect(chunks.get("c")).toBeDefined();
    expect(bytes.get("b")).toBeDefined();
    vi.advanceTimersByTime(900);
    expect(chunks.sizeBytes).toBe(100);
    vi.advanceTimersByTime(100);
    expect(chunks.sizeBytes).toBe(0);
    expect(bytes.sizeBytes).toBe(0);
  });

  it("keep everything with idleClearMs null", () => {
    vi.useFakeTimers();
    const chunks = new ByteBudgetChunkCache(1000, null);
    chunks.set("c", chunkOf(100));
    vi.advanceTimersByTime(10 * 60_000);
    expect(chunks.sizeBytes).toBe(100);
  });
});
