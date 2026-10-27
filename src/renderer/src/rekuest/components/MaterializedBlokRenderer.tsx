import { buildAssignInput } from "@/rekuest/assign";
import * as React from 'react';
import BlokRenderer from '@/core/blok/renderer/BlokRenderer';
import {
  useBlokRuntime,
  useBlokRuntimeStoreApi,
  type BlokDispatchActionHandler,
  type BlokRefuseActionHandler,
  type BlokSourceStatus,
  type BlokTaskRecord,
} from '@/core/blok/renderer/runtime';
import {
  declaredLocals,
  declaredQueries,
  declaredSubscriptions,
  liveModel,
  type BlokDeclarations,
} from '@/core/blok/renderer/declarations';
import {describeError, toast} from '@/core/notify';
import {v4 as uuidv4} from 'uuid';
import {useAssign} from '@/rekuest/hooks/useAssign';
import {useLatestTask} from '@/rekuest/hooks/useLatestTask';
import {isTerminalEvent, silenceTask, trackTask} from '@/rekuest/lib/taskTracker';
import {useBlokTravelMoment, useBlokTravelSource} from '@/rekuest/travel/context';
import {useServiceReads} from '@/core/modules/hooks/useServiceReads';
import {BlokStateSync, depsStatePath} from './blokStateSync';
import {taskUpdateFromEvent} from './blokTaskUpdates';
import {collectDemandedLatestTasks, collectDemandedStateInterfaces} from './blokDemands';
import {latestTaskPath, latestTaskRecord, pickLatestTask} from './blokLatestTask';
import {usePastLatestTasks} from './usePastLatestTasks';
import {RekuestAssetHost} from '@/rekuest/scene/RekuestAssetHost';
import {RekuestSceneHost} from '@/rekuest/scene/RekuestSceneHost';
import {BlokTruncationNotice, useBlokDocument} from './blokDocument';
import {BLOK_ARGS_ROOT, seededBlokArgs, type BlokArgs} from './blokArgs';
import type {BlokPersistence} from '@/core/blok/renderer/persist';
import {useBlokComponentStore, useBlokPersistence} from './useBlokPersistence';
import {useBlokViewer} from './useBlokViewer';

/** Where a task or action blok reads the task it is about. */
export const BLOK_TASK_ROOT = 'task';

/** What a blok draws, v2: its tree and what it declares beside it. */
export type MaterializedContent = BlokDeclarations & {
  /** Typed `ComponentNode` tree, in the wire spelling. */
  componentTree?: unknown;
};

export type MaterializedBlokData = {
  id: string;
  blok: MaterializedContent & {
    dependencies?: Array<{key: string}> | null;
    /** What the blok is opened for, read at `args.<key>`. */
    args?: Array<{key: string}> | null;
  };
  /**
   * The revision it shows (the pinned one, else its blok's head); null for a
   * provided blok, which has none. Drawn in place of the blok's own tree, so a
   * pinned materialization stays as it was.
   */
  revision?: MaterializedContent | null;
  agentMappings: Array<{
    key: string;
    agent: {
      id: string;
      name?: string | null;
      /** Left out when the caller does not know: then it counts as reachable. */
      connected?: boolean;
    };
  }>;
  /** Required dependencies of the revision shown that no agent is bound to here. */
  unboundDependencies?: readonly string[] | null;
};

type MaterializedBlokRendererProps = Omit<
  React.ComponentProps<typeof BlokRenderer>,
  | 'uiComponents'
  | 'initialState'
  | 'dispatchAction'
  | 'refuseAction'
  | 'children'
  | 'statuses'
  | 'travelAt'
  | 'viewer'
  | 'queries'
  | 'subscriptions'
  | 'readExecutor'
  | 'answerTask'
  | 'componentState'
  | 'keptValues'
  | 'keptRoots'
> & {
  materializedBlok: MaterializedBlokData;
  /** The items the blok is opened for, by arg key; a declared arg left out reads null. */
  args?: BlokArgs;
  /** The tree changed what it is opened for (a picker bound to `args.<key>`). */
  onArgsChange?: (args: BlokArgs) => void;
  /** The task this blok is about (a task or action blok): read as `task`. */
  task?: BlokTaskRecord | null;
  /** Answers the open ask of `task`: what `task.answer(values)` calls. */
  onAnswer?: (values: Record<string, unknown>) => unknown;
  /** What else writes into the blok's runtime, rendered inside it. */
  syncs?: React.ReactNode;
};

const RECORD_FIELDS = ['id', 'status', 'progress', 'message', 'error', 'returns', 'ask', 'answer', 'args'] as const;

/** Whether two records say the same; `returns`, `args`, `ask` and `answer` are the events' own values, kept by reference. */
const sameRecord = (a: BlokTaskRecord | undefined, b: BlokTaskRecord): boolean =>
  a !== undefined && RECORD_FIELDS.every(field => a[field] === b[field]);

/**
 * Keeps `deps.<key>.tasks.<action>` on the task the bound agent last ran the
 * action as, whoever started it. Live, that is what `latestTaskStore` holds;
 * below a travel source it is the task the action last ran as at the source's
 * moment, with what that task had reported by then.
 */
const LatestTaskSync = (props: {dependencyKey: string; action: string; agentId: string}) => {
  const {agentId, dependencyKey, action} = props;
  const latest = useLatestTask({agentID: agentId, name: action});
  const source = useBlokTravelSource();
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const runtimePath = latestTaskPath(dependencyKey, action);

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

  return null;
};

const MaterializedBlokRuntimeSync = (props: {
  materializedBlok: MaterializedBlokData;
  demandedStates: ReadonlyMap<string, ReadonlySet<string>>;
  demandedTasks: ReadonlyMap<string, ReadonlySet<string>>;
}) => (
  <>
    {props.materializedBlok.agentMappings.flatMap(mapping => [
      ...[...(props.demandedStates.get(mapping.key) ?? [])].map(stateInterface => (
        <BlokStateSync
          key={`state-${mapping.key}-${mapping.agent.id}-${stateInterface}`}
          dependencyKey={mapping.key}
          stateInterface={stateInterface}
          agentId={mapping.agent.id}
          connected={mapping.agent.connected !== false}
        />
      )),
      ...[...(props.demandedTasks.get(mapping.key) ?? [])].map(action => (
        <LatestTaskSync
          key={`task-${mapping.key}-${mapping.agent.id}-${action}`}
          dependencyKey={mapping.key}
          action={action}
          agentId={mapping.agent.id}
        />
      )),
    ])}
  </>
);

/**
 * Agent calls go straight to the bound agent: `agent` + `interface`. The
 * `operation` names an implementation interface on that agent (for `self`, the
 * registering agent's own interface), never an Action id.
 *
 * A blok button is the blok's own interaction: no toast (a blok declares a
 * `<Toast>` for that), and the task is silenced so it never surfaces in the
 * rail's task island. The returned promise settles when the task ends, which
 * is what keeps the control busy while its task runs. The record a named call
 * writes learns the task's id as soon as the assign answers.
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
        ).then(
          task => observe?.({id: task.id, status: 'queued'}),
          (error: unknown) => {
            const reason = describeError(error).message;
            untrack();
            observe?.({end: 'failed', error: reason});
            resolve();
            console.error(`Blok action ${action.operation} failed: ${reason}`);
          },
        );
      });
    },
    [agentIdByDependency, assign],
  );
};

const sameArgs = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Keeps `args` on what the blok is opened for, and tells the page when the
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

/** Keeps `task` on the task this blok is about, as it moves. */
const TaskRecordSync = ({task}: {task: BlokTaskRecord}) => {
  const store = useBlokRuntimeStoreApi();
  const written = React.useRef<BlokTaskRecord | undefined>(undefined);
  React.useEffect(() => {
    if (sameRecord(written.current, task)) return;
    written.current = task;
    store.getState().setRuntimeValue(BLOK_TASK_ROOT, task);
  }, [store, task]);
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

/**
 * The dependencies it cannot act through now, and why: unbound ones, and
 * bound agents that are offline. Their controls show disabled, the reason on
 * hover, rather than a banner over the blok.
 */
export const unavailableDependenciesOf = (
  materializedBlok: Pick<MaterializedBlokData, 'agentMappings' | 'unboundDependencies'>,
): ReadonlyMap<string, string> => {
  const unavailable = new Map<string, string>();
  for (const key of materializedBlok.unboundDependencies ?? []) {
    unavailable.set(key, `No agent is bound to "${key}", so this does nothing`);
  }
  for (const mapping of materializedBlok.agentMappings) {
    if (mapping.agent.connected === false) {
      unavailable.set(mapping.key, `${mapping.agent.name || mapping.key} is offline`);
    }
  }
  return unavailable;
};

/** Writes the kept locals back as the tree changes them, and what is pending when the blok closes. */
const BlokPersistSync = ({persistence}: {persistence: BlokPersistence}) => {
  const store = useBlokRuntimeStoreApi();
  React.useEffect(() => persistence.attach(store), [persistence, store]);
  return null;
};

/** What a materialization draws: the revision it shows, else (a provided blok) its blok. */
export const shownContent = (materializedBlok: Pick<MaterializedBlokData, 'blok' | 'revision'>): MaterializedContent =>
  materializedBlok.revision ?? materializedBlok.blok;

export const MaterializedBlokRenderer = (props: MaterializedBlokRendererProps) => {
  const shown = shownContent(props.materializedBlok);
  const locals = React.useMemo(() => declaredLocals(shown), [shown]);
  const persistence = useBlokPersistence(props.materializedBlok.id, locals);
  // The kept locals are read before the first render, so the blok opens as it was left.
  if (persistence === undefined) return null;
  return <MaterializedBlokView {...props} persistence={persistence} />;
};

const MaterializedBlokView = (props: MaterializedBlokRendererProps & {persistence: BlokPersistence | null}) => {
  const {materializedBlok, args, onArgsChange, task, onAnswer, persistence, syncs, ...rendererProps} = props;
  const dispatchAction = useMaterializedDispatchAction(materializedBlok.agentMappings);
  const travelAt = useBlokTravelMoment();
  const travelling = useBlokTravelSource() !== null;
  const viewer = useBlokViewer();
  const readExecutor = useServiceReads();
  const componentState = useBlokComponentStore(materializedBlok.id);
  const shown = shownContent(materializedBlok);
  const unavailableDependencies = React.useMemo(
    () => unavailableDependenciesOf(materializedBlok),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materializedBlok.agentMappings, materializedBlok.unboundDependencies],
  );
  const {roots, truncatedIds} = useBlokDocument(shown.componentTree as unknown[] | null);
  const boundAgents = React.useMemo(
    () => new Map(materializedBlok.agentMappings.map(mapping => [mapping.key, mapping.agent.id] as const)),
    [materializedBlok.agentMappings],
  );
  const queries = React.useMemo(() => declaredQueries(shown), [shown]);
  const subscriptions = React.useMemo(() => declaredSubscriptions(shown), [shown]);
  const readVariables = React.useMemo(
    () => [...queries, ...subscriptions].flatMap(read => read.variables ?? []),
    [queries, subscriptions],
  );
  const dependencyKeys = React.useMemo(() => new Set(boundAgents.keys()), [boundAgents]);
  const demandedStates = React.useMemo(
    () => collectDemandedStateInterfaces(roots, dependencyKeys, readVariables),
    [dependencyKeys, readVariables, roots],
  );
  const demandedTasks = React.useMemo(
    () => collectDemandedLatestTasks(roots, dependencyKeys, readVariables),
    [dependencyKeys, readVariables, roots],
  );
  const ports = materializedBlok.blok.args;
  // A blok a task made from its BSX declares no arg ports: it reads what the task opened it on.
  const seeded = React.useMemo(
    () => (ports?.length ? seededBlokArgs(ports, args ?? {}) : args && Object.keys(args).length > 0 ? args : undefined),
    [args, ports],
  );

  // Seeded once: the syncs follow later changes.
  const {initialState, statuses} = React.useMemo(() => {
    const live = liveModel(roots, shown);
    const deps = Object.fromEntries(
      materializedBlok.agentMappings.map(mapping => [
        mapping.key,
        {id: mapping.agent.id, name: mapping.agent.name ?? null, tasks: {}},
      ]),
    );
    const pending: Record<string, BlokSourceStatus> = {...live.statuses};
    demandedStates.forEach((states, key) => states.forEach(state => (pending[depsStatePath(key, state)] = {status: 'pending'})));
    return {
      initialState: {
        ...live.data,
        deps,
        args: seeded ?? {},
        ...(task ? {[BLOK_TASK_ROOT]: task} : {}),
      },
      statuses: pending,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, roots]);

  return (
    <RekuestSceneHost>
     <RekuestAssetHost agents={boundAgents}>
      <BlokRenderer
        // Opened again when what it keeps changes: the kept values seed a new runtime.
        key={persistence ? [...persistence.keys].join('\u0000') : undefined}
        {...rendererProps}
        uiComponents={roots}
        initialState={initialState}
        statuses={statuses}
        keptValues={persistence?.initial}
        keptRoots={persistence?.keys}
        dispatchAction={dispatchAction}
        refuseAction={travelling ? refuseWhileTravelling : undefined}
        unavailableDependencies={unavailableDependencies}
        unboundDependencies={materializedBlok.unboundDependencies}
        travelAt={travelAt}
        viewer={viewer}
        queries={queries}
        subscriptions={subscriptions}
        readExecutor={readExecutor}
        answerTask={onAnswer}
        componentState={componentState}
      >
        {/* Inside a host's canvas nothing can render the notice's element. */}
        {rendererProps.embedded ? null : <BlokTruncationNotice truncatedIds={truncatedIds} />}
        <MaterializedBlokRuntimeSync
          materializedBlok={materializedBlok}
          demandedStates={demandedStates}
          demandedTasks={demandedTasks}
        />
        {seeded && <BlokArgsSync args={seeded} onArgsChange={onArgsChange} />}
        {task && <TaskRecordSync task={task} />}
        {persistence && <BlokPersistSync persistence={persistence} />}
        {syncs}
      </BlokRenderer>
     </RekuestAssetHost>
    </RekuestSceneHost>
  );
};

export default MaterializedBlokRenderer;
