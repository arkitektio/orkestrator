import { dialog, app } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import Store from 'electron-store';
import { IpcTransport } from './IpcTransport';
import { WindowManager } from './WindowManager';
import { AppModule } from './AppModule';

// User-facing update channels. "next" surfaces prereleases; "latest" is stable.
// NOTE: the "next" channel rides electron-builder's standard `beta.yml` carrier
// file — `generateUpdatesFilesForAllChannels` only emits latest/beta/alpha and
// the GitHub publisher does not auto-detect channels, so there is no `rc.yml`.
// The visible identity ("Next" label, `-rc` version suffix) is intentionally
// decoupled from the internal carrier (`beta.yml`).
type UpdateChannel = "latest" | "next";

const STORE_KEY = "updateChannel";

/**
 * A release whose builds are still uploading: CI creates the GitHub release
 * first and attaches the artifacts minutes later, so a check in between finds
 * the tag but not `latest-mac.yml` (or finds the yml but not the zip).
 */
const PENDING_CODES = new Set([
    "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND",
    "ERR_UPDATER_ASSET_NOT_FOUND",
    "ERR_UPDATER_ZIP_FILE_NOT_FOUND",
]);
const isPendingRelease = (err: unknown) => {
    const { message, code } = serializeError(err);
    return (
        (code !== undefined && PENDING_CODES.has(code)) ||
        /\b404\b[\s\S]*\/releases\/download\//.test(message)
    );
};

/** How soon to look again after finding a half-published release. */
const PENDING_RETRY_MS = 5 * 60 * 1000;
/** A release whose CI died never completes; after this the 4-hour interval takes over. */
const PENDING_MAX_RETRIES = 12;

/**
 * What crosses IPC for an updater error. `String(err)` kept only the message
 * and lost electron-updater's `code`, which is what tells "the release is
 * still uploading" apart from a real failure.
 */
const serializeError = (err: unknown): { message: string; code?: string } => {
    if (err instanceof Error) {
        const code = (err as Error & { code?: unknown }).code;
        return { message: err.message, code: typeof code === "string" ? code : undefined };
    }
    return { message: String(err) };
};

export class AppUpdater implements AppModule {
    private store = new Store();
    private pendingRetry: NodeJS.Timeout | null = null;
    private pendingRetries = 0;

    constructor(private ipcTransport: IpcTransport, private windowManager: WindowManager) {}

    setup() {
        log.transports.file.level = "info";
        autoUpdater.logger = log;

        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;

        // Resolve the active channel and configure electron-updater accordingly.
        this.applyChannel(this.resolveChannel());

        autoUpdater.on("checking-for-update", () =>
            this.broadcast("updater:status", "Checking…"),
        );
        autoUpdater.on("update-available", (info) => {
            this.pendingRetries = 0;
            this.broadcast("updater:available", info);
        });
        autoUpdater.on("update-not-available", () => {
            this.pendingRetries = 0;
            this.broadcast("updater:none");
        });
        autoUpdater.on("download-progress", (p) =>
            this.broadcast("updater:progress", p),
        );
        autoUpdater.on("error", (err) => {
            this.broadcast("updater:error", serializeError(err));
            if (isPendingRelease(err)) this.schedulePendingRetry();
        });

        // The renderer shows this as a row in the rail with a Restart button,
        // rather than a modal that steals focus from whatever the user was in
        // the middle of. Ignoring the row is safe: `autoInstallOnAppQuit` means
        // "Later" was always the default outcome anyway.
        autoUpdater.on("update-downloaded", async (info) => {
            if (this.windowManager.getAllWindows().length > 0) {
                this.broadcast("updater:downloaded", { version: info.version });
                return;
            }
            // No window to put the row in — fall back to the native prompt.
            const r = await dialog.showMessageBox({
                type: "info",
                buttons: ["Restart now", "Later"],
                defaultId: 0,
                message: `Update ${info.version} downloaded`,
                detail: "Restart to install.",
            });
            if (r.response === 0) autoUpdater.quitAndInstall();
        });

        // Start the first check a little after launch
        setTimeout(() => autoUpdater.checkForUpdates(), 5000);
        // Periodic check (e.g., every 4 hours)
        setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);

        this.ipcTransport.handleChannel("check-for-updates", async () => {
            try {
                const result = await autoUpdater.checkForUpdates();
                return { success: true, result };
            } catch (error) {
                console.error("Manual update check failed:", error);
                const { message, code } = serializeError(error);
                return { success: false, error: message, code };
            }
        });

        // `setImmediate` so this call's IPC reply is flushed before the app
        // starts tearing itself down.
        this.ipcTransport.handleChannel("quit-and-install", async () => {
            setImmediate(() => autoUpdater.quitAndInstall());
            return { success: true };
        });

        this.ipcTransport.handleChannel("get-update-channel", async () => {
            return { channel: this.resolveChannel(), version: app.getVersion() };
        });

        this.ipcTransport.handleChannel("set-update-channel", async (_e, channel: UpdateChannel) => {
            try {
                const next: UpdateChannel = channel === "next" ? "next" : "latest";
                this.store.set(STORE_KEY, next);
                this.applyChannel(next);
                const result = await autoUpdater.checkForUpdates();
                return { success: true, result };
            } catch (error) {
                console.error("Set update channel failed:", error);
                const { message, code } = serializeError(error);
                return { success: false, error: message, code };
            }
        });
    }

    /**
     * One re-check a few minutes out, instead of leaving it to the 4-hour
     * interval: the builds of a half-published release usually land within
     * minutes. Re-armed per miss, never stacked, and given up after
     * `PENDING_MAX_RETRIES` misses in a row.
     */
    private schedulePendingRetry() {
        if (this.pendingRetry) clearTimeout(this.pendingRetry);
        if (this.pendingRetries >= PENDING_MAX_RETRIES) return;
        this.pendingRetries += 1;
        this.pendingRetry = setTimeout(() => {
            this.pendingRetry = null;
            autoUpdater.checkForUpdates().catch(() => {
                // Reported through the "error" event already.
            });
        }, PENDING_RETRY_MS);
    }

    /**
     * The active channel: the stored choice if present, otherwise derived from
     * the running version — a prerelease build (e.g. `1.66.0-rc.1`) defaults to
     * "next" so it keeps receiving prereleases.
     */
    private resolveChannel(): UpdateChannel {
        const stored = this.store.get(STORE_KEY) as UpdateChannel | undefined;
        if (stored === "next" || stored === "latest") return stored;
        // A semver prerelease version carries a `-` suffix (e.g. `1.66.0-rc.1`).
        return app.getVersion().includes("-") ? "next" : "latest";
    }

    /**
     * Map the user-facing channel to electron-updater. "next" reads the standard
     * `beta.yml` carrier and allows prereleases; "latest" is stable-only.
     * allowDowngrade lets a Next→Stable switch move to a lower stable version.
     */
    private applyChannel(channel: UpdateChannel) {
        autoUpdater.allowDowngrade = true;
        if (channel === "next") {
            autoUpdater.allowPrerelease = true;
            autoUpdater.channel = "beta";
        } else {
            autoUpdater.allowPrerelease = false;
            autoUpdater.channel = "latest";
        }
    }

    /**
     * Every window, not just the main one: a popout runs the same renderer shell
     * and so draws its own rail, and an update row missing from the window the
     * user happens to be in would be the one place it mattered.
     */
    private broadcast(channel: string, ...args: any[]) {
        for (const win of this.windowManager.getAllWindows()) {
            if (win.isDestroyed()) continue;
            this.ipcTransport.sendTo(win.webContents, channel, ...args);
        }
    }
}
