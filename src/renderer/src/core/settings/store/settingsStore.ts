import { getPlatform } from "@/core/util/platform";
import { createStore, type StoreApi } from "zustand/vanilla";
import { setBrandBase } from "./brandTheme";
import { defaultSettings, type Settings, settingsValidator } from "./validator";

export type SettingsStoreState = {
  settings: Settings | undefined;
  setSettings: (settings: Settings) => void;
  hydrate: () => void;
  setDefaultSettings: (settings: Settings) => void;
};

export type SettingsStore = StoreApi<SettingsStoreState> & {
  cleanup: () => void;
};

function normalizeSettings(
  value: unknown,
  fallbackSettings: Settings,
): Settings | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const definedEntries = Object.fromEntries(
    Object.entries(value as object).filter(([, entryValue]) => entryValue !== undefined),
  );

  const result = settingsValidator.safeParse({
    ...fallbackSettings,
    ...definedEntries,
  });

  if (!result.success) {
    console.error("Invalid settings", result.error);
    return undefined;
  }

  return result.data;
}

function applyThemeSettings(settings: Settings) {
  if (typeof document === "undefined") {
    return;
  }

  const theme = settings.darkMode ? "dark" : "light";
  localStorage.setItem("theme", theme);
  localStorage.setItem("vite-ui-theme", theme);

  if (settings.darkMode) {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("theme-back-bright");
    document.documentElement.classList.remove("theme-back-zink");
    return;
  }

  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
  document.documentElement.classList.remove("theme-back-bright");
  document.documentElement.classList.add("theme-back-zink");
}

function applyBrandSettings(settings: Settings) {
  // The variables are shared with the scene tint, so they are written through
  // `brandTheme` rather than set here directly — see that module.
  setBrandBase({ hue: settings.brandHue, chroma: settings.brandChroma });
}

/**
 * The page zoom has two halves. Main zooms the whole webContents (a Chromium
 * zoom factor, so the page's viewers and drag maths keep one coordinate
 * space); the chrome counters it with CSS `zoom: calc(1 / var(--page-zoom))`
 * so the rail stays at a fixed native size (`.chrome-zoom` in `index.css`,
 * `ChromeSurface.tsx`). The token is only ever the factor main was actually
 * asked for: in the web build nothing zooms the window, so the rail must not
 * counter a zoom that never happened.
 */
function applyZoomLevel(zoomLevel: number) {
  const bridged = typeof window !== "undefined" && !!window.api;
  if (bridged) {
    window.api.setZoomLevel(zoomLevel).catch(console.error);
  }
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--page-zoom", String(bridged ? zoomLevel : 1));
  }
}

/**
 * The translucent sidebar has two halves. Main switches the OS effect on the
 * window; the page has to stop painting under the rail, which the `rail-glass`
 * class on the root does (`.rail-glass body` and the `glass:` variant in
 * `index.css`). Neither half applies where the platform cannot draw it, so
 * the web build and Linux keep the flat rail whatever the stored value says.
 */
function applyRailGlass(enabled: boolean, transparency: number, notifyMain: boolean) {
  if (typeof document === "undefined") return;
  const platform = getPlatform();
  const supported = platform === "darwin" || platform === "win32";
  const on = enabled && supported;
  const root = document.documentElement;
  root.classList.toggle("rail-glass", on);
  // The share of the sidebar colour painted back over the blur. The page
  // reads it in `index.css`; 0 is the bare OS blur, 1 the flat rail. Pure
  // CSS, so a change of amount never has to cross to main.
  root.style.setProperty("--rail-glass-tint", String(1 - transparency));
  if (supported && notifyMain) {
    window.api?.windowControls?.setRailGlass?.(on);
  }
}

export function createSettingsStore(
  initialDefaultSettings: Settings = defaultSettings,
): SettingsStore {
  let currentDefaultSettings = initialDefaultSettings;
  let isHydrating = false;

  const store = createStore<SettingsStoreState>((set) => ({
    settings: undefined,
    setSettings: (nextSettings) => {
      const previousSettings = store.getState().settings;
      const normalizedSettings = normalizeSettings(nextSettings, currentDefaultSettings);
      if (normalizedSettings) {
        localStorage.setItem("wasser-settings", JSON.stringify(normalizedSettings));
        console.log("Settings saved to local storage");

        applyThemeSettings(normalizedSettings);
        applyBrandSettings(normalizedSettings);

        if (
          isHydrating ||
          normalizedSettings.defaultZoomLevel !== previousSettings?.defaultZoomLevel
        ) {
          applyZoomLevel(normalizedSettings.defaultZoomLevel);
        }

        const glassToggled =
          isHydrating || normalizedSettings.railGlass !== previousSettings?.railGlass;
        if (
          glassToggled ||
          normalizedSettings.railGlassTransparency !== previousSettings?.railGlassTransparency
        ) {
          applyRailGlass(
            normalizedSettings.railGlass,
            normalizedSettings.railGlassTransparency,
            glassToggled,
          );
        }
      }
      set({ settings: normalizedSettings });
    },
    hydrate: () => {
      let localSettings: Settings | undefined;
      isHydrating = true;
      try {
        const serializedSettings = localStorage.getItem("wasser-settings");
        if (serializedSettings) {
          localSettings = normalizeSettings(
            JSON.parse(serializedSettings),
            currentDefaultSettings,
          );
          if (localSettings) {
            console.log("Settings loaded from local storage");
          }
        }
      } catch (error) {
        console.error(error);
        localSettings = undefined;
      }

      if (localSettings) {
        store.getState().setSettings(localSettings);
      } else {
        console.log("Could not load settings from local storage");
        store.getState().setSettings(currentDefaultSettings);
      }
      isHydrating = false;
    },
    setDefaultSettings: (settings) => {
      currentDefaultSettings = settings;
    },
  }));

  const extendedStore = store as SettingsStore;
  extendedStore.cleanup = () => {
    return;
  };

  return extendedStore;
}
