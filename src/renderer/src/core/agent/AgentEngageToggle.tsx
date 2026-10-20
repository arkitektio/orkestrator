import { useSettings } from "@/core/settings/store/SettingsContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/ui/tooltip";
import { cn } from "@/core/util/utils";
import { Hand } from "lucide-react";
import { useContext } from "react";
import { AgentContext } from "./AgentProvider";
import { useAgentState } from "./store";

/**
 * Engage or disengage: whether other apps may ask the person at this window for
 * something (approve a release, open an image) while their work runs.
 *
 * Engaged is the agent connected (`settings.startAgent`); disengaged, an app
 * looking for someone to ask finds nobody here and says so instead of waiting.
 * Nothing in a popout or the quick bar: only the main window is the agent.
 */
export const AgentEngageToggle = () => {
  const { settings, setSettings } = useSettings();
  const { disabled } = useContext(AgentContext);
  const connected = useAgentState((state) => state.connected);

  if (disabled) return null;

  const engaged = settings.startAgent;
  const label = engaged
    ? connected
      ? "Engaged: apps you run can ask you here"
      : "Engaged, connecting…"
    : "Disengaged: apps you run cannot ask you here";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={engaged ? "Disengage" : "Engage"}
          aria-pressed={engaged}
          data-testid="agent-engage-toggle"
          onClick={() => setSettings({ ...settings, startAgent: !engaged })}
          className={cn(
            "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            engaged
              ? "text-primary hover:bg-background"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
          )}
        >
          <Hand className="h-4 w-4" />
          {engaged && (
            <span
              aria-hidden
              className={cn(
                "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full",
                connected ? "bg-emerald-500" : "animate-pulse bg-muted-foreground",
              )}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
};
