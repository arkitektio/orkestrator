import * as React from 'react';
import {ErrorBoundary} from 'react-error-boundary';
import {parseBsxPartial} from '@/core/blok/bsx';
import type {BlokComponentNode} from '@/core/blok/renderer/runtime/types';
import {CodeBlock} from '@/core/ui/markdown';
import {ErrorNote} from '@/core/ui/error-note';
import {DemoBlokRenderer} from './DemoBlokRenderer';

/** A draft declares nothing: it is drawn against an empty demo, bound to no agent, running nothing. */
const NO_DECLARATIONS = {resolvedLocals: [], demo: null, queries: [], subscriptions: []} as const;

/**
 * A blok's BSX source in a message (a ```bsx fence), drawn as a live preview:
 * while a model is still streaming it, as far as it goes (`parseBsxPartial`).
 * A demo only -- no agent is bound and no action runs. The source folds below.
 */
export const BsxDraftPreview = ({source}: {source: string}) => {
  const surfaceId = `bsx-draft-${React.useId()}`;
  const parsed = React.useMemo(() => parseBsxPartial(source), [source]);
  // While the source arrives a prefix can stop parsing for a moment: keep what was drawn.
  const lastTree = React.useRef<BlokComponentNode | null>(null);
  if (parsed.tree) lastTree.current = parsed.tree;
  const tree = lastTree.current;

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border/60">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>Draft preview</span>
        <span>{parsed.complete ? 'demo' : parsed.error && !parsed.tree ? parsed.error.message : 'drafting…'}</span>
      </div>
      <div className="p-3">
        {tree ? (
          <ErrorBoundary
            resetKeys={[tree]}
            fallbackRender={({error}) => <ErrorNote error={error} title="The preview could not draw this" />}
          >
            <DemoBlokRenderer surfaceId={surfaceId} blok={{id: 'draft', componentTree: [tree], ...NO_DECLARATIONS}} />
          </ErrorBoundary>
        ) : (
          <p className="text-xs text-muted-foreground">The preview shows once the source starts to parse.</p>
        )}
      </div>
      <details className="border-t border-border/40 px-3 py-1 text-xs">
        <summary className="cursor-pointer select-none text-muted-foreground">Source</summary>
        <CodeBlock language="bsx" content={source} />
      </details>
    </div>
  );
};

export default BsxDraftPreview;
