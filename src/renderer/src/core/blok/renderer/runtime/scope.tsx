import * as React from 'react';
import type {BlokScope} from './types';
import {getValueAtPath, splitPathSegments} from './utils';

const EMPTY_SCOPE: BlokScope = Object.freeze({
  aliases: Object.freeze({}),
  values: Object.freeze({}),
});

const BlokScopeContext = React.createContext<BlokScope>(EMPTY_SCOPE);

/**
 * Introduces a lexical scope for a subtree (`foreach` iterations, `basePath`
 * children).
 *
 * This deliberately does *not* create a second runtime store. The previous
 * implementation cloned the store per iteration, which meant every write from
 * inside a loop body — a bound `Input`, a live agent-state push — landed on the
 * clone and was invisible to the rest of the surface. Scope is a read/write
 * *addressing* concern, so it lives in context and the store stays singular.
 */
export const BlokScopeProvider = (props: {
  aliases?: Readonly<Record<string, string>>;
  values?: Readonly<Record<string, unknown>>;
  basePath?: string;
  children: React.ReactNode;
}) => {
  const {aliases, values, basePath, children} = props;
  const parentScope = React.useContext(BlokScopeContext);

  const scope = React.useMemo<BlokScope>(() => {
    if (!aliases && !values && basePath === undefined) {
      return parentScope;
    }

    return {
      aliases: aliases ? {...parentScope.aliases, ...aliases} : parentScope.aliases,
      values: values ? {...parentScope.values, ...values} : parentScope.values,
      basePath: basePath ?? parentScope.basePath,
    };
  }, [aliases, basePath, parentScope, values]);

  return <BlokScopeContext.Provider value={scope}>{children}</BlokScopeContext.Provider>;
};

export const useBlokScope = (): BlokScope => React.useContext(BlokScopeContext);

/**
 * Rewrites a scoped path to an absolute data-model path.
 *
 * A named alias wins and consumes the head segment: `item/name` inside
 * `let="item"` aliased to `rows/3` becomes `rows/3/name` — which is what a
 * write has to target. Otherwise a `basePath` prefixes the whole path.
 */
export const resolveScopedPath = (path: string, scope: BlokScope): string => {
  const segments = splitPathSegments(path);
  const [head, ...tail] = segments;

  if (!head) {
    return segments.join('/');
  }

  const aliasedBasePath = scope.aliases[head];
  if (aliasedBasePath) {
    const normalizedBasePath = splitPathSegments(aliasedBasePath).join('/');
    return tail.length > 0 ? `${normalizedBasePath}/${tail.join('/')}` : normalizedBasePath;
  }

  if (head in scope.values) {
    // Addressed by a scope value, which has no path. Callers check
    // `isWritableScopedPath` before treating the result as a write target.
    return segments.join('/');
  }

  if (scope.basePath) {
    return [...splitPathSegments(scope.basePath), ...segments].join('/');
  }

  return segments.join('/');
};

/**
 * Reads a scoped path. An alias wins over a scope value, because an alias is
 * backed by the live data model while a value is a snapshot handed down by the
 * enclosing component (the only option when the items came from a literal or a
 * util call and therefore have no address).
 */
export const readScopedPath = (
  dataModel: unknown,
  path: string,
  scope: BlokScope,
): unknown => {
  const segments = splitPathSegments(path);
  const [head, ...tail] = segments;

  if (head && !(head in scope.aliases) && head in scope.values) {
    return getValueAtPath(scope.values[head], tail.join('/'));
  }

  return getValueAtPath(dataModel, resolveScopedPath(path, scope));
};

/** True when a path can be written back through the data model. */
export const isWritableScopedPath = (path: string, scope: BlokScope): boolean => {
  const [head] = splitPathSegments(path);
  if (!head) {
    return false;
  }

  return head in scope.aliases || !(head in scope.values);
};

export {EMPTY_SCOPE};
