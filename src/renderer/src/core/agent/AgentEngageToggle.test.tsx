// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({ current: { startAgent: false } as Record<string, unknown> }));
const setSettings = vi.hoisted(() => vi.fn());
vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings: settings.current, setSettings }),
}));
vi.mock("@/core/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

import { AgentContext } from "./AgentProvider";
import { AgentEngageToggle } from "./AgentEngageToggle";
import { resetAgentState, setAgentState } from "./store";

const renderIn = (disabled: boolean) =>
  render(
    <AgentContext.Provider value={{ agent: null, disabled }}>
      <AgentEngageToggle />
    </AgentContext.Provider>,
  );

beforeEach(() => {
  setSettings.mockReset();
  resetAgentState();
});
afterEach(cleanup);

describe("AgentEngageToggle", () => {
  it("engages a disengaged window", () => {
    settings.current = { startAgent: false, other: 1 };
    renderIn(false);

    screen.getByRole("button", { name: "Engage" }).click();

    expect(setSettings).toHaveBeenCalledWith({ startAgent: true, other: 1 });
  });

  it("says when it is engaged and connected, and disengages", () => {
    settings.current = { startAgent: true };
    setAgentState({ assignments: [], errors: [], connected: true });
    renderIn(false);

    expect(screen.getByText("Engaged: apps you run can ask you here")).toBeTruthy();
    screen.getByRole("button", { name: "Disengage" }).click();
    expect(setSettings).toHaveBeenCalledWith({ startAgent: false });
  });

  it("shows nothing in a window that is not the agent", () => {
    settings.current = { startAgent: true };
    const { container } = renderIn(true);
    expect(container.innerHTML).toBe("");
  });
});
