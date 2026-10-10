import { describe, expect, it } from "vitest";

import { deepLinkPath } from "./deepLinkPath";

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
});
