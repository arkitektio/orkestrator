// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bindShortcutKey, boundShortcutKeys } from "./shortcutKeybinds";

const press = (key: string) => {
  const event = new KeyboardEvent("keydown", { key, cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe("bindShortcutKey", () => {
  const unbinds: (() => void)[] = [];
  afterEach(() => {
    unbinds.splice(0).forEach((unbind) => unbind());
  });

  it("installs one window listener for any number of binds and removes it with the last", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const a = bindShortcutKey("1", () => {});
    const b = bindShortcutKey("2", () => {});
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
    a();
    expect(remove.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(0);
    b();
    expect(remove.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
    expect(boundShortcutKeys()).toEqual([]);
    add.mockRestore();
    remove.mockRestore();
  });

  it("runs the bound handler and prevents the default", () => {
    const run = vi.fn();
    unbinds.push(bindShortcutKey("3", run));
    expect(press("3").defaultPrevented).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
    expect(press("4").defaultPrevented).toBe(false);
  });

  it("lets the last bind win and does not let an older unbind remove it", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unbindFirst = bindShortcutKey("5", first);
    unbinds.push(bindShortcutKey("5", second));
    press("5");
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unbindFirst();
    press("5");
    expect(second).toHaveBeenCalledTimes(2);
  });
});
