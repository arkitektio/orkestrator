import {useEffect, useMemo, useRef, useState} from 'react';
import {cn} from '@/core/lib/utils';
import {toast} from 'sonner';
import BlokDebugState from './BlokDebugState';
import {defaultBlokCatalog} from './catalog';
import {
  BlokNode,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokRuntimeStore,
  preflightBlokDocument,
  type BlokCatalog,
  type BlokDispatchActionHandler,
  type BlokInvokeFunctionHandler,
  type BlokTree,
} from './runtime';

type BlokRendererProps = {
  surfaceId?: string;
  uiComponents?: unknown;
  initialState?: unknown;
  /** Component/function catalog to validate and render against. */
  catalog?: BlokCatalog;
  invokeFunction?: BlokInvokeFunctionHandler;
  dispatchAction?: BlokDispatchActionHandler;
  chrome?: 'default' | 'minimal';
  sizing?: 'fill' | 'intrinsic';
  /** Shows the floating runtime-state inspector. Off by default. */
  debug?: boolean;
  children?: React.ReactNode;
};

const DEFAULT_SURFACE_ID = 'blok-preview';

export default function BlokRenderer({
  surfaceId = DEFAULT_SURFACE_ID,
  uiComponents,
  initialState,
  catalog = defaultBlokCatalog,
  invokeFunction,
  dispatchAction,
  chrome = 'default',
  sizing = 'fill',
  debug = false,
  children,
}: BlokRendererProps) {
  const preflight = useMemo(
    () => preflightBlokDocument(uiComponents, catalog),
    [catalog, uiComponents],
  );

  const [runtimeStore] = useState(() =>
    createBlokRuntimeStore({initialDataModel: initialState}),
  );

  const tree = useMemo<BlokTree>(
    () => ({
      catalog,
      nodes: preflight.nodes,
      invalidNodes: preflight.invalidNodes,
    }),
    [catalog, preflight],
  );

  const resolvedInvokeFunction = useMemo<BlokInvokeFunctionHandler>(
    () =>
      invokeFunction ??
      ((name, args, options) => catalog.invokeFunction(name, args, options)),
    [catalog, invokeFunction],
  );

  const resolvedDispatchAction = useMemo<BlokDispatchActionHandler>(
    () =>
      dispatchAction ??
      (action => {
        toast.info(
          action.dependency
            ? `Preview action captured on ${surfaceId}: ${action.operation} on ${action.dependency}`
            : `Preview action captured on ${surfaceId}: ${action.operation}`,
        );
      }),
    [dispatchAction, surfaceId],
  );

  useEffect(() => {
    runtimeStore.getState().setInitialDataModel(initialState);
  }, [initialState, runtimeStore]);

  useEffect(() => {
    runtimeStore.getState().setInvokeFunction(resolvedInvokeFunction);
  }, [resolvedInvokeFunction, runtimeStore]);

  useEffect(() => {
    runtimeStore.getState().setDispatchAction(resolvedDispatchAction);
  }, [resolvedDispatchAction, runtimeStore]);

  // Swapping the payload in place must not carry the previous blok's local
  // edits — the paths they were written against no longer mean the same thing.
  const previousNodesRef = useRef(preflight.nodes);
  useEffect(() => {
    if (previousNodesRef.current !== preflight.nodes) {
      previousNodesRef.current = preflight.nodes;
      runtimeStore.getState().resetRuntimeValues();
    }
  }, [preflight.nodes, runtimeStore]);

  const sizingClassName =
    sizing === 'intrinsic'
      ? 'inline-flex max-w-full max-h-full flex-col overflow-auto'
      : 'h-full w-full overflow-auto';

  const containerClassName = cn(
    'a2ui-container relative',
    sizingClassName,
    chrome === 'minimal'
      ? 'rounded-xl border border-border/50 bg-background/90 p-1 shadow-sm'
      : 'rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur-sm',
  );

  // Errors that belong to a node render inline at that node; only payload-level
  // problems (a root that could not be parsed at all) are summarized here.
  const documentErrors = preflight.errors.filter(error => !error.componentId);
  const renderableRootIds = preflight.rootIds.filter(
    rootId => preflight.nodes.has(rootId) || preflight.invalidNodes.has(rootId),
  );

  return (
    <BlokRuntimeProvider store={runtimeStore}>
      <BlokTreeProvider tree={tree}>
        {children}
        <div className={containerClassName}>
          {debug && <BlokDebugState surfaceId={surfaceId} />}

          {documentErrors.length > 0 && (
            <div
              className={cn(
                'rounded-xl border border-destructive/30 bg-background/80 p-4',
                chrome === 'minimal' ? 'mb-2' : 'mb-4',
              )}
            >
              <h3 className="text-sm font-semibold text-destructive">
                Blok payload could not be parsed
              </h3>
              <ul className="mt-2 space-y-1">
                {documentErrors.map((error, index) => (
                  <li key={`${error.path}-${index}`} className="text-sm">
                    <span className="font-mono text-xs text-destructive">{error.path}</span>
                    <span className="ml-2 text-foreground">{error.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {renderableRootIds.length === 0 && documentErrors.length === 0 && (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30 px-6 text-sm text-muted-foreground">
              No blok components available for this preview yet.
            </div>
          )}

          {renderableRootIds.map(rootId => (
            <div key={rootId} className="min-w-0">
              <BlokNode id={rootId} />
            </div>
          ))}
        </div>
      </BlokTreeProvider>
    </BlokRuntimeProvider>
  );
}
