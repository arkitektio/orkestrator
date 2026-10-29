import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIDEBAR_SHORTCUT,
  DEFAULT_RAIL_FLOAT_SHORTCUT,
  defaultSettings,
  settingsValidator,
} from "@/core/settings/store/validator";
import { FIXED_SHORTCUTS, shortcutConflict, takenShortcuts, voiceAccelerator } from "./shortcuts";

describe("the shortcut table", () => {
  it("gives no two shortcuts one combination by default", () => {
    const accelerators = takenShortcuts(defaultSettings).map((entry) => entry.accelerator);
    expect(new Set(accelerators).size).toBe(accelerators.length);
  });

  it("has unique ids", () => {
    const ids = FIXED_SHORTCUTS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("writes the voice hotkey as ⌘/Ctrl plus its key", () => {
    expect(voiceAccelerator("KeyL")).toBe("CommandOrControl+L");
  });
});

describe("shortcutConflict", () => {
  it("names a fixed shortcut that holds the combination", () => {
    expect(shortcutConflict("CommandOrControl+K", "pageSidebarShortcut", defaultSettings)?.id).toBe(
      "palette.open",
    );
  });

  it("names another configured shortcut, but never the one being recorded", () => {
    expect(
      shortcutConflict(DEFAULT_RAIL_FLOAT_SHORTCUT, "pageSidebarShortcut", defaultSettings)?.id,
    ).toBe("railFloatShortcut");
    expect(shortcutConflict(DEFAULT_RAIL_FLOAT_SHORTCUT, "railFloatShortcut", defaultSettings)).toBeNull();
  });

  it("counts the voice and system-wide shortcuts", () => {
    expect(shortcutConflict("CommandOrControl+L", "pageSidebarShortcut", defaultSettings)?.id).toBe(
      "voiceHotkey",
    );
    expect(
      shortcutConflict(defaultSettings.globalPaletteShortcut!, "pageSidebarShortcut", defaultSettings)?.id,
    ).toBe("globalPaletteShortcut");
  });

  it("lets a free combination through, and a turned-off shortcut frees its own", () => {
    expect(shortcutConflict("CommandOrControl+Alt+J", "pageSidebarShortcut", defaultSettings)).toBeNull();
    expect(
      shortcutConflict(DEFAULT_PAGE_SIDEBAR_SHORTCUT, "railFloatShortcut", {
        ...defaultSettings,
        pageSidebarShortcut: null,
      }),
    ).toBeNull();
  });
});

describe("the rail shortcut's first default", () => {
  it("moves a stored ⌘\\ — split view's — to the current default", () => {
    const parsed = settingsValidator.parse({ ...defaultSettings, railFloatShortcut: "CommandOrControl+\\" });
    expect(parsed.railFloatShortcut).toBe(DEFAULT_RAIL_FLOAT_SHORTCUT);
  });

  it("leaves anything else alone", () => {
    expect(settingsValidator.parse({ ...defaultSettings, railFloatShortcut: null }).railFloatShortcut).toBeNull();
    expect(
      settingsValidator.parse({ ...defaultSettings, railFloatShortcut: "CommandOrControl+Alt+B" }).railFloatShortcut,
    ).toBe("CommandOrControl+Alt+B");
  });
});
