// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  settings: { railFloating: false, railFloatShortcut: "CommandOrControl+Shift+S" as string | null },
  setSettings: vi.fn(),
}));

vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings: state.settings, setSettings: state.setSettings }),
  useSettingsStoreApi: () => ({
    getState: () => ({ settings: state.settings, setSettings: state.setSettings }),
  }),
}));

import { useRailFloatShortcut, useRailFloating, useToggleRailFloating } from "./railFloat";

const press = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
  });

beforeEach(() => {
  state.settings = { railFloating: false, railFloatShortcut: "CommandOrControl+Shift+S" };
  state.setSettings.mockReset();
});

describe("useRailFloating", () => {
  it("follows the setting", () => {
    expect(renderHook(() => useRailFloating()).result.current).toBe(false);
    state.settings = { ...state.settings, railFloating: true };
    expect(renderHook(() => useRailFloating()).result.current).toBe(true);
  });
});

describe("the toggle", () => {
  it("flips the persisted setting", () => {
    const { result } = renderHook(() => useToggleRailFloating());
    result.current();
    expect(state.setSettings).toHaveBeenCalledWith(expect.objectContaining({ railFloating: true }));
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
