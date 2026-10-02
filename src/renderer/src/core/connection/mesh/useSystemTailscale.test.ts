import { describe, expect, it } from "vitest";
import { resolveConsent } from "./useSystemTailscale";

describe("resolveConsent", () => {
  it("asks until somebody has answered", () => {
    expect(resolveConsent("ask", undefined)).toBe("ask");
    expect(resolveConsent(undefined, undefined)).toBe("ask");
  });

  it("holds an answer for the session", () => {
    expect(resolveConsent("ask", "allowed")).toBe("allowed");
    expect(resolveConsent("ask", "denied")).toBe("denied");
  });

  it("lets the remembered setting outrank whatever was said this session", () => {
    expect(resolveConsent("always", "denied")).toBe("allowed");
    expect(resolveConsent("never", "allowed")).toBe("denied");
  });
});
