// @vitest-environment jsdom
import * as React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, describe, expect, it, vi} from 'vitest';
import MaterializedBlokById from './MaterializedBlokById';
import {installAppBlokCatalog} from '@/core/blok/testing';

installAppBlokCatalog();

/** `<Text text={args.note} />`, opened for a `note`. */
const materializedBlok = {
  id: '21',
  name: 'Notes',
  blok: {
    name: 'notes',
    componentTree: [{id: 'root', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'args.note'}}]}],
    resolvedLocals: [],
    dependencies: [],
    args: [{key: 'note', nullable: false}],
  },
  agentMappings: [],
};

vi.mock('@/rekuest/components/useBlokViewer', () => ({useBlokViewer: () => null}));
vi.mock('@/rekuest/components/useBlokPersistence', () => ({useBlokPersistence: () => null, useBlokComponentStore: () => null}));
vi.mock('@/core/modules/hooks/useServiceReads', () => ({useServiceReads: () => ({query: () => Promise.resolve({}), subscribe: () => () => undefined})}));
vi.mock('@/rekuest/api/graphql', async importOriginal => ({
  ...(await importOriginal<object>()),
  useMaterializedBlokQuery: () => ({data: {materializedBlok}, loading: false, error: undefined}),
}));
vi.mock('@/rekuest/api/hooks', () => ({useRekuest: () => ({subscribe: () => ({subscribe: () => ({unsubscribe: () => {}})})})}));
vi.mock('@/rekuest/hooks/useAssign', () => ({useAssign: () => ({assign: vi.fn()})}));
vi.mock('@/rekuest/scene/RekuestSceneHost', () => ({RekuestSceneHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));
vi.mock('@/rekuest/scene/RekuestAssetHost', () => ({RekuestAssetHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));
// The port form is the ports engine's, tested there: here only what it hands back.
vi.mock('./BlokArgsForm', () => ({
  BlokArgsForm: (props: {name: string; onOpen: (args: Record<string, unknown>) => void}) => (
    <button onClick={() => props.onOpen({note: 'picked'})}>Open {props.name}</button>
  ),
}));

const frame = () => act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a blok opened for an item, shown without one', () => {
  it('asks for it, then reads what was chosen', async () => {
    const view = render(<MaterializedBlokById surfaceId="panel" materializedBlokId="21" />, {wrapper: MemoryRouter});
    fireEvent.click(screen.getByText('Open Notes'));
    await frame();
    expect(view.container.textContent).toContain('picked');
  });

  it('points to its page from a card, where there is no room for a form', async () => {
    render(<MaterializedBlokById surfaceId="card" materializedBlokId="21" embedded />, {wrapper: MemoryRouter});
    expect(screen.getByText('choose one').getAttribute('href')).toContain('21');
  });

  it('renders at once when it is given what it is opened for', async () => {
    const view = render(<MaterializedBlokById surfaceId="panel" materializedBlokId="21" args={{note: 'given'}} />, {wrapper: MemoryRouter});
    await frame();
    expect(view.container.textContent).toContain('given');
  });
});
