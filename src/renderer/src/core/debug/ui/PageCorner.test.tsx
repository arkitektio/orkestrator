// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { setReportHandler } from "@/core/diagnostics/requestReport";
import { MemoryRouter } from "react-router-dom";

import { TooltipProvider } from "@/core/ui/tooltip";
import { useDebug } from "@/core/debug/DebugContext";
import { DebugProvider } from "@/core/debug/DebugProvider";

import { PageCorner } from "./PageCorner";

const setElectron = (on: boolean) => {
  if (!on) {
    // @ts-expect-error - removing the injected global is the point
    delete window.electron;
    // @ts-expect-error - and the bridge with it
    delete window.api;
    return;
  }
  // @ts-expect-error - stand in for @electron-toolkit's preload
  window.electron = { process: { platform: "darwin" } };
  // @ts-expect-error - stand in for the preload bridge
  window.api = { reportIssue: vi.fn() };
};

const Toggle = () => {
  const { debug, setDebug } = useDebug();
  return <button onClick={() => setDebug(!debug)}>toggle-debug</button>;
};

const renderCorner = (path = "/mikro/arraydatasets/5") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TooltipProvider>
        <DebugProvider>
          <Toggle />
          <PageCorner />
        </DebugProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear(); // debug mode is persisted
  setElectron(true);
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.scrollIntoView ??= () => {};
  window.ResizeObserver ??= class {
    observe = () => undefined;
    unobserve = () => undefined;
    disconnect = () => undefined;
  } as never;
});
afterEach(() => setElectron(false));

describe("the page corner", () => {
  it("is empty outside debug mode — no report button either", () => {
    renderCorner();
    expect(screen.queryByLabelText("Debug: page state")).toBeNull();
    expect(screen.queryByLabelText("Report a bug on this page")).toBeNull();
  });

  it("carries the bug report inside the debug badge", () => {
    const asked = vi.fn();
    const release = setReportHandler(asked);
    onTestFinished(release);
    renderCorner("/mikro/arraydatasets/5");
    act(() => screen.getByText("toggle-debug").click());
    expect(screen.queryByLabelText("Report a bug on this page")).toBeNull(); // not on the page itself
    act(() => screen.getByLabelText("Debug: page state").click());
    act(() => screen.getByLabelText("Report a bug on this page").click());
    // The badge asks for the report dialog; it files nothing by itself.
    expect(asked).toHaveBeenCalledTimes(1);
    expect(window.api.reportIssue).not.toHaveBeenCalled();
  });

  it("offers the report in a browser too: it goes to the server, or is downloaded", () => {
    setElectron(false);
    renderCorner();
    act(() => screen.getByText("toggle-debug").click());
    act(() => screen.getByLabelText("Debug: page state").click());
    expect(screen.getByText("Page state")).toBeInTheDocument();
    expect(screen.getByLabelText("Report a bug on this page")).toBeInTheDocument();
    // DevTools are the desktop app's.
    expect(screen.queryByLabelText("Toggle developer tools")).toBeNull();
  });
});
