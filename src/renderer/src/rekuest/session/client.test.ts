import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RekuestSession, SessionRefusal } from "./client";

/** A socket the test drives: what the client sent, and frames pushed from "the server". */
class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  send(text: string) {
    this.sent.push(JSON.parse(text));
  }
  close(code = 1000) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  // the server's side
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  push(frame: object) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  drop(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
  ofType(type: string) {
    return this.sent.filter((frame) => frame.type === type);
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const make = (overrides: Partial<ConstructorParameters<typeof RekuestSession>[0]> = {}) =>
  new RekuestSession({
    url: "wss://hub/rekuest/session",
    httpUrl: "https://hub/rekuest/session",
    getToken: async () => "token",
    WebSocket: FakeSocket as unknown as typeof WebSocket,
    fetch: (async () => ({ status: 400 })) as unknown as typeof fetch,
    ...overrides,
  });

const LIMITS = { session_grace: 60, ping_interval: 15, replay_max: 500, deadman_min: 15 };

/** Open the newest socket and welcome it. */
const welcome = async (session = "s-1", resumed = false) => {
  const socket = FakeSocket.all.at(-1)!;
  socket.open();
  await flush();
  socket.push({ type: "WELCOME", session, resumed, limits: LIMITS });
  return socket;
};

describe("RekuestSession", () => {
  beforeEach(() => {
    FakeSocket.all = [];
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "Date"], shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("says hello, watches, and hands each item to its listeners once", async () => {
    const session = make();
    const items: unknown[] = [];
    const resyncs: string[] = [];
    session.watch("task:7", {
      onData: (item) => items.push(item),
      onResync: (_, reason) => resyncs.push(reason),
    });
    const socket = await welcome();
    expect(socket.ofType("HELLO")[0]).toMatchObject({ token: "token", session: null, last_pos: 0 });
    expect(session.getStatus()).toBe("open");
    expect(socket.ofType("WATCH")).toEqual([{ type: "WATCH", topic: "task:7" }]);

    socket.push({
      type: "RESYNC",
      pos: 1,
      topic: "task:7",
      reason: "new",
      snapshot: { task: null, events: [{ task_seq: 1 }], task_seq: 1 },
    });
    socket.push({ type: "DATA", pos: 2, topic: "task:7", item: { task_seq: 1 } }); // in the snapshot
    socket.push({ type: "DATA", pos: 3, topic: "task:7", item: { task_seq: 2 } });
    socket.push({ type: "DATA", pos: 4, topic: "task:7", item: { task_seq: 2 } }); // a seam's duplicate
    expect(resyncs).toEqual(["new"]);
    expect(items).toEqual([{ task_seq: 2 }]);
  });

  it("comes back to the same session with how far it got, and pings that too", async () => {
    const session = make();
    session.watch("task:7", { onData: () => {}, onResync: () => {} });
    const first = await welcome("s-1");
    first.push({ type: "DATA", pos: 5, topic: "task:7", item: { task_seq: 3 } });
    vi.advanceTimersByTime(15_000);
    expect(first.ofType("PING").at(-1)).toEqual({ type: "PING", pos: 5 });

    first.drop();
    expect(session.getStatus()).toBe("reconnecting");
    vi.advanceTimersByTime(3_000);
    const second = FakeSocket.all.at(-1)!;
    expect(second).not.toBe(first);
    second.open();
    await flush();
    expect(second.ofType("HELLO")[0]).toMatchObject({ session: "s-1", last_pos: 5 });
  });

  it("a topic dropped while away is told once back; one still watched is asked again", async () => {
    const session = make();
    const stopA = session.watch("task:1", { onData: () => {}, onResync: () => {} });
    session.watch("task:2", { onData: () => {}, onResync: () => {} });
    const first = await welcome("s-1");
    first.drop();
    stopA();
    vi.advanceTimersByTime(3_000);
    const second = await welcome("s-1", true);
    expect(second.ofType("UNWATCH")).toEqual([{ type: "UNWATCH", topic: "task:1" }]);
    expect(second.ofType("WATCH")).toEqual([{ type: "WATCH", topic: "task:2" }]);
  });

  it("re-sends an unanswered call under its id after a drop, and settles it once", async () => {
    const session = make();
    const first = await welcome("s-1");
    const answer = session.call({ type: "CANCEL", task: "9" });
    const sent = first.ofType("CANCEL")[0];
    expect(sent.request).toBeTruthy();

    first.drop();
    vi.advanceTimersByTime(3_000);
    const second = await welcome("s-1", true);
    expect(second.ofType("CANCEL")).toEqual([sent]);

    second.push({ type: "ACCEPTED", pos: 9, request: sent.request, result: { task: "9" } });
    second.push({ type: "ACCEPTED", pos: 10, request: sent.request, result: { task: "9" } });
    await expect(answer).resolves.toMatchObject({ type: "ACCEPTED", result: { task: "9" } });
  });

  it("rejects a refused call with the server's sentence", async () => {
    const session = make();
    const socket = await welcome();
    const answer = session.call({ type: "INTERRUPT", task: "9" });
    const { request } = socket.ofType("INTERRUPT")[0];
    socket.push({ type: "REFUSED", pos: 2, request, error: "Not a task you assigned." });
    await expect(answer).rejects.toEqual(new SessionRefusal("Not a task you assigned."));
  });

  it("is unsupported where the server has no session route", async () => {
    const session = make({
      fetch: (async () => ({ status: 404 })) as unknown as typeof fetch,
    });
    FakeSocket.all.at(-1)!.drop();
    await flush();
    await flush();
    expect(session.getStatus()).toBe("unsupported");
  });

  it("keeps trying a server that is only unreachable", async () => {
    const session = make({
      fetch: (async () => {
        throw new TypeError("offline");
      }) as unknown as typeof fetch,
    });
    FakeSocket.all.at(-1)!.drop();
    await flush();
    await flush();
    expect(session.getStatus()).toBe("connecting");
    vi.advanceTimersByTime(3_000);
    expect(FakeSocket.all.length).toBe(2);
  });

  it("a window back after its grace catches every list up, not just a first look", async () => {
    const session = make();
    const reasons: string[] = [];
    session.watch("tasks:mine", { onData: () => {}, onResync: (_, reason) => reasons.push(reason) });
    const first = await welcome("s-1");
    first.push({ type: "RESYNC", pos: 1, topic: "tasks:mine", reason: "new", snapshot: { rows: [] } });
    first.drop();
    vi.advanceTimersByTime(3_000);
    // Gone too long: a new session, which watches the topic again from nothing.
    const second = await welcome("s-2", false);
    expect(second.ofType("WATCH")).toEqual([{ type: "WATCH", topic: "tasks:mine" }]);
    second.push({ type: "RESYNC", pos: 1, topic: "tasks:mine", reason: "new", snapshot: { rows: [] } });
    expect(reasons).toEqual(["new", "session_expired"]);
  });

  it("falls back to GraphQL when it cannot tell why it never opens, and moves over once it does", async () => {
    const session = make({
      fetch: (async () => {
        throw new TypeError("a 404 this origin may not read");
      }) as unknown as typeof fetch,
    });
    const dropFresh = async () => {
      FakeSocket.all.at(-1)!.drop();
      await flush();
      await flush();
    };
    await dropFresh();
    expect(session.getStatus()).toBe("connecting");
    vi.advanceTimersByTime(11_000);
    await dropFresh();
    expect(session.getStatus()).toBe("fallback");
    vi.advanceTimersByTime(40_000);
    await welcome("s-1");
    expect(session.getStatus()).toBe("open");
  });

  it("does not connect when turned off", () => {
    const session = make({ enabled: () => false });
    expect(session.getStatus()).toBe("disabled");
    expect(FakeSocket.all.length).toBe(0);
  });

  it("drops a state patch it already has", async () => {
    const session = make();
    const revs: number[] = [];
    session.watch("state:3/position", {
      onData: (item) => revs.push((item as { global_rev: number }).global_rev),
      onResync: () => {},
    });
    const socket = await welcome();
    socket.push({ type: "RESYNC", pos: 1, topic: "state:3/position", reason: "new", snapshot: { global_rev: 4 } });
    for (const rev of [4, 5, 5, 6]) {
      socket.push({ type: "DATA", pos: 1 + rev, topic: "state:3/position", item: { global_rev: rev } });
    }
    expect(revs).toEqual([5, 6]);
  });
});
