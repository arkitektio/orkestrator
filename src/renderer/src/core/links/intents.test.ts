import { describe, expect, it } from "vitest";

import { intentPath, parseIntentPath } from "./intents";

describe("intent links", () => {
  it("builds the path with the parameters in the order given, leaving out empty ones", () => {
    expect(intentPath("repo.install", { source: "oci:ghcr.io/a/b", ref: undefined })).toBe(
      "/do/v1/repo.install?source=oci%3Aghcr.io%2Fa%2Fb",
    );
    expect(intentPath("repo.install", { source: "oci:ghcr.io/a/b", ref: "dev" }, 2)).toBe(
      "/do/v2/repo.install?source=oci%3Aghcr.io%2Fa%2Fb&ref=dev",
    );
  });

  it("refuses to build a name that is not one", () => {
    expect(() => intentPath("install")).toThrow();
    expect(() => intentPath("Repo.Install")).toThrow();
  });

  it("round-trips", () => {
    const link = parseIntentPath("/do/v1/repo.install", "?source=oci%3Aghcr.io%2Fa%2Fb&ref=dev");
    expect(link?.name).toBe("repo.install");
    expect(link?.version).toBe(1);
    expect(link?.params.get("source")).toBe("oci:ghcr.io/a/b");
    expect(link?.params.get("ref")).toBe("dev");
  });

  it("reads a well-formed link with an unknown name or newer version (the page decides)", () => {
    expect(parseIntentPath("/do/v7/flow.deploy")?.version).toBe(7);
  });

  it("is null for what is not an intent link", () => {
    for (const path of ["/do", "/do/v1", "/do/1/repo.install", "/do/v0/repo.install", "/do/v1/repo", "/do/v1/a.b/c", "/mikro/v1/a.b"]) {
      expect(parseIntentPath(path)).toBeNull();
    }
  });
});
