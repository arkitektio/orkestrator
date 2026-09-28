import { describe, expect, it } from "vitest";

import { acceleratorFromKeyPress, formatAccelerator, type KeyPress } from "./accelerator";

const press = (code: string, mods: Partial<KeyPress> = {}): KeyPress => ({
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("acceleratorFromKeyPress", () => {
  it("stores the primary modifier portably on both platforms", () => {
    expect(acceleratorFromKeyPress(press("Space", { metaKey: true, shiftKey: true }), "darwin")).toBe(
      "CommandOrControl+Shift+Space",
    );
    expect(acceleratorFromKeyPress(press("Space", { ctrlKey: true, shiftKey: true }), "other")).toBe(
      "CommandOrControl+Shift+Space",
    );
  });

  it("names letters, digits, arrows and punctuation as Electron does", () => {
    expect(acceleratorFromKeyPress(press("KeyK", { altKey: true }), "darwin")).toBe("Alt+K");
    expect(acceleratorFromKeyPress(press("Digit3", { ctrlKey: true }), "other")).toBe("CommandOrControl+3");
    expect(acceleratorFromKeyPress(press("ArrowUp", { altKey: true }), "other")).toBe("Alt+Up");
    expect(acceleratorFromKeyPress(press("Slash", { metaKey: true }), "darwin")).toBe("CommandOrControl+/");
  });

  it("keeps the secondary modifier by name", () => {
    expect(acceleratorFromKeyPress(press("KeyP", { metaKey: true, ctrlKey: true }), "darwin")).toBe(
      "CommandOrControl+Control+P",
    );
  });

  it("waits while only modifiers are down", () => {
    expect(acceleratorFromKeyPress(press("ShiftLeft", { shiftKey: true }))).toBeNull();
    expect(acceleratorFromKeyPress(press("MetaRight", { metaKey: true }))).toBeNull();
  });

  it("refuses shortcuts that would swallow typing everywhere", () => {
    expect(acceleratorFromKeyPress(press("KeyK"))).toBeNull();
    expect(acceleratorFromKeyPress(press("KeyK", { shiftKey: true }))).toBeNull();
  });

  it("allows a function key alone", () => {
    expect(acceleratorFromKeyPress(press("F13"))).toBe("F13");
  });

  it("ignores keys Electron has no name for", () => {
    expect(acceleratorFromKeyPress(press("IntlBackslash", { altKey: true }))).toBeNull();
  });
});

describe("formatAccelerator", () => {
  it("writes macOS symbols in the platform's order", () => {
    expect(formatAccelerator("CommandOrControl+Shift+Space", "darwin")).toBe("⇧⌘Space");
    expect(formatAccelerator("CommandOrControl+Control+Alt+P", "darwin")).toBe("⌃⌥⌘P");
  });

  it("spells it out elsewhere", () => {
    expect(formatAccelerator("CommandOrControl+Shift+Space", "other")).toBe("Ctrl+Shift+Space");
    expect(formatAccelerator("Super+Alt+K", "other")).toBe("Win+Alt+K");
  });
});
