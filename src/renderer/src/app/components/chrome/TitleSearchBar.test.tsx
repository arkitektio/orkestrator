// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const breadcrumbs = vi.fn();
vi.mock("use-react-router-breadcrumbs", () => ({ default: () => breadcrumbs() }));

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
  it("shows where you are, like an address bar", () => {
    breadcrumbs.mockReturnValue([
      { breadcrumb: "Home" },
      { breadcrumb: "Mikro" },
      { breadcrumb: "HeLa s3" },
    ]);
    renderBar();

    // The last two crumbs only: PageLayout already renders the full trail a few
    // pixels below, and repeating it in full would read as a bug.
    expect(screen.getByText("HeLa s3")).toBeInTheDocument();
    expect(screen.getByText("Mikro")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("falls back to a prompt at the root, where there is no trail", () => {
    breadcrumbs.mockReturnValue([]);
    renderBar();
    expect(screen.getByText("Search Orkestrator")).toBeInTheDocument();
  });

  it("skips crumbs that are still-loading components rather than rendering them raw", () => {
    breadcrumbs.mockReturnValue([
      { breadcrumb: "Mikro" },
      { breadcrumb: <span>element</span> },
    ]);
    renderBar();
    expect(screen.getByText("Mikro")).toBeInTheDocument();
    expect(screen.queryByText("element")).not.toBeInTheDocument();
  });

  it("stays clickable inside the rail's drag region", () => {
    // The zone around it drags the window, and a drag region swallows clicks
    // from anything that has not opted out.
    breadcrumbs.mockReturnValue([]);
    renderBar();
    expect(screen.getByRole("button").className).toContain("app-no-drag");
  });

  it("opens the palette clean, so ⌘K never resumes someone else's search", () => {
    breadcrumbs.mockReturnValue([]);
    renderBar();
    screen.getByRole("button").click();
    expect(togglePalette).toHaveBeenCalledWith({ fresh: true });
  });
});
