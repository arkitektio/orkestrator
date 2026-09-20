import { afterEach, describe, expect, it, vi } from "vitest";

import type { StoredArkitektSession } from "../fakts/sessionStorageSchema";
import {
  reconcilePersistedSession,
  refreshLockName,
  rotateProfileSession,
  withCrossWindowLock,
} from "./sharedRefresh";

const ALIAS = { id: "a1", host: "localhost", ssl: false, challenge: "ht" };

const session = (
  refreshToken: string,
  overrides: Partial<StoredArkitektSession["token"]> = {},
): StoredArkitektSession => ({
  endpoint: {
    name: "test",
    version: "0.1.0",
    base_url: "https://lok.test/lok/f/",
    frontend_url: "https://lok.test/",
    configure: "https://lok.test/configure/{code}",
    device_authorization_endpoint: "https://lok.test/lok/o/app-authorization/",
    token_endpoint: "https://lok.test/lok/o/token/",
  },
  fakts: {
    instances: { lok: { service: "live.arkitekt.lok", identifier: "3", aliases: [ALIAS] } },
    self: { deployment_name: "test", alias: ALIAS },
    statuses: { lok: "granted" },
  },
  token: {
    access_token: `at-${refreshToken}`,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refreshToken,
    client_id: "cid",
    received_at: Date.now(),
    ...overrides,
  },
  aliasMap: { aliasMap: { lok: ALIAS } },
});

/**
 * A Web Locks stand-in that actually serialises: callbacks for the same name
 * run one after another, in request order, like the real thing does across
 * windows.
 */
const fakeLocks = () => {
  const tails = new Map<string, Promise<unknown>>();
  return {
    request: <R>(name: string, callback: () => Promise<R>): Promise<R> => {
      const previous = tails.get(name) ?? Promise.resolve();
      const run = previous.then(callback, callback);
      tails.set(name, run.catch(() => undefined));
      return run;
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reconcilePersistedSession", () => {
  it("refreshes what we hold when nothing else has moved", () => {
    const held = session("rt-1");
    expect(reconcilePersistedSession(held, session("rt-1"))).toEqual({
      session: held,
      action: "refresh",
    });
    expect(reconcilePersistedSession(held, null)).toEqual({ session: held, action: "refresh" });
  });

  it("adopts another window's fresh rotation instead of replaying our spent token", () => {
    const held = session("rt-1");
    const theirs = session("rt-2");
    expect(reconcilePersistedSession(held, theirs)).toEqual({ session: theirs, action: "adopt" });
  });

  it("refreshes another window's rotation when that one is itself due", () => {
    const held = session("rt-1");
    const theirs = session("rt-2", { received_at: Date.now() - 3600 * 1000 });
    expect(reconcilePersistedSession(held, theirs)).toEqual({
      session: theirs,
      action: "refresh",
    });
  });
});

describe("rotateProfileSession", () => {
  it("refreshes and persists the rotation when the persisted token is ours", async () => {
    const held = session("rt-1");
    const refresh = vi.fn(async () => session("rt-2"));
    const persist = vi.fn(async () => {});

    const result = await rotateProfileSession({
      profileId: "p",
      held,
      readPersisted: async () => held,
      refresh,
      persist,
    });

    expect(refresh).toHaveBeenCalledWith(held);
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({
      token: expect.objectContaining({ refresh_token: "rt-2" }),
    }));
    expect(result.refreshed).toBe(true);
    expect(result.session.token.refresh_token).toBe("rt-2");
  });

  it("never sends a token another window already spent", async () => {
    const held = session("rt-1");
    const theirs = session("rt-2");
    const refresh = vi.fn(async () => session("rt-3"));
    const persist = vi.fn(async () => {});

    const result = await rotateProfileSession({
      profileId: "p",
      held,
      readPersisted: async () => theirs,
      refresh,
      persist,
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(theirs);
    expect(result).toEqual({ session: theirs, refreshed: false });
  });

  it("treats an unreadable book as 'nothing persisted' rather than failing", async () => {
    const held = session("rt-1");
    const refresh = vi.fn(async () => session("rt-2"));

    await rotateProfileSession({
      profileId: "p",
      held,
      readPersisted: async () => { throw new Error("boom"); },
      refresh,
      persist: async () => {},
    });

    expect(refresh).toHaveBeenCalledWith(held);
  });

  it("serialises two windows through the lock so the second adopts the first's rotation", async () => {
    vi.stubGlobal("navigator", { locks: fakeLocks() });

    // One shared "storage" cell, two windows that both start from rt-1.
    let persisted: StoredArkitektSession = session("rt-1");
    const refresh = vi.fn(async (s: StoredArkitektSession) =>
      session(s.token.refresh_token === "rt-1" ? "rt-2" : "rt-BAD"),
    );
    const persist = vi.fn(async (s: StoredArkitektSession) => { persisted = s; });
    const windowRotation = () =>
      rotateProfileSession({
        profileId: "p",
        held: session("rt-1"),
        readPersisted: async () => persisted,
        refresh,
        persist,
      });

    const [a, b] = await Promise.all([windowRotation(), windowRotation()]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(a.refreshed).toBe(true);
    expect(b.refreshed).toBe(false);
    expect(b.session.token.refresh_token).toBe("rt-2");
    expect(persisted.token.refresh_token).toBe("rt-2");
  });

  it("keys the lock per profile so different profiles do not queue behind each other", async () => {
    expect(refreshLockName("a")).not.toBe(refreshLockName("b"));
  });
});

describe("withCrossWindowLock", () => {
  it("still runs where Web Locks are unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(withCrossWindowLock("x", async () => 42)).resolves.toBe(42);
  });

  it("serialises callers within one window even without Web Locks", async () => {
    // React StrictMode runs the bootstrap effect twice; the second run must
    // observe the first's rotation, not race it to the token endpoint.
    vi.stubGlobal("navigator", {});
    const order: string[] = [];
    const slow = withCrossWindowLock("x", async () => {
      order.push("a:start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("a:end");
    });
    const fast = withCrossWindowLock("x", async () => { order.push("b"); });
    await Promise.all([slow, fast]);
    expect(order).toEqual(["a:start", "a:end", "b"]);
  });

  it("does not queue different names behind each other", async () => {
    vi.stubGlobal("navigator", {});
    const order: string[] = [];
    const slow = withCrossWindowLock("x", async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push("x");
    });
    const fast = withCrossWindowLock("y", async () => { order.push("y"); });
    await Promise.all([slow, fast]);
    expect(order).toEqual(["y", "x"]);
  });

  it("propagates the callback's rejection", async () => {
    vi.stubGlobal("navigator", { locks: fakeLocks() });
    await expect(
      withCrossWindowLock("x", async () => { throw new Error("nope"); }),
    ).rejects.toThrow("nope");
  });
});
