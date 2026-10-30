import { acceleratorFromKeyPress } from "@/core/command/accelerator";
import { useSettings, useSettingsStoreApi } from "@/core/settings/store/SettingsContext";
import { defaultSettings } from "@/core/settings/store/validator";
import { useCallback, useEffect } from "react";

/**
 * Whether the rail is docked beside the page or floating over it.
 *
 * Floating, the rail is out of the layout altogether: the page card takes the
 * whole window and the rail slides in from the left edge when the pointer is
 * pushed against it (`useRailFloatReveal`).
 *
 * The `railFloating` setting alone decides it: a preference, persisted, the
 * same in every window, and untouched by going fullscreen.
 */
export const useRailFloating = (): boolean => useSettings().settings.railFloating;

/**
 * Flips the setting. Reads the store at call time rather than closing over a
 * render's settings, so two quick presses do not both write from the same
 * stale copy.
 */
export const useToggleRailFloating = (): (() => void) => {
  const api = useSettingsStoreApi();

  return useCallback(() => {
    const { settings = defaultSettings, setSettings } = api.getState();
    setSettings({ ...settings, railFloating: !settings.railFloating });
  }, [api]);
};

/**
 * The keyboard half: the configured accelerator (Settings → Keyboard shortcuts,
 * `railFloatShortcut`) docks or floats the rail. Matched as the accelerator the
 * key press would record as, so what the settings page shows is exactly what
 * fires. Skips the same targets the tab shortcuts do (`TabsProvider`).
 */
export const useRailFloatShortcut = (): void => {
  const { settings } = useSettings();
  const toggle = useToggleRailFloating();
  const shortcut = settings.railFloatShortcut;

  useEffect(() => {
    if (!shortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-command-hotkey='off']")) return;
      if (acceleratorFromKeyPress(event) !== shortcut) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcut, toggle]);
};
