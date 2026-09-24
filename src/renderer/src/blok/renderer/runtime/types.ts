import type {StoreApi} from 'zustand/vanilla';
import {z} from 'zod';

export type ChildDescriptor = string | {id: string; basePath?: string};

export type BlokDynamicValue = {
  literal?: string | null;
  path?: string | null;
};

export type BlokActionArgument = {
  key?: string | null;
  value_literal?: unknown;
  value_path?: string | null;
  agent_call?: BlokAgentCall | null;
  util_call?: BlokUtilCall | null;
  value_list?: BlokActionArgument[] | null;
  value_dict?: BlokActionArgument[] | null;
};

export type BlokAgentCall = {
  dependency: string;
  operation: string;
  arguments?: BlokActionArgument[] | null;
};

export type BlokUtilCall = {
  operation: string;
  arguments?: BlokActionArgument[] | null;
};

export type BlokComponentProp = {
  key: string;
  static_value?: unknown;
  dynamic_value?: BlokDynamicValue | null;
  agent_call?: BlokAgentCall | null;
  util_call?: BlokUtilCall | null;
};

export type BlokComponentNode = {
  id: string;
  component: string;
  props?: BlokComponentProp[] | null;
  children?: BlokComponentNode[] | null;
};

/** A parsed, preflight-validated payload. */
export type BlokDocument = {
  roots: BlokComponentNode[];
};

export type BlokResolvedAgentCall = {
  dependency: string;
  operation: string;
  arguments?: Record<string, unknown>;
};

export type BlokValidationState = {
  isValid: boolean;
  validationErrors: string[];
};

export type BlokRuntimeDependencies = {
  paths: string[];
  needsInvokeFunction: boolean;
  needsDispatchAction: boolean;
};

export type BlokAgentMappingInterfaceUpdate = {
  value: unknown;
  revision: number | null;
};

export type BlokAgentMappingStateUpdate = {
  agentId: string;
  interfaces: Record<string, BlokAgentMappingInterfaceUpdate>;
};

export type BlokAgentMappingStateUpdates = Record<string, BlokAgentMappingStateUpdate>;

/**
 * Function invocation never throws across the runtime boundary: a bad catalog
 * name or an argument-schema mismatch is data, not a crash. Callers that
 * resolve during render surface `ok: false` as an inline node error instead of
 * taking the whole surface down.
 */
export type BlokInvokeResult =
  | {ok: true; value: unknown}
  | {ok: false; error: string};

/** Set while resolving a prop value during render; refuses `effect` functions. */
export type BlokInvokeOptions = {requirePure?: boolean};

export type BlokInvokeFunctionHandler = (
  name: string,
  args: Record<string, unknown>,
  options?: BlokInvokeOptions,
) => BlokInvokeResult;

/**
 * Dispatches an agent call. A host that can follow the resulting task returns
 * a promise that settles when the task ends (either way) — components use it
 * to show that their action is still running (`usePendingAction`). Hosts that
 * cannot (the preview) return nothing.
 */
export type BlokDispatchActionHandler = (
  action: BlokResolvedAgentCall,
  component: BlokComponentNode,
) => void | Promise<unknown>;

/**
 * Lexical scope introduced by `foreach` and by a child's `basePath`.
 *
 * - `aliases` maps a scope name to an absolute data-model path. Reads *and*
 *   writes go through it, so an `Input` inside a `foreach` mutates the real
 *   backing array rather than a detached copy.
 * - `values` carries the scoped value directly, for sources that have no
 *   addressable path (a literal or a util-call result). Read-only.
 * - `basePath` prefixes every unaliased path, which is how a child's
 *   `basePath` descriptor and an unnamed `foreach` body resolve relatively.
 *
 * Scope lives in React context, not in the store: it is a property of *where a
 * node sits in the tree*, never of the shared data model.
 */
export type BlokScope = {
  aliases: Readonly<Record<string, string>>;
  values: Readonly<Record<string, unknown>>;
  basePath?: string;
};

/**
 * Everything prop resolution is allowed to touch.
 *
 * `readPath` is deliberately a callback rather than a raw data model: during
 * render it is backed by a *snapshot* of exactly the paths the prop declared as
 * dependencies (so what a component subscribes to and what it reads cannot
 * drift), while inside an action callback it reads live store state.
 */
export type BlokResolutionContext = {
  readPath: (path: string) => unknown;
  resolvePath: (path: string) => string;
  invokeFunction: BlokInvokeFunctionHandler;
  dispatchAction: BlokDispatchActionHandler;
};

export type BlokRuntimeContext = {
  initialDataModel: unknown;
  dataModel: unknown;
  runtimePathValues: Record<string, unknown>;
  agentMappingStateUpdates: BlokAgentMappingStateUpdates;
  invokeFunction: BlokInvokeFunctionHandler;
  dispatchAction: BlokDispatchActionHandler;
  setInitialDataModel: (dataModel: unknown) => void;
  resetRuntimeValues: () => void;
  setRuntimeValue: (path: string, value: unknown) => void;
  clearRuntimeValue: (path: string) => void;
  setAgentMappingStateUpdates: (updates: BlokAgentMappingStateUpdates) => void;
  setAgentMappingStateUpdate: (
    mappingKey: string,
    agentId: string,
    stateInterface: string,
    value: unknown,
    revision: number | null,
  ) => void;
  clearAgentMappingStateUpdate: (mappingKey: string, stateInterface: string) => void;
  setInvokeFunction: (invokeFunction: BlokInvokeFunctionHandler) => void;
  setDispatchAction: (dispatchAction: BlokDispatchActionHandler) => void;
};

export type BlokObjectSchema = z.ZodObject<Record<string, z.ZodTypeAny>>;

export type BlokRuntimeStore = StoreApi<BlokRuntimeContext>;
