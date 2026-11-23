import * as React from 'react';
import {useTaskCalls} from '../session/calls';
import {dependencyKeysRead} from '@arkitektio/bsx/bsx/infer';
import {normalizeBlokComponentTree, type BlokComponentNode, type BlokTaskRecord} from '@arkitektio/bsx/renderer/runtime/index';
import {BlokRunHostProvider, type BlokRunHost} from '@arkitektio/bsx/renderer/bloks/run/index';
import {ActionBlokPhase, TaskEventKind, type ActionBlokFragment, type RunTaskFragment} from '../api/graphql';
import type {BlokArgs} from '../components/blokArgs';
import {MaterializedBlokRenderer, type BlokAssignRecord} from '../components/MaterializedBlokRenderer';
import {HoldCard} from '../components/task/HoldCard';
import {PlacedTimeSlider} from '../components/spaces/task/panels/TimeSlider';
import {askClosed, holdKey} from '../lib/holds';
import {agentMappingsOf, agentsByKey, type RunBinding, type RunBoundAgent} from './binding';
import {useBlokTravelMoment} from '../travel/context';
import {parseTimestamp} from '../travel/travelSource';
import {shownAsk, taskRecordOf} from './taskRoot';
import {RoomHost} from './space/RoomHost';
import {useTaskControl} from './taskControl';
import {RunReturns, RunStatus} from './TaskParts';

/**
 * An action's own blok, drawn for one run of it: its dependency keys bound to
 * the agents the run got (`deps.<key>`), `self` the agent running it, `task`
 * following the task (the one task record, at the viewed moment while
 * travelling) and `args` what it was started with. Before a run (a preview)
 * the keys come from the dry run and `task` is as the blok's `demo.task` has
 * it, else idle.
 */

/** What an action's blok is drawn for. */
export type ActionBlokRun = {
  binding: RunBinding;
  /** The agent running the action (`self`); null when not known yet. */
  self: RunBoundAgent | null;
  /** The run; null for a preview. */
  task: RunTaskFragment | null;
};

/** The run as `Task.dependencyAgents` and `Task.implementation` describe it. */
export const runOfTask = (task: RunTaskFragment): ActionBlokRun => ({
  binding: task.dependencyAgents.map(({key, agent}) => ({
    key,
    agent: {id: agent.id, name: agent.name, connected: agent.connected},
  })),
  self: task.implementation?.agent
    ? {
        id: task.implementation.agent.id,
        name: task.implementation.agent.name,
        connected: task.implementation.agent.connected,
      }
    : null,
  task,
});

/** The ask `task.ask` shows, answered in place: answering resumes the run. Grayed while the run is being stopped. */
export const RunAsk = ({task}: {task: RunTaskFragment}) => {
  const hold = React.useMemo(() => shownAsk(task), [task]);
  if (!hold) return null;
  return <HoldCard key={holdKey(hold)} hold={hold} closed={askClosed(task)} />;
};

const AskPlaceholder = () => (
  <div className="rounded-xl border border-dashed border-warning/40 px-3 py-2 text-xs text-muted-foreground">
    When the run asks something, it is answered here.
  </div>
);

const TimelinePlaceholder = () => (
  <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
    The run's time slider shows here.
  </div>
);

/** How an `<args />` narrows the form it draws. */
export type ArgsOptions = {only?: readonly string[]; omit?: readonly string[]; given?: 'hide' | 'show'};

/** What an assign blok places of the form that starts the run, one part each. */
export type AssignParts = {
  /** `<args />`: the rest of the argument form. */
  renderArgs?: (options?: ArgsOptions) => React.ReactNode;
  /** `<arg key />`: one argument. */
  renderArg?: (key: string) => React.ReactNode;
  /** `<deps />`: the rest of the dependency picker. */
  renderDeps?: () => React.ReactNode;
  /** `<dep key />`: the picker of one dependency. */
  renderDep?: (key: string) => React.ReactNode;
};

/** The run host with the parts a blok may place (bsx before it knew them has no such fields). */
type RunHost = BlokRunHost &
  AssignParts & {
    renderTimeline?: () => React.ReactNode;
    renderReturns?: (options?: Pick<ArgsOptions, 'only' | 'omit'>) => React.ReactNode;
    renderStatus?: () => React.ReactNode;
  };

/**
 * The run host the run components (`Placed`, `Route`, `ask`) read, for `run`.
 * `showAsk: false` leaves `ask` empty where the page shows the run's asks already.
 */
export const useRunHost = (run: ActionBlokRun, showAsk = true, parts?: AssignParts): BlokRunHost => {
  const byKey = React.useMemo(() => agentsByKey(run.binding, run.self), [run.binding, run.self]);
  const task = run.task;
  const taskId = task?.id;
  return React.useMemo<RunHost>(
    () => ({
      agentsFor: key => byKey.get(key) ?? [],
      renderAsk: () => (!showAsk ? null : task ? <RunAsk task={task} /> : <AskPlaceholder />),
      // The task's clock is the page's: off a task page there is none, and nothing shows.
      renderTimeline: () => (task ? <PlacedTimeSlider /> : <TimelinePlaceholder />),
      // `<returns />` and `<status />`: nothing before there is a run.
      renderReturns: options => (taskId ? <RunReturns taskId={taskId} only={options?.only} omit={options?.omit} /> : null),
      renderStatus: () => (taskId ? <RunStatus taskId={taskId} /> : null),
      ...parts,
    }),
    [byKey, parts, showAsk, task, taskId],
  );
};

/** Provides the run to what is below: an action's Space (its `Placed` devices) or an html blok. */
export const RunHost = ({
  run,
  showAsk,
  parts,
  children,
}: {
  run: ActionBlokRun;
  showAsk?: boolean;
  /** What an assign blok places of the form that starts the run; the same object while nothing changed. */
  parts?: AssignParts;
  children: React.ReactNode;
}) => <BlokRunHostProvider value={useRunHost(run, showAsk, parts)}>{children}</BlokRunHostProvider>;

/** Whether `actionBlok`'s tree holds a `component` anywhere (`args`), or calls an effect (`assign.start`). */
export const blokHolds = (actionBlok: ActionBlokFragment, component: string | null, effect: string | null = null): boolean => {
  const {roots} = normalizeBlokComponentTree(actionBlok.blok.componentTree as unknown[] | null);
  const visit = (node: unknown): boolean => {
    if (!isComponentNode(node)) return false;
    if (component !== null && node.component === component) return true;
    if (effect !== null && (node.props ?? []).some(prop => prop.util_call?.operation === effect)) return true;
    return Array.isArray(node.children) && node.children.some(visit);
  };
  return roots.some(visit);
};

/** A normalized root that is a node (the normalizer passes anything else through, for preflight to refuse). */
const isComponentNode = (value: unknown): value is BlokComponentNode =>
  typeof value === 'object' && value !== null && typeof (value as {id?: unknown}).id === 'string' && typeof (value as {component?: unknown}).component === 'string';

/** The dependency keys `actionBlok`'s tree reads (its query variables too: `<var>` nodes) that `binding` binds to no agent. */
export const unboundOfRun = (actionBlok: ActionBlokFragment, binding: RunBinding): string[] => {
  const {roots} = normalizeBlokComponentTree(actionBlok.blok.componentTree as unknown[] | null);
  const bound = new Set(binding.map(({key}) => key));
  return dependencyKeysRead(roots.filter(isComponentNode)).filter(key => !bound.has(key));
};

/** Whether `actionBlok`'s tree draws the run's open ask itself (an `<ask />` anywhere in it). */
export const drawsAsk = (actionBlok: ActionBlokFragment): boolean => {
  const {roots} = normalizeBlokComponentTree(actionBlok.blok.componentTree as unknown[] | null);
  const visit = (node: unknown): boolean =>
    isComponentNode(node) && (node.component === 'ask' || (Array.isArray(node.children) && node.children.some(visit)));
  return roots.some(visit);
};

const staticKeys = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((key): key is string => typeof key === 'string')
    : typeof value === 'string'
      ? value.split(/[\s,]+/).filter(Boolean)
      : [];

/**
 * The keys `actionBlok`'s tree places itself, out of `all`: one by one with
 * `single` (`<arg key />`), and the rest with `rest` (`<args />`, narrowed by
 * its `only` / `omit`). What it leaves out is the host's to draw. A key or a
 * narrowing that is computed is taken as placed: the blok knows what it draws.
 */
export const keysPlaced = (actionBlok: ActionBlokFragment, single: string, rest: string, all: readonly string[]): Set<string> => {
  const {roots} = normalizeBlokComponentTree(actionBlok.blok.componentTree as unknown[] | null);
  const placed = new Set<string>();
  const prop = (node: BlokComponentNode, key: string) => (node.props ?? []).find(candidate => candidate.key === key);
  const visit = (node: unknown): void => {
    if (!isComponentNode(node)) return;
    if (node.component === single) {
      const key = prop(node, 'key');
      if (typeof key?.static_value === 'string') placed.add(key.static_value);
    }
    if (node.component === rest) {
      const only = prop(node, 'only');
      const omit = prop(node, 'omit');
      const computed = (found: typeof only) => found !== undefined && found.static_value === undefined;
      if (computed(only) || computed(omit)) all.forEach(key => placed.add(key));
      else {
        const left = new Set(staticKeys(omit?.static_value));
        (only ? staticKeys(only.static_value) : all).filter(key => !left.has(key)).forEach(key => placed.add(key));
      }
    }
    if (Array.isArray(node.children)) node.children.forEach(visit);
  };
  roots.forEach(visit);
  return placed;
};

/** Whether a stored tree holds `component` anywhere. */
export const treeHolds = (componentTree: unknown, component: string): boolean => {
  const {roots} = normalizeBlokComponentTree(componentTree as unknown[] | null);
  const visit = (node: unknown): boolean =>
    isComponentNode(node) && (node.component === component || (Array.isArray(node.children) && node.children.some(visit)));
  return roots.some(visit);
};

/**
 * How much the host draws around a blok of its own, as its root says
 * (`<Blok chrome="none">`): `none` adds nothing the blok could place itself.
 */
export const chromeOf = (componentTree: unknown): 'auto' | 'none' => {
  const {roots} = normalizeBlokComponentTree(componentTree as unknown[] | null);
  const root = roots.find(isComponentNode);
  return (root?.props ?? []).some(prop => prop.key === 'chrome' && prop.static_value === 'none') ? 'none' : 'auto';
};

/** Whether `actionBlok`'s tree places the run's time slider itself (a `<timeline />` anywhere in it). */
export const drawsTimeline = (actionBlok: ActionBlokFragment): boolean => blokHolds(actionBlok, 'timeline');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `task.answer(values)`: the ask `task.ask` shows, approved with what the blok answered. */
const useAnswerShownAsk = (task: RunTaskFragment | null): ((values: Record<string, unknown>) => Promise<unknown>) | undefined => {
  const {decide} = useTaskCalls();
  // A run being stopped takes no answer.
  const held = React.useMemo(() => (task && !askClosed(task) ? shownAsk(task)?.task : undefined), [task]);
  return React.useMemo(
    () => (held ? (values: Record<string, unknown>) => decide({task: held, approved: true, values}) : undefined),
    [decide, held],
  );
};

type ActionBlokRendererProps = Omit<
  React.ComponentProps<typeof MaterializedBlokRenderer>,
  'materializedBlok' | 'args' | 'onArgsChange' | 'task' | 'onAnswer' | 'onStart' | 'syncs'
> & {
  actionBlok: ActionBlokFragment;
  run: ActionBlokRun;
  /** Whether `ask` shows the run's open ask; off where the page shows it already. */
  showAsk?: boolean;
  /** An assign blok: the arguments as they are being filled in (`args.<key>`), before there is a task. */
  args?: BlokArgs;
  /** An assign blok: what `<args />`, `<arg />`, `<deps />` and `<dep />` draw. */
  parts?: AssignParts;
  /** An assign blok: the run it prepares, read as `assign`. */
  assign?: BlokAssignRecord;
  /** An assign blok: starts the run (`assign.start()`). */
  onStart?: () => unknown;
};

export const ActionBlokRenderer = ({actionBlok, run, showAsk, args: filling, parts, assign, onStart, ...rendererProps}: ActionBlokRendererProps) => {
  const assigning = actionBlok.phase === ActionBlokPhase.Assign;
  const materializedBlok = React.useMemo(
    () => ({
      // Its kept locals are its own, never those of a materialization with the same number.
      id: `action-blok:${actionBlok.id}`,
      blok: {
        componentTree: actionBlok.blok.componentTree,
        vocab: actionBlok.blok.vocab,
        resolvedLocals: actionBlok.blok.resolvedLocals,
        demo: actionBlok.blok.demo,
      },
      revision: null,
      agentMappings: agentMappingsOf(run.binding, run.self),
      // A run's binding is final: a key its tree reads that the run left unbound (an optional
      // dependency left out) reads as failed, `deps.unbound`. A preview's binding is still coming.
      unboundDependencies: run.task ? unboundOfRun(actionBlok, run.binding) : [],
    }),
    [actionBlok, run.binding, run.self, run.task],
  );
  const args = React.useMemo<BlokArgs | undefined>(
    () => (run.task && isRecord(run.task.args) ? run.task.args : filling),
    [filling, run.task],
  );
  const moment = useBlokTravelMoment();
  const {can, control} = useTaskControl(assigning ? null : run.task, moment !== null);
  const task = React.useMemo(() => {
    // Before a run there is no task at all: an assign blok has no `task` root.
    if (assigning) return null;
    if (!run.task) {
      const demo = isRecord(actionBlok.blok.demo) && isRecord(actionBlok.blok.demo.task) ? actionBlok.blok.demo.task : null;
      return demo ? {...taskRecordOf({id: '', latestEventKind: TaskEventKind.Queued, isDone: false, events: []}), ...demo} : null;
    }
    const at = moment === null ? undefined : parseTimestamp(moment);
    // `task.can`: what the viewer may do to the run now; nothing in the past.
    return {...taskRecordOf(run.task, at), can};
  }, [actionBlok.blok.demo, assigning, can, moment, run.task]);
  const answer = useAnswerShownAsk(run.task);
  return (
    <RunHost run={run} showAsk={showAsk} parts={parts}>
      {/* A Space's plain `room` key is the declaring app's. */}
      <RoomHost app={actionBlok.blok.app?.identifier}>
        <MaterializedBlokRenderer
          {...rendererProps}
          materializedBlok={materializedBlok}
          args={args}
          // bsx before it knew a paused run has no such status.
          task={task as BlokTaskRecord | null}
          // `task.answer` answers the ask `task.ask` shows; the past is not answered.
          onAnswer={moment === null ? answer : undefined}
          onStart={onStart}
          onControl={control}
          assign={assigning ? assign : undefined}
        />
      </RoomHost>
    </RunHost>
  );
};

export default ActionBlokRenderer;
