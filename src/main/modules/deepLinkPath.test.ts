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

  it("keeps the query", () => {
    expect(deepLinkPath(new URL("orkestrator:///mikro/x?sidebar=false"))).toBe("/mikro/x?sidebar=false");
  });
});
