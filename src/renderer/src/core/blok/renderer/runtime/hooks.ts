import * as React from 'react';
import {z} from 'zod';
import {useShallow} from 'zustand/react/shallow';
import {evaluateChecks, getChecksDependencyPaths, type BlokChecksState} from './checks';
import {statusAtPath, useBlokRuntime, useBlokRuntimeStoreApi} from './context';
import {
  getActionArgumentsRuntimeDependencies,
  getComponentPropRuntimeDependencies,
  getPropActionCall,
  getPropMap,
  isCommand,
  resolveActionArguments,
  resolvePropValue,
  runActionCall,
  statusOfResult,
  type BlokResolved,
} from './resolution';
import {isActionSchema} from './schemas';
import {isWritableScopedPath, readScopedPath, resolveScopedPath, useBlokScope} from './scope';
import {defaultBlokView} from '../../spec/catalogs';
import {useBlokNodeState} from './nodeState';
import {combineStatus, READY, type BlokSourceStatus} from './status';
import {bindTask} from './task';
import type {
  BlokActionArgument,
  BlokComponentNode,
  BlokComponentProp,
  BlokObjectSchema,
  BlokResolutionContext,
  BlokRuntimeContext,
  BlokRuntimeDependencies,
  BlokRuntimeStore,
  BlokScope,
  BlokValidationState,
} from './types';

type BlokSchemaShape<TSchema extends BlokObjectSchema> =
  TSchema extends z.ZodObject<infer TShape> ? TShape : never;

export type BlokPropHandle<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  component: BlokComponentNode;
  key: string;
  schema: TSchema;
  prop?: BlokComponentProp;
};

export type Blok<TSchema extends BlokObjectSchema> = {
  [TKey in keyof BlokSchemaShape<TSchema> & string]: BlokPropHandle<BlokSchemaShape<TSchema>[TKey]>;
};

type AnyBlok = Record<string, BlokPropHandle<z.ZodTypeAny>>;

type BlokValueForKey<TBlok extends AnyBlok, TKey extends keyof TBlok & string> =
  TBlok[TKey] extends BlokPropHandle<infer TSchema>
    ? z.output<TSchema> | undefined
    : never;

/**
 * A payload-level failure surfaced while rendering a node: an unknown catalog
 * function, bad function arguments, or an effectful function bound to a value
 * prop. Thrown so the enclosing `BlokNodeBoundary` renders an inline error card
 * for that one node and leaves the rest of the surface alive.
 */
export class BlokResolutionError extends Error {
  readonly componentId: string;
  readonly propKey: string;

  constructor(componentId: string, propKey: string, message: string) {
    super(message);
    this.name = 'BlokResolutionError';
    this.componentId = componentId;
    this.propKey = propKey;
  }
}

const toBlokPropHandle = <TSchema extends z.ZodTypeAny>(
  component: BlokComponentNode,
  key: string,
  schema: TSchema,
  prop: BlokComponentProp | undefined,
): BlokPropHandle<TSchema> => ({
  component,
  key,
  schema,
  prop,
});

const isBlokPropHandle = (value: unknown): value is BlokPropHandle<z.ZodTypeAny> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'component' in value && 'key' in value && 'schema' in value;
};

const resolveHandle = (
  handleOrBlok: BlokPropHandle<z.ZodTypeAny> | AnyBlok | undefined,
  key?: string,
): BlokPropHandle<z.ZodTypeAny> | undefined => {
  if (!handleOrBlok) {
    return undefined;
  }

  if (isBlokPropHandle(handleOrBlok)) {
    return handleOrBlok;
  }

  if (!key) {
    throw new Error('Missing blok prop key.');
  }

  return handleOrBlok[key];
};

/* -------------------------------------------------------------------------- */
/* Resolution plumbing                                                        */
/* -------------------------------------------------------------------------- */

const EMPTY_PATHS: string[] = [];

/**
 * Dependency sets are keyed on the prop object, which is stable for the life of
 * a parsed payload, so the walk happens once per prop instead of per render.
 */
const dependencyCache = new WeakMap<
  BlokComponentProp,
  Map<z.ZodTypeAny, BlokRuntimeDependencies>
>();

const getCachedDependencies = (
  prop: BlokComponentProp | undefined,
  schema: z.ZodTypeAny,
): BlokRuntimeDependencies => {
  if (!prop) {
    return {paths: EMPTY_PATHS, needsInvokeFunction: false, needsDispatchAction: false};
  }

  let bySchema = dependencyCache.get(prop);
  if (!bySchema) {
    bySchema = new Map();
    dependencyCache.set(prop, bySchema);
  }

  const cached = bySchema.get(schema);
  if (cached) {
    return cached;
  }

  const dependencies = getComponentPropRuntimeDependencies(prop, schema);
  bySchema.set(schema, dependencies);
  return dependencies;
};

/**
 * Builds the render-time resolution context.
 *
 * `readPath` is backed by a snapshot of exactly the paths the caller
 * subscribed to, so "what a component subscribes to" and "what it reads" are
 * the same list by construction. The previous implementation subscribed to a
 * dependency array and then separately read `store.getState()` inside a memo,
 * an invariant that held only by coincidence. Paths outside the snapshot fall
 * back to a live read.
 */
/** The status a read of `path` has here: a scope value (a loop item handed down by value) is ready. */
const scopedStatus = (state: BlokRuntimeContext, path: string, scope: BlokScope): BlokSourceStatus => {
  if (!isWritableScopedPath(path, scope)) return READY;
  return statusAtPath(state.statuses, resolveScopedPath(path, scope));
};

const createSnapshotResolutionContext = (
  store: BlokRuntimeStore,
  scope: BlokScope,
  snapshot: PathSnapshot,
): BlokResolutionContext => ({
  readPath: path =>
    snapshot.values.has(path)
      ? snapshot.values.get(path)
      : readScopedPath(store.getState().dataModel, path, scope),
  statusOf: path => snapshot.statuses.get(path) ?? scopedStatus(store.getState(), path, scope),
  decodeLiterals: store.getState().decodeLiterals,
  resolvePath: path => resolveScopedPath(path, scope),
  invokeFunction: (name, args, options) => store.getState().invokeFunction(name, args, options),
  dispatchAction: () => undefined,
});

/** Live context used inside event handlers, where reads must not be stale. */
const createLiveResolutionContext = (
  store: BlokRuntimeStore,
  scope: BlokScope,
): BlokResolutionContext => ({
  readPath: path => readScopedPath(store.getState().dataModel, path, scope),
  statusOf: path => scopedStatus(store.getState(), path, scope),
  decodeLiterals: store.getState().decodeLiterals,
  resolvePath: path => resolveScopedPath(path, scope),
  refetchQuery: name => store.getState().refetchQuery?.(name),
  fetchMoreQuery: (name, variables) => store.getState().fetchMoreQuery?.(name, variables),
  answerTask: values => store.getState().answerTask?.(values),
  travelling: store.getState().travelAt !== null,
  invokeFunction: (name, args, options) => store.getState().invokeFunction(name, args, options),
  dispatchAction: (action, component, observe) =>
    observe
      ? store.getState().dispatchAction(action, component, observe)
      : store.getState().dispatchAction(action, component),
  refuseAction: (action, component) => store.getState().refuseAction?.(action, component) ?? false,
  bindTask: (name, args) => bindTask(store, name, args),
});

type PathSnapshot = {values: ReadonlyMap<string, unknown>; statuses: ReadonlyMap<string, BlokSourceStatus>};

const usePathSnapshot = (paths: ReadonlyArray<string>): PathSnapshot => {
  const scope = useBlokScope();
  const pathKey = paths.join(' ');

  // Values and statuses interleaved, so one shallow comparison covers both.
  const selector = React.useCallback(
    (state: BlokRuntimeContext) =>
      paths.flatMap(path => [readScopedPath(state.dataModel, path, scope), scopedStatus(state, path, scope)]),
    // `pathKey` stands in for the array's contents: callers rebuild the path
    // array each render, but its contents are stable for a given payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathKey, scope],
  );

  const values = useBlokRuntime(useShallow(selector));

  return React.useMemo(() => {
    const snapshot = new Map<string, unknown>();
    const statuses = new Map<string, BlokSourceStatus>();
    paths.forEach((path, index) => {
      snapshot.set(path, values[index * 2]);
      statuses.set(path, values[index * 2 + 1] as BlokSourceStatus);
    });
    return {values: snapshot, statuses};
    // `pathKey` stands in for `paths`, whose identity changes each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey, values]);
};

/* -------------------------------------------------------------------------- */
/* Public component-author API                                                */
/* -------------------------------------------------------------------------- */

export const useBlok = <TSchema extends BlokObjectSchema>(
  component: BlokComponentNode,
  schema: TSchema,
): Blok<TSchema> => {
  return React.useMemo(() => {
    const propMap = getPropMap(component.props);
    const shape = schema.shape as BlokSchemaShape<TSchema>;

    return Object.fromEntries(
      (Object.keys(shape) as Array<keyof BlokSchemaShape<TSchema> & string>).map(key => [
        key,
        toBlokPropHandle(component, key, shape[key], propMap.get(key)),
      ]),
    ) as Blok<TSchema>;
  }, [component, schema]);
};

export function useValue<TSchema extends z.ZodTypeAny>(
  handle: BlokPropHandle<TSchema> | undefined,
): z.output<TSchema> | undefined;
export function useValue<TBlok extends AnyBlok, TKey extends keyof TBlok & string>(
  blok: TBlok,
  key: TKey,
): BlokValueForKey<TBlok, TKey>;
export function useValue(
  handleOrBlok: BlokPropHandle<z.ZodTypeAny> | AnyBlok | undefined,
  key?: string,
): unknown {
  const handle = resolveHandle(handleOrBlok, key);
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const dependencies = handle ? getCachedDependencies(handle.prop, handle.schema) : undefined;
  const snapshot = usePathSnapshot(dependencies?.paths ?? EMPTY_PATHS);

  return React.useMemo(() => {
    if (!handle) {
      return undefined;
    }

    // A `children` prop with no explicit binding falls back to the node's own
    // declared children.
    if (handle.key === 'children' && !handle.prop && handle.component.children?.length) {
      const childIds = handle.component.children.map(child => child.id);
      const parsedChildren = handle.schema.safeParse(childIds);
      return parsedChildren.success ? parsedChildren.data : undefined;
    }

    const context = createSnapshotResolutionContext(store, scope, snapshot);
    const resolved = resolvePropValue(handle.prop, handle.schema, context);

    if (!resolved.ok) {
      throw new BlokResolutionError(handle.component.id, handle.key, resolved.error);
    }

    const parsed = handle.schema.safeParse(resolved.value);
    return parsed.success ? parsed.data : undefined;
  }, [handle, scope, snapshot, store]);
}

/** The scope names a callback's arguments read the payload its component hands it by (`event.value`). */
export const BLOK_EVENT_ROOT = 'event';
/** The v1 spelling, still read by a port's CUSTOM widget payload. */
export const BLOK_EVENT_SCOPE_KEY = '$event';

/**
 * The payload a component's callback is called with, shaped as its catalog
 * declares it: a callback whose event is `{value}` gets a bare value wrapped,
 * every other event is handed over as the component built it.
 */
export const shapeEvent = (component: string, key: string, payload: unknown): unknown => {
  const fields = defaultBlokView().components.get(component)?.props.find(prop => prop.key === key)?.event;
  if (fields && fields.length === 1 && fields[0].key === 'value') {
    const wrapped =
      payload !== null && typeof payload === 'object' && !Array.isArray(payload) && Object.keys(payload).length === 1 && 'value' in payload;
    return wrapped ? payload : {value: payload};
  }
  return payload === undefined ? {} : payload;
};

type CallbackRunner = {
  run: ((payload?: unknown) => void) | undefined;
  /** Its call's task is running: the control will not dispatch again. */
  busy: boolean;
  /** Why it cannot run now (an agent offline, the past), or undefined. */
  unavailable: string | undefined;
};

const TRAVEL_REASON = 'Viewing the past: actions are paused';

/**
 * A callback prop as something a component can call: exactly one task call,
 * one `queries.<name>.refetch()`, `ui.copy` or `task.answer` (the one-thing
 * rule; the parser and the validator refuse anything else).
 *
 * The control is busy while the task its call started runs, so it cannot
 * double-dispatch: until every promise the host returned has settled, and
 * while the record the call writes (`into`) says it is running.
 */
const useCallbackRunner = (handle: BlokPropHandle<z.ZodTypeAny> | undefined): CallbackRunner => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const prop = handle?.prop;
  const actionCall = React.useMemo(() => getPropActionCall(prop), [prop]);
  const component = handle?.component;
  const key = handle?.key;
  const [inFlight, setInFlight] = React.useState(0);
  const dependencies = React.useMemo(() => actionDependenciesOf(prop), [prop]);
  const into = actionCall?.type === 'agent' ? actionCall.into : undefined;
  const command = isCommand(actionCall);

  const recordRunning = useBlokRuntime(state => {
    if (!into) return false;
    const record = readScopedPath(state.dataModel, into, scope);
    return typeof record === 'object' && record !== null && (record as {running?: unknown}).running === true;
  });
  const unavailable = useBlokRuntime(state => {
    if (command && state.travelAt !== null) return TRAVEL_REASON;
    for (const dependency of dependencies) {
      const reason = state.unavailableDependencies.get(dependency);
      if (reason) return reason;
    }
    return undefined;
  });

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const node = useBlokNodeState();
  const busy = inFlight > 0 || recordRunning || (command && node.busy);
  const busyRef = React.useRef(busy);
  React.useEffect(() => {
    busyRef.current = busy;
  });

  const run = React.useMemo(() => {
    if (!actionCall || !component) {
      return undefined;
    }

    return (payload?: unknown) => {
      // One run at a time: a busy control does not dispatch again.
      if (command && busyRef.current) return;
      const event = shapeEvent(component.component, key ?? '', payload);
      const eventScope: BlokScope = {
        ...scope,
        values: {...scope.values, [BLOK_EVENT_ROOT]: event, [BLOK_EVENT_SCOPE_KEY]: payload},
      };
      const context = createLiveResolutionContext(store, eventScope);
      const result = runActionCall(actionCall, context, component);

      if (!result.ok) {
        console.error(`[blok] callback on "${component.id}" failed: ${result.error}`);
        return;
      }

      if (result.value instanceof Promise) {
        node.track(result.value);
        setInFlight(count => count + 1);
        const settle = () => {
          if (mountedRef.current) setInFlight(count => Math.max(0, count - 1));
        };
        result.value.then(settle, settle);
      }
    };
  }, [actionCall, command, component, key, node, scope, store]);

  return {run, busy, unavailable};
};

export function useAction<TSchema extends z.ZodTypeAny>(
  handle: BlokPropHandle<TSchema> | undefined,
): (() => void) | undefined;
export function useAction<TBlok extends AnyBlok, TKey extends keyof TBlok & string>(
  blok: TBlok,
  key: TKey,
): (() => void) | undefined;
export function useAction(
  handleOrBlok: BlokPropHandle<z.ZodTypeAny> | AnyBlok | undefined,
  key?: string,
): (() => void) | undefined {
  const {run} = useCallbackRunner(resolveHandle(handleOrBlok, key));
  return React.useMemo(() => (run ? () => run() : undefined), [run]);
}

/** Every dependency a callback prop calls. */
export const actionDependenciesOf = (prop: BlokComponentProp | undefined): string[] => {
  const found = new Set<string>();
  const visit = (argument: BlokActionArgument) => {
    if (argument.agent_call) {
      found.add(argument.agent_call.dependency);
      argument.agent_call.arguments?.forEach(visit);
    }
    argument.util_call?.arguments?.forEach(visit);
    argument.value_list?.forEach(visit);
    argument.value_dict?.forEach(visit);
  };
  if (prop?.agent_call) {
    found.add(prop.agent_call.dependency);
    prop.agent_call.arguments?.forEach(visit);
  }
  prop?.util_call?.arguments?.forEach(visit);
  return [...found];
};

/**
 * Why a callback prop cannot run right now, or `undefined` when it can: it
 * calls a dependency the host marks unavailable (offline, not bound), or it is
 * a command and the blok shows the past. A control shows itself disabled with
 * this as its tooltip.
 */
export function useActionUnavailable<TSchema extends z.ZodTypeAny>(
  handle: BlokPropHandle<TSchema> | undefined,
): string | undefined {
  return useCallbackRunner(handle).unavailable;
}

/**
 * `useAction` plus whether what it started is still running (`pending`, the
 * control's `data-busy`): a busy control does not dispatch again.
 */
export function usePendingAction<TSchema extends z.ZodTypeAny>(
  handle: BlokPropHandle<TSchema> | undefined,
): {run: (() => void) | undefined; pending: boolean; unavailable: string | undefined} {
  const {run, busy, unavailable} = useCallbackRunner(handle);
  const bare = React.useMemo(() => (run ? () => run() : undefined), [run]);
  return {run: bare, pending: busy, unavailable};
}

/**
 * A callback that carries the payload that triggered it, read as `event`
 * (`deps.stage.set(x: event.value)`). The payload is shaped as the
 * component's catalog declares its event (`shapeEvent`), and exists only
 * while the callback runs.
 */
export function useEventAction<TSchema extends z.ZodTypeAny>(
  handle: BlokPropHandle<TSchema> | undefined,
): ((value?: unknown) => void) | undefined;
export function useEventAction<TBlok extends AnyBlok, TKey extends keyof TBlok & string>(
  blok: TBlok,
  key: TKey,
): ((value?: unknown) => void) | undefined;
export function useEventAction(
  handleOrBlok: BlokPropHandle<z.ZodTypeAny> | AnyBlok | undefined,
  key?: string,
): ((value?: unknown) => void) | undefined {
  return useCallbackRunner(resolveHandle(handleOrBlok, key)).run;
}

/** `useEventAction` with whether its task runs and why it cannot run. */
export function usePendingEventAction<TSchema extends z.ZodTypeAny>(
  handle: BlokPropHandle<TSchema> | undefined,
): CallbackRunner {
  return useCallbackRunner(handle);
}

/**
 * The combined status of a node's value props (callbacks and children left
 * out): pending if any read is not known yet, failed if one cannot be known,
 * stale if one stopped updating. What decides whether a node renders, shows a
 * skeleton, or suspends its boundary.
 */
export const useNodeStatus = <TSchema extends BlokObjectSchema>(
  component: BlokComponentNode,
  schema: TSchema,
): BlokSourceStatus => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();

  const {propMap, valueFields, paths} = React.useMemo(() => {
    const nextPropMap = getPropMap(component.props);
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const nextValueFields = Object.entries(shape).filter(
      ([key, fieldSchema]) => !isActionSchema(fieldSchema) && nextPropMap.has(key),
    );
    const nextPaths = new Set<string>();
    nextValueFields.forEach(([key, fieldSchema]) => {
      getCachedDependencies(nextPropMap.get(key), fieldSchema).paths.forEach(path => nextPaths.add(path));
    });
    return {propMap: nextPropMap, valueFields: nextValueFields, paths: [...nextPaths]};
  }, [component, schema]);

  const snapshot = usePathSnapshot(paths);

  return React.useMemo(() => {
    if (paths.length === 0) return READY;
    const context = createSnapshotResolutionContext(store, scope, snapshot);
    let status = READY;
    for (const [key, fieldSchema] of valueFields) {
      status = combineStatus(status, statusOfResult(resolvePropValue(propMap.get(key), fieldSchema, context)));
    }
    return status;
  }, [paths.length, propMap, scope, snapshot, store, valueFields]);
};

/**
 * Schema validity of a node's *value* props. Action props are skipped: they
 * carry a call descriptor rather than a value, and the preflight already
 * verified that the ones the catalog requires are present.
 */
export const useValidation = <TSchema extends BlokObjectSchema>(
  component: BlokComponentNode,
  schema: TSchema,
): BlokValidationState => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();

  const {propMap, valueFields, paths} = React.useMemo(() => {
    const nextPropMap = getPropMap(component.props);
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const nextValueFields = Object.entries(shape).filter(
      ([, fieldSchema]) => !isActionSchema(fieldSchema),
    );
    const nextPaths = new Set<string>();

    nextValueFields.forEach(([key, fieldSchema]) => {
      getCachedDependencies(nextPropMap.get(key), fieldSchema).paths.forEach(path =>
        nextPaths.add(path),
      );
    });

    return {propMap: nextPropMap, valueFields: nextValueFields, paths: [...nextPaths]};
  }, [component, schema]);

  const snapshot = usePathSnapshot(paths);

  return React.useMemo(() => {
    const context = createSnapshotResolutionContext(store, scope, snapshot);
    const validationErrors: string[] = [];

    for (const [key, fieldSchema] of valueFields) {
      const isImplicitChildren =
        key === 'children' && !propMap.has(key) && Boolean(component.children?.length);
      const resolvedValue = isImplicitChildren
        ? {ok: true as const, value: component.children?.map(child => child.id)}
        : resolvePropValue(propMap.get(key), fieldSchema, context);

      if (!resolvedValue.ok) {
        validationErrors.push(`${key}: ${resolvedValue.error}`);
        continue;
      }

      const parsed = fieldSchema.safeParse(resolvedValue.value);
      if (!parsed.success) {
        parsed.error.issues.forEach(issue => {
          const issuePath = [key, ...issue.path.map(String)].join('.');
          validationErrors.push(`${issuePath}: ${issue.message}`);
        });
      }
    }

    return {isValid: validationErrors.length === 0, validationErrors};
  }, [component, propMap, scope, snapshot, store, valueFields]);
};

/**
 * Evaluates a `checks` guard list against live data. Interactive bloks use it
 * to disable themselves until their preconditions hold.
 */
export const useChecks = (rawChecks: unknown): BlokChecksState => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const paths = React.useMemo(() => getChecksDependencyPaths(rawChecks), [rawChecks]);
  const snapshot = usePathSnapshot(paths);

  return React.useMemo(() => {
    const context = createSnapshotResolutionContext(store, scope, snapshot);
    return evaluateChecks(rawChecks, context);
  }, [rawChecks, scope, snapshot, store]);
};

/**
 * Two-way binding for input-like bloks: reads the current value at a scoped
 * path and returns a setter that writes through to the shared data model.
 * Returns `undefined` when the blok is not bound to a path.
 */
/**
 * The current values at these data-model paths, re-read when any of them
 * changes. For a component whose paths are data rather than props: a picker
 * reading the variables its query names.
 */
export const useDataPaths = (paths: ReadonlyArray<string>): ReadonlyMap<string, unknown> =>
  usePathSnapshot(paths).values;

export const useBinding = (
  path: string | undefined,
): {value: unknown; setValue: (value: unknown) => void; readOnly: boolean} | undefined => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const paths = React.useMemo(() => (path ? [path] : EMPTY_PATHS), [path]);
  const snapshot = usePathSnapshot(paths);
  const travelling = useBlokRuntime(state => state.travelAt !== null);

  return React.useMemo(() => {
    if (!path) {
      return undefined;
    }

    const absolutePath = resolveScopedPath(path, scope);

    return {
      value: snapshot.values.get(path),
      // The past is read-only: a bound control shows what was, and writes nothing.
      setValue: (value: unknown) => {
        if (!travelling) store.getState().setRuntimeValue(absolutePath, value);
      },
      readOnly: travelling,
    };
  }, [path, scope, snapshot, store, travelling]);
};

export type {BlokChecksState};

/**
 * One prop of a node resolved with its status (a guard, an `else`'s
 * condition), without throwing on a payload problem: `ok: false` is returned.
 * With no key, it resolves nothing and is ready.
 */
export const useResolvedProp = (
  component: BlokComponentNode,
  key: string | undefined,
  schema: z.ZodTypeAny,
): BlokResolved => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const prop = React.useMemo(() => (key ? component.props?.find(candidate => candidate.key === key) : undefined), [component, key]);
  const dependencies = getCachedDependencies(prop, schema);
  const snapshot = usePathSnapshot(dependencies.paths);

  return React.useMemo(() => {
    if (!prop) return {ok: true, value: undefined};
    return resolvePropValue(prop, schema, createSnapshotResolutionContext(store, scope, snapshot));
  }, [prop, schema, scope, snapshot, store]);
};

/**
 * Resolves props against the live store with extra scope values (a loop's
 * item while working out its `key`), outside render subscriptions: the caller
 * re-renders when what it iterates changes.
 */
export const useScopedResolver = (): ((
  prop: BlokComponentProp | undefined,
  values: Readonly<Record<string, unknown>>,
  aliases?: Readonly<Record<string, string>>,
) => BlokResolved) => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  return React.useCallback(
    (prop, values, aliases) =>
      resolvePropValue(
        prop,
        z.unknown(),
        createLiveResolutionContext(store, {
          ...scope,
          aliases: aliases ? {...scope.aliases, ...aliases} : scope.aliases,
          values: {...scope.values, ...values},
        }),
      ),
    [scope, store],
  );
};

const NO_ARGUMENTS: readonly BlokActionArgument[] = Object.freeze([]);

/**
 * Stored arguments resolved against the data model, subscribed to what they
 * read: a declared query's variables. Re-renders when one of them changes.
 */
export const useResolvedArguments = (
  argumentsList: readonly BlokActionArgument[] | null,
): {values: Record<string, unknown>; status: BlokSourceStatus} => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const list = argumentsList ?? NO_ARGUMENTS;
  const paths = React.useMemo(() => getActionArgumentsRuntimeDependencies([...list]).paths, [list]);
  const snapshot = usePathSnapshot(paths);
  return React.useMemo(() => {
    const resolved = resolveActionArguments([...list], createSnapshotResolutionContext(store, scope, snapshot), true);
    if (!resolved.ok) return {values: {}, status: {status: 'failed', error: resolved.error}};
    return {values: resolved.value, status: resolved.status ?? READY};
  }, [list, scope, snapshot, store]);
};
