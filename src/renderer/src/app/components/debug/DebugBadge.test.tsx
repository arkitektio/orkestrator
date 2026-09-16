// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { TabIdContext } from "@/command/tabs/TabContext";
import { useDebug } from "@/providers/debug/DebugContext";
import { DebugProvider } from "@/providers/debug/DebugProvider";
import { useDebugReport, type DebugReport } from "@/providers/debug/useDebugReport";

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
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
  window.ResizeObserver ??= class {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  } as never;
});

const renderApp = (children: React.ReactNode) =>
  render(
    <DebugProvider>
      <Toggle />
      {children}
      <DebugBadge />
    </DebugProvider>,
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
      <DebugProvider>
        <Toggle />
        <DebugBadge />
      </DebugProvider>,
    );
    expect(badge()!.textContent).toContain("0");
  });
});
