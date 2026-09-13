import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { LevelsEditor, type LevelsTrace } from "../../features/volume/LevelsEditor";
import { layerCoverage } from "../../features/annotations/anchorVisibility";
import {
  Badge,
  CardSection,
  EntryRow,
  RowAction,
  Segment,
  SegmentGroup,
} from "../../platform/layerui/cardControls";
import { getLayerDtypeRange } from "../../platform/layerui/contrast-utils";
import type { LayerState } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useBrickStore } from "../../features/bricks/store/brickSlice";
import {
  describePlane,
  intensityAxisCandidates,
  intensityExtent,
  percentileUnion,
  rangeUnion,
  resolvePlanes,
  type PlaneHistogram,
} from "./rgbPlanes";

/**
 * The rendering block of an `RgbLayer` card.
 *
 * An RGB layer asks ONE question an intensity layer does not: which plane of
 * the acquisition feeds which primary. Everything else about it is fixed by
 * the type — the three tints are basis vectors, the compositing across them is
 * addition, and the contrast is one window over all three. So this editor is
 * built around the mapping, and offers exactly the two things the layer
 * actually stores: the three indices (plus the axis they index) and that one
 * window.
 *
 * ## What is deliberately NOT here
 *
 * Per-channel windows, per-channel gamma, per-channel colormaps and
 * per-channel mute. Each is refused for two independent reasons, and both are
 * worth knowing before adding one back:
 *
 *  - `UpdateRgbLayerInput` has no column for any of them, so the edit could
 *    not survive a refetch (`mikro.graphql`'s `RgbLayer` docblock is explicit:
 *    "the channel *is* the colour … Wanting to do that means wanting three
 *    layers, or an ImageLayer");
 *  - `resolveRenderKind` (`platform/model/layerModel.ts`) grants `"rgb"` only
 *    to three basis-tinted, all-visible channels over ONE window with no
 *    gamma. Any of those controls DEMOTES the layer to `"graph"` — off the
 *    specialised material, which assembles three taps into a vec3 with no LUT
 *    sample and no `pow`, onto the general 16-slot compositor.
 *
 * The gamma midtone the shared `TransferEditor` used to show here was exactly
 * that: unpersistable, invisible to the shader (the RGB arm compiles the `pow`
 * out) and quietly expensive. Hence `showGamma={false}` and no `stops`.
 *
 * A layer-level opacity row is absent for a third reason: `layer.opacity` is
 * read only by label layers (`features/labels/labelUniforms.ts`) — on a brick
 * image layer it reaches no uniform at all, and the RGB path's entire uniform
 * set is five scalars (`features/bricks/gpu/rgbUniforms.ts`).
 */

/** The fixed basis tints, in slot order — what the material assumes. */
const PRIMARIES = [
  { name: "Red", css: "#ef4444", trace: "#ff3b30" },
  { name: "Green", css: "#22c55e", trace: "#34d95c" },
  { name: "Blue", css: "#3b82f6", trace: "#3b82f6" },
] as const;

const SPARK_WIDTH = 28;
const SPARK_HEIGHT = 12;

/** A plane's distribution at row scale. Log counts, same reason as the levels
 *  plot: a microscopy histogram is dominated by its background bin. */
const Sparkline = ({ histogram, color }: { histogram: PlaneHistogram; color: string }) => {
  const bars = useMemo(() => {
    const counts = histogram.histogram;
    let max = 1;
    for (const count of counts) if (count > max) max = count;
    const maxLog = Math.log1p(max);
    const width = SPARK_WIDTH / Math.max(counts.length, 1);
    return counts.map((count, i) => {
      const h = (Math.log1p(Math.max(count, 0)) / maxLog) * SPARK_HEIGHT;
      return h <= 0 ? null : (
        <rect key={i} x={i * width} y={SPARK_HEIGHT - h} width={width + 0.2} height={h} />
      );
    });
  }, [histogram]);
  return (
    <svg
      className="shrink-0 opacity-70"
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      fill={color}
      aria-hidden
    >
      {bars}
    </svg>
  );
};

const Swatch = ({ css }: { css: string }) => (
  <span
    className="h-3 w-3 shrink-0 rounded-sm border border-white/20"
    style={{ background: css }}
  />
);

export const RgbChannelEditor = ({
  layer,
  onPlanes,
  onWindow,
  onIntensityAxis,
}: {
  layer: LayerState;
  /** The three plane indices, in R/G/B slot order. One write for a preset and
   *  for a single pick alike — three separate store writes would republish the
   *  layer three times mid-edit. */
  onPlanes: (indices: readonly number[]) => void;
  onWindow: (climMin: number, climMax: number) => void;
  onIntensityAxis: (axis: string) => void;
}) => {
  const [openSlot, setOpenSlot] = useState<number | null>(null);

  const dimSelections = useViewerStore((state) => state.dimSelections);
  const axis = layer.intensityAxis ?? null;
  const coverage = useMemo(() => layerCoverage(layer, dimSelections), [layer, dimSelections]);

  const indices = useMemo(
    () => PRIMARIES.map((_, slot) => layer.channels[slot]?.intensityIndex ?? slot),
    [layer.channels],
  );

  /** Every plane the picker can offer. Empty when the extent is unknown — the
   *  rows then still describe what is mapped, they just cannot be re-picked. */
  const planes = useMemo(
    () => resolvePlanes(layer.lens, coverage, axis),
    [layer.lens, coverage, axis],
  );
  const mapped = useMemo(
    () => indices.map((index) => describePlane(layer.lens, coverage, axis, index)),
    [indices, layer.lens, coverage, axis],
  );

  // `layer` alone: the helper reads `layer.lens` THROUGH it, so listing both
  // is the same dependency twice.
  const axes = useMemo(() => intensityAxisCandidates(layer.lens, layer), [layer]);
  const extent = intensityExtent(layer.lens, axis);

  // Same fallback ladder as the intensity editor's histogram: a float layer
  // with no server histogram would otherwise window against the dtype's [0,1].
  const brickSystem = useBrickStore((s) => s.brickSystem);
  useBrickStore((s) => s.poolsVersion);
  const pool = brickSystem?.getLayerPool(layer.id) ?? null;
  const [dtypeMin, dtypeMax] =
    pool?.autoRange && pool.autoRangeInitialized
      ? [pool.minValue, pool.maxValue]
      : getLayerDtypeRange(layer);

  const traces = useMemo<LevelsTrace[]>(
    () =>
      mapped.flatMap((plane, slot) =>
        plane.histogram
          ? [
              {
                bins: plane.histogram.bins,
                histogram: plane.histogram.histogram,
                color: PRIMARIES[slot].trace,
              },
            ]
          : [],
      ),
    [mapped],
  );

  // The plot's extent and its Auto span every MAPPED plane, not whichever
  // anchor came first: a picture whose blue reaches 30000 and whose red stops
  // at 500 must not be windowed on the red alone.
  const range = rangeUnion(mapped);
  const percentiles = percentileUnion(mapped);

  const transfer = layer.channels[0]?.transfer;
  const climMin = transfer?.climMin ?? dtypeMin;
  const climMax = transfer?.climMax ?? dtypeMax;

  const pick = (slot: number, index: number) => {
    onPlanes(indices.map((current, i) => (i === slot ? index : current)));
    setOpenSlot(null);
  };

  const isPreset = (preset: readonly number[]) =>
    indices.every((index, i) => index === preset[i]);
  const mono = indices[0] === indices[1] && indices[1] === indices[2];

  return (
    <>
      <CardSection
        title="channels"
        hint={
          mono
            ? "every primary reads the same plane — the picture renders grey"
            : axis
              ? `each primary reads one index along ${axis}`
              : "no intensity axis: the indices address nothing"
        }
        action={
          <SegmentGroup>
            <Segment
              active={isPreset([0, 1, 2]) && !mono}
              title="Planes 0, 1, 2 into red, green, blue"
              onClick={() => onPlanes([0, 1, 2])}
            >
              rgb
            </Segment>
            <Segment
              active={isPreset([2, 1, 0]) && !mono}
              title="Planes 2, 1, 0 into red, green, blue — the usual BGR photograph"
              onClick={() => onPlanes([2, 1, 0])}
            >
              bgr
            </Segment>
            <Segment
              active={mono}
              title="All three primaries read red's plane — a grey rendering of one plane"
              onClick={() => onPlanes([indices[0], indices[0], indices[0]])}
            >
              mono
            </Segment>
          </SegmentGroup>
        }
      >
        {axes.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.08em] text-white/35">axis</span>
            <SegmentGroup>
              {axes.map((candidate) => (
                <Segment
                  key={candidate}
                  active={candidate === axis}
                  title={`Index the primaries along ${candidate}`}
                  onClick={() => onIntensityAxis(candidate)}
                >
                  {candidate}
                </Segment>
              ))}
            </SegmentGroup>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {PRIMARIES.map((primary, slot) => {
            const plane = mapped[slot];
            return (
              <EntryRow
                key={primary.name}
                active={openSlot === slot}
                title={`${primary.name}: ${plane.display}`}
                onClick={() => setOpenSlot(openSlot === slot ? null : slot)}
                leading={<Swatch css={primary.css} />}
                label={plane.display}
                detail={
                  axis
                    ? `${axis} = ${plane.index}${
                        plane.histogram?.min != null && plane.histogram?.max != null
                          ? ` · ${plane.histogram.min} – ${plane.histogram.max}`
                          : ""
                      }`
                    : `index ${plane.index}`
                }
                actions={
                  plane.histogram ? (
                    <Sparkline histogram={plane.histogram} color={primary.trace} />
                  ) : undefined
                }
                expanded={openSlot === slot}
              >
                {planes.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {planes.map((candidate) => (
                      <button
                        key={candidate.index}
                        type="button"
                        title={`Feed ${primary.name} from ${candidate.display}`}
                        onClick={() => pick(slot, candidate.index)}
                        className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-[10px] transition-colors ${
                          candidate.index === plane.index
                            ? "bg-sky-400/20 text-sky-100"
                            : "text-white/60 hover:bg-white/5 hover:text-white/85"
                        }`}
                      >
                        <span className="w-6 shrink-0 font-mono text-[9px] text-white/35">
                          {candidate.index}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{candidate.display}</span>
                        {candidate.histogram && (
                          <Sparkline histogram={candidate.histogram} color="#94a3b8" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-[9px] text-white/35">
                    this lens does not say how many planes it has — the mapping is kept as
                    stored
                  </span>
                )}
              </EntryRow>
            );
          })}
        </div>
      </CardSection>

      <CardSection
        title="exposure"
        hint="one window for all three planes — an RGB layer is three views of one acquisition"
        action={
          <RowAction
            title="Swap red and blue"
            onClick={() => onPlanes([indices[2], indices[1], indices[0]])}
          >
            <ArrowLeftRight className="h-2.5 w-2.5" />
          </RowAction>
        }
      >
        <LevelsEditor
          // The traces ARE the series here; the single-series props stay empty.
          bins={[]}
          histogram={[]}
          traces={traces}
          value={{ min: climMin, max: climMax, gamma: 1 }}
          colormap={null}
          showGamma={false}
          p1={percentiles?.[0] ?? null}
          p99={percentiles?.[1] ?? null}
          histMin={range?.[0] ?? null}
          histMax={range?.[1] ?? null}
          dtypeMin={dtypeMin}
          dtypeMax={dtypeMax}
          onChange={(next) => onWindow(next.min, next.max)}
        />
      </CardSection>

      <CardSection title="source">
        <div className="flex flex-wrap items-center gap-1">
          <Badge title="Planes available along the intensity axis">
            {extent > 0 ? `${extent} planes` : "extent unknown"}
          </Badge>
          <Badge title="How this layer composites over the layers below it">
            {layer.blending.toLowerCase()}
          </Badge>
          <Badge title="The three tints are fixed basis vectors — that is what lets the material skip the colormap tap entirely">
            fixed tints
          </Badge>
        </div>
      </CardSection>
    </>
  );
};
