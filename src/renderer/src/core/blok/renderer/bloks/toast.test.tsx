// @vitest-environment jsdom
import {act, cleanup} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {defaultBlokCatalog} from '../catalog';
import {idleTaskRecord, withTaskStatus} from '../runtime';
import {renderBsx} from './testing';
import {BlokToastSinkContext, type BlokToastSink} from './toast';

/**
 * `<Toast task={move}>` notifies when a task settles, once per task (keyed by
 * its id), only for a task that settles while the blok is open, and never
 * while the blok shows the past.
 */

afterEach(cleanup);

const SOURCE =
  '<Card><Toast task={move}><done>Arrived at {move.args.position}</done><failed>Move failed: {move.error}</failed></Toast><Text>Panel</Text></Card>';

const record = (status: Parameters<typeof withTaskStatus>[1], extra: Record<string, unknown> = {}) => ({
  ...withTaskStatus(idleTaskRecord(), status),
  ...extra,
});

const renderToast = (move: unknown, travelAt: string | null = null) => {
  const sink = vi.fn<BlokToastSink>();
  const rendered = renderBsx(defaultBlokCatalog, SOURCE, {move}, {
    travelAt,
    wrap: children => <BlokToastSinkContext.Provider value={sink}>{children}</BlokToastSinkContext.Provider>,
  });
  return {...rendered, sink};
};

describe('Toast', () => {
  it('fires once when the task it watches settles, with its slot text', () => {
    const {store, sink} = renderToast(idleTaskRecord());
    act(() => store.getState().setRuntimeValue('move', record('queued', {args: {position: 'dock'}})));
    act(() => store.getState().setRuntimeValue('move', record('running', {id: 't1', args: {position: 'dock'}})));
    expect(sink).not.toHaveBeenCalled();
    act(() => store.getState().setRuntimeValue('move', record('done', {id: 't1', args: {position: 'dock'}})));
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith({id: 't1', outcome: 'done', text: 'Arrived at dock'});

    // The same task settling "again" (a re-render, a late event) toasts nothing more.
    act(() => store.getState().setRuntimeValue('move', record('done', {id: 't1', args: {position: 'dock'}, progress: 100})));
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('is keyed per task: a second run toasts again', () => {
    const {store, sink} = renderToast(idleTaskRecord());
    act(() => store.getState().setRuntimeValue('move', record('running', {id: 't1'})));
    act(() => store.getState().setRuntimeValue('move', record('failed', {id: 't1', error: 'blocked'})));
    act(() => store.getState().setRuntimeValue('move', record('running', {id: 't2', args: {position: 'home'}})));
    act(() => store.getState().setRuntimeValue('move', record('done', {id: 't2', args: {position: 'home'}})));
    expect(sink.mock.calls.map(([toast]) => toast)).toEqual([
      {id: 't1', outcome: 'failed', text: 'Move failed: blocked'},
      {id: 't2', outcome: 'done', text: 'Arrived at home'},
    ]);
  });

  it('never fires on mount for a task that settled before the blok opened', () => {
    const {sink} = renderToast(record('done', {id: 't0', args: {position: 'dock'}}));
    expect(sink).not.toHaveBeenCalled();
  });

  it('stays quiet for an outcome it has no slot for', () => {
    const {store, sink} = renderToast(idleTaskRecord());
    act(() => store.getState().setRuntimeValue('move', record('running', {id: 't1'})));
    act(() => store.getState().setRuntimeValue('move', record('cancelled', {id: 't1'})));
    expect(sink).not.toHaveBeenCalled();
  });

  it('never fires while the blok shows the past', () => {
    const {store, sink} = renderToast(idleTaskRecord(), '2026-10-25T09:00:00.000Z');
    act(() => store.getState().setRuntimeValue('move', record('running', {id: 't1'})));
    act(() => store.getState().setRuntimeValue('move', record('done', {id: 't1'})));
    expect(sink).not.toHaveBeenCalled();
    // Back to the present, the task it saw settle in the past does not toast either.
    act(() => store.getState().setTravelAt(null));
    act(() => store.getState().setRuntimeValue('move', record('done', {id: 't1', progress: 100})));
    expect(sink).not.toHaveBeenCalled();
  });
});
