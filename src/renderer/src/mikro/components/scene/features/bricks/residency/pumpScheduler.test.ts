import { describe, expect, it, vi } from "vitest";
import { scheduleBackgroundTask, scheduleIdleTask, type BackgroundTaskHost } from "./pumpScheduler";

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

describe("scheduleIdleTask (replan and reconcile, off the frame)", () => {
  /** A host whose timers and background tasks the test fires by hand. */
  const manualHost = () => {
    const timers = new Map<number, () => void>();
    let nextTimer = 1;
    const background: { run: () => void; signal: AbortSignal }[] = [];
    const host = {
      scheduler: {
        postTask: (callback: () => void, opts: { signal?: AbortSignal }) => {
          background.push({ run: callback, signal: opts.signal! });
          return new Promise(() => {});
        },
      },
      setTimeout: (callback: () => void) => {
        timers.set(nextTimer, callback);
        return nextTimer++;
      },
      clearTimeout: (handle: unknown) => {
        timers.delete(handle as number);
      },
    } as unknown as BackgroundTaskHost;
    return { host, timers, background };
  };

  it("runs once when the background task gets its gap, and drops the deadline", () => {
    const { host, timers, background } = manualHost();
    const task = vi.fn();
    scheduleIdleTask(task, 80, host);
    expect(timers.size).toBe(1);
    background[0].run();
    expect(task).toHaveBeenCalledTimes(1);
    expect(timers.size).toBe(0);
  });

  it("runs at the deadline when frames never leave a gap, and cancels the background task", () => {
    const { host, timers, background } = manualHost();
    const task = vi.fn();
    scheduleIdleTask(task, 80, host);
    [...timers.values()][0]();
    expect(task).toHaveBeenCalledTimes(1);
    expect(background[0].signal.aborted).toBe(true);
    // The background task firing late must not run it twice.
    background[0].run();
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("cancel stops both", () => {
    const { host, timers, background } = manualHost();
    const task = vi.fn();
    const cancel = scheduleIdleTask(task, 80, host);
    cancel();
    expect(timers.size).toBe(0);
    expect(background[0].signal.aborted).toBe(true);
    background[0].run();
    expect(task).not.toHaveBeenCalled();
  });

  it("is the next macrotask where there is no prioritized scheduler", () => {
    const task = vi.fn();
    const host: BackgroundTaskHost = { setTimeout: vi.fn(() => 1), clearTimeout: vi.fn() };
    scheduleIdleTask(task, 80, host);
    expect(host.setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);
  });
});
