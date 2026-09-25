import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useCallback } from "react";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/components/ui/button";
import { useLayerWrite } from "../../platform/edits/useLayerWrite";
import { reorderedOrders } from "../../platform/model/layerOrder";
import {
  isLayerHidden,
  useExperimentStore,
  useExperimentStoreApi,
} from "../../platform/stores/experimentStore";
import { isLayerTypename } from "../layerRegistry";
import { LAYER_CARDS } from "./cardRegistry";

/**
 * Every layer of the experiment, as cards, in draw order.
 *
 * Owns ordering and the visibility toggle; knows nothing about which card is which
 * — that is the registry's job. Both edits are PERSISTED and optimistic
 * (`useLayerWrite`): the stack changes on the click, and a failed write puts it
 * back with a toast.
 *
 * Sections with nothing to show render nothing (the "no empty panels" rule).
 */
export const LayerControlPanel = ({ variant = "sidebar" }: { variant?: "sidebar" | "floating" }) => {
  const layers = useExperimentStore((s) => s.layers);
  const experimentId = useExperimentStore((s) => s.experimentId);
  const api = useExperimentStoreApi();
  const write = useLayerWrite();
  const { openDialog } = useDialog();
  const addLayer = () => openDialog("addexperimentlayer", { experiment: experimentId }, { size: "medium" });

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

  const shown = layers.filter((l) => isLayerTypename(l.typename));
  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 p-4 text-xs text-muted-foreground">
        This experiment has no layers.
        <Button size="sm" variant="outline" onClick={addLayer}>
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
        <Button size="xs" variant="ghost" onClick={addLayer} title="Add a trace, spikes, events or annotations">
          <Plus className="h-3.5 w-3.5" /> Add layer
        </Button>
      </div>
      {shown.map((layer, index) => {
        const entry = LAYER_CARDS[layer.typename as keyof typeof LAYER_CARDS];
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
