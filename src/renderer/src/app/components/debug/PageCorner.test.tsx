// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
import { useDebug } from "@/providers/debug/DebugContext";
import { DebugProvider } from "@/providers/debug/DebugProvider";

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

beforeEach(() => setElectron(true));
afterEach(() => setElectron(false));

describe("the page corner", () => {
  it("files a bug report for the page being looked at", () => {
    renderCorner("/mikro/arraydatasets/5");
    act(() => screen.getByLabelText("Report a bug on this page").click());
    expect(window.api.reportIssue).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Issue in /mikro/arraydatasets/5", includeScreenshot: true }),
    );
  });

  it("has no report button in a browser, where there is no bridge to file it", () => {
    setElectron(false);
    renderCorner();
    expect(screen.queryByLabelText("Report a bug on this page")).toBeNull();
  });

  it("adds the debug badge only in debug mode", () => {
    renderCorner();
    expect(screen.queryByLabelText("Debug: page state")).toBeNull();
    act(() => screen.getByText("toggle-debug").click());
    expect(screen.getByLabelText("Debug: page state")).toBeInTheDocument();
    expect(screen.getByLabelText("Report a bug on this page")).toBeInTheDocument();
  });
});
