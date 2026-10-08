import { is } from "@electron-toolkit/utils";
import { app, BrowserWindow, screen } from "electron";
import { join } from "path";
import { APP_ORIGIN } from "../scheme";
import { AppModule } from "./AppModule";
import { IpcTransport } from "./IpcTransport";

/** Main → quick renderer: the bar was just shown; reset and focus the input. */
export const QUICK_SHOWN_CHANNEL = "quick:shown";
export const QUICK_HIDE_CHANNEL = "quick:hide";
export const QUICK_KEEP_OPEN_CHANNEL = "quick:keepOpen";
export const QUICK_RESIZE_CHANNEL = "quick:resize";
export const QUICK_OPEN_IN_MAIN_CHANNEL = "quick:open-in-main";
export const QUICK_OPEN_DIALOG_IN_MAIN_CHANNEL = "quick:open-dialog-in-main";

/**
 * A registry dialog (or sheet) the quick bar asks the main window to open —
 * a local action's `openDialog` / `openSheet` there. Props are plain data
 * (ids, strings); the renderer only forwards what survives a structured clone.
 */
export type DialogRequest = {
  type: "dialog" | "sheet";
  id: string;
  props: Record<string, unknown>;
  options?: { className?: string; side?: "top" | "bottom" | "left" | "right"; size?: "small" | "medium" | "large" | "full" };
};

export const isDialogRequest = (value: unknown): value is DialogRequest => {
  const v = value as Partial<DialogRequest> | null;
  return (
    !!v &&
    (v.type === "dialog" || v.type === "sheet") &&
    typeof v.id === "string" &&
    v.id.length > 0 &&
    typeof v.props === "object" &&
    v.props !== null
  );
};

export const BAR_WIDTH = 680;
export const BAR_MIN_HEIGHT = 64;
export const BAR_MAX_HEIGHT = 560;
/** While a dialog or popover is open: room for it, same top-centre point. */
export const EXPANDED_SIZE = { width: 1000, height: 760 };
/** Pre-warm after launch, so the first press does not wait for a renderer boot. */
const PREWARM_DELAY_MS = 3000;

export type Rect = { x: number; y: number; width: number; height: number };

/** The window surface this drives — a BrowserWindow, or a fake in tests. */
export type QuickWindowLike = {
  isDestroyed(): boolean;
  isVisible(): boolean;
  show(): void;
  hide(): void;
  focus(): void;
  destroy(): void;
  setBounds(bounds: Rect): void;
  getBounds(): Rect;
  on(event: "blur", listener: () => void): void;
  webContents: {
    send(channel: string, ...args: unknown[]): void;
    isLoading(): boolean;
    once(event: "did-finish-load", listener: () => void): void;
  };
};

export type QuickPaletteDeps = {
  createWindow(): QuickWindowLike;
  /** Work area of the display under the cursor. */
  cursorWorkArea(): Rect;
  platform: string;
  focusApp(): void;
  hideApp(): void;
  mainWindowVisible(): boolean;
  /** Open a path as a tab in the main window (creating/focusing it). */
  openInTab(path: string): void;
  /** Open a registry dialog in the main window (creating/focusing it). */
  openDialogInMain(request: DialogRequest): void;
  onMainClosed(listener: () => void): void;
  whenReady(): Promise<unknown>;
  schedule(fn: () => void, ms: number): void;
  /** Whether a shortcut can summon the bar at all — no warm renderer otherwise. */
  shouldPrewarm(): boolean;
};

/**
 * Where the bar sits: centred on the display under the cursor, a fifth of the
 * way down — Sekure's `positionPopup`, Alfred's spot.
 */
export const barBounds = (workArea: Rect, height: number): Rect => ({
  x: Math.round(workArea.x + (workArea.width - BAR_WIDTH) / 2),
  y: Math.round(workArea.y + workArea.height * 0.2),
  width: BAR_WIDTH,
  height: clampHeight(height),
});

export const clampHeight = (height: number): number =>
  Math.round(Math.min(BAR_MAX_HEIGHT, Math.max(BAR_MIN_HEIGHT, height || BAR_MIN_HEIGHT)));

/** A new size around the same TOP-CENTRE point: the input never jumps. */
export const resizeAroundTopCentre = (
  current: Rect,
  size: { width: number; height: number },
): Rect => {
  const centreX = current.x + current.width / 2;
  return {
    x: Math.round(centreX - size.width / 2),
    y: current.y,
    width: size.width,
    height: size.height,
  };
};

/**
 * The floating quick bar: ⌘K over whatever app is in front, without the main
 * window.
 *
 * A second, always-warm renderer (`?role=quick`) running the real providers,
 * so every palette source and action works unchanged; it renders only the
 * palette panel, and forwards anything that navigates to the main window as a
 * tab (`quick:open-in-main`), and any dialog an action opens to the main
 * window too (`quick:open-dialog-in-main`). Built after Sekure's floating popup: a frameless
 * panel on every Space (full-screen apps included), hidden on blur unless a
 * dialog in it holds it open, and handing focus back on dismiss.
 */
export class QuickPaletteWindow implements AppModule {
  private window: QuickWindowLike | null = null;
  private keepOpen = false;
  private expanded = false;
  private barHeight = BAR_MIN_HEIGHT;

  constructor(
    private readonly transport: IpcTransport,
    private readonly deps: QuickPaletteDeps,
  ) {}

  setup() {
    this.transport.onChannel(QUICK_HIDE_CHANNEL, () => this.dismiss());
    this.transport.onChannel(QUICK_KEEP_OPEN_CHANNEL, (_event, keep: unknown) => {
      this.keepOpen = keep === true;
    });
    this.transport.onChannel(QUICK_RESIZE_CHANNEL, (_event, size: unknown) => {
      const { height, expanded } = (size ?? {}) as { height?: number; expanded?: boolean };
      this.resize(typeof height === "number" ? height : this.barHeight, expanded === true);
    });
    this.transport.onChannel(QUICK_OPEN_IN_MAIN_CHANNEL, (_event, path: unknown) => {
      if (typeof path !== "string" || !path.startsWith("/")) return;
      this.dismiss({ returnFocus: false });
      this.deps.openInTab(path);
    });
    this.transport.onChannel(QUICK_OPEN_DIALOG_IN_MAIN_CHANNEL, (_event, request: unknown) => {
      if (!isDialogRequest(request)) return;
      this.dismiss({ returnFocus: false });
      this.deps.openDialogInMain(request);
    });
    // A hidden bar must not keep the app alive once the main window is gone —
    // except on macOS, where the app outlives its windows anyway.
    this.deps.onMainClosed(() => {
      if (this.deps.platform === "darwin") return;
      this.window?.destroy();
      this.window = null;
    });
    void this.deps.whenReady().then(() =>
      this.deps.schedule(() => {
        if (this.deps.shouldPrewarm()) this.ensure();
      }, PREWARM_DELAY_MS),
    );
  }

  /** The shortcut: show the bar, or hide it when it is already up. */
  toggle() {
    const window = this.ensure();
    if (window.isVisible()) {
      this.dismiss();
      return;
    }
    this.keepOpen = false;
    this.expanded = false;
    window.setBounds(barBounds(this.deps.cursorWorkArea(), this.barHeight));
    this.deps.focusApp();
    window.show();
    window.focus();
    const shown = () => window.webContents.send(QUICK_SHOWN_CHANNEL);
    if (window.webContents.isLoading()) window.webContents.once("did-finish-load", shown);
    else shown();
  }

  /**
   * Hide the bar. On macOS, also hide the app when its main window is not on
   * screen — otherwise Orkestrator stays active with nothing in front, and
   * focus does not return to the app the user came from.
   */
  dismiss({ returnFocus = true }: { returnFocus?: boolean } = {}) {
    this.keepOpen = false;
    const window = this.window;
    if (!window || window.isDestroyed() || !window.isVisible()) return;
    window.hide();
    if (returnFocus && this.deps.platform === "darwin" && !this.deps.mainWindowVisible()) {
      this.deps.hideApp();
    }
  }

  private resize(height: number, expanded: boolean) {
    const window = this.window;
    if (!window || window.isDestroyed()) return;
    if (!expanded) this.barHeight = clampHeight(height);
    const current = window.getBounds();
    // Collapsing back: return to the bar's own width around the same point.
    const size = expanded
      ? EXPANDED_SIZE
      : { width: BAR_WIDTH, height: this.barHeight };
    if (expanded === this.expanded && current.width === size.width && current.height === size.height) {
      return;
    }
    this.expanded = expanded;
    window.setBounds(resizeAroundTopCentre(current, size));
  }

  private ensure(): QuickWindowLike {
    if (this.window && !this.window.isDestroyed()) return this.window;
    const window = this.deps.createWindow();
    window.on("blur", () => {
      if (!this.keepOpen) this.dismiss();
    });
    this.window = window;
    return window;
  }
}

/** The real window: Sekure's floating panel, transparent so the panel draws its own edge. */
const createQuickBrowserWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: BAR_WIDTH,
    height: BAR_MIN_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // An NSPanel floats over full-screen apps without switching Spaces.
    ...(process.platform === "darwin" ? { type: "panel" as const } : {}),
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      sandbox: false,
      nodeIntegrationInWorker: false,
      contextIsolation: true,
    },
  });
  window.setAlwaysOnTop(true, "floating");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Any link the palette would open as a window goes nowhere: navigation is
  // forwarded to the main window instead.
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const query = "?role=quick#/";
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(process.env["ELECTRON_RENDERER_URL"] + query);
  } else {
    window.loadURL(`${APP_ORIGIN}/index.html${query}`);
  }
  return window;
};

/** The real electron wiring. */
export const electronQuickPaletteDeps = (hooks: {
  shouldPrewarm(): boolean;
  mainWindowVisible(): boolean;
  openInTab(path: string): void;
  openDialogInMain(request: DialogRequest): void;
  onMainClosed(listener: () => void): void;
}): QuickPaletteDeps => ({
  createWindow: createQuickBrowserWindow,
  cursorWorkArea: () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea,
  platform: process.platform,
  focusApp: () => {
    if (process.platform === "darwin") app.focus({ steal: true });
  },
  hideApp: () => app.hide(),
  whenReady: () => app.whenReady(),
  schedule: (fn, ms) => void setTimeout(fn, ms),
  ...hooks,
});
