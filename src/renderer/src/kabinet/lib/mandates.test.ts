import { describe, expect, it } from "vitest";
import { lapseReason, mandateLapsed, splitByMandate } from "./mandates";

const approval = (mandateId: string) => ({ mandateId });

describe("mandate checks", () => {
  const statuses = {
    live: { live: true, expiresAt: null, revokedAt: null },
    expired: { live: false, expiresAt: "2026-01-01T00:00:00Z", revokedAt: null },
    revoked: { live: false, expiresAt: "2099-01-01T00:00:00Z", revokedAt: "2026-02-01T00:00:00Z" },
  };

  it("holds back only what lok says no longer works", () => {
    const all = [approval("live"), approval("expired"), approval("revoked"), approval("unknown")];
    const { live, lapsed } = splitByMandate(all, statuses);
    expect(live.map((a) => a.mandateId)).toEqual(["live", "unknown"]);
    expect(lapsed.map((a) => a.mandateId)).toEqual(["expired", "revoked"]);
    // No answer from lok: nothing is held back.
    expect(mandateLapsed(undefined, approval("expired"))).toBe(false);
    expect(splitByMandate(all, {}).lapsed).toEqual([]);
  });

  it("tells expired from withdrawn", () => {
    const now = Date.parse("2026-06-01T00:00:00Z");
    expect(lapseReason(statuses.expired, now)).toBe("expired");
    expect(lapseReason(statuses.revoked, now)).toBe("withdrawn");
    expect(lapseReason({ live: false, expiresAt: null, revokedAt: null }, now)).toBe("withdrawn");
  });
});
