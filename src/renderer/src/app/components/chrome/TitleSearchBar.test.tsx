// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const togglePalette = vi.fn();
vi.mock("@/command/CommandPaletteProvider", () => ({
  useCommandPalette: () => ({ open: false, togglePalette }),
}));

import { TitleSearchBar } from "./TitleSearchBar";

const renderBar = () =>
  render(
    <MemoryRouter>
      <TitleSearchBar />
    </MemoryRouter>,
  );

describe("the idle search pill", () => {
  it("shows the prompt, never the current path", () => {
    render(
      <MemoryRouter initialEntries={["/mikro/images/1"]}>
        <TitleSearchBar />
      </MemoryRouter>,
    );
    expect(screen.getByText("Search…")).toBeInTheDocument();
    expect(screen.queryByText(/mikro/i)).toBeNull();
  });

  it("stays clickable inside the rail's drag region", () => {
    // The zone around it drags the window, and a drag region swallows clicks
    // from anything that has not opted out.
    renderBar();
    expect(screen.getByRole("button").className).toContain("app-no-drag");
  });

  it("opens the palette clean, so ⌘K never resumes someone else's search", () => {
    renderBar();
    screen.getByRole("button").click();
    expect(togglePalette).toHaveBeenCalledWith({ fresh: true });
  });
});
