import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";
import { useDeleteRepresentationMate } from "../../mates/representation/useDeleteRepresentationMate";
import { withMikro } from "../MikroContext";
import { CommentableModels, useDetailRoiQuery } from "../api/graphql";
import { PositionCard } from "./cards/PositionCard";
import { RepresentationCard } from "./cards/RepresentationCard";

export type ISampleProps = {
  id: string;
};

const Roi: React.FC<ISampleProps> = ({ id }) => {
  const { data } = withMikro(useDetailRoiQuery)({
    variables: { id: id },
  });

  const mate = useDeleteRepresentationMate();

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/roi"} object={id} />}
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.GrunnlagRoi} />
          ),
          key: "comments",
        },
      ]}
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.roi?.representation?.id && (
            <Representation.DetailLink object={data?.roi?.representation?.id}>
              {data?.roi?.label ||
                `Roi Marked on ${data?.roi?.representation?.name}`}
            </Representation.DetailLink>
          )}
        </div>
        <div className="flex flex-row ">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded  @container">
            <div className="flex flex-col">
              <div className="">Type </div>
              <div className="text-md mt-2 font-bold">{data?.roi?.type}</div>
            </div>

            <div className="mt-2">Derived images </div>
            <ResponsiveContainerGrid>
              {data?.roi?.derivedRepresentations
                ?.filter(notEmpty)
                .map((rep, index) => (
                  <RepresentationCard
                    key={index}
                    rep={rep}
                    mates={[mate(rep)]}
                  />
                ))}
            </ResponsiveContainerGrid>

            <div className="mt-2">Derived Positions </div>
            <ResponsiveContainerGrid>
              {data?.roi?.derivedPositions
                ?.filter(notEmpty)
                .map((rep, index) => (
                  <PositionCard key={index} position={rep} mates={[]} />
                ))}
            </ResponsiveContainerGrid>
          </div>
          <div className="ml-2 flex-1  shadow mt-2 rounded rounded-lg overflow-hidden">
            {data?.roi?.label}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Roi };
