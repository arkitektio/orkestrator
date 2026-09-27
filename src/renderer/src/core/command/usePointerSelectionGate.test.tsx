// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { Command } from "cmdk";
import { beforeAll, describe, expect, it } from "vitest";

import { hasMoved, isNavigationKey } from "./usePointerSelectionGate";

beforeAll(() => {
  // cmdk scrolls the selection into view; jsdom has no layout.
  Element.prototype.scrollIntoView = () => {};
  // cmdk observes its list's size.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("isNavigationKey", () => {
  it("covers the arrows, Home/End, paging and cmdk's ctrl binds", () => {
    for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"]) {
      expect(isNavigationKey({ key })).toBe(true);
    }
    expect(isNavigationKey({ key: "n", ctrlKey: true })).toBe(true);
    expect(isNavigationKey({ key: "k", ctrlKey: true })).toBe(true);
  });

  it("leaves typing alone", () => {
    expect(isNavigationKey({ key: "n" })).toBe(false);
    expect(isNavigationKey({ key: "a" })).toBe(false);
    expect(isNavigationKey({ key: "Enter" })).toBe(false);
  });
});

describe("hasMoved", () => {
  it("treats a repeated position (a scroll under a resting cursor) as no move", () => {
    expect(hasMoved({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(false);
    expect(hasMoved(null, { x: 10, y: 20 })).toBe(false);
    expect(hasMoved({ x: 10, y: 20 }, { x: 11, y: 20 })).toBe(true);
  });
});

/** Arrow down through a list and record which row is selected at each step. */
const walk = (values: (string | undefined)[], steps: number) => {
  const { container } = render(
    <Command shouldFilter={false}>
      <Command.Input />
      <Command.List>
        {values.map((value, i) => (
          <Command.Item key={i} value={value}>
            {/* Two rows with the SAME text, as a recent and a hit can be. */}
            {i === 2 ? "Folder A" : i === 0 ? "Folder A" : "Other"}
          </Command.Item>
        ))}
      </Command.List>
    </Command>,
  );
  const input = container.querySelector("input")!;
  const selected = () =>
    [...container.querySelectorAll("[cmdk-item]")].findIndex(
      (el) => el.getAttribute("data-selected") === "true",
    );
  const seen = [selected()];
  for (let i = 0; i < steps; i++) {
    fireEvent.keyDown(input, { key: "ArrowDown" });
    seen.push(selected());
  }
  return seen;
};

describe("cmdk row values", () => {
  it("text-keyed rows with equal text trap the arrow keys (the bug)", () => {
    expect(walk([undefined, undefined, undefined, undefined], 3)).not.toEqual([0, 1, 2, 3]);
  });

  it("distinct values walk every row", () => {
    expect(walk(["recent:a", "nav:b", "entity:a", "nav:c"], 3)).toEqual([0, 1, 2, 3]);
  });
});
