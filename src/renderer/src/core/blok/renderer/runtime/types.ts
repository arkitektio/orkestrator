import type {StoreApi} from 'zustand/vanilla';
import {z} from 'zod';
import type {BlokSourceStatus} from './status';
import type {BlokTaskAsk, BlokTaskBinding} from './task';

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
  /**
   * A name this prop declares in the data model. On an agent call it is the
   * name the call's task is bound to (see `runtime/task.ts`).
   */
  declares_value?: string | null;
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
export type BlokInvokeOptions = {
  requirePure?: boolean;
  /** For functions that see statuses (`val.status`): each argument's status, by key. */
  argumentStatus?: Readonly<Record<string, BlokSourceStatus['status']>>;
};

export type BlokInvokeFunctionHandler = (
  name: string,
  args: Record<string, unknown>,
  options?: BlokInvokeOptions,
) => BlokInvokeResult;

/**
 * One step of a task, as a host reports it: what it knows changed. `end`
 * closes the task; nothing is reported after it.
 */
export type BlokTaskUpdate = {
  /** The task's id, once the host knows it. */
  id?: string;
  /** Where it stands while it has not ended. */
  status?: 'queued' | 'running' | 'asking';
  /** The ask it opened (null: answered or withdrawn). */
  ask?: BlokTaskAsk | null;
  /** The values given for its ask. */
  answer?: Record<string, unknown>;
  progress?: number;
  message?: string;
  /** The task's returns so far, by port key. */
  returns?: unknown;
  end?: 'done' | 'failed' | 'cancelled';
  /** Why, with `end: "failed"`. */
  error?: string;
};

export type BlokTaskObserver = (update: BlokTaskUpdate) => void;

/**
 * Dispatches an agent call. A host that can follow the resulting task returns
 * a promise that settles when the task ends (either way) — components use it
 * to show that their action is still running (`usePendingAction`) — and
 * reports the task's steps to `observe`, when the call is bound to a name.
 * Hosts that cannot (the preview) return nothing and report nothing.
 */
export type BlokDispatchActionHandler = (
  action: BlokResolvedAgentCall,
  component: BlokComponentNode,
  observe?: BlokTaskObserver,
) => void | Promise<unknown>;

/**
 * Asked before an agent call starts. A host that answers `true` has the call
 * dropped: nothing is dispatched, and a task bound to the call keeps the run
 * it last showed. This is how a host shows a blok it must not act through
 * (a moment in the past).
 */
export type BlokRefuseActionHandler = (
  action: BlokResolvedAgentCall,
  component: BlokComponentNode,
) => boolean;

/**
 * The dependencies a host cannot act through right now, by key, each with
 * why ("Stage is offline", "No agent is bound to stage"). A control whose
 * action calls one shows as unavailable before it is pressed, with the reason
 * on hover, instead of the host announcing it in a banner.
 */
export type BlokUnavailableDependencies = ReadonlyMap<string, string>;

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
  /** The status of the source a path reads (agent state, a query's value, ...); ready when none is known. */
  statusOf?: (path: string) => BlokSourceStatus;
  /**
   * v1 payloads (a port's CUSTOM widget) spell every literal as a string and
   * decode JSON-looking ones; a v2 blok's `attr="15"` is the string "15".
   */
  decodeLiterals?: boolean;
  /** Re-reads a declared query (`query.refetch`). */
  refetchQuery?: (name: string) => void;
  /** Reads the next page of a declared query (`query.fetch_more`), its variables overridden. */
  fetchMoreQuery?: (name: string, variables: Record<string, unknown>) => void;
  /** Answers the open ask of `task` (`task.answer(values)`). */
  answerTask?: (values: Record<string, unknown>) => unknown;
  /** Set while the blok shows a moment in the past: no command runs. */
  travelling?: boolean;
  resolvePath: (path: string) => string;
  invokeFunction: BlokInvokeFunctionHandler;
  dispatchAction: BlokDispatchActionHandler;
  /** Whether the host drops this agent call. Asked before anything starts. */
  refuseAction?: BlokRefuseActionHandler;
  /**
   * Starts a run under a name a call is bound to. Only the live context of an
   * event handler has one: nothing is dispatched while rendering.
   */
  bindTask?: (name: string, args: Record<string, unknown>) => BlokTaskBinding;
};

export type BlokRuntimeContext = {
  initialDataModel: unknown;
  dataModel: unknown;
  runtimePathValues: Record<string, unknown>;
  /** Top-level keys whose runtime values a reset keeps: the locals the host keeps between openings. */
  keptRoots: ReadonlySet<string>;
  /**
   * The status of each source, by the data-model path it is read under
   * (`deps.robot.arm`, `queries.cells.value`, `args`). A read below a path
   * takes its status; a path with none is ready.
   */
  statuses: Readonly<Record<string, BlokSourceStatus>>;
  /** The moment the blok shows while travelling (ISO 8601); null live. */
  travelAt: string | null;
  /** A v1 payload (a port's CUSTOM widget): JSON-looking literals decode, functions are base@1. */
  decodeLiterals: boolean;
  /** Re-reads a declared query; set by the query runner. */
  refetchQuery: ((name: string) => void) | undefined;
  /** Reads the next page of a declared query; set by the query runner. */
  fetchMoreQuery: ((name: string, variables: Record<string, unknown>) => void) | undefined;
  /** Answers the open ask of `task`; set by a host that holds one. */
  answerTask: ((values: Record<string, unknown>) => unknown) | undefined;
  setStatus: (path: string, status: BlokSourceStatus | null) => void;
  setTravelAt: (at: string | null) => void;
  setRefetchQuery: (refetch: ((name: string) => void) | undefined) => void;
  setFetchMoreQuery: (fetchMore: ((name: string, variables: Record<string, unknown>) => void) | undefined) => void;
  setAnswerTask: (answer: ((values: Record<string, unknown>) => unknown) | undefined) => void;
  agentMappingStateUpdates: BlokAgentMappingStateUpdates;
  invokeFunction: BlokInvokeFunctionHandler;
  dispatchAction: BlokDispatchActionHandler;
  refuseAction: BlokRefuseActionHandler | undefined;
  unavailableDependencies: BlokUnavailableDependencies;
  setInitialDataModel: (dataModel: unknown) => void;
  resetRuntimeValues: () => void;
  setKeptRoots: (roots: ReadonlySet<string>) => void;
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
  setRefuseAction: (refuseAction: BlokRefuseActionHandler | undefined) => void;
  setUnavailableDependencies: (unavailable: BlokUnavailableDependencies) => void;
};

export type BlokObjectSchema = z.ZodObject<Record<string, z.ZodTypeAny>>;

export type BlokRuntimeStore = StoreApi<BlokRuntimeContext>;
