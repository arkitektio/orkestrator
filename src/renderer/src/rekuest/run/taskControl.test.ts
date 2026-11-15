import {describe, expect, it, vi} from 'vitest';
import {TaskEventKind} from '../api/graphql';
import {NO_TASK_CONTROL, taskCanOf} from './taskControl';

vi.mock('../api/hooks', () => ({useRekuest: () => null}));

const task = (latestEventKind: TaskEventKind, isDone = false) => ({id: 't1', isDone, latestEventKind});

describe('what a blok may do to its task (task.can)', () => {
  it('is nothing before there is a task, and nothing in the past', () => {
    expect(taskCanOf(null)).toEqual(NO_TASK_CONTROL);
    expect(taskCanOf(task(TaskEventKind.Progress), true)).toEqual(NO_TASK_CONTROL);
  });

  it('cancels, pauses and interrupts a running task, and resumes none', () => {
    expect(taskCanOf(task(TaskEventKind.Progress))).toEqual({
      cancel: true,
      pause: true,
      resume: false,
      step: false,
      interrupt: true,
    });
  });

  it('resumes and steps a paused task, and pauses it no further', () => {
    const can = taskCanOf(task(TaskEventKind.Paused));
    expect([can.resume, can.step, can.pause]).toEqual([true, true, false]);
  });

  it('does nothing to a finished task, and never starts it again', () => {
    expect(taskCanOf(task(TaskEventKind.Completed, true))).toEqual(NO_TASK_CONTROL);
    expect('rerun' in NO_TASK_CONTROL).toBe(false);
  });
});
