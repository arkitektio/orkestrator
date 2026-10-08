// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { TabIdContext } from "@/core/tabs/TabContext";
import { useDebug } from "@/core/debug/DebugContext";
import { DEBUG_STORAGE_KEY, DebugProvider } from "@/core/debug/DebugProvider";
import { useDebugReport, type DebugReport } from "@/core/debug/useDebugReport";

import { DebugBadge } from "./DebugBadge";

/** A page reporting its query, as the route wrappers do. */
const Page = ({ label, report }: { label: string; report: DebugReport }) => {
  useDebugReport(label, report);
  return <div>{label} page</div>;
};

const Toggle = () => {
  const { debug, setDebug } = useDebug();
  return <button onClick={() => setDebug(!debug)}>toggle-debug</button>;
};

const click = (label: string) => act(() => screen.getByText(label).click());
const badge = () => screen.queryByLabelText("Debug: page state");

// Radix Popover needs these in jsdom.
beforeEach(() => {
  // Debug mode is persisted; one test's toggle must not leak into the next.
  localStorage.clear();
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
  window.ResizeObserver ??= class {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  } as never;
});

// The badge's popover carries the bug report, which reads the router's path.
const renderApp = (children: React.ReactNode) =>
  render(
    <MemoryRouter>
      <DebugProvider>
        <Toggle />
        {children}
        <DebugBadge />
      </DebugProvider>
    </MemoryRouter>,
  );

describe("DebugBadge", () => {
  it("is absent outside debug mode, and costs the page nothing", () => {
    renderApp(<Page label="DatasetPage" report={{ data: { id: "5" } }} />);
    expect(badge()).toBeNull();
    expect(screen.getByText("DatasetPage page")).toBeInTheDocument(); // page still renders
  });

  it("appears in debug mode with the page still rendered — not instead of it", () => {
    // Debug used to REPLACE the page with a JSON dump.
    renderApp(<Page label="DatasetPage" report={{ data: { id: "5" } }} />);
    click("toggle-debug");
    expect(badge()).toBeInTheDocument();
    expect(badge()!.textContent).toContain("1");
    expect(screen.getByText("DatasetPage page")).toBeInTheDocument();
  });

  it("shows the page's query state on click", () => {
    renderApp(
      <Page label="DatasetPage" report={{ variables: { id: "5" }, data: { dataset: { name: "HeLa s3" } } }} />,
    );
    click("toggle-debug");
    act(() => badge()!.click());
    expect(screen.getByText("DatasetPage")).toBeInTheDocument();
    expect(screen.getByTestId("debug-data").textContent).toContain('"name": "HeLa s3"');
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("flags an error, and shows it", () => {
    renderApp(<Page label="DatasetPage" report={{ error: new Error("boom") }} />);
    click("toggle-debug");
    expect(badge()!.className).toContain("destructive");
    act(() => badge()!.click());
    expect(screen.getByTestId("debug-error").textContent).toContain("boom");
  });

  it("shows only the tab being looked at", () => {
    // The page in another (warm, hidden) tab reports too; it must not appear.
    renderApp(
      <>
        <Page label="VisiblePage" report={{ data: 1 }} />
        <TabIdContext.Provider value="hidden-tab">
          <Page label="HiddenPage" report={{ data: 2 }} />
        </TabIdContext.Provider>
      </>,
    );
    click("toggle-debug");
    expect(badge()!.textContent).toContain("1");
    act(() => badge()!.click());
    expect(screen.getByText("VisiblePage")).toBeInTheDocument();
    expect(screen.queryByText("HiddenPage")).toBeNull();
  });

  it("forgets a page when it unmounts, and everything when debug turns off", () => {
    const { rerender } = renderApp(<Page label="DatasetPage" report={{ data: 1 }} />);
    click("toggle-debug");
    expect(badge()!.textContent).toContain("1");
    click("toggle-debug");
    expect(badge()).toBeNull();
    click("toggle-debug");
    expect(badge()!.textContent).toContain("1");
    // Same provider, page gone: the badge stays (debug is on) but reports nothing.
    rerender(
      <MemoryRouter>
        <DebugProvider>
          <Toggle />
          <DebugBadge />
        </DebugProvider>
      </MemoryRouter>,
    );
    expect(badge()!.textContent).toContain("0");
  });

  it("stays on across a reload, and off once turned off", () => {
    localStorage.setItem(DEBUG_STORAGE_KEY, "1");
    renderApp(<Page label="DatasetPage" report={{ data: 1 }} />);
    // On from the first render, and the page reported without a toggle.
    expect(badge()!.textContent).toContain("1");
    click("toggle-debug");
    expect(badge()).toBeNull();
    expect(localStorage.getItem(DEBUG_STORAGE_KEY)).toBeNull();
    click("toggle-debug");
    expect(localStorage.getItem(DEBUG_STORAGE_KEY)).toBe("1");
  });

  it("copies every query on the page at once", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderApp(
      <>
        <Page label="DatasetPage" report={{ variables: { id: "5" }, data: { name: "HeLa s3" } }} />
        <Page label="BrokenPage" report={{ error: new Error("boom") }} />
      </>,
    );
    click("toggle-debug");
    act(() => badge()!.click());
    await act(async () => screen.getByLabelText("Copy all queries").click());
    const copied = JSON.parse(writeText.mock.calls[0][0]);
    expect(copied.map((e: { label: string }) => e.label)).toEqual(["DatasetPage", "BrokenPage"]);
    expect(copied[0]).toMatchObject({ variables: { id: "5" }, data: { name: "HeLa s3" } });
    expect(copied[1].error.message).toBe("boom");
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });
});
