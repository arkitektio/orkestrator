import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Button } from "@/components/ui/button";
import { ElektroExperiment, ElektroSimulation } from "@/linkers";
import { AudioLines } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DetailSimulationFragment,
  useCreateExperimentFromCoordinateSystemMutation,
  useDetailSimulationQuery,
} from "../api/graphql";
import { NeuronSimulationVisualizer } from "../components/NeuronSimulationRender";
import { SimulationInfoSidebar } from "../components/sidebars/SimulationInfoSidebar";
import { SimulationTitleHeader } from "../components/simulation/SimulationTitleHeader";

export type IRepresentationScreenProps = {};

/**
 * A simulation run: the model it ran on, with a marker at every recording and
 * stimulus site, and its facts in the Info tab.
 *
 * The traces are not drawn here. A run's recordings and stimuli are datasets on
 * its clock, and drawing them is the experiment renderer's job: "Open on
 * timeline" stages an experiment over the clock (the server adds a layer per
 * dataset) and goes there. One renderer, one place to annotate, compare runs and
 * edit placement, instead of a second, read-only timeline synthesized here.
 */
export const SimulationPage = asDetailQueryRoute(
  useDetailSimulationQuery,
  ({ data }) => {
    const simulation = data.simulation;

    return (
      <ElektroSimulation.ModelPage
        object={simulation}
        title={simulation.name}
        variant="black"
        overlay
        actions={<ElektroSimulation.Actions object={simulation} />}
        pageActions={
          <div className="flex items-center gap-2">
            <OpenOnTimelineButton simulation={simulation} />
            <ElektroSimulation.ObjectButton object={simulation} />
          </div>
        }
        additionalSidebars={
          <Sidebars.Tab label="Info">
            <SimulationInfoSidebar simulation={simulation} />
          </Sidebars.Tab>
        }
        defaultSidebar="Info"
        sidebarKey="SimulationDetail"
      >
        <div className="flex h-full w-full flex-col">
          <SimulationTitleHeader simulation={simulation} />
          <div className="min-h-0 w-full flex-1 overflow-hidden">
            <NeuronSimulationVisualizer simulation={simulation} />
          </div>
        </div>
      </ElektroSimulation.ModelPage>
    );
  },
);

/** Stage an experiment over the run's clock and open it. */
const OpenOnTimelineButton = ({ simulation }: { simulation: DetailSimulationFragment }) => {
  const navigate = useNavigate();
  const [stage, { loading }] = useCreateExperimentFromCoordinateSystemMutation();
  const clock = simulation.clock?.id;

  const open = async () => {
    if (!clock) return;
    try {
      const result = await stage({
        variables: { input: { coordinateSystem: clock, name: simulation.name } },
      });
      const id = result.data?.createExperimentFromCoordinateSystem.id;
      if (!id) throw new Error("the server did not return the staged experiment");
      navigate(ElektroExperiment.linkBuilder(id));
    } catch (error) {
      toast.error(`Could not open the run on a timeline: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!clock || loading}
      onClick={open}
      title={clock ? "Stage an experiment over this run's clock" : "This run has no clock to lay out on"}
    >
      <AudioLines className="mr-1 h-4 w-4" />
      {loading ? "Opening…" : "Open on timeline"}
    </Button>
  );
};

export default SimulationPage;
