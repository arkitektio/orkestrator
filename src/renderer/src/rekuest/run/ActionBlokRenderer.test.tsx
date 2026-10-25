// @vitest-environment jsdom
import * as React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

const decide = vi.fn(() => Promise.resolve({}));

vi.mock('@/rekuest/api/hooks', () => ({useRekuest: () => ({subscribe: () => ({subscribe: () => ({unsubscribe: () => {}})})})}));
vi.mock('@/rekuest/hooks/useAssign', () => ({useAssign: () => ({assign: vi.fn()})}));
vi.mock('@/rekuest/scene/RekuestSceneHost', () => ({RekuestSceneHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));
vi.mock('@/rekuest/scene/RekuestAssetHost', () => ({RekuestAssetHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));
vi.mock('@/rekuest/components/logo/ActionLogo', () => ({ActionLogo: () => <span />}));
vi.mock('@/rekuest/api/graphql', async importOriginal => ({
  ...(await importOriginal<typeof import('@/rekuest/api/graphql')>()),
  useDecideMutation: () => [decide, {loading: false}],
  useDetailActionQuery: () => ({data: undefined}),
}));
// Each bound agent's state says whose it is, so the test sees which agent a key reads.
vi.mock('@/rekuest/travel/context', async importOriginal => ({
  ...(await importOriginal<typeof import('@/rekuest/travel/context')>()),
  useBlokTravelSource: () => null,
  useBoundState: ({agentID, stateInterface}: {agentID: string; stateInterface: string}) => ({
    value: {stage: `${agentID}/${stateInterface}`},
    revision: 1,
    known: true,
  }),
}));

import {ComponentContext, TaskEventKind, type ActionBlokFragment, type RunTaskFragment} from '../api/graphql';
import {ActionBlokRenderer, runOfTask} from './ActionBlokRenderer';

const frame = () => act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));

const text = (id: string, path: string) => ({id, component: 'Text', props: [{key: 'text', dynamic_value: {path}}]});

/** The sketch's task panel: the run's report, the workflow's own state, a device's state, the ask. */
const actionBlok: ActionBlokFragment = {
  id: '5',
  context: ComponentContext.Html,
  blok: {
    id: 'b5',
    context: ComponentContext.Html,
    heldByAction: true,
    componentTree: [
      {
        id: 'root',
        component: 'Card',
        children: [
          text('message', 'task.message'),
          text('progress', 'task.progress'),
          text('slide', 'args.slide'),
          text('self', 'self.helsinki_state.stage'),
          text('robot', 'robot.arm_state.stage'),
          {id: 'ask', component: 'TaskAsk'},
        ],
      },
    ],
    demoState: {},
    persist: [],
  },
};

const agent = (id: string) => ({id, name: `agent ${id}`, connected: true});

const task = (events: RunTaskFragment['events'] = []): RunTaskFragment =>
  ({
    id: 't1',
    args: {slide: 'S7'},
    latestEventKind: TaskEventKind.Progress,
    latestProgress: 40,
    latestMessage: 'staining',
    latestReturns: null,
    isDone: false,
    events,
    action: {id: 'act', name: 'process_slides'},
    implementation: {id: 'i1', agent: agent('w1')},
    actionBloks: [actionBlok],
    dependencyAgents: [
      {key: 'robot', agent: agent('a1')},
      {key: 'robot', agent: agent('a2')},
    ],
    space: null,
  }) as RunTaskFragment;

const held = {
  id: 'e1',
  kind: TaskEventKind.Held,
  value: {kind: 'self', prompt: {title: 'Is the slide in place?'}},
  message: null,
  createdAt: '2026-10-25T10:00:01Z',
  task: {id: 't1', reference: 'r'},
} as RunTaskFragment['events'][number];

afterEach(() => {
  document.body.innerHTML = '';
  decide.mockClear();
});

describe('an action\'s html blok drawn for a run', () => {
  it('reads the run at @task and @args, the running agent at @self, and a key\'s first bound agent', async () => {
    render(<ActionBlokRenderer surfaceId="panel" actionBlok={actionBlok} run={runOfTask(task())} />);
    await frame();
    expect(screen.getByText('staining')).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('S7')).toBeTruthy();
    expect(screen.getByText('w1/helsinki_state')).toBeTruthy();
    expect(screen.getByText('a1/arm_state')).toBeTruthy();
  });

  it('shows the run\'s open ask, and answering it resumes the run', async () => {
    render(<ActionBlokRenderer surfaceId="panel" actionBlok={actionBlok} run={runOfTask(task([held]))} />);
    await frame();
    expect(screen.getByText('Is the slide in place?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: /Approve/}));
    expect(decide).toHaveBeenCalledWith({variables: {input: {task: 't1', approved: true, answer: null, values: null}}});
  });

  it('shows no ask while none is open', async () => {
    render(<ActionBlokRenderer surfaceId="panel" actionBlok={actionBlok} run={runOfTask(task())} />);
    await frame();
    expect(screen.queryByText('Waiting for you')).toBeNull();
  });
});
