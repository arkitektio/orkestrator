import { ColorInput, LineWidthSelect } from "@/core/data/plot/layerui/layerControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/ui/select";
import { Slider } from "@/core/ui/slider";
import {
  drawsLine,
  drawsMarkers,
  type ChartLayerState,
  type ChartMark,
} from "../model/chartLayerModel";
import { useChartLayerWrite } from "./useChartLayerWrite";

const MARKS: { value: ChartMark; label: string }[] = [
  { value: "LINE", label: "Line" },
  { value: "MARKERS", label: "Markers" },
  { value: "LINE_MARKERS", label: "Line + markers" },
  { value: "STEPS", label: "Steps" },
];

const MARKER_SIZES = [3, 5, 8, 12];

/** The swatch speaks RGBA 0–255; a chart layer's colour is persisted as 0..1. */
const toBytes = (color: readonly number[]) =>
  [0, 1, 2].map((i) => Math.round((color[i] ?? 0) * 255)).concat(Math.round((color[3] ?? 1) * 255));
const toUnit = (rgba: readonly number[]) => rgba.map((v) => v / 255);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 text-[11px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-auto flex items-center gap-1.5">{children}</span>
  </div>
);

/**
 * How a trace or a series is drawn: colour, mark, widths, opacity. Each commits
 * on change through the optimistic write, so there is no "save". Every one is a
 * LOOK: none of them rereads the layer's data.
 */
export const ChartLayerStyle = ({ layer }: { layer: ChartLayerState }) => {
  const write = useChartLayerWrite();
  return (
    <div className="flex flex-col gap-1">
      <Row label="Style">
        <ColorInput
          value={layer.persisted.color ? toBytes(layer.persisted.color) : null}
          resolved={layer.color}
          onCommit={(rgba) => void write(layer.id, { color: toUnit(rgba) })}
        />
        <Select value={layer.mark} onValueChange={(mark) => void write(layer.id, { mark: mark as ChartMark })}>
          <SelectTrigger className="h-5 w-28 px-1.5 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {MARKS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      {drawsLine(layer.mark) && (
        <Row label="Line">
          <LineWidthSelect
            value={layer.lineWidth}
            onCommit={(lineWidth) => void write(layer.id, { lineWidth })}
          />
        </Row>
      )}
      {drawsMarkers(layer.mark) && (
        <Row label="Markers">
          <select
            title="Marker size (px)"
            className="h-5 rounded border border-border/60 bg-transparent px-1 font-mono text-[10px]"
            value={MARKER_SIZES.includes(layer.markerSize) ? layer.markerSize : ""}
            onChange={(event) => void write(layer.id, { markerSize: Number(event.currentTarget.value) })}
          >
            {!MARKER_SIZES.includes(layer.markerSize) && <option value="">{layer.markerSize}px</option>}
            {MARKER_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
        </Row>
      )}
      <Row label="Opacity">
        {/* Committed on release: every edit is a persisted write, and a drag
            must be one mutation, not fifty. */}
        <Slider
          className="w-24"
          min={0.1}
          max={1}
          step={0.05}
          defaultValue={[layer.opacity]}
          key={layer.persisted.opacity}
          onValueCommit={([opacity]) => void write(layer.id, { opacity })}
        />
      </Row>
    </div>
  );
};
