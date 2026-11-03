import type { ComponentType, ReactNode } from "react";
import { Lasso, Spline } from "lucide-react";
import { Toggle } from "@/core/ui/toggle";
import { useModeStore, type DisplayMode } from "../../../../../platform/stores/modeStore";
import {
  useRoiDrawingStore,
  type AnnotateTool,
  type TraceEnhancerId,
} from "../../../roiDrawingStore";
import type { TraceDepth } from "./traceBox";
import { MAX_TRACE_COST, type TraceWeights } from "./traceCost";
import {
  EnhancerLayout,
  EnhancerOption,
  OutlinePolygonIllustration,
  StraightIllustration,
  StraightPolygonIllustration,
  TraceDepthIllustration,
  TraceSliceIllustration,
} from "../../shared/EnhancerOption";
import { SliderRow } from "../../shared/ParamRow";

/**
 * The two trace enhancers' panels. Both drive the same edge tracer (an A*
 * search through the image between two clicked points), but each is its own
 * section with its own switch, weights, choices and pictures:
 *
 * - **Line & path tracing** ("vector-trace", LINE / PATH): straight, traced in
 *   the slice, or traced through depth — `traceBox.TraceDepth`, remembered
 *   per view.
 * - **Polygon outline** ("outline-trace", POLYGON): straight sides, or sides
 *   that follow the object's boundary. No depth choice: a polygon is a flat
 *   outline in the flat view and a probed one in the volume, so it traces in
 *   its view's own depth (`activeTraceDepth`). It starts on the boundary term
 *   (`DEFAULT_OUTLINE_WEIGHTS`).
 *
 * The weights are exposed rather than tuned once and hidden because there is
 * no universally right answer: what reads as "the structure" depends on the
 * data. A weight is how much cost the worst voxel in the box adds under that
 * term, so the numbers are comparable with each other and with the search's
 * own shortest-path pull — turning them all down gives a straight line,
 * turning one up makes that term decide the route. They sit in the panel's
 * Advanced column, beside a short account of the search.
 *
 * Edits land in the store immediately and the NEXT edge uses them; edges
 * already traced are left alone, so a chain can deliberately change character
 * part-way.
 *
 * In the flat view the live-wire band is regrown on each edit too, so it
 * answers to the sliders before the next click — except "Straight": the band
 * has no goal to be straight towards, so the slider only governs drawn
 * strokes (and edges the band could not answer), and is only offered where
 * strokes are drawn (PATH, or the volume).
 */

/** "on" is a trace in the view's own depth (the outline's only kind). */
type Choice = "off" | "on" | TraceDepth;

type ChoiceSpec = {
  choice: Choice;
  title: string;
  description: string;
  Illustration: ComponentType;
};

type TracePanelSpec = {
  id: TraceEnhancerId;
  title: string;
  icon: ComponentType<{ className?: string }>;
  choices: ChoiceSpec[];
  /** The Advanced column's account of the search, for the current choice. */
  explain: (ctx: { choice: Choice; straightOffered: boolean }) => ReactNode;
};

const SLIDERS: {
  key: Exclude<keyof TraceWeights, "invert">;
  label: string;
  hint: string;
}[] = [
  { key: "intensity", label: "Bright", hint: "follow bright voxels" },
  { key: "gradient", label: "Edges", hint: "follow boundaries" },
  { key: "straightness", label: "Straight", hint: "resist detours" },
];

const tunesLine = (straightOffered: boolean) =>
  `Each tune is how much cost the worst voxel adds: Bright makes dark voxels expensive, Edges makes flat ones expensive${
    straightOffered ? ", Straight charges for detours" : ""
  }. All low gives a straight line; one high lets that term decide. Changes apply to the next edge.`;

const VECTOR_PANEL: TracePanelSpec = {
  id: "vector-trace",
  title: "Line & path tracing",
  icon: Spline,
  choices: [
    {
      choice: "off",
      title: "Straight",
      description: "Each edge is a straight line between your clicks",
      Illustration: StraightIllustration,
    },
    {
      choice: "2D",
      title: "Follow in slice",
      description: "Each edge follows the structure on the slices the points sit on",
      Illustration: TraceSliceIllustration,
    },
    {
      choice: "3D",
      title: "Follow through depth",
      description: "Each edge may leave the slice to stay on the structure",
      Illustration: TraceDepthIllustration,
    },
  ],
  explain: ({ choice, straightOffered }) => (
    <>
      <p>
        Between two points, a shortest-path search (A*) finds the cheapest
        route through the image inside a box around the edge
        {choice === "3D" ? ", deep enough to leave the slice" : ", on the points' slices"}.
      </p>
      <p className="mt-1">{tunesLine(straightOffered)}</p>
    </>
  ),
};

const OUTLINE_PANEL: TracePanelSpec = {
  id: "outline-trace",
  title: "Polygon outline",
  icon: Lasso,
  choices: [
    {
      choice: "off",
      title: "Straight sides",
      description: "Each side is a straight line between your clicks",
      Illustration: StraightPolygonIllustration,
    },
    {
      choice: "on",
      title: "Follow the outline",
      description: "Each side hugs the object's boundary between your clicks — the closing side too",
      Illustration: OutlinePolygonIllustration,
    },
  ],
  explain: ({ straightOffered }) => (
    <>
      <p>
        Between two corners, a shortest-path search (A*) finds the cheapest
        route through the image around that side. An outline starts on Edges,
        so a side runs where the brightness changes rather than along the
        brightest voxels; the closing side is traced when you finish.
      </p>
      <p className="mt-1">{tunesLine(straightOffered)}</p>
    </>
  ),
};

const choiceOf = (on: boolean, depth: TraceDepth, spec: TracePanelSpec): Choice =>
  !on ? "off" : spec.choices.some((c) => c.choice === depth) ? depth : "on";

/**
 * "Straight" only steers drawn strokes in the flat view (see above): offer it
 * in the volume, and for PATH's freehand drag.
 */
const straightOffered = (displayMode: DisplayMode, tool: AnnotateTool | null) =>
  displayMode === "3D" || tool === "PATH";

const TraceEnhancerPanel = ({ spec }: { spec: TracePanelSpec }) => {
  const on = useRoiDrawingStore((s) => s.enhancersOn[spec.id] ?? false);
  const setEnhancerOn = useRoiDrawingStore((s) => s.setEnhancerOn);
  const weights = useRoiDrawingStore((s) => s.traceWeights[spec.id]);
  const setTraceWeights = useRoiDrawingStore((s) => s.setTraceWeights);
  const displayMode = useModeStore((s) => s.displayMode);
  const depth = useRoiDrawingStore((s) => s.traceDepth[displayMode]);
  const setTraceDepth = useRoiDrawingStore((s) => s.setTraceDepth);
  const activeTool = useRoiDrawingStore((s) => s.activeTool);

  const current = choiceOf(on, depth, spec);
  const choose = (choice: Choice) => {
    if (choice === "off") return setEnhancerOn(spec.id, false);
    if (choice !== "on") setTraceDepth(displayMode, choice);
    setEnhancerOn(spec.id, true);
  };

  const offerStraight = straightOffered(displayMode, activeTool);
  const sliders = SLIDERS.filter(({ key }) => key !== "straightness" || offerStraight);

  return (
    <EnhancerLayout
      id={spec.id}
      title={spec.title}
      icon={spec.icon}
      advanced={
        on
          ? {
              explain: spec.explain({ choice: current, straightOffered: offerStraight }),
              tunes: (
                <>
                  {sliders.map(({ key, label, hint }) => (
                    <SliderRow
                      key={key}
                      label={label}
                      title={
                        key === "straightness" && displayMode === "2D"
                          ? `${hint} — applies to drawn strokes; the line that follows the cursor ignores it`
                          : hint
                      }
                      min={0}
                      max={MAX_TRACE_COST}
                      step={0.05}
                      value={weights[key]}
                      readout={weights[key].toFixed(2)}
                      onChange={(value) => setTraceWeights(spec.id, { [key]: value })}
                    />
                  ))}
                  <Toggle
                    size="sm"
                    pressed={weights.invert}
                    onPressedChange={(invert) => setTraceWeights(spec.id, { invert })}
                    className="h-6 self-start text-[10px]"
                    title="Trace dark structures on a bright background"
                  >
                    Invert — follow dark structures
                  </Toggle>
                </>
              ),
            }
          : undefined
      }
    >
      {spec.choices.map(({ choice, title, description, Illustration }) => (
        <EnhancerOption
          key={choice}
          selected={current === choice}
          onSelect={() => choose(choice)}
          illustration={<Illustration />}
          title={title}
          description={description}
        />
      ))}
    </EnhancerLayout>
  );
};

export const VectorEnhancerPanel = () => <TraceEnhancerPanel spec={VECTOR_PANEL} />;

export const OutlineEnhancerPanel = () => <TraceEnhancerPanel spec={OUTLINE_PANEL} />;
