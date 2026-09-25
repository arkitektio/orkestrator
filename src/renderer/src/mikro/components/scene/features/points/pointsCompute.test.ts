// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  IndirectStorageBufferAttribute,
  StorageInstancedBufferAttribute,
  WebGPUBackend,
} from "three/webgpu";
import * as TSL from "three/tsl";

// These cover the CPU-side contracts, which are the ones that fail SILENTLY: a wrong indirect
// word draws nothing or draws garbage, and neither raises. The TSL graphs themselves need a
// GPU to say anything about.
import { VERTICES_PER_POINT, createCullPass, loadScatterPairs } from "./pointsCompute";

describe("the indirect draw arguments", () => {
  it("lays out [vertexCount, instanceCount, firstVertex, firstInstance]", () => {
    // WebGPU's `drawIndirect` reads exactly these four u32 in this order. The count word is
    // index 1, which is both what the draw reads and what the cull pass increments — the same
    // word, so they cannot disagree.
    const indirect = new IndirectStorageBufferAttribute(
      new Uint32Array([VERTICES_PER_POINT, 0, 0, 0]),
      4,
    );
    const words = indirect.array as Uint32Array;
    expect(words[0]).toBe(6); // two triangles of a billboard quad
    expect(words[1]).toBe(0); // instanceCount — the cull pass writes this
    expect(words[2]).toBe(0);
    expect(words[3]).toBe(0);
    expect(indirect.itemSize).toBe(4);
  });

  it("starts at zero instances, so nothing draws until the cull has run", () => {
    const indirect = new IndirectStorageBufferAttribute(
      new Uint32Array([VERTICES_PER_POINT, 0, 0, 0]),
      4,
    );
    expect((indirect.array as Uint32Array)[1]).toBe(0);
  });
});

describe("loadScatterPairs", () => {
  const scatterLike = (capacity: number) => ({
    indices: { array: new Uint32Array(capacity), needsUpdate: false },
    values: { array: new Float32Array(capacity), needsUpdate: false },
    count: { value: -1 },
    floor: { value: -1 },
    capacity,
  });

  it("writes only the pairs a slice carries, and records how many", () => {
    const scatter = scatterLike(8);
    const ok = loadScatterPairs(
      scatter as never,
      [
        [2, 5],
        [5, 7],
      ],
      0,
    );
    expect(ok).toBe(true);
    // The dispatch covers the whole capacity, so the count is what stops the tail reading
    // stale pairs left by a longer slice.
    expect(scatter.count.value).toBe(2);
    expect([...(scatter.indices.array as Uint32Array).slice(0, 2)]).toEqual([2, 5]);
    expect([...(scatter.values.array as Float32Array).slice(0, 2)]).toEqual([5, 7]);
    expect(scatter.indices.needsUpdate).toBe(true);
  });

  it("carries the floor, which is what an unmentioned point becomes", () => {
    const scatter = scatterLike(4);
    loadScatterPairs(scatter as never, [[0, 1]], -3);
    expect(scatter.floor.value).toBe(-3);
  });

  it("refuses a slice larger than the capacity rather than writing past the end", () => {
    const scatter = scatterLike(2);
    const ok = loadScatterPairs(
      scatter as never,
      [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
      0,
    );
    expect(ok).toBe(false);
  });
});

/**
 * The WGSL the cull pass compiles to, built with the backend's own node builder — no GPU, no
 * device, just the text. A shader-module error is the quietest failure this layer has: the
 * pipeline is invalid, the submission is dropped, `instanceCount` stays 0 and NOTHING draws,
 * with one console line as the only witness.
 */
describe("the cull pass's WGSL", () => {
  const wgslOf = (node: unknown): string => {
    const backend = new WebGPUBackend();
    const renderer = {
      backend,
      library: null,
      hasFeature: () => false,
      getRenderTarget: () => null,
      getMRT: () => null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contextNode: (TSL as any).context({}),
      overrideNodes: {},
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder = (backend as any).createNodeBuilder(node, renderer);
    builder.build();
    return builder.computeShader as string;
  };

  const passes = () => {
    const positions = new StorageInstancedBufferAttribute(new Float32Array(8), 2);
    return createCullPass(positions, 4, 2).node as [unknown, unknown];
  };

  it("resets the count with atomicStore — WGSL has no `=` on an atomic", () => {
    const [reset] = passes();
    const wgsl = wgslOf(reset);
    expect(wgsl).toMatch(/atomicStore\( &\w+\.value\[ 1u \], 0u \)/);
    // The regression: `.assign` on the atomic indirect buffer emitted exactly this.
    expect(wgsl).not.toMatch(/\.value\[ 1u \] = /);
    // And it must run on invocation 0, the only one `compute(1)` lets through.
    expect(wgsl).not.toMatch(/instanceIndex == 1u/);
  });

  it("appends survivors through atomicAdd on the same word", () => {
    const [, cull] = passes();
    const wgsl = wgslOf(cull);
    expect(wgsl).toMatch(/atomicAdd\( &\w+\.value\[ 1u \], 1u \)/);
    expect(wgsl).not.toMatch(/\.value\[ 1u \] = /);
  });
});
