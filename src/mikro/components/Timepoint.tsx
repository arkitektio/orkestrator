import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SectionTitle } from "../../layout/SectionTitle";
import { Era } from "../../linker";
import { useDeleteRepresentationMate } from "../../mates/representation/useDeleteRepresentationMate";
import { withMikro } from "../MikroContext";
import { CommentableModels, useDetailTimepointQuery } from "../api/graphql";
import { RepresentationCard } from "./cards/RepresentationCard";
import { ViewCard } from "./cards/ViewCard";

export type PositionProps = {
  id: string;
};

const Timepoint: React.FC<PositionProps> = ({ id }) => {
  const { data } = withMikro(useDetailTimepointQuery)({
    variables: { id: id },
  });

  const deleteRepresentationMate = useDeleteRepresentationMate();

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/timepoint"} object={id} />}
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments
              id={id}
              model={CommentableModels.GrunnlagTimepoint}
            />
          ),
          key: "comments",
        },
      ]}
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.timepoint?.name}{" "}
          {data?.timepoint?.era?.id && (
            <Era.DetailLink object={data?.timepoint?.era?.id}>
              on {data?.timepoint?.era?.name}
            </Era.DetailLink>
          )}
        </div>
        <div className="flex  @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2">
          <div className="p-3 flex-1 bg-white border shadow mt-2 rounded @container">
            <div className=" mt-2 ">
              <div className="flex flex-row gap-1">
                <div className="font-bold ">T</div>
                <div className="text-md">{data?.timepoint?.deltaT}</div>
                <div className="font-light">ms</div>
              </div>
            </div>
          </div>
        </div>
        <SectionTitle>Atached images </SectionTitle>
        <ResponsiveContainerGrid>
          {data?.timepoint?.omeros?.filter(notEmpty).map((omero, index) => (
            <RepresentationCard
              rep={omero.representation}
              mates={[deleteRepresentationMate(omero.representation)]}
            />
          ))}
        </ResponsiveContainerGrid>
        <SectionTitle>Atached Views </SectionTitle>
        <ResponsiveContainerGrid>
          {data?.timepoint?.views?.filter(notEmpty).map((view, index) => (
            <ViewCard view={view} mates={[]} />
          ))}
        </ResponsiveContainerGrid>
      </div>
    </PageLayout>
  );
};

export { Timepoint };
