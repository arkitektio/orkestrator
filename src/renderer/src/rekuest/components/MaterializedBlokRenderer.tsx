import { buildAssignInput } from "@/rekuest/assign";
import * as React from 'react';
import BlokRenderer from '@arkitektio/bsx/renderer/BlokRenderer';
import {
  useBlokRuntime,
  useBlokRuntimeStoreApi,
  type BlokDispatchActionHandler,
  type BlokRefuseActionHandler,
  type BlokSourceStatus,
  type BlokTaskRecord,
} from '@arkitektio/bsx/renderer/runtime/index';
import {
  declaredLocals,
  liveModel,
  treeQueries,
  treeSubscriptions,
  type BlokDeclarations,
} from '@arkitektio/bsx/renderer/declarations';
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
import type {BlokPersistence} from '@arkitektio/bsx/renderer/persist';
import {useBlokComponentStore, useBlokPersistence} from './useBlokPersistence';
import {useBlokViewer} from './useBlokViewer';
import {BlokRunHostProvider, useBlokRunHost, type BlokRunHost} from '@arkitektio/bsx/renderer/bloks/run/index';
import {
  BlokDependencyOptionsSync,
  BlokDependencyPicker,
  BlokDependencySeed,
  dependencyUse,
  referenceKey,
  REFERENCE_SEPARATOR,
  useActionDependencies,
  useBlokDependencyBindings,
  usePickedAgents,
  type ActionDependency,
  type BlokDependencyBindings,
  type DeclaredDependencies,
  type DependencyUse,
  type PickedAgent,
} from './blokDependencyBindings';

/** Where a task or action blok reads the task it is about. */
export const BLOK_TASK_ROOT = 'task';
/** Where an assign blok reads the run it prepares. */
export const BLOK_ASSIGN_ROOT = 'assign';

/** The run an assign blok prepares, besides `args` and `deps`. */
export type BlokAssignRecord = {
  /** The arguments the caller decided before the blok opened, by port key: locked. */
  given: Record<string, boolean>;
  /** The keys of the required arguments that are still empty. */
  missing: string[];
  /** Whether no required argument is missing. */
  ready: boolean;
  /** Whether `assign.start()` is being taken. */
  starting: boolean;
  /** Why the run cannot start now, as a sentence; null when it can. */
  blocked: string | null;
};

/** What a blok draws, v2: its tree (which declares its locals, queries and subscriptions) and how the server resolved its locals. */
export type MaterializedContent = BlokDeclarations & {
  /** Typed `ComponentNode` tree, in the wire spelling. */
  componentTree?: unknown;
};

export type MaterializedBlokData = {
  id: string;
  blok: MaterializedContent & {
    dependencies?: Array<{key: string; id?: string}> | null;
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
  | 'keptLocals'
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
  /** Starts the run an assign blok prepares (`assign.start()`); what it returns keeps the control busy. */
  onStart?: () => unknown;
  /** What `task.cancel()` and its kin call: cancels, pauses, resumes, steps or interrupts `task`. */
  onControl?: (operation: 'cancel' | 'pause' | 'resume' | 'step' | 'interrupt') => unknown;
  /** What an assign blok knows of the run it prepares: read as `assign` (`assign.given.<key>`, `assign.missing`, `assign.ready`). */
  assign?: BlokAssignRecord | null;
  /** What else writes into the blok's runtime, rendered inside it. */
  syncs?: React.ReactNode;
};

const RECORD_FIELDS = ['id', 'status', 'progress', 'message', 'error', 'returns', 'ask', 'answer', 'args'] as const;
/** What bsx before it knew them has no field for: compared by value. */
const LATER_FIELDS = ['can', 'started_at', 'ended_at', 'duration', 'log'] as const;

/** Whether two records say the same; `returns`, `args`, `ask` and `answer` are the events' own values, kept by reference. */
const sameRecord = (a: BlokTaskRecord | undefined, b: BlokTaskRecord): boolean =>
  a !== undefined && RECORD_FIELDS.every(field => a[field] === b[field]) && sameCan(a, b);

/** `task.can`, the times and the log, by value. */
const sameCan = (a: BlokTaskRecord, b: BlokTaskRecord): boolean =>
  LATER_FIELDS.every(field => JSON.stringify((a as Record<string, unknown>)[field]) === JSON.stringify((b as Record<string, unknown>)[field]));

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

/** Keeps `deps.<key>.connected` on whether the bound agent is connected now. */
const AgentConnectedSync = ({dependencyKey, connected}: {dependencyKey: string; connected: boolean}) => {
  const store = useBlokRuntimeStoreApi();
  const written = React.useRef<boolean | undefined>(undefined);
  React.useEffect(() => {
    // The first value is the initial state's.
    if (written.current === undefined) {
      written.current = connected;
      return;
    }
    if (written.current === connected) return;
    written.current = connected;
    store.getState().setRuntimeValue(`deps.${dependencyKey}.connected`, connected);
  }, [connected, dependencyKey, store]);
  return null;
};

/** Keeps a blok's runtime on its bound agents: whether each is connected, the states and the latest tasks its tree reads. */
export const MaterializedBlokRuntimeSync = (props: {
  materializedBlok: Pick<MaterializedBlokData, 'agentMappings'>;
  demandedStates: ReadonlyMap<string, ReadonlySet<string>>;
  demandedTasks: ReadonlyMap<string, ReadonlySet<string>>;
}) => (
  <>
    {props.materializedBlok.agentMappings.flatMap(mapping => [
      <AgentConnectedSync key={`connected-${mapping.key}`} dependencyKey={mapping.key} connected={mapping.agent.connected !== false} />,
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

      // `with <key>`: the run gets the agents the dependencies declared under that key are
      // bound to here (`<key>__<dependency>`); one nobody bound resolves as it always does.
      const given = action.given;
      const prefix = given ? `${given}${REFERENCE_SEPARATOR}` : null;
      const pins = prefix
        ? [...agentIdByDependency].filter(([key]) => key.startsWith(prefix)).map(([key, agent]) => ({key: key.slice(prefix.length), agent}))
        : [];

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
            ...(pins.length > 0
              ? {
                  dependencies: pins.map(pin => ({
                    key: pin.key,
                    autoResolve: false,
                    mappedAgents: [{key: pin.key, agent: pin.agent}],
                  })),
                }
              : {}),
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

/** Keeps `assign` on the run being prepared, as its arguments are filled in. */
const AssignRecordSync = ({assign}: {assign: BlokAssignRecord}) => {
  const store = useBlokRuntimeStoreApi();
  const written = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    const key = JSON.stringify(assign);
    if (written.current === key) return;
    written.current = key;
    store.getState().setRuntimeValue(BLOK_ASSIGN_ROOT, assign);
  }, [assign, store]);
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

type DependencySet = {declared: DeclaredDependencies; use: DependencyUse; dependencies: readonly ActionDependency[]};

/**
 * The materialization with the dependencies its tree declares itself bound as this device
 * has them: each chosen agent among its mappings (as `<key>__<dependency>`), each one the
 * tree reads that is still open among its unbound.
 */
const withBindings = (
  materializedBlok: MaterializedBlokData,
  sets: readonly DependencySet[],
  bindings: BlokDependencyBindings,
  known: ReadonlyMap<string, {connected: boolean; name: string | null}>,
): MaterializedBlokData => {
  const bound: MaterializedBlokData['agentMappings'] = [];
  const open: string[] = [];
  for (const set of sets) {
    const picks = bindings.picks[set.declared.key] ?? {};
    for (const [name, agent] of Object.entries(picks)) {
      bound.push({
        key: referenceKey(set.declared.key, name),
        agent: {id: agent.id, name: known.get(agent.id)?.name ?? agent.name, connected: known.get(agent.id)?.connected},
      });
    }
    for (const name of set.use.read) if (!picks[name]) open.push(referenceKey(set.declared.key, name));
  }
  const prefixes = sets.map(set => referenceKey(set.declared.key, ''));
  const declared = (key: string) => prefixes.some(prefix => key.startsWith(prefix));
  return {
    ...materializedBlok,
    agentMappings: [...materializedBlok.agentMappings.filter(mapping => !declared(mapping.key)), ...bound],
    unboundDependencies: [...(materializedBlok.unboundDependencies ?? []).filter(key => !declared(key)), ...open],
  };
};

/** Asks which dependencies the action of one `<dependencies>` has, and tells its parent. */
const DependencySetResolver = (props: {
  declared: DeclaredDependencies;
  selfAgentId: string | undefined;
  onResolved: (key: string, dependencies: readonly ActionDependency[]) => void;
}) => {
  const {declared, selfAgentId, onResolved} = props;
  const dependencies = useActionDependencies(declared, selfAgentId);
  React.useEffect(() => onResolved(declared.key, dependencies), [declared.key, dependencies, onResolved]);
  return null;
};

export const MaterializedBlokRenderer = (props: MaterializedBlokRendererProps) => {
  const shown = shownContent(props.materializedBlok);
  const locals = React.useMemo(() => declaredLocals(shown), [shown]);
  const persistence = useBlokPersistence(props.materializedBlok.id, locals);
  const {roots} = useBlokDocument(shown.componentTree as unknown[] | null);
  const componentStore = useBlokComponentStore(props.materializedBlok.id);
  const bindings = useBlokDependencyBindings(roots, componentStore);
  // The kept locals and bindings are read before the first render, so the blok opens as it was left.
  if (persistence === undefined || bindings === undefined) return null;
  if (bindings.declared.length === 0) return <MaterializedBlokView {...props} persistence={persistence} />;
  return <BoundBlokView {...props} persistence={persistence} bindings={bindings} roots={roots} />;
};

/** Draws a blok whose tree declares dependencies, bound, seeded and picked on this device. */
const BoundBlokView = (
  props: MaterializedBlokRendererProps & {persistence: BlokPersistence | null; bindings: BlokDependencyBindings; roots: readonly unknown[]},
) => {
  const {bindings, roots, syncs, ...viewProps} = props;
  const {materializedBlok} = props;
  const outer = useBlokRunHost();
  // The agent whose action a declaration names: the blok's own, or one a custom blok is bound to.
  const ownerAgentId = (owner: string): string | undefined => materializedBlok.agentMappings.find(mapping => mapping.key === owner)?.agent.id;
  const [resolved, setResolved] = React.useState<Readonly<Record<string, readonly ActionDependency[]>>>({});
  const onResolved = React.useCallback(
    (key: string, dependencies: readonly ActionDependency[]) =>
      setResolved(current => (current[key] === dependencies ? current : {...current, [key]: dependencies})),
    [],
  );
  const sets = React.useMemo<DependencySet[]>(
    () => bindings.declared.map(declared => ({declared, use: dependencyUse(roots, declared.key), dependencies: resolved[declared.key] ?? []})),
    [bindings.declared, resolved, roots],
  );
  const known = usePickedAgents(bindings.picks);
  const bound = React.useMemo(() => withBindings(materializedBlok, sets, bindings, known), [bindings, known, materializedBlok, sets]);

  const picker = React.useCallback(
    (set: DependencySet, name: string, className?: string) => (
      <BlokDependencyPicker
        key={referenceKey(set.declared.key, name)}
        label={name}
        dependency={set.dependencies.find(dependency => dependency.key === name)}
        picked={bindings.picks[set.declared.key]?.[name]}
        onPick={agent => bindings.pick(set.declared.key, {[name]: agent})}
        className={className}
      />
    ),
    [bindings],
  );

  // `<deppicker key="cells.microscope" />` draws that one; `key="cells"` every other one of the set.
  const host = React.useMemo<BlokRunHost>(
    () => ({
      ...outer,
      renderDepPicker: (written: string) => {
        const [key, name] = written.split('.', 2);
        const set = sets.find(each => each.declared.key === key);
        if (!set) return null;
        if (name) return picker(set, name);
        return (
          <div className="flex flex-col gap-2">
            {set.dependencies
              .filter(dependency => !set.use.placed.has(dependency.key))
              .map(dependency => (
                <label key={dependency.key} className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {dependency.key}
                  {picker(set, dependency.key)}
                </label>
              ))}
          </div>
        );
      },
    }),
    [outer, picker, sets],
  );

  // `cells.pick(microscope: id)`: the viewer's choice, by agent id.
  const pickDependencies = React.useCallback(
    (key: string, picks: Record<string, unknown>) => {
      const agents: Record<string, PickedAgent> = {};
      for (const [name, id] of Object.entries(picks)) {
        if (typeof id === 'string' && id) agents[name] = {id, name: known.get(id)?.name ?? null};
      }
      bindings.pick(key, agents);
    },
    [bindings, known],
  );

  // A dependency the tree reads and offers no way to choose is still the viewer's to choose: shown above it.
  const unoffered = sets.flatMap(set =>
    set.use.rest ? [] : [...set.use.read].filter(name => !set.use.placed.has(name) && !set.use.listed.has(name)).map(name => ({set, name})),
  );
  const boundAs = bound.agentMappings
    .filter(mapping => mapping.key.includes(REFERENCE_SEPARATOR))
    .map(mapping => `${mapping.key}=${mapping.agent.id}`)
    .join('\u0000');
  const view = (
    <BlokRunHostProvider value={host}>
      <MaterializedBlokView
        {...viewProps}
        materializedBlok={bound}
        boundAs={boundAs}
        pickDependencies={pickDependencies}
        syncs={
          <>
            {syncs}
            {sets.flatMap(set =>
              set.dependencies
                .filter(dependency => set.use.listed.has(dependency.key))
                .map(dependency => (
                  <BlokDependencyOptionsSync
                    key={referenceKey(set.declared.key, dependency.key)}
                    reference={set.declared.key}
                    dependency={dependency}
                    picked={bindings.picks[set.declared.key]?.[dependency.key]}
                  />
                )),
            )}
          </>
        }
      />
    </BlokRunHostProvider>
  );
  return (
    <>
      {bindings.declared.map(declared => (
        <DependencySetResolver key={declared.key} declared={declared} selfAgentId={ownerAgentId(declared.owner)} onResolved={onResolved} />
      ))}
      {sets.flatMap(set =>
        set.dependencies
          .filter(dependency => set.use.read.has(dependency.key) && !bindings.picks[set.declared.key]?.[dependency.key])
          .map(dependency => (
            <BlokDependencySeed
              key={referenceKey(set.declared.key, dependency.key)}
              action={set.declared.action ?? ''}
              dependency={dependency}
              selfAgentId={ownerAgentId(set.declared.owner)}
              onSeed={agent => bindings.pick(set.declared.key, {[dependency.key]: agent})}
            />
          )),
      )}
      {unoffered.length === 0 ? (
        view
      ) : (
        <div className="flex h-full w-full flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
            {unoffered.map(({set, name}) => (
              <label key={referenceKey(set.declared.key, name)} className="flex items-center gap-2 text-xs text-muted-foreground">
                {name}
                {picker(set, name, 'h-8 w-56')}
              </label>
            ))}
          </div>
          <div className="min-h-0 flex-1">{view}</div>
        </div>
      )}
    </>
  );
};

const MaterializedBlokView = (
  props: MaterializedBlokRendererProps & {
    persistence: BlokPersistence | null;
    /** Which agents the dependencies its tree declares are bound to here: a change opens it again. */
    boundAs?: string;
    /** What `<key>.pick(...)` calls: binds dependencies the tree declares to agents. */
    pickDependencies?: (key: string, picks: Record<string, unknown>) => void;
  },
) => {
  const {materializedBlok, args, onArgsChange, task, onAnswer, onStart, onControl, assign, persistence, syncs, boundAs, pickDependencies, ...rendererProps} = props;
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
  // The reads are the tree's `<query>`/`<subscription>` children.
  const queries = React.useMemo(() => treeQueries(roots), [roots]);
  const subscriptions = React.useMemo(() => treeSubscriptions(roots), [roots]);
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
    const live = liveModel(roots);
    const deps = Object.fromEntries(
      materializedBlok.agentMappings.map(mapping => [
        mapping.key,
        {id: mapping.agent.id, name: mapping.agent.name ?? null, connected: mapping.agent.connected !== false, tasks: {}},
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
        ...(assign ? {[BLOK_ASSIGN_ROOT]: assign} : {}),
      },
      statuses: pending,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, roots, boundAs]);

  return (
    <RekuestSceneHost>
     <RekuestAssetHost agents={boundAgents}>
      <BlokRenderer
        // Opened again when what it keeps changes: the kept values seed a new runtime.
        key={`${persistence ? [...persistence.locals].join('\u0000') : ''}\u0001${boundAs ?? ''}`}
        {...rendererProps}
        uiComponents={roots}
        initialState={initialState}
        statuses={statuses}
        keptValues={persistence?.initial}
        keptLocals={persistence?.locals}
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
        startRun={onStart}
        // bsx before it knew `task.cancel()` and its kin takes no such prop.
        {...({controlTask: onControl} as object)}
        pickDependencies={pickDependencies}
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
        {assign && <AssignRecordSync assign={assign} />}
        {persistence && <BlokPersistSync persistence={persistence} />}
        {syncs}
      </BlokRenderer>
     </RekuestAssetHost>
    </RekuestSceneHost>
  );
};

export default MaterializedBlokRenderer;
