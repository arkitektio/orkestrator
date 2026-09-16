// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/chrome/RailChrome", () => ({
  RailChrome: () => <div>chrome</div>,
  WindowsOverlayStrip: () => null,
}));

import { AppLayout } from "./AppLayout";

/**
 * The rail container must impose its own width on its contents.
 *
 * This is the bug that shipped: the rail was wrapped in shadcn's
 * `NavigationMenu`, whose root carries `max-w-max … items-center
 * justify-center`. That sizes the container to its CONTENT and centres it, so a
 * long pinned label grew its row past the 240px rail and spilled out of both
 * sides at once — clipped on the left, over the page on the right — while every
 * `w-full` and `min-w-0` underneath appeared correct and did nothing.
 *
 * Class-level assertions on the rows could never have caught it: the rows were
 * right, their container was not. So this asserts the container.
 */
const renderLayout = () =>
  render(
    <AppLayout navigationBar={<div data-testid="rail-content">rail</div>}>
      <div>page</div>
    </AppLayout>,
  );

describe("the rail container", () => {
  it("constrains its contents rather than sizing itself to them", () => {
    renderLayout();
    const nav = screen.getByLabelText("Modules and pinned pages");

    // `max-w-max` would let a long label set the rail's width.
    expect(nav.className).not.toContain("max-w-max");
    expect(nav.className).toContain("w-full");
    expect(nav.className).toContain("min-w-0");
    expect(nav.className).toContain("overflow-hidden");
  });

  it("stretches its rows to the rail's width instead of centring them", () => {
    // `items-center` in a flex column sizes children to their content and
    // centres them — which is what made the overflow symmetrical.
    const nav = (renderLayout(), screen.getByLabelText("Modules and pinned pages"));
    expect(nav.className).toContain("items-stretch");
    expect(nav.className).not.toContain("items-center");
  });

  it("scrolls its own column rather than growing the window", () => {
    renderLayout();
    const nav = screen.getByLabelText("Modules and pinned pages");
    expect(nav.className).toContain("min-h-0");
    expect(nav.className).toContain("flex-1");
  });

  it("still renders whatever the rail is given", () => {
    renderLayout();
    // Rendered twice: once in the desktop rail, once in the mobile bottom bar.
    expect(screen.getAllByTestId("rail-content").length).toBeGreaterThan(0);
  });
});
