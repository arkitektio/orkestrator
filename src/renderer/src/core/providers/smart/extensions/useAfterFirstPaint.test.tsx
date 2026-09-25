// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAfterFirstPaint } from "./useAfterFirstPaint";

describe("useAfterFirstPaint", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is false on the first render and true after the first frame", () => {
    const { result } = renderHook(() => useAfterFirstPaint());
    expect(result.current).toBe(false);
    act(() => {
      vi.advanceTimersToNextFrame();
    });
    expect(result.current).toBe(true);
  });

  it("cancels the frame on unmount", () => {
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const { unmount } = renderHook(() => useAfterFirstPaint());
    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
    cancel.mockRestore();
  });
});
