import { describe, expect, it } from "vitest";

import { KABINET_INTENTS, parseRepoInstall } from "./intents";

const parse = (query: string) => parseRepoInstall(new URLSearchParams(query));

describe("repo.install", () => {
  it("reads oci:<registry>/<repository>, lowercased", () => {
    expect(parse("source=oci%3Aghcr.io%2Fjhnnsrs%2Fbasiks")).toEqual({ ok: true, value: "ghcr.io/jhnnsrs/basiks" });
    expect(parse("source=oci:ghcr.io/Arkitektio/Basiks")).toEqual({ ok: true, value: "ghcr.io/arkitektio/basiks" });
    expect(parse("source=oci://ghcr.io/a/b")).toEqual({ ok: true, value: "ghcr.io/a/b" });
    expect(parse("source=oci:localhost:5000/a/b")).toEqual({ ok: true, value: "localhost:5000/a/b" });
  });

  it("refuses a GitHub source, a bare reference and other schemes: links name the package", () => {
    expect(parse("source=github:a/b")).toMatchObject({ ok: false, problem: expect.stringContaining("oci:") });
    expect(parse("source=ghcr.io/a/b").ok).toBe(false);
    expect(parse("").ok).toBe(false);
  });

  it("refuses a tag, a digest or what is not a repository", () => {
    expect(parse("source=oci:ghcr.io/a/b:1.0").ok).toBe(false);
    expect(parse("source=oci:ghcr.io/a/b@sha256:abc").ok).toBe(false);
    expect(parse("source=oci:ghcr.io/a b").ok).toBe(false);
    expect(parse("source=oci:").ok).toBe(false);
  });

  it("lands on the install prompt with the reference", () => {
    const [intent] = KABINET_INTENTS;
    expect(intent.target("ghcr.io/a/b")).toBe("/kabinet/repos/install?reference=ghcr.io%2Fa%2Fb");
  });
});
