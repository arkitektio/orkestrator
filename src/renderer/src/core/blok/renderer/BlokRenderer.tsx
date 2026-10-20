import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {cn} from '@/core/util/utils';
import BlokDebugState from './BlokDebugState';
import {SceneModelScopeProvider, useSceneNotice} from './bloks/scene/context';
import {BlokSceneFillProvider} from './bloks/scene/host';
import {defaultBlokCatalog} from './catalog';
import {
  BlokNode,
  BlokNodeErrorSurface,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokRuntimeStore,
  preflightBlokDocument,
  type BlokCatalog,
  type BlokNodeErrorProps,
  type BlokDispatchActionHandler,
  type BlokInvokeFunctionHandler,
  type BlokRefuseActionHandler,
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
  /** Drops the agent calls it answers `true` for, before they start. */
  refuseAction?: BlokRefuseActionHandler;
  /** `none` draws no frame at all and lets a scene fill the surface: the blok is a backdrop. */
  chrome?: 'default' | 'minimal' | 'none';
  sizing?: 'fill' | 'intrinsic';
  /**
   * Render into a 3D scene the host already opened (`SceneSurface`), from
   * inside its canvas: no element of its own, and its `Scene` adds to that one.
   */
  embedded?: boolean;
  /** Shows the floating runtime-state inspector. Off by default. */
  debug?: boolean;
  children?: React.ReactNode;
};

const DEFAULT_SURFACE_ID = 'blok-preview';

/** Inside a canvas nothing can render a `div`: what is wrong is reported beside the scene. */
const EmbeddedNotice = ({title, detail}: {title: string; detail?: string}) => {
  useSceneNotice(title, detail);
  return null;
};

const EmbeddedNodeError = ({componentId, title, detail}: BlokNodeErrorProps) => (
  <EmbeddedNotice title={title} detail={detail ? `${detail} (${componentId})` : componentId} />
);

/** The roots of a blok shown in a scene that is already open. Only a root that opens a scene can stand in one. */
const EmbeddedRoots = ({tree, rootIds, errors}: {tree: BlokTree; rootIds: string[]; errors: string[]}) => (
  <>
    {errors.map(error => (
      <EmbeddedNotice key={error} title="Blok payload could not be parsed" detail={error} />
    ))}
    {rootIds.map(rootId => {
      const component = tree.nodes.get(rootId)?.component;
      const opensScene =
        !component || tree.catalog.components.get(component)?.placement?.childrenContext === 'scene';
      return opensScene ? (
        <BlokNode key={rootId} id={rootId} />
      ) : (
        <EmbeddedNotice key={rootId} title="Not a 3D view" detail={`${component} cannot stand in a scene (${rootId}).`} />
      );
    })}
  </>
);

export default function BlokRenderer({
  surfaceId = DEFAULT_SURFACE_ID,
  uiComponents,
  initialState,
  catalog = defaultBlokCatalog,
  invokeFunction,
  dispatchAction,
  refuseAction,
  chrome = 'default',
  sizing = 'fill',
  embedded = false,
  debug = false,
  children,
}: BlokRendererProps) {
  const preflight = useMemo(
    () => preflightBlokDocument(uiComponents, catalog),
    [catalog, uiComponents],
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
        // A preview has nowhere to send it; the author reads it in the console.
        console.info(
          action.dependency
            ? `Preview action captured on ${surfaceId}: ${action.operation} on ${action.dependency}`
            : `Preview action captured on ${surfaceId}: ${action.operation}`,
        );
      }),
    [dispatchAction, surfaceId],
  );

  // Seeded with the handlers, not just synced in the effects below: nodes
  // resolve their props during the first render, before any effect has run.
  const [runtimeStore] = useState(() =>
    createBlokRuntimeStore({
      initialDataModel: initialState,
      invokeFunction: resolvedInvokeFunction,
      dispatchAction: resolvedDispatchAction,
      refuseAction,
    }),
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

  useEffect(() => {
    runtimeStore.getState().setRefuseAction(refuseAction);
  }, [refuseAction, runtimeStore]);

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
    chrome === 'none'
      ? ''
      : chrome === 'minimal'
        ? 'rounded-xl border border-border/50 bg-background/90 p-1 shadow-sm'
        : 'rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm backdrop-blur-sm',
  );

  // Errors that belong to a node render inline at that node; only payload-level
  // problems (a root that could not be parsed at all) are summarized here.
  const documentErrors = preflight.errors.filter(error => !error.componentId);
  const renderableRootIds = preflight.rootIds.filter(
    rootId => preflight.nodes.has(rootId) || preflight.invalidNodes.has(rootId),
  );

  const modelScope = `${useId()}/`;

  if (embedded) {
    return (
      <BlokRuntimeProvider store={runtimeStore}>
        <BlokTreeProvider tree={tree}>
          {children}
          <BlokNodeErrorSurface.Provider value={EmbeddedNodeError}>
            <SceneModelScopeProvider value={modelScope}>
              <EmbeddedRoots
                tree={tree}
                rootIds={renderableRootIds}
                errors={documentErrors.map(error => `${error.path} ${error.message}`)}
              />
            </SceneModelScopeProvider>
          </BlokNodeErrorSurface.Provider>
        </BlokTreeProvider>
      </BlokRuntimeProvider>
    );
  }

  return (
    <BlokRuntimeProvider store={runtimeStore}>
      <BlokTreeProvider tree={tree}>
        {children}
        <BlokSceneFillProvider value={chrome === 'none'}>
        <div className={containerClassName}>
          {debug && <BlokDebugState surfaceId={surfaceId} />}

          {documentErrors.length > 0 && (
            <div
              className={cn(
                'rounded-xl border border-destructive/30 bg-background/80 p-4',
                chrome === 'default' ? 'mb-4' : 'mb-2',
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

          {/* A lone root may fill the surface (a 3D scene sized "100%" needs a
              parent with a height); several roots stack at their own heights. */}
          {renderableRootIds.map(rootId => (
            <div key={rootId} className={renderableRootIds.length === 1 ? 'h-full min-w-0' : 'min-w-0'}>
              <BlokNode id={rootId} />
            </div>
          ))}
        </div>
        </BlokSceneFillProvider>
      </BlokTreeProvider>
    </BlokRuntimeProvider>
  );
}
