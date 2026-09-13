import * as React from 'react';
import {normalizeBlokComponentTree, type BlokComponentTreeConversion} from '@/blok/renderer/runtime';

/**
 * Bridges the typed `Blok.components` GraphQL tree to the blok runtime's
 * payload shape. The fragment selects the tree to a fixed depth
 * (`graphql/rekuest-next/fragments/blok.graphql`); nodes beyond it come back
 * as bare `{ id }` stubs, are dropped, and are reported through `truncatedIds`
 * so the surface can say so instead of rendering a silently pruned blok.
 */
export const useBlokDocument = (
  components: ReadonlyArray<unknown> | null | undefined,
): BlokComponentTreeConversion =>
  React.useMemo(() => normalizeBlokComponentTree(components), [components]);

export const BlokTruncationNotice = ({truncatedIds}: {truncatedIds: readonly string[]}) => {
  if (truncatedIds.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
      This blok nests deeper than the client fetches. {truncatedIds.length} component
      {truncatedIds.length === 1 ? '' : 's'} not rendered:{' '}
      <span className="font-mono text-xs">{truncatedIds.join(', ')}</span>
    </div>
  );
};
