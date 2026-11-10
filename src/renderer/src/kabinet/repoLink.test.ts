import { describe, expect, it } from "vitest";

import {
  githubIdentifier,
  installBadgeMarkdown,
  installRepoIntentPath,
  installRepoLink,
  installRepoPath,
  isBranchName,
  kabinetIdentifier,
  parseGithubIdentifier,
  parseOciReference,
} from "./repoLink";

describe("parseGithubIdentifier", () => {
  it("takes the plain identifier", () => {
    expect(parseGithubIdentifier("jhnnsrs/orkestrator")).toEqual({ user: "jhnnsrs", repo: "orkestrator" });
  });

  it("takes a browser URL, with or without the tail", () => {
    expect(parseGithubIdentifier("https://github.com/jhnnsrs/orkestrator")).toEqual({
      user: "jhnnsrs",
      repo: "orkestrator",
    });
    expect(parseGithubIdentifier("https://www.github.com/jhnnsrs/orkestrator/tree/main")).toEqual({
      user: "jhnnsrs",
      repo: "orkestrator",
    });
  });

  it("takes clone URLs", () => {
    expect(parseGithubIdentifier("git@github.com:jhnnsrs/orkestrator.git")).toEqual({
      user: "jhnnsrs",
      repo: "orkestrator",
    });
    expect(parseGithubIdentifier("  https://github.com/jhnnsrs/orkestrator.git  ")).toEqual({
      user: "jhnnsrs",
      repo: "orkestrator",
    });
  });

  it("refuses what does not name a repository", () => {
    expect(parseGithubIdentifier("")).toBeNull();
    expect(parseGithubIdentifier("jhnnsrs")).toBeNull();
    expect(parseGithubIdentifier("https://github.com/jhnnsrs")).toBeNull();
    expect(parseGithubIdentifier("jhnnsrs/../etc")).toBeNull();
  });
});

describe("install links", () => {
  const reference = "ghcr.io/jhnnsrs/basiks";

  it("lands on the prompt with the reference in the query", () => {
    expect(installRepoPath(reference)).toBe("/kabinet/repos/install?reference=ghcr.io%2Fjhnnsrs%2Fbasiks");
  });

  it("names the repo.install intent with the package, not the route", () => {
    expect(installRepoIntentPath(reference)).toBe("/do/v1/repo.install?source=oci%3Aghcr.io%2Fjhnnsrs%2Fbasiks");
  });

  it("wraps the intent in the universal link", () => {
    expect(installRepoLink(reference)).toBe(
      "https://arkitekt.live/deeplink?orkestrator=%2Fdo%2Fv1%2Frepo.install%3Fsource%3Doci%253Aghcr.io%252Fjhnnsrs%252Fbasiks",
    );
  });

  // Pinned byte-for-byte: badges are pasted into READMEs and never updated, so
  // changing this output is a decision, not a refactor (core/links/LINKS.md).
  // The arkitekt SDK pins the same string (tests/cli/test_badge.py): change
  // both or neither.
  it("wraps the link in the generic badge for a README", () => {
    expect(installBadgeMarkdown(reference)).toBe(
      "[![Open in Arkitekt](https://arkitekt.live/img/badge/open-in-arkitekt.svg)]" +
        "(https://arkitekt.live/deeplink?orkestrator=%2Fdo%2Fv1%2Frepo.install%3Fsource%3Doci%253Aghcr.io%252Fjhnnsrs%252Fbasiks)",
    );
  });

  it("hands Kabinet a legacy GitHub branch inside the identifier", () => {
    const coordinates = { user: "jhnnsrs", repo: "orkestrator" };
    expect(kabinetIdentifier(coordinates)).toBe("jhnnsrs/orkestrator");
    expect(kabinetIdentifier({ ...coordinates, branch: "dev" })).toBe("jhnnsrs/orkestrator:dev");
    expect(parseGithubIdentifier(githubIdentifier(coordinates))).toEqual(coordinates);
  });
});

describe("parseOciReference", () => {
  it("normalizes what a person or a workflow writes", () => {
    expect(parseOciReference(" https://GHCR.io/Owner/App/ ")).toBe("ghcr.io/owner/app");
    expect(parseOciReference("jhnnsrs/basiks")).toBe("jhnnsrs/basiks");
  });

  it("refuses tags, digests and bad segments", () => {
    for (const bad of ["", "ghcr.io/a/b:latest", "a/b@sha256:0", "ghcr.io/a//b", "ghcr.io/-a/b", "ghcr.io/a/b!"]) {
      expect(parseOciReference(bad)).toBeNull();
    }
  });
});

describe("isBranchName", () => {
  it("takes ordinary branches and refuses what git or Kabinet would not", () => {
    for (const ok of ["main", "feature/x", "v1.2", "release-2026"]) expect(isBranchName(ok)).toBe(true);
    for (const bad of ["", "-x", "a..b", "a:b", "a b", "x/", "/x", "x.lock", "a//b"]) expect(isBranchName(bad)).toBe(false);
  });
});
