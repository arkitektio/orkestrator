// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tabsValue = vi.fn();
vi.mock("@/command/tabs/TabsProvider", () => ({ useTabs: () => tabsValue() }));

const togglePalette = vi.fn();
vi.mock("@/command/CommandPaletteProvider", () => ({
  useCommandPalette: () => ({ togglePalette }),
}));

import RailTabs from "./RailTabs";

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
    render(<RailTabs />);
    expect(screen.getByText("One")).toBeInTheDocument();
    const active = screen.getByText("Two").closest("[role='button']");
    expect(active?.className).toContain("bg-background/70");
    const inactive = screen.getByText("One").closest("[role='button']");
    expect(inactive?.className).not.toContain("bg-background/70");
  });

  it("focuses a tab on click", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    render(<RailTabs />);
    act(() => screen.getByText("One").click());
    expect(v.focus).toHaveBeenCalledWith("t1");
  });

  it("closes from the hover control without also focusing", () => {
    const v = value();
    tabsValue.mockReturnValue(v);
    render(<RailTabs />);
    act(() => screen.getByLabelText("Close One").click());
    expect(v.close).toHaveBeenCalledWith("t1");
    expect(v.focus).not.toHaveBeenCalled();
  });

  it("creates a tab through the same path as ⌘T", () => {
    // Mouse and keyboard make tabs through one door — the palette in
    // new-tab mode — so there is one behaviour to get right.
    render(<RailTabs />);
    act(() => screen.getByLabelText("New tab").click());
    expect(togglePalette).toHaveBeenCalledWith({ fresh: true, intent: "new-tab" });
  });

  it("clips a long title instead of widening the rail", () => {
    // jsdom does no layout; this pins the containment CONTRACT — which
    // element truncates, and that its row cannot grow past the rail.
    tabsValue.mockReturnValue(value({ tabs: [tab("t1", LONG_LABEL)], activeId: "t1" }));
    render(<RailTabs />);
    const label = screen.getByText(LONG_LABEL);
    expect(label.className).toContain("truncate");
    expect(label.className).toContain("min-w-0");
    const row = label.closest("[role='button']");
    expect(row?.className).toContain("min-w-0");
    expect(row?.className).toContain("overflow-hidden");
  });

  it("keeps its heading visible while the list scrolls", () => {
    render(<RailTabs />);
    expect(screen.getByText("Open").parentElement?.className).toContain("sticky");
  });
});
