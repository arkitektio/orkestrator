// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText, universalLinkFor } from "./universalLink";

describe("universalLinkFor", () => {
  it("wraps the app-relative path, query included, for arkitekt.live to hand back", () => {
    expect(universalLinkFor({ pathname: "/mikro/arraydatasets/5", search: "?sidebar=false" })).toBe(
      "https://arkitekt.live/deeplink?orkestrator=%2Fmikro%2Farraydatasets%2F5%3Fsidebar%3Dfalse",
    );
  });

  it("copes without a query", () => {
    expect(universalLinkFor({ pathname: "/settings" })).toContain("orkestrator=%2Fsettings");
  });
});

describe("copyText", () => {
  const original = navigator.clipboard;
  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: original, configurable: true });
    // @ts-expect-error - clean up the injected bridge
    delete window.api;
  });

  it("uses the clipboard API when it is there", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await copyText("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to the Electron bridge when the clipboard API refuses", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn(async () => { throw new Error("no focus"); }) },
      configurable: true,
    });
    const copyToClipboard = vi.fn();
    // @ts-expect-error - stand in for the preload bridge
    window.api = { copyToClipboard };
    expect(await copyText("hello")).toBe(true);
    expect(copyToClipboard).toHaveBeenCalledWith("hello");
  });
});
