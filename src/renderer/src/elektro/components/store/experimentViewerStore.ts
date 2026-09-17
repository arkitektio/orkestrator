import { createStore } from "zustand/vanilla";
import { ExperimentFragment } from "../../api/graphql";
import { createScopedStoreHooks } from "@/lib/generic/createScopedStore";

export type RangeSelection = {
  left: number | null;
  right: number | null;
};

export type HoverEntry = {
  label: string;
  color: string;
  value: number | null;
};

export type HoverState = {
  time: number;
  values: HoverEntry[];
} | null;

// Column-array format matching uPlot's AlignedData:
// index 0 = x (time), index 1..n = y series in experiment order
export type ColumnData = number[][];

const MAX_HISTORY = 50;

export const DEFAULT_RANGE: RangeSelection = { left: 0, right: null };

export interface ExperimentViewerState {
  // Config
  experiment: ExperimentFragment;
  hidden: string[];
  hiddenStimuli: string[];
  highlight: string | undefined;

  // Range with undo/redo
  range: RangeSelection;
  rangeHistory: RangeSelection[];
  rangeFuture: RangeSelection[];

  // Data — column arrays: [timeTrace, series0, series1, ...]
  detailData: ColumnData;
  overviewData: ColumnData;
  spikeTimes: { value: number; label: string }[];

  // Step sizes
  stepSize: number;
  overviewStepSize: number;
  forcedStepSize: number | null;

  // Loading
  detailLoading: boolean;
  overviewLoading: boolean;
  /**
   * Why the last load produced nothing, or null. Surfaced by the charts in
   * place of an empty plot: a failed trace read used to leave the data empty
   * and the spinner cleared, which looks exactly like a simulation with no
   * traces.
   */
  loadError: string | null;

  // Hover
  hover: HoverState;

  // Actions
  setRange: (range: RangeSelection) => void;
  setRangeExternal: (range: RangeSelection) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  zoomOnRange: (params: {
    left: number;
    right: number;
    baseOffset?: number;
    sourceStepSize?: number;
  }) => void;
  setForcedStepSize: (size: number | null) => void;
  setDetailData: (data: ColumnData, stepSize: number) => void;
  setOverviewData: (data: ColumnData, overviewStepSize: number) => void;
  setDetailLoading: (loading: boolean) => void;
  setOverviewLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  setSpikeTimes: (spikes: { value: number; label: string }[]) => void;
  setHover: (hover: HoverState) => void;
  setHidden: (hidden: string[]) => void;
  setHiddenStimuli: (hiddenStimuli: string[]) => void;
  setHighlight: (highlight: string | undefined) => void;
}

export type ExperimentViewerStore = ReturnType<typeof createExperimentViewerStore>;

export const createExperimentViewerStore = ({
  experiment,
  hidden = [],
  hiddenStimuli = [],
  highlight,
  initialRange,
}: {
  experiment: ExperimentFragment;
  hidden?: string[];
  hiddenStimuli?: string[];
  highlight?: string;
  initialRange?: RangeSelection;
}) =>
  createStore<ExperimentViewerState>((set, get) => ({
    experiment,
    hidden,
    hiddenStimuli,
    highlight,

    range: initialRange ?? DEFAULT_RANGE,
    rangeHistory: [],
    rangeFuture: [],

    detailData: [],
    overviewData: [],
    spikeTimes: [],

    stepSize: 1,
    overviewStepSize: 1,
    forcedStepSize: null,

    detailLoading: true,
    overviewLoading: true,
    loadError: null,

    hover: null,

    setRange: (range) =>
      set((state) => ({
        range,
        rangeHistory: [...state.rangeHistory, state.range].slice(-MAX_HISTORY),
        rangeFuture: [],
      })),

    setRangeExternal: (range) => set({ range }),

    undo: () =>
      set((state) => {
        if (state.rangeHistory.length === 0) return state;
        const prev = state.rangeHistory[state.rangeHistory.length - 1];
        return {
          range: prev,
          rangeHistory: state.rangeHistory.slice(0, -1),
          rangeFuture: [state.range, ...state.rangeFuture].slice(0, MAX_HISTORY),
        };
      }),

    redo: () =>
      set((state) => {
        if (state.rangeFuture.length === 0) return state;
        const next = state.rangeFuture[0];
        return {
          range: next,
          rangeHistory: [...state.rangeHistory, state.range].slice(-MAX_HISTORY),
          rangeFuture: state.rangeFuture.slice(1),
        };
      }),

    reset: () =>
      set({
        range: DEFAULT_RANGE,
        rangeHistory: [],
        rangeFuture: [],
        forcedStepSize: null,
      }),

    zoomOnRange: ({ left, right, baseOffset, sourceStepSize }) => {
      const state = get();
      const offset = baseOffset !== undefined ? baseOffset : (state.range.left ?? 0);
      const step = sourceStepSize !== undefined ? sourceStepSize : state.stepSize;
      const start = Math.min(left, right);
      const end = Math.max(left, right);
      const actualLeft = start * step + offset;
      const actualRight = end * step + offset;

      set((current) => ({
        range: { left: actualLeft, right: actualRight },
        rangeHistory: [...current.rangeHistory, current.range].slice(-MAX_HISTORY),
        rangeFuture: [],
      }));
    },

    setForcedStepSize: (forcedStepSize) => set({ forcedStepSize }),

    setDetailData: (detailData, stepSize) => set({ detailData, stepSize }),

    setOverviewData: (overviewData, overviewStepSize) =>
      set({ overviewData, overviewStepSize }),

    setDetailLoading: (detailLoading) => set({ detailLoading }),
    setOverviewLoading: (overviewLoading) => set({ overviewLoading }),
    setLoadError: (loadError) => set({ loadError }),
    setSpikeTimes: (spikeTimes) => set({ spikeTimes }),
    setHover: (hover) => set({ hover }),
    setHidden: (hidden) => set({ hidden }),
    setHiddenStimuli: (hiddenStimuli) => set({ hiddenStimuli }),
    setHighlight: (highlight) => set({ highlight }),
  }));

const {
  StoreContext: ExperimentViewerStoreContext,
  useScopedStore: useExperimentViewerStore,
  useStoreApi: useExperimentViewerStoreApi,
} = createScopedStoreHooks<ExperimentViewerState>("ExperimentViewerStore");

export { ExperimentViewerStoreContext, useExperimentViewerStore, useExperimentViewerStoreApi };
