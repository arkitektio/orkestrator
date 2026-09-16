import { describe, expect, it } from "vitest";

import { hashFor, readBootPath } from "./hashMirror";

describe("hashFor", () => {
  it("writes the HashRouter shape in Electron, where the basename is empty", () => {
    expect(hashFor({ pathname: "/mikro/arraydatasets/5", search: "?x=1", hash: "" }, "")).toBe(
      "#/mikro/arraydatasets/5?x=1",
    );
  });

  it("prefixes the basename in the web build", () => {
    expect(hashFor({ pathname: "/mikro", search: "", hash: "" }, "orkestrator")).toBe(
      "#/orkestrator/mikro",
    );
  });

  it("preserves an in-page hash fragment", () => {
    expect(hashFor({ pathname: "/a", search: "", hash: "#section" }, "")).toBe("#/a#section");
  });

  it("writes the root when at the root", () => {
    expect(hashFor({ pathname: "/", search: "", hash: "" }, "")).toBe("#/");
  });
});

describe("readBootPath", () => {
  it("reads an Electron hash back to an app-relative path", () => {
    expect(readBootPath("#/mikro/arraydatasets/5?x=1", "")).toBe("/mikro/arraydatasets/5?x=1");
  });

  it("strips the basename in the web build", () => {
    expect(readBootPath("#/orkestrator/mikro", "orkestrator")).toBe("/mikro");
  });

  it("treats an empty or root hash as 'nothing to open'", () => {
    // Boot then restores tabs from storage instead of opening one.
    expect(readBootPath("", "")).toBeNull();
    expect(readBootPath("#", "")).toBeNull();
    expect(readBootPath("#/", "")).toBeNull();
    expect(readBootPath("#/orkestrator", "orkestrator")).toBeNull();
    expect(readBootPath("#/orkestrator/", "orkestrator")).toBeNull();
  });

  it("refuses a hash that does not carry the web build's basename", () => {
    // Not ours to interpret — a stray fragment must not become a route.
    expect(readBootPath("#/somewhere", "orkestrator")).toBeNull();
  });

  it("round-trips with hashFor", () => {
    for (const baseName of ["", "orkestrator"]) {
      const loc = { pathname: "/kraph/graphs/9", search: "?tab=2", hash: "#top" };
      expect(readBootPath(hashFor(loc, baseName), baseName)).toBe("/kraph/graphs/9?tab=2#top");
    }
  });
});
