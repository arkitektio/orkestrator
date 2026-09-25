// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation, useNavigate } from "react-router-dom";

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/core/constants", () => ({ baseName: "" }));

import { ActiveTabRouter } from "./ActiveTabRouter";
import { TabIdContext } from "./TabContext";
import { useTabTitle } from "./useTabTitle";
import {
  TabsProvider,
  useActiveTabId,
  useActiveTabView,
  useTabActions,
  useTabList,
} from "./TabsProvider";

/**
 * What the tab store is FOR, stated as a test.
 *
 * The store republishes its whole snapshot whenever any tab's history moves —
 * that is how `ActiveTabRouter` learns about a navigation without polling. The
 * cost, before selectors, was that a BACKGROUND tab moving woke every
 * component that read the store at all, however little of it it wanted:
 * `useTabTitle` (which `PageLayout` calls, so every page in the app), the
 * title reporter in every warm tab, every row of the rail's strip, and the
 * chrome's Back/Forward buttons.
 *
 * Note what is NOT in that list. `<Router>` memoises its own context on the
 * `location` object, which does not change when some OTHER tab moves, so
 * ordinary `useLocation`/`useNavigate` consumers were always insulated. The
 * damage was confined to direct readers of this store — which is exactly why
 * it went unnoticed, and why these tests count renders rather than assert on
 * the DOM: every one of those wasted renders produced identical output.
 */

/** Counts renders by name; `spy.get(name)` is how many times it rendered. */
const renders = new Map<string, number>();
const tally = (name: string) => {
  renders.set(name, (renders.get(name) ?? 0) + 1);
};
const count = (name: string) => renders.get(name) ?? 0;

/** Reads the actions only — the common case, and the one that must never wake. */
const ActionsOnly = () => {
  useTabActions();
  tally("actions");
  return null;
};

/** Reads the tab list — wakes for a real transition, never for a navigation. */
const ListOnly = () => {
  const tabs = useTabList();
  tally("list");
  return <span data-testid="count">{tabs.length}</span>;
};

/** Reads where the active tab is — must wake when THIS tab moves. */
const ActiveOnly = () => {
  const { location } = useActiveTabView();
  tally("active");
  return <span data-testid="active-path">{location.pathname}</span>;
};

/**
 * Stands in for an ordinary page. `useTabTitle` is what `PageLayout` calls, so
 * before selectors this component — and therefore every page in the app —
 * re-rendered whenever any tab anywhere navigated.
 */
const PageConsumer = () => {
  const { pathname } = useLocation();
  useTabTitle("A page");
  tally("page");
  return <span data-testid="page-path">{pathname}</span>;
};

const Driver = () => {
  const navigate = useNavigate();
  const activeId = useActiveTabId();
  const tabs = useTabList();
  const { open, focus } = useTabActions();
  const background = tabs.find((t) => t.id !== activeId);

  return (
    <div>
      <button onClick={() => open("/second", { background: true })}>open-bg</button>
      <button onClick={() => navigate("/moved")}>navigate-active</button>
      <button onClick={() => background && background.history.push("/bg-moved")}>
        navigate-background
      </button>
      <button onClick={() => background && focus(background.id)}>focus-other</button>
    </div>
  );
};

const click = (label: string) => act(() => screen.getByText(label).click());

beforeEach(() => {
  renders.clear();
  localStorage.clear();
  window.location.hash = "";
});

const renderApp = () =>
  render(
    <TabsProvider>
      <ActiveTabRouter>
        <TabIdContext.Provider value="probe-tab">
          <PageConsumer />
        </TabIdContext.Provider>
        <ActionsOnly />
        <ListOnly />
        <ActiveOnly />
        <Driver />
      </ActiveTabRouter>
    </TabsProvider>,
  );

describe("a background tab navigating", () => {
  it("wakes nobody — not the chrome router, not the tab list, not the actions", () => {
    renderApp();
    click("open-bg");

    const before = {
      actions: count("actions"),
      list: count("list"),
      active: count("active"),
      page: count("page"),
    };

    click("navigate-background");

    expect(count("actions")).toBe(before.actions);
    expect(count("list")).toBe(before.list);
    expect(count("active")).toBe(before.active);
    // The regression this file exists for. `useTabTitle` reads the store, so
    // before selectors this woke every page in the app.
    expect(count("page")).toBe(before.page);
  });

  it("still moved — the store is up to date, it just did not shout about it", () => {
    renderApp();
    click("open-bg");
    click("navigate-background");
    click("focus-other");

    expect(screen.getByTestId("active-path").textContent).toBe("/bg-moved");
  });
});

describe("the active tab navigating", () => {
  it("wakes the active-tab readers and the page, but not the tab list", () => {
    renderApp();
    const before = { list: count("list"), active: count("active"), page: count("page") };

    click("navigate-active");

    expect(count("active")).toBeGreaterThan(before.active);
    expect(count("page")).toBeGreaterThan(before.page);
    expect(screen.getByTestId("page-path").textContent).toBe("/moved");
    // The set of open tabs did not change, so the strip has no reason to redraw.
    expect(count("list")).toBe(before.list);
  });
});

describe("the tab actions", () => {
  it("keep one identity for the provider's lifetime", () => {
    const seen: unknown[] = [];
    const Capture = () => {
      seen.push(useTabActions());
      return null;
    };
    const { rerender } = render(
      <TabsProvider>
        <Capture />
      </TabsProvider>,
    );
    rerender(
      <TabsProvider>
        <Capture />
      </TabsProvider>,
    );

    expect(seen.length).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(1);
  });
});
