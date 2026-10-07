import { getPlatform } from "@/core/util/platform";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  applyRendererBudgetSettings,
  registerRendererSettingsWriter,
} from "../renderer/rendererBudget";
import { setBrandBase, setBrandSource } from "./brandTheme";
import { defaultSettings, type Settings, settingsValidator } from "./validator";

const SETTINGS_KEY = "wasser-settings";

/** What main answered for the last global-shortcut change (see GlobalShortcutService). */
export type GlobalShortcutStatus = {
  status: "ok" | "off" | "taken" | "invalid";
  accelerator: string | null;
};

export type SettingsStoreState = {
  settings: Settings | undefined;
  /** Null until main has answered (and always in the web build). */
  globalShortcutStatus: GlobalShortcutStatus | null;
  setSettings: (settings: Settings) => void;
  hydrate: () => void;
  setDefaultSettings: (settings: Settings) => void;
};

export type SettingsStore = StoreApi<SettingsStoreState> & {
  cleanup: () => void;
  /** Apply settings another window saves; returns the unsubscribe. */
  followOtherWindows: () => () => void;
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

  // Detection switched off means nothing detected is kept, whoever wrote the
  // settings — the snapshot must not outlive the permission to take it.
  if (!result.data.telemetryDetectHardware && result.data.rendererHardware) {
    return { ...result.data, rendererHardware: null };
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
  setBrandSource(settings.brandSource);
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

/**
 * Hand the system-wide shortcut to main, which owns the OS registration and
 * persists it for the next boot. Main may refuse (another app holds the
 * combination): its answer goes to the store for the settings page to show.
 * Absent in the web build, where there is no main process to ask.
 */
function applyGlobalShortcut(
  accelerator: string | null,
  report: (status: GlobalShortcutStatus) => void,
) {
  if (typeof window === "undefined") return;
  const setGlobalShortcut = window.api?.palette?.setGlobalShortcut;
  if (!setGlobalShortcut) return;
  setGlobalShortcut(accelerator).then(report, (error: unknown) => {
    console.warn("[palette] could not set the global shortcut", error);
  });
}

/** The scene's debug panel kept its two budget overrides in keys of their own
 * before they became settings. */
const LEGACY_RENDERER_KEYS = {
  rendererGpuBudgetMB: "orkestrator.volumeBudgetMB",
  rendererDecodeCacheMB: "orkestrator.decodeCacheMB",
} as const;

/**
 * Carry a pre-settings budget override over, once: the value becomes the
 * setting (unless one is already there) and the old key is removed either way,
 * so there is a single place the number can live.
 */
function migrateLegacyRendererOverrides(settings: Settings): Settings {
  let next = settings;
  for (const [field, key] of Object.entries(LEGACY_RENDERER_KEYS) as [
    keyof typeof LEGACY_RENDERER_KEYS,
    string,
  ][]) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    localStorage.removeItem(key);
    const mb = Number(raw);
    if (next[field] === null && Number.isFinite(mb) && mb > 0) {
      next = { ...next, [field]: mb };
    }
  }
  return next;
}

export function createSettingsStore(
  initialDefaultSettings: Settings = defaultSettings,
): SettingsStore {
  let currentDefaultSettings = initialDefaultSettings;
  let isHydrating = false;

  const store = createStore<SettingsStoreState>((set) => ({
    settings: undefined,
    globalShortcutStatus: null,
    setSettings: (nextSettings) => {
      const previousSettings = store.getState().settings;
      const normalizedSettings = normalizeSettings(nextSettings, currentDefaultSettings);
      if (normalizedSettings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizedSettings));
        console.log("Settings saved to local storage");

        applyThemeSettings(normalizedSettings);
        applyBrandSettings(normalizedSettings);
        applyRendererBudgetSettings(normalizedSettings);

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

        if (
          isHydrating ||
          normalizedSettings.globalPaletteShortcut !== previousSettings?.globalPaletteShortcut
        ) {
          applyGlobalShortcut(normalizedSettings.globalPaletteShortcut, (status) =>
            set({ globalShortcutStatus: status }),
          );
        }
      }
      set({ settings: normalizedSettings });
    },
    hydrate: () => {
      let localSettings: Settings | undefined;
      isHydrating = true;
      try {
        const serializedSettings = localStorage.getItem(SETTINGS_KEY);
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

      if (!localSettings) console.log("Could not load settings from local storage");
      store
        .getState()
        .setSettings(migrateLegacyRendererOverrides(localSettings ?? currentDefaultSettings));
      isHydrating = false;
    },
    setDefaultSettings: (settings) => {
      currentDefaultSettings = settings;
    },
  }));

  // The scene's debug panel changes the renderer budget from outside React;
  // it does so through this store, so the change is saved and shown in
  // Settings → Renderer like any other.
  const writeRendererSettings = (patch: Partial<Settings>) => {
    const settings = store.getState().settings;
    if (settings) store.getState().setSettings({ ...settings, ...patch });
  };
  registerRendererSettingsWriter(writeRendererSettings);

  const extendedStore = store as SettingsStore;
  extendedStore.cleanup = () => {
    return;
  };
  // Every window of the app keeps its own store over the same localStorage
  // key; a change saved in one (Settings open in a popout, the quick bar) must
  // reach the others, or each window keeps the colour it booted with. The
  // `storage` event fires only in the OTHER windows, and re-saving the same
  // string here fires nothing, so this cannot ping-pong.
  extendedStore.followOtherWindows = () => {
    if (typeof window === "undefined") return () => undefined;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SETTINGS_KEY || !event.newValue) return;
      try {
        const next = normalizeSettings(JSON.parse(event.newValue), currentDefaultSettings);
        if (next) store.getState().setSettings(next);
      } catch (error) {
        console.error(error);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  };

  return extendedStore;
}
