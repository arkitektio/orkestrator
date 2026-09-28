// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSettingsStore } from "./settingsStore";
import { defaultSettings } from "./validator";

/**
 * The page zoom setting: main zooms the webContents, and the root gets the
 * same factor as `--page-zoom` so the chrome can counter it (`.chrome-zoom`).
 * The token must only ever mirror a zoom that was actually applied: in the
 * browser nothing zooms the window, so the rail must not un-zoom itself.
 */

type W = Window & { api?: unknown };
const w = window as unknown as W;

const setZoomLevel = vi.fn().mockResolvedValue({ success: true });
const api = { setZoomLevel, windowControls: { setRailGlass: vi.fn() } };

const pageZoom = () => document.documentElement.style.getPropertyValue("--page-zoom");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
  setZoomLevel.mockClear();
});

afterEach(() => {
  delete w.api;
});

describe("page zoom", () => {
  it("publishes the applied factor on the root, in Electron", () => {
    w.api = api;
    const store = createSettingsStore();
    store.getState().hydrate();
    // Hydration applies the stored (default) level once, so main and root agree at boot.
    expect(setZoomLevel).toHaveBeenCalledWith(defaultSettings.defaultZoomLevel);
    expect(Number(pageZoom())).toBe(defaultSettings.defaultZoomLevel);

    setZoomLevel.mockClear();
    store.getState().setSettings({ ...defaultSettings, defaultZoomLevel: 1.25 });
    expect(setZoomLevel).toHaveBeenCalledWith(1.25);
    expect(Number(pageZoom())).toBe(1.25);

    // Unchanged level: no second trip across the bridge.
    setZoomLevel.mockClear();
    store.getState().setSettings({ ...defaultSettings, defaultZoomLevel: 1.25, pollInterval: 7 });
    expect(setZoomLevel).not.toHaveBeenCalled();
  });

  it("stays at 1 in the browser, whatever is stored", () => {
    localStorage.setItem(
      "wasser-settings",
      JSON.stringify({ ...defaultSettings, defaultZoomLevel: 0.6 }),
    );
    const store = createSettingsStore();
    store.getState().hydrate();
    expect(store.getState().settings?.defaultZoomLevel).toBe(0.6);
    expect(Number(pageZoom())).toBe(1);
  });
});
