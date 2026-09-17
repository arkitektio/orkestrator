import React, { useCallback, useMemo, useRef } from "react";
import uPlot from "uplot";
import UplotReact from "uplot-react";
import {
  CHART_SYNC_KEY,
  createAxisStyle,
  createRecordingSeries,
  getColorForRecordingView,
  recordingViewToLabel,
  useElementSize,
} from "./ExperimentRender.utils";
import {
  useExperimentViewerStore,
  useExperimentViewerStoreApi,
} from "./store/experimentViewerStore";

export const ExperimentDetailChart: React.FC = () => {
  const store = useExperimentViewerStoreApi();

  const experiment = useExperimentViewerStore((s) => s.experiment);
  const hidden = useExperimentViewerStore((s) => s.hidden);
  const highlight = useExperimentViewerStore((s) => s.highlight);
  const detailData = useExperimentViewerStore((s) => s.detailData);
  const detailLoading = useExperimentViewerStore((s) => s.detailLoading);
  const loadError = useExperimentViewerStore((s) => s.loadError);

  const chartInstanceRef = useRef<uPlot | null>(null);
  const { ref: chartRef, size: chartSize } = useElementSize<HTMLDivElement>();

  const visibleRecordings = useMemo(
    () => experiment.recordingViews.filter((view) => !hidden.includes(view.id)),
    [experiment.recordingViews, hidden],
  );

  // detailData layout: [timeTrace, rec0, rec1, ...] (all recordings, in order)
  const recordingEntries = useMemo(
    () =>
      visibleRecordings.map((view) => ({
        colIndex: experiment.recordingViews.indexOf(view) + 1,
        label: recordingViewToLabel(view),
        displayLabel: view.recording.label,
        color: getColorForRecordingView(view, highlight),
      })),
    [experiment.recordingViews, highlight, visibleRecordings],
  );

  // [time, visibleRec0, visibleRec1, ...]
  const mainData = useMemo<uPlot.AlignedData>(() => {
    const timeCol = detailData[0] ?? [];
    const yCols = recordingEntries.map(
      (e) => (detailData[e.colIndex] ?? []) as number[],
    );
    return [timeCol, ...yCols] as uPlot.AlignedData;
  }, [detailData, recordingEntries]);

  const handleSelection = useCallback(
    (chart: uPlot) => {
      if (chart.select.width <= 1) return;
      const leftIndex = chart.posToIdx(chart.select.left);
      const rightIndex = chart.posToIdx(chart.select.left + chart.select.width);
      if (Math.abs(leftIndex - rightIndex) > 1) {
        const { range, stepSize } = store.getState();
        store.getState().zoomOnRange({
          left: leftIndex,
          right: rightIndex,
          baseOffset: range.left ?? 0,
          sourceStepSize: stepSize,
        });
      }
      chart.setSelect({ left: 0, top: 0, width: 0, height: 0 }, false);
    },
    [store],
  );

  const onCursorMove = useCallback(
    (chart: uPlot) => {
      const idx = chart.cursor.idx ?? null;
      const timeTrace = detailData[0];
      if (idx == null || !timeTrace || idx >= timeTrace.length) {
        store.getState().setHover(null);
        return;
      }
      const timeVal = timeTrace[idx];
      if (timeVal == null) {
        store.getState().setHover(null);
        return;
      }
      store.getState().setHover({
        time: timeVal,
        values: recordingEntries.map((entry, i) => ({
          label: entry.displayLabel,
          color: entry.color,
          value: (mainData[i + 1] as number[])?.[idx] ?? null,
        })),
      });
    },
    [detailData, mainData, recordingEntries, store],
  );

  // Rebuild options (and re-resolve CSS vars) whenever size or series change
  const mainOptions = useMemo<uPlot.Options | null>(() => {
    if (chartSize.width < 10 || chartSize.height < 10) return null;

    const xAxis: uPlot.Axis = {
      ...createAxisStyle(),
      label: "Time (s)",
      values: (_self, splits) =>
        splits.map((value) => Number(value).toFixed(2)),
    };
    const yAxis: uPlot.Axis = {
      ...createAxisStyle(),
      label: "Recording value",
    };

    return {
      width: chartSize.width,
      height: chartSize.height,
      padding: [8, 10, 0, 0],
      legend: { show: false },
      select: {
        show: true,
        over: true,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      },
      cursor: {
        drag: { x: true, y: false, setScale: false, dist: 4 },
        sync: { key: CHART_SYNC_KEY, setSeries: false, scales: ["x", null] },
        points: { show: false },
      },
      axes: [xAxis, yAxis],
      scales: { x: { time: false } },
      series: [
        { label: "Time" },
        ...recordingEntries.map((entry) =>
          createRecordingSeries(entry.displayLabel, entry.color),
        ),
      ],
      hooks: {
        setCursor: [onCursorMove],
        setSelect: [handleSelection],
      },
    };
  }, [
    chartSize.height,
    chartSize.width,
    handleSelection,
    onCursorMove,
    recordingEntries,
  ]);

  return (
    <div
      ref={chartRef}
      className="relative min-h-[18rem] flex-1 overflow-hidden rounded-md border border-border/50 bg-background text-xs [&_.u-over]:cursor-crosshair [&_.u-select]:border [&_.u-select]:border-amber-300/40 [&_.u-select]:bg-amber-300/20"
    >
      {detailLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      ) : loadError ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-background/60 px-6 text-center">
          <span className="text-xs font-medium text-destructive">
            Could not load the traces
          </span>
          <span className="break-all font-mono text-[0.625rem] text-muted-foreground">
            {loadError}
          </span>
        </div>
      ) : null}
      {mainOptions ? (
        <div className="absolute inset-0 overflow-hidden">
          <UplotReact
            options={mainOptions}
            data={mainData}
            onCreate={(chart) => {
              chartInstanceRef.current = chart;
            }}
            onDelete={() => {
              chartInstanceRef.current = null;
            }}
          />
        </div>
      ) : null}
    </div>
  );
};
