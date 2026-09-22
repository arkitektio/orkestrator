import { describe, expect, it, vi } from "vitest";
import {
  isSupportedPlatform,
  locateTailscale,
  tailscaleCandidates,
} from "./tailscaleLocate";

describe("tailscaleCandidates", () => {
  it("knows the three platforms we ship on", () => {
    expect(tailscaleCandidates("darwin")).toContain("/usr/local/bin/tailscale");
    expect(tailscaleCandidates("darwin")).toContain(
      "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
    );
    expect(tailscaleCandidates("win32")[0]).toContain("Program Files");
    expect(tailscaleCandidates("linux")).toContain("/usr/bin/tailscale");
  });

  it("returns nothing for a platform we do not handle", () => {
    expect(tailscaleCandidates("aix")).toEqual([]);
    expect(isSupportedPlatform("aix")).toBe(false);
    expect(isSupportedPlatform("darwin")).toBe(true);
  });

  it("is a fixed list — no interpolation, nothing dynamic", () => {
    for (const platform of ["darwin", "linux", "win32"]) {
      for (const candidate of tailscaleCandidates(platform)) {
        expect(candidate).toMatch(/^([/]|[A-Z]:\\)/);
      }
    }
  });
});

describe("locateTailscale", () => {
  it("takes the first candidate that exists", async () => {
    const exists = vi.fn(async (path: string) => path === "/opt/homebrew/bin/tailscale");
    expect(await locateTailscale("darwin", exists)).toBe("/opt/homebrew/bin/tailscale");
  });

  it("prefers the earlier candidate when several exist", async () => {
    expect(await locateTailscale("darwin", async () => true)).toBe("/usr/local/bin/tailscale");
  });

  it("returns undefined when none exist — the App Store case", async () => {
    expect(await locateTailscale("darwin", async () => false)).toBeUndefined();
  });

  it("stops asking once it has a hit", async () => {
    const exists = vi.fn(async () => true);
    await locateTailscale("darwin", exists);
    expect(exists).toHaveBeenCalledTimes(1);
  });
});
