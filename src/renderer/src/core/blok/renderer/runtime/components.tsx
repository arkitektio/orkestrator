import * as React from 'react';
import {BlokResolutionError} from './hooks';
import type {BlokComponentNode, BlokComponentProp, BlokObjectSchema} from './types';

export type BlokRenderArgs<TSchema extends BlokObjectSchema = BlokObjectSchema> = {
  props: ReadonlyArray<BlokComponentProp>;
  buildChild: (id: string, basePath?: string) => React.ReactNode;
  component: BlokComponentNode;
  schema: TSchema;
};

/** The renderer a component lives in. A blok's tree starts in `html`. */
export type BlokComponentContext = 'html' | 'scene' | 'logo';

/**
 * Where a component may sit in a tree. Published with the catalog, so the
 * server refuses a misplaced component at registration instead of the viewer
 * failing at render.
 */
export type BlokComponentPlacement = {
  /** The context the component may be placed in. Defaults to `html`. */
  context?: BlokComponentContext;
  /** The context of its children when it differs from its own: it bridges two renderers. */
  childrenContext?: BlokComponentContext;
  /**
   * Placed in whichever context is in force, which its children inherit:
   * control flow that renders nothing of its own (`foreach`, `if`, `Fragment`).
   * `context` and `childrenContext` are then ignored.
   */
  inheritsContext?: boolean;
  /** At least one of these must be an ancestor, at any depth. */
  downstreamOf?: readonly string[];
  /** None of these may be an ancestor. */
  notDownstreamOf?: readonly string[];
};

/** Props the server holds to more than their shape: an `ASSET` prop names a file its app registered. */
export type BlokPropKind = 'ASSET';

type BlokComponentApi = {
  /** Set when the component renders declared children its schema has no `children` prop for. */
  acceptsChildren?: boolean;
  placement?: BlokComponentPlacement;
  propKinds?: Readonly<Record<string, BlokPropKind>>;
};

export type BlokComponentDefinition = BlokComponentApi & {
  name: string;
  schema: BlokObjectSchema;
  render: React.ComponentType<BlokRenderArgs>;
};

export const createBlokComponent = <TSchema extends BlokObjectSchema>(
  api: BlokComponentApi & {name: string; schema: TSchema},
  render: React.ComponentType<BlokRenderArgs<TSchema>>,
): BlokComponentDefinition => ({
  name: api.name,
  schema: api.schema,
  acceptsChildren: api.acceptsChildren,
  placement: api.placement,
  propKinds: api.propKinds,
  render: render as React.ComponentType<BlokRenderArgs>,
});

export type BlokNodeErrorProps = {componentId: string; title: string; detail?: string};

/**
 * How a node's error is shown where the default card cannot be: inside a 3D
 * scene nothing can render a `div`, so the scene reports the error beside the
 * view instead.
 */
export const BlokNodeErrorSurface = React.createContext<React.ComponentType<BlokNodeErrorProps> | null>(
  null,
);

/** Inline, non-fatal error display for a single node. */
export const BlokNodeError = (props: BlokNodeErrorProps) => {
  const Surface = React.useContext(BlokNodeErrorSurface);
  return Surface ? <Surface {...props} /> : <BlokNodeErrorCard {...props} />;
};

const BlokNodeErrorCard = (props: BlokNodeErrorProps) => (
  <div data-blok-error={props.componentId} className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
    <div className="font-medium text-destructive">{props.title}</div>
    {props.detail ? <div className="mt-1 text-foreground">{props.detail}</div> : null}
    <div className="mt-1 text-xs text-muted-foreground">Component: {props.componentId}</div>
  </div>
);

type BlokNodeBoundaryProps = {
  componentId: string;
  componentName: string;
  children: React.ReactNode;
};

type BlokNodeBoundaryState = {error: Error | null};

/**
 * Contains a failure to the node that caused it.
 *
 * Without this, anything thrown while resolving a prop — an unknown catalog
 * function, mismatched function arguments, a component blowing up on malformed
 * data — unmounts the entire surface. A blok payload is untrusted input from
 * the backend, so a bad node must degrade to an error card, not a blank screen.
 */
export class BlokNodeBoundary extends React.Component<
  BlokNodeBoundaryProps,
  BlokNodeBoundaryState
> {
  constructor(props: BlokNodeBoundaryProps) {
    super(props);
    this.state = {error: null};
  }

  static getDerivedStateFromError(error: Error): BlokNodeBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error) {
    console.error(`[blok] node "${this.props.componentId}" failed to render`, error);
  }

  componentDidUpdate(previousProps: BlokNodeBoundaryProps) {
    // A new payload gets a fresh chance to render.
    if (previousProps.componentId !== this.props.componentId && this.state.error) {
      this.setState({error: null});
    }
  }

  render() {
    const {error} = this.state;

    if (!error) {
      return this.props.children;
    }

    const title =
      error instanceof BlokResolutionError
        ? `Cannot resolve "${error.propKey}" on <${this.props.componentName}>`
        : `<${this.props.componentName}> failed to render`;

    return (
      <BlokNodeError componentId={this.props.componentId} title={title} detail={error.message} />
    );
  }
}

const BlokComponentRendererInner = (props: {
  definition: BlokComponentDefinition;
  props: ReadonlyArray<BlokComponentProp>;
  buildChild: (id: string, basePath?: string) => React.ReactNode;
  component: BlokComponentNode;
}) => {
  const RenderComponent = props.definition.render;

  return (
    <BlokNodeBoundary
      componentId={props.component.id}
      componentName={props.definition.name}
    >
      <RenderComponent
        props={props.props}
        buildChild={props.buildChild}
        component={props.component}
        schema={props.definition.schema}
      />
    </BlokNodeBoundary>
  );
};

/**
 * Memoized so a store update re-renders only the nodes that subscribe to the
 * changed paths, instead of the whole tree walking down from the root.
 */
export const BlokComponentRenderer = React.memo(BlokComponentRendererInner);
