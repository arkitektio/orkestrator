// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the decoder so the test counts decode work rather than exercising the
// real blurhash algorithm.
const { decode } = vi.hoisted(() => ({
  decode: vi.fn((_hash: string, w: number, h: number) => new Uint8ClampedArray(w * h * 4)),
}));
vi.mock("blurhash", () => ({ decode }));

import { blurhashToDataUrl } from "./image";

// jsdom has no 2D canvas; stub the two calls the encoder makes so each
// rasterization produces a distinct, countable data URL.
let rasterCount = 0;
const fakeCtx = {
  createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: () => {},
};

beforeEach(() => {
  decode.mockClear();
  rasterCount = 0;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => `data:image/png;base64,${++rasterCount}`);
});

describe("blurhashToDataUrl", () => {
  it("decodes and rasterizes a hash once, then serves repeat calls from the memo", () => {
    const hash = `memo-${Math.random()}`;
    const first = blurhashToDataUrl(hash);
    const second = blurhashToDataUrl(hash);
    const third = blurhashToDataUrl(hash);

    expect(first).toMatch(/^data:image\/png;base64,/);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(decode).toHaveBeenCalledTimes(1);
    expect(rasterCount).toBe(1);
  });

  it("keys the memo on the hash (and size), so different inputs decode separately", () => {
    const a = blurhashToDataUrl(`a-${Math.random()}`);
    const b = blurhashToDataUrl(`b-${Math.random()}`);
    expect(a).not.toBe(b);
    expect(decode).toHaveBeenCalledTimes(2);

    const hash = `size-${Math.random()}`;
    blurhashToDataUrl(hash, 32);
    blurhashToDataUrl(hash, 16);
    expect(decode).toHaveBeenCalledTimes(4);
    expect(decode).toHaveBeenLastCalledWith(hash, 16, 16);
  });

  it("returns undefined without caching when no 2D context is available", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    const hash = `noctx-${Math.random()}`;
    expect(blurhashToDataUrl(hash)).toBeUndefined();

    // Once a context exists again the hash is rasterized (nothing stale was memoized).
    HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    expect(blurhashToDataUrl(hash)).toMatch(/^data:image\/png;base64,/);
  });

  it("degrades to undefined on a malformed hash instead of throwing", () => {
    decode.mockImplementationOnce(() => {
      throw new Error("invalid blurhash");
    });
    expect(blurhashToDataUrl(`bad-${Math.random()}`)).toBeUndefined();
  });
});
