// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { findPending, forgetPending, rememberPending } from "./pending";

const HOUR = 60 * 60 * 1000;

describe("pending logins", () => {
  beforeEach(() => localStorage.clear());

  it("remembers a started login by its state", () => {
    rememberPending("s-1", { namespace: "bank", profile: "p-1", expiresAt: 10_000 }, 0);
    expect(findPending("s-1", 0)).toEqual({ namespace: "bank", profile: "p-1", expiresAt: 10_000 });
    expect(findPending("s-2", 0)).toBeNull();
  });

  it("forgets one without touching the others", () => {
    rememberPending("s-1", { namespace: "bank", profile: null, expiresAt: 10_000 }, 0);
    rememberPending("s-2", { namespace: "kuvert", profile: null, expiresAt: 10_000 }, 0);
    forgetPending("s-1", 0);
    expect(findPending("s-1", 0)).toBeNull();
    expect(findPending("s-2", 0)?.namespace).toBe("kuvert");
  });

  it("keeps a login a while past its deadline (a later step), then drops it", () => {
    rememberPending("s-1", { namespace: "bank", profile: null, expiresAt: 10_000 }, 0);
    expect(findPending("s-1", 10_000 + HOUR - 1)).not.toBeNull();
    expect(findPending("s-1", 10_000 + HOUR + 1)).toBeNull();
  });

  it("reads unreadable storage as nothing pending", () => {
    localStorage.setItem("orkestrator.authflow.pending", "{not json");
    expect(findPending("s-1")).toBeNull();
  });
});
