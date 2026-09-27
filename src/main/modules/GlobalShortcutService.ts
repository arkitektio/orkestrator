import { app, globalShortcut } from "electron";
import Store from "electron-store";
import { AppModule } from "./AppModule";
import { IpcTransport } from "./IpcTransport";

/** The electron-store key for the system-wide palette shortcut. */
export const GLOBAL_PALETTE_SHORTCUT_KEY = "globalPaletteShortcut";

/**
 * The default: rarely claimed by other apps (⌘Space is Spotlight, ⌥Space the
 * launchers'), and ⌘K itself stays in-app — registered system-wide it would be
 * taken from every browser and editor on the machine.
 */
export const DEFAULT_GLOBAL_PALETTE_SHORTCUT = "CommandOrControl+Shift+Space";

/** Invoked by the renderer's settings store with an accelerator or null (off). */
export const PALETTE_SET_SHORTCUT_CHANNEL = "palette:set-global-shortcut";

export type GlobalShortcutStatus = {
  /** `taken`: another app holds it; `invalid`: not an accelerator Electron knows. */
  status: "ok" | "off" | "taken" | "invalid";
  /** What is registered NOW (the previous one survives a failed change). */
  accelerator: string | null;
};

/** The electron surface this needs — injected, so the logic is testable. */
export type GlobalShortcutDeps = {
  globalShortcut: {
    register(accelerator: string, callback: () => void): boolean;
    unregister(accelerator: string): void;
    unregisterAll(): void;
  };
  store: { get(key: string, fallback?: unknown): unknown; set(key: string, value: unknown): void };
  whenReady(): Promise<unknown>;
  onWillQuit(listener: () => void): void;
  /** What the shortcut does: toggle the floating quick bar (QuickPaletteWindow). */
  onTrigger(): void;
};

/**
 * A system-wide shortcut that summons the floating quick bar
 * (`QuickPaletteWindow`) over whatever app is in front.
 *
 * The in-app ⌘K is a renderer `keydown` listener and only works while a window
 * has focus; this is the one registered with the OS. The accelerator lives in
 * the main process's store (like the rail-glass preference), so it is live at
 * boot, before any window exists; the renderer's settings page changes it
 * through `palette:set-global-shortcut` and is told whether that worked.
 */
export class GlobalShortcutService implements AppModule {
  private registered: string | null = null;

  constructor(
    private readonly transport: IpcTransport,
    private readonly deps: GlobalShortcutDeps,
  ) {}

  setup() {
    this.deps.onWillQuit(() => this.deps.globalShortcut.unregisterAll());
    this.transport.handleChannel(PALETTE_SET_SHORTCUT_CHANNEL, (_event, accelerator: unknown) =>
      this.change(
        typeof accelerator === "string" && accelerator.trim() ? accelerator.trim() : null,
      ),
    );
    // globalShortcut is only usable once the app is ready. Not returned:
    // AppManager awaits each module's setup in turn, and every module after
    // this one would wait for app-ready too.
    void this.deps.whenReady().then(() => {
      const stored = this.deps.store.get(
        GLOBAL_PALETTE_SHORTCUT_KEY,
        DEFAULT_GLOBAL_PALETTE_SHORTCUT,
      );
      const accelerator = typeof stored === "string" && stored ? stored : null;
      if (accelerator && this.tryRegister(accelerator) !== "ok") {
        console.warn(`[palette] global shortcut ${accelerator} is unavailable`);
      }
    });
  }

  /** Swap the registration. A failed change keeps the previous shortcut. */
  change(accelerator: string | null): GlobalShortcutStatus {
    if (accelerator === this.registered) {
      return { status: accelerator ? "ok" : "off", accelerator };
    }
    const previous = this.registered;
    if (previous) this.deps.globalShortcut.unregister(previous);
    this.registered = null;

    if (!accelerator) {
      this.deps.store.set(GLOBAL_PALETTE_SHORTCUT_KEY, null);
      return { status: "off", accelerator: null };
    }

    const status = this.tryRegister(accelerator);
    if (status === "ok") {
      this.deps.store.set(GLOBAL_PALETTE_SHORTCUT_KEY, accelerator);
      return { status, accelerator };
    }
    if (previous) this.tryRegister(previous);
    return { status, accelerator: this.registered };
  }

  private tryRegister(accelerator: string): "ok" | "taken" | "invalid" {
    try {
      // `register` returns false when another app holds it; it THROWS on an
      // accelerator string Electron cannot parse.
      if (!this.deps.globalShortcut.register(accelerator, () => this.deps.onTrigger())) return "taken";
    } catch {
      return "invalid";
    }
    this.registered = accelerator;
    return "ok";
  }

  /** Whether a shortcut is registered right now. */
  isRegistered(): boolean {
    return this.registered !== null;
  }
}

/** The real electron wiring. */
export const electronGlobalShortcutDeps = (onTrigger: () => void): GlobalShortcutDeps => ({
  globalShortcut,
  store: new Store(),
  whenReady: () => app.whenReady(),
  onWillQuit: (listener) => app.on("will-quit", listener),
  onTrigger,
});
