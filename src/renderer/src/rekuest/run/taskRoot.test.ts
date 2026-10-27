import {describe, expect, it} from 'vitest';
import {idleTaskRecord} from '@/core/blok/renderer/runtime';
import {TaskEventKind} from '../api/graphql';
import {shownAsk, taskRecordOf, type TaskRootSource} from './taskRoot';

const held = {
  kind: TaskEventKind.Held,
  value: {kind: 'self', prompt: {title: 'Is the slide in place?'}},
  message: null,
  createdAt: '2026-10-25T10:00:01Z',
  task: {id: 't1'},
};
const decided = {kind: TaskEventKind.Decided, value: {approved: true}, createdAt: '2026-10-25T10:00:02Z', task: {id: 't1'}};
const started = {kind: TaskEventKind.Started, message: null, createdAt: '2026-10-25T10:00:00Z', task: {id: 't1'}};
const completed = {kind: TaskEventKind.Completed, message: null, createdAt: '2026-10-25T10:00:05Z', task: {id: 't1'}};

const running = (overrides: Partial<TaskRootSource> = {}): TaskRootSource => ({
  id: 't1',
  args: {slide: 'S1'},
  latestEventKind: TaskEventKind.Progress,
  latestProgress: 40,
  latestMessage: 'staining',
  latestReturns: {slide: 'S1'},
  isDone: false,
  events: [],
  ...overrides,
});

describe('task: the one task record', () => {
  it('reads what the run last reported, with its id and args', () => {
    expect(taskRecordOf(running())).toEqual({
      ...idleTaskRecord(),
      id: 't1',
      status: 'running',
      running: true,
      progress: 40,
      message: 'staining',
      args: {slide: 'S1'},
      returns: {slide: 'S1'},
    });
  });

  it("asks while a hold is open, with the agent's words, and stops once it is decided", () => {
    const asking = taskRecordOf(running({events: [held]}));
    expect(asking.status).toBe('asking');
    expect(asking.ask?.question).toBe('Is the slide in place?');
    expect(taskRecordOf(running({events: [decided, held]})).ask).toBeNull();
  });

  it('is done at 100 once completed, and asks nothing after the end', () => {
    const done = taskRecordOf(running({latestEventKind: TaskEventKind.Completed, isDone: true, events: [held]}));
    expect(done).toMatchObject({status: 'done', running: false, done: true, progress: 100, ask: null});
  });

  it('fails on a failed, critical or lost run, with the reason', () => {
    expect(taskRecordOf(running({latestEventKind: TaskEventKind.Lost, isDone: true, latestMessage: 'agent gone'}))).toMatchObject({
      status: 'failed',
      failed: true,
      error: 'agent gone',
    });
  });

  it('is the task as it was at a moment: what it had reported by then', () => {
    const task = running({latestEventKind: TaskEventKind.Completed, isDone: true, events: [completed, decided, held, started]});
    const at = (iso: string) => taskRecordOf(task, Date.parse(iso));
    expect(at('2026-10-25T10:00:00.500Z')).toMatchObject({status: 'running', done: false});
    expect(at('2026-10-25T10:00:01.500Z')).toMatchObject({status: 'asking', ask: {question: 'Is the slide in place?'}});
    expect(at('2026-10-25T10:00:06Z')).toMatchObject({status: 'done', done: true});
  });
});

describe('shownAsk: the ask task.ask shows, which task.answer answers', () => {
  it('is the open ask the record shows, and none once the run ended', () => {
    const asking = running({events: [held, started]});
    expect(shownAsk(asking)?.task).toBe('t1');
    expect(taskRecordOf(asking).ask?.form).toMatchObject({task: shownAsk(asking)?.task});

    const failed = running({events: [held, started], latestEventKind: TaskEventKind.Failed});
    expect(shownAsk(failed)).toBeUndefined();
    expect(taskRecordOf(failed).ask).toBeNull();
  });
});
