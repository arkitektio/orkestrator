import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SwatchColorPicker } from "@/components/color/SwatchColorPicker";
import {
  Blending,
  ColorMap,
  PhasorColorMode,
  ProjectionMode,
  useUpdateLaterMutation,
} from "@/mikro-next/api/graphql";
import {
  Blend,
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  Trash2,
  Waves,
} from "lucide-react";
import { COLORMAP_OPTIONS, colormapGradientCSS } from "../../../platform/layerui/colormap-utils";
import {
  sampleColorMapRgb,
  sampleStopsRgb,
  stopsGradientCSS,
} from "../../../platform/gpu/colormaps";
import { LevelsEditor } from "../LevelsEditor";
import { getLayerDtypeRange } from "../../../platform/layerui/contrast-utils";
import { LayerState, useSceneStore } from "../../../platform/stores/sceneStore";
import { useViewStoreApi } from "../../../platform/stores/viewStore";

import {
  BLEND_KIND,
  BlendRenderNode,
  ChannelRenderNode,
  PROJECTION_KIND,
  PhasorRenderNode,
  ProjectionRenderNode,
  RenderNode,
  TransferFn,
  TransferStop,
  flattenChannels,
  flattenPhasors,
  flattenSources,
  newChannelNode,
  newPhasorNode,
  primaryChannelRenderFields,
  resolveLayerGraph,
  resolveProjectionMode,
  serializeRenderGraph,
} from "../../../platform/model/renderGraph";
import { resolvePhasorAxis } from "../../../platform/model/dims";
import { resolvePhasorScale } from "../../../platform/model/phasor";
import { PhasorPlot } from "../PhasorPlot";
import { useBrickStore } from "../../bricks/store/brickSlice";

const colorToObj = (color: number[] | null) => ({
  r: Math.round(color?.[0] ?? 255),
  g: Math.round(color?.[1] ?? 255),
  b: Math.round(color?.[2] ?? 255),
});

const formatColormapName = (cm: ColorMap) =>
  cm.charAt(0) + cm.slice(1).toLowerCase();

/** Seed a custom gradient from the active named colormap: five evenly spaced
 * samples, so "Custom stops" starts as an editable copy of what's on screen. */
const seedStops = (colormap: ColorMap, color: number[] | null): TransferStop[] =>
  [0, 0.25, 0.5, 0.75, 1].map((position) => {
    const [r, g, b] = sampleColorMapRgb(colormap, position, color);
    return {
      position,
      color: [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255],
    };
  });

/**
 * The custom-gradient editor: a clickable gradient bar (click adds a stop at
 * that position with the gradient's interpolated color) plus one compact row
 * per stop — color swatch, position slider, remove. Commits keep the stops
 * sorted; the model treats < 2 stops as "no custom gradient", so removal is
 * blocked at two.
 */
const StopsEditor = ({
  stops,
  onChange,
}: {
  stops: TransferStop[];
  onChange: (stops: TransferStop[]) => void;
}) => {
  const commit = (next: TransferStop[]) =>
    onChange([...next].sort((a, b) => a.position - b.position));

  return (
    <div className="mt-1 space-y-1">
      <div
        className="h-4 w-full cursor-copy rounded border border-border/60"
        style={{ background: stopsGradientCSS(stops) }}
        title="Click to add a stop"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const position = Math.min(
            1,
            Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1)),
          );
          const [r, g, b] = sampleStopsRgb(stops, position);
          commit([
            ...stops,
            {
              position,
              color: [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255],
            },
          ]);
        }}
      />
      {stops.map((stop, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <SwatchColorPicker
            title="Stop color"
            align="start"
            value={stop.color}
            onChange={([r, g, b]) =>
              commit(
                stops.map((s, i) => (i === index ? { ...s, color: [r, g, b, 255] } : s)),
              )
            }
          />
          <Slider
            min={0}
            max={100}
            step={0.5}
            value={[stop.position * 100]}
            onValueChange={([value]) =>
              commit(
                stops.map((s, i) => (i === index ? { ...s, position: value / 100 } : s)),
              )
            }
            className="flex-1 py-1"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[9px] text-muted-foreground">
            {Math.round(stop.position * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-muted-foreground hover:text-red-300"
            title={stops.length <= 2 ? "A gradient needs at least two stops" : "Remove stop"}
            disabled={stops.length <= 2}
            onClick={() => commit(stops.filter((_, i) => i !== index))}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
};

/**
 * Compact, searchable colormap picker. A small gradient/name button opens a
 * searchable list in a popover. When the Intensity colormap is active, a
 * separate swatch button exposes the base color in its own popover (never
 * rendered underneath the picker).
 */
const ColormapControl = ({
  transfer,
  onChange,
}: {
  transfer: TransferFn;
  onChange: (t: TransferFn) => void;
}) => {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<TransferFn>) => onChange({ ...transfer, ...patch });
  const current = transfer.colormap ?? ColorMap.Viridis;
  const customStops =
    transfer.colorStops && transfer.colorStops.length >= 2 ? transfer.colorStops : null;
  const isIntensity = !customStops && current === ColorMap.Intensity;
  const rgb = colorToObj(transfer.color);
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-6 min-w-0 flex-1 items-center gap-2 rounded border border-border/60 bg-background/40 px-1.5 text-[10px] transition-colors hover:bg-background/60"
            >
              <div
                className="h-3 w-8 shrink-0 rounded"
                style={{
                  background: customStops
                    ? stopsGradientCSS(customStops)
                    : colormapGradientCSS(current, 18, transfer.color),
                }}
              />
              <span className="truncate">
                {customStops ? "Custom" : formatColormapName(current)}
              </span>
              <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-0">
            <Command>
              <CommandInput placeholder="Search colormap…" className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty>No colormap found.</CommandEmpty>
                <CommandGroup>
                  {/* Custom gradient: seeds an editable copy of the active
                      colormap; picking a named map below clears it. */}
                  <CommandItem
                    value="Custom stops"
                    onSelect={() => {
                      if (!customStops) set({ colorStops: seedStops(current, transfer.color) });
                      setOpen(false);
                    }}
                    className="gap-2 text-xs"
                  >
                    <div
                      className="h-3 w-8 shrink-0 rounded"
                      style={{
                        background: stopsGradientCSS(
                          customStops ?? seedStops(current, transfer.color),
                        ),
                      }}
                    />
                    <span className="flex-1 truncate">Custom stops…</span>
                    {customStops && <Check className="h-3 w-3 shrink-0" />}
                  </CommandItem>
                  {COLORMAP_OPTIONS.map((cm) => (
                    <CommandItem
                      key={cm}
                      value={formatColormapName(cm)}
                      onSelect={() => {
                        set({ colormap: cm, colorStops: null });
                        setOpen(false);
                      }}
                      className="gap-2 text-xs"
                    >
                      <div
                        className="h-3 w-8 shrink-0 rounded"
                        style={{ background: colormapGradientCSS(cm, 18, transfer.color) }}
                      />
                      <span className="flex-1 truncate">{formatColormapName(cm)}</span>
                      {!customStops && cm === current && <Check className="h-3 w-3 shrink-0" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {isIntensity && (
          <SwatchColorPicker
            title="Base color"
            className="h-6 w-6"
            value={[rgb.r, rgb.g, rgb.b]}
            onChange={([r, g, b]) => set({ color: [r, g, b, 255] })}
          />
        )}
      </div>

      {customStops && (
        <StopsEditor stops={customStops} onChange={(colorStops) => set({ colorStops })} />
      )}
    </div>
  );
};

/**
 * Levels-style contrast editor for a channel's transfer (black point /
 * gamma midtone / white point over the full-range histogram). Transfer clims
 * are normalized [0,1]; the editor works in absolute data values, converted
 * via the layer's dtype range. Histogram data comes from the layer's active
 * anchor (first anchor carrying a value histogram).
 */
/** Stable empty fallback: a fresh `[]` literal per render used to invalidate
 * every downstream LevelsEditor memo on layers without a server histogram. */
const EMPTY_BINS: number[] = [];

const TransferHistogram = ({
  layer,
  transfer,
  onLevelsChange,
  onStopsChange,
}: {
  layer: LayerState;
  transfer: TransferFn;
  onLevelsChange: (climMin: number, climMax: number, gamma: number) => void;
  onStopsChange: (stops: TransferFn["stops"]) => void;
}) => {
  const anchor = layer.lens.activeAnchors.find((a) => a.valueHistogram);
  const vh = anchor?.valueHistogram;

  // Float layers with no server histogram would fall back to the dtype range
  // `[0,1]`, so the sliders would operate on the wrong scale. Prefer the live
  // auto-contrast range the brick pool accumulates from decoded voxels; the
  // `poolsVersion` subscription re-renders this editor when it settles.
  const brickSystem = useBrickStore((s) => s.brickSystem);
  useBrickStore((s) => s.poolsVersion);
  const pool = brickSystem?.getLayerPool(layer.id) ?? null;
  const [dtypeMin, dtypeMax] =
    pool?.autoRange && pool.autoRangeInitialized
      ? [pool.minValue, pool.maxValue]
      : getLayerDtypeRange(layer);

  // Clim is stored in absolute base-native units, exactly the space the editor
  // works in — so pass it straight through (null = full range).
  return (
    <LevelsEditor
      bins={vh?.bins ?? EMPTY_BINS}
      histogram={vh?.histogram ?? EMPTY_BINS}
      value={{
        min: transfer.climMin ?? dtypeMin,
        max: transfer.climMax ?? dtypeMax,
        gamma: transfer.gamma ?? 1,
      }}
      colormap={transfer.colormap}
      baseColor={transfer.color}
      p1={vh?.p1 ?? null}
      p99={vh?.p99 ?? null}
      histMin={vh?.min ?? dtypeMin}
      histMax={vh?.max ?? dtypeMax}
      dtypeMin={dtypeMin}
      dtypeMax={dtypeMax}
      onChange={(next) => onLevelsChange(next.min, next.max, next.gamma)}
      stops={transfer.stops}
      onStopsChange={onStopsChange}
    />
  );
};

/**
 * Exported for the FIXED-SHAPE layer cards. An intensity layer's transfer is
 * the identical `TransferFn` — window, curve, gamma, colormap AND tint — it is
 * simply carried as fields instead of on a graph node, so the same editor is
 * the right one. Sharing it is what keeps a tint editable in both places.
 */
export const TransferEditor = ({
  transfer,
  onChange,
  layer,
  showColormap = true,
}: {
  transfer: TransferFn;
  onChange: (t: TransferFn) => void;
  layer?: LayerState;
  /**
   * Hide the colormap/tint picker. For an RGB layer the three tints are FIXED
   * basis vectors — that is what the type declares and what lets its material
   * skip the LUT tap entirely — so offering the picker would show a control
   * whose edits have nowhere to go.
   */
  showColormap?: boolean;
}) => {
  const set = (patch: Partial<TransferFn>) => onChange({ ...transfer, ...patch });
  return (
    <div className="flex flex-col gap-2 pl-1">
      {layer ? (
        <TransferHistogram
          layer={layer}
          transfer={transfer}
          onLevelsChange={(climMin, climMax, gamma) => set({ climMin, climMax, gamma })}
          onStopsChange={(stops) => set({ stops })}
        />
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-muted-foreground">Clim min</span>
            <Input
              type="number"
              className="h-7 text-xs"
              value={transfer.climMin ?? 0}
              step={0.01}
              onChange={(e) => set({ climMin: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-muted-foreground">Clim max</span>
            <Input
              type="number"
              className="h-7 text-xs"
              value={transfer.climMax ?? 1}
              step={0.01}
              onChange={(e) => set({ climMax: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {showColormap && <ColormapControl transfer={transfer} onChange={onChange} />}

      {/* Gamma lives in the Levels editor (midtone stop) when a histogram is
          available; keep the plain slider only for the layer-less fallback. */}
      {!layer && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Gamma</span>
            <span className="font-mono">{(transfer.gamma ?? 1).toFixed(2)}</span>
          </div>
          <Slider
            min={0.1}
            max={3}
            step={0.05}
            value={[transfer.gamma ?? 1]}
            onValueChange={([g]) => set({ gamma: g })}
          />
        </div>
      )}

    </div>
  );
};

/**
 * The opacity / invert knobs — advanced transfer controls kept out of the
 * default histogram-first view. Rendered inside the channel's "Advanced"
 * disclosure alongside the intensity source fields.
 */
const AdvancedTransferControls = ({
  transfer,
  onChange,
}: {
  transfer: TransferFn;
  onChange: (t: TransferFn) => void;
}) => {
  const set = (patch: Partial<TransferFn>) => onChange({ ...transfer, ...patch });
  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Opacity</span>
          <span className="font-mono">{(transfer.opacity ?? 1).toFixed(2)}</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[transfer.opacity ?? 1]}
          onValueChange={([o]) => set({ opacity: o })}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Invert</span>
        <Switch checked={!!transfer.invert} onCheckedChange={(v) => set({ invert: v })} />
      </div>
    </>
  );
};

const ChannelNodeEditor = ({
  node,
  onChange,
  onRemove,
  layer,
}: {
  node: ChannelRenderNode;
  onChange: (n: ChannelRenderNode) => void;
  onRemove?: () => void;
  layer?: LayerState;
}) => {
  const [open, setOpen] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Tint the whole channel card with its colormap ramp (or the intensity
  // base-color ramp) so channels are identifiable at a glance.
  const tint = colormapGradientCSS(
    node.transfer.colormap ?? ColorMap.Viridis,
    18,
    node.transfer.color,
  );
  return (
    <div className="relative overflow-hidden rounded border border-border/10 bg-background/50 p-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28] "
        style={{ background: tint }}
      />
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-1 text-left"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <Layers className="h-3 w-3" />
          <span className="font-medium">
            {node.label || `Channel ${node.intensityIndex}`}
          </span>
        </button>
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      {open && (
        <div className="relative pt-2 flex flex-col gap-2">
          {/* Histogram-first: the levels/colormap editor is the primary control. */}
          <TransferEditor
            transfer={node.transfer}
            onChange={(transfer) => onChange({ ...node, transfer })}
            layer={layer}
          />

          {/* Intensity source + opacity/invert are advanced knobs, hidden by
              default to keep the histogram the focus. */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 self-start text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            />
            Advanced
          </button>
          {showAdvanced && (
            <div className="flex flex-col gap-2 pl-1">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-muted-foreground">Intensity index</span>
                  <Input
                    type="number"
                    className="h-7 text-xs"
                    value={node.intensityIndex}
                    onChange={(e) => onChange({ ...node, intensityIndex: Number(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-muted-foreground">Intensity dim</span>
                  <Input
                    className="h-7 text-xs"
                    value={node.intensityAxis ?? ""}
                    placeholder="c"
                    onChange={(e) =>
                      onChange({ ...node, intensityAxis: e.target.value || null })
                    }
                  />
                </div>
              </div>
              <AdvancedTransferControls
                transfer={node.transfer}
                onChange={(transfer) => onChange({ ...node, transfer })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * A phasor source: the axis it reduces, the harmonic it reduces at, and how the
 * resulting (g, s) becomes a color. The phasor plot is the primary control —
 * cursors drawn on it are color rules on the image, not annotations.
 *
 * Changing the axis, the harmonic or the source channel changes what the BRICKS
 * hold (the reduction is baked in at repack), so those edits flush and refetch
 * the layer's pool. The rest — mode, colormap, range, cursors — are shader
 * uniforms and update on the next frame.
 */
/** Exported for the `PhasorLayer` card: its `phasorRender` normalizes to
 * exactly this node, so it edits through exactly this editor. */
export const PhasorNodeEditor = ({
  node,
  onChange,
  onRemove,
  layer,
}: {
  node: PhasorRenderNode;
  onChange: (n: PhasorRenderNode) => void;
  onRemove?: () => void;
  layer?: LayerState;
}) => {
  const [open, setOpen] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const context = layer?.lens.phasor;
  // Memoized on the underlying stable facts: `resolvePhasorScale` returns a
  // fresh object per call and it feeds PhasorPlot's canvas-draw effect deps —
  // an unstable identity forced a full bins² canvas redraw on EVERY render
  // of this editor (i.e. every clim drag tick anywhere in the card).
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
  // Same identity discipline for the plot's histogram prop (was an inline
  // object literal — new identity per render → per-render canvas redraw).
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
  const setTransfer = (patch: Partial<PhasorRenderNode["transfer"]>) =>
    onChange({ ...node, transfer: { ...node.transfer, ...patch } });

  const tint = colormapGradientCSS(node.transfer.colormap, 18, null);
  const unit = scale.dimension === "time" ? "ns" : scale.dimension === "length" ? "nm" : "";

  return (
    <div className="relative overflow-hidden rounded border border-border/10 bg-background/50 p-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{ background: tint }}
      />
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-1 text-left"
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
          />
          <Waves className="h-3 w-3" />
          <span className="font-medium">
            {node.label || `Phasor ${node.phasorAxis || "?"}`}
          </span>
        </button>
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {open && (
        <div className="relative flex flex-col gap-2 pt-2">
          <PhasorPlot
            histogram={plotHistogram}
            cursors={node.transfer.cursors}
            scale={scale}
            onCursorsChange={(cursors) => setTransfer({ cursors })}
          />

          <div className="flex items-center gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-muted-foreground">Color by</span>
              <Select
                value={node.transfer.mode}
                onValueChange={(v) => setTransfer({ mode: v as PhasorColorMode })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PhasorColorMode).map((mode) => (
                    <SelectItem key={mode} value={mode} className="text-xs">
                      {mode.charAt(0) + mode.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-muted-foreground">Colormap</span>
              <ColormapControl
                transfer={{ ...node.transfer.intensity, colormap: node.transfer.colormap }}
                onChange={(t) =>
                  setTransfer({ colormap: t.colormap ?? node.transfer.colormap })
                }
              />
            </div>
          </div>

          {/* The value window the colormap is ranged over: a lifetime over a
              microtime axis, a wavelength over a spectrum one. Empty = the axis'
              own range. */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-muted-foreground">Min {unit && `(${unit})`}</span>
              <Input
                className="h-7 text-xs"
                value={node.transfer.min ?? ""}
                placeholder="auto"
                onChange={(e) => setTransfer({ min: e.target.value || null })}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-muted-foreground">Max {unit && `(${unit})`}</span>
              <Input
                className="h-7 text-xs"
                value={node.transfer.max ?? ""}
                placeholder="auto"
                onChange={(e) => setTransfer({ max: e.target.value || null })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Weight by intensity</span>
            <Switch
              checked={node.transfer.weightByIntensity}
              onCheckedChange={(v) => setTransfer({ weightByIntensity: v })}
            />
          </div>

          {/* The photon count's own transfer — the same levels editor a channel
              gets, over the mean photon count the reduction produced. */}
          <TransferEditor
            transfer={node.transfer.intensity}
            onChange={(intensity) => setTransfer({ intensity })}
            layer={layer}
          />

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 self-start text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            />
            Advanced
          </button>
          {showAdvanced && (
            <div className="flex flex-col gap-2 pl-1">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-muted-foreground">Phasor dim</span>
                  <Input
                    className="h-7 text-xs"
                    value={node.phasorAxis}
                    placeholder={layer?.lens.renderAxes?.phasor ?? "tau"}
                    onChange={(e) => onChange({ ...node, phasorAxis: e.target.value })}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-muted-foreground">Harmonic</span>
                  <Input
                    type="number"
                    min={1}
                    className="h-7 text-xs"
                    value={node.harmonic}
                    onChange={(e) =>
                      onChange({ ...node, harmonic: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-muted-foreground">Channel</span>
                  <Input
                    type="number"
                    min={0}
                    className="h-7 text-xs"
                    value={node.intensityIndex}
                    onChange={(e) =>
                      onChange({ ...node, intensityIndex: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </div>
              </div>
              <PhasorContextSummary layer={layer} harmonic={node.harmonic} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** The instrument facts the reduction is running against — an uncalibrated
 * phasor still renders, but its hue is not a lifetime, and that has to be
 * visible rather than silently assumed. */
const PhasorContextSummary = ({
  layer,
  harmonic,
}: {
  layer?: LayerState;
  harmonic: number;
}) => {
  const context = layer?.lens.phasor;
  if (!context) {
    return (
      <span className="text-[10px] text-muted-foreground">
        This lens has no phasor axis — the server derives one only for a MICROTIME
        or SPECTRUM axis.
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
      <span>
        {context.bins} bins over {context.window ?? "an uncalibrated axis"}
        {context.laserFrequency ? ` · laser ${context.laserFrequency}` : ""}
      </span>
      <span>
        {context.calibration
          ? `Calibrated (phase ${context.calibration.phaseOffset?.toFixed(3) ?? "—"} rad, modulation ${context.calibration.modulationFactor?.toFixed(3) ?? "—"})`
          : "Uncalibrated — the hue is not traceable to an absolute lifetime"}
      </span>
      {harmonic !== context.harmonic && (
        <span>
          Harmonic {harmonic}: reusing the instrument facts resolved at harmonic{" "}
          {context.harmonic}.
        </span>
      )}
    </div>
  );
};

const ContainerNodeEditor = ({
  node,
  onChange,
  onRemove,
  isRoot,
  layer,
}: {
  node: BlendRenderNode | ProjectionRenderNode;
  onChange: (n: BlendRenderNode | ProjectionRenderNode) => void;
  onRemove?: () => void;
  isRoot?: boolean;
  layer?: LayerState;
}) => {
  const [open, setOpen] = useState(true);
  const setChild = (index: number, child: RenderNode | null) => {
    const children = child
      ? node.children.map((c, i) => (i === index ? child : c))
      : node.children.filter((_, i) => i !== index);
    onChange({ ...node, children });
  };

  const addChild = (child: RenderNode) =>
    onChange({ ...node, children: [...node.children, child] });

  // Each channel takes an equal flex share of the row (wrapping when narrow)
  // instead of stacking full-width: several channels sit side by side and the
  // card stops growing a screen-tall column per channel.
  const childEditors = node.children.map((child, i) => (
    <div key={i} className="min-w-[240px] flex-1">
      <RenderNodeEditor
        node={child}
        onChange={(c) => setChild(i, c)}
        onRemove={() => setChild(i, null)}
        layer={layer}
      />
    </div>
  ));

  const addMenu = <AddNodeMenu layer={layer} onAdd={addChild} />;

  // Root blend: not a collapsible tree. The blend mode is a quiet vertical
  // selector pinned to the far-left spine (clickable, but it doesn't stand out);
  // the channels stack to its right and are always visible.
  if (isRoot && node.type === "blend") {
    return (
      <div className="flex items-stretch gap-2">
        <Select
          value={node.blending}
          onValueChange={(v) => onChange({ ...node, blending: v as Blending })}
        >
          <SelectTrigger
            className="h-full w-4 shrink-0 justify-center gap-0 self-stretch rounded border-0 bg-transparent px-0 py-1 text-[9px] uppercase tracking-widest text-muted-foreground/60 shadow-none transition-colors hover:text-foreground focus:ring-0 [writing-mode:vertical-rl] [&>svg]:hidden"
            title="Blend mode"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(Blending).map((b) => (
              <SelectItem key={b} value={b} className="text-xs">
                {b.charAt(0) + b.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-1">
          {childEditors}
          <div className="w-full">{addMenu}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={isRoot ? "" : "rounded border border-border/60 bg-background/40"}>
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex flex-1 items-center gap-1 text-left"
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform ${open ? "rotate-90" : ""}`}
            />
            {node.type === "blend" ? <Blend className="h-3 w-3" /> : <Box className="h-3 w-3" />}
            <span className="font-medium capitalize">{node.label || node.type}</span>
          </button>
          {node.type === "blend" ? (
            <Select
              value={node.blending}
              onValueChange={(v) => onChange({ ...node, blending: v as Blending })}
            >
              <SelectTrigger className="h-6 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Blending).map((b) => (
                  <SelectItem key={b} value={b} className="text-xs">
                    {b.charAt(0) + b.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={node.mode}
              onValueChange={(v) => onChange({ ...node, mode: v as ProjectionMode })}
            >
              <SelectTrigger className="h-6 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ProjectionMode).map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {open && (
          <div className="pt-2 flex flex-col gap-2 pl-3 border-l border-border/50 ml-1 bg-black/5">
            {childEditors}
            {addMenu}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Adds a leaf or a container to a node's children. Until now the graph's SHAPE
 * came from the server and the editor could only tweak or remove nodes — but a
 * phasor node has to be addable, or a FLIM cube can never be turned into a
 * lifetime overlay from the viewer.
 */
const AddNodeMenu = ({
  layer,
  onAdd,
}: {
  layer?: LayerState;
  onAdd: (node: RenderNode) => void;
}) => {
  const [open, setOpen] = useState(false);
  if (!layer) return null;

  // The server derives `renderAxes.phasor` from the axis TYPES — it is set only
  // when the lens actually has a MICROTIME or SPECTRUM axis. No axis, no phasor.
  const canPhasor = Boolean(layer.lens.renderAxes?.phasor);

  const add = (node: RenderNode) => {
    onAdd(node);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 justify-start gap-1 self-start px-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add node
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 justify-start gap-2 text-xs"
            onClick={() => add(newChannelNode(layer))}
          >
            <Layers className="h-3 w-3" /> Channel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 justify-start gap-2 text-xs"
            disabled={!canPhasor}
            title={
              canPhasor
                ? "Reduce the lens' MICROTIME/SPECTRUM axis to a phasor"
                : "This lens has no MICROTIME or SPECTRUM axis"
            }
            onClick={() => add(newPhasorNode(layer))}
          >
            <Waves className="h-3 w-3" /> Phasor
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 justify-start gap-2 text-xs"
            onClick={() =>
              add({
                type: "blend",
                kind: BLEND_KIND,
                label: null,
                blending: Blending.Additive,
                children: [],
              })
            }
          >
            <Blend className="h-3 w-3" /> Blend
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 justify-start gap-2 text-xs"
            onClick={() =>
              add({
                type: "projection",
                kind: PROJECTION_KIND,
                label: null,
                mode: ProjectionMode.Mip,
                children: [],
              })
            }
          >
            <Box className="h-3 w-3" /> Projection
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const RenderNodeEditor = ({
  node,
  onChange,
  onRemove,
  layer,
}: {
  node: RenderNode;
  onChange: (n: RenderNode) => void;
  onRemove?: () => void;
  layer?: LayerState;
}) => {
  if (node.type === "channel") {
    return <ChannelNodeEditor node={node} onChange={onChange} onRemove={onRemove} layer={layer} />;
  }
  if (node.type === "phasor") {
    return <PhasorNodeEditor node={node} onChange={onChange} onRemove={onRemove} layer={layer} />;
  }
  return (
    <ContainerNodeEditor
      node={node}
      onChange={onChange}
      onRemove={onRemove}
      layer={layer}
    />
  );
};

/**
 * Editing state for a layer's render graph, lifted out of the panel body so the
 * live `root` / `dirty` / `save` can be shared with the collapsed header (which
 * hosts the tiny Save button). Owned by the always-mounted LayerCard, so unsaved
 * edits survive collapsing the card.
 */
export interface RenderGraphEditor {
  root: BlendRenderNode;
  dirty: boolean;
  loading: boolean;
  change: (n: BlendRenderNode | ProjectionRenderNode) => void;
  save: () => Promise<void>;
}

export const useRenderGraphEditor = (layer: LayerState): RenderGraphEditor => {
  const initial = useMemo(
    () => resolveLayerGraph(layer),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layer.id, layer.renderGraph],
  );
  const [root, setRoot] = useState<BlendRenderNode>(initial);
  const [dirty, setDirty] = useState(false);
  const [updateLater, { loading }] = useUpdateLaterMutation();
  const updateStoreLayer = useSceneStore((s) => s.updateLayer);
  const viewApi = useViewStoreApi();

  // Re-seed from the persisted graph when it changes externally and there are no
  // unsaved edits. The editor no longer remounts on expand (it lives in the
  // always-mounted card), so this replaces the old mount-time re-seed.
  useEffect(() => {
    if (!dirty) setRoot(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // The render graph is the single rendering truth. Every edit is pushed to
  // the scene store immediately (live preview); the flat climMin/colormap/…
  // fields are DERIVED from the primary channel here — they exist only for
  // the single-channel 3D shader path and display chrome, and are never
  // written directly by any panel.
  const pushPreview = (nextRoot: BlendRenderNode) => {
    // Live-preview tick: pulse the interaction flag so the volume renders
    // degraded during a window drag and refines on release (viewStore).
    viewApi.getState().markInteraction();
    const channels = flattenChannels(nextRoot);
    const phasors = flattenPhasors(nextRoot);
    const primary = channels[0]?.transfer;
    updateStoreLayer({
      ...layer,
      channels,
      phasors,
      sources: flattenSources(nextRoot),
      // Adding or removing a phasor node (or changing its axis/harmonic) changes
      // what the BRICKS hold, not just a uniform: the slice signature picks that
      // up and the residency manager flushes the pool (sliceSignature.ts).
      phasorAxis: resolvePhasorAxis(phasors[0]?.phasorAxis, layer.lens.renderAxes),
      blend: nextRoot.blending,
      projection: resolveProjectionMode(nextRoot),
      climMin: primary?.climMin ?? layer.climMin,
      climMax: primary?.climMax ?? layer.climMax,
      colormap: primary?.colormap ?? layer.colormap,
      color: primary?.color ?? layer.color,
      gamma: primary?.gamma ?? layer.gamma,
      intensityAxis: channels[0]?.intensityAxis ?? layer.intensityAxis,
    });
  };

  const change = (n: BlendRenderNode | ProjectionRenderNode) => {
    // The root is always a blend node.
    const nextRoot = n.type === "blend" ? n : { ...root, children: n.children };
    setRoot(nextRoot);
    setDirty(true);
    pushPreview(nextRoot);
  };

  const save = async () => {
    const result = await updateLater({
      variables: { input: { id: layer.id, renderGraph: serializeRenderGraph(root) } },
    });
    const nextGraph = result.data?.updateLayer?.renderGraph ?? layer.renderGraph;
    // Reflect the saved graph's primary channel in the (single-channel) viewer.
    const primary = primaryChannelRenderFields(nextGraph);
    const phasors = flattenPhasors(root);
    updateStoreLayer({
      ...layer,
      renderGraph: nextGraph,
      channels: flattenChannels(root),
      phasors,
      sources: flattenSources(root),
      phasorAxis: resolvePhasorAxis(phasors[0]?.phasorAxis, layer.lens.renderAxes),
      blend: root.blending,
      projection: resolveProjectionMode(root),
      climMin: primary?.climMin ?? layer.climMin,
      climMax: primary?.climMax ?? layer.climMax,
      colormap: primary?.colormap ?? layer.colormap,
      color: primary?.color ?? layer.color,
      gamma: primary?.gamma ?? layer.gamma,
      intensityAxis: primary?.intensityAxis ?? layer.intensityAxis,
    });
    setDirty(false);
  };

  return { root, dirty, loading, change, save };
};

/**
 * The render-node "aspect" for an image layer: the editable tree of channel
 * sources, transfer functions, blend & projection nodes. Controlled — the
 * editing state (and the Save action) lives in `useRenderGraphEditor`.
 */
export const RenderGraphSection = ({
  editor,
  layer,
}: {
  editor: RenderGraphEditor;
  layer: LayerState;
}) => (
  <div className="flex flex-col">
    <ContainerNodeEditor node={editor.root} onChange={editor.change} isRoot layer={layer} />
  </div>
);
