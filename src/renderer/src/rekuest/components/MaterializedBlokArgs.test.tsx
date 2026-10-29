// @vitest-environment jsdom
import * as React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import MaterializedBlokRenderer from './MaterializedBlokRenderer';
import {installAppBlokCatalog} from '@/core/blok/testing';

installAppBlokCatalog();

vi.mock('@/rekuest/components/useBlokViewer', () => ({useBlokViewer: () => null}));
vi.mock('@/rekuest/components/useBlokPersistence', () => ({useBlokPersistence: () => null, useBlokComponentStore: () => null}));
vi.mock('@/core/modules/hooks/useServiceReads', () => ({useServiceReads: () => ({query: () => Promise.resolve({}), subscribe: () => () => undefined})}));
vi.mock('@/rekuest/api/hooks', () => ({useRekuest: () => ({subscribe: () => ({subscribe: () => ({unsubscribe: () => {}})})})}));
vi.mock('@/rekuest/hooks/useAssign', () => ({useAssign: () => ({assign: vi.fn()})}));
vi.mock('@/rekuest/scene/RekuestSceneHost', () => ({RekuestSceneHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));
vi.mock('@/rekuest/scene/RekuestAssetHost', () => ({RekuestAssetHost: ({children}: {children: React.ReactNode}) => <>{children}</>}));

const frame = () => act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));

/** `<Text text={args.dataset.object} />`, as the server stores it. */
const tree = [{id: 'root', component: 'Text', props: [{key: 'text', dynamic_value: {path: 'args.dataset.object'}}]}];
const dataset = (object: string) => ({__identifier: '@mikro/arraydataset', object});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('a blok opened for an item', () => {
  it('reads the item at args, and follows when it is opened for another', async () => {
    const materializedBlok = {
      id: '12',
      blok: {componentTree: tree, resolvedLocals: [], dependencies: [], args: [{key: 'dataset'}]},
      agentMappings: [],
    };
    const onArgsChange = vi.fn();
    const view = render(
      <MaterializedBlokRenderer surfaceId="inspector" materializedBlok={materializedBlok} args={{dataset: dataset('7')}} onArgsChange={onArgsChange} />,
    );
    await frame();
    expect(view.container.textContent).toContain('7');

    view.rerender(
      <MaterializedBlokRenderer surfaceId="inspector" materializedBlok={materializedBlok} args={{dataset: dataset('8')}} onArgsChange={onArgsChange} />,
    );
    await frame();
    expect(view.container.textContent).toContain('8');
    // The page's own change is not reported back to it.
    expect(onArgsChange).not.toHaveBeenCalled();
  });

  it('tells the page when the tree changes what it is opened for', async () => {
    const onArgsChange = vi.fn();
    render(
      <MaterializedBlokRenderer
        surfaceId="note"
        materializedBlok={{
          id: '13',
          blok: {
            componentTree: [{id: 'note', component: 'Input', props: [{key: 'bind', dynamic_value: {path: 'args.note'}}]}],
            resolvedLocals: [],
            dependencies: [],
            args: [{key: 'note'}],
          },
          agentMappings: [],
        }}
        args={{note: 'alpha'}}
        onArgsChange={onArgsChange}
      />,
    );
    await frame();
    fireEvent.change(screen.getByRole('textbox'), {target: {value: 'beta'}});
    await frame();
    expect(onArgsChange).toHaveBeenLastCalledWith({note: 'beta'});
  });
});
