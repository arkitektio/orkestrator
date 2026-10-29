// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  shortcut: "CommandOrControl+." as string | null,
  activeTabId: "a" as string | null,
}));

vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings: { pageSidebarShortcut: state.shortcut } }),
}));
vi.mock("@/core/tabs/TabsProvider", () => ({
  useActiveTabIdOrNull: () => state.activeTabId,
}));

import { TabIdContext } from "@/core/tabs/TabContext";
import { PageSidebarShortcut, useRegisterPageSidebarToggle } from "./pageSidebarToggle";

const Page = ({ onToggle }: { onToggle: () => void }) => {
  useRegisterPageSidebarToggle(onToggle);
  return null;
};

const press = (init: KeyboardEventInit = { code: "Period", key: ".", ctrlKey: true }) => {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
};

const renderTabs = (toggles: Record<string, () => void>) =>
  render(
    <>
      <PageSidebarShortcut />
      {Object.entries(toggles).map(([tabId, toggle]) => (
        <TabIdContext.Provider key={tabId} value={tabId}>
          <Page onToggle={toggle} />
        </TabIdContext.Provider>
      ))}
    </>,
  );

beforeEach(() => {
  state.shortcut = "CommandOrControl+.";
  state.activeTabId = "a";
});

describe("the page sidebar shortcut", () => {
  it("toggles the active tab's page and no other kept-alive one", () => {
    const a = vi.fn();
    const b = vi.fn();
    const { unmount } = renderTabs({ a, b });

    const event = press();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    unmount();
  });

  it("follows the focused pane", () => {
    const a = vi.fn();
    const b = vi.fn();
    state.activeTabId = "b";
    const { unmount } = renderTabs({ a, b });
    press();
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
    unmount();
  });

  it("leaves the key alone when the active tab has no page layout", () => {
    const a = vi.fn();
    state.activeTabId = "elsewhere";
    const { unmount } = renderTabs({ a });
    const event = press();
    expect(a).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    unmount();
  });

  it("ignores other combinations, and does nothing when turned off", () => {
    const a = vi.fn();
    const { unmount, rerender } = renderTabs({ a });
    press({ code: "Period", key: "." });
    press({ code: "Comma", key: ",", ctrlKey: true });
    expect(a).not.toHaveBeenCalled();

    state.shortcut = null;
    rerender(
      <>
        <PageSidebarShortcut />
        <TabIdContext.Provider value="a">
          <Page onToggle={a} />
        </TabIdContext.Provider>
      </>,
    );
    press();
    expect(a).not.toHaveBeenCalled();
    unmount();
  });

  it("forgets a page once it unmounts", () => {
    const a = vi.fn();
    const { unmount } = renderTabs({ a });
    unmount();
    const { unmount: unmountListener } = render(<PageSidebarShortcut />);
    press();
    expect(a).not.toHaveBeenCalled();
    unmountListener();
  });
});
