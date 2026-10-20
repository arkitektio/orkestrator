// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ current: { startAgent: false } as Record<string, unknown> }));
const setSettings = vi.hoisted(() => vi.fn());
vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings: settings.current, setSettings }),
}));
// A menu item outside a menu: a plain button that keeps `onSelect`.
vi.mock("@/core/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({
    onSelect,
    children,
    ...props
  }: { onSelect: (event: { preventDefault: () => void }) => void; children: React.ReactNode }) => (
    <button type="button" onClick={() => onSelect({ preventDefault: () => {} })} {...props}>
      {children}
    </button>
  ),
}));

import { AgentContext } from "./AgentProvider";
import { AgentEngageItem } from "./AgentEngageToggle";
import { resetAgentState, setAgentState } from "./store";

const renderIn = (disabled: boolean) =>
  render(
    <AgentContext.Provider value={{ agent: null, disabled }}>
      <AgentEngageItem />
    </AgentContext.Provider>,
  );

const tower = () => document.querySelector("[data-agent]");

beforeEach(() => {
  setSettings.mockReset();
  resetAgentState();
});
afterEach(cleanup);

describe("AgentEngageItem", () => {
  it("engages a disengaged window", () => {
    settings.current = { startAgent: false, other: 1 };
    renderIn(false);

    expect(tower()).toHaveAttribute("data-agent", "stopped");
    screen.getByRole("button", { name: "Engage" }).click();

    expect(setSettings).toHaveBeenCalledWith({ startAgent: true, other: 1 });
  });

  it("says when it is engaged and connected, and disengages", () => {
    settings.current = { startAgent: true };
    setAgentState({ assignments: [], errors: [], connected: true });
    renderIn(false);

    expect(screen.getByTitle("Engaged: apps you run can ask you here")).toBeTruthy();
    expect(tower()).toHaveAttribute("data-agent", "connected");
    screen.getByRole("button", { name: "Disengage" }).click();
    expect(setSettings).toHaveBeenCalledWith({ startAgent: false });
  });

  it("shows nothing in a window that is not the agent", () => {
    settings.current = { startAgent: true };
    const { container } = renderIn(true);
    expect(container.innerHTML).toBe("");
  });
});
