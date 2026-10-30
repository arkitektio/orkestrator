// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const three = { invalidate: vi.fn() };
vi.mock("@react-three/fiber", () => ({
  useThree: (select: (state: typeof three) => unknown) => select(three),
}));

const { useDrawEffect } = await import("./useDrawEffect");

describe("useDrawEffect", () => {
  beforeEach(() => {
    three.invalidate.mockClear();
  });

  it("asks for a frame after the write, not before", () => {
    const calls: string[] = [];
    three.invalidate.mockImplementationOnce(() => calls.push("frame"));
    renderHook(() => useDrawEffect(() => void calls.push("write"), []));
    expect(calls).toEqual(["write", "frame"]);
  });

  it("writes and asks again only when a dep changes", () => {
    const write = vi.fn();
    const { rerender } = renderHook(({ value }) => useDrawEffect(write, [value]), {
      initialProps: { value: 1 },
    });
    rerender({ value: 1 });
    expect(write).toHaveBeenCalledTimes(1);
    expect(three.invalidate).toHaveBeenCalledTimes(1);

    rerender({ value: 2 });
    expect(write).toHaveBeenCalledTimes(2);
    expect(three.invalidate).toHaveBeenCalledTimes(2);
  });

  it("asks for a frame even when the write returned early", () => {
    renderHook(() => useDrawEffect(() => undefined, []));
    expect(three.invalidate).toHaveBeenCalledTimes(1);
  });

  it("runs the write's cleanup", () => {
    const cleanup = vi.fn();
    const { unmount } = renderHook(() => useDrawEffect(() => cleanup, []));
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
