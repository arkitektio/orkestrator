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
    getToken: async () => "token",
    WebSocket: FakeSocket as unknown as typeof WebSocket,
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

  it("sends nothing but HELLO before it is welcomed, then what waited, once", async () => {
    const session = make();
    const socket = FakeSocket.all.at(-1)!;
    socket.open();
    // Watched and called while the token is still being read: HELLO is not out yet.
    session.watch("task:9", { onData: () => {}, onResync: () => {} });
    const answer = session.call({ type: "CANCEL", task: "9" });
    await flush();
    expect(socket.sent.map((frame) => frame.type)).toEqual(["HELLO"]);
    socket.push({ type: "WELCOME", session: "s-1", resumed: false, limits: LIMITS });
    expect(socket.sent.map((frame) => frame.type)).toEqual(["HELLO", "WATCH", "CANCEL"]);
    socket.push({ type: "ACCEPTED", pos: 1, request: socket.ofType("CANCEL")[0].request });
    await expect(answer).resolves.toMatchObject({ type: "ACCEPTED" });
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

  it("says since when updates stopped, and that they flow again once resumed", async () => {
    const session = make();
    expect(session.getSync()).toMatchObject({ status: "connecting", catchingUp: false });
    expect(session.getSync().since).not.toBeNull();
    const first = await welcome("s-1");
    expect(session.getSync()).toEqual({ status: "open", since: null, catchingUp: false, error: null });
    const dropped = Date.now();
    first.drop();
    vi.advanceTimersByTime(3_000);
    const away = session.getSync();
    expect(away.status).toBe("reconnecting");
    expect(away.since).toBeGreaterThanOrEqual(dropped);
    // A failed attempt in between keeps the first moment it stopped.
    FakeSocket.all.at(-1)!.drop();
    expect(session.getSync().since).toBe(away.since);
    vi.advanceTimersByTime(5_000);
    await welcome("s-1", true);
    // Resumed: what was missed is replayed, nothing to catch up.
    expect(session.getSync()).toEqual({ status: "open", since: null, catchingUp: false, error: null });
  });

  it("keeps why updates stopped, in a sentence and with what the socket said", async () => {
    const session = make();
    FakeSocket.all.at(-1)!.drop(1006);
    expect(session.getSync().error).toMatchObject({
      message: expect.stringContaining("The server did not open live updates at wss://hub/rekuest/session."),
      detail: "Close code 1006",
    });
    vi.advanceTimersByTime(3_000);
    const socket = await welcome("s-1");
    expect(session.getSync().error).toBeNull();
    socket.push({ type: "CLOSING", reason: "takt is restarting" });
    socket.drop(4503);
    expect(session.getSync().error).toMatchObject({
      message: "Live updates are not available on the server right now.",
      detail: "Close code 4503: takt is restarting",
    });
  });

  it("says when it had no sign-in to open with", async () => {
    const session = make({ getToken: async () => Promise.reject(new Error("token expired")) });
    FakeSocket.all.at(-1)!.open();
    await flush();
    await flush();
    expect(session.getSync().error).toMatchObject({
      message: "This window has no sign-in to open live updates with.",
      detail: "token expired",
    });
  });

  it("catches up after a new session until every topic was sent again, or gives up waiting", async () => {
    const session = make();
    const listener = { onData: () => {}, onResync: () => {} };
    session.watch("tasks:mine", listener);
    session.watch("task:7", listener);
    session.watch("tasks:org", listener);
    const first = await welcome("s-1");
    first.drop();
    vi.advanceTimersByTime(3_000);
    const second = await welcome("s-2", false);
    expect(session.getSync().catchingUp).toBe(true);
    second.push({ type: "RESYNC", pos: 1, topic: "tasks:mine", reason: "new", snapshot: { rows: [] } });
    second.push({ type: "REFUSED", pos: 2, topic: "tasks:org", error: "Not yours." });
    expect(session.getSync().catchingUp).toBe(true);
    vi.advanceTimersByTime(15_000);
    // task:7's snapshot never came: the window stops saying it waits.
    expect(session.getSync().catchingUp).toBe(false);
  });

  it("keeps trying a server that never opens, and opens once it does", async () => {
    const session = make();
    FakeSocket.all.at(-1)!.drop();
    expect(session.getStatus()).toBe("connecting");
    vi.advanceTimersByTime(3_000);
    expect(FakeSocket.all.length).toBe(2);
    await welcome("s-1");
    expect(session.getStatus()).toBe("open");
  });

  it("a call made before the socket opens goes out once it does", async () => {
    const session = make();
    const answer = session.call({ type: "PAUSE", task: "3" });
    const socket = await welcome();
    const sent = socket.ofType("PAUSE");
    expect(sent).toHaveLength(1);
    socket.push({ type: "ACCEPTED", pos: 1, request: sent[0].request });
    await expect(answer).resolves.toMatchObject({ type: "ACCEPTED" });
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
