import * as React from 'react';
import {createKeyedStore, type KeyedStore} from '../cache/keyedStore';
import {valueFitsPort} from '../spec/locals';
import {isExplicitId} from '../spec/vocabulary';
import type {BlokRuntimeStore} from './runtime';

/**
 * What a blok keeps between openings, on this device only (blok language v2):
 *
 * - **form inputs**: a local declared `Local(default, persist=True)` (a port
 *   plus `persist`) remembers the viewer's last input;
 * - **component state**: a component that offers it as its own BOOL prop
 *   (`<Scene id="main" persist>`, `<Transform id="arm-pose" persist>`) keeps
 *   its interaction state (the camera, the pose) by its id. The language
 *   declares no component persistence: that is each component's business.
 *
 * Nothing reaches a server, so keeping cannot become a channel between
 * clients. Values live in IndexedDB keyed by (hub, user, materialized blok)
 * for the locals and (hub, user, materialized blok, component id) for each
 * component, and are written a moment after the last change. A local the
 * blok no longer persists, or a value that no longer fits its port, is
 * dropped when the blok opens.
 */

/** A choice a local's port offers (`ChoiceInput`). */
export type BlokLocalChoice = {value: unknown; label?: string | null; description?: string | null};

/**
 * A local's port, as an action's arg port is declared (`ArgPortInput`): its
 * key (the name the tree reads it by), kind (required), identifier for a
 * structure, nullable, default, children for a list/dict/model, choices.
 */
export type BlokLocalPort = {
  key: string;
  /** `INT FLOAT STRING BOOL ENUM DATE QUANTITY LIST DICT MODEL STRUCTURE ...` */
  kind: string;
  identifier?: string | null;
  nullable?: boolean | null;
  default?: unknown;
  children?: readonly BlokLocalPort[] | null;
  choices?: readonly BlokLocalChoice[] | null;
  label?: string | null;
  description?: string | null;
};

/** A local (vocabulary `locals`): an arg port plus `persist`, remembering the last input on this device. */
export type BlokLocal = BlokLocalPort & {persist?: boolean | null};

/** What is kept for one materialization's locals: values by local key. */
export type KeptLocals = Record<string, unknown>;

/** Whose a kept record is: the hub and user it was set under, and the materialization. */
export type BlokPersistScope = {hub: string; user: string; materializedBlok: string};

const isKeptLocals = (value: unknown): value is KeptLocals =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const keptLocalsStore: KeyedStore<KeptLocals> = createKeyedStore<KeptLocals>({
  db: 'orkestrator-blok-locals',
  store: 'locals',
  version: 1,
  isValue: isKeptLocals,
  label: 'kept blok local',
});

/** One component's kept state, wrapped so any JSON value fits the store. */
export type KeptComponentState = {state: unknown};

const isKeptComponentState = (value: unknown): value is KeptComponentState =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && 'state' in value;

export const keptComponentStore: KeyedStore<KeptComponentState> = createKeyedStore<KeptComponentState>({
  db: 'orkestrator-blok-components',
  store: 'components',
  version: 1,
  isValue: isKeptComponentState,
  label: 'kept blok component state',
});

/** keyedStore's "hash": a record is always the current one, its contents are checked on reading. */
const LOCALS_RECORD = 'locals';
const COMPONENT_RECORD = 'component';

export const keptLocalsId = (scope: BlokPersistScope): string =>
  JSON.stringify([scope.hub, scope.user, scope.materializedBlok]);

export const keptComponentId = (scope: BlokPersistScope, componentId: string): string =>
  JSON.stringify([scope.hub, scope.user, scope.materializedBlok, componentId]);

/** Whether a kept value can stand for a local: it fits the local's port (a kept value that no longer does is dropped). */
export const fitsLocal = (kept: unknown, local: BlokLocal): boolean => {
  // A structure is kept as its reference object or its id.
  if (local.kind === 'STRUCTURE') return kept === null || typeof kept === 'string' || (typeof kept === 'object' && !Array.isArray(kept));
  return valueFitsPort(kept, local);
};

export const keptValuesOf = (record: KeptLocals | null, locals: readonly BlokLocal[]): {values: KeptLocals; dropped: boolean} => {
  const values: KeptLocals = {};
  if (!record) return {values, dropped: false};
  for (const local of locals) {
    if (local.persist && local.key in record && fitsLocal(record[local.key], local)) values[local.key] = record[local.key];
  }
  return {values, dropped: Object.keys(values).length !== Object.keys(record).length};
};

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * One opened materialization's kept locals and component states: what to
 * seed the renderer with, and what writes changes back.
 */
export type BlokPersistence = {
  /** The locals kept on this device (those declared with `persist`). */
  keys: ReadonlySet<string>;
  /** The kept locals to seed the runtime with, before the first render. */
  initial: KeptLocals;
  /** Follows `store`: a change of a kept local is written after `delay`. Returns the detach, which flushes. */
  attach: (store: BlokRuntimeStore) => () => void;
  /** Forgets every kept local and shows the defaults again. */
  resetLocals: () => Promise<void>;
  /** Writes a pending change now. */
  flush: () => Promise<void>;
  /** What components keep by id. */
  components: BlokComponentStateStore;
};

/** Where components keep their own state by id: provided to the tree (`BlokComponentStateContext`). */
export type BlokComponentStateStore = {
  load: (componentId: string) => Promise<unknown>;
  save: (componentId: string, state: unknown) => void;
  forget: (componentId: string) => Promise<void>;
};

/** Where the components of one materialization keep their state by id. */
export const componentStateStore = (
  scope: BlokPersistScope,
  store: KeyedStore<KeptComponentState> = keptComponentStore,
  delay = 400,
): BlokComponentStateStore => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    load: async componentId => (await store.load(keptComponentId(scope, componentId), COMPONENT_RECORD))?.state ?? null,
    save: (componentId, state) => {
      const pending = timers.get(componentId);
      if (pending !== undefined) clearTimeout(pending);
      timers.set(
        componentId,
        setTimeout(() => {
          timers.delete(componentId);
          void store.save(keptComponentId(scope, componentId), COMPONENT_RECORD, {state});
        }, delay),
      );
    },
    forget: async componentId => {
      const pending = timers.get(componentId);
      if (pending !== undefined) clearTimeout(pending);
      timers.delete(componentId);
      await store.forget(keptComponentId(scope, componentId));
    },
  };
};

export const openBlokPersistence = async (options: {
  scope: BlokPersistScope;
  /** The blok's declared locals; those with `persist` are kept. */
  locals: readonly BlokLocal[];
  store?: KeyedStore<KeptLocals>;
  componentStore?: KeyedStore<KeptComponentState>;
  /** How long after the last change a value is written, in ms. */
  delay?: number;
}): Promise<BlokPersistence> => {
  const store = options.store ?? keptLocalsStore;
  const delay = options.delay ?? 400;
  const id = keptLocalsId(options.scope);
  const persisted = options.locals.filter(local => local.persist);
  const keys = new Set(persisted.map(local => local.key));
  const defaults = new Map(options.locals.map(local => [local.key, local.default ?? null] as const));
  const record = keys.size > 0 ? await store.load(id, LOCALS_RECORD) : null;
  const {values: initial, dropped} = keptValuesOf(record, persisted);
  if (dropped) {
    await (Object.keys(initial).length > 0 ? store.save(id, LOCALS_RECORD, initial) : store.forget(id));
  }

  let kept: KeptLocals = {...initial};
  let timer: ReturnType<typeof setTimeout> | undefined;
  let runtime: BlokRuntimeStore | undefined;

  const write = async () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    await (Object.keys(kept).length > 0 ? store.save(id, LOCALS_RECORD, {...kept}) : store.forget(id));
  };

  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => void write(), delay);
  };

  return {
    keys,
    initial,
    attach: target => {
      runtime = target;
      const valueOf = (key: string) => (target.getState().dataModel as Record<string, unknown> | null)?.[key];
      const seen = new Map([...keys].map(key => [key, valueOf(key)] as const));
      const unsubscribe = target.subscribe(state => {
        let changed = false;
        for (const key of keys) {
          const value = (state.dataModel as Record<string, unknown> | null)?.[key];
          if (same(value, seen.get(key))) continue;
          seen.set(key, value);
          // Back at the default is nothing to keep.
          if (same(value, defaults.get(key))) {
            if (!(key in kept)) continue;
            delete kept[key];
          } else {
            kept[key] = value;
          }
          changed = true;
        }
        if (changed) schedule();
      });
      return () => {
        unsubscribe();
        if (runtime === target) runtime = undefined;
        if (timer !== undefined) void write();
      };
    },
    resetLocals: async () => {
      kept = {};
      const state = runtime?.getState();
      if (state) {
        for (const path of Object.keys(state.runtimePathValues)) {
          const [root] = path.split(/[/.]/);
          if (keys.has(root)) state.clearRuntimeValue(path);
        }
      }
      await write();
    },
    flush: async () => {
      if (timer !== undefined) await write();
    },
    components: componentStateStore(options.scope, options.componentStore ?? keptComponentStore, delay),
  };
};

/* -------------------------------------------------------------------------- */
/* Component state, by stable id                                              */
/* -------------------------------------------------------------------------- */

/** Where a persisting component keeps its state; absent (a preview, nobody signed in): it keeps nothing. */
export const BlokComponentStateContext = React.createContext<BlokComponentStateStore | null>(null);

export type PersistedComponentState<T> = {
  /** False until what was kept has been read; a component waits for it before it starts. */
  loaded: boolean;
  /** What was kept, if it still fits; null otherwise. */
  initial: T | null;
  /** Keeps a new state (written a moment later). */
  save: (state: T) => void;
};

/**
 * The state a `persist` component kept, by its explicit id (`<Scene id="main"
 * persist>`). Without `persist`, an explicit id or a store, it keeps nothing
 * and is loaded at once.
 */
export const usePersistedComponentState = <T,>(
  componentId: string,
  persist: boolean,
  isState: (value: unknown) => value is T,
): PersistedComponentState<T> => {
  const store = React.useContext(BlokComponentStateContext);
  const active = persist && store !== null && isExplicitId(componentId);
  const [loaded, setLoaded] = React.useState<{id: string; state: T | null} | null>(null);
  const isStateRef = React.useRef(isState);
  React.useEffect(() => {
    isStateRef.current = isState;
  });

  React.useEffect(() => {
    if (!active || !store) return;
    let cancelled = false;
    store.load(componentId).then(
      state => {
        if (!cancelled) setLoaded({id: componentId, state: isStateRef.current(state) ? state : null});
      },
      () => {
        if (!cancelled) setLoaded({id: componentId, state: null});
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active, componentId, store]);

  const save = React.useCallback(
    (state: T) => {
      if (active && store) store.save(componentId, state);
    },
    [active, componentId, store],
  );

  if (!active) return {loaded: true, initial: null, save};
  const current = loaded?.id === componentId ? loaded : null;
  return {loaded: current !== null, initial: current?.state ?? null, save};
};
