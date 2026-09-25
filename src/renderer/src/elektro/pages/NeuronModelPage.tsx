import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { buttonVariants } from "@/core/ui/button";
import { ElektroNeuronModel } from "@/core/linkers";
import { useDetailNeuronModelQuery } from "../api/graphql";
import { NeuronModelTitleOverlay } from "../components/neuronmodel/NeuronModelTitleOverlay";
import { MorphologyScene } from "../components/morphology/MorphologyScene";
import { NeuronModelInfoSidebar } from "../components/sidebars/NeuronModelInfoSidebar";
import { ExportModelButton } from "../forms/ExportModelForm";

export type IRepresentationScreenProps = {};

/**
 * Laid out like `mikro`'s `ArrayDatasetPage`: the content area is the
 * viewport and nothing else, the name floats over it in the top-left, and the
 * facts (globals, ions, environment, comparisons, simulations, history) are
 * one Info tab in the rail.
 */
export const NeuronModelPage = asDetailQueryRoute(
  useDetailNeuronModelQuery,
  ({ data }) => {
    const model = data.neuronModel;

    return (
      // Keyed on the model id: the viewer's store and geometry are built per
      // model, so navigating between models remounts rather than feeding a new
      // model into a viewer primed for the old one. Around the whole page, so
      // the Layers tab and the viewport share one viewer.
      <MorphologyScene.Provider key={model.id} model={model}>
        <ElektroNeuronModel.ModelPage
          object={model}
          title={model.name}
          variant="black"
          overlay
          actions={<ElektroNeuronModel.Actions object={model} />}
          pageActions={
            <>
              <ElektroNeuronModel.DetailLink
                object={model}
                subroute="edit"
                className={buttonVariants({ variant: "outline" })}
              >
                Edit
              </ElektroNeuronModel.DetailLink>
              <ExportModelButton object={model} />
              <ElektroNeuronModel.ObjectButton alwaysShow object={model} />
            </>
          }
          additionalSidebars={
            // No separate Provenance tab: the history sits in Info, next to
            // the facts it explains, as on the dataset page.
            <>
              <Sidebars.Tab label="Info">
                <NeuronModelInfoSidebar model={model} />
              </Sidebars.Tab>
              <Sidebars.Tab label="Layers">
                <MorphologyScene.LayersSidebar />
              </Sidebars.Tab>
            </>
          }
          defaultSidebar="Info"
          sidebarKey="NeuronModelDetail"
        >
          <div className="relative h-full w-full">
            {/* The tree view is a display mode of the viewport, not a page
                action — the switch sits in the viewport's bottom-right strip,
                where the scene keeps its 2D/3D switch. */}
            <MorphologyScene.Viewport />

            {/* Page chrome, not renderer chrome: outside the visualizer so it
                is the same card in the same place whatever the HUD shows. */}
            <NeuronModelTitleOverlay model={model} />
          </div>
        </ElektroNeuronModel.ModelPage>
      </MorphologyScene.Provider>
    );
  },
);

export default NeuronModelPage;
