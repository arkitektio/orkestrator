// @vitest-environment jsdom
import * as React from 'react';
import {act, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

const query = vi.fn();
vi.mock('@/rekuest/api/hooks', () => ({useRekuest: () => ({query})}));

import {EMPTY_TRAVEL_STATE, type TravelClock, type TravelSource} from '../travel/travelSource';
import {usePastLatestTasks} from './usePastLatestTasks';

/** An hour ago: far from the live edge. */
const PAST = Date.now() - 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** A source that only keeps a clock. */
const makeSource = (at: number) => {
  let clock: TravelClock = {
    at,
    playing: false,
    rate: 1,
    phase: 'ready',
    prevChangeAt: null,
    nextChangeAt: null,
    missing: [],
    error: null,
  };
  const listeners = new Set<() => void>();
  const source: TravelSource = {
    acquire: () => () => {},
    getSnapshot: () => EMPTY_TRAVEL_STATE,
    subscribe: listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getClock: () => clock,
    seek: next => {
      clock = {...clock, at: next};
      listeners.forEach(listener => listener());
    },
    step: () => {},
    play: () => {},
    pause: () => {},
    setRate: () => {},
    stop: () => {},
  };
  return source;
};

const task = (id: string, createdAt: number) => ({id, createdAt: iso(createdAt), implementation: {id: 'blur'}, events: []});

const mount = (source: TravelSource | null) => {
  const seen: {past: ReturnType<typeof usePastLatestTasks>} = {past: null};
  const Probe = () => {
    seen.past = usePastLatestTasks(source, 'blur');
    return null;
  };
  render(
    <React.StrictMode>
      <Probe />
    </React.StrictMode>,
  );
  return seen;
};

const settle = () => act(async () => {});

afterEach(() => {
  query.mockReset();
});

describe('usePastLatestTasks', () => {
  it('asks nothing while nothing travels', async () => {
    const seen = mount(null);
    await settle();

    expect(query).not.toHaveBeenCalled();
    expect(seen.past).toBeNull();
  });

  it('answers the moment of the clock, and asks again only outside what it holds', async () => {
    query.mockImplementation(async ({variables}) => ({
      data: {tasks: variables.filter.createdBefore ? [task('1', PAST - 60_000)] : [task('2', PAST + 60_000)]},
    }));
    const source = makeSource(PAST);
    const seen = mount(source);
    await settle();

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0].variables.filter).toEqual({implementation: 'blur', createdBefore: iso(PAST)});
    expect(seen.past?.at).toBe(PAST);
    expect(seen.past?.tasks.map(item => item.id)).toEqual(['1', '2']);

    // Both lists were shorter than asked for: all of the past, and up to now, is held.
    act(() => source.seek(PAST - 600_000));
    act(() => source.seek(PAST + 600_000));
    await settle();

    expect(query).toHaveBeenCalledTimes(2);
    expect(seen.past?.at).toBe(PAST + 600_000);
  });

  it('keeps silent where the server fails, and asks again when the clock moves', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    query.mockRejectedValue(new Error('denied'));
    const source = makeSource(PAST);
    const seen = mount(source);
    await settle();
    await settle();

    expect(query).toHaveBeenCalledTimes(2);
    expect(seen.past).toBeNull();

    act(() => source.seek(PAST + 1000));
    await settle();

    expect(query).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });
});
