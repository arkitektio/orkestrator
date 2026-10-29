// @vitest-environment jsdom
import * as React from 'react';
import {cleanup, render, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';

/** A first drawing settles before it is kept; a loaded test run takes longer than waitFor's default. */
const SLOW = {timeout: 5000};
import tree from '@arkitektio/bsx/renderer/bloks/logo/logo.fixture.json';
import {AgentLogo, BlokLogo} from './BlokLogo';
import {installAppBlokCatalog} from '@/core/blok/testing';

installAppBlokCatalog();

/**
 * The first showing of a logo draws its blok and keeps the svg; every later one
 * with the same hash places it inline, without fetching the tree. jsdom has no
 * IndexedDB, so the cache answers from its in-memory side.
 */
const BLOK = {
  id: 'logo-blok',
  hash: 'h1',
  componentTree: tree,
  // The v2 demo: an agent's logo reads `self`, which is `deps.self`.
  demo: {deps: {self: {status: {lamps: [{name: 'a', pen: 'success'}]}}}},
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

/** A kept drawing, placed inline: its ids are moved to a `logo…` prefix, a first drawing's are `svg…`. */
const KEPT = 'span[data-logo-host] > svg[data-blok-prefix^="logo"]';

afterEach(cleanup);

// A first drawing renders the blok (its renderer lazy-loaded) and settles before it is kept: slow under a loaded run.
describe('an agent logo', {timeout: 20000}, () => {
  it('is drawn once, kept, and then shown from what was kept', async () => {

    const first = render(<AgentLogo agent={agent('h1') as never} className="h-8 w-8" />);
    // The first showing draws the blok itself...
    await waitFor(() => expect(first.container.querySelector('svg[data-blok-svg]')).not.toBeNull(), SLOW);
    // ...and once the drawing settles, it is replaced by the kept svg, inline.
    const kept = await waitFor(() => {
      const found = first.container.querySelector(KEPT);
      expect(found).not.toBeNull();
      return found as SVGSVGElement;
    }, SLOW);
    expect(kept.querySelector('circle[fill="var(--logo-success)"]')).not.toBeNull();
    const gradient = kept.querySelector('linearGradient');
    expect(gradient?.id.startsWith(kept.getAttribute('data-blok-prefix') ?? '-')).toBe(true);
    expect(kept.querySelector('rect')?.getAttribute('fill')).toBe(`url(#${gradient?.id})`);
    first.unmount();

    useLogoBlokQuery.mockClear();
    const again = render(
      <>
        <AgentLogo agent={agent('h1') as never} className="h-8 w-8" />
        <AgentLogo agent={agent('h1') as never} className="h-8 w-8" />
      </>,
    );
    await waitFor(() => expect(again.container.querySelectorAll(KEPT)).toHaveLength(2));
    expect(useLogoBlokQuery).not.toHaveBeenCalled();
    // Two copies on one page never share a gradient.
    const ids = [...again.container.querySelectorAll('linearGradient')].map(found => found.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('draws again when the blok changed', async () => {
    useLogoBlokQuery.mockClear();
    useLogoBlokQuery.mockImplementation(() => ({data: {blok: {...BLOK, hash: 'h2'}}}));

    const changed = render(<AgentLogo agent={agent('h2') as never} className="h-8 w-8" />);
    await waitFor(() => expect(changed.container.querySelector(KEPT)).not.toBeNull(), SLOW);
    expect(useLogoBlokQuery).toHaveBeenCalled();
  });

  it('draws an action by the blok it names, from the same cache', async () => {
    useLogoBlokQuery.mockClear();
    useLogoBlokQuery.mockImplementation(() => ({data: {blok: BLOK}}));

    // The test before kept this blok's drawing for h2, which replaced the one for h1.
    const action = render(<BlokLogo blok={{id: BLOK.id, hash: 'h2'} as never} className="h-4 w-4" />);
    await waitFor(() => expect(action.container.querySelector(KEPT)).not.toBeNull());
    expect(useLogoBlokQuery).not.toHaveBeenCalled();
  });

  it('shows nothing for an agent without a logo', async () => {
    const none = render(<AgentLogo agent={{logo: null} as never} />);
    expect(none.container.innerHTML).toBe('');
  });
});
