import * as React from 'react';
import type {BlokRuntimeStore} from '@arkitektio/bsx/renderer/runtime/index';

/**
 * What passed through a blok while it was open, for the blok debugger: the
 * calls it made (`out`), what came back for them (`in`), how its runtime state
 * moved (`state`) and the log lines (`log`). Only kept in debug mode
 * (`./registry.ts`).
 */
export type BlokDebugStream = 'out' | 'in' | 'state' | 'log';

export type BlokDebugEntry = {
  seq: number;
  at: number;
  stream: BlokDebugStream;
  /** What happened, short: `call stage.move`, `PROGRESS`, `deps.stage.position`. */
  title: string;
  /** A line under the title: the message, the reason, who it went to. */
  note?: string;
  level?: 'info' | 'warn' | 'error';
  /** The value, shown on demand. */
  detail?: unknown;
  /** How many writes this entry stands for (repeated writes to one path in a row). */
  count: number;
};

export type BlokDebugSnapshot = {
  entries: readonly BlokDebugEntry[];
  paused: boolean;
  /** The runtime of the blok as it is drawn now; null while none is mounted. */
  runtime: BlokRuntimeStore | null;
};

export type BlokDebugRecorder = {
  record: (entry: Omit<BlokDebugEntry, 'seq' | 'at' | 'count'>, options?: {coalesce?: boolean}) => void;
  attach: (runtime: BlokRuntimeStore) => () => void;
  clear: () => void;
  setPaused: (paused: boolean) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => BlokDebugSnapshot;
};

export const BLOK_DEBUG_LIMIT = 400;
/** Writes to the same path closer than this are one entry (a dragged slider, a streamed state). */
const COALESCE_MS = 400;

export const createBlokDebugRecorder = (limit = BLOK_DEBUG_LIMIT): BlokDebugRecorder => {
  let snapshot: BlokDebugSnapshot = {entries: [], paused: false, runtime: null};
  let seq = 0;
  const attached: BlokRuntimeStore[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());

  return {
    record: (entry, options) => {
      if (snapshot.paused) return;
      const at = Date.now();
      const last = snapshot.entries[snapshot.entries.length - 1];
      if (options?.coalesce && last && last.stream === entry.stream && last.title === entry.title && at - last.at < COALESCE_MS) {
        const merged = {...last, ...entry, at, count: last.count + 1};
        snapshot = {...snapshot, entries: [...snapshot.entries.slice(0, -1), merged]};
      } else {
        const entries = [...snapshot.entries, {...entry, seq: ++seq, at, count: 1}];
        snapshot = {...snapshot, entries: entries.length > limit ? entries.slice(entries.length - limit) : entries};
      }
      emit();
    },
    // Several hosts can draw the same blok (one logo twice): the newest still open is shown.
    attach: runtime => {
      attached.push(runtime);
      snapshot = {...snapshot, runtime};
      emit();
      return () => {
        const at = attached.lastIndexOf(runtime);
        if (at >= 0) attached.splice(at, 1);
        snapshot = {...snapshot, runtime: attached[attached.length - 1] ?? null};
        emit();
      };
    },
    clear: () => {
      snapshot = {...snapshot, entries: []};
      emit();
    },
    setPaused: paused => {
      snapshot = {...snapshot, paused};
      emit();
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
};

/**
 * A store's snapshot, re-read at most every `ms`: a streamed agent state
 * records many times a second, and the debugger need not draw each one.
 */
export const useThrottledStore = <T>(subscribe: (listener: () => void) => () => void, getSnapshot: () => T, ms = 150): T => {
  const [snapshot, setSnapshot] = React.useState(getSnapshot);
  React.useEffect(() => {
    setSnapshot(getSnapshot());
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribe(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        setSnapshot(getSnapshot());
      }, ms);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [getSnapshot, ms, subscribe]);
  return snapshot;
};

export const useBlokDebugSnapshot = (recorder: BlokDebugRecorder): BlokDebugSnapshot =>
  useThrottledStore(recorder.subscribe, recorder.getSnapshot);

type DiffableState = {
  runtimePathValues: Record<string, unknown>;
  statuses: Readonly<Record<string, {status: string; error?: unknown}>>;
  agentMappingStateUpdates: Record<string, {agentId: string; interfaces: Record<string, {value: unknown; revision: number | null}>}>;
};

/**
 * What moved between two runtime states, as entries: each path written or
 * cleared, each source status changed, each agent state pushed. Compared by
 * reference, key by key: nothing is serialized.
 */
export const diffBlokRuntime = (previous: DiffableState, next: DiffableState): Array<Omit<BlokDebugEntry, 'seq' | 'at' | 'count'>> => {
  const changes: Array<Omit<BlokDebugEntry, 'seq' | 'at' | 'count'>> = [];

  if (previous.runtimePathValues !== next.runtimePathValues) {
    for (const [path, value] of Object.entries(next.runtimePathValues)) {
      if (previous.runtimePathValues[path] !== value) changes.push({stream: 'state', title: path, note: 'set', detail: value});
    }
    for (const path of Object.keys(previous.runtimePathValues)) {
      if (!(path in next.runtimePathValues)) changes.push({stream: 'state', title: path, note: 'cleared'});
    }
  }

  if (previous.statuses !== next.statuses) {
    for (const [path, status] of Object.entries(next.statuses)) {
      const before = previous.statuses[path];
      if (before?.status === status.status && before?.error === status.error) continue;
      changes.push({
        stream: 'state',
        title: path,
        note: `status ${before?.status ?? 'unknown'} → ${status.status}`,
        level: status.status === 'failed' ? 'error' : undefined,
        detail: status,
      });
    }
    for (const path of Object.keys(previous.statuses)) {
      if (!(path in next.statuses)) changes.push({stream: 'state', title: path, note: 'status cleared'});
    }
  }

  if (previous.agentMappingStateUpdates !== next.agentMappingStateUpdates) {
    for (const [key, update] of Object.entries(next.agentMappingStateUpdates)) {
      const before = previous.agentMappingStateUpdates[key];
      for (const [stateInterface, value] of Object.entries(update.interfaces)) {
        if (before?.interfaces[stateInterface] === value) continue;
        changes.push({
          stream: 'in',
          title: `state ${key}.${stateInterface}`,
          note: value.revision == null ? `from ${update.agentId}` : `rev ${value.revision} from ${update.agentId}`,
          detail: value.value,
        });
      }
    }
  }

  return changes;
};

/** bsx's own lines; the host's dispatch failures are recorded where they happen. */
