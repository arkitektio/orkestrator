// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { Box, Home, Image } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import type { CatalogRoute } from "@/core/command/sources/routeCatalog";

// `DroppableNavLink` is a drop target; this test is about the card's layout.
vi.mock("@/core/ui/link", () => ({
  DroppableNavLink: ({
    to,
    children,
  }: {
    to: string;
    children: (state: { isActive: boolean }) => React.ReactNode;
  }) => <a href={to}>{children({ isActive: false })}</a>,
}));

import { ModuleNavCard, layoutModuleNav } from "./ModuleNavHover";

const LINKS: CatalogRoute[] = [
  { module: "m", label: "Dashboard", route: "/m/home", group: "Data", icon: Home, home: true },
  { module: "m", label: "Scenes", route: "/m/scenes", group: "Data", icon: Box, description: "Viewer scenes" },
  { module: "m", label: "Images", route: "/m/spec/image", group: "By kind", icon: Image },
  { module: "m", label: "Files", route: "/m/files", group: "Data", icon: Box, description: "Raw files" },
  { module: "m", label: "Loose", route: "/m/loose", icon: Box, description: "No group" },
];

describe("layoutModuleNav", () => {
  it("takes the home page out and groups the rest in first-appearance order", () => {
    const nav = layoutModuleNav(LINKS);
    expect(nav.home?.route).toBe("/m/home");
    expect(nav.groups.map((g) => g.title)).toEqual(["Data", "By kind", "Pages"]);
    expect(nav.groups[0].links.map((l) => l.label)).toEqual(["Scenes", "Files"]);
  });

  it("has no groups for a module with only a home page", () => {
    expect(layoutModuleNav(LINKS.slice(0, 1)).groups).toEqual([]);
  });
});

describe("ModuleNavCard", () => {
  const renderCard = () =>
    render(
      <MemoryRouter>
        <ModuleNavCard nav={layoutModuleNav(LINKS)} to="/m" label="Mikro" />
      </MemoryRouter>,
    );

  it("links its header to the home page, not a tile", () => {
    renderCard();
    const header = screen.getByText("Mikro").closest("a");
    expect(header?.getAttribute("href")).toBe("/m/home");
    expect(screen.getAllByRole("link").filter((a) => a.getAttribute("href") === "/m/home")).toHaveLength(1);
  });

  it("shows tiles with their descriptions", () => {
    renderCard();
    expect(screen.getByText("Viewer scenes")).toBeTruthy();
    expect(screen.getByText("Scenes").closest("a")?.getAttribute("href")).toBe("/m/scenes");
  });

  it("renders a group without descriptions as chips", () => {
    renderCard();
    const chip = screen.getByText("Images").closest("a");
    expect(chip?.getAttribute("href")).toBe("/m/spec/image");
    expect(chip?.querySelector(".rounded-md.px-2")).toBeTruthy();
  });
});
