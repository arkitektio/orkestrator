import * as React from 'react';
import {useDebugMode} from '@/core/debug/DebugContext';
import {createBlokDebugRecorder, type BlokDebugRecorder} from './recorder';

/**
 * Which bloks the debugger can show. The window keeps one scope with every
 * blok drawn while debug mode is on; a page that shows a Debug tab provides
 * its own (`BlokDebugScopeProvider`), listing just the bloks drawn on it.
 * Both hold the same recorder for a blok.
 */
export type BlokDebugKind = 'materialized' | 'action' | 'task' | 'assign' | 'port' | 'logo' | 'flavour' | 'demo' | (string & {});

export type BlokDebugMeta = {
  /** Who the blok is, stable across openings: the same key reuses the same history. */
  key: string;
  label: string;
  kind: BlokDebugKind;
};

export type BlokDebugItem = BlokDebugMeta & {
  recorder: BlokDebugRecorder;
  /** How many hosts draw it now: 0 once it closed. */
  mounts: number;
  openedAt: number;
  closedAt: number | null;
  /** When it last opened or closed, in order: times can tie. */
  moved: number;
};

export type BlokDebugScope = {
  /** The recorder for `key`, made on first ask; registers nothing. Safe during render. */
  recorderFor: (key: string) => BlokDebugRecorder;
  /** Lists the blok as open; the returned function closes it again. */
  acquire: (meta: BlokDebugMeta, recorder?: BlokDebugRecorder) => () => void;
  subscribe: (listener: () => void) => () => void;
  /** Open bloks first, then the recently closed, newest first. */
  getSnapshot: () => readonly BlokDebugItem[];
};

/** How many closed bloks a scope keeps, so a dialog's blok can be read after it closed. */
export const BLOK_DEBUG_KEEP_CLOSED = 20;

export const createBlokDebugScope = (keepClosed = BLOK_DEBUG_KEEP_CLOSED): BlokDebugScope => {
  const items = new Map<string, BlokDebugItem>();
  const recorders = new Map<string, BlokDebugRecorder>();
  const listeners = new Set<() => void>();
  let snapshot: readonly BlokDebugItem[] = [];
  let tick = 0;

  const publish = () => {
    const all = [...items.values()];
    const open = all.filter(item => item.mounts > 0).sort((a, b) => b.moved - a.moved);
    const closed = all.filter(item => item.mounts === 0).sort((a, b) => b.moved - a.moved);
    for (const stale of closed.slice(keepClosed)) {
      items.delete(stale.key);
      recorders.delete(stale.key);
    }
    snapshot = [...open, ...closed.slice(0, keepClosed)];
    listeners.forEach(listener => listener());
  };

  const recorderFor = (key: string) => {
    let recorder = recorders.get(key);
    if (!recorder) {
      recorder = createBlokDebugRecorder();
      recorders.set(key, recorder);
    }
    return recorder;
  };

  return {
    recorderFor,
    acquire: (meta, given) => {
      const recorder = given ?? recorderFor(meta.key);
      recorders.set(meta.key, recorder);
      const held = items.get(meta.key);
      items.set(meta.key, {
        ...meta,
        recorder,
        mounts: (held?.mounts ?? 0) + 1,
        openedAt: held && held.mounts > 0 ? held.openedAt : Date.now(),
        closedAt: null,
        moved: held && held.mounts > 0 ? held.moved : ++tick,
      });
      publish();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const item = items.get(meta.key);
        if (!item) return;
        const mounts = item.mounts - 1;
        items.set(meta.key, {...item, mounts, closedAt: mounts === 0 ? Date.now() : null, moved: mounts === 0 ? ++tick : item.moved});
        publish();
      };
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
};

/** Every blok drawn in this window while debug mode is on. */
export const windowBlokDebug = createBlokDebugScope();

const BlokDebugScopeContext = React.createContext<BlokDebugScope | null>(null);

/** Lists the bloks drawn below it in `scope` too, for a page's Debug tab. */
export const BlokDebugScopeProvider = BlokDebugScopeContext.Provider;

/**
 * The recorder a blok host records into, or null when nobody debugs: debug
 * mode is off. One per host; give it to `BlokDebugSync` inside the renderer
 * and record what only the host sees (the calls it dispatches) on it.
 */
export const useBlokDebugRecorder = (meta: BlokDebugMeta): BlokDebugRecorder | null => {
  const enabled = useDebugMode();
  const page = React.useContext(BlokDebugScopeContext);
  const {key, label, kind} = meta;
  const recorder = React.useMemo(() => (enabled ? windowBlokDebug.recorderFor(key) : null), [enabled, key]);

  React.useEffect(() => {
    if (!recorder) return;
    const releaseWindow = windowBlokDebug.acquire({key, label, kind}, recorder);
    const releasePage = page?.acquire({key, label, kind}, recorder);
    return () => {
      releasePage?.();
      releaseWindow();
    };
  }, [kind, key, label, page, recorder]);

  return recorder;
};
