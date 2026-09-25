import * as React from 'react';
import {BlokComponentRenderer, BlokNodeError} from './components';
import type {BlokCatalog} from './functions';
import {BlokScopeProvider} from './scope';
import type {BlokComponentNode} from './types';

/** A node that passed preflight and is ready to render. */
export type PreparedBlokNode = {
  id: string;
  component: string;
  node: BlokComponentNode;
};

export type BlokTree = {
  catalog: BlokCatalog;
  nodes: ReadonlyMap<string, PreparedBlokNode>;
  /** Nodes that failed preflight, rendered inline where they are referenced. */
  invalidNodes: ReadonlyMap<string, string[]>;
};

const BlokTreeContext = React.createContext<BlokTree | null>(null);

const EMPTY_TRAIL: ReadonlyArray<string> = Object.freeze([]);
const BlokTrailContext = React.createContext<ReadonlyArray<string>>(EMPTY_TRAIL);

export const BlokTreeProvider = (props: {tree: BlokTree; children: React.ReactNode}) => (
  <BlokTreeContext.Provider value={props.tree}>{props.children}</BlokTreeContext.Provider>
);

export const useBlokTree = (): BlokTree => {
  const tree = React.useContext(BlokTreeContext);
  if (!tree) {
    throw new Error('Blok components must be rendered inside a BlokTreeProvider.');
  }

  return tree;
};

export const useBlokCatalog = (): BlokCatalog => useBlokTree().catalog;

type BlokNodeProps = {
  id: string;
  /** Resolves this subtree's paths relative to the given data-model path. */
  basePath?: string;
};

/**
 * Renders one node by id.
 *
 * Rendering is driven from the node itself rather than from a recursive
 * closure in `BlokRenderer`, so the tree is made of real memoized components:
 * a store update re-renders the nodes that subscribe to the changed paths
 * instead of re-walking from the root.
 */
const BlokNodeInner = ({id, basePath}: BlokNodeProps) => {
  const tree = useBlokTree();
  const trail = React.useContext(BlokTrailContext);

  const nextTrail = React.useMemo(() => [...trail, id], [trail, id]);

  // `buildChild` never closes over the trail or the tree — a child reads both
  // from context — so its identity is stable for the life of the node.
  const buildChild = React.useCallback(
    (childId: string, childBasePath?: string) => (
      <BlokNode id={childId} basePath={childBasePath} />
    ),
    [],
  );

  if (trail.includes(id)) {
    return (
      <BlokNodeError
        componentId={id}
        title="Recursive child reference"
        detail={`"${id}" is already being rendered further up this branch.`}
      />
    );
  }

  const invalidReasons = tree.invalidNodes.get(id);
  if (invalidReasons) {
    return (
      <BlokNodeError
        componentId={id}
        title="Invalid component"
        detail={invalidReasons.join(' ')}
      />
    );
  }

  const prepared = tree.nodes.get(id);
  if (!prepared) {
    return (
      <BlokNodeError
        componentId={id}
        title="Unknown component reference"
        detail={`No component with id "${id}" exists in this payload.`}
      />
    );
  }

  const definition = tree.catalog.components.get(prepared.component);
  if (!definition) {
    return (
      <BlokNodeError
        componentId={id}
        title="Unknown component"
        detail={`"${prepared.component}" is not registered in catalog ${tree.catalog.id}.`}
      />
    );
  }

  const rendered = (
    <BlokTrailContext.Provider value={nextTrail}>
      <BlokComponentRenderer
        definition={definition}
        props={prepared.node.props ?? []}
        buildChild={buildChild}
        component={prepared.node}
      />
    </BlokTrailContext.Provider>
  );

  if (!basePath) {
    return rendered;
  }

  return <BlokScopeProvider basePath={basePath}>{rendered}</BlokScopeProvider>;
};

export const BlokNode = React.memo(BlokNodeInner);
BlokNode.displayName = 'BlokNode';
