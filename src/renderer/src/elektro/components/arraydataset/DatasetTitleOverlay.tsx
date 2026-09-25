import { Badge } from "@/core/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { formatShape } from "@/core/lib/arrays/formatShape";
import { ElektroArrayDataset, ElektroNeuronModel } from "@/core/linkers";
import { GetArrayDatasetQuery } from "../../api/graphql";
import { CreateExperimentControl } from "./DatasetBackdrop";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/**
 * What the page is about, said once: the dataset's name, its shape, where it
 * came from, and which experiment is on screen — mikro's `DatasetTitleOverlay`.
 *
 * A strip ABOVE the timeline rather than floated over it: the timeline's row
 * labels own the viewport's top-left corner, where mikro's card sits.
 *
 * No default experiment (the schema nominates none), so no star: the switcher
 * lands on the first experiment drawing the dataset.
 */
export const DatasetTitleOverlay = ({
  dataset,
  experiments,
  activeExperimentId,
  onSelectExperiment,
  experimentLoading,
}: {
  dataset: PageDataset;
  experiments: readonly { id: string; name: string }[];
  activeExperimentId: string | undefined;
  onSelectExperiment: (id: string) => void;
  experimentLoading: boolean;
}) => (
  <div className="flex flex-col gap-2 px-3 pb-2 pt-3">
    <div className="flex min-w-0 flex-col gap-0.5">
      {/* `break-all`: a dataset name is usually one long token, and its tail is
          the part that tells them apart. */}
      <ElektroArrayDataset.DetailLink
        object={dataset}
        className="truncate break-all text-2xl font-semibold leading-tight"
      >
        {dataset.name}
      </ElektroArrayDataset.DetailLink>
      <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="truncate">{formatShape(dataset.axisNames, dataset.shape)}</span>
        {dataset.valueUnit && <span className="shrink-0">{dataset.valueUnit}</span>}
        {dataset.multiscale && (
          <Badge variant="outline" className="font-sans text-[0.625rem]">
            multiscale
          </Badge>
        )}
        {dataset.simulation && (
          <span className="shrink-0 font-sans">
            simulated with{" "}
            <ElektroNeuronModel.DetailLink
              object={dataset.simulation.model}
              className="underline-offset-2 hover:underline"
            >
              {dataset.simulation.model.name}
            </ElektroNeuronModel.DetailLink>
          </span>
        )}
      </div>
    </div>

    {experiments.length > 0 && (
      <div className="flex flex-row items-center gap-2">
        <Select value={activeExperimentId} onValueChange={onSelectExperiment}>
          <SelectTrigger className="h-7 w-64 max-w-[40%] bg-black">
            <SelectValue placeholder="Experiment" />
          </SelectTrigger>
          <SelectContent>
            {experiments.map((experiment) => (
              <SelectItem key={experiment.id} value={experiment.id}>
                {experiment.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* A secondary way to add one — the backdrop's button is the primary. */}
        <CreateExperimentControl
          dataset={dataset}
          size="sm"
          variant="outline"
          onCreated={onSelectExperiment}
        />
        {experimentLoading && (
          <span className="text-xs text-muted-foreground">Loading experiment…</span>
        )}
      </div>
    )}
  </div>
);
