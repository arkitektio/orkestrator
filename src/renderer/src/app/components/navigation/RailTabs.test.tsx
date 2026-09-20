// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tabsValue = vi.fn();
// One fixture, fanned out across the narrow hooks the strip now reads. The
// split is the point of the refactor: a row takes only the (stable) actions, so
// it does not re-render when another tab navigates.
vi.mock("@/command/tabs/TabsProvider", () => ({
  useTabList: () => tabsValue().tabs,
  useActiveTabId: () => tabsValue().activeId,
  // `split` is an ACTION on the fixture; the panes live under `panes`.
  useSplit: () => tabsValue().panes,
  useTabActions: () => tabsValue(),
}));

import RailTabs, { TAB_SPRING_DELAY_MS } from "./RailTabs";
import { NEW_TAB_PATH } from "@/command/tabs/tabs";
import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { createDragSource, installDndEngine } from "@/lib/dnd/engine";
import { dragOnto as dragNodeOnto, FakeDataTransfer, fireDrag } from "@/lib/dnd/testing";

/** The strip, with the dnd engine listening — its rows are drop targets. */
const renderStrip = () => render(<RailTabs />);

/** Begin a smart-model drag and rest it on `node`. Returns how to end it. */
const dragOnto = (node: Element) => {
  const card = document.createElement("div");
  document.body.appendChild(card);
  createDragSource(() => ({
    kind: SMART_MODEL_DROP_TYPE,
    getData: () => ({ structures: [{ identifier: "@x/thing", object: { id: "1" } }] }),
  })).attach(card);

  let drag!: ReturnType<typeof dragNodeOnto>;
  act(() => {
    drag = dragNodeOnto(card, node);
  });
  return () => act(() => void drag.cancel());
};

const LONG_LABEL =
  "an_open_tab_whose_title_is_far_longer_than_two_hundred_and_forty_pixels_allows";

const tab = (id: string, label: string, pinned = false) => ({
  id,
  label,
  lastActiveAt: 0,
  history: {},
  ...(pinned ? { pinned } : {}),
});

const value = (over: Record<string, unknown> = {}) => ({
  tabs: [tab("t1", "One"), tab("t2", "Two")],
  activeId: "t2",
  focus: vi.fn(),
  close: vi.fn(),
  closeOthers: vi.fn(),
  open: vi.fn(),
  setPinned: vi.fn(),
  move: vi.fn(),
  split: vi.fn(),
  unsplit: vi.fn(),
  swapSplit: vi.fn(),
  ...over,
});

let uninstallDnd: () => void;

beforeEach(() => {
  tabsValue.mockReturnValue(value());
  uninstallDnd = installDndEngine(document);
});

afterEach(() => {
  uninstallDnd();
});

describe("split view", () => {
  const splitMark = (label: string) =>
    screen.getByText(label).closest("[role='button']")?.querySelector("[data-split-mark]");

  it("marks both panes, lighting the other pane short of the focused one", () => {
    tabsValue.mockReturnValue(
      value({
        tabs: [tab("t1", "One"), tab("t2", "Two"), tab("t3", "Three")],
        activeId: "t2",
        panes: { left: "t2", right: "t1" },
      }),
    );
    renderStrip();
    expect(splitMark("One")).not.toBeNull();
    expect(splitMark("Two")).not.toBeNull();
    expect(splitMark("Three")).toBeNull();
    const other = screen.getByText("One").closest("[role='button']");
    expect(other?.className).toContain("bg-background/40");
    expect(other?.className).not.toContain("bg-background/70");
  });

  it("shows no mark and no split items when the view is not split", () => {
    renderStrip();
    expect(splitMark("One")).toBeNull();
    expect(splitMark("Two")).toBeNull();
  });

  it("offers to split with a tab that is not on screen, and to dissolve from one that is", () => {
    const v = value({
      panes: { left: "t2", right: "t1" },
      tabs: [tab("t1", "One"), tab("t2", "Two"), tab("t3", "Three")],
    });
    tabsValue.mockReturnValue(v);
    renderStrip();

    fireEvent.contextMenu(screen.getByText("Three"));
    act(() => screen.getByText("Split with current").click());
    expect(v.split).toHaveBeenCalledWith("t3");
    expect(screen.queryByText("Unsplit")).toBeNull();

    fireEvent.contextMenu(screen.getByText("One"));
    expect(screen.queryByText("Split with current")).toBeNull();
    act(() => screen.getByText("Unsplit").click());
    expect(v.unsplit).toHaveBeenCalled();

    fireEvent.contextMenu(screen.getByText("Two"));
    act(() => screen.getByText("Swap sides").click());
    expect(v.swapSplit).toHaveBeenCalled();
  });
});

describe("the Open strip", () => {
  it("lists every open tab and marks the active one", () => {
    renderStrip();
    expect(screen.getByText("One")).toBeInTheDocument();
    const active = screen.getByText("Two").closest("[role='button']");
    expect(active?.className).toContain("bg-background/70");
    const inactive = screen.getByText("One").closest("[role='button']");
    expect(inactive?.className).not.toContain("bg-background/70");
  });

  it("focuses a tab on click", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();
    act(() => screen.getByText("One").click());
    expect(v.focus).toHaveBeenCalledWith("t1");
  });

  it("closes from the hover control without also focusing", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();
    act(() => screen.getByLabelText("Close One").click());
    expect(v.close).toHaveBeenCalledWith("t1");
    expect(v.focus).not.toHaveBeenCalled();
  });

  it("creates a tab at once, on the new-tab page — the same path as ⌘T", () => {
    // Mouse and keyboard make tabs through one door, so there is one
    // behaviour to get right.
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();
    act(() => screen.getByLabelText("New tab").click());
    expect(v.open).toHaveBeenCalledWith(NEW_TAB_PATH);
  });

  it("clips a long title instead of widening the rail", () => {
    // jsdom does no layout; this pins the containment CONTRACT — which
    // element truncates, and that its row cannot grow past the rail.
    tabsValue.mockReturnValue(value({ tabs: [tab("t1", LONG_LABEL)], activeId: "t1" }));
    renderStrip();
    const label = screen.getByText(LONG_LABEL);
    expect(label.className).toContain("truncate");
    expect(label.className).toContain("min-w-0");
    const row = label.closest("[role='button']");
    expect(row?.className).toContain("min-w-0");
    expect(row?.className).toContain("overflow-hidden");
  });

  it("keeps its heading visible while the list scrolls", () => {
    renderStrip();
    expect(screen.getByText("Open").parentElement?.className).toContain("sticky");
  });
});

describe("pinning a tab", () => {
  const pinnedStrip = () => value({ tabs: [tab("t1", "One", true), tab("t2", "Two")] });

  it("pins from the hover control without also focusing", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();
    act(() => screen.getByLabelText("Pin One").click());
    expect(v.setPinned).toHaveBeenCalledWith("t1", true);
    expect(v.focus).not.toHaveBeenCalled();
  });

  it("unpins from the same control", () => {
    const v = pinnedStrip();
    tabsValue.mockReturnValue(v);
    renderStrip();
    act(() => screen.getByLabelText("Unpin One").click());
    expect(v.setPinned).toHaveBeenCalledWith("t1", false);
  });

  it("hides the pin at rest until the tab is pinned, then keeps it showing", () => {
    // The pin IS the indicator — there is no pinned section to be listed in.
    tabsValue.mockReturnValue(pinnedStrip());
    renderStrip();
    expect(screen.getByLabelText("Pin Two").className).toContain("opacity-0");
    const unpin = screen.getByLabelText("Unpin One");
    expect(unpin.className).not.toContain("opacity-0");
    expect(unpin.getAttribute("aria-pressed")).toBe("true");
  });

  it("puts no close under the pointer on a pinned tab", () => {
    tabsValue.mockReturnValue(pinnedStrip());
    renderStrip();
    expect(screen.queryByLabelText("Close One")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Close Two")).toBeInTheDocument();
  });

  it("keeps the pin where it is when the close goes, so a second click cannot land on it", () => {
    // Unpinning must not slide the close under the pointer that just clicked:
    // the pin is followed by the same one slot either way.
    tabsValue.mockReturnValue(pinnedStrip());
    renderStrip();
    expect(screen.getByLabelText("Unpin One").nextElementSibling).not.toBeNull();
    expect(screen.getByLabelText("Unpin One").nextElementSibling?.tagName).toBe("SPAN");
    expect(screen.getByLabelText("Pin Two").nextElementSibling).toBe(
      screen.getByLabelText("Close Two"),
    );
  });
});

describe("spring-loaded tabs", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const rowOf = (label: string) => screen.getByText(label).closest("[role='button']")!;

  it("opens a tab that a drag rests on, so the drop can land in it", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();
    dragOnto(rowOf("One"));
    expect(v.focus).not.toHaveBeenCalled(); // not yet — a sweep across must not open
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS));
    expect(v.focus).toHaveBeenCalledWith("t1");
  });

  it("does nothing if the drag moves on before the delay", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();
    const end = dragOnto(rowOf("One"));
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS / 2));
    end();
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS));
    expect(v.focus).not.toHaveBeenCalled();
  });

  it("does not re-focus the tab already showing", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();
    dragOnto(rowOf("Two")); // active
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS * 2));
    expect(v.focus).not.toHaveBeenCalled();
  });

  it("marks the row while the drag rests on it", () => {
    renderStrip();
    dragOnto(rowOf("One"));
    expect(rowOf("One").getAttribute("data-drag-over")).toBe("true");
  });
});

describe("reordering the strip", () => {
  const rowOf = (label: string) => screen.getByText(label).closest("[role='button']")!;
  const labels = () =>
    [...document.querySelectorAll("[data-tab-row]")].map((row) => row.getAttribute("title"));

  /**
   * Pick a tab up and hold it at `clientY`. jsdom lays nothing out — every row
   * is at the top, no taller than a line — so above zero is "past them all"
   * and below it "before them all", which is all these need.
   */
  const dragTab = (label: string, clientY: number) => {
    const dataTransfer = new FakeDataTransfer();
    const target = rowOf(label === "One" ? "Two" : "One");
    act(() => {
      fireDrag(rowOf(label), "dragstart", { dataTransfer });
      fireDrag(target, "dragover", { dataTransfer, clientY });
    });
    return {
      drop: () => act(() => void fireDrag(target, "drop", { dataTransfer, clientY })),
      cancel: () => act(() => void fireDrag(rowOf(label), "dragend", { dataTransfer })),
    };
  };

  it("parts the rows around a tab being dragged, and moves it where it is let go", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();

    const drag = dragTab("One", 10);
    expect(labels()).toEqual(["Two", "One"]);
    expect(v.move).not.toHaveBeenCalled();

    drag.drop();
    expect(v.move).toHaveBeenCalledWith("t1", 1);
  });

  it("puts the rows back when the drag is called off", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();

    dragTab("One", 10).cancel();

    expect(labels()).toEqual(["One", "Two"]);
    expect(v.move).not.toHaveBeenCalled();
  });

  it("does not let an open tab in among the pinned", () => {
    const v = value({
      tabs: [tab("t1", "One", true), tab("t2", "Two"), tab("t3", "Three")],
      activeId: "t2",
    });
    tabsValue.mockReturnValue(v);
    renderStrip();

    const drag = dragTab("Three", -10); // above everything
    expect(labels()).toEqual(["One", "Three", "Two"]);

    drag.drop();
    expect(v.move).toHaveBeenCalledWith("t3", 1);
  });

  it("opens no tab that another tab rests on", () => {
    vi.useFakeTimers();
    try {
      const v = value();
      tabsValue.mockReturnValue(v);
      renderStrip();

      dragTab("Two", -10);
      act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS * 2));

      expect(v.focus).not.toHaveBeenCalled();
      expect(rowOf("One").hasAttribute("data-drag-over")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("moves a focused tab with Alt and the arrows", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    renderStrip();

    fireEvent.keyDown(rowOf("One"), { key: "ArrowDown", altKey: true });
    expect(v.move).toHaveBeenCalledWith("t1", 1);

    fireEvent.keyDown(rowOf("Two"), { key: "ArrowUp", altKey: true });
    expect(v.move).toHaveBeenCalledWith("t2", 0);

    // The arrows alone are not a move.
    v.move.mockClear();
    fireEvent.keyDown(rowOf("One"), { key: "ArrowDown" });
    expect(v.move).not.toHaveBeenCalled();
  });
});
