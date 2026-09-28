// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/core/constants", () => ({ baseName: "" }));

import { LinkContextMenu } from "./LinkContextMenu";
import { TabsProvider, useActiveTabId, useSplit, useTabList } from "./TabsProvider";
import { locationPathOf } from "./tabs";

/** Reads the store, so a test can see what a menu row did. */
const Probe = () => {
  const tabs = useTabList();
  const activeId = useActiveTabId();
  const split = useSplit();
  return (
    <div>
      <span data-testid="paths">{tabs.map(locationPathOf).join(",")}</span>
      <span data-testid="active">{tabs.findIndex((t) => t.id === activeId)}</span>
      <span data-testid="split">{split ? `${split.left === activeId ? "L" : "R"}` : "-"}</span>
    </div>
  );
};

const renderApp = (page: React.ReactNode) =>
  render(
    <TabsProvider>
      <Probe />
      <LinkContextMenu />
      {page}
    </TabsProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

describe("LinkContextMenu", () => {
  it("opens a plain in-app link in a background tab, or to the side", () => {
    renderApp(<a href="/mikro/images/5">Image</a>);

    fireEvent.contextMenu(screen.getByText("Image"));
    act(() => screen.getByText("Open in new tab").click());
    expect(screen.getByTestId("paths").textContent).toBe("/,/mikro/images/5");
    expect(screen.getByTestId("active").textContent).toBe("0"); // background
    expect(screen.getByTestId("split").textContent).toBe("-");

    fireEvent.contextMenu(screen.getByText("Image"));
    act(() => screen.getByText("Open to the side").click());
    expect(screen.getByTestId("paths").textContent).toBe("/,/mikro/images/5,/mikro/images/5");
    expect(screen.getByTestId("active").textContent).toBe("0"); // focus stays
    expect(screen.getByTestId("split").textContent).toBe("L"); // this page left, the new one right
  });

  it("leaves an event someone else already claimed", () => {
    // A card with a menu of its own prevents the default first (SmartSurface,
    // a Radix trigger); this menu must not open over it.
    renderApp(
      <a href="/x" onContextMenu={(e) => e.preventDefault()}>
        Card
      </a>,
    );
    fireEvent.contextMenu(screen.getByText("Card"));
    expect(screen.queryByText("Open in new tab")).toBeNull();
  });

  it("ignores links that are not in-app, and text that is not a link", () => {
    renderApp(
      <>
        <a href="https://example.org">Out</a>
        <a href="/dl" download>
          File
        </a>
        <span>Text</span>
      </>,
    );
    for (const label of ["Out", "File", "Text"]) {
      fireEvent.contextMenu(screen.getByText(label));
      expect(screen.queryByText("Open in new tab")).toBeNull();
    }
  });
});
