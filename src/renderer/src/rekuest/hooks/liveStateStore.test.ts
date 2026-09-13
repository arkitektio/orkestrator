import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createLiveStateStore,
  EMPTY_LIVE_STATE,
  type LiveStateEvent,
} from "./liveStateStore";

type Handlers = { next: (event: LiveStateEvent) => void; error: (e: unknown) => void };

/** A store with a manually driven frame scheduler and a spied subscribe. */
const makeStore = () => {
  const frames: Array<{ id: number; cb: () => void; cancelled: boolean }> = [];
  let nextId = 1;
  const schedule = vi.fn((cb: () => void) => {
    const id = nextId++;
    frames.push({ id, cb, cancelled: false });
    return id;
  });
  const cancel = vi.fn((handle: unknown) => {
    const frame = frames.find((f) => f.id === handle);
    if (frame) frame.cancelled = true;
  });
  const runFrame = () => {
    const pending = frames.splice(0);
    pending.forEach((f) => !f.cancelled && f.cb());
  };

  const handlersByKey = new Map<string, Handlers>();
  const unsubscribes = new Map<string, ReturnType<typeof vi.fn>>();
  const subscribe = vi.fn(
    (_client: unknown, variables: { agentID: string; interface: string }, handlers: Handlers) => {
      const key = `${variables.agentID}:${variables.interface}`;
      handlersByKey.set(key, handlers);
      const unsubscribe = vi.fn();
      unsubscribes.set(key, unsubscribe);
      return unsubscribe;
    },
  );

  const store = createLiveStateStore<unknown>({ subscribe, schedule, cancel });
  const emit = (key: string, event: LiveStateEvent) => handlersByKey.get(key)!.next(event);

  return { store, subscribe, schedule, cancel, runFrame, emit, unsubscribes, frames };
};

const snapshot = (value: Record<string, unknown>, globalRevision: number): LiveStateEvent => ({
  __typename: "StateSnapshotEvent",
  value,
  globalRevision,
});

const patch = (
  op: string,
  path: string,
  value: unknown,
  globalRevision: number,
): LiveStateEvent => ({ __typename: "StatePatchEvent", op, path, value, globalRevision });

const client = { fake: true };

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("liveStateStore refcount", () => {
  it("opens one subscription per key however many consumers acquire it", () => {
    const { store, subscribe, unsubscribes } = makeStore();
    const releaseA = store.acquire(client, "agent", "iface", () => {});
    const releaseB = store.acquire(client, "agent", "iface", () => {});
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(
      client,
      { agentID: "agent", interface: "iface" },
      expect.anything(),
    );
    expect(store.size()).toBe(1);

    releaseA();
    expect(unsubscribes.get("agent:iface")).not.toHaveBeenCalled();
    expect(store.size()).toBe(1);

    releaseB();
    expect(unsubscribes.get("agent:iface")).toHaveBeenCalledTimes(1);
    expect(store.size()).toBe(0);
  });

  it("opens separate subscriptions for different keys", () => {
    const { store, subscribe } = makeStore();
    store.acquire(client, "agent", "a", () => {});
    store.acquire(client, "agent", "b", () => {});
    store.acquire(client, "other", "a", () => {});
    expect(subscribe).toHaveBeenCalledTimes(3);
    expect(store.size()).toBe(3);
  });

  it("releasing twice is a no-op", () => {
    const { store, unsubscribes } = makeStore();
    const releaseA = store.acquire(client, "agent", "iface", () => {});
    const releaseB = store.acquire(client, "agent", "iface", () => {});
    releaseA();
    releaseA();
    expect(unsubscribes.get("agent:iface")).not.toHaveBeenCalled();
    releaseB();
    expect(unsubscribes.get("agent:iface")).toHaveBeenCalledTimes(1);
  });

  it("re-acquiring after the last release starts fresh", () => {
    const { store, subscribe, emit, runFrame } = makeStore();
    const release = store.acquire(client, "agent", "iface", () => {});
    emit("agent:iface", snapshot({ a: 1 }, 1));
    runFrame();
    expect(store.getSnapshot("agent", "iface").value).toEqual({ a: 1 });

    release();
    expect(store.getSnapshot("agent", "iface")).toBe(EMPTY_LIVE_STATE);

    store.acquire(client, "agent", "iface", () => {});
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot("agent", "iface")).toBe(EMPTY_LIVE_STATE);
  });
});

describe("liveStateStore coalescing", () => {
  it("publishes a snapshot and its patches once per frame", () => {
    const { store, schedule, runFrame, emit } = makeStore();
    const listener = vi.fn();
    store.acquire(client, "agent", "iface", listener);

    emit("agent:iface", snapshot({ items: [1], name: "x" }, 1));
    emit("agent:iface", patch("replace", "/name", "y", 2));
    emit("agent:iface", patch("add", "/items/1", 2, 3));
    emit("agent:iface", patch("add", "/extra", true, 4));

    // Nothing is published until the frame runs, and only one frame was asked for.
    expect(listener).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot("agent", "iface")).toBe(EMPTY_LIVE_STATE);

    runFrame();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot("agent", "iface")).toEqual({
      value: { items: [1, 2], name: "y", extra: true },
      revision: 4,
    });
  });

  it("keeps the snapshot identity stable between flushes", () => {
    const { store, runFrame, emit } = makeStore();
    store.acquire(client, "agent", "iface", () => {});
    emit("agent:iface", snapshot({ a: 1 }, 1));
    runFrame();
    const first = store.getSnapshot("agent", "iface");
    expect(store.getSnapshot("agent", "iface")).toBe(first);

    emit("agent:iface", patch("replace", "/a", 2, 2));
    expect(store.getSnapshot("agent", "iface")).toBe(first);
    runFrame();
    expect(store.getSnapshot("agent", "iface")).not.toBe(first);
    expect(store.getSnapshot("agent", "iface").value).toEqual({ a: 2 });
  });

  it("never mutates a value it already published", () => {
    const { store, runFrame, emit } = makeStore();
    store.acquire(client, "agent", "iface", () => {});
    const incoming = { nested: { count: 1 } };
    emit("agent:iface", snapshot(incoming, 1));
    runFrame();
    const published = store.getSnapshot("agent", "iface").value!;

    emit("agent:iface", patch("replace", "/nested/count", 2, 2));
    emit("agent:iface", patch("replace", "/nested/count", 3, 3));
    runFrame();

    expect(published).toEqual({ nested: { count: 1 } });
    expect(incoming).toEqual({ nested: { count: 1 } });
    expect(store.getSnapshot("agent", "iface").value).toEqual({ nested: { count: 3 } });
  });

  it("a later snapshot in the same frame discards earlier patches", () => {
    const { store, runFrame, emit } = makeStore();
    store.acquire(client, "agent", "iface", () => {});
    emit("agent:iface", snapshot({ a: 1 }, 1));
    runFrame();
    emit("agent:iface", patch("replace", "/a", 2, 2));
    emit("agent:iface", snapshot({ b: 1 }, 3));
    emit("agent:iface", patch("replace", "/b", 2, 4));
    runFrame();
    expect(store.getSnapshot("agent", "iface")).toEqual({ value: { b: 2 }, revision: 4 });
  });

  it("ignores patches that arrive before any snapshot", () => {
    const { store, schedule, runFrame, emit } = makeStore();
    const listener = vi.fn();
    store.acquire(client, "agent", "iface", listener);
    emit("agent:iface", patch("replace", "/a", 2, 2));
    expect(schedule).not.toHaveBeenCalled();
    runFrame();
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot("agent", "iface")).toBe(EMPTY_LIVE_STATE);
  });

  it("drops a patch that fails to apply but keeps the rest", () => {
    const { store, runFrame, emit } = makeStore();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    store.acquire(client, "agent", "iface", () => {});
    emit("agent:iface", snapshot({ list: [1] }, 1));
    runFrame();
    emit("agent:iface", patch("replace", "/missing/deep", 9, 2));
    emit("agent:iface", patch("replace", "/list/0", 5, 3));
    runFrame();
    expect(store.getSnapshot("agent", "iface")).toEqual({ value: { list: [5] }, revision: 3 });
  });

  it("notifies every consumer of the key once per flush", () => {
    const { store, runFrame, emit } = makeStore();
    const a = vi.fn();
    const b = vi.fn();
    store.acquire(client, "agent", "iface", a);
    store.acquire(client, "agent", "iface", b);
    emit("agent:iface", snapshot({ a: 1 }, 1));
    emit("agent:iface", patch("replace", "/a", 2, 2));
    runFrame();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending frame when the last consumer leaves", () => {
    const { store, cancel, runFrame, emit } = makeStore();
    const listener = vi.fn();
    const release = store.acquire(client, "agent", "iface", listener);
    emit("agent:iface", snapshot({ a: 1 }, 1));
    release();
    expect(cancel).toHaveBeenCalledTimes(1);
    runFrame();
    expect(listener).not.toHaveBeenCalled();
  });

  it("falls back to a timeout-based frame when there is no requestAnimationFrame", () => {
    vi.useFakeTimers();
    const handlers: Handlers[] = [];
    const store = createLiveStateStore<unknown>({
      subscribe: (_c, _v, h) => {
        handlers.push(h);
        return () => {};
      },
    });
    const listener = vi.fn();
    store.acquire(client, "agent", "iface", listener);
    handlers[0].next(snapshot({ a: 1 }, 1));
    handlers[0].next(patch("replace", "/a", 2, 2));
    expect(listener).not.toHaveBeenCalled();
    vi.advanceTimersByTime(16);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot("agent", "iface").value).toEqual({ a: 2 });
  });
});
