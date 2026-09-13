import { is } from '@electron-toolkit/utils';
import { app, BrowserWindow, dialog, Menu, screen, shell } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import Store from 'electron-store';
import { join } from 'path';
import { AppModule } from './AppModule';
import { IpcTransport } from './IpcTransport';
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
        try {
            console.log(url);
            const parsedUrl = new URL(url);
            // Remove the protocol and get everything after orkestrator://
            const fullPath = parsedUrl.hostname + parsedUrl.pathname;

            if (this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.focus();
            }

            this.createSecondaryWindow(fullPath, "");
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
        this.mainWindow = new BrowserWindow({
            x: state.x,
            y: state.y,
            width: state.width,
            height: state.height,
            show: false,
            title: "Orkestrator",
            icon: iconPath,
            autoHideMenuBar: true,
            ...(process.platform === "linux" ? { icon: iconPath } : {}),
            webPreferences: {
                preload: join(__dirname, "../preload/index.mjs"),
                sandbox: false,
                nodeIntegrationInWorker: false,
                contextIsolation: true,
            },
        });

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
        if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
            this.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
        } else {
            this.mainWindow.loadURL(`${APP_ORIGIN}/index.html`);
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

    createSecondaryWindow(path: string, iconPath: string): BrowserWindow {
        const secondaryWindow = new BrowserWindow({
            width: 900,
            height: 670,
            show: false,
            autoHideMenuBar: true,
            ...(process.platform === "linux" ? { icon: iconPath } : {}),
            webPreferences: {
                preload: join(__dirname, "../preload/index.mjs"),
                sandbox: false,
                contextIsolation: true,
            },
        });

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
            { role: "windowMenu" },
        ];

        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    }
}
