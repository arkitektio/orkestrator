import { createClient } from "graphql-ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * That `terminate()` really re-authenticates the socket.
 *
 * This is the mechanism behind the WebSocket half of auto-refresh, and it rests
 * on a claim that is otherwise only inference from a type definition: a socket
 * carries the token it was opened with (the server reads `connection_params`
 * per operation), `connectionParams` is only re-evaluated on a NEW socket, and
 * `terminate` — unlike `dispose` — is "not considered fatal and a connection
 * retry will occur as expected".
 *
 * So the thing to observe is concrete: after terminate, does a second socket
 * open, and does its `connection_init` carry the *new* token? Driven through a
 * fake WebSocket rather than a live server so it runs in CI.
 */

type Frame = Record<string, any>;

const sockets: FakeWebSocket[] = [];

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  sent: Frame[] = [];
  closedWith: { code?: number; reason?: string } | null = null;

  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number; reason: string; wasClean: boolean }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  constructor(
    public url: string,
    public protocol?: string,
  ) {
    sockets.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close(code?: number, reason?: string) {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.closedWith = { code, reason };
    this.onclose?.({ code: code ?? 1000, reason: reason ?? "", wasClean: true });
  }

  /** Drive the server side: open, then accept the client's connection_init. */
  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({});
  }

  ack() {
    this.onmessage?.({ data: JSON.stringify({ type: "connection_ack" }) });
  }

  initFrame(): Frame | undefined {
    return this.sent.find((f) => f.type === "connection_init");
  }
}

/**
 * Drain microtasks AND the retry backoff timer: graphql-ws reconnects after a
 * randomised wait, so a microtask-only flush never sees the new socket.
 */
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
  await vi.advanceTimersByTimeAsync(30_000);
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  sockets.length = 0;
});

describe("websocket re-authentication", () => {
  it("re-reads connectionParams on the socket that replaces a terminated one", async () => {
    // Stands in for getToken(): the second call is what a forced refresh would
    // have produced.
    const tokens = ["stale-token", "minted-token"];
    const getToken = vi.fn(async () => tokens.shift() ?? "exhausted");

    const client = createClient({
      url: "ws://localhost/graphql",
      webSocketImpl: FakeWebSocket,
      retryAttempts: 5,
      connectionParams: async () => ({ token: await getToken() }),
    });

    // First subscription opens socket #1 with the stale token.
    const first = client.subscribe(
      { query: "subscription { __typename }" },
      { next: () => {}, error: () => {}, complete: () => {} },
    );
    await flush();

    expect(sockets).toHaveLength(1);
    sockets[0].open();
    await flush();
    expect(sockets[0].initFrame()?.payload).toEqual({ token: "stale-token" });
    sockets[0].ack();
    await flush();

    // The server rejected an operation on this socket: drop it.
    first();
    client.terminate();
    await flush();

    // terminate closes with 4499 and is explicitly non-fatal, so the client is
    // free to reconnect rather than being torn down.
    expect(sockets[0].closedWith?.code).toBe(4499);

    // A new subscription must open a NEW socket, carrying the NEW token.
    client.subscribe(
      { query: "subscription { __typename }" },
      { next: () => {}, error: () => {}, complete: () => {} },
    );
    await flush();

    expect(sockets).toHaveLength(2);
    sockets[1].open();
    await flush();

    // The whole point: refreshing the token alone would not have changed this
    // frame — only a new socket re-evaluates connectionParams.
    expect(sockets[1].initFrame()?.payload).toEqual({ token: "minted-token" });
    expect(getToken).toHaveBeenCalledTimes(2);

    client.dispose();
  });
});
