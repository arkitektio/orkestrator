import Timestamp from "@/components/ui/timestamp";
import { cn } from "@/lib/utils";
import {
  ElektroNeuronModel,
  ElektroRecording,
  ElektroStimulus,
} from "@/linkers";
import { UserInfo } from "@/lok-next/components/protected/UserInfo";
import { Eye, EyeOff } from "lucide-react";
import { DetailSimulationFragment } from "../../api/graphql";
import {
  getColorForRecordingView,
  getColorForStimulusView,
} from "../ExperimentRender.utils";
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
 * One trace in the plot: its colour swatch, where on the cell it sits, and an
 * eye to hide it. The row toggles; only the label links away, so hiding a
 * trace never navigates by accident.
 */
const TraceRow = ({
  color,
  label,
  where,
  hidden,
  onToggle,
  link,
}: {
  color: string;
  label: string;
  where: string;
  hidden: boolean;
  onToggle: () => void;
  link: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 transition-colors hover:bg-accent/50",
      hidden && "opacity-50",
    )}
  >
    <button
      type="button"
      onClick={onToggle}
      className="flex min-w-0 flex-1 items-center gap-2 text-left"
      title={hidden ? "Show in plot" : "Hide from plot"}
    >
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium">{label}</span>
        <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
          {where}
        </span>
      </span>
      {hidden ? (
        <EyeOff className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <Eye className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
    {link}
  </div>
);

/** "cell · location(position)" — the point on the model a trace belongs to. */
const whereOf = (view: { cell: string; location: string; position: number }) =>
  `${view.cell} · ${view.location}(${view.position})`;

/**
 * Everything about the simulation that is not the plot: how it was run, on
 * what, by whom, and the legend of what is drawn — which doubles as the
 * visibility toggle the page used to render as a row of cards under the
 * chart.
 *
 * Mirrors `DatasetInfoSidebar` / `NeuronModelInfoSidebar`: the content area is
 * the picture, so the facts move into one Info tab in the rail.
 */
export const SimulationInfoSidebar = ({
  simulation,
  hidden,
  hiddenStimuli,
  onToggleRecording,
  onToggleStimulus,
}: {
  simulation: DetailSimulationFragment;
  hidden: string[];
  hiddenStimuli: string[];
  onToggleRecording: (id: string) => void;
  onToggleStimulus: (id: string) => void;
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
          simulation.recordings.map((view) => (
            <TraceRow
              key={view.id}
              color={getColorForRecordingView(view)}
              label={view.label}
              where={whereOf(view)}
              hidden={hidden.includes(view.id)}
              onToggle={() => onToggleRecording(view.id)}
              link={
                <ElektroRecording.DetailLink
                  object={view}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Open
                </ElektroRecording.DetailLink>
              }
            />
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <SectionHeader title="Stimuli" count={simulation.stimuli.length} />
        {simulation.stimuli.length === 0 ? (
          <span className="text-xs text-muted-foreground">No stimulus was applied.</span>
        ) : (
          simulation.stimuli.map((view) => (
            <TraceRow
              key={view.id}
              color={getColorForStimulusView(view)}
              label={view.label}
              where={whereOf(view)}
              hidden={hiddenStimuli.includes(view.id)}
              onToggle={() => onToggleStimulus(view.id)}
              link={
                <ElektroStimulus.DetailLink
                  object={view}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  Open
                </ElektroStimulus.DetailLink>
              }
            />
          ))
        )}
      </div>
    </div>
  );
};
