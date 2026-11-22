import type { Chunk, DataType } from "zarrita";
import { describe, expect, it } from "vitest";
import { SharedChunkCache } from "./sharedChunkCache";

const chunkOf = (bytes: number) => ({ data: new Uint8Array(bytes), shape: [bytes], stride: [1] }) as unknown as Chunk<DataType>;

describe("SharedChunkCache", () => {
  it("holds every owner's chunks under one byte budget, evicting the least recently used", () => {
    const cache = new SharedChunkCache(300);
    const a = cache.view({});
    const b = cache.view({});
    a.set("a1", chunkOf(100));
    b.set("b1", chunkOf(100));
    a.set("a2", chunkOf(100));
    expect(cache.sizeBytes).toBe(300);

    // Owner b keeps reading; a's oldest is the one that goes.
    expect(b.get("b1")).toBeDefined();
    b.set("b2", chunkOf(100));
    expect(cache.sizeBytes).toBe(300);
    expect(a.get("a1")).toBeUndefined();
    expect(a.get("a2")).toBeDefined();
    expect(b.get("b1")).toBeDefined();
  });

  it("lets every owner read every entry", () => {
    const cache = new SharedChunkCache(1000);
    cache.view({}).set("k", chunkOf(10));
    expect(cache.view({}).get("k")).toBeDefined();
  });

  it("counts bytes per owner, and frees exactly an owner's chunks on release", () => {
    const cache = new SharedChunkCache(1000);
    const sceneA = {};
    const sceneB = {};
    cache.view(sceneA).set("a1", chunkOf(100));
    cache.view(sceneA).set("a2", chunkOf(50));
    cache.view(sceneB).set("b1", chunkOf(70));
    expect(cache.ownerSizeBytes(sceneA)).toBe(150);
    expect(cache.ownerSizeBytes(sceneB)).toBe(70);

    cache.release(sceneA);
    expect(cache.sizeBytes).toBe(70);
    expect(cache.ownerSizeBytes(sceneA)).toBe(0);
    expect(cache.get("a1")).toBeUndefined();
    expect(cache.get("b1")).toBeDefined();
  });

  it("ignores a released owner's late writes (a decode that finished after its scene closed)", () => {
    const cache = new SharedChunkCache(1000);
    const scene = {};
    const view = cache.view(scene);
    cache.release(scene);
    view.set("late", chunkOf(100));
    expect(cache.sizeBytes).toBe(0);
    expect(cache.get("late")).toBeUndefined();
  });

  it("keeps the entry just written even when it alone is over budget", () => {
    const cache = new SharedChunkCache(100);
    const view = cache.view({});
    view.set("small", chunkOf(50));
    view.set("huge", chunkOf(500));
    expect(cache.get("huge")).toBeDefined();
    expect(cache.get("small")).toBeUndefined();
  });

  it("moves an overwritten key's bytes to its new owner", () => {
    const cache = new SharedChunkCache(1000);
    const first = {};
    const second = {};
    cache.view(first).set("k", chunkOf(100));
    cache.view(second).set("k", chunkOf(40));
    expect(cache.sizeBytes).toBe(40);
    expect(cache.ownerSizeBytes(first)).toBe(0);
    expect(cache.ownerSizeBytes(second)).toBe(40);
  });
});
