// main/issue-reporter.ts
import { ipcMain, BrowserWindow, shell, clipboard } from "electron";
import os from "node:os";

// ✅ Adjust these for your repo
const GITHUB_OWNER = "arkitektio";       // or "arkitekt-io" if that’s your org
const GITHUB_REPO = "orkestrator"; // repo name

/**
 * Sanitize a string to remove user directory paths and sensitive information.
 * This prevents exposing user's home directory, username, or local paths in issues.
 */
function sanitizePath(input: string): string {
    if (!input) return input;

    let sanitized = input;

    // Get the user's home directory
    const homeDir = os.homedir();
    
    // Replace home directory with ~
    if (homeDir) {
        // For Windows: C:\Users\username -> ~
        // For Unix: /home/username -> ~
        sanitized = sanitized.replace(new RegExp(homeDir.replace(/\\/g, '\\\\'), 'g'), '~');
    }

    // Replace hostname with generic identifier
    const hostname = os.hostname();
    if (hostname) {
        sanitized = sanitized.replace(new RegExp(hostname, 'g'), '<hostname>');
    }

    // Replace username from environment
    const username = os.userInfo().username;
    if (username) {
        sanitized = sanitized.replace(new RegExp(`\\b${username}\\b`, 'g'), '<username>');
    }

    // Sanitize common Windows paths
    sanitized = sanitized.replace(/C:\\Users\\[^\\]+/gi, 'C:\\Users\\<username>');
    
    // Sanitize common Unix paths
    sanitized = sanitized.replace(/\/home\/[^/]+/g, '/home/<username>');
    sanitized = sanitized.replace(/\/Users\/[^/]+/g, '/Users/<username>');

    // Sanitize file:// URLs with user paths
    sanitized = sanitized.replace(/file:\/\/\/[^?#\s]*/gi, () => {
        // Keep the file:// prefix but sanitize the path
        return 'file:///<sanitized-path>';
    });

    return sanitized;
}

function buildIssueUrl({
    title,
    body,
    labels,
    template,
}: {
    title: string;
    body: string;
    labels?: string[];
    template?: string;
}) {
    const base = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/issues/new`;
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (body) params.set("body", body);
    if (labels?.length) params.set("labels", labels.join(","));
    if (template) params.set("template", template); // e.g. "bug_report.md"
    return `${base}?${params.toString()}`;
}

/**
 * Register the IPC handler. Call registerIssueIpc() in app.whenReady().
 *
 * Renderer can call:
 *   await window.api.reportIssue({ title?, extra?, includeScreenshot? })
 */
export function registerIssueIpc() {
    ipcMain.handle("arkitekt.reportIssue", async (event, args: {
        title?: string;
        extra?: string;           // extra notes from renderer (e.g., user text)
        includeScreenshot?: boolean;
        labels?: string[];
        template?: string;        // e.g. "bug_report.md"
    }) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const rawCurrentUrl = win?.webContents.getURL() || "unknown";
        // Sanitize the current URL to avoid exposing file paths
        const currentUrl = sanitizePath(rawCurrentUrl);

        // Optional screenshot -> copy to clipboard so user can paste into GitHub
        let screenshotNote = "";
        if (args?.includeScreenshot && win) {
            const image = await win.webContents.capturePage();
            if (!image.isEmpty()) {
                clipboard.writeImage(image);
                screenshotNote =
                    "\n\n**Screenshot:** Copied to clipboard — paste it here (Ctrl/Cmd+V).";
            }
        }

        // Basic environment info (helps triage)
        const appVersion = process.env.npm_package_version ?? "unknown";
        // Sanitize OS release to avoid exposing user information
        const platform = `${os.platform()} ${sanitizePath(os.release())}`;
        const arch = process.arch;

        // Construct prefilled issue
        const title =
            args?.title ??
            "Bug: unexpected behavior in Orkestrator Next";

        // Sanitize user-provided extra content as well
        const sanitizedExtra = args?.extra?.trim() ? sanitizePath(args.extra.trim()) : "_Describe the issue..._";

        const body = [
            `### What happened?`,
            sanitizedExtra,
            "",
            `### Reproduction / Context`,
            `- Current page: \`${currentUrl}\``,
            "",
            `### Environment`,
            `- App version: \`${appVersion}\``,
            `- OS: \`${platform}\``,
            `- Arch: \`${arch}\``,
            screenshotNote,
        ].join("\n");

        const url = buildIssueUrl({
            title,
            body,
            labels: args?.labels ?? ["bug"],
            template: args?.template, // if you have e.g. bug_report.md
        });

        await shell.openExternal(url);

        return { ok: true, url, copiedScreenshot: !!screenshotNote };
    });
}