// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { DndProvider, useDragDropManager } from "react-dnd";
import type { BackendFactory, DragDropManager, Identifier } from "dnd-core";

import { SMART_MODEL_DROP_TYPE } from "@/constants";

const tabsValue = vi.fn();
vi.mock("@/command/tabs/TabsProvider", () => ({ useTabs: () => tabsValue() }));

const togglePalette = vi.fn();
vi.mock("@/command/CommandPaletteProvider", () => ({
  useCommandPalette: () => ({ togglePalette }),
}));

import RailTabs, { TAB_SPRING_DELAY_MS } from "./RailTabs";

/**
 * The smallest react-dnd backend there is: it records which DOM node each drop
 * target connected to, so a test can "hover" a row by its element. Dragging is
 * driven straight through the manager's actions, the way the real backend does.
 */
const makeBackend = () => {
  const targets = new Map<Element, Identifier>();
  const backend: BackendFactory = () => ({
    setup: () => {},
    teardown: () => {},
    connectDragSource: () => () => {},
    connectDragPreview: () => () => {},
    connectDropTarget: (id: Identifier, node: Element) => {
      targets.set(node, id);
      return () => targets.delete(node);
    },
    profile: () => ({}),
  });
  return { backend, targets };
};

/** Hands the manager out of the provider, so a test can drive a drag. */
const Grab = ({ onManager }: { onManager: (m: DragDropManager) => void }) => {
  const m = useDragDropManager();
  useEffect(() => onManager(m), [m, onManager]);
  return null;
};

/** The strip under a DndProvider — its rows are drop targets. */
const renderStrip = () => {
  const { backend, targets } = makeBackend();
  const box: { manager: DragDropManager | null } = { manager: null };
  render(
    <DndProvider backend={backend}>
      <Grab onManager={(m) => { box.manager = m; }} />
      <RailTabs />
    </DndProvider>,
  );
  return { targets, manager: () => box.manager! };
};

/** Begin a smart-model drag and rest it on `node`. */
const dragOnto = (m: DragDropManager, targets: Map<Element, Identifier>, node: Element) => {
  const sourceId = m.getRegistry().addSource(SMART_MODEL_DROP_TYPE, {
    beginDrag: () => ({ identifier: "@x/thing", object: "1" }),
    canDrag: () => true,
    isDragging: () => false,
    endDrag: () => {},
  });
  act(() => m.getActions().beginDrag([sourceId]));
  act(() => m.getActions().hover([targets.get(node)!]));
  return () => act(() => m.getActions().endDrag());
};

const LONG_LABEL =
  "an_open_tab_whose_title_is_far_longer_than_two_hundred_and_forty_pixels_allows";

const tab = (id: string, label: string) => ({ id, label, lastActiveAt: 0, history: {} });

const value = (over: Record<string, unknown> = {}) => ({
  tabs: [tab("t1", "One"), tab("t2", "Two")],
  activeId: "t2",
  focus: vi.fn(),
  close: vi.fn(),
  closeOthers: vi.fn(),
  ...over,
});

beforeEach(() => {
  togglePalette.mockClear();
  tabsValue.mockReturnValue(value());
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

  it("creates a tab through the same path as ⌘T", () => {
    // Mouse and keyboard make tabs through one door — the palette in
    // new-tab mode — so there is one behaviour to get right.
    renderStrip();
    act(() => screen.getByLabelText("New tab").click());
    expect(togglePalette).toHaveBeenCalledWith({ fresh: true, intent: "new-tab" });
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

describe("spring-loaded tabs", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const rowOf = (label: string) => screen.getByText(label).closest("[role='button']")!;

  it("opens a tab that a drag rests on, so the drop can land in it", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    const { targets, manager } = renderStrip();
    dragOnto(manager(), targets, rowOf("One"));
    expect(v.focus).not.toHaveBeenCalled(); // not yet — a sweep across must not open
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS));
    expect(v.focus).toHaveBeenCalledWith("t1");
  });

  it("does nothing if the drag moves on before the delay", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    const { targets, manager } = renderStrip();
    const end = dragOnto(manager(), targets, rowOf("One"));
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS / 2));
    end();
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS));
    expect(v.focus).not.toHaveBeenCalled();
  });

  it("does not re-focus the tab already showing", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    const { targets, manager } = renderStrip();
    dragOnto(manager(), targets, rowOf("Two")); // active
    act(() => vi.advanceTimersByTime(TAB_SPRING_DELAY_MS * 2));
    expect(v.focus).not.toHaveBeenCalled();
  });

  it("marks the row while the drag rests on it", () => {
    const { targets, manager } = renderStrip();
    dragOnto(manager(), targets, rowOf("One"));
    expect(rowOf("One").getAttribute("data-drag-over")).toBe("true");
  });
});
