import { ColorInput } from "@/core/data/plot/layerui/layerControls";
import { MARKER_SHAPES, type MarkerShape } from "@/core/data/plot/marks/screenMarkers";
import { CardSection } from "@/core/data/scene/layerui/cardControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { Slider } from "@/core/ui/slider";
import { cn } from "@/core/util/utils";
import {
  drawsLine,
  drawsMarkers,
  type ChartLayerState,
  type ChartMark,
} from "../model/chartLayerModel";
import { CARD_SELECT as SELECT, CardRow as Row } from "./cardRows";
import { useChartLayerWrite } from "./useChartLayerWrite";

const LINE_MARKS: { value: ChartMark; label: string }[] = [
  { value: "LINE", label: "Line" },
  { value: "MARKERS", label: "Markers" },
  { value: "LINE_MARKERS", label: "Line + markers" },
  { value: "STEPS", label: "Steps" },
];

/** What each kind may be drawn as: the server refuses the rest. */
const MARKS_BY_KIND: Partial<Record<ChartLayerState["kind"], { value: ChartMark; label: string }[]>> = {
  points: [
    { value: "MARKERS", label: "Markers" },
    { value: "LINE", label: "Line through" },
  ],
  distribution: [
    { value: "HISTOGRAM", label: "Histogram" },
    { value: "BOX", label: "Box" },
  ],
};

/**
 * Line widths and marker sizes are MULTIPLES of the chart's default, as the
 * server stores them (1 = the default): never pixels, so a chart reads the
 * same on any screen.
 */
const SCALES = [0.5, 0.75, 1, 1.5, 2, 3];

const scaleText = (scale: number) => (scale === 1 ? "default" : `${scale}×`);

/** A multiple of the default, picked from a short list (one off it still shows). */
const ScaleSelect = ({
  value,
  onChange,
  title,
}: {
  value: number | null;
  onChange: (scale: number) => void;
  title: string;
}) => {
  const current = value ?? 1;
  const offered = SCALES.includes(current) ? SCALES : [...SCALES, current].sort((a, b) => a - b);
  return (
    <Select value={String(current)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger className={`${SELECT} w-20`} title={title}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {offered.map((scale) => (
          <SelectItem key={scale} value={String(scale)} className="text-xs">
            {scaleText(scale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const SHAPE_TITLES: Record<MarkerShape, string> = {
  CIRCLE: "Circle",
  SQUARE: "Square",
  DIAMOND: "Diamond",
  TRIANGLE: "Triangle",
  PLUS: "Plus",
  CROSS: "Cross",
};

/** A marker shape drawn small, the way the chart draws it (`screenMarkers.ts`). */
const ShapeGlyph = ({ shape }: { shape: MarkerShape }) => (
  <svg viewBox="-0.5 -0.5 1 1" className="h-2.5 w-2.5" fill="currentColor" aria-hidden>
    {shape === "CIRCLE" && <circle r={0.42} />}
    {shape === "SQUARE" && <rect x={-0.36} y={-0.36} width={0.72} height={0.72} />}
    {shape === "DIAMOND" && <polygon points="0,-0.48 0.48,0 0,0.48 -0.48,0" />}
    {shape === "TRIANGLE" && <polygon points="0,-0.45 0.48,0.38 -0.48,0.38" />}
    {(shape === "PLUS" || shape === "CROSS") && (
      <g transform={shape === "CROSS" ? "rotate(45)" : undefined}>
        <rect x={-0.12} y={-0.5} width={0.24} height={1} />
        <rect x={-0.5} y={-0.12} width={1} height={0.24} />
      </g>
    )}
  </svg>
);

/** The six shapes, side by side; the current one lit. */
const ShapePicker = ({ value, onChange }: { value: MarkerShape; onChange: (shape: MarkerShape) => void }) => (
  <div className="flex items-center gap-px rounded border border-foreground/10 bg-background/30 p-px">
    {MARKER_SHAPES.map((shape) => (
      <button
        key={shape}
        type="button"
        title={SHAPE_TITLES[shape]}
        aria-pressed={value === shape}
        onClick={() => value !== shape && onChange(shape)}
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-sm transition-colors",
          value === shape ? "bg-foreground/20 text-foreground" : "text-foreground/45 hover:text-foreground/80",
        )}
      >
        <ShapeGlyph shape={shape} />
      </button>
    ))}
  </div>
);

/** The swatch speaks RGBA 0–255; a chart layer's colour is persisted as 0..1. */
const toBytes = (color: readonly number[]) =>
  [0, 1, 2].map((i) => Math.round((color[i] ?? 0) * 255)).concat(Math.round((color[3] ?? 1) * 255));
const toUnit = (rgba: readonly number[]) => rgba.map((v) => v / 255);

/**
 * How a trace or a series is drawn: colour, mark, widths, opacity. Each commits
 * on change through the optimistic write, so there is no "save". Every one is a
 * LOOK: none of them rereads the layer's data.
 */
export const ChartLayerStyle = ({ layer }: { layer: ChartLayerState }) => {
  const write = useChartLayerWrite();
  const marks = MARKS_BY_KIND[layer.kind] ?? LINE_MARKS;
  const isDistribution = layer.kind === "distribution";
  return (
    <CardSection title="style">
      <Row label="Look">
        <ColorInput
          value={layer.persisted.color ? toBytes(layer.persisted.color) : null}
          resolved={layer.color}
          onCommit={(rgba) => void write(layer.id, { color: toUnit(rgba) })}
        />
        <Select value={layer.mark} onValueChange={(mark) => void write(layer.id, { mark: mark as ChartMark })}>
          <SelectTrigger className={`${SELECT} w-28`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {marks.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      {(isDistribution || drawsLine(layer.mark)) && (
        <Row label={isDistribution ? "Outline" : "Line"}>
          <ScaleSelect
            value={layer.persisted.lineWidth}
            title={isDistribution ? "How thick the outlines are" : "How thick the line is"}
            onChange={(lineWidth) => void write(layer.id, { lineWidth })}
          />
        </Row>
      )}
      {(drawsMarkers(layer.mark) || (layer.kind === "points" && layer.mark === "MARKERS")) && (
        <Row label="Markers">
          <ShapePicker
            value={layer.markerShape}
            onChange={(markerShape) => void write(layer.id, { markerShape })}
          />
          <ScaleSelect
            value={layer.persisted.markerSize}
            title="How big the markers are"
            onChange={(markerSize) => void write(layer.id, { markerSize })}
          />
        </Row>
      )}
      <Row label="Opacity">
        {/* Committed on release: every edit is a persisted write, and a drag
            must be one mutation, not fifty. */}
        <Slider
          className="w-24 py-1"
          min={0.1}
          max={1}
          step={0.05}
          defaultValue={[layer.opacity]}
          key={layer.persisted.opacity}
          onValueCommit={([opacity]) => void write(layer.id, { opacity })}
        />
      </Row>
    </CardSection>
  );
};
