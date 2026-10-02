import {describe, expect, it} from 'vitest';

import {createBlokRuntimeStore} from './context';
import {applyTaskUpdate, bindTask, idleTaskRecord} from './task';

const recordAt = (store: ReturnType<typeof createBlokRuntimeStore>, name: string) =>
  (store.getState().dataModel as Record<string, unknown>)[name];

describe('applyTaskUpdate', () => {
  const running = {...idleTaskRecord(), status: 'running' as const, running: true};

  it('folds progress and its message in, clamped to a percentage', () => {
    expect(applyTaskUpdate(running, {progress: 40, message: 'Iteration 6/15'})).toMatchObject({
      status: 'running',
      progress: 40,
      message: 'Iteration 6/15',
    });
    expect(applyTaskUpdate(running, {progress: 140}).progress).toBe(100);
  });

  it('takes the first return as the result and keeps them all by key', () => {
    const next = applyTaskUpdate(running, {returns: {return0: {object: '7'}, return1: 3}});

    expect(next.result).toEqual({object: '7'});
    expect(next.returns).toEqual({return0: {object: '7'}, return1: 3});
  });

  it('ends done at 100, keeping what was returned', () => {
    const next = applyTaskUpdate({...running, result: 'x', progress: 92}, {end: 'done'});

    expect(next).toMatchObject({status: 'done', done: true, running: false, progress: 100, result: 'x'});
  });

  it('ends failed with the reason, and cancelled without one', () => {
    expect(applyTaskUpdate(running, {end: 'failed', error: 'PSF too large'})).toMatchObject({
      status: 'failed',
      failed: true,
      running: false,
      error: 'PSF too large',
    });
    expect(applyTaskUpdate(running, {end: 'cancelled'})).toMatchObject({
      status: 'cancelled',
      failed: false,
      running: false,
    });
  });
});

describe('bindTask', () => {
  it('replaces the record with a running one, then follows the task', () => {
    const store = createBlokRuntimeStore({
      initialDataModel: {job: {...idleTaskRecord(), status: 'done', done: true, result: 'old'}},
    });

    const {observe} = bindTask(store, 'job');
    expect(recordAt(store, 'job')).toEqual({...idleTaskRecord(), status: 'running', running: true});

    observe({progress: 50, message: 'halfway'});
    observe({returns: {return0: 'new'}});
    observe({end: 'done'});

    expect(recordAt(store, 'job')).toMatchObject({
      status: 'done',
      progress: 100,
      message: 'halfway',
      result: 'new',
    });
  });

  it('drops what a superseded run reports', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    const first = bindTask(store, 'job');
    const second = bindTask(store, 'job');
    first.observe({returns: {return0: 'stale'}, end: 'done'});

    expect(recordAt(store, 'job')).toMatchObject({status: 'running', result: null});

    second.observe({returns: {return0: 'fresh'}, end: 'done'});
    expect(recordAt(store, 'job')).toMatchObject({status: 'done', result: 'fresh'});
  });

  it('ignores anything reported after the end', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    const {observe} = bindTask(store, 'job');
    observe({end: 'failed', error: 'boom'});
    observe({progress: 80});

    expect(recordAt(store, 'job')).toMatchObject({status: 'failed', progress: 0, error: 'boom'});
  });

  it('goes back to idle when the host follows no task, unless it said why', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    bindTask(store, 'job').release();
    expect(recordAt(store, 'job')).toEqual(idleTaskRecord());

    const refused = bindTask(store, 'job');
    refused.observe({end: 'failed', error: 'not bound to an agent'});
    refused.release();
    expect(recordAt(store, 'job')).toMatchObject({status: 'failed', error: 'not bound to an agent'});
  });

  it('keeps names apart', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    const blur = bindTask(store, 'blurred');
    bindTask(store, 'objects');
    blur.observe({returns: {return0: 'b'}, end: 'done'});

    expect(recordAt(store, 'blurred')).toMatchObject({status: 'done', result: 'b'});
    expect(recordAt(store, 'objects')).toMatchObject({status: 'running'});
  });
});
