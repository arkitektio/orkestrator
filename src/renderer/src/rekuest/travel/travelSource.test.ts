import { describe, expect, it, vi } from "vitest";
import {
  createTravelSource,
  EMPTY_TRAVEL_STATE,
  parseTimestamp,
  type TravelCheckout,
  type TravelPatch,
  type TravelRequest,
  type TravelSourceOptions,
} from "./travelSource";

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);
/** The moment most tests travel to: a minute ago. */
const BASE = NOW - 60_000;

type Call = {
  agentId: string;
  request: TravelRequest;
  resolve: (answer: TravelCheckout) => void;
  reject: (error: unknown) => void;
};

/** A source with a hand-driven wall clock, frames, timers and checkouts. */
const makeSource = (overrides: Partial<TravelSourceOptions> = {}) => {
  let wall = NOW;
  const frames: Array<{ cb: () => void; cancelled: boolean }> = [];
  const timers: Array<{ cb: () => void; ms: number; cancelled: boolean }> = [];
  const calls: Call[] = [];
  const checkout = vi.fn(
    (agentId: string, request: TravelRequest) =>
      new Promise<TravelCheckout>((resolve, reject) => {
        calls.push({ agentId, request, resolve, reject });
      }),
  );
  const onReachedLive = vi.fn();

  const source = createTravelSource({
    checkout,
    now: () => wall,
    schedule: (cb) => {
      const frame = { cb, cancelled: false };
      frames.push(frame);
      return frame;
    },
    cancel: (handle) => {
      (handle as { cancelled: boolean }).cancelled = true;
    },
    setTimer: (cb, ms) => {
      const timer = { cb, ms, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (handle) => {
      (handle as { cancelled: boolean }).cancelled = true;
    },
    windowSize: 4,
    debounceMs: 150,
    onReachedLive,
    ...overrides,
  });

  return {
    source,
    checkout,
    calls,
    onReachedLive,
    advance: (ms: number) => {
      wall += ms;
    },
    /** Run the frame that is waiting, if any. */
    runFrame: () => {
      frames.splice(0).forEach((frame) => !frame.cancelled && frame.cb());
    },
    pendingFrames: () => frames.filter((frame) => !frame.cancelled).length,
    runTimers: () => {
      timers.splice(0).forEach((timer) => !timer.cancelled && timer.cb());
    },
    pendingTimers: () => timers.filter((timer) => !timer.cancelled).length,
  };
};

/** Let the answers that were resolved reach the source. */
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const patch = (
  stateInterface: string,
  path: string,
  value: unknown,
  ms: number,
  revision: number,
): TravelPatch => ({
  id: `${stateInterface}-${revision}`,
  interface: stateInterface,
  op: "replace",
  path,
  value,
  timestamp: new Date(ms).toISOString(),
  globalFutureRevision: revision,
});

const answer = (
  values: Record<string, unknown> | null,
  forwardPatches: TravelPatch[] = [],
  backwardPatches: TravelPatch[] = [],
): TravelCheckout => ({ values, globalRevision: 1, forwardPatches, backwardPatches });

describe("parseTimestamp", () => {
  it("reads a datetime without an offset as UTC", () => {
    expect(parseTimestamp("2026-10-13T12:00:00.250")).toBe(NOW + 250);
  });

  it("honours an offset and survives microseconds", () => {
    expect(parseTimestamp("2026-10-13T14:00:00.250000+02:00")).toBe(NOW + 250);
    expect(parseTimestamp("2026-10-13T12:00:00.250Z")).toBe(NOW + 250);
  });
});

describe("travelSource checkouts", () => {
  it("asks once per agent, however many states and consumers watch it", () => {
    const { source, checkout } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    source.acquire("a", "Stage", () => {});
    source.acquire("a", "Lamp", () => {});
    source.acquire("b", "Stage", () => {});

    expect(checkout).toHaveBeenCalledTimes(2);
    expect(checkout.mock.calls.map(([agentId]) => agentId)).toEqual(["a", "b"]);
    expect(checkout.mock.calls[0][1].timestamp).toBe(BASE);
    expect(checkout.mock.calls[0][1].forwardPatchCount).toBe(4);
  });

  it("is unknown until answered, then tells a recorded state from none", async () => {
    const { source, calls } = makeSource();
    const listener = vi.fn();
    source.seek(BASE, true);
    source.acquire("a", "Stage", listener);
    source.acquire("a", "assets", () => {});

    expect(source.getSnapshot("a", "Stage")).toBe(EMPTY_TRAVEL_STATE);
    expect(source.getClock().phase).toBe("loading");

    calls[0].resolve(answer({ Stage: { x: 3 } }));
    await settle();

    expect(source.getSnapshot("a", "Stage")).toEqual({ value: { x: 3 }, revision: 1, known: true });
    expect(source.getSnapshot("a", "assets")).toEqual({ value: null, revision: 1, known: true });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(source.getClock().phase).toBe("ready");
    expect(source.getClock().missing).toEqual([]);
  });

  it("names an agent that has nothing recorded for what is watched", async () => {
    const { source, calls } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(answer(null));
    await settle();

    expect(source.getSnapshot("a", "Stage").known).toBe(true);
    expect(source.getClock().missing).toEqual(["a"]);
  });

  it("debounces a dragged seek, keeps what is shown, and drops a stale answer", async () => {
    const { source, calls, checkout, runTimers, pendingTimers } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(answer({ Stage: { x: 0 } }));
    await settle();

    source.seek(BASE - 10_000);
    source.seek(BASE - 20_000);
    expect(pendingTimers()).toBe(1);
    expect(checkout).toHaveBeenCalledTimes(1);
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 0 });
    expect(source.getClock().phase).toBe("loading");

    runTimers();
    expect(checkout).toHaveBeenCalledTimes(2);
    expect(calls[1].request.timestamp).toBe(BASE - 20_000);

    source.seek(BASE - 30_000, true);
    expect(checkout).toHaveBeenCalledTimes(3);

    calls[1].resolve(answer({ Stage: { x: -20 } }));
    await settle();
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 0 });

    calls[2].resolve(answer({ Stage: { x: -30 } }));
    await settle();
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: -30 });
    expect(source.getClock().phase).toBe("ready");
  });

  it("lists an agent whose checkout failed and goes on with the others", async () => {
    const { source, calls } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    source.acquire("b", "Stage", () => {});
    calls[0].reject(new Error("no such agent"));
    calls[1].resolve(answer({ Stage: { x: 1 } }));
    await settle();

    expect(source.getSnapshot("a", "Stage")).toEqual({ value: null, revision: null, known: true });
    expect(source.getSnapshot("b", "Stage").value).toEqual({ x: 1 });
    expect(source.getClock().missing).toEqual(["a"]);
    expect(source.getClock().error).toBe("no such agent");
    expect(source.getClock().phase).toBe("ready");
  });

  it("ignores an answer for an agent nobody watches any more, and starts over when asked again", async () => {
    const { source, calls, checkout } = makeSource();
    const listener = vi.fn();
    source.seek(BASE, true);
    const release = source.acquire("a", "Stage", listener);
    release();
    release();
    calls[0].resolve(answer({ Stage: { x: 1 } }));
    await settle();

    expect(listener).not.toHaveBeenCalled();
    expect(source.getSnapshot("a", "Stage")).toBe(EMPTY_TRAVEL_STATE);

    source.acquire("a", "Stage", listener);
    expect(checkout).toHaveBeenCalledTimes(2);
  });
});

describe("travelSource buffer", () => {
  it("applies patches in time order whatever order they came in, one state at a time", async () => {
    const { source, calls } = makeSource();
    const lamp = vi.fn();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    source.acquire("a", "Lamp", lamp);
    calls[0].resolve(
      answer({ Stage: { x: 0 }, Lamp: { on: false } }, [
        patch("Stage", "/x", 2, BASE + 2000, 3),
        patch("Stage", "/x", 1, BASE + 1000, 2),
      ]),
    );
    await settle();
    const lampBefore = source.getSnapshot("a", "Lamp");
    lamp.mockClear();

    source.seek(BASE + 1500);

    expect(source.getSnapshot("a", "Stage")).toEqual({ value: { x: 1 }, revision: 2, known: true });
    expect(source.getSnapshot("a", "Lamp")).toBe(lampBefore);
    expect(lamp).not.toHaveBeenCalled();
  });

  it("answers any moment inside the window without asking, in both directions", async () => {
    const { source, calls, checkout, pendingTimers } = makeSource();
    const values = { Stage: { x: 0 } };
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(
      answer(values, [patch("Stage", "/x", 1, BASE + 1000, 2), patch("Stage", "/x", 2, BASE + 2000, 3)]),
    );
    await settle();

    source.seek(BASE + 2500);
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 2 });
    source.seek(BASE + 1500);
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 1 });
    source.seek(BASE);
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 0 });

    expect(checkout).toHaveBeenCalledTimes(1);
    expect(pendingTimers()).toBe(0);
    expect(values).toEqual({ Stage: { x: 0 } });
  });

  it("steps over the changes of every watched state, and only those", async () => {
    const { source, calls, checkout } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    source.acquire("b", "Lamp", () => {});
    calls[0].resolve(
      answer(
        { Stage: { x: 0 }, Other: { n: 0 } },
        [patch("Other", "/n", 1, BASE + 500, 5), patch("Stage", "/x", 1, BASE + 3000, 6)],
        [patch("Other", "/n", 0, BASE - 1000, 4), patch("Stage", "/x", 0, BASE - 5000, 3)],
      ),
    );
    calls[1].resolve(
      answer(
        { Lamp: { on: false } },
        [patch("Lamp", "/on", true, BASE + 1000, 2)],
        [patch("Lamp", "/on", false, BASE - 2000, 1)],
      ),
    );
    await settle();

    expect(source.getClock().prevChangeAt).toBe(BASE - 2000);
    expect(source.getClock().nextChangeAt).toBe(BASE + 1000);

    source.step(1);
    expect(source.getClock().at).toBe(BASE + 1000);
    expect(source.getSnapshot("b", "Lamp").value).toEqual({ on: true });
    expect(source.getClock().prevChangeAt).toBe(BASE + 1000);
    expect(source.getClock().nextChangeAt).toBe(BASE + 3000);
    expect(checkout).toHaveBeenCalledTimes(2);

    source.step(-1);
    // Just before the change it stood on: the lamp is off again.
    expect(source.getClock().at).toBe(BASE + 999);
    expect(source.getSnapshot("b", "Lamp").value).toEqual({ on: false });

    source.step(-1);
    expect(source.getClock().at).toBe(BASE - 2001);
    expect(checkout).toHaveBeenCalledTimes(4);
    expect(calls[2].request.timestamp).toBe(BASE - 2001);
  });
});

describe("travelSource pending step", () => {
  it("takes a step asked before anything watches as soon as the answer is there", async () => {
    const { source, calls } = makeSource();
    source.seek(NOW, true);
    source.step(-1);
    expect(source.getClock().at).toBe(NOW);

    source.acquire("a", "Stage", () => {});
    calls[0].resolve(answer({ Stage: { x: 2 } }, [], [patch("Stage", "/x", 2, NOW - 30_000, 7)]));
    await settle();

    expect(source.getClock().at).toBe(NOW - 30_001);
    expect(calls[1].request.timestamp).toBe(NOW - 30_001);
  });

  it("forgets the step when the clock is moved by hand first", async () => {
    const { source, calls } = makeSource();
    source.seek(NOW, true);
    source.step(-1);
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(answer({ Stage: { x: 2 } }, [], [patch("Stage", "/x", 2, BASE - 30_000, 7)]));
    await settle();

    expect(source.getClock().at).toBe(BASE);
  });
});

describe("travelSource playback", () => {
  it("applies each patch as the clock passes it", async () => {
    const { source, calls, advance, runFrame } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(
      answer({ Stage: { x: 0 } }, [
        patch("Stage", "/x", 1, BASE + 1000, 2),
        patch("Stage", "/x", 2, BASE + 2000, 3),
      ]),
    );
    await settle();

    source.play();
    expect(source.getClock().playing).toBe(true);

    advance(1000);
    runFrame();
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 1 });
    advance(500);
    runFrame();
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 1 });
    advance(600);
    runFrame();
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 2 });
    expect(source.getClock().at).toBe(BASE + 2100);
  });

  it("holds at the end of a full window, asks for the next, and goes on without a jump", async () => {
    const { source, calls, checkout, advance, runFrame } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(
      answer(
        { Stage: { x: 0 } },
        [1, 2, 3, 4].map((n) => patch("Stage", "/x", n, BASE + n * 1000, n + 1)),
      ),
    );
    await settle();

    source.play();
    advance(5000);
    runFrame();
    // The last millisecond of a full window belongs to the next one.
    expect(source.getClock().at).toBe(BASE + 3999);
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 3 });
    expect(checkout).toHaveBeenCalledTimes(2);
    expect(calls[1].request.timestamp).toBe(BASE + 3999);

    advance(1000);
    runFrame();
    expect(source.getClock().at).toBe(BASE + 3999);
    expect(checkout).toHaveBeenCalledTimes(2);

    calls[1].resolve(answer({ Stage: { x: 3 } }, [patch("Stage", "/x", 4, BASE + 4000, 5)]));
    await settle();
    advance(100);
    runFrame();
    expect(source.getClock().at).toBe(BASE + 4099);
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 4 });
  });

  it("plays on from where it is seeked to", async () => {
    const { source, calls, advance, runFrame } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(answer({ Stage: { x: 0 } }, [patch("Stage", "/x", 1, BASE + 10_000, 2)]));
    await settle();

    source.play(4);
    advance(1000);
    runFrame();
    expect(source.getClock().at).toBe(BASE + 4000);

    source.seek(BASE + 9000);
    expect(source.getClock().playing).toBe(true);
    advance(500);
    runFrame();
    expect(source.getClock().at).toBe(BASE + 11_000);
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 1 });
  });

  it("pauses and says so once when it catches up with the present", async () => {
    const { source, calls, onReachedLive, advance, runFrame, pendingFrames } = makeSource();
    source.seek(NOW - 10_000, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(answer({ Stage: { x: 0 } }));
    await settle();

    source.play(16);
    advance(1000);
    runFrame();

    expect(source.getClock().playing).toBe(false);
    expect(source.getClock().at).toBe(NOW);
    expect(onReachedLive).toHaveBeenCalledTimes(1);
    expect(pendingFrames()).toBe(0);
  });

  it("can be stopped and used again", async () => {
    const { source, calls, checkout, advance, runFrame, pendingFrames, pendingTimers } = makeSource();
    source.seek(BASE, true);
    source.acquire("a", "Stage", () => {});
    calls[0].resolve(answer({ Stage: { x: 0 } }, [patch("Stage", "/x", 1, BASE + 1000, 2)]));
    await settle();

    source.play();
    source.seek(BASE - 5000);
    source.stop();
    expect(pendingFrames()).toBe(0);
    expect(pendingTimers()).toBe(0);
    expect(source.getClock().playing).toBe(false);

    // Back inside the window it still holds: nothing to ask for.
    source.seek(BASE, true);
    expect(checkout).toHaveBeenCalledTimes(1);
    source.play();
    advance(1200);
    runFrame();
    expect(source.getSnapshot("a", "Stage").value).toEqual({ x: 1 });
  });
});

describe("travelSource revisions", () => {
  /** Revision `n` of session `s`, recorded `n` seconds after BASE (unless told otherwise). */
  const rev = (n: number, value: unknown, ms = BASE + n * 1000, stateInterface = "arm"): TravelPatch => ({
    ...patch(stateInterface, "/x", value, ms, n),
    sessionId: "s",
  });

  it("checks out below the revision asked for, and steps back and on without asking", async () => {
    const { source, calls } = makeSource();
    source.acquire("a", "arm", () => {});
    await settle();
    calls.length = 0;

    source.seekRevision("a", { revision: 10, sessionId: "s" });
    expect(calls).toHaveLength(1);
    expect(calls[0].agentId).toBe("a");
    expect(calls[0].request.revision).toEqual({ globalRevision: 8, sessionId: "s" });
    expect(source.getClock().phase).toBe("loading");

    calls[0].resolve(answer({ arm: { x: 8 } }, [rev(9, 9), rev(10, 10), rev(11, 11)], [rev(7, 7), rev(8, 8)]));
    await settle();

    expect(source.getSnapshot("a", "arm")).toMatchObject({ value: { x: 10 }, revision: 10, known: true });
    expect(source.getClock()).toMatchObject({
      phase: "ready",
      at: BASE + 10_000,
      revision: {
        agentId: "a",
        sessionId: "s",
        revision: 10,
        hasPrev: true,
        hasNext: true,
        changes: [{ interface: "arm", op: "replace", path: "/x" }],
      },
    });

    source.step(-1);
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 9 });
    source.step(-1);
    // The revision the checkout was taken at: what it changed is among the changes before it.
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 8 });
    expect(source.getClock()).toMatchObject({ at: BASE + 8000, revision: { revision: 8, hasPrev: true } });
    source.step(1);
    source.step(1);
    source.step(1);
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 11 });
    // A window that came back short holds the session's last revision.
    expect(source.getClock().revision).toMatchObject({ revision: 11, hasNext: false });
    source.step(1);
    expect(source.getClock().revision?.revision).toBe(11);
    expect(calls).toHaveLength(1);

    // Below the checkout it asks again, for the revision the server told of.
    source.seekRevision("a", { revision: 8 });
    source.step(-1);
    expect(calls).toHaveLength(2);
    expect(calls[1].request.revision).toEqual({ globalRevision: 5, sessionId: "s" });
  });

  it("tells two revisions of one millisecond apart", async () => {
    const { source, calls } = makeSource();
    source.acquire("a", "arm", () => {});
    await settle();
    calls.length = 0;

    source.seekRevision("a", { revision: 2, sessionId: "s" });
    calls[0].resolve(answer({ arm: { x: 0 } }, [rev(1, 1, BASE), rev(2, 2, BASE), rev(3, 3, BASE)]));
    await settle();

    expect(calls[0].request.revision).toEqual({ globalRevision: 0, sessionId: "s" });
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 2 });
    source.step(-1);
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 1 });
    source.step(-1);
    // The start of the session: nothing before it, and nothing it changed.
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 0 });
    expect(source.getClock().revision).toMatchObject({ revision: 0, hasPrev: false, changes: [] });
  });

  it("finds the revision and the session the agent is at where the clock stands", async () => {
    const { source, calls } = makeSource();
    source.acquire("a", "arm", () => {});
    source.seek(BASE, true);
    await settle();
    calls.length = 0;

    source.seekRevision("a");
    expect(calls[0].request).toMatchObject({ timestamp: BASE, revision: { globalRevision: null, sessionId: null } });
    expect(source.getClock().revision).toMatchObject({ agentId: "a", revision: null, sessionId: null });

    calls[0].resolve(answer({ arm: { x: 5 } }, [rev(6, 6)], [rev(4, 4, BASE - 2000), rev(5, 5, BASE - 1000)]));
    await settle();
    expect(source.getClock()).toMatchObject({ at: BASE - 1000, revision: { revision: 5, sessionId: "s" } });
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 5 });
  });

  it("lands on the latest revision before one the session does not have", async () => {
    const { source, calls } = makeSource();
    source.acquire("a", "arm", () => {});
    await settle();
    calls.length = 0;

    // Past the end of the session.
    source.seekRevision("a", { revision: 900, sessionId: "s" });
    calls[0].resolve(answer({ arm: { x: 12 } }, [], [rev(11, 11), rev(12, 12)]));
    await settle();
    expect(source.getClock().revision).toMatchObject({ revision: 12, hasNext: false, hasPrev: true });
    expect(calls).toHaveLength(1);

    // A step never lands in a gap: 12 is followed by 15.
    source.seekRevision("a", { revision: 14, sessionId: "s" });
    calls[1].resolve(answer({ arm: { x: 12 } }, [rev(15, 15)], [rev(12, 12)]));
    await settle();
    expect(source.getClock().revision?.revision).toBe(12);
    source.step(1);
    expect(source.getClock().revision?.revision).toBe(15);
  });

  it("asks for the next window at the end of a full one, and takes the step when it is there", async () => {
    const { source, calls } = makeSource();
    source.acquire("a", "arm", () => {});
    await settle();
    calls.length = 0;

    source.seekRevision("a", { revision: 4, sessionId: "s" });
    calls[0].resolve(answer({ arm: { x: 2 } }, [rev(3, 3), rev(4, 4), rev(5, 5), rev(6, 6)], [rev(2, 2)]));
    await settle();
    source.step(1);
    source.step(1);
    expect(source.getClock().revision).toMatchObject({ revision: 6, hasNext: true });
    expect(calls).toHaveLength(1);

    source.step(1);
    expect(calls).toHaveLength(2);
    expect(calls[1].request.revision).toEqual({ globalRevision: 4, sessionId: "s" });
    // What is shown stays until the window is there.
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 6 });
    calls[1].resolve(answer({ arm: { x: 4 } }, [rev(5, 5), rev(6, 6), rev(7, 7)], [rev(4, 4)]));
    await settle();
    expect(source.getClock().revision).toMatchObject({ revision: 7, hasNext: false });
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 7 });
  });

  it("takes every other agent to the moment of the revision, and back to the clock on a seek", async () => {
    const { source, calls } = makeSource();
    source.acquire("a", "arm", () => {});
    source.acquire("b", "stage", () => {});
    await settle();
    calls.length = 0;

    source.seekRevision("a", { revision: 3, sessionId: "s" });
    expect(calls.map((call) => call.agentId)).toEqual(["a"]);
    calls[0].resolve(answer({ arm: { x: 1 } }, [rev(2, 2), rev(3, 3)], [rev(1, 1)]));
    await settle();

    // "b" has no revision to stand on: it is asked for the moment "a" changed.
    expect(calls).toHaveLength(2);
    expect(calls[1].agentId).toBe("b");
    expect(calls[1].request.timestamp).toBe(BASE + 3000);
    expect(calls[1].request.revision).toBeUndefined();
    calls[1].resolve(answer({ stage: { y: 1 } }));
    await settle();
    expect(source.getClock().phase).toBe("ready");
    expect(source.getSnapshot("b", "stage").value).toEqual({ y: 1 });

    source.seek(BASE + 2500, true);
    expect(source.getClock().revision).toBeNull();
    // "a" follows the clock again, so its checkout at a revision no longer answers.
    const again = calls.slice(2).find((call) => call.agentId === "a");
    expect(again?.request).toMatchObject({ timestamp: BASE + 2500 });
    expect(again?.request.revision).toBeUndefined();
  });

  it("says how far the session reaches, and debounces a dragged slider", async () => {
    const ends: Array<(last: number | null) => void> = [];
    const sessionEnd = vi.fn(() => new Promise<number | null>((resolve) => ends.push(resolve)));
    const { source, calls, runTimers } = makeSource({ sessionEnd });

    source.seekRevision("a", { revision: 4, sessionId: "s" });
    source.acquire("a", "arm", () => {});
    expect(calls).toHaveLength(1);
    calls[0].resolve(answer({ arm: { x: 2 } }, [rev(3, 3), rev(4, 4), rev(5, 5), rev(6, 6)], [rev(2, 2)]));
    await settle();
    // A full window does not say where the session ends: that is asked, once.
    expect(source.getClock().revision?.last).toBeNull();
    expect(sessionEnd).toHaveBeenCalledWith("a", "s");
    ends[0](40);
    await settle();
    expect(source.getClock().revision?.last).toBe(40);

    // Dragged: inside the window it shows at once, outside it waits for the hand to rest.
    source.seekRevision("a", { revision: 5 }, false);
    expect(source.getSnapshot("a", "arm").value).toEqual({ x: 5 });
    source.seekRevision("a", { revision: 20 }, false);
    source.seekRevision("a", { revision: 30 }, false);
    expect(calls).toHaveLength(1);
    runTimers();
    expect(calls).toHaveLength(2);
    expect(calls[1].request.revision).toEqual({ globalRevision: 28, sessionId: "s" });

    // The session has grown since it was measured: a window that ends short says so.
    calls[1].resolve(answer({ arm: { x: 28 } }, [rev(29, 29), rev(30, 30), rev(42, 42)], [rev(28, 28)]));
    await settle();
    expect(source.getClock().revision).toMatchObject({ revision: 30, last: 42 });
    expect(sessionEnd).toHaveBeenCalledTimes(1);
  });

  it("steps an agent no blok watches, and lets it go when the clock takes over", async () => {
    const { source, calls } = makeSource();
    source.seekRevision("a", { revision: 1, sessionId: "s" });
    expect(calls).toHaveLength(1);
    calls[0].resolve(answer({ arm: { x: 0 } }, [rev(1, 1), rev(2, 2)]));
    await settle();
    expect(source.getClock()).toMatchObject({ phase: "ready", missing: [], revision: { revision: 1, hasNext: true } });

    source.seek(BASE, true);
    expect(source.getClock()).toMatchObject({ phase: "ready", revision: null });
    expect(calls).toHaveLength(1);
  });

  it("checks out the revision itself when the session does not reach below it", async () => {
    const { source, calls } = makeSource();
    source.seekRevision("a", { revision: 3, sessionId: "s" });
    expect(calls[0].request.revision).toEqual({ globalRevision: 1, sessionId: "s" });
    calls[0].reject(new Error("No snapshot found for state 1"));
    await settle();

    expect(calls).toHaveLength(2);
    expect(calls[1].request.revision).toEqual({ globalRevision: 3, sessionId: "s" });
    calls[1].reject(new Error("No snapshot found for state 1"));
    await settle();
    // Nothing there either: said once, not asked for ever.
    expect(source.getClock()).toMatchObject({ missing: ["a"], error: "No snapshot found for state 1" });
    expect(calls).toHaveLength(2);
  });
});
