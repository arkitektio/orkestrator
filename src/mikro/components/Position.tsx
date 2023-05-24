import React from "react";
import { PositionCanvas } from "../../components/PositionCanvas";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { SaveParentSize } from "../../layout/SaveParentSize";
import { Stage } from "../../linker";
import { useDeleteRepresentationMate } from "../../mates/representation/useDeleteRepresentationMate";
import { withMikro } from "../MikroContext";
import { CommentableModels, useDetailPositionQuery } from "../api/graphql";
import { RepresentationCard } from "./cards/RepresentationCard";
import { RoiCard } from "./cards/RoiCard";

export type PositionProps = {
  id: string;
};

const Position: React.FC<PositionProps> = ({ id }) => {
  const { data } = withMikro(useDetailPositionQuery)({
    variables: { id: id },
  });

  const deleteRepresentationMate = useDeleteRepresentationMate();

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/position"} object={id} />}
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.GrunnlagPosition} />
          ),
          key: "comments",
        },
      ]}
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.position?.name}{" "}
          {data?.position?.stage?.id && (
            <Stage.DetailLink object={data?.position?.stage?.id}>
              on {data?.position?.stage?.name}
            </Stage.DetailLink>
          )}
        </div>
        <div className="flex  @2xl:flex-row-reverse flex-col rounded-md gap-4 mt-2">
          <div className="flex-1 max-w-2xl mt-2 rounded rounded-lg overflow-hidden bg-gray-800 p-2">
            {data && (
              <SaveParentSize>
                {({ width, height }) => (
                  <>
                    {data?.position?.stage?.positions && (
                      <PositionCanvas
                        positions={data?.position?.stage?.positions}
                        highlight={[data?.position.id]}
                        height={height}
                        width={width}
                      />
                    )}
                  </>
                )}
              </SaveParentSize>
            )}
          </div>
          <div className="p-3 flex-1 bg-white border shadow mt-2 rounded @container">
            <div className=" mt-2 ">
              <div className="flex flex-row gap-1">
                <div className="font-bold ">X</div>
                <div className="text-md">{data?.position?.x}</div>
                <div className="font-light">µm</div>
              </div>

              <div className="flex flex-row gap-1">
                <div className="font-bold ">Y</div>
                <div className="text-md">{data?.position?.y}</div>
                <div className="font-light">µm</div>
              </div>
              <div className="flex flex-row gap-1">
                <div className="font-bold ">Z</div>
                <div className="text-md">{data?.position?.z}</div>
                <div className="font-light">µm</div>
              </div>
            </div>
            <div className="font-bold">Atached images </div>
            <ResponsiveContainerGrid>
              {data?.position?.omeros?.filter(notEmpty).map((omero, index) => (
                <RepresentationCard
                  rep={omero.representation}
                  mates={[deleteRepresentationMate(omero.representation)]}
                />
              ))}
            </ResponsiveContainerGrid>
            <div className="font-bold">Derived from </div>
            <ResponsiveContainerGrid>
              {data?.position?.roiOrigins
                ?.filter(notEmpty)
                .map((roi, index) => (
                  <RoiCard roi={roi} mates={[]} />
                ))}
            </ResponsiveContainerGrid>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Position };
