import {describe, expect, it} from 'vitest';

import {loadVocabulary} from '../../spec/vocabulary';
import {createBlokRuntimeStore} from './context';
import {applyTaskUpdate, bindTask, idleTaskRecord, withTaskStatus} from './task';

const recordAt = (store: ReturnType<typeof createBlokRuntimeStore>, name: string) =>
  (store.getState().dataModel as Record<string, unknown>)[name];

describe('the task record', () => {
  it('starts as the vocabulary says an idle task looks', () => {
    expect(idleTaskRecord()).toEqual(loadVocabulary().records.task.idle);
  });

  it('carries the flags beside the status', () => {
    expect(withTaskStatus(idleTaskRecord(), 'asking')).toMatchObject({status: 'asking', running: true, done: false, failed: false});
    expect(withTaskStatus(idleTaskRecord(), 'queued').running).toBe(true);
    expect(withTaskStatus(idleTaskRecord(), 'cancelled')).toMatchObject({running: false, done: false, failed: false});
  });
});

describe('applyTaskUpdate', () => {
  const running = withTaskStatus(idleTaskRecord(), 'running');

  it('folds progress and its message in, clamped to a percentage', () => {
    expect(applyTaskUpdate(running, {progress: 40, message: 'Iteration 6/15'})).toMatchObject({
      status: 'running',
      progress: 40,
      message: 'Iteration 6/15',
    });
    expect(applyTaskUpdate(running, {progress: 140}).progress).toBe(100);
  });

  it('keeps the latest yield by return port key', () => {
    const next = applyTaskUpdate(running, {returns: {arrived: true, at: 3}});
    expect(next.returns).toEqual({arrived: true, at: 3});
  });

  it('learns its id, an ask, and the answer', () => {
    const asked = applyTaskUpdate(running, {id: 't1', status: 'asking', ask: {question: 'Which?', form: {}}});
    expect(asked).toMatchObject({id: 't1', status: 'asking', running: true, ask: {question: 'Which?'}});
    const answered = applyTaskUpdate(asked, {status: 'running', ask: null, answer: {pick: 2}});
    expect(answered).toMatchObject({status: 'running', ask: null, answer: {pick: 2}});
  });

  it('ends done at 100, keeping what was returned', () => {
    const next = applyTaskUpdate({...running, returns: {x: 1}, progress: 92}, {end: 'done'});
    expect(next).toMatchObject({status: 'done', done: true, running: false, progress: 100, returns: {x: 1}});
  });

  it('ends failed with the reason, and cancelled without one', () => {
    expect(applyTaskUpdate(running, {end: 'failed', error: 'PSF too large'})).toMatchObject({
      status: 'failed',
      failed: true,
      running: false,
      error: 'PSF too large',
    });
    expect(applyTaskUpdate(running, {end: 'cancelled'})).toMatchObject({status: 'cancelled', failed: false, running: false});
  });
});

describe('bindTask', () => {
  it('replaces the record with a queued one holding its args, then follows the task', () => {
    const store = createBlokRuntimeStore({
      initialDataModel: {move: {...withTaskStatus(idleTaskRecord(), 'done'), returns: {old: 1}}},
    });

    const {observe} = bindTask(store, 'move', {position: 3});
    expect(recordAt(store, 'move')).toEqual({...withTaskStatus(idleTaskRecord(), 'queued'), args: {position: 3}});

    observe({id: 't7', status: 'running'});
    observe({progress: 50, message: 'halfway'});
    observe({returns: {arrived: true}});
    observe({end: 'done'});

    expect(recordAt(store, 'move')).toMatchObject({
      id: 't7',
      status: 'done',
      progress: 100,
      message: 'halfway',
      args: {position: 3},
      returns: {arrived: true},
    });
  });

  it('drops what a superseded run reports', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    const first = bindTask(store, 'move');
    const second = bindTask(store, 'move');
    first.observe({returns: {at: 'stale'}, end: 'done'});

    expect(recordAt(store, 'move')).toMatchObject({status: 'queued', returns: {}});

    second.observe({returns: {at: 'fresh'}, end: 'done'});
    expect(recordAt(store, 'move')).toMatchObject({status: 'done', returns: {at: 'fresh'}});
  });

  it('ignores anything reported after the end', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    const {observe} = bindTask(store, 'move');
    observe({end: 'failed', error: 'boom'});
    observe({progress: 80});

    expect(recordAt(store, 'move')).toMatchObject({status: 'failed', progress: 0, error: 'boom'});
  });

  it('goes back to idle when the host follows no task, unless it said why', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    bindTask(store, 'move').release();
    expect(recordAt(store, 'move')).toEqual(idleTaskRecord());

    const refused = bindTask(store, 'move');
    refused.observe({end: 'failed', error: 'not bound to an agent'});
    refused.release();
    expect(recordAt(store, 'move')).toMatchObject({status: 'failed', error: 'not bound to an agent'});
  });

  it('keeps names apart', () => {
    const store = createBlokRuntimeStore({initialDataModel: {}});

    const blur = bindTask(store, 'blurred');
    bindTask(store, 'objects');
    blur.observe({returns: {image: 'b'}, end: 'done'});

    expect(recordAt(store, 'blurred')).toMatchObject({status: 'done', returns: {image: 'b'}});
    expect(recordAt(store, 'objects')).toMatchObject({status: 'queued'});
  });
});
