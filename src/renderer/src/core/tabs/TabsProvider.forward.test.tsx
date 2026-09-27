// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocation, useNavigate } from "react-router-dom";

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  Arkitekt: { useActiveProfileId: () => "org-a" },
}));
vi.mock("@/core/constants", () => ({ baseName: "" }));

import { ActiveTabRouter } from "./ActiveTabRouter";
import { TabsProvider, useTabActions, useTabList } from "./TabsProvider";

/**
 * The quick bar's forwarding mode: every destination goes to the main window,
 * the bar parks again, and nothing touches the storage the main window's saved
 * tabs live in.
 */

const Probe = () => {
  const { pathname } = useLocation();
  const tabs = useTabList();
  const navigate = useNavigate();
  const { open } = useTabActions();
  return (
    <div>
      <span data-testid="path">{pathname}</span>
      <span data-testid="count">{tabs.length}</span>
      <button onClick={() => navigate("/mikro/images/1")}>navigate</button>
      <button onClick={() => open("/kraph/graphs/2")}>open</button>
    </div>
  );
};

const onOpen = vi.fn();

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "#/some/main/page";
  onOpen.mockClear();
  // @ts-expect-error - stand in for the preload injection
  window.api = { tabs: { onOpen } };
});

afterEach(() => {
  // @ts-expect-error - clean up the injected global
  delete window.api;
});

const renderQuick = (forward: (path: string) => void) =>
  render(
    <TabsProvider forward={forward}>
      <ActiveTabRouter>
        <Probe />
      </ActiveTabRouter>
    </TabsProvider>,
  );

describe("TabsProvider forwarding mode", () => {
  it("parks at the root, ignoring the hash and deep links", () => {
    renderQuick(vi.fn());
    expect(screen.getByTestId("path").textContent).toBe("/");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("forwards a navigation once and parks again", async () => {
    const forward = vi.fn();
    renderQuick(forward);
    await act(async () => screen.getByText("navigate").click());
    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward).toHaveBeenCalledWith("/mikro/images/1");
    expect(screen.getByTestId("path").textContent).toBe("/");
  });

  it("forwards an opened tab and keeps a single tab", async () => {
    const forward = vi.fn();
    renderQuick(forward);
    await act(async () => screen.getByText("open").click());
    expect(forward).toHaveBeenCalledWith("/kraph/graphs/2");
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  it("never writes tabs to storage", async () => {
    vi.useFakeTimers();
    try {
      const { unmount } = renderQuick(vi.fn());
      await act(async () => screen.getByText("open").click());
      await act(async () => vi.advanceTimersByTime(1000));
      unmount();
      expect(Object.keys(localStorage).filter((k) => k.startsWith("orkestrator:tabs"))).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
