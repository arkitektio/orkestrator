// @vitest-environment jsdom
import * as React from 'react';
import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import tree from '@/core/blok/renderer/bloks/logo/logo.fixture.json';

/**
 * The first showing of a logo draws its blok and keeps the svg; every later one
 * with the same hash is an <img> of it, without fetching the tree. jsdom has no
 * IndexedDB, so the cache answers from its in-memory side.
 */
const BLOK = {
  id: 'logo-blok',
  hash: 'h1',
  componentTree: tree,
  demoState: {self: {Status: {lamps: [{color: 'lime'}]}}},
};

const useLogoBlokQuery = vi.fn(() => ({data: {blok: BLOK}}));

vi.mock('@/rekuest/api/graphql', async importOriginal => ({
  ...(await importOriginal<typeof import('@/rekuest/api/graphql')>()),
  useLogoBlokQuery: () => useLogoBlokQuery(),
}));
vi.mock('@/rekuest/scene/RekuestSceneHost', () => ({
  RekuestSceneHost: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));
vi.mock('@/rekuest/scene/RekuestAssetHost', () => ({
  RekuestAssetHost: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

const agent = (hash: string) => ({logo: {id: 'materialized', blok: {id: BLOK.id, hash}}});

afterEach(cleanup);

describe('an agent logo', () => {
  it('is drawn once, kept, and then shown from what was kept', async () => {
    const {AgentLogo} = await import('./AgentLogo');

    const first = render(<AgentLogo agent={agent('h1') as never} className="h-8 w-8" />);
    // The first showing draws the blok itself...
    await waitFor(() => expect(first.container.querySelector('svg[data-blok-svg]')).not.toBeNull());
    // ...and once the drawing settles, it is replaced by the kept svg.
    const img = await waitFor(() => {
      const found = first.container.querySelector('img');
      expect(found).not.toBeNull();
      return found as HTMLImageElement;
    });
    expect(img.src).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(img.src)).toContain('fill="lime"');
    expect(first.container.querySelector('svg[data-blok-svg]')).toBeNull();
    first.unmount();

    useLogoBlokQuery.mockClear();
    const again = render(<AgentLogo agent={agent('h1') as never} className="h-8 w-8" />);
    await waitFor(() => expect(again.container.querySelector('img')).not.toBeNull());
    expect(useLogoBlokQuery).not.toHaveBeenCalled();
  });

  it('draws again when the blok changed', async () => {
    const {AgentLogo} = await import('./AgentLogo');
    useLogoBlokQuery.mockClear();
    useLogoBlokQuery.mockImplementation(() => ({data: {blok: {...BLOK, hash: 'h2'}}}));

    const changed = render(<AgentLogo agent={agent('h2') as never} className="h-8 w-8" />);
    await waitFor(() => expect(changed.container.querySelector('img')).not.toBeNull());
    expect(useLogoBlokQuery).toHaveBeenCalled();
  });

  it('shows nothing for an agent without a logo', async () => {
    const {AgentLogo} = await import('./AgentLogo');
    const none = render(<AgentLogo agent={{logo: null} as never} />);
    expect(none.container.innerHTML).toBe('');
  });
});
