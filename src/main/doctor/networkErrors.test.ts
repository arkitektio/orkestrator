import { describe, expect, it } from "vitest";
import {
  describeCertificate,
  errnoToOutcome,
  errorCode,
  errorMessage,
  looksLikeNotTls,
} from "./networkErrors";

describe("errnoToOutcome", () => {
  it.each([
    ["ENOTFOUND", "nxdomain"],
    ["EAI_AGAIN", "dns-temp"],
    ["ECONNREFUSED", "refused"],
    ["ETIMEDOUT", "timeout"],
    ["DOCTOR_TIMEOUT", "timeout"],
    ["EHOSTUNREACH", "unreachable"],
    ["ENETUNREACH", "unreachable"],
    ["ECONNRESET", "reset"],
    ["ESOMETHINGELSE", "unknown"],
    [undefined, "unknown"],
  ])("%s → %s", (code, expected) => {
    expect(errnoToOutcome(code as string | undefined)).toBe(expected);
  });
});

describe("errorCode / errorMessage", () => {
  it("reads the errno off a node error", () => {
    const error = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    expect(errorCode(error)).toBe("ECONNREFUSED");
    expect(errorMessage(error)).toBe("connect ECONNREFUSED");
  });

  it("survives things that are not errors", () => {
    expect(errorCode("nope")).toBeUndefined();
    expect(errorCode(null)).toBeUndefined();
    expect(errorCode({ code: 42 })).toBeUndefined();
    expect(errorMessage("plain string")).toBe("plain string");
  });
});

describe("describeCertificate", () => {
  const cert = {
    subject: { CN: "mikro.tailnet-cafe.ts.net" },
    issuer: { CN: "Acme Internal CA" },
    valid_to: "Dec 31 23:59:59 2030 GMT",
  };

  it("a trusted, matching certificate is simply ok", () => {
    const stage = describeCertificate({ authorized: true, peerCertificate: cert });
    expect(stage.ok).toBe(true);
    expect(stage.selfSigned).toBeUndefined();
    expect(stage.subject).toBe("mikro.tailnet-cafe.ts.net");
    expect(stage.issuer).toBe("Acme Internal CA");
  });

  it.each([
    "DEPTH_ZERO_SELF_SIGNED_CERT",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  ])("%s is reported as self-signed", (authorizationError) => {
    const stage = describeCertificate({ authorized: false, authorizationError, peerCertificate: cert });
    expect(stage.ok).toBe(false);
    expect(stage.selfSigned).toBe(true);
    expect(stage.expired).toBe(false);
  });

  it("an expired certificate is flagged from the verify code", () => {
    const stage = describeCertificate({
      authorized: false,
      authorizationError: "CERT_HAS_EXPIRED",
      peerCertificate: cert,
    });
    expect(stage.expired).toBe(true);
  });

  it("and from the date alone, when the socket did not say so", () => {
    const stage = describeCertificate({
      authorized: false,
      authorizationError: "DEPTH_ZERO_SELF_SIGNED_CERT",
      peerCertificate: { ...cert, valid_to: "Jan 1 00:00:00 2020 GMT" },
      now: new Date("2026-09-22T00:00:00Z"),
    });
    expect(stage.expired).toBe(true);
  });

  it("a hostname mismatch fails even when the chain verified", () => {
    const stage = describeCertificate({
      authorized: true,
      peerCertificate: cert,
      hostnameError: "Host: other.example. is not in the cert's altnames",
    });
    expect(stage.ok).toBe(false);
    expect(stage.hostnameMismatch).toBe(true);
    expect(stage.message).toContain("altnames");
  });

  it("copes with no certificate at all", () => {
    const stage = describeCertificate({ authorized: false, authorizationError: "UNKNOWN" });
    expect(stage.ok).toBe(false);
    expect(stage.subject).toBeUndefined();
    expect(stage.expired).toBe(false);
  });
});

describe("looksLikeNotTls", () => {
  it("recognises a plain-HTTP port answering a handshake", () => {
    expect(looksLikeNotTls(Object.assign(new Error("x"), { code: "EPROTO" }))).toBe(true);
    expect(looksLikeNotTls(new Error("wrong version number"))).toBe(true);
    expect(looksLikeNotTls(new Error("packet length too long"))).toBe(true);
  });

  it("does not claim it for an ordinary refusal", () => {
    expect(looksLikeNotTls(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toBe(false);
  });
});
