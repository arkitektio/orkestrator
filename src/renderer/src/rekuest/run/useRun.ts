import * as React from 'react';
import {
  ComponentContext,
  useRunTaskQuery,
  useSpacesForAgentsQuery,
  type ActionBlokFragment,
  type RunTaskFragment,
} from '../api/graphql';
import {runOfTask, type ActionBlokRun} from './ActionBlokRenderer';

/**
 * How often a run that is not one of the viewer's own is read again while it
 * goes on. The viewer's own runs move with every event (the global task
 * updater writes them into the cache); another person's run has no stream
 * here, so it is polled.
 */
export const RUN_POLL_MS = 5_000;

/**
 * A run as its action's bloks draw it; null until it is read. The viewer's own
 * runs follow every event through the cache. `follow` also polls while the run
 * goes on, for a run that may be someone else's (a space opened on a run):
 * each poll reads its whole event history, so only one place should ask.
 */
export const useRunTask = (
  id: string | null | undefined,
  {follow = false}: {follow?: boolean} = {},
): {task: RunTaskFragment | null; error?: Error} => {
  const {data, error, startPolling, stopPolling} = useRunTaskQuery({variables: {id: id ?? ''}, skip: !id});
  const task = data?.task ?? null;
  const ended = task?.isDone ?? false;
  React.useEffect(() => {
    if (!follow || !id || ended || error) {
      stopPolling();
      return undefined;
    }
    startPolling(RUN_POLL_MS);
    return () => stopPolling();
  }, [ended, error, follow, id, startPolling, stopPolling]);
  return {task, error};
};

/** The action's blok for `context`, if it declared one. */
export const actionBlokFor = (
  bloks: readonly ActionBlokFragment[] | null | undefined,
  context: ComponentContext,
): ActionBlokFragment | null => bloks?.find(blok => blok.context === context) ?? null;

/** What a space draws for a run: the action's overlay, bound to the run. */
export type SpaceRun = {actionBlok: ActionBlokFragment; run: ActionBlokRun};

/**
 * A task's run, kept the same object while what it binds stays the same: the
 * task itself changes with every event, its binding does not.
 */
export const useRunOfTask = (task: RunTaskFragment | null): ActionBlokRun | null => {
  const bound = task ? runOfTask(task) : null;
  const key = bound ? JSON.stringify([bound.binding, bound.self]) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const binding = React.useMemo(() => bound?.binding ?? [], [key]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const self = React.useMemo(() => bound?.self ?? null, [key]);
  return React.useMemo(() => (task ? {binding, self, task} : null), [binding, self, task]);
};

/** The action's blok for `context` bound to the task, once it is read; null for an action without one. */
export const useTaskActionBlok = (task: RunTaskFragment | null, context: ComponentContext): SpaceRun | null => {
  const run = useRunOfTask(task);
  const actionBlok = actionBlokFor(task?.actionBloks, context);
  return React.useMemo(() => (run && actionBlok ? {actionBlok, run} : null), [actionBlok, run]);
};

/** The spaces placing the most of `agents`, best first; empty while there are no agents or it is read. */
export const useSpacesForAgents = (agents: readonly string[]) => {
  const key = [...agents].sort().join(',');
  const sorted = React.useMemo(() => (key ? key.split(',') : []), [key]);
  const {data, loading, error} = useSpacesForAgentsQuery({variables: {agents: sorted}, skip: sorted.length === 0});
  return {spaces: data?.spacesForAgents ?? [], loading, error};
};
