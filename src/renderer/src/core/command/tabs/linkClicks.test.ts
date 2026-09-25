import { describe, expect, it } from "vitest";
import { linkClickIntent, type AnchorLike, type LinkClickLike } from "./linkClicks";

const anchor = (attrs: Record<string, string>, off = false): AnchorLike => ({
  getAttribute: (name) => attrs[name] ?? null,
  hasAttribute: (name) => name in attrs,
  closest: () => (off ? {} : null),
});

const click = (patch: Partial<LinkClickLike> = {}): LinkClickLike => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...patch,
});

const link = anchor({ href: "/elektro/arraydatasets/5" });

describe("linkClickIntent", () => {
  it("leaves a plain click to the router", () => {
    expect(linkClickIntent(click(), link)).toBeNull();
  });

  it("opens ⌘-click and Ctrl-click in a background tab", () => {
    expect(linkClickIntent(click({ metaKey: true }), link)).toEqual({
      to: "/elektro/arraydatasets/5",
      background: true,
    });
    expect(linkClickIntent(click({ ctrlKey: true }), link)).toEqual({
      to: "/elektro/arraydatasets/5",
      background: true,
    });
  });

  it("opens a middle-click in a background tab", () => {
    expect(linkClickIntent(click({ button: 1 }), link)?.to).toBe("/elektro/arraydatasets/5");
  });

  it("does not claim Shift gestures — they are selection", () => {
    expect(linkClickIntent(click({ shiftKey: true }), link)).toBeNull();
    expect(linkClickIntent(click({ shiftKey: true, ctrlKey: true }), link)).toBeNull();
  });

  it("ignores right-clicks and Alt", () => {
    expect(linkClickIntent(click({ button: 2, ctrlKey: true }), link)).toBeNull();
    expect(linkClickIntent(click({ altKey: true, metaKey: true }), link)).toBeNull();
  });

  it("only claims in-app links", () => {
    const ctrl = click({ ctrlKey: true });
    expect(linkClickIntent(ctrl, anchor({ href: "https://example.org" }))).toBeNull();
    expect(linkClickIntent(ctrl, anchor({ href: "//example.org/x" }))).toBeNull();
    expect(linkClickIntent(ctrl, anchor({ href: "#section" }))).toBeNull();
    expect(linkClickIntent(ctrl, anchor({ href: "/x", target: "_blank" }))).toBeNull();
    expect(linkClickIntent(ctrl, anchor({ href: "/x", download: "" }))).toBeNull();
    expect(linkClickIntent(ctrl, anchor({ href: "/x" }, true))).toBeNull();
  });
});
