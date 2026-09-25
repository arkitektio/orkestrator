// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/core/settings/theme/ThemeProvider";

import { ColorModeField } from "./ColorModeField";

beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});
afterEach(() => document.documentElement.classList.remove("light", "dark"));

const renderField = () =>
  render(
    <ThemeProvider defaultTheme="dark" storageKey="t">
      <ColorModeField />
    </ThemeProvider>,
  );

describe("ColorModeField", () => {
  it("shows the current mode pressed", () => {
    renderField();
    expect(screen.getByLabelText("Dark").getAttribute("data-state")).toBe("on");
    expect(screen.getByLabelText("Light").getAttribute("data-state")).toBe("off");
  });

  it("applies a mode the moment it is chosen — no Save", () => {
    renderField();
    act(() => screen.getByLabelText("Light").click());
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(localStorage.getItem("t")).toBe("light");
  });

  it("offers following the system as a real third choice", () => {
    renderField();
    act(() => screen.getByLabelText("System").click());
    expect(localStorage.getItem("t")).toBe("system");
    expect(screen.getByLabelText("System").getAttribute("data-state")).toBe("on");
  });

  it("cannot be un-chosen", () => {
    // Radix reports "" when the pressed item is pressed again.
    renderField();
    act(() => screen.getByLabelText("Dark").click());
    expect(screen.getByLabelText("Dark").getAttribute("data-state")).toBe("on");
    expect(localStorage.getItem("t")).toBeNull(); // never wrote a bad value
  });
});
