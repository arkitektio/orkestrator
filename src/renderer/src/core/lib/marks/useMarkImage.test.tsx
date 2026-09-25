// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { cacheSet, clearMarkCache, markKey, markPixels, markSimple } from "./markCache";
import { useMarkImage } from "./useMarkImage";

const input = {
  name: "Napari Viewer",
  identifier: "org.example.napari-viewer",
  size: 56,
};

const keyFor = (over: Partial<typeof input> = {}) => {
  const i = { ...input, ...over };
  return markKey({
    name: i.name,
    identifier: i.identifier,
    px: markPixels(i.size),
    simple: markSimple(i.size),
  });
};

afterEach(() => clearMarkCache());

describe("useMarkImage", () => {
  it("returns a cached mark synchronously, with no flash on the first render", () => {
    // This is what the module-level cache buys: going grid → detail → back
    // repaints every icon immediately instead of re-encoding forty PNGs.
    cacheSet(keyFor(), "data:image/png;base64,CACHED");
    const { result } = renderHook(() => useMarkImage(input));

    expect(result.current.src).toBe("data:image/png;base64,CACHED");
    expect(result.current.pending).toBe(false);
  });

  it("reports pending on a miss and never throws without WebGL", async () => {
    const { result } = renderHook(() => useMarkImage(input));

    expect(result.current.src).toBeNull();
    expect(result.current.pending).toBe(true);
    // jsdom has no WebGL, so the queue resolves to null rather than a PNG.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(result.current.src).toBeNull();
  });

  it("does no work at all when passed null", () => {
    const { result } = renderHook(() => useMarkImage(null));
    expect(result.current).toEqual({ src: null, pending: false });
  });

  it("picks up the new mark when the app changes", async () => {
    cacheSet(keyFor(), "data:image/png;base64,ONE");
    cacheSet(keyFor({ identifier: "org.example.other" }), "data:image/png;base64,TWO");

    const { result, rerender } = renderHook((props: typeof input) => useMarkImage(props), {
      initialProps: input,
    });
    expect(result.current.src).toBe("data:image/png;base64,ONE");

    rerender({ ...input, identifier: "org.example.other" });
    await waitFor(() => expect(result.current.src).toBe("data:image/png;base64,TWO"));
  });

  it("survives unmounting while a render is still queued", () => {
    const { unmount } = renderHook(() => useMarkImage(input));
    expect(() => unmount()).not.toThrow();
  });
});
