import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {cn} from '@/core/util/utils';
import {useBlokTailwind} from '@/core/blok/tailwind/useBlokTailwind';
import BlokDebugState from './BlokDebugState';
import {SceneModelScopeProvider, useSceneNotice} from './bloks/scene/context';
import {BlokSceneFillProvider} from './bloks/scene/host';
import {defaultBlokCatalog} from './catalog';
import {invokeBlokFunction} from './functions/v2/handler';
import {BlokComponentStateContext, type BlokComponentStateStore} from './persist';
import {
  BlokNode,
  BlokNodeErrorSurface,
  BlokRuntimeProvider,
  BlokTreeProvider,
  createBlokRuntimeStore,
  dependencyStatusPath,
  preflightBlokDocument,
  unboundDependencyStatus,
  unboundDependencyStatuses,
  type BlokCatalog,
  type BlokNodeErrorProps,
  type BlokDispatchActionHandler,
  type BlokInvokeFunctionHandler,
  type BlokRefuseActionHandler,
  type BlokUnavailableDependencies,
  type BlokTree,
  BlokReads,
  BlokViewerSync,
  type BlokQuery,
  type BlokReadExecutor,
  type BlokSourceStatus,
  type BlokSubscription,
  type BlokViewer,
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
  /** Dependencies it cannot act through now, with why: controls calling them show disabled. */
  unavailableDependencies?: BlokUnavailableDependencies;
  /**
   * Dependencies bound to no agent: each reads as failed (`deps.unbound`),
   * its tasks and assets too, never as ready with null.
   */
  unboundDependencies?: readonly string[] | null;
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
  /**
   * Locals kept from an earlier opening, by top-level key, shown from the
   * first render on (`./persist.ts`). Read once, when the renderer mounts.
   */
  keptValues?: Record<string, unknown>;
  /** The top-level keys kept between openings: swapping the payload leaves their values alone. */
  keptRoots?: ReadonlySet<string>;
  /** Source statuses known before the first render, by data-model path (`deps.robot.arm`: pending). */
  statuses?: Readonly<Record<string, BlokSourceStatus>>;
  /** The moment the blok shows while travelling (ISO 8601): commands and toasts are off, inputs read-only. */
  travelAt?: string | null;
  /** Who is looking: `viewer`. */
  viewer?: BlokViewer | null;
  /** The blok's declared reads, and how they run; a preview runs none (it seeds `demo.queries`). */
  queries?: readonly BlokQuery[];
  subscriptions?: readonly BlokSubscription[];
  readExecutor?: BlokReadExecutor;
  /** Answers the open ask of `task` (`task.answer(values)`). */
  answerTask?: (values: Record<string, unknown>) => unknown;
  /** Where `persist` components keep their state by id; none: they keep nothing. */
  componentState?: BlokComponentStateStore | null;
  children?: React.ReactNode;
};

const NO_QUERIES: readonly BlokQuery[] = Object.freeze([]);
const NO_SUBSCRIPTIONS: readonly BlokSubscription[] = Object.freeze([]);

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
  unavailableDependencies,
  unboundDependencies,
  chrome = 'default',
  sizing = 'fill',
  embedded = false,
  debug = false,
  keptValues,
  keptRoots,
  statuses,
  travelAt = null,
  viewer = null,
  queries = NO_QUERIES,
  subscriptions = NO_SUBSCRIPTIONS,
  readExecutor,
  answerTask,
  componentState = null,
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
    () => invokeFunction ?? invokeBlokFunction,
    [invokeFunction],
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
  const [runtimeStore] = useState(() => {
    const store = createBlokRuntimeStore({
      initialDataModel: initialState,
      invokeFunction: resolvedInvokeFunction,
      dispatchAction: resolvedDispatchAction,
      refuseAction,
      unavailableDependencies,
      keptValues,
      keptRoots,
      statuses: unboundDependencies?.length ? {...statuses, ...unboundDependencyStatuses(unboundDependencies)} : statuses,
      travelAt,
      answerTask,
    });
    return store;
  });

  // A dependency bound later reads its agent again; one unbound later reads failed.
  const unboundKey = (unboundDependencies ?? []).join('\u0000');
  const unboundRef = useRef<readonly string[]>(unboundDependencies ?? []);
  useEffect(() => {
    const next = unboundKey ? unboundKey.split('\u0000') : [];
    const {setStatus} = runtimeStore.getState();
    for (const key of unboundRef.current) if (!next.includes(key)) setStatus(dependencyStatusPath(key), null);
    for (const key of next) setStatus(dependencyStatusPath(key), unboundDependencyStatus(key));
    unboundRef.current = next;
  }, [unboundKey, runtimeStore]);

  useEffect(() => {
    runtimeStore.getState().setTravelAt(travelAt);
  }, [travelAt, runtimeStore]);

  useEffect(() => {
    runtimeStore.getState().setAnswerTask(answerTask);
  }, [answerTask, runtimeStore]);

  useEffect(() => {
    if (keptRoots) runtimeStore.getState().setKeptRoots(keptRoots);
  }, [keptRoots, runtimeStore]);

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

  useEffect(() => {
    if (unavailableDependencies) runtimeStore.getState().setUnavailableDependencies(unavailableDependencies);
  }, [unavailableDependencies, runtimeStore]);

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
  // The blok's own Tailwind classes, compiled at run time: the build never saw them.
  const containerRef = useRef<HTMLDivElement>(null);
  useBlokTailwind(preflight.nodes, embedded ? undefined : containerRef);

  const syncs = (
    <>
      <BlokViewerSync viewer={viewer} />
      {readExecutor && (queries.length > 0 || subscriptions.length > 0) ? (
        <BlokReads queries={queries} subscriptions={subscriptions} executor={readExecutor} />
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <BlokComponentStateContext.Provider value={componentState}>
      <BlokRuntimeProvider store={runtimeStore}>
        <BlokTreeProvider tree={tree}>
          {children}
          {syncs}
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
      </BlokComponentStateContext.Provider>
    );
  }

  return (
    <BlokComponentStateContext.Provider value={componentState}>
    <BlokRuntimeProvider store={runtimeStore}>
      <BlokTreeProvider tree={tree}>
        {children}
        {syncs}
        <BlokSceneFillProvider value={chrome === 'none'}>
        <div ref={containerRef} className={containerClassName}>
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
    </BlokComponentStateContext.Provider>
  );
}
