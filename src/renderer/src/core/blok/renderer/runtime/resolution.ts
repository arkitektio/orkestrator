import {z} from 'zod';
import {loadVocabulary} from '../../spec/vocabulary';
import {isActionSchema, isBindSchema} from './schemas';
import {combineStatus, READY, type BlokSourceStatus} from './status';
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

/**
 * How a prop's value is worked out from the data model: paths, literals and
 * pure function calls, each carrying the status of what it read (blok
 * language v2, vocabulary `async`). A pending input makes the result pending,
 * a failed one failed, a stale one stale; `logic.choose`, `logic.all`,
 * `logic.any` and `logic.coalesce` read only what they need, so a pending
 * value in a branch not taken changes nothing. Functions never see a pending
 * or failed value, except those that see statuses (`val.status`).
 *
 * A context with `decodeLiterals` set resolves a v1 payload (a port's CUSTOM
 * widget, a port call): no statuses, JSON-looking literals decoded, v1
 * function names.
 */

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
 * The exact set of runtime reads a prop performs. `useValue` subscribes to
 * precisely this set and then resolves against a snapshot of it, so a
 * component can never read something it did not subscribe to.
 */
const getComponentPropRuntimeDependencies = (
  prop: BlokComponentProp | undefined,
  targetSchema: z.ZodTypeAny,
): BlokRuntimeDependencies => {
  if (!prop) {
    return emptyRuntimeDependencies();
  }

  if (isBindSchema(targetSchema)) {
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

/**
 * A resolved value. `status` is the status of what it was worked out from
 * (absent means ready); a pending or failed value is `null`. `ok: false` is
 * a payload problem (an unknown function, bad arguments), not a data one.
 */
export type BlokResolved<T = unknown> =
  | {ok: true; value: T; status?: BlokSourceStatus}
  | {ok: false; error: string};

export const statusOfResult = (resolved: BlokResolved): BlokSourceStatus =>
  resolved.ok ? (resolved.status ?? READY) : READY;

const blocks = (status: BlokSourceStatus): boolean => status.status === 'pending' || status.status === 'failed';

const ready = <T,>(value: T, status: BlokSourceStatus = READY): BlokResolved<T> =>
  status.status === 'ready' ? {ok: true, value} : {ok: true, value, status};

const readLiteral = (value: unknown, context: BlokResolutionContext): unknown =>
  context.decodeLiterals ? normalizeLiteralValue(value) : value === undefined ? null : value;

const readPathWithStatus = (path: string, context: BlokResolutionContext): {value: unknown; status: BlokSourceStatus} => ({
  value: context.readPath(path),
  status: context.statusOf?.(path) ?? READY,
});

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
    const resolvedArguments = resolveActionArguments(argument.agent_call.arguments, context, requirePure);
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
    let status = READY;
    for (const item of argument.value_list) {
      const resolvedItem = resolveActionArgumentValue(item, context, requirePure);
      if (!resolvedItem.ok) {
        return resolvedItem;
      }
      status = combineStatus(status, statusOfResult(resolvedItem));
      items.push(resolvedItem.value);
    }

    return ready(items, status);
  }

  if (Array.isArray(argument.value_dict)) {
    const entries: Array<[string, unknown]> = [];
    let status = READY;
    for (const [index, item] of argument.value_dict.entries()) {
      const resolvedItem = resolveActionArgumentValue(item, context, requirePure);
      if (!resolvedItem.ok) {
        return resolvedItem;
      }
      status = combineStatus(status, statusOfResult(resolvedItem));
      entries.push([item.key ?? String(index), resolvedItem.value]);
    }

    return ready(Object.fromEntries(entries), status);
  }

  if (argument.value_path) {
    const {value, status} = readPathWithStatus(argument.value_path, context);
    if (blocks(status)) return {ok: true, value: null, status};
    if (value !== undefined) {
      return ready(value, status);
    }
    // A missing path reads as null (v2); a v1 payload falls back to its literal.
    if (!context.decodeLiterals) return ready(null, status);
  }

  return {ok: true, value: readLiteral(argument.value_literal, context)};
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
  let status = READY;
  for (const [index, argument] of argumentsList.entries()) {
    const resolvedArgument = resolveActionArgumentValue(argument, context, requirePure);
    if (!resolvedArgument.ok) {
      return resolvedArgument;
    }
    status = combineStatus(status, statusOfResult(resolvedArgument));
    entries.push([argument.key ?? String(index), resolvedArgument.value]);
  }

  return ready(Object.fromEntries(entries), status);
};

/* -------------------------------------------------------------------------- */
/* Lazy operators and status-seeing functions (v2)                            */
/* -------------------------------------------------------------------------- */

/** JavaScript truthiness: what `&&`, `||` and the ternary test. */
const truthy = (value: unknown): boolean => Boolean(value);

const argumentNamed = (call: BlokUtilCall, key: string): BlokActionArgument | undefined =>
  call.arguments?.find(argument => argument.key === key);

/** The operands of a variadic lazy call: its `values` list, each still unresolved. */
const lazyOperands = (call: BlokUtilCall): BlokActionArgument[] => {
  const values = argumentNamed(call, 'values');
  if (values?.value_list) return values.value_list;
  return values ? [values] : [];
};

const invokeLazy = (call: BlokUtilCall, context: BlokResolutionContext, requirePure: boolean): BlokResolved => {
  const operation = call.operation;
  if (operation === 'logic.choose') {
    const condArgument = argumentNamed(call, 'cond');
    const cond = condArgument ? resolveActionArgumentValue(condArgument, context, requirePure) : ready<unknown>(null);
    if (!cond.ok) return cond;
    const condStatus = statusOfResult(cond);
    if (blocks(condStatus)) return {ok: true, value: null, status: condStatus};
    const branch = argumentNamed(call, truthy(cond.value) ? 'then' : 'otherwise');
    if (!branch) return ready<unknown>(null, condStatus);
    const taken = resolveActionArgumentValue(branch, context, requirePure);
    if (!taken.ok) return taken;
    const takenStatus = statusOfResult(taken);
    return ready(blocks(takenStatus) ? null : taken.value, combineStatus(condStatus, takenStatus));
  }

  const operands = lazyOperands(call);
  let status = READY;
  let last: unknown = operation === 'logic.all' ? true : operation === 'logic.any' ? false : null;
  for (const operand of operands) {
    const resolved = resolveActionArgumentValue(operand, context, requirePure);
    if (!resolved.ok) return resolved;
    const operandStatus = statusOfResult(resolved);
    // What decides the result cannot be known yet.
    if (blocks(operandStatus)) return {ok: true, value: null, status: combineStatus(status, operandStatus)};
    status = combineStatus(status, operandStatus);
    const value = resolved.value;
    if (operation === 'logic.all' && !truthy(value)) return ready(value, status);
    if (operation === 'logic.any' && truthy(value)) return ready(value, status);
    if (operation === 'logic.coalesce' && value !== null && value !== undefined) return ready(value, status);
    last = value;
  }
  return ready(operation === 'logic.coalesce' ? null : last, status);
};

const isLazy = (operation: string): boolean => loadVocabulary().functions.get(operation)?.lazy === true;
const seesStatus = (operation: string): boolean => loadVocabulary().functions.get(operation)?.seesStatus === true;

const invokeUtilCall = (
  utilCall: BlokUtilCall,
  context: BlokResolutionContext,
  requirePure: boolean,
): BlokResolved => {
  const v2 = !context.decodeLiterals;
  if (v2 && isLazy(utilCall.operation)) {
    return invokeLazy(utilCall, context, requirePure);
  }

  if (v2 && seesStatus(utilCall.operation)) {
    const args: Record<string, unknown> = {};
    const argumentStatus: Record<string, BlokSourceStatus['status']> = {};
    for (const [index, argument] of (utilCall.arguments ?? []).entries()) {
      const resolved = resolveActionArgumentValue(argument, context, requirePure);
      if (!resolved.ok) return resolved;
      const key = argument.key ?? String(index);
      args[key] = resolved.value;
      argumentStatus[key] = statusOfResult(resolved).status;
    }
    const result = context.invokeFunction(utilCall.operation, args, {requirePure, argumentStatus});
    return result.ok ? {ok: true, value: result.value} : result;
  }

  const resolvedArguments = resolveActionArguments(utilCall.arguments, context, requirePure);
  if (!resolvedArguments.ok) {
    return resolvedArguments;
  }
  const status = statusOfResult(resolvedArguments);
  if (v2 && blocks(status)) {
    return {ok: true, value: null, status};
  }

  const result = context.invokeFunction(utilCall.operation, resolvedArguments.value, {requirePure});
  return result.ok ? ready(result.value, status) : result;
};

/**
 * Resolves a prop in *value* position. Pure by construction: it reads paths and
 * calls pure functions, but never fires an effect; an effect bound to a value
 * prop resolves to an error instead of being invoked on every render.
 */
const resolvePropValue = (
  prop: BlokComponentProp | undefined,
  targetSchema: z.ZodTypeAny,
  context: BlokResolutionContext,
): BlokResolved => {
  if (!prop) {
    return {ok: true, value: undefined};
  }

  // Callback props carry a call descriptor, not a value; `useAction` builds the
  // callback so its identity stays stable across store updates.
  if (isActionSchema(targetSchema)) {
    return {ok: true, value: undefined};
  }

  // `bind={iterations}` names the local it writes: the path, not its value.
  if (isBindSchema(targetSchema)) {
    if (prop.dynamic_value?.path) return {ok: true, value: prop.dynamic_value.path};
    return {ok: true, value: typeof prop.static_value === 'string' ? prop.static_value : undefined};
  }

  if (prop.util_call) {
    return invokeUtilCall(prop.util_call, context, true);
  }

  if (prop.agent_call) {
    // An agent call bound to a non-callback prop is passed through as data.
    return {ok: true, value: prop.agent_call};
  }

  if (context.decodeLiterals) {
    const dynamicValue = resolveDynamicValue(prop.dynamic_value, context);
    if (dynamicValue !== undefined) return {ok: true, value: dynamicValue};
    return {ok: true, value: normalizeLiteralValue(prop.static_value)};
  }

  if (prop.dynamic_value?.path) {
    const {value, status} = readPathWithStatus(prop.dynamic_value.path, context);
    if (blocks(status)) return {ok: true, value: null, status};
    return ready(value === undefined ? null : value, status);
  }

  return {ok: true, value: prop.static_value};
};

/* -------------------------------------------------------------------------- */
/* Callbacks: exactly one command or intent                                   */
/* -------------------------------------------------------------------------- */

/** The effects a callback may hold besides a task call (vocabulary functions flagged `effect`). */
export const COPY_EFFECT = 'ui.copy';
export const ANSWER_EFFECT = 'task.answer';
export const REFETCH_EFFECT = 'query.refetch';
export const FETCH_MORE_EFFECT = 'query.fetch_more';

export type BlokActionCall =
  /** `into`: the name of the record the call's task writes, if the prop declares one. */
  | {type: 'agent'; call: BlokAgentCall; into?: string}
  | {type: 'util'; call: BlokUtilCall};

const getPropActionCall = (
  prop: BlokComponentProp | undefined,
): BlokActionCall | undefined => {
  if (prop?.agent_call) {
    return {type: 'agent', call: prop.agent_call, into: prop.declares_value || undefined};
  }

  if (prop?.util_call) {
    return {type: 'util', call: prop.util_call};
  }

  return undefined;
};

/** Whether a callback is a command: it is refused while the blok shows the past. */
export const isCommand = (actionCall: BlokActionCall | undefined): boolean =>
  actionCall !== undefined && (actionCall.type === 'agent' || (actionCall.type === 'util' && actionCall.call.operation === ANSWER_EFFECT));

const copyToClipboard = (value: unknown): void => {
  const text = value === null || value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;
  if (!clipboard) {
    console.warn('[blok] ui.copy: no clipboard is available here.');
    return;
  }
  clipboard.writeText(text).catch((error: unknown) => console.warn('[blok] ui.copy failed', error));
};

/**
 * Runs a callback's one thing. Arguments are resolved *at invoke time* against
 * live state (not against the snapshot the last render saw).
 *
 * - a task call (`deps.robot.move_to(...) into move`): dispatched to the host,
 *   its record (`move`) started over first, with what it was called with;
 * - `query.refetch(query)` (`queries.<name>.refetch()`): re-reads the query;
 * - `query.fetch_more(query, variables?)` (`queries.<name>.fetch_more(...)`):
 *   reads its next page, the variables resolved here, against live state
 *   (they may read `event` and locals); both are allowed while travelling, as
 *   they re-read the same moment;
 * - `ui.copy(text)`: the viewer's clipboard;
 * - `task.answer(values)`: answers the open ask of `task`.
 *
 * While the blok shows the past, no command runs.
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
    const action = {
      dependency: actionCall.call.dependency,
      operation: actionCall.call.operation,
      arguments: resolvedArguments.value,
    };
    if (context.travelling) {
      return {ok: true, value: undefined};
    }
    // Asked first: a refused call must not start its record over, or the
    // result the blok still shows would be wiped for a run that never was.
    if (context.refuseAction?.(action, component)) {
      return {ok: true, value: undefined};
    }
    // A named call's record starts over before the host is asked, so no step
    // the host reports can arrive ahead of it.
    const binding = actionCall.into ? context.bindTask?.(actionCall.into, resolvedArguments.value) : undefined;
    // The value is the host's pending handle (a promise), if it returned one.
    const pending = binding
      ? context.dispatchAction(action, component, binding.observe)
      : context.dispatchAction(action, component);
    if (!(pending instanceof Promise)) {
      binding?.release();
    }
    return {ok: true, value: pending};
  }

  const operation = actionCall.call.operation;
  if (!context.decodeLiterals) {
    if (operation === COPY_EFFECT) {
      copyToClipboard(resolvedArguments.value.text);
      return {ok: true, value: undefined};
    }
    if (operation === REFETCH_EFFECT || operation === FETCH_MORE_EFFECT) {
      const query = resolvedArguments.value.query;
      if (typeof query !== 'string') return {ok: false, error: `${operation} names its query by a literal name.`};
      if (operation === REFETCH_EFFECT) {
        if (!context.refetchQuery) return {ok: false, error: `queries.${query} is not running here.`};
        context.refetchQuery(query);
        return {ok: true, value: undefined};
      }
      if (!context.fetchMoreQuery) return {ok: false, error: `queries.${query} is not running here.`};
      const variables = resolvedArguments.value.variables;
      context.fetchMoreQuery(
        query,
        variables !== null && typeof variables === 'object' && !Array.isArray(variables) ? (variables as Record<string, unknown>) : {},
      );
      return {ok: true, value: undefined};
    }
    if (operation === ANSWER_EFFECT) {
      if (context.travelling) return {ok: true, value: undefined};
      if (!context.answerTask) return {ok: false, error: 'task.answer: this blok answers no ask.'};
      const values = resolvedArguments.value.values;
      const answered = context.answerTask(
        values !== null && typeof values === 'object' && !Array.isArray(values) ? (values as Record<string, unknown>) : {},
      );
      return {ok: true, value: answered};
    }
    return {
      ok: false,
      error: `${operation} is not a callback's one thing: a callback holds one task call or one effect (queries.<name>.refetch(), queries.<name>.fetch_more(...), ui.copy, task.answer).`,
    };
  }

  // A v1 payload (a port's widget): an action is the one position an effectful function belongs.
  const result = context.invokeFunction(operation, resolvedArguments.value, {requirePure: false});
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
