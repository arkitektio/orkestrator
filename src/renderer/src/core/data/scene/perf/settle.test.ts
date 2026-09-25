import { describe, expect, it } from "vitest";
import { createSettler } from "./settle";

/** Manual timers: `advance()` fires whatever is due, `armed` counts sets. */
const makeFakeTimers = () => {
  let nextHandle = 1;
  const timers = new Map<number, () => void>();
  let armed = 0;
  return {
    setTimer: (fn: () => void) => {
      armed += 1;
      const handle = nextHandle++;
      timers.set(handle, fn);
      return handle;
    },
    clearTimer: (handle: unknown) => {
      timers.delete(handle as number);
    },
    advance: () => {
      const due = [...timers.values()];
      timers.clear();
      due.forEach((fn) => fn());
    },
    pending: () => timers.size,
    armed: () => armed,
  };
};

const settler = (emitted: string[]) => {
  const timers = makeFakeTimers();
  return {
    timers,
    it: createSettler<string>({
      delayMs: 120,
      emit: (value) => emitted.push(value),
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    }),
  };
};

describe("createSettler", () => {
  it("emits nothing until the stream goes quiet", () => {
    const emitted: string[] = [];
    const { it: s, timers } = settler(emitted);

    s.push("a");
    s.push("b");
    expect(emitted).toEqual([]);
    expect(timers.pending()).toBe(1);

    timers.advance();
    expect(emitted).toEqual(["b"]);
  });

  it("emits the LATEST value, once, for a burst", () => {
    const emitted: string[] = [];
    const { it: s, timers } = settler(emitted);

    for (const value of ["a", "b", "c", "d"]) s.push(value);
    timers.advance();

    expect(emitted).toEqual(["d"]);
  });

  it("restarts the window on every push, so a moving cursor never settles", () => {
    const emitted: string[] = [];
    const { it: s, timers } = settler(emitted);

    s.push("a");
    s.push("b");
    // Only one timer is ever outstanding — the previous is cleared, not stacked.
    expect(timers.pending()).toBe(1);
    timers.advance();
    expect(emitted).toEqual(["b"]);

    // A quiet period followed by a new push settles again.
    s.push("c");
    timers.advance();
    expect(emitted).toEqual(["b", "c"]);
  });

  it("flush emits immediately and drops a pending settle", () => {
    const emitted: string[] = [];
    const { it: s, timers } = settler(emitted);

    s.push("stale");
    s.flush("now");

    expect(emitted).toEqual(["now"]);
    expect(timers.pending()).toBe(0);

    // The dropped value must not resurface and overwrite the flushed one.
    timers.advance();
    expect(emitted).toEqual(["now"]);
  });

  it("cancel drops the pending value without emitting", () => {
    const emitted: string[] = [];
    const { it: s, timers } = settler(emitted);

    s.push("a");
    s.cancel();
    timers.advance();

    expect(emitted).toEqual([]);
    expect(timers.pending()).toBe(0);
  });

  it("arms a timer per push but leaves only one outstanding", () => {
    const emitted: string[] = [];
    const { it: s, timers } = settler(emitted);

    for (let i = 0; i < 5; i++) s.push(String(i));
    expect(timers.armed()).toBe(5);
    expect(timers.pending()).toBe(1);
  });
});
