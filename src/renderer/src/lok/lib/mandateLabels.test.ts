import { describe, expect, it } from "vitest";
import { mandateLabel, mandateScopes, mandateStatus, mandateSubject } from "./mandateLabels";

const now = new Date("2026-09-28T12:00:00Z");

describe("mandate labels", () => {
  it("names a mandate by its subject", () => {
    const mandate = { subjectManifest: { identifier: "org.example.app", version: "1.2.0", scopes: ["read", 3] } };
    expect(mandateSubject(mandate)).toEqual({ identifier: "org.example.app", version: "1.2.0" });
    expect(mandateLabel(mandate)).toBe("org.example.app:1.2.0");
    expect(mandateScopes(mandate)).toEqual(["read"]);
  });

  it("survives a malformed manifest", () => {
    expect(mandateLabel({ subjectManifest: null })).toBe("Unknown app");
    expect(mandateScopes({ subjectManifest: "nope" })).toEqual([]);
  });

  it("ranks revoked over expired over live", () => {
    const base = { subjectManifest: {}, isLive: true };
    expect(mandateStatus(base, now)).toBe("live");
    expect(mandateStatus({ ...base, isLive: false, expiresAt: "2026-09-01T00:00:00Z" }, now)).toBe("expired");
    expect(mandateStatus({ ...base, expiresAt: "2026-10-01T00:00:00Z" }, now)).toBe("live");
    expect(
      mandateStatus({ ...base, isLive: false, revokedAt: "2026-09-20T00:00:00Z", expiresAt: "2026-09-01T00:00:00Z" }, now),
    ).toBe("revoked");
    expect(mandateStatus({ ...base, isLive: false }, now)).toBe("paused");
  });
});
