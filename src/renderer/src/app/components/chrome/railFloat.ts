import { acceleratorFromKeyPress } from "@/core/command/accelerator";
import { useSettings, useSettingsStoreApi } from "@/core/settings/store/SettingsContext";
import { defaultSettings } from "@/core/settings/store/validator";
import { useWindowState } from "@/core/util/platform";
import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * Whether the rail is docked beside the page or floating over it.
 *
 * Floating, the rail is out of the layout altogether: the page card takes the
 * whole window and the rail slides in from the left edge when the pointer is
 * pushed against it (`useRailFloatReveal`).
 *
 * Two inputs decide it:
 *
 * - **Windowed**, the `railFloating` setting: a preference, persisted, the
 *   same in every window.
 * - **Fullscreen** floats by default — the point of fullscreen is the page —
 *   and the shortcut docks it there for as long as this window stays
 *   fullscreen. Session-only and per window, so leaving fullscreen forgets it
 *   and the setting is never rewritten by a toggle the user meant for now.
 */
export const effectiveRailFloating = (
  setting: boolean,
  fullscreen: boolean,
  fullscreenDocked: boolean,
): boolean => (fullscreen ? !fullscreenDocked : setting);

/** One window, one answer — a module-level store, as `useWindowState` is. */
let fullscreenDocked = false;
const listeners = new Set<() => void>();

export const setFullscreenDocked = (docked: boolean): void => {
  if (fullscreenDocked === docked) return;
  fullscreenDocked = docked;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getFullscreenDocked = (): boolean => fullscreenDocked;

const useFullscreenDocked = (): boolean =>
  useSyncExternalStore(subscribe, getFullscreenDocked, getFullscreenDocked);

export const useRailFloating = (): boolean => {
  const { settings } = useSettings();
  const { fullscreen } = useWindowState();
  const docked = useFullscreenDocked();

  // Leaving fullscreen forgets the session's "dock it here", so the next
  // fullscreen floats again.
  useEffect(() => {
    if (!fullscreen) setFullscreenDocked(false);
  }, [fullscreen]);

  return effectiveRailFloating(settings.railFloating, fullscreen, docked);
};

/**
 * Flips whichever input is in charge right now: the session flag in
 * fullscreen, the setting otherwise. Reads the store at call time rather than
 * closing over a render's settings, so two quick presses do not both write
 * from the same stale copy.
 */
export const useToggleRailFloating = (): (() => void) => {
  const api = useSettingsStoreApi();
  const { fullscreen } = useWindowState();

  return useCallback(() => {
    if (fullscreen) {
      setFullscreenDocked(!fullscreenDocked);
      return;
    }
    const { settings = defaultSettings, setSettings } = api.getState();
    setSettings({ ...settings, railFloating: !settings.railFloating });
  }, [api, fullscreen]);
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
