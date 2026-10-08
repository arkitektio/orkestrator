import { RangeUrlSync } from "@/core/data/plot/chrome/RangeUrlSync";
import type { TimeWindow } from "@/core/data/plot/stores/rangeStore";
import { encodeBrushRange } from "../platform/coords/brushRange";

/**
 * The numbers are integer milliseconds of world time (see `brushRange.ts` for why
 * the old sample-index meaning could not survive).
 */
const encode = (window: TimeWindow) =>
  encodeBrushRange({ left: Math.floor(window.start), right: Math.ceil(window.end) });

/**
 * Writes the committed window to `?brush=start:end`, one direction only — the
 * plot engine's `RangeUrlSync`, in the experiment's own param and encoding.
 */
export const TimeRangeUrlSync = () => <RangeUrlSync param="brush" encode={encode} />;
