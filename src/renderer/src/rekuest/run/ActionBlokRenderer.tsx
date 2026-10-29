import * as React from 'react';
import {dependencyKeysRead} from '@arkitektio/bsx/bsx/infer';
import {normalizeBlokArgument, normalizeBlokComponentTree, type BlokActionArgument, type BlokComponentNode} from '@arkitektio/bsx/renderer/runtime/index';
import {BlokRunHostProvider, type BlokRunHost} from '@arkitektio/bsx/renderer/bloks/run/index';
import {TaskEventKind, useDecideMutation, type ActionBlokFragment, type RunTaskFragment} from '../api/graphql';
import type {BlokArgs} from '../components/blokArgs';
import {MaterializedBlokRenderer} from '../components/MaterializedBlokRenderer';
import {HoldCard} from '../components/task/HoldCard';
import {askClosed} from '../lib/holds';
import {agentMappingsOf, agentsByKey, type RunBinding, type RunBoundAgent} from './binding';
import {useBlokTravelMoment} from '../travel/context';
import {parseTimestamp} from '../travel/travelSource';
import {shownAsk, taskRecordOf} from './taskRoot';

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
  return <HoldCard key={hold.task} hold={hold} closed={askClosed(task)} />;
};

const AskPlaceholder = () => (
  <div className="rounded-xl border border-dashed border-amber-500/40 px-3 py-2 text-xs text-muted-foreground">
    When the run asks something, it is answered here.
  </div>
);

/**
 * The run host the run components (`Anchor`, `Route`, `ask`) read, for `run`.
 * `showAsk: false` leaves `ask` empty where the page shows the run's asks already.
 */
export const useRunHost = (run: ActionBlokRun, showAsk = true): BlokRunHost => {
  const byKey = React.useMemo(() => agentsByKey(run.binding, run.self), [run.binding, run.self]);
  const task = run.task;
  return React.useMemo<BlokRunHost>(
    () => ({
      agentsFor: key => byKey.get(key) ?? [],
      renderAsk: () => (!showAsk ? null : task ? <RunAsk task={task} /> : <AskPlaceholder />),
    }),
    [byKey, showAsk, task],
  );
};

/** Provides the run to what is below: the scene surface a space draws the overlay into, or an html blok. */
export const RunHost = ({run, showAsk, children}: {run: ActionBlokRun; showAsk?: boolean; children: React.ReactNode}) => (
  <BlokRunHostProvider value={useRunHost(run, showAsk)}>{children}</BlokRunHostProvider>
);

/** A normalized root that is a node (the normalizer passes anything else through, for preflight to refuse). */
const isComponentNode = (value: unknown): value is BlokComponentNode =>
  typeof value === 'object' && value !== null && typeof (value as {id?: unknown}).id === 'string' && typeof (value as {component?: unknown}).component === 'string';

/** The dependency keys `actionBlok`'s tree reads that `binding` binds to no agent. */
export const unboundOfRun = (actionBlok: ActionBlokFragment, binding: RunBinding): string[] => {
  const {roots} = normalizeBlokComponentTree(actionBlok.blok.componentTree as unknown[] | null);
  const variables = [...(actionBlok.blok.queries ?? []), ...(actionBlok.blok.subscriptions ?? [])].flatMap(read =>
    (Array.isArray(read.variables) ? read.variables : []).map(argument => normalizeBlokArgument(argument) as BlokActionArgument),
  );
  const bound = new Set(binding.map(({key}) => key));
  const nodes = roots.filter(isComponentNode);
  return dependencyKeysRead(nodes, variables).filter(key => !bound.has(key));
};

/** Whether `actionBlok`'s tree draws the run's open ask itself (an `<ask />` anywhere in it). */
export const drawsAsk = (actionBlok: ActionBlokFragment): boolean => {
  const {roots} = normalizeBlokComponentTree(actionBlok.blok.componentTree as unknown[] | null);
  const visit = (node: unknown): boolean =>
    isComponentNode(node) && (node.component === 'ask' || (Array.isArray(node.children) && node.children.some(visit)));
  return roots.some(visit);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `task.answer(values)`: the ask `task.ask` shows, approved with what the blok answered. */
const useAnswerShownAsk = (task: RunTaskFragment | null): ((values: Record<string, unknown>) => Promise<unknown>) | undefined => {
  const [decide] = useDecideMutation();
  // A run being stopped takes no answer.
  const held = React.useMemo(() => (task && !askClosed(task) ? shownAsk(task)?.task : undefined), [task]);
  return React.useMemo(
    () => (held ? (values: Record<string, unknown>) => decide({variables: {input: {task: held, approved: true, values}}}) : undefined),
    [decide, held],
  );
};

type ActionBlokRendererProps = Omit<
  React.ComponentProps<typeof MaterializedBlokRenderer>,
  'materializedBlok' | 'args' | 'onArgsChange' | 'task' | 'onAnswer' | 'syncs'
> & {
  actionBlok: ActionBlokFragment;
  run: ActionBlokRun;
  /** Whether `ask` shows the run's open ask; off where the page shows it already. */
  showAsk?: boolean;
};

export const ActionBlokRenderer = ({actionBlok, run, showAsk, ...rendererProps}: ActionBlokRendererProps) => {
  const materializedBlok = React.useMemo(
    () => ({
      // Its kept locals are its own, never those of a materialization with the same number.
      id: `action-blok:${actionBlok.id}`,
      blok: {
        componentTree: actionBlok.blok.componentTree,
        vocab: actionBlok.blok.vocab,
        resolvedLocals: actionBlok.blok.resolvedLocals,
        demo: actionBlok.blok.demo,
        queries: actionBlok.blok.queries,
        subscriptions: actionBlok.blok.subscriptions,
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
    () => (run.task && isRecord(run.task.args) ? run.task.args : undefined),
    [run.task],
  );
  const moment = useBlokTravelMoment();
  const task = React.useMemo(() => {
    if (!run.task) {
      const demo = isRecord(actionBlok.blok.demo) && isRecord(actionBlok.blok.demo.task) ? actionBlok.blok.demo.task : null;
      return demo ? {...taskRecordOf({id: '', latestEventKind: TaskEventKind.Queued, isDone: false, events: []}), ...demo} : null;
    }
    const at = moment === null ? undefined : parseTimestamp(moment);
    return taskRecordOf(run.task, at);
  }, [actionBlok.blok.demo, moment, run.task]);
  const answer = useAnswerShownAsk(run.task);
  return (
    <RunHost run={run} showAsk={showAsk}>
      <MaterializedBlokRenderer
        {...rendererProps}
        materializedBlok={materializedBlok}
        args={args}
        task={task}
        // `task.answer` answers the ask `task.ask` shows; the past is not answered.
        onAnswer={moment === null ? answer : undefined}
      />
    </RunHost>
  );
};

export default ActionBlokRenderer;
