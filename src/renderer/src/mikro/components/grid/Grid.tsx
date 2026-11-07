import { Canvas } from "@react-three/fiber";
import { Eye, EyeOff, Grid3x3, Maximize2, Trash2 } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { PlaneCamera } from "@/core/data/plot/plane/PlaneCamera";
import { PlaneFrame, type PlaneAxisSpec } from "@/core/data/plot/plane/PlaneFrame";
import { PlaneLegend, type LegendScale } from "@/core/data/plot/plane/PlaneLegend";
import { PlaneProbeProvider, PlaneTooltip } from "@/core/data/plot/plane/planeProbe";
import { createPlaneStore, PlaneStoreContext, usePlaneStoreApi } from "@/core/data/plot/plane/planeStore";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import { colormapGradientCSS, ColorMap } from "@/core/data/scene/gpu/colormaps";
import { CardSection, LayerCardShell, OpacityRow } from "@/core/data/scene/layerui/cardControls";
import { ColormapSelect } from "@/core/data/scene/layerui/ColormapSelect";
import { reportError } from "@/core/notify";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import { useKeepTabLive } from "@/core/tabs/keepLive";
import { Button } from "@/core/ui/button";
import { Input } from "@/core/ui/input";
import { formatSiValue } from "@/core/data/plot/coords/siFormat";
import {
  ColorMap as GqlColorMap,
  GetGridDocument,
  useDeleteGridLayerMutation,
  useUpdateGridLayerMutation,
  type GridFragment,
} from "@/mikro/api/graphql";
import { AttributeServiceProvider } from "@/mikro/lib/attributes/AttributeServiceProvider";
import type { GridWorld } from "./gridReaders";
import { createGridStore, GridStoreContext, useGridStore } from "./gridStore";
import { colormapOf, GridLayerView, type GridLayerFragment } from "./GridLayerView";

/**
 * A grid: the members of one or two enumerating axes, rows and columns, each
 * cell coloured by a value -- genes against cells, cells against channels, a
 * plate's wells. Drawn on the plot engine's plane like a chart of values; a
 * layer is one texture, one texel per member.
 *
 * The public API, as `Chart` is the chart's: a host wraps its page in
 * `Grid.Provider`, puts `Grid.Viewport` in the content area and
 * `Grid.LayersSidebar` in the rail.
 */

const rendererFactory = createWebGPURendererFactory({ label: "grid" });

const layersOf = (grid: GridFragment): GridLayerFragment[] =>
  [...grid.layers]
    .filter((l): l is GridLayerFragment => l.__typename === "HeatmapGridLayer" || l.__typename === "CellsGridLayer")
    .sort((a, b) => a.order - b.order);

type GridContextValue = { grid: GridFragment };

const Provider = ({ grid, children }: { grid: GridFragment; children: ReactNode }) => {
  // One view and one set of readouts per page: the page is keyed by its route,
  // so another grid is another mount.
  const [plane] = useState(() => createPlaneStore({ padding: 0.02 }));
  const [store] = useState(() => createGridStore());
  return (
    <AttributeServiceProvider>
      <GridStoreContext.Provider value={store}>
        <PlaneStoreContext.Provider value={plane}>
          <PlaneProbeProvider>
            <GridData.Provider value={{ grid }}>{children}</GridData.Provider>
          </PlaneProbeProvider>
        </PlaneStoreContext.Provider>
      </GridStoreContext.Provider>
    </AttributeServiceProvider>
  );
};

const GridData = createContext<GridContextValue | null>(null);
const useGrid = (): GridFragment => {
  const value = useContext(GridData);
  if (!value) throw new Error("Missing Grid.Provider");
  return value.grid;
};

const worldOf = (grid: GridFragment): GridWorld => ({ rowAxis: grid.rowAxis.name, columnAxis: grid.columnAxis?.name ?? null });

/** A member's label: its position along the axis, for now (labels from anchors come later). */
const memberText = (_axis: "row" | "col", m: number) => String(m);

const Viewport = () => {
  const grid = useGrid();
  const visible = useTabVisible();
  useKeepTabLive();
  const world = useMemo(() => worldOf(grid), [grid]);
  const layers = useMemo(() => layersOf(grid).filter((l) => l.visible && l.placement === "PLACED"), [grid]);
  const readouts = useGridStore((s) => s.readouts);

  const x: PlaneAxisSpec = useMemo(
    () => (grid.columnAxis ? { title: grid.columnAxis.name, members: { label: (m) => memberText("col", m) } } : { title: null, members: { label: () => "" } }),
    [grid.columnAxis],
  );
  const y: PlaneAxisSpec = useMemo(() => ({ title: grid.rowAxis.name, members: { label: (m) => memberText("row", m), flipped: true } }), [grid.rowAxis]);

  // The top layer's colour scale is the legend's.
  const top = layers[layers.length - 1];
  const scale: LegendScale | null = useMemo(() => {
    if (!top) return null;
    const r = readouts[top.id];
    const lo = top.min ?? r?.lo;
    const hi = top.max ?? r?.hi;
    if (lo == null || hi == null || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    const title = top.__typename === "CellsGridLayer" ? `${top.valueColumn}${top.valueUnit ? ` · ${top.valueUnit}` : ""}` : (top.name ?? top.lens.name ?? "value");
    return { title, colormap: colormapOf(top), lo, hi };
  }, [top, readouts]);

  return (
    <div className="dark text-foreground relative h-full w-full overflow-hidden rounded-lg bg-black">
      <PlaneFrame
        x={x}
        y={y}
        overlay={
          <>
            <PlaneLegend entries={[]} scale={scale} />
            <PlaneTooltip xLabel={grid.columnAxis?.name} yLabel={grid.rowAxis.name} />
          </>
        }
      >
        <Canvas frameloop={visible ? "demand" : "never"} gl={rendererFactory}>
          <PlaneCamera />
          {layers.map((layer) => (
            <GridLayerView key={layer.id} layer={layer} world={world} memberText={memberText} />
          ))}
        </Canvas>
      </PlaneFrame>
      {layers.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-xs text-center text-xs text-muted-foreground">
            Nothing in this grid can be drawn yet. A heatmap reads an array or a sparse matrix over its rows and columns; cells read a
            table whose frame they are.
          </div>
        </div>
      )}
      <FitButton />
    </div>
  );
};

const FitButton = () => {
  const api = usePlaneStoreApi();
  return (
    <Button
      size="icon"
      variant="ghost"
      className="absolute left-[72px] top-3 h-6 w-6 border border-white/10 bg-zinc-950/70 p-0 text-foreground/60 hover:text-foreground"
      title="Fit (double-click the grid)"
      onClick={() => api.getState().fit()}
    >
      <Maximize2 className="h-3 w-3" />
    </Button>
  );
};

const toGql = (colormap: ColorMap): GqlColorMap => colormap as string as GqlColorMap;

const COLORMAP_CHOICES = [ColorMap.Viridis, ColorMap.Magma, ColorMap.Inferno, ColorMap.Plasma, ColorMap.Cool, ColorMap.Warm, ColorMap.Spectral, ColorMap.Grey].map(
  (value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase(), css: colormapGradientCSS(value) }),
);

/** One layer's card: what it reads, its colour scale and range, its opacity; hide and delete. */
const LayerCard = ({ layer }: { layer: GridLayerFragment }) => {
  const readout = useGridStore((s) => s.readouts[layer.id]);
  const [expanded, setExpanded] = useState(true);
  const [update] = useUpdateGridLayerMutation();
  const [remove] = useDeleteGridLayerMutation({ refetchQueries: [GetGridDocument] });
  const [opacity, setOpacity] = useState(layer.opacity);

  const write = useCallback(
    ({ colormap, ...patch }: { visible?: boolean; opacity?: number; colormap?: ColorMap; min?: number | null; max?: number | null }) =>
      update({
        // The renderer's colormap names are the server's enum values.
        variables: { input: { id: layer.id, ...patch, colormap: colormap ? toGql(colormap) : undefined } },
        optimisticResponse: {
          updateGridLayer: {
            __typename: layer.__typename,
            id: layer.id,
            name: layer.name,
            visible: patch.visible ?? layer.visible,
            order: layer.order,
            opacity: patch.opacity ?? layer.opacity,
            colormap: colormap ? toGql(colormap) : layer.colormap,
            min: "min" in patch ? (patch.min ?? null) : layer.min,
            max: "max" in patch ? (patch.max ?? null) : layer.max,
          },
        },
      }).catch((error: unknown) => reportError(error, `Couldn't save the change to ${layer.name ?? "the layer"}`)),
    [update, layer],
  );

  const source = layer.__typename === "CellsGridLayer" ? `${layer.tableDataset.name} · ${layer.valueColumn}` : (layer.lens.name ?? `${layer.lens.__typename} ${layer.lens.id}`);
  return (
    <LayerCardShell
      icon={<Grid3x3 className="h-3 w-3 text-sky-300" />}
      tile="bg-sky-400/15"
      title={layer.name ?? source}
      hidden={!layer.visible}
      expanded={expanded}
      onToggle={() => setExpanded((e) => !e)}
      actions={
        <>
          <Button size="icon" variant="ghost" className="h-5 w-5 p-0 text-foreground/45" title={layer.visible ? "Hide" : "Show"} onClick={() => void write({ visible: !layer.visible })}>
            {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 p-0 text-foreground/45 hover:text-destructive"
            title="Remove from the grid (the data stays)"
            onClick={() => void remove({ variables: { id: layer.id } }).catch((error: unknown) => reportError(error, "Couldn't remove the layer"))}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </>
      }
    >
      <CardSection title="colour">
        <ColormapSelect value={colormapOf(layer)} choices={COLORMAP_CHOICES} onChange={(value) => void write({ colormap: value as ColorMap })} />
        <div className="mt-1.5 flex items-center gap-1.5">
          <RangeInput label="min" value={layer.min} placeholder={readout?.lo} onCommit={(min) => void write({ min })} />
          <RangeInput label="max" value={layer.max} placeholder={readout?.hi} onCommit={(max) => void write({ max })} />
        </div>
      </CardSection>
      <OpacityRow opacity={opacity} onChange={setOpacity} onCommit={(value) => void write({ opacity: value })} />
      <div className="flex flex-col gap-0.5 px-1 pb-1 text-[10px] text-foreground/50">
        <span className="truncate" title={source}>
          {source}
        </span>
        {layer.placement !== "PLACED" && <span className="text-amber-300/80">not placed over this grid’s axes ({layer.placement.toLowerCase()})</span>}
        {readout?.loading && <span>reading…</span>}
        {readout?.note && <span>{readout.note}</span>}
        {readout?.error && <span className="text-destructive">{readout.error}</span>}
      </div>
    </LayerCardShell>
  );
};

/** A bound of the colour range; until one is set, the data's own range, shown as the placeholder. */
const RangeInput = ({ label, value, placeholder, onCommit }: { label: string; value: number | null | undefined; placeholder: number | null | undefined; onCommit: (v: number | null) => void }) => {
  const [text, setText] = useState(value == null ? "" : String(value));
  const commit = () => {
    const trimmed = text.trim();
    // A null in an update means "leave it": an empty field is only ever "auto" while nothing is set.
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed);
  };
  return (
    <label className="flex flex-1 items-center gap-1 text-[9px] uppercase tracking-wide text-foreground/40">
      {label}
      <Input
        className="h-5 px-1 font-mono text-[10px]"
        value={text}
        placeholder={placeholder != null && Number.isFinite(placeholder) ? formatSiValue(placeholder) : "auto"}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && commit()}
      />
    </label>
  );
};

const LayersSidebar = () => {
  const grid = useGrid();
  const layers = layersOf(grid);
  return (
    <div className="flex flex-col gap-1.5 p-2">
      {layers.length === 0 && <div className="p-2 text-xs text-muted-foreground">No layers yet.</div>}
      {[...layers].reverse().map((layer) => (
        <LayerCard key={layer.id} layer={layer} />
      ))}
    </div>
  );
};

export const Grid = { Provider, Viewport, LayersSidebar };
