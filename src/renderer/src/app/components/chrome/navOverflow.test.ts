import { describe, expect, it } from "vitest";
import { NAV_BUTTON_GAP, NAV_BUTTON_SIZE, visibleNavCount } from "./navOverflow";

/** n buttons side by side, gaps between. */
const rowWidth = (n: number) => n * NAV_BUTTON_SIZE + (n - 1) * NAV_BUTTON_GAP;

describe("visibleNavCount", () => {
  it("shows every button when they all fit, with nothing folded away", () => {
    expect(visibleNavCount(rowWidth(4), 4)).toBe(4);
    expect(visibleNavCount(400, 4)).toBe(4);
  });

  it("keeps a slot for the “…” once one button has to go", () => {
    // Room for exactly three: two inline plus the menu holding the other two.
    expect(visibleNavCount(rowWidth(3), 4)).toBe(2);
    // A hair short of three: two slots, so one inline and the menu.
    expect(visibleNavCount(rowWidth(3) - 1, 4)).toBe(1);
  });

  it("folds everything at the very narrowest, leaving just the menu", () => {
    expect(visibleNavCount(rowWidth(1), 4)).toBe(0);
  });

  it("treats an unmeasured width as room for all, never as room for none", () => {
    // jsdom lays nothing out; a 0 must not hide the whole row behind a menu.
    expect(visibleNavCount(0, 4)).toBe(4);
    expect(visibleNavCount(-5, 4)).toBe(4);
  });
});
