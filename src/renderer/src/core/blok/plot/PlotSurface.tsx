import * as React from "react";
import { Canvas } from "@react-three/fiber";

import { renderChildList } from "@arkitektio/bsx/renderer/bloks/shared/index";
import {
  BlokNodeErrorSurface,
  useBlok,
  useValue,
  type BlokNodeErrorProps,
  type BlokRenderArgs,
} from "@arkitektio/bsx/runtime";
import { AxisCamera } from "@/core/data/plot/camera/AxisCamera";
import { AxisTicks } from "@/core/data/plot/chrome/AxisTicks";
import { TimeGrid } from "@/core/data/plot/chrome/TimeGrid";
import { ValueAxis } from "@/core/data/plot/chrome/ValueAxis";
import { StackLayoutManager } from "@/core/data/plot/layout/StackLayoutManager";
import type { StackableLayer } from "@/core/data/plot/layout/stackLayout";
import { PlotStoreContext, createPlotStore, type AnyPlotStoreState } from "@/core/data/plot/stores/plotStore";
import { RangeStoreContext, createRangeStore } from "@/core/data/plot/stores/rangeStore";
import { ViewerStoreContext, createViewerStore } from "@/core/data/plot/stores/viewerStore";
import { createWebGPURendererFactory } from "@/core/data/scene/gpu/createWebGPURenderer";
import { assertWebGPUSupported } from "@/core/data/scene/gpu/webgpuSupport";
import { useTabVisible } from "@/core/tabs/TabVisibilityContext";
import { useKeepTabLive } from "@/core/tabs/keepLive";
import { cn } from "@/core/util/utils";
import type { StoreApi } from "zustand/vanilla";

import { plotSchema } from "./index";
import {
  PlotMountsContext,
  usePlotMounts,
  usePlotNotice,
  type PlotAxis,
  type PlotMountLayer,
  type PlotMounts,
} from "./plotMounts";

const rendererFactory = createWebGPURendererFactory({ label: "plot" });

/** The narrowest window, as a share of what the mounts span: zoomed in a million times. */
const MIN_WIDTH_SHARE = 1e-6;

/**
 * The plot's stores, built once: a plot store whose layers are the mounts' rows,
 * the range store the camera projects, and the viewer store the rows and clims
 * live in. The origin is 0: a blok plot draws spectra and profiles, whose
 * positions float32 holds as they are.
 */
const createMounts = (axis: PlotAxis): PlotMounts => {
  const plot = createPlotStore<PlotMountLayer, Record<string, never>, null, object>(
    { layers: [], rawLayers: {}, timeOrigin: 0, worldSpan: null },
    { withPersisted: (layer) => layer, finestPeriodOf: () => 0 },
  );
  const range = createRangeStore({ worldSpan: null, minWidth: 0 });
  const viewer = createViewerStore([], { layoutMode: "STACKED" });
  const rows = new Map<string, PlotMountLayer>();
  let notices: ReadonlyMap<string, string> = new Map();
  const listeners = new Set<() => void>();
  const sync = () => plot.getState().syncLayers([...rows.values()], {}, null);

  // The window follows what the mounts span, until the viewer picks one.
  plot.subscribe((state, previous) => {
    if (state.worldSpan === previous.worldSpan) return;
    const span = state.worldSpan;
    range.getState().setWorld(span, span ? (span.end - span.start) * MIN_WIDTH_SHARE : 0);
  });

  return {
    axis,
    plot,
    range,
    viewer,
    register: ({ id, label, color, valueUnit }) => {
      rows.set(id, {
        id,
        typename: "PlotMount",
        kind: "mount",
        order: rows.size,
        visible: true,
        color,
        placeability: { drawable: true },
        span: null,
        persisted: {},
        label,
        valueUnit,
      });
      sync();
      return () => {
        rows.delete(id);
        plot.getState().reportSpan(id, null);
        viewer.getState().clearLayer(id);
        sync();
      };
    },
    reportSpan: (id, span) => plot.getState().reportSpan(id, span),
    notice: (id, text) => {
      if ((notices.get(id) ?? null) === text) return;
      const next = new Map(notices);
      if (text === null) next.delete(id);
      else next.set(id, text);
      notices = next;
      listeners.forEach((listener) => listener());
    },
    notices: () => notices,
    subscribeNotices: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
};

const rowOf = (layer: PlotMountLayer): StackableLayer => ({
  id: layer.id,
  label: layer.label,
  color: layer.color,
  valueUnit: layer.valueUnit,
  valueDimension: null,
  channelCount: 1,
});

const Message = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-muted-foreground">{children}</div>
);

/** Inside the canvas an error cannot be a card: it is said over the plot. */
const PlotErrorSurface = ({ componentId, title, detail }: BlokNodeErrorProps) => {
  usePlotNotice(usePlotMounts(), `error:${componentId}`, detail ? `${title}: ${detail}` : title);
  return null;
};

const PlotNotices = ({ mounts }: { mounts: PlotMounts }) => {
  const notices = React.useSyncExternalStore(mounts.subscribeNotices, mounts.notices);
  if (notices.size === 0) return null;
  return (
    <div className="pointer-events-none absolute left-2 top-2 flex max-w-[80%] flex-col gap-1">
      {[...notices.entries()].map(([id, text]) => (
        <div key={id} className="rounded-md bg-background/80 px-2 py-1 text-xs text-warning">
          {text}
        </div>
      ))}
    </div>
  );
};

/** What the plot draws: the camera over its window, the mounts in the canvas, the axes over it. */
const PlotCanvas = ({ mounts, children }: { mounts: PlotMounts; children: React.ReactNode }) => {
  const visible = useTabVisible();
  useKeepTabLive();
  React.useEffect(() => {
    const viewer = mounts.viewer.getState();
    viewer.setShowValueAxis(true);
    viewer.setShowGrid(true);
  }, [mounts]);
  return (
    <>
      <StackLayoutManager<PlotMountLayer> rowOf={rowOf} />
      <div className="absolute inset-x-0 top-0 bottom-12">
        <Canvas frameloop={visible ? "demand" : "never"} gl={rendererFactory}>
          <PlotMountsContext.Provider value={mounts}>
            <BlokNodeErrorSurface.Provider value={PlotErrorSurface}>
              <AxisCamera />
              {children}
            </BlokNodeErrorSurface.Provider>
          </PlotMountsContext.Provider>
        </Canvas>
      </div>
      <TimeGrid />
      <ValueAxis />
      <AxisTicks unit={mounts.axis.unit} label={mounts.axis.name} />
      <PlotNotices mounts={mounts} />
    </>
  );
};

export const PlotRender = ({ component, buildChild }: BlokRenderArgs) => {
  const blok = useBlok(component, plotSchema);
  const name = useValue(blok.axis) ?? "";
  const type = useValue(blok.type) ?? "SPECTRUM";
  const unit = useValue(blok.unit) ?? null;
  const reference = useValue(blok.reference) ?? null;
  const height = useValue(blok.height) ?? "20rem";
  const className = useValue(blok.className);

  // A different axis is a different plot: what the mounts converted into is gone.
  const mounts = React.useMemo(
    () => createMounts({ name, type, unit, reference }),
    [name, type, unit, reference],
  );
  const [gpu, setGpu] = React.useState<"checking" | "ready" | string>("checking");
  React.useEffect(() => {
    let cancelled = false;
    assertWebGPUSupported()
      .then(() => !cancelled && setGpu("ready"))
      .catch((error: unknown) => !cancelled && setGpu(error instanceof Error ? error.message : String(error)));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={cn("dark relative w-full select-none overflow-hidden rounded-lg bg-black text-foreground", className)}
      style={{ height }}
    >
      <PlotStoreContext.Provider value={mounts.plot as unknown as StoreApi<AnyPlotStoreState>}>
        <RangeStoreContext.Provider value={mounts.range}>
          <ViewerStoreContext.Provider value={mounts.viewer}>
            {gpu === "ready" ? (
              <PlotCanvas mounts={mounts}>{renderChildList(component.children, buildChild)}</PlotCanvas>
            ) : (
              <Message>{gpu === "checking" ? "Preparing the plot…" : `This plot cannot be drawn: ${gpu}`}</Message>
            )}
          </ViewerStoreContext.Provider>
        </RangeStoreContext.Provider>
      </PlotStoreContext.Provider>
    </div>
  );
};
