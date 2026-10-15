// @vitest-environment jsdom
import * as React from 'react';
import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {TaskEventKind} from '@/rekuest/api/graphql';
import {ActionLogo} from './ActionLogo';

/**
 * An action logo draws `@task`: null (the kept drawing) until the viewer runs
 * the action, then the task from the my-tasks cache, live.
 */
const BLOK = {
  id: 'action-logo',
  hash: 'a1',
  componentTree: [
    {
      id: 'logo',
      component: 'ActionLogo',
      props: [{key: 'viewBox', static_value: '0 0 24 24'}],
      children: [
        {id: 'frame', component: 'Rect', props: [{key: 'width', static_value: '24'}, {key: 'stroke', static_value: 'brand-strong'}, {key: 'animate', static_value: 'march'}]},
        {id: 'dot', component: 'Circle', props: [{key: 'r', static_value: '2'}, {key: 'fill', static_value: '#ff0000'}]},
        {id: 'said', component: 'SvgText', props: [{key: 'text', dynamic_value: {path: 'task.message'}}]},
      ],
    },
  ],
  demoState: {task: null},
};

const useLogoBlokQuery = vi.fn(() => ({data: {blok: BLOK}}));
const useLatestTask = vi.fn<() => unknown>(() => undefined);

vi.mock('@/rekuest/api/graphql', async importOriginal => ({
  ...(await importOriginal<typeof import('@/rekuest/api/graphql')>()),
  useLogoBlokQuery: () => useLogoBlokQuery(),
}));
vi.mock('@/rekuest/hooks/useTasks', () => ({useLatestTask: () => useLatestTask()}));
vi.mock('@/rekuest/scene/RekuestSceneHost', () => ({
  RekuestSceneHost: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));
vi.mock('@/rekuest/scene/RekuestAssetHost', () => ({
  RekuestAssetHost: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

const action = {id: 'act', logo: {id: BLOK.id, hash: BLOK.hash}};

const task = (kind: TaskEventKind, message: string) => ({
  id: 't1',
  createdAt: '2026-10-15T10:00:00Z',
  implementation: {id: 'impl'},
  events: [{kind, progress: 40, message, returns: null, createdAt: '2026-10-15T10:00:01Z'}],
});

afterEach(cleanup);

describe('an action logo', () => {
  it('is the kept drawing until the viewer runs the action', async () => {
    const idle = render(<ActionLogo action={action as never} className="h-4 w-4" />);
    await waitFor(() => expect(idle.container.querySelector('svg[data-blok-prefix^="logo"]')).not.toBeNull(), {timeout: 5000});
    expect(idle.container.querySelector('[data-logo-active]')).toBeNull();
    // Painted with the palette only.
    expect(idle.container.querySelector('circle')?.getAttribute('fill')).toBe('var(--logo-ink)');
  });

  it('draws the task live, and plays while it runs', async () => {
    useLatestTask.mockImplementation(() => task(TaskEventKind.Progress, 'cropping'));
    const running = render(<ActionLogo action={action as never} className="h-4 w-4" />);

    await waitFor(() => expect(running.container.querySelector('text')?.textContent).toBe('cropping'));
    expect(running.container.querySelector('[data-logo-active]')).not.toBeNull();
    expect(running.container.querySelector('rect')?.getAttribute('class')).toBe('logo-anim logo-anim-march');

    useLatestTask.mockImplementation(() => task(TaskEventKind.Completed, 'cropped'));
    running.rerender(<ActionLogo action={action as never} className="h-4 w-4" />);
    await waitFor(() => expect(running.container.querySelector('[data-logo-active]')).toBeNull());
  });

  it('shows nothing for an action without a logo', () => {
    const none = render(<ActionLogo action={{id: 'act', logo: null}} />);
    expect(none.container.innerHTML).toBe('');
  });
});
