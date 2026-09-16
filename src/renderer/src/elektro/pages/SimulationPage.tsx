import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { ElektroSimulation } from "@/linkers";
import React, { useCallback } from "react";
import { useDetailSimulationQuery } from "../api/graphql";
import { SimulationInfoSidebar } from "../components/sidebars/SimulationInfoSidebar";
import { SimulationRender } from "../components/SimulationRender";
import { SimulationTitleHeader } from "../components/simulation/SimulationTitleHeader";

export type IRepresentationScreenProps = {};

/** Add the id if absent, drop it if present. */
const toggle = (prev: string[], id: string) =>
  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];

/**
 * Laid out like `ArrayDatasetPage` and `NeuronModelPage`: the content area is
 * the plot under a one-line title, and the facts — run parameters, model,
 * creator, and the trace legend with its visibility toggles — are one Info tab
 * in the rail.
 */
export const SimulationPage = asDetailQueryRoute(
  useDetailSimulationQuery,
  ({ data }) => {
    const simulation = data.simulation;
    const [hidden, setHidden] = React.useState<string[]>([]);
    const [hiddenStimuli, setHiddenStimuli] = React.useState<string[]>([]);
    const toggleRecording = useCallback(
      (id: string) => setHidden((prev) => toggle(prev, id)),
      [],
    );
    const toggleStimulus = useCallback(
      (id: string) => setHiddenStimuli((prev) => toggle(prev, id)),
      [],
    );

    return (
        <ElektroSimulation.ModelPage
          object={simulation}
          title={simulation.name}
          variant="black"
          overlay
          actions={<ElektroSimulation.Actions object={simulation} />}
          pageActions={
            <div className="flex items-center gap-2">
              <ElektroSimulation.ObjectButton object={simulation} />
            </div>
          }
          additionalSidebars={
            <Sidebars.Tab label="Info">
              <SimulationInfoSidebar
                simulation={simulation}
                hidden={hidden}
                hiddenStimuli={hiddenStimuli}
                onToggleRecording={toggleRecording}
                onToggleStimulus={toggleStimulus}
              />
            </Sidebars.Tab>
          }
          defaultSidebar="Info"
          sidebarKey="SimulationDetail"
        >
          <div className="flex h-full w-full flex-col">
            <SimulationTitleHeader simulation={simulation} />
            <div className="flex min-h-0 w-full flex-1 overflow-hidden">
              <SimulationRender
                simulation={simulation}
                hidden={hidden}
                hiddenStimuli={hiddenStimuli}
              />
            </div>
          </div>
        </ElektroSimulation.ModelPage>
    );
  },
);

export default SimulationPage;
