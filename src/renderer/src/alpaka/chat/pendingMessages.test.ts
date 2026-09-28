import { describe, expect, it } from "vitest";
import {
  confirmPending,
  dropPending,
  isUnconfirmed,
  settlePending,
  startPending,
  type PendingMessage,
} from "./pendingMessages";

const pending = (localId: string, serverId?: string): PendingMessage => ({
  localId,
  text: localId,
  attachedStructures: [],
  createdAt: "2026-09-21T10:00:00Z",
  ...(serverId ? { serverId } : {}),
});

describe("startPending", () => {
  it("appends an unconfirmed row", () => {
    const next = startPending([], "local-1", "hello", [], "2026-09-21T10:00:00Z");
    expect(next).toHaveLength(1);
    expect(next[0].text).toBe("hello");
    expect(isUnconfirmed(next[0])).toBe(true);
  });

  it("keeps the rows already in flight", () => {
    const next = startPending([pending("a")], "b", "second", [], "now");
    expect(next.map((p) => p.localId)).toEqual(["a", "b"]);
  });
});

describe("confirmPending", () => {
  it("stops the row pulsing once the server gave it an id", () => {
    const next = confirmPending([pending("a")], "a", "42");
    expect(next[0].serverId).toBe("42");
    expect(isUnconfirmed(next[0])).toBe(false);
  });

  it("leaves other rows alone", () => {
    const next = confirmPending([pending("a"), pending("b")], "a", "42");
    expect(next[1].serverId).toBeUndefined();
  });
});

describe("settlePending", () => {
  it("drops a row the room now carries", () => {
    const next = settlePending([pending("a", "42")], [{ id: "42" }]);
    expect(next).toEqual([]);
  });

  it("keeps a confirmed row the room has not delivered yet", () => {
    const rows = [pending("a", "42")];
    expect(settlePending(rows, [{ id: "7" }])).toBe(rows);
  });

  it("never drops a row that has no server id", () => {
    const rows = [pending("a")];
    expect(settlePending(rows, [{ id: "42" }])).toBe(rows);
  });

  it("returns the same array when nothing changed", () => {
    const rows = [pending("a", "42")];
    expect(settlePending(rows, [])).toBe(rows);
    expect(settlePending([], [{ id: "42" }])).toEqual([]);
  });
});

describe("dropPending", () => {
  it("removes the row that failed to send", () => {
    expect(dropPending([pending("a"), pending("b")], "a").map((p) => p.localId)).toEqual(["b"]);
  });
});
