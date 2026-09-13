// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  detachModifierTracker,
  getModifierState,
  useModifierState,
} from "./modifierTracker";

const key = (type: "keydown" | "keyup", init: KeyboardEventInit) =>
  window.dispatchEvent(new KeyboardEvent(type, { bubbles: true, ...init }));

describe("modifierTracker", () => {
  afterEach(() => {
    detachModifierTracker();
  });

  it("starts with no modifiers held", () => {
    expect(getModifierState()).toEqual({
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    });
  });

  it("tracks modifiers from window key events", () => {
    getModifierState(); // attaches
    key("keydown", { key: "Shift", shiftKey: true });
    expect(getModifierState().shiftKey).toBe(true);
    key("keydown", { key: "a", shiftKey: true, metaKey: true });
    expect(getModifierState()).toMatchObject({ shiftKey: true, metaKey: true });
    key("keyup", { key: "Shift", metaKey: true });
    expect(getModifierState()).toMatchObject({ shiftKey: false, metaKey: true });
  });

  it("tracks modifiers from mouse events and resets on blur", () => {
    getModifierState();
    window.dispatchEvent(new MouseEvent("mousedown", { ctrlKey: true, altKey: true }));
    expect(getModifierState()).toMatchObject({ ctrlKey: true, altKey: true });
    window.dispatchEvent(new Event("blur"));
    expect(getModifierState()).toMatchObject({ ctrlKey: false, altKey: false });
  });

  it("keeps the same state object while nothing changes", () => {
    const before = getModifierState();
    key("keydown", { key: "a" });
    expect(getModifierState()).toBe(before);
  });

  it("only ever attaches one set of window listeners", () => {
    const calls: string[] = [];
    const original = window.addEventListener.bind(window);
    const spy = ((type: string, ...rest: unknown[]) => {
      calls.push(type);
      return (original as (...args: unknown[]) => void)(type, ...rest);
    }) as typeof window.addEventListener;
    window.addEventListener = spy;
    try {
      getModifierState();
      getModifierState();
      renderHook(() => useModifierState());
      renderHook(() => useModifierState());
    } finally {
      window.addEventListener = original;
    }
    expect(calls.filter((t) => t === "keydown")).toHaveLength(1);
  });

  it("re-renders hook consumers when the state changes", () => {
    const { result } = renderHook(() => useModifierState());
    expect(result.current.metaKey).toBe(false);
    act(() => {
      key("keydown", { key: "Meta", metaKey: true });
    });
    expect(result.current.metaKey).toBe(true);
  });
});
