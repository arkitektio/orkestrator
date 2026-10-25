import {describe, expect, it} from 'vitest';
import {TaskEventKind} from '../api/graphql';
import {IDLE_TASK_ROOT, taskRoot, type TaskRootSource} from './taskRoot';

const held = {
  kind: TaskEventKind.Held,
  value: {kind: 'self', prompt: {title: 'Is the slide in place?'}},
  message: null,
  createdAt: '2026-10-25T10:00:01Z',
  task: {id: 't1'},
};
const decided = {kind: TaskEventKind.Decided, value: {approved: true}, createdAt: '2026-10-25T10:00:02Z', task: {id: 't1'}};

const running = (overrides: Partial<TaskRootSource> = {}): TaskRootSource => ({
  latestEventKind: TaskEventKind.Progress,
  latestProgress: 40,
  latestMessage: 'staining',
  latestReturns: {slide: 'S1'},
  isDone: false,
  events: [],
  ...overrides,
});

describe('@task', () => {
  it('reads what the run last reported', () => {
    expect(taskRoot(running())).toEqual({
      status: 'PROGRESS',
      running: true,
      done: false,
      failed: false,
      progress: 40,
      message: 'staining',
      ask: false,
      question: '',
      latest: {slide: 'S1'},
    });
  });

  it('asks while a hold is open, with the agent\'s words, and stops once it is decided', () => {
    const asking = taskRoot(running({events: [held]}));
    expect(asking.ask).toBe(true);
    expect(asking.question).toBe('Is the slide in place?');
    expect(taskRoot(running({events: [decided, held]})).ask).toBe(false);
  });

  it('is done at 100 once completed, and asks nothing after the end', () => {
    const done = taskRoot(running({latestEventKind: TaskEventKind.Completed, isDone: true, events: [held]}));
    expect(done).toMatchObject({status: 'COMPLETED', running: false, done: true, progress: 100, ask: false});
  });

  it('fails on a failed, critical or lost run', () => {
    expect(taskRoot(running({latestEventKind: TaskEventKind.Lost, isDone: true})).failed).toBe(true);
  });

  it('is idle before a run, every field there', () => {
    expect(IDLE_TASK_ROOT).toMatchObject({status: 'IDLE', running: false, progress: 0, ask: false, latest: null});
  });
});
