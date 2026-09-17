import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, dialog, Menu, nativeTheme, screen, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import Store from 'electron-store';
import { join } from 'path';
import { AppModule } from './AppModule';
import { IpcTransport } from './IpcTransport';
import { deepLinkPath } from './deepLinkPath';
import { APP_ORIGIN } from '../scheme';

import { autoUpdater } from 'electron-updater';

// Debounce helper function
function debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Persisted main-window geometry. `x`/`y` are optional so a first launch (or a
// window that was never moved) centers on the primary display.
interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
    maximized: boolean;
}

const DEFAULT_WINDOW_STATE: WindowState = {
    width: 900,
    height: 670,
    maximized: false,
};

const WINDOW_STATE_KEY = "windowState";

/**
 * How much room Windows' Controls Overlay gets.
 *
 * This app has no title bar — the rail carries the chrome — so on Windows the
 * renderer draws a matching empty strip across the top for these buttons to sit
 * in (`WindowsOverlayStrip`). Change one and you must change the other.
 */
const WINDOWS_OVERLAY_HEIGHT = 32;

/** The renderer's resolved theme, as `ThemeProvider` reports it. */
export type ChromeTheme = "light" | "dark";

/** What the renderer's title bar lays itself out from, per window. */
export type WindowChromeState = {
    maximized: boolean;
    fullscreen: boolean;
    focused: boolean;
};

/**
 * The two colours the FRAME needs from the theme, as hex because neither
 * `BrowserWindow.backgroundColor` nor `setTitleBarOverlay` parses oklch.
 *
 * `background` is what Chromium paints before the renderer does and during a
 * resize; without it a dark window flashes white on Windows and Linux. `symbol`
 * is the Windows Controls Overlay glyph colour, which the renderer cannot style
 * (the OS draws those buttons) so it has to be told which theme is up.
 *
 * They track `--sidebar` and `--muted-foreground` in the renderer's
 * `index.css`; change one, change both.
 */
const CHROME_COLORS: Record<ChromeTheme, { background: string; symbol: string }> = {
    light: { background: "#f9fafa", symbol: "#6e7572" },
    dark: { background: "#131916", symbol: "#9ba39f" },
};

/**
 * The best guess before any renderer has reported: the OS setting, which is
 * also what `ThemeProvider` resolves `system` to.
 */
const systemChromeTheme = (): ChromeTheme =>
    nativeTheme.shouldUseDarkColors ? "dark" : "light";

/**
 * The renderer draws the title bar, so the frame has to get out of the way —
 * but each platform gets out of the way differently, and the differences are
 * not cosmetic.
 *
 * **macOS** keeps `hiddenInset`: the traffic lights stay REAL, so close, zoom,
 * fullscreen, Stage Manager and the window menu all keep behaving exactly as
 * the OS intends and we only draw around them. With no title bar they sit
 * directly on the sidebar rail's surface, and `trafficLightPosition` places
 * them in the gap the rail reserves above its search pill.
 *
 * **Windows** uses `hidden` + `titleBarOverlay` (Window Controls Overlay) rather
 * than `frame: false`. A frameless window has no native non-client area, so
 * Chromium never answers `HTMAXBUTTON` to `WM_NCHITTEST` and **Snap Layouts —
 * the Win11 hover-the-maximise-button flyout — silently stop working**, with no
 * hook in Electron to fake it. WCO keeps the real system buttons (and with them
 * Snap Layouts, high-contrast themes, RTL mirroring) while still letting us
 * paint the rest of the bar. The renderer reserves their space through the
 * `env(titlebar-area-*)` CSS variables, which stay correct on their own. The
 * price is system-styled buttons on Windows; nobody notices those, everybody
 * notices broken Snap Layouts.
 *
 * **Linux** goes frameless: `titleBarOverlay` is inconsistent across
 * GNOME/KDE/tiling WMs and there is no Snap-Layouts equivalent to lose. Note
 * this also removes the application menu entirely — see `setupApplicationMenu`
 * — so Reload / Force Reload / DevTools MUST stay reachable from the command
 * palette's app commands, which is where they now live.
 */
const chromeOptions = (theme: ChromeTheme): Partial<Electron.BrowserWindowConstructorOptions> =>
    process.platform === "darwin"
        ? {
            titleBarStyle: "hiddenInset",
            trafficLightPosition: { x: 12, y: 14 },
        }
        : process.platform === "win32"
            ? {
                titleBarStyle: "hidden",
                titleBarOverlay: titleBarOverlay(theme),
            }
            : { frame: false };

/**
 * Transparent so our own bar shows through; only the glyphs are coloured, and
 * they follow the theme (`window:set-theme`) because the OS draws them.
 */
const titleBarOverlay = (theme: ChromeTheme): Electron.TitleBarOverlayOptions => ({
    color: "#00000000",
    symbolColor: CHROME_COLORS[theme].symbol,
    height: WINDOWS_OVERLAY_HEIGHT,
});

/** What the renderer needs to lay the bar out. */
export class WindowManager implements AppModule {
    private mainWindow: BrowserWindow | null = null;
    private windows: Set<BrowserWindow> = new Set();
    private store: Store;
    private ipcTransport: IpcTransport;
    private iconPath = '';
    private debouncedSetZoomFactor: (zoomLevel: number, window: BrowserWindow) => void;
    private debouncedSaveWindowState: () => void;
    // In-memory copy of the persisted zoom factor. `store.get` re-reads the
    // JSON file from disk on every call, which is far too expensive for the
    // per-frame `resize` event below.
    private zoomFactor: number;

    constructor(ipcTransport: IpcTransport) {
        this.store = new Store();
        this.ipcTransport = ipcTransport;
        this.zoomFactor = this.store.get("zoomFactor", 0.7) as number;
        this.debouncedSetZoomFactor = debounce((zoomLevel: number, window: BrowserWindow) => {
            window.webContents.setZoomFactor(zoomLevel);
        }, 150);
        this.debouncedSaveWindowState = debounce(() => this.saveWindowState(), 400);
    }

    setup() {
        this.setupIpcHandlers();
        this.setupApplicationMenu();
    }

    onSecondInstance(_: any, commandLine: string[], __: string) {
        // Someone tried to run a second instance, we should focus our window.
        if (this.mainWindow) {
            if (this.mainWindow.isMinimized()) this.mainWindow.restore();
            this.mainWindow.focus();
        }

        // Handle deep link on Windows/Linux
        const url = commandLine.find(arg => arg.startsWith('orkestrator://'));
        if (url) {
            this.handleOrkestratorUrl(url);
        }
    }

    onActivate() {
        // Standard macOS behavior: reactivating the app (dock click, App Exposé,
        // Cmd+Tab) should always resurface the main UI. If the window was closed
        // it no longer exists — recreate it; otherwise restore + focus it.
        if (!this.mainWindow || this.mainWindow.isDestroyed()) {
            this.createMainWindow(this.iconPath);
        } else {
            if (this.mainWindow.isMinimized()) this.mainWindow.restore();
            this.mainWindow.show();
            this.mainWindow.focus();
        }
    }

    getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    handleOrkestratorUrl(url: string) {
        // (see `deepLinkPath` below for the shape of what comes in)
        try {
            const parsedUrl = new URL(url);
            // Everything after `orkestrator://`, as one app path with exactly
            // one leading slash. The URL parser splits it into host + path, and
            // where the split falls depends on the link's shape:
            //   orkestrator://mikro/x   → host "mikro", path "/x"
            //   orkestrator:///mikro/x  → host "",      path "/mikro/x"
            // Joining naively gave "//mikro/x" for the second — a route that
            // matches nothing.
            const fullPath = deepLinkPath(parsedUrl);

            // A deep link opens a TAB in the main window, not a new window:
            // the renderer holds the tabs, so this is one message across.
            this.openInTab(fullPath);
        } catch (err) {
            console.error("Invalid orkestrator URL", url);
            dialog.showErrorBox(
                "Invalid Link",
                `The URL '${url}' could not be processed.`
            );
        }
    }

    createMainWindow(iconPath: string): BrowserWindow {
        // Remember the icon so onActivate can rebuild the window after it was closed.
        this.iconPath = iconPath;

        const state = this.getStoredWindowState();
        this.mainWindow = new BrowserWindow(
            this.appWindowOptions({
                x: state.x,
                y: state.y,
                width: state.width,
                height: state.height,
                title: "Orkestrator",
            }),
        );

        if (state.maximized) {
            this.mainWindow.maximize();
        }

        // Try restoring zoom factor
        this.mainWindow.webContents.setZoomFactor(this.zoomFactor);

        this.mainWindow.webContents.setWindowOpenHandler((details) => {
            return { action: "deny" };
        });

        this.mainWindow.on("resize", () => {
            // `resize` fires continuously while the user drags a window edge;
            // only touch the zoom when Chromium has actually drifted from the
            // stored value (setZoomFactor triggers a full relayout).
            if (this.mainWindow) {
                const webContents = this.mainWindow.webContents;
                if (webContents.getZoomFactor() !== this.zoomFactor) {
                    webContents.setZoomFactor(this.zoomFactor);
                }
            }
            this.debouncedSaveWindowState();
        });

        this.mainWindow.on("move", () => this.debouncedSaveWindowState());

        this.wireChrome(this.mainWindow);

        // Persist synchronously on close: by the time 'closed' fires the window
        // is already destroyed and its bounds are unreadable.
        this.mainWindow.on("close", () => this.saveWindowState());

        this.mainWindow.on('ready-to-show', () => {
            this.mainWindow?.show();
            this.mainWindow?.webContents.setZoomFactor(1.0);
            if (is.dev) {
                this.mainWindow?.webContents.openDevTools({ mode: 'right' });
            }
        });

        this.mainWindow.webContents.on('devtools-opened', () => {
            this.mainWindow?.webContents.openDevTools({ mode: 'right' });
        });

        // HMR for renderer
        // A deep link that arrived before the window existed rides in on the
        // hash; the renderer's boot rule turns it into the active tab.
        const hash = this.pendingPath ? `#${this.pendingPath}` : "";
        this.pendingPath = null;
        if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
            this.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"] + hash);
        } else {
            this.mainWindow.loadURL(`${APP_ORIGIN}/index.html${hash}`);
        }

        const currentWindow = this.mainWindow;
        this.mainWindow.on('closed', () => {
            this.windows.delete(currentWindow);
            if (this.mainWindow === currentWindow) {
                this.mainWindow = null;
            }
        });

        this.windows.add(this.mainWindow);
        return this.mainWindow;
    }

    /**
     * A popout. It runs the same renderer shell as the main window, so it gets
     * the same frame: were it left with a native title bar, the rail inside
     * would still draw its gutter, strip or buttons under the real ones.
     */
    createSecondaryWindow(path: string, iconPath: string): BrowserWindow {
        if (iconPath) this.iconPath = iconPath;
        const secondaryWindow = new BrowserWindow(
            this.appWindowOptions({ width: 900, height: 670 }),
        );

        this.wireChrome(secondaryWindow);

        secondaryWindow.on("ready-to-show", () => {
            secondaryWindow.show();
        });

        secondaryWindow.webContents.setWindowOpenHandler((details) => {
            shell.openExternal(details.url);
            return { action: "deny" };
        });

        if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
            const loaded_url = process.env["ELECTRON_RENDERER_URL"] + "#" + path;
            secondaryWindow.loadURL(loaded_url);
        } else {
            // HashRouter: the route is just a fragment, so we can load it
            // directly instead of navigating after load. This also serves the
            // secondary window over app:// so it is cross-origin isolated too.
            secondaryWindow.loadURL(`${APP_ORIGIN}/index.html#${path}`);
        }

        secondaryWindow.on('closed', () => {
            this.windows.delete(secondaryWindow);
        });

        this.windows.add(secondaryWindow);
        return secondaryWindow;
    }

    createFaktsWindow(url: string, iconPath: string): void {
        const faktsWindows = new BrowserWindow({
            width: 900,
            height: 670,
            show: false,
            autoHideMenuBar: true,
            ...(process.platform === "linux" ? { icon: iconPath } : {}),
        });

        faktsWindows.on("ready-to-show", () => {
            faktsWindows.show();
        });

        faktsWindows.webContents.setWindowOpenHandler((details) => {
            shell.openExternal(details.url);
            return { action: "deny" };
        });

        const baseUrl = new URL(url);
        const baseRoot = baseUrl.pathname.split("/").slice(0, -2).join("/");

        faktsWindows.webContents.session.webRequest.onBeforeRequest(
            {
                urls: [
                    `${baseUrl.origin}${baseRoot}/success*`,
                    `${baseUrl.origin}${baseRoot}/failure*`,
                ],
            },
            async ({ url }, callback) => {
                faktsWindows.close();
                callback({});
            }
        );

        faktsWindows.loadURL(url);
    }

    getAllWindows() {
        return Array.from(this.windows);
    }

    /**
     * Read the persisted main-window geometry, dropping a stored position that
     * no longer lands on a connected display. Without this guard a window last
     * saved on a monitor that has since been disconnected would reopen
     * off-screen — invisible and effectively unrecoverable.
     */
    private getStoredWindowState(): WindowState {
        const stored = this.store.get(WINDOW_STATE_KEY) as Partial<WindowState> | undefined;
        if (!stored || typeof stored.width !== "number" || typeof stored.height !== "number") {
            return { ...DEFAULT_WINDOW_STATE };
        }

        const state: WindowState = {
            width: stored.width,
            height: stored.height,
            maximized: Boolean(stored.maximized),
        };

        if (typeof stored.x === "number" && typeof stored.y === "number") {
            const bounds = { x: stored.x, y: stored.y, width: stored.width, height: stored.height };
            const visible = screen.getAllDisplays().some((display) => {
                const wa = display.workArea;
                // Require some overlap between the saved window and this display.
                return (
                    bounds.x < wa.x + wa.width &&
                    bounds.x + bounds.width > wa.x &&
                    bounds.y < wa.y + wa.height &&
                    bounds.y + bounds.height > wa.y
                );
            });
            if (visible) {
                state.x = stored.x;
                state.y = stored.y;
            }
        }

        return state;
    }

    /** Persist the main window's normal (non-maximized) bounds and maximized flag. */
    /**
     * A path to open once the main window exists — for a deep link that
     * arrives before the window does (macOS `open-url` on launch, or after the
     * window was closed). Consumed by `createMainWindow` into the load URL, so
     * the renderer's boot rule opens it as a tab.
     */
    private pendingPath: string | null = null;

    /**
     * Ask the main window's renderer to open a path as a tab, creating the
     * window first if there is none. A link arriving mid-boot is held until the
     * renderer has loaded rather than being sent into the void.
     */
    private openInTab(path: string) {
        const win = this.mainWindow;

        if (!win || win.isDestroyed()) {
            this.pendingPath = path;
            this.createMainWindow(this.iconPath);
            return;
        }

        if (win.isMinimized()) win.restore();
        win.focus();

        const send = () => this.ipcTransport.sendTo(win.webContents, "tabs:open", { path });
        if (win.webContents.isLoading()) {
            win.webContents.once("did-finish-load", send);
        } else {
            send();
        }
    }

    /**
     * What every window of ours is built from: hidden until ready, our icon,
     * no menu bar, the platform's chrome, and a background in the theme's
     * colour so the first paint and every resize are not a white flash.
     */
    private appWindowOptions(
        extra: Electron.BrowserWindowConstructorOptions,
    ): Electron.BrowserWindowConstructorOptions {
        const theme = systemChromeTheme();
        return {
            show: false,
            icon: this.iconPath,
            autoHideMenuBar: true,
            backgroundColor: CHROME_COLORS[theme].background,
            ...chromeOptions(theme),
            ...extra,
            webPreferences: {
                preload: join(__dirname, "../preload/index.mjs"),
                sandbox: false,
                nodeIntegrationInWorker: false,
                contextIsolation: true,
                ...extra.webPreferences,
            },
        };
    }

    /**
     * Tell the renderer what the frame is doing. It draws the title bar, so
     * it has to know: the maximise button must show the right glyph, and on
     * macOS fullscreen the traffic lights disappear, which means the gutter
     * reserved for them has to collapse or the centred search bar sits
     * permanently off-centre. Per window — a popout's bar describes the popout.
     */
    private wireChrome(win: BrowserWindow) {
        // Typed as a plain emitter: BrowserWindow's `on` overloads reject a
        // union of event names, and listing six identical listeners is worse.
        const emitter: NodeJS.EventEmitter = win;
        for (const event of ["maximize", "unmaximize", "enter-full-screen", "leave-full-screen", "focus", "blur"]) {
            emitter.on(event, () => this.broadcastChromeState(win));
        }
    }

    /** The frame state the renderer's title bar lays itself out from. */
    getChromeState(win: BrowserWindow | null = this.mainWindow): WindowChromeState {
        if (!win || win.isDestroyed()) {
            return { maximized: false, fullscreen: false, focused: false };
        }
        return {
            maximized: win.isMaximized(),
            fullscreen: win.isFullScreen(),
            focused: win.isFocused(),
        };
    }

    private broadcastChromeState(win: BrowserWindow) {
        if (win.isDestroyed()) {
            return;
        }
        this.ipcTransport.sendTo(win.webContents, "window:state-changed", this.getChromeState(win));
    }

    /**
     * The renderer's theme changed (or was first resolved). Repaint the parts
     * of the frame the renderer cannot reach: the background Chromium shows
     * around and beneath the page, and on Windows the overlay's glyphs.
     */
    private applyChromeTheme(win: BrowserWindow, theme: ChromeTheme) {
        if (win.isDestroyed()) return;
        win.setBackgroundColor(CHROME_COLORS[theme].background);
        if (process.platform === "win32") {
            win.setTitleBarOverlay(titleBarOverlay(theme));
        }
    }

    private saveWindowState() {
        const win = this.mainWindow;
        if (!win || win.isDestroyed()) return;

        const maximized = win.isMaximized();
        // getNormalBounds() returns the restored geometry even while maximized,
        // so relaunch restores to a sensible size after un-maximizing.
        const bounds = win.getNormalBounds();
        const state: WindowState = {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            maximized,
        };
        this.store.set(WINDOW_STATE_KEY, state);
    }

    private setupIpcHandlers() {
        // ── Window controls, for the renderer-drawn title bar ──
        //
        // These resolve the window that SENT the message, not the focused one.
        // The surrounding handlers use `getFocusedWindow()`, which is right for
        // a menu accelerator and wrong for a title-bar button: a secondary
        // window's own close button must close that window, never whichever one
        // happens to hold focus.
        const senderWindow = (event: { sender: Electron.WebContents }) =>
            BrowserWindow.fromWebContents(event.sender) ?? this.mainWindow;

        this.ipcTransport.onChannel("window:minimize", (event) => {
            senderWindow(event)?.minimize();
        });

        this.ipcTransport.onChannel("window:maximize-toggle", (event) => {
            const win = senderWindow(event);
            if (!win) return;
            // Unmaximise restores the pre-maximise bounds, which
            // `getStoredWindowState` already tracks via `getNormalBounds()`.
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
        });

        this.ipcTransport.onChannel("window:close", (event) => {
            senderWindow(event)?.close();
        });

        // Seeds the renderer's first paint, so the bar is never briefly wrong.
        this.ipcTransport.handleChannel("window:get-state", (event) =>
            this.getChromeState(senderWindow(event)),
        );

        this.ipcTransport.onChannel("window:set-theme", (event, theme: ChromeTheme) => {
            const win = senderWindow(event);
            if (!win || (theme !== "light" && theme !== "dark")) return;
            this.applyChromeTheme(win, theme);
        });

        this.ipcTransport.handleChannel("reload-window", () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                focusedWindow.reload();
                return { success: true };
            } else if (this.mainWindow) {
                this.mainWindow.reload();
                return { success: true };
            }
            return { success: false, error: "No window to reload" };
        });

        this.ipcTransport.handleChannel("force-reload-window", () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                focusedWindow.webContents.reloadIgnoringCache();
                return { success: true };
            } else if (this.mainWindow) {
                this.mainWindow.webContents.reloadIgnoringCache();
                return { success: true };
            }
            return { success: false, error: "No window to reload" };
        });

        this.ipcTransport.handleChannel("set-zoom-level", (_, zoomLevel: number) => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                this.zoomFactor = zoomLevel;
                this.store.set("zoomFactor", zoomLevel);
                this.debouncedSetZoomFactor(zoomLevel, focusedWindow);
                return { success: true };
            } else if (this.mainWindow) {
                this.zoomFactor = zoomLevel;
                this.store.set("zoomFactor", zoomLevel);
                this.debouncedSetZoomFactor(zoomLevel, this.mainWindow);
                return { success: true };
            }
            return { success: false, error: "No window to set zoom level" };
        });

        this.ipcTransport.handleChannel("get-zoom-level", () => {
            if (BrowserWindow.getFocusedWindow() || this.mainWindow) {
                return {
                    success: true,
                    zoomLevel: this.zoomFactor,
                };
            }
            return { success: false, error: "No window to get zoom level" };
        });

        this.ipcTransport.onChannel("open-second-window", (_, path) => this.createSecondaryWindow(path, ""));

        this.ipcTransport.handleChannel("open-devtools", () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            const win = focusedWindow ?? this.mainWindow;
            if (win) {
                win.webContents.openDevTools({ mode: "detach" });
                return { success: true };
            }
            return { success: false, error: "No window to open devtools for" };
        });

        this.ipcTransport.handleChannel("dialog:openFile", async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog({});
            if (canceled) { return; }
            return filePaths[0];
        });
    }

    private setupApplicationMenu() {
        const reloadCurrentWindow = () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                focusedWindow.reload();
            } else if (this.mainWindow) {
                this.mainWindow.reload();
            }
        };

        const stayOnTop = () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                const isAlwaysOnTop = focusedWindow.isAlwaysOnTop();
                focusedWindow.setAlwaysOnTop(!isAlwaysOnTop);
            }
        };

        const forceReloadCurrentWindow = () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
                focusedWindow.webContents.reloadIgnoringCache();
            } else if (this.mainWindow) {
                this.mainWindow.webContents.reloadIgnoringCache();
            }
        };

        const isMac = process.platform === "darwin";

        // On macOS the first submenu is the application menu and carries the
        // standard Hide/Hide-Others/Show-All items (Show All in particular lets
        // a user recover the app after hiding it). On Windows/Linux there is no
        // app menu convention, so the update + quit items live under "File".
        const appMenu: MenuItemConstructorOptions = isMac
            ? {
                  label: app.name,
                  submenu: [
                      { role: "about" },
                      { label: "Check for Updates…", click: () => autoUpdater.checkForUpdates() },
                      { type: "separator" },
                      { role: "services" },
                      { type: "separator" },
                      { role: "hide" },
                      { role: "hideOthers" },
                      { role: "unhide" },
                      { type: "separator" },
                      { role: "quit" },
                  ],
              }
            : {
                  label: "File",
                  submenu: [
                      { label: "Check for Updates…", click: () => autoUpdater.checkForUpdates() },
                      { type: "separator" },
                      { role: "quit" },
                  ],
              };

        const template: MenuItemConstructorOptions[] = [
            appMenu,
            {
                label: "Edit",
                submenu: [
                    { role: "undo" },
                    { role: "redo" },
                    { type: "separator" },
                    { role: "cut" },
                    { role: "copy" },
                    { role: "paste" },
                    { role: "selectAll" },
                ],
            },
            {
                label: "View",
                submenu: [
                    { label: "Reload", accelerator: "CmdOrCtrl+R", click: reloadCurrentWindow },
                    { label: "Force Reload", accelerator: "CmdOrCtrl+Shift+R", click: forceReloadCurrentWindow },
                    { label: "Toggle Always on Top", click: stayOnTop },
                    { type: "separator" },
                    { role: "toggleDevTools" },
                ],
            },
            // Standard Window menu — Minimize/Zoom/(Bring All to Front)/Close.
            // Gives users the native surface for managing and resurfacing windows.
            // The stock window menu binds Ctrl+W to Close Window on win32/linux,
            // which would beat the renderer's ⌘W close-tab. macOS has no File
            // menu here, so ⌘W is already free there.
            isMac
                ? { role: "windowMenu" }
                : { label: "Window", submenu: [{ role: "minimize" }, { role: "zoom" }] },
        ];

        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
}
