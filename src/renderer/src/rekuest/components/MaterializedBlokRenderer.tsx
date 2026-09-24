import { buildAssignInput } from "@/rekuest/assign";
import * as React from 'react';
import BlokRenderer from '@/blok/renderer/BlokRenderer';
import {useBlokRuntime, type BlokDispatchActionHandler} from '@/blok/renderer/runtime';
import {formatApolloError} from '@/lib/errorHandler';
import {v4 as uuidv4} from 'uuid';
import {useAssign} from '@/rekuest/hooks/useAssign';
import {useAgentLiveState} from '@/rekuest/hooks/useLiveState';
import {isTerminalEvent, silenceTask, trackTask} from '@/rekuest/lib/taskTracker';
import {collectDemandedStateInterfaces} from './blokDemands';
import {BlokTruncationNotice, useBlokDocument} from './blokDocument';

type MaterializedBlokData = {
  id: string;
  blok: {
    /** Typed `ComponentNode` tree from the Blok fragment. */
    components: ReadonlyArray<unknown>;
    demoState: unknown;
    dependencies?: Array<{key: string}> | null;
  };
  agentMappings: Array<{
    key: string;
    agent: {
      id: string;
    };
  }>;
};

type MaterializedBlokRendererProps = Omit<
  React.ComponentProps<typeof BlokRenderer>,
  'uiComponents' | 'initialState' | 'dispatchAction' | 'children'
> & {
  materializedBlok: MaterializedBlokData;
};

const MaterializedDependencyInterfaceSync = (props: {
  dependencyKey: string;
  stateInterface: string;
  agentId: string;
}) => {
  const {agentId, dependencyKey, stateInterface} = props;
  const {value, revision} = useAgentLiveState({agentID: agentId, stateInterface});
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const setAgentMappingStateUpdate = useBlokRuntime(state => state.setAgentMappingStateUpdate);
  const clearAgentMappingStateUpdate = useBlokRuntime(state => state.clearAgentMappingStateUpdate);
  const runtimePath = `${dependencyKey}/${stateInterface}`;

  // Write on every update, clear only when the binding itself goes away.
  // Clearing between updates would flash the demo state back for a frame.
  React.useEffect(() => {
    if (value == null) {
      return;
    }

    setRuntimeValue(runtimePath, value);
    setAgentMappingStateUpdate(dependencyKey, agentId, stateInterface, value, revision);
  }, [
    agentId,
    dependencyKey,
    revision,
    runtimePath,
    setAgentMappingStateUpdate,
    setRuntimeValue,
    stateInterface,
    value,
  ]);

  React.useEffect(
    () => () => {
      clearRuntimeValue(runtimePath);
      clearAgentMappingStateUpdate(dependencyKey, stateInterface);
    },
    [agentId, clearAgentMappingStateUpdate, clearRuntimeValue, dependencyKey, runtimePath, stateInterface],
  );

  return null;
};

const MaterializedBlokRuntimeSync = (props: {
  materializedBlok: MaterializedBlokData;
  roots: ReadonlyArray<unknown>;
}) => {
  const dependencyKeys = React.useMemo(
    () => new Set(props.materializedBlok.agentMappings.map(mapping => mapping.key)),
    [props.materializedBlok.agentMappings],
  );
  const demandedStateInterfaces = React.useMemo(
    () => collectDemandedStateInterfaces(props.roots, dependencyKeys),
    [dependencyKeys, props.roots],
  );

  return (
    <>
      {props.materializedBlok.agentMappings.flatMap(mapping => {
        const interfaces = demandedStateInterfaces.get(mapping.key);

        if (!interfaces || interfaces.size === 0) {
          return [];
        }

        return [...interfaces].map(stateInterface => (
          <MaterializedDependencyInterfaceSync
            key={`${mapping.key}-${mapping.agent.id}-${stateInterface}`}
            dependencyKey={mapping.key}
            stateInterface={stateInterface}
            agentId={mapping.agent.id}
          />
        ));
      })}
    </>
  );
};

/**
 * Agent calls go straight to the bound agent: `agent` + `interface`. The
 * `operation` names an implementation interface on that agent (for `self`, the
 * registering agent's own interface), never an Action id — so `action:` is
 * never set here.
 *
 * A blok button is the blok's own interaction: no toast, and the task is
 * silenced so it never surfaces in the rail's task island. The returned
 * promise settles when the task ends, which is what makes a `Button` pulse
 * while its task runs (`usePendingAction`).
 */
const useMaterializedDispatchAction = (
  agentMappings: MaterializedBlokData['agentMappings'],
) => {
  const {assign} = useAssign();
  const agentIdByDependency = React.useMemo(
    () => new Map(agentMappings.map(mapping => [mapping.key, mapping.agent.id] as const)),
    [agentMappings],
  );

  return React.useCallback<BlokDispatchActionHandler>(
    (action) => {
      const agentId = agentIdByDependency.get(action.dependency);

      if (!agentId) {
        console.error(`Blok dependency "${action.dependency}" is not bound to an agent.`);
        return;
      }

      const reference = uuidv4();
      silenceTask(reference);

      return new Promise<void>(resolve => {
        // Registered before the assign so no early event is missed; the
        // tracker unregisters itself on the terminal event.
        const untrack = trackTask(reference, event => {
          if (isTerminalEvent(event.kind)) resolve();
        });

        assign(
          buildAssignInput({
            agent: agentId,
            interface: action.operation,
            args: action.arguments ?? {},
            reference,
          }),
        ).catch((error: unknown) => {
          untrack();
          resolve();
          console.error(
            `Blok action ${action.operation} failed: ${formatApolloError(error, 'rekuest')}`,
          );
        });
      });
    },
    [agentIdByDependency, assign],
  );
};

export const MaterializedBlokRenderer = (props: MaterializedBlokRendererProps) => {
  const {materializedBlok, ...rendererProps} = props;
  const dispatchAction = useMaterializedDispatchAction(materializedBlok.agentMappings);
  const {roots, truncatedIds} = useBlokDocument(materializedBlok.blok.components);

  return (
    <BlokRenderer
      {...rendererProps}
      uiComponents={roots}
      initialState={materializedBlok.blok.demoState}
      dispatchAction={dispatchAction}
    >
      <BlokTruncationNotice truncatedIds={truncatedIds} />
      <MaterializedBlokRuntimeSync materializedBlok={materializedBlok} roots={roots} />
    </BlokRenderer>
  );
};

export default MaterializedBlokRenderer;
