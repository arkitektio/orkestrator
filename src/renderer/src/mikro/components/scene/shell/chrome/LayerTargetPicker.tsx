import { useMemo, type ReactNode } from "react";
import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Check, Crosshair } from "lucide-react";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { LayerGlyph } from "../../platform/layerui/LayerGlyph";
import {
  effectiveDataLayerId,
  effectiveInfoLayerIds,
} from "../../platform/probe/probeTargeting";
import { identityOf } from "../../platform/model/objectIdentity";
import type { LayerState } from "../../platform/model/layerModel";
import { useModeStore } from "../../platform/stores/modeStore";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";

/**
 * Which layers the scene's pointer work involves, as one control-bar button
 * (`platform/probe/probeTargeting.ts` has the rules):
 *
 *  - the DATA layer: what tasks and new annotations use;
 *  - the layers shown UNDER THE CURSOR: the readout's values and attribute
 *    rows, read at the hit;
 *  - in 3D, the layer the RAY STOPS IN, which decides the depth.
 *
 * The trigger names the data layer; its crosshair lights when, in 3D, the
 * ray stops in another layer. Choosing only sets these — it never switches
 * the scene into PROBE mode, since the user may just be setting up for later.
 */
export const LayerTargetPicker = () => {
  const dataLayerId = useViewerStore((s) => s.dataLayerId);
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const is3D = useModeStore((s) => s.displayMode === "3D");
  // The data layer object itself: its identity only moves when THAT layer is
  // edited, so the bar does not re-render on every other layer's tick.
  const data = useSceneStore((s) => {
    const id = effectiveDataLayerId(dataLayerId, s.layers);
    return s.layers.find((layer) => layer.id === id) ?? null;
  });
  // Only an alive, visible pin sends the ray elsewhere (`effectiveHitLayerId`).
  const rayElsewhere = useSceneStore(
    (s) =>
      is3D &&
      probeLayerId !== null &&
      probeLayerId !== data?.id &&
      s.layers.some((layer) => layer.id === probeLayerId && layer.visible !== false),
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          size={"xs"}
          className="h-7 gap-1 bg-black px-1.5 text-white/80"
          disabled={data === null}
          title={
            data === null
              ? "No layer to work on"
              : `Tasks and annotations use ${layerDisplayLabel(data)}${
                  rayElsewhere ? "; the ray stops in another layer" : ""
                } — click to choose`
          }
        >
          <Crosshair
            className={`h-3.5 w-3.5 shrink-0 ${rayElsewhere ? "text-brand" : "text-white/50"}`}
          />
          {data && <span className="max-w-32 truncate text-xs">{layerDisplayLabel(data)}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1">
        <LayerTargetList is3D={is3D} />
      </PopoverContent>
    </Popover>
  );
};

const Heading = ({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) => (
  <div className="px-2 pb-0.5 pt-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium">{title}</span>
      {action}
    </div>
    <div className="text-[10px] leading-4 text-muted-foreground">{hint}</div>
  </div>
);

const Row = ({
  selected,
  onClick,
  children,
  disabled = false,
  title,
  mark = "check",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
  /** A check after the label (one of several), or a box before it (any of several). */
  mark?: "check" | "box";
}) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    role={mark === "box" ? "menuitemcheckbox" : "menuitemradio"}
    aria-checked={selected}
    onClick={onClick}
    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
  >
    {mark === "box" && (
      <span
        className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border ${
          selected ? "border-foreground/60 bg-foreground/10" : "border-foreground/25"
        }`}
      >
        {selected && <Check className="h-2.5 w-2.5" />}
      </span>
    )}
    {children}
    {mark === "check" && selected && <Check className="ml-auto h-3 w-3 shrink-0" />}
  </button>
);

const LayerName = ({ layer, note }: { layer: LayerState; note?: string }) => (
  <>
    <LayerGlyph layer={layer} className="h-3.5 w-3.5 shrink-0" />
    <span className="min-w-0 truncate">{layerDisplayLabel(layer)}</span>
    {note && <span className="shrink-0 text-[10px] text-muted-foreground">{note}</span>}
  </>
);

/**
 * The choices. Mounted only while the popover is open, so each opening reads
 * the layers afresh; while open it re-renders on a SCALAR key (P9c/P17) over
 * what a row names — identity, visibility and the label inputs — never on a
 * per-tick layer edit.
 */
const LayerTargetList = ({ is3D }: { is3D: boolean }) => {
  const dataLayerId = useViewerStore((s) => s.dataLayerId);
  const infoLayerIds = useViewerStore((s) => s.infoLayerIds);
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const setDataLayerId = useViewerStore((s) => s.setDataLayerId);
  const setInfoLayerIds = useViewerStore((s) => s.setInfoLayerIds);
  const setProbeLayerId = useViewerStore((s) => s.setProbeLayerId);
  const sceneStoreApi = useSceneStoreApi();
  const layersKey = useSceneStore((s) =>
    s.layers
      .map(
        (l) =>
          `${l.id}:${l.visible === false ? 0 : 1}:${l.name ?? ""}:${l.__typename}:${identityOf(
            l.lens,
          )}:${l.phasors.length}:${l.channels.length}`,
      )
      .join("|"),
  );
  // The key STANDS FOR the layers array read via getState().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layers = useMemo(() => sceneStoreApi.getState().layers, [layersKey, sceneStoreApi]);
  const firstVisible = layers.find((layer) => layer.visible !== false);
  const visible = layers.filter((layer) => layer.visible !== false);

  // A dead pin reads as the default without being erased — it heals by
  // derivation and resurrects if its layer comes back.
  const dataPin = layers.some((layer) => layer.id === dataLayerId) ? dataLayerId : null;
  const data = effectiveDataLayerId(dataLayerId, layers);
  const info = effectiveInfoLayerIds({ dataLayerId, infoLayerIds }, layers);
  const rayPin = visible.some((layer) => layer.id === probeLayerId) ? probeLayerId : null;

  // Toggling writes an explicit set, starting from what is shown now — the
  // default (the data layer) included.
  const toggleInfo = (layerId: string) =>
    setInfoLayerIds(
      info.includes(layerId) ? info.filter((id) => id !== layerId) : [...info, layerId],
    );

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <Heading title="Data layer" hint="What tasks and new annotations use." />
      <Row selected={dataPin === null} onClick={() => setDataLayerId(null)}>
        <span className="min-w-0 truncate">
          Auto
          <span className="text-muted-foreground">
            {firstVisible ? ` — ${layerDisplayLabel(firstVisible)}` : " — no visible layer"}
          </span>
        </span>
      </Row>
      {layers.map((layer) => (
        // A task reads the lens, not the pixels: a hidden layer is a fine choice.
        <Row key={layer.id} selected={dataPin === layer.id} onClick={() => setDataLayerId(layer.id)}>
          <LayerName layer={layer} note={layer.visible === false ? "hidden" : undefined} />
        </Row>
      ))}

      <div className="my-1 border-t" />
      <Heading
        title="Show under cursor"
        hint={
          infoLayerIds === null
            ? "The probe's values and attributes. Follows the data layer."
            : "The probe's values and attributes."
        }
        action={
          infoLayerIds !== null && (
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground"
              title="Show the data layer only, and follow it again"
              onClick={() => setInfoLayerIds(null)}
            >
              Reset
            </button>
          )
        }
      />
      {layers.map((layer) => {
        // Only visible layers have anything resident to read.
        const hidden = layer.visible === false;
        return (
          <Row
            key={layer.id}
            mark="box"
            selected={info.includes(layer.id)}
            onClick={() => toggleInfo(layer.id)}
            disabled={hidden}
            title={hidden ? "A hidden layer has nothing loaded to show" : undefined}
          >
            <LayerName layer={layer} note={layer.id === data ? "data" : undefined} />
          </Row>
        );
      })}

      {is3D && (
        <>
          <div className="my-1 border-t" />
          <Heading title="Ray stops in" hint="Which volume decides the depth the probe reads at." />
          <Row selected={rayPin === null} onClick={() => setProbeLayerId(null)}>
            <span className="min-w-0 truncate">Same as data layer</span>
          </Row>
          {layers.map((layer) => {
            // A hidden layer draws no mesh, so a ray cannot stop in it.
            const hidden = layer.visible === false;
            return (
              <Row
                key={layer.id}
                selected={rayPin === layer.id}
                onClick={() => setProbeLayerId(layer.id)}
                disabled={hidden}
                title={hidden ? "A hidden layer cannot stop the ray" : undefined}
              >
                <LayerName layer={layer} />
              </Row>
            );
          })}
        </>
      )}
    </div>
  );
};
