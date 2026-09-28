import { describe, expect, it } from "vitest";
import { AuthFinish, ConnectionStatus, LinkStep } from "../api/graphql";
import { authPhase, keepPolling, stepInterval } from "./phase";

const later = "2099-01-01T00:00:00Z";
const earlier = "2000-01-01T00:00:00Z";

describe("authPhase", () => {
  it("walks DEVICE → MFA → ACTIVE", () => {
    expect(authPhase({ status: ConnectionStatus.Pending, linkStep: LinkStep.Device }, later)).toEqual({ kind: "approve" });
    expect(authPhase({ status: ConnectionStatus.Pending, linkStep: LinkStep.Mfa }, later)).toEqual({ kind: "mfa" });
    expect(authPhase({ status: ConnectionStatus.Active, linkStep: LinkStep.Done }, later)).toEqual({ kind: "active" });
  });

  it("waits in the browser for a REDIRECT login (no link step)", () => {
    expect(authPhase({ status: ConnectionStatus.Pending, linkStep: null }, later)).toEqual({ kind: "approve" });
    expect(authPhase(null, later)).toEqual({ kind: "approve" });
  });

  it("expires by the clock, by the server's isAbandoned, or EXPIRED, but not at MFA by the clock", () => {
    expect(authPhase({ status: ConnectionStatus.Pending, linkStep: LinkStep.Device }, earlier).kind).toBe("expired");
    expect(authPhase({ status: ConnectionStatus.Pending, linkStep: LinkStep.Mfa }, earlier).kind).toBe("mfa");
    expect(authPhase({ status: ConnectionStatus.Pending, isAbandoned: true }, later).kind).toBe("expired");
    expect(authPhase({ status: ConnectionStatus.Expired }, later).kind).toBe("expired");
  });

  it("surfaces the server's error on failure", () => {
    expect(authPhase({ status: ConnectionStatus.Failed, lastError: "MFA rejected" }, later)).toEqual({
      kind: "failed",
      message: "MFA rejected",
    });
  });

  it("polls only while waiting, at the provider's pace for POLL", () => {
    expect(keepPolling({ kind: "approve" })).toBe(true);
    expect(keepPolling({ kind: "mfa" })).toBe(true);
    expect(keepPolling({ kind: "active" })).toBe(false);
    expect(keepPolling({ kind: "expired" })).toBe(false);
    expect(stepInterval(AuthFinish.Poll, 7)).toBe(7);
    expect(stepInterval(AuthFinish.Poll, null)).toBe(5);
    expect(stepInterval(AuthFinish.Redirect, 7)).toBe(3);
  });
});
