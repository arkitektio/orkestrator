import { useTraceArray } from "@/elektro/lib/useTraceArray";
import React, { ReactNode, useEffect, useMemo, useRef } from "react";
import { ExperimentFragment } from "../api/graphql";
import {
  areRangesEqual,
  buildDetailData,
  buildOverviewData,
  buildSpikeTimes,
  getStepSizeForRange,
  getTraceLength,
  normalizeRange,
} from "./ExperimentRender.utils";
import {
  createExperimentViewerStore,
  ExperimentViewerStoreContext,
  RangeSelection,
  useExperimentViewerStore,
  useExperimentViewerStoreApi,
} from "./store/experimentViewerStore";

// ─── Data loader (null-render) ────────────────────────────────────────────────

const ExperimentDataLoader: React.FC = () => {
  const { renderView } = useTraceArray();
  const store = useExperimentViewerStoreApi();
  const experiment = useExperimentViewerStore((s) => s.experiment);
  const range = useExperimentViewerStore((s) => s.range);
  const forcedStepSize = useExperimentViewerStore((s) => s.forcedStepSize);

  // Load all trace data for the current range — both recording (detail) and stimulus (overview)
  useEffect(() => {
    if (!experiment) return;
    let cancelled = false;
    store.getState().setDetailLoading(true);
    store.getState().setOverviewLoading(true);
    store.getState().setLoadError(null);

    const load = async () => {
      try {
        const totalLength = getTraceLength(experiment);
        const nextStepSize = getStepSizeForRange(totalLength, range, forcedStepSize);

        const rawArrays = await Promise.all([
          ...experiment.recordingViews.map((view) =>
            renderView(view.recording.trace, nextStepSize, range.left, range.right),
          ),
          ...experiment.stimulusViews.map((view) =>
            renderView(view.stimulus.trace, nextStepSize, range.left, range.right),
          ),
          renderView(experiment.timeTrace, nextStepSize, range.left, range.right),
        ]);

        if (cancelled) return;

        const { data: detailData, timeTrace } = buildDetailData(experiment, rawArrays);
        const overviewData = buildOverviewData(experiment, rawArrays);
        const spikes = buildSpikeTimes(experiment, timeTrace, nextStepSize);

        store.getState().setDetailData(detailData, nextStepSize);
        store.getState().setOverviewData(overviewData, nextStepSize);
        store.getState().setSpikeTimes(spikes);
      } catch (error) {
        // Without this the rejection is unhandled, the spinner clears in
        // `finally`, and the store keeps its empty columns — a blank plot that
        // is indistinguishable from a simulation with nothing recorded.
        if (cancelled) return;
        console.error("Failed to load experiment traces", error);
        store
          .getState()
          .setLoadError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) {
          store.getState().setDetailLoading(false);
          store.getState().setOverviewLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [experiment, forcedStepSize, range, renderView, store]);

  return null;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export type ExperimentRenderProviderProps = {
  experiment: ExperimentFragment;
  highlight?: string;
  hidden?: string[];
  hiddenStimuli?: string[];
  selectedRange?: RangeSelection;
  onSelectedRangeChange?: (range: RangeSelection) => void;
  children: ReactNode;
};

export const ExperimentRenderProvider: React.FC<
  ExperimentRenderProviderProps
> = ({
  experiment,
  hidden = [],
  hiddenStimuli = [],
  highlight,
  selectedRange,
  onSelectedRangeChange,
  children,
}) => {
  const store = useMemo(
    () =>
      createExperimentViewerStore({
        experiment,
        hidden,
        hiddenStimuli,
        highlight,
        initialRange: normalizeRange(selectedRange),
      }),
    // Re-create only if the experiment identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [experiment],
  );

  // Sync prop changes that don't warrant a store recreation
  useEffect(() => {
    store.setState({ hidden });
  }, [hidden, store]);

  useEffect(() => {
    store.setState({ hiddenStimuli });
  }, [hiddenStimuli, store]);

  useEffect(() => {
    store.setState({ highlight });
  }, [highlight, store]);

  // Sync external selectedRange → store (without adding to history)
  const syncingExternalRef = useRef(false);
  useEffect(() => {
    const normalized = normalizeRange(selectedRange);
    const current = store.getState().range;
    if (!areRangesEqual(normalized, current)) {
      syncingExternalRef.current = true;
      store.getState().setRangeExternal(normalized);
    }
  }, [selectedRange, store]);

  // Sync store range → onSelectedRangeChange
  useEffect(() => {
    const unsubscribe = store.subscribe((state, prevState) => {
      if (state.range === prevState.range) return;
      if (syncingExternalRef.current) {
        syncingExternalRef.current = false;
        return;
      }
      const normalized = normalizeRange(selectedRange);
      if (!areRangesEqual(state.range, normalized)) {
        onSelectedRangeChange?.(state.range);
      }
    });
    return unsubscribe;
  }, [onSelectedRangeChange, selectedRange, store]);

  return (
    <ExperimentViewerStoreContext.Provider value={store}>
      <ExperimentDataLoader />
      {children}
    </ExperimentViewerStoreContext.Provider>
  );
};
