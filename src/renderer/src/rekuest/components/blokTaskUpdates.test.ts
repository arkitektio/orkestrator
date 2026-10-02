import {describe, expect, it} from 'vitest';

import {TaskEventKind} from '../api/graphql';
import {taskUpdateFromEvent} from './blokTaskUpdates';

const event = (kind: TaskEventKind, rest: {progress?: number; message?: string; returns?: unknown} = {}) => ({
  kind,
  progress: rest.progress ?? null,
  message: rest.message ?? null,
  returns: rest.returns ?? null,
});

describe('taskUpdateFromEvent', () => {
  it('reports progress with its message', () => {
    expect(taskUpdateFromEvent(event(TaskEventKind.Progress, {progress: 40, message: 'Iteration 6/15'}))).toEqual({
      progress: 40,
      message: 'Iteration 6/15',
    });
  });

  it('reports what a task yields, and ends it on completion', () => {
    expect(taskUpdateFromEvent(event(TaskEventKind.Yield, {returns: {return0: 1}}))).toEqual({
      returns: {return0: 1},
    });
    expect(taskUpdateFromEvent(event(TaskEventKind.Completed))).toEqual({end: 'done'});
    expect(taskUpdateFromEvent(event(TaskEventKind.Completed, {returns: {return0: 1}}))).toEqual({
      returns: {return0: 1},
      end: 'done',
    });
  });

  it('ends failed with the message, or says what a lost task is', () => {
    expect(taskUpdateFromEvent(event(TaskEventKind.Failed, {message: 'PSF too large'}))).toEqual({
      end: 'failed',
      error: 'PSF too large',
    });
    expect(taskUpdateFromEvent(event(TaskEventKind.Critical))).toEqual({end: 'failed', error: 'Unknown error'});
    expect(taskUpdateFromEvent(event(TaskEventKind.Lost))?.error).toMatch(/agent was lost/);
  });

  it('ends cancelled when the task was stopped', () => {
    expect(taskUpdateFromEvent(event(TaskEventKind.Cancelled))).toEqual({end: 'cancelled'});
    expect(taskUpdateFromEvent(event(TaskEventKind.Interrupted))).toEqual({end: 'cancelled'});
  });

  it('says nothing for lifecycle chatter and logs', () => {
    for (const kind of [
      TaskEventKind.Queued,
      TaskEventKind.Bound,
      TaskEventKind.Started,
      TaskEventKind.Log,
      TaskEventKind.Cancelling,
      TaskEventKind.LateReport,
    ]) {
      expect(taskUpdateFromEvent(event(kind, {message: 'x'}))).toBeUndefined();
    }
  });
});
