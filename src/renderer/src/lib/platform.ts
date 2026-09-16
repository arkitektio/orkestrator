import { useEffect, useState } from "react";

/**
 * Who is drawing the window frame, and therefore what the title bar must draw.
 *
 * Orkestrator ships as an Electron app on three platforms AND runs in a plain
 * browser, and until now "am I in Electron?" was answered ad-hoc at a dozen call
 * sites (`window.electron`, `window.api?.`). The title bar needs a sharper
 * answer than a boolean — macOS keeps its real traffic lights and we only draw
 * around them, Windows and Linux are frameless and we draw the buttons
 * ourselves, and the browser has no frame of ours at all.
 */

export type Platform = "darwin" | "win32" | "linux" | "web";

/**
 * `"mac"`     — real traffic lights (`hiddenInset`); reserve a left gutter, draw
 *               no buttons of our own.
 * `"overlay"` — Windows Controls Overlay: the system still draws the buttons on
 *               top of our bar, so we draw none but must keep out of their way
 *               using the `env(titlebar-area-*)` variables. Chosen over a
 *               frameless window because frameless loses Win11 Snap Layouts.
 * `"buttons"` — frameless (Linux); we draw minimise/maximise/close ourselves.
 * `"none"`    — a browser tab; there is no frame of ours to draw.
 */
export type ChromeMode = "mac" | "overlay" | "buttons" | "none";

/**
 * `window.electron` is injected by @electron-toolkit's preload, and is the check
 * the rest of the app has always used (`constants.tsx` derives the router
 * basename from it).
 */
export const isElectron = (): boolean =>
  typeof window !== "undefined" && Boolean(window.electron);

export const getPlatform = (): Platform => {
  if (!isElectron()) {
    return "web";
  }

  // @electron-toolkit exposes the real `process.platform` across the bridge.
  const platform = window.electron?.process?.platform;
  if (platform === "darwin" || platform === "win32" || platform === "linux") {
    return platform;
  }
  // An Electron build on some other platform is frameless per `CHROME_OPTIONS`
  // and definitely has no traffic lights, so it gets our own buttons.
  return "linux";
};

export const getChromeMode = (): ChromeMode => {
  const platform = getPlatform();
  if (platform === "web") return "none";
  if (platform === "darwin") return "mac";
  if (platform === "win32") return "overlay";
  return "buttons";
};

export type WindowChromeState = {
  maximized: boolean;
  fullscreen: boolean;
  focused: boolean;
};

const INITIAL_STATE: WindowChromeState = {
  maximized: false,
  fullscreen: false,
  // A browser "window" is always the thing you are looking at; starting
  // unfocused would render the bar dimmed until the first real focus event,
  // which in a browser never comes.
  focused: true,
};

/**
 * The frame's live state.
 *
 * Seeded from `window:get-state` so the very first paint is right — without it
 * a maximised window briefly shows the "restore" button as "maximise" — and
 * then kept current by the broadcast. Returns the inert default outside
 * Electron, so callers need no branch of their own.
 */
export const useWindowState = (): WindowChromeState => {
  const [state, setState] = useState<WindowChromeState>(INITIAL_STATE);

  useEffect(() => {
    const controls = window.api?.windowControls;
    if (!controls) {
      return;
    }

    let cancelled = false;
    void controls.getState().then((initial) => {
      if (!cancelled) setState(initial);
    });

    const dispose = controls.onStateChanged(setState);
    return () => {
      cancelled = true;
      dispose();
    };
  }, []);

  return state;
};

/** Height of the title bar. Must match `TITLE_BAR_HEIGHT` in WindowManager. */
export const TITLE_BAR_HEIGHT = 40;

/**
 * Width to reserve on the left for the traffic lights.
 *
 * Zero in fullscreen, where macOS removes them — without this the centred search
 * bar would sit permanently off-centre whenever the window is fullscreen.
 */
export const trafficLightGutter = (mode: ChromeMode, fullscreen: boolean): number =>
  mode === "mac" && !fullscreen ? 78 : 0;
