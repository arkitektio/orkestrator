// @vitest-environment jsdom
import * as React from 'react';
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {CachedBlokPreview, type UseBlokTree} from './CachedBlokPreview';
import {loadPreview, previewFailed} from './previewCache';
import {useBlokReady} from './snapshotMode';

afterEach(cleanup);

const text = (value: string) => [{id: 'p', component: 'Text', props: [{key: 'text', static_value: value}]}];
const treeOf = (componentTree: unknown, hash: string): UseBlokTree => () => ({componentTree, resolvedLocals: [], demo: {}, hash});

/** Stands for a part that never becomes what the blok looks like (a model that cannot load). */
const FailingHost = ({children}: {children: React.ReactNode}) => {
  useBlokReady('failed', 'no model');
  return <>{children}</>;
};

describe('a cached blok preview', () => {
  it('draws the blok offscreen once, keeps it, and places it inert', async () => {
    const useTree = treeOf(text('Hello preview'), 'h1');
    const view = render(
      <CachedBlokPreview cacheId="blok-a" hash="h1" useTree={useTree} fallback={<span>icon</span>} />,
    );
    expect(await screen.findByText('icon')).toBeTruthy();

    await waitFor(async () => expect((await loadPreview('blok-a', 'h1'))?.html).toContain('Hello preview'), {
      timeout: 3000,
    });
    // Placed from the kept markup, and nothing is left offscreen.
    await waitFor(() => expect(view.container.querySelector('[inert]')?.textContent).toContain('Hello preview'));
    expect(screen.queryByText('icon')).toBeNull();
    expect(document.body.querySelectorAll('[inert]')).toHaveLength(1);
  });

  it('keeps nothing when a part fails, remembers it, and frees the slot for the next one', async () => {
    render(
      <>
        <CachedBlokPreview
          cacheId="blok-b"
          hash="h1"
          useTree={treeOf(text('Broken'), 'h1')}
          Host={FailingHost}
          fallback={<span>icon-b</span>}
        />
        <CachedBlokPreview cacheId="blok-c" hash="h1" useTree={treeOf(text('Next one'), 'h1')} />
      </>,
    );

    await waitFor(() => expect(previewFailed('blok-b', 'h1')).toBe(true), {timeout: 3000});
    expect(await loadPreview('blok-b', 'h1')).toBeNull();
    expect(screen.getByText('icon-b')).toBeTruthy();
    await waitFor(async () => expect((await loadPreview('blok-c', 'h1'))?.html).toContain('Next one'), {
      timeout: 3000,
    });
  });

  it('gives up on a tree that will not come', async () => {
    render(<CachedBlokPreview cacheId="blok-d" hash="h1" useTree={() => null} />);
    await waitFor(() => expect(previewFailed('blok-d', 'h1')).toBe(true), {timeout: 3000});
  });
});
