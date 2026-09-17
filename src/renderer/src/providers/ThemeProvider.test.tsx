// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

/** A controllable `matchMedia`, since jsdom has none. */
let prefersDark = false;
let listeners: (() => void)[] = [];
const installMatchMedia = () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    get matches() { return prefersDark; },
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: (_: string, cb: () => void) => { listeners = listeners.filter((l) => l !== cb); },
  }));
};
const osChanges = (dark: boolean) => act(() => { prefersDark = dark; listeners.forEach((l) => l()); });

const Probe = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={toggleTheme}>toggle</button>
      <button onClick={() => setTheme("system")}>system</button>
    </div>
  );
};

const renderWith = (defaultTheme: "light" | "dark" | "system" = "dark") =>
  render(<ThemeProvider defaultTheme={defaultTheme} storageKey="t"><Probe /></ThemeProvider>);
const resolved = () => screen.getByTestId("resolved").textContent;
const click = (label: string) => act(() => screen.getByText(label).click());

beforeEach(() => {
  localStorage.clear();
  prefersDark = false;
  listeners = [];
  installMatchMedia();
});
afterEach(() => {
  document.documentElement.classList.remove("light", "dark");
  // @ts-expect-error - clean up the injected global
  delete window.api;
});

describe("ThemeProvider", () => {
  it("toggles between light and dark, and paints the root", () => {
    renderWith("dark");
    expect(resolved()).toBe("dark");
    click("toggle");
    expect(resolved()).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("remembers the choice", () => {
    renderWith("dark");
    click("toggle");
    expect(localStorage.getItem("t")).toBe("light");
  });

  it("toggling from `system` picks the opposite of what is on screen, and pins it", () => {
    // Someone pressing "light" while the OS is dark means light — not "light
    // until the OS changes its mind".
    prefersDark = true;
    renderWith("system");
    expect(resolved()).toBe("dark");
    click("toggle");
    expect(screen.getByTestId("theme").textContent).toBe("light");
    osChanges(false);
    expect(resolved()).toBe("light");
  });

  it("follows the OS while on `system`", () => {
    renderWith("system");
    expect(resolved()).toBe("light");
    osChanges(true);
    expect(resolved()).toBe("dark");
  });

  it("ignores garbage in storage", () => {
    localStorage.setItem("t", "sepia");
    renderWith("dark");
    expect(resolved()).toBe("dark");
  });
});

describe("the window frame follows the theme", () => {
  // The frame has parts CSS cannot reach: the background Chromium paints
  // during a resize, and on Windows the overlay's glyphs. Main recolours them,
  // but only if it is told — so every resolution of the theme must report.
  const withBridge = () => {
    const setTheme = vi.fn();
    // @ts-expect-error - stand in for the preload injection
    window.api = { windowControls: { setTheme } };
    return setTheme;
  };

  it("reports the resolved theme on mount and on every change", () => {
    const setTheme = withBridge();
    renderWith("dark");
    expect(setTheme).toHaveBeenLastCalledWith("dark");
    click("toggle");
    expect(setTheme).toHaveBeenLastCalledWith("light");
  });

  it("reports what is on screen, never the raw `system` choice", () => {
    const setTheme = withBridge();
    prefersDark = true;
    renderWith("system");
    expect(setTheme).toHaveBeenLastCalledWith("dark");
    osChanges(false);
    expect(setTheme).toHaveBeenLastCalledWith("light");
  });

  it("works in a browser tab, where there is no frame to tell", () => {
    expect(() => renderWith("light")).not.toThrow();
    expect(resolved()).toBe("light");
  });
});
