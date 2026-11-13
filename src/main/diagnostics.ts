import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { writeFile } from "node:fs/promises";
import os from "node:os";

/**
 * The main process's part of a bug report (`renderer/src/core/diagnostics`):
 * what only it knows (the app's version, this process's own log), the
 * screenshot, and writing a report to a file when it cannot be sent.
 *
 * Nothing here sends anything anywhere. The renderer asks for these when the
 * user files a report, and shows them before they go.
 */
const MAX_LOG_LINES = 300;
const MAX_LOG_LINE_LENGTH = 2000;
/** Wide enough to read text in, small enough to send. */
const SCREENSHOT_MAX_WIDTH = 1600;
const SCREENSHOT_QUALITY = 70;
/** A report is text plus one screenshot; anything larger is not one. */
const MAX_SAVE_BYTES = 8 * 1024 * 1024;

const mainLog: string[] = [];

const formatArg = (arg: unknown): string => {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
    try {
        return JSON.stringify(arg) ?? String(arg);
    } catch {
        return String(arg);
    }
};

/** Keeps the last lines this process logged. The console works as before. */
function recordMainConsole() {
    (["log", "warn", "error"] as const).forEach((level) => {
        const original = console[level].bind(console);
        console[level] = (...args: unknown[]) => {
            try {
                const line = `${new Date().toISOString()} ${level} ${args.map(formatArg).join(" ")}`;
                mainLog.push(line.slice(0, MAX_LOG_LINE_LENGTH));
                if (mainLog.length > MAX_LOG_LINES) mainLog.splice(0, mainLog.length - MAX_LOG_LINES);
            } catch {
                // Recording must never break logging.
            }
            original(...args);
        };
    });
}

export function registerDiagnosticsIpc() {
    recordMainConsole();

    ipcMain.handle("diagnostics:info", () => ({
        appVersion: app.getVersion(),
        platform: `${os.platform()} ${os.release()}`,
        arch: process.arch,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        // What the renderer strips from a report before anyone sees it. These
        // never leave this computer: they are used to remove themselves.
        scrub: { home: os.homedir(), username: os.userInfo().username, hostname: os.hostname() },
    }));

    ipcMain.handle("diagnostics:main-log", () => [...mainLog]);

    /** The window as it looks right now, as a JPEG data URL; null when there is nothing to show. */
    ipcMain.handle("diagnostics:capture", async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return null;
        try {
            let image = await win.webContents.capturePage();
            if (image.isEmpty()) return null;
            if (image.getSize().width > SCREENSHOT_MAX_WIDTH) {
                image = image.resize({ width: SCREENSHOT_MAX_WIDTH, quality: "good" });
            }
            return `data:image/jpeg;base64,${image.toJPEG(SCREENSHOT_QUALITY).toString("base64")}`;
        } catch (error) {
            console.warn("Could not capture the window for a bug report:", error);
            return null;
        }
    });

    /** Ask where to put a report and write it there. The user picks the path; the renderer never names one. */
    ipcMain.handle("diagnostics:save", async (event, args: { name?: unknown; content?: unknown }) => {
        if (typeof args?.content !== "string" || Buffer.byteLength(args.content) > MAX_SAVE_BYTES) {
            return { saved: false, error: "The report is too large to save" };
        }
        const name = typeof args.name === "string" ? args.name.replace(/[^\w.-]/g, "_").slice(0, 80) : "";
        const win = BrowserWindow.fromWebContents(event.sender);
        const options = {
            title: "Save bug report",
            defaultPath: name || "orkestrator-report.html",
            filters: [{ name: "Report", extensions: ["html"] }],
        };
        const { canceled, filePath } = win
            ? await dialog.showSaveDialog(win, options)
            : await dialog.showSaveDialog(options);
        if (canceled || !filePath) return { saved: false };
        await writeFile(filePath, args.content, "utf8");
        return { saved: true };
    });
}
