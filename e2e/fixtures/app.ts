import { _electron as electron, expect, test as base, type ElectronApplication, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAIN = resolve(dirname(fileURLToPath(import.meta.url)), "../../out/main/index.js");

/** What the renderer reported that a user would see as broken: uncaught errors and console errors. */
export type AppErrors = { page: string[]; console: string[] };

export type OrkestratorApp = {
  electronApp: ElectronApplication;
  window: Page;
  errors: AppErrors;
  /** URLs the app asked the OS to open (the sign-in page), instead of opening them. */
  opened: () => Promise<string[]>;
  /** Quit and start again on the same user data: what a user sees on their next launch. */
  relaunch: () => Promise<void>;
};

/** Console errors that say nothing about the app being broken (an offline hub probe, a devtools hint). */
const IGNORED_CONSOLE = [/Download the React DevTools/i, /net::ERR_/i, /Failed to load resource/i];

const launch = async (userDataDir: string) => {
  const electronApp = await electron.launch({
    // Without a display (CI without xvfb, a terminal) Chromium draws headless.
    args: [MAIN, `--user-data-dir=${userDataDir}`, "--no-sandbox", ...(process.env.DISPLAY ? [] : ["--ozone-platform=headless"])],
    env: { ...process.env, NODE_ENV: "production", ELECTRON_ENABLE_LOGGING: "1" },
  });
  // The sign-in page would open in the system browser: record it instead.
  await electronApp.evaluate(({ shell }) => {
    const opened: string[] = [];
    (globalThis as unknown as { __e2eOpened: string[] }).__e2eOpened = opened;
    shell.openExternal = async (url: string) => {
      opened.push(url);
    };
  });
  const window = await mainWindow(electronApp);
  await desktopSized(electronApp, window);
  return { electronApp, window };
};

/**
 * Headless Chromium has a 1×1 screen, and the app sizes its window to the
 * screen while it starts (restoring its saved bounds): give it a desktop's,
 * again until it holds, or nothing is "visible".
 */
const desktopSized = async (electronApp: ElectronApplication, page: Page) => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    await electronApp.evaluate(({ BrowserWindow }) => {
      for (const browserWindow of BrowserWindow.getAllWindows()) {
        const url = browserWindow.webContents.getURL();
        if (url.startsWith("app://") && !url.includes("role=")) browserWindow.setBounds({ x: 0, y: 0, width: 1440, height: 900 });
      }
    });
    const width = await page.evaluate(() => window.innerWidth).catch(() => 0);
    if (width >= 1000) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The main window never took a desktop size");
};

/**
 * The main window: the app's own page without a `role` (the quick bar is
 * `?role=quick`). DevTools opens beside it in an unpackaged build, so the
 * first window is not necessarily it.
 */
const isMain = (url: string) => url.startsWith("app://") && !url.includes("role=");

const mainWindow = async (electronApp: ElectronApplication): Promise<Page> => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const found = electronApp.windows().find((candidate) => isMain(candidate.url()));
    if (found) return found;
    await electronApp.waitForEvent("window", { timeout: 1_000 }).catch(() => undefined);
  }
  throw new Error(`No main window; open: ${electronApp.windows().map((w) => w.url()).join(", ")}`);
};

const watch = (window: Page, errors: AppErrors) => {
  window.on("pageerror", (error) => errors.page.push(`${error.name}: ${error.message}`));
  window.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!IGNORED_CONSOLE.some((pattern) => pattern.test(text))) errors.console.push(text);
  });
};

export const test = base.extend<{ app: OrkestratorApp }>({
  // eslint-disable-next-line no-empty-pattern
  app: async ({}, use, testInfo) => {
    const userDataDir = mkdtempSync(join(tmpdir(), "orkestrator-e2e-"));
    const errors: AppErrors = { page: [], console: [] };
    let current = await launch(userDataDir);
    watch(current.window, errors);
    const app: OrkestratorApp = {
      get electronApp() {
        return current.electronApp;
      },
      get window() {
        return current.window;
      },
      errors,
      opened: () =>
        current.electronApp.evaluate(() => (globalThis as unknown as { __e2eOpened?: string[] }).__e2eOpened ?? []),
      relaunch: async () => {
        await current.electronApp.close();
        current = await launch(userDataDir);
        watch(current.window, errors);
      },
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's fixture callback, not React's `use`
    await use(app);
    if (testInfo.status !== testInfo.expectedStatus) {
      await current.window.screenshot({ path: testInfo.outputPath("last-window.png") }).catch(() => undefined);
    }
    await current.electronApp.close().catch(() => undefined);
    rmSync(userDataDir, { recursive: true, force: true });
  },
});

export { expect };

/** No fallback screen ("Not installed", "Unreachable", "Error 404") is showing. */
export const expectNoStatusPage = async (window: Page) => {
  await expect(window.getByTestId("status-page")).toHaveCount(0);
};

/** Nothing the renderer threw or logged as an error. */
export const expectNoErrors = (errors: AppErrors) => {
  expect(errors.page, "uncaught errors in the window").toEqual([]);
  expect(errors.console, "console errors in the window").toEqual([]);
};
