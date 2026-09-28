import { describe, expect, it } from "vitest";
import { BankErrorCode } from "./api/graphql";
import { describeError, errorCodeOf, toastText } from "./errors";
import { syncBudget } from "./sync";

describe("bank errors", () => {
  it("reads extensions.code from an Apollo error", () => {
    const apollo = Object.assign(new Error("limit"), {
      graphQLErrors: [{ message: "limit", extensions: { code: "RATE_LIMITED" } }],
    });
    expect(errorCodeOf(apollo)).toBe(BankErrorCode.RateLimited);
    expect(errorCodeOf(new Error("plain"))).toBeNull();
    expect(errorCodeOf({ graphQLErrors: [{ extensions: { code: "UNAUTHENTICATED" } }] })).toBeNull();
  });

  it("offers one fix per code", () => {
    expect(describeError(BankErrorCode.ConsentExpired).fix).toBe("relink");
    expect(describeError(BankErrorCode.CodeExpired).fix).toBe("login");
    expect(describeError(BankErrorCode.InvalidState).fix).toBe("restart");
    expect(describeError(BankErrorCode.BankUnavailable).fix).toBe("later");
    expect(describeError(null, { message: "raw" })).toEqual({ text: "raw", fix: "none" });
  });

  it("says when to try again", () => {
    const at = new Date(Date.now() + 3_600_000).toISOString();
    const text = toastText(
      { graphQLErrors: [{ extensions: { code: "RATE_LIMITED" } }] },
      { nextSyncAllowedAt: at },
    );
    expect(text).toMatch(/Try again at/);
  });
});

describe("syncBudget", () => {
  const now = Date.parse("2026-09-26T10:00:00Z");

  it("blocks until the allowed time, and when none are left", () => {
    expect(syncBudget({ nextSyncAllowedAt: "2026-09-26T14:00:00Z" }, now).blocked).toBe(true);
    expect(syncBudget({ syncsRemainingToday: 0 }, now)).toMatchObject({ blocked: true, title: "No syncs left today" });
  });

  it("allows past times and counts what is left", () => {
    const budget = syncBudget({ nextSyncAllowedAt: "2026-09-26T09:00:00Z", syncsRemainingToday: 2 }, now);
    expect(budget).toMatchObject({ blocked: false, until: null, remaining: 2, title: "2 syncs left today" });
    expect(syncBudget({}, now)).toMatchObject({ blocked: false, remaining: null, title: "Sync now" });
  });
});
