// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/core/components/ui/tooltip";

import { CHROME_ZOOM_CLASS, ChromeSurfaceProvider } from "./ChromeSurface";

/**
 * An overlay opened from the rail portals to `body`, outside the rail's DOM,
 * so it cannot inherit the rail's counter-zoom. The context has to carry it
 * across the portal — and must not leak onto overlays opened from the page.
 */
describe("ChromeSurface", () => {
  it("marks a popover opened from the chrome, and leaves one from the page alone", () => {
    render(
      <>
        <ChromeSurfaceProvider>
          <Popover open>
            <PopoverTrigger>rail</PopoverTrigger>
            <PopoverContent>from the rail</PopoverContent>
          </Popover>
        </ChromeSurfaceProvider>
        <Popover open>
          <PopoverTrigger>page</PopoverTrigger>
          <PopoverContent>from the page</PopoverContent>
        </Popover>
      </>,
    );

    const rail = screen.getByText("from the rail");
    const page = screen.getByText("from the page");
    expect(rail.classList.contains(CHROME_ZOOM_CLASS)).toBe(true);
    expect(page.classList.contains(CHROME_ZOOM_CLASS)).toBe(false);
    // On the content, never on Radix's popper wrapper.
    expect(rail.parentElement?.classList.contains(CHROME_ZOOM_CLASS)).toBe(false);

    // And it opts out of the window-drag region it is painted over: Electron
    // hit-tests drag regions in the OS, beneath z-index, so a menu opened from
    // the rail without this loses every click that lands on the rail.
    expect(rail.classList.contains("app-no-drag")).toBe(true);
    expect(page.classList.contains("app-no-drag")).toBe(false);
  });

  it("reaches a tooltip too", () => {
    render(
      <ChromeSurfaceProvider>
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger>rail</TooltipTrigger>
            <TooltipContent>tip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ChromeSurfaceProvider>,
    );
    // Radix renders the visible tooltip and an aria-only copy; the visible one carries it.
    const tips = screen.getAllByText("tip");
    expect(tips.some((el) => el.closest(`.${CHROME_ZOOM_CLASS}`))).toBe(true);
  });
});
