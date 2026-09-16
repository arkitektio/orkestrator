// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation } from "react-router-dom";

vi.mock("@/app/Arkitekt", () => ({
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/constants", () => ({ baseName: "" }));

import { ActiveTabRouter } from "./ActiveTabRouter";
import { TabsProvider, useTabs } from "./TabsProvider";
import { MAX_TABS } from "./tabs";

const Probe = () => {
  const { pathname } = useLocation();
  const { tabs, open } = useTabs();
  return (
    <div>
      <span data-testid="path">{pathname}</span>
      <span data-testid="count">{tabs.length}</span>
      <button onClick={() => open("/filler")}>open-filler</button>
    </div>
  );
};

/** The preload bridge, as a test double that hands us the registered callback. */
let onOpenCallback: ((payload: { path: string }) => void) | null = null;
const dispose = vi.fn();

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
  onOpenCallback = null;
  dispose.mockClear();
  // @ts-expect-error - stand in for the preload injection
  window.api = {
    tabs: {
      onOpen: vi.fn((cb: (payload: { path: string }) => void) => {
        onOpenCallback = cb;
        return dispose;
      }),
    },
  };
});

afterEach(() => {
  // @ts-expect-error - clean up the injected global
  delete window.api;
});

const renderApp = () =>
  render(
    <TabsProvider>
      <ActiveTabRouter>
        <Probe />
      </ActiveTabRouter>
    </TabsProvider>,
  );

describe("deep links", () => {
  it("subscribes to the bridge on mount", () => {
    renderApp();
    expect(onOpenCallback).not.toBeNull();
  });

  it("opens the linked path as a new active tab", () => {
    renderApp();
    act(() => onOpenCallback?.({ path: "/mikro/arraydatasets/5" }));
    expect(screen.getByTestId("count").textContent).toBe("2");
    expect(screen.getByTestId("path").textContent).toBe("/mikro/arraydatasets/5");
  });

  it("lands a link whose path arrived with a doubled slash", () => {
    // `orkestrator:///mikro/x` used to reach here as "//mikro/x" — a route
    // that matches nothing.
    renderApp();
    act(() => onOpenCallback?.({ path: "//mikro/arraydatasets/5" }));
    expect(screen.getByTestId("path").textContent).toBe("/mikro/arraydatasets/5");
  });

  it("lands even when the strip is full, evicting the least recent", () => {
    // A link the user clicked must go somewhere; a silent no-op would read as
    // the link being broken.
    renderApp();
    for (let i = 0; i < MAX_TABS; i++) {
      act(() => screen.getByText("open-filler").click());
    }
    expect(screen.getByTestId("count").textContent).toBe(String(MAX_TABS));
    act(() => onOpenCallback?.({ path: "/deep" }));
    expect(screen.getByTestId("count").textContent).toBe(String(MAX_TABS));
    expect(screen.getByTestId("path").textContent).toBe("/deep");
  });

  it("disposes the subscription on unmount", () => {
    const { unmount } = renderApp();
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("does nothing, and does not throw, without the bridge", () => {
    // The web build has no preload.
    // @ts-expect-error - remove the injected global
    delete window.api;
    expect(() => renderApp()).not.toThrow();
  });
});
