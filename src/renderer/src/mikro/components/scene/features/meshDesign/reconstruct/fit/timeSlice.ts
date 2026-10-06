/**
 * Cooperative time-slicing for the fits. They have to run on the main thread
 * — they read voxels out of the resident brick cache, which lives there —
 * so instead of leaving it they give it back: `tick()` resolves immediately
 * while the current slice has budget left, and yields to the event loop
 * (input, a frame) once it is spent.
 */

const yieldToEventLoop = (): Promise<void> =>
  new Promise((resolve) => {
    // A message task, not a timer: nested timeouts are clamped to 4 ms.
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });

export type TimeSlicer = {
  /** Await between units of work; yields when the slice's budget is spent. */
  tick: () => Promise<void>;
};

/** `budgetMs` of work per slice — half a 60 Hz frame by default. */
export const createTimeSlicer = (budgetMs = 8): TimeSlicer => {
  let sliceStart = performance.now();
  return {
    tick: async () => {
      if (performance.now() - sliceStart < budgetMs) return;
      await yieldToEventLoop();
      sliceStart = performance.now();
    },
  };
};
