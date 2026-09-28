// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSettingsStore } from "./settingsStore";
import { defaultSettings } from "./validator";

/**
 * The system-wide palette shortcut: old persisted blobs get the default, the
 * value reaches main on hydrate and on change (never on unrelated changes),
 * and main's answer lands in the store for the settings page.
 */

type W = Window & { api?: unknown };
const w = window as unknown as W;

const setGlobalShortcut = vi.fn();
const api = {
  setZoomLevel: vi.fn().mockResolvedValue({ success: true }),
  windowControls: { setRailGlass: vi.fn() },
  palette: { setGlobalShortcut },
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  localStorage.clear();
  setGlobalShortcut.mockReset();
  setGlobalShortcut.mockImplementation((accelerator: string | null) =>
    Promise.resolve({ status: accelerator ? "ok" : "off", accelerator }),
  );
  w.api = api;
});

afterEach(() => {
  delete w.api;
});

describe("globalPaletteShortcut setting", () => {
  it("defaults for a persisted blob that predates it, and tells main at boot", async () => {
    const { globalPaletteShortcut: _dropped, ...old } = defaultSettings;
    localStorage.setItem("wasser-settings", JSON.stringify(old));

    const store = createSettingsStore();
    store.getState().hydrate();
    await flush();

    expect(store.getState().settings?.globalPaletteShortcut).toBe("CommandOrControl+Shift+Space");
    expect(setGlobalShortcut).toHaveBeenCalledWith("CommandOrControl+Shift+Space");
    expect(store.getState().globalShortcutStatus).toEqual({
      status: "ok",
      accelerator: "CommandOrControl+Shift+Space",
    });
  });

  it("pushes a change, including off, but not unrelated edits", async () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    await flush();
    setGlobalShortcut.mockClear();

    store.getState().setSettings({ ...defaultSettings, darkMode: false });
    expect(setGlobalShortcut).not.toHaveBeenCalled();

    store.getState().setSettings({ ...defaultSettings, darkMode: false, globalPaletteShortcut: null });
    await flush();
    expect(setGlobalShortcut).toHaveBeenCalledWith(null);
    expect(store.getState().globalShortcutStatus?.status).toBe("off");
  });

  it("stores main's refusal for the settings page", async () => {
    setGlobalShortcut.mockResolvedValue({ status: "taken", accelerator: "CommandOrControl+Shift+Space" });
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings({ ...defaultSettings, globalPaletteShortcut: "Alt+Space" });
    await flush();
    expect(store.getState().globalShortcutStatus?.status).toBe("taken");
  });
});
