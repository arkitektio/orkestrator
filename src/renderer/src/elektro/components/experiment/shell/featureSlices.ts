import { createAnnotationSlice } from "../features/annotations/store/annotationSlice";
import { createEventsSlice } from "../features/events/store/eventsSlice";
import { createSpikesSlice } from "../features/spikes/store/spikesSlice";
import { createTraceSlice } from "../features/traces/store/traceSlice";
import { createPickerSlice } from "../platform/pickers/pickerSlice";
import type { AnyViewerSlice } from "../platform/stores/viewerStore";

/**
 * The feature slices composed into the viewer store — the shell knows the
 * features, `platform/` does not. One entry per feature that publishes
 * draw-ready data; each is read through its own `use…Store` hooks.
 */
export const FEATURE_SLICES: readonly AnyViewerSlice[] = [
  createTraceSlice,
  createEventsSlice,
  createSpikesSlice,
  createPickerSlice,
  createAnnotationSlice,
];
