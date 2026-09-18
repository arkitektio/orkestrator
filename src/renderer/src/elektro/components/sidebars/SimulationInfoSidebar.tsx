import Timestamp from "@/components/ui/timestamp";
import { ElektroNeuronModel } from "@/linkers";
import { UserInfo } from "@/lok-next/components/protected/UserInfo";
import { DetailSimulationFragment } from "../../api/graphql";
import { siteLabelOf, sitesOf, whereOf, type SiteKind } from "../../lib/sites";
import { getColorForRecording, getColorForStimulus } from "../../lib/traceColor";
import { neuronModelCounts } from "../neuronmodel/counts";

/** One labelled fact, in the rail's usual label / value row. */
const Fact = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | null | undefined;
}) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
};

const SectionHeader = ({ title, count }: { title: string; count?: number }) => (
  <div className="flex flex-row items-baseline justify-between gap-2">
    <div className="text-xs font-semibold">{title}</div>
    {count !== undefined && (
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    )}
  </div>
);

/**
 * One recording or stimulus: its colour (matching its marker on the model),
 * what it is called, and where on the cell it sits. A dataset whose anchors
 * name no site shows its own name and no "where" line.
 */
const TraceRow = ({
  dataset,
  kind,
}: {
  dataset: DetailSimulationFragment["recordings"][number];
  kind: SiteKind;
}) => {
  const sites = sitesOf(dataset, kind);
  const first = sites[0];
  const color = first
    ? kind === "recording"
      ? getColorForRecording(first)
      : getColorForStimulus(first)
    : "hsl(0, 0%, 60%)";
  const where = sites.map(whereOf).filter(Boolean).join(", ") || null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{siteLabelOf(dataset, kind)}</span>
        {where && (
          <span className="truncate font-mono text-[0.625rem] text-muted-foreground">{where}</span>
        )}
      </span>
    </div>
  );
};

/**
 * Everything about the simulation that is not the model: how it was run, on
 * what, by whom, and what it recorded and stimulated. The traces themselves
 * are drawn on a timeline ("Open on timeline"), not here.
 *
 * Mirrors `DatasetInfoSidebar` / `NeuronModelInfoSidebar`: the content area is
 * the picture, so the facts move into one Info tab in the rail.
 */
export const SimulationInfoSidebar = ({
  simulation,
}: {
  simulation: DetailSimulationFragment;
}) => {
  const model = simulation.model;
  const counts = model ? neuronModelCounts(model) : undefined;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        <h2 className="break-all text-lg font-semibold">{simulation.name}</h2>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Run</div>
        {/* Quantities arrive as wire strings ("100 ms") and are shown as
            written rather than re-united. */}
        <Fact label="Duration" value={simulation.duration} />
        <Fact label="dt" value={simulation.dt} />
        <Fact
          label="Created"
          value={<Timestamp date={new Date(simulation.createdAt)} relative />}
        />
        {simulation.creator?.sub && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">By</span>
            <UserInfo sub={simulation.creator.sub} />
          </div>
        )}
      </div>

      {model && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Model</div>
          <ElektroNeuronModel.DetailLink
            object={model}
            className="break-all font-mono text-xs text-muted-foreground"
          >
            {model.name}
          </ElektroNeuronModel.DetailLink>
          {counts && (
            <div className="font-mono text-[0.625rem] text-muted-foreground">
              {counts.cells} {counts.cells === 1 ? "cell" : "cells"} ·{" "}
              {counts.sections} sections
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <SectionHeader title="Recordings" count={simulation.recordings.length} />
        {simulation.recordings.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nothing was recorded.</span>
        ) : (
          simulation.recordings.map((dataset) => (
            <TraceRow key={dataset.id} dataset={dataset} kind="recording" />
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader title="Stimuli" count={simulation.stimuli.length} />
        {simulation.stimuli.length === 0 ? (
          <span className="text-xs text-muted-foreground">No stimulus was applied.</span>
        ) : (
          simulation.stimuli.map((dataset) => (
            <TraceRow key={dataset.id} dataset={dataset} kind="stimulus" />
          ))
        )}
      </div>
    </div>
  );
};
