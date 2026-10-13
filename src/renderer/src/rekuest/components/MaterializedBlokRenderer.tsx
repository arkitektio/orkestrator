import { buildAssignInput } from "@/rekuest/assign";
import * as React from 'react';
import BlokRenderer from '@/core/blok/renderer/BlokRenderer';
import {type BlokDispatchActionHandler, type BlokRefuseActionHandler} from '@/core/blok/renderer/runtime';
import {formatApolloError} from '@/core/connection/graphql/errorHandler';
import {toast} from '@/core/notify';
import {v4 as uuidv4} from 'uuid';
import {useAssign} from '@/rekuest/hooks/useAssign';
import {isTerminalEvent, silenceTask, trackTask} from '@/rekuest/lib/taskTracker';
import {useBlokTravelSource} from '@/rekuest/travel/context';
import {BlokStateSync} from './blokStateSync';
import {taskUpdateFromEvent} from './blokTaskUpdates';
import {collectDemandedStateInterfaces} from './blokDemands';
import {RekuestAssetHost} from '@/rekuest/scene/RekuestAssetHost';
import {RekuestSceneHost} from '@/rekuest/scene/RekuestSceneHost';
import {BlokTruncationNotice, useBlokDocument} from './blokDocument';

type MaterializedBlokData = {
  id: string;
  blok: {
    /** Typed `ComponentNode` tree from the Blok fragment. */
    componentTree?: unknown;
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
  'uiComponents' | 'initialState' | 'dispatchAction' | 'refuseAction' | 'children'
> & {
  materializedBlok: MaterializedBlokData;
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
          <BlokStateSync
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
    (action, _component, observe) => {
      const agentId = agentIdByDependency.get(action.dependency);

      if (!agentId) {
        const error = `Blok dependency "${action.dependency}" is not bound to an agent.`;
        console.error(error);
        observe?.({end: 'failed', error});
        return;
      }

      const reference = uuidv4();
      silenceTask(reference);

      return new Promise<void>(resolve => {
        // Registered before the assign so no early event is missed; the
        // tracker unregisters itself on the terminal event.
        const untrack = trackTask(reference, event => {
          // A call bound to a name (`.into(job)`) shows these in the blok.
          const update = observe && taskUpdateFromEvent(event);
          if (update) observe(update);
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
          const reason = formatApolloError(error, 'rekuest');
          untrack();
          observe?.({end: 'failed', error: reason});
          resolve();
          console.error(`Blok action ${action.operation} failed: ${reason}`);
        });
      });
    },
    [agentIdByDependency, assign],
  );
};

/**
 * The past cannot be acted on: while the blok shows a moment from it, its
 * agent calls are dropped before they start, with one notice that says why.
 */
const refuseWhileTravelling: BlokRefuseActionHandler = () => {
  toast.info('Viewing the past: actions are paused.', {id: 'blok-travel-paused'});
  return true;
};

export const MaterializedBlokRenderer = (props: MaterializedBlokRendererProps) => {
  const {materializedBlok, ...rendererProps} = props;
  const dispatchAction = useMaterializedDispatchAction(materializedBlok.agentMappings);
  const travelling = useBlokTravelSource() !== null;
  const {roots, truncatedIds} = useBlokDocument(materializedBlok.blok.componentTree as unknown[] | null);
  const boundAgents = React.useMemo(
    () => new Map(materializedBlok.agentMappings.map(mapping => [mapping.key, mapping.agent.id] as const)),
    [materializedBlok.agentMappings],
  );

  return (
    <RekuestSceneHost>
     <RekuestAssetHost agents={boundAgents}>
      <BlokRenderer
        {...rendererProps}
        uiComponents={roots}
        initialState={materializedBlok.blok.demoState}
        dispatchAction={dispatchAction}
        refuseAction={travelling ? refuseWhileTravelling : undefined}
      >
        {/* Inside a host's canvas nothing can render the notice's element. */}
        {rendererProps.embedded ? null : <BlokTruncationNotice truncatedIds={truncatedIds} />}
        <MaterializedBlokRuntimeSync materializedBlok={materializedBlok} roots={roots} />
      </BlokRenderer>
     </RekuestAssetHost>
    </RekuestSceneHost>
  );
};

export default MaterializedBlokRenderer;
