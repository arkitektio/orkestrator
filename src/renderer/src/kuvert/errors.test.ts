import { describe, expect, it } from "vitest";
import { MailErrorCode } from "./api/graphql";
import { asKuvertError, codedError, describeError, describeKuvertError, errorCodeOf, toastText } from "./errors";

const gqlError = (code: string, message = "boom") =>
  Object.assign(new Error(message), { graphQLErrors: [{ message, extensions: { code } }] });

describe("errorCodeOf", () => {
  it("reads a known code from the GraphQL error", () => {
    expect(errorCodeOf(gqlError("CONSENT_EXPIRED"))).toBe(MailErrorCode.ConsentExpired);
  });

  it("ignores codes that are not mail codes", () => {
    expect(errorCodeOf(gqlError("FORBIDDEN"))).toBeNull();
    expect(errorCodeOf(new Error("plain"))).toBeNull();
  });
});

describe("describeError", () => {
  it("offers a relink for an expired consent", () => {
    expect(describeError(MailErrorCode.ConsentExpired).fix).toBe("relink");
  });

  it("keeps the server's own words where they say more", () => {
    expect(describeError(MailErrorCode.SendRejected, { message: "550 no such user" }).text).toBe("550 no such user");
  });

  it("points a refused push at the sync settings", () => {
    expect(describeError(MailErrorCode.UnsupportedByPolicy).text).toMatch(/sync settings/);
  });

  it("falls back to the message", () => {
    expect(toastText(new Error("offline"))).toBe("offline");
  });
});

describe("describeKuvertError", () => {
  it("words a mail code from the table and keeps the raw text for details", () => {
    const described = describeKuvertError(gqlError("CONSENT_EXPIRED", "token revoked"));
    expect(described.message).toMatch(/Link the mailbox again/);
    expect(described.technical).toMatch(/token revoked/);
  });

  it("leaves an error without a mail code to the host's reading", () => {
    expect(describeKuvertError(new Error("offline")).message).toBe("offline");
  });
});

describe("asKuvertError", () => {
  it("carries the table's words and the raw text", () => {
    const error = asKuvertError(gqlError("AUTH_FAILED", "535 bad credentials")) as Error & { technical: string };
    expect(error.message).toBe("The server refused the username or password.");
    expect(error.technical).toMatch(/535 bad credentials/);
  });

  it("leaves a cancellation alone", () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(asKuvertError(abort)).toBe(abort);
  });
});

describe("codedError", () => {
  it("reads a failed send from its code and message", () => {
    expect(codedError(MailErrorCode.SendRejected, "550 no such user").message).toBe("550 no such user");
  });

  it("falls back when the server said nothing", () => {
    expect(codedError(null, null, "Not sent.").message).toBe("Not sent.");
  });
});
