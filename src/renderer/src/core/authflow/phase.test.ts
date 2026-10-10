import { describe, expect, it } from "vitest";
import { authPhase, keepWaiting, stepInterval } from "./phase";

const later = "2099-01-01T00:00:00Z";
const earlier = "2000-01-01T00:00:00Z";

describe("authPhase", () => {
  it("walks approve → step → done", () => {
    expect(authPhase({ status: "PENDING", expiresAt: later })).toEqual({ kind: "approve" });
    expect(authPhase({ status: "PENDING", step: "MFA", expiresAt: later })).toEqual({ kind: "step", step: "MFA" });
    expect(authPhase({ status: "DONE", expiresAt: later })).toEqual({ kind: "done" });
  });

  it("expires by the clock or the server's word, but not at a later step by the clock", () => {
    expect(authPhase({ status: "PENDING", expiresAt: earlier }).kind).toBe("expired");
    expect(authPhase({ status: "PENDING", step: "MFA", expiresAt: earlier }).kind).toBe("step");
    expect(authPhase({ status: "EXPIRED", expiresAt: later }).kind).toBe("expired");
    // Finished just past the deadline is still finished.
    expect(authPhase({ status: "DONE", expiresAt: earlier }).kind).toBe("done");
  });

  it("surfaces the server's error on failure, and a cancel as its own end", () => {
    expect(authPhase({ status: "FAILED", errorMessage: "MFA rejected", expiresAt: later })).toEqual({
      kind: "failed",
      message: "MFA rejected",
    });
    expect(authPhase({ status: "FAILED", expiresAt: later }).kind).toBe("failed");
    expect(authPhase({ status: "CANCELLED", expiresAt: later })).toEqual({ kind: "cancelled" });
  });

  it("waits only while open, at the provider's pace for POLL", () => {
    expect(keepWaiting({ kind: "approve" })).toBe(true);
    expect(keepWaiting({ kind: "step", step: "MFA" })).toBe(true);
    expect(keepWaiting({ kind: "done" })).toBe(false);
    expect(keepWaiting({ kind: "expired" })).toBe(false);
    expect(keepWaiting({ kind: "cancelled" })).toBe(false);
    expect(stepInterval("POLL", 7)).toBe(7);
    expect(stepInterval("POLL", null)).toBe(5);
    expect(stepInterval("REDIRECT", 7)).toBe(3);
  });
});
