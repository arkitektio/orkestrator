import { describe, expect, it } from "vitest";
import { linkClickIntent, sidebarIntent, type AnchorLike, type LinkClickLike } from "./linkClicks";

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

/** A link inside the pane of tab `tabId` (or in none), optionally opted out. */
const inPane = (href: string, tabId: string | null, off = false): AnchorLike => ({
  getAttribute: (name) => (name === "href" ? href : null),
  hasAttribute: () => false,
  closest: (selector) => {
    if (selector === "[data-tab-link='off']") return off ? {} : null;
    if (selector === "[data-tab-id]") return tabId ? { getAttribute: (name: string) => (name === "data-tab-id" ? tabId : null) } : null;
    return null;
  },
});

describe("sidebarIntent", () => {
  // "side" is a sidebar tab beside "main"; "main" is not one.
  const siblingFor = (id: string) => (id === "side" ? "main" : null);

  it("sends a plain click in a sidebar pane to the pane beside it", () => {
    expect(sidebarIntent(click(), inPane("/kraph/todoitems/3", "side"), siblingFor)).toEqual({
      to: "/kraph/todoitems/3",
      from: "side",
      tabId: "main",
    });
  });

  it("leaves a link in an ordinary pane, or outside any pane, alone", () => {
    expect(sidebarIntent(click(), inPane("/kraph/todoitems/3", "main"), siblingFor)).toBeNull();
    expect(sidebarIntent(click(), inPane("/kraph/todoitems/3", null), siblingFor)).toBeNull();
  });

  it("leaves modified and other-button clicks to the other gestures", () => {
    const link = inPane("/kraph/todoitems/3", "side");
    for (const patch of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(sidebarIntent(click(patch), link, siblingFor)).toBeNull();
    }
  });

  it("leaves external and opted-out links alone", () => {
    expect(sidebarIntent(click(), inPane("https://example.org", "side"), siblingFor)).toBeNull();
    expect(sidebarIntent(click(), inPane("/kraph/todoitems/3", "side", true), siblingFor)).toBeNull();
  });
});
