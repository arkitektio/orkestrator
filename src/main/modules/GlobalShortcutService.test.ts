import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: {}, BrowserWindow: {}, globalShortcut: {} }));
vi.mock("electron-store", () => ({ default: class {} }));

import {
  DEFAULT_GLOBAL_PALETTE_SHORTCUT,
  GLOBAL_PALETTE_SHORTCUT_KEY,
  GlobalShortcutService,
  PALETTE_SET_SHORTCUT_CHANNEL,
  type GlobalShortcutDeps,
} from "./GlobalShortcutService";
import type { IpcTransport } from "./IpcTransport";

const setup = async ({
  stored = undefined as unknown,
  taken = [] as string[],
  invalid = [] as string[],
} = {}) => {
  const registered = new Map<string, () => void>();
  const data = new Map<string, unknown>(stored === undefined ? [] : [[GLOBAL_PALETTE_SHORTCUT_KEY, stored]]);
  const onTrigger = vi.fn();
  let handler: (event: unknown, accelerator: unknown) => unknown = () => undefined;
  const deps: GlobalShortcutDeps = {
    globalShortcut: {
      register: vi.fn((accelerator: string, cb: () => void) => {
        if (invalid.includes(accelerator)) throw new Error("bad accelerator");
        if (taken.includes(accelerator)) return false;
        registered.set(accelerator, cb);
        return true;
      }),
      unregister: vi.fn((accelerator: string) => void registered.delete(accelerator)),
      unregisterAll: vi.fn(() => registered.clear()),
    },
    store: {
      get: (key, fallback) => (data.has(key) ? data.get(key) : fallback),
      set: (key, value) => void data.set(key, value),
    },
    whenReady: () => Promise.resolve(),
    onWillQuit: vi.fn(),
    onTrigger,
  };
  const transport = {
    handleChannel: (channel: string, fn: typeof handler) => {
      if (channel === PALETTE_SET_SHORTCUT_CHANNEL) handler = fn;
    },
  } as unknown as IpcTransport;
  const service = new GlobalShortcutService(transport, deps);
  service.setup();
  await Promise.resolve();
  await Promise.resolve();
  return {
    service,
    registered,
    data,
    onTrigger,
    set: (accelerator: unknown) => handler({}, accelerator),
  };
};

describe("GlobalShortcutService", () => {
  it("registers the default at boot when nothing is stored", async () => {
    const { registered } = await setup();
    expect([...registered.keys()]).toEqual([DEFAULT_GLOBAL_PALETTE_SHORTCUT]);
  });

  it("registers nothing when the stored value is off", async () => {
    const { registered } = await setup({ stored: null });
    expect(registered.size).toBe(0);
  });

  it("swaps to a new accelerator and persists it", async () => {
    const { registered, data, set } = await setup();
    expect(set("Alt+Space")).toEqual({ status: "ok", accelerator: "Alt+Space" });
    expect([...registered.keys()]).toEqual(["Alt+Space"]);
    expect(data.get(GLOBAL_PALETTE_SHORTCUT_KEY)).toBe("Alt+Space");
  });

  it("keeps the previous shortcut when the new one is taken, and persists nothing", async () => {
    const { registered, data, set } = await setup({ taken: ["Alt+Space"] });
    expect(set("Alt+Space")).toEqual({ status: "taken", accelerator: DEFAULT_GLOBAL_PALETTE_SHORTCUT });
    expect([...registered.keys()]).toEqual([DEFAULT_GLOBAL_PALETTE_SHORTCUT]);
    expect(data.has(GLOBAL_PALETTE_SHORTCUT_KEY)).toBe(false);
  });

  it("reports an unparsable accelerator as invalid", async () => {
    const { set } = await setup({ invalid: ["Nonsense+Key"] });
    expect(set("Nonsense+Key")).toMatchObject({ status: "invalid" });
  });

  it("turns off on null and persists the choice", async () => {
    const { registered, data, set } = await setup();
    expect(set(null)).toEqual({ status: "off", accelerator: null });
    expect(registered.size).toBe(0);
    expect(data.get(GLOBAL_PALETTE_SHORTCUT_KEY)).toBeNull();
  });

  it("toggles the quick bar when the shortcut fires", async () => {
    const { registered, onTrigger, service } = await setup();
    registered.get(DEFAULT_GLOBAL_PALETTE_SHORTCUT)!();
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(service.isRegistered()).toBe(true);
  });
});
