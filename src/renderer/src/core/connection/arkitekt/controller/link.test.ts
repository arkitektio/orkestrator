import { describe, expect, it } from "vitest";
import type { Alias } from "../fakts/faktsSchema";
import { IDLE, isSuspect, reduceLink, retryAt, retryDelay, runtimeOf, type Link, type LinkEvent } from "./link";

const A: Alias = { id: "a", host: "a.example.org", ssl: true, challenge: "ht" };
const B: Alias = { id: "b", host: "b.example.org", ssl: true, challenge: "ht" };

const run = (events: LinkEvent[], from: Link = IDLE) => events.reduce(reduceLink, from);

describe("reduceLink", () => {
  it("is not up until an address answered in this session", () => {
    expect(runtimeOf(IDLE)).toEqual({});
    const probing = run([{ type: "check", at: 1 }]);
    expect(probing).toEqual({ phase: "probing", since: 1, attempts: 0 });
    expect(runtimeOf(probing)).toMatchObject({ status: "checking", errors: [] });
    const up = run([{ type: "answered", alias: A, at: 5 }], probing);
    expect(runtimeOf(up)).toEqual({ status: "ready", errors: [], revalidating: false, lastCheckedAt: 5 });
  });

  it("stays ready while it is checked again", () => {
    const up = run([{ type: "check", at: 1 }, { type: "answered", alias: A, at: 2 }, { type: "check", at: 9 }]);
    expect(up).toMatchObject({ phase: "up", alias: A, rechecking: true });
    expect(runtimeOf(up)).toMatchObject({ status: "ready", revalidating: true });
    expect(run([{ type: "answered", alias: B, at: 10 }], up)).toMatchObject({ phase: "up", alias: B, rechecking: false });
  });

  it("goes down with the reason, and counts the failed checks in a row", () => {
    const down = run([{ type: "check", at: 1 }, { type: "unanswered", reason: "nobody home", at: 6 }]);
    expect(down).toEqual({ phase: "down", reason: "nobody home", since: 6, at: 6, attempts: 1 });
    expect(runtimeOf(down)).toEqual({ status: "invalid", errors: ["nobody home"], revalidating: false, lastCheckedAt: 6 });
    const again = run([{ type: "check", at: 20 }, { type: "unanswered", reason: "still nobody", at: 25 }], down);
    expect(again).toEqual({ phase: "down", reason: "still nobody", since: 6, at: 25, attempts: 2 });
    // Answering clears the count.
    expect(run([{ type: "check", at: 30 }, { type: "answered", alias: A, at: 31 }, { type: "unanswered", reason: "gone", at: 40 }], again)).toMatchObject({
      since: 40,
      attempts: 1,
    });
  });

  it("forgets everything for a new session", () => {
    expect(run([{ type: "check", at: 1 }, { type: "answered", alias: A, at: 2 }, { type: "reset" }])).toBe(IDLE);
  });
});

describe("suspicion and retries", () => {
  it("suspects an up link after two network errors, until it is checked", () => {
    const up = run([{ type: "check", at: 1 }, { type: "answered", alias: A, at: 2 }]);
    expect(isSuspect(run([{ type: "network-error" }], up))).toBe(false);
    const suspect = run([{ type: "network-error" }, { type: "network-error" }], up);
    expect(isSuspect(suspect)).toBe(true);
    expect(isSuspect(run([{ type: "check", at: 3 }], suspect))).toBe(false);
    expect(isSuspect(run([{ type: "check", at: 3 }, { type: "answered", alias: A, at: 4 }], suspect))).toBe(false);
    // Only an up link has a client to fail.
    expect(run([{ type: "network-error" }], IDLE)).toBe(IDLE);
  });

  it("retries a down link after 5 s, doubling, a minute at most", () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelay)).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000]);
    expect(retryAt({ phase: "down", reason: "x", since: 0, at: 100, attempts: 2 })).toBe(10_100);
    expect(retryAt(IDLE)).toBeUndefined();
  });
});
