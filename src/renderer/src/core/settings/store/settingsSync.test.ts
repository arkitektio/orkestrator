// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetBrandTheme } from "./brandTheme";
import { createSettingsStore } from "./settingsStore";
import { defaultSettings } from "./validator";

/**
 * Every window keeps its own settings store over one localStorage key; a
 * change saved in another window must reach this one, or each window keeps
 * the colour it booted with.
 */

const hue = () => document.documentElement.style.getPropertyValue("--brand-hue");

beforeEach(() => localStorage.clear());
afterEach(() => resetBrandTheme());

const fromOtherWindow = (value: object) =>
  window.dispatchEvent(
    new StorageEvent("storage", { key: "wasser-settings", newValue: JSON.stringify(value) }),
  );

describe("settings across windows", () => {
  it("defaults the brand source to the membership for a blob that predates it", () => {
    const { brandSource: _dropped, ...old } = defaultSettings;
    localStorage.setItem("wasser-settings", JSON.stringify(old));
    const store = createSettingsStore();
    store.getState().hydrate();
    expect(store.getState().settings?.brandSource).toBe("membership");
  });

  it("applies a brand another window saved", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    const stop = store.followOtherWindows();

    fromOtherWindow({ ...defaultSettings, brandHue: 145, brandSource: "local" });

    expect(store.getState().settings?.brandHue).toBe(145);
    expect(store.getState().settings?.brandSource).toBe("local");
    expect(hue()).toBe("145");
    stop();
  });

  it("stops following once unsubscribed, and ignores other keys", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    const stop = store.followOtherWindows();

    window.dispatchEvent(new StorageEvent("storage", { key: "theme", newValue: "dark" }));
    expect(store.getState().settings?.brandHue).toBe(defaultSettings.brandHue);

    stop();
    fromOtherWindow({ ...defaultSettings, brandHue: 10 });
    expect(store.getState().settings?.brandHue).toBe(defaultSettings.brandHue);
  });
});
