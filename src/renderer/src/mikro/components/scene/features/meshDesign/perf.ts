/**
 * User Timing marks for the designer's stages (`design:*` in a DevTools
 * Performance recording, and readable with `performance.getEntriesByType`).
 * The question they answer is always the same one: which stage is on the
 * main thread, and for how long. Async stages measure wall time — for work
 * that went to the worker that is the wait, not main-thread cost, which is
 * exactly the difference a recording shows.
 */
export async function timed<T>(name: string, work: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await work();
  } finally {
    try {
      performance.measure(`design:${name}`, { start, end: performance.now() });
    } catch {
      // Measuring must never be the thing that fails.
    }
  }
}
