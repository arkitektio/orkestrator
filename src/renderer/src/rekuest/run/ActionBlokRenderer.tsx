import * as React from 'react';
import {BlokRunHostProvider, type BlokRunHost} from '@/core/blok/renderer/bloks/run';
import {useBlokRuntime} from '@/core/blok/renderer/runtime';
import type {ActionBlokFragment, RunTaskFragment} from '../api/graphql';
import type {BlokArgs} from '../components/blokArgs';
import {MaterializedBlokRenderer} from '../components/MaterializedBlokRenderer';
import {HoldCard} from '../components/task/HoldCard';
import {agentMappingsOf, agentsByKey, type RunBinding, type RunBoundAgent} from './binding';
import {IDLE_TASK_ROOT, openAsks, taskRoot, type TaskRoot} from './taskRoot';

/**
 * An action's own blok, drawn for one run of it: its dependency keys bound to
 * the agents the run got, `@self` to the agent running it, `@task` following
 * the task and `@args` what it was started with. Before a run (a preview) the
 * keys come from the dry run and `@task` stays idle, or as the blok's
 * demo state has it.
 */

/** What an action's blok is drawn for. */
export type ActionBlokRun = {
  binding: RunBinding;
  /** The agent running the action (`@self`); null when not known yet. */
  self: RunBoundAgent | null;
  /** The run; null for a preview. */
  task: RunTaskFragment | null;
};

/** The root `@task` is kept under. */
export const TASK_ROOT = 'task';

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

/** The run's open ask, newest, answered in place: answering resumes the run. */
export const RunAsk = ({task}: {task: RunTaskFragment}) => {
  const asks = React.useMemo(() => openAsks(task), [task]);
  const hold = asks.at(-1);
  if (!hold || task.isDone) return null;
  return <HoldCard key={hold.task} hold={hold} />;
};

const AskPlaceholder = () => (
  <div className="rounded-xl border border-dashed border-amber-500/40 px-3 py-2 text-xs text-muted-foreground">
    When the run asks something, it is answered here.
  </div>
);

/**
 * The run host the run components (`At`, `Route`, `TaskAsk`) read, for `run`.
 * `showAsk: false` leaves `TaskAsk` empty where the page shows the run's asks already.
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

const sameRoot = (a: TaskRoot | undefined, b: TaskRoot): boolean =>
  a !== undefined && (Object.keys(b) as Array<keyof TaskRoot>).every(key => a[key] === b[key]);

/** Keeps `@task` on the run as it moves, written only when something it shows changed. */
const TaskSync = ({task}: {task: RunTaskFragment}) => {
  const setRuntimeValue = useBlokRuntime(state => state.setRuntimeValue);
  const clearRuntimeValue = useBlokRuntime(state => state.clearRuntimeValue);
  const root = React.useMemo(() => taskRoot(task), [task]);
  const written = React.useRef<TaskRoot | undefined>(undefined);
  React.useEffect(() => {
    if (sameRoot(written.current, root)) return;
    written.current = root;
    setRuntimeValue(TASK_ROOT, root);
  }, [root, setRuntimeValue]);
  React.useEffect(
    () => () => {
      written.current = undefined;
      clearRuntimeValue(TASK_ROOT);
    },
    [clearRuntimeValue],
  );
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Its locals, with `@task` idle unless the blok's demo state says how a run looks. */
const demoStateOf = (demoState: unknown): Record<string, unknown> => {
  const state = isRecord(demoState) ? demoState : {};
  return TASK_ROOT in state ? state : {...state, [TASK_ROOT]: IDLE_TASK_ROOT};
};

type ActionBlokRendererProps = Omit<
  React.ComponentProps<typeof MaterializedBlokRenderer>,
  'materializedBlok' | 'args' | 'onArgsChange' | 'ask' | 'onReturn' | 'syncs'
> & {
  actionBlok: ActionBlokFragment;
  run: ActionBlokRun;
  /** Whether `TaskAsk` shows the run's open ask; off where the page shows it already. */
  showAsk?: boolean;
};

export const ActionBlokRenderer = ({actionBlok, run, showAsk, ...rendererProps}: ActionBlokRendererProps) => {
  const materializedBlok = React.useMemo(
    () => ({
      // Its kept locals are its own, never those of a materialization with the same number.
      id: `action-blok:${actionBlok.id}`,
      blok: {
        componentTree: actionBlok.blok.componentTree,
        demoState: demoStateOf(actionBlok.blok.demoState),
        persist: actionBlok.blok.persist,
      },
      revision: null,
      agentMappings: agentMappingsOf(run.binding, run.self),
    }),
    [actionBlok, run.binding, run.self],
  );
  const args = React.useMemo<BlokArgs | undefined>(
    () => (run.task && isRecord(run.task.args) ? run.task.args : undefined),
    [run.task],
  );
  return (
    <RunHost run={run} showAsk={showAsk}>
      <MaterializedBlokRenderer
        {...rendererProps}
        materializedBlok={materializedBlok}
        args={args}
        syncs={run.task ? <TaskSync task={run.task} /> : null}
      />
    </RunHost>
  );
};

export default ActionBlokRenderer;
