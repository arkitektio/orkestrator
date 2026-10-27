// @vitest-environment jsdom
import * as React from 'react';
import {act, render} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {TaskEventKind} from '../api/graphql';
import type {LatestTaskMessage} from '../hooks/latestTaskStore';
import tree from './latestTaskPanel.fixture.json';

/**
 * `latestTaskPanel.fixture.json` is the panel of `testing/fake_starmist_app.py` as the
 * server stores it: two buttons disabled while their action runs, and a progress bar on
 * the progress of whichever action is running.
 */

type Feed = {variables: {agent: string; interface: string}; next: (message: LatestTaskMessage) => void};
const feeds: Feed[] = [];
const client = {
  subscribe: ({variables}: {variables: Feed['variables']}) => ({
    subscribe: (observer: {next: (result: {data: {latestTask: LatestTaskMessage}}) => void}) => {
      feeds.push({variables, next: message => observer.next({data: {latestTask: message}})});
      return {unsubscribe: () => {}};
    },
  }),
};

vi.mock('@/rekuest/components/useBlokViewer', () => ({useBlokViewer: () => null}));
vi.mock('@/rekuest/components/useBlokPersistence', () => ({useBlokPersistence: () => null, useBlokComponentStore: () => null}));
vi.mock('@/core/modules/hooks/useServiceReads', () => ({useServiceReads: () => ({query: () => Promise.resolve({}), subscribe: () => () => undefined})}));
vi.mock('@/rekuest/api/hooks', () => ({useRekuest: () => client}));
vi.mock('@/rekuest/hooks/useAssign', () => ({useAssign: () => ({assign: vi.fn()})}));
vi.mock('@/rekuest/scene/RekuestSceneHost', () => ({RekuestSceneHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));
vi.mock('@/rekuest/scene/RekuestAssetHost', () => ({RekuestAssetHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));

const frame = () => act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));

afterEach(() => {
  feeds.length = 0;
  document.body.innerHTML = '';
});

describe('a blok that reads the latest task of its agent\'s actions', () => {
  it('follows a run it did not start', async () => {
    const {default: MaterializedBlokRenderer} = await import('./MaterializedBlokRenderer');
    const view = render(
      <MaterializedBlokRenderer
        surfaceId="panel"
        materializedBlok={{
          id: '12',
          blok: {
            componentTree: tree,
            resolvedLocals: [],
            dependencies: [{key: 'self'}],
          },
          agentMappings: [{key: 'self', agent: {id: '34549'}}],
        }}
      />,
    );
    await frame();

    expect(feeds.map(feed => feed.variables)).toEqual([
      {agent: '34549', interface: 'predict_flou2'},
      {agent: '34549', interface: 'predict_stardist_he'},
    ]);
    const [fluo, he] = feeds;
    const buttons = () => [...view.container.querySelectorAll('button')].map(button => button.disabled);
    // The bar shows its value as how far its indicator is pushed back: 40% is translateX(-60%).
    const progress = () =>
      String(100 + Number(/translateX\((-?\d+)%\)/.exec(view.container.querySelector('[data-slot="progress-indicator"]')?.getAttribute('style') ?? '')?.[1]));

    await act(async () => {
      he.next({__typename: 'LatestTaskSnapshot', implementation: '93', latest: null, events: []});
      fluo.next({
        __typename: 'LatestTaskSnapshot',
        implementation: '92',
        latest: {id: '663', isDone: false, latestEventKind: TaskEventKind.Started},
        events: [{task: '663', kind: TaskEventKind.Progress, progress: 40, message: '5 of 14 nuclei'}],
      });
    });
    await frame();
    expect(buttons()).toEqual([true, false]);
    expect(progress()).toBe('40');

    await act(async () => {
      fluo.next({__typename: 'TaskEventChange', task: '663', kind: TaskEventKind.Progress, progress: 70, message: ''});
    });
    await frame();
    expect(progress()).toBe('70');

    await act(async () => {
      fluo.next({__typename: 'TaskEventChange', task: '663', kind: TaskEventKind.Completed});
    });
    await frame();
    expect(buttons()).toEqual([false, false]);
    expect(progress()).toBe('100');
    // The whole renderer is imported here for the first time: slow when the suite runs in parallel.
  }, 30_000);
});
