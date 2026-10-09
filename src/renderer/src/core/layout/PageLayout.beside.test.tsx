// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a", useActiveProfile: () => null },
}));
vi.mock("@/core/constants", () => ({ baseName: "" }));
// PageLayout's own dependencies are not what is under test here.
vi.mock("@/core/debug/use-report", () => ({ useReport: () => vi.fn() }));
vi.mock("./BreadCrumbs", () => ({ default: () => <nav /> }));

import { TabLayoutContext } from "@/core/tabs/TabLayoutContext";
import { TabPaneContext, type TabPane } from "@/core/tabs/TabPaneContext";
import { BESIDE_LAYOUT, type TabLayout } from "@/core/tabs/tabs";
import { PageLayout } from "./PageLayout";

const page = (pane: TabPane | null, layout?: TabLayout, at = "/") => (
  <MemoryRouter initialEntries={[at]}>
    <TabPaneContext.Provider value={pane}>
      <TabLayoutContext.Provider value={layout}>
        <PageLayout title="Folders">body</PageLayout>
      </TabLayoutContext.Provider>
    </TabPaneContext.Provider>
  </MemoryRouter>
);

/** The page sidebar is on screen exactly when its rail's tab bar is. */
const sidebarShown = () => screen.queryAllByRole("tab").length > 0;

/** The button left of the page menu's chevron: the page-sidebar toggle. */
const toggle = () => act(() => screen.getAllByRole("button")[0].click());

beforeEach(() => {
  localStorage.clear();
});

describe("PageLayout's page sidebar, by default", () => {
  it("shows in a tab on its own, and in the first pane of a split", () => {
    const alone = render(page(null));
    expect(sidebarShown()).toBe(true);
    alone.unmount();
    render(page("left"));
    expect(sidebarShown()).toBe(true);
  });

  it("is hidden in a tab opened to the side", () => {
    render(page("right", BESIDE_LAYOUT));
    expect(sidebarShown()).toBe(false);
  });

  it("is hidden in a tab already open and then shown to the side", () => {
    // The page stays mounted through a split: the pane changes under it.
    const view = render(page(null));
    expect(sidebarShown()).toBe(true);
    view.rerender(page("right"));
    expect(sidebarShown()).toBe(false);
    view.rerender(page(null));
    expect(sidebarShown()).toBe(true);
  });

  it("shows to the side when the tab was opened saying so", () => {
    render(page("right", { pageSidebar: true }));
    expect(sidebarShown()).toBe(true);
  });

  it("gives way to the URL", () => {
    render(page("right", BESIDE_LAYOUT, "/?pageSidebar=true"));
    expect(sidebarShown()).toBe(true);
  });

  it("is toggled from what is on screen, not from the URL's silence", () => {
    render(page("right"));
    toggle();
    expect(sidebarShown()).toBe(true);
    toggle();
    expect(sidebarShown()).toBe(false);
  });
});
