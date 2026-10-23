import * as React from 'react';
import {describeError} from '@/core/notify';
import {useLatestRef} from '@/core/util/hooks/useLatestRef';
import {useBlokSnapshotMode} from '@/core/blok/preview/snapshotMode';
import {useBlokRuntimeStoreApi} from './context';
import {useBlokScope, resolveScopedPath} from './scope';

/**
 * What a component that READS something (a GraphQL query, a table's rows, a
 * column's statistics) writes under its `bind`: the same shape before, during
 * and after a read, so a blok reads `cells.loading` or `cells.data` without
 * asking whether there was a read yet. The sibling of `BlokTaskRecord`, which
 * is the same idea for an action's run.
 *
 * The record is owned by the component that writes it — one writer per path
 * (the editor warns about a second, see `bsx/analyze.ts`). It is the viewer's
 * own state: nothing is published to the agent.
 */
export type BlokResourceRecord = {
  status: 'idle' | 'loading' | 'ready' | 'failed';
  /** Booleans beside `status`: `when` and `disabled` want one, not a comparison. */
  loading: boolean;
  ready: boolean;
  failed: boolean;
  /** Ready, and the answer holds nothing (no rows, every field null or empty). */
  empty: boolean;
  /**
   * `data` is from an earlier read: a newer one is running, or the component
   * that wrote it is no longer on screen.
   */
  stale: boolean;
  /** Why the read failed, as a sentence; empty otherwise. */
  error: string;
  /** The answer; kept from the last read while the next one runs. */
  data: unknown;
};

/** The spelling a blok payload's `demo_state` seeds a bound name with. */
export const idleResourceRecord = (): BlokResourceRecord => ({
  status: 'idle',
  loading: false,
  ready: false,
  failed: false,
  empty: false,
  stale: false,
  error: '',
  data: null,
});

/** Nothing in it: null, an empty list, or an object whose every field is. */
export const isEmptyAnswer = (data: unknown): boolean => {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>);
    return values.length === 0 || values.every(value => value == null || (Array.isArray(value) && value.length === 0));
  }
  return false;
};

export type BlokResourceOptions = {
  /** Data-model path the record is written to. Without one it is only returned. */
  bind: string | undefined;
  /**
   * What the read depends on, by content. A new key starts a new read; the
   * previous answer stays, marked `stale`, until it lands.
   */
  key: string;
  /** False while the read cannot be asked yet (a required variable unset). */
  enabled: boolean;
  load: (signal: AbortSignal) => Promise<unknown>;
  /** Defaults to `isEmptyAnswer`. */
  isEmpty?: (data: unknown) => boolean;
  /** Read again this often, in milliseconds, while the component is mounted. */
  pollMs?: number;
  /**
   * On unmount, remove the record instead of keeping it marked `stale`. Off by
   * default: a read inside a tab or an `If` keeps its answer while hidden.
   */
  clearOnUnmount?: boolean;
};

/**
 * Runs a read and holds its record, written through to `bind`.
 *
 * - Latest wins: an answer to a superseded key is dropped (and its request
 *   aborted).
 * - While drawn for a preview nothing is read: the record the blok's
 *   `demo_state` seeds under `bind` is what the preview shows, so previews
 *   need no backend and come out the same every time.
 */
export const useBlokResource = (options: BlokResourceOptions): BlokResourceRecord => {
  const {bind, clearOnUnmount, enabled, key, pollMs} = options;
  const store = useBlokRuntimeStoreApi();
  const scope = useBlokScope();
  const snapshot = useBlokSnapshotMode();
  const path = bind ? resolveScopedPath(bind, scope) : undefined;

  // What the last read SETTLED as, and for which key. Whether a read is
  // running is derived, not stored: a key that has not settled yet is loading.
  const [settled, setSettled] = React.useState<{key: string; record: BlokResourceRecord} | null>(null);
  const [tick, setTick] = React.useState(0);
  const runKey = `${key}\u0000${tick}`;

  // The latest closures, without making them part of what restarts a read.
  const loadRef = useLatestRef(options.load);
  const isEmptyRef = useLatestRef(options.isEmpty ?? isEmptyAnswer);

  const running = !snapshot && enabled && settled?.key !== runKey;
  const record: BlokResourceRecord = React.useMemo(() => {
    const last = settled?.record ?? idleResourceRecord();
    if (!running) return last;
    return {...last, status: 'loading', loading: true, failed: false, error: '', stale: last.data != null};
  }, [running, settled]);
  const recordRef = useLatestRef(record);

  React.useEffect(() => {
    if (snapshot || !enabled) return;
    const controller = new AbortController();

    loadRef.current(controller.signal).then(
      data => {
        if (controller.signal.aborted) return;
        setSettled({
          key: runKey,
          record: {...idleResourceRecord(), status: 'ready', ready: true, empty: isEmptyRef.current(data), data},
        });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setSettled(previous => ({
          key: runKey,
          record: {
            ...(previous?.record ?? idleResourceRecord()),
            status: 'failed',
            loading: false,
            ready: false,
            failed: true,
            stale: false,
            error: describeError(error).message,
          },
        }));
      },
    );

    return () => controller.abort();
  }, [enabled, runKey, snapshot, loadRef, isEmptyRef]);

  React.useEffect(() => {
    if (snapshot || !enabled || !pollMs || pollMs <= 0) return;
    const timer = setInterval(() => setTick(value => value + 1), pollMs);
    return () => clearInterval(timer);
  }, [enabled, pollMs, snapshot]);

  // Written after the first read starts, never on mount: the record a
  // `demo_state` seeds stays until there is something to replace it with.
  const started = record.status !== 'idle';
  React.useEffect(() => {
    if (!path || snapshot || !started) return;
    store.getState().setRuntimeValue(path, record);
  }, [path, record, snapshot, started, store]);

  React.useEffect(() => {
    if (!path || snapshot) return;
    return () => {
      if (recordRef.current.status === 'idle') return;
      if (clearOnUnmount) {
        store.getState().clearRuntimeValue(path);
      } else {
        store.getState().setRuntimeValue(path, {...recordRef.current, loading: false, stale: true});
      }
    };
  }, [clearOnUnmount, path, recordRef, snapshot, store]);

  return record;
};

/**
 * The phase a record is in, for either kind: a read's (`BlokResourceRecord`)
 * or a run's (`BlokTaskRecord`). What the record slots (`pending`, `failed`, `empty`, `ready`) switch on.
 */
export type BlokRecordPhase = 'idle' | 'pending' | 'failed' | 'empty' | 'ready';

export const recordPhase = (raw: unknown): BlokRecordPhase => {
  if (raw == null || typeof raw !== 'object') return 'idle';
  const record = raw as Partial<BlokResourceRecord> & {running?: boolean; done?: boolean};
  if (record.loading === true || record.running === true) {
    // A reload over an earlier answer is still showing that answer.
    if (record.data != null && record.stale === true) return record.empty ? 'empty' : 'ready';
    return 'pending';
  }
  if (record.failed === true) return 'failed';
  if (record.ready === true) return record.empty === true ? 'empty' : 'ready';
  if (record.done === true) return 'ready';
  return 'idle';
};
