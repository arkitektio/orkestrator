import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: {}, BrowserWindow: class {}, screen: {} }));
vi.mock("@electron-toolkit/utils", () => ({ is: { dev: false } }));
vi.mock("../scheme", () => ({ APP_ORIGIN: "app://orkestrator" }));

import {
  BAR_MAX_HEIGHT,
  BAR_MIN_HEIGHT,
  BAR_WIDTH,
  EXPANDED_SIZE,
  QUICK_HIDE_CHANNEL,
  QUICK_KEEP_OPEN_CHANNEL,
  QUICK_OPEN_DIALOG_IN_MAIN_CHANNEL,
  QUICK_OPEN_IN_MAIN_CHANNEL,
  QUICK_RESIZE_CHANNEL,
  QUICK_SHOWN_CHANNEL,
  QuickPaletteWindow,
  barBounds,
  resizeAroundTopCentre,
  type QuickPaletteDeps,
  type Rect,
} from "./QuickPaletteWindow";
import type { IpcTransport } from "./IpcTransport";

const WORK_AREA: Rect = { x: 0, y: 25, width: 1920, height: 1055 };

const fakeWindow = () => {
  let visible = false;
  let bounds: Rect = { x: 0, y: 0, width: BAR_WIDTH, height: BAR_MIN_HEIGHT };
  let blur: () => void = () => {};
  const window = {
    isDestroyed: () => false,
    isVisible: () => visible,
    show: vi.fn(() => void (visible = true)),
    hide: vi.fn(() => void (visible = false)),
    focus: vi.fn(),
    destroy: vi.fn(),
    setBounds: vi.fn((b: Rect) => void (bounds = b)),
    getBounds: () => bounds,
    on: (_event: "blur", listener: () => void) => void (blur = listener),
    webContents: { send: vi.fn(), isLoading: () => false, once: vi.fn() },
    blur: () => blur(),
  };
  return window;
};

const setup = ({ platform = "darwin", mainVisible = false } = {}) => {
  const window = fakeWindow();
  const channels = new Map<string, (event: unknown, ...args: unknown[]) => void>();
  let mainClosed: () => void = () => {};
  let prewarm: () => void = () => {};
  const deps: QuickPaletteDeps = {
    createWindow: vi.fn(() => window),
    cursorWorkArea: () => WORK_AREA,
    platform,
    focusApp: vi.fn(),
    hideApp: vi.fn(),
    mainWindowVisible: () => mainVisible,
    openInTab: vi.fn(),
    openDialogInMain: vi.fn(),
    onMainClosed: (listener) => void (mainClosed = listener),
    whenReady: () => Promise.resolve(),
    schedule: (fn) => void (prewarm = fn),
    shouldPrewarm: () => true,
  };
  const transport = {
    onChannel: (channel: string, fn: (event: unknown, ...args: unknown[]) => void) =>
      void channels.set(channel, fn),
  } as unknown as IpcTransport;
  const quick = new QuickPaletteWindow(transport, deps);
  quick.setup();
  const send = (channel: string, ...args: unknown[]) => channels.get(channel)!({}, ...args);
  return { quick, window, deps, send, mainClosed: () => mainClosed(), prewarm: () => prewarm() };
};

describe("QuickPaletteWindow", () => {
  it("shows the bar centred a fifth down the cursor's display, and tells the renderer", () => {
    const { quick, window, deps } = setup();
    quick.toggle();
    expect(window.getBounds()).toEqual(barBounds(WORK_AREA, BAR_MIN_HEIGHT));
    expect(window.getBounds().y).toBe(Math.round(25 + 1055 * 0.2));
    expect(deps.focusApp).toHaveBeenCalled();
    expect(window.show).toHaveBeenCalled();
    expect(window.webContents.send).toHaveBeenCalledWith(QUICK_SHOWN_CHANNEL);
  });

  it("hides on a second press, and hands focus back on macOS when the app has no window up", () => {
    const { quick, window, deps } = setup();
    quick.toggle();
    quick.toggle();
    expect(window.hide).toHaveBeenCalled();
    expect(deps.hideApp).toHaveBeenCalled();
  });

  it("does not hide the app when the main window is on screen", () => {
    const { quick, deps } = setup({ mainVisible: true });
    quick.toggle();
    quick.toggle();
    expect(deps.hideApp).not.toHaveBeenCalled();
  });

  it("hides on blur unless the renderer holds it open", () => {
    const { quick, window, send } = setup();
    quick.toggle();
    send(QUICK_KEEP_OPEN_CHANNEL, true);
    window.blur();
    expect(window.isVisible()).toBe(true);
    send(QUICK_KEEP_OPEN_CHANNEL, false);
    window.blur();
    expect(window.isVisible()).toBe(false);
  });

  it("fits the panel height, clamped, and expands around the same top-centre point", () => {
    const { quick, window, send } = setup();
    quick.toggle();
    send(QUICK_RESIZE_CHANNEL, { height: 9999 });
    expect(window.getBounds().height).toBe(BAR_MAX_HEIGHT);
    const bar = window.getBounds();
    send(QUICK_RESIZE_CHANNEL, { height: 300, expanded: true });
    const expanded = window.getBounds();
    expect(expanded).toMatchObject(EXPANDED_SIZE);
    expect(expanded.y).toBe(bar.y);
    expect(expanded.x + expanded.width / 2).toBeCloseTo(bar.x + bar.width / 2, 0);
    send(QUICK_RESIZE_CHANNEL, { height: 300 });
    expect(window.getBounds()).toMatchObject({ width: BAR_WIDTH, height: 300 });
  });

  it("forwards a navigation to the main window and hides without hiding the app", () => {
    const { quick, window, deps, send } = setup();
    quick.toggle();
    send(QUICK_OPEN_IN_MAIN_CHANNEL, "/mikro/images/1");
    expect(deps.openInTab).toHaveBeenCalledWith("/mikro/images/1");
    expect(window.isVisible()).toBe(false);
    expect(deps.hideApp).not.toHaveBeenCalled();
    send(QUICK_OPEN_IN_MAIN_CHANNEL, "https://evil.example");
    expect(deps.openInTab).toHaveBeenCalledTimes(1);
  });

  it("forwards a dialog to the main window, and drops a malformed one", () => {
    const { quick, window, deps, send } = setup();
    quick.toggle();
    const request = { type: "sheet", id: "kuvertcompose", props: { replyTo: "m1", mode: "reply" }, options: { size: "large" } };
    send(QUICK_OPEN_DIALOG_IN_MAIN_CHANNEL, request);
    expect(deps.openDialogInMain).toHaveBeenCalledWith(request);
    expect(window.isVisible()).toBe(false);
    expect(deps.hideApp).not.toHaveBeenCalled();
    send(QUICK_OPEN_DIALOG_IN_MAIN_CHANNEL, { type: "popup", id: "x", props: {} });
    send(QUICK_OPEN_DIALOG_IN_MAIN_CHANNEL, { type: "dialog", id: "", props: {} });
    send(QUICK_OPEN_DIALOG_IN_MAIN_CHANNEL, null);
    expect(deps.openDialogInMain).toHaveBeenCalledTimes(1);
  });

  it("hides on request from the renderer", () => {
    const { quick, window, send } = setup();
    quick.toggle();
    send(QUICK_HIDE_CHANNEL);
    expect(window.isVisible()).toBe(false);
  });

  it("pre-warms once the app is ready", async () => {
    const { deps, prewarm } = setup();
    await Promise.resolve();
    prewarm();
    expect(deps.createWindow).toHaveBeenCalledTimes(1);
  });

  it("is destroyed with the main window off macOS, kept on macOS", () => {
    const off = setup({ platform: "win32" });
    off.quick.toggle();
    off.mainClosed();
    expect(off.window.destroy).toHaveBeenCalled();
    const mac = setup({ platform: "darwin" });
    mac.quick.toggle();
    mac.mainClosed();
    expect(mac.window.destroy).not.toHaveBeenCalled();
  });
});

describe("resizeAroundTopCentre", () => {
  it("keeps the top edge and the horizontal centre", () => {
    expect(resizeAroundTopCentre({ x: 100, y: 50, width: 600, height: 64 }, { width: 1000, height: 760 })).toEqual({
      x: -100,
      y: 50,
      width: 1000,
      height: 760,
    });
  });
});
