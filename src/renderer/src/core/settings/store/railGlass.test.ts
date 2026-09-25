// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSettingsStore } from "./settingsStore";
import { defaultSettings } from "./validator";

/**
 * The translucent sidebar setting: it must survive old persisted blobs that
 * predate it, flip the root class that hides the page under the rail, and
 * reach main through the bridge — but only where the OS can draw it.
 */

type W = Window & {
  electron?: { process?: { platform?: string } };
  api?: unknown;
};
const w = window as unknown as W;

const setRailGlass = vi.fn();
const api = {
  setZoomLevel: vi.fn().mockResolvedValue({ success: true }),
  windowControls: { setRailGlass },
};

const hasClass = () => document.documentElement.classList.contains("rail-glass");
const tint = () => document.documentElement.style.getPropertyValue("--rail-glass-tint");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  setRailGlass.mockClear();
  w.api = api;
});

afterEach(() => {
  delete w.electron;
  delete w.api;
});

describe("railGlass setting", () => {
  it("defaults to off for a persisted blob that predates it", () => {
    w.electron = { process: { platform: "darwin" } };
    const { railGlass: _dropped, ...old } = defaultSettings;
    localStorage.setItem("wasser-settings", JSON.stringify(old));

    const store = createSettingsStore();
    store.getState().hydrate();

    expect(store.getState().settings?.railGlass).toBe(false);
    expect(hasClass()).toBe(false);
    // Hydration reports the value once so main and renderer agree at boot.
    expect(setRailGlass).toHaveBeenCalledWith(false);
  });

  it("toggles the root class and tells main, on macOS", () => {
    w.electron = { process: { platform: "darwin" } };
    const store = createSettingsStore();
    store.getState().hydrate();
    setRailGlass.mockClear();

    store.getState().setSettings({ ...defaultSettings, railGlass: true });
    expect(hasClass()).toBe(true);
    expect(setRailGlass).toHaveBeenCalledWith(true);
    // 70% see-through leaves a 30% share of the sidebar colour.
    expect(Number(tint())).toBeCloseTo(0.3);

    // The amount is its own setting and repaints without touching main.
    setRailGlass.mockClear();
    store.getState().setSettings({ ...defaultSettings, railGlass: true, railGlassTransparency: 1 });
    expect(Number(tint())).toBe(0);
    expect(setRailGlass).not.toHaveBeenCalled();

    // Unchanged value: no second trip across the bridge.
    setRailGlass.mockClear();
    store.getState().setSettings({ ...defaultSettings, railGlass: true, pollInterval: 1 });
    expect(setRailGlass).not.toHaveBeenCalled();

    store.getState().setSettings({ ...defaultSettings, railGlass: false });
    expect(hasClass()).toBe(false);
    expect(setRailGlass).toHaveBeenCalledWith(false);
  });

  it("stays flat on Linux and in the browser, whatever is stored", () => {
    w.electron = { process: { platform: "linux" } };
    localStorage.setItem(
      "wasser-settings",
      JSON.stringify({ ...defaultSettings, railGlass: true }),
    );
    const store = createSettingsStore();
    store.getState().hydrate();

    expect(store.getState().settings?.railGlass).toBe(true);
    expect(hasClass()).toBe(false);
    expect(setRailGlass).not.toHaveBeenCalled();

    delete w.electron;
    store.getState().setSettings({ ...defaultSettings, railGlass: true, pollInterval: 2 });
    expect(hasClass()).toBe(false);
  });
});
