// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tabs = vi.hoisted(() => ({ openBeside: vi.fn(), swapSplit: vi.fn(), pane: null as "left" | "right" | null }));
vi.mock("@/core/tabs/TabsProvider", () => ({ useTabActions: () => tabs }));
vi.mock("@/core/tabs/TabPaneContext", () => ({ useTabPane: () => tabs.pane }));
vi.mock("@/core/smart/display/StructureDisplay", () => ({
  StructureDisplay: ({ identifier, id }: { identifier: string; id: string }) => <span>{`${identifier}:${id}`}</span>,
}));
vi.mock("@/core/smart/registry", () => ({
  smartRegistry: {
    getDisplayName: (identifier: string) => (identifier === "@mikro/image" ? "Image" : identifier),
    buildModelPath: (identifier: string, id: string) => (identifier === "@mikro/image" ? `mikro/images/${id}` : undefined),
  },
}));

import { CallDock } from "./CallDock";

const IMAGE = { identifier: "@mikro/image", object: 42 };
const OTHER = { identifier: "@mikro/image", object: 43 };

const pill = () => screen.getByTestId("call-talking-about");

beforeEach(() => {
  tabs.openBeside.mockClear();
  tabs.swapSplit.mockClear();
  tabs.pane = null;
});
afterEach(cleanup);

describe("the call's dock", () => {
  it("names what the call took on last, and counts what came before", () => {
    render(<CallDock call={{ about: [IMAGE, OTHER] }} />);
    expect(pill().textContent).toContain("Talking about");
    expect(pill().textContent).toContain("@mikro/image:43");
    expect(pill().textContent).not.toContain("@mikro/image:42");
    expect(pill().textContent).toContain("+1");
  });

  it("holds the topic and the buttons in one group", () => {
    render(
      <CallDock call={{ about: [IMAGE] }}>
        <button>Mute</button>
      </CallDock>,
    );
    const dock = screen.getByTestId("call-dock");
    expect(dock.contains(pill())).toBe(true);
    expect(dock.contains(screen.getByText("Mute"))).toBe(true);
  });

  it("opens the topic to the right of the call on a click", () => {
    render(<CallDock call={{ about: [IMAGE] }} />);
    fireEvent.click(pill());
    expect(tabs.swapSplit).not.toHaveBeenCalled();
    expect(tabs.openBeside).toHaveBeenCalledWith("/mikro/images/42", { label: "Image", evict: true });
  });

  it("takes the view first when the call is the side pane, so the topic does not replace it", () => {
    tabs.pane = "right";
    render(<CallDock call={{ about: [IMAGE] }} />);
    fireEvent.click(pill());
    expect(tabs.swapSplit).toHaveBeenCalledTimes(1);
    expect(tabs.swapSplit.mock.invocationCallOrder[0]).toBeLessThan(tabs.openBeside.mock.invocationCallOrder[0]);
  });

  it("only names what has no page, and shows no pill for a call about nothing", () => {
    const { unmount } = render(<CallDock call={{ about: [{ identifier: "@unknown/thing", object: 1 }] }} />);
    fireEvent.click(pill());
    expect(tabs.openBeside).not.toHaveBeenCalled();
    unmount();
    render(<CallDock call={{ about: [] }} />);
    expect(screen.queryByTestId("call-talking-about")).toBeNull();
  });
});
