import { formatShape } from "@/lib/arrays/formatShape";
import { formatDisplay } from "@/lib/quantities";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ElektroExperiment, ElektroNeuronModel } from "@/linkers";
import { arrayDatasetSpecLink, specsOf } from "../../specs";
import { GetArrayDatasetQuery } from "../../api/graphql";
import HistoryCard from "../cards/HistoryCard";
import { Fact, SectionHeader } from "./sidebarParts";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/**
 * Everything about the dataset that is not the timeline: what it is, how it is
 * stored, where it came from, which experiments draw it, and how it has been
 * edited — mikro's `DatasetInfoSidebar`, for a signal instead of an image.
 * Sections with nothing to say are left out.
 */
export const DatasetInfoSidebar = ({ dataset }: { dataset: PageDataset }) => {
  const experiments = [
    ...new Map(dataset.experimentLayers.map((layer) => [layer.experiment.id, layer.experiment])).values(),
  ];
  const levels = [...dataset.dataArrays].sort((a, b) => a.level - b.level);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        <h2 className="break-all text-lg font-semibold">{dataset.name}</h2>
        {dataset.description && (
          <p className="text-sm text-muted-foreground">{dataset.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Fact label="Shape" value={formatShape(dataset.axisNames, dataset.shape)} />
        <Fact label="Unit" value={dataset.valueUnit} />
        <Fact label="Dimension" value={dataset.valueDimension} />
        <Fact label="Grid" value={dataset.intrinsicSystem?.name} />
        <Fact label="Folder" value={dataset.folder?.name} />
      </div>

      {dataset.spec.length > 0 && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Kind" />
          <div className="flex flex-wrap gap-1">
            {specsOf(dataset.spec).map((entry) => (
              <Link key={entry.spec} to={arrayDatasetSpecLink(entry.slug)} title={entry.description}>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <entry.icon className="h-3 w-3" />
                  {entry.short}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {dataset.simulation && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Simulated" />
          <Fact
            label="Model"
            value={
              <ElektroNeuronModel.DetailLink
                object={dataset.simulation.model}
                className="underline-offset-2 hover:underline"
              >
                {dataset.simulation.model.name}
              </ElektroNeuronModel.DetailLink>
            }
          />
          <Fact label="Duration" value={formatDisplay(dataset.simulation.duration)} />
          <Fact label="dt" value={dataset.simulation.dt ? formatDisplay(dataset.simulation.dt) : null} />
        </div>
      )}

      {dataset.multiscale && levels.length > 1 && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Levels" count={levels.length} />
          {levels.map((array) => (
            <Fact key={array.id} label={`L${array.level}`} value={formatShape(dataset.axisNames, array.shape)} />
          ))}
        </div>
      )}

      {experiments.length > 0 && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Experiments" count={experiments.length} />
          {experiments.map((experiment) => (
            <ElektroExperiment.DetailLink
              key={experiment.id}
              object={experiment}
              className="truncate text-xs underline-offset-2 hover:underline"
            >
              {experiment.name}
            </ElektroExperiment.DetailLink>
          ))}
        </div>
      )}

      {dataset.provenanceEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader title="Provenance" count={dataset.provenanceEntries.length} />
          {dataset.provenanceEntries.map((entry) => (
            <HistoryCard key={entry.id} history={entry} />
          ))}
        </div>
      )}
    </div>
  );
};
