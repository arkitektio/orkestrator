import { Slider } from "@/core/ui/slider";
import { Toggle } from "@/core/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { useModeStore } from "../../../../../platform/stores/modeStore";
import { useRoiDrawingStore } from "../../../roiDrawingStore";
import type { TraceDepth } from "./traceBox";
import { MAX_TRACE_COST, type TraceWeights } from "./traceCost";

/**
 * The vector enhancer: a master toggle, and what its A* search treats as
 * cheap while it is on. Shown for every enhanceable tool (LINE/POLYGON/PATH).
 *
 * The weights are exposed rather than tuned once and hidden because there is
 * no universally right answer: what reads as "the structure" depends on the
 * data. A weight is how much cost the worst voxel in the box adds under that
 * term, so the numbers are comparable with each other and with the search's
 * own shortest-path pull — turning them all down gives a straight line,
 * turning one up makes that term decide the route.
 *
 * Edits land in the store immediately and the NEXT edge uses them; edges
 * already traced are left alone, so a chain can deliberately change character
 * part-way.
 *
 * In the flat view the live-wire band is regrown on each edit too, so it
 * answers to the sliders before the next click — except "Straight": the band
 * has no goal to be straight towards, so the slider only governs drawn
 * strokes (and edges the band could not answer), and says so.
 *
 * 2D / 3D is how far a trace may leave the slices its waypoints sit on
 * (`traceBox.TraceDepth`), remembered per view.
 */

const DEPTHS: { depth: TraceDepth; hint: string }[] = [
  {
    depth: "2D",
    hint: "Trace on the slices the points sit on — one slice, or the ones a scrubbed path spans",
  },
  {
    depth: "3D",
    hint: "Let the trace leave the slice and follow the structure through depth",
  },
];

const SLIDERS: {
  key: Exclude<keyof TraceWeights, "invert">;
  label: string;
  hint: string;
}[] = [
  { key: "intensity", label: "Bright", hint: "follow bright voxels" },
  { key: "gradient", label: "Edges", hint: "follow boundaries" },
  { key: "straightness", label: "Straight", hint: "resist detours" },
];

export const VectorEnhancerPanel = () => {
  const vectorEnhance = useRoiDrawingStore(
    (s) => s.enhancersOn["vector-trace"] ?? false,
  );
  const setEnhancerOn = useRoiDrawingStore((s) => s.setEnhancerOn);
  const setVectorEnhance = (on: boolean) => setEnhancerOn("vector-trace", on);
  const weights = useRoiDrawingStore((s) => s.traceWeights);
  const setTraceWeights = useRoiDrawingStore((s) => s.setTraceWeights);
  const displayMode = useModeStore((s) => s.displayMode);
  const depth = useRoiDrawingStore((s) => s.traceDepth[displayMode]);
  const setTraceDepth = useRoiDrawingStore((s) => s.setTraceDepth);

  return (
    <div className="pointer-events-auto flex flex-col gap-1 rounded-md bg-background/80 px-2 py-1.5 shadow-md backdrop-blur-sm">
      <Toggle
        size="sm"
        pressed={vectorEnhance}
        onPressedChange={setVectorEnhance}
        className="h-6 text-[10px]"
        title="Trace each clicked edge through the image data instead of drawing it straight"
      >
        Enhance
      </Toggle>
      {/* Collapsed to the one toggle while off: the weights only govern edges
          that will actually be traced. */}
      {vectorEnhance && (
        <>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={depth}
            onValueChange={(next) => next && setTraceDepth(displayMode, next as TraceDepth)}
          >
            {DEPTHS.map(({ depth: option, hint }) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className="h-6 px-2 text-[10px]"
                title={hint}
              >
                Enhance {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {SLIDERS.map(({ key, label, hint }) => (
            <div
              key={key}
              className="flex items-center gap-2"
              title={
                key === "straightness" && displayMode === "2D"
                  ? `${hint} — applies to drawn strokes; the line that follows the cursor ignores it`
                  : hint
              }
            >
              <span className="w-12 select-none text-right text-[10px] font-medium uppercase text-muted-foreground">
                {label}
              </span>
              <div className="w-32">
                <Slider
                  min={0}
                  max={MAX_TRACE_COST}
                  step={0.05}
                  value={[weights[key]]}
                  onValueChange={([value]) => setTraceWeights({ [key]: value })}
                />
              </div>
              <span className="w-8 select-none text-[10px] tabular-nums text-muted-foreground">
                {weights[key].toFixed(2)}
              </span>
            </div>
          ))}
          <Toggle
            size="sm"
            pressed={weights.invert}
            onPressedChange={(invert) => setTraceWeights({ invert })}
            className="h-6 text-[10px]"
            title="Trace dark structures on a bright background"
          >
            Invert
          </Toggle>
        </>
      )}
    </div>
  );
};
