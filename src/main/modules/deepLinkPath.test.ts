import { describe, expect, it } from "vitest";

import { createDeepLinkDedupe, deepLinkPath, MAX_DEEP_LINK_LENGTH, parseDeepLink } from "./deepLinkPath";

describe("deepLinkPath", () => {
  it("joins host and path with exactly one leading slash", () => {
    expect(deepLinkPath(new URL("orkestrator://mikro/arraydatasets/5"))).toBe("/mikro/arraydatasets/5");
  });

  it("does not double the slash when the link's path carried its own", () => {
    // What a universal link's encoded "/mikro/…" becomes: an empty host.
    expect(deepLinkPath(new URL("orkestrator:///mikro/arraydatasets/5"))).toBe("/mikro/arraydatasets/5");
  });

  it("leaves a smartlink's encoded identifier as one segment", () => {
    // Decoding here would split `@mikro/image` in two; the renderer splits
    // first and decodes after.
    expect(deepLinkPath(new URL("orkestrator://smart/my-lab/3/%40mikro%2Fimage/42"))).toBe(
      "/smart/my-lab/3/%40mikro%2Fimage/42",
    );
  });

  it("takes the relay's auth callback with its query unchanged", () => {
    expect(deepLinkPath(new URL("orkestrator://bank/auth/callback?code=a%2Fb&state=s"))).toBe(
      "/bank/auth/callback?code=a%2Fb&state=s",
    );
  });

  it("keeps the query", () => {
    expect(deepLinkPath(new URL("orkestrator:///mikro/x?sidebar=false"))).toBe("/mikro/x?sidebar=false");
  });

  it("takes an intent link as written", () => {
    expect(deepLinkPath(new URL("orkestrator://do/v1/repo.install?source=github%3Aa%2Fb"))).toBe(
      "/do/v1/repo.install?source=github%3Aa%2Fb",
    );
  });
});

describe("parseDeepLink", () => {
  it("takes orkestrator: links only", () => {
    expect(parseDeepLink("orkestrator://do/v1/repo.install?source=github%3Aa%2Fb")).not.toBeNull();
    expect(parseDeepLink("https://example.com/x")).toBeNull();
    expect(parseDeepLink("javascript:alert(1)")).toBeNull();
    expect(parseDeepLink("not a url")).toBeNull();
  });

  it("refuses absurdly long links", () => {
    expect(parseDeepLink(`orkestrator://do/v1/repo.install?source=${"a".repeat(MAX_DEEP_LINK_LENGTH)}`)).toBeNull();
  });
});

describe("createDeepLinkDedupe", () => {
  it("drops the same link handed over twice in a row, not a later click", () => {
    let now = 0;
    const fresh = createDeepLinkDedupe(1500, () => now);
    expect(fresh("orkestrator://a")).toBe(true);
    now = 100;
    expect(fresh("orkestrator://a")).toBe(false);
    expect(fresh("orkestrator://b")).toBe(true);
    now = 5000;
    expect(fresh("orkestrator://b")).toBe(true);
  });
});
