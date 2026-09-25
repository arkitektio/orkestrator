import {render} from '@testing-library/react';
import {
  BlokNode,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokRuntimeStore,
  preflightBlokDocument,
  type BlokCatalog,
  type BlokRuntimeStore,
} from '../runtime';

/**
 * Renders a blok payload the way the real surface does — through the
 * preflight, the runtime store and `BlokNode` — so a component test exercises
 * prop resolution and the catalog, not just the React component.
 */
export const renderBlokDocument = (
  catalog: BlokCatalog,
  roots: unknown[],
  initialState?: unknown,
): {store: BlokRuntimeStore; errors: ReturnType<typeof preflightBlokDocument>['errors']} => {
  const preflight = preflightBlokDocument(roots, catalog);
  const store = createBlokRuntimeStore({initialDataModel: initialState});
  store
    .getState()
    .setInvokeFunction((name, args, options) => catalog.invokeFunction(name, args, options));

  render(
    <BlokRuntimeProvider store={store}>
      <BlokTreeProvider
        tree={{catalog, nodes: preflight.nodes, invalidNodes: preflight.invalidNodes}}
      >
        {preflight.rootIds.map(id => (
          <BlokNode key={id} id={id} />
        ))}
      </BlokTreeProvider>
    </BlokRuntimeProvider>,
  );

  return {store, errors: preflight.errors};
};
