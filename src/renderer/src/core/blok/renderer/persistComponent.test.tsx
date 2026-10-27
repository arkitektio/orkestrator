// @vitest-environment jsdom
import {act, cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BlokComponentStateContext, usePersistedComponentState, type BlokComponentStateStore} from './persist';

/** A component keeps its own state by its explicit id, only when it persists and a store is there. */

afterEach(cleanup);

const isCount = (value: unknown): value is number => typeof value === 'number';

const Counter = ({id, persist}: {id: string; persist: boolean}) => {
  const kept = usePersistedComponentState(id, persist, isCount);
  if (!kept.loaded) return <span>loading</span>;
  return (
    <button type="button" onClick={() => kept.save((kept.initial ?? 0) + 1)}>
      {String(kept.initial ?? 'none')}
    </button>
  );
};

const fakeStore = (kept: Record<string, unknown>): BlokComponentStateStore & {saved: Array<[string, unknown]>} => {
  const saved: Array<[string, unknown]> = [];
  return {
    saved,
    load: vi.fn(async (componentId: string) => kept[componentId] ?? null),
    save: (componentId, state) => void saved.push([componentId, state]),
    forget: async () => undefined,
  };
};

describe('usePersistedComponentState', () => {
  it('reads what the component kept by its explicit id before it starts', async () => {
    const store = fakeStore({main: 4});
    render(
      <BlokComponentStateContext.Provider value={store}>
        <Counter id="main" persist />
      </BlokComponentStateContext.Provider>,
    );
    expect(screen.getByText('loading')).toBeTruthy();
    expect(await screen.findByText('4')).toBeTruthy();
    act(() => screen.getByRole('button').click());
    expect(store.saved).toEqual([['main', 5]]);
  });

  it('keeps nothing without persist, without an explicit id, or without a store', () => {
    const store = fakeStore({main: 4, 'Scene[0]': 2});
    render(
      <BlokComponentStateContext.Provider value={store}>
        <Counter id="main" persist={false} />
        <Counter id="Scene[0]" persist />
      </BlokComponentStateContext.Provider>,
    );
    render(<Counter id="main" persist />);
    expect(screen.getAllByText('none')).toHaveLength(3);
    expect(store.load).not.toHaveBeenCalled();
  });

  it('drops a kept state that no longer fits', async () => {
    const store = fakeStore({main: 'not a number'});
    render(
      <BlokComponentStateContext.Provider value={store}>
        <Counter id="main" persist />
      </BlokComponentStateContext.Provider>,
    );
    expect(await screen.findByText('none')).toBeTruthy();
  });
});
