import * as React from 'react';
import {z} from 'zod';
import {useShallow} from 'zustand/react/shallow';
import {evaluateChecks, getChecksDependencyPaths, type BlokChecksState} from './checks';
import {useBlokRuntime, useBlokRuntimeStoreApi} from './context';
import {
  getComponentPropRuntimeDependencies,
  getPropActionCall,
  getPropMap,
  resolvePropValue,
  runActionCall,
} from './resolution';
import {isActionSchema} from './schemas';
import {readScopedPath, resolveScopedPath, useBlokScope} from './scope';
import type {
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
const createSnapshotResolutionContext = (
  store: BlokRuntimeStore,
  scope: BlokScope,
  snapshot: ReadonlyMap<string, unknown>,
): BlokResolutionContext => ({
  readPath: path =>
    snapshot.has(path)
      ? snapshot.get(path)
      : readScopedPath(store.getState().dataModel, path, scope),
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
  resolvePath: path => resolveScopedPath(path, scope),
  invokeFunction: (name, args, options) => store.getState().invokeFunction(name, args, options),
  dispatchAction: (action, component) => store.getState().dispatchAction(action, component),
});

const usePathSnapshot = (paths: ReadonlyArray<string>): ReadonlyMap<string, unknown> => {
  const scope = useBlokScope();
  const pathKey = paths.join(' ');

  const selector = React.useCallback(
    (state: BlokRuntimeContext) => paths.map(path => readScopedPath(state.dataModel, path, scope)),
    // `pathKey` stands in for the array's contents: callers rebuild the path
    // array each render, but its contents are stable for a given payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathKey, scope],
  );

  const values = useBlokRuntime(useShallow(selector));

  return React.useMemo(() => {
    const snapshot = new Map<string, unknown>();
    paths.forEach((path, index) => snapshot.set(path, values[index]));
    return snapshot;
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
  const handle = resolveHandle(handleOrBlok, key);
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const actionCall = handle ? getPropActionCall(handle.prop) : undefined;
  const component = handle?.component;

  // Identity depends only on the payload and the scope, never on the data
  // model: arguments resolve live when the action fires, so a handler prop
  // does not invalidate on every store update.
  return React.useMemo(() => {
    if (!actionCall || !component) {
      return undefined;
    }

    return () => {
      const context = createLiveResolutionContext(store, scope);
      const result = runActionCall(actionCall, context, component);

      if (!result.ok) {
        console.error(`[blok] action on "${component.id}" failed: ${result.error}`);
      }
    };
  }, [actionCall, component, scope, store]);
}

/** The scope name a change handler's arguments address the new value by. */
export const BLOK_EVENT_SCOPE_KEY = '$event';

/**
 * An action handler that carries the value that triggered it.
 *
 * A bare `useAction` handler takes no arguments, so a change handler could only
 * see a new value by first writing it to the data model and reading it back.
 * Here the value is published as a scope value under `$event` for the duration
 * of the call, which makes `{value_path: "$event"}` — or `"$event/id"` for a
 * structured value — resolvable in the action's arguments.
 *
 * Scope values are read-only by design (`isWritableScopedPath`), which is
 * exactly right: `$event` exists only while the handler runs.
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
  const handle = resolveHandle(handleOrBlok, key);
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const actionCall = handle ? getPropActionCall(handle.prop) : undefined;
  const component = handle?.component;

  return React.useMemo(() => {
    if (!actionCall || !component) {
      return undefined;
    }

    return (value?: unknown) => {
      const eventScope: BlokScope = {
        ...scope,
        values: {...scope.values, [BLOK_EVENT_SCOPE_KEY]: value},
      };
      const context = createLiveResolutionContext(store, eventScope);
      const result = runActionCall(actionCall, context, component);

      if (!result.ok) {
        console.error(`[blok] action on "${component.id}" failed: ${result.error}`);
      }
    };
  }, [actionCall, component, scope, store]);
}

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
export const useBinding = (
  path: string | undefined,
): {value: unknown; setValue: (value: unknown) => void} | undefined => {
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const paths = React.useMemo(() => (path ? [path] : EMPTY_PATHS), [path]);
  const snapshot = usePathSnapshot(paths);

  return React.useMemo(() => {
    if (!path) {
      return undefined;
    }

    const absolutePath = resolveScopedPath(path, scope);

    return {
      value: snapshot.get(path),
      setValue: (value: unknown) => store.getState().setRuntimeValue(absolutePath, value),
    };
  }, [path, scope, snapshot, store]);
};

export type {BlokChecksState};
