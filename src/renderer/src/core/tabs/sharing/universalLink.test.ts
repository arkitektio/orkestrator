// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  badgeMarkdownFor,
  copyText,
  privateLinkFor,
  scopedLinkFor,
  universalLinkFor,
} from "./universalLink";
import { decodeShareRequest } from "./shareScope";

const SCOPE = { baseUrl: "https://go.arkitekt.live", org: "acme", hub: null };

/** The path the site hands back to `orkestrator://` from `?orkestrator=`. */
const handedBack = (link: string): string =>
  decodeURIComponent(new URL(link).searchParams.get("orkestrator") ?? "");

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

describe("scopedLinkFor", () => {
  it("routes through the gate, carrying the server and organization", () => {
    const request = decodeShareRequest(
      handedBack(scopedLinkFor({ pathname: "/mikro/images/5" }, SCOPE)).replace(/^[^?]*/, ""),
    );
    expect(request?.scope).toEqual(SCOPE);
    expect(request?.path).toBe("/mikro/images/5");
  });

  it("keeps the page's own query out of the scope's", () => {
    const request = decodeShareRequest(
      handedBack(
        scopedLinkFor({ pathname: "/mikro/images/5", search: "?sidebar=false" }, SCOPE),
      ).replace(/^[^?]*/, ""),
    );
    // `sidebar` belongs to the page, not to the gate, and must survive intact.
    expect(request?.path).toBe("/mikro/images/5?sidebar=false");
    expect(request?.scope?.org).toBe("acme");
  });

  it("stays one parameter at the site layer, so the website needs no change", () => {
    const url = new URL(scopedLinkFor({ pathname: "/mikro/images/5" }, SCOPE));
    expect([...url.searchParams.keys()]).toEqual(["orkestrator"]);
  });
});

describe("privateLinkFor", () => {
  it("names neither the server nor the organization", async () => {
    const link = await privateLinkFor({ pathname: "/mikro/images/5" }, SCOPE);
    expect(link).not.toContain("arkitekt.live/deeplink?orkestrator=%2Fopen%3Fto");
    expect(decodeURIComponent(link)).not.toContain("go.arkitekt.live");
    expect(decodeURIComponent(link)).not.toContain("acme");
  });

  it("still carries the page to land on", async () => {
    const link = await privateLinkFor({ pathname: "/mikro/images/5" }, SCOPE);
    const request = decodeShareRequest(handedBack(link).replace(/^[^?]*/, ""));
    expect(request?.path).toBe("/mikro/images/5");
    expect(request?.digest).toMatch(/^[0-9a-f]{8}$/);
    expect(request?.scope).toBeNull();
  });
});

describe("badgeMarkdownFor", () => {
  it("is one generic image over the page's own link", () => {
    expect(badgeMarkdownFor({ pathname: "/settings" })).toBe(
      "[![Open in Arkitekt](https://arkitekt.live/img/badge/open-in-arkitekt.svg)]" +
        "(https://arkitekt.live/deeplink?orkestrator=%2Fsettings)",
    );
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
