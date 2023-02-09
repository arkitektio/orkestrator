import ParentSize from "@visx/responsive/lib/components/ParentSizeModern";
import React from "react";
import { Link } from "react-router-dom";
import { isVoidExpression } from "typescript";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { PositionCanvas } from "../../components/PositionCanvas";
import { RoiCanvas } from "../../components/RoiCanvas";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { Stage, Representation } from "../../linker";
import {
  CommentableModels,
  useDetailPositionQuery,
  useDetailRoiQuery,
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import { RepresentationCard } from "./cards/RepresentationCard";
import CommentSection from "./comments/CommentSection";
import { DiscussionSidebar } from "./comments/DiscussionSidebar";

export type PositionProps = {
  id: string;
};

const Position: React.FC<PositionProps> = ({ id }) => {
  const { data } = withMikro(useDetailPositionQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/position"} object={id} />}
      sidebar={
        <div className="p-5">
          <CommentSection id={id} model={CommentableModels.GrunnlagPosition} />
        </div>
      }
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
              <ParentSize>
                {({ width, height }) => (
                  <>
                    {data?.position?.stage?.positions && (
                      <PositionCanvas
                        positions={data?.position?.stage?.positions}
                        highlight={[data?.position.id]}
                        height={400}
                        width={400}
                      />
                    )}
                  </>
                )}
              </ParentSize>
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
                <RepresentationCard rep={omero.representation} />
              ))}
            </ResponsiveContainerGrid>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Position };
