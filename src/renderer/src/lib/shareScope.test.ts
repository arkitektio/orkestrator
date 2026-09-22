import { describe, expect, it } from "vitest";

import {
  decodeShareRequest,
  encodeOpaqueScope,
  encodeShareScope,
  matchScope,
  scopeDigest,
  scopeKey,
  type ShareScope,
} from "./shareScope";

const scope = (over: Partial<ShareScope> = {}): ShareScope => ({
  baseUrl: "https://go.arkitekt.live",
  org: "acme",
  hub: null,
  ...over,
});

describe("encodeShareScope", () => {
  it("puts the target path in its own parameter, so page queries cannot collide", () => {
    const encoded = encodeShareScope(scope(), "/mikro/images/5?sidebar=false");
    const request = decodeShareRequest(encoded.slice(encoded.indexOf("?")));
    expect(request?.path).toBe("/mikro/images/5?sidebar=false");
    expect(request?.scope?.org).toBe("acme");
  });

  it("normalizes the base url, so the same server written two ways is one scope", () => {
    expect(encodeShareScope(scope({ baseUrl: "HTTPS://Go.Arkitekt.Live/" }), "/x")).toBe(
      encodeShareScope(scope(), "/x"),
    );
  });

  it("omits absent components rather than spelling them null", () => {
    const encoded = encodeShareScope(scope({ org: null }), "/x");
    expect(encoded).not.toContain("org=");
    expect(encoded).not.toContain("hub=");
  });

  it("carries the hub, so two hubs of one organization stay distinct", () => {
    const encoded = encodeShareScope(scope({ hub: "hub-1" }), "/mikro/images/5");
    const request = decodeShareRequest(encoded.slice(encoded.indexOf("?")));
    expect(request?.scope?.hub).toBe("hub-1");
  });

  it("round-trips through the universal link's nested encoding", () => {
    const gate = encodeShareScope(scope(), "/mikro/images/5?sidebar=false");
    // What the website hands back after `?orkestrator=<gate>`.
    const handedBack = decodeURIComponent(encodeURIComponent(gate));
    const request = decodeShareRequest(handedBack.slice(handedBack.indexOf("?")));
    expect(request?.path).toBe("/mikro/images/5?sidebar=false");
    expect(request?.scope?.baseUrl).toBe("https://go.arkitekt.live");
  });
});

describe("decodeShareRequest", () => {
  it("reads the opaque form as a digest with no scope to describe", () => {
    const encoded = encodeOpaqueScope("7f3a9c21", "/mikro/images/5");
    const request = decodeShareRequest(encoded.slice(encoded.indexOf("?")));
    expect(request).toEqual({ scope: null, digest: "7f3a9c21", path: "/mikro/images/5" });
  });

  it("is null without a path, which is the only part that is never optional", () => {
    expect(decodeShareRequest("?to=https%3A%2F%2Fgo.arkitekt.live")).toBeNull();
  });

  it("is null for a readable link naming no server", () => {
    expect(decodeShareRequest("?path=%2Fmikro%2Fimages%2F5")).toBeNull();
  });
});

describe("scopeDigest", () => {
  it("is stable for the same scope however the url was written", async () => {
    expect(await scopeDigest(scope({ baseUrl: "HTTPS://Go.Arkitekt.Live/" }))).toBe(
      await scopeDigest(scope()),
    );
  });

  it("leaks neither hostname nor organization", async () => {
    const digest = await scopeDigest(scope());
    expect(digest).toMatch(/^[0-9a-f]{8}$/);
    expect(digest).not.toContain("arkitekt");
    expect(digest).not.toContain("acme");
  });

  it("separates a deployment with no organization from one named like the placeholder", async () => {
    expect(await scopeDigest(scope({ org: null }))).not.toBe(
      await scopeDigest(scope({ org: "-" })),
    );
  });

  it("differs for a different hub in the same organization", async () => {
    expect(await scopeDigest(scope({ hub: "hub-1" }))).not.toBe(
      await scopeDigest(scope({ hub: "hub-2" })),
    );
  });

  it("differs for a different organization on the same server", async () => {
    expect(await scopeDigest(scope())).not.toBe(await scopeDigest(scope({ org: "other" })));
  });
});

describe("scopeKey", () => {
  it("keeps an absent component distinct from one that looks like a placeholder", () => {
    expect(scopeKey(scope({ org: null }))).not.toBe(scopeKey(scope({ org: "-" })));
  });
});

describe("matchScope", () => {
  it("matches the same server and organization regardless of who is looking", () => {
    // The whole point: the recipient is a different user on the same scope.
    expect(matchScope(scope(), scope())).toBe(true);
  });

  it("rejects another organization on the same server", () => {
    expect(matchScope(scope(), scope({ org: "other" }))).toBe(false);
  });

  it("rejects the same organization name on another server", () => {
    expect(matchScope(scope(), scope({ baseUrl: "https://other.example.org" }))).toBe(false);
  });

  it("matches when both sides name the same hub", () => {
    expect(matchScope(scope({ hub: "hub-1" }), scope({ hub: "hub-1" }))).toBe(true);
  });

  it("rejects a different hub once both sides know one", () => {
    expect(matchScope(scope({ hub: "prod" }), scope({ hub: "staging" }))).toBe(false);
  });

  it("tolerates a hub the backend has not told us about yet", () => {
    // `Context.hub` does not exist; a null must not read as a mismatch and
    // send every link through a pointless switch prompt.
    expect(matchScope(scope({ hub: "prod" }), scope({ hub: null }))).toBe(true);
    expect(matchScope(scope({ hub: null }), scope({ hub: "prod" }))).toBe(true);
  });
});
