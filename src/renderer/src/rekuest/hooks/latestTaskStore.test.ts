import {describe, expect, it, vi} from 'vitest';
import {TaskEventKind} from '../api/graphql';
import {createLiveStateStore, type LiveStateEvent} from './liveStateStore';
import {
  foldLatestTask,
  subscribeLatestTask,
  type LatestTaskMessage,
  type LatestTaskState,
} from './latestTaskStore';

const snapshot = (
  task: {id: string; isDone?: boolean; latestEventKind?: TaskEventKind} | null,
  events: Array<Omit<Extract<LatestTaskMessage, {__typename: 'TaskEventChange'}>, '__typename'>> = [],
  implementation: string | null = '7',
): LatestTaskMessage => ({
  __typename: 'LatestTaskSnapshot',
  implementation,
  latest: task && {isDone: false, latestEventKind: TaskEventKind.Started, ...task},
  events,
});

const progress = (task: string, value: number, message = ''): LatestTaskMessage => ({
  __typename: 'TaskEventChange',
  task,
  kind: TaskEventKind.Progress,
  progress: value,
  message,
});

const row = (id: string, isDone = false, latestEventKind = TaskEventKind.Started): LatestTaskMessage => ({
  __typename: 'TaskChange',
  id,
  isDone,
  latestEventKind,
});

const fold = (...messages: LatestTaskMessage[]): LatestTaskState | null =>
  messages.reduce<LatestTaskState | null>(foldLatestTask, null);

describe('the latest task of an action, folded from its feed', () => {
  it('is idle for an action that never ran, and says when a name is no action', () => {
    expect(fold(snapshot(null))).toMatchObject({implementation: '7', task: null, record: {status: 'idle'}});
    expect(fold(snapshot(null, [], null))?.implementation).toBeNull();
  });

  it('starts from what the task had reported when it was asked for', () => {
    const held = fold(
      snapshot({id: '4'}, [
        {task: '4', kind: TaskEventKind.Yield, returns: {count: 3}},
        {task: '4', kind: TaskEventKind.Progress, progress: 60, message: '6 of 10'},
      ]),
    );
    expect(held).toMatchObject({
      task: '4',
      record: {status: 'running', running: true, progress: 60, message: '6 of 10', returns: {count: 3}},
    });
  });

  it('follows the task it holds and ends with it', () => {
    const held = fold(snapshot({id: '4'}), progress('4', 30), progress('4', 80, 'nearly'), {
      __typename: 'TaskEventChange',
      task: '4',
      kind: TaskEventKind.Completed,
      returns: {count: 9},
    });
    expect(held?.record).toMatchObject({status: 'done', done: true, running: false, progress: 100, returns: {count: 9}});
  });

  it('moves on to a task that starts, and forgets the one before', () => {
    const held = fold(snapshot({id: '4'}), progress('4', 80), row('5'), progress('4', 90), progress('5', 10));
    expect(held).toMatchObject({task: '5', record: {status: 'running', progress: 10}});
  });

  it('heals a start it never heard of from the first report of the newer task', () => {
    const held = fold(snapshot({id: '4', isDone: true, latestEventKind: TaskEventKind.Completed}), progress('5', 25));
    expect(held).toMatchObject({task: '5', record: {status: 'running', running: true, progress: 25}});
  });

  it('ends a task whose terminal event was lost when its row says it is over', () => {
    const failed = fold(snapshot({id: '4'}), progress('4', 40), row('4', true, TaskEventKind.Failed));
    expect(failed?.record).toMatchObject({status: 'failed', failed: true, running: false, progress: 40});

    const done = fold(snapshot({id: '4', isDone: true, latestEventKind: TaskEventKind.Completed}));
    expect(done?.record).toMatchObject({status: 'done', progress: 100});
  });

  it('hands back what it held when a message changes nothing', () => {
    const held = fold(
      snapshot({id: '4'}),
      {__typename: 'TaskEventChange', task: '4', kind: TaskEventKind.Completed},
    ) as LatestTaskState;

    // Its end said a second time, a late report, an older task, a row that says nothing new.
    expect(foldLatestTask(held, row('4', true, TaskEventKind.Completed))).toBe(held);
    expect(foldLatestTask(held, progress('4', 99))).toBe(held);
    expect(foldLatestTask(held, progress('3', 50))).toBe(held);
    expect(foldLatestTask(held, row('3'))).toBe(held);
    expect(foldLatestTask(null, progress('4', 1))).toBeNull();
  });
});

describe('the latest-task store', () => {
  const make = () => {
    const frames: Array<() => void> = [];
    const feeds: Array<{variables: unknown; next: (message: LatestTaskMessage) => void; closed: boolean}> = [];
    const client = {
      subscribe: vi.fn(({variables}: {variables: unknown}) => ({
        subscribe: (observer: {next: (result: {data: {latestTask: LatestTaskMessage}}) => void}) => {
          const feed = {variables, next: (message: LatestTaskMessage) => observer.next({data: {latestTask: message}}), closed: false};
          feeds.push(feed);
          return {unsubscribe: () => (feed.closed = true)};
        },
      })),
    };
    const store = createLiveStateStore<typeof client>({
      subscribe: subscribeLatestTask as never,
      schedule: callback => frames.push(callback),
      cancel: () => {},
    });
    const frame = () => frames.splice(0).forEach(callback => callback());
    return {client, feeds, frame, store};
  };

  it('opens one feed per agent and action however many read it, and closes it with the last', () => {
    const {client, feeds, store} = make();
    const first = store.acquire(client, 'agent-1', 'blur', () => {});
    const second = store.acquire(client, 'agent-1', 'blur', () => {});
    const other = store.acquire(client, 'agent-1', 'sharpen', () => {});

    expect(feeds.map(feed => feed.variables)).toEqual([
      {agent: 'agent-1', interface: 'blur'},
      {agent: 'agent-1', interface: 'sharpen'},
    ]);

    first();
    expect(feeds[0].closed).toBe(false);
    second();
    expect(feeds[0].closed).toBe(true);
    other();
  });

  it('tells its readers once per frame, and not at all when nothing changed', () => {
    const {client, feeds, frame, store} = make();
    const heard = vi.fn();
    store.acquire(client, 'agent-1', 'blur', heard);

    feeds[0].next(snapshot({id: '4'}));
    feeds[0].next(progress('4', 10));
    feeds[0].next(progress('4', 20));
    feeds[0].next(progress('4', 30));
    expect(heard).not.toHaveBeenCalled();
    frame();
    expect(heard).toHaveBeenCalledTimes(1);
    const held = store.getSnapshot('agent-1', 'blur').value as LatestTaskState;
    expect(held.record.progress).toBe(30);

    // A report of a task that is not the latest any more: nobody is told.
    feeds[0].next(progress('3', 99));
    frame();
    expect(heard).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot('agent-1', 'blur').value).toBe(held);
  });
});
