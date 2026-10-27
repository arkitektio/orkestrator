import * as React from 'react';
import {useStore} from 'zustand';
import {createStore} from 'zustand/vanilla';
import {combineStatus, READY, type BlokSourceStatus} from './status';
import {isRecord, splitPathSegments} from './utils';
import type {
  BlokAgentMappingStateUpdates,
  BlokDispatchActionHandler,
  BlokInvokeFunctionHandler,
  BlokRefuseActionHandler,
  BlokUnavailableDependencies,
  BlokRuntimeContext,
  BlokRuntimeStore,
} from './types';

const defaultInvokeFunction: BlokInvokeFunctionHandler = name => ({
  ok: false,
  error: `No blok function catalog is available to invoke "${name}".`,
});
const defaultDispatchAction: BlokDispatchActionHandler = () => undefined;

const isNumericPathSegment = (segment: string): boolean => /^\d+$/.test(segment);

const clonePathContainer = (value: unknown, nextSegment?: string): unknown[] | Record<string, unknown> => {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (isRecord(value)) {
    return {...value};
  }

  return isNumericPathSegment(nextSegment ?? '') ? [] : {};
};

const applyRuntimeValueAtPath = (dataModel: unknown, path: string, value: unknown): unknown => {
  const segments = splitPathSegments(path);

  if (segments.length === 0) {
    return value;
  }

  const root = clonePathContainer(dataModel, segments[0]);
  let currentTarget: unknown[] | Record<string, unknown> = root;
  let currentSource: unknown = dataModel;

  segments.forEach((segment, index) => {
    const isLeaf = index === segments.length - 1;
    const key: number | string = isNumericPathSegment(segment) ? Number(segment) : segment;

    if (isLeaf) {
      (currentTarget as Record<string | number, unknown>)[key] = value;
      return;
    }

    const nextSegment = segments[index + 1];
    const sourceChild =
      Array.isArray(currentSource) || isRecord(currentSource)
        ? (currentSource as Record<string | number, unknown>)[key]
        : undefined;
    const nextTarget = clonePathContainer(sourceChild, nextSegment);

    (currentTarget as Record<string | number, unknown>)[key] = nextTarget;
    currentTarget = nextTarget;
    currentSource = sourceChild;
  });

  return root;
};

const composeRuntimeDataModel = (
  initialDataModel: unknown,
  runtimePathValues: Record<string, unknown>,
): unknown => {
  return Object.entries(runtimePathValues).reduce(
    (currentDataModel, [path, value]) => applyRuntimeValueAtPath(currentDataModel, path, value),
    initialDataModel,
  );
};

const NONE_UNAVAILABLE: BlokUnavailableDependencies = new Map();
const NO_STATUSES: Readonly<Record<string, BlokSourceStatus>> = Object.freeze({});

/** A path as statuses are keyed: dot-joined segments, `self` read as `deps.self`. */
export const canonicalStatusPath = (path: string): string => {
  const segments = splitPathSegments(path);
  if (segments[0] === 'self') segments.splice(0, 1, 'deps', 'self');
  return segments.join('.');
};

/**
 * The status a read of `path` has: every status set on it or on a path above
 * it, combined (pending over failed over stale over ready).
 */
export const statusAtPath = (
  statuses: Readonly<Record<string, BlokSourceStatus>>,
  path: string,
): BlokSourceStatus => {
  const segments = canonicalStatusPath(path).split('.');
  let result = READY;
  for (let length = 1; length <= segments.length; length += 1) {
    const found = statuses[segments.slice(0, length).join('.')];
    if (found) result = combineStatus(result, found);
  }
  return result;
};
const NONE_KEPT: ReadonlySet<string> = new Set();

/** `then` (vocabulary `roots.data.then`): the viewed moment, null live, the travel time while travelling. */
export const THEN_ROOT = 'then';
/** Roots the host writes, never the blok: a reset of the blok's own values leaves them alone. */
const HOST_ROOTS: ReadonlySet<string> = new Set(['viewer']);

/**
 * The data model: the initial one with `then` laid in (the host's, never
 * among the runtime values a blok writes), the runtime values over it.
 */
const modelOf = (initialDataModel: unknown, travelAt: string | null, runtimePathValues: Record<string, unknown>): unknown => {
  const base =
    initialDataModel === undefined || initialDataModel === null || (typeof initialDataModel === 'object' && !Array.isArray(initialDataModel))
      ? {...(initialDataModel as Record<string, unknown> | null | undefined), [THEN_ROOT]: travelAt}
      : initialDataModel;
  return composeRuntimeDataModel(base, runtimePathValues);
};

/** Whether a runtime value is written below one of `roots`: a top-level key, and what is under it. */
const isUnderRoot = (path: string, roots: ReadonlySet<string>): boolean => {
  const [root] = splitPathSegments(path);
  return root !== undefined && roots.has(root);
};

export const createBlokRuntimeStore = (config?: {
  initialDataModel?: unknown;
  agentMappingStateUpdates?: BlokAgentMappingStateUpdates;
  invokeFunction?: BlokInvokeFunctionHandler;
  dispatchAction?: BlokDispatchActionHandler;
  refuseAction?: BlokRefuseActionHandler;
  unavailableDependencies?: BlokUnavailableDependencies;
  /**
   * Locals the host kept from an earlier opening, by top-level key: written
   * as runtime values over the initial data model, so the first render shows
   * them and clearing one shows its default again.
   */
  keptValues?: Record<string, unknown>;
  /** The top-level keys a reset of the runtime values leaves alone (`keptValues`' and later edits of them). */
  keptRoots?: ReadonlySet<string>;
  /** Source statuses known before the first render (a preview's are all ready). */
  statuses?: Readonly<Record<string, BlokSourceStatus>>;
  travelAt?: string | null;
  decodeLiterals?: boolean;
  answerTask?: (values: Record<string, unknown>) => unknown;
}): BlokRuntimeStore => {
  const initialDataModel = config?.initialDataModel;
  const keptValues = config?.keptValues ?? {};
  const initialAgentMappingStateUpdates = config?.agentMappingStateUpdates ?? {};
  const invokeFunction = config?.invokeFunction ?? defaultInvokeFunction;
  const dispatchAction = config?.dispatchAction ?? defaultDispatchAction;

  return createStore<BlokRuntimeContext>(set => ({
    initialDataModel,
    dataModel: modelOf(initialDataModel, config?.travelAt ?? null, keptValues),
    runtimePathValues: {...keptValues},
    keptRoots: config?.keptRoots ?? NONE_KEPT,
    agentMappingStateUpdates: initialAgentMappingStateUpdates,
    invokeFunction,
    dispatchAction,
    refuseAction: config?.refuseAction,
    unavailableDependencies: config?.unavailableDependencies ?? NONE_UNAVAILABLE,
    statuses: config?.statuses ?? NO_STATUSES,
    travelAt: config?.travelAt ?? null,
    decodeLiterals: config?.decodeLiterals ?? false,
    refetchQuery: undefined,
    fetchMoreQuery: undefined,
    answerTask: config?.answerTask,
    setStatus: (path, status) => {
      const key = canonicalStatusPath(path);
      set(currentState => {
        const current = currentState.statuses[key];
        if (status === null) {
          if (!current) return currentState;
          const next = {...currentState.statuses};
          delete next[key];
          return {statuses: next};
        }
        if (
          current &&
          current.status === status.status &&
          (current.error ?? null) === (status.error ?? null) &&
          (current.code ?? null) === (status.code ?? null)
        ) {
          return currentState;
        }
        return {statuses: {...currentState.statuses, [key]: status}};
      });
    },
    setTravelAt: at => {
      set(currentState => {
        if (currentState.travelAt === at) return currentState;
        return {travelAt: at, dataModel: modelOf(currentState.initialDataModel, at, currentState.runtimePathValues)};
      });
    },
    setRefetchQuery: refetch => {
      set({refetchQuery: refetch});
    },
    setFetchMoreQuery: fetchMore => {
      set({fetchMoreQuery: fetchMore});
    },
    setAnswerTask: answer => {
      set({answerTask: answer});
    },
    setInitialDataModel: nextInitialDataModel => {
      set(currentState => {
        if (Object.is(currentState.initialDataModel, nextInitialDataModel)) {
          return currentState;
        }

        return {
          initialDataModel: nextInitialDataModel,
          dataModel: modelOf(nextInitialDataModel, currentState.travelAt, currentState.runtimePathValues),
        };
      });
    },
    resetRuntimeValues: () => {
      set(currentState => {
        const paths = Object.keys(currentState.runtimePathValues);
        // What the host keeps between openings outlives a reset, as it outlives a reload.
        const kept = paths.filter(path => isUnderRoot(path, currentState.keptRoots) || isUnderRoot(path, HOST_ROOTS));
        if (kept.length === paths.length) {
          return currentState;
        }

        const nextRuntimePathValues = Object.fromEntries(kept.map(path => [path, currentState.runtimePathValues[path]]));
        return {
          runtimePathValues: nextRuntimePathValues,
          dataModel: modelOf(currentState.initialDataModel, currentState.travelAt, nextRuntimePathValues),
        };
      });
    },
    setKeptRoots: nextKeptRoots => {
      set({keptRoots: nextKeptRoots});
    },
    setRuntimeValue: (path, value) => {
      set(currentState => {
        if (
          path in currentState.runtimePathValues &&
          Object.is(currentState.runtimePathValues[path], value)
        ) {
          return currentState;
        }

        const nextRuntimePathValues = {
          ...currentState.runtimePathValues,
          [path]: value,
        };

        return {
          runtimePathValues: nextRuntimePathValues,
          dataModel: modelOf(currentState.initialDataModel, currentState.travelAt, nextRuntimePathValues),
        };
      });
    },
    clearRuntimeValue: path => {
      set(currentState => {
        if (!(path in currentState.runtimePathValues)) {
          return currentState;
        }

        const nextRuntimePathValues = {...currentState.runtimePathValues};
        delete nextRuntimePathValues[path];

        return {
          runtimePathValues: nextRuntimePathValues,
          dataModel: modelOf(currentState.initialDataModel, currentState.travelAt, nextRuntimePathValues),
        };
      });
    },
    setAgentMappingStateUpdates: nextAgentMappingStateUpdates => {
      set({agentMappingStateUpdates: nextAgentMappingStateUpdates});
    },
    setAgentMappingStateUpdate: (mappingKey, agentId, stateInterface, value, revision) => {
      set(currentState => ({
        agentMappingStateUpdates: {
          ...currentState.agentMappingStateUpdates,
          [mappingKey]: {
            agentId,
            interfaces: {
              ...(currentState.agentMappingStateUpdates[mappingKey]?.interfaces ?? {}),
              [stateInterface]: {
                value,
                revision,
              },
            },
          },
        },
      }));
    },
    clearAgentMappingStateUpdate: (mappingKey, stateInterface) => {
      set(currentState => {
        const currentMapping = currentState.agentMappingStateUpdates[mappingKey];

        if (!currentMapping || !(stateInterface in currentMapping.interfaces)) {
          return currentState;
        }

        const nextInterfaces = {...currentMapping.interfaces};
        delete nextInterfaces[stateInterface];

        const nextAgentMappingStateUpdates = {...currentState.agentMappingStateUpdates};

        if (Object.keys(nextInterfaces).length === 0) {
          delete nextAgentMappingStateUpdates[mappingKey];
        } else {
          nextAgentMappingStateUpdates[mappingKey] = {
            ...currentMapping,
            interfaces: nextInterfaces,
          };
        }

        return {
          agentMappingStateUpdates: nextAgentMappingStateUpdates,
        };
      });
    },
    setInvokeFunction: nextInvokeFunction => {
      set({invokeFunction: nextInvokeFunction});
    },
    setDispatchAction: nextDispatchAction => {
      set({dispatchAction: nextDispatchAction});
    },
    setRefuseAction: nextRefuseAction => {
      set({refuseAction: nextRefuseAction});
    },
    setUnavailableDependencies: nextUnavailable => {
      set({unavailableDependencies: nextUnavailable});
    },
  }));
};

const BlokRuntimeStoreContext = React.createContext<BlokRuntimeStore | null>(null);

export const BlokRuntimeProvider = (
  props: {store: BlokRuntimeStore; children: React.ReactNode},
) => {
  return (
    <BlokRuntimeStoreContext.Provider value={props.store}>
      {props.children}
    </BlokRuntimeStoreContext.Provider>
  );
};

export const useBlokRuntimeStoreApi = (): BlokRuntimeStore => {
  const store = React.useContext(BlokRuntimeStoreContext);
  if (!store) {
    throw new Error('useBlokRuntime must be used within a BlokRuntimeProvider');
  }

  return store;
};

export const useBlokRuntime = <T,>(selector: (state: BlokRuntimeContext) => T): T => {
  const store = useBlokRuntimeStoreApi();
  return useStore(store, selector);
};

export {applyRuntimeValueAtPath, composeRuntimeDataModel};
