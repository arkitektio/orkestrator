import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { bindFields } from "@/core/data/scene/stores/bindStore";
import { PlotLayerRenderer } from "@/core/data/plot/layers/PlotLayerRenderer";
import { StackLayoutManager } from "@/core/data/plot/layout/StackLayoutManager";
import { usePlotStoreApi } from "@/core/data/plot/stores/plotStore";
import { useRangeStoreApi, type RangeStoreApi, type TimeWindow } from "@/core/data/plot/stores/rangeStore";
import { useViewerStoreApi, type ViewerStoreApi } from "@/core/data/plot/stores/viewerStore";
import type { ChartLayerState } from "../platform/model/chartLayerModel";
import { rowOf } from "./chartRows";
import { LAYER_RENDERERS } from "./layerRegistry";

/**
 * A chart's lines drawn inside ANOTHER plot's canvas: a base plot that mounts it.
 *
 * Under a `Chart.Provider` (its stores, its drivers), inside the base's `<Canvas>`. The
 * base's window drives the chart's (through `map`, base = scale · chart + offset), so its
 * drivers read what the base shows; its rows are squeezed into the base's band.
 */
export type ChartMountProps = {
  /** The base plot's window, pixel size and row bands. */
  base: { range: RangeStoreApi; viewer: ViewerStoreApi; origin: number };
  /** The chart's axis onto the base's: `base = scale · chart + offset`. */
  map: { scale: number; offset: number };
  /** The base band the chart's rows fill. */
  bandKey: string;
  /** Where along the base axis the chart has data; null when it has none. */
  onSpan?: (span: TimeWindow | null) => void;
};

const toChart = (window: TimeWindow, map: ChartMountProps["map"]): TimeWindow => {
  const a = (window.start - map.offset) / map.scale;
  const b = (window.end - map.offset) / map.scale;
  return { start: Math.min(a, b), end: Math.max(a, b) };
};

export const ChartMount = ({ base, map, bandKey, onSpan }: ChartMountProps) => {
  const invalidate = useThree((state) => state.invalidate);
  const plot = usePlotStoreApi();
  const range = useRangeStoreApi();
  const viewer = useViewerStoreApi();
  const group = useMemo(() => {
    const g = new THREE.Group();
    g.matrixAutoUpdate = false;
    return g;
  }, []);

  // The base's window is the chart's, through the map; committed when the base commits.
  useEffect(() => {
    const follow = () => {
      const { liveRange, committedRange } = base.range.getState();
      range.getState().setLiveRange(toChart(liveRange, map));
      if (committedRange === liveRange) range.getState().commitRange();
    };
    follow();
    return base.range.subscribe((state, previous) => {
      if (state.liveRange !== previous.liveRange || state.committedRange !== previous.committedRange) follow();
    });
  }, [base.range, range, map]);

  useEffect(() => {
    const follow = () => viewer.getState().setViewportPx(base.viewer.getState().viewportPx);
    follow();
    return bindFields(base.viewer, [(s) => s.viewportPx.width, (s) => s.viewportPx.height], follow);
  }, [base.viewer, viewer]);

  // Chart x (minus its origin) → base x (minus the base's); chart rows → the base band.
  useEffect(() => {
    const apply = () => {
      const band = base.viewer.getState().bands[bandKey];
      const rows = Math.max(1, viewer.getState().rowCount);
      if (!band) {
        group.visible = false;
        invalidate();
        return;
      }
      const origin = plot.getState().timeOrigin;
      const sy = (band.top - band.bottom) / rows;
      group.matrix.set(
        map.scale, 0, 0, map.scale * origin + map.offset - base.origin,
        0, sy, 0, band.top,
        0, 0, 1, 0,
        0, 0, 0, 1,
      );
      group.matrixWorldNeedsUpdate = true;
      group.visible = true;
      invalidate();
    };
    apply();
    const unbindBand = bindFields(base.viewer, [(s) => s.bands[bandKey]], apply);
    const unbindRows = bindFields(viewer, [(s) => s.rowCount], apply);
    return () => {
      unbindBand();
      unbindRows();
    };
  }, [base.viewer, base.origin, viewer, plot, bandKey, map, group, invalidate]);

  useEffect(() => {
    if (!onSpan) return;
    const report = () => {
      const span = plot.getState().worldSpan;
      if (!span) return onSpan(null);
      const a = map.scale * span.start + map.offset;
      const b = map.scale * span.end + map.offset;
      onSpan({ start: Math.min(a, b), end: Math.max(a, b) });
    };
    report();
    const unsubscribe = plot.subscribe((state, previous) => {
      if (state.worldSpan !== previous.worldSpan) report();
    });
    return () => {
      unsubscribe();
      onSpan(null);
    };
  }, [plot, map, onSpan]);

  return (
    <>
      <StackLayoutManager<ChartLayerState> rowOf={rowOf} />
      <primitive object={group}>
        <PlotLayerRenderer renderers={LAYER_RENDERERS} />
      </primitive>
    </>
  );
};
