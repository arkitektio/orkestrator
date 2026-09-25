import { useSyncExternalStore } from "react";

/**
 * Who is drawing the window frame, and therefore what the title bar must draw.
 *
 * Orkestrator ships as an Electron app on three platforms AND runs in a plain
 * browser, and until now "am I in Electron?" was answered ad-hoc at a dozen call
 * sites (`window.electron`, `window.api?.`). The title bar needs a sharper
 * answer than a boolean — macOS keeps its real traffic lights and we only draw
 * around them, Windows and Linux have no buttons of their own so we draw those
 * (in different places), and the browser has no frame of ours at all.
 */

export type Platform = "darwin" | "win32" | "linux" | "web";

/**
 * `"mac"`     — real traffic lights (`hiddenInset`); reserve a left gutter, draw
 *               no buttons of our own.
 * `"autohide"` — Windows: no caption, no Controls Overlay. The page fills the
 *               window and our own buttons live in a bar that slides down when
 *               the pointer touches the top edge (`AutoHideTitleBar`).
 * `"buttons"` — frameless (Linux); we draw minimise/maximise/close ourselves,
 *               inline in the rail, since there is no top bar to put them in.
 * `"none"`    — a browser tab; there is no frame of ours to draw.
 */
export type ChromeMode = "mac" | "autohide" | "buttons" | "none";

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
  if (platform === "win32") return "autohide";
  return "buttons";
};

export type WindowChromeState = {
  maximized: boolean;
  fullscreen: boolean;
  focused: boolean;
};

/**
 * The frame's live state, as one store for the whole window.
 *
 * Deliberately module-level rather than a hook's own `useState`. There is one
 * window and one answer, and the previous shape — `useState` + an effect, per
 * caller — meant every component that wanted to know whether the window was
 * maximised opened its own IPC round-trip and registered its own broadcast
 * listener. With three callers that is three of each for one fact, and three
 * independent first paints from `INITIAL_STATE`, so the same bar could disagree
 * with itself for a frame.
 *
 * Wired on the 0 -> 1 subscriber transition and torn down on 1 -> 0, rather
 * than once at import: nothing should be listening to the main process while
 * no chrome is mounted, and re-reading `window.api` on each wire is what lets a
 * test mount against its own bridge.
 */
const INITIAL_STATE: WindowChromeState = {
  maximized: false,
  fullscreen: false,
  // A browser "window" is always the thing you are looking at; starting
  // unfocused would render the bar dimmed until the first real focus event,
  // which in a browser never comes.
  focused: true,
};

let windowState: WindowChromeState = INITIAL_STATE;
const windowStateListeners = new Set<() => void>();
let unwire: (() => void) | null = null;

const publishWindowState = (next: WindowChromeState) => {
  windowState = next;
  windowStateListeners.forEach((listener) => listener());
};

const wire = () => {
  const controls = window.api?.windowControls;
  if (!controls) return;

  // Seeded from `window:get-state` so the very first paint is right — without
  // it a maximised window briefly shows the "restore" button as "maximise".
  let cancelled = false;
  void controls.getState().then((initial) => {
    if (!cancelled) publishWindowState(initial);
  });

  const dispose = controls.onStateChanged(publishWindowState);
  unwire = () => {
    cancelled = true;
    dispose();
  };
};

const subscribeWindowState = (listener: () => void): (() => void) => {
  windowStateListeners.add(listener);
  if (windowStateListeners.size === 1) wire();
  return () => {
    windowStateListeners.delete(listener);
    if (windowStateListeners.size > 0) return;
    unwire?.();
    unwire = null;
    // Nothing is observing the frame any more, so the last thing it said is not
    // something to hand the next subscriber as though it were current.
    windowState = INITIAL_STATE;
  };
};

const getWindowStateSnapshot = (): WindowChromeState => windowState;

/**
 * The frame's live state. Returns the inert default outside Electron, so
 * callers need no branch of their own, and shares one subscription however
 * many components ask.
 */
export const useWindowState = (): WindowChromeState =>
  useSyncExternalStore(subscribeWindowState, getWindowStateSnapshot, getWindowStateSnapshot);

/**
 * Double-clicking a title bar maximises the window — a frame behaviour that
 * only the frameless platform (Linux) loses along with its frame, so only there
 * do we supply it. macOS and Windows keep their own handling of the drag zone.
 *
 * Returns a handler for the `app-drag` zone, or nothing where the frame already
 * does this. Double-clicks that land on a control (`app-no-drag`) are the
 * control's, not the bar's.
 */
export const dragZoneDoubleClick = (
  mode: ChromeMode,
): ((event: { target: EventTarget | null }) => void) | undefined => {
  if (mode !== "buttons") return undefined;
  return (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest(".app-no-drag")) return;
    window.api?.windowControls?.toggleMaximize();
  };
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
