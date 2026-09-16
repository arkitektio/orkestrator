import { ElektroNeuronModel, ElektroSimulation } from "@/linkers";
import { DetailSimulationFragment } from "../../api/graphql";

/**
 * What the page is *about*, said once and quietly: the simulation's name and
 * how it was run. The counterpart of the dataset and neuron model title
 * overlays, but in the flow above the plot rather than floating over it — a
 * plot has axes and a legend in its corners, so text laid over it would sit on
 * top of data. The detail (traces, model, creator) lives in the Info tab.
 */
export const SimulationTitleHeader = ({
  simulation,
}: {
  simulation: DetailSimulationFragment;
}) => {
  const traces = simulation.recordings.length + simulation.stimuli.length;
  return (
    <div className="flex shrink-0 flex-col gap-0.5 px-3 pt-3">
      <ElektroSimulation.DetailLink
        object={simulation}
        className="w-fit max-w-full break-all text-3xl font-semibold leading-tight"
      >
        {simulation.name}
      </ElektroSimulation.DetailLink>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
        <span>{simulation.duration}</span>
        <span>dt {simulation.dt}</span>
        <span>{traces} {traces === 1 ? "trace" : "traces"}</span>
        {simulation.model && (
          <ElektroNeuronModel.DetailLink
            object={simulation.model}
            className="truncate hover:text-foreground"
          >
            {simulation.model.name}
          </ElektroNeuronModel.DetailLink>
        )}
      </div>
    </div>
  );
};
