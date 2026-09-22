import { describe, expect, it } from "vitest";

import {
  githubIdentifier,
  installBadgeMarkdown,
  installRepoLink,
  installRepoPath,
  parseGithubIdentifier,
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
  const coordinates = { user: "jhnnsrs", repo: "orkestrator" };

  it("points at the prompt with the repo in the query", () => {
    expect(installRepoPath(coordinates)).toBe("/kabinet/repos/install?repo=jhnnsrs%2Forkestrator");
  });

  it("wraps that path in the universal link", () => {
    expect(installRepoLink(coordinates)).toBe(
      "https://arkitekt.live/deeplink?orkestrator=%2Fkabinet%2Frepos%2Finstall%3Frepo%3Djhnnsrs%252Forkestrator",
    );
  });

  it("wraps the link in the generic badge for a README", () => {
    expect(installBadgeMarkdown(coordinates)).toBe(
      "[![Open in Arkitekt](https://arkitekt.live/img/badge/open-in-arkitekt.svg)]" +
        "(https://arkitekt.live/deeplink?orkestrator=%2Fkabinet%2Frepos%2Finstall%3Frepo%3Djhnnsrs%252Forkestrator)",
    );
  });

  it("round-trips through the identifier", () => {
    expect(parseGithubIdentifier(githubIdentifier(coordinates))).toEqual(coordinates);
  });
});
