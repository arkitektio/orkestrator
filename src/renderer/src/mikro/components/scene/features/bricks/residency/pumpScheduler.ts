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
