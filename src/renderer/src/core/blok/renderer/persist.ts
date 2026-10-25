import {createKeyedStore, type KeyedStore} from '../cache/keyedStore';
import {PERSIST_RESET_ALL_FUNCTION, PERSIST_RESET_FUNCTION} from './functions/persist';
import {splitPathSegments} from './runtime/utils';
import type {BlokInvokeFunctionHandler, BlokRuntimeStore} from './runtime';

/**
 * The locals a blok keeps between openings, on this device only.
 *
 * A blok declares them (`persist: [{key, description}]`): top-level keys of
 * its demo state, whose demo value is the default. Their values never reach a
 * server, so keeping them cannot become a channel between clients. They are
 * kept in IndexedDB per (hub, user, materialized blok), one record of values
 * by key, and written a moment after the last change. A key the blok no
 * longer declares, or a value whose shape is not its default's any more (an
 * object where a number is now expected), is dropped when the blok opens.
 */

export type BlokPersistedLocal = {key: string; description?: string | null};

/** What is kept for one materialization: values by local key. */
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

/** keyedStore's "hash": a record is always the current one, its keys are checked on reading. */
const RECORD = 'locals';

export const keptLocalsId = (scope: BlokPersistScope): string =>
  JSON.stringify([scope.hub, scope.user, scope.materializedBlok]);

type Shape = 'array' | 'object' | 'string' | 'number' | 'boolean' | 'null';

const shapeOf = (value: unknown): Shape => {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'null';
  }
};

/** Whether a kept value can stand for a local whose default is `fallback`: the same JSON shape, or any for a null default. */
export const fitsDefault = (kept: unknown, fallback: unknown): boolean => {
  const expected = shapeOf(fallback);
  return expected === 'null' || shapeOf(kept) === expected;
};

/** The kept values still declared and still of their default's shape, and whether anything was dropped. */
export const keptValuesOf = (
  record: KeptLocals | null,
  declared: readonly string[],
  defaults: Record<string, unknown>,
): {values: KeptLocals; dropped: boolean} => {
  const values: KeptLocals = {};
  if (!record) return {values, dropped: false};
  for (const key of declared) {
    if (key in record && fitsDefault(record[key], defaults[key])) values[key] = record[key];
  }
  return {values, dropped: Object.keys(values).length !== Object.keys(record).length};
};

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const rootOf = (path: string): string | undefined => splitPathSegments(path)[0];

/**
 * One opened materialization's kept locals: what to seed the renderer with,
 * and what writes changes back. `attach` follows a runtime store; `reset`
 * drops a value and shows the default again.
 */
export type BlokPersistence = {
  keys: ReadonlySet<string>;
  /** The values to seed the runtime with, before the first render. */
  initial: KeptLocals;
  /** Follows `store`: a change of a kept local is written after `delay`. Returns the detach, which flushes. */
  attach: (store: BlokRuntimeStore) => () => void;
  reset: (key: string) => Promise<void>;
  resetAll: () => Promise<void>;
  /** Writes a pending change now. */
  flush: () => Promise<void>;
};

export const openBlokPersistence = async (options: {
  scope: BlokPersistScope;
  declared: readonly BlokPersistedLocal[];
  /** The demo state: each local's default. */
  defaults: Record<string, unknown>;
  store?: KeyedStore<KeptLocals>;
  /** How long after the last change a value is written, in ms. */
  delay?: number;
}): Promise<BlokPersistence> => {
  const store = options.store ?? keptLocalsStore;
  const delay = options.delay ?? 400;
  const id = keptLocalsId(options.scope);
  const keys = new Set(options.declared.map(local => local.key));
  const record = await store.load(id, RECORD);
  const {values: initial, dropped} = keptValuesOf(record, [...keys], options.defaults);
  if (dropped) {
    await (Object.keys(initial).length > 0 ? store.save(id, RECORD, initial) : store.forget(id));
  }

  let kept: KeptLocals = {...initial};
  let timer: ReturnType<typeof setTimeout> | undefined;
  let runtime: BlokRuntimeStore | undefined;

  const write = async () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    await (Object.keys(kept).length > 0 ? store.save(id, RECORD, {...kept}) : store.forget(id));
  };

  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => void write(), delay);
  };

  /** Clears what the runtime wrote at and below `key`: the local shows its default again. */
  const showDefault = (key: string) => {
    const state = runtime?.getState();
    if (!state) return;
    for (const path of Object.keys(state.runtimePathValues)) {
      if (rootOf(path) === key) state.clearRuntimeValue(path);
    }
  };

  return {
    keys,
    initial,
    attach: target => {
      runtime = target;
      const valueOf = (key: string) => (target.getState().dataModel as Record<string, unknown> | null)?.[key];
      const defaultOf = (key: string) => (target.getState().initialDataModel as Record<string, unknown> | null)?.[key];
      const seen = new Map([...keys].map(key => [key, valueOf(key)] as const));
      const unsubscribe = target.subscribe(state => {
        let changed = false;
        for (const key of keys) {
          const value = (state.dataModel as Record<string, unknown> | null)?.[key];
          if (same(value, seen.get(key))) continue;
          seen.set(key, value);
          // Back at the default is nothing to keep.
          if (same(value, defaultOf(key))) {
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
    reset: async key => {
      delete kept[key];
      showDefault(key);
      await write();
    },
    resetAll: async () => {
      kept = {};
      for (const key of keys) showDefault(key);
      await write();
    },
    flush: async () => {
      if (timer !== undefined) await write();
    },
  };
};

/**
 * `persist.reset(key)` and `persist.resetAll()` to `persistence`, every other
 * function to `inner`: the catalog's own do nothing, for a renderer that keeps nothing.
 */
export const persistingInvokeFunction =
  (inner: BlokInvokeFunctionHandler, persistence: BlokPersistence): BlokInvokeFunctionHandler =>
  (name, args, options) => {
    if (name !== PERSIST_RESET_FUNCTION && name !== PERSIST_RESET_ALL_FUNCTION) return inner(name, args, options);
    if (options?.requirePure) return {ok: false, error: `${name} forgets what this device kept: only from an action.`};
    if (name === PERSIST_RESET_ALL_FUNCTION) {
      void persistence.resetAll();
      return {ok: true, value: undefined};
    }
    const key = args.key ?? args['0'];
    if (typeof key !== 'string' || !persistence.keys.has(key)) {
      return {ok: false, error: `${name} takes one of the locals this blok persists (${[...persistence.keys].join(', ') || 'none'}), not ${JSON.stringify(key)}.`};
    }
    void persistence.reset(key);
    return {ok: true, value: undefined};
  };
