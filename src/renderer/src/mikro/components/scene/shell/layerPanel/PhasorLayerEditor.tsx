import { useMemo, useState } from "react";
import { Eye, EyeOff, RotateCcw, Sun, Trash2 } from "lucide-react";

import {
  Badge,
  CardSection,
  EntryRow,
  IconToggle,
  RowAction,
  RowLabel,
  Segment,
  SegmentGroup,
} from "@/core/data/scene/layerui/cardControls";
import { ColormapSelect } from "@/core/data/scene/layerui/ColormapSelect";
import { Input } from "@/core/ui/input";
import { SwatchColorPicker } from "@/core/ui/SwatchColorPicker";
import { ColorMap, PhasorColorMode, PhasorCursorKind } from "@/mikro/api/graphql";
import { PhasorPlot, PhasorPlotTools, usePhasorDraw } from "../../features/volume/PhasorPlot";
import { TransferEditor } from "../../features/volume/rendergraph/RenderNodeEditor";
import {
  CONTINUOUS_COLORMAP_CHOICES,
  colormapGradientCSS,
} from "../../platform/layerui/colormap-utils";
import { resolvePhasorScale } from "../../platform/model/phasor";
import type { PhasorCursorDef, PhasorRenderNode } from "../../platform/model/renderGraph";
import type { LayerState } from "../../platform/stores/sceneStore";
import { cursorDetail, cursorLabel, cursorRgb, patchCursor, removeCursor } from "./phasorCursors";

/**
 * The body of a `PhasorLayer` card, in the shared card vocabulary
 * (`cardControls`) — the phasor sibling of `RgbChannelEditor`.
 *
 * It edits the same `PhasorRenderNode` the render graph's `PhasorNodeEditor`
 * does, but it is NOT that editor in a section. A graph node is one box among
 * several and brings its own header, fold and remove; a phasor layer IS its
 * one node, so the card is the box and the node's parts are its sections:
 *
 *  - phasor: the plot and the cursors drawn on it, one row each. A cursor is a
 *    colour RULE on the image, so it gets what the RGB card gives a plane: a
 *    swatch, what it covers, and its own hide and remove.
 *  - color by: what the hue means (phase, modulation, their mean), the ramp,
 *    and the value range the ramp spans.
 *  - photon count: the ordinary window over the mean photon count, and whether
 *    it dims the hue.
 *  - source: the instrument facts the reduction runs against. The harmonic is
 *    a choice; the axis is the lens', stated rather than typed.
 *
 * No colormap under "photon count": a phasor source's row in the colormap
 * atlas is its phasor ramp (`buildChannelUniformData`), so the intensity
 * transfer's own colormap reaches nothing.
 */

const MODES: ReadonlyArray<{ mode: PhasorColorMode; label: string; title: string; hint: string }> = [
  {
    mode: PhasorColorMode.Phase,
    label: "phase",
    title: "Colour by the phase: a lifetime over a microtime axis, the centre of mass over a spectrum",
    hint: "the hue is the phasor's angle",
  },
  {
    mode: PhasorColorMode.Modulation,
    label: "modulation",
    title: "Colour by the modulation: the lifetime read from how far the phasor sits from the origin",
    hint: "the hue is the phasor's distance from the origin",
  },
  {
    mode: PhasorColorMode.Average,
    label: "average",
    title: "Colour by the mean of the phase and the modulation values",
    hint: "the hue is the mean of the phase and modulation values",
  },
];

const HARMONICS = [1, 2, 3];

const RANGE_INPUT = "h-6 min-w-0 flex-1 px-2 font-mono text-[10px]";

const Swatch = ({ rgb, dimmed }: { rgb: readonly number[]; dimmed: boolean }) => (
  <span
    className={`h-3 w-3 shrink-0 rounded-sm border border-foreground/20 ${dimmed ? "opacity-40" : ""}`}
    style={{ background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
  />
);

export const PhasorLayerEditor = ({
  layer,
  node,
  onChange,
}: {
  layer: LayerState;
  node: PhasorRenderNode;
  onChange: (node: PhasorRenderNode) => void;
}) => {
  const [openCursor, setOpenCursor] = useState<number | null>(null);
  const { transfer } = node;
  const context = layer.lens.phasor;

  const setTransfer = (patch: Partial<PhasorRenderNode["transfer"]>) =>
    onChange({ ...node, transfer: { ...transfer, ...patch } });
  const setCursors = (cursors: PhasorCursorDef[]) => setTransfer({ cursors });
  const draw = usePhasorDraw(transfer.cursors, setCursors);

  // Both feed the plot's canvas effect: a fresh identity per render would
  // redraw the whole density on every tick of a levels drag in this card.
  const scale = useMemo(
    () =>
      resolvePhasorScale({
        axisType: context?.axisType,
        harmonic: node.harmonic,
        laserFrequency: context?.laserFrequency,
        window: context?.window,
      }),
    [context?.axisType, node.harmonic, context?.laserFrequency, context?.window],
  );
  const histogram = context?.phasorHistogram ?? null;
  const plotHistogram = useMemo(
    () =>
      histogram
        ? {
            bins: histogram.bins,
            counts: histogram.counts,
            gMin: histogram.gMin,
            gMax: histogram.gMax,
            sMin: histogram.sMin,
            sMax: histogram.sMax,
          }
        : null,
    [histogram],
  );

  // A ramp the picker does not list (one saved by another client) still has to
  // show as the current choice rather than as an empty select.
  const colormapChoices = useMemo(
    () =>
      CONTINUOUS_COLORMAP_CHOICES.some((choice) => choice.value === transfer.colormap)
        ? CONTINUOUS_COLORMAP_CHOICES
        : [
            {
              value: transfer.colormap,
              label: transfer.colormap.toLowerCase(),
              css: colormapGradientCSS(transfer.colormap),
            },
            ...CONTINUOUS_COLORMAP_CHOICES,
          ],
    [transfer.colormap],
  );

  const mode = MODES.find((entry) => entry.mode === transfer.mode);
  const rangeExample =
    scale.dimension === "time" ? "0.5 ns" : scale.dimension === "length" ? "520 nm" : "0.2";
  const harmonics = HARMONICS.includes(node.harmonic) ? HARMONICS : [...HARMONICS, node.harmonic];

  const plotHint = draw.tool === PhasorCursorKind.Circle
    ? "drag on the plot, from the circle's centre outwards"
    : draw.tool === PhasorCursorKind.Polygon
      ? "click the polygon's corners, then the first one again to close it"
      : !plotHistogram
        ? "no phasor distribution computed for this lens yet — cursors still work"
        : transfer.cursors.length > 0
          ? "a cursor paints the pixels whose phasor falls inside it"
          : "draw a cursor around a lobe to paint its pixels in the image";

  return (
    <>
      <CardSection
        title="phasor"
        hint={plotHint}
        action={
          <PhasorPlotTools draw={draw} cursors={transfer.cursors} onCursorsChange={setCursors} />
        }
      >
        <PhasorPlot
          histogram={plotHistogram}
          cursors={transfer.cursors}
          scale={scale}
          draw={draw}
          onCursorsChange={setCursors}
        />
        {transfer.cursors.length > 0 && (
          <div className="flex flex-col gap-1">
            {transfer.cursors.map((cursor, index) => {
              const label = cursorLabel(cursor, index);
              const rgb = cursorRgb(cursor, index);
              const open = openCursor === index;
              return (
                <EntryRow
                  key={index}
                  active={open}
                  title={`${label}: rename or recolour`}
                  onClick={() => setOpenCursor(open ? null : index)}
                  leading={<Swatch rgb={rgb} dimmed={!cursor.visible} />}
                  label={label}
                  detail={cursorDetail(cursor, transfer.mode, scale)}
                  actions={
                    <>
                      <RowAction
                        title={cursor.visible ? "Stop painting this cursor" : "Paint this cursor"}
                        onClick={() =>
                          setCursors(patchCursor(transfer.cursors, index, { visible: !cursor.visible }))
                        }
                      >
                        {cursor.visible ? (
                          <Eye className="h-2.5 w-2.5" />
                        ) : (
                          <EyeOff className="h-2.5 w-2.5" />
                        )}
                      </RowAction>
                      <RowAction
                        title="Remove this cursor"
                        danger
                        onClick={() => {
                          setOpenCursor(null);
                          setCursors(removeCursor(transfer.cursors, index));
                        }}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </RowAction>
                    </>
                  }
                  expanded={open}
                >
                  <div className="flex items-center gap-1.5">
                    <SwatchColorPicker
                      title="Cursor colour"
                      align="start"
                      className="h-6 w-6"
                      value={rgb}
                      onChange={([r, g, b]) =>
                        setCursors(patchCursor(transfer.cursors, index, { color: [r, g, b] }))
                      }
                    />
                    <Input
                      className="h-6 min-w-0 flex-1 px-2 text-[10px]"
                      value={cursor.label ?? ""}
                      placeholder={`Cursor ${index + 1}`}
                      aria-label="Cursor name"
                      onChange={(event) =>
                        setCursors(
                          patchCursor(transfer.cursors, index, { label: event.target.value || null }),
                        )
                      }
                    />
                    {cursor.color && (
                      <RowAction
                        title="Back to this position's default colour"
                        onClick={() =>
                          setCursors(patchCursor(transfer.cursors, index, { color: null }))
                        }
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                      </RowAction>
                    )}
                  </div>
                </EntryRow>
              );
            })}
          </div>
        )}
      </CardSection>

      <CardSection
        title="color by"
        hint={mode?.hint}
        action={
          <SegmentGroup>
            {MODES.map((entry) => (
              <Segment
                key={entry.mode}
                active={transfer.mode === entry.mode}
                title={entry.title}
                onClick={() => setTransfer({ mode: entry.mode })}
              >
                {entry.label}
              </Segment>
            ))}
          </SegmentGroup>
        }
      >
        <ColormapSelect
          value={transfer.colormap}
          choices={colormapChoices}
          onChange={(value) => setTransfer({ colormap: value as ColorMap })}
          title="The ramp the value is coloured with"
        />
        {/* The value window the ramp spans: a lifetime over a microtime axis, a
            wavelength over a spectrum one. Empty = the axis' own range. */}
        <div className="flex items-center gap-1.5">
          <RowLabel>range</RowLabel>
          <Input
            className={RANGE_INPUT}
            value={transfer.min ?? ""}
            placeholder="auto"
            aria-label="Range start"
            title={`Where the ramp starts, with its unit (${rangeExample}). Empty: the axis' own range`}
            onChange={(event) => setTransfer({ min: event.target.value || null })}
          />
          <span className="text-[9px] text-foreground/40">–</span>
          <Input
            className={RANGE_INPUT}
            value={transfer.max ?? ""}
            placeholder="auto"
            aria-label="Range end"
            title={`Where the ramp ends, with its unit (${rangeExample}). Empty: the axis' own range`}
            onChange={(event) => setTransfer({ max: event.target.value || null })}
          />
        </div>
      </CardSection>

      <CardSection
        title="photon count"
        hint={
          transfer.weightByIntensity
            ? "dim pixels fade: the hue is scaled by the windowed photon count"
            : "the hue is painted at full strength wherever there is signal"
        }
        action={
          <IconToggle
            active={transfer.weightByIntensity}
            title="Scale the hue by the photon count, so dim pixels fade out"
            onClick={() => setTransfer({ weightByIntensity: !transfer.weightByIntensity })}
            icon={<Sun className="h-2.5 w-2.5" />}
            label="weight"
          />
        }
      >
        <TransferEditor
          layer={layer}
          transfer={transfer.intensity}
          onChange={(intensity) => setTransfer({ intensity })}
          showColormap={false}
        />
      </CardSection>

      <CardSection
        title="source"
        hint={
          !context
            ? "this lens has no phasor axis — one is derived only for a microtime or spectrum axis"
            : node.harmonic !== context.harmonic
              ? `harmonic ${node.harmonic} reuses the instrument facts resolved at harmonic ${context.harmonic}`
              : undefined
        }
        action={
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-foreground/50">harmonic</span>
            <SegmentGroup>
              {harmonics.map((harmonic) => (
                <Segment
                  key={harmonic}
                  active={node.harmonic === harmonic}
                  title={`Reduce at harmonic ${harmonic}. The layer's data is recomputed`}
                  onClick={() => onChange({ ...node, harmonic })}
                >
                  {harmonic}
                </Segment>
              ))}
            </SegmentGroup>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-1">
          <Badge title="The axis reduced to a phasor">{node.phasorAxis || context?.axis || "no axis"}</Badge>
          {context && (
            <>
              <Badge title="Bins along the phasor axis on this lens, and the width they span">
                {context.bins} bins{context.window ? ` · ${context.window}` : ""}
              </Badge>
              {context.laserFrequency && (
                <Badge title="The pulsed source's repetition rate: the clock a lifetime is read against">
                  laser {context.laserFrequency}
                </Badge>
              )}
              <Badge
                title={
                  context.calibration
                    ? `Phase offset ${context.calibration.phaseOffset?.toFixed(3) ?? "—"} rad, modulation factor ${context.calibration.modulationFactor?.toFixed(3) ?? "—"}`
                    : "No instrument-response correction: the hue is not traceable to an absolute lifetime"
                }
              >
                {context.calibration ? "calibrated" : "uncalibrated"}
              </Badge>
            </>
          )}
        </div>
      </CardSection>
    </>
  );
};
