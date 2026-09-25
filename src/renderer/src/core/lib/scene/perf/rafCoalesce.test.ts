import { describe, expect, it } from "vitest";
import { createRafCoalescer } from "./rafCoalesce";

/** Manual rAF: collects callbacks; flush() runs one frame. */
const makeFakeRaf = () => {
  let nextHandle = 1;
  const callbacks = new Map<number, () => void>();
  return {
    raf: (cb: () => void) => {
      const handle = nextHandle++;
      callbacks.set(handle, cb);
      return handle;
    },
    caf: (handle: number) => {
      callbacks.delete(handle);
    },
    flush: () => {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((cb) => cb());
    },
    pendingCount: () => callbacks.size,
  };
};

describe("createRafCoalescer", () => {
  it("runs once per frame with the latest arguments", () => {
    const fake = makeFakeRaf();
    const runs: number[] = [];
    const coalescer = createRafCoalescer<number>((n) => runs.push(n), fake.raf, fake.caf);

    coalescer.schedule(1);
    coalescer.schedule(2);
    coalescer.schedule(3);
    expect(fake.pendingCount()).toBe(1);
    fake.flush();
    expect(runs).toEqual([3]);
  });

  it("schedules again after a frame ran", () => {
    const fake = makeFakeRaf();
    const runs: number[] = [];
    const coalescer = createRafCoalescer<number>((n) => runs.push(n), fake.raf, fake.caf);

    coalescer.schedule(1);
    fake.flush();
    coalescer.schedule(2);
    fake.flush();
    expect(runs).toEqual([1, 2]);
  });

  it("cancel drops the pending frame", () => {
    const fake = makeFakeRaf();
    const runs: number[] = [];
    const coalescer = createRafCoalescer<number>((n) => runs.push(n), fake.raf, fake.caf);

    coalescer.schedule(1);
    coalescer.cancel();
    fake.flush();
    expect(runs).toEqual([]);

    // And the coalescer still works afterwards.
    coalescer.schedule(4);
    fake.flush();
    expect(runs).toEqual([4]);
  });
});
