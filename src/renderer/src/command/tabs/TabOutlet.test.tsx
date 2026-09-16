// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/constants", () => ({ baseName: "" }));
// The title reporter reads breadcrumbs; give it a deterministic one.
vi.mock("use-react-router-breadcrumbs", () => ({
  default: () => [{ breadcrumb: "Home" }, { breadcrumb: "Page" }],
}));

import { ActiveTabRouter } from "./ActiveTabRouter";
import { TabOutlet } from "./TabOutlet";
import { TabsProvider, useTabs } from "./TabsProvider";
import { useTabVisible } from "./TabVisibilityContext";
import { MAX_WARM } from "./tabs";

/** Rendered INSIDE each tab's own router. */
const PageProbe = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const visible = useTabVisible();
  return (
    <div data-testid="page" data-visible={visible}>
      <span data-testid="page-path">{pathname}</span>
      <button onClick={() => navigate(`${pathname}/deeper`)}>deeper</button>
    </div>
  );
};

/** Rendered in the CHROME, outside the outlet. */
const Chrome = () => {
  const { tabs, activeId, open, focus } = useTabs();
  return (
    <div>
      <span data-testid="labels">{tabs.map((t) => t.label).join(",")}</span>
      <button onClick={() => open("/b")}>open-b</button>
      <button onClick={() => open("/c")}>open-c</button>
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

  it("names each tab from its own breadcrumbs", () => {
    renderApp();
    expect(screen.getByTestId("labels").textContent).toBe("Page");
  });
});
