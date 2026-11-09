/**
 * The off-frame upload pump's timer.
 *
 * The pump drains bricks between animation frames. As a plain `setTimeout`
 * it competed with the frame on equal terms: the scheduler ran it whenever it
 * fell due, and a slice landing just before a vsync delayed that frame — the
 * stutter felt while a large volume streams. Chromium's prioritized task
 * scheduling (`scheduler.postTask`) runs a `background` task only when
 * nothing of higher priority — rendering, input — is waiting, so a pending
 * pump never delays a frame; its slice length (`PUMP_MAX_MS`) bounds what a
 * running one can. Where the API is missing (a jsdom test, another engine)
 * the timer is what it was.
 */

type PostTask = (
  callback: () => void,
  options: { priority?: "user-blocking" | "user-visible" | "background"; delay?: number; signal?: AbortSignal },
) => Promise<unknown>;

export type BackgroundTaskHost = {
  scheduler?: { postTask?: PostTask };
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

/** Run `task` after `delayMs` at background priority; returns its cancel. */
export function scheduleBackgroundTask(
  task: () => void,
  delayMs: number,
  host: BackgroundTaskHost = globalThis as unknown as BackgroundTaskHost,
): () => void {
  const postTask = host.scheduler?.postTask;
  if (typeof postTask === "function") {
    const controller = new AbortController();
    postTask
      .call(host.scheduler, task, { priority: "background", delay: delayMs, signal: controller.signal })
      // A cancelled task rejects with its abort reason; nothing waits on it.
      .catch(() => {});
    return () => controller.abort();
  }
  const handle = host.setTimeout(task, delayMs);
  return () => host.clearTimeout(handle);
}

/**
 * Run `task` when the main thread has nothing more urgent — but no later than
 * `deadlineMs` from now.
 *
 * For main-thread work that is owed SOON but belongs to no frame: the replan
 * and the residency reconcile. Both used to run inside a
 * `requestAnimationFrame` callback, i.e. in the same task as a frame, before
 * its paint — several milliseconds of planning charged to whichever frame of
 * an orbit they happened to fall on, which is a dropped frame at 60 Hz. As a
 * background task they wait for a gap between frames instead.
 *
 * The deadline is what makes that safe: a background task can be held off
 * for as long as higher-priority work keeps arriving, and a plan that never
 * runs is a view that never sharpens. Whichever of the two fires first runs
 * the task; the other is cancelled.
 */
export function scheduleIdleTask(
  task: () => void,
  deadlineMs: number,
  host: BackgroundTaskHost = globalThis as unknown as BackgroundTaskHost,
): () => void {
  let done = false;
  let cancelBackground: (() => void) | null = null;
  let deadlineHandle: unknown = null;
  const run = () => {
    if (done) return;
    done = true;
    cancelBackground?.();
    if (deadlineHandle !== null) host.clearTimeout(deadlineHandle);
    task();
  };
  if (typeof host.scheduler?.postTask === "function") {
    deadlineHandle = host.setTimeout(run, deadlineMs);
    cancelBackground = scheduleBackgroundTask(run, 0, host);
  } else {
    // No prioritized scheduler: the next macrotask is the nearest thing to
    // "off the frame" there is, and needs no deadline.
    deadlineHandle = host.setTimeout(run, 0);
  }
  return () => {
    if (done) return;
    done = true;
    cancelBackground?.();
    if (deadlineHandle !== null) host.clearTimeout(deadlineHandle);
  };
}
