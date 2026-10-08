import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useCallback, type ComponentType } from "react";
import { Button } from "@/core/ui/button";
import { reorderedOrders } from "../model/layerOrder";
import { isLayerHidden, usePlotStore, usePlotStoreApi, type AnyPlotLayer } from "../stores/plotStore";
import type { LayerCardProps } from "./cardShell";

/** Which card shows which layer kind, keyed by typename — the module's registry. */
export type LayerCards<L> = Readonly<Record<string, { Card: ComponentType<LayerCardProps<L>> }>>;

/**
 * Every layer of the plot, as cards, in draw order.
 *
 * Owns ordering and the visibility toggle; knows nothing about which card is which
 * — that is the registry's job — nor how an edit is saved: `write` is the
 * module's optimistic, persisted write. The stack changes on the click, and a
 * failed write puts it back.
 *
 * Sections with nothing to show render nothing (the "no empty panels" rule).
 */
export const LayerControlPanel = <L extends AnyPlotLayer>({
  cards,
  write,
  onAddLayer,
  emptyText,
  addTitle,
  variant = "sidebar",
}: {
  cards: LayerCards<L>;
  /** Persist a visibility or order edit. */
  write: (layerId: string, patch: { visible?: boolean; order?: number }) => unknown;
  onAddLayer: () => void;
  /** Said when there is no layer of a kind this client draws. */
  emptyText: string;
  /** The add button's tooltip: what kinds can be added. */
  addTitle: string;
  variant?: "sidebar" | "floating";
}) => {
  const layers = usePlotStore((s) => s.layers) as readonly L[];
  const api = usePlotStoreApi();

  const onToggleHidden = useCallback(
    (id: string, hidden: boolean) => void write(id, { visible: !hidden }),
    [write],
  );

  const move = useCallback(
    (id: string, by: -1 | 1) => {
      const current = api.getState().layers;
      for (const change of reorderedOrders(current, id, by)) {
        void write(change.id, { order: change.order });
      }
    },
    [api, write],
  );

  const shown = layers.filter((l) => l.typename in cards);
  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 p-4 text-xs text-muted-foreground">
        {emptyText}
        <Button size="sm" variant="outline" onClick={onAddLayer}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add a layer
        </Button>
      </div>
    );
  }

  return (
    <div
      className={
        variant === "sidebar"
          ? "flex flex-col gap-1.5 overflow-y-auto p-3"
          : "flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto rounded-md bg-background/80 p-2 backdrop-blur"
      }
    >
      <div className="flex items-center justify-end">
        <Button size="xs" variant="ghost" onClick={onAddLayer} title={addTitle}>
          <Plus className="h-3.5 w-3.5" /> Add layer
        </Button>
      </div>
      {shown.map((layer, index) => {
        const entry = cards[layer.typename];
        return (
          <div key={layer.id} className="group/layer flex items-stretch gap-1">
            <div className="flex flex-col justify-center opacity-0 transition-opacity group-hover/layer:opacity-100">
              <Button
                size="icon-xs"
                variant="ghost"
                title="Draw earlier (under the layers below)"
                disabled={index === 0}
                onClick={() => move(layer.id, -1)}
              >
                <ChevronUp />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                title="Draw later (over the layers above)"
                disabled={index === shown.length - 1}
                onClick={() => move(layer.id, 1)}
              >
                <ChevronDown />
              </Button>
            </div>
            <div className="min-w-0 flex-1">
              <entry.Card layer={layer} hidden={isLayerHidden(layer)} onToggleHidden={onToggleHidden} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
