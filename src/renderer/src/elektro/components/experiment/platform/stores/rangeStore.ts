import { createStore } from "zustand/vanilla";
import { createScopedStoreHooks } from "@/core/util/createScopedStore";

/**
 * The visible time window — the one quantity a timeline moves at pointer rate.
 *
 * In mikro the hot quantity is a camera pose; here it is a window of world time,
 * and the two-plane rule (P17) splits it the same way:
 *
 *  - `liveRange` is the RENDER plane. Gesture handlers write it on every pointer
 *    move; the camera binds to it with a vanilla subscription and `invalidate()`s.
 *    Nothing React-subscribes to it — it is a fresh object per move, and a
 *    `useStore(s => s.liveRange)` would re-render its subscriber at frame rate.
 *  - `committedRange` is the UI plane. A settler copies live → committed once the
 *    gesture pauses. Everything EXPENSIVE keys off it: the tile plan and its reads,
 *    the `?brush=` URL write, axis labels, readouts.
 *
 * History (undo/redo) records deliberate jumps — a brush, a fit, a reset — not
 * every pan, or undo would step back one pixel at a time.
 */

export type TimeWindow = { start: number; end: number };

export const MAX_HISTORY = 50;

// --- pure window arithmetic -------------------------------------------------

export const widthOf = (w: TimeWindow): number => w.end - w.start;

/**
 * Pull a window inside the world, preserving its WIDTH where possible.
 *
 * A pan that runs off the end should stop at the end with the same zoom, not
 * squash the window — which is what clamping each edge independently does.
 * `minWidth` stops a zoom-in from collapsing to nothing (the camera would divide
 * by it); a window wider than the world is shown whole.
 */
export const clampWindow = (
  w: TimeWindow,
  world: TimeWindow | null,
  minWidth = 0,
): TimeWindow => {
  let start = Math.min(w.start, w.end);
  let end = Math.max(w.start, w.end);

  if (end - start < minWidth) {
    const mid = (start + end) / 2;
    start = mid - minWidth / 2;
    end = mid + minWidth / 2;
  }
  if (!world || !(world.end > world.start)) return { start, end };

  const width = end - start;
  const worldWidth = world.end - world.start;
  if (width >= worldWidth) return { start: world.start, end: world.end };

  if (start < world.start) return { start: world.start, end: world.start + width };
  if (end > world.end) return { start: world.end - width, end: world.end };
  return { start, end };
};

/**
 * Zoom about an anchor time, keeping the anchor under the same screen position.
 *
 * `factor < 1` zooms in. Keeping the anchor fixed is what makes wheel-zoom feel
 * like it zooms "at the cursor" rather than at the centre.
 */
export const zoomAbout = (
  w: TimeWindow,
  anchor: number,
  factor: number,
): TimeWindow => {
  const f = Math.max(1e-9, factor);
  return {
    start: anchor - (anchor - w.start) * f,
    end: anchor + (w.end - anchor) * f,
  };
};

export const panBy = (w: TimeWindow, delta: number): TimeWindow => ({
  start: w.start + delta,
  end: w.end + delta,
});

export const windowsEqual = (a: TimeWindow, b: TimeWindow): boolean =>
  a.start === b.start && a.end === b.end;

// --- store --------------------------------------------------------------------

export type RangeState = {
  liveRange: TimeWindow;
  committedRange: TimeWindow;
  /** The data's extent; windows are clamped into it. Null until something is placed. */
  worldSpan: TimeWindow | null;
  /** The smallest window allowed — a few of the finest samples. */
  minWidth: number;
  history: TimeWindow[];
  future: TimeWindow[];

  setWorld: (span: TimeWindow | null, minWidth: number) => void;
  /** Render plane: move the live window. Cheap; call from gesture handlers. */
  setLiveRange: (w: TimeWindow) => void;
  /** UI plane: adopt the live window as committed. Called by the settler. */
  commitRange: () => void;
  /** A deliberate jump: moves both planes and records history. */
  jumpTo: (w: TimeWindow) => void;
  fit: () => void;
  undo: () => void;
  redo: () => void;
};

const FALLBACK: TimeWindow = { start: 0, end: 1 };

export const createRangeStore = (initial?: {
  worldSpan?: TimeWindow | null;
  minWidth?: number;
  range?: TimeWindow | null;
}) =>
  createStore<RangeState>((set, get) => {
    const worldSpan = initial?.worldSpan ?? null;
    const minWidth = initial?.minWidth ?? 0;
    const start = clampWindow(initial?.range ?? worldSpan ?? FALLBACK, worldSpan, minWidth);
    /**
     * Whether the window was ever chosen deliberately — restored from `?brush=`,
     * panned, jumped. Decides what happens when the world first becomes known: an
     * explicit window is KEPT (clamped), a fallback one is replaced by the whole
     * world. Without this, a shared link's zoom is thrown away the moment the data
     * it zooms into arrives.
     */
    let explicit = initial?.range != null;

    return {
      liveRange: start,
      committedRange: start,
      worldSpan,
      minWidth,
      history: [],
      future: [],

      setWorld: (span, nextMinWidth) => {
        const { liveRange } = get();
        // A fallback window opens on the whole world; a deliberate one is kept.
        const next = clampWindow(
          explicit ? liveRange : (span ?? liveRange),
          span,
          nextMinWidth,
        );
        set({
          worldSpan: span,
          minWidth: nextMinWidth,
          liveRange: next,
          committedRange: next,
        });
      },

      setLiveRange: (w) => {
        explicit = true;
        const { worldSpan: world, minWidth: min, liveRange } = get();
        const next = clampWindow(w, world, min);
        if (windowsEqual(next, liveRange)) return;
        set({ liveRange: next });
      },

      commitRange: () => {
        const { liveRange, committedRange } = get();
        if (windowsEqual(liveRange, committedRange)) return;
        set({ committedRange: liveRange });
      },

      jumpTo: (w) => {
        explicit = true;
        const { worldSpan: world, minWidth: min, committedRange, history } = get();
        const next = clampWindow(w, world, min);
        if (windowsEqual(next, committedRange)) return;
        set({
          liveRange: next,
          committedRange: next,
          history: [...history, committedRange].slice(-MAX_HISTORY),
          future: [],
        });
      },

      fit: () => {
        const { worldSpan: world } = get();
        if (world) get().jumpTo(world);
      },

      undo: () => {
        const { history, future, committedRange } = get();
        const previous = history[history.length - 1];
        if (!previous) return;
        set({
          liveRange: previous,
          committedRange: previous,
          history: history.slice(0, -1),
          future: [committedRange, ...future].slice(0, MAX_HISTORY),
        });
      },

      redo: () => {
        const { history, future, committedRange } = get();
        const next = future[0];
        if (!next) return;
        set({
          liveRange: next,
          committedRange: next,
          history: [...history, committedRange].slice(-MAX_HISTORY),
          future: future.slice(1),
        });
      },
    };
  });

export type RangeStoreApi = ReturnType<typeof createRangeStore>;

const hooks = createScopedStoreHooks<RangeState, RangeStoreApi>("ExperimentRangeStore");
export const RangeStoreContext = hooks.StoreContext;
export const useRangeStore = hooks.useScopedStore;
export const useRangeStoreApi = hooks.useStoreApi;
