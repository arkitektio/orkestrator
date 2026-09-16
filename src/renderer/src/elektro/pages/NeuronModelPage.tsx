import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { buttonVariants } from "@/components/ui/button";
import { ElektroNeuronModel } from "@/linkers";
import { RefetchProvider } from "@/providers/refetch/RefetchContext";
import { useDetailNeuronModelQuery } from "../api/graphql";
import { NeuronVisualizer } from "../components/NeuronRenderer";
import { NeuronModelTitleOverlay } from "../components/neuronmodel/NeuronModelTitleOverlay";
import { NeuronModelInfoSidebar } from "../components/sidebars/NeuronModelInfoSidebar";
import { ExportModelButton } from "../forms/ExportModelForm";

export type IRepresentationScreenProps = {};

/**
 * Laid out like `mikro-next`'s `ArrayDatasetPage`: the content area is the
 * picture and nothing else, the name floats over it in the top-left, and the
 * facts (globals, ions, environment, comparisons, simulations, history) are
 * one Info tab in the rail.
 */
export const NeuronModelPage = asDetailQueryRoute(
  useDetailNeuronModelQuery,
  ({ data }) => {
    const model = data.neuronModel;

    return (
      // Publish no refetch: this is a canvas page whose content area is the
      // viewport, so the layout's pull-to-refetch gesture would fight the
      // orbit controls' wheel/drag handling. Overrides the route's provider.
      <RefetchProvider>
        <ElektroNeuronModel.ModelPage
          object={model}
          title={model.name}
          variant="black"
          overlay
          actions={<ElektroNeuronModel.Actions object={model} />}
          pageActions={
            <div className="flex items-center gap-2">
              <ElektroNeuronModel.DetailLink
                object={model}
                subroute="edit"
                className={buttonVariants({ variant: "outline" })}
              >
                Edit
              </ElektroNeuronModel.DetailLink>
              <ElektroNeuronModel.DetailLink
                object={model}
                subroute="tree"
                className={buttonVariants({ variant: "outline" })}
              >
                Tree View
              </ElektroNeuronModel.DetailLink>
              <ExportModelButton object={model} />
              <ElektroNeuronModel.ObjectButton object={model} />
            </div>
          }
          additionalSidebars={
            // No separate Provenance tab: the history sits in Info, next to
            // the facts it explains, as on the dataset page.
            <Sidebars.Tab label="Info">
              <NeuronModelInfoSidebar model={model} />
            </Sidebars.Tab>
          }
          defaultSidebar="Info"
          sidebarKey="NeuronModelDetail"
        >
          <div className="relative h-full w-full">
            {/* Keyed on the model id: the renderer's layout and panel store are
                built per model, so navigating between models remounts rather
                than feeding a new model into a scene primed for the old one. */}
            <NeuronVisualizer key={model.id} model={model} />

            {/* Page chrome, not renderer chrome: outside the visualizer so it
                is the same card in the same place whatever the HUD shows. */}
            <NeuronModelTitleOverlay model={model} />
          </div>
        </ElektroNeuronModel.ModelPage>
      </RefetchProvider>
    );
  },
);

export default NeuronModelPage;
