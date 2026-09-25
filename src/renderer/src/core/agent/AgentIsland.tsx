import { useSettings } from "@/core/settings/store/SettingsContext";
import { Activity, WifiOff } from "lucide-react";
import { useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  RailIsland,
  RailIslandName,
  RailIslandProgress,
  RailIslandRow,
} from "../ui/rail/RailIsland";
import { AgentCodeDisplay } from "./AgentCodeDisplay";
import { AgentContext } from "./AgentProvider";
import { shouldShowAgentIsland } from "./islandVisibility";
import { useAgentState } from "./store";

/**
 * This app as a worker: what it is running for other people, and when it has
 * stopped being reachable.
 *
 * Both were previously visible only inside `AgentController`, which is mounted
 * in one pane of one module (`rekuest/panes/StandardPane`). Anywhere else in the
 * app a dropped agent socket was silent, and so was an assignment running in the
 * background — while the whole point of the agent is that it works when the user
 * is looking at something else.
 *
 * `AgentController` keeps the controls (start/stop, the error history); this is
 * the ambient half, and it disappears when there is nothing to report. See
 * {@link shouldShowAgentIsland}.
 */
export const AgentIsland = () => {
  const { settings } = useSettings();
  // The context directly, not `useAgent()`: that subscribes to the WHOLE agent
  // state, which is replaced on every socket message, and all this needs from it
  // is the build flag. The fields it does watch are selected below.
  const { disabled } = useContext(AgentContext);
  const { assignments, connected, lastCode, lastReason } = useAgentState(
    useShallow((state) => ({
      assignments: state.assignments,
      connected: state.connected,
      lastCode: state.lastCode,
      lastReason: state.lastReason,
    })),
  );

  const show = shouldShowAgentIsland({
    disabled,
    startAgent: settings.startAgent,
    connected,
    assignments: assignments.length,
    lastCode,
    lastReason,
  });

  return (
    <RailIsland show={show} islandKey="agent-island" testId="agent-island">
      {!connected && (
        // First, because it explains the rest: assignments listed under a dead
        // socket are not going anywhere.
        //
        // `lastReason` already carries the retry counter — `scheduleReconnect`
        // writes "… Retrying 2/3." into it — so there is nothing to recompute
        // here.
        <RailIslandRow
          key="disconnected"
          working={false}
          testId="agent-island-row"
        >
          <div className="relative flex min-w-0 items-center gap-2">
            <WifiOff className="h-3.5 w-3.5 shrink-0 text-destructive" />
            <RailIslandName name="Agent disconnected" working={false} />
            {lastCode !== undefined && (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                <AgentCodeDisplay code={lastCode} />
              </span>
            )}
          </div>
          {lastReason && (
            <p className="relative mt-1 line-clamp-2 break-words text-[11px] leading-snug text-muted-foreground">
              {lastReason}
            </p>
          )}
        </RailIslandRow>
      )}

      {assignments.map((assignment) => (
        // `interface` is the registered function's name and the only readable
        // label on an Assign — `task` is a uuid, so it is the key, not the name.
        <RailIslandRow
          key={assignment.task}
          working={connected}
          testId="agent-island-row"
        >
          <div className="relative flex min-w-0 items-center gap-2">
            <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <RailIslandName name={assignment.interface} working={connected} />
          </div>
          {/* The agent forwards its progress events onward and keeps none, so
              there is no percentage to show — only that this is running. */}
          {connected && <RailIslandProgress progress={0} started={false} />}
        </RailIslandRow>
      ))}
    </RailIsland>
  );
};
