import { createTraceSlice } from "@/core/data/plot/lines/traceSlice";
import type { AnyViewerSlice } from "@/core/data/plot/stores/viewerStore";
import { createChartAnnotationSlice } from "../features/annotations/store/annotationSlice";

/**
 * The feature slices composed into the chart's viewer store. A trace and a
 * series both publish packed lines, into the one slice the plot engine draws
 * them from; the annotation feature keeps which drawing tool is armed.
 */
export const FEATURE_SLICES: readonly AnyViewerSlice[] = [createTraceSlice, createChartAnnotationSlice];
