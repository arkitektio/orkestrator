// @vitest-environment jsdom
import {act, render} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

const live = vi.hoisted(() => ({
  state: {value: null as Record<string, unknown> | null, revision: null as number | null},
  skipped: [] as boolean[],
}));

vi.mock('@/rekuest/api/graphql', () => ({CheckoutAgentDocument: {}}));
vi.mock('@/rekuest/api/hooks', () => ({useRekuest: () => null}));
vi.mock('@/rekuest/hooks/useLiveState', () => ({
  useAgentLiveState: (args: {skip?: boolean}) => {
    live.skipped.push(Boolean(args.skip));
    return args.skip ? {value: null, revision: null} : live.state;
  },
}));

import {BlokRuntimeProvider, createBlokRuntimeStore, type BlokRuntimeStore} from '@/core/blok/renderer/runtime';
import {BlokTravelProvider} from '@/rekuest/travel/context';
import {createTravelSource, type TravelCheckout, type TravelSource} from '@/rekuest/travel/travelSource';
import {BlokStateSync} from './blokStateSync';

const NOW = Date.UTC(2026, 9, 13, 12, 0, 0);

/** A travel source standing a minute ago, whose one checkout is answered by hand. */
const makeSource = () => {
  let answer: (checkout: TravelCheckout) => void = () => {};
  const source = createTravelSource({
    checkout: () =>
      new Promise<TravelCheckout>(resolve => {
        answer = resolve;
      }),
    now: () => NOW,
  });
  source.seek(NOW - 60_000, true);
  return {
    source,
    answer: (values: Record<string, unknown> | null) =>
      act(async () => {
        answer({values, globalRevision: 7, forwardPatches: [], backwardPatches: []});
      }),
  };
};

const Harness = ({store, source, connected}: {store: BlokRuntimeStore; source: TravelSource | null; connected?: boolean}) => (
  <BlokRuntimeProvider store={store}>
    <BlokTravelProvider source={source}>
      <BlokStateSync dependencyKey="self" stateInterface="Stage" agentId="agent-1" connected={connected} />
    </BlokTravelProvider>
  </BlokRuntimeProvider>
);

const shown = (store: BlokRuntimeStore) => store.getState().runtimePathValues['deps.self.Stage'];

describe('BlokStateSync', () => {
  beforeEach(() => {
    live.state = {value: null, revision: null};
    live.skipped = [];
  });

  it('writes the live state of the bound agent', () => {
    const store = createBlokRuntimeStore();
    live.state = {value: {x: 1}, revision: 3};

    render(<Harness store={store} source={null} />);

    expect(shown(store)).toEqual({x: 1});
    expect(store.getState().agentMappingStateUpdates.self.interfaces.Stage).toEqual({value: {x: 1}, revision: 3});
    expect(live.skipped).not.toContain(true);
  });

  it('carries the status with the value: pending until known, stale while the agent is offline', () => {
    const store = createBlokRuntimeStore();
    const view = render(<Harness store={store} source={null} />);
    expect(store.getState().statuses['deps.self.Stage']).toEqual({status: 'pending'});

    live.state = {value: {x: 1}, revision: 3};
    view.rerender(<Harness store={store} source={null} />);
    expect(store.getState().statuses['deps.self.Stage']).toEqual({status: 'ready'});

    view.rerender(<Harness store={store} source={null} connected={false} />);
    expect(store.getState().statuses['deps.self.Stage']).toEqual({status: 'stale'});
    expect(shown(store)).toEqual({x: 1});

    view.unmount();
    expect(store.getState().statuses['deps.self.Stage']).toBeUndefined();
  });

  it('writes nothing while the live state has not arrived', () => {
    const store = createBlokRuntimeStore();
    render(<Harness store={store} source={null} />);
    expect(shown(store)).toBeUndefined();
  });

  it('reads the past from the travel source, and stops watching live', async () => {
    const store = createBlokRuntimeStore();
    const {source, answer} = makeSource();
    live.state = {value: {x: 1}, revision: 3};

    render(<Harness store={store} source={source} />);
    await answer({Stage: {x: 9}});

    expect(shown(store)).toEqual({x: 9});
    expect(live.skipped).not.toContain(false);
  });

  it('keeps what it shows between going back and the first answer', async () => {
    const store = createBlokRuntimeStore();
    const {source, answer} = makeSource();
    live.state = {value: {x: 1}, revision: 3};

    const view = render(<Harness store={store} source={null} />);
    view.rerender(<Harness store={store} source={source} />);
    expect(shown(store)).toEqual({x: 1});

    await answer({Stage: {x: 9}});
    expect(shown(store)).toEqual({x: 9});

    // And on the way back to live: the past stays until the present arrives.
    live.state = {value: null, revision: null};
    view.rerender(<Harness store={store} source={null} />);
    expect(shown(store)).toEqual({x: 9});
  });

  it('clears the path when nothing was recorded at that moment', async () => {
    const store = createBlokRuntimeStore();
    const {source, answer} = makeSource();
    live.state = {value: {x: 1}, revision: 3};

    const view = render(<Harness store={store} source={null} />);
    view.rerender(<Harness store={store} source={source} />);
    await answer({});

    expect(shown(store)).toBeUndefined();
    expect(store.getState().agentMappingStateUpdates.self?.interfaces.Stage).toBeUndefined();
  });

  it('clears the path when the binding goes away', () => {
    const store = createBlokRuntimeStore();
    live.state = {value: {x: 1}, revision: 3};

    const view = render(<Harness store={store} source={null} />);
    view.unmount();

    expect(shown(store)).toBeUndefined();
  });
});
