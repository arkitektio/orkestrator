import { describe, expect, it } from "vitest";
import { MailErrorCode } from "./api/graphql";
import { describeError, errorCodeOf, toastText } from "./errors";

const gqlError = (code: string, message = "boom") =>
  Object.assign(new Error(message), { graphQLErrors: [{ extensions: { code } }] });

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

  it("falls back to the message", () => {
    expect(toastText(new Error("offline"))).toBe("offline");
  });
});
