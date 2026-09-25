import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { buttonVariants } from "@/core/components/ui/button";
import { ElektroCell, ElektroNeuronModel } from "@/core/linkers";
import { useMemo } from "react";
import { useDetailCellQuery } from "../api/graphql";
import { MorphologyScene } from "../components/morphology/MorphologyScene";
import { FocusTitleOverlay } from "../components/neuronmodel/FocusTitleOverlay";
import { CellInfoSidebar } from "../components/sidebars/CellInfoSidebar";

/**
 * One cell of a neuron model, zoomed in: the model's own renderer, framing and
 * orbiting this cell's sections with the rest of the model as dimmed context
 * (Layers → "rest of the model"). Routed by the compound id `model:cell`.
 */
export const CellPage = asDetailQueryRoute(useDetailCellQuery, ({ data }) => {
  const cell = data.cell;
  const model = cell.model;
  const focus = useMemo(() => cell.topology.sections.map((s) => s.id), [cell.topology.sections]);
  const pageId = cell.compoundId ?? cell.id;

  const page = (
    <ElektroCell.ModelPage
      object={{ id: pageId }}
      title={cell.id}
      variant="black"
      overlay
      pageActions={
        model && (
          <ElektroNeuronModel.DetailLink
            object={model}
            className={buttonVariants({ variant: "outline" })}
          >
            Open model
          </ElektroNeuronModel.DetailLink>
        )
      }
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <CellInfoSidebar cell={cell} />
          </Sidebars.Tab>
          {model && (
            <Sidebars.Tab label="Layers">
              <MorphologyScene.LayersSidebar />
            </Sidebars.Tab>
          )}
        </>
      }
      defaultSidebar="Info"
      sidebarKey="CellDetail"
    >
      <div className="relative h-full w-full">
        {model ? (
          // No Tree switch: the tree is the whole model's, not this cell's.
          <MorphologyScene.Viewport showDisplaySwitch={false} />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            This cell's model could not be loaded.
          </div>
        )}
        <FocusTitleOverlay
          kind="Cell"
          title={cell.id}
          model={model}
          facts={[
            `${cell.topology.sections.length} sections`,
            `${cell.biophysics.compartments.length} compartments`,
          ]}
        />
      </div>
    </ElektroCell.ModelPage>
  );

  // Keyed on the compound id: the viewer is built for this cell of this model.
  return model ? (
    <MorphologyScene.Provider key={pageId} model={model} focus={focus} embedded>
      {page}
    </MorphologyScene.Provider>
  ) : (
    page
  );
});

export default CellPage;
