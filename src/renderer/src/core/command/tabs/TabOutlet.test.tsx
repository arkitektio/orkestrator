// @vitest-environment jsdom
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

vi.mock("@/core/lib/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/lib/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/core/constants", () => ({ baseName: "" }));
// The title reporter reads breadcrumbs; give it a deterministic one.
vi.mock("use-react-router-breadcrumbs", () => ({
  default: () => [{ breadcrumb: "Home" }, { breadcrumb: "Page" }],
}));

import { ActiveTabRouter } from "./ActiveTabRouter";
import { useTabLayout } from "./TabLayoutContext";
import { TabOutlet } from "./TabOutlet";
import { useTabPane } from "./TabPaneContext";
import { TabsProvider, useActiveTabId, useTabActions, useTabList } from "./TabsProvider";
import { useTabVisible } from "./TabVisibilityContext";
import { useTabTitle } from "./useTabTitle";
import { MAX_WARM } from "./tabs";

/** Rendered INSIDE each tab's own router. */
const PageProbe = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const visible = useTabVisible();
  const pane = useTabPane();
  const layout = useTabLayout();
  return (
    <div
      data-testid="page"
      data-visible={visible}
      data-pane={pane ?? ""}
      data-page-sidebar={layout?.pageSidebar === false ? "hidden" : "default"}
    >
      <span data-testid="page-path">{pathname}</span>
      <button onClick={() => navigate(`${pathname}/deeper`)}>deeper</button>
    </div>
  );
};

/** A page that knows its own name, as `PageLayout` does through `title`. */
const TitledPage = ({ title }: { title: React.ReactNode }) => {
  useTabTitle(title);
  const navigate = useNavigate();
  return <button onClick={() => navigate("/plain")}>leave</button>;
};

/** Rendered in the CHROME, outside the outlet. */
const Chrome = () => {
  const tabs = useTabList();
  const activeId = useActiveTabId();
  const { open, openBeside, focus, toggleSplit, swapSplit } = useTabActions();
  return (
    <div>
      <span data-testid="labels">{tabs.map((t) => t.label).join(",")}</span>
      <button onClick={() => openBeside("/side")}>open-beside</button>
      <button onClick={toggleSplit}>toggle-split</button>
      <button onClick={swapSplit}>swap-split</button>
      <button onClick={() => open("/b")}>open-b</button>
      <button onClick={() => open("/c")}>open-c</button>
      <button onClick={() => open("/dataset/5")}>open-dataset</button>
      <button onClick={() => open("/widget")}>open-widget</button>
      <button onClick={() => focus(tabs[0].id)}>focus-first</button>
      {tabs.map((t, i) => (
        <button key={t.id} onClick={() => focus(t.id)}>{`focus-${i}`}</button>
      ))}
      <span data-testid="active-index">{tabs.findIndex((t) => t.id === activeId)}</span>
    </div>
  );
};

const routes = (
  <Routes>
    <Route path="/dataset/:id" element={<TitledPage title="HeLa s3" />} />
    <Route path="/widget" element={<TitledPage title={<b>not text</b>} />} />
    <Route path="*" element={<PageProbe />} />
  </Routes>
);

const renderApp = () =>
  render(
    <TabsProvider>
      <ActiveTabRouter>
        <Chrome />
        <TabOutlet routes={routes} />
      </ActiveTabRouter>
    </TabsProvider>,
  );

const click = (label: string) => act(() => screen.getByText(label).click());
const pages = () => screen.getAllByTestId("page");
const wrapperOf = (page: HTMLElement) => page.closest("[data-tab-id]") as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

describe("TabOutlet", () => {
  it("mounts a router per warm tab under the chrome router without the nested-router guard firing", () => {
    // This is the RouterBoundary doing its job: without it, react-router
    // throws "You cannot render a <Router> inside another <Router>".
    expect(() => renderApp()).not.toThrow();
    expect(pages()).toHaveLength(1);
  });

  it("keeps inactive warm tabs mounted but hidden", () => {
    renderApp();
    click("open-b");
    const [a, b] = pages();
    expect(wrapperOf(a).className).toBe("hidden");
    expect(wrapperOf(b).className).not.toBe("hidden");
    expect(a.dataset.visible).toBe("false");
    expect(b.dataset.visible).toBe("true");
  });

  it("navigating inside one tab does not move another", () => {
    renderApp();
    click("open-b");
    // Click "deeper" inside tab B (the active, visible one).
    const [, b] = pages();
    act(() => (b.querySelector("button") as HTMLButtonElement).click());
    const [aAfter, bAfter] = pages();
    expect(aAfter.querySelector("[data-testid='page-path']")?.textContent).toBe("/");
    expect(bAfter.querySelector("[data-testid='page-path']")?.textContent).toBe("/b/deeper");
  });

  it("restores a hidden tab exactly where it was left", () => {
    renderApp();
    const [a] = pages();
    act(() => (a.querySelector("button") as HTMLButtonElement).click()); // A → //deeper
    click("open-b");
    click("focus-first");
    const [aAgain] = pages();
    expect(wrapperOf(aAgain).className).not.toBe("hidden");
    expect(aAgain.querySelector("[data-testid='page-path']")?.textContent).toBe("//deeper");
  });

  it("unmounts cold tabs beyond the warm cap, keeping the active one", () => {
    renderApp();
    for (let i = 0; i < MAX_WARM + 1; i++) click("open-b");
    // MAX_WARM + 2 tabs exist; only MAX_WARM are mounted.
    expect(screen.getByTestId("labels").textContent?.split(",")).toHaveLength(MAX_WARM + 2);
    expect(pages()).toHaveLength(MAX_WARM);
  });

  describe("split view", () => {
    const divider = () => document.querySelector("[data-split-divider]");

    it("shows both panes, left then right, with the divider between", () => {
      renderApp();
      click("open-b"); // A, B(active)
      click("toggle-split"); // B left (focused), A right
      const [a, b] = pages();
      expect(a.dataset.visible).toBe("true");
      expect(b.dataset.visible).toBe("true");
      expect(a.dataset.pane).toBe("right");
      expect(b.dataset.pane).toBe("left");
      expect(wrapperOf(b).style.order).toBe("0");
      expect(wrapperOf(a).style.order).toBe("2");
      expect(divider()).not.toBeNull();
      expect((divider() as HTMLElement).style.order).toBe("1");
      expect(wrapperOf(b).dataset.active).toBe("true");
      expect(wrapperOf(a).dataset.active).toBe("false");
    });

    it("pressing in the other pane focuses it without moving anything", () => {
      renderApp();
      click("open-b");
      click("toggle-split");
      const [a] = pages();
      act(() => {
        wrapperOf(a).dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      });
      expect(screen.getByTestId("active-index").textContent).toBe("0");
      const [aAfter, bAfter] = pages();
      expect(aAfter.dataset.pane).toBe("right");
      expect(bAfter.dataset.pane).toBe("left");
      expect(wrapperOf(aAfter).dataset.active).toBe("true");
    });

    it("keeps the same DOM node across split, swap and unsplit — no remount", () => {
      renderApp();
      click("open-b");
      const [a0, b0] = pages();
      click("toggle-split"); // B > A
      click("swap-split"); // A > B, B still focused
      click("toggle-split"); // A alone; focus falls back to the view, A
      const [a1, b1] = pages();
      expect(a1).toBe(a0);
      expect(b1).toBe(b0);
      expect(divider()).toBeNull();
      expect(wrapperOf(b1).className).toBe("hidden");
      expect(a1.dataset.pane).toBe("");
      expect(b1.dataset.pane).toBe("");
    });

    it("hands a tab opened to the side its layout defaults: no page sidebar", () => {
      renderApp();
      click("open-beside");
      const [a, side] = pages();
      expect(a.dataset.pageSidebar).toBe("default");
      expect(side.dataset.pageSidebar).toBe("hidden");
      expect(side.dataset.pane).toBe("right");
    });

    it("chrome navigation and the hash follow the focused pane", () => {
      renderApp();
      click("open-b");
      click("toggle-split"); // B focused
      expect(window.location.hash).toBe("#/b");
      const [a] = pages();
      act(() => {
        wrapperOf(a).dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      });
      expect(window.location.hash).toBe("#/");
    });
  });

  it("names each tab from its own breadcrumbs", () => {
    renderApp();
    expect(screen.getByTestId("labels").textContent).toBe("Page");
  });

  it("names a tab after the page's own title, not the path leaf", () => {
    // An entity page would otherwise be titled by its id.
    renderApp();
    click("open-dataset");
    expect(screen.getByTestId("labels").textContent).toBe("Page,HeLa s3");
  });

  it("falls back to the path once the page navigates away", () => {
    renderApp();
    click("open-dataset");
    click("leave");
    expect(screen.getByTestId("labels").textContent).toBe("Page,Page");
  });

  it("keeps the path label when the title is not text", () => {
    renderApp();
    click("open-widget");
    expect(screen.getByTestId("labels").textContent).toBe("Page,Page");
  });
});
