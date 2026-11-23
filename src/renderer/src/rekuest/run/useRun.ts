import * as React from 'react';
import {
  ComponentContext,
  useRunTaskQuery,
  WatchTaskEventsDocument,
  type ActionBlokFragment,
  type RunTaskFragment,
  type WatchTaskEventsSubscription,
  type WatchTaskEventsSubscriptionVariables,
} from '../api/graphql';
import {useRekuest} from '../api/hooks';
import {createTaskEventQueue} from '../lib/taskCache';
import {taskEventChangeToEvent} from '../lib/taskTracker';
import {toTaskEventChange, type TaskSnapshot, type WireTaskEvent} from '../session/frames';
import {useFeedSource, useRekuestSession} from '../session/hooks';
import {runOfTask, type ActionBlokRun} from './ActionBlokRenderer';

/**
 * A run as its action's bloks draw it; null until it is read. The viewer's own
 * runs follow every event through the cache (the global task updater writes
 * them). `follow` also streams this one task's events while it goes on
 * (`taskEvents`), for a run that may be someone else's: only the events newer
 * than what was read arrive, and each is merged into the cached task.
 */
export const useRunTask = (
  id: string | null | undefined,
  {follow = false}: {follow?: boolean} = {},
): {task: RunTaskFragment | null; error?: Error} => {
  const client = useRekuest();
  const session = useRekuestSession();
  const source = useFeedSource(session);
  const {data, error, refetch} = useRunTaskQuery({variables: {id: id ?? ''}, skip: !id});
  const task = data?.task ?? null;
  const ended = task?.isDone ?? false;
  const loaded = task !== null;
  // The newest event read (events are ordered newest first), kept for when the
  // stream opens; updated in an effect, which runs before the one below. Its
  // number (`taskSeq`) is the safe cursor; the id the fallback for a server
  // older than it.
  const newest = React.useRef<{id: string | null; seq: number | null}>({id: null, seq: null});
  const newestId = task?.events[0]?.id ?? null;
  const newestSeq = task?.events[0]?.taskSeq ?? null;
  React.useEffect(() => {
    newest.current = {id: newestId, seq: newestSeq};
  }, [newestId, newestSeq]);
  const refetchRef = React.useRef(refetch);
  refetchRef.current = refetch;
  React.useEffect(() => {
    if (!follow || !id || !loaded || ended || error || !client || source === 'pending') {
      return undefined;
    }
    // A task not in the cache any more has nothing to merge into: the query
    // above reads it again.
    const queue = createTaskEventQueue(client, () => undefined);
    const push = (item: WireTaskEvent) => {
      const change = toTaskEventChange(item);
      queue.push(change, taskEventChangeToEvent(change));
    };
    let stop: () => void;
    if (source === 'session') {
      // The task's events over the window's session: gap-free, and resumed with what
      // was missed after a drop.
      stop = session.watch(`task:${id}`, {
        onData: (item) => push(item as WireTaskEvent),
        onResync: (snapshot, reason) => {
          if (reason !== 'new') {
            // Too far behind to replay: the task as it is now.
            void refetchRef.current();
            return;
          }
          // What happened between the query and the watch.
          const after = newest.current.seq ?? 0;
          for (const event of (snapshot as TaskSnapshot).events) {
            if ((event.task_seq ?? 0) > after) push(event);
          }
        },
      });
    } else {
      const {id: afterId, seq: afterSeq} = newest.current;
      const subscription = client
        .subscribe<WatchTaskEventsSubscription, WatchTaskEventsSubscriptionVariables>({
          query: WatchTaskEventsDocument,
          variables: afterSeq != null ? {task: id, afterSeq} : {task: id, after: afterId},
        })
        .subscribe(({data: next}) => {
          const change = next?.taskEvents;
          if (change) queue.push(change, taskEventChangeToEvent(change));
        });
      stop = () => subscription.unsubscribe();
    }
    return () => {
      stop();
      queue.flush();
    };
  }, [client, ended, error, follow, id, loaded, session, source]);
  return {task, error};
};

/** The action's blok for `context`, if it declared one. */
export const actionBlokFor = (
  bloks: readonly ActionBlokFragment[] | null | undefined,
  context: ComponentContext,
): ActionBlokFragment | null => bloks?.find(blok => blok.context === context) ?? null;

/** An action's blok for one context, bound to a run (or a preview). */
export type ShownRun = {actionBlok: ActionBlokFragment; run: ActionBlokRun};

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
export const useTaskActionBlok = (task: RunTaskFragment | null, context: ComponentContext): ShownRun | null => {
  const run = useRunOfTask(task);
  const actionBlok = actionBlokFor(task?.actionBloks, context);
  return React.useMemo(() => (run && actionBlok ? {actionBlok, run} : null), [actionBlok, run]);
};
