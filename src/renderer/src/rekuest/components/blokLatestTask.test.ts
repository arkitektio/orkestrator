import {describe, expect, it} from 'vitest';

import {TaskEventKind} from '../api/graphql';
import {latestTaskRecord, latestTaskWindow, pickLatestTask, windowCovers} from './blokLatestTask';

const event = (kind: TaskEventKind, rest: {progress?: number; message?: string; returns?: unknown} = {}) => ({
  kind,
  progress: rest.progress ?? null,
  message: rest.message ?? null,
  returns: rest.returns ?? null,
});

// Newest first, as the task fragments order them.
const task = (id: string, implementation: string, createdAt: string, ...events: ReturnType<typeof event>[]) => ({
  id,
  createdAt,
  implementation: {id: implementation},
  events,
});

describe('pickLatestTask', () => {
  it('takes the newest task of the implementation, whatever the order of the list', () => {
    const tasks = [
      task('2', 'blur', '2026-10-13T10:00:02Z'),
      task('3', 'segment', '2026-10-13T10:00:03Z'),
      task('1', 'blur', '2026-10-13T10:00:01Z'),
      null,
    ];

    expect(pickLatestTask(tasks, 'blur')?.id).toBe('2');
    expect(pickLatestTask(tasks, 'absent')).toBeUndefined();
  });

  it('lets the later of two tasks started together win', () => {
    const tasks = [task('1', 'blur', '2026-10-13T10:00:00Z'), task('2', 'blur', '2026-10-13T10:00:00Z')];

    expect(pickLatestTask(tasks, 'blur')?.id).toBe('2');
  });
});

describe('latestTaskRecord', () => {
  it('is idle where the action never ran', () => {
    expect(latestTaskRecord(undefined)).toMatchObject({status: 'idle', running: false, progress: 0});
  });

  it('is running from the moment there is a task', () => {
    expect(latestTaskRecord(task('1', 'blur', ''))).toMatchObject({status: 'running', running: true, progress: 0});
  });

  it('shows the last report of a running task', () => {
    const running = task(
      '1',
      'blur',
      '',
      event(TaskEventKind.Progress, {progress: 90, message: 'Uploading labels'}),
      event(TaskEventKind.Progress, {progress: 15, message: 'Predicting'}),
      event(TaskEventKind.Queued),
    );

    expect(latestTaskRecord(running)).toMatchObject({running: true, progress: 90, message: 'Uploading labels'});
  });

  it('ends with what the task returned', () => {
    const done = task(
      '1',
      'blur',
      '',
      event(TaskEventKind.Completed, {returns: {return0: 'labels'}}),
      event(TaskEventKind.Progress, {progress: 90, message: 'Uploading labels'}),
    );

    expect(latestTaskRecord(done)).toMatchObject({
      status: 'done',
      running: false,
      done: true,
      progress: 100,
      returns: {return0: 'labels'},
    });
  });

  it('keeps why a task failed, and ignores what it said afterwards', () => {
    const failed = task(
      '1',
      'blur',
      '',
      event(TaskEventKind.Progress, {progress: 99, message: 'late'}),
      event(TaskEventKind.Critical, {message: 'out of memory'}),
      event(TaskEventKind.Progress, {progress: 15, message: 'Predicting'}),
    );

    expect(latestTaskRecord(failed)).toMatchObject({
      status: 'failed',
      failed: true,
      error: 'out of memory',
      progress: 15,
      message: 'Predicting',
    });
  });
});

const ms = (iso: string) => Date.parse(iso);

describe('the latest task at a moment in the past', () => {
  it('does not know a task that had not started yet', () => {
    const tasks = [task('1', 'blur', '2026-10-13T10:00:01Z'), task('2', 'blur', '2026-10-13T10:00:05Z')];

    expect(pickLatestTask(tasks, 'blur', ms('2026-10-13T10:00:03Z'))?.id).toBe('1');
    expect(pickLatestTask(tasks, 'blur', ms('2026-10-13T10:00:05Z'))?.id).toBe('2');
    expect(pickLatestTask(tasks, 'blur', ms('2026-10-13T10:00:00Z'))).toBeUndefined();
  });

  it('reads a time without an offset as the server clock, which is UTC', () => {
    const tasks = [task('1', 'blur', '2026-10-13T10:00:01')];

    expect(pickLatestTask(tasks, 'blur', ms('2026-10-13T10:00:02Z'))?.id).toBe('1');
    expect(pickLatestTask(tasks, 'blur', ms('2026-10-13T10:00:00Z'))).toBeUndefined();
  });

  it('shows a task that has ended since as it was then', () => {
    const done = task(
      '1',
      'blur',
      '2026-10-13T10:00:00Z',
      {...event(TaskEventKind.Completed, {returns: {return0: 'labels'}}), createdAt: '2026-10-13T10:00:09Z'},
      {...event(TaskEventKind.Progress, {progress: 90, message: 'Uploading labels'}), createdAt: '2026-10-13T10:00:06Z'},
      {...event(TaskEventKind.Progress, {progress: 15, message: 'Predicting'}), createdAt: '2026-10-13T10:00:02Z'},
    );

    expect(latestTaskRecord(done, ms('2026-10-13T10:00:01Z'))).toMatchObject({running: true, progress: 0});
    expect(latestTaskRecord(done, ms('2026-10-13T10:00:04Z'))).toMatchObject({
      running: true,
      progress: 15,
      message: 'Predicting',
    });
    expect(latestTaskRecord(done, ms('2026-10-13T10:00:09Z'))).toMatchObject({status: 'done', returns: {return0: 'labels'}});
  });
});

describe('latestTaskWindow', () => {
  const at = ms('2026-10-13T10:00:10Z');
  const fetchedAt = ms('2026-10-13T11:00:00Z');
  const older = [task('2', 'blur', '2026-10-13T10:00:08Z'), task('1', 'blur', '2026-10-13T10:00:04Z')];
  const newer = [task('3', 'blur', '2026-10-13T10:00:12Z'), task('4', 'blur', '2026-10-13T10:00:20Z')];

  it('reaches back for good, and forward to when it was asked, where everything was answered', () => {
    const held = latestTaskWindow({implementationId: 'blur', at, fetchedAt, before: older, beforeLimit: 10, after: newer, afterLimit: 25});

    expect(held.tasks.map(item => item.id)).toEqual(['2', '1', '3', '4']);
    expect(windowCovers(held, 'blur', 0)).toBe(true);
    expect(windowCovers(held, 'blur', fetchedAt)).toBe(true);
    expect(windowCovers(held, 'blur', fetchedAt + 1)).toBe(false);
    expect(windowCovers(held, 'segment', at)).toBe(false);
    expect(windowCovers(null, 'blur', at)).toBe(false);
  });

  it('ends at the last task held where there may be more', () => {
    const held = latestTaskWindow({implementationId: 'blur', at, fetchedAt, before: older, beforeLimit: 2, after: newer, afterLimit: 2});

    expect(windowCovers(held, 'blur', ms('2026-10-13T10:00:04Z'))).toBe(true);
    expect(windowCovers(held, 'blur', ms('2026-10-13T10:00:03Z'))).toBe(false);
    expect(windowCovers(held, 'blur', ms('2026-10-13T10:00:20Z'))).toBe(true);
    expect(windowCovers(held, 'blur', ms('2026-10-13T10:00:21Z'))).toBe(false);
  });

  it('holds a task once that both sides answered', () => {
    const held = latestTaskWindow({implementationId: 'blur', at, fetchedAt, before: older, beforeLimit: 10, after: [older[0]], afterLimit: 25});

    expect(held.tasks.map(item => item.id)).toEqual(['2', '1']);
  });
});
