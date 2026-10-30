import { useMemo, type ReactNode } from "react";
import { Button } from "@/core/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { Check } from "lucide-react";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { LayerGlyph, LayerProbeMark } from "../../platform/layerui/LayerGlyph";
import {
  effectiveDataLayerId,
  effectiveHitLayerId,
} from "../../platform/probe/probeTargeting";
import { identityOf } from "../../platform/model/objectIdentity";
import type { LayerState } from "../../platform/model/layerModel";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { BarTooltip } from "./BarTooltip";

/**
 * Which layers the scene's pointer work involves, as one control-bar button
 * (`platform/probe/probeTargeting.ts` has the rules):
 *
 *  - the DATA layer: what tasks and new annotations use;
 *  - the PROBE layer: where the pointer lands, in 3D the volume the ray stops
 *    in. Every visible layer is read at that point, so there is nothing else
 *    to choose.
 *
 * The trigger draws the probe's symbol in the probed layer's colours and names
 * the data layer.
 * Choosing only sets these — it never switches the scene into PROBE mode,
 * since the user may just be setting up for later.
 */
export const LayerTargetPicker = () => {
  const dataLayerId = useViewerStore((s) => s.dataLayerId);
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const pickLayerId = useViewerStore((s) => s.pickLayerId);
  // The layer objects themselves: their identity only moves when THAT layer is
  // edited, so the bar does not re-render on every other layer's tick.
  const data = useSceneStore((s) => {
    const id = effectiveDataLayerId(dataLayerId, s.layers);
    return s.layers.find((layer) => layer.id === id) ?? null;
  });
  const probed = useSceneStore((s) => {
    const id = effectiveHitLayerId({ dataLayerId, probeLayerId, pickLayerId }, s.layers);
    return s.layers.find((layer) => layer.id === id) ?? null;
  });

  return (
    <Popover>
      <BarTooltip
        label={
          <div className="space-y-0.5">
            {probed && (
              <div className="flex items-center gap-1.5">
                <LayerProbeMark layer={probed} className="h-3 w-3" />
                <span className="min-w-0 truncate">Probing {layerDisplayLabel(probed)}</span>
              </div>
            )}
            {data && <div className="truncate">Tasks and annotations use {layerDisplayLabel(data)}</div>}
          </div>
        }
      >
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            size={"xs"}
            className="h-7 gap-1 bg-black px-1.5 text-white/80"
            disabled={data === null}
          >
            {probed && <LayerProbeMark layer={probed} className="h-3.5 w-3.5" />}
            {data && <span className="max-w-32 truncate text-xs">{layerDisplayLabel(data)}</span>}
          </Button>
        </PopoverTrigger>
      </BarTooltip>
      {/* Focus going back to the trigger would reopen the tooltip on close. */}
      <PopoverContent
        align="end"
        className="w-60 p-1"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <LayerTargetList />
      </PopoverContent>
    </Popover>
  );
};

const Heading = ({ title, hint }: { title: string; hint: string }) => (
  <div className="px-2 pb-0.5 pt-1.5">
    <span className="text-xs font-medium">{title}</span>
    <div className="text-[10px] leading-4 text-muted-foreground">{hint}</div>
  </div>
);

const Row = ({
  selected,
  onClick,
  children,
  disabled = false,
  title,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    disabled={disabled}
    title={title}
    role="menuitemradio"
    aria-checked={selected}
    onClick={onClick}
    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
  >
    {children}
    {selected && <Check className="ml-auto h-3 w-3 shrink-0" />}
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
const LayerTargetList = () => {
  const dataLayerId = useViewerStore((s) => s.dataLayerId);
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const setDataLayerId = useViewerStore((s) => s.setDataLayerId);
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
  const visible = layers.filter((layer) => layer.visible !== false);

  // A dead pin reads as the default without being erased — it heals by
  // derivation and resurrects if its layer comes back.
  const dataPin = layers.some((layer) => layer.id === dataLayerId) ? dataLayerId : null;
  const probePin = visible.some((layer) => layer.id === probeLayerId) ? probeLayerId : null;

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <Heading title="Data layer" hint="What tasks and new annotations use." />
      <Row selected={dataPin === null} onClick={() => setDataLayerId(null)}>
        <span className="min-w-0 truncate">
          Auto
          <span className="text-muted-foreground">
            {visible[0] ? ` — ${layerDisplayLabel(visible[0])}` : " — no visible layer"}
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
        title="Probe"
        hint="Where the pointer lands; in 3D, the volume the ray stops in. Every visible layer is read there."
      />
      <Row selected={probePin === null} onClick={() => setProbeLayerId(null)}>
        <span className="min-w-0 truncate">Same as data layer</span>
      </Row>
      {layers.map((layer) => {
        // A hidden layer draws no mesh, so the pointer cannot land on it.
        const hidden = layer.visible === false;
        return (
          <Row
            key={layer.id}
            selected={probePin === layer.id}
            onClick={() => setProbeLayerId(layer.id)}
            disabled={hidden}
            title={hidden ? "A hidden layer cannot be probed" : undefined}
          >
            <LayerName layer={layer} />
          </Row>
        );
      })}
    </div>
  );
};
