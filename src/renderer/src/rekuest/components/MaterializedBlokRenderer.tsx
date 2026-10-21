import { buildAssignInput } from "@/rekuest/assign";
import * as React from 'react';
import BlokRenderer from '@/core/blok/renderer/BlokRenderer';
import {
  useBlokRuntime,
  useBlokRuntimeStoreApi,
  type BlokDispatchActionHandler,
  type BlokRefuseActionHandler,
  type BlokTaskRecord,
} from '@/core/blok/renderer/runtime';
import {describeError, toast} from '@/core/notify';
import {v4 as uuidv4} from 'uuid';
import {useAssign} from '@/rekuest/hooks/useAssign';
import {useLatestTask} from '@/rekuest/hooks/useLatestTask';
import {isTerminalEvent, silenceTask, trackTask} from '@/rekuest/lib/taskTracker';
import {useBlokTravelSource} from '@/rekuest/travel/context';
import {BlokStateSync} from './blokStateSync';
import {taskUpdateFromEvent} from './blokTaskUpdates';
import {collectDemandedLatestTasks, collectDemandedStateInterfaces} from './blokDemands';
import {LATEST_SEGMENT, latestTaskRecord, pickLatestTask} from './blokLatestTask';
import {usePastLatestTasks} from './usePastLatestTasks';
import {RekuestAssetHost} from '@/rekuest/scene/RekuestAssetHost';
import {RekuestSceneHost} from '@/rekuest/scene/RekuestSceneHost';
import {BlokTruncationNotice, useBlokDocument} from './blokDocument';
import {BLOK_ARGS_ROOT, seededBlokArgs, type BlokArgs} from './blokArgs';

type MaterializedBlokData = {
  id: string;
  blok: {
    /** Typed `ComponentNode` tree from the Blok fragment. */
    componentTree?: unknown;
    demoState: unknown;
    dependencies?: Array<{key: string}> | null;
    /** What the blok is opened for, read at `@args.<key>`. */
    args?: Array<{key: string}> | null;
  };
  /**
   * The revision it shows (the pinned one, else its blok's head); null for a
   * provided blok, which has none. Drawn in place of the blok's own tree, so a
   * pinned materialization stays as it was.
   */
  revision?: {componentTree?: unknown; demoState: unknown} | null;
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
  /** The items the blok is opened for, by arg key; a declared arg left out reads null. */
  args?: BlokArgs;
  /** The tree changed what it is opened for (a picker bound to `args.<key>`). */
  onArgsChange?: (args: BlokArgs) => void;
};

const RECORD_FIELDS = ['status', 'running', 'done', 'failed', 'progress', 'message', 'error', 'result', 'returns'] as const;

/** Whether two records say the same. `result` and `returns` are the events' own values, kept by reference. */
const sameRecord = (a: BlokTaskRecord | undefined, b: BlokTaskRecord): boolean =>
  a !== undefined && RECORD_FIELDS.every(field => a[field] === b[field]);

/**
 * Keeps `<dependency>/<action>/latest` on the task the bound agent last ran the
 * action as, whoever started it. Live, that is what `latestTaskStore` holds for
 * the agent and the action: one subscription shared by every blok that reads
 * it, heard of once per frame, and written here only when the task changed.
 *
 * Below a travel source it is the task the action last ran as at the source's
 * moment, with what that task had reported by then. Until that is answered
 * the path keeps what it shows, like a state does (`BlokStateSync`).
 *
 * `name` is an action only if the agent implements it. A state of that name
 * with a field called `latest` is spelled the same, so until the server has
 * answered nothing is synced, and where the agent has no such action
 * `children` (the state sync) takes over.
 */
const MaterializedLatestTaskSync = (props: {
  dependencyKey: string;
  name: string;
  agentId: string;
  children: React.ReactNode;
}) => {
  const {agentId, dependencyKey, name} = props;
  const latest = useLatestTask({agentID: agentId, name});
  const source = useBlokTravelSource();
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const runtimePath = `${dependencyKey}/${name}/${LATEST_SEGMENT}`;

  const implementation = latest?.implementation ?? undefined;
  const past = usePastLatestTasks(source, implementation);
  const record = React.useMemo(() => {
    if (!latest || !implementation) return undefined;
    if (!source) return latest.record;
    return past ? latestTaskRecord(pickLatestTask(past.tasks, implementation, past.at), past.at) : undefined;
  }, [implementation, latest, past, source]);

  // Travelling rebuilds the record at every move of the clock: write only what changed.
  const written = React.useRef<BlokTaskRecord | undefined>(undefined);
  React.useEffect(() => {
    if (record === undefined || sameRecord(written.current, record)) return;
    written.current = record;
    setRuntimeValue(runtimePath, record);
  }, [record, runtimePath, setRuntimeValue]);

  React.useEffect(
    () => () => {
      written.current = undefined;
      clearRuntimeValue(runtimePath);
    },
    [clearRuntimeValue, runtimePath],
  );

  // Not answered yet, or an action: the state sync has nothing to do here.
  if (latest === null || latest.implementation !== null) return null;
  return <>{props.children}</>;
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
  const demandedLatestTasks = React.useMemo(
    () => collectDemandedLatestTasks(props.roots, dependencyKeys),
    [dependencyKeys, props.roots],
  );

  return (
    <>
      {props.materializedBlok.agentMappings.flatMap(mapping => {
        const interfaces = demandedStateInterfaces.get(mapping.key);

        if (!interfaces || interfaces.size === 0) {
          return [];
        }

        const latest = demandedLatestTasks.get(mapping.key);

        return [...interfaces].map(stateInterface => {
          const key = `${mapping.key}-${mapping.agent.id}-${stateInterface}`;
          const stateSync = (
            <BlokStateSync
              key={key}
              dependencyKey={mapping.key}
              stateInterface={stateInterface}
              agentId={mapping.agent.id}
            />
          );

          if (!latest?.has(stateInterface)) return stateSync;
          return (
            <MaterializedLatestTaskSync key={key} dependencyKey={mapping.key} name={stateInterface} agentId={mapping.agent.id}>
              {stateSync}
            </MaterializedLatestTaskSync>
          );
        });
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
          const reason = describeError(error).message;
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

const sameArgs = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Keeps `@args` on what the blok is opened for, and tells the page when the
 * tree changed it. The page's args win: when they change (another item opened
 * in the same blok), what the tree wrote below `args` is cleared first.
 */
const BlokArgsSync = (props: {args: BlokArgs; onArgsChange?: (args: BlokArgs) => void}) => {
  const {args, onArgsChange} = props;
  const store = useBlokRuntimeStoreApi();
  const current = useBlokRuntime(state => (state.dataModel as Record<string, unknown> | null)?.[BLOK_ARGS_ROOT]);

  React.useEffect(() => {
    const state = store.getState();
    if (sameArgs((state.dataModel as Record<string, unknown> | null)?.[BLOK_ARGS_ROOT], args)) return;
    for (const path of Object.keys(state.runtimePathValues)) {
      if (path.startsWith(`${BLOK_ARGS_ROOT}.`) || path.startsWith(`${BLOK_ARGS_ROOT}/`)) state.clearRuntimeValue(path);
    }
    state.setRuntimeValue(BLOK_ARGS_ROOT, args);
  }, [args, store]);

  React.useEffect(() => {
    if (current && typeof current === 'object' && !sameArgs(current, args)) onArgsChange?.(current as BlokArgs);
    // Only a change the tree made: `args` arriving is the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  return null;
};

/**
 * The past cannot be acted on: while the blok shows a moment from it, its
 * agent calls are dropped before they start, with one notice that says why.
 */
const refuseWhileTravelling: BlokRefuseActionHandler = () => {
  toast.info('Viewing the past: actions are paused.', {id: 'blok-travel-paused'});
  return true;
};

/** What a materialization draws: the revision it shows, else (a provided blok) its blok. */
export const shownContent = (materializedBlok: Pick<MaterializedBlokData, 'blok' | 'revision'>) =>
  materializedBlok.revision ?? materializedBlok.blok;

export const MaterializedBlokRenderer = (props: MaterializedBlokRendererProps) => {
  const {materializedBlok, args, onArgsChange, ...rendererProps} = props;
  const dispatchAction = useMaterializedDispatchAction(materializedBlok.agentMappings);
  const travelling = useBlokTravelSource() !== null;
  const shown = shownContent(materializedBlok);
  const {roots, truncatedIds} = useBlokDocument(shown.componentTree as unknown[] | null);
  const boundAgents = React.useMemo(
    () => new Map(materializedBlok.agentMappings.map(mapping => [mapping.key, mapping.agent.id] as const)),
    [materializedBlok.agentMappings],
  );
  const ports = materializedBlok.blok.args;
  const seeded = React.useMemo(() => (ports?.length ? seededBlokArgs(ports, args ?? {}) : undefined), [args, ports]);
  // Seeded once with what it is opened for; `BlokArgsSync` follows later changes.
  const initialState = React.useMemo(
    () =>
      seeded
        ? {...((shown.demoState as Record<string, unknown> | null) ?? {}), [BLOK_ARGS_ROOT]: seeded}
        : shown.demoState,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown.demoState],
  );

  return (
    <RekuestSceneHost>
     <RekuestAssetHost agents={boundAgents}>
      <BlokRenderer
        {...rendererProps}
        uiComponents={roots}
        initialState={initialState}
        dispatchAction={dispatchAction}
        refuseAction={travelling ? refuseWhileTravelling : undefined}
      >
        {/* Inside a host's canvas nothing can render the notice's element. */}
        {rendererProps.embedded ? null : <BlokTruncationNotice truncatedIds={truncatedIds} />}
        <MaterializedBlokRuntimeSync materializedBlok={materializedBlok} roots={roots} />
        {seeded && <BlokArgsSync args={seeded} onArgsChange={onArgsChange} />}
      </BlokRenderer>
     </RekuestAssetHost>
    </RekuestSceneHost>
  );
};

export default MaterializedBlokRenderer;
