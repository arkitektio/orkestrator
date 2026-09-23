import { app, session } from "electron";
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "./AppModule";
import { IpcTransport } from "./IpcTransport";

/**
 * Factory reset: this computer forgets everything Orkestrator ever stored and
 * the next launch is a vanilla install.
 *
 * Everything lives under `userData` — accounts and tokens (localStorage),
 * caches and IndexedDB, the electron-store preferences, the mesh nodes'
 * state and the downloaded voice models. Chromium and the sidecars hold files
 * in there open while the app runs, so the directory cannot be removed from
 * inside a running app. Instead the reset is two halves:
 *
 * 1. Now: wipe the session's storage (so nothing is readable even if step 2
 *    never happens), drop a marker, relaunch. Quitting runs every module's
 *    `onBeforeQuit`, which stops the mesh sidecar and the voice worker.
 * 2. Next launch: `finishFactoryReset` sees the marker before anything opens
 *    a file in `userData`, empties it — and relaunches once more without
 *    opening a window. Chromium has already started by the time main runs
 *    (its GPU and shader caches live in `userData` too), so the process that
 *    did the wiping is not trusted to draw; the hop gets a clean one.
 *
 * In development there is no relaunch: electron-vite stops its dev server
 * when Electron exits, so a relaunched instance would load a dead URL and
 * show an empty window. The app quits and the next `pnpm dev` finishes it.
 *
 * Nothing is revoked on the server: logins stay valid there until they
 * expire, and mesh nodes stay in the tailnet until an admin removes them.
 */

export const FACTORY_RESET_MARKER = ".factory-reset";

/**
 * Empties `userDataDir` if a reset was requested. Must run before any
 * electron-store is constructed and before the single-instance lock.
 * Returns whether a reset happened.
 */
export function consumeFactoryReset(userDataDir: string): boolean {
  if (!existsSync(join(userDataDir, FACTORY_RESET_MARKER))) return false;
  for (const entry of readdirSync(userDataDir)) {
    // The marker goes last, so a crash half-way retries on the next launch.
    if (entry === FACTORY_RESET_MARKER) continue;
    try {
      rmSync(join(userDataDir, entry), { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      console.warn(`Factory reset could not remove ${entry}`, error);
    }
  }
  rmSync(join(userDataDir, FACTORY_RESET_MARKER), { force: true });
  return true;
}

/** Passed to the hop instance so a failed wipe cannot relaunch forever. */
const HOP_FLAG = "--factory-reset-hop";

/**
 * Startup half of the reset; call at the top of main. Returns true when this
 * process is exiting for the clean hop and must not go on to set anything up.
 */
export function finishFactoryReset(): boolean {
  if (process.argv.includes(HOP_FLAG)) return false;
  if (!consumeFactoryReset(app.getPath("userData"))) return false;
  console.log("Factory reset: userData emptied");
  if (!app.isPackaged) return false;
  app.relaunch({ args: [...process.argv.slice(1), HOP_FLAG] });
  app.exit(0);
  return true;
}

export class FactoryResetService implements AppModule {
  constructor(private ipcTransport: IpcTransport) {}

  setup() {
    this.ipcTransport.handleChannel("app:factory-reset", async () => {
      writeFileSync(join(app.getPath("userData"), FACTORY_RESET_MARKER), new Date().toISOString());
      await session.defaultSession.clearStorageData();
      await session.defaultSession.clearCache();
      if (app.isPackaged) {
        app.relaunch();
      } else {
        console.log("Factory reset: start `pnpm dev` again to finish it");
      }
      app.quit();
    });
  }
}
