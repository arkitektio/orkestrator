import { useSettings } from "@/core/settings/store/SettingsContext";
import { DropdownMenuItem } from "@/core/ui/dropdown-menu";
import { cn } from "@/core/util/utils";
import { RadioTower } from "lucide-react";
import { useContext } from "react";
import { AgentContext } from "./AgentProvider";
import { useAgentState } from "./store";

export type AgentEngageState = "stopped" | "connecting" | "connected";

/**
 * Engage or disengage: whether other apps may ask the person at this window for
 * something (approve a release, open an image) while their work runs.
 *
 * Engaged is the agent connected (`settings.startAgent`); disengaged, an app
 * looking for someone to ask finds nobody here and says so instead of waiting.
 * `null` in a popout or the quick bar: only the main window is the agent.
 */
export const useAgentEngage = () => {
  const { settings, setSettings } = useSettings();
  const { disabled } = useContext(AgentContext);
  const connected = useAgentState((state) => state.connected);

  if (disabled) return null;

  const engaged = settings.startAgent;
  const state: AgentEngageState = engaged ? (connected ? "connected" : "connecting") : "stopped";
  const label = {
    connected: "Engaged: apps you run can ask you here",
    connecting: "Engaged, connecting…",
    stopped: "Disengaged: apps you run cannot ask you here",
  }[state];

  return {
    engaged,
    state,
    label,
    toggle: () => setSettings({ ...settings, startAgent: !engaged }),
  };
};

/**
 * The tower says the state in its colour alone: grayed out while stopped, the
 * brand hue once connected, a faded pulsing brand hue while it connects.
 */
export const AgentEngageIcon = ({ state, className }: { state: AgentEngageState; className?: string }) => (
  <RadioTower
    aria-hidden
    data-agent={state}
    className={cn(
      "h-3.5 w-3.5 shrink-0 transition-colors",
      state === "connected" && "text-primary",
      state === "connecting" && "animate-pulse text-primary/60",
      state === "stopped" && "text-muted-foreground/50",
      className,
    )}
  />
);

/**
 * The switch in a menu: stays open on select, so the tower and the word next
 * to it are seen to change.
 */
export const AgentEngageItem = () => {
  const agent = useAgentEngage();
  if (!agent) return null;

  return (
    <DropdownMenuItem
      data-testid="agent-engage-toggle"
      aria-label={agent.engaged ? "Disengage" : "Engage"}
      title={agent.label}
      className="cursor-pointer gap-2 text-xs"
      onSelect={(event) => {
        event.preventDefault();
        agent.toggle();
      }}
    >
      <AgentEngageIcon state={agent.state} />
      <span className="flex-1">Agent</span>
      <span className="text-[10px] text-muted-foreground">
        {{ connected: "Engaged", connecting: "Connecting…", stopped: "Disengaged" }[agent.state]}
      </span>
    </DropdownMenuItem>
  );
};
