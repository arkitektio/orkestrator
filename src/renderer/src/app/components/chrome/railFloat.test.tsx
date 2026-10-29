// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  settings: { railFloating: false, railFloatShortcut: "CommandOrControl+Shift+S" as string | null },
  fullscreen: false,
  setSettings: vi.fn(),
}));

vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings: state.settings, setSettings: state.setSettings }),
  useSettingsStoreApi: () => ({
    getState: () => ({ settings: state.settings, setSettings: state.setSettings }),
  }),
}));

vi.mock("@/core/util/platform", () => ({
  useWindowState: () => ({ fullscreen: state.fullscreen, maximized: false, focused: true }),
}));

import {
  effectiveRailFloating,
  setFullscreenDocked,
  useRailFloatShortcut,
  useRailFloating,
  useToggleRailFloating,
} from "./railFloat";

const press = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
  });

beforeEach(() => {
  state.settings = { railFloating: false, railFloatShortcut: "CommandOrControl+Shift+S" };
  state.fullscreen = false;
  state.setSettings.mockReset();
  setFullscreenDocked(false);
});

afterEach(() => setFullscreenDocked(false));

describe("effectiveRailFloating", () => {
  it("follows the setting while windowed", () => {
    expect(effectiveRailFloating(false, false, false)).toBe(false);
    expect(effectiveRailFloating(true, false, false)).toBe(true);
    // The fullscreen session flag means nothing windowed.
    expect(effectiveRailFloating(false, false, true)).toBe(false);
  });

  it("floats in fullscreen whatever the setting, unless docked for the session", () => {
    expect(effectiveRailFloating(false, true, false)).toBe(true);
    expect(effectiveRailFloating(true, true, false)).toBe(true);
    expect(effectiveRailFloating(true, true, true)).toBe(false);
  });
});

describe("the toggle", () => {
  it("flips the persisted setting while windowed", () => {
    const { result } = renderHook(() => useToggleRailFloating());
    result.current();
    expect(state.setSettings).toHaveBeenCalledWith(expect.objectContaining({ railFloating: true }));
  });

  it("docks for the session in fullscreen without touching the setting", () => {
    state.fullscreen = true;
    const { result } = renderHook(() => ({ floating: useRailFloating(), toggle: useToggleRailFloating() }));
    expect(result.current.floating).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.floating).toBe(false);
    expect(state.setSettings).not.toHaveBeenCalled();
  });

  it("forgets the session dock on leaving fullscreen", () => {
    state.fullscreen = true;
    setFullscreenDocked(true);
    const { result, rerender } = renderHook(() => useRailFloating());
    expect(result.current).toBe(false);

    state.fullscreen = false;
    rerender();
    state.fullscreen = true;
    rerender();
    expect(result.current).toBe(true);
  });
});

describe("the shortcut", () => {
  it("fires on the configured accelerator", () => {
    renderHook(() => useRailFloatShortcut());
    // jsdom is not a Mac, so the primary modifier is Ctrl.
    press({ code: "KeyS", key: "S", ctrlKey: true, shiftKey: true });
    expect(state.setSettings).toHaveBeenCalledTimes(1);
  });

  it("ignores other keys and repeats", () => {
    renderHook(() => useRailFloatShortcut());
    press({ code: "KeyS", key: "s" });
    press({ code: "KeyS", key: "s", ctrlKey: true });
    press({ code: "KeyS", key: "S", ctrlKey: true, shiftKey: true, repeat: true });
    expect(state.setSettings).not.toHaveBeenCalled();
  });

  it("follows a reconfigured shortcut, and is silent when turned off", () => {
    state.settings = { railFloating: false, railFloatShortcut: "CommandOrControl+Alt+B" };
    const { rerender } = renderHook(() => useRailFloatShortcut());
    press({ code: "KeyS", key: "S", ctrlKey: true, shiftKey: true });
    expect(state.setSettings).not.toHaveBeenCalled();
    press({ code: "KeyB", key: "b", ctrlKey: true, altKey: true });
    expect(state.setSettings).toHaveBeenCalledTimes(1);

    state.settings = { railFloating: false, railFloatShortcut: null };
    rerender();
    press({ code: "KeyB", key: "b", ctrlKey: true, altKey: true });
    expect(state.setSettings).toHaveBeenCalledTimes(1);
  });
});
