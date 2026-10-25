import * as React from 'react';
import {useStore} from 'zustand';
import {createStore} from 'zustand/vanilla';
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
const NONE_KEPT: ReadonlySet<string> = new Set();

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
}): BlokRuntimeStore => {
  const initialDataModel = config?.initialDataModel;
  const keptValues = config?.keptValues ?? {};
  const initialAgentMappingStateUpdates = config?.agentMappingStateUpdates ?? {};
  const invokeFunction = config?.invokeFunction ?? defaultInvokeFunction;
  const dispatchAction = config?.dispatchAction ?? defaultDispatchAction;

  return createStore<BlokRuntimeContext>(set => ({
    initialDataModel,
    dataModel: composeRuntimeDataModel(initialDataModel, keptValues),
    runtimePathValues: {...keptValues},
    keptRoots: config?.keptRoots ?? NONE_KEPT,
    agentMappingStateUpdates: initialAgentMappingStateUpdates,
    invokeFunction,
    dispatchAction,
    refuseAction: config?.refuseAction,
    unavailableDependencies: config?.unavailableDependencies ?? NONE_UNAVAILABLE,
    setInitialDataModel: nextInitialDataModel => {
      set(currentState => {
        if (Object.is(currentState.initialDataModel, nextInitialDataModel)) {
          return currentState;
        }

        return {
          initialDataModel: nextInitialDataModel,
          dataModel: composeRuntimeDataModel(nextInitialDataModel, currentState.runtimePathValues),
        };
      });
    },
    resetRuntimeValues: () => {
      set(currentState => {
        const paths = Object.keys(currentState.runtimePathValues);
        // What the host keeps between openings outlives a reset, as it outlives a reload.
        const kept = paths.filter(path => isUnderRoot(path, currentState.keptRoots));
        if (kept.length === paths.length) {
          return currentState;
        }

        const nextRuntimePathValues = Object.fromEntries(kept.map(path => [path, currentState.runtimePathValues[path]]));
        return {
          runtimePathValues: nextRuntimePathValues,
          dataModel: composeRuntimeDataModel(currentState.initialDataModel, nextRuntimePathValues),
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
          dataModel: composeRuntimeDataModel(currentState.initialDataModel, nextRuntimePathValues),
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
          dataModel: composeRuntimeDataModel(currentState.initialDataModel, nextRuntimePathValues),
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
