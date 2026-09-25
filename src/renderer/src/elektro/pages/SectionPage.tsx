import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { buttonVariants } from "@/core/ui/button";
import { ElektroCell, ElektroSection } from "@/core/linkers";
import { useMemo } from "react";
import { useDetailSectionQuery } from "../api/graphql";
import { MorphologyScene } from "../components/morphology/MorphologyScene";
import { FocusTitleOverlay } from "../components/neuronmodel/FocusTitleOverlay";
import { SectionInfoSidebar } from "../components/sidebars/SectionInfoSidebar";

/**
 * One section, zoomed in: the model's renderer framing and orbiting just this
 * section, the rest of the model dimmed around it for context. Routed by the
 * compound id `model:cell:section`.
 */
export const SectionPage = asDetailQueryRoute(useDetailSectionQuery, ({ data }) => {
  const section = data.section;
  const model = section.model;
  const focus = useMemo(() => [section.id], [section.id]);
  const pageId = section.compoundId ?? section.id;

  const page = (
    <ElektroSection.ModelPage
      object={{ id: pageId }}
      title={section.id}
      variant="black"
      overlay
      pageActions={
        section.cell?.compoundId && (
          <ElektroCell.DetailLink
            object={{ id: section.cell.compoundId }}
            className={buttonVariants({ variant: "outline" })}
          >
            Open cell
          </ElektroCell.DetailLink>
        )
      }
      additionalSidebars={
        <>
          <Sidebars.Tab label="Info">
            <SectionInfoSidebar section={section} />
          </Sidebars.Tab>
          {model && (
            <Sidebars.Tab label="Layers">
              <MorphologyScene.LayersSidebar />
            </Sidebars.Tab>
          )}
        </>
      }
      defaultSidebar="Info"
      sidebarKey="SectionDetail"
    >
      <div className="relative h-full w-full">
        {model ? (
          <MorphologyScene.Viewport showDisplaySwitch={false} />
        ) : (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            This section's model could not be loaded.
          </div>
        )}
        <FocusTitleOverlay
          kind="Section"
          title={section.id}
          model={model}
          cell={section.cell}
          facts={[section.category, section.diam, section.length].filter(
            (fact): fact is string => Boolean(fact),
          )}
        />
      </div>
    </ElektroSection.ModelPage>
  );

  return model ? (
    <MorphologyScene.Provider key={pageId} model={model} focus={focus} embedded>
      {page}
    </MorphologyScene.Provider>
  ) : (
    page
  );
});

export default SectionPage;
