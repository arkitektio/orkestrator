// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation, useNavigate } from "react-router-dom";

const profileId = vi.fn<[], string | null>(() => "org-a");
vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => profileId() },
}));
vi.mock("@/core/constants", () => ({ baseName: "" }));

import { ActiveTabRouter } from "./ActiveTabRouter";
import { TabsProvider, useActiveTabId, useTabActions, useTabList } from "./TabsProvider";
import { useActiveTabNavigation } from "./useActiveTabNavigation";
import { saveTabs, tabsStorageKey, createTab } from "./tabs";
import { NEW_TAB_PATH } from "./tabs";

/** Reads everything through the CHROME router — the way the rail does. */
const Probe = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tabs = useTabList();
  const activeId = useActiveTabId();
  const { open, focus, close } = useTabActions();
  const { canGoBack, canGoForward, back, forward } = useActiveTabNavigation();

  return (
    <div>
      <span data-testid="path">{pathname}</span>
      <span data-testid="count">{tabs.length}</span>
      <span data-testid="active-index">{tabs.findIndex((t) => t.id === activeId)}</span>
      <span data-testid="labels">{tabs.map((t) => t.label).join(",")}</span>
      <span data-testid="can-back">{String(canGoBack)}</span>
      <span data-testid="can-forward">{String(canGoForward)}</span>
      <button onClick={() => navigate("/mikro")}>go-mikro</button>
      <button onClick={() => navigate("/mikro/deeper")}>go-deeper</button>
      <button onClick={() => open("/kraph")}>open-kraph</button>
      <button onClick={() => open("/bg", { background: true })}>open-bg</button>
      <button onClick={() => focus(tabs[0].id)}>focus-first</button>
      <button onClick={() => close(activeId)}>close-active</button>
      <button onClick={back}>back</button>
      <button onClick={forward}>forward</button>
    </div>
  );
};

const renderApp = () =>
  render(
    <TabsProvider>
      <ActiveTabRouter>
        <Probe />
      </ActiveTabRouter>
    </TabsProvider>,
  );

const click = (label: string) => act(() => screen.getByText(label).click());
const text = (id: string) => screen.getByTestId(id).textContent;
const press = (key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
  });

beforeEach(() => {
  localStorage.clear();
  profileId.mockReturnValue("org-a");
  window.location.hash = "";
});
afterEach(() => vi.restoreAllMocks());

describe("one tab, own history", () => {
  it("navigates the active tab through the ordinary router hooks", () => {
    renderApp();
    expect(text("path")).toBe("/");
    click("go-mikro");
    expect(text("path")).toBe("/mikro");
  });

  it("greys Back and Forward honestly at the ends", () => {
    // A HashRouter never exposed depth, so the rail's buttons could never
    // be greyed. A memory history can.
    renderApp();
    expect(text("can-back")).toBe("false");
    click("go-mikro");
    expect(text("can-back")).toBe("true");
    expect(text("can-forward")).toBe("false");
    click("back");
    expect(text("path")).toBe("/");
    expect(text("can-forward")).toBe("true");
    click("forward");
    expect(text("path")).toBe("/mikro");
  });
});

describe("independent histories", () => {
  it("a navigation in one tab does not move another", () => {
    renderApp();
    click("go-mikro"); // tab 0 → /mikro
    click("open-kraph"); // tab 1 active at /kraph
    expect(text("path")).toBe("/kraph");

    click("go-deeper"); // tab 1 → /mikro/deeper
    click("focus-first"); // back to tab 0
    expect(text("path")).toBe("/mikro"); // exactly where it was left
  });

  it("Back in one tab never walks into another tab's history", () => {
    // The whole complaint: with one global stack, Back on B went to A.
    renderApp();
    click("go-mikro");
    click("open-kraph");
    expect(text("can-back")).toBe("false"); // fresh tab, nothing behind it
  });

  it("opens in the background without stealing focus", () => {
    renderApp();
    click("open-bg");
    expect(text("count")).toBe("2");
    expect(text("path")).toBe("/");
  });
});

describe("closing", () => {
  it("closing the last tab leaves a fresh root tab, never zero", () => {
    renderApp();
    click("go-mikro");
    click("close-active");
    expect(text("count")).toBe("1");
    expect(text("path")).toBe("/");
  });

  it("⌘W closes the active tab", () => {
    renderApp();
    click("open-kraph");
    expect(text("count")).toBe("2");
    press("w", { metaKey: true });
    expect(text("count")).toBe("1");
    expect(text("path")).toBe("/");
  });

  it("Ctrl+Tab cycles forward and Ctrl+Shift+Tab back", () => {
    renderApp();
    click("open-kraph");
    expect(text("active-index")).toBe("1");
    press("Tab", { ctrlKey: true });
    expect(text("active-index")).toBe("0");
    press("Tab", { ctrlKey: true, shiftKey: true });
    expect(text("active-index")).toBe("1");
  });
});

describe("the URL hash follows the active tab", () => {
  it("mirrors with replaceState, never pushState, so the real history never grows", () => {
    // jsdom shares one window across this file, so `history.length` is not a
    // usable signal; what matters is WHICH API moved the hash.
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    renderApp();
    click("go-mikro");
    expect(replace.mock.calls.at(-1)?.[2]).toBe("#/mikro");
    expect(push).not.toHaveBeenCalled();
  });

  it("boots from the hash on a cold start", () => {
    window.location.hash = "#/kraph/graphs";
    renderApp();
    expect(text("path")).toBe("/kraph/graphs");
  });
});

describe("tabs are per membership", () => {
  it("swaps the tab set when the organization changes", () => {
    const a = createTab("/from-a", { id: "a1" });
    const b1 = createTab("/from-b", { id: "b1" });
    const b2 = createTab("/from-b-2", { id: "b2" });
    saveTabs("org-a", { tabs: [a], activeId: "a1", viewId: "a1" });
    saveTabs("org-b", { tabs: [b1, b2], activeId: "b2", viewId: "b2" });

    const { rerender } = renderApp();
    expect(text("path")).toBe("/from-a");

    profileId.mockReturnValue("org-b");
    rerender(
      <TabsProvider>
        <ActiveTabRouter>
          <Probe />
        </ActiveTabRouter>
      </TabsProvider>,
    );
    // Exactly org-b's two — the hash still mirrored org-a's tab at the moment
    // of the switch, and that must not be re-opened inside org-b.
    expect(text("count")).toBe("2");
    expect(text("path")).toBe("/from-b-2");
  });

  it("persists, debounced, under the membership's key", async () => {
    vi.useFakeTimers();
    renderApp();
    click("open-kraph");
    expect(localStorage.getItem(tabsStorageKey("org-a"))).toBeNull(); // not yet
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(localStorage.getItem(tabsStorageKey("org-a"))).toContain("/kraph");
    vi.useRealTimers();
  });

  it("stores nothing for a signed-out user", () => {
    vi.useFakeTimers();
    profileId.mockReturnValue(null);
    renderApp();
    click("open-kraph");
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(localStorage.length).toBe(0);
    vi.useRealTimers();
  });
});

describe("⌘T", () => {
  it("opens a tab on the new-tab page at once — no palette in between", () => {
    render(
      <TabsProvider>
        <ActiveTabRouter>
          <Probe />
        </ActiveTabRouter>
      </TabsProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("1");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "t", metaKey: true, bubbles: true }));
    });
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("path").textContent).toBe(NEW_TAB_PATH);
  });
});
