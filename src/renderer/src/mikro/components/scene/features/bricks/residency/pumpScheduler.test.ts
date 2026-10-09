import { describe, expect, it, vi } from "vitest";
import { scheduleBackgroundTask, type BackgroundTaskHost } from "./pumpScheduler";

describe("scheduleBackgroundTask (the upload pump's timer)", () => {
  it("posts a BACKGROUND task with the delay where the scheduler exists, and cancels through its signal", () => {
    const task = vi.fn();
    const postTask = vi.fn(
      (_cb: () => void, opts: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const host = {
      scheduler: { postTask },
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    } as unknown as BackgroundTaskHost;
    const cancel = scheduleBackgroundTask(task, 8, host);
    expect(postTask).toHaveBeenCalledTimes(1);
    const [callback, options] = postTask.mock.calls[0] as [() => void, { priority: string; delay: number; signal: AbortSignal }];
    expect(callback).toBe(task);
    expect(options.priority).toBe("background");
    expect(options.delay).toBe(8);
    expect(options.signal.aborted).toBe(false);
    expect(host.setTimeout).not.toHaveBeenCalled();
    cancel();
    expect(options.signal.aborted).toBe(true);
  });

  it("falls back to setTimeout / clearTimeout without a scheduler", () => {
    const task = vi.fn();
    const handle = { id: 7 };
    const host: BackgroundTaskHost = {
      setTimeout: vi.fn(() => handle),
      clearTimeout: vi.fn(),
    };
    const cancel = scheduleBackgroundTask(task, 8, host);
    expect(host.setTimeout).toHaveBeenCalledWith(task, 8);
    cancel();
    expect(host.clearTimeout).toHaveBeenCalledWith(handle);
  });

  it("runs the task on the real host (timer fallback in this environment)", async () => {
    vi.useFakeTimers();
    try {
      const task = vi.fn();
      const host = { setTimeout, clearTimeout } as unknown as BackgroundTaskHost;
      scheduleBackgroundTask(task, 8, host);
      expect(task).not.toHaveBeenCalled();
      vi.advanceTimersByTime(8);
      expect(task).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
