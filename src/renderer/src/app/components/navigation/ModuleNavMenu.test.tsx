// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
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

// The card reads its pages from the module host; give it a fixed catalog.
vi.mock("@/core/command/sources/routeCatalog", () => ({
  routeCatalog: () => LINKS,
  routesOfModule: (catalog: CatalogRoute[], module: string) => catalog.filter((r) => r.module === module),
}));
vi.mock("@/core/connection/roles", () => ({ useRoles: () => ({ roles: [] }) }));
vi.mock("@/core/modules/host/host", () => ({ useModuleHostVersion: () => 0 }));

import { layoutModuleNav } from "@/core/modules/hooks/useModuleNav";
import { ModuleNavCard, ModuleNavMenu } from "./ModuleNavMenu";

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

describe("ModuleNavMenu", () => {
  const renderMenu = (ready = true) =>
    render(
      <MemoryRouter>
        <ModuleNavMenu moduleKey="m" ready={ready} to="/m" label="Mikro" footer={<span>footer</span>}>
          <button type="button">tile</button>
        </ModuleNavMenu>
      </MemoryRouter>,
    );

  it("opens the card on right-click, not on hover", () => {
    renderMenu();
    fireEvent.pointerEnter(screen.getByText("tile"));
    fireEvent.mouseEnter(screen.getByText("tile"));
    expect(screen.queryByText("Viewer scenes")).toBeNull();

    fireEvent.contextMenu(screen.getByText("tile"));
    expect(screen.getByText("Viewer scenes")).toBeTruthy();
    expect(screen.getByText("footer")).toBeTruthy();
  });

  it("keeps the header and footer but drops the pages while the service is down", () => {
    renderMenu(false);
    fireEvent.contextMenu(screen.getByText("tile"));
    expect(screen.getByText("Mikro").closest("a")?.getAttribute("href")).toBe("/m/home");
    expect(screen.getByText("footer")).toBeTruthy();
    expect(screen.queryByText("Viewer scenes")).toBeNull();
  });
});
