import { describe, expect, it } from "vitest";
import { createLeadingThrottle } from "./leadingThrottle";

/** Manual clock + timer queue, in the style of `rafCoalesce.test.ts`. */
const makeHarness = (intervalMs = 120) => {
  let clock = 0;
  let nextHandle = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const runs: number[] = [];

  const throttle = createLeadingThrottle({
    intervalMs,
    run: () => runs.push(clock),
    now: () => clock,
    setTimer: (fn, ms) => {
      const handle = nextHandle++;
      timers.set(handle, { at: clock + ms, fn });
      return handle;
    },
    clearTimer: (handle) => {
      timers.delete(handle as number);
    },
  });

  return {
    throttle,
    runs,
    pending: () => timers.size,
    /** Advance the clock, firing any timer whose deadline passes. */
    advance(ms: number) {
      const target = clock + ms;
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        clock = due[1].at;
        due[1].fn();
      }
      clock = target;
    },
  };
};

describe("createLeadingThrottle", () => {
  it("runs the FIRST trigger immediately", () => {
    const h = makeHarness();
    h.throttle.trigger();
    expect(h.runs).toEqual([0]);
  });

  it("defers a trigger inside the window to the end of it, once", () => {
    const h = makeHarness(120);
    h.throttle.trigger(); // runs at 0
    h.advance(10);
    h.throttle.trigger();
    h.throttle.trigger();
    h.throttle.trigger();
    expect(h.runs).toEqual([0]); // still only the leading run
    expect(h.pending()).toBe(1); // and exactly one trailing timer
    h.advance(200);
    expect(h.runs).toEqual([0, 120]);
  });

  it("never drops the last event", () => {
    const h = makeHarness(120);
    h.throttle.trigger();
    h.advance(119);
    h.throttle.trigger(); // one tick before the window closes
    h.advance(500);
    expect(h.runs).toEqual([0, 120]);
  });

  it("runs immediately again once the window has passed", () => {
    const h = makeHarness(120);
    h.throttle.trigger();
    h.advance(300);
    h.throttle.trigger();
    expect(h.runs).toEqual([0, 300]);
    expect(h.pending()).toBe(0);
  });

  it("cancel() drops a pending trailing run", () => {
    const h = makeHarness(120);
    h.throttle.trigger();
    h.advance(10);
    h.throttle.trigger();
    expect(h.pending()).toBe(1);
    h.throttle.cancel();
    h.advance(500);
    expect(h.runs).toEqual([0]);
  });
});
