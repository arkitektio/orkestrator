import { describe, expect, it, vi } from "vitest";
import type { SectionPins } from "@/core/smart/extensions/section";
import { mergeShortcutPins } from "./pins";

const own = (pinned: string[]): SectionPins & { toggle: ReturnType<typeof vi.fn> } => ({
  isPinned: (key) => pinned.includes(key),
  toggle: vi.fn(),
  order: (key) => (pinned.includes(key) ? pinned.indexOf(key) : Number.MAX_SAFE_INTEGER),
});

describe("shortcut pins", () => {
  it("pins and locks what an admin bound, and keeps the user's own pins", () => {
    const pins = mergeShortcutPins(own(["mine"]), (key) => key === "bound");
    expect(pins.isPinned("bound")).toBe(true);
    expect(pins.isLocked?.("bound")).toBe(true);
    expect(pins.isPinned("mine")).toBe(true);
    expect(pins.isLocked?.("mine")).toBe(false);
    expect(pins.isPinned("other")).toBe(false);
  });

  it("puts bound rows ahead of the user's own", () => {
    const pins = mergeShortcutPins(own(["mine", "later"]), (key) => key === "bound");
    const sorted = ["later", "mine", "bound"].sort((a, b) => pins.order!(a) - pins.order!(b));
    expect(sorted).toEqual(["bound", "mine", "later"]);
  });

  it("never toggles a bound row into the user's own store", () => {
    const base = own([]);
    const pins = mergeShortcutPins(base, (key) => key === "bound");
    pins.toggle("bound");
    pins.toggle("free");
    expect(base.toggle).toHaveBeenCalledTimes(1);
    expect(base.toggle).toHaveBeenCalledWith("free");
  });
});
