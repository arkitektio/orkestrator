import { describe, expect, it } from "vitest";
import { mandateHolder, mandateLabel, mandateScopes, mandateStatus, mandateSubject } from "./mandateLabels";

const now = new Date("2026-09-28T12:00:00Z");

describe("mandate labels", () => {
  it("names a mandate by its subject", () => {
    const mandate = { subject: { identifier: "org.example.app", version: "1.2.0", scopes: ["read"] } };
    expect(mandateSubject(mandate)).toEqual({ identifier: "org.example.app", version: "1.2.0" });
    expect(mandateLabel(mandate)).toBe("org.example.app:1.2.0");
    expect(mandateScopes(mandate)).toEqual(["read"]);
  });

  it("names an unpinned mandate", () => {
    expect(mandateLabel({ subject: { identifier: null, version: null } })).toBe("Any app");
    expect(mandateScopes({ subject: { scopes: null } })).toEqual([]);
  });

  it("says who signs the app in", () => {
    expect(mandateHolder({ agentIdentifier: "live.arkitekt.kabinet", keyPrefix: "" })).toBe("live.arkitekt.kabinet");
    expect(mandateHolder({ agentIdentifier: null, keyPrefix: "Xy3k" })).toBe("the holder of key Xy3k…");
  });

  it("ranks revoked over expired over live", () => {
    const base = { subject: {}, isLive: true };
    expect(mandateStatus(base, now)).toBe("live");
    expect(mandateStatus({ ...base, isLive: false, expiresAt: "2026-09-01T00:00:00Z" }, now)).toBe("expired");
    expect(mandateStatus({ ...base, expiresAt: "2026-10-01T00:00:00Z" }, now)).toBe("live");
    expect(
      mandateStatus({ ...base, isLive: false, revokedAt: "2026-09-20T00:00:00Z", expiresAt: "2026-09-01T00:00:00Z" }, now),
    ).toBe("revoked");
    expect(mandateStatus({ ...base, isLive: false }, now)).toBe("paused");
  });
});
