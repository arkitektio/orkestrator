import * as React from "react";
import BlokRenderer from "@arkitektio/bsx/renderer/BlokRenderer";
import { liveModel, treeQueries, treeSubscriptions } from "@arkitektio/bsx/renderer/declarations";
import type { BlokSourceStatus } from "@arkitektio/bsx/renderer/runtime/index";
import type { PortBlokRendererProps } from "@arkitektio/bsx/ports/widgets/custom/PortBlokWidget";
import { useServiceReads } from "@/core/modules/hooks/useServiceReads";
import { collectDemandedLatestTasks, collectDemandedStateInterfaces } from "../components/blokDemands";
import { depsStatePath } from "../components/blokStateSync";
import { MaterializedBlokRuntimeSync } from "../components/MaterializedBlokRenderer";
import { useBlokViewer } from "../components/useBlokViewer";
import { agentMappingsOf, type RunAgentMapping, type RunBinding, type RunBoundAgent } from "./binding";

/** The agents a port blok reads: `self`, the one that would run the action, and the run's `deps`. */
export type PortBlokRun = { binding: RunBinding; self: RunBoundAgent | null };

const PortBlokRunContext = React.createContext<PortBlokRun | null>(null);

/** Says which run the port bloks below are drawn for: the assign form's, as its dry run binds it. */
export const PortBlokRunProvider = PortBlokRunContext.Provider;

const NO_MAPPINGS: RunAgentMapping[] = [];

/** A port blok reads; it never acts. */
const REFUSE_EVERY_ACTION = () => true;

/**
 * A port's own blok (a BLOK assign widget), drawn with what this app knows beyond the form: the
 * states of the agents a run would get (`self`, `deps.<key>`), the services its queries ask, and
 * who is looking (`viewer`). Outside an assign form no agent is bound.
 *
 * It is given no way to call an action: no dispatch, and any call is refused before it starts.
 * What it writes is its port, through `writePort`.
 */
export const PortBlokRenderer = ({ tree, data, writePort, children }: PortBlokRendererProps) => {
  const run = React.useContext(PortBlokRunContext);
  const agentMappings = React.useMemo(() => (run ? agentMappingsOf(run.binding, run.self) : NO_MAPPINGS), [run]);
  const viewer = useBlokViewer();
  const readExecutor = useServiceReads();

  const roots = React.useMemo(() => [tree], [tree]);
  const queries = React.useMemo(() => treeQueries(roots), [roots]);
  const subscriptions = React.useMemo(() => treeSubscriptions(roots), [roots]);
  const readVariables = React.useMemo(
    () => [...queries, ...subscriptions].flatMap((read) => read.variables ?? []),
    [queries, subscriptions],
  );
  const dependencyKeys = React.useMemo(() => new Set(agentMappings.map((mapping) => mapping.key)), [agentMappings]);
  const demandedStates = React.useMemo(
    () => collectDemandedStateInterfaces(roots, dependencyKeys, readVariables),
    [dependencyKeys, readVariables, roots],
  );
  const demandedTasks = React.useMemo(
    () => collectDemandedLatestTasks(roots, dependencyKeys, readVariables),
    [dependencyKeys, readVariables, roots],
  );

  // The form owns `port` and `args`: they change as it is filled in, and the renderer takes the
  // new model. What the syncs wrote (states, reads) stays on top of it.
  const { initialState, statuses } = React.useMemo(() => {
    const live = liveModel(roots);
    const deps = Object.fromEntries(
      agentMappings.map((mapping) => [
        mapping.key,
        { id: mapping.agent.id, name: mapping.agent.name ?? null, connected: mapping.agent.connected !== false, tasks: {} },
      ]),
    );
    const pending: Record<string, BlokSourceStatus> = { ...live.statuses };
    demandedStates.forEach((states, key) => states.forEach((state) => (pending[depsStatePath(key, state)] = { status: "pending" })));
    return { initialState: { ...live.data, deps, ...data }, statuses: pending };
  }, [agentMappings, data, demandedStates, roots]);

  const synced = React.useMemo(() => ({ agentMappings }), [agentMappings]);

  return (
    <BlokRenderer
      uiComponents={roots}
      initialState={initialState}
      statuses={statuses}
      refuseAction={REFUSE_EVERY_ACTION}
      viewer={viewer}
      queries={queries}
      subscriptions={subscriptions}
      readExecutor={readExecutor}
      writePort={writePort}
      // As bsx draws a port blok by default: the field's box is the form's.
      chrome="none"
      sizing="intrinsic"
    >
      <MaterializedBlokRuntimeSync materializedBlok={synced} demandedStates={demandedStates} demandedTasks={demandedTasks} />
      {children}
    </BlokRenderer>
  );
};
