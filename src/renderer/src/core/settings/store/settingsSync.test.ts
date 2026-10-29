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

  it("adopts another window's save without saving it back", () => {
    // The ping-pong: a window whose code strips a field this one knows used
    // to re-save the blob on every arrival, which the other window then saw
    // as a change and re-saved — hundreds of saves a second.
    const store = createSettingsStore();
    store.getState().hydrate();
    const stop = store.followOtherWindows();
    const { brandSource: _unknownThere, ...older } = defaultSettings;
    const written = JSON.stringify({ ...older, brandHue: 77 });
    localStorage.setItem("wasser-settings", written);

    window.dispatchEvent(
      new StorageEvent("storage", { key: "wasser-settings", newValue: written }),
    );

    expect(store.getState().settings?.brandHue).toBe(77);
    expect(localStorage.getItem("wasser-settings")).toBe(written);
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

describe("settings never take over the colour mode", () => {
  // Light/dark is `ThemeProvider`'s, on its own key. The store used to write
  // "dark" there on every save — so a reload always came back dark.
  it("leaves the theme key and the root class alone on boot and on save", () => {
    localStorage.setItem("vite-ui-theme", "light");
    document.documentElement.classList.add("light");
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings({ ...defaultSettings, brandHue: 100 });

    expect(localStorage.getItem("vite-ui-theme")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    document.documentElement.classList.remove("light");
  });
});

describe("one bad field costs only itself", () => {
  it("keeps the rest of a stored blob when one field no longer validates", () => {
    localStorage.setItem(
      "wasser-settings",
      JSON.stringify({ ...defaultSettings, brandHue: 145, menuShadow: "huge" }),
    );
    const store = createSettingsStore();
    store.getState().hydrate();

    expect(store.getState().settings?.brandHue).toBe(145);
    expect(store.getState().settings?.menuShadow).toBe(defaultSettings.menuShadow);
    expect(JSON.parse(localStorage.getItem("wasser-settings")!).brandHue).toBe(145);
  });

  it("keeps the value in force when a write carries an invalid one", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings({ ...defaultSettings, brandHue: 120 });
    store.getState().setSettings({ ...defaultSettings, brandHue: 400 });

    expect(store.getState().settings).toBeDefined();
    expect(store.getState().settings?.brandHue).toBe(120);
    expect(JSON.parse(localStorage.getItem("wasser-settings")!).brandHue).toBe(120);
  });

  it("refuses a write it cannot read at all, rather than dropping every setting", () => {
    const store = createSettingsStore();
    store.getState().hydrate();
    store.getState().setSettings(null as never);
    expect(store.getState().settings?.brandHue).toBe(defaultSettings.brandHue);
  });
});
