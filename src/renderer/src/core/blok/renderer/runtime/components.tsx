import * as React from 'react';
import {z} from 'zod';
import {BlokResolutionError, useNodeStatus, useResolvedProp} from './hooks';
import {useBlokRuntime} from './context';
import {BlokNodeStateContext, type BlokNodeState} from './nodeState';
import {readScopedPath, useBlokScope} from './scope';
import {READY, combineStatus, type BlokSourceStatus} from './status';
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
   * control flow that renders nothing of its own (`foreach`, `if`, `fragment`).
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
  /**
   * The prop naming where this component writes a record it owns (a read's
   * `BlokResourceRecord`): `"bind"` on `Query`. The editor warns when another
   * node binds the same path, since only one may write it.
   */
  writesRecordTo?: string;
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
  writesRecordTo: api.writesRecordTo,
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

/* -------------------------------------------------------------------------- */
/* Statuses, guards and boundaries                                            */
/* -------------------------------------------------------------------------- */

/** The renderer a node draws in: what decides how a pending node shows (a skeleton only in html). */
export const BlokDrawContext = React.createContext<BlokComponentContext>('html');

export const useBlokDrawContext = (): BlokComponentContext => React.useContext(BlokDrawContext);

/**
 * What the nearest `<suspense>` collects: each node below it that is pending
 * or failed. A node reports while it is mounted, and withdraws on unmount.
 */
export type BlokSuspenseReporter = {report: (nodeId: string, status: BlokSourceStatus | null) => void};

export const BlokSuspenseContext = React.createContext<BlokSuspenseReporter | null>(null);

/** Reports a node's status to the nearest boundary; returns whether one caught it. */
export const useSuspenseReport = (nodeId: string, status: BlokSourceStatus): boolean => {
  const boundary = React.useContext(BlokSuspenseContext);
  const suspends = status.status === 'pending' || status.status === 'failed';
  React.useEffect(() => {
    if (!boundary) return;
    boundary.report(nodeId, suspends ? status : null);
  }, [boundary, nodeId, status, suspends]);
  React.useEffect(() => {
    if (!boundary) return;
    return () => boundary.report(nodeId, null);
  }, [boundary, nodeId]);
  return boundary !== null;
};

/** `when={...}` on any component guards that one component; `if` and `else` read it as their condition. */
export const WHEN_PROP = 'when';
const OWN_WHEN = new Set(['if', 'else']);
const WHEN_SCHEMA = z.unknown();

const NodeSkeleton = ({componentId}: {componentId: string}) => (
  <div
    data-blok-pending={componentId}
    aria-busy="true"
    className="h-5 w-full max-w-48 animate-pulse rounded-md bg-muted"
  />
);

const NodeGuard = (props: {
  component: BlokComponentNode;
  definition: BlokComponentDefinition;
  children: React.ReactNode;
}) => {
  const {component, definition} = props;
  const drawContext = React.useContext(BlokDrawContext);
  const guarded = !OWN_WHEN.has(component.component) && (component.props ?? []).some(prop => prop.key === WHEN_PROP);
  const guard = useResolvedProp(component, guarded ? WHEN_PROP : undefined, WHEN_SCHEMA);
  const nodeStatus = useNodeStatus(component, definition.schema);
  const guardStatus = guard.ok ? (guard.status ?? READY) : READY;
  const status = combineStatus(nodeStatus, guardStatus);
  const caught = useSuspenseReport(component.id, status);

  // Busy while a task one of its callbacks started runs: a promise the host returned, or a record it writes.
  const [inFlight, setInFlight] = React.useState(0);
  const track = React.useCallback((pending: Promise<unknown>) => {
    setInFlight(count => count + 1);
    const settle = () => setInFlight(count => Math.max(0, count - 1));
    pending.then(settle, settle);
  }, []);
  const scope = useBlokScope();
  const intoNames = React.useMemo(
    () => (component.props ?? []).flatMap(prop => (prop.agent_call && prop.declares_value ? [prop.declares_value] : [])),
    [component.props],
  );
  const intoRunning = useBlokRuntime(state =>
    intoNames.some(name => {
      const record = readScopedPath(state.dataModel, name, scope);
      return typeof record === 'object' && record !== null && (record as {running?: unknown}).running === true;
    }),
  );
  const stale = status.status === 'stale';
  const busy = inFlight > 0 || intoRunning;
  const nodeState = React.useMemo<BlokNodeState>(() => ({stale, busy, track}), [busy, stale, track]);

  if (status.status === 'pending' || status.status === 'failed') {
    // Inside a boundary its fallback or error shows; on its own a node shows
    // its own skeleton or inline error, so a blok never blanks entirely.
    if (caught || definition.placement?.inheritsContext || drawContext !== 'html') return null;
    if (status.status === 'failed') {
      return <BlokNodeError componentId={component.id} title="Could not load" detail={status.error ?? undefined} />;
    }
    return <NodeSkeleton componentId={component.id} />;
  }
  if (guarded && guard.ok && !guard.value) return null;

  return <BlokNodeStateContext.Provider value={nodeState}>{props.children}</BlokNodeStateContext.Provider>;
};

const BlokComponentRendererInner = (props: {
  definition: BlokComponentDefinition;
  props: ReadonlyArray<BlokComponentProp>;
  buildChild: (id: string, basePath?: string) => React.ReactNode;
  component: BlokComponentNode;
}) => {
  const RenderComponent = props.definition.render;
  const parentContext = React.useContext(BlokDrawContext);
  const placement = props.definition.placement ?? {};
  const own = placement.inheritsContext ? parentContext : (placement.context ?? 'html');
  const forChildren = placement.inheritsContext ? parentContext : (placement.childrenContext ?? own);

  return (
    <BlokNodeBoundary
      componentId={props.component.id}
      componentName={props.definition.name}
    >
      <BlokDrawContext.Provider value={own}>
        <NodeGuard component={props.component} definition={props.definition}>
          <BlokDrawContext.Provider value={forChildren}>
            <RenderComponent
              props={props.props}
              buildChild={props.buildChild}
              component={props.component}
              schema={props.definition.schema}
            />
          </BlokDrawContext.Provider>
        </NodeGuard>
      </BlokDrawContext.Provider>
    </BlokNodeBoundary>
  );
};

/**
 * Memoized so a store update re-renders only the nodes that subscribe to the
 * changed paths, instead of the whole tree walking down from the root.
 */
export const BlokComponentRenderer = React.memo(BlokComponentRendererInner);
