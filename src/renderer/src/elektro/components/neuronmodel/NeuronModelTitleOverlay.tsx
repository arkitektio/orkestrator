import { Badge } from "@/components/ui/badge";
import { ElektroNeuronModel } from "@/linkers";
import { DetailNeuronModelFragment } from "../../api/graphql";
import { neuronModelCounts } from "./counts";

/**
 * What the page is *about*, said once and quietly: the model's name and the
 * size of what is drawn underneath. The counterpart of `mikro-next`'s
 * `DatasetTitleOverlay` — positioned by the page, not by the renderer, so it
 * stays put whatever the viewport does. The detail (globals, ions, history)
 * lives in the Info sidebar tab instead.
 *
 * `z-40` clears the renderer's own HUD; the card opts into pointer events on
 * its own, so the canvas stays orbitable all around it.
 */
export const NeuronModelTitleOverlay = ({
  model,
}: {
  model: DetailNeuronModelFragment;
}) => {
  const counts = neuronModelCounts(model);
  const hasNetwork = counts.synapses + counts.stimulators + counts.connections > 0;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-40 flex w-[50%] flex-col gap-0.5">
      {/* `break-all` for the same reason as the dataset title: names are often
          one long token, and the tail is what tells two apart. */}
      <ElektroNeuronModel.DetailLink
        object={model}
        className="pointer-events-auto w-fit max-w-full break-all text-3xl font-semibold leading-tight"
      >
        {model.name}
      </ElektroNeuronModel.DetailLink>
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="shrink-0">
          {counts.cells} {counts.cells === 1 ? "cell" : "cells"}
        </span>
        <span className="shrink-0">{counts.sections} sections</span>
        {hasNetwork && (
          <Badge variant="outline" className="font-sans text-[0.625rem]">
            network
          </Badge>
        )}
      </div>
    </div>
  );
};
