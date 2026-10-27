import {render} from '@testing-library/react';
import {parseBsx} from '../../bsx/parse';
import {invokeBlokFunction} from '../functions/v2/handler';
import {
  BlokNode,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokRuntimeStore,
  preflightBlokDocument,
  type BlokCatalog,
  type BlokRuntimeStore,
  type BlokSourceStatus,
} from '../runtime';

export type RenderBlokOptions = {
  /** Source statuses by data-model path (`deps.robot.arm`: pending). */
  statuses?: Readonly<Record<string, BlokSourceStatus>>;
  /** The moment shown while travelling. */
  travelAt?: string | null;
  /** Wraps what is rendered (a context a host provides). */
  wrap?: (children: React.ReactNode) => React.ReactNode;
};

/**
 * Renders a blok payload the way the real surface does — through the
 * preflight, the runtime store and `BlokNode`, with the v2 function library —
 * so a component test exercises prop resolution and the catalog, not just the
 * React component.
 */
export const renderBlokDocument = (
  catalog: BlokCatalog,
  roots: unknown[],
  initialState?: unknown,
  options: RenderBlokOptions = {},
): {store: BlokRuntimeStore; errors: ReturnType<typeof preflightBlokDocument>['errors']; unmount: () => void} => {
  const preflight = preflightBlokDocument(roots, catalog);
  const store = createBlokRuntimeStore({
    initialDataModel: initialState,
    invokeFunction: invokeBlokFunction,
    statuses: options.statuses,
    travelAt: options.travelAt ?? null,
  });

  const tree = (
    <BlokRuntimeProvider store={store}>
      <BlokTreeProvider tree={{catalog, nodes: preflight.nodes, invalidNodes: preflight.invalidNodes}}>
        {preflight.rootIds.map(id => (
          <BlokNode key={id} id={id} />
        ))}
      </BlokTreeProvider>
    </BlokRuntimeProvider>
  );
  const {unmount} = render(<>{options.wrap ? options.wrap(tree) : tree}</>);

  return {store, errors: preflight.errors, unmount};
};

/** `renderBlokDocument` of a BSX source, parsed by the v2 parser. */
export const renderBsx = (
  catalog: BlokCatalog,
  source: string,
  initialState?: unknown,
  options: RenderBlokOptions = {},
) => renderBlokDocument(catalog, [parseBsx(source).tree], initialState, options);
