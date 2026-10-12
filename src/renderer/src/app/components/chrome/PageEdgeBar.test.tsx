// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTab, type SplitPanes } from "@/core/tabs/tabs";

const tabs = vi.hoisted(() => ({
  close: vi.fn(),
  splitWith: vi.fn(),
  list: [] as unknown[],
  activeId: "a",
  split: undefined as unknown,
}));
vi.mock("@/core/tabs/TabsProvider", () => ({
  useTabActions: () => ({ close: tabs.close, splitWith: tabs.splitWith }),
  useTabList: () => tabs.list,
  useActiveTabId: () => tabs.activeId,
  useSplit: () => tabs.split,
}));

import { AutoHideTitleBar } from "./AutoHideTitleBar";
import { PageEdgeBar } from "./PageEdgeBar";

const setElectron = (platform?: string) => {
  if (platform === undefined) {
    // @ts-expect-error - removing the injected global is the point
    delete window.electron;
    return;
  }
  // @ts-expect-error - stand in for the preload injection
  window.electron = { process: { platform } };
};

const openSecondWindow = vi.fn();

beforeEach(() => {
  setElectron("darwin");
  // @ts-expect-error - stand in for the preload injection
  window.api = {
    openSecondWindow,
    windowControls: {
      minimize: vi.fn(),
      toggleMaximize: vi.fn(),
      close: vi.fn(),
      getState: vi.fn(async () => ({ maximized: false, fullscreen: false, focused: true })),
      onStateChanged: vi.fn(() => () => {}),
    },
  };
  tabs.list = [createTab("/mikro/images/5?tab=info", { id: "a" }), createTab("/kraph", { id: "b" })];
  tabs.activeId = "a";
  tabs.split = undefined;
});

afterEach(() => {
  setElectron(undefined);
  // @ts-expect-error - clean up the injected global
  delete window.api;
  vi.clearAllMocks();
});

const bar = () => screen.getByTestId("page-edge-bar");
const sentinel = () => screen.getByTestId("page-edge-sentinel");
const notches = () => screen.getAllByTestId("page-edge-notch");
const reveal = () => fireEvent.mouseEnter(sentinel());

describe("the page's edge bar on macOS", () => {
  it("is nothing at all on the web", () => {
    setElectron(undefined);
    const { container } = render(<PageEdgeBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("starts collapsed, with nothing on it to land on", () => {
    render(<PageEdgeBar />);
    expect(bar().style.height).toBe("0px");
    expect(notches()[0].className).toContain("invisible");
  });

  it("lets the page duck when the pointer reaches the top edge, and back once it is clearly below", () => {
    render(<PageEdgeBar />);
    reveal();
    expect(bar().dataset.state).toBe("revealed");
    expect(bar().style.height).not.toBe("0px");
    expect(notches()[0].className).not.toContain("invisible");

    // Just under it — the notch reaches down to the card — is still "on it".
    fireEvent.mouseMove(document, { clientY: 28 });
    expect(bar().dataset.state).toBe("revealed");
    fireEvent.mouseMove(document, { clientY: 300 });
    expect(bar().dataset.state).toBe("hidden");
  });

  it("opens for a pointer that left the window through the top of the page", () => {
    render(<PageEdgeBar />);
    fireEvent.mouseLeave(document.documentElement, { clientX: 0, clientY: -2 });
    expect(bar().dataset.state).toBe("revealed");
  });

  it("does not open for a pointer that left anywhere else", () => {
    render(<PageEdgeBar />);
    fireEvent.mouseLeave(document.documentElement, { clientX: 0, clientY: 200 });
    expect(bar().dataset.state).toBe("hidden");
  });

  it("is a drag strip with clickable buttons, opened from a sentinel that sees the pointer", () => {
    render(<PageEdgeBar />);
    expect(bar().className).toContain("app-drag");
    expect(sentinel().className).toContain("app-no-drag");
    reveal();
    expect(screen.getByLabelText("Close page").className).toContain("app-no-drag");
    expect(screen.getByLabelText("Open in new window").className).toContain("app-no-drag");
    // No window buttons: macOS keeps its traffic lights.
    expect(screen.queryByLabelText("Minimize")).toBeNull();
  });

  it("closes the page", () => {
    render(<PageEdgeBar />);
    reveal();
    fireEvent.click(screen.getByLabelText("Close page"));
    expect(tabs.close).toHaveBeenCalledWith("a");
  });

  it("opens the page in a window of its own, where it is now", () => {
    render(<PageEdgeBar />);
    reveal();
    fireEvent.click(screen.getByLabelText("Open in new window"));
    expect(openSecondWindow).toHaveBeenCalledWith("/mikro/images/5?tab=info");
    expect(tabs.close).not.toHaveBeenCalled();
  });

  it("splits the page with a new tab to its right", () => {
    render(<PageEdgeBar />);
    reveal();
    fireEvent.click(screen.getByLabelText("Split"));
    expect(tabs.splitWith).toHaveBeenCalledWith("a");
  });

  it("offers no split to a page that already is", () => {
    tabs.split = { left: "a", right: "b" } satisfies SplitPanes;
    render(<PageEdgeBar />);
    reveal();
    expect(screen.queryByLabelText("Split")).toBeNull();
  });

  it("gives each pane of a split a notch of its own", () => {
    tabs.split = { left: "a", right: "b" } satisfies SplitPanes;
    tabs.activeId = "b";
    render(<PageEdgeBar />);
    reveal();
    expect(notches().map((notch) => notch.dataset.tabId)).toEqual(["a", "b"]);

    const [, right] = screen.getAllByLabelText("Close page");
    fireEvent.click(right);
    expect(tabs.close).toHaveBeenCalledWith("b");

    const [left] = screen.getAllByLabelText("Open in new window");
    fireEvent.click(left);
    expect(openSecondWindow).toHaveBeenCalledWith("/mikro/images/5?tab=info");
  });
});

describe.each(["win32", "linux"])("the page's notch on %s", (platform) => {
  const window_ = () =>
    render(
      <>
        <AutoHideTitleBar />
        <PageEdgeBar />
      </>,
    );
  const openTitleBar = () => fireEvent.mouseEnter(screen.getByTestId("titlebar-hover-sentinel"));

  beforeEach(() => setElectron(platform));

  it("has no bar of its own: the window's title bar is what ducks the page", () => {
    window_();
    expect(screen.queryByTestId("page-edge-bar")).toBeNull();
    expect(screen.queryByTestId("page-edge-sentinel")).toBeNull();
  });

  it("shows with the title bar, and goes with it", () => {
    window_();
    expect(notches()[0].className).toContain("invisible");
    openTitleBar();
    expect(notches()[0].className).not.toContain("invisible");
    fireEvent.mouseMove(document, { clientY: 300 });
    expect(notches()[0].className).toContain("invisible");
  });

  it("stands on the title bar's drag region and is still clickable", () => {
    window_();
    openTitleBar();
    expect(notches()[0].className).toContain("app-no-drag");
    fireEvent.click(screen.getByLabelText("Close page"));
    expect(tabs.close).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByLabelText("Open in new window"));
    expect(openSecondWindow).toHaveBeenCalledWith("/mikro/images/5?tab=info");
  });

  it("is shut again once the title bar is gone", () => {
    const view = window_();
    openTitleBar();
    view.rerender(<PageEdgeBar />);
    expect(notches()[0].className).toContain("invisible");
  });
});
