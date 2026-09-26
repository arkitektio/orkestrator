// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseRedirect } from "./redirect";

describe("parseRedirect", () => {
  it("reads code and state from the full redirect URL", () => {
    expect(parseRedirect("https://example.org/bank/callback?code=abc&state=xyz")).toEqual({
      code: "abc",
      state: "xyz",
    });
  });

  it("accepts a bare query string", () => {
    expect(parseRedirect("?state=s1&code=c1")).toEqual({ code: "c1", state: "s1" });
    expect(parseRedirect("code=c1&state=s1")).toEqual({ code: "c1", state: "s1" });
  });

  it("refuses anything without both", () => {
    expect(parseRedirect("https://example.org/?code=only")).toBeNull();
    expect(parseRedirect("  ")).toBeNull();
  });
});
