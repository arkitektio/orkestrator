import {z} from 'zod';
import {isActionSchema} from './schemas';
import type {
  BlokActionArgument,
  BlokAgentCall,
  BlokComponentProp,
  BlokDynamicValue,
  BlokResolutionContext,
  BlokResolvedAgentCall,
  BlokRuntimeDependencies,
  BlokUtilCall,
} from './types';
import {normalizeLiteralValue} from './utils';

/* -------------------------------------------------------------------------- */
/* Dependency collection                                                      */
/* -------------------------------------------------------------------------- */

const emptyRuntimeDependencies = (): BlokRuntimeDependencies => ({
  paths: [],
  needsInvokeFunction: false,
  needsDispatchAction: false,
});

const mergeRuntimeDependencies = (
  ...dependencySets: Array<BlokRuntimeDependencies | null | undefined>
): BlokRuntimeDependencies => {
  const paths = new Set<string>();
  let needsInvokeFunction = false;
  let needsDispatchAction = false;

  dependencySets.forEach(dependencySet => {
    if (!dependencySet) {
      return;
    }

    dependencySet.paths.forEach(path => {
      if (path) {
        paths.add(path);
      }
    });
    needsInvokeFunction = needsInvokeFunction || dependencySet.needsInvokeFunction;
    needsDispatchAction = needsDispatchAction || dependencySet.needsDispatchAction;
  });

  return {
    paths: [...paths],
    needsInvokeFunction,
    needsDispatchAction,
  };
};

const getActionArgumentRuntimeDependencies = (
  argument: BlokActionArgument,
): BlokRuntimeDependencies => {
  const nestedDependencies = mergeRuntimeDependencies(
    ...(argument.value_list ?? []).map(getActionArgumentRuntimeDependencies),
    ...(argument.value_dict ?? []).map(getActionArgumentRuntimeDependencies),
    ...(argument.util_call?.arguments ?? []).map(getActionArgumentRuntimeDependencies),
    ...(argument.agent_call?.arguments ?? []).map(getActionArgumentRuntimeDependencies),
  );

  return mergeRuntimeDependencies(nestedDependencies, {
    paths: argument.value_path ? [argument.value_path] : [],
    needsInvokeFunction: argument.util_call != null,
    needsDispatchAction: false,
  });
};

const getActionArgumentsRuntimeDependencies = (
  argumentsList: BlokActionArgument[] | null | undefined,
): BlokRuntimeDependencies => {
  return mergeRuntimeDependencies(...(argumentsList ?? []).map(getActionArgumentRuntimeDependencies));
};

/**
 * The exact set of runtime reads a prop performs. `useResolvedProp` subscribes
 * to precisely this set and then resolves against a snapshot of it, so a
 * component can never read something it did not subscribe to.
 */
const getComponentPropRuntimeDependencies = (
  prop: BlokComponentProp | undefined,
  targetSchema: z.ZodTypeAny,
): BlokRuntimeDependencies => {
  if (!prop) {
    return emptyRuntimeDependencies();
  }

  if (prop.agent_call) {
    if (!isActionSchema(targetSchema)) {
      return emptyRuntimeDependencies();
    }

    return mergeRuntimeDependencies(getActionArgumentsRuntimeDependencies(prop.agent_call.arguments), {
      paths: [],
      needsInvokeFunction: false,
      needsDispatchAction: true,
    });
  }

  if (prop.util_call) {
    return mergeRuntimeDependencies(getActionArgumentsRuntimeDependencies(prop.util_call.arguments), {
      paths: [],
      needsInvokeFunction: true,
      needsDispatchAction: false,
    });
  }

  if (prop.dynamic_value?.path) {
    return {
      paths: [prop.dynamic_value.path],
      needsInvokeFunction: false,
      needsDispatchAction: false,
    };
  }

  return emptyRuntimeDependencies();
};

/* -------------------------------------------------------------------------- */
/* Value resolution                                                           */
/* -------------------------------------------------------------------------- */

export type BlokResolved<T = unknown> = {ok: true; value: T} | {ok: false; error: string};

const resolveDynamicValue = (
  dynamicValue: BlokDynamicValue | null | undefined,
  context: BlokResolutionContext,
): unknown => {
  if (!dynamicValue) {
    return undefined;
  }

  const literalFallback = dynamicValue.literal != null
    ? normalizeLiteralValue(dynamicValue.literal)
    : undefined;

  if (dynamicValue.path) {
    const resolved = context.readPath(dynamicValue.path);
    return resolved === undefined ? literalFallback : resolved;
  }

  return literalFallback;
};

const resolveActionArgumentValue = (
  argument: BlokActionArgument,
  context: BlokResolutionContext,
  requirePure: boolean,
): BlokResolved => {
  if (argument.util_call) {
    return invokeUtilCall(argument.util_call, context, requirePure);
  }

  if (argument.agent_call) {
    const resolvedArguments = resolveActionArguments(
      argument.agent_call.arguments,
      context,
      requirePure,
    );
    if (!resolvedArguments.ok) {
      return resolvedArguments;
    }

    return {
      ok: true,
      value: {
        dependency: argument.agent_call.dependency,
        operation: argument.agent_call.operation,
        arguments: resolvedArguments.value,
      } satisfies BlokResolvedAgentCall,
    };
  }

  if (Array.isArray(argument.value_list)) {
    const items: unknown[] = [];
    for (const item of argument.value_list) {
      const resolvedItem = resolveActionArgumentValue(item, context, requirePure);
      if (!resolvedItem.ok) {
        return resolvedItem;
      }
      items.push(resolvedItem.value);
    }

    return {ok: true, value: items};
  }

  if (Array.isArray(argument.value_dict)) {
    const entries: Array<[string, unknown]> = [];
    for (const [index, item] of argument.value_dict.entries()) {
      const resolvedItem = resolveActionArgumentValue(item, context, requirePure);
      if (!resolvedItem.ok) {
        return resolvedItem;
      }
      entries.push([item.key ?? String(index), resolvedItem.value]);
    }

    return {ok: true, value: Object.fromEntries(entries)};
  }

  if (argument.value_path) {
    const resolved = context.readPath(argument.value_path);
    if (resolved !== undefined) {
      return {ok: true, value: resolved};
    }
  }

  return {ok: true, value: normalizeLiteralValue(argument.value_literal)};
};

const resolveActionArguments = (
  argumentsList: BlokActionArgument[] | null | undefined,
  context: BlokResolutionContext,
  requirePure = false,
): BlokResolved<Record<string, unknown>> => {
  if (!Array.isArray(argumentsList) || argumentsList.length === 0) {
    return {ok: true, value: {}};
  }

  const entries: Array<[string, unknown]> = [];
  for (const [index, argument] of argumentsList.entries()) {
    const resolvedArgument = resolveActionArgumentValue(argument, context, requirePure);
    if (!resolvedArgument.ok) {
      return resolvedArgument;
    }
    entries.push([argument.key ?? String(index), resolvedArgument.value]);
  }

  return {ok: true, value: Object.fromEntries(entries)};
};

const invokeUtilCall = (
  utilCall: BlokUtilCall,
  context: BlokResolutionContext,
  requirePure: boolean,
): BlokResolved => {
  const resolvedArguments = resolveActionArguments(utilCall.arguments, context, requirePure);
  if (!resolvedArguments.ok) {
    return resolvedArguments;
  }

  const result = context.invokeFunction(utilCall.operation, resolvedArguments.value, {
    requirePure,
  });
  return result.ok ? {ok: true, value: result.value} : result;
};

/**
 * Resolves a prop in *value* position. Pure by construction: it reads paths and
 * may call catalog functions declared `pure`, but never fires an effect.
 * An `effect` function bound to a value prop resolves to an error instead of
 * being invoked on every render.
 */
const resolvePropValue = (
  prop: BlokComponentProp | undefined,
  targetSchema: z.ZodTypeAny,
  context: BlokResolutionContext,
): BlokResolved => {
  if (!prop) {
    return {ok: true, value: undefined};
  }

  // Action props carry a call descriptor, not a value; `useAction` builds the
  // callback so its identity stays stable across store updates.
  if (isActionSchema(targetSchema)) {
    return {ok: true, value: undefined};
  }

  if (prop.util_call) {
    return invokeUtilCall(prop.util_call, context, true);
  }

  if (prop.agent_call) {
    // An agent call bound to a non-action prop is passed through as data.
    return {ok: true, value: prop.agent_call};
  }

  const dynamicValue = resolveDynamicValue(prop.dynamic_value, context);
  if (dynamicValue !== undefined) {
    return {ok: true, value: dynamicValue};
  }

  return {ok: true, value: normalizeLiteralValue(prop.static_value)};
};

/* -------------------------------------------------------------------------- */
/* Action execution                                                           */
/* -------------------------------------------------------------------------- */

export type BlokActionCall =
  | {type: 'agent'; call: BlokAgentCall}
  | {type: 'util'; call: BlokUtilCall};

const getPropActionCall = (
  prop: BlokComponentProp | undefined,
): BlokActionCall | undefined => {
  if (prop?.agent_call) {
    return {type: 'agent', call: prop.agent_call};
  }

  if (prop?.util_call) {
    return {type: 'util', call: prop.util_call};
  }

  return undefined;
};

/**
 * Runs an action. Arguments are resolved *at invoke time* against live state
 * (not against the snapshot the last render saw), and effectful functions are
 * allowed here — this is the only position where they are.
 */
const runActionCall = (
  actionCall: BlokActionCall,
  context: BlokResolutionContext,
  component: Parameters<BlokResolutionContext['dispatchAction']>[1],
): BlokResolved => {
  const resolvedArguments = resolveActionArguments(actionCall.call.arguments, context, false);
  if (!resolvedArguments.ok) {
    return resolvedArguments;
  }

  if (actionCall.type === 'agent') {
    // The value is the host's pending handle (a promise), if it returned one.
    const pending = context.dispatchAction(
      {
        dependency: actionCall.call.dependency,
        operation: actionCall.call.operation,
        arguments: resolvedArguments.value,
      },
      component,
    );
    return {ok: true, value: pending};
  }

  // Explicitly not `requirePure`: an action is the one position where an
  // effectful function belongs.
  const result = context.invokeFunction(actionCall.call.operation, resolvedArguments.value, {
    requirePure: false,
  });
  return result.ok ? {ok: true, value: result.value} : result;
};

const getPropMap = (
  props: ReadonlyArray<BlokComponentProp> | null | undefined,
): Map<string, BlokComponentProp> => {
  return new Map((props ?? []).map(prop => [prop.key, prop]));
};

export {
  getActionArgumentsRuntimeDependencies,
  getComponentPropRuntimeDependencies,
  getPropActionCall,
  getPropMap,
  invokeUtilCall,
  mergeRuntimeDependencies,
  resolveActionArguments,
  resolveDynamicValue,
  resolvePropValue,
  runActionCall,
};
