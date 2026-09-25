// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AutoHideTitleBar } from "./AutoHideTitleBar";

const setElectron = (platform?: string) => {
  if (platform === undefined) {
    // @ts-expect-error - removing the injected global is the point
    delete window.electron;
    return;
  }
  // @ts-expect-error - stand in for the preload injection
  window.electron = { process: { platform } };
};

beforeEach(() => {
  // @ts-expect-error - stand in for the preload injection
  window.api = {
    windowControls: {
      minimize: vi.fn(),
      toggleMaximize: vi.fn(),
      close: vi.fn(),
      getState: vi.fn(async () => ({ maximized: false, fullscreen: false, focused: true })),
      onStateChanged: vi.fn(() => () => {}),
    },
  };
});

afterEach(() => {
  setElectron(undefined);
  // @ts-expect-error - clean up the injected global
  delete window.api;
  vi.restoreAllMocks();
});

/** The wrapper that owns the hover state — the sentinel's parent. */
const bar = () => screen.getByTestId("autohide-titlebar");
const zone = () => bar().parentElement!;

describe("the auto-hiding title bar", () => {
  it("is nowhere but Windows", () => {
    for (const platform of ["darwin", "linux", undefined]) {
      setElectron(platform);
      const { unmount } = render(<AutoHideTitleBar />);
      expect(screen.queryByTestId("autohide-titlebar")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("starts collapsed, so the page has the whole window", () => {
    setElectron("win32");
    render(<AutoHideTitleBar />);
    expect(bar().style.height).toBe("0px");
    expect(bar().dataset.state).toBe("hidden");
  });

  it("slides down when the pointer reaches the top edge", () => {
    setElectron("win32");
    render(<AutoHideTitleBar />);

    fireEvent.mouseEnter(screen.getByTestId("titlebar-hover-sentinel"));
    expect(bar().dataset.state).toBe("revealed");
    expect(bar().style.height).not.toBe("0px");
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("stays open while the pointer is anywhere near it", () => {
    // The pointer is not seen AT ALL over a drag region, so an open bar reports
    // nothing while the pointer is on it. Moves just below it must not close
    // it either, or the bar chatters shut against its own lower edge.
    setElectron("win32");
    render(<AutoHideTitleBar />);
    fireEvent.mouseEnter(zone());

    fireEvent.mouseMove(document, { clientY: 20 });
    fireEvent.mouseMove(document, { clientY: 36 });
    expect(bar().dataset.state).toBe("revealed");
  });

  it("closes once the pointer moves clearly below it", () => {
    setElectron("win32");
    render(<AutoHideTitleBar />);
    fireEvent.mouseEnter(zone());

    fireEvent.mouseMove(document, { clientY: 300 });
    expect(bar().dataset.state).toBe("hidden");
  });

  it("does not close when the page is told the pointer left", () => {
    // Moving ONTO the bar hands the pointer to the OS as a caption drag, and
    // the page hears about that as a document `mouseleave` with no related
    // target. Closing on it flickered: the bar collapsed, which dropped the
    // pointer back on the sentinel, which reopened it, forever.
    setElectron("win32");
    render(<AutoHideTitleBar />);
    fireEvent.mouseEnter(zone());

    fireEvent.mouseLeave(document);
    fireEvent.mouseOut(document);
    expect(bar().dataset.state).toBe("revealed");
  });

  it("keeps the sentinel mounted once open, but inert", () => {
    // Unmounting it from under the pointer fires a mouseout with no related
    // target, which read as "the pointer left" and shut the bar the instant it
    // opened.
    setElectron("win32");
    render(<AutoHideTitleBar />);
    const sentinel = screen.getByTestId("titlebar-hover-sentinel");

    fireEvent.mouseEnter(zone());
    expect(screen.getByTestId("titlebar-hover-sentinel")).toBe(sentinel);
    expect(sentinel.className).toContain("pointer-events-none");
  });

  it("is a real title bar: draggable, with clickable buttons on it", () => {
    setElectron("win32");
    render(<AutoHideTitleBar />);
    expect(bar().className).toContain("app-drag");
    // A drag region swallows the clicks of anything inside it that has not
    // opted out — including its own buttons.
    expect(screen.getByLabelText("Close").className).toContain("app-no-drag");
  });

  it("opens from a sentinel that the rail's drag region cannot blind", () => {
    setElectron("win32");
    render(<AutoHideTitleBar />);
    expect(screen.getByTestId("titlebar-hover-sentinel").className).toContain("app-no-drag");
  });

  it("opens on focus, so the buttons are reachable by keyboard", () => {
    setElectron("win32");
    render(<AutoHideTitleBar />);
    fireEvent.focus(screen.getByLabelText("Minimize"));
    expect(bar().dataset.state).toBe("revealed");
  });
});
